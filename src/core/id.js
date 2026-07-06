const counters = new Map();

export function createId(prefix = "id") {
  const next = (counters.get(prefix) || 0) + 1;
  counters.set(prefix, next);
  return `${prefix}-${next}`;
}
