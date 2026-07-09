# Flowlib API Reference

The exhaustive module-by-module reference. New to Flowlib? Start with [Getting Started](getting-started.md), the [tutorials](README.md#tutorials), or the [guides](README.md#guides).

Flowlib is published as dependency-free ES modules. Import from the package root for the full surface, or use subpath exports when you want a smaller boundary.

```js
import { Scene, CircleNode, Timeline, Canvas2DRenderer } from "@flowlib/engine";
import { DiagramModel, GraphLayout } from "@flowlib/engine/diagrams";
import { recordCanvasToWebM } from "@flowlib/engine/render";
```

## Entry Points

| Export path | Contents |
| --- | --- |
| `@flowlib/engine` | Everything exported by the engine. |
| `@flowlib/engine/core` | Math, bounds, colors, events, ids. |
| `@flowlib/engine/curves` | Bezier utilities. |
| `@flowlib/engine/scene` | Scene graph, cameras, primitives, mobjects, boolean shapes, 3D projected nodes. |
| `@flowlib/engine/animation` | Timelines, tweens, easings, trackers, animation presets. |
| `@flowlib/engine/diagrams` | Diagram model, factories, layouts, scene adapter, Manim-style graph builders. |
| `@flowlib/engine/graphing` | Axes, function curves, parametric curves, polar curves, integration helpers. |
| `@flowlib/engine/render` | Canvas2D, WebGL2, and video export helpers. |
| `@flowlib/engine/live` | Interactive diagram editor engine. |
| `@flowlib/engine/examples` | Recreateable example scene registry and presets. |

Local examples in this repo import from `../src/index.js`; package consumers should use the package paths above.

## Shared Conventions

Coordinates are world-space pixels unless an API says otherwise. Scene nodes use `position`, `scale`, `rotation`, `opacity`, `visible`, `style`, `data`, `children`, and `updaters`.

Common style keys:

```js
{
  fill: "#ffffff",
  stroke: "#0f172a",
  strokeWidth: 2,
  lineCap: "round",
  lineJoin: "round",
  lineDash: [8, 8],
  lineDashOffset: 0,
  markerEnd: "arrow",
  markerSize: 10,
  shadowColor: "rgba(0,0,0,0.2)",
  shadowBlur: 12,
  shadowOffsetX: 0,
  shadowOffsetY: 4
}
```

Durations in animation APIs and video export APIs are seconds. `recordCanvasToWebM` also accepts `durationMs` for low-level browser recording.

## Core

`Vec2`

- `new Vec2(x = 0, y = 0)`
- `Vec2.from(value)`, `Vec2.add(a, b)`, `Vec2.sub(a, b)`, `Vec2.distance(a, b)`
- Instance methods: `set`, `copy`, `clone`, `add`, `sub`, `scale`, `multiply`, `length`, `lengthSquared`, `normalize`, `distance`, `dot`, `perp`, `toArray`, `toJSON`

`Vec3`

- `new Vec3(x = 0, y = 0, z = 0)`
- `Vec3.from(value)`, `Vec3.add`, `Vec3.sub`, `Vec3.cross`
- Instance methods mirror `Vec2` with `z`, including `normalize`, `distance`, `dot`, `cross`, `toArray`, `toJSON`

`Mat3`

- 2D transform matrix used by renderers.
- `Mat3.identity()`, `Mat3.multiply(a, b)`
- Chainable transforms: `translated`, `scaled`, `rotated`
- `apply(point)`, `toCanvasTransform()`

`Bounds`

- `new Bounds(x = 0, y = 0, width = 0, height = 0)`
- `Bounds.empty()`, `Bounds.fromPoints(points)`
- `union(bounds)`, `pad(amount)`, `normalize()`, `toJSON()`
- Useful properties: `minX`, `minY`, `maxX`, `maxY`, `center`

Other core exports:

- `Color`, `colorToCss(value, fallback)`
- `EventEmitter` with `on`, `off`, `once`, `emit`
- `createId(prefix)`
- Math helpers: `clamp`, `lerp`, `inverseLerp`, `nearlyEqual`, `EPSILON`

## Scene Graph

`SceneNode` is the base class for renderable and logical scene objects.

```js
const node = new SceneNode({
  id: "item",
  x: 0,
  y: 0,
  scale: { x: 1, y: 1 },
  rotation: 0,
  opacity: 1,
  visible: true,
  style: {}
});
```

Important methods:

- `add(...nodes)`, `remove(node)`, `clear()`
- `update(dt, clock)`, `addUpdater(fn)`
- `traverse(visitor, parentMatrix, parentOpacity)`
- `localMatrix()`, `getWorldMatrix()`
- `getLocalBounds()`, `getWorldBounds()`

`Scene`

- Extends `GroupNode`.
- Owns `camera`, `background`, and `clock`.
- Use `scene.add(...)`, `scene.step(dt)`, `scene.getSceneBounds()`.

Primitive nodes:

- `GroupNode(options)`
- `RectNode({ width = 120, height = 64, cornerRadius = 8, ...options })`
- `CircleNode({ radius = 40, ...options })`
- `EllipseNode({ radiusX = 60, radiusY = 36, ...options })`
- `PolygonNode({ points = [], closed = true, ...options })`
- `TriangleNode({ width = 120, height = 96, points, ...options })`
- `LineNode({ points = [], closed = false, ...options })`
- `PathNode({ points = [], commands = [], closed = false, ...options })`
- `TextNode({ text = "", fontSize = 16, fontFamily, fontWeight = 500, fontStyle = "normal", align = "center", baseline = "middle", maxWidth, ...options })`
- `MathTextNode({ text, formula, fontSize, mathOptions, italicIdentifiers, ...options })` parses and renders formula markup with a math-oriented font stack. It defaults to upright variables for legibility; pass `italicIdentifiers: true` or `mathOptions: { identifierStyle: "italic" }` for classic math italics.
- `ImageNode({ src, alt, width = 180, height = 120, image, ...options })` renders loaded browser images or a styled placeholder while loading.
- `svgToDataUri(svg)`, `createSvgImage(svg, options)`, and `createCanvasImage(draw, options)` build displayable image nodes from code-generated SVG or canvas drawing callbacks.

Image generation:

```js
const svgImage = createSvgImage(`
  <svg width="320" height="180" viewBox="0 0 320 180">
    <rect width="320" height="180" fill="#f8fafc"/>
    <circle cx="160" cy="90" r="54" fill="#2563eb"/>
  </svg>
`);

const rasterImage = createCanvasImage((ctx, { width, height }) => {
  ctx.fillStyle = "#07111f";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#38bdf8";
  ctx.fillRect(24, 24, width - 48, height - 48);
}, { width: 320, height: 180 });
```

Math text:

- `parseMathText(source)` converts relaxed TeX-like text into a math AST.
- `layoutMath(ast, options)` measures a math AST into positioned boxes.
- `drawMathBox(ctx, box, x, baseline, options)` draws a measured box tree.
- `drawMathText(ctx, node)` draws a `MathTextNode`.
- `resolveFontFamily(nameOrFamily)`, `registerFontFamily(name, family)`, `registerFontFace(definition)`, and `loadRegisteredFonts(document)` provide font aliases and browser `FontFace` loading.
- `registerComputerModernFonts(options)` and `loadComputerModernFonts(document, options)` register the bundled CMU Serif TTFs from `src/fonts/cmu`.
- Built-in font aliases: `text`, `sans`, `math`, `serif`, and `mono`.
- The `math` alias prefers bundled `Flowlib CMU Serif`, then installed Computer Modern/Latin Modern families, STIX, Cambria Math, and generic serif fonts.
- Commands may be written with or without a leading backslash: `frac{x}{y}` and `\frac{x}{y}` both create a stacked fraction.
- Supported structures include fractions, square roots, indexed roots, subscripts, superscripts, combined scripts, function names, Greek names, relation/operator aliases, and large/discrete operators such as `sum`, `prod`, `int`, `bigcup`, and `bigcap`.

```js
const formula = new MathTextNode({
  text: "sum_{i=1}^{n} frac{x_i^2}{sqrt{1+i}}",
  fontSize: 28,
  mathOptions: { identifierStyle: "italic" },
  style: { fill: "#0f172a" }
});
```

Path commands support `move`, `line`, `quadratic`, `cubic`, `arc`, and `close`.

```js
const path = new PathNode({
  commands: [
    { type: "move", x: 0, y: 0 },
    { type: "cubic", x1: 40, y1: -80, x2: 120, y2: 80, x: 160, y: 0 }
  ],
  style: { fill: "transparent", stroke: "#2563eb", strokeWidth: 4 }
});
```

Mobject-style nodes:

- `Mobject` extends `SceneNode`.
- `VMobject` extends `PathNode`.
- `VGroup(...nodes)` creates a group with the supplied children.
- `TracedPathNode(getPoint, options)` samples a moving point over time.

Boolean shape nodes:

- `BooleanShapeNode({ operation, operands, fillRule, ...options })`
- `UnionNode(operands, options)`
- `IntersectionNode(operands, options)`
- `DifferenceNode(operands, options)`
- `ExclusionNode(operands, options)`
- Functional constructors: `unionShapes`, `intersectShapes`, `differenceShapes`, `excludeShapes`
- `BooleanOperations` enum: `UNION`, `INTERSECTION`, `DIFFERENCE`, `EXCLUSION`

```js
const left = new EllipseNode({ x: -70, radiusX: 95, radiusY: 120 });
const right = new EllipseNode({ x: 70, radiusX: 95, radiusY: 120 });
const difference = new DifferenceNode([left, right], {
  style: { fill: "rgba(236, 72, 153, 0.55)", stroke: "#ec4899", strokeWidth: 3 }
});
```

`DifferenceNode` is fill-only by default so the removed operand does not leave a visible inner outline. To draw only the kept outer operand, set `style.differenceStroke = "outer"` with a normal `stroke` and `strokeWidth`.

## Cameras

`Camera2D`

- `position`, `zoom`, `rotation`, `viewport`
- `resize(width, height)`
- `worldToScreen(point)`, `screenToWorld(point)`
- `pan(deltaScreen)`, `zoomAt(screenPoint, factor)`

`Camera3D`

- `position`, `target`, `up`, `zoom`, `focalLength`, `perspective`, `near`, `offset`, `viewport`
- `resize(width, height)`, `lookAt(target)`, `setPosition(position)`
- `project(point3D)`, `worldToView(point3D)`, `basis()`
- `orbit(deltaYaw, deltaPitch, deltaRadius)`, `setOrbit({ yaw, pitch, radius, target })`, `getOrbit()`
- `dolly(distance)`, `pan(delta)`

Projected 3D nodes:

- `ProjectedPath3DNode({ points3D, camera3D, ...pathOptions })`
- `ProjectedPolygon3DNode({ points3D, camera3D, ...polygonOptions })`

These nodes re-project their 3D points every update, so camera movement immediately changes the displayed shape.

## Animation

See the [Animation guide](guides/animation.md) for workflow-oriented coverage.

`Timeline`

- `new Timeline({ autoplay = false, loop = false, repeat = 0, yoyo = false, rate = 1, time = 0 })`
  - `repeat` counts extra passes (`Infinity` allowed); `loop: true` is shorthand for infinite repeat; `yoyo` alternates direction each pass.
- Building: `add(tween, at)`, `to(target, properties, options)`, `fromTo(target, fromProps, toProps, options)`, `sequence(items, options)`, `stagger(targets, properties, { each, from, ...options })`, `call(fn, at)`, `addLabel(name, at)`, `labelTime(name)`
- Position parameters — every `at` accepts: seconds, `"+=n"` / `"-=n"` (relative to duration), `"<"` / `">"` (start/end of the last-added animation), or a label name. `resolvePosition(at)` exposes the resolver.
- Playback: `play()`, `pause()`, `stop()`, `seek(time)`, `step(dt)`, `reset()`, `reverse()`, `timeScale(value?)`, `progress` (get/set 0..1)
- Emits `play`, `pause`, `seek`, `loop` (`{ iteration }`), and `complete`.

`Tween`

- Interpolates one property path on a target (`"position.x"`, `"style.stroke"`, …).
- Usually created through `timeline.to(...)`. Options: `duration`, `delay`, `ease`, `from`, `onStart`, `onUpdate`, `onComplete`.
- Plain-object values merge into `Vec2`/`Vec3`/`Color`-like targets instead of replacing them.

`AnimationClip` / `KeyframeTrack` — serializable keyframe animation:

- `new AnimationClip({ name, tracks })`
- `setKeyframe(targetId, property, time, value, ease)`, `removeKeyframe(targetId, property, time)`, `clear()`, `track(targetId, property)`
- `duration`, `isEmpty`
- `buildTimeline(resolveTarget, options)`, `applyTo(timeline, resolveTarget, { offset, tag })`, `sample(time, resolveTarget)`
- `toJSON()` / `AnimationClip.fromJSON(data)` — JSON round-trip; the workspace's clip save/load uses this format.
- `KeyframeTrack`: `setKeyframe(time, value, ease)`, `removeKeyframe(time)`, `sample(time)`, `duration`, `toJSON()` / `fromJSON`.

```js
const clip = new AnimationClip({ name: "intro" });
clip.setKeyframe("node:start", "position", 0, { x: 0, y: 0 });
clip.setKeyframe("node:start", "position", 1, { x: 160, y: 0 }, "outQuart");
const timeline = clip.buildTimeline((id) => model.nodes.get(id.slice(5)) || null, { autoplay: true });
```

`ValueTracker`

- Stores a numeric value that can be animated and read by updaters.

Easing:

- `Easings` — `linear`, `spring`, and `in/out/inOut` variants of `Sine`, `Quad`, `Cubic`, `Quart`, `Quint`, `Expo`, `Circ`, `Back`, `Elastic`, `Bounce` (e.g. `outBounce`, `inOutQuint`).
- `steps(count)` and `cubicBezierEase(x1, y1, x2, y2)` factories.
- `resolveEase(ease)` — name, function, or falsy (linear).

Preset helpers:

- Motion and visibility: `moveTo`, `shift`, `fadeIn`, `fadeOut`, `scaleTo`
- Shapes: `growToSize`, `growFromCenter`, `rotateTo`, `rotateBy`, `pulse`, `indicate`
- Paths and reveals: `traceBetween`, `moveAlongPath`, `drawLine` (dash-offset draw-on), `cascadeIn` (staggered node entrances)
- 2D camera: `cameraPanTo`, `cameraZoomTo`, `cameraRotateTo`, `cameraTo`
- 3D camera: `camera3DTo`, `camera3DOrbitTo`, `camera3DOrbitBy`, `camera3DOrbit`, `camera3DPanBy`, `camera3DDollyTo`, `camera3DDollyBy`

```js
const timeline = new Timeline({ autoplay: true, repeat: Infinity, yoyo: true });
pulse(timeline, node, { at: 0, duration: 0.35, scale: 1.18 });
drawLine(timeline, edge, { at: "+=0.2", duration: 0.7 });
camera3DOrbitBy(timeline, camera3D, { yaw: Math.PI * 2 }, { duration: 6, ease: "linear" });
```

## Curves

`BezierCurve`

- `new BezierCurve(points)`
- `pointAt(t)`, `tangentAt(t)`, `sample(count)`, `split(t)`

Helpers:

- `quadraticBezier(p0, p1, p2)`
- `cubicBezier(p0, p1, p2, p3)`
- `bezierThrough(points, samples = 32)`

## Graphing

Axes:

- `createAxes(options)`
- `axesToPoint(x, y, axes)`

Function and parametric curves:

- `createFunctionGraph(fn, { axes, samples, xRange, style })`
- `sampleParametric2D(fn, options)`
- `sampleParametric3D(fn, options)`
- `samplePolar(fn, options)`
- `sampleArc(options)`
- `polarToPoint(radius, theta, options)`
- `projectPoint3D(point, options)`
- `createParametricCurve(fn, options)`
- `createPolarCurve(fn, options)`
- `createArcPath(options)`
- `createProjectedAxes3D(options)`

Integration helpers:

- `createAreaUnderCurve(fn, options)`
- `createRiemannRectangles(fn, options)`
- `createPolarGrid(options)`
- `createPolarArea(fn, options)`
- `createPolarSectors(fn, options)`

## Diagrams

`DiagramModel`

- `nodes` and `edges` are `Map` instances.
- `addNode(options)`, `updateNode(id, patch)`, `removeNode(id)`
- `addEdge(options)`, `updateEdge(id, patch)`, `removeEdge(id)`
- `connect(source, target, options)`, `disconnect(source, target, options)`
- `findEdge(source, target, options)`, `reconnectEdge(id, endpoints, options)`
- `incoming(id)`, `outgoing(id)`, `neighbors(id, direction)`
- `connectChain(nodes, options)`
- `requireNode(id)`, `requireEdge(id)`
- `transaction(mutator)`, `toSceneData()`, `DiagramModel.from(data)`
- Emits granular change events such as `node:add`, `edge:update`, `edge:reconnect`, plus `change`.

```js
const model = new DiagramModel();
model.addNode({ id: "start", label: "Start" });
model.addNode({ id: "done", label: "Done" });
model.connect("start", "done", { directed: true });
```

Scene adapter:

- `diagramToScene(model, options)`
- `syncDiagramScene(root, model, options)`
- `routeStraightEdge(source, target)`

Layouts:

- `LayeredLayout({ direction = "LR", layerGap, nodeGap })`
- `ForceLayout({ iterations, linkDistance, origin })`
- `MindMapLayout({ root, branchGap, nodeGap })`
- `GraphLayout({ name, scale, origin, partitions, root, seed, iterations })`
- `applyGraphLayout(model, layout, options)`

Graph layout names:

- `spring`
- `circular`
- `shell`
- `spiral`
- `tree`
- `partite`
- `grid`
- `random`
- `layered`
- `manual`

Manim-style graph builders:

- `GraphDiagram({ vertices, edges, directed, layout, labels, vertexConfig, edgeConfig, partitions, rootVertex })`
- `createGraph(vertices, edges, options)`
- `createDiGraph(vertices, edges, options)`
- `graph.changeLayout(layout, config)`
- `graph.addVertices(...vertices)`, `graph.addEdges(...edges)`

Diagram factories:

- `createDiagram(type, data, options)`
- `createFlowchart(steps, options)`
- `createStateMachine(states, transitions, options)`
- `createMindMap(root, branches, options)`
- `createKnowledgeGraph(entities, relations, options)`
- `createFunctionMap(name, stages, options)`
- `createDendrogram(root, options)`
- `createCircleDiagram(items, options)`
- `createTriangleNodeDiagram(items, options)`
- `createVennDiagram(sets, options)`
- `createQuadrantChart(points, options)`

`createVennDiagram` and `createQuadrantChart` return `Scene` instances. Most other diagram factories return `DiagramModel` instances.

## Live Engine and Static Views

`LiveDiagramEngine` binds a `DiagramModel` to a canvas with pointer editing, camera controls, inline labels, and connection workflows.

```js
const engine = new LiveDiagramEngine({
  canvas,
  model,
  layout: new GraphLayout({ name: "spring" }),
  background: "#f8fafc",
  interactions: "edit"   // "edit" | "view" | "none"
});

engine.start();
```

Interaction modes:

- `"edit"` (default) — full whiteboard: drag nodes, pan, zoom, select, inline edit, connection tools.
- `"view"` — pan, zoom, hover, click/selection events; no pointer-driven editing (dragging over a node pans the camera). `readonly: true` maps here for compatibility.
- `"none"` — pointer input ignored entirely; the render loop and timeline keep running.
- `setInteractions(mode)` switches at runtime and emits `interactions:change`.

Important methods:

- Lifecycle: `start()`, `stop()`, `destroy()`, `render()`, `sync()`
- Layout: `applyLayout(layout)`, `animateLayout(layout, options)`, `fit(padding)`
- Model shortcuts: `addNode`, `addEdge`, `connectNodes`, `disconnectNodes`, `reconnectEdge`, `setModel`
- Tools: `setTool("select" | "connect")`, `setInteractions("edit" | "view" | "none")`
- Selection: `selectNode(id, options)`, `clearSelection()`
- Inline editing: `beginInlineEdit(nodeId, options)`, `commitInlineEdit(options)`, `cancelInlineEdit()`
- Connections: `startConnection(sourceId, options)`, `completeConnection(targetId, options)`, `cancelConnection(options)`
- Coordinates and picking: `screenToWorld(point)`, `hitTest(worldPoint)`

Events:

- Selection and tools: `selection:change`, `tool:change`, `interactions:change`
- Node interaction: `node:click`, `node:doubleclick`, `node:contextmenu`, `node:dragstart`, `node:drag`, `node:dragend`
- Canvas interaction: `canvas:click`, `canvas:doubleclick`, `canvas:contextmenu`
- Inline editing: `node:editstart`, `node:editcommit`, `node:editcancel`
- Connections: `connection:start`, `connection:create`, `connection:reconnect`, `connection:cancel`

`DiagramView` — static diagram display (no pointer handling; see [Static Diagrams](tutorials/04-static-diagrams-and-embedding.md)):

```js
const view = new DiagramView({
  canvas,
  model,                    // or scene: a prebuilt Scene
  layout,                   // optional; applied once at construction
  padding: 60,              // fit-to-content padding
  background: "#f8fafc",
  fit: true,                // fit camera on construction
  watch: true,              // re-render on model change events
  interactive: false        // true / "pan-zoom" opts into pan + wheel zoom only
});
```

- `render()`, `fit(padding)`, `setModel(model, options)`, `destroy()`
- `toDataURL(type, quality)`, `toBlob({ type, quality })`
- `renderStaticDiagram(canvas, modelOrOptions)` — one-call convenience; returns the `DiagramView`.

## Renderers

`Canvas2DRenderer`

- `new Canvas2DRenderer(canvas, { context, pixelRatio, clear })`
- `setPixelRatio(pixelRatio)` updates the backing-store scale. The default is `devicePixelRatio`, so canvas text and math render crisply on high-DPI displays.
- `resize(width, height)`
- `render(scene)`
- Supports primitive nodes, text, diagram nodes/edges, mobjects, boolean paths, and projected 3D nodes after they update.

`WebGL2Renderer`

- `new WebGL2Renderer(canvas, options)`
- `resize(width, height)`
- `render(scene)`
- Current foundation includes shader-backed solid/SDF primitives. Canvas2D remains the most complete renderer.

## Video Export

Video export uses browser APIs: `HTMLCanvasElement.captureStream`, `MediaRecorder`, `Blob`, and DOM download primitives. Most browsers encode WebM through this route.

Helpers:

- `getSupportedVideoMimeTypes(types)`
- `pickVideoMimeType(types)`
- `recordCanvasToWebM(canvas, options)`
- `exportSceneToWebM({ canvas, renderer, scene, timeline, duration, fps, width, height, mimeType, videoBitsPerSecond, onStart, onFrame })`
- `downloadBlob(blob, filename, options)`
- `CanvasVideoRecorder`

Record the current live canvas:

```js
const blob = await recordCanvasToWebM(canvas, {
  duration: 5,
  fps: 30
});

downloadBlob(blob, "workspace.webm");
```

Export a deterministic scene timeline:

```js
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

downloadBlob(blob, "boolean-operations.webm");
```

Use `CanvasVideoRecorder` when you want manual start/stop control:

```js
const recorder = new CanvasVideoRecorder(canvas, { fps: 30 }).start();
// run an interaction or animation
const blob = await recorder.stop();
downloadBlob(blob, "capture.webm");
```

## Image Export

- `canvasToDataURL(canvas, { type = "image/png", quality })`
- `canvasToBlob(canvas, { type = "image/png", quality })` — resolves a `Blob`
- `exportCanvasToPNG(canvas, filename = "flowlib.png", options)` — captures and downloads

```js
await exportCanvasToPNG(canvas, "diagram.png");
```

## Examples

Example registry:

- `defineExampleScene(definition)`
- `listExampleScenes()`
- `createExampleScene(id, options)`
- `ExampleSceneRegistry`

Example factories:

- `createBooleanOperationsExampleScene()`
- `ManimRepositoryExamples`
- Individual Manim-inspired examples from `src/examples/manim-repository.js`, including harmonograph, volume of revolution, cross sections, polar area, Koch curve, Fibonacci spiral, cycloid, modular cardioid, Riemann integral, and Lorenz attractor.

The interactive workspace is available at `examples/workspace.html` through the dev server:

```sh
npm run dev
```

It exposes preset diagrams, live node editing, context menus, connection tools, rich text/math/image insertion, camera controls, selected-object and camera keyframes, built-in animation markers, adjustable landscape canvas sizes, boolean shape examples, Manim-inspired scenes, a projection-proof demo, and WebM recording.
