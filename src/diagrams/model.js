import { EventEmitter } from "../core/events.js";
import { createId } from "../core/id.js";
import { Vec2 } from "../core/vec2.js";

export function diagramEdgeId(source, target) {
  return `${normalizeEndpoint(source)}->${normalizeEndpoint(target)}`;
}

export class DiagramModel extends EventEmitter {
  constructor(options = {}) {
    super();
    this.nodes = new Map();
    this.edges = new Map();
    this.metadata = { ...options.metadata };
    this.version = 0;
  }

  addNode(options = {}) {
    const id = options.id || createId("node");
    if (this.nodes.has(id)) {
      throw new Error(`Diagram node already exists: ${id}`);
    }
    const node = {
      id,
      label: options.label || id,
      kind: options.kind || "process",
      shape: options.shape || options.kind || "rect",
      position: Vec2.from(options.position || { x: options.x || 0, y: options.y || 0 }),
      rotation: options.rotation || 0,
      width: options.width ?? 140,
      height: options.height ?? 64,
      locked: options.locked || false,
      data: { ...options.data },
      style: { ...options.style }
    };
    this.nodes.set(id, node);
    this.#changed("node:add", { node });
    return node;
  }

  updateNode(id, patch = {}) {
    const node = this.requireNode(id);
    if (patch.position) node.position.copy(patch.position);
    for (const [key, value] of Object.entries(patch)) {
      if (key === "position") continue;
      if (key === "style") node.style = { ...node.style, ...value };
      else if (key === "data") node.data = { ...node.data, ...value };
      else node[key] = value;
    }
    this.#changed("node:update", { node, patch });
    return node;
  }

  removeNode(id) {
    const node = this.nodes.get(id);
    if (!node) return false;
    this.nodes.delete(id);
    for (const edge of [...this.edges.values()]) {
      if (edge.source === id || edge.target === id) {
        this.edges.delete(edge.id);
      }
    }
    this.#changed("node:remove", { node });
    return true;
  }

  addEdge(options = {}) {
    const source = normalizeEndpoint(options.source);
    const target = normalizeEndpoint(options.target);
    if (!this.nodes.has(source) || !this.nodes.has(target)) {
      throw new Error("Diagram edge endpoints must reference existing nodes.");
    }
    const id = options.id || createId("edge");
    if (this.edges.has(id)) {
      throw new Error(`Diagram edge already exists: ${id}`);
    }
    const edge = {
      id,
      source,
      target,
      label: options.label || "",
      directed: options.directed ?? true,
      kind: options.kind || "edge",
      points: (options.points || []).map((point) => Vec2.from(point)),
      data: { ...options.data },
      style: { ...options.style }
    };
    this.edges.set(id, edge);
    this.#changed("edge:add", { edge });
    return edge;
  }

  connect(source, target, options = {}) {
    const sourceId = normalizeEndpoint(source);
    const targetId = normalizeEndpoint(target);
    if (!options.allowSelf && sourceId === targetId) {
      throw new Error("Diagram edges cannot connect a node to itself unless allowSelf is true.");
    }
    const existing = options.allowParallel
      ? null
      : this.findEdge(sourceId, targetId, { directed: options.directed ?? true });
    if (existing && !options.replace) {
      return existing;
    }
    if (existing && options.replace) {
      this.removeEdge(existing.id);
    }
    const fallbackId = diagramEdgeId(sourceId, targetId);
    return this.addEdge({
      ...options,
      id: options.id || (this.edges.has(fallbackId) ? createId("edge") : fallbackId),
      source: sourceId,
      target: targetId
    });
  }

  updateEdge(id, patch = {}) {
    const edge = this.requireEdge(id);
    for (const [key, value] of Object.entries(patch)) {
      if (key === "style") edge.style = { ...edge.style, ...value };
      else if (key === "data") edge.data = { ...edge.data, ...value };
      else if (key === "points") edge.points = value.map((point) => Vec2.from(point));
      else edge[key] = value;
    }
    this.#changed("edge:update", { edge, patch });
    return edge;
  }

  reconnectEdge(id, endpoints = {}, options = {}) {
    const edge = this.requireEdge(id);
    const source = endpoints.source == null ? edge.source : normalizeEndpoint(endpoints.source);
    const target = endpoints.target == null ? edge.target : normalizeEndpoint(endpoints.target);
    if (!this.nodes.has(source) || !this.nodes.has(target)) {
      throw new Error("Reconnected edge endpoints must reference existing nodes.");
    }
    if (!options.allowSelf && source === target) {
      throw new Error("Diagram edges cannot connect a node to itself unless allowSelf is true.");
    }
    const duplicate = this.findEdge(source, target, { directed: edge.directed ?? true });
    if (duplicate && duplicate.id !== id && !options.allowParallel) {
      throw new Error(`Diagram edge already exists between ${source} and ${target}.`);
    }
    edge.source = source;
    edge.target = target;
    if (!options.preservePoints) {
      edge.points = [];
    }
    this.#changed("edge:reconnect", { edge, endpoints: { source, target } });
    return edge;
  }

