import assert from "node:assert/strict";
import test from "node:test";
import {
  GraphLayout,
  createDiGraph,
  createAxes,
  createFlowchart,
  createDendrogram,
  createFunctionGraph,
  createFunctionMap,
  createGraph,
  createKnowledgeGraph,
  createMindMap,
  createCircleDiagram,
  createQuadrantChart,
  createStateMachine,
  createTriangleNodeDiagram,
  createVennDiagram,
  listExampleScenes,
  createExampleScene
} from "../src/index.js";

test("GraphDiagram supports undirected and directed graph semantics", () => {
  const graph = createGraph(["A", "B"], [["A", "B"]], { layout: false });
  assert.equal(graph.directed, false);
  assert.equal(graph.edges.size, 1);
  assert.equal(graph.findEdge("B", "A", { directed: false }).source, "A");

  const digraph = createDiGraph(["A", "B"], [["A", "B"]], { layout: false });
  assert.equal(digraph.directed, true);
  assert.equal(digraph.findEdge("B", "A"), null);
});

test("GraphLayout applies multiple custom layout modes", () => {
  for (const name of ["circular", "tree", "partite", "shell", "spiral", "grid", "random"]) {
    const graph = createGraph(["A", "B", "C", "D"], [["A", "B"], ["A", "C"], ["C", "D"]], { layout: false });
    new GraphLayout({
      name,
      root: "A",
      partitions: [["A"], ["B", "C"], ["D"]],
      columns: 2
    }).apply(graph);
    for (const node of graph.nodes.values()) {
      assert.equal(Number.isFinite(node.position.x), true, name);
      assert.equal(Number.isFinite(node.position.y), true, name);
    }
  }
});

test("diagram factories create expected graph structures", () => {
  assert.equal(createFlowchart(["A", "B", "C"]).edges.size, 2);
  assert.equal(createStateMachine(["Idle", "Done"], [{ source: "idle", target: "done" }]).edges.size, 1);
  assert.ok(createMindMap("Root", ["A", "B"]).findEdge("root", "a", { directed: false }));
  assert.equal(createKnowledgeGraph(["A", "B"], [{ source: "a", target: "b" }]).edges.size, 1);
  assert.equal(createFunctionMap("work", ["read", "write"]).outgoing("work").length, 2);
  assert.equal(createDendrogram({ label: "Root", children: ["A", "B"] }).edges.size, 2);
  assert.equal(createCircleDiagram(["A", "B", "C"]).edges.size, 3);
  assert.equal(createTriangleNodeDiagram(["A", "B"]).requireNode("a").shape, "triangle");
});

test("scene diagram presets create renderable scenes", () => {
  assert.ok(createVennDiagram(["A", "B"]).children.length > 0);
  assert.ok(createQuadrantChart([{ x: 0.2, y: -0.4, label: "Point" }]).children.length > 0);
});

test("function graph samples finite points", () => {
  const graph = createFunctionGraph((x) => x * x, { xRange: [-2, 2, 1], yRange: [0, 4, 1], samples: 16 });
  assert.equal(graph.points.length, 17);
  assert.equal(Number.isFinite(graph.points[0].x), true);
});

test("axes draw data-space zero lines for asymmetric ranges", () => {
  const axes = createAxes({ xRange: [0, 7, 1], yRange: [-1, 6, 1], width: 700, height: 350, labels: false });
  assert.ok(axes.data.xAxisY > 0);
  assert.ok(axes.data.xAxisY < 175);
  assert.equal(axes.children[0].points[0].y, axes.data.xAxisY);
});

test("example scene registry can recreate all registered scenes", () => {
  const scenes = listExampleScenes();
  assert.ok(scenes.length >= 5);
  for (const scene of scenes) {
    const instance = createExampleScene(scene.id);
    assert.ok(instance.model || instance.scene || instance.diagrams);
  }
});
