import { Vec2, clamp } from "../../core/vec2.js";

export class ForceLayout {
  constructor(options = {}) {
    this.iterations = options.iterations ?? 240;
    this.repulsion = options.repulsion ?? 22000;
    this.linkDistance = options.linkDistance ?? 180;
    this.linkStrength = options.linkStrength ?? 0.08;
    this.centerStrength = options.centerStrength ?? 0.015;
    this.damping = options.damping ?? 0.82;
    this.origin = Vec2.from(options.origin || { x: 0, y: 0 });
  }

  apply(model) {
    const state = new Map();
    let index = 0;
    for (const node of model.nodes.values()) {
      const angle = index * Math.PI * (3 - Math.sqrt(5));
      const fallback = new Vec2(Math.cos(angle), Math.sin(angle)).scale(80 + index * 8);
      state.set(node.id, {
        node,
        velocity: new Vec2(),
        force: new Vec2(),
        position: node.position.lengthSquared() > 0 ? node.position.clone() : fallback
      });
      index += 1;
    }

    for (let i = 0; i < this.iterations; i += 1) {
      this.step(model, state);
    }

    for (const item of state.values()) {
      if (!item.node.locked) {
        item.node.position.copy(item.position);
      }
    }
    model.emit("layout", { layout: this, positions: [...model.nodes.values()] });
    return model;
  }

  step(model, state) {
    const items = [...state.values()];
    for (const item of items) {
      item.force.set(0, 0);
    }

    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const a = items[i];
        const b = items[j];
        const delta = Vec2.sub(a.position, b.position);
        const distance = clamp(delta.length(), 8, 2000);
        delta.normalize().scale(this.repulsion / (distance * distance));
        a.force.add(delta);
        b.force.sub(delta);
      }
    }

    for (const edge of model.edges.values()) {
      const a = state.get(edge.source);
      const b = state.get(edge.target);
      if (!a || !b) continue;
      const delta = Vec2.sub(b.position, a.position);
      const distance = clamp(delta.length(), 1, 2000);
      const force = delta.normalize().scale((distance - this.linkDistance) * this.linkStrength);
      a.force.add(force);
      b.force.sub(force);
    }

    for (const item of items) {
      item.force.add(Vec2.sub(this.origin, item.position).scale(this.centerStrength));
      if (item.node.locked) continue;
      item.velocity.add(item.force).scale(this.damping);
      item.position.add(item.velocity);
    }
  }
}