  removeEdge(id) {
    const edge = this.edges.get(id);
    if (!edge) return false;
    this.edges.delete(id);
    this.#changed("edge:remove", { edge });
    return true;
  }

  disconnect(source, target, options = {}) {
    const sourceId = normalizeEndpoint(source);
    const targetId = normalizeEndpoint(target);
    const removed = [];
    const directed = options.directed ?? true;
    for (const edge of [...this.edges.values()]) {
      const matchesForward = edge.source === sourceId && edge.target === targetId;
      const matchesReverse = !directed && edge.source === targetId && edge.target === sourceId;
      if (matchesForward || matchesReverse) {
        this.removeEdge(edge.id);
        removed.push(edge);
      }
    }
    return removed;
  }

  findEdge(source, target, options = {}) {
    const sourceId = normalizeEndpoint(source);
    const targetId = normalizeEndpoint(target);
    const directed = options.directed ?? true;
    for (const edge of this.edges.values()) {
      const matchesForward = edge.source === sourceId && edge.target === targetId;
      const matchesReverse = !directed && edge.source === targetId && edge.target === sourceId;
      if (matchesForward || matchesReverse) return edge;
    }
    return null;
  }

  incoming(id) {
    const nodeId = normalizeEndpoint(id);
    return [...this.edges.values()].filter((edge) => edge.target === nodeId);
  }

  outgoing(id) {
    const nodeId = normalizeEndpoint(id);
    return [...this.edges.values()].filter((edge) => edge.source === nodeId);
  }

  connectChain(nodes, options = {}) {
    const ids = nodes.map((node) => normalizeEndpoint(node)).filter(Boolean);
    if (ids.length < 2) return [];
    const created = [];
    if (options.clearExisting) {
      const chainSet = new Set(ids);
      for (const edge of [...this.edges.values()]) {
        if (chainSet.has(edge.source) && chainSet.has(edge.target)) {
          this.removeEdge(edge.id);
        }
      }
    }
    for (let index = 0; index < ids.length - 1; index += 1) {
      created.push(this.connect(ids[index], ids[index + 1], {
        ...(options.edge || {}),
        replace: options.replace ?? false
      }));
    }
    return created;
  }

  requireNode(id) {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Unknown diagram node: ${id}`);
    return node;
  }

  requireEdge(id) {
    const edge = this.edges.get(id);
    if (!edge) throw new Error(`Unknown diagram edge: ${id}`);
    return edge;
  }

  neighbors(id, direction = "both") {
    const output = [];
    for (const edge of this.edges.values()) {
      if (direction !== "in" && edge.source === id) output.push(this.requireNode(edge.target));
      if (direction !== "out" && edge.target === id) output.push(this.requireNode(edge.source));
    }
    return output;
  }

  transaction(mutator) {
    const before = this.version;
    mutator(this);
    if (this.version !== before) {
      this.emit("transaction", { version: this.version });
    }
    return this;
  }

  toSceneData() {
    return {
      nodes: [...this.nodes.values()].map(serializeNode),
      edges: [...this.edges.values()].map(serializeEdge),
      metadata: { ...this.metadata }
    };
  }

  static from(data = {}) {
    const model = new DiagramModel({ metadata: data.metadata });
    for (const node of data.nodes || []) {
      model.addNode(node);
    }
    for (const edge of data.edges || []) {
      model.addEdge(edge);
    }
    return model;
  }

  #changed(changeType, payload) {
    this.version += 1;
    this.emit("change", { changeType, version: this.version, ...payload });
    this.emit(changeType, { version: this.version, ...payload });
  }
}

function normalizeEndpoint(endpoint) {
  return typeof endpoint === "object" ? endpoint?.id : endpoint;
}

function serializeNode(node) {
  return {
    ...node,
    position: node.position.toJSON(),
    data: { ...node.data },
    style: { ...node.style }
  };
}

function serializeEdge(edge) {
  return {
    ...edge,
    points: edge.points.map((point) => point.toJSON()),
    data: { ...edge.data },
    style: { ...edge.style }
  };
}
