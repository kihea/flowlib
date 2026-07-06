import { Timeline, ValueTracker, camera3DOrbitBy, moveAlongPath } from "../animation/index.js";
import {
  createAreaUnderCurve,
  createAxes,
  createFunctionGraph,
  createParametricCurve,
  createPolarArea,
  createPolarCurve,
  createPolarGrid,
  createPolarSectors,
  createProjectedAxes3D,
  createRiemannRectangles,
  projectPoint3D,
  sampleParametric2D
} from "../graphing/index.js";
import { Scene } from "../scene/scene.js";
import { Camera3D } from "../scene/camera.js";
import { ProjectedPath3DNode } from "../scene/projected-3d.js";
import { CircleNode, GroupNode, LineNode, MathTextNode, PathNode, PolygonNode, RectNode, TextNode } from "../scene/shapes.js";
import { TracedPathNode } from "../scene/traced-path.js";

const SOURCE_URL = "https://themanimrepository.wordpress.com/page/2/";

export const ManimRepositoryExamples = [
  {
    id: "manim-harmonograph",
    title: "Harmonograph",
    sourceUrl: SOURCE_URL,
    create: createHarmonographScene
  },
  {
    id: "manim-volume-revolution",
    title: "Volume of Revolution",
    sourceUrl: SOURCE_URL,
    create: createVolumeRevolutionScene
  },
  {
    id: "manim-cross-sections",
    title: "Known Cross-Sections",
    sourceUrl: SOURCE_URL,
    create: createCrossSectionsScene
  },
  {
    id: "manim-polar-area",
    title: "Rectangular vs Polar Area",
    sourceUrl: SOURCE_URL,
    create: createPolarAreaDerivationScene
  },
  {
    id: "manim-koch-curve",
    title: "Koch Curve",
    sourceUrl: SOURCE_URL,
    create: createKochCurveScene
  },
  {
    id: "manim-fibonacci-spiral",
    title: "Fibonacci Golden Spiral",
    sourceUrl: SOURCE_URL,
    create: createFibonacciSpiralScene
  },
  {
    id: "manim-cycloid",
    title: "Cycloid",
    sourceUrl: SOURCE_URL,
    create: createCycloidScene
  },
  {
    id: "manim-mod-cardioid",
    title: "M mod N Cardioid",
    sourceUrl: SOURCE_URL,
    create: createModCardioidScene
  },
  {
    id: "manim-riemann",
    title: "Riemann Integral",
    sourceUrl: SOURCE_URL,
    create: createRiemannIntegralScene
  },
  {
    id: "manim-lorenz",
    title: "Lorenz Attractor",
    sourceUrl: SOURCE_URL,
    create: createLorenzAttractorScene
  }
];

