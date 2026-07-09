const PI = Math.PI;
const HALF_PI = PI / 2;
const BACK_OVERSHOOT = 1.70158;
const ELASTIC_PERIOD = (2 * PI) / 3;

function outFromIn(inEase) {
  return (t) => 1 - inEase(1 - t);
}

function inOutFromIn(inEase) {
  return (t) => (t < 0.5 ? inEase(t * 2) / 2 : 1 - inEase((1 - t) * 2) / 2);
}

const inSine = (t) => 1 - Math.cos(t * HALF_PI);
const inQuad = (t) => t * t;
const inCubic = (t) => t * t * t;
const inQuart = (t) => t * t * t * t;
const inQuint = (t) => t * t * t * t * t;
const inExpo = (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10));
const inCirc = (t) => 1 - Math.sqrt(1 - t * t);
const inBack = (t) => (BACK_OVERSHOOT + 1) * t * t * t - BACK_OVERSHOOT * t * t;
const inElastic = (t) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ELASTIC_PERIOD);
};
const outBounce = (t) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
};
const inBounce = (t) => 1 - outBounce(1 - t);

export const Easings = {
  linear: (t) => t,
  inSine,
  outSine: outFromIn(inSine),
  inOutSine: inOutFromIn(inSine),
  inQuad,
  outQuad: outFromIn(inQuad),
  inOutQuad: inOutFromIn(inQuad),
  inCubic,
  outCubic: outFromIn(inCubic),
  inOutCubic: inOutFromIn(inCubic),
  inQuart,
  outQuart: outFromIn(inQuart),
  inOutQuart: inOutFromIn(inQuart),
  inQuint,
  outQuint: outFromIn(inQuint),
  inOutQuint: inOutFromIn(inQuint),
  inExpo,
  outExpo: outFromIn(inExpo),
  inOutExpo: inOutFromIn(inExpo),
  inCirc,
  outCirc: outFromIn(inCirc),
  inOutCirc: inOutFromIn(inCirc),
  inBack,
  outBack: outFromIn(inBack),
  inOutBack: inOutFromIn(inBack),
  inElastic,
  outElastic: outFromIn(inElastic),
  inOutElastic: inOutFromIn(inElastic),
  inBounce,
  outBounce,
  inOutBounce: inOutFromIn(inBounce),
  spring: (t) => 1 - Math.cos(t * PI * 4.5) * Math.exp(-t * 6)
};

export function steps(count = 1) {
  const total = Math.max(1, Math.floor(count));
  return (t) => Math.min(total, Math.floor(t * total)) / total;
}

export function cubicBezierEase(x1, y1, x2, y2) {
  const sampleX = (t) => bezierAxis(t, x1, x2);
  const sampleY = (t) => bezierAxis(t, y1, y2);
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lower = 0;
    let upper = 1;
    let t = x;
    for (let i = 0; i < 24; i += 1) {
      const current = sampleX(t);
      if (Math.abs(current - x) < 1e-5) break;
      if (current < x) lower = t;
      else upper = t;
      t = (lower + upper) / 2;
    }
    return sampleY(t);
  };
}

function bezierAxis(t, p1, p2) {
  const inverse = 1 - t;
  return 3 * inverse * inverse * t * p1 + 3 * inverse * t * t * p2 + t * t * t;
}

export function resolveEase(ease) {
  if (!ease) return Easings.linear;
  if (typeof ease === "function") return ease;
  return Easings[ease] || Easings.linear;
}
