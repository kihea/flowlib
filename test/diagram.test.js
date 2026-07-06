import assert from "node:assert/strict";
import test from "node:test";
import { DiagramModel, ForceLayout, LayeredLayout, MindMapLayout, diagramEdgeId } from "../src/index.js";

test("DiagramModel adds, updates, serializes, and removes graph items", () => {
  const model = new DiagramModel();
  model.addNode({ id: "a", label: "A" });
  model.addNode({ id: "b", label: "B" });
  model.addEdge({ id: "a-b", source: "a", target: "b" });
  model.updateNode("a", { label: "Start", position: { x: 10, y: 20 } });

  assert.equal(model.nodes.size, 2);
  assert.equal(model.edges.size, 1);
  assert.equal(model.requireNode("a").label, "Start");
  assert.equal(model.toSceneData().nodes[0].position.x, 10);

  model.removeNode("a");
  assert.equal(model.nodes.size, 1);
  assert.equal(model.edges.size, 0);
});

test("LayeredLayout places connected nodes in increasing ranks", () => {
  const model = new DiagramModel();
  model.addNode({ id: "a" });
  model.addNode({ id: "b" });
  model.addNode({ id: "c" });
  model.addEdge({ source: "a", target: "b" });
  model.addEdge({ source: "b", target: "c" });

  new LayeredLayout({ direction: "LR" }).apply(model);

  assert.ok(model.requireNode("a").position.x < model.requireNode("b").position.x);
  assert.ok(model.requireNode("b").position.x < model.requireNode("c").position.x);
});

test("DiagramModel connects, reconnects, disconnects, and rebuilds chains", () => {
  const model = new DiagramModel();
  model.addNode({ id: "a" });
  model.addNode({ id: "b" });
  model.addNode({ id: "c" });

  const edge = model.connect("a", "b");
  assert.equal(edge.id, diagramEdgeId("a", "b"));
  assert.equal(model.connect("a", "b").id, edge.id);
  assert.equal(model.edges.size, 1);

  model.reconnectEdge(edge.id, { target: "c" });
  assert.equal(model.findEdge("a", "c").id, edge.id);
  assert.equal(model.findEdge("a", "b"), null);

  assert.equal(model.disconnect("a", "c").length, 1);
  assert.equal(model.edges.size, 0);

  model.connectChain(["a", "b", "c"]);
  assert.equal(model.edges.size, 2);
  assert.ok(model.findEdge("a", "b"));
  assert.ok(model.findEdge("b", "c"));
});

test("ForceLayout produces finite positions", () => {
  const model = new DiagramModel();
  model.addNode({ id: "a" });
  model.addNode({ id: "b" });
  model.addEdge({ source: "a", target: "b" });

  new ForceLayout({ iterations: 10 }).apply(model);

  for (const node of model.nodes.values()) {
    assert.equal(Number.isFinite(node.position.x), true);
    assert.equal(Number.isFinite(node.position.y), true);
  }
});

test("MindMapLayout keeps root at origin", () => {
  const model = new DiagramModel();
  model.addNode({ id: "root" });
  model.addNode({ id: "child" });
  model.addEdge({ source: "root", target: "child" });

  new MindMapLayout({ root: "root" }).apply(model);

  assert.deepEqual(model.requireNode("root").position.toJSON(), { x: 0, y: 0 });
});
