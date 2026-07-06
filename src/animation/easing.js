export const Easings = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  spring: (t) => 1 - Math.cos(t * Math.PI * 4.5) * Math.exp(-t * 6)
};

export function resolveEase(ease) {
  if (!ease) return Easings.linear;
  if (typeof ease === "function") return ease;
  return Easings[ease] || Easings.linear;
}