export function createHarmonographScene() {
  const scene = new Scene({ background: "#07111f" });
  const timeline = new Timeline({ autoplay: true, loop: true });
  const params = {
    f1: 0,
    f2: 0,
    f3: 0,
    f4: 0,
    p1: 0,
    p2: 0,
    p3: 0,
    p4: 0,
    d1: 0,
    d2: 0,
    d3: 0,
    d4: 0
  };

  const curve = new PathNode({ style: { stroke: "#38bdf8", strokeWidth: 1.7, fill: "transparent" } });
  const marker = new CircleNode({ radius: 7, style: { fill: "#facc15", stroke: "#ffffff", strokeWidth: 2 } });
  const equationX = new MathTextNode({
    x: 100,
    y: -214,
    text: "x(t)=e^{-d_{1}t} sin(f_{1}t-p_{1}) + e^{-d_{2}t} sin(f_{2}t+p_{2})",
    align: "left",
    font: "math",
    fontSize: 32,
    maxWidth: 560,
    style: { fill: "#00ecff" }
  });
  const equationY = new MathTextNode({
    x: 100,
    y: -166,
    text: "y(t)=e^{-d_{3}t} sin(f_{3}t+p_{3}) + e^{-d_{4}t} sin(f_{4}t+p_{4})",
    align: "left",
    font: "math",
    fontSize: 32,
    maxWidth: 560,
    style: { fill: "#55ff00" }
  });
  const range = new MathTextNode({
    x: 100,
    y: -116,
    text: "t in [0,200]",
    align: "left",
    font: "math",
    fontSize: 40,
    style: { fill: "#fb923c" }
  });
  const mathDemo = new MathTextNode({
    x: 100,
    y: 242,
    text: "frac{x(t)}{y(t)} + sum_{i=1}^{4} e^{-d_{i}t}",
    align: "left",
    font: "math",
    fontSize: 30,
    maxWidth: 470,
    style: { fill: "#e0f2fe" }
  });
  const valueNodes = createHarmonographValueNodes(params);

  const refresh = () => {
    const points = sampleParametric2D((t) => {
      const x = Math.exp(-params.d1 * t) * Math.sin(params.f1 * t + params.p1) +
        Math.exp(-params.d2 * t) * Math.sin(params.f2 * t + params.p2);
      const y = Math.exp(-params.d3 * t) * Math.sin(params.f3 * t + params.p3) +
        Math.exp(-params.d4 * t) * Math.sin(params.f4 * t + params.p4);
      return { x: x * 118 - 225, y: y * -118 + 40 };
    }, { tRange: [0, 200], samples: 1200 });
    curve.setPoints(points);
    marker.position.copy(points[points.length - 1] || { x: 0, y: 0 });
    for (const item of valueNodes.items) {
      item.node.setFormula(`${item.symbol}=${formatHarmonographValue(params[item.key], item.precision)}`);
    }
  };
  curve.addUpdater(refresh);
  refresh();

  timeline.to(params, {
    f1: 1,
    f2: 6,
    f3: 1,
    f4: 6,
    p1: Math.PI / 2,
    p2: Math.PI * 1.5,
    p3: 0,
    p4: 0,
    d1: 0.02,
    d2: 0.02,
    d3: 0.02,
    d4: 0.01
  }, { at: 0, duration: 6, ease: "linear" });
  timeline.to(params, { f3: 4, p1: Math.PI / 16 }, { at: 6.5, duration: 3, ease: "linear" });
  timeline.to(params, { f2: 4 }, { at: 10, duration: 4.5, ease: "linear" });
  timeline.to(params, { f1: 2.7, f2: 6.35, f3: 8.15, f4: 4.55, p1: 4.65, p2: 4.15, p3: 4.4, p4: 5.43 }, { at: 15, duration: 5, ease: "linear" });
  timeline.to(params, { f4: 0.9 }, { at: 20.5, duration: 3.5, ease: "linear" });
  timeline.to(params, { f1: 3.65, f2: 7.3, f3: 0.9, f4: 3.65 }, { at: 24.5, duration: 4.5, ease: "linear" });
  timeline.duration = 29;

  scene.add(
    new TextNode({ text: "Visualization of Harmonograph", y: -302, font: "sans", fontSize: 32, fontWeight: 800, style: { fill: "#e0f2fe" } }),
    new TextNode({ text: "Parametric equations", x: 40, y: -262, align: "left", font: "sans", fontSize: 21, fontWeight: 800, maxWidth: 340, style: { fill: "#fb923c" } }),
    equationX,
    equationY,
    range,
    new TextNode({ text: "Live parameters", x: 115, y: -88, align: "left", font: "sans", fontSize: 18, fontWeight: 800, style: { fill: "#cbd5e1" } }),
    valueNodes.group,
    new TextNode({ text: "MathText proof: frac, sum, subscript, superscript, functions", x: 40, y: 194, align: "left", font: "sans", fontSize: 15, fontWeight: 700, maxWidth: 500, style: { fill: "#94a3b8" } }),
    mathDemo,
    curve,
    marker
  );
  return { scene, timeline, target: marker, path: curve.points, statusText: "Harmonograph parametric scene" };
}

function createHarmonographValueNodes(params) {
  const group = new GroupNode();
  const definitions = [
    { key: "f1", symbol: "f_{1}", precision: 2, x: 115, y: -58, fill: "#00ecff" },
    { key: "f2", symbol: "f_{2}", precision: 2, x: 265, y: -58, fill: "#00ecff" },
    { key: "f3", symbol: "f_{3}", precision: 2, x: 115, y: 34, fill: "#55ff00" },
    { key: "f4", symbol: "f_{4}", precision: 2, x: 265, y: 34, fill: "#55ff00" },
    { key: "p1", symbol: "p_{1}", precision: 2, x: 115, y: -26, fill: "#facc15" },
    { key: "p2", symbol: "p_{2}", precision: 2, x: 265, y: -26, fill: "#facc15" },
    { key: "p3", symbol: "p_{3}", precision: 2, x: 115, y: 66, fill: "#facc15" },
    { key: "p4", symbol: "p_{4}", precision: 2, x: 265, y: 66, fill: "#facc15" },
    { key: "d1", symbol: "d_{1}", precision: 3, x: 115, y: 6, fill: "#2dd4bf" },
    { key: "d2", symbol: "d_{2}", precision: 3, x: 265, y: 6, fill: "#2dd4bf" },
    { key: "d3", symbol: "d_{3}", precision: 3, x: 115, y: 98, fill: "#2dd4bf" },
    { key: "d4", symbol: "d_{4}", precision: 3, x: 265, y: 98, fill: "#2dd4bf" }
  ];
  group.add(
    new TextNode({ text: "For x(t)", x: 52, y: -24, font: "sans", fontSize: 16, fontWeight: 800, style: { fill: "#00ecff" } }),
    new TextNode({ text: "For y(t)", x: 52, y: 68, font: "sans", fontSize: 16, fontWeight: 800, style: { fill: "#55ff00" } })
  );
  const items = definitions.map((item) => {
    const node = new MathTextNode({
      x: item.x,
      y: item.y,
      text: `${item.symbol}=${formatHarmonographValue(params[item.key], item.precision)}`,
      align: "left",
      font: "math",
      fontSize: 19,
      style: { fill: item.fill }
    });
    group.add(node);
    return { ...item, node };
  });
  return { group, items };
}

