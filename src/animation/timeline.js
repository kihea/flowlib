import { EventEmitter } from "../core/events.js";
import { setPath } from "./interpolate.js";
import { Tween } from "./tween.js";

export class Timeline extends EventEmitter {
  constructor(options = {}) {
    super();
    this.time = options.time || 0;
    this.duration = 0;
    this.playing = options.autoplay || false;
    this.loop = options.loop || false;
    this.repeat = options.repeat ?? 0;
    this.yoyo = options.yoyo || false;
    this.rate = options.rate || 1;
    this.direction = 1;
    this.iteration = 0;
    this.tracks = [];
    this.callbacks = [];
    this.labels = new Map();
    this.lastStart = 0;
    this.lastEnd = 0;
  }

  resolvePosition(position, fallback = this.duration) {
    if (position == null) return fallback;
    if (typeof position === "number") return position;
    if (typeof position === "string") {
      if (position.startsWith("+=")) return this.duration + Number(position.slice(2));
      if (position.startsWith("-=")) return Math.max(0, this.duration - Number(position.slice(2)));
      if (position === "<") return this.lastStart;
      if (position === ">") return this.lastEnd;
      if (this.labels.has(position)) return this.labels.get(position);
      const numeric = Number(position);
      if (!Number.isNaN(numeric)) return numeric;
      throw new Error(`Unknown timeline position "${position}".`);
    }
    return fallback;
  }

  addLabel(name, position = null) {
    this.labels.set(name, this.resolvePosition(position, this.time));
    return this;
  }

  labelTime(name) {
    return this.labels.get(name);
  }

  add(tween, at = null) {
    if (!(tween instanceof Tween) && typeof tween?.seek !== "function") {
      throw new TypeError("Timeline.add expects a tween-like object.");
    }
    const position = at == null ? null : this.resolvePosition(at);
    if (position != null) {
      tween.startTime = position;
      tween.endTime = tween.startTime + tween.delay + tween.duration;
    }
    this.tracks.push(tween);
    this.#order = null;
    this.duration = Math.max(this.duration, tween.endTime);
    this.lastStart = tween.startTime;
    this.lastEnd = tween.endTime;
    return tween;
  }

  to(target, properties, options = {}) {
    const at = this.resolvePosition(options.at);
    const tweens = [];
    for (const [property, to] of Object.entries(properties)) {
      tweens.push(this.add(new Tween(target, property, to, options), at));
    }
    if (tweens.length > 1) {
      this.lastStart = tweens[0].startTime;
      this.lastEnd = Math.max(...tweens.map((tween) => tween.endTime));
    }
    return tweens.length === 1 ? tweens[0] : tweens;
  }

  fromTo(target, fromProperties, toProperties, options = {}) {
    const at = this.resolvePosition(options.at);
    const tweens = [];
    for (const [property, to] of Object.entries(toProperties)) {
      const from = fromProperties[property];
      if (from !== undefined) setPath(target, property, from);
      tweens.push(this.add(new Tween(target, property, to, { ...options, from }), at));
    }
    return tweens.length === 1 ? tweens[0] : tweens;
  }

  stagger(targets, properties, options = {}) {
    const list = [...targets];
    const each = options.each ?? 0.1;
    const at = this.resolvePosition(options.at);
    const offsets = staggerOffsets(list.length, options.from ?? "start");
    const tweens = [];
    list.forEach((target, index) => {
      const resolved = typeof properties === "function" ? properties(target, index) : properties;
      tweens.push(this.to(target, resolved, { ...options, at: at + offsets[index] * each }));
    });
    return tweens;
  }

  sequence(items, options = {}) {
    let cursor = this.resolvePosition(options.at);
    for (const item of items) {
      const duration = item.options?.duration ?? options.duration ?? 1;
      this.add(new Tween(item.target, item.property, item.to, { ...options, ...item.options }), cursor);
      cursor += duration + (item.options?.delay || 0);
    }
    this.duration = Math.max(this.duration, cursor);
    return this;
  }

  call(callback, at = null) {
    const time = this.resolvePosition(at);
    this.callbacks.push({ time, callback, fired: this.time > time });
    this.duration = Math.max(this.duration, time);
    return this;
  }

