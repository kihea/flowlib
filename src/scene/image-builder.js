import { ImageNode } from "./shapes.js";

export function svgToDataUri(svg) {
  const markup = String(svg || "").trim();
  const normalized = markup.includes("<svg")
    ? markup
    : `<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`;
  const withNamespace = normalized.includes("xmlns=")
    ? normalized
    : normalized.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(withNamespace)}`;
}

export function createSvgImage(svg, options = {}) {
  const size = inferSvgSize(svg);
  return new ImageNode({
    ...options,
    width: options.width ?? size.width ?? 240,
    height: options.height ?? size.height ?? 160,
    src: svgToDataUri(svg),
    alt: options.alt || "Generated SVG image"
  });
}

export function createCanvasImage(draw, options = {}) {
  const document = options.document || globalThis.document;
  const width = Math.max(1, Math.floor(options.width ?? 240));
  const height = Math.max(1, Math.floor(options.height ?? 160));
  const pixelRatio = Math.max(1, Number(options.pixelRatio ?? globalThis.devicePixelRatio ?? 1) || 1);
  const canvas = options.canvas || document?.createElement?.("canvas");
  if (!canvas) {
    throw new Error("createCanvasImage requires a DOM document or an explicit canvas.");
  }
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  if (canvas.style) {
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }
  const ctx = canvas.getContext?.("2d");
  if (!ctx) {
    throw new Error("createCanvasImage requires a 2D canvas context.");
  }
  ctx.setTransform?.(pixelRatio, 0, 0, pixelRatio, 0, 0);
  draw?.(ctx, { canvas, width, height, pixelRatio });
  const src = options.src || canvas.toDataURL?.(options.type || "image/png", options.quality);
  return new ImageNode({
    ...options,
    width,
    height,
    src,
    image: options.image || null,
    alt: options.alt || "Generated canvas image"
  });
}

function inferSvgSize(svg) {
  const markup = String(svg || "");
  const width = readSvgNumber(markup, "width");
  const height = readSvgNumber(markup, "height");
  if (width && height) return { width, height };
  const viewBox = markup.match(/\bviewBox=["']\s*[-\d.]+\s+[-\d.]+\s+([-\d.]+)\s+([-\d.]+)\s*["']/i);
  if (viewBox) {
    return {
      width: Number(viewBox[1]) || null,
      height: Number(viewBox[2]) || null
    };
  }
  return { width: null, height: null };
}

function readSvgNumber(markup, attribute) {
  const match = markup.match(new RegExp(`\\b${attribute}=["']([\\d.]+)`, "i"));
  return match ? Number(match[1]) || null : null;
}
