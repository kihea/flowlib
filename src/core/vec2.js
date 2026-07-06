export const EPSILON = 1e-9;

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function inverseLerp(a, b, value) {
  if (Math.abs(b - a) < EPSILON) return 0;
  return (value - a) / (b - a);
}

export function nearlyEqual(a, b, epsilon = EPSILON) {
  return Math.abs(a - b) <= epsilon;
}

export class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  static from(value) {
    if (value instanceof Vec2) return value.clone();
    if (Array.isArray(value)) return new Vec2(value[0] || 0, value[1] || 0);
    if (value && typeof value === "object") return new Vec2(value.x || 0, value.y || 0);
    return new Vec2(Number(value) || 0, Number(value) || 0);
  }

  static add(a, b) {
    return Vec2.from(a).add(b);
  }

  static sub(a, b) {
    return Vec2.from(a).sub(b);
  }

  static distance(a, b) {
    return Vec2.from(a).distance(b);
  }

  set(x, y = x) {
    this.x = x;
    this.y = y;
    return this;
  }

  copy(value) {
    const next = Vec2.from(value);
    this.x = next.x;
    this.y = next.y;
    return this;
  }

  clone() {
    return new Vec2(this.x, this.y);
  }

  add(value) {
    const next = Vec2.from(value);
    this.x += next.x;
    this.y += next.y;
    return this;
  }

  sub(value) {
    const next = Vec2.from(value);
    this.x -= next.x;
    this.y -= next.y;
    return this;
  }

  scale(value) {
    this.x *= value;
    this.y *= value;
    return this;
  }

  multiply(value) {
    const next = Vec2.from(value);
    this.x *= next.x;
    this.y *= next.y;
    return this;
  }

  length() {
    return Math.hypot(this.x, this.y);
  }

  lengthSquared() {
    return this.x * this.x + this.y * this.y;
  }

  normalize() {
    const length = this.length();
    if (length < EPSILON) return this;
    return this.scale(1 / length);
  }

  distance(value) {
    const next = Vec2.from(value);
    return Math.hypot(this.x - next.x, this.y - next.y);
  }

  dot(value) {
    const next = Vec2.from(value);
    return this.x * next.x + this.y * next.y;
  }

  perp() {
    const x = this.x;
    this.x = -this.y;
    this.y = x;
    return this;
  }

  toArray() {
    return [this.x, this.y];
  }

  toJSON() {
    return { x: this.x, y: this.y };
  }
}
