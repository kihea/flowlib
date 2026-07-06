import { colorToCss } from "../core/color.js";
import { createCanvasMathMeasurer, fontString, layoutMath } from "./layout.js";

export function drawMathText(ctx, node, options = {}) {
  const color = colorToCss(node.style.fill || options.color || "#0f172a");
  const layout = layoutMath(node.getMathAst(), {
    fontSize: node.fontSize,
    fontFamily: node.fontFamily,
    fontWeight: node.fontWeight,
    ...node.mathOptions,
    color,
    measureText: createCanvasMathMeasurer(ctx)
  });
  const x = alignedX(layout, node.align);
  const baseline = alignedBaseline(layout, node.baseline);
  ctx.save();
  ctx.shadowColor = "transparent";
  drawMathBox(ctx, layout, x, baseline, { color });
  ctx.restore();
  return layout;
}

export function drawMathBox(ctx, box, x = 0, baseline = 0, options = {}) {
  if (!box) return;
  if (box.type === "glyph") {
    drawGlyph(ctx, box, x, baseline, options);
  } else if (box.type === "row") {
    for (const item of box.items) {
      drawMathBox(ctx, item.box, x + item.x, baseline + item.y, options);
    }
  } else if (box.type === "fraction") {
    drawFraction(ctx, box, x, baseline, options);
  } else if (box.type === "sqrt") {
    drawSqrt(ctx, box, x, baseline, options);
  }
}

function drawGlyph(ctx, box, x, baseline, options) {
  ctx.font = fontString(box.style);
  applyCanvasTextQuality(ctx);
  ctx.fillStyle = box.style.color || options.color || "#0f172a";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(box.text, x + (box.padding?.left || 0), baseline);
}

function applyCanvasTextQuality(ctx) {
  if ("fontKerning" in ctx) ctx.fontKerning = "normal";
  if ("textRendering" in ctx) ctx.textRendering = "geometricPrecision";
}

function drawFraction(ctx, box, x, baseline, options) {
  const numX = x + (box.width - box.numerator.width) / 2;
  const denX = x + (box.width - box.denominator.width) / 2;
  const numBaseline = baseline - box.gap - box.lineWidth - box.numerator.descent;
  const denBaseline = baseline + box.gap + box.lineWidth + box.denominator.ascent;
  drawMathBox(ctx, box.numerator, numX, numBaseline, options);
  drawMathBox(ctx, box.denominator, denX, denBaseline, options);
  ctx.save();
  ctx.strokeStyle = options.color || "#0f172a";
  ctx.lineWidth = box.lineWidth;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(x + box.padding * 0.35, baseline);
  ctx.lineTo(x + box.width - box.padding * 0.35, baseline);
  ctx.stroke();
  ctx.restore();
}

function drawSqrt(ctx, box, x, baseline, options) {
  const rootX = x + box.indexWidth;
  const radicandX = rootX + box.radicalWidth + box.padding;
  const topY = baseline - box.ascent + box.topGap * 0.45;
  const bottomY = baseline + box.descent * 0.42;
  const tickY = baseline - box.descent * 0.15;
  drawMathBox(ctx, box.radicand, radicandX, baseline, options);
  if (box.index) {
    const indexBaseline = baseline - box.ascent * 0.54;
    drawMathBox(ctx, box.index, x, indexBaseline, options);
  }
  ctx.save();
  ctx.strokeStyle = options.color || box.color || "#0f172a";
  ctx.lineWidth = box.lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(rootX, tickY);
  ctx.lineTo(rootX + box.radicalWidth * 0.28, bottomY);
  ctx.lineTo(rootX + box.radicalWidth * 0.58, baseline - box.ascent * 0.13);
  ctx.lineTo(rootX + box.radicalWidth, topY);
  ctx.lineTo(x + box.width - box.padding * 0.35, topY);
  ctx.stroke();
  ctx.restore();
}

function alignedX(layout, align = "center") {
  if (align === "left" || align === "start") return 0;
  if (align === "right" || align === "end") return -layout.width;
  return -layout.width / 2;
}

function alignedBaseline(layout, baseline = "middle") {
  if (baseline === "top" || baseline === "hanging") return layout.ascent;
  if (baseline === "bottom" || baseline === "ideographic") return -layout.descent;
  if (baseline === "alphabetic") return 0;
  return (layout.ascent - layout.descent) / 2;
}
