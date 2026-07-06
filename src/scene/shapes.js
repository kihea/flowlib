import { Bounds } from "../core/bounds.js";
import { Vec2 } from "../core/vec2.js";
import { DEFAULT_MATH_FONT_FAMILY, DEFAULT_TEXT_FONT_FAMILY, resolveFontFamily } from "../fonts/index.js";
import { estimateMathLayout, parseMathText } from "../math/index.js";
import { SceneNode } from "./node.js";

export class GroupNode extends SceneNode {
  constructor(options = {}) {
    super({ ...options, kind: options.kind || "group" });
  }
}

export class RectNode extends SceneNode {
  constructor(options = {}) {
    super({ ...options, kind: options.kind || "rect" });
    this.width = options.width ?? 120;
    this.height = options.height ?? 64;
    this.cornerRadius = options.cornerRadius ?? 8;
  }

  getLocalBounds() {
    return new Bounds(-this.width / 2, -this.height / 2, this.width, this.height);
  }
}

export class CircleNode extends SceneNode {
  constructor(options = {}) {
    super({ ...options, kind: options.kind || "circle" });
    this.radius = options.radius ?? 40;
  }

  getLocalBounds() {
    return new Bounds(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
  }
}

export class EllipseNode extends SceneNode {
  constructor(options = {}) {
    super({ ...options, kind: options.kind || "ellipse" });
    this.radiusX = options.radiusX ?? 60;
    this.radiusY = options.radiusY ?? 36;
  }

  getLocalBounds() {
    return new Bounds(-this.radiusX, -this.radiusY, this.radiusX * 2, this.radiusY * 2);
  }
}

export class PolygonNode extends SceneNode {
  constructor(options = {}) {
    super({ ...options, kind: options.kind || "polygon" });
    this.points = (options.points || []).map((point) => Vec2.from(point));
    this.closed = options.closed ?? true;
  }

  setPoints(points) {
    this.points = points.map((point) => Vec2.from(point));
    return this;
  }

  getLocalBounds() {
    return Bounds.fromPoints(this.points);
  }
}

export class TriangleNode extends PolygonNode {
  constructor(options = {}) {
    const width = options.width ?? 120;
    const height = options.height ?? 96;
    super({
      ...options,
      kind: options.kind || "triangle",
      points: options.points || [
        { x: 0, y: -height / 2 },
        { x: width / 2, y: height / 2 },
        { x: -width / 2, y: height / 2 }
      ]
    });
    this.width = width;
    this.height = height;
  }
}

export class LineNode extends SceneNode {
  constructor(options = {}) {
    super({ ...options, kind: options.kind || "line" });
    this.points = (options.points || []).map((point) => Vec2.from(point));
    this.closed = options.closed || false;
  }

  setPoints(points) {
    this.points = points.map((point) => Vec2.from(point));
    return this;
  }

  getLocalBounds() {
    return Bounds.fromPoints(this.points);
  }
}

export class TextNode extends SceneNode {
  constructor(options = {}) {
    super({ ...options, kind: options.kind || "text" });
    this.text = options.text || "";
    this.fontSize = options.fontSize || 16;
    this.fontFamily = resolveFontFamily(options.fontFamily || options.font || "text", DEFAULT_TEXT_FONT_FAMILY);
    this.fontWeight = options.fontWeight || 500;
    this.fontStyle = options.fontStyle || "normal";
    this.align = options.align || "center";
    this.baseline = options.baseline || "middle";
    this.maxWidth = options.maxWidth || null;
  }

