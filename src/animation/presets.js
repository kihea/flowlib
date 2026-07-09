import { clamp, Vec2 } from "../core/vec2.js";
import { Vec3 } from "../core/vec3.js";
import { resolveEase } from "./easing.js";
import { PointPathTween } from "./path-tween.js";

export function moveTo(timeline, node, position, options = {}) {
  const target = Vec2.from(position);
  return timeline.to(node.position, { x: target.x, y: target.y }, options);
}

export function shift(timeline, node, delta, options = {}) {
  const offset = Vec2.from(delta);
  return moveTo(timeline, node, node.position.clone().add(offset), options);
}

export function fadeIn(timeline, node, options = {}) {
  node.opacity = options.from ?? 0;
  return timeline.to(node, { opacity: options.to ?? 1 }, options);
}

export function fadeOut(timeline, node, options = {}) {
  return timeline.to(node, { opacity: options.to ?? 0 }, options);
}

export function scaleTo(timeline, node, scale, options = {}) {
  const value = Vec2.from(scale);
  return timeline.to(node.scale, { x: value.x, y: value.y }, options);
}

export function growToSize(timeline, node, size, options = {}) {
  const at = timeline.resolvePosition(options.at);
  const duration = options.duration ?? 0.5;
  const tweens = [];
  if ("radius" in node) {
    tweens.push(timeline.to(node, { radius: typeof size === "number" ? size : size.radius ?? size.width / 2 }, { ...options, at, duration }));
  } else if ("radiusX" in node || "radiusY" in node) {
    tweens.push(timeline.to(node, {
      radiusX: typeof size === "number" ? size : size.radiusX ?? size.width / 2,
      radiusY: typeof size === "number" ? size : size.radiusY ?? size.height / 2
    }, { ...options, at, duration }));
  } else if ("width" in node || "height" in node) {
    const value = typeof size === "number" ? { width: size, height: size } : size;
    tweens.push(timeline.to(node, {
      width: value.width ?? node.width,
      height: value.height ?? node.height
    }, { ...options, at, duration }));
  } else {
    tweens.push(scaleTo(timeline, node, size, { ...options, at, duration }));
  }
  return tweens.length === 1 ? tweens[0] : tweens;
}

export function growFromCenter(timeline, node, options = {}) {
  const originalScale = node.scale.clone();
  node.scale.set(0.001, 0.001);
  node.opacity = options.fromOpacity ?? 0;
  const at = timeline.resolvePosition(options.at);
  timeline.to(node.scale, { x: originalScale.x, y: originalScale.y }, { ...options, at, duration: options.duration ?? 0.5 });
  timeline.to(node, { opacity: options.toOpacity ?? 1 }, { ...options, at, duration: options.duration ?? 0.5 });
  return timeline;
}

export function rotateTo(timeline, node, radians, options = {}) {
  return timeline.to(node, { rotation: radians }, options);
}

export function rotateBy(timeline, node, radians, options = {}) {
  return rotateTo(timeline, node, node.rotation + radians, options);
}

export function pulse(timeline, node, options = {}) {
  const at = timeline.resolvePosition(options.at);
  const duration = options.duration ?? 0.35;
  const scale = options.scale ?? 1.12;
  timeline.to(node.scale, { x: scale, y: scale }, { ...options, duration: duration / 2, at });
  timeline.to(node.scale, { x: 1, y: 1 }, { ...options, duration: duration / 2, at: at + duration / 2 });
  return timeline;
}

export function indicate(timeline, node, options = {}) {
  const at = timeline.resolvePosition(options.at);
  const duration = options.duration ?? 0.5;
  const stroke = node.style.stroke;
  pulse(timeline, node, { ...options, at, duration, scale: options.scale ?? 1.08 });
  if (options.stroke) {
    timeline.to(node.style, { stroke: options.stroke }, { duration: duration / 2, at, ease: options.ease || "outQuad" });
    timeline.to(node.style, { stroke }, { duration: duration / 2, at: at + duration / 2, ease: options.ease || "inQuad" });
  }
  return timeline;
}

