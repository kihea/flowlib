# Tutorial 3: Building an Interactive Editor

You will embed the live whiteboard engine and wire its events into your own UI: selection, inline renaming, context menus, connection tools, and animated layout switching. Time: ~15 minutes.

The finished pattern is what powers `examples/workspace.html`.

## Step 1 — Mount the engine

```js
import { DiagramModel, GraphLayout, LiveDiagramEngine } from "../src/index.js";

const model = new DiagramModel();
model.addNode({ id: "a", label: "Alpha" });
model.addNode({ id: "b", label: "Beta" });
model.addNode({ id: "c", label: "Gamma" });
model.connectChain(["a", "b", "c"]);

const engine = new LiveDiagramEngine({
  canvas: document.querySelector("#canvas"),
  model,
  layout: new GraphLayout({ name: "spring" }),
  background: "#f8fafc"
});

engine.applyLayout();  // run the layout and fit the camera
engine.start();        // begin the render loop
```

Out of the box you get: node dragging, empty-space panning, wheel zoom, click selection (shift for additive), and hover highlighting.

## Step 2 — React to events

The engine emits everything your UI needs. The full list is in the [API reference](../API.md#live-engine); these are the ones every editor uses:

```js
engine.on("selection:change", ({ selection }) => {
  inspector.show([...selection]);
});

engine.on("node:doubleclick", ({ node }) => {
  engine.beginInlineEdit(node.id);   // floating input over the node
});

engine.on("node:contextmenu", ({ node, screen }) => {
  openMenuAt(screen, node);          // screen is in canvas coordinates
});

engine.on("node:dragend", ({ node }) => {
  saveModel();                       // positions were committed to the model
});
```

Inline editing commits on Enter or outside-click and cancels on Escape; you also get `node:editstart`, `node:editcommit`, and `node:editcancel`.

## Step 3 — Connection workflows

Connection mode can be driven by a toolbar or entirely from code:

```js
// Toolbar toggle: every node click starts/completes a connection
engine.setTool("connect");

// One-shot: "connect from this node, then return to select mode"
engine.startConnection("a", { oneShot: true });
// ...the user clicks a target node, or you complete it programmatically:
engine.completeConnection("c");

// Rerouting an existing edge to a new target
const edge = model.outgoing("a")[0];
engine.startConnection(edge.source, { edgeId: edge.id, endpoint: "target", oneShot: true });
```

While a connection is pending the engine renders a dashed preview line to the pointer. Listen for `connection:create`, `connection:reconnect`, and `connection:cancel`.

Model-level equivalents (no pointer interaction) live on `DiagramModel`: `connect`, `disconnect`, `reconnectEdge`, `connectChain`.

## Step 4 — Animated layout switching

`applyLayout` snaps; `animateLayout` tweens every node from its old position to its new one:

```js
import { GraphLayout, LayeredLayout } from "../src/index.js";

const layouts = [
  new GraphLayout({ name: "circular" }),
  new GraphLayout({ name: "tree", root: "a" }),
  new LayeredLayout({ direction: "LR" })
];
let index = 0;

button.addEventListener("click", () => {
  engine.animateLayout(layouts[index++ % layouts.length], { duration: 0.5, ease: "inOutCubic" });
});
```

## Step 5 — Interaction modes and readonly embeds

The same engine serves editors, viewers, and static displays:

```js
engine.setInteractions("view");   // pan/zoom/click only — nodes can't be moved or edited
engine.setInteractions("none");   // pointer input off entirely
engine.setInteractions("edit");   // full whiteboard again
```

In `"view"` mode dragging anywhere pans the camera (including over nodes), clicks still select and emit `node:click`, and editing APIs stay available to your code — only pointer-driven editing is disabled. Use this for dashboards where users may inspect but not rearrange.

## Step 6 — Animating inside the editor

The engine owns a timeline (`engine.timeline`) that its render loop steps automatically, so animation presets work directly on model nodes:

```js
import { pulse } from "../src/index.js";

engine.on("connection:create", ({ edge }) => {
  pulse(engine.timeline, model.requireNode(edge.target), { at: engine.timeline.time, duration: 0.4 });
  engine.timeline.play();
});
```

For a full keyframe-authoring UI — scrubber, easing selection, clip save/load — see the workspace's Keyframes panel (`examples/workspace.html`) and the [Animation guide](../guides/animation.md#animation-clips).

## Next

[Tutorial 4: Static Diagrams and Embedding](04-static-diagrams-and-embedding.md) — the other end of the interaction spectrum.
