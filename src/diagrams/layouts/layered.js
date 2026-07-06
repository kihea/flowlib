export class LayeredLayout {
  constructor(options = {}) {
    this.direction = options.direction || "LR";
    this.layerGap = options.layerGap ?? 220;
    this.nodeGap = options.nodeGap ?? 110;
    this.origin = options.origin || { x: 0, y: 0 };
  }

  apply(model) {
    const ranks = assignRanks(model);
    const layers = new Map();
    for (const [id, rank] of ranks) {
      if (!layers.has(rank)) layers.set(rank, []);
      layers.get(rank).push(model.requireNode(id));
    }

    const sortedLayers = [...layers.entries()].sort((a, b) => a[0] - b[0]);
    for (const [rank, nodes] of sortedLayers) {
      nodes.sort((a, b) => a.id.localeCompare(b.id));
      const offset = -(nodes.length - 1) * this.nodeGap / 2;
      nodes.forEach((node, index) => {
        const primary = rank * this.layerGap;
        const secondary = offset + index * this.nodeGap;
        if (this.direction === "TB") {
          node.position.set(this.origin.x + secondary, this.origin.y + primary);
        } else if (this.direction === "BT") {
          node.position.set(this.origin.x + secondary, this.origin.y - primary);
        } else if (this.direction === "RL") {
          node.position.set(this.origin.x - primary, this.origin.y + secondary);
        } else {
          node.position.set(this.origin.x + primary, this.origin.y + secondary);
        }
      });
    }

    model.emit("layout", { layout: this, positions: [...model.nodes.values()] });
    return model;
  }
}

function assignRanks(model) {
  const indegree = new Map([...model.nodes.keys()].map((id) => [id, 0]));
  const outgoing = new Map([...model.nodes.keys()].map((id) => [id, []]));

  for (const edge of model.edges.values()) {
    if (!model.nodes.has(edge.source) || !model.nodes.has(edge.target)) continue;
    indegree.set(edge.target, (indegree.get(edge.target) || 0) + 1);
    outgoing.get(edge.source).push(edge.target);
  }

  const queue = [...indegree.entries()].filter(([, degree]) => degree === 0).map(([id]) => id);
  if (queue.length === 0 && model.nodes.size > 0) {
    queue.push([...model.nodes.keys()][0]);
  }

  const ranks = new Map([...model.nodes.keys()].map((id) => [id, 0]));
  const visited = new Set();

  while (queue.length > 0) {
    const id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    const rank = ranks.get(id) || 0;
    for (const target of outgoing.get(id) || []) {
      ranks.set(target, Math.max(ranks.get(target) || 0, rank + 1));
      indegree.set(target, indegree.get(target) - 1);
      if (indegree.get(target) <= 0) queue.push(target);
    }
  }

  for (const id of model.nodes.keys()) {
    if (!visited.has(id)) {
      ranks.set(id, Math.max(...ranks.values()) + 1);
    }
  }

  return ranks;
}
