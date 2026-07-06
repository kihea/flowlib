import { Bounds } from "../core/bounds.js";
import { EventEmitter } from "../core/events.js";
import { createId } from "../core/id.js";
import { Mat3 } from "../core/mat3.js";
import { Vec2 } from "../core/vec2.js";

export class SceneNode extends EventEmitter {
  constructor(options = {}) {
    super();
    this.id = options.id || createId(options.kind || "node");
    this.kind = options.kind || "node";
    this.name = options.name || "";
    this.position = Vec2.from(options.position || { x: options.x || 0, y: options.y || 0 });
    this.scale = Vec2.from(options.scale || { x: 1, y: 1 });
    this.rotation = options.rotation || 0;
    this.opacity = options.opacity ?? 1;
    this.visible = options.visible ?? true;
    this.style = { ...options.style };
    this.data = { ...options.data };
    this.parent = null;
    this.children = [];
    this.updaters = new Set();
  }

  add(...nodes) {
    for (const node of nodes) {
      if (!node) continue;
      if (node.parent) node.parent.remove(node);
      node.parent = this;
      this.children.push(node);
      this.emit("child:add", { child: node });
    }
    return this;
  }

  remove(node) {
    const index = this.children.indexOf(node);
    if (index < 0) return false;
    this.children.splice(index, 1);
    node.parent = null;
    this.emit("child:remove", { child: node });
    return true;
  }

  clear() {
    for (const child of this.children) {
      child.parent = null;
    }
    this.children.length = 0;
    return this;
  }

  update(dt, clock) {
    for (const updater of [...this.updaters]) {
      updater(this, dt, clock);
    }
    for (const child of this.children) {
      child.update(dt, clock);
    }
    return this;
  }

  addUpdater(updater) {
    this.updaters.add(updater);
    return () => this.updaters.delete(updater);
  }

  traverse(visitor, parentMatrix = Mat3.identity(), parentOpacity = 1) {
    if (!this.visible) return;
    const matrix = Mat3.multiply(parentMatrix, this.localMatrix());
    const opacity = parentOpacity * this.opacity;
    visitor(this, matrix, opacity);
    for (const child of this.children) {
      child.traverse(visitor, matrix, opacity);
    }
  }

  localMatrix() {
    return Mat3.identity()
      .translated(this.position.x, this.position.y)
      .rotated(this.rotation)
      .scaled(this.scale.x, this.scale.y);
  }

  getWorldMatrix() {
    const lineage = [];
    let node = this;
    while (node) {
      lineage.push(node);
      node = node.parent;
    }
    let matrix = Mat3.identity();
    for (let index = lineage.length - 1; index >= 0; index -= 1) {
      matrix = Mat3.multiply(matrix, lineage[index].localMatrix());
    }
    return matrix;
  }

  getLocalBounds() {
    return new Bounds();
  }

  getWorldBounds() {
    const bounds = Bounds.empty();
    const parentMatrix = this.parent ? this.parent.getWorldMatrix() : Mat3.identity();
    this.traverse((node, matrix) => {
      const local = node.getLocalBounds();
      bounds.union(Bounds.fromPoints([
        matrix.apply({ x: local.minX, y: local.minY }),
        matrix.apply({ x: local.maxX, y: local.minY }),
        matrix.apply({ x: local.maxX, y: local.maxY }),
        matrix.apply({ x: local.minX, y: local.maxY })
      ]));
    }, parentMatrix);
    return bounds.normalize();
  }
}
