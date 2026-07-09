import { downloadBlob } from "./video-exporter.js";

export function canvasToDataURL(canvas, options = {}) {
  if (typeof canvas?.toDataURL !== "function") {
    throw new Error("canvasToDataURL requires a canvas with toDataURL support.");
  }
  return canvas.toDataURL(options.type || "image/png", options.quality);
}

export function canvasToBlob(canvas, options = {}) {
  const type = options.type || "image/png";
  return new Promise((resolve, reject) => {
    if (typeof canvas?.toBlob !== "function") {
      reject(new Error("canvasToBlob requires a canvas with toBlob support."));
      return;
    }
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas image encoding failed."))),
      type,
      options.quality
    );
  });
}

export async function exportCanvasToPNG(canvas, filename = "flowlib.png", options = {}) {
  const blob = await canvasToBlob(canvas, { ...options, type: "image/png" });
  downloadBlob(blob, filename, options);
  return blob;
}