  getLocalBounds() {
    const width = this.maxWidth || this.text.length * this.fontSize * 0.56;
    return new Bounds(-width / 2, -this.fontSize / 2, width, this.fontSize);
  }
}

export class MathTextNode extends TextNode {
  constructor(options = {}) {
    const mathOptions = { ...(options.mathOptions || {}) };
    if (options.identifierStyle) mathOptions.identifierStyle = options.identifierStyle;
    if (options.italicIdentifiers !== undefined) {
      mathOptions.identifierStyle = options.italicIdentifiers ? "italic" : "normal";
    }
    if (!mathOptions.identifierStyle) mathOptions.identifierStyle = "normal";
    super({
      ...options,
      kind: options.kind || "math-text",
      text: options.text || options.formula || "x / z",
      fontFamily: resolveFontFamily(options.fontFamily || options.font || "math", DEFAULT_MATH_FONT_FAMILY),
      fontStyle: options.fontStyle || "normal",
      fontWeight: options.fontWeight || 400
    });
    this.formula = this.text;
    this.mathOptions = mathOptions;
    this.mathAst = options.mathAst || null;
    this.parsedFormula = this.mathAst ? this.text : "";
  }

  setFormula(formula) {
    this.text = String(formula ?? "");
    this.formula = this.text;
    this.mathAst = null;
    this.parsedFormula = "";
    return this;
  }

  getMathAst() {
    const source = this.text || this.formula || "";
    if (!this.mathAst || this.parsedFormula !== source) {
      this.mathAst = parseMathText(source);
      this.parsedFormula = source;
      this.formula = source;
    }
    return this.mathAst;
  }

  getLocalBounds() {
    const layout = estimateMathLayout(this.getMathAst(), {
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontWeight: this.fontWeight,
      ...this.mathOptions
    });
    const width = layout.width;
    const height = layout.ascent + layout.descent;
    const x = alignedMathX(layout, this.align);
    const baseline = alignedMathBaseline(layout, this.baseline);
    return new Bounds(x, baseline - layout.ascent, width, height);
  }
}

export class ImageNode extends SceneNode {
  constructor(options = {}) {
    super({ ...options, kind: options.kind || "image" });
    this.src = options.src || "";
    this.alt = options.alt || "";
    this.width = options.width ?? 180;
    this.height = options.height ?? 120;
    this.image = options.image || null;
    if (!this.image && this.src && typeof globalThis.Image === "function") {
      this.image = new globalThis.Image();
      if (options.crossOrigin !== false) this.image.crossOrigin = options.crossOrigin || "anonymous";
      this.image.src = this.src;
    }
  }

  setSource(src) {
    this.src = src;
    if (typeof globalThis.Image === "function") {
      this.image = new globalThis.Image();
      this.image.crossOrigin = "anonymous";
      this.image.src = src;
    }
    return this;
  }

  getLocalBounds() {
    return new Bounds(-this.width / 2, -this.height / 2, this.width, this.height);
  }
}

export class PathNode extends SceneNode {
  constructor(options = {}) {
    super({ ...options, kind: options.kind || "path" });
    this.commands = options.commands || [];
    this.points = (options.points || []).map((point) => Vec2.from(point));
    this.closed = options.closed || false;
  }

  setPoints(points) {
    this.points = points.map((point) => Vec2.from(point));
    return this;
  }

  getLocalBounds() {
    if (this.points.length > 0) return Bounds.fromPoints(this.points);
    const points = [];
    for (const command of this.commands) {
      if ("x" in command && "y" in command) points.push({ x: command.x, y: command.y });
      if ("x1" in command && "y1" in command) points.push({ x: command.x1, y: command.y1 });
      if ("x2" in command && "y2" in command) points.push({ x: command.x2, y: command.y2 });
    }
    return Bounds.fromPoints(points);
  }
}

function alignedMathX(layout, align = "center") {
  if (align === "left" || align === "start") return 0;
  if (align === "right" || align === "end") return -layout.width;
  return -layout.width / 2;
}

function alignedMathBaseline(layout, baseline = "middle") {
  if (baseline === "top" || baseline === "hanging") return layout.ascent;
  if (baseline === "bottom" || baseline === "ideographic") return -layout.descent;
  if (baseline === "alphabetic") return 0;
  return (layout.ascent - layout.descent) / 2;
}
