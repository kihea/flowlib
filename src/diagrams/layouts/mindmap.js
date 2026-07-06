export class MindMapLayout {
  constructor(options = {}) {
    this.radiusStep = options.radiusStep ?? 190;
    this.angleStart = options.angleStart ?? -Math.PI / 2;
    this.origin = options.origin || { x: 0, y: 0 };
    this.root = options.root || null;
  }

  apply(model) {
    if (model.nodes.size === 0) return model;
    const rootId = this.root || [...model.nodes.keys()][0];
    const levels = breadthFirstLevels(model, rootId);

    for (const [depth, ids] of levels.entries()) {
      if (depth === 0) {
        model.requireNode(rootId).position.set(this.origin.x, this.origin.y);
        continue;
      }
      const radius = depth * this.radiusStep;
      const slice = Math.PI * 2 / Math.max(1, ids.length);
      ids.forEach((id, index) => {
        const angle = this.angleStart + index * slice;
        model.requireNode(id).position.set(
          this.origin.x + Math.cos(angle) * radius,
          this.origin.y + Math.sin(angle) * radius
        );
      });
    }

    model.emit("layout", { layout: this, positions: [...model.nodes.values()] });
    return model;
  }
}

function breadthFirstLevels(model, rootId) {
  const levels = [];
  const queue = [{ id: rootId, depth: 0 }];
  const visited = new Set();

  while (queue.length > 0) {
    const { id, depth } = queue.shift();
    if (visited.has(id) || !model.nodes.has(id)) continue;
    visited.add(id);
    if (!levels[depth]) levels[depth] = [];
    levels[depth].push(id);
    for (const neighbor of model.neighbors(id)) {
      if (!visited.has(neighbor.id)) {
        queue.push({ id: neighbor.id, depth: depth + 1 });
      }
    }
  }

  for (const id of model.nodes.keys()) {
    if (!visited.has(id)) {
      if (!levels[1]) levels[1] = [];
      levels[1].push(id);
    }
  }

  return levels;
}
