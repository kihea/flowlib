import { Bounds } from "../core/bounds.js";
import { Mat3 } from "../core/mat3.js";
import { SceneNode } from "./node.js";

export const BooleanOperations = Object.freeze({
  UNION: "union",
  INTERSECTION: "intersection",
  DIFFERENCE: "difference",
  EXCLUSION: "exclusion"
});

export class BooleanShapeNode extends SceneNode {
  constructor(options = {}) {
    super({ ...options, kind: options.kind || "boolean-shape" });
    this.operation = options.operation || BooleanOperations.UNION;
    this.operands = [...(options.operands || options.shapes || [])];
    this.fillRule = options.fillRule || "nonzero";
  }

  setOperands(...operands) {
    this.operands = operands.flat().filter(Boolean);
    return this;
  }

  addOperand(...operands) {
    this.operands.push(...operands.flat().filter(Boolean));
    return this;
  }

  getLocalBounds() {
    if (this.operands.length === 0) return new Bounds();
    if (this.operation === BooleanOperations.INTERSECTION) {
      return intersectBounds(this.operands.map(transformedBounds)).normalize();
    }
    if (this.operation === BooleanOperations.DIFFERENCE) {
      return transformedBounds(this.operands[0]).normalize();
    }
    const bounds = Bounds.empty();
    for (const operand of this.operands) {
      bounds.union(transformedBounds(operand));
    }
    return bounds.normalize();
  }
}

export class UnionNode extends BooleanShapeNode {
  constructor(operands = [], options = {}) {
    super({ ...options, operands, operation: BooleanOperations.UNION });
  }
}

export class IntersectionNode extends BooleanShapeNode {
  constructor(operands = [], options = {}) {
    super({ ...options, operands, operation: BooleanOperations.INTERSECTION });
  }
}

export class DifferenceNode extends BooleanShapeNode {
  constructor(operands = [], options = {}) {
    super({ ...options, operands, operation: BooleanOperations.DIFFERENCE });
  }
}

export class ExclusionNode extends BooleanShapeNode {
  constructor(operands = [], options = {}) {
    super({ ...options, operands, operation: BooleanOperations.EXCLUSION });
  }
}

export function unionShapes(operands, options = {}) {
  return new UnionNode(operands, options);
}

export function intersectShapes(operands, options = {}) {
  return new IntersectionNode(operands, options);
}

export function differenceShapes(operands, options = {}) {
  return new DifferenceNode(operands, options);
}

export function excludeShapes(operands, options = {}) {
  return new ExclusionNode(operands, options);
}

function transformedBounds(node) {
  if (!node) return new Bounds();
  const local = node.getLocalBounds();
  const matrix = node.localMatrix?.() || Mat3.identity();
  return Bounds.fromPoints([
    matrix.apply({ x: local.minX, y: local.minY }),
    matrix.apply({ x: local.maxX, y: local.minY }),
    matrix.apply({ x: local.maxX, y: local.maxY }),
    matrix.apply({ x: local.minX, y: local.maxY })
  ]);
}

function intersectBounds(boundsList) {
  if (boundsList.length === 0) return new Bounds();
  const first = boundsList[0].clone();
  for (const bounds of boundsList.slice(1)) {
    const minX = Math.max(first.minX, bounds.minX);
    const minY = Math.max(first.minY, bounds.minY);
    const maxX = Math.min(first.maxX, bounds.maxX);
    const maxY = Math.min(first.maxY, bounds.maxY);
    first.x = minX;
    first.y = minY;
    first.width = Math.max(0, maxX - minX);
    first.height = Math.max(0, maxY - minY);
  }
  return first;
}
