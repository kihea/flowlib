import { Vec2 } from "../core/vec2.js";
import { GroupNode, LineNode, PathNode, TextNode } from "../scene/shapes.js";
import { ProjectedPath3DNode } from "../scene/projected-3d.js";

export function sampleParametric2D(fn, options = {}) {
  const [tMin, tMax, tStep] = options.tRange || [options.tMin ?? 0, options.tMax ?? 1, options.tStep];
  const samples = options.samples ?? (tStep ? Math.ceil(Math.abs((tMax - tMin) / tStep)) : 100);
  const points = [];
  for (let index = 0; index <= samples; index += 1) {
    const t = tMin + (tMax - tMin) * index / samples;
    const point = normalizePoint(fn(t, index));
    if (isFinitePoint(point)) {
      points.push(new Vec2(point.x, point.y));
    }
  }
  return points;
}

export function sampleParametric3D(fn, options = {}) {
  const project = options.project || ((point) => projectPoint3D(point, { ...(options.projection || {}), camera3D: options.camera3D || options.camera }));
  return sampleParametric2D((t, index) => project(normalizePoint(fn(t, index))), options);
}

export function samplePolar(fn, options = {}) {
  const scale = options.scale ?? 1;
  const yUp = options.yUp ?? true;
  return sampleParametric2D((theta) => polarToPoint(fn(theta), theta, { scale, yUp }), options);
}

export function sampleArc(options = {}) {
  const center = Vec2.from(options.center || { x: 0, y: 0 });
  const radius = options.radius ?? 1;
  const startAngle = options.startAngle ?? 0;
  const endAngle = options.endAngle ?? Math.PI * 2;
  const samples = options.samples ?? 48;
  return sampleParametric2D((theta) => ({
    x: center.x + Math.cos(theta) * radius,
    y: center.y + Math.sin(theta) * radius
  }), { tRange: [startAngle, endAngle], samples });
}

export function polarToPoint(radius, theta, options = {}) {
  const scale = options.scale ?? 1;
  const yScale = options.yUp === false ? 1 : -1;
  return {
    x: Math.cos(theta) * radius * scale,
    y: Math.sin(theta) * radius * scale * yScale
  };
}

export function projectPoint3D(point, options = {}) {
  const camera = options.camera3D || options.camera;
  if (camera && typeof camera.project === "function") {
    return camera.project(point);
  }
  const normalized = normalizePoint(point);
  const scale = options.scale ?? 100;
  const origin = Vec2.from(options.origin || { x: 0, y: 0 });
  const depth = options.depth ?? 0.58;
  const lift = options.lift ?? 0.36;
  return new Vec2(
    origin.x + (normalized.x - normalized.z * depth) * scale,
    origin.y + (-normalized.y + normalized.z * lift) * scale
  );
}

export function createParametricCurve(fn, options = {}) {
  const points = options.project3D
    ? sampleParametric3D(fn, options)
    : sampleParametric2D(fn, options);
  return new PathNode({
    id: options.id,
    points,
    closed: options.closed || false,
    style: {
      fill: "transparent",
      stroke: "#2563eb",
      strokeWidth: 2.5,
      ...options.style
    },
    data: { tRange: options.tRange, samples: options.samples }
  });
}

export function createPolarCurve(fn, options = {}) {
  return new PathNode({
    id: options.id,
    points: samplePolar(fn, options),
    closed: options.closed || false,
    style: {
      fill: "transparent",
      stroke: "#16a34a",
      strokeWidth: 2.5,
      ...options.style
    },
    data: { tRange: options.tRange, samples: options.samples }
  });
}

export function createArcPath(options = {}) {
  return new PathNode({
    id: options.id,
    points: sampleArc(options),
    closed: options.closed || false,
    style: {
      fill: "transparent",
      stroke: "#2563eb",
      strokeWidth: 2,
      ...options.style
    }
  });
}

export function createProjectedAxes3D(options = {}) {
  const scale = options.scale ?? 100;
  const xRange = options.xRange || [-1, 1];
  const yRange = options.yRange || [-1, 1];
  const zRange = options.zRange || [-1, 1];
  const camera = options.camera3D || options.camera || options.projection?.camera;
  const project = (point) => projectPoint3D(point, { ...options.projection, camera3D: camera, scale });
  const group = new GroupNode({ id: options.id || "projected-axes-3d", kind: "axes-3d", position: options.position });
  const style = { stroke: "#64748b", strokeWidth: 1.2, ...options.style };
  const labelStyle = { fill: "#475569", ...options.labelStyle };
  const axes = [
    [{ x: xRange[0], y: 0, z: 0 }, { x: xRange[1], y: 0, z: 0 }],
    [{ x: 0, y: yRange[0], z: 0 }, { x: 0, y: yRange[1], z: 0 }],
    [{ x: 0, y: 0, z: zRange[0] }, { x: 0, y: 0, z: zRange[1] }]
  ];
  group.add(...axes.map((points3D) => camera
    ? new ProjectedPath3DNode({ points3D, camera3D: camera, style })
    : new LineNode({ points: points3D.map(project), style })));
  if (options.labels !== false) {
    const xPoint = { x: xRange[1], y: 0, z: 0 };
    const yPoint = { x: 0, y: yRange[1], z: 0 };
    const zPoint = { x: 0, y: 0, z: zRange[1] };
    const xEnd = project(xPoint);
    const yEnd = project(yPoint);
    const zEnd = project(zPoint);
    group.add(
      projectedLabel(options.xLabel || "x", xPoint, { x: 16, y: 0 }, project, camera, labelStyle),
      projectedLabel(options.yLabel || "y", yPoint, { x: 0, y: -16 }, project, camera, labelStyle),
      projectedLabel(options.zLabel || "z", zPoint, { x: -16, y: 16 }, project, camera, labelStyle)
    );
  }
  return group;
}

function projectedLabel(text, point3D, offset, project, camera, style) {
  const point = project(point3D);
  const label = new TextNode({ text, x: point.x + offset.x, y: point.y + offset.y, fontSize: 12, style });
  if (camera) {
    label.addUpdater(() => {
      const next = project(point3D);
      label.position.set(next.x + offset.x, next.y + offset.y);
    });
  }
  return label;
}

function normalizePoint(point) {
  if (Array.isArray(point)) return { x: point[0] ?? 0, y: point[1] ?? 0, z: point[2] ?? 0 };
  return {
    x: point?.x ?? 0,
    y: point?.y ?? 0,
    z: point?.z ?? 0
  };
}

function isFinitePoint(point) {
  return Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z ?? 0);
}
