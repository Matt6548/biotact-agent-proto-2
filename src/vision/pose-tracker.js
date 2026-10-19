export class PoseTracker {
  constructor({ video, onResult, onStatus }) {
    this.video = video;
    this.onResult = onResult;
    this.onStatus = onStatus;
    this.worker = null;
    this.stream = null;
    this.running = false;
    this.frameBusy = false;
    this.lastSentAt = 0;
    this.minFrameIntervalMs = 1000 / 30;
    this.frameTimes = [];
    this.busySkipTimes = [];
    this.delegate = null;
  }

  async start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera API is unavailable in this browser.");
    }

    this.onStatus?.({ state: "starting", message: "Requesting camera…" });
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 60 },
      },
    });

    this.video.srcObject = this.stream;
    await this.video.play();

    this.worker = new Worker(new URL("./pose-worker.js", import.meta.url), { type: "module" });
    this.worker.onmessage = (event) => this.handleWorkerMessage(event.data);
    this.worker.onerror = (event) => {
      this.onStatus?.({ state: "error", message: event.message || "Pose worker failed." });
    };
    this.worker.postMessage({ type: "init" });

    this.running = true;
    this.scheduleFrame();
  }

  stop() {
    this.running = false;
    this.worker?.terminate();
    this.worker = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    if (this.video) this.video.srcObject = null;
    this.frameBusy = false;
    this.frameTimes = [];
    this.busySkipTimes = [];
    this.delegate = null;
    this.onStatus?.({ state: "idle", message: "Camera stopped" });
  }

  pruneWindow(values, now) {
    while (values.length && now - values[0] > 1000) values.shift();
  }

  handleWorkerMessage(data) {
    if (data.type === "ready") {
      this.delegate = data.delegate || "unknown";
      this.onStatus?.({
        state: "ready",
        message: `Pose model ready · ${this.delegate}`,
        delegate: this.delegate,
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
      this.onStatus?.({ state: "error", message: data.error });
    }
  }

  scheduleFrame() {
    if (!this.running) return;

    const callback = async () => {
      if (!this.running) return;
      const now = performance.now();
      const videoReady = this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
      const due = now - this.lastSentAt >= this.minFrameIntervalMs;

      if (this.worker && videoReady && due) {
        if (this.frameBusy) {
          this.busySkipTimes.push(now);
          this.pruneWindow(this.busySkipTimes, now);
        } else {
          this.lastSentAt = now;
          this.frameBusy = true;
          try {
            const bitmap = await createImageBitmap(this.video);
            this.worker.postMessage({ type: "frame", bitmap, timestampMs: now }, [bitmap]);
          } catch (error) {
            this.frameBusy = false;
            this.onStatus?.({ state: "error", message: String(error?.message || error) });
          }
        }
      }

      this.scheduleFrame();
    };

    if ("requestVideoFrameCallback" in HTMLVideoElement.prototype) {
      this.video.requestVideoFrameCallback(callback);
    } else {
      requestAnimationFrame(callback);
    }
  }
}
