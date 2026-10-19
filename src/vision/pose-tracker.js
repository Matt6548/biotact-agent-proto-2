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
    this.onStatus?.({ state: "idle", message: "Camera stopped" });
  }

  handleWorkerMessage(data) {
    if (data.type === "ready") {
      this.onStatus?.({
        state: "ready",
        message: `Pose model ready · ${data.delegate}`,
        delegate: data.delegate,
      });
      return;
    }

    if (data.type === "result") {
      this.frameBusy = false;
      const now = performance.now();
      this.frameTimes.push(now);
      while (this.frameTimes.length && now - this.frameTimes[0] > 1000) {
        this.frameTimes.shift();
      }
      this.onResult?.({ ...data, fps: this.frameTimes.length });
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

      if (
        this.worker &&
        !this.frameBusy &&
        this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        now - this.lastSentAt >= this.minFrameIntervalMs
      ) {
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

      this.scheduleFrame();
    };

    if ("requestVideoFrameCallback" in HTMLVideoElement.prototype) {
      this.video.requestVideoFrameCallback(callback);
    } else {
      requestAnimationFrame(callback);
    }
  }
}
