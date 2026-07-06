import { DiagramModel } from "./model.js";
import { GraphLayout } from "./layouts/graph-layout.js";

export class GraphDiagram extends DiagramModel {
  constructor(options = {}) {
    super({ metadata: { kind: options.directed ? "digraph" : "graph", ...options.metadata } });
    this.directed = options.directed ?? false;
    this.layoutName = options.layout || "spring";
    this.layoutConfig = {
      scale: options.layoutScale ?? 240,
      ...(options.layoutConfig || {}),
      partitions: options.partitions || options.layoutConfig?.partitions,
      root: options.rootVertex || options.layoutConfig?.root
    };

    for (const vertex of options.vertices || []) {
      const id = normalizeVertex(vertex);
      this.addNode({
        id,
        label: resolveLabel(id, options.labels),
        kind: "vertex",
        width: options.vertexWidth ?? 72,
        height: options.vertexHeight ?? 48,
        style: {
          cornerRadius: 999,
          fill: "#ffffff",
          stroke: "#1f2937",
          ...(resolveConfig(id, options.vertexConfig))
        },
        data: { vertex }
      });
    }

    for (const edge of options.edges || []) {
      const [source, target] = edge;
      this.connect(normalizeVertex(source), normalizeVertex(target), {
        directed: this.directed,
        style: resolveConfig(`${source}->${target}`, options.edgeConfig)
      });
    }
  }

  changeLayout(layout = this.layoutName, config = {}) {
    this.layoutName = layout;
    this.layoutConfig = { ...this.layoutConfig, ...config };
    new GraphLayout({ name: layout, ...this.layoutConfig }).apply(this);
    return this;
  }

  addVertices(...vertices) {
    for (const vertex of vertices.flat()) {
      const id = normalizeVertex(vertex);
      if (!this.nodes.has(id)) {
        this.addNode({ id, label: id, kind: "vertex", width: 72, height: 48 });
      }
    }
    return this;
  }

  addEdges(...edges) {
    for (const edge of edges.flat()) {
      this.connect(edge[0], edge[1], { directed: this.directed });
    }
    return this;
  }
}

export function createGraph(vertices, edges, options = {}) {
  const graph = new GraphDiagram({ ...options, vertices, edges, directed: false });
  if (options.layout !== false) graph.changeLayout(options.layout || "spring");
  return graph;
}

export function createDiGraph(vertices, edges, options = {}) {
  const graph = new GraphDiagram({ ...options, vertices, edges, directed: true });
  if (options.layout !== false) graph.changeLayout(options.layout || "spring");
  return graph;
}

function normalizeVertex(vertex) {
  return typeof vertex === "object" ? vertex.id : String(vertex);
}

function resolveLabel(id, labels) {
  if (labels === false) return "";
  if (labels === true || labels == null) return id;
  return labels[id] ?? id;
}

function resolveConfig(id, config) {
  if (!config) return {};
  return { ...(config[id] || config.default || config) };
}
