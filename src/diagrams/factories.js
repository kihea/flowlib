import { LayeredLayout } from "./layouts/layered.js";
import { MindMapLayout } from "./layouts/mindmap.js";
import { GraphLayout } from "./layouts/graph-layout.js";
import { DiagramModel } from "./model.js";
import { Scene } from "../scene/scene.js";
import { CircleNode, GroupNode, LineNode, TextNode, TriangleNode } from "../scene/shapes.js";

export function createDiagram(type, data = {}, options = {}) {
  if (type === "flowchart") return createFlowchart(data.steps || data, options);
  if (type === "state-machine") return createStateMachine(data.states || [], data.transitions || [], options);
  if (type === "mind-map") return createMindMap(data.root, data.branches || data.children || [], options);
  if (type === "knowledge-graph") return createKnowledgeGraph(data.entities || data.nodes || [], data.relations || data.edges || [], options);
  if (type === "function-map") return createFunctionMap(data.name || "function", data.stages || data.steps || [], options);
  if (type === "dendrogram") return createDendrogram(data.root || data, options);
  if (type === "venn") return createVennDiagram(data.sets || data, options);
  if (type === "circle-diagram") return createCircleDiagram(data.items || data, options);
  if (type === "quadrant-chart") return createQuadrantChart(data.points || data, options);
  if (type === "triangle-nodes") return createTriangleNodeDiagram(data.items || data, options);
  throw new Error(`Unknown diagram type: ${type}`);
}

export function createFlowchart(steps = [], options = {}) {
  const model = new DiagramModel({ metadata: { kind: "flowchart", ...options.metadata } });
  for (const step of normalizeItems(steps)) {
    model.addNode({
      id: step.id,
      label: step.label,
      kind: step.kind || "process",
      width: step.width ?? 150,
      height: step.height ?? 64,
      style: { fill: "#ffffff", ...step.style }
    });
  }
  const ids = [...model.nodes.keys()];
  for (const edge of options.edges || []) model.connect(edge.source, edge.target, edge);
  if (options.connect !== false && ids.length > 1 && !options.edges) model.connectChain(ids);
  new LayeredLayout(options.layout || { direction: "LR" }).apply(model);
  return model;
}

export function createStateMachine(states = [], transitions = [], options = {}) {
  const model = new DiagramModel({ metadata: { kind: "state-machine", ...options.metadata } });
  for (const state of normalizeItems(states)) {
    model.addNode({
      id: state.id,
      label: state.label,
      kind: "state",
      width: state.width ?? 118,
      height: state.height ?? 68,
      style: {
        cornerRadius: 999,
        fill: state.initial ? "#dbeafe" : state.accepting ? "#dcfce7" : "#ffffff",
        ...state.style
      },
      data: { initial: !!state.initial, accepting: !!state.accepting }
    });
  }
  for (const transition of transitions) {
    model.connect(transition.source || transition.from, transition.target || transition.to, {
      label: transition.label || "",
      directed: true,
      data: { event: transition.event || transition.label || "" },
      style: transition.style
    });
  }
  new LayeredLayout(options.layout || { direction: "LR", layerGap: 190 }).apply(model);
  return model;
}

export function createMindMap(root, branches = [], options = {}) {
  const model = new DiagramModel({ metadata: { kind: "mind-map", ...options.metadata } });
  const rootId = normalizeItem(root || { id: "root", label: "Root" }).id;
  model.addNode({ id: rootId, label: normalizeItem(root || rootId).label, kind: "mind-root", width: 150, height: 66, style: { fill: "#ecfeff" } });
  addMindChildren(model, rootId, branches);
  new MindMapLayout({ root: rootId, ...(options.layout || {}) }).apply(model);
  return model;
}

export function createKnowledgeGraph(entities = [], relations = [], options = {}) {
  const model = new DiagramModel({ metadata: { kind: "knowledge-graph", ...options.metadata } });
  for (const entity of normalizeItems(entities)) {
    model.addNode({
      id: entity.id,
      label: entity.label,
      kind: entity.kind || "entity",
      width: entity.width ?? 128,
      height: entity.height ?? 58,
      style: { fill: entity.fill || "#f8fafc", cornerRadius: 999, ...entity.style },
      data: entity.data
    });
  }
  for (const relation of relations) {
    model.connect(relation.source || relation.from, relation.target || relation.to, {
      directed: relation.directed ?? false,
      label: relation.label || "",
      style: relation.style,
      data: { relation: relation.label || relation.kind || "" }
    });
  }
  (options.layout || new GraphLayout({ name: "spring", iterations: 160, linkDistance: 170 })).apply(model);
  return model;
}

