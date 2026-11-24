export class PoseTracker {
  constructor({ video, onResult, onStatus, workerFactory = null }) {
    this.video = video;
    this.onResult = onResult;
    this.onStatus = onStatus;
    // Keep the existing Pose worker as the default. An opt-in hand worker can
    // reuse the same camera lifecycle without opening a second stream.
    this.workerFactory = workerFactory ?? (() => new Worker(new URL("./pose-worker.js", import.meta.url), { type: "module" }));
    this.worker = null;
    this.stream = null;
    this.running = false;
    this.frameBusy = false;
    this.lastSentAt = 0;
    this.minFrameIntervalMs = 1000 / 30;
    this.frameTimes = [];
    this.busySkipTimes = [];
    this.delegate = null;
    this.modelReady = false;
    this.generation = 0;
  }

  async start() {
    if (this.running || this.stream) throw new Error("Camera is already active.");
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera API is unavailable in this browser.");
    }

    const generation = ++this.generation;
    this.onStatus?.({ state: "starting", message: "Запрашиваем доступ к камере…" });
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 60 },
      },
    });
    if (generation !== this.generation) {
      stream.getTracks().forEach((track) => track.stop());
      throw new DOMException("Camera request cancelled", "AbortError");
    }

    this.stream = stream;
    try {
      this.video.srcObject = stream;
      await this.video.play();
    } catch (error) {
      if (generation === this.generation) this.stop();
      throw error;
    }
    if (generation !== this.generation) throw new DOMException("Camera request cancelled", "AbortError");

    // The video can already be visible while the heavier on-device pose model
    // is still loading. Keep these two states distinct in the UI.
    this.onStatus?.({ state: "loading", message: "Камера включена · загружаем распознавание…" });

    try {
      this.worker = this.workerFactory();
      const worker=this.worker;
      this.worker.onmessage = (event) => {
        if (generation===this.generation && this.worker===worker) this.handleWorkerMessage(event.data);
      };
      this.worker.onerror = (event) => {
        if (generation===this.generation && this.worker===worker) this.onStatus?.({ state: "error", message: event.message || "Vision worker failed." });
      };
      this.worker.postMessage({ type: "init" });
    } catch (error) {
      this.stop();
      throw error;
    }

    this.running = true;
    this.scheduleFrame();
  }

  stop() {
    this.generation += 1;
    this.running = false;
    this.worker?.terminate();
    this.worker = null;
    const stream=this.stream;
    stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    // A late stop from an older controller must not detach a replacement stream.
    if (stream && this.video?.srcObject===stream) this.video.srcObject = null;
    this.frameBusy = false;
    this.lastSentAt = 0;
    this.frameTimes = [];
    this.busySkipTimes = [];
    this.delegate = null;
    this.modelReady = false;
    this.onStatus?.({ state: "idle", message: "Camera stopped" });
  }

  pruneWindow(values, now) {
    while (values.length && now - values[0] > 1000) values.shift();
  }

  handleWorkerMessage(data) {
    if (data.type === "ready") {
      this.delegate = data.delegate || "unknown";
      this.modelReady = true;
      this.onStatus?.({
        state: "ready",
        message: data.mode === "hands" ? `Hand model ready · ${this.delegate}` : `Pose model ready · ${this.delegate}`,
        delegate: this.delegate,
        mode: data.mode || "pose",
        initMs: Number.isFinite(data.initMs) ? data.initMs : null,
      });
      return;
    }

    if (data.type === "result") {
      this.frameBusy = false;
      const now = performance.now();
      this.frameTimes.push(now);
      this.pruneWindow(this.frameTimes, now);
      this.pruneWindow(this.busySkipTimes, now);

      this.onResult?.({
        ...data,
        fps: this.frameTimes.length,
        diagnostics: {
          inferenceMs: Number.isFinite(data.inferenceMs) ? data.inferenceMs : null,
          frameToResultMs: Number.isFinite(data.timestampMs) ? Math.max(0,now-data.timestampMs) : null,
          busySkipsPerSecond: this.busySkipTimes.length,
          delegate: this.delegate,
        },
      });
      return;
    }

    if (data.type === "egress-blocked") {
      this.onStatus?.({ state: "privacy-block", message: "Blocked external model request", origin: data.origin });
      return;
    }

    if (data.type === "detect-error" || data.type === "error") {
      this.frameBusy = false;
      if (data.type === "error") this.modelReady = false;
      this.onStatus?.({ state: "error", message: data.error });
    }
  }

  scheduleFrame() {
    if (!this.running) return;
    const generation=this.generation;

    const callback = async () => {
      if (!this.running || generation!==this.generation) return;
      const now = performance.now();
      const videoReady = this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
      const due = now - this.lastSentAt >= this.minFrameIntervalMs;

      if (this.worker && this.modelReady && videoReady && due) {
        if (this.frameBusy) {
          this.busySkipTimes.push(now);
          this.pruneWindow(this.busySkipTimes, now);
        } else {
          this.lastSentAt = now;
          this.frameBusy = true;
          try {
            const bitmap = await createImageBitmap(this.video);
            if (!this.running || generation!==this.generation || !this.worker) {
              bitmap.close?.();
              return;
            }
            this.worker.postMessage({ type: "frame", bitmap, timestampMs: now }, [bitmap]);
          } catch (error) {
            if (generation!==this.generation) return;
            this.frameBusy = false;
            if (this.running) this.onStatus?.({ state: "error", message: String(error?.message || error) });
          }
        }
      }

      if (generation===this.generation) this.scheduleFrame();
    };

    if ("requestVideoFrameCallback" in HTMLVideoElement.prototype) {
      this.video.requestVideoFrameCallback(callback);
    } else {
      requestAnimationFrame(callback);
    }
  }
}
