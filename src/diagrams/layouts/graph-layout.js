import { Vec2 } from "../../core/vec2.js";
import { ForceLayout } from "./force.js";
import { LayeredLayout } from "./layered.js";

export class GraphLayout {
  constructor(options = {}) {
    this.name = options.name || options.layout || "spring";
    this.scale = options.scale ?? 280;
    this.origin = Vec2.from(options.origin || { x: 0, y: 0 });
    this.partitions = options.partitions || null;
    this.root = options.root || null;
    this.seed = options.seed ?? 7;
    this.iterations = options.iterations;
  }

  apply(model) {
    applyGraphLayout(model, this.name, this);
    model.emit("layout", { layout: this, positions: [...model.nodes.values()] });
    return model;
  }
}

export function applyGraphLayout(model, layout = "spring", options = {}) {
  const name = typeof layout === "string" ? layout : "manual";
  const config = typeof layout === "string" ? options : { ...options, positions: layout };
  if (name === "manual") return applyManual(model, config.positions);
  if (name === "spring") {
    return new ForceLayout({
      iterations: config.iterations ?? 180,
      linkDistance: config.linkDistance ?? config.scale ?? 180,
      origin: config.origin || { x: 0, y: 0 }
    }).apply(model);
  }
  if (name === "circular") return applyCircular(model, config);
  if (name === "shell") return applyShell(model, config);
  if (name === "spiral") return applySpiral(model, config);
  if (name === "tree") return applyTree(model, config);
  if (name === "partite") return applyPartite(model, config);
  if (name === "grid") return applyGrid(model, config);
  if (name === "random") return applyRandom(model, config);
  if (name === "layered") return new LayeredLayout(config).apply(model);
  return applyCircular(model, config);
}

function applyManual(model, positions = {}) {
  for (const [id, position] of Object.entries(positions || {})) {
    if (model.nodes.has(id)) {
      model.requireNode(id).position.copy(position);
    }
  }
  return model;
}

function applyCircular(model, options = {}) {
  const nodes = [...model.nodes.values()];
  const origin = Vec2.from(options.origin || { x: 0, y: 0 });
  const radius = options.radius ?? options.scale ?? Math.max(120, nodes.length * 34);
  nodes.forEach((node, index) => {
    const angle = -Math.PI / 2 + Math.PI * 2 * index / Math.max(1, nodes.length);
    node.position.set(origin.x + Math.cos(angle) * radius, origin.y + Math.sin(angle) * radius);
  });
  return model;
}

function applyShell(model, options = {}) {
  const partitions = options.partitions || [model.nodes.keys()];
  const origin = Vec2.from(options.origin || { x: 0, y: 0 });
  const step = options.shellGap ?? options.scale ?? 150;
  partitions.forEach((partition, shellIndex) => {
    const ids = [...partition].filter((id) => model.nodes.has(id));
    const radius = shellIndex === 0 && ids.length === 1 ? 0 : step * (shellIndex + 1);
    ids.forEach((id, index) => {
      const angle = -Math.PI / 2 + Math.PI * 2 * index / Math.max(1, ids.length);
      model.requireNode(id).position.set(origin.x + Math.cos(angle) * radius, origin.y + Math.sin(angle) * radius);
    });
  });
  return model;
}

function applySpiral(model, options = {}) {
  const nodes = [...model.nodes.values()];
  const origin = Vec2.from(options.origin || { x: 0, y: 0 });
  const radiusStep = options.radiusStep ?? 28;
  const angleStep = options.angleStep ?? Math.PI * 0.42;
  nodes.forEach((node, index) => {
    const radius = radiusStep * index;
    const angle = index * angleStep;
    node.position.set(origin.x + Math.cos(angle) * radius, origin.y + Math.sin(angle) * radius);
  });
  return model;
}

function applyTree(model, options = {}) {
  const root = options.root || firstRoot(model);
  const levels = bfsLevels(model, root);
  const origin = Vec2.from(options.origin || { x: 0, y: 0 });
  const layerGap = options.layerGap ?? 160;
  const nodeGap = options.nodeGap ?? 150;
  levels.forEach((ids, depth) => {
    const offset = -(ids.length - 1) * nodeGap / 2;
    ids.forEach((id, index) => {
      model.requireNode(id).position.set(origin.x + offset + index * nodeGap, origin.y + depth * layerGap);
    });
  });
  return model;
}

function applyPartite(model, options = {}) {
  const partitions = options.partitions || inferPartitions(model);
  const origin = Vec2.from(options.origin || { x: 0, y: 0 });
  const layerGap = options.layerGap ?? 220;
  const nodeGap = options.nodeGap ?? 110;
  partitions.forEach((partition, layer) => {
    const ids = [...partition].filter((id) => model.nodes.has(id));
    const offset = -(ids.length - 1) * nodeGap / 2;
    ids.forEach((id, index) => {
      model.requireNode(id).position.set(origin.x + layer * layerGap, origin.y + offset + index * nodeGap);
    });
  });
  return model;
}

function applyGrid(model, options = {}) {
  const nodes = [...model.nodes.values()];
  const columns = options.columns ?? Math.ceil(Math.sqrt(nodes.length));
  const gapX = options.gapX ?? options.nodeGap ?? 170;
  const gapY = options.gapY ?? options.layerGap ?? 120;
  const origin = Vec2.from(options.origin || { x: 0, y: 0 });
  nodes.forEach((node, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    node.position.set(origin.x + column * gapX, origin.y + row * gapY);
  });
  centerModel(model, origin);
  return model;
}

function applyRandom(model, options = {}) {
  const origin = Vec2.from(options.origin || { x: 0, y: 0 });
  const scale = options.scale ?? 280;
  const random = seededRandom(options.seed ?? 7);
  for (const node of model.nodes.values()) {
    node.position.set(origin.x + (random() - 0.5) * scale * 2, origin.y + (random() - 0.5) * scale * 2);
  }
  return model;
}

function centerModel(model, origin) {
  const nodes = [...model.nodes.values()];
  if (nodes.length === 0) return;
  const center = nodes.reduce((sum, node) => sum.add(node.position), new Vec2()).scale(1 / nodes.length);
  for (const node of nodes) {
    node.position.sub(center).add(origin);
  }
}

function firstRoot(model) {
  const targeted = new Set([...model.edges.values()].map((edge) => edge.target));
  return [...model.nodes.keys()].find((id) => !targeted.has(id)) || [...model.nodes.keys()][0];
}

function bfsLevels(model, root) {
  const levels = [];
  const queue = [{ id: root, depth: 0 }];
  const seen = new Set();
  while (queue.length > 0) {
    const { id, depth } = queue.shift();
    if (!model.nodes.has(id) || seen.has(id)) continue;
    seen.add(id);
    if (!levels[depth]) levels[depth] = [];
    levels[depth].push(id);
    for (const edge of model.outgoing(id)) {
      queue.push({ id: edge.target, depth: depth + 1 });
    }
  }
  for (const id of model.nodes.keys()) {
    if (!seen.has(id)) {
      if (!levels[0]) levels[0] = [];
      levels[0].push(id);
    }
  }
  return levels;
}

function inferPartitions(model) {
  const levels = bfsLevels(model, firstRoot(model));
  return levels.filter(Boolean);
}

function seededRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = value * 16807 % 2147483647;
    return (value - 1) / 2147483646;
  };
}
