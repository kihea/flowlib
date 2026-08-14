import { clamp } from "../core/vec2.js";
import { resolveEase } from "./easing.js";
import { getPath, interpolateValue, setPath } from "./interpolate.js";

export class Tween {
  constructor(target, property, to, options = {}) {
    this.target = target;
    this.property = property;
    this.to = to;
    this.from = options.from;
    this.duration = Math.max(0.0001, options.duration ?? 1);
    this.delay = options.delay || 0;
    this.ease = resolveEase(options.ease);
    this.startTime = options.startTime || 0;
    this.endTime = this.startTime + this.delay + this.duration;
    this.started = false;
    this.finished = false;
    this.onStart = options.onStart || null;
    this.onUpdate = options.onUpdate || null;
    this.onComplete = options.onComplete || null;
  }

  seek(time) {
    const localTime = time - this.startTime - this.delay;
    if (localTime < 0) return false;

    if (!this.started) {
      this.started = true;
      if (this.from === undefined) {
        this.from = cloneTweenValue(getPath(this.target, this.property));
      }
      this.onStart?.(this);
    }

    const progress = clamp(localTime / this.duration, 0, 1);
    const eased = this.ease(progress);
    const value = interpolateValue(this.from, this.to, eased);
    setPath(this.target, this.property, value);
    this.onUpdate?.(this, progress, value);

    if (progress >= 1 && !this.finished) {
      this.finished = true;
      this.onComplete?.(this);
    }

    return true;
  }

  // Restore the target to this tween's captured pre-animation value. Used by
  // Timeline.seek when scrubbing to a time before this tween's window, so
  // backward seeks don't leave targets stuck at later values.
  rewind() {
    if (!this.started || this.from === undefined) return false;
    setPath(this.target, this.property, cloneTweenValue(this.from));
    this.finished = false;
    return true;
  }

  reset() {
    this.started = false;
    this.finished = false;
    return this;
  }
}

function cloneTweenValue(value) {
  if (value && typeof value.clone === "function") return value.clone();
  if (Array.isArray(value)) return value.map(cloneTweenValue);
  if (value && typeof value === "object") return { ...value };
  return value;
}
