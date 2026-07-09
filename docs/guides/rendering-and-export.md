# Rendering and Export Guide

How pixels get made: renderers, pixel ratios, render loops, and every export path.

## Canvas2DRenderer

The complete renderer. Handles all primitive nodes, text and math text, diagram nodes/edges with markers and shadows, boolean shapes, images, and projected 3D nodes.

```js
import { Canvas2DRenderer } from "@flowlib/engine";

const renderer = new Canvas2DRenderer(canvas, {
  pixelRatio: window.devicePixelRatio,   // default; backing store scale
  clear: true                             // clear before each render (default)
});

renderer.resize(1280, 720);   // logical size; backing store = size * pixelRatio
renderer.render(scene);
```

`setPixelRatio(ratio)` changes backing-store scale at runtime — text and math stay crisp on high-DPI displays at the default, and exports usually pin it to `1` for predictable output resolution.

## WebGL2Renderer

A shader-backed foundation (solid/SDF primitives). Same `resize`/`render` interface. Canvas2D remains the complete implementation; WebGL2 is where batching and text atlases will land.

## Render loops

Nothing renders continuously by itself. Three patterns:

```js
// 1. Static: render on demand
renderer.render(scene);

// 2. Managed: LiveDiagramEngine and DiagramView render for you
//    (engine: every frame while running; view: on model changes)

// 3. Manual loop for animated scenes
function tick(now) {
  timeline.step(dt);
  scene.step(dt);       // runs node updaters
  renderer.render(scene);
  requestAnimationFrame(tick);
}
```

## Video export

Two strategies, one output (WebM via `MediaRecorder`):

**Deterministic** — render a timeline frame-by-frame; identical output every run:

```js
const blob = await exportSceneToWebM({
  canvas, renderer, scene, timeline,
  width: 1280, height: 720, duration: timeline.duration, fps: 30,
  onFrame: (frame, total) => progress(frame / total)
});
downloadBlob(blob, "scene.webm");
```

**Real-time** — capture whatever happens on the canvas, including live interaction:

```js
const blob = await recordCanvasToWebM(canvas, { duration: 5, fps: 30 });

// or manual start/stop
const rec = new CanvasVideoRecorder(canvas, { fps: 30 }).start();
const blob2 = await rec.stop();
```

Codec helpers: `getSupportedVideoMimeTypes()`, `pickVideoMimeType()`. Both export helpers throw descriptive errors when `MediaRecorder`/`captureStream` are unavailable (e.g. some Safari versions) — surface those to users rather than swallowing them.

## Image export

```js
import { canvasToBlob, canvasToDataURL, exportCanvasToPNG } from "@flowlib/engine";

await exportCanvasToPNG(canvas, "diagram.png");            // download
const blob = await canvasToBlob(canvas, { type: "image/png" });
const uri = canvasToDataURL(canvas, { type: "image/jpeg", quality: 0.9 });
```

`DiagramView.toBlob()` / `.toDataURL()` wrap these for static views.

## Sizing and DPI cheat sheet

| Goal | Do |
|---|---|
| Crisp UI rendering | default `pixelRatio` (devicePixelRatio) |
| Exact 1280x720 video | `renderer.setPixelRatio(1)` before export, restore after |
| High-res PNG poster | keep high `pixelRatio`; the PNG captures physical pixels |
| Responsive canvas | CSS-size the canvas, call `renderer.resize(logicalW, logicalH)` on resize |

The workspace (`examples/workspace.html`) implements all of this — canvas size presets, DPI handling around WebM export, and PNG snapshots — and is a good reference implementation.

## Headless rendering

Flowlib has zero dependencies and only needs a canvas, so server-side/CI export is a headless browser away (Playwright/Puppeteer): load a page that builds your scene, call the same export helpers, save the blob.
