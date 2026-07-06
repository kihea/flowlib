const named = {
  transparent: [0, 0, 0, 0],
  black: [0, 0, 0, 1],
  white: [1, 1, 1, 1],
  red: [1, 0, 0, 1],
  green: [0, 0.5, 0, 1],
  blue: [0, 0, 1, 1]
};

export class Color {
  constructor(r = 0, g = 0, b = 0, a = 1) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  static from(value, fallback = new Color()) {
    if (value instanceof Color) return value.clone();
    if (!value && value !== 0) return fallback.clone();
    if (Array.isArray(value)) return new Color(value[0] || 0, value[1] || 0, value[2] || 0, value[3] ?? 1);
    if (typeof value === "object") return new Color(value.r || 0, value.g || 0, value.b || 0, value.a ?? 1);
    if (typeof value !== "string") return fallback.clone();

    const text = value.trim().toLowerCase();
    if (named[text]) return new Color(...named[text]);

    if (text.startsWith("#")) {
      const hex = text.slice(1);
      if (hex.length === 3 || hex.length === 4) {
        const r = parseInt(hex[0] + hex[0], 16) / 255;
        const g = parseInt(hex[1] + hex[1], 16) / 255;
        const b = parseInt(hex[2] + hex[2], 16) / 255;
        const a = hex[3] ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
        return new Color(r, g, b, a);
      }
      if (hex.length === 6 || hex.length === 8) {
        const r = parseInt(hex.slice(0, 2), 16) / 255;
        const g = parseInt(hex.slice(2, 4), 16) / 255;
        const b = parseInt(hex.slice(4, 6), 16) / 255;
        const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
        return new Color(r, g, b, a);
      }
    }

    const match = text.match(/^rgba?\(([^)]+)\)$/);
    if (match) {
      const parts = match[1].split(",").map((part) => Number(part.trim()));
      return new Color(parts[0] / 255, parts[1] / 255, parts[2] / 255, parts[3] ?? 1);
    }

    return fallback.clone();
  }

  clone() {
    return new Color(this.r, this.g, this.b, this.a);
  }

  withAlpha(alpha) {
    return new Color(this.r, this.g, this.b, alpha);
  }

  toArray() {
    return [this.r, this.g, this.b, this.a];
  }

  toCss() {
    const r = Math.round(this.r * 255);
    const g = Math.round(this.g * 255);
    const b = Math.round(this.b * 255);
    return `rgba(${r}, ${g}, ${b}, ${this.a})`;
  }
}

export function colorToCss(value, fallback) {
  return Color.from(value, fallback).toCss();
}