function formatHarmonographValue(value, precision) {
  const fixed = Number(value || 0).toFixed(precision);
  return fixed.replace(/\.?0+$/, "") || "0";
}

export function createVolumeRevolutionScene() {
  const scene = new Scene({ background: "#f8fafc" });
  const timeline = new Timeline({ autoplay: true, loop: true });
  const state = { x: 0.16, aor: 0, thetaOffset: 0 };
  const camera3D = new Camera3D({
    position: { x: 2.35, y: 1.35, z: 3.1 },
    target: { x: 0.55, y: 0, z: 0 },
    zoom: 118,
    offset: { x: -20, y: 75 }
  });
  const project = makeProjector({ camera3D });
  const root = new GroupNode();
  const surface = new GroupNode({ opacity: 0.9 });
  const washer = new GroupNode();
  const axis = new LineNode({ style: { stroke: "#dc2626", strokeWidth: 2, lineDash: [8, 8] } });
  const outerCurve = projectedCurve((x) => [x, x, 0], { camera3D, tRange: [0, 1], samples: 80, style: { stroke: "#2563eb", strokeWidth: 3 } });
  const innerCurve = projectedCurve((x) => [x, x * x, 0], { camera3D, tRange: [0, 1], samples: 80, style: { stroke: "#16a34a", strokeWidth: 3 } });
  const label = new TextNode({ x: 215, y: -188, text: "", align: "left", fontSize: 14, maxWidth: 260, style: { fill: "#334155" } });

  const refresh = () => {
    surface.clear();
    buildRevolutionSurface(surface, (x) => x, state.aor, project, { stroke: "#60a5fa", opacity: 0.38, thetaOffset: state.thetaOffset });
    buildRevolutionSurface(surface, (x) => x * x, state.aor, project, { stroke: "#34d399", opacity: 0.54, thetaOffset: state.thetaOffset });
    const axisPoints = [project({ x: -0.15, y: state.aor, z: 0 }), project({ x: 1.25, y: state.aor, z: 0 })];
    axis.setPoints(axisPoints);
    washer.clear();
    washer.add(
      revolutionRing((x) => x, state.x, state.aor, project, { stroke: "#2563eb", strokeWidth: 3 }),
      revolutionRing((x) => x * x, state.x, state.aor, project, { stroke: "#16a34a", strokeWidth: 3 }),
      new LineNode({
        points: [project({ x: state.x, y: state.x * state.x, z: 0 }), project({ x: state.x, y: state.x, z: 0 })],
        style: { stroke: "#0f172a", strokeWidth: 2 }
      })
    );
    label.text = `axis y = ${state.aor.toFixed(2)}\nwasher at x = ${state.x.toFixed(2)}`;
  };
  root.add(createProjectedAxes3D({ camera3D, xRange: [-0.2, 1.3], yRange: [-1.3, 1.3], zRange: [-1.3, 1.3] }), surface, outerCurve, innerCurve, axis, washer);
  root.addUpdater(refresh);
  refresh();

  timeline.to(state, { x: 1 }, { at: 0, duration: 3, ease: "inOutCubic" });
  timeline.to(state, { aor: -1 }, { at: 3.3, duration: 2, ease: "inOutCubic" });
  timeline.to(state, { thetaOffset: Math.PI * 2 }, { at: 0, duration: 8, ease: "linear" });
  timeline.to(state, { x: 0.16 }, { at: 5.5, duration: 2.5, ease: "inOutCubic" });
  camera3DOrbitBy(timeline, camera3D, { yaw: Math.PI * 2, pitch: 0.08 }, { at: 0, duration: 8, ease: "linear" });
  timeline.duration = 8;

  scene.add(
    new TextNode({ text: "Volume of Revolution", y: -255, fontSize: 24, fontWeight: 800, style: { fill: "#0f172a" } }),
    new TextNode({ text: "y=x and y=x^2", x: -260, y: -190, fontSize: 15, fontWeight: 700, style: { fill: "#334155" } }),
    label,
    root
  );
  return { scene, timeline, camera3D, target: washer, statusText: "3D camera volume scene" };
}

