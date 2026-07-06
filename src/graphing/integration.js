import { GroupNode, LineNode, PolygonNode, RectNode } from "../scene/shapes.js";
import { axesToPoint } from "./axes.js";
import { polarToPoint, samplePolar } from "./parametric.js";

export function createAreaUnderCurve(fn, options = {}) {
  const axes = resolveAxes(options);
  const xRange = options.xRange || [axes.xRange[0], axes.xRange[1]];
  const yBase = options.yBase ?? 0;
  const samples = options.samples ?? 80;
  const points = [axesToPoint(xRange[0], yBase, axes)];
  for (let index = 0; index <= samples; index += 1) {
    const x = xRange[0] + (xRange[1] - xRange[0]) * index / samples;
    points.push(axesToPoint(x, fn(x), axes));
  }
  points.push(axesToPoint(xRange[1], yBase, axes));
  return new PolygonNode({
    id: options.id,
    points,
    closed: true,
    style: {
      fill: "rgba(37, 99, 235, 0.18)",
      stroke: "transparent",
      ...options.style
    }
  });
}

export function createRiemannRectangles(fn, options = {}) {
  const axes = resolveAxes(options);
  const xRange = options.xRange || [axes.xRange[0], axes.xRange[1]];
  const count = options.count ?? Math.max(1, Math.ceil((xRange[1] - xRange[0]) / (options.dx || 0.25)));
  const yBase = options.yBase ?? 0;
  const sample = options.sample || "mid";
  const group = new GroupNode({ id: options.id || "riemann-rectangles", kind: "riemann-rectangles" });
  const step = (xRange[1] - xRange[0]) / count;
  for (let index = 0; index < count; index += 1) {
    const left = xRange[0] + index * step;
    const right = left + step;
    const sampleX = sample === "left" ? left : sample === "right" ? right : (left + right) / 2;
    const top = fn(sampleX);
    const bottomPoint = axesToPoint((left + right) / 2, yBase, axes);
    const topPoint = axesToPoint((left + right) / 2, top, axes);
    const leftPoint = axesToPoint(left, yBase, axes);
    const rightPoint = axesToPoint(right, yBase, axes);
    group.add(new RectNode({
      x: bottomPoint.x,
      y: (bottomPoint.y + topPoint.y) / 2,
      width: Math.abs(rightPoint.x - leftPoint.x),
      height: Math.max(1, Math.abs(bottomPoint.y - topPoint.y)),
      cornerRadius: 0,
      style: {
        fill: "rgba(37, 99, 235, 0.24)",
        stroke: "#ffffff",
        strokeWidth: 1,
        ...options.style
      }
    }));
  }
  return group;
}

export function createPolarGrid(options = {}) {
  const radius = options.radius ?? 180;
  const rings = options.rings ?? 4;
  const spokes = options.spokes ?? 12;
  const group = new GroupNode({ id: options.id || "polar-grid", kind: "polar-grid", position: options.position });
  const style = { stroke: "#cbd5e1", strokeWidth: 1, ...options.style };
  for (let ring = 1; ring <= rings; ring += 1) {
    const r = radius * ring / rings;
    group.add(new PolygonNode({
      points: Array.from({ length: 80 }, (_, index) => {
        const theta = Math.PI * 2 * index / 80;
        return { x: Math.cos(theta) * r, y: Math.sin(theta) * r };
      }),
      closed: true,
      style: { fill: "transparent", ...style }
    }));
  }
  for (let spoke = 0; spoke < spokes; spoke += 1) {
    const theta = Math.PI * 2 * spoke / spokes;
    group.add(new LineNode({ points: [{ x: 0, y: 0 }, { x: Math.cos(theta) * radius, y: Math.sin(theta) * radius }], style }));
  }
  return group;
}

export function createPolarArea(fn, options = {}) {
  const points = [{ x: 0, y: 0 }, ...samplePolar(fn, options)];
  return new PolygonNode({
    id: options.id,
    points,
    closed: true,
    style: {
      fill: "rgba(37, 99, 235, 0.18)",
      stroke: "transparent",
      ...options.style
    }
  });
}

export function createPolarSectors(fn, options = {}) {
  const [thetaMin, thetaMax] = options.tRange || options.thetaRange || [0, Math.PI / 2];
  const count = options.count ?? 8;
  const scale = options.scale ?? 1;
  const group = new GroupNode({ id: options.id || "polar-sectors", kind: "polar-sectors" });
  const step = (thetaMax - thetaMin) / count;
  for (let index = 0; index < count; index += 1) {
    const start = thetaMin + index * step;
    const end = start + step;
    const mid = (start + end) / 2;
    const radius = fn(mid);
    const arc = [];
    const arcSamples = Math.max(3, options.arcSamples ?? 8);
    for (let arcIndex = 0; arcIndex <= arcSamples; arcIndex += 1) {
      const theta = start + (end - start) * arcIndex / arcSamples;
      arc.push(polarToPoint(radius, theta, { scale, yUp: options.yUp ?? true }));
    }
    group.add(new PolygonNode({
      points: [{ x: 0, y: 0 }, ...arc],
      closed: true,
      style: {
        fill: index % 2 === 0 ? "rgba(37, 99, 235, 0.22)" : "rgba(15, 118, 110, 0.2)",
        stroke: "#ffffff",
        strokeWidth: 1,
        ...options.style
      }
    }));
  }
  return group;
}

function resolveAxes(options) {
  return {
    xRange: options.axes?.data?.xRange || options.axisXRange || options.viewXRange || options.xRange || [-5, 5, 1],
    yRange: options.axes?.data?.yRange || options.axisYRange || options.viewYRange || options.yRange || [-3, 3, 1],
    width: options.width ?? options.axes?.data?.width ?? 640,
    height: options.height ?? options.axes?.data?.height ?? 360
  };
}
