import { DEFAULT_MATH_FONT_FAMILY } from "../fonts/index.js";

export function layoutMath(ast, options = {}) {
  const context = {
    fontSize: options.fontSize || 16,
    fontFamily: options.fontFamily || DEFAULT_MATH_FONT_FAMILY,
    fontWeight: options.fontWeight || 400,
    identifierStyle: options.identifierStyle || "italic",
    color: options.color || "#0f172a",
    scriptScale: options.scriptScale || 0.62,
    glyphPadding: options.glyphPadding ?? 0.08,
    measureText: options.measureText || estimateTextWidth
  };
  const box = layoutNode(ast || { type: "group", children: [] }, context);
  return normalizeBox(box);
}

export function estimateMathLayout(ast, options = {}) {
  return layoutMath(ast, { ...options, measureText: estimateTextWidth });
}

export function fontString(style) {
  return `${style.fontStyle || "normal"} ${style.fontWeight || 500} ${style.fontSize}px ${style.fontFamily}`;
}

export function createCanvasMathMeasurer(ctx) {
  return (text, style) => {
    ctx.save();
    ctx.font = fontString(style);
    const width = ctx.measureText(text).width;
    ctx.restore();
    return width;
  };
}

function layoutNode(node, context) {
  if (!node) return emptyBox(context);
  if (node.type === "group") return layoutRow(node.children || [], context);
  if (node.type === "fraction") return layoutFraction(node, context);
  if (node.type === "sqrt") return layoutSqrt(node, context);
  if (node.type === "script") return layoutScript(node, context);
  if (node.type === "bigop") return layoutGlyph(node.value, context, { variant: "bigop", source: node });
  if (node.type === "function") return layoutGlyph(node.value, context, { variant: "function" });
  if (node.type === "identifier") return layoutGlyph(node.value, context, { variant: "identifier" });
  if (node.type === "number") return layoutGlyph(node.value, context, { variant: "number" });
  if (node.type === "operator") return layoutGlyph(node.value, context, { variant: "operator" });
  if (node.type === "fence") return layoutGlyph(node.value, context, { variant: "fence" });
  if (node.type === "symbol") return layoutGlyph(node.value, context, { variant: "symbol" });
  if (node.type === "space") return {
    type: "space",
    width: (node.width || 0.32) * context.fontSize,
    ascent: context.fontSize * 0.76,
    descent: context.fontSize * 0.24,
    draw: false
  };
  return layoutGlyph(String(node.value ?? ""), context, { variant: "identifier" });
}

function layoutRow(children, context) {
  const items = [];
  let width = 0;
  let ascent = context.fontSize * 0.76;
  let descent = context.fontSize * 0.24;
  for (const child of children) {
    const box = layoutNode(child, context);
    items.push({ box, x: width, y: 0 });
    width += box.width;
    ascent = Math.max(ascent, box.ascent);
    descent = Math.max(descent, box.descent);
  }
  return { type: "row", items, width, ascent, descent };
}

function layoutGlyph(text, context, options = {}) {
  const fontSize = options.variant === "bigop" ? context.fontSize * 1.42 : context.fontSize;
  const style = {
    fontSize,
    fontFamily: context.fontFamily,
    fontWeight: context.fontWeight,
    fontStyle: options.variant === "identifier" ? context.identifierStyle : "normal",
    color: context.color
  };
  const padding = addGlyphPadding(operatorPadding(text, options.variant, context.fontSize), context, options.variant);
  const width = Math.max(0, context.measureText(text, style)) + padding.left + padding.right;
  return {
    type: "glyph",
    text,
    variant: options.variant,
    source: options.source,
    style,
    padding,
    width,
    ascent: fontSize * 0.78,
    descent: fontSize * 0.22
  };
}

function layoutFraction(node, context) {
  const childContext = scaledContext(context, 0.92);
  const numerator = layoutNode(node.numerator, childContext);
  const denominator = layoutNode(node.denominator, childContext);
  const padding = context.fontSize * 0.36;
  const gap = context.fontSize * 0.18;
  const lineWidth = Math.max(1, context.fontSize * 0.055);
  const width = Math.max(numerator.width, denominator.width) + padding * 2;
  return {
    type: "fraction",
    numerator,
    denominator,
    padding,
    gap,
    lineWidth,
    width,
    ascent: numerator.ascent + numerator.descent + gap + lineWidth,
    descent: denominator.ascent + denominator.descent + gap + lineWidth
  };
}

