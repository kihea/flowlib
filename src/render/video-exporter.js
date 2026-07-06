const DEFAULT_MIME_TYPES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm"
];

export function getSupportedVideoMimeTypes(types = DEFAULT_MIME_TYPES) {
  const recorder = globalThis.MediaRecorder;
  if (!recorder?.isTypeSupported) return [];
  return types.filter((type) => recorder.isTypeSupported(type));
}

export function pickVideoMimeType(types = DEFAULT_MIME_TYPES) {
  return getSupportedVideoMimeTypes(types)[0] || "";
}

export async function recordCanvasToWebM(canvas, options = {}) {
  assertVideoRecordingSupport(canvas);
  const fps = options.fps ?? 60;
  const durationSeconds = options.duration ?? 5;
  const durationMs = options.durationMs ?? durationSeconds * 1000;
  const mimeType = options.mimeType ?? pickVideoMimeType();
  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType: mimeType || undefined,
    videoBitsPerSecond: options.videoBitsPerSecond
  });
  try {
    return await collectRecording(recorder, durationMs, { ...options, mimeType });
  } finally {
    stopStream(stream);
  }
}

export async function exportSceneToWebM(options = {}) {
  const { canvas, renderer, scene, timeline } = options;
  if (!canvas || !renderer || !scene) {
    throw new Error("exportSceneToWebM requires canvas, renderer, and scene.");
  }
  assertVideoRecordingSupport(canvas);

  const fps = options.fps ?? 60;
  const duration = options.duration ?? Math.max(0.1, timeline?.duration || 4);
  const mimeType = options.mimeType ?? pickVideoMimeType();
  const outputWidth = options.width ?? options.size?.width;
  const outputHeight = options.height ?? options.size?.height;
  if (outputWidth && outputHeight) renderer.resize(outputWidth, outputHeight);
  const stream = canvas.captureStream(fps);
  const track = stream.getVideoTracks?.()[0] || null;
  const recorder = new MediaRecorder(stream, {
    mimeType: mimeType || undefined,
    videoBitsPerSecond: options.videoBitsPerSecond
  });
  const chunks = [];
  const recording = new Promise((resolve, reject) => {
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data?.size > 0) chunks.push(event.data);
    });
    recorder.addEventListener("stop", () => resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || "video/webm" })));
    recorder.addEventListener("error", () => reject(recorder.error || new Error("Video recording failed.")));
  });

  const wasPlaying = !!timeline?.playing;
  const previousTime = timeline?.time ?? 0;

  try {
    timeline?.pause?.();
    timeline?.seek?.(0);
    recorder.start(options.timeslice);
    options.onStart?.({ recorder, stream });

    const totalFrames = Math.max(1, Math.ceil(duration * fps));
    for (let frame = 0; frame <= totalFrames; frame += 1) {
      const time = Math.min(duration, frame / fps);
      timeline?.seek?.(time);
      scene.step?.(1 / fps);
      if (outputWidth && outputHeight) renderer.resize(outputWidth, outputHeight);
      else renderer.resize();
      renderer.render(scene);
      track?.requestFrame?.();
      options.onFrame?.({ frame, time, totalFrames });
      await delay(options.frameDelay ?? Math.max(1, Math.round(1000 / fps)));
    }

    recorder.stop();
    return await recording;
  } finally {
    if (recorder.state === "recording") recorder.stop();
    stopStream(stream);
    timeline?.seek?.(previousTime);
    if (wasPlaying) timeline?.play?.();
  }
}

export function downloadBlob(blob, filename = "flowlib-animation.webm", options = {}) {
  const doc = options.document || globalThis.document;
  const urlApi = options.URL || globalThis.URL;
  if (!doc?.createElement || !urlApi?.createObjectURL) {
    throw new Error("downloadBlob requires a DOM document and URL.createObjectURL.");
  }
  const url = urlApi.createObjectURL(blob);
  const anchor = doc.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  doc.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => urlApi.revokeObjectURL(url), options.revokeDelay ?? 1000);
  return url;
}

export class CanvasVideoRecorder {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = { ...options };
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
  }

  start(options = {}) {
    assertVideoRecordingSupport(this.canvas);
    if (this.recorder?.state === "recording") {
      throw new Error("CanvasVideoRecorder is already recording.");
    }
    this.options = { ...this.options, ...options };
    const fps = this.options.fps ?? 60;
    const mimeType = this.options.mimeType ?? pickVideoMimeType();
    this.stream = this.canvas.captureStream(fps);
    this.chunks = [];
    this.recorder = new MediaRecorder(this.stream, {
      mimeType: mimeType || undefined,
      videoBitsPerSecond: this.options.videoBitsPerSecond
    });
    this.recorder.addEventListener("dataavailable", (event) => {
      if (event.data?.size > 0) this.chunks.push(event.data);
    });
    this.recorder.start(this.options.timeslice);
    return this;
  }

  stop() {
    if (!this.recorder || this.recorder.state === "inactive") {
      return Promise.resolve(new Blob([], { type: this.options.mimeType || "video/webm" }));
    }
    return new Promise((resolve, reject) => {
      this.recorder.addEventListener("stop", () => {
        const blob = new Blob(this.chunks, { type: this.recorder.mimeType || this.options.mimeType || "video/webm" });
        stopStream(this.stream);
        this.stream = null;
        resolve(blob);
      }, { once: true });
      this.recorder.addEventListener("error", () => {
        stopStream(this.stream);
        this.stream = null;
        reject(this.recorder.error || new Error("Video recording failed."));
      }, { once: true });
      this.recorder.stop();
    });
  }
}

function assertVideoRecordingSupport(canvas) {
  if (!canvas?.captureStream) {
    throw new Error("Video export requires HTMLCanvasElement.captureStream support.");
  }
  if (!globalThis.MediaRecorder) {
    throw new Error("Video export requires MediaRecorder support.");
  }
}

function collectRecording(recorder, duration, options = {}) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    const stop = () => {
      if (recorder.state === "recording") recorder.stop();
    };
    const timer = setTimeout(stop, duration);
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data?.size > 0) chunks.push(event.data);
    });
    recorder.addEventListener("stop", () => {
      clearTimeout(timer);
      resolve(new Blob(chunks, { type: recorder.mimeType || options.mimeType || "video/webm" }));
    });
    recorder.addEventListener("error", () => {
      clearTimeout(timer);
      reject(recorder.error || new Error("Video recording failed."));
    });
    recorder.start(options.timeslice);
    options.onStart?.({ recorder });
  });
}

function stopStream(stream) {
  for (const track of stream?.getTracks?.() || []) {
    track.stop();
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
