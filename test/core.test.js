import assert from "node:assert/strict";
import test from "node:test";
import { Bounds, Mat3, Vec2, Vec3 } from "../src/index.js";

test("Vec2 supports basic vector math", () => {
  const value = new Vec2(3, 4);
  assert.equal(value.length(), 5);
  value.normalize();
  assert.ok(Math.abs(value.length() - 1) < 1e-9);
});

test("Vec3 supports 3D vector math", () => {
  const value = new Vec3(1, 0, 0);
  value.cross({ x: 0, y: 1, z: 0 });
  assert.deepEqual(value.toJSON(), { x: 0, y: 0, z: 1 });
  assert.equal(new Vec3(1, 2, 3).dot({ x: 2, y: 0, z: 1 }), 5);
});

test("Mat3 composes translation, rotation, and scale", () => {
  const matrix = Mat3.identity().translated(10, 5).scaled(2);
  const point = matrix.apply({ x: 2, y: 3 });
  assert.deepEqual(point.toJSON(), { x: 14, y: 11 });
});

test("Bounds.empty can include points without producing NaN", () => {
  const bounds = Bounds.empty();
  bounds.include({ x: 2, y: 3 });
  bounds.include({ x: 5, y: 7 });
  assert.deepEqual(bounds.toJSON(), { x: 2, y: 3, width: 3, height: 4 });
});
