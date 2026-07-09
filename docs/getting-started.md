# Getting Started

Flowlib ships as dependency-free ES modules. There is no build step, no framework requirement, and nothing to configure: a browser, a `<canvas>`, and a module import are enough.

## Install

Inside this repository:

```sh
npm install   # no runtime dependencies; installs nothing beyond tooling
npm run dev   # serves the examples at http://localhost:5173
```

As a package, import from `@flowlib/engine` (or a subpath export such as `@flowlib/engine/diagrams` when you want a smaller boundary). Examples inside this repo import from `../src/index.js` instead.

```js
import { DiagramModel, LiveDiagramEngine } from "@flowlib/engine";
```

## Your first render (60 seconds)

Create an HTML file with a canvas and a module script:

```html
<canvas id="canvas" width="960" height="540"></canvas>
<script type="module">
  import { DiagramModel, LayeredLayout, renderStaticDiagram } from "../src/index.js";

  const model = new DiagramModel();
  model.addNode({ id: "start", label: "Start" });
  model.addNode({ id: "work", label: "Do work" });
  model.addNode({ id: "done", label: "Done" });
  model.connectChain(["start", "work", "done"]);

  renderStaticDiagram(document.querySelector("#canvas"), {
    model,
    layout: new LayeredLayout({ direction: "LR" })
  });
</script>
```

That is a complete static diagram: laid out, fitted to the canvas, and drawn. `renderStaticDiagram` returns a `DiagramView` you can keep around — it re-renders automatically when the model changes and can export PNGs.

## Make it interactive

Swap the static view for the live engine and the same model becomes a whiteboard — draggable nodes, pan, zoom, selection, and connection editing:

```js
import { DiagramModel, LayeredLayout, LiveDiagramEngine } from "../src/index.js";

const engine = new LiveDiagramEngine({
  canvas: document.querySelector("#canvas"),
  model,
  layout: new LayeredLayout({ direction: "LR" })
});

engine.applyLayout();
engine.start();
```

Prefer something in between? `interactions: "view"` gives you pan/zoom and click events without any editing, and `interactions: "none"` disables pointer input entirely. See [Static Diagrams and Embedding](tutorials/04-static-diagrams-and-embedding.md).

## Make it move

Every scene and engine carries a `Timeline`. Animation helpers append tweens to it:

```js
import { pulse, cascadeIn } from "../src/index.js";

const node = engine.model.requireNode("work");
pulse(engine.timeline, node, { duration: 0.4 });
engine.timeline.play();
```

The [Animating a Scene](tutorials/02-animating-a-scene.md) tutorial builds this up into full timeline choreography — easing, labels, stagger, repeat/yoyo — and the [Animation guide](guides/animation.md) covers the complete workflow including serializable keyframe clips.

## Explore the workspace

```sh
npm run dev
```

opens `examples/workspace.html`: an editor with preset diagrams and Manim-style scenes, live node editing, a keyframe panel (easing, playback speed, looping, clip save/load), camera controls, interaction modes, and WebM/PNG export. It is the fastest way to see everything the engine can do.

## Where to go next

- [Core Concepts](concepts.md) — the five building blocks and how they connect.
- [Tutorials](README.md#tutorials) — guided builds, from first diagram to video export.
- [API Reference](API.md) — every export, by module.
