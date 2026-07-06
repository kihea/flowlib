import { EventEmitter } from "../core/events.js";
import { Tween } from "./tween.js";

export class Timeline extends EventEmitter {
  constructor(options = {}) {
    super();
    this.time = options.time || 0;
    this.duration = 0;
    this.playing = options.autoplay || false;
    this.loop = options.loop || false;
    this.rate = options.rate || 1;
    this.tracks = [];
  }

  add(tween, at = null) {
    if (!(tween instanceof Tween) && typeof tween?.seek !== "function") {
      throw new TypeError("Timeline.add expects a tween-like object.");
    }
    if (at != null) {
      tween.startTime = at;
      tween.endTime = tween.startTime + tween.delay + tween.duration;
    }
    this.tracks.push(tween);
    this.duration = Math.max(this.duration, tween.endTime);
    return tween;
  }

  to(target, properties, options = {}) {
    const at = options.at ?? this.duration;
    const tweens = [];
    for (const [property, to] of Object.entries(properties)) {
      tweens.push(this.add(new Tween(target, property, to, options), at));
    }
    return tweens.length === 1 ? tweens[0] : tweens;
  }

  sequence(items, options = {}) {
    let cursor = options.at ?? this.duration;
    for (const item of items) {
      const duration = item.options?.duration ?? options.duration ?? 1;
      this.add(new Tween(item.target, item.property, item.to, { ...options, ...item.options }), cursor);
      cursor += duration + (item.options?.delay || 0);
    }
    this.duration = Math.max(this.duration, cursor);
    return this;
  }

  play() {
    this.playing = true;
    this.emit("play");
    return this;
  }

  pause() {
    this.playing = false;
    this.emit("pause");
    return this;
  }

  seek(time) {
    this.time = Math.max(0, time);
    for (const tween of this.tracks) {
      tween.seek(this.time);
    }
    this.emit("seek", { time: this.time });
    return this;
  }

  step(dt) {
    if (!this.playing) return this;
    const next = this.time + dt * this.rate;
    if (next > this.duration && this.loop && this.duration > 0) {
      this.reset();
      return this.seek(next % this.duration);
    }
    this.seek(Math.min(next, this.duration));
    if (this.time >= this.duration && this.playing && !this.loop) {
      this.playing = false;
      this.emit("complete");
    }
    return this;
  }

  reset() {
    this.time = 0;
    for (const tween of this.tracks) {
      tween.reset();
    }
    return this;
  }
}
