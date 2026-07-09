import assert from "node:assert/strict";
import test from "node:test";
import { AnimationClip, KeyframeTrack, Timeline } from "../src/index.js";
import { CircleNode } from "../src/index.js";

test("KeyframeTrack samples piecewise values with easing", () => {
  const track = new KeyframeTrack({ targetId: "a", property: "opacity" });
  track.setKeyframe(0, 0);
  track.setKeyframe(2, 1, "linear");
  assert.equal(track.sample(-1), 0);
  assert.equal(track.sample(1), 0.5);
  assert.equal(track.sample(5), 1);
  assert.equal(track.duration, 2);
});

test("KeyframeTrack replaces keyframes at the same time", () => {
  const track = new KeyframeTrack({ targetId: "a", property: "opacity" });
  track.setKeyframe(1, 0.25);
  track.setKeyframe(1, 0.75);
  assert.equal(track.keyframes.length, 1);
  assert.equal(track.sample(1), 0.75);
  track.removeKeyframe(1);
  assert.equal(track.keyframes.length, 0);
});

test("AnimationClip builds timelines that drive resolved targets", () => {
  const clip = new AnimationClip({ name: "intro" });
  clip.setKeyframe("node", "position", 0, { x: 0, y: 0 }, "linear");
  clip.setKeyframe("node", "position", 2, { x: 100, y: 50 }, "linear");
  clip.setKeyframe("node", "opacity", 0, 0, "linear");
  clip.setKeyframe("node", "opacity", 1, 1, "linear");

  const node = new CircleNode({ x: 0, y: 0, opacity: 0 });
  const timeline = clip.buildTimeline((id) => (id === "node" ? node : null));

  timeline.seek(1);
  assert.equal(node.position.x, 50);
  assert.equal(node.position.y, 25);
  assert.equal(node.opacity, 1);
  assert.equal(typeof node.position.clone, "function", "Vec2 position must survive object keyframes");

  timeline.seek(2);
  assert.equal(node.position.x, 100);
  assert.equal(clip.duration, 2);
});

test("AnimationClip serializes to JSON and back", () => {
  const clip = new AnimationClip({ name: "roundtrip" });
  clip.setKeyframe("camera", "zoom", 0, 1);
  clip.setKeyframe("camera", "zoom", 1.5, 2, "inOutCubic");

  const restored = AnimationClip.fromJSON(JSON.parse(JSON.stringify(clip.toJSON())));
  assert.equal(restored.name, "roundtrip");
  assert.equal(restored.duration, 1.5);

  const camera = { zoom: 1 };
  const timeline = restored.buildTimeline(() => camera);
  timeline.seek(1.5);
  assert.equal(camera.zoom, 2);
});

test("AnimationClip applyTo layers clips onto an existing timeline", () => {
  const clip = new AnimationClip();
  clip.setKeyframe("a", "value", 0, 0, "linear");
  clip.setKeyframe("a", "value", 1, 10, "linear");
  const target = { value: 0 };
  const timeline = new Timeline();
  clip.applyTo(timeline, () => target, { offset: 1 });
  timeline.seek(1.5);
  assert.equal(target.value, 5);
});

test("AnimationClip removeKeyframe and clear prune tracks", () => {
  const clip = new AnimationClip();
  clip.setKeyframe("a", "value", 0, 0);
  clip.setKeyframe("a", "value", 1, 1);
  clip.removeKeyframe("a", "value", 1);
  assert.equal(clip.duration, 0);
  clip.clear();
  assert.equal(clip.isEmpty, true);
});
