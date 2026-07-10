import assert from "node:assert/strict";
import test from "node:test";
import { Canvas2DRenderer, downloadBlob, getSupportedVideoMimeTypes, pickVideoMimeType, recordCanvasToWebM } from "../src/index.js";

test("video MIME helpers choose supported WebM formats", () => {
  const original = globalThis.MediaRecorder;
  globalThis.MediaRecorder = {
    isTypeSupported(type) {
      return type === "video/webm;codecs=vp8" || type === "video/webm";
    }
  };

  try {
    const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    assert.deepEqual(getSupportedVideoMimeTypes(candidates), ["video/webm;codecs=vp8", "video/webm"]);
    assert.equal(pickVideoMimeType(candidates), "video/webm;codecs=vp8");
  } finally {
    if (original === undefined) delete globalThis.MediaRecorder;
    else globalThis.MediaRecorder = original;
  }
});

test("canvas recording reports missing browser APIs clearly", async () => {
  const original = globalThis.MediaRecorder;
  globalThis.MediaRecorder = undefined;

  try {
    await assert.rejects(recordCanvasToWebM({}), /captureStream/);
    await assert.rejects(recordCanvasToWebM({ captureStream() {} }), /MediaRecorder/);
  } finally {
    if (original === undefined) delete globalThis.MediaRecorder;
    else globalThis.MediaRecorder = original;
  }
});

test("downloadBlob requires DOM download primitives", () => {
  assert.throws(() => downloadBlob(new Blob(), "scene.webm", { document: {}, URL: {} }), /requires a DOM document/);
});

test("Canvas2DRenderer sizes its backing store for high DPI displays", () => {
  const canvas = {
    width: 0,
    height: 0,
    clientWidth: 0,
    clientHeight: 0,
    style: {},
    getContext() {
      return {};
    }
  };
  const renderer = new Canvas2DRenderer(canvas, { pixelRatio: 2 });

  renderer.resize(320, 180);
  assert.equal(canvas.width, 640);
  assert.equal(canvas.height, 360);
  assert.equal(canvas.style.width, "320px");
  assert.equal(canvas.style.height, "180px");

  renderer.setPixelRatio(1.5).resize(100, 50);
  assert.equal(canvas.width, 150);
  assert.equal(canvas.height, 75);
  assert.equal(renderer.displayWidth, 100);
  assert.equal(renderer.displayHeight, 50);
});

test("Canvas2DRenderer no-arg resize converges on CSS-sized canvases with borders", () => {
  // Models a canvas styled `width: 100%; height: 320px; border: 1px; box-sizing: border-box`:
  // client size is CSS-driven (2px smaller than style), and attribute writes do not change layout.
  const canvas = {
    width: 1040,
    height: 320,
    style: {},
    getContext() {
      return {};
    },
    get clientWidth() {
      return (this.style.width ? parseFloat(this.style.width) : 1040) - 2;
    },
    get clientHeight() {
      return (this.style.height ? parseFloat(this.style.height) : 320) - 2;
    }
  };
  const renderer = new Canvas2DRenderer(canvas, { pixelRatio: 1 });

  const initialClientWidth = canvas.clientWidth;
  for (let frame = 0; frame < 10; frame += 1) {
    renderer.resize();
  }

  assert.equal(canvas.clientWidth, initialClientWidth, "repeated no-arg resize must not shrink the canvas");
  assert.equal(canvas.style.width, undefined, "CSS-sized canvases must not get inline style overrides");
  assert.equal(canvas.width, initialClientWidth, "backing store tracks the measured client size");
});

test("Canvas2DRenderer no-arg resize pins display size on attribute-sized canvases", () => {
  // Models a bare <canvas width=320 height=180> with no CSS sizing: the element renders
  // at its backing-store size unless an inline style pins the display size.
  const canvas = {
    width: 320,
    height: 180,
    style: {},
    getContext() {
      return {};
    },
    get clientWidth() {
      return this.style.width ? parseFloat(this.style.width) : this.width;
    },
    get clientHeight() {
      return this.style.height ? parseFloat(this.style.height) : this.height;
    }
  };
  const renderer = new Canvas2DRenderer(canvas, { pixelRatio: 2 });

  for (let frame = 0; frame < 10; frame += 1) {
    renderer.resize();
  }

  assert.equal(canvas.width, 640, "backing store scales by pixel ratio");
  assert.equal(canvas.style.width, "320px", "display size is pinned so the element does not grow");
  assert.equal(canvas.clientWidth, 320, "rendered size stays stable across repeated resizes");
});
