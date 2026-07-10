import { colorToCss } from "../core/color.js";
import { Mat3 } from "../core/mat3.js";
import { drawMathText } from "../math/index.js";

export class Canvas2DRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.context = options.context || canvas.getContext("2d");
    this.setPixelRatio(options.pixelRatio ?? globalThis.devicePixelRatio ?? 1);
    this.displayWidth = canvas.clientWidth || canvas.width || 1;
    this.displayHeight = canvas.clientHeight || canvas.height || 1;
    this.clear = options.clear ?? true;
  }

  setPixelRatio(pixelRatio = globalThis.devicePixelRatio ?? 1) {
    const ratio = Number(pixelRatio);
    this.pixelRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
    return this;
  }

  resize(width, height) {
    const ratio = this.pixelRatio;
    const explicit = width != null || height != null;
    const displayWidth = Math.max(1, Math.floor(width ?? (this.canvas.clientWidth || this.canvas.width)));
    const displayHeight = Math.max(1, Math.floor(height ?? (this.canvas.clientHeight || this.canvas.height)));
    const backingWidth = Math.max(1, Math.round(displayWidth * ratio));
    const backingHeight = Math.max(1, Math.round(displayHeight * ratio));
    this.displayWidth = displayWidth;
    this.displayHeight = displayHeight;
    if (this.canvas.width !== backingWidth || this.canvas.height !== backingHeight) {
      this.canvas.width = backingWidth;
      this.canvas.height = backingHeight;
      // Pin the display size with inline styles only when the caller chose the size,
      // or when the attribute write itself changed the rendered size (an element with
      // no CSS sizing). Writing measured client sizes back onto CSS-sized canvases
      // shrinks them by their border/padding on every call.
      const attributeSized = this.canvas.clientWidth !== 0 &&
        (this.canvas.clientWidth !== displayWidth || this.canvas.clientHeight !== displayHeight);
      if (explicit || attributeSized) {
        this.canvas.style.width = `${displayWidth}px`;
        this.canvas.style.height = `${displayHeight}px`;
      }
    }
    return this;
  }

  render(scene) {
    const ctx = this.context;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const logicalWidth = this.displayWidth || width / this.pixelRatio;
    const logicalHeight = this.displayHeight || height / this.pixelRatio;
    const camera = scene.camera;
    camera.resize(logicalWidth, logicalHeight);

    ctx.save();
    ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    if (this.clear) {
      ctx.clearRect(0, 0, logicalWidth, logicalHeight);
      ctx.fillStyle = scene.background.toCss();
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);
    }

    const cameraMatrix = Mat3.identity()
      .translated(camera.viewport.width / 2, camera.viewport.height / 2)
      .scaled(camera.zoom)
      .rotated(-camera.rotation)
      .translated(-camera.position.x, -camera.position.y);

    for (const child of scene.children) {
      child.traverse((node, matrix, opacity) => {
        this.#drawNode(node, Mat3.multiply(cameraMatrix, matrix), opacity);
      });
    }
    ctx.restore();
  }

  #drawNode(node, matrix, opacity) {
    if (node.kind === "group" || node.kind === "scene" || node.kind === "diagram-node" || node.kind === "diagram") return;
    const ctx = this.context;
    ctx.save();
    ctx.transform(...matrix.toCanvasTransform());
    ctx.globalAlpha *= opacity;
    applyStyle(ctx, node.style);

    if (node.kind === "rect") drawRect(ctx, node);
    else if (node.kind === "circle") drawCircle(ctx, node);
    else if (node.kind === "ellipse") drawEllipse(ctx, node);
    else if (node.kind === "polygon" || node.kind === "triangle") drawPolygon(ctx, node);
    else if (node.kind === "line" || node.kind === "diagram-edge" || node.kind === "function-graph") drawLine(ctx, node);
    else if (node.kind === "path" || node.kind === "vmobject") drawPath(ctx, node);
    else if (node.kind === "boolean-shape") drawBooleanShape(ctx, node);
    else if (node.kind === "text") drawText(ctx, node);
    else if (node.kind === "math-text") drawMathText(ctx, node);
    else if (node.kind === "image") drawImage(ctx, node);

    ctx.restore();
  }
}

function applyStyle(ctx, style = {}) {
  ctx.fillStyle = colorToCss(style.fill || "transparent");
  ctx.strokeStyle = colorToCss(style.stroke || "transparent");
  ctx.lineWidth = style.strokeWidth ?? 1;
  ctx.lineCap = style.lineCap || "round";
  ctx.lineJoin = style.lineJoin || "round";
  ctx.setLineDash(style.lineDash || []);
  ctx.lineDashOffset = style.lineDashOffset || 0;
  ctx.shadowColor = style.shadowColor || "transparent";
  ctx.shadowBlur = style.shadowBlur || 0;
  ctx.shadowOffsetX = style.shadowOffsetX || 0;
  ctx.shadowOffsetY = style.shadowOffsetY || 0;
}

