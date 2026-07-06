import assert from "node:assert/strict";
import test from "node:test";
import { BezierCurve, cubicBezier, quadraticBezier } from "../src/index.js";

test("BezierCurve samples and splits curves", () => {
  const curve = cubicBezier({ x: 0, y: 0 }, { x: 10, y: 20 }, { x: 20, y: 20 }, { x: 30, y: 0 });
  const midpoint = curve.pointAt(0.5);
  assert.equal(Number.isFinite(midpoint.x), true);
  assert.equal(curve.sample(8).length, 9);
  const [left, right] = curve.split(0.5);
  assert.ok(left instanceof BezierCurve);
  assert.ok(right instanceof BezierCurve);
});

test("quadraticBezier creates a valid curve", () => {
  const curve = quadraticBezier([0, 0], [10, 10], [20, 0]);
  assert.deepEqual(curve.pointAt(0).toJSON(), { x: 0, y: 0 });
  assert.deepEqual(curve.pointAt(1).toJSON(), { x: 20, y: 0 });
});