export function createCrossSectionsScene() {
  const scene = new Scene({ background: "#f8fafc" });
  const timeline = new Timeline({ autoplay: true, loop: true });
  const tracker = new ValueTracker(0.1);
  const camera3D = new Camera3D({
    position: { x: 4.2, y: 3.4, z: 7.2 },
    target: { x: 1.05, y: 3.25, z: 3.25 },
    zoom: 70,
    offset: { x: -120, y: 170 }
  });
  const project = makeProjector({ camera3D });
  const section = new GroupNode();
  const base = new GroupNode();
  const curve = projectedCurve((x) => [x, Math.exp(x), 0], { tRange: [0, 2], samples: 120, camera3D, style: { stroke: "#2563eb", strokeWidth: 3 } });
  const edge = projectedCurve((x) => [x, Math.exp(x), Math.exp(x)], { tRange: [0, 2], samples: 120, camera3D, style: { stroke: "#0f766e", strokeWidth: 2.5 } });
  const label = new TextNode({ x: 240, y: -165, text: "", align: "left", fontSize: 14, maxWidth: 250, style: { fill: "#334155" } });

  for (let i = 0; i <= 18; i += 1) {
    const x = 2 * i / 18;
    const y = Math.exp(x);
    base.add(new ProjectedPath3DNode({
      points3D: [{ x, y: 0, z: y }, { x, y, z: y }],
      camera3D,
      style: { stroke: "rgba(14, 165, 233, 0.22)", strokeWidth: 1.4 }
    }));
  }

  const refresh = () => {
    const x = tracker.getValue();
    const h = Math.exp(x);
    const corners = [
      project({ x, y: 0, z: 0 }),
      project({ x, y: h, z: 0 }),
      project({ x, y: h, z: h }),
      project({ x, y: 0, z: h })
    ];
    section.clear();
    section.add(new PolygonNode({
      points: corners,
      closed: true,
      style: { fill: "rgba(251, 191, 36, 0.28)", stroke: "#d97706", strokeWidth: 2.2 }
    }));
    label.text = `square cross-section\nx = ${x.toFixed(2)}\nside = e^x = ${h.toFixed(2)}`;
  };
  section.addUpdater(refresh);
  refresh();

  timeline.to(tracker, { value: 2 }, { at: 0, duration: 4, ease: "inOutCubic" });
  timeline.to(tracker, { value: 0.1 }, { at: 4.2, duration: 3, ease: "inOutCubic" });
  camera3DOrbitBy(timeline, camera3D, { yaw: Math.PI * 0.8, pitch: -0.12 }, { at: 0, duration: 7.2, ease: "inOutCubic" });
  timeline.duration = 7.2;

  scene.add(
    new TextNode({ text: "Known Cross-Sections", y: -255, fontSize: 24, fontWeight: 800, style: { fill: "#0f172a" } }),
    createProjectedAxes3D({ camera3D, xRange: [-0.2, 2.2], yRange: [0, 8], zRange: [0, 8] }),
    base,
    curve,
    edge,
    section,
    label
  );
  return { scene, timeline, camera3D, target: section, statusText: "3D camera cross-section scene" };
}

export function createPolarAreaDerivationScene() {
  const scene = new Scene({ background: "#f8fafc" });
  const timeline = new Timeline({ autoplay: true, loop: true });
  const state = { count: 6 };
  const rectGroup = new GroupNode({ x: -270, y: 20 });
  const polarGroup = new GroupNode({ x: 255, y: 25 });
  const rectDynamic = new GroupNode();
  const polarDynamic = new GroupNode();
  const rectFn = (x) => 2 + 0.5 * Math.sin(x);
  const polarFn = (theta) => 3 + 0.6 * Math.cos(6 * theta);
  const rectDomain = [1, 3];
  const thetaRange = [17 * Math.PI / 180, 73 * Math.PI / 180];
  const rectAxes = createAxes({ xRange: [-1, 4, 1], yRange: [-1, 3, 1], width: 360, height: 270, labels: false });
  const rectGraph = createFunctionGraph(rectFn, { axes: rectAxes, xRange: rectDomain, style: { stroke: "#16a34a", strokeWidth: 3 } });
  const rectArea = createAreaUnderCurve(rectFn, { axes: rectAxes, xRange: rectDomain, style: { fill: "rgba(37, 99, 235, 0.16)" } });
  const polarGrid = createPolarGrid({ radius: 145, rings: 4, spokes: 16 });
  const polarCurve = createPolarCurve(polarFn, { tRange: thetaRange, samples: 120, scale: 42, style: { stroke: "#16a34a", strokeWidth: 3 } });
  const rectTitle = new MathTextNode({ text: "rectangular: f(x) dx", y: -170, fontSize: 16, fontWeight: 700, style: { fill: "#334155" } });
  const polarTitle = new MathTextNode({ text: "polar: frac{1}{2} r(theta)^2 d theta", y: -170, fontSize: 16, fontWeight: 700, style: { fill: "#334155" } });
  const countLabel = new TextNode({ y: 222, text: "", fontSize: 14, fontWeight: 700, style: { fill: "#0f766e" } });

  const refresh = () => {
    const count = Math.max(4, Math.round(state.count));
    rectDynamic.clear();
    rectDynamic.add(createRiemannRectangles(rectFn, { axes: rectAxes, xRange: rectDomain, count, sample: "right", style: { fill: "rgba(37, 99, 235, 0.28)" } }));
    polarDynamic.clear();
    polarDynamic.add(
      createPolarArea(polarFn, { tRange: thetaRange, samples: 60, scale: 42, style: { fill: "rgba(37, 99, 235, 0.16)" } }),
      createPolarSectors(polarFn, { tRange: thetaRange, count, scale: 42 })
    );
    countLabel.text = `${count} partitions`;
  };
  rectDynamic.addUpdater(refresh);
  refresh();

  rectGroup.add(rectAxes, rectArea, rectDynamic, rectGraph, rectTitle);
  polarGroup.add(polarGrid, polarDynamic, polarCurve, polarTitle);
  timeline.to(state, { count: 30 }, { at: 0, duration: 5, ease: "inOutCubic" });
  timeline.to(state, { count: 6 }, { at: 5, duration: 2.5, ease: "inOutCubic" });
  timeline.duration = 7.5;

  scene.add(
    new TextNode({ text: "Rectangular and Polar Area", y: -255, fontSize: 24, fontWeight: 800, style: { fill: "#0f172a" } }),
    countLabel,
    rectGroup,
    polarGroup
  );
  return { scene, timeline, target: polarGroup, statusText: "Rectangular vs polar area scene" };
}