function drawRect(ctx, node) {
  const x = -node.width / 2;
  const y = -node.height / 2;
  const radius = Math.min(node.cornerRadius || 0, node.width / 2, node.height / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, node.width, node.height, radius);
  fillAndStroke(ctx, node.style);
}

function drawCircle(ctx, node) {
  ctx.beginPath();
  ctx.arc(0, 0, node.radius, 0, Math.PI * 2);
  fillAndStroke(ctx, node.style);
}

function drawEllipse(ctx, node) {
  ctx.beginPath();
  ctx.ellipse(0, 0, node.radiusX, node.radiusY, 0, 0, Math.PI * 2);
  fillAndStroke(ctx, node.style);
}

function drawLine(ctx, node) {
  if (node.points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(node.points[0].x, node.points[0].y);
  for (const point of node.points.slice(1)) {
    ctx.lineTo(point.x, point.y);
  }
  if (node.closed) ctx.closePath();
  if (node.style.fill && node.closed) ctx.fill();
  if (node.style.stroke !== "transparent") ctx.stroke();
  if (node.style.markerEnd === "arrow") {
    drawArrowHead(ctx, node.points[node.points.length - 2], node.points[node.points.length - 1], node.style);
  }
}

function drawPolygon(ctx, node) {
  if (node.points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(node.points[0].x, node.points[0].y);
  for (const point of node.points.slice(1)) {
    ctx.lineTo(point.x, point.y);
  }
  if (node.closed) ctx.closePath();
  fillAndStroke(ctx, node.style);
}

function drawPath(ctx, node) {
  if (node.points?.length > 1) {
    drawLine(ctx, node);
    return;
  }
  if (!node.commands?.length) return;
  ctx.beginPath();
  for (const command of node.commands) {
    if (command.type === "move") ctx.moveTo(command.x, command.y);
    else if (command.type === "line") ctx.lineTo(command.x, command.y);
    else if (command.type === "quadratic") ctx.quadraticCurveTo(command.x1, command.y1, command.x, command.y);
    else if (command.type === "cubic") ctx.bezierCurveTo(command.x1, command.y1, command.x2, command.y2, command.x, command.y);
    else if (command.type === "arc") ctx.arc(command.x, command.y, command.radius, command.startAngle, command.endAngle, command.counterclockwise || false);
    else if (command.type === "close") ctx.closePath();
  }
  if (node.closed) ctx.closePath();
  fillAndStroke(ctx, node.style);
}

function drawBooleanShape(ctx, node) {
  if (!node.operands?.length) return;
  if (node.operation === "intersection") {
    drawIntersection(ctx, node);
  } else if (node.operation === "difference") {
    drawDifference(ctx, node);
  } else if (node.operation === "exclusion" || node.operation === "xor") {
    drawCompositePath(ctx, node.operands, "evenodd", node);
  } else {
    drawCompositePath(ctx, node.operands, "nonzero", node);
  }
}

function drawCompositePath(ctx, operands, fillRule, node) {
  ctx.beginPath();
  for (const operand of operands) appendNodePath(ctx, operand);
  fillAndStroke(ctx, node.style, fillRule);
}

function drawIntersection(ctx, node) {
  if (node.operands.length === 1) {
    drawCompositePath(ctx, node.operands, node.fillRule || "nonzero", node);
    return;
  }
  ctx.save();
  for (const operand of node.operands.slice(0, -1)) {
    ctx.beginPath();
    appendNodePath(ctx, operand);
    ctx.clip();
  }
  ctx.beginPath();
  appendNodePath(ctx, node.operands[node.operands.length - 1]);
  fillAndStroke(ctx, node.style, node.fillRule || "nonzero");
  ctx.restore();
}

function drawDifference(ctx, node) {
  if (node.operands.length === 1) {
    drawCompositePath(ctx, node.operands, node.fillRule || "nonzero", node);
    return;
  }
  ctx.save();
  ctx.beginPath();
  appendNodePath(ctx, node.operands[0]);
  ctx.clip();
  ctx.beginPath();
  for (const operand of node.operands) appendNodePath(ctx, operand);
  if (node.style.fill && node.style.fill !== "transparent") ctx.fill("evenodd");
  if (node.style.differenceStroke === "outer" && node.style.stroke && node.style.stroke !== "transparent" && (node.style.strokeWidth ?? 1) > 0) {
    // Difference shapes are fill-first by default. If a stroke is explicitly
    // requested, draw only the kept outer operand, never the removed cut edge.
    ctx.beginPath();
    appendNodePath(ctx, node.operands[0]);
    ctx.stroke();
  }
  ctx.restore();
}

function appendNodePath(ctx, node) {
  if (!node) return;
  ctx.save();
  if (typeof node.localMatrix === "function") {
    ctx.transform(...node.localMatrix().toCanvasTransform());
  }
  if (node.kind === "rect") appendRectPath(ctx, node);
  else if (node.kind === "circle") {
    ctx.moveTo(node.radius, 0);
    ctx.arc(0, 0, node.radius, 0, Math.PI * 2);
  } else if (node.kind === "ellipse") {
    ctx.moveTo(node.radiusX, 0);
    ctx.ellipse(0, 0, node.radiusX, node.radiusY, 0, 0, Math.PI * 2);
  }
  else if (node.kind === "polygon" || node.kind === "triangle") appendPointPath(ctx, node.points, node.closed);
  else if (node.kind === "line" || node.kind === "path" || node.kind === "vmobject") {
    if (node.points?.length) appendPointPath(ctx, node.points, node.closed);
    else appendCommandPath(ctx, node.commands || [], node.closed);
  }
  ctx.restore();
}

function appendRectPath(ctx, node) {
  const x = -node.width / 2;
  const y = -node.height / 2;
  const radius = Math.min(node.cornerRadius || 0, node.width / 2, node.height / 2);
  if (radius > 0 && typeof ctx.roundRect === "function") ctx.roundRect(x, y, node.width, node.height, radius);
  else ctx.rect(x, y, node.width, node.height);
}

function appendPointPath(ctx, points = [], closed = false) {
  if (points.length < 2) return;
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
  if (closed) ctx.closePath();
}

function appendCommandPath(ctx, commands = [], closed = false) {
  for (const command of commands) {
    if (command.type === "move") ctx.moveTo(command.x, command.y);
    else if (command.type === "line") ctx.lineTo(command.x, command.y);
    else if (command.type === "quadratic") ctx.quadraticCurveTo(command.x1, command.y1, command.x, command.y);
    else if (command.type === "cubic") ctx.bezierCurveTo(command.x1, command.y1, command.x2, command.y2, command.x, command.y);
    else if (command.type === "arc") ctx.arc(command.x, command.y, command.radius, command.startAngle, command.endAngle, command.counterclockwise || false);
    else if (command.type === "close") ctx.closePath();
  }
  if (closed) ctx.closePath();
}

function drawText(ctx, node) {
  ctx.shadowColor = "transparent";
  ctx.font = `${node.fontStyle || "normal"} ${node.fontWeight} ${node.fontSize}px ${node.fontFamily}`;
  applyTextQuality(ctx);
  ctx.textAlign = node.align;
  ctx.textBaseline = node.baseline;
  ctx.fillStyle = colorToCss(node.style.fill || "#0f172a");
  wrapText(ctx, node.text, 0, 0, node.maxWidth || 1000, node.fontSize * 1.25);
}

function drawImage(ctx, node) {
  const x = -node.width / 2;
  const y = -node.height / 2;
  const image = node.image;
  if (image?.complete && image.naturalWidth > 0) {
    ctx.drawImage(image, x, y, node.width, node.height);
  } else {
    ctx.fillStyle = colorToCss(node.style.fill || "#e2e8f0");
    ctx.fillRect(x, y, node.width, node.height);
    ctx.strokeStyle = colorToCss(node.style.stroke || "#94a3b8");
    ctx.lineWidth = node.style.strokeWidth ?? 1.5;
    ctx.strokeRect(x, y, node.width, node.height);
    ctx.fillStyle = colorToCss(node.style.textFill || "#475569");
    ctx.font = `600 ${Math.max(12, Math.min(18, node.height / 7))}px Inter, ui-sans-serif, system-ui, sans-serif`;
    applyTextQuality(ctx);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(node.alt || "Image", 0, 0, node.width - 16);
    return;
  }
  if (node.style.stroke && node.style.stroke !== "transparent" && (node.style.strokeWidth ?? 1) > 0) {
    ctx.strokeStyle = colorToCss(node.style.stroke);
    ctx.lineWidth = node.style.strokeWidth ?? 1;
    ctx.strokeRect(x, y, node.width, node.height);
  }
}

function applyTextQuality(ctx) {
  if ("fontKerning" in ctx) ctx.fontKerning = "normal";
  if ("textRendering" in ctx) ctx.textRendering = "geometricPrecision";
}

function fillAndStroke(ctx, style = {}, fillRule = "nonzero") {
  if (style.fill && style.fill !== "transparent") ctx.fill(fillRule);
  if (style.stroke && style.stroke !== "transparent" && (style.strokeWidth ?? 1) > 0) ctx.stroke();
}

function drawArrowHead(ctx, from, to, style = {}) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const size = style.markerSize || 10;
  ctx.save();
  ctx.translate(to.x, to.y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, -size * 0.55);
  ctx.lineTo(-size, size * 0.55);
  ctx.closePath();
  ctx.fillStyle = colorToCss(style.stroke || "#334155");
  ctx.fill();
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  const offset = -(lines.length - 1) * lineHeight / 2;
  lines.forEach((item, index) => ctx.fillText(item, x, y + offset + index * lineHeight, maxWidth));
}
