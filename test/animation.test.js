import assert from "node:assert/strict";
import test from "node:test";
import { Camera2D, Camera3D, CircleNode, RectNode, Timeline, camera3DOrbitBy, camera3DTo, cameraTo, growToSize, moveAlongPath, moveTo, pulse, rotateBy, traceBetween } from "../src/index.js";

test("Timeline interpolates numeric properties", () => {
  const target = { x: 0 };
  const timeline = new Timeline();
  timeline.to(target, { x: 10 }, { duration: 2, ease: "linear", at: 0 });
  timeline.seek(1);
  assert.equal(target.x, 5);
  timeline.seek(2);
  assert.equal(target.x, 10);
});

test("Timeline can step while playing", () => {
  const target = { alpha: 0 };
  const timeline = new Timeline({ autoplay: true });
  timeline.to(target, { alpha: 1 }, { duration: 1, ease: "linear", at: 0 });
  timeline.step(0.25);
  assert.equal(target.alpha, 0.25);
});

test("animation presets build common scene tweens", () => {
  const timeline = new Timeline();
  const node = new CircleNode({ x: 0, y: 0 });
  moveTo(timeline, node, { x: 20, y: 10 }, { duration: 1, at: 0 });
  timeline.seek(0.5);
  assert.deepEqual(node.position.toJSON(), { x: 10, y: 5 });

  pulse(timeline, node, { duration: 0.4, at: 1 });
  assert.ok(timeline.duration >= 1.4);
});

test("traceBetween captures deterministic start and end points", () => {
  const timeline = new Timeline();
  const from = new CircleNode({ x: 0, y: 0 });
  const to = new CircleNode({ x: 100, y: 0 });
  const marker = new CircleNode({ x: 999, y: 999 });
  traceBetween(timeline, marker, from, to, { duration: 1, at: 0 });
  timeline.seek(0.5);
  assert.equal(marker.position.x, 50);
  assert.equal(marker.position.y, 0);
});

test("moveAlongPath follows sampled path points", () => {
  const timeline = new Timeline();
  const marker = new CircleNode();
  moveAlongPath(timeline, marker, [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }], {
    duration: 2,
    at: 0,
    ease: "linear"
  });
  timeline.seek(1.5);
  assert.equal(marker.position.x, 100);
  assert.equal(marker.position.y, 50);
});

test("shape and camera animation helpers tween native properties", () => {
  const timeline = new Timeline();
  const rect = new RectNode({ width: 10, height: 20 });
  const camera = new Camera2D();
  growToSize(timeline, rect, { width: 30, height: 40 }, { duration: 1, at: 0 });
  rotateBy(timeline, rect, Math.PI, { duration: 1, at: 0 });
  cameraTo(timeline, camera, { position: { x: 20, y: 10 }, zoom: 2, duration: 1, at: 0 });
  timeline.seek(1);
  assert.equal(rect.width, 30);
  assert.equal(rect.height, 40);
  assert.equal(rect.rotation, Math.PI);
  assert.deepEqual(camera.position.toJSON(), { x: 20, y: 10 });
  assert.equal(camera.zoom, 2);
});

test("3D camera animation helpers tween and orbit camera state", () => {
  const timeline = new Timeline();
  const camera = new Camera3D({ position: { x: 0, y: 0, z: 4 }, target: { x: 0, y: 0, z: 0 }, zoom: 100 });
  camera3DTo(timeline, camera, { position: { x: 1, y: 2, z: 5 }, target: { x: 0, y: 1, z: 0 }, zoom: 120, at: 0, duration: 1 });
  timeline.seek(1);
  assert.deepEqual(camera.position.toJSON(), { x: 1, y: 2, z: 5 });
  assert.deepEqual(camera.target.toJSON(), { x: 0, y: 1, z: 0 });
  assert.equal(camera.zoom, 120);

  const orbitTimeline = new Timeline();
  const orbitCamera = new Camera3D({ position: { x: 0, y: 0, z: 4 }, target: { x: 0, y: 0, z: 0 } });
  camera3DOrbitBy(orbitTimeline, orbitCamera, { yaw: Math.PI }, { at: 0, duration: 2, ease: "linear" });
  orbitTimeline.seek(1);
  assert.ok(Math.abs(orbitCamera.position.x - 4) < 1e-9);
  orbitTimeline.seek(2);
  assert.ok(Math.abs(orbitCamera.position.z + 4) < 1e-9);
});
