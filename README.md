# Flowlib

Flowlib is a JavaScript engine for code-driven diagrams, live visual graph editing, and animation. It is meant to grow toward a Manim-like authoring model while also supporting interactive, non-rendered-live canvases for flow charts, knowledge graphs, mind maps, whiteboards, state machines, and code maps.

The current repository is an initial engine slice:

- Dependency-free ES modules for browser embeddability.
- A scene graph with transformable nodes, shape primitives, 2D/3D cameras, and update hooks.
- A timeline/tween animation core with deterministic stepping.
- Diagram data structures for nodes, edges, transactions, and serialization.
- Built-in layered, force, and mind-map layout implementations.
- Manim-style `GraphDiagram` and `DiGraph` builders with custom circular, spring, tree, partite, shell, spiral, grid, random, and manual layouts.
- Diagram factories for flowcharts, knowledge graphs, mind maps, state machines, function maps, dendrograms, circle diagrams, triangle-node diagrams, Venn diagrams, and quadrant charts.
- Mathematical graphing helpers for axes, sampled functions, parametric curves, polar plots, camera-driven projected 3D curves, Riemann rectangles, and area sectors.
- A custom math text parser/layout/drawing library for formula markup such as `frac{x}{y}`, `x_i^2`, `sum_{i=1}^{n}`, roots, functions, Greek symbols, and discrete operators, with bundled CMU Serif/Computer Modern fonts and browser font-face loading hooks.
- Mobject-style scene classes (`Mobject`, `VMobject`, `VGroup`) and Bezier curve utilities.
- Boolean shape nodes for union, intersection, difference, and exclusion over primitive paths.
- Code-generated image helpers for turning SVG strings or canvas drawing callbacks into displayable scene image nodes.
- Value trackers and traced paths for Manim-style continuously updated scenes.
- A full Canvas2D renderer plus a shader-backed WebGL2 renderer foundation.
- WebM video export helpers for recording live canvases or deterministic scene timelines.
- A live diagram engine for pointer interaction, pan, zoom, dragging, layout, and render scheduling.
- Connection editing APIs for connecting, disconnecting, reconnecting, and rebuilding chains.
- Event hooks for node click, double-click, context-menu, drag, inline text editing, and connection workflows.
- Manim-inspired animation presets such as `moveTo`, `fadeIn`, `pulse`, `indicate`, `traceBetween`, `moveAlongPath`, `growToSize`, `rotateBy`, and 2D/3D camera movement helpers.

## Quick Start

Full API documentation lives in [`docs/API.md`](docs/API.md).

```js
import {
  DiagramModel,
  LayeredLayout,
  LiveDiagramEngine
} from "./src/index.js";

const model = new DiagramModel();
model.addNode({ id: "start", label: "Start" });
model.addNode({ id: "work", label: "Do work" });
model.addEdge({ source: "start", target: "work", directed: true });

new LayeredLayout().apply(model);

const engine = new LiveDiagramEngine({
  canvas: document.querySelector("canvas"),
  model
});

engine.start();
```

## Live Editing

```js
engine.on("node:contextmenu", ({ node, screen }) => {
  openNodeMenu(node, screen);
});

engine.startConnection("start", { oneShot: true });
engine.completeConnection("work");

model.reconnectEdge("start->work", { target: "review" });
model.connectChain(["start", "review", "done"], { clearExisting: true });

engine.beginInlineEdit("start");
```

## Animation Presets

```js
import { Timeline, cameraTo, growToSize, moveAlongPath, pulse, rotateBy, traceBetween } from "./src/index.js";

const timeline = new Timeline({ autoplay: true, loop: true });
pulse(timeline, stateNode, { at: 0, duration: 0.35 });
traceBetween(timeline, marker, idleNode, loadingNode, { at: 0, duration: 0.7 });
moveAlongPath(timeline, marker, curve.points, { duration: 2 });
growToSize(timeline, circle, 80, { duration: 0.4 });
rotateBy(timeline, triangle, Math.PI / 3, { duration: 0.4 });
cameraTo(timeline, scene.camera, { position: { x: 120, y: 0 }, zoom: 1.4 });
```

## 3D Camera Motion

