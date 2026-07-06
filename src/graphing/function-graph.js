import { LineNode } from "../scene/shapes.js";
import { axesToPoint } from "./axes.js";

export function createFunctionGraph(fn, options = {}) {
  const graphRange = options.xRange || options.axes?.data?.xRange || [-5, 5, 0.1];
  const axisXRange = options.axisXRange || options.viewXRange || options.axes?.data?.xRange || graphRange;
  const yRange = options.yRange || options.axes?.data?.yRange || [-3, 3, 1];
  const width = options.width ?? options.axes?.data?.width ?? 640;
  const height = options.height ?? options.axes?.data?.height ?? 360;
  const samples = options.samples ?? 220;
  const points = [];
  const [xMin, xMax] = graphRange;
  for (let index = 0; index <= samples; index += 1) {
    const x = xMin + (xMax - xMin) * index / samples;
    const y = fn(x);
    if (Number.isFinite(y)) {
      points.push(axesToPoint(x, y, { xRange: axisXRange, yRange, width, height }));
    }
  }
  return new LineNode({
    id: options.id,
    kind: "function-graph",
    points,
    style: {
      stroke: "#2563eb",
      strokeWidth: 2.5,
      ...options.style
    },
    data: { xRange: graphRange, axisXRange, yRange, samples }
  });
}