export function createKochCurveScene() {
  const scene = new Scene({ background: "#f8fafc" });
  const timeline = new Timeline({ autoplay: true, loop: true });
  const state = { level: 0 };
  const path = new PathNode({ style: { stroke: "#0ea5e9", strokeWidth: 8, fill: "transparent" } });
  const label = new TextNode({ y: -190, text: "", fontSize: 18, fontWeight: 800, style: { fill: "#0f172a" } });

  const refresh = () => {
    const level = Math.max(0, Math.min(5, Math.round(state.level)));
    path.setPoints(kochPoints(level, 620).map((point) => ({ x: point.x, y: point.y + 65 })));
    path.style.strokeWidth = Math.max(1.5, 9 - level * 1.35);
    label.text = `iteration ${level}`;
  };
  path.addUpdater(refresh);
  refresh();

  timeline.to(state, { level: 5 }, { at: 0, duration: 5, ease: "steps" });
  timeline.to(state, { level: 0 }, { at: 5.5, duration: 4, ease: "steps" });
  timeline.duration = 9.5;

  scene.add(
    new TextNode({ text: "Koch Curve", y: -255, fontSize: 24, fontWeight: 800, style: { fill: "#0f172a" } }),
    label,
    path
  );
  return { scene, timeline, target: path, statusText: "Koch curve fractal scene" };
}

export function createFibonacciSpiralScene() {
  const scene = new Scene({ background: "#f8fafc" });
  const timeline = new Timeline({ autoplay: true, loop: true });
  const group = new GroupNode({ scale: { x: 0.78, y: 0.78 } });
  const squares = fibonacciSquares([1, 1, 2, 3, 5, 8, 13], 18);
  const squareBounds = boundsFromSquares(squares);
  for (const [index, square] of squares.entries()) {
    group.add(new RectNode({
      x: square.x + square.size / 2,
      y: square.y + square.size / 2,
      width: square.size,
      height: square.size,
      cornerRadius: 0,
      style: {
        fill: index % 2 === 0 ? "rgba(37, 99, 235, 0.08)" : "rgba(15, 118, 110, 0.08)",
        stroke: "#334155",
        strokeWidth: 1.4
      }
    }));
  }
  const spiral = new PathNode({
    points: fitPointsToBounds(goldenSpiralPoints(320, 1), squareBounds, 12).reverse(),
    style: { stroke: "#06b6d4", strokeWidth: 5, fill: "transparent" }
  });
  const marker = new CircleNode({ radius: 8, style: { fill: "#06b6d4", stroke: "#ffffff", strokeWidth: 2 } });
  marker.position.copy(spiral.points[0] || { x: 0, y: 0 });
  group.add(spiral, marker);
  moveAlongPath(timeline, marker, spiral.points, { at: 0, duration: 5.5, ease: "linear" });
  timeline.duration = 5.5;

  scene.add(
    new TextNode({ text: "Fibonacci Sequence / Golden Spiral", y: -255, fontSize: 24, fontWeight: 800, style: { fill: "#0f172a" } }),
    group
  );
  return { scene, timeline, target: marker, path: spiral.points, statusText: "Fibonacci spiral scene" };
}

