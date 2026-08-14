# Flowlib

**A vibe-coded dependency-free JavaScript engine for diagrams, mathematical scenes, and Manim-style animation — from static displays to live, embeddable whiteboards.**

## Try it

Live in your browser, no install:

- **[Workspace](https://kihea.github.io/flowlib/examples/workspace.html)** — the full authoring environment
- [Live flowchart](https://kihea.github.io/flowlib/examples/live-flowchart.html) · [Animated state machine](https://kihea.github.io/flowlib/examples/animated-state-machine.html) · [Diagram types](https://kihea.github.io/flowlib/examples/diagram-types.html)
- [Graph layouts](https://kihea.github.io/flowlib/examples/graph-layouts.html) · [Function graph](https://kihea.github.io/flowlib/examples/function-graph.html) · [Static diagram](https://kihea.github.io/flowlib/examples/static-diagram.html)

```js
import { DiagramModel, LayeredLayout, LiveDiagramEngine } from "@flowlib/engine";

const model = new DiagramModel();
model.addNode({ id: "start", label: "Start" });
model.addNode({ id: "work", label: "Do work" });
model.connectChain(["start", "work"]);

const engine = new LiveDiagramEngine({ canvas, model, layout: new LayeredLayout() });
engine.applyLayout();
engine.start();
```

## Why Flowlib

- **Zero dependencies.** ES modules, a canvas, and nothing else. No build step required.
- `DiagramView` for static displays; `LiveDiagramEngine` with `interactions: "edit" | "view" | "none"` for everything from whiteboards to animated hero graphics — all over the same model.
- **A real animation system.** Deterministic timelines with position parameters (`"+=0.5"`, `"<"`, labels), ~30 named easings plus `steps`/`cubicBezierEase` factories, repeat/yoyo/reverse/timeScale, stagger, callbacks — and serializable `AnimationClip` keyframes that round-trip between code and the visual editor.
- **Manim-inspired, JavaScript-native.** Graph builders, mobjects, value trackers, traced paths, boolean shapes, projected 3D cameras, and a TeX-like math text renderer with bundled Computer Modern fonts.
- **Ships with an editor.** The workspace is a full authoring environment: presets, live editing, a keyframe panel with easing and clip save/load, camera tools, and WebM/PNG export.

## Feature map

| Area | Highlights |
|---|---|
| Diagrams | `DiagramModel` with events/transactions/serialization; factories for flowcharts, state machines, mind maps, knowledge graphs, dendrograms, Venn, quadrant charts; Manim-style `Graph`/`DiGraph` builders |
| Layouts | Layered, force, mind-map, plus named graph layouts: spring, circular, tree, shell, partite, spiral, grid, random, manual |
| Animation | Timeline + tweens, easing catalog, presets (`pulse`, `moveAlongPath`, `drawLine`, `cascadeIn`, camera moves…), stagger, labels, repeat/yoyo, serializable keyframe clips |
| Interaction | Whiteboard editing (drag, connect, reconnect, inline text), pan/zoom viewer mode, static mode, rich event surface |
| Math & graphing | Axes, function/parametric/polar plots, Riemann sums, polar sectors, projected 3D curves, formula markup (`frac{x}{y}`, `sum_{i=1}^{n}`) |
| Rendering & export | Canvas2D renderer (high-DPI aware), WebGL2 foundation, deterministic WebM export, live recording, PNG/data-URL capture |

## Getting started

```sh
npm install
npm run dev   # opens the workspace at http://localhost:5173/examples/workspace.html
```

Then read **[Getting Started](docs/getting-started.md)** — first render in 60 seconds.

## Documentation

| | |
|---|---|
| [Getting Started](docs/getting-started.md) | Install, first diagram, first animation |
| [Core Concepts](docs/concepts.md) | Model → scene → timeline → renderer → view |
| [Tutorials](docs/README.md#tutorials) | First diagram · animation · interactive editor · static embedding · video export |
| [Animation Guide](docs/guides/animation.md) | The full workflow, easing catalog, keyframe clips |
| [Diagrams & Layouts](docs/guides/diagrams-and-layouts.md) | Model, factories, layout catalog |
| [Graphing & Math Text](docs/guides/graphing-and-math-text.md) | Plots, integrals, 3D projection, formulas |
| [Rendering & Export](docs/guides/rendering-and-export.md) | Renderers, DPI, video, images |
| [API Reference](docs/API.md) | Every export, by module |
| [Examples](docs/examples.md) | Annotated map of `examples/` |

## The workspace

`examples/workspace.html` is Flowlib's authoring environment:

- Preset diagrams (flowchart, dendrogram, Venn, quadrant, graph layouts…) and recreated Manim Repository scenes (harmonograph, Lorenz attractor, Riemann integral, and more).
- Live editing: drag, connect, chain, reroute, rename inline, context menus, shape cycling, duplication.
- **Animation panel**: set keyframes on objects and cameras with per-keyframe easing, scrub the timeline, control speed and looping, and save/load animations as clip JSON that replays through the API.
- **Canvas modes**: switch the same canvas between Edit (whiteboard), View (pan & zoom), and Static display.
- Text, math formula, and generated-image insertion; 2D/3D camera controls; canvas size presets; WebM and PNG export.

## Architecture

Stable module boundaries (also the package's subpath exports):

`core` (math, colors, events) · `scene` (nodes, cameras, mobjects) · `animation` (timelines, easing, clips, presets) · `curves` (Bezier) · `graphing` (plots, integration) · `math` (formula parser/renderer) · `diagrams` (model, factories, layouts) · `render` (Canvas2D, WebGL2, video/image export) · `live` (engine + static views) · `examples` (recreatable scenes)

Design direction: Flowlib prefers custom implementations where visual control matters — layout, interpolation, hit testing, interaction semantics — and keeps rendering, animation, and diagram semantics fully owned.

### Near-term expansion targets

- Text atlas rendering for WebGL2 labels.
- Path morphing, braces, arrows, matrices, and richer math/code primitives.
- Offline frame encoders beyond browser WebM capture.
- Constraint-based layouts for whiteboards and function maps.
- Plugin surfaces for custom node kinds, edge routers, inspectors, and live tools.
- Reactive data bindings for IDE, docs, and browser embeds.

## Development

```sh
npm test      # node --test
npm run check # syntax check the entry module
npm run dev   # serve examples
```

MIT licensed.
