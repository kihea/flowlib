import { GroupNode, LineNode, TextNode } from "../scene/shapes.js";

export function createAxes(options = {}) {
  const xRange = options.xRange || [-5, 5, 1];
  const yRange = options.yRange || [-3, 3, 1];
  const width = options.width ?? 640;
  const height = options.height ?? 360;
  const group = new GroupNode({ id: options.id || "axes", kind: "axes", position: options.position });
  const style = { stroke: "#334155", strokeWidth: 1.5, ...options.style };
  const tickStyle = { stroke: "#94a3b8", strokeWidth: 1, ...options.tickStyle };
  const labelStyle = { fill: "#475569", ...options.labelStyle };
  const axesModel = { xRange, yRange, width, height };
  const xAxisY = axesToPoint(0, axisValue(yRange), axesModel).y;
  const yAxisX = axesToPoint(axisValue(xRange), 0, axesModel).x;

  group.data = { xRange, yRange, width, height, xAxisY, yAxisX };
  group.add(new LineNode({ points: [{ x: -width / 2, y: xAxisY }, { x: width / 2, y: xAxisY }], style }));
  group.add(new LineNode({ points: [{ x: yAxisX, y: height / 2 }, { x: yAxisX, y: -height / 2 }], style }));

  const [xMin, xMax, xStep] = xRange;
  for (let x = firstTick(xMin, xStep); x <= xMax; x += xStep) {
    const point = axesToPoint(x, 0, axesModel);
    group.add(new LineNode({ points: [{ x: point.x, y: xAxisY - 5 }, { x: point.x, y: xAxisY + 5 }], style: tickStyle }));
    if (x !== 0 && options.labels !== false) {
      group.add(new TextNode({ text: formatTick(x), x: point.x, y: xAxisY + 20, fontSize: 11, style: labelStyle }));
    }
  }

  const [yMin, yMax, yStep] = yRange;
  for (let y = firstTick(yMin, yStep); y <= yMax; y += yStep) {
    const point = axesToPoint(0, y, axesModel);
    group.add(new LineNode({ points: [{ x: yAxisX - 5, y: point.y }, { x: yAxisX + 5, y: point.y }], style: tickStyle }));
    if (y !== 0 && options.labels !== false) {
      group.add(new TextNode({ text: formatTick(y), x: yAxisX - 20, y: point.y, fontSize: 11, style: labelStyle }));
    }
  }

  return group;
}

export function axesToPoint(x, y, axes) {
  const [xMin, xMax] = axes.xRange;
  const [yMin, yMax] = axes.yRange;
  return {
    x: ((x - xMin) / (xMax - xMin) - 0.5) * axes.width,
    y: (0.5 - (y - yMin) / (yMax - yMin)) * axes.height
  };
}

function firstTick(min, step) {
  return Math.ceil(min / step) * step;
}

function formatTick(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function axisValue(range) {
  const [min, max] = range;
  if (min <= 0 && max >= 0) return 0;
  return min > 0 ? min : max;
}
