import { Vec2 } from "./vec2.js";

export class Mat3 {
  constructor(values) {
    this.values = values ? Array.from(values) : [1, 0, 0, 0, 1, 0, 0, 0, 1];
  }

  static identity() {
    return new Mat3();
  }

  static translation(x = 0, y = 0) {
    return new Mat3([1, 0, x, 0, 1, y, 0, 0, 1]);
  }

  static rotation(radians = 0) {
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    return new Mat3([c, -s, 0, s, c, 0, 0, 0, 1]);
  }

  static scaling(x = 1, y = x) {
    return new Mat3([x, 0, 0, 0, y, 0, 0, 0, 1]);
  }

  static multiply(a, b) {
    const av = a.values || a;
    const bv = b.values || b;
    return new Mat3([
      av[0] * bv[0] + av[1] * bv[3] + av[2] * bv[6],
      av[0] * bv[1] + av[1] * bv[4] + av[2] * bv[7],
      av[0] * bv[2] + av[1] * bv[5] + av[2] * bv[8],
      av[3] * bv[0] + av[4] * bv[3] + av[5] * bv[6],
      av[3] * bv[1] + av[4] * bv[4] + av[5] * bv[7],
      av[3] * bv[2] + av[4] * bv[5] + av[5] * bv[8],
      av[6] * bv[0] + av[7] * bv[3] + av[8] * bv[6],
      av[6] * bv[1] + av[7] * bv[4] + av[8] * bv[7],
      av[6] * bv[2] + av[7] * bv[5] + av[8] * bv[8]
    ]);
  }

  clone() {
    return new Mat3(this.values);
  }

  multiply(other) {
    this.values = Mat3.multiply(this, other).values;
    return this;
  }

  translated(x = 0, y = 0) {
    return this.multiply(Mat3.translation(x, y));
  }

  rotated(radians = 0) {
    return this.multiply(Mat3.rotation(radians));
  }

  scaled(x = 1, y = x) {
    return this.multiply(Mat3.scaling(x, y));
  }

  apply(point) {
    const next = Vec2.from(point);
    const m = this.values;
    return new Vec2(
      m[0] * next.x + m[1] * next.y + m[2],
      m[3] * next.x + m[4] * next.y + m[5]
    );
  }

  toCanvasTransform() {
    const m = this.values;
    return [m[0], m[3], m[1], m[4], m[2], m[5]];
  }
}
