# Tutorial 1: Your First Diagram

You will build a release-pipeline flowchart: define the data, lay it out, render it statically, then switch on interactivity. Time: ~10 minutes.

## Setup

Create `examples/my-first-diagram.html` in this repo (any file under `examples/` is served by `npm run dev`):

```html
<!doctype html>
<html lang="en">
  <body style="margin: 0; background: #f6f8fb;">
    <canvas id="canvas" width="1100" height="560" style="display: block; margin: 24px auto; background: #f8fafc;"></canvas>
    <script type="module">
      // tutorial code goes here
    </script>
  </body>
</html>
```

Run `npm run dev` and open `http://localhost:5173/examples/my-first-diagram.html`.

## Step 1 — Model the data

A diagram starts as a `DiagramModel`: nodes and edges, no visuals.

```js
import { DiagramModel } from "../src/index.js";

const model = new DiagramModel();
model.addNode({ id: "commit", label: "Commit" });
model.addNode({ id: "build", label: "Build" });
model.addNode({ id: "test", label: "Test" });
model.addNode({ id: "review", label: "Review" });
model.addNode({ id: "deploy", label: "Deploy" });

model.connectChain(["commit", "build", "test", "deploy"]);
model.connect("build", "review", { directed: true });
model.connect("review", "deploy", { directed: true });
```

`connectChain` links a list of nodes in order; `connect` adds a single directed edge. Every mutation emits change events, which matters in step 4.

## Step 2 — Lay it out

Nodes default to position `(0, 0)`. A layout assigns positions:

```js
import { LayeredLayout } from "../src/index.js";

new LayeredLayout({ direction: "LR", layerGap: 200, nodeGap: 110 }).apply(model);
```

`LayeredLayout` is right for flow-like diagrams. For general graphs try `GraphLayout` with a named algorithm — `spring`, `circular`, `tree`, `shell`, `grid`, and more (see [Diagrams and Layouts](../guides/diagrams-and-layouts.md)).

## Step 3 — Render it statically

```js
import { renderStaticDiagram } from "../src/index.js";

const view = renderStaticDiagram(document.querySelector("#canvas"), { model });
```

That's the whole static path: the view builds a scene from the model, fits the camera, and draws. No pointer listeners are attached — the canvas is inert, perfect for docs pages and dashboards.

Style nodes and edges through the model:

```js
model.updateNode("deploy", { style: { fill: "#0f766e", textFill: "#ffffff" } });
model.updateEdge(model.findEdge("review", "deploy").id, { style: { lineDash: [6, 6] } });
```

Because the view watches the model, both updates repaint automatically.

## Step 4 — Switch on interactivity

Replace the `renderStaticDiagram` call:

```js
import { LiveDiagramEngine } from "../src/index.js";

const engine = new LiveDiagramEngine({
  canvas: document.querySelector("#canvas"),
  model
});
engine.fit();
engine.start();

engine.on("node:doubleclick", ({ node }) => engine.beginInlineEdit(node.id));
```

Now drag nodes, drag empty space to pan, wheel to zoom, double-click to rename. The engine reuses the exact same model — interactivity is a view decision, not a data decision.

Want it interactive but not editable? Pass `interactions: "view"`. See [Tutorial 4](04-static-diagrams-and-embedding.md).

## Shortcut: factories

Common diagram shapes ship as one-liners that return ready-made models (or scenes):

```js
import { createFlowchart, createStateMachine, createMindMap } from "../src/index.js";

const flow = createFlowchart(["Parse input", "Validate", "Run layout", "Render"]);
const machine = createStateMachine(["Idle", "Loading", "Ready"], [["Idle", "Loading"], ["Loading", "Ready"]]);
```

## Next

[Tutorial 2: Animating a Scene](02-animating-a-scene.md) — make this pipeline pulse, cascade in, and trace its edges.
