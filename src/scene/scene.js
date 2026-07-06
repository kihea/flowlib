import { Bounds } from "../core/bounds.js";
import { Color } from "../core/color.js";
import { Camera2D } from "./camera.js";
import { GroupNode } from "./shapes.js";

export class Scene extends GroupNode {
  constructor(options = {}) {
    super({ ...options, kind: "scene" });
    this.camera = options.camera || new Camera2D();
    this.background = Color.from(options.background || "#f8fafc");
    this.clock = {
      time: 0,
      frame: 0
    };
  }

  step(dt) {
    this.clock.time += dt;
    this.clock.frame += 1;
    this.update(dt, this.clock);
    return this;
  }

  getSceneBounds() {
    const bounds = Bounds.empty();
    for (const child of this.children) {
      bounds.union(child.getWorldBounds());
    }
    return bounds.normalize();
  }
}