export function createCycloidScene() {
  const scene = new Scene({ background: "#f8fafc" });
  const timeline = new Timeline({ autoplay: true });
  const state = { theta: 0 };
  const radius = 56;
  const startX = -330;
  const baseY = 175;
  const circle = new CircleNode({ radius, style: { fill: "rgba(37, 99, 235, 0.08)", stroke: "#2563eb", strokeWidth: 3 } });
  const spoke = new LineNode({ style: { stroke: "#2563eb", strokeWidth: 2 } });
  const dot = new CircleNode({ radius: 7, style: { fill: "#dc2626", stroke: "#ffffff", strokeWidth: 2 } });
  const trace = new TracedPathNode(() => dot.position, { minDistance: 1.5, style: { stroke: "#06b6d4", strokeWidth: 4, fill: "transparent" } });
  const refresh = () => {
    const theta = state.theta;
    const center = { x: startX + radius * theta, y: baseY - radius };
    const point = {
      x: startX + radius * (theta - Math.sin(theta)),
      y: baseY - radius * (1 - Math.cos(theta))
    };
    circle.position.copy(center);
    dot.position.copy(point);
    spoke.setPoints([{ x: 0, y: 0 }, { x: point.x - center.x, y: point.y - center.y }]);
    spoke.position.copy(center);
  };
  circle.addUpdater(refresh);
  refresh();

  timeline.to(state, { theta: Math.PI * 4 }, { at: 0, duration: 7, ease: "linear" });
  scene.add(
    new TextNode({ text: "Cycloid", y: -255, fontSize: 26, fontWeight: 800, style: { fill: "#0f172a" } }),
    new LineNode({ points: [{ x: -360, y: baseY }, { x: 380, y: baseY }], style: { stroke: "#334155", strokeWidth: 2 } }),
    trace,
    circle,
    spoke,
    dot
  );
  return { scene, timeline, target: dot, path: trace.points, statusText: "Cycloid traced-path scene" };
}

export function createModCardioidScene() {
  const scene = new Scene({ background: "#07111f" });
  const timeline = new Timeline({ autoplay: true, loop: true });
  const state = { multiplier: 2 };
  const count = 170;
  const radius = 215;
  const lines = new GroupNode();
  const label = new TextNode({ y: 265, text: "", fontSize: 18, fontWeight: 800, style: { fill: "#e0f2fe" } });

  const refresh = () => {
    const multiplier = state.multiplier;
    lines.clear();
    for (let index = 0; index < count; index += 1) {
      const start = pointOnCircle(index / count, radius);
      const end = pointOnCircle(((index * multiplier) % count) / count, radius);
      lines.add(new LineNode({
        points: [start, end],
        style: {
          stroke: `hsl(${(index * 280 / count + multiplier * 8) % 360} 88% 64%)`,
          strokeWidth: 0.8,
          lineCap: "butt"
        }
      }));
    }
    label.text = `m = ${multiplier.toFixed(2)}, n = ${count}`;
  };
  lines.addUpdater(refresh);
  refresh();

  timeline.to(state, { multiplier: 12 }, { at: 0, duration: 10, ease: "linear" });
  timeline.duration = 10;
  scene.add(
    new TextNode({ text: "M mod N Cardioid", y: -270, fontSize: 24, fontWeight: 800, style: { fill: "#e0f2fe" } }),
    new CircleNode({ radius, style: { fill: "transparent", stroke: "#334155", strokeWidth: 1.5 } }),
    lines,
    label
  );
  return { scene, timeline, target: lines, statusText: "M mod N line-art scene" };
}

export function createRiemannIntegralScene() {
  const scene = new Scene({ background: "#f8fafc" });
  const timeline = new Timeline({ autoplay: true, loop: true });
  const state = { phase: 0 };
  const axes = createAxes({ xRange: [0, 7, 1], yRange: [-1, 7, 1], width: 660, height: 380 });
  const domain = [0, 7];
  const graph = new PathNode({ style: { stroke: "#16a34a", strokeWidth: 3, fill: "transparent" } });
  const rects = new GroupNode();
  const label = new TextNode({ x: 265, y: -170, align: "left", text: "", fontSize: 16, fontWeight: 800, maxWidth: 220, style: { fill: "#0f172a" } });
  const functions = [
    { name: "x^2 / 8", fn: (x) => x * x / 8 },
    { name: "sin(x) + 2", fn: (x) => Math.sin(x) + 2 },
    { name: "sin(x / 2) + 1", fn: (x) => Math.sin(x / 2) + 1 },
    { name: "x / 2 + 2", fn: (x) => x / 2 + 2 }
  ];

  const refresh = () => {
    const index = Math.min(functions.length - 1, Math.floor(state.phase));
    const local = state.phase - index;
    const item = functions[index];
    const count = Math.round(6 + local * 22);
    graph.setPoints(createFunctionGraph(item.fn, { axes, xRange: domain, samples: 180 }).points);
    rects.clear();
    rects.add(createRiemannRectangles(item.fn, { axes, xRange: domain, count, sample: "right", style: { fill: "rgba(37, 99, 235, 0.25)", strokeWidth: 0.8 } }));
    label.text = `${item.name}\n${count} rectangles`;
  };
  graph.addUpdater(refresh);
  refresh();

  timeline.to(state, { phase: 3.95 }, { at: 0, duration: 11, ease: "linear" });
  timeline.duration = 11;
  scene.add(
    new TextNode({ text: "Riemann Integral Visualization", y: -260, fontSize: 24, fontWeight: 800, style: { fill: "#0f172a" } }),
    axes,
    rects,
    graph,
    label
  );
  return { scene, timeline, target: rects, statusText: "Riemann rectangles scene" };
}

