import { clamp, Vec2 } from "../core/vec2.js";
import { Vec3 } from "../core/vec3.js";

export class Camera2D {
  constructor(options = {}) {
    this.position = Vec2.from(options.position || { x: 0, y: 0 });
    this.zoom = options.zoom || 1;
    this.rotation = options.rotation || 0;
    this.viewport = {
      width: options.width || 1,
      height: options.height || 1
    };
  }

  resize(width, height) {
    this.viewport.width = Math.max(1, width);
    this.viewport.height = Math.max(1, height);
    return this;
  }

  worldToScreen(point) {
    const next = Vec2.from(point).sub(this.position);
    const c = Math.cos(-this.rotation);
    const s = Math.sin(-this.rotation);
    const x = next.x * c - next.y * s;
    const y = next.x * s + next.y * c;
    return new Vec2(
      this.viewport.width / 2 + x * this.zoom,
      this.viewport.height / 2 + y * this.zoom
    );
  }

  screenToWorld(point) {
    const next = Vec2.from(point);
    const x = (next.x - this.viewport.width / 2) / this.zoom;
    const y = (next.y - this.viewport.height / 2) / this.zoom;
    const c = Math.cos(this.rotation);
    const s = Math.sin(this.rotation);
    return new Vec2(
      x * c - y * s + this.position.x,
      x * s + y * c + this.position.y
    );
  }

  pan(deltaScreen) {
    const delta = Vec2.from(deltaScreen).scale(-1 / this.zoom);
    this.position.add(delta);
    return this;
  }

  zoomAt(screenPoint, factor) {
    const before = this.screenToWorld(screenPoint);
    this.zoom = Math.max(0.02, Math.min(100, this.zoom * factor));
    const after = this.screenToWorld(screenPoint);
    this.position.add(before.sub(after));
    return this;
  }
}

export class Camera3D {
  constructor(options = {}) {
    this.position = Vec3.from(options.position || { x: 3, y: 2.2, z: 4.2 });
    this.target = Vec3.from(options.target || { x: 0, y: 0, z: 0 });
    this.up = Vec3.from(options.up || { x: 0, y: 1, z: 0 });
    this.zoom = options.zoom ?? 100;
    this.focalLength = options.focalLength ?? null;
    this.perspective = options.perspective ?? true;
    this.near = options.near ?? 0.01;
    this.offset = Vec2.from(options.offset || { x: 0, y: 0 });
    this.viewport = {
      width: options.width || 1,
      height: options.height || 1
    };
  }

  resize(width, height) {
    this.viewport.width = Math.max(1, width);
    this.viewport.height = Math.max(1, height);
    return this;
  }

  lookAt(target) {
    this.target.copy(target);
    return this;
  }

  setPosition(position) {
    this.position.copy(position);
    return this;
  }

  project(point) {
    const view = this.worldToView(point);
    const depth = Math.max(this.near, view.z);
    const focalLength = this.focalLength ?? Math.max(this.near, this.position.distance(this.target));
    const scale = this.perspective ? focalLength / depth : 1;
    return new Vec2(
      this.offset.x + view.x * this.zoom * scale,
      this.offset.y - view.y * this.zoom * scale
    );
  }

  worldToView(point) {
    const basis = this.basis();
    const rel = Vec3.sub(point, this.position);
    return new Vec3(
      rel.dot(basis.right),
      rel.dot(basis.up),
      rel.dot(basis.forward)
    );
  }

  basis() {
    const forward = Vec3.sub(this.target, this.position).normalize();
    if (forward.lengthSquared() === 0) forward.set(0, 0, -1);
    let right = Vec3.cross(forward, this.up).normalize();
    if (right.lengthSquared() === 0) right = new Vec3(1, 0, 0);
    const up = Vec3.cross(right, forward).normalize();
    return { forward, right, up };
  }

  orbit(deltaYaw = 0, deltaPitch = 0, deltaRadius = 0) {
    const orbit = this.getOrbit();
    return this.setOrbit({
      yaw: orbit.yaw + deltaYaw,
      pitch: orbit.pitch + deltaPitch,
      radius: Math.max(this.near, orbit.radius + deltaRadius)
    });
  }

  setOrbit(options = {}) {
    const current = this.getOrbit();
    const yaw = options.yaw ?? current.yaw;
    const pitch = clamp(options.pitch ?? current.pitch, -Math.PI / 2 + 0.001, Math.PI / 2 - 0.001);
    const radius = Math.max(this.near, options.radius ?? current.radius);
    const target = options.target ? Vec3.from(options.target) : this.target;
    this.target.copy(target);
    const cp = Math.cos(pitch);
    this.position.set(
      this.target.x + Math.sin(yaw) * cp * radius,
      this.target.y + Math.sin(pitch) * radius,
      this.target.z + Math.cos(yaw) * cp * radius
    );
    return this;
  }

  getOrbit() {
    const offset = Vec3.sub(this.position, this.target);
    const radius = Math.max(this.near, offset.length());
    return {
      yaw: Math.atan2(offset.x, offset.z),
      pitch: Math.asin(clamp(offset.y / radius, -1, 1)),
      radius
    };
  }

  dolly(distance) {
    const direction = Vec3.sub(this.position, this.target).normalize();
    this.position.add(direction.scale(distance));
    return this;
  }

  pan(delta) {
    const next = Vec2.from(delta);
    const basis = this.basis();
    const worldDelta = basis.right.scale(next.x).add(basis.up.scale(next.y));
    this.position.add(worldDelta);
    this.target.add(worldDelta);
    return this;
  }
}
