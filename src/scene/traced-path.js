import { Vec2 } from "../core/vec2.js";
import { PathNode } from "./shapes.js";

export class TracedPathNode extends PathNode {
  constructor(sampler, options = {}) {
    super({
      ...options,
      kind: options.kind || "path",
      points: options.points || [],
      style: {
        fill: "transparent",
        stroke: "#2563eb",
        strokeWidth: 2,
        ...options.style
      }
    });
    this.sampler = sampler;
    this.minDistance = options.minDistance ?? 1;
    this.maxPoints = options.maxPoints ?? 2000;
  }

  clearTrace() {
    this.points.length = 0;
    return this;
  }

  addPoint(point) {
    const next = Vec2.from(point);
    const last = this.points[this.points.length - 1];
    if (!last || last.distance(next) >= this.minDistance) {
      this.points.push(next);
      if (this.points.length > this.maxPoints) {
        this.points.splice(0, this.points.length - this.maxPoints);
      }
    }
    return this;
  }

  update(dt, clock) {
    if (typeof this.sampler === "function") {
      const point = this.sampler(this, dt, clock);
      if (point) this.addPoint(point);
    }
    return super.update(dt, clock);
  }
}
