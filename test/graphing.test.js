import assert from "node:assert/strict";
import test from "node:test";
import {
  Camera3D,
  ProjectedPath3DNode,
  TracedPathNode,
  ValueTracker,
  axesToPoint,
  createAxes,
  createFunctionGraph,
  createPolarSectors,
  createRiemannRectangles,
  projectPoint3D,
  sampleParametric2D
} from "../src/index.js";

test("ValueTracker exposes mutable numeric values", () => {
  const tracker = new ValueTracker(2);
  tracker.incrementValue(3);
  assert.equal(tracker.getValue(), 5);
  tracker.setValue(9);
  assert.equal(Number(tracker), 9);
});

test("parametric sampling and 3D projection return finite scene points", () => {
  const points = sampleParametric2D((t) => ({ x: t, y: t * t }), { tRange: [0, 1], samples: 4 });
  assert.equal(points.length, 5);
  assert.deepEqual(points[0].toJSON(), { x: 0, y: 0 });
  const projected = projectPoint3D({ x: 1, y: 2, z: 3 }, { scale: 10 });
  assert.ok(Number.isFinite(projected.x));
  assert.ok(Number.isFinite(projected.y));
});

test("Camera3D projects points and drives projected 3D paths", () => {
  const camera = new Camera3D({ position: { x: 0, y: 0, z: 4 }, target: { x: 0, y: 0, z: 0 }, zoom: 100 });
  const before = camera.project({ x: 1, y: 0, z: 0 });
  assert.ok(Number.isFinite(before.x));
  assert.ok(Number.isFinite(before.y));

  const path = new ProjectedPath3DNode({
    camera3D: camera,
    points3D: [{ x: -1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }]
  });
  const firstX = path.points[0].x;
  camera.orbit(Math.PI / 4, 0, 0);
  path.update(1 / 60, { time: 0, frame: 1 });
  assert.notEqual(path.points[0].x, firstX);
});

test("integration helpers create grouped rectangles and polar sectors", () => {
  const axes = createAxes({ xRange: [0, 4, 1], yRange: [0, 4, 1], width: 200, height: 200 });
  const rects = createRiemannRectangles((x) => x * x, { axes, xRange: [1, 3], count: 2 });
  assert.equal(rects.children.length, 2);
  assert.equal(rects.children[0].width, 50);
  const sectors = createPolarSectors(() => 2, { tRange: [0, Math.PI / 2], count: 3, scale: 10 });
  assert.equal(sectors.children.length, 3);
});

test("function graphs over a subdomain still project through the full axes range", () => {
  const axes = createAxes({ xRange: [-1, 4, 1], yRange: [-1, 3, 1], width: 500, height: 400 });
  const graph = createFunctionGraph((x) => x, { axes, xRange: [1, 3], samples: 2 });

  assert.deepEqual(graph.points[0].toJSON(), axesToPoint(1, 1, axes.data));
  assert.deepEqual(graph.points[2].toJSON(), axesToPoint(3, 3, axes.data));
  assert.notEqual(graph.points[0].x, -250);
  assert.notEqual(graph.points[2].x, 250);
});

test("right-endpoint Riemann rectangles align their right edge with the graphed function", () => {
  const axes = createAxes({ xRange: [0, 7, 1], yRange: [-1, 7, 1], width: 700, height: 400 });
  const fn = (x) => x * x / 8;
  const rects = createRiemannRectangles(fn, { axes, xRange: [0, 7], count: 7, sample: "right" });
  const last = rects.children.at(-1);
  const graphEnd = axesToPoint(7, fn(7), axes.data);

  assert.equal(last.position.x + last.width / 2, graphEnd.x);
  assert.equal(last.position.y - last.height / 2, graphEnd.y);
});

test("TracedPathNode appends sampled points during updates", () => {
  let x = 0;
  const trace = new TracedPathNode(() => ({ x: x += 2, y: 0 }), { minDistance: 1 });
  trace.update(1 / 60, { time: 0, frame: 1 });
  trace.update(1 / 60, { time: 1 / 60, frame: 2 });
  assert.equal(trace.points.length, 2);
});
