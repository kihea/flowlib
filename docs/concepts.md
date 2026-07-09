# Core Concepts

Flowlib is organized around five building blocks. Understanding how they connect makes every API in the reference predictable.

```
DiagramModel  ──diagramToScene──▶  Scene  ──render──▶  Canvas2DRenderer / WebGL2Renderer
     ▲                               ▲
     │                               │ step(dt)
LiveDiagramEngine / DiagramView   Timeline (tweens, clips)
```

## 1. DiagramModel — the data

`DiagramModel` holds nodes and edges as plain data: ids, labels, positions, sizes, styles. It knows nothing about rendering. It emits granular change events (`node:add`, `edge:update`, `change`, …) so views can react, and it supports transactions, chain connections, and JSON round-trips.

```js
const model = new DiagramModel();
model.addNode({ id: "a", label: "A" });
model.connect("a", "b", { directed: true });
```

Diagram factories (`createFlowchart`, `createStateMachine`, `createMindMap`, …) and the Manim-style graph builders (`createGraph`, `createDiGraph`) all produce `DiagramModel` instances. Layouts (`LayeredLayout`, `ForceLayout`, `GraphLayout`, …) mutate node positions on a model.

## 2. Scene — the visual tree

A `Scene` is a tree of `SceneNode`s: rectangles, circles, paths, text, math formulas, images, boolean shapes, projected 3D paths. Each node has `position`, `scale`, `rotation`, `opacity`, `style`, and optional `updaters` that run every frame. The scene owns a `Camera2D` (and optionally references a `Camera3D` for projected nodes).

`diagramToScene(model)` builds a scene subtree from a model; `syncDiagramScene` refreshes it after model changes. You rarely call these yourself — the engine and `DiagramView` do it for you — but you can mix diagram content with free-form scene nodes at will.

## 3. Timeline — time

A `Timeline` schedules `Tween`s (and callbacks) along a shared clock. It is deterministic: `seek(t)` always produces the same picture, which is what makes scrubbing, keyframe editing, and frame-accurate video export possible.

```js
const timeline = new Timeline({ repeat: Infinity, yoyo: true });
timeline.to(node.position, { x: 200 }, { duration: 1, ease: "inOutCubic" });
timeline.play();
```

Higher-level layers sit on top:

- **Presets** (`pulse`, `fadeIn`, `moveAlongPath`, `drawLine`, `cascadeIn`, `cameraTo`, …) append ready-made tweens.
- **AnimationClip** is a serializable keyframe document — target ids, properties, times, values, easings — that can be saved as JSON and replayed against any scene that can resolve the target ids. The workspace's keyframe panel reads and writes clips.

See the [Animation guide](guides/animation.md).

## 4. Renderers — pixels

`Canvas2DRenderer` draws a scene to a canvas (the complete implementation); `WebGL2Renderer` is a shader-backed foundation. Renderers are stateless with respect to your data: call `render(scene)` whenever something changed, or every frame while animating. Both handle high-DPI displays via `pixelRatio`.

Export helpers wrap renderers: `exportSceneToWebM` renders a timeline frame-by-frame for deterministic video; `canvasToBlob` / `exportCanvasToPNG` capture stills.

## 5. Views — interaction policy

Two classes bind a model + scene + renderer to a canvas, differing only in how much interaction they allow:

| | `DiagramView` | `LiveDiagramEngine` |
|---|---|---|
| Purpose | Static display / read-only embed | Whiteboard editor |
| Pointer input | None (opt-in pan/zoom) | Full: drag, connect, edit, pan, zoom |
| Interaction modes | `interactive: false \| true` | `interactions: "edit" \| "view" \| "none"` |
| Model watching | Re-renders on change | Re-renders on change |
| Animation | Bring your own timeline | Built-in `engine.timeline` |
| Weight | Minimal | Pointer machinery, selection, tools |

`LiveDiagramEngine` with `interactions: "view"` is the middle ground: pan, zoom, hover, and click/selection events, but no editing. `interactions: "none"` turns off pointer input entirely while keeping the live render loop (useful for animated but non-interactive embeds).

## Boundaries

The module layout mirrors these concepts and stays stable as the engine grows:

- `core` — math (`Vec2`, `Vec3`, `Mat3`, `Bounds`), colors, events, ids.
- `scene` — scene graph, cameras, primitives, mobjects, boolean shapes, projected 3D nodes.
- `animation` — timelines, tweens, easing, interpolation, clips, presets.
- `curves` — Bezier sampling, tangents, splitting.
- `graphing` — axes, function/parametric/polar sampling, integration primitives.
- `math` — formula parsing, layout, and drawing (TeX-like markup).
- `diagrams` — model, factories, graph builders, layouts, scene adapter.
- `render` — Canvas2D, WebGL2, video and image export.
- `live` — `LiveDiagramEngine` and `DiagramView`.
- `examples` — recreatable example scenes used by the workspace.
