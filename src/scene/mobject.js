import { PathNode, GroupNode } from "./shapes.js";
import { SceneNode } from "./node.js";

export class Mobject extends SceneNode {}

export class VMobject extends PathNode {
  constructor(options = {}) {
    super({ ...options, kind: options.kind || "vmobject" });
  }
}

export class VGroup extends GroupNode {
  constructor(...nodes) {
    const options = nodes.length === 1 && !nodes[0]?.kind && !Array.isArray(nodes[0]) ? nodes.shift() : {};
    super({ ...options, kind: options.kind || "vgroup" });
    this.add(...nodes.flat());
  }
}
