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
