import { resolveEase } from "./easing.js";
import { interpolateValue } from "./interpolate.js";
import { Timeline } from "./timeline.js";
import { Tween } from "./tween.js";

const TIME_EPSILON = 1e-4;

export class KeyframeTrack {
  constructor(options = {}) {
    this.targetId = options.targetId;
    this.property = options.property;
    this.keyframes = [];
    for (const keyframe of options.keyframes || []) {
      this.setKeyframe(keyframe.time, keyframe.value, keyframe.ease);
    }
  }

  setKeyframe(time, value, ease = null) {
    const existing = this.keyframes.find((keyframe) => Math.abs(keyframe.time - time) < TIME_EPSILON);
    if (existing) {
      existing.value = value;
      existing.ease = ease;
    } else {
      this.keyframes.push({ time, value, ease });
      this.keyframes.sort((a, b) => a.time - b.time);
    }
    return this;
  }

  removeKeyframe(time) {
    const index = this.keyframes.findIndex((keyframe) => Math.abs(keyframe.time - time) < TIME_EPSILON);
    if (index >= 0) this.keyframes.splice(index, 1);
    return this;
  }

  get duration() {
    return this.keyframes.length > 0 ? this.keyframes[this.keyframes.length - 1].time : 0;
  }

  sample(time) {
    const frames = this.keyframes;
    if (frames.length === 0) return undefined;
    if (time <= frames[0].time) return frames[0].value;
    const last = frames[frames.length - 1];
    if (time >= last.time) return last.value;
    for (let index = 1; index < frames.length; index += 1) {
      const next = frames[index];
      if (time > next.time) continue;
      const previous = frames[index - 1];
      const span = Math.max(TIME_EPSILON, next.time - previous.time);
      const eased = resolveEase(next.ease)((time - previous.time) / span);
      return interpolateValue(previous.value, next.value, eased);
    }
    return last.value;
  }

  toJSON() {
    return {
      targetId: this.targetId,
      property: this.property,
      keyframes: this.keyframes.map((keyframe) => ({ ...keyframe }))
    };
  }

  static fromJSON(data) {
    return new KeyframeTrack(data);
  }
}

export class AnimationClip {
  constructor(options = {}) {
    this.name = options.name || "clip";
    this.tracks = (options.tracks || []).map((track) =>
      track instanceof KeyframeTrack ? track : KeyframeTrack.fromJSON(track)
    );
  }

  track(targetId, property) {
    let track = this.tracks.find((entry) => entry.targetId === targetId && entry.property === property);
    if (!track) {
      track = new KeyframeTrack({ targetId, property });
      this.tracks.push(track);
    }
    return track;
  }

  setKeyframe(targetId, property, time, value, ease = null) {
    this.track(targetId, property).setKeyframe(time, value, ease);
    return this;
  }

  removeKeyframe(targetId, property, time) {
    const track = this.tracks.find((entry) => entry.targetId === targetId && entry.property === property);
    if (!track) return this;
    track.removeKeyframe(time);
    if (track.keyframes.length === 0) {
      this.tracks.splice(this.tracks.indexOf(track), 1);
    }
    return this;
  }

  clear() {
    this.tracks = [];
    return this;
  }

  get duration() {
    return this.tracks.reduce((max, track) => Math.max(max, track.duration), 0);
  }

  get isEmpty() {
    return this.tracks.every((track) => track.keyframes.length === 0);
  }

  sample(time, resolveTarget) {
    for (const track of this.tracks) {
      const target = resolveTarget(track.targetId, track);
      if (!target) continue;
      const value = track.sample(time);
      if (value !== undefined) {
        new Tween(target, track.property, value, { duration: TIME_EPSILON, from: value }).seek(TIME_EPSILON);
      }
    }
    return this;
  }

  applyTo(timeline, resolveTarget, options = {}) {
    const offset = options.offset || 0;
    const tag = options.tag;
    for (const track of this.tracks) {
      const target = resolveTarget(track.targetId, track);
      if (!target) continue;
      const frames = track.keyframes;
      for (let index = 0; index < frames.length; index += 1) {
        const frame = frames[index];
        const previous = frames[index - 1];
        const from = previous ? previous.value : frame.value;
        const start = previous ? previous.time : Math.max(0, frame.time - TIME_EPSILON);
        const duration = previous ? Math.max(TIME_EPSILON, frame.time - previous.time) : TIME_EPSILON;
        const tween = new Tween(target, track.property, frame.value, {
          from,
          duration,
          ease: frame.ease
        });
        if (tag) tween.data = { source: tag };
        timeline.add(tween, offset + start);
      }
    }
    return timeline;
  }

  buildTimeline(resolveTarget, options = {}) {
    const timeline = new Timeline(options);
    return this.applyTo(timeline, resolveTarget, options);
  }

  toJSON() {
    return {
      type: "flowlib.animation-clip",
      version: 1,
      name: this.name,
      duration: this.duration,
      tracks: this.tracks.map((track) => track.toJSON())
    };
  }

  static fromJSON(data = {}) {
    return new AnimationClip(data);
  }
}