export function traceBetween(timeline, marker, from, to, options = {}) {
  const at = timeline.resolvePosition(options.at);
  marker.position.copy(from.position);
  const tweenOptions = {
    ...options,
    at,
    duration: options.duration ?? 0.7,
    ease: options.ease || "inOutCubic"
  };
  return [
    timeline.to(marker.position, { x: to.position.x }, { ...tweenOptions, from: from.position.x }),
    timeline.to(marker.position, { y: to.position.y }, { ...tweenOptions, from: from.position.y })
  ];
}

export function moveAlongPath(timeline, node, points, options = {}) {
  const at = timeline.resolvePosition(options.at);
  const tween = new PointPathTween(node, points, options);
  timeline.add(tween, at);
  return tween;
}

export function cameraPanTo(timeline, camera, position, options = {}) {
  const target = Vec2.from(position);
  return timeline.to(camera.position, { x: target.x, y: target.y }, options);
}

export function cameraZoomTo(timeline, camera, zoom, options = {}) {
  return timeline.to(camera, { zoom }, options);
}

export function cameraRotateTo(timeline, camera, rotation, options = {}) {
  return timeline.to(camera, { rotation }, options);
}

export function cameraTo(timeline, camera, options = {}) {
  const at = timeline.resolvePosition(options.at);
  const duration = options.duration ?? 0.6;
  const tweens = [];
  if (options.position) {
    tweens.push(...[].concat(cameraPanTo(timeline, camera, options.position, { ...options, at, duration })));
  }
  if (options.zoom != null) {
    tweens.push(cameraZoomTo(timeline, camera, options.zoom, { ...options, at, duration }));
  }
  if (options.rotation != null) {
    tweens.push(cameraRotateTo(timeline, camera, options.rotation, { ...options, at, duration }));
  }
  return tweens;
}

export function camera3DTo(timeline, camera, options = {}) {
  const at = timeline.resolvePosition(options.at);
  const duration = options.duration ?? 0.6;
  const tweens = [];
  if (options.position) {
    const position = Vec3.from(options.position);
    tweens.push(...[].concat(timeline.to(camera.position, { x: position.x, y: position.y, z: position.z }, { ...options, at, duration })));
  }
  if (options.target) {
    const target = Vec3.from(options.target);
    tweens.push(...[].concat(timeline.to(camera.target, { x: target.x, y: target.y, z: target.z }, { ...options, at, duration })));
  }
  if (options.up) {
    const up = Vec3.from(options.up);
    tweens.push(...[].concat(timeline.to(camera.up, { x: up.x, y: up.y, z: up.z }, { ...options, at, duration })));
  }
  if (options.offset) {
    const offset = Vec2.from(options.offset);
    tweens.push(...[].concat(timeline.to(camera.offset, { x: offset.x, y: offset.y }, { ...options, at, duration })));
  }
  if (options.zoom != null) {
    tweens.push(timeline.to(camera, { zoom: options.zoom }, { ...options, at, duration }));
  }
  if (options.focalLength != null) {
    tweens.push(timeline.to(camera, { focalLength: options.focalLength }, { ...options, at, duration }));
  }
  return tweens;
}

export function camera3DOrbitTo(timeline, camera, orbit, options = {}) {
  const current = camera.getOrbit();
  return camera3DOrbit(timeline, camera, {
    target: orbit.target,
    yaw: (orbit.yaw ?? current.yaw) - current.yaw,
    pitch: (orbit.pitch ?? current.pitch) - current.pitch,
    radius: (orbit.radius ?? current.radius) - current.radius
  }, options);
}

export function camera3DOrbitBy(timeline, camera, delta = {}, options = {}) {
  return camera3DOrbit(timeline, camera, delta, options);
}