export function createFunctionMap(name, stages = [], options = {}) {
  const model = new DiagramModel({ metadata: { kind: "function-map", name, ...options.metadata } });
  const root = model.addNode({
    id: options.rootId || name,
    label: `${name}()`,
    kind: "function",
    width: 156,
    height: 64,
    style: { fill: "#eef2ff", stroke: "#3730a3" }
  });
  for (const stage of normalizeItems(stages)) {
    model.addNode({
      id: stage.id,
      label: stage.label,
      kind: stage.kind || "stage",
      width: stage.width ?? 146,
      height: stage.height ?? 58,
      style: { fill: "#ffffff", ...stage.style }
    });
    model.connect(root.id, stage.id);
  }
  new LayeredLayout(options.layout || { direction: "LR", layerGap: 210, nodeGap: 95 }).apply(model);
  return model;
}

export function createDendrogram(root, options = {}) {
  const model = new DiagramModel({ metadata: { kind: "dendrogram", ...options.metadata } });
  const rootItem = normalizeTreeItem(root || { id: "root", label: "Root", children: [] });
  addTreeNode(model, rootItem, null, 0, options);
  new GraphLayout({
    name: "tree",
    root: rootItem.id,
    layerGap: options.layerGap ?? 150,
    nodeGap: options.nodeGap ?? 120,
    ...(options.layout || {})
  }).apply(model);
  return model;
}

export function createCircleDiagram(items = [], options = {}) {
  const model = new DiagramModel({ metadata: { kind: "circle-diagram", ...options.metadata } });
  for (const item of normalizeItems(items)) {
    model.addNode({
      id: item.id,
      label: item.label,
      kind: item.kind || "circle",
      width: item.width ?? 96,
      height: item.height ?? 96,
      style: { fill: "#ffffff", cornerRadius: 999, ...item.style },
      data: item.data
    });
  }
  const ids = [...model.nodes.keys()];
  if (options.connect !== false) {
    ids.forEach((id, index) => model.connect(id, ids[(index + 1) % ids.length], { directed: options.directed ?? false }));
  }
  new GraphLayout({ name: "circular", radius: options.radius ?? 240, ...(options.layout || {}) }).apply(model);
  return model;
}

export function createTriangleNodeDiagram(items = [], options = {}) {
  const model = new DiagramModel({ metadata: { kind: "triangle-nodes", ...options.metadata } });
  for (const item of normalizeItems(items)) {
    model.addNode({
      id: item.id,
      label: item.label,
      kind: "triangle",
      shape: "triangle",
      width: item.width ?? 132,
      height: item.height ?? 104,
      style: { fill: "#fef3c7", stroke: "#92400e", ...item.style },
      data: item.data
    });
  }
  const ids = [...model.nodes.keys()];
  if (options.connect !== false) model.connectChain(ids);
  new LayeredLayout(options.layout || { direction: "LR", layerGap: 190 }).apply(model);
  return model;
}

export function createVennDiagram(sets = [], options = {}) {
  const scene = new Scene({ background: options.background || "#f8fafc" });
  const group = new GroupNode({ id: options.id || "venn", kind: "venn" });
  const normalized = normalizeItems(sets.length ? sets : ["A", "B", "C"]);
  const radius = options.radius ?? 118;
  const colors = options.colors || ["rgba(37, 99, 235, 0.28)", "rgba(15, 118, 110, 0.28)", "rgba(217, 119, 6, 0.28)", "rgba(190, 24, 93, 0.24)"];
  const positions = vennPositions(normalized.length, radius);
  normalized.forEach((set, index) => {
    group.add(new CircleNode({
      id: `venn:${set.id}`,
      x: positions[index].x,
      y: positions[index].y,
      radius,
      opacity: options.opacity ?? 1,
      style: {
        fill: set.fill || colors[index % colors.length],
        stroke: set.stroke || "#334155",
        strokeWidth: 2
      }
    }));
    group.add(new TextNode({
      text: set.label,
      x: positions[index].x,
      y: positions[index].y - radius - 22,
      fontSize: 14,
      fontWeight: 700,
      style: { fill: "#0f172a" }
    }));
  });
  if (options.centerLabel) {
    group.add(new TextNode({ text: options.centerLabel, fontSize: 15, fontWeight: 700, style: { fill: "#0f172a" } }));
  }
  scene.add(group);
  scene.camera.zoom = options.zoom ?? 1;
  return scene;
}