export function createLorenzAttractorScene() {
  const scene = new Scene({ background: "#07111f" });
  const timeline = new Timeline({ autoplay: true, loop: true });
  const state = { reveal: 0 };
  const camera3D = new Camera3D({
    position: { x: 3.2, y: 2.3, z: 4.4 },
    target: { x: 0, y: 0.25, z: 0 },
    zoom: 114,
    offset: { x: -35, y: 20 }
  });
  const points = lorenzPoints(1700);
  const path = new ProjectedPath3DNode({
    camera3D,
    source: () => points.slice(0, Math.max(2, Math.floor(points.length * state.reveal))).map(normalizeLorenzPoint),
    style: { stroke: "#38bdf8", strokeWidth: 1.6, fill: "transparent" }
  });
  const dot = new CircleNode({ radius: 7, style: { fill: "#facc15", stroke: "#ffffff", strokeWidth: 2 } });
  const label = new TextNode({ x: 250, y: -185, text: "sigma=10\nrho=28\nbeta=2.667", align: "left", fontSize: 14, maxWidth: 220, style: { fill: "#cbd5e1" } });

  const refresh = () => {
    const projected = path.points;
    dot.position.copy(projected[projected.length - 1] || { x: 0, y: 0 });
  };
  path.addUpdater(refresh);
  refresh();

  timeline.to(state, { reveal: 1 }, { at: 0, duration: 13, ease: "linear" });
  camera3DOrbitBy(timeline, camera3D, { yaw: Math.PI * 2, pitch: 0.18 }, { at: 0, duration: 13, ease: "linear" });
  timeline.duration = 13;
  scene.add(
    new TextNode({ text: "Lorenz Attractor", y: -260, fontSize: 24, fontWeight: 800, style: { fill: "#e0f2fe" } }),
    createProjectedAxes3D({ camera3D, xRange: [-1, 1], yRange: [-1, 1.5], zRange: [-1, 1] }),
    path,
    dot,
    label
  );
  return { scene, timeline, camera3D, target: dot, path: path.points, statusText: "3D camera Lorenz scene" };
}

function projectedCurve(fn, options = {}) {
  if (options.camera3D) {
    return new ProjectedPath3DNode({
      source: () => sample3DPoints(fn, options.tRange || [0, 1], options.samples || 80),
      camera3D: options.camera3D,
      style: options.style
    });
  }
  return createParametricCurve((t) => options.project(vectorFromArray(fn(t))), {
    tRange: options.tRange,
    samples: options.samples,
    style: options.style
  });
}

function makeProjector(options = {}) {
  if (options.camera3D) {
    return (point) => options.camera3D.project(point);
  }
  return (point) => projectPoint3D(point, {
    scale: options.scale,
    origin: options.origin,
    depth: options.depth ?? 0.54,
    lift: options.lift ?? 0.34
  });
}

function sample3DPoints(fn, tRange, samples) {
  const [min, max] = tRange;
  return Array.from({ length: samples + 1 }, (_, index) => {
    const t = min + (max - min) * index / samples;
    return vectorFromArray(fn(t));
  });
}

function vectorFromArray(value) {
  return Array.isArray(value) ? { x: value[0], y: value[1], z: value[2] || 0 } : value;
}

function revolutionRing(fn, x, aor, project, options = {}) {
  const radius = fn(x) - aor;
  const points = sampleParametric2D((theta) => project({
    x,
    y: aor + radius * Math.cos(theta),
    z: radius * Math.sin(theta)
  }), { tRange: [0, Math.PI * 2], samples: 72 });
  return new PathNode({ points, closed: true, style: { fill: "transparent", ...options } });
}