export function camera3DOrbit(timeline, camera, delta = {}, options = {}) {
  const at = timeline.resolvePosition(options.at);
  const duration = options.duration ?? 0.8;
  const current = camera.getOrbit();
  const startTarget = camera.target.clone();
  const endTarget = delta.target || options.target ? Vec3.from(delta.target || options.target) : startTarget.clone();
  const startZoom = camera.zoom;
  const ease = resolveEase(options.ease);
  const tween = {
    startTime: at,
    delay: options.delay || 0,
    duration,
    endTime: at + (options.delay || 0) + duration,
    reset() {
      camera.setOrbit({ target: startTarget, yaw: current.yaw, pitch: current.pitch, radius: current.radius });
      return this;
    },
    seek(time) {
      if (time < this.startTime + this.delay) return this;
      const t = ease(clamp((time - this.startTime - this.delay) / this.duration, 0, 1));
      const target = lerpVec3(startTarget, endTarget, t);
      camera.setOrbit({
        target,
        yaw: current.yaw + (delta.yaw ?? 0) * t,
        pitch: current.pitch + (delta.pitch ?? 0) * t,
        radius: Math.max(camera.near ?? 0.01, current.radius + (delta.radius ?? 0) * t)
      });
      if (delta.zoom != null) camera.zoom = startZoom + delta.zoom * t;
      return this;
    }
  };
  timeline.add(tween, at);
  return tween;
}

export function camera3DPanBy(timeline, camera, delta, options = {}) {
  const value = Vec2.from(delta);
  const basis = camera.basis();
  const worldDelta = basis.right.clone().scale(value.x).add(basis.up.clone().scale(value.y));
  return camera3DTo(timeline, camera, {
    ...options,
    position: camera.position.clone().add(worldDelta),
    target: camera.target.clone().add(worldDelta)
  });
}

export function camera3DDollyTo(timeline, camera, radius, options = {}) {
  const orbit = camera.getOrbit();
  return camera3DOrbitTo(timeline, camera, { ...orbit, radius }, options);
}

export function camera3DDollyBy(timeline, camera, deltaRadius, options = {}) {
  const orbit = camera.getOrbit();
  return camera3DDollyTo(timeline, camera, Math.max(camera.near ?? 0.01, orbit.radius + deltaRadius), options);
}

function orbitPosition(target, yaw, pitch, radius) {
  const cp = Math.cos(pitch);
  return new Vec3(
    target.x + Math.sin(yaw) * cp * radius,
    target.y + Math.sin(pitch) * radius,
    target.z + Math.cos(yaw) * cp * radius
  );
}

function lerpVec3(a, b, t) {
  return new Vec3(
    a.x + (b.x - a.x) * t,
    a.y + (b.y - a.y) * t,
    a.z + (b.z - a.z) * t
  );
}

export function drawLine(timeline, node, options = {}) {
  const at = timeline.resolvePosition(options.at);
  const duration = options.duration ?? 0.8;
  const length = options.length ?? polylineLength(node.points || []);
  node.style.lineDash = [length, length];
  node.style.lineDashOffset = length;
  return timeline.to(node.style, { lineDashOffset: 0 }, {
    ease: "inOutCubic",
    ...options,
    at,
    duration
  });
}

export function cascadeIn(timeline, nodes, options = {}) {
  const list = [...nodes];
  const at = timeline.resolvePosition(options.at);
  const each = options.each ?? 0.08;
  const duration = options.duration ?? 0.45;
  const rise = options.rise ?? 18;
  const ease = options.ease || "outCubic";
  list.forEach((node, index) => {
    const start = at + index * each;
    const targetY = node.position.y;
    node.opacity = options.fromOpacity ?? 0;
    node.position.y = targetY + rise;
    timeline.to(node, { opacity: options.opacity ?? 1 }, { at: start, duration, ease });
    timeline.to(node.position, { y: targetY }, { at: start, duration, ease });
  });
  return timeline;
}

function polylineLength(points) {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    const a = Vec2.from(points[index - 1]);
    const b = Vec2.from(points[index]);
    length += a.distance(b);
  }
  return Math.max(1, length);
}
