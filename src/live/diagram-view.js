import { EventEmitter } from "../core/events.js";
import { Vec2 } from "../core/vec2.js";
import { diagramToScene, syncDiagramScene } from "../diagrams/diagram-scene.js";
import { DiagramModel } from "../diagrams/model.js";
import { canvasToBlob, canvasToDataURL } from "../render/image-exporter.js";
import { Canvas2DRenderer } from "../render/canvas2d-renderer.js";
import { Scene } from "../scene/scene.js";

/**
 * DiagramView presents a DiagramModel (or a prebuilt Scene) on a canvas as a
 * static display. It never edits the model: no dragging, no inline editing,
 * no connection tools. Pass `interactive: true` to opt into pan/zoom only.
 */
export class DiagramView extends EventEmitter {
  constructor(options = {}) {
    super();
    if (!options.canvas) {
      throw new Error("DiagramView requires a canvas.");
    }
    this.canvas = options.canvas;
    this.diagramOptions = options.diagram || {};
    if (options.scene) {
      this.scene = options.scene;
      this.model = options.model || null;
      this.diagramRoot = null;
    } else {
      this.scene = new Scene({ background: options.background || "#f8fafc" });
      this.model = options.model || new DiagramModel();
      this.diagramRoot = diagramToScene(this.model, this.diagramOptions);
      this.scene.add(this.diagramRoot);
    }
    this.renderer = options.renderer || new Canvas2DRenderer(this.canvas, options.rendererOptions || {});
    this.padding = options.padding ?? 60;
    this.interactive = options.interactive === true || options.interactive === "pan-zoom";
    this.pointerDisposers = [];
    this.drag = null;
    if (options.layout && this.model) {
      options.layout.apply(this.model);
    }
    if (options.fit !== false) this.fit(this.padding);
    this.render();
    if (options.watch !== false && this.model) {
      this.modelDisposer = this.model.on("change", () => this.render());
    }
    if (this.interactive) {
      this.#bindPanZoom();
    }
  }

  render() {
    if (this.diagramRoot && this.model) {
      syncDiagramScene(this.diagramRoot, this.model, this.diagramOptions);
    }
    this.scene.step(0);
    this.renderer.resize();
    this.renderer.render(this.scene);
    return this;
  }

  fit(padding = this.padding) {
    const bounds = this.scene.getSceneBounds().pad(padding);
    const camera = this.scene.camera;
    const width = Math.max(1, this.canvas.clientWidth || this.canvas.width);
    const height = Math.max(1, this.canvas.clientHeight || this.canvas.height);
    camera.resize(width, height);
    camera.position.copy(bounds.center);
    camera.zoom = Math.min(width / Math.max(1, bounds.width), height / Math.max(1, bounds.height));
    camera.zoom = Math.max(0.05, Math.min(2.5, camera.zoom));
    return this;
  }

  setModel(model, options = {}) {
    if (!this.diagramRoot) {
      throw new Error("DiagramView.setModel requires a view constructed from a model.");
    }
    this.modelDisposer?.();
    this.model = model;
    if (options.layout) options.layout.apply(this.model);
    this.modelDisposer = this.model.on("change", () => this.render());
    if (options.fit !== false) this.fit();
    this.render();
    return this;
  }

  toDataURL(type = "image/png", quality) {
    return canvasToDataURL(this.canvas, { type, quality });
  }

  toBlob(options = {}) {
    return canvasToBlob(this.canvas, options);
  }

  destroy() {
    this.modelDisposer?.();
    this.modelDisposer = null;
    for (const dispose of this.pointerDisposers) dispose();
    this.pointerDisposers.length = 0;
    return this;
  }

  #bindPanZoom() {
    const listen = (type, listener, options) => {
      this.canvas.addEventListener?.(type, listener, options);
      this.pointerDisposers.push(() => this.canvas.removeEventListener?.(type, listener, options));
    };
    listen("pointerdown", (event) => {
      if (event.button === 2) return;
      this.canvas.setPointerCapture?.(event.pointerId);
      this.drag = {
        startScreen: this.#eventPoint(event),
        startCamera: this.scene.camera.position.clone()
      };
      event.preventDefault();
    });
    listen("pointermove", (event) => {
      if (!this.drag) return;
      const screen = this.#eventPoint(event);
      const delta = Vec2.sub(screen, this.drag.startScreen).scale(-1 / this.scene.camera.zoom);
      this.scene.camera.position.copy(this.drag.startCamera.clone().add(delta));
      this.render();
    });
    const release = (event) => {
      this.canvas.releasePointerCapture?.(event.pointerId);
      this.drag = null;
    };
    listen("pointerup", release);
    listen("pointercancel", release);
    listen("wheel", (event) => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.1 : 0.9;
      this.scene.camera.zoomAt(this.#eventPoint(event), factor);
      this.render();
    }, { passive: false });
  }

  #eventPoint(event) {
    const rect = this.canvas.getBoundingClientRect?.() || { left: 0, top: 0, width: 0, height: 0 };
    const logicalWidth = Math.max(1, this.canvas.clientWidth || this.canvas.width || rect.width || 1);
    const logicalHeight = Math.max(1, this.canvas.clientHeight || this.canvas.height || rect.height || 1);
    const scaleX = rect.width > 0 ? rect.width / logicalWidth : 1;
    const scaleY = rect.height > 0 ? rect.height / logicalHeight : 1;
    return new Vec2((event.clientX - rect.left) / scaleX, (event.clientY - rect.top) / scaleY);
  }
}

/**
 * One-call static rendering: lay out, fit, and draw a diagram model onto a
 * canvas. Returns the DiagramView so callers can re-render or export images.
 */
export function renderStaticDiagram(canvas, options = {}) {
  const config = options instanceof DiagramModel ? { model: options } : options;
  return new DiagramView({ canvas, ...config });
}
