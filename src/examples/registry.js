import { Timeline } from "../animation/timeline.js";
import { moveAlongPath } from "../animation/presets.js";
import { cubicBezier } from "../curves/bezier.js";
import { createFunctionGraph } from "../graphing/function-graph.js";
import { createAxes } from "../graphing/axes.js";
import { Scene } from "../scene/scene.js";
import { CircleNode, PathNode, TextNode } from "../scene/shapes.js";
import { createDiGraph, createGraph } from "../diagrams/graph.js";
import { GraphLayout } from "../diagrams/layouts/graph-layout.js";
import {
  createCircleDiagram,
  createDendrogram,
  createFlowchart,
  createFunctionMap,
  createKnowledgeGraph,
  createMindMap,
  createQuadrantChart,
  createStateMachine,
  createTriangleNodeDiagram,
  createVennDiagram
} from "../diagrams/factories.js";
import { createBooleanOperationsExampleScene } from "./boolean-operations.js";
import { ManimRepositoryExamples } from "./manim-repository.js";

const registry = new Map();

export function defineExampleScene(definition) {
  if (!definition?.id || typeof definition.create !== "function") {
    throw new Error("Example scene definitions require an id and create function.");
  }
  registry.set(definition.id, definition);
  return definition;
}

export function listExampleScenes() {
  return [...registry.values()].map(({ id, title, kind, description }) => ({ id, title, kind, description }));
}

export function createExampleScene(id, options = {}) {
  const definition = registry.get(id);
  if (!definition) throw new Error(`Unknown example scene: ${id}`);
  return definition.create(options);
}

defineExampleScene({
  id: "live-flowchart",
  title: "Live Flowchart",
  kind: "diagram",
  description: "A flowchart model with draggable nodes and editable connections.",
  create() {
    const model = createFlowchart(["Parse input", "Validate shape", "Run layout", "Render scene", "Export or embed"]);
    return { model, layout: "layered" };
  }
});

defineExampleScene({
  id: "state-machine",
  title: "Animated State Machine",
  kind: "diagram",
  description: "A state-machine diagram with named transitions.",
  create() {
    const model = createStateMachine(
      [
        { id: "idle", label: "Idle", initial: true },
        { id: "loading", label: "Loading" },
        { id: "done", label: "Done", accepting: true }
      ],
      [
        { source: "idle", target: "loading", label: "request" },
        { source: "loading", target: "done", label: "resolve" },
        { source: "done", target: "idle", label: "reset" }
      ]
    );
    return { model, layout: "state-machine" };
  }
});

defineExampleScene({
  id: "graph-layouts",
  title: "Graph Layouts",
  kind: "graph",
  description: "A Manim-style graph model that can switch between custom layouts.",
  create(options = {}) {
    const graph = createGraph(["A", "B", "C", "D", "E", "F"], [
      ["A", "B"],
      ["A", "C"],
      ["B", "D"],
      ["C", "D"],
      ["D", "E"],
      ["E", "F"],
      ["F", "A"]
    ], { layout: options.layout || "circular" });
    return { model: graph, layout: new GraphLayout({ name: options.layout || "circular" }) };
  }
});

defineExampleScene({
  id: "diagram-types",
  title: "Diagram Types",
  kind: "diagram",
  description: "Factory-backed flowchart, knowledge graph, mind map, state machine, and function map examples.",
  create() {
    return {
      diagrams: {
        flowchart: createFlowchart(["Capture", "Normalize", "Analyze", "Publish"]),
        knowledgeGraph: createKnowledgeGraph(
          ["Flowlib", "DiagramModel", "LiveDiagramEngine", "Timeline"],
          [
            { source: "flowlib", target: "diagrammodel", label: "stores" },
            { source: "flowlib", target: "livediagramengine", label: "edits" },
            { source: "flowlib", target: "timeline", label: "animates" }
          ]
        ),
        mindMap: createMindMap("Flowlib", ["Diagrams", "Animations", "Renderers", "Live tools"]),
        stateMachine: createStateMachine(["Idle", "Editing", "Saving"], [
          { source: "idle", target: "editing", label: "select" },
          { source: "editing", target: "saving", label: "commit" },
          { source: "saving", target: "idle", label: "done" }
        ]),
        functionMap: createFunctionMap("layoutGraph", ["read nodes", "rank vertices", "route edges", "write positions"])
      }
    };
  }
});

defineExampleScene({
  id: "dendrogram",
  title: "Dendrogram",
  kind: "diagram",
  description: "A hierarchy rendered as a dendrogram-style tree.",
  create() {
    return {
      model: createDendrogram({
        id: "root",
        label: "Root",
        children: [
          { label: "Cluster A", children: ["A1", "A2"] },
          { label: "Cluster B", children: ["B1", "B2", "B3"] }
        ]
      }),
      layout: new GraphLayout({ name: "tree", root: "root" })
    };
  }
});

