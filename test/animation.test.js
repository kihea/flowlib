import assert from "node:assert/strict";
import test from "node:test";
import { Camera2D, Camera3D, CircleNode, Easings, LineNode, RectNode, Timeline, camera3DOrbitBy, camera3DTo, cameraTo, cascadeIn, cubicBezierEase, drawLine, growToSize, moveAlongPath, moveTo, pulse, resolveEase, rotateBy, steps, traceBetween } from "../src/index.js";

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

test("easing catalog covers standard families and factories", () => {
  const names = ["inSine", "outSine", "inOutSine", "inQuart", "outQuint", "inExpo", "outExpo", "inCirc", "outBack", "inElastic", "outElastic", "outBounce", "inOutBounce"];
  for (const name of names) {
    const ease = Easings[name];
    assert.equal(typeof ease, "function", `missing easing ${name}`);
    assert.ok(Math.abs(ease(0)) < 1e-6, `${name}(0) should be 0`);
    assert.ok(Math.abs(ease(1) - 1) < 1e-6, `${name}(1) should be 1`);
  }
  assert.equal(resolveEase("outBounce"), Easings.outBounce);

  const stepped = steps(4);
  assert.equal(stepped(0.1), 0);
  assert.equal(stepped(0.3), 0.25);
  assert.equal(stepped(1), 1);

  const bezier = cubicBezierEase(0.25, 0.1, 0.25, 1);
  assert.ok(Math.abs(bezier(0)) < 1e-4);
  assert.ok(Math.abs(bezier(1) - 1) < 1e-4);
  assert.ok(bezier(0.5) > 0.5, "ease curve should front-load progress");
});

test("Timeline resolves position parameters and labels", () => {
  const target = { a: 0, b: 0, c: 0, d: 0 };
  const timeline = new Timeline();
  timeline.to(target, { a: 1 }, { duration: 1, at: 0 });
  timeline.to(target, { b: 1 }, { duration: 1, at: "+=0.5" });
  assert.equal(timeline.tracks[1].startTime, 1.5);
  timeline.to(target, { c: 1 }, { duration: 1, at: "<" });
  assert.equal(timeline.tracks[2].startTime, 1.5);
  timeline.to(target, { d: 1 }, { duration: 1, at: ">" });
  assert.equal(timeline.tracks[3].startTime, 2.5);

  timeline.addLabel("finale", 3);
  assert.equal(timeline.labelTime("finale"), 3);
  timeline.to(target, { a: 2 }, { duration: 1, at: "finale" });
  assert.equal(timeline.tracks[4].startTime, 3);
});

test("Timeline call schedules one-shot callbacks", () => {
  const timeline = new Timeline();
  const calls = [];
  timeline.to({ x: 0 }, { x: 1 }, { duration: 2, at: 0 });
  timeline.call(() => calls.push("mid"), 1);
  timeline.seek(0.5);
  assert.equal(calls.length, 0);
  timeline.seek(1.2);
  assert.deepEqual(calls, ["mid"]);
  timeline.seek(1.8);
  assert.deepEqual(calls, ["mid"], "callback should not re-fire");
  timeline.reset();
  timeline.seek(1.2);
  assert.deepEqual(calls, ["mid", "mid"], "reset should re-arm callbacks");
});

test("Timeline fromTo tweens from explicit start values", () => {
  const target = { x: 100 };
  const timeline = new Timeline();
  timeline.fromTo(target, { x: 0 }, { x: 10 }, { duration: 1, ease: "linear", at: 0 });
  assert.equal(target.x, 0, "fromTo should apply the start value immediately");
  timeline.seek(0.5);
  assert.equal(target.x, 5);
});

test("Timeline repeat and yoyo alternate playback direction", () => {
  const target = { x: 0 };
  const timeline = new Timeline({ autoplay: true, repeat: 1, yoyo: true });
  let loops = 0;
  timeline.on("loop", () => loops++);
  timeline.to(target, { x: 10 }, { duration: 1, ease: "linear", at: 0 });
  timeline.step(0.5);
  assert.equal(target.x, 5);
  timeline.step(1);
  assert.equal(loops, 1);
  assert.ok(Math.abs(target.x - 5) < 1e-9, `yoyo should reflect back, got ${target.x}`);
  timeline.step(0.25);
  assert.ok(Math.abs(target.x - 2.5) < 1e-9);
  timeline.step(0.5);
  assert.equal(timeline.playing, false, "timeline should complete after final yoyo pass");
  assert.equal(target.x, 0);
});

test("Timeline reverse, progress, and timeScale control playback", () => {
  const target = { x: 0 };
  const timeline = new Timeline({ autoplay: true });
  timeline.to(target, { x: 10 }, { duration: 2, ease: "linear", at: 0 });
  timeline.timeScale(2);
  assert.equal(timeline.timeScale(), 2);
  timeline.step(0.5);
  assert.equal(target.x, 5);
  assert.equal(timeline.progress, 0.5);
  timeline.progress = 0.75;
  assert.equal(target.x, 7.5);
  timeline.reverse();
  timeline.step(0.25);
  assert.equal(target.x, 5);
  timeline.stop();
  assert.equal(timeline.playing, false);
  assert.equal(timeline.time, 0);
});

test("Timeline stagger offsets tweens per target", () => {
  const targets = [{ o: 0 }, { o: 0 }, { o: 0 }];
  const timeline = new Timeline();
  timeline.stagger(targets, { o: 1 }, { duration: 1, each: 0.5, ease: "linear", at: 0 });
  timeline.seek(1);
  assert.equal(targets[0].o, 1);
  assert.equal(targets[1].o, 0.5);
  assert.equal(targets[2].o, 0);
  assert.equal(timeline.duration, 2);
});

test("Timeline stagger supports center ordering", () => {
  const targets = [{ o: 0 }, { o: 0 }, { o: 0 }];
  const timeline = new Timeline();
  timeline.stagger(targets, { o: 1 }, { duration: 1, each: 0.5, from: "center", ease: "linear", at: 0 });
  const starts = timeline.tracks.map((t) => t.startTime);
  assert.equal(starts[1], 0, "center target should start first");
  assert.equal(starts[0], 0.5);
  assert.equal(starts[2], 0.5);
});

test("drawLine animates a dash-offset draw-on", () => {
  const timeline = new Timeline();
  const line = new LineNode({ points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] });
  drawLine(timeline, line, { duration: 1, ease: "linear", at: 0 });
  assert.deepEqual(line.style.lineDash, [100, 100]);
  assert.equal(line.style.lineDashOffset, 100);
  timeline.seek(0.5);
  assert.equal(line.style.lineDashOffset, 50);
  timeline.seek(1);
  assert.equal(line.style.lineDashOffset, 0);
});

test("cascadeIn staggers node entrances", () => {
  const timeline = new Timeline();
  const nodes = [new CircleNode({ x: 0, y: 10 }), new CircleNode({ x: 0, y: 20 })];
  cascadeIn(timeline, nodes, { duration: 0.5, each: 0.25, rise: 20, ease: "linear", at: 0 });
  assert.equal(nodes[0].opacity, 0);
  assert.equal(nodes[0].position.y, 30);
  timeline.seek(0.5);
  assert.equal(nodes[0].opacity, 1);
  assert.equal(nodes[0].position.y, 10);
  timeline.seek(0.75);
  assert.equal(nodes[1].opacity, 1);
  assert.equal(nodes[1].position.y, 20);
});
