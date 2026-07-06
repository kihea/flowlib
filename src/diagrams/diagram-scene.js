import { Vec2 } from "../core/vec2.js";
import { CircleNode, GroupNode, LineNode, RectNode, TextNode, TriangleNode } from "../scene/shapes.js";

export function diagramToScene(model, options = {}) {
  const root = new GroupNode({ id: options.id || "diagram", kind: "diagram" });
  syncDiagramScene(root, model, options);
  return root;
}

export function syncDiagramScene(root, model, options = {}) {
  root.clear();
  const selectedNodeIds = options.state?.selectedNodeIds || new Set();
  const hoveredNodeId = options.state?.hoveredNodeId || null;
  const connectingSourceId = options.state?.connectingSourceId || null;

  for (const edge of model.edges.values()) {
    const source = model.nodes.get(edge.source);
    const target = model.nodes.get(edge.target);
    if (!source || !target) continue;
    const points = edge.points.length > 0
      ? edge.points
      : routeStraightEdge(source, target);
    root.add(new LineNode({
      id: `edge:${edge.id}`,
      kind: "diagram-edge",
      points,
      style: {
        stroke: "#334155",
        strokeWidth: 2,
        markerEnd: edge.directed ? "arrow" : null,
        ...options.edgeStyle,
        ...edge.style
      },
      data: { edgeId: edge.id }
    }));
  }

  for (const node of model.nodes.values()) {
    const selected = selectedNodeIds.has?.(node.id) || selectedNodeIds.includes?.(node.id);
    const hovered = hoveredNodeId === node.id;
    const connectingSource = connectingSourceId === node.id;
    const group = new GroupNode({
      id: `node:${node.id}`,
      kind: "diagram-node",
      position: node.position,
      rotation: node.rotation || 0,
      data: { nodeId: node.id }
    });
    group.add(createNodeShape(node, {
      selected,
      hovered,
      connectingSource,
      options
    }));
    group.add(new TextNode({
      id: `node:${node.id}:label`,
      text: node.label,
      fontSize: node.style.fontSize || 14,
      maxWidth: Math.max(16, node.width - 20),
      style: {
        fill: node.style.textFill || "#0f172a"
      }
    }));
    root.add(group);
  }

  return root;
}

function createNodeShape(node, state) {
  const style = {
    fill: "#ffffff",
    stroke: state.selected ? "#2563eb" : state.connectingSource ? "#0f766e" : state.hovered ? "#64748b" : "#0f172a",
    strokeWidth: state.selected || state.connectingSource ? 2.5 : 1.5,
    shadowColor: "rgba(15, 23, 42, 0.12)",
    shadowBlur: 16,
    shadowOffsetY: 6,
    ...state.options.nodeStyle,
    ...node.style
  };
  const shape = node.shape || node.kind;
  if (shape === "triangle") {
    return new TriangleNode({
      id: `node:${node.id}:shape`,
      width: node.width,
      height: node.height,
      style
    });
  }
  if (shape === "circle") {
    return new CircleNode({
      id: `node:${node.id}:shape`,
      radius: Math.max(node.width, node.height) / 2,
      style
    });
  }
  return new RectNode({
    id: `node:${node.id}:shape`,
    width: node.width,
    height: node.height,
    cornerRadius: node.style.cornerRadius ?? 10,
    style
  });
}

export function routeStraightEdge(source, target) {
  const a = Vec2.from(source.position);
  const b = Vec2.from(target.position);
  const delta = Vec2.sub(b, a);
  const horizontal = Math.abs(delta.x) >= Math.abs(delta.y);
  const start = a.clone();
  const end = b.clone();

  if (horizontal) {
    start.x += Math.sign(delta.x || 1) * source.width / 2;
    end.x -= Math.sign(delta.x || 1) * target.width / 2;
  } else {
    start.y += Math.sign(delta.y || 1) * source.height / 2;
    end.y -= Math.sign(delta.y || 1) * target.height / 2;
  }
  return [start, end];
}
