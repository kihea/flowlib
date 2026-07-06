import { EPSILON } from "./vec2.js";

export class Vec3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  static from(value) {
    if (value instanceof Vec3) return value.clone();
    if (Array.isArray(value)) return new Vec3(value[0] || 0, value[1] || 0, value[2] || 0);
    if (value && typeof value === "object") return new Vec3(value.x || 0, value.y || 0, value.z || 0);
    return new Vec3(Number(value) || 0, Number(value) || 0, Number(value) || 0);
  }

  static add(a, b) {
    return Vec3.from(a).add(b);
  }

  static sub(a, b) {
    return Vec3.from(a).sub(b);
  }

  static cross(a, b) {
    return Vec3.from(a).cross(b);
  }

  static distance(a, b) {
    return Vec3.from(a).distance(b);
  }

  set(x, y = x, z = y) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(value) {
    const next = Vec3.from(value);
    this.x = next.x;
    this.y = next.y;
    this.z = next.z;
    return this;
  }

  clone() {
    return new Vec3(this.x, this.y, this.z);
  }

  add(value) {
    const next = Vec3.from(value);
    this.x += next.x;
    this.y += next.y;
    this.z += next.z;
    return this;
  }

  sub(value) {
    const next = Vec3.from(value);
    this.x -= next.x;
    this.y -= next.y;
    this.z -= next.z;
    return this;
  }

  scale(value) {
    this.x *= value;
    this.y *= value;
    this.z *= value;
    return this;
  }

  length() {
    return Math.hypot(this.x, this.y, this.z);
  }

  lengthSquared() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  normalize() {
    const length = this.length();
    if (length < EPSILON) return this;
    return this.scale(1 / length);
  }

  distance(value) {
    const next = Vec3.from(value);
    return Math.hypot(this.x - next.x, this.y - next.y, this.z - next.z);
  }

  dot(value) {
    const next = Vec3.from(value);
    return this.x * next.x + this.y * next.y + this.z * next.z;
  }

  cross(value) {
    const next = Vec3.from(value);
    const x = this.y * next.z - this.z * next.y;
    const y = this.z * next.x - this.x * next.z;
    const z = this.x * next.y - this.y * next.x;
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  toArray() {
    return [this.x, this.y, this.z];
  }

  toJSON() {
    return { x: this.x, y: this.y, z: this.z };
  }
}
