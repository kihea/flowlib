import { Vec2, clamp } from "../core/vec2.js";
import { resolveEase } from "./easing.js";

export class PointPathTween {
  constructor(target, points, options = {}) {
    this.target = target;
    this.points = points.map((point) => Vec2.from(point));
    this.duration = Math.max(0.0001, options.duration ?? 1);
    this.delay = options.delay || 0;
    this.ease = resolveEase(options.ease);
    this.startTime = options.startTime || 0;
    this.endTime = this.startTime + this.delay + this.duration;
    this.started = false;
    this.finished = false;
    this.lengths = segmentLengths(this.points);
    this.totalLength = this.lengths.reduce((sum, value) => sum + value, 0);
    this.onStart = options.onStart || null;
    this.onUpdate = options.onUpdate || null;
    this.onComplete = options.onComplete || null;
  }

  seek(time) {
    const localTime = time - this.startTime - this.delay;
    if (localTime < 0 || this.points.length === 0) return false;
    if (!this.started) {
      this.started = true;
      this.onStart?.(this);
    }
    const progress = clamp(localTime / this.duration, 0, 1);
    const value = pointAt(this.points, this.lengths, this.totalLength, this.ease(progress));
    this.target.position.copy(value);
    this.onUpdate?.(this, progress, value);
    if (progress >= 1 && !this.finished) {
      this.finished = true;
      this.onComplete?.(this);
    }
    return true;
  }

  reset() {
    this.started = false;
    this.finished = false;
    return this;
  }
}

function segmentLengths(points) {
  const lengths = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    lengths.push(points[index].distance(points[index + 1]));
  }
  return lengths;
}

function pointAt(points, lengths, totalLength, alpha) {
  if (points.length === 1 || totalLength === 0) return points[0].clone();
  let distance = totalLength * alpha;
  for (let index = 0; index < lengths.length; index += 1) {
    const length = lengths[index];
    if (distance <= length || index === lengths.length - 1) {
      const t = length === 0 ? 0 : distance / length;
      return new Vec2(
        points[index].x + (points[index + 1].x - points[index].x) * t,
        points[index].y + (points[index + 1].y - points[index].y) * t
      );
    }
    distance -= length;
  }
  return points.at(-1).clone();
}