function layoutSqrt(node, context) {
  const radicand = layoutNode(node.radicand, context);
  const index = node.index ? layoutNode(node.index, scaledContext(context, 0.56)) : null;
  const radicalWidth = context.fontSize * 0.58;
  const padding = context.fontSize * 0.14;
  const indexWidth = index ? index.width * 0.72 : 0;
  const topGap = Math.max(2, context.fontSize * 0.12);
  const ascent = Math.max(radicand.ascent + topGap, (index?.ascent || 0) + (index?.descent || 0) + context.fontSize * 0.45);
  const descent = Math.max(radicand.descent, context.fontSize * 0.22);
  return {
    type: "sqrt",
    radicand,
    index,
    radicalWidth,
    indexWidth,
    padding,
    topGap,
    width: indexWidth + radicalWidth + padding + radicand.width + padding,
    ascent,
    descent,
    lineWidth: Math.max(1, context.fontSize * 0.055),
    color: context.color
  };
}

function layoutScript(node, context) {
  if (node.base?.type === "bigop" && node.base.limits) {
    return layoutLimitsScript(node, context);
  }
  const base = layoutNode(node.base, context);
  const scriptContext = scaledContext(context, context.scriptScale);
  const sup = node.sup ? layoutNode(node.sup, scriptContext) : null;
  const sub = node.sub ? layoutNode(node.sub, scriptContext) : null;
  const scriptGap = context.fontSize * 0.025;
  const supY = sup ? -base.ascent * 0.58 - sup.descent : 0;
  const subY = sub ? base.descent * 0.55 + sub.ascent * 0.7 : 0;
  const scriptWidth = Math.max(sup?.width || 0, sub?.width || 0);
  const items = [{ box: base, x: 0, y: 0 }];
  if (sup) items.push({ box: sup, x: base.width + scriptGap, y: supY });
  if (sub) items.push({ box: sub, x: base.width + scriptGap, y: subY });
  return {
    type: "row",
    items,
    width: base.width + (scriptWidth ? scriptGap + scriptWidth : 0),
    ascent: Math.max(base.ascent, sup ? -supY + sup.ascent : 0),
    descent: Math.max(base.descent, sub ? subY + sub.descent : 0)
  };
}

function layoutLimitsScript(node, context) {
  const base = layoutNode(node.base, context);
  const scriptContext = scaledContext(context, context.scriptScale);
  const sup = node.sup ? layoutNode(node.sup, scriptContext) : null;
  const sub = node.sub ? layoutNode(node.sub, scriptContext) : null;
  const gap = context.fontSize * 0.08;
  const width = Math.max(base.width, sup?.width || 0, sub?.width || 0);
  const items = [{ box: base, x: (width - base.width) / 2, y: 0 }];
  let ascent = base.ascent;
  let descent = base.descent;
  if (sup) {
    const y = -base.ascent - gap - sup.descent;
    items.push({ box: sup, x: (width - sup.width) / 2, y });
    ascent = Math.max(ascent, -y + sup.ascent);
  }
  if (sub) {
    const y = base.descent + gap + sub.ascent;
    items.push({ box: sub, x: (width - sub.width) / 2, y });
    descent = Math.max(descent, y + sub.descent);
  }
  return { type: "row", items, width, ascent, descent };
}

function scaledContext(context, scale) {
  return {
    ...context,
    fontSize: Math.max(5, context.fontSize * scale)
  };
}

function normalizeBox(box) {
  return {
    ...box,
    width: Math.max(0, box.width || 0),
    ascent: Math.max(0, box.ascent || 0),
    descent: Math.max(0, box.descent || 0)
  };
}

function emptyBox(context) {
  return {
    type: "row",
    items: [],
    width: 0,
    ascent: context.fontSize * 0.76,
    descent: context.fontSize * 0.24
  };
}

function operatorPadding(text, variant, fontSize) {
  if (variant !== "operator") return { left: 0, right: 0 };
  if (",:;".includes(text)) return { left: 0, right: fontSize * 0.12 };
  if ("+-=<>≤≥≠≈≡→←⇒⇐↔∈∉⊂⊆∪∩".includes(text)) {
    return { left: fontSize * 0.16, right: fontSize * 0.16 };
  }
  return { left: fontSize * 0.06, right: fontSize * 0.06 };
}

function addGlyphPadding(padding, context, variant) {
  const base = context.fontSize * context.glyphPadding;
  const left = variant === "identifier" ? base * 1.25 : base;
  const right = variant === "identifier" ? base * 1.45 : base;
  return {
    left: padding.left + left,
    right: padding.right + right
  };
}

function estimateTextWidth(text, style = {}) {
  const fontSize = style.fontSize || 16;
  let width = 0;
  for (const char of String(text)) {
    if ("il.,'`".includes(char)) width += fontSize * 0.26;
    else if ("mwMW∑∏∫".includes(char)) width += fontSize * 0.84;
    else if ("0123456789".includes(char)) width += fontSize * 0.52;
    else if (/[A-Z]/.test(char)) width += fontSize * 0.66;
    else width += fontSize * 0.55;
  }
  return width;
}