  get progress() {
    return this.duration > 0 ? Math.min(1, this.time / this.duration) : 0;
  }

  set progress(value) {
    this.seek(Math.max(0, Math.min(1, value)) * this.duration);
  }

  timeScale(value) {
    if (value === undefined) return this.rate;
    this.rate = value;
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

  stop() {
    this.pause();
    this.reset();
    return this.seek(0);
  }

  reverse() {
    this.direction *= -1;
    return this;
  }

  seek(time) {
    this.time = Math.max(0, time);
    // Apply tweens in chronological order so a seek fully reconstructs state:
    // tweens whose window is in the past land on their end values, the active
    // tween interpolates, and tweens whose window hasn't been reached rewind
    // their target to the pre-animation value (earliest tween per property
    // wins the rewind — later ones captured mid-animation values).
    const touched = new Map();
    const wasTouched = (tween) => touched.get(tween.target)?.has(tween.property);
    const touch = (tween) => {
      if (tween.target === undefined || tween.property === undefined) return;
      let props = touched.get(tween.target);
      if (!props) touched.set(tween.target, (props = new Set()));
      props.add(tween.property);
    };
    for (const tween of this.#chronological()) {
      const begins = (tween.startTime || 0) + (tween.delay || 0);
      if (this.time < begins && typeof tween.rewind === "function") {
        if (!wasTouched(tween) && tween.rewind()) touch(tween);
        continue;
      }
      tween.seek(this.time);
      touch(tween);
    }
    for (const entry of this.callbacks) {
      if (!entry.fired && this.time >= entry.time - 1e-9) {
        entry.fired = true;
        entry.callback(this);
      }
    }
    this.emit("seek", { time: this.time });
    return this;
  }

  step(dt) {
    if (!this.playing) return this;
    const next = this.time + dt * this.rate * this.direction;
    if (this.direction >= 0) {
      if (next > this.duration && this.duration > 0) {
        if (this.#canRepeat()) {
          this.#wrap();
          if (this.yoyo) {
            this.direction = -1;
            return this.seek(Math.max(0, 2 * this.duration - next));
          }
          this.#rearm();
          return this.seek(next % this.duration);
        }
        this.seek(this.duration);
        this.#complete();
        return this;
      }
      this.seek(Math.min(next, this.duration));
      if (this.time >= this.duration && this.playing && !this.#canRepeat() && this.duration > 0) {
        this.#complete();
      }
      return this;
    }
    if (next < 0) {
      if (this.#canRepeat()) {
        this.#wrap();
        if (this.yoyo) {
          this.direction = 1;
          return this.seek(-next);
        }
        return this.seek(Math.max(0, this.duration + next));
      }
      this.seek(0);
      this.#complete();
      return this;
    }
    return this.seek(next);
  }

  reset() {
    this.time = 0;
    this.direction = 1;
    this.iteration = 0;
    this.#rearm();
    return this;
  }

  #order = null;

  #chronological() {
    if (!this.#order) {
      this.#order = [...this.tracks].sort(
        (a, b) => ((a.startTime || 0) + (a.delay || 0)) - ((b.startTime || 0) + (b.delay || 0))
      );
    }
    return this.#order;
  }

  #rearm() {
    for (const tween of this.tracks) {
      tween.reset();
    }
    for (const entry of this.callbacks) {
      entry.fired = false;
    }
  }

  #canRepeat() {
    return this.loop || this.iteration < this.repeat;
  }

  #wrap() {
    this.iteration += 1;
    this.emit("loop", { iteration: this.iteration });
  }

  #complete() {
    if (!this.playing) return;
    this.playing = false;
    this.emit("complete");
  }
}

function staggerOffsets(count, from) {
  const offsets = [];
  for (let index = 0; index < count; index += 1) {
    if (from === "end") offsets.push(count - 1 - index);
    else if (from === "center") offsets.push(Math.abs(index - (count - 1) / 2));
    else if (typeof from === "number") offsets.push(Math.abs(index - from));
    else offsets.push(index);
  }
  return offsets;
}
