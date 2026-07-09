# Tutorial 5: Exporting Video and Images

Flowlib exports WebM video from timelines and PNG stills from any canvas, using only browser APIs (`captureStream`, `MediaRecorder`, `Blob`). Time: ~10 minutes.

## Deterministic scene export

`exportSceneToWebM` renders a timeline frame-by-frame, so output is identical on every run regardless of machine speed — the right tool for producing animation videos:

```js
import { Canvas2DRenderer, Scene, Timeline, downloadBlob, exportSceneToWebM } from "../src/index.js";

// scene + timeline from Tutorial 2 ...

const renderer = new Canvas2DRenderer(canvas);
const blob = await exportSceneToWebM({
  canvas,
  renderer,
  scene,
  timeline,
  width: 1280,
  height: 720,
  duration: timeline.duration,
  fps: 30
});

downloadBlob(blob, "scene.webm");
```

Options worth knowing:

- `fps` — frames per second (default 60). 30 halves encode time.
- `width`/`height` — output resolution; the renderer is resized for the export.
- `mimeType` — defaults to the best supported WebM codec (`pickVideoMimeType()`); check availability with `getSupportedVideoMimeTypes()`.
- `videoBitsPerSecond` — raise for complex scenes with lots of motion.
- `onFrame(frame, total)` — progress callback for a UI.

## Recording live interaction

To capture whatever is happening on a canvas — including user interaction with a `LiveDiagramEngine` — record in real time:

```js
import { recordCanvasToWebM, downloadBlob } from "../src/index.js";

const blob = await recordCanvasToWebM(canvas, { duration: 5, fps: 30 });
downloadBlob(blob, "session.webm");
```

For manual start/stop control (e.g. record exactly one user gesture):

```js
import { CanvasVideoRecorder } from "../src/index.js";

const recorder = new CanvasVideoRecorder(canvas, { fps: 30 }).start();
// ... interaction happens ...
const blob = await recorder.stop();
```

## PNG stills

```js
import { canvasToBlob, canvasToDataURL, exportCanvasToPNG } from "../src/index.js";

await exportCanvasToPNG(canvas, "diagram.png");          // triggers a download
const blob = await canvasToBlob(canvas);                  // for uploads/clipboard
const uri = canvasToDataURL(canvas, { type: "image/png" }); // for <img src>
```

`DiagramView` exposes the same via `view.toBlob()` / `view.toDataURL()`.

## Pixel ratio and quality

Renderers draw at `devicePixelRatio` by default, so a 1280x720 canvas on a 2x display has a 2560x1440 backing store. For video export you usually want a predictable resolution:

```js
renderer.setPixelRatio(1);      // before export
// ... export ...
renderer.setPixelRatio(window.devicePixelRatio);  // restore
```

PNG stills, by contrast, benefit from the high-DPI backing store — leave the ratio alone.

## In the workspace

`examples/workspace.html` wires all of this to buttons: **Export WebM** records the current timeline at the selected canvas size (with pixel ratio handling and restore), and **Export PNG** snapshots the canvas. Canvas size presets (1280x720 through 1920x1080, square, portrait) map directly to the export resolution.

## Browser support notes

- WebM encoding requires `MediaRecorder` — available in Chromium and Firefox; Safari support varies by version. `getSupportedVideoMimeTypes()` returns `[]` when recording is unavailable, and the export helpers throw a clear error.
- Offline/headless export works in Playwright or Puppeteer with the same code.
