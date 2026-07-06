import { Timeline } from "../animation/timeline.js";
import {
  DifferenceNode,
  EllipseNode,
  ExclusionNode,
  GroupNode,
  IntersectionNode,
  LineNode,
  TextNode,
  UnionNode
} from "../scene/index.js";
import { Scene } from "../scene/scene.js";

export function createBooleanOperationsExampleScene() {
  const scene = new Scene({ background: "#f8fafc" });
  const timeline = new Timeline({ autoplay: true });
  const source = new GroupNode({ x: -285, opacity: 0 });
  const title = new TextNode({
    text: "Boolean Operation",
    y: -178,
    fontSize: 24,
    fontWeight: 800,
    style: { fill: "#0f172a" }
  });
  const underline = new LineNode({
    y: -156,
    points: [{ x: -118, y: 0 }, { x: 118, y: 0 }],
    style: { stroke: "#0f172a", strokeWidth: 2 }
  });
  source.add(title, underline, displayEllipse("left"), displayEllipse("right"));

  const operations = [
    {
      node: new IntersectionNode(booleanOperands(), {
        x: -285,
        style: { fill: "rgba(22, 163, 74, 0.55)", stroke: "#16a34a", strokeWidth: 3 }
      }),
      label: "Intersection",
      target: { x: 300, y: -160, scale: 0.25 },
      at: 1.15
    },
    {
      node: new UnionNode(booleanOperands(), {
        x: -285,
        style: { fill: "rgba(249, 115, 22, 0.52)", stroke: "#f97316", strokeWidth: 3 }
      }),
      label: "Union",
      target: { x: 300, y: 5, scale: 0.3 },
      at: 2.25
    },
    {
      node: new ExclusionNode(booleanOperands(), {
        x: -285,
        style: { fill: "rgba(234, 179, 8, 0.55)", stroke: "#ca8a04", strokeWidth: 3 }
      }),
      label: "Exclusion",
      target: { x: 300, y: 170, scale: 0.3 },
      at: 3.35
    },
    {
      node: new DifferenceNode(booleanOperands(), {
        x: -285,
        style: { fill: "rgba(236, 72, 153, 0.55)", stroke: "transparent", strokeWidth: 0 }
      }),
      label: "Difference",
      target: { x: 92, y: 5, scale: 0.3 },
      at: 4.45
    }
  ];

  scene.add(source);
  timeline.to(source, { opacity: 1 }, { at: 0, duration: 0.7, ease: "outCubic" });

  for (const item of operations) {
    item.node.opacity = 0;
    const label = new TextNode({
      text: item.label,
      x: item.target.x,
      y: item.target.y - 76,
      opacity: 0,
      fontSize: 23,
      fontWeight: 700,
      style: { fill: "#0f172a" }
    });
    scene.add(item.node, label);
    timeline.to(item.node, { opacity: 1 }, { at: item.at, duration: 0.2, ease: "outCubic" });
    timeline.to(item.node.position, { x: item.target.x, y: item.target.y }, { at: item.at, duration: 0.75, ease: "inOutCubic" });
    timeline.to(item.node.scale, { x: item.target.scale, y: item.target.scale }, { at: item.at, duration: 0.75, ease: "inOutCubic" });
    timeline.to(label, { opacity: 1 }, { at: item.at + 0.78, duration: 0.35, ease: "outCubic" });
  }

  scene.add(new TextNode({
    text: "Union, intersection, exclusion, and difference are reusable scene nodes.",
    y: 275,
    fontSize: 14,
    style: { fill: "#475569" }
  }));
  timeline.duration = 6;
  return { scene, timeline, target: operations[0].node, statusText: "Boolean shape operations scene" };
}

function displayEllipse(side) {
  const left = side === "left";
  return new EllipseNode({
    x: left ? -70 : 70,
    radiusX: 95,
    radiusY: 120,
    style: {
      fill: left ? "rgba(37, 99, 235, 0.46)" : "rgba(220, 38, 38, 0.46)",
      stroke: left ? "#2563eb" : "#dc2626",
      strokeWidth: 8
    }
  });
}

function booleanOperands() {
  return [
    new EllipseNode({ x: -70, radiusX: 95, radiusY: 120 }),
    new EllipseNode({ x: 70, radiusX: 95, radiusY: 120 })
  ];
}
