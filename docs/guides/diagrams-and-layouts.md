# Diagrams and Layouts Guide

The diagram layer: the model, factories, Manim-style graph builders, and the layout catalog.

## DiagramModel

The single source of truth for a diagram. Nodes and edges are plain data objects held in `Map`s.

```js
const model = new DiagramModel();
const node = model.addNode({
  id: "a",              // generated if omitted
  label: "Alpha",
  x: 0, y: 0,           // or position: { x, y }
  width: 150, height: 56,
  shape: "rect",        // "rect" | "circle" | "triangle"
  style: { fill: "#ffffff", stroke: "#0f172a", textFill: "#0f172a", cornerRadius: 10 },
  data: { anything: true }
});

model.addEdge({ source: "a", target: "b", directed: true, label: "then", style: { lineDash: [6, 6] } });
```

Editing and querying:

- `updateNode(id, patch)` / `updateEdge(id, patch)` / `removeNode(id)` / `removeEdge(id)`
- `connect(source, target, options)`, `disconnect(source, target)`, `findEdge(source, target)`
- `reconnectEdge(id, { source?, target? })` — move an edge endpoint
- `connectChain(["a", "b", "c"], { clearExisting: true })`
- `incoming(id)`, `outgoing(id)`, `neighbors(id, direction)`
- `requireNode(id)` / `requireEdge(id)` — throwing getters
- `transaction(mutator)` — batch mutations into one `change` event
- `toSceneData()` / `DiagramModel.from(data)` — serialization

Every mutation emits a granular event (`node:add`, `edge:reconnect`, …) plus a coalesced `change`. Views subscribe to `change`; your app can subscribe to either.

## Factories

One-liners for common diagram shapes. Most return a `DiagramModel` (ready for any view or layout); `createVennDiagram` and `createQuadrantChart` return `Scene`s because they are free-form drawings.

| Factory | Produces |
|---|---|
| `createFlowchart(steps, options)` | linear flow with directed edges |
| `createStateMachine(states, transitions, options)` | labeled state graph |
| `createMindMap(root, branches, options)` | center + radiating branches |
| `createKnowledgeGraph(entities, relations, options)` | entity/relation graph with edge labels |
| `createFunctionMap(name, stages, options)` | function pipeline |
| `createDendrogram(root, options)` | tree from nested `{ label, children }` |
| `createCircleDiagram(items, options)` | cycle |
| `createTriangleNodeDiagram(items, options)` | triangle-shaped nodes |
| `createVennDiagram(sets, options)` | Scene with overlapping ellipses |
| `createQuadrantChart(points, options)` | Scene with axes + plotted points |
| `createDiagram(type, data, options)` | dispatch by type string |

## Manim-style graphs

`GraphDiagram` mirrors Manim Community's `Graph`/`DiGraph` concepts:

```js
import { createDiGraph, createGraph, GraphLayout } from "@flowlib/engine";

const graph = createDiGraph(
  ["A", "B", "C", "D"],
  [["A", "B"], ["A", "C"], ["B", "D"], ["C", "D"]],
  { layout: "tree", rootVertex: "A", labels: true, vertexConfig: { fill: "#eef2ff" } }
);

graph.addVertices("E");
graph.addEdges(["D", "E"]);
graph.changeLayout("circular");
```

`GraphDiagram` instances are `DiagramModel`s underneath, so everything above (views, layouts, animation) applies.

## Layout catalog

Layouts assign `node.position` on a model. Apply directly, or via a view (`engine.applyLayout(layout)` / `engine.animateLayout(layout, { duration })` for tweened transitions).

### LayeredLayout

Directional layers for flow-like diagrams (the default engine layout).

```js
new LayeredLayout({ direction: "LR", layerGap: 190, nodeGap: 110 })  // LR | RL | TB | BT
```

### ForceLayout

Iterative force simulation for organic graph shapes.

```js
new ForceLayout({ iterations: 300, linkDistance: 160, origin: { x: 0, y: 0 } })
```

### MindMapLayout

Radial branches around a root.

```js
new MindMapLayout({ root: "center", branchGap: 140, nodeGap: 90 })
```

### GraphLayout

Named algorithms behind one interface:

```js
new GraphLayout({ name: "spring", iterations: 220, scale: 280, seed: 7 })
```

| Name | Best for |
|---|---|
| `spring` | general graphs; force-directed |
| `circular` | cycles, rings |
| `shell` | concentric groups (`partitions`) |
| `spiral` | ordered sequences |
| `tree` | hierarchies (`root`) |
| `partite` | layered/bipartite groups (`partitions`) |
| `grid` | uniform matrices (`columns`) |
| `random` | seeded scatter (`seed`) |
| `layered` | delegates to `LayeredLayout` |
| `manual` | keep authored positions |

`applyGraphLayout(model, layoutNameOrInstance, options)` is the functional form.

## Rendering diagrams your way

`diagramToScene(model, options)` / `syncDiagramScene(root, model, options)` convert models to scene nodes. Options:

- `nodeStyle`, `edgeStyle` — base styles merged under per-node/edge styles
- `state: { selectedNodeIds, hoveredNodeId, connectingSourceId }` — visual states (views pass these automatically)

Custom edge routing currently means supplying `edge.points`; when empty, `routeStraightEdge(source, target)` computes boundary-to-boundary straight segments.

## Choosing a view

See [Static Diagrams and Embedding](../tutorials/04-static-diagrams-and-embedding.md) for the `DiagramView` vs `LiveDiagramEngine` decision table, and [Building an Interactive Editor](../tutorials/03-building-an-interactive-editor.md) for the full editor workflow.
