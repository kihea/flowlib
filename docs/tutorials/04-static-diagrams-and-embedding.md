# Tutorial 4: Static Diagrams and Embedding

Not every diagram is a whiteboard. Documentation pages, dashboards, reports, and generated images need diagrams that are *displays*, not editors. This tutorial covers the three embedding levels and image export. Time: ~10 minutes.

A live comparison of all three levels is at `examples/static-diagram.html` (`npm run dev`).

## Level 0 — Fully static: `DiagramView`

`DiagramView` renders a model (or a prebuilt `Scene`) with **zero pointer handling** — nothing is attached to the canvas:

```js
import { DiagramModel, DiagramView, LayeredLayout } from "../src/index.js";

const model = new DiagramModel();
model.addNode({ id: "in", label: "Input" });
model.addNode({ id: "out", label: "Output" });
model.connect("in", "out", { directed: true });

const view = new DiagramView({
  canvas: document.querySelector("#canvas"),
  model,
  layout: new LayeredLayout({ direction: "LR" }),
  padding: 60,             // fit-to-content padding (default 60)
  background: "#ffffff"
});
```

The view:

- runs the layout, fits the camera, and renders immediately;
- re-renders whenever the model changes (disable with `watch: false`);
- exports images: `view.toDataURL()`, `await view.toBlob()`;
- cleans up with `view.destroy()`.

For one-off rendering there's a convenience wrapper that returns the view:

```js
import { renderStaticDiagram } from "../src/index.js";
const view = renderStaticDiagram(canvas, { model, layout: new LayeredLayout() });
```

## Level 1 — Pan and zoom only

Two options, depending on what you need:

**`DiagramView` with `interactive: true`** — adds pan (drag) and zoom (wheel), nothing else. Lightest possible viewer:

```js
new DiagramView({ canvas, model, interactive: true });
```

**`LiveDiagramEngine` with `interactions: "view"`** — pan, zoom, hover highlighting, and click/selection events, but no editing. Use this when your embed needs to *respond* to clicks:

```js
import { LiveDiagramEngine } from "../src/index.js";

const viewer = new LiveDiagramEngine({ canvas, model, interactions: "view" });
viewer.applyLayout();
viewer.start();
viewer.on("node:click", ({ node }) => showDetails(node));
```

`interactions: "none"` keeps the live render loop (so timeline animations still play) while ignoring pointer input entirely — an animated, non-interactive embed.

You can move between levels at runtime: `viewer.setInteractions("edit")` turns the same canvas into a whiteboard.

## Level 2 — The whiteboard

Full editing, covered in [Tutorial 3](03-building-an-interactive-editor.md). The point of the level system: **the model is identical at every level**. Persist one JSON document; choose the interaction policy per surface.

```js
const data = model.toSceneData();          // or your own serialization
const restored = DiagramModel.from(data);
```

## Exporting images

Any canvas Flowlib draws to can be captured:

```js
import { canvasToBlob, exportCanvasToPNG } from "../src/index.js";

// download a PNG
await exportCanvasToPNG(canvas, "pipeline.png");

// or handle the blob yourself (upload, clipboard, ...)
const blob = await canvasToBlob(canvas, { type: "image/png" });
```

For crisp exports on high-DPI displays the canvas backing store already renders at `devicePixelRatio`; the PNG captures those physical pixels.

For server-side/CI rendering, run the same code in a headless browser (Playwright, Puppeteer) — Flowlib has no dependencies and needs only a canvas.

## Choosing a level

| Need | Use |
|---|---|
| Image in docs, report, README | `DiagramView` + `exportCanvasToPNG` |
| Diagram on a docs page, user may zoom | `DiagramView` with `interactive: true` |
| Dashboard tile, click for details | `LiveDiagramEngine` + `interactions: "view"` |
| Animated hero/illustration | `LiveDiagramEngine` + `interactions: "none"` + timeline |
| Editor, whiteboard, canvas tool | `LiveDiagramEngine` (default `"edit"`) |

## Next

[Tutorial 5: Exporting Video and Images](05-exporting-video.md) — deterministic WebM from timelines.