```js
import { Camera3D, ProjectedPath3DNode, Timeline, camera3DOrbitBy } from "./src/index.js";

const camera3D = new Camera3D({
  position: { x: 3, y: 2, z: 4 },
  target: { x: 0, y: 0, z: 0 },
  zoom: 100
});

const curve = new ProjectedPath3DNode({
  camera3D,
  points3D: [{ x: -1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }]
});

const timeline = new Timeline({ autoplay: true, loop: true });
camera3DOrbitBy(timeline, camera3D, { yaw: Math.PI * 2 }, { duration: 6, ease: "linear" });
```

## Boolean Shapes

```js
import { DifferenceNode, EllipseNode, IntersectionNode, UnionNode } from "./src/index.js";

const left = new EllipseNode({ x: -70, radiusX: 95, radiusY: 120 });
const right = new EllipseNode({ x: 70, radiusX: 95, radiusY: 120 });

const intersection = new IntersectionNode([left, right], {
  style: { fill: "rgba(22, 163, 74, 0.55)", stroke: "#16a34a" }
});
const union = new UnionNode([left, right]);
const difference = new DifferenceNode([left, right]);
```

## Video Export

```js
import { Canvas2DRenderer, downloadBlob, exportSceneToWebM } from "./src/index.js";

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

## Graphs And Diagram Types

```js
import {
  GraphLayout,
  createDiGraph,
  createDendrogram,
  createKnowledgeGraph,
  createMindMap,
  createQuadrantChart,
  createStateMachine
} from "./src/index.js";

const graph = createDiGraph(["A", "B", "C"], [["A", "B"], ["B", "C"]], {
  layout: "tree",
  labels: true
});

graph.changeLayout("circular");

const knowledge = createKnowledgeGraph(["Engine", "Renderer"], [
  { source: "engine", target: "renderer", label: "draws through" }
]);

new GraphLayout({ name: "spring" }).apply(knowledge);

const dendrogram = createDendrogram({
  label: "Root",
  children: [{ label: "Cluster A", children: ["A1", "A2"] }]
});

const quadrant = createQuadrantChart([
  { x: -0.7, y: 0.8, label: "Quick win" },
  { x: 0.6, y: 0.5, label: "Strategic bet" }
]);
```

The graph API mirrors the relevant Manim Community concepts: `Graph`, `DiGraph`, directed edge semantics, labels, vertex/edge configuration, and named layouts such as spring, circular, tree, shell, and partite. The animation layer similarly tracks Manim-style creation, transform, indication, and path-following behaviors while keeping the implementation JavaScript-native.

Open `examples/workspace.html` in a local dev server, or run:

```sh
npm run dev
```

The dev server opens the interactive workspace at `http://localhost:5173/examples/workspace.html` by default. The workspace includes a preset dropdown, live node editing, connection mode, layout switching, rich text/math/image insertion, shape animations, path tracing, camera controls, selected-object and camera keyframes, built-in animation markers, adjustable canvas size, and WebM export. The workspace defaults to a 1280 x 720 landscape canvas so camera framing and recordings are landscape by default.

The workspace dropdown also includes a Boolean operations scene, a projection-proof demonstration for why perspective projection divides by z, plus recreated examples from page 2 of The Manim Repository. The harmonograph example now uses the math text library for parametric equations, live subscripted parameters, fractions, exponents, functions, and summation notation.

## Architecture

Flowlib is split into boundaries that should remain stable as the engine grows:

- `core`: math, colors, bounds, eventing, ids.
- `scene`: renderable object graph, 2D/3D cameras, primitive nodes, and projected 3D nodes.
- `animation`: timelines, tweens, easing, interpolation.
- `curves`: Bezier helpers for sampling, tangents, splitting, and path animation.
- `graphing`: axes, function/parametric/polar sampling, projected 3D helpers, and integration primitives.
- `diagrams`: graph model, scene adapter, layouts.
- `examples`: recreatable scene factories and workspace presets.
- `render`: Canvas2D and WebGL2 renderers.
- `live`: interactive diagram engine for embeddable editors.

## Design Direction

The engine should prefer custom implementations where visual control matters: layout, interpolation, hit testing, batching, shaders, and interaction semantics. Third-party dependencies can still be introduced for narrow tasks, but rendering, animation, and diagram semantics should remain owned by Flowlib.

Near-term expansion targets:

- Text atlas rendering for WebGL2 labels.
- Path morphing, braces, arrows, matrices, axes, and math/code primitives.
- Offline frame encoders beyond browser WebM capture.
- Constraint-based layouts for whiteboards and function maps.
- Plugin surfaces for custom node kinds, edge routers, inspectors, and live tools.
- Reactive data bindings for IDE, docs, and browser embeds.