function buildRevolutionSurface(group, fn, aor, project, options = {}) {
  const thetaOffset = options.thetaOffset || 0;
  for (let i = 0; i <= 14; i += 1) {
    const x = i / 14;
    group.add(revolutionRing(fn, x, aor, project, {
      stroke: options.stroke,
      strokeWidth: 0.8,
      opacity: options.opacity
    }));
  }
  for (let j = 0; j < 10; j += 1) {
    const theta = thetaOffset + Math.PI * 2 * j / 10;
    group.add(new PathNode({
      points: sampleParametric2D((x) => {
        const radius = fn(x) - aor;
        return project({ x, y: aor + radius * Math.cos(theta), z: radius * Math.sin(theta) });
      }, { tRange: [0, 1], samples: 40 }),
      style: { fill: "transparent", stroke: options.stroke, strokeWidth: 0.9 }
    }));
  }
}

function kochPoints(level, length) {
  let points = [{ x: -length / 2, y: 0 }, { x: length / 2, y: 0 }];
  for (let iteration = 0; iteration < level; iteration += 1) {
    const next = [];
    for (let index = 0; index < points.length - 1; index += 1) {
      const a = points[index];
      const b = points[index + 1];
      const dx = (b.x - a.x) / 3;
      const dy = (b.y - a.y) / 3;
      const p1 = { x: a.x + dx, y: a.y + dy };
      const p3 = { x: a.x + dx * 2, y: a.y + dy * 2 };
      const angle = Math.atan2(dy, dx) - Math.PI / 3;
      const lengthThird = Math.hypot(dx, dy);
      const p2 = { x: p1.x + Math.cos(angle) * lengthThird, y: p1.y + Math.sin(angle) * lengthThird };
      next.push(a, p1, p2, p3);
    }
    next.push(points[points.length - 1]);
    points = next;
  }
  return points;
}

function fibonacciSquares(sequence, scale) {
  const squares = [{ x: 0, y: 0, size: sequence[0] * scale }];
  let minX = 0;
  let minY = 0;
  let maxX = sequence[0] * scale;
  let maxY = sequence[0] * scale;
  const directions = ["right", "up", "left", "down"];
  for (let index = 1; index < sequence.length; index += 1) {
    const size = sequence[index] * scale;
    const direction = directions[(index - 1) % directions.length];
    let x = minX;
    let y = minY;
    if (direction === "right") {
      x = maxX;
      y = minY;
    } else if (direction === "up") {
      x = minX;
      y = minY - size;
    } else if (direction === "left") {
      x = minX - size;
      y = minY;
    } else {
      x = minX;
      y = maxY;
    }
    squares.push({ x, y, size });
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + size);
    maxY = Math.max(maxY, y + size);
  }
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  return squares.map((square) => ({ ...square, x: square.x - centerX, y: square.y - centerY }));
}

function goldenSpiralPoints(samples, scale) {
  const points = [];
  const growth = 0.306349;
  for (let index = 0; index <= samples; index += 1) {
    const theta = -0.5 + 4.65 * Math.PI * index / samples;
    const radius = Math.exp(growth * theta) * 5.6;
    points.push({
      x: Math.cos(theta) * radius * scale / 100,
      y: Math.sin(theta) * radius * scale / 100
    });
  }
  return points;
}

function boundsFromSquares(squares) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const square of squares) {
    minX = Math.min(minX, square.x);
    minY = Math.min(minY, square.y);
    maxX = Math.max(maxX, square.x + square.size);
    maxY = Math.max(maxY, square.y + square.size);
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function fitPointsToBounds(points, bounds, padding = 0) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  const sourceWidth = Math.max(1, maxX - minX);
  const sourceHeight = Math.max(1, maxY - minY);
  const targetWidth = Math.max(1, bounds.width - padding * 2);
  const targetHeight = Math.max(1, bounds.height - padding * 2);
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const sourceCenter = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  const targetCenter = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
  return points.map((point) => ({
    x: targetCenter.x + (point.x - sourceCenter.x) * scale,
    y: targetCenter.y + (point.y - sourceCenter.y) * scale
  }));
}

function pointOnCircle(proportion, radius) {
  const theta = Math.PI * 2 * proportion - Math.PI / 2;
  return { x: Math.cos(theta) * radius, y: Math.sin(theta) * radius };
}

function lorenzPoints(count) {
  const points = [];
  let x = 0.01;
  let y = 0.1;
  let z = 0.105;
  const dt = 0.01;
  for (let index = 0; index < count; index += 1) {
    const dx = 10 * (y - x);
    const dy = 28 * x - y - x * z;
    const dz = x * y - 2.667 * z;
    x += dx * dt;
    y += dy * dt;
    z += dz * dt;
    if (index > 80) points.push({ x, y, z });
  }
  return points;
}

function rotateY(point, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    x: point.x * c + point.z * s,
    y: point.y,
    z: -point.x * s + point.z * c
  };
}

function normalizeLorenzPoint(point) {
  return { x: point.x / 14, y: (point.z - 24) / 9, z: point.y / 16 };
}