defineExampleScene({
  id: "venn-diagram",
  title: "Venn Diagram",
  kind: "scene",
  description: "Overlapping set circles with labels and a center annotation.",
  create() {
    return { scene: createVennDiagram(["Design", "Data", "Code"], { centerLabel: "Flowlib" }), timeline: new Timeline() };
  }
});

defineExampleScene({
  id: "circle-diagram",
  title: "Circle Diagram",
  kind: "diagram",
  description: "Nodes arranged around a circular process.",
  create() {
    return { model: createCircleDiagram(["Plan", "Build", "Animate", "Share"], { directed: true }), layout: new GraphLayout({ name: "circular" }) };
  }
});

defineExampleScene({
  id: "triangle-nodes",
  title: "Triangle Nodes",
  kind: "diagram",
  description: "A diagram using triangle-shaped nodes.",
  create() {
    return { model: createTriangleNodeDiagram(["Parse", "Route", "Render", "Export"]) };
  }
});

defineExampleScene({
  id: "quadrant-chart",
  title: "Quadrant Chart",
  kind: "scene",
  description: "A scene preset for two-axis priority maps.",
  create() {
    return {
      scene: createQuadrantChart([
        { x: -0.6, y: 0.7, label: "Quick win" },
        { x: 0.65, y: 0.45, label: "Strategic" }
      ]),
      timeline: new Timeline()
    };
  }
});

defineExampleScene({
  id: "function-graph",
  title: "Function Graph",
  kind: "scene",
  description: "Axes and sampled function curves built from ordinary scene nodes.",
  create() {
    const scene = new Scene({ background: "#f8fafc" });
    const axes = createAxes({ xRange: [-6, 6, 2], yRange: [-2, 2, 1], width: 680, height: 340 });
    const sine = createFunctionGraph((x) => Math.sin(x), { axes, style: { stroke: "#2563eb", strokeWidth: 3 } });
    const cosine = createFunctionGraph((x) => Math.cos(x), { axes, style: { stroke: "#0f766e", strokeWidth: 3 } });
    const title = new TextNode({ text: "sin(x) and cos(x)", y: -230, fontSize: 18, fontWeight: 700, style: { fill: "#0f172a" } });
    scene.add(axes, sine, cosine, title);
    return { scene, timeline: new Timeline() };
  }
});

defineExampleScene({
  id: "bezier-mobject",
  title: "Bezier Mobject",
  kind: "scene",
  description: "A VMobject-style Bezier path with a marker moving along it.",
  create() {
    const scene = new Scene({ background: "#f8fafc" });
    const timeline = new Timeline({ autoplay: true, loop: true });
    const curve = cubicBezier({ x: -260, y: 120 }, { x: -140, y: -220 }, { x: 180, y: -200 }, { x: 270, y: 110 });
    const points = curve.sample(80);
    const path = new PathNode({ points, style: { stroke: "#0f766e", strokeWidth: 4 } });
    const marker = new CircleNode({ radius: 10, style: { fill: "#0f766e", stroke: "#ffffff", strokeWidth: 3 } });
    scene.add(path, marker, new TextNode({ text: "Bezier VMobject", y: 190, fontSize: 18, fontWeight: 700, style: { fill: "#0f172a" } }));
    moveAlongPath(timeline, marker, points, { duration: 2.8, ease: "inOutCubic", at: 0 });
    timeline.duration = 2.8;
    return { scene, timeline };
  }
});

defineExampleScene({
  id: "boolean-operations",
  title: "Boolean Operations",
  kind: "scene",
  description: "Union, intersection, exclusion, and difference over overlapping ellipses.",
  create: createBooleanOperationsExampleScene
});

defineExampleScene({
  id: "directed-graph",
  title: "Directed Graph",
  kind: "graph",
  description: "A directed graph matching Manim's DiGraph semantics.",
  create() {
    const graph = createDiGraph(["source", "parse", "route", "render"], [
      ["source", "parse"],
      ["parse", "route"],
      ["route", "render"]
    ], { layout: "tree", labels: true });
    return { model: graph, layout: new GraphLayout({ name: "tree" }) };
  }
});

for (const example of ManimRepositoryExamples) {
  defineExampleScene({
    id: example.id,
    title: example.title,
    kind: "scene",
    description: `Recreated from ${example.sourceUrl}`,
    create: example.create
  });
}

export const ExampleSceneRegistry = registry;
