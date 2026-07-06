import { Vec2 } from "./vec2.js";

export class Bounds {
  constructor(x = 0, y = 0, width = 0, height = 0) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  static empty() {
    return new Bounds(Infinity, Infinity, -Infinity, -Infinity);
  }

  static fromPoints(points) {
    const bounds = Bounds.empty();
    for (const point of points) {
      bounds.include(point);
    }
    return bounds.normalize();
  }

  get minX() {
    return this.x;
  }

  get minY() {
    return this.y;
  }

  get maxX() {
    return this.x + this.width;
  }

  get maxY() {
    return this.y + this.height;
  }

  get center() {
    return new Vec2(this.x + this.width / 2, this.y + this.height / 2);
  }

  clone() {
    return new Bounds(this.x, this.y, this.width, this.height);
  }

  include(point) {
    const next = Vec2.from(point);
    if (!Number.isFinite(this.x) || !Number.isFinite(this.y) || !Number.isFinite(this.width) || !Number.isFinite(this.height)) {
      this.x = next.x;
      this.y = next.y;
      this.width = 0;
      this.height = 0;
      return this;
    }
    const minX = Math.min(this.minX, next.x);
    const minY = Math.min(this.minY, next.y);
    const maxX = Math.max(this.maxX, next.x);
    const maxY = Math.max(this.maxY, next.y);
    this.x = minX;
    this.y = minY;
    this.width = maxX - minX;
    this.height = maxY - minY;
    return this;
  }

  union(other) {
    if (!other || !Number.isFinite(other.x) || !Number.isFinite(other.y)) {
      return this;
    }
    this.include({ x: other.minX, y: other.minY });
    this.include({ x: other.maxX, y: other.maxY });
    return this;
  }

  pad(value) {
    this.x -= value;
    this.y -= value;
    this.width += value * 2;
    this.height += value * 2;
    return this;
  }

  contains(point) {
    const next = Vec2.from(point);
    return next.x >= this.minX && next.x <= this.maxX && next.y >= this.minY && next.y <= this.maxY;
  }

  normalize() {
    if (!Number.isFinite(this.x) || !Number.isFinite(this.y)) {
      this.x = 0;
      this.y = 0;
      this.width = 0;
      this.height = 0;
      return this;
    }
    if (this.width < 0) this.width = 0;
    if (this.height < 0) this.height = 0;
    return this;
  }

  toJSON() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }
}
