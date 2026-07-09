# Examples

Run `npm run dev` and open any page under `examples/`. All examples import from `../src/index.js` directly — no build step.

| Page | What it shows |
|---|---|
| [`workspace.html`](../examples/workspace.html) | **The full editor.** Preset diagrams and Manim-style scenes, live node editing, connection tools, context menus, text/math/image insertion, the keyframe animation panel (easing, speed, looping, clip save/load), interaction modes (edit / view / static), camera controls, canvas size presets, WebM and PNG export. |
| [`static-diagram.html`](../examples/static-diagram.html) | **Static display API.** One model rendered three ways: `DiagramView` (fully static + PNG export), `interactions: "view"` (pan/zoom viewer), `interactions: "edit"` (whiteboard). |
| [`live-flowchart.html`](../examples/live-flowchart.html) | Minimal interactive flowchart: engine events, inline editing, connection workflow. |
| [`animated-state-machine.html`](../examples/animated-state-machine.html) | State machine with a looping timeline tracing transitions. |
| [`diagram-types.html`](../examples/diagram-types.html) | Factory tour: dendrograms, Venn, circle, triangle, quadrant diagrams. |
| [`graph-layouts.html`](../examples/graph-layouts.html) | `GraphLayout` catalog — spring, circular, tree, shell, and friends — with animated switching. |
| [`function-graph.html`](../examples/function-graph.html) | Axes + sampled function with a marker tracing the curve. |

## Workspace preset highlights

The workspace's preset dropdown includes recreated scenes from The Manim Repository (page 2): harmonograph, volume of revolution, cross sections, polar area derivation, Koch curve, Fibonacci spiral, cycloid, modular cardioid, Riemann integral, and the Lorenz attractor — plus a boolean-operations scene and an animated proof of why perspective projection divides by z.

These are also available programmatically:

```js
import { listExampleScenes, createExampleScene } from "@flowlib/engine";

for (const scene of listExampleScenes()) console.log(scene.id, scene.title);
const { scene, timeline } = createExampleScene("manim-lorenz");
```