export function createQuadrantChart(points = [], options = {}) {
  const scene = new Scene({ background: options.background || "#f8fafc" });
  const width = options.width ?? 640;
  const height = options.height ?? 420;
  const group = new GroupNode({ id: options.id || "quadrant-chart", kind: "quadrant-chart" });
  group.add(new LineNode({ points: [{ x: -width / 2, y: 0 }, { x: width / 2, y: 0 }], style: { stroke: "#475569", strokeWidth: 2 } }));
  group.add(new LineNode({ points: [{ x: 0, y: height / 2 }, { x: 0, y: -height / 2 }], style: { stroke: "#475569", strokeWidth: 2 } }));
  const labels = options.labels || ["High impact / high effort", "High impact / low effort", "Low impact / low effort", "Low impact / high effort"];
  const labelPositions = [
    { x: width / 4, y: -height / 2 - 24 },
    { x: -width / 4, y: -height / 2 - 24 },
    { x: -width / 4, y: height / 2 + 24 },
    { x: width / 4, y: height / 2 + 24 }
  ];
  labels.forEach((label, index) => group.add(new TextNode({ text: label, ...labelPositions[index], fontSize: 12, style: { fill: "#475569" } })));
  for (const point of normalizeQuadrantPoints(points)) {
    const x = point.x * width / 2;
    const y = -point.y * height / 2;
    group.add(new CircleNode({ x, y, radius: point.radius || 10, style: { fill: point.fill || "#2563eb", stroke: "#ffffff", strokeWidth: 3 } }));
    group.add(new TextNode({ text: point.label, x, y: y - 20, fontSize: 12, fontWeight: 650, style: { fill: "#0f172a" } }));
  }
  scene.add(group);
  return scene;
}

function addMindChildren(model, parentId, branches) {
  for (const branch of normalizeItems(branches)) {
    model.addNode({
      id: branch.id,
      label: branch.label,
      kind: branch.kind || "mind-node",
      width: branch.width ?? 132,
      height: branch.height ?? 58,
      style: { fill: "#ffffff", ...branch.style }
    });
    model.connect(parentId, branch.id, { directed: false });
    if (branch.children) addMindChildren(model, branch.id, branch.children);
  }
}

function addTreeNode(model, item, parentId, depth, options) {
  model.addNode({
    id: item.id,
    label: item.label,
    kind: depth === 0 ? "dendrogram-root" : item.children?.length ? "dendrogram-branch" : "dendrogram-leaf",
    width: item.width ?? (depth === 0 ? 150 : 126),
    height: item.height ?? 54,
    style: {
      fill: depth === 0 ? "#eef2ff" : item.children?.length ? "#ecfeff" : "#ffffff",
      ...item.style
    },
    data: { depth, ...item.data }
  });
  if (parentId) model.connect(parentId, item.id, { directed: false });
  for (const child of item.children || []) {
    addTreeNode(model, normalizeTreeItem(child), item.id, depth + 1, options);
  }
}

function normalizeTreeItem(item) {
  const normalized = normalizeItem(item);
  return { ...normalized, children: item.children || item.branches || [] };
}

function vennPositions(count, radius) {
  if (count === 1) return [{ x: 0, y: 0 }];
  if (count === 2) return [{ x: -radius * 0.58, y: 0 }, { x: radius * 0.58, y: 0 }];
  if (count === 3) return [
    { x: -radius * 0.55, y: -radius * 0.22 },
    { x: radius * 0.55, y: -radius * 0.22 },
    { x: 0, y: radius * 0.58 }
  ];
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + Math.PI * 2 * index / count;
    return { x: Math.cos(angle) * radius * 0.75, y: Math.sin(angle) * radius * 0.75 };
  });
}

function normalizeQuadrantPoints(points = []) {
  return [...points].map((point) => {
    if (Array.isArray(point)) return { x: point[0], y: point[1], label: point[2] || "" };
    return { x: point.x ?? 0, y: point.y ?? 0, label: point.label || point.id || "", ...point };
  });
}

function normalizeItems(items = []) {
  return [...items].map(normalizeItem);
}

function normalizeItem(item) {
  if (typeof item === "string") return { id: slug(item), label: item };
  return { id: item.id || slug(item.label || item.name), label: item.label || item.name || item.id, ...item };
}

function slug(text) {
  return String(text).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "item";
}
