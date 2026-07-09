import { Color } from "../core/color.js";
import { lerp } from "../core/vec2.js";

export function interpolateValue(from, to, t) {
  if (typeof from === "number" && typeof to === "number") {
    return lerp(from, to, t);
  }

  if (Array.isArray(from) && Array.isArray(to)) {
    return from.map((value, index) => interpolateValue(value, to[index] ?? value, t));
  }

  if (isColorLike(from) || isColorLike(to)) {
    const a = Color.from(from);
    const b = Color.from(to);
    return new Color(
      lerp(a.r, b.r, t),
      lerp(a.g, b.g, t),
      lerp(a.b, b.b, t),
      lerp(a.a, b.a, t)
    );
  }

  if (isPlainObject(from) && isPlainObject(to)) {
    const output = { ...from };
    for (const key of Object.keys(to)) {
      output[key] = interpolateValue(from[key], to[key], t);
    }
    return output;
  }

  return t < 1 ? from : to;
}

function isPlainObject(value) {
  return value && typeof value === "object" && value.constructor === Object;
}

function isColorLike(value) {
  return value instanceof Color || typeof value === "string" || (
    value && typeof value === "object" && "r" in value && "g" in value && "b" in value
  );
}

export function getPath(target, path) {
  const keys = Array.isArray(path) ? path : String(path).split(".");
  let current = target;
  for (const key of keys) {
    if (current == null) return undefined;
    current = current[key];
  }
  return current;
}

export function setPath(target, path, value) {
  const keys = Array.isArray(path) ? path : String(path).split(".");
  let current = target;
  for (let index = 0; index < keys.length - 1; index += 1) {
    current = current[keys[index]];
  }
  const key = keys[keys.length - 1];
  const existing = current[key];
  if (
    existing != null && typeof existing === "object" && typeof existing.clone === "function" &&
    value != null && value.constructor === Object
  ) {
    Object.assign(existing, value);
    return;
  }
  current[key] = value;
}
