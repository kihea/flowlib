import { Vec2 } from "../core/vec2.js";

export class BezierCurve {
  constructor(points = []) {
    if (points.length < 2) {
      throw new Error("BezierCurve requires at least two control points.");
    }
    this.points = points.map((point) => Vec2.from(point));
  }

  pointAt(t) {
    return deCasteljau(this.points, t);
  }

  tangentAt(t) {
    const epsilon = 0.001;
    const a = this.pointAt(Math.max(0, t - epsilon));
    const b = this.pointAt(Math.min(1, t + epsilon));
    return b.sub(a).normalize();
  }

  sample(count = 32) {
    const points = [];
    for (let index = 0; index <= count; index += 1) {
      points.push(this.pointAt(index / count));
    }
    return points;
  }

  split(t = 0.5) {
    const left = [];
    const right = [];
    let row = this.points.map((point) => point.clone());
    left.push(row[0].clone());
    right.push(row.at(-1).clone());
    while (row.length > 1) {
      const next = [];
      for (let index = 0; index < row.length - 1; index += 1) {
        next.push(lerpPoint(row[index], row[index + 1], t));
      }
      row = next;
      left.push(row[0].clone());
      right.push(row.at(-1).clone());
    }
    return [new BezierCurve(left), new BezierCurve(right.reverse())];
  }
}

export function quadraticBezier(p0, p1, p2) {
  return new BezierCurve([p0, p1, p2]);
}

export function cubicBezier(p0, p1, p2, p3) {
  return new BezierCurve([p0, p1, p2, p3]);
}

export function bezierThrough(points, samples = 32) {
  return new BezierCurve(points).sample(samples);
}

function deCasteljau(points, t) {
  let row = points.map((point) => point.clone());
  while (row.length > 1) {
    row = row.slice(0, -1).map((point, index) => lerpPoint(point, row[index + 1], t));
  }
  return row[0];
}

function lerpPoint(a, b, t) {
  return new Vec2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
}
