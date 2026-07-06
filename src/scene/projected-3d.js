import { Vec3 } from "../core/vec3.js";
import { PathNode, PolygonNode } from "./shapes.js";

export class ProjectedPath3DNode extends PathNode {
  constructor(options = {}) {
    super({
      ...options,
      points: [],
      style: {
        fill: "transparent",
        stroke: "#2563eb",
        strokeWidth: 2,
        ...options.style
      }
    });
    this.kind = options.kind || "path";
    this.camera3D = options.camera3D || options.camera || null;
    this.project = options.project || null;
    this.source3D = options.source || options.points3D || options.points || [];
    this.points3D = [];
    this.refreshProjection();
  }

  setCamera(camera3D) {
    this.camera3D = camera3D;
    return this.refreshProjection();
  }

  setPoints3D(points) {
    this.source3D = points || [];
    return this.refreshProjection();
  }

  resolvePoints3D(dt, clock) {
    const source = typeof this.source3D === "function" ? this.source3D(this, dt, clock) : this.source3D;
    this.points3D = [...(source || [])].map((point) => Vec3.from(point));
    return this.points3D;
  }

  refreshProjection(dt = 0, clock = null) {
    const project = this.project || ((point) => this.camera3D ? this.camera3D.project(point) : point);
    this.points = this.resolvePoints3D(dt, clock).map((point) => project(point));
    return this;
  }

  update(dt, clock) {
    this.refreshProjection(dt, clock);
    return super.update(dt, clock);
  }
}

export class ProjectedPolygon3DNode extends PolygonNode {
  constructor(options = {}) {
    super({
      ...options,
      points: [],
      closed: options.closed ?? true,
      style: {
        fill: "rgba(37, 99, 235, 0.18)",
        stroke: "#2563eb",
        strokeWidth: 1,
        ...options.style
      }
    });
    this.kind = options.kind || "polygon";
    this.camera3D = options.camera3D || options.camera || null;
    this.project = options.project || null;
    this.source3D = options.source || options.points3D || options.points || [];
    this.points3D = [];
    this.refreshProjection();
  }

  setCamera(camera3D) {
    this.camera3D = camera3D;
    return this.refreshProjection();
  }

  setPoints3D(points) {
    this.source3D = points || [];
    return this.refreshProjection();
  }

  resolvePoints3D(dt, clock) {
    const source = typeof this.source3D === "function" ? this.source3D(this, dt, clock) : this.source3D;
    this.points3D = [...(source || [])].map((point) => Vec3.from(point));
    return this.points3D;
  }

  refreshProjection(dt = 0, clock = null) {
    const project = this.project || ((point) => this.camera3D ? this.camera3D.project(point) : point);
    this.points = this.resolvePoints3D(dt, clock).map((point) => project(point));
    return this;
  }

  update(dt, clock) {
    this.refreshProjection(dt, clock);
    return super.update(dt, clock);
  }
}
