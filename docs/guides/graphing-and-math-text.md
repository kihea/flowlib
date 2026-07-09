# Graphing and Math Text Guide

Mathematical scenes: axes, plotted functions, parametric and polar curves, integration visuals, projected 3D, and the TeX-like formula renderer. The `examples/workspace.html` presets under "Manim Repository page 2" show all of this in action.

## Axes and function graphs

```js
import { Canvas2DRenderer, Scene, createAxes, createFunctionGraph } from "@flowlib/engine";

const scene = new Scene({ background: "#f8fafc" });
const axes = createAxes({
  xRange: [-6, 6, 2],       // [min, max, tickStep]
  yRange: [-2, 2, 1],
  width: 680,
  height: 340
});
const sine = createFunctionGraph((x) => Math.sin(x), {
  axes,
  style: { stroke: "#2563eb", strokeWidth: 3 }
});
scene.add(axes, sine);
```

`createFunctionGraph` samples the function across `xRange` (subsettable via its own `xRange` option) and returns a path node whose `points` you can reuse — e.g. `moveAlongPath(timeline, marker, sine.points, { duration: 3 })` for a tracing dot.

`axesToPoint(x, y, axes)` converts graph coordinates to scene coordinates for placing markers and labels.

## Parametric, polar, arcs

```js
import {
  createParametricCurve, createPolarCurve, createArcPath,
  sampleParametric2D, samplePolar, polarToPoint
} from "@flowlib/engine";

const lissajous = createParametricCurve((t) => ({ x: Math.sin(3 * t) * 200, y: Math.sin(4 * t) * 140 }), {
  tRange: [0, Math.PI * 2],
  samples: 400,
  style: { stroke: "#0f766e", strokeWidth: 3 }
});

const cardioid = createPolarCurve((theta) => 80 * (1 + Math.cos(theta)), { samples: 240 });
```

The `sample*` functions return raw point arrays when you want the data without a node.

## Integration visuals

Riemann sums, areas under curves, polar sectors — the building blocks of calculus scenes:

```js
import { createAreaUnderCurve, createRiemannRectangles, createPolarGrid, createPolarSectors } from "@flowlib/engine";

const area = createAreaUnderCurve((x) => 0.5 * x * x, { axes, xRange: [0, 3] });
const rects = createRiemannRectangles((x) => 0.5 * x * x, { axes, xRange: [0, 3], count: 12, align: "right" });
```

Animate refinement by swapping rectangle groups over time (see the Riemann preset in the workspace).

## Projected 3D

A `Camera3D` projects 3D points onto the 2D scene. Projected nodes re-project on every update, so camera animation reshapes them live:

```js
import { Camera3D, ProjectedPath3DNode, createProjectedAxes3D, camera3DOrbitBy, Timeline } from "@flowlib/engine";

const camera3D = new Camera3D({ position: { x: 3, y: 2, z: 4 }, target: { x: 0, y: 0, z: 0 }, zoom: 100 });
const axes3D = createProjectedAxes3D({ camera3D, length: 2 });
const helix = new ProjectedPath3DNode({
  camera3D,
  points3D: Array.from({ length: 300 }, (_, i) => {
    const t = i / 300 * Math.PI * 6;
    return { x: Math.cos(t), y: t / 10, z: Math.sin(t) };
  }),
  style: { stroke: "#7c3aed", strokeWidth: 3 }
});

const timeline = new Timeline({ autoplay: true, loop: true });
camera3DOrbitBy(timeline, camera3D, { yaw: Math.PI * 2 }, { duration: 8, ease: "linear" });
```

## Math text

`MathTextNode` parses relaxed TeX-like markup and renders it with bundled Computer Modern fonts:

```js
import { MathTextNode, loadComputerModernFonts } from "@flowlib/engine";

await loadComputerModernFonts();   // registers the bundled CMU faces via FontFace

const formula = new MathTextNode({
  text: "sum_{i=1}^{n} frac{x_i^2}{sqrt{1+i}}",
  fontSize: 28,
  mathOptions: { identifierStyle: "italic" },   // classic math italics; upright is the default
  style: { fill: "#0f172a" }
});
```

Markup notes:

- Backslashes are optional: `frac{x}{y}` and `\frac{x}{y}` are equivalent.
- Supported structures: fractions, roots (`sqrt`, indexed roots), subscripts/superscripts (combined too), function names (`sin`, `log`, …), Greek names (`alpha`, `Omega`), relations/operators (`->`, `<=`, `times`, …), and big operators (`sum`, `prod`, `int`, `bigcup`, `bigcap`) with limits.
- Setting `node.text` reparses automatically.

Lower-level pieces when you need them: `parseMathText(source)` → AST, `layoutMath(ast, options)` → measured boxes, `drawMathBox(ctx, box, x, baseline)` → manual drawing. Font utilities: `registerFontFamily`, `registerFontFace`, `resolveFontFamily`, and aliases `text`, `sans`, `serif`, `mono`, `math`.

## Images from code

Generate displayable images from SVG strings or canvas callbacks — handy for textures, grids, annotated backdrops:

```js
import { createSvgImage, createCanvasImage } from "@flowlib/engine";

const badge = createSvgImage(`<svg width="320" height="180">...</svg>`);
const raster = createCanvasImage((ctx, { width, height }) => {
  ctx.fillStyle = "#07111f";
  ctx.fillRect(0, 0, width, height);
}, { width: 320, height: 180 });
scene.add(badge, raster);
```
