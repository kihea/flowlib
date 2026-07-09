import { Timeline } from "../animation/timeline.js";
import { EventEmitter } from "../core/events.js";
import { Vec2 } from "../core/vec2.js";
import { diagramToScene, syncDiagramScene } from "../diagrams/diagram-scene.js";
import { LayeredLayout } from "../diagrams/layouts/layered.js";
import { DiagramModel } from "../diagrams/model.js";
import { Canvas2DRenderer } from "../render/canvas2d-renderer.js";
import { Scene } from "../scene/scene.js";
import { GroupNode, LineNode } from "../scene/shapes.js";

export class LiveDiagramEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    if (!options.canvas) {
      throw new Error("LiveDiagramEngine requires a canvas.");
    }
    this.canvas = options.canvas;
    this.model = options.model || new DiagramModel();
    this.scene = options.scene || new Scene({ background: options.background || "#f8fafc" });
    this.diagramOptions = options.diagram || {};
    this.diagramRoot = diagramToScene(this.model, this.diagramOptions);
    this.scene.add(this.diagramRoot);
    this.overlayRoot = new GroupNode({ id: "live-overlays", kind: "live-overlays" });
    this.connectionPreview = new LineNode({
      id: "connection-preview",
      visible: false,
      style: {
        stroke: "#0f766e",
        strokeWidth: 2,
        markerEnd: "arrow",
        lineDash: [8, 8]
      }
    });
    this.overlayRoot.add(this.connectionPreview);
    this.scene.add(this.overlayRoot);
    this.renderer = options.renderer || new Canvas2DRenderer(this.canvas, options.rendererOptions || {});
    this.layout = options.layout || new LayeredLayout();
    this.timeline = new Timeline();
    this.tool = options.tool || "select";
    this.running = false;
    this.frame = 0;
    this.lastTime = 0;
    this.selection = new Set();
    this.hovered = null;
    this.drag = null;
    this.pendingConnection = null;
    this.inlineEditor = null;
    this.readonly = options.readonly || false;
    this.interactions = options.interactions || (this.readonly ? "view" : "edit");
    this.pointerDisposers = [];
    this.#bindModel();
    this.#bindPointerEvents();
  }

  start() {
    if (this.running) return this;
    this.running = true;
    this.lastTime = performance.now();
    const tick = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.1, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.timeline.step(dt);
      if (this.timeline.tracks.length > 0) {
        this.#syncDiagram();
      }
      this.scene.step(dt);
      this.render();
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
    return this;
  }

  stop() {
    this.running = false;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    return this;
  }

  destroy() {
    this.stop();
    this.cancelInlineEdit();
    this.modelDisposer?.();
    for (const dispose of this.pointerDisposers) dispose();
    this.pointerDisposers.length = 0;
    return this;
  }

  render() {
    this.renderer.resize();
    this.renderer.render(this.scene);
    return this;
  }

  sync() {
    this.#syncDiagram();
    this.render();
    return this;
  }

  applyLayout(layout = this.layout) {
    this.layout = layout;
    layout.apply(this.model);
    this.#syncDiagram();
    this.fit();
    return this;
  }

  animateLayout(layout = this.layout, options = {}) {
    const before = new Map([...this.model.nodes.values()].map((node) => [node.id, node.position.clone()]));
    layout.apply(this.model);
    const after = new Map([...this.model.nodes.values()].map((node) => [node.id, node.position.clone()]));
    for (const node of this.model.nodes.values()) {
      node.position.copy(before.get(node.id));
      this.timeline.to(node.position, { x: after.get(node.id).x, y: after.get(node.id).y }, {
        duration: options.duration ?? 0.5,
        ease: options.ease || "inOutCubic",
        at: this.timeline.time
      });
    }
    this.timeline.play();
    return this;
  }

  fit(padding = 80) {
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

  addNode(options) {
    return this.model.addNode(options);
  }

  addEdge(options) {
    return this.model.addEdge(options);
  }

  connectNodes(sourceId, targetId, options = {}) {
    return this.model.connect(sourceId, targetId, options);
  }

  disconnectNodes(sourceId, targetId, options = {}) {
    return this.model.disconnect(sourceId, targetId, options);
  }

  reconnectEdge(edgeId, endpoints, options = {}) {
    return this.model.reconnectEdge(edgeId, endpoints, options);
  }

  setModel(model, options = {}) {
    this.modelDisposer?.();
    this.model = model;
    this.layout = options.layout || this.layout;
    this.selection.clear();
    this.hovered = null;
    this.pendingConnection = null;
    this.connectionPreview.visible = false;
    this.#bindModel();
    this.#syncDiagram();
    if (options.fit !== false) this.fit();
    this.render();
    return this;
  }

  setInteractions(mode) {
    if (this.interactions === mode) return this;
    if (!["edit", "view", "none"].includes(mode)) {
      throw new Error(`Unknown interactions mode "${mode}". Use "edit", "view", or "none".`);
    }
    this.interactions = mode;
    if (mode !== "edit") {
      this.cancelConnection({ silent: true });
      this.cancelInlineEdit();
      this.setTool("select");
    }
    this.drag = null;
    this.emit("interactions:change", { interactions: mode });
    return this;
  }

  setTool(tool) {
    if (this.tool === tool) return this;
    if (tool !== "connect") {
      this.cancelConnection({ silent: true });
    }
    this.tool = tool;
    if (this.canvas.style) {
      this.canvas.style.cursor = tool === "connect" ? "crosshair" : "";
    }
    this.emit("tool:change", { tool });
    this.#syncDiagram();
    this.render();
    return this;
  }

  selectNode(id, options = {}) {
    if (!options.additive) {
      this.selection.clear();
    }
    if (id) {
      this.selection.add(id);
    }
    this.emit("selection:change", { selection: new Set(this.selection) });
    this.#syncDiagram();
    return this;
  }

  clearSelection() {
    if (this.selection.size === 0) return this;
    this.selection.clear();
    this.emit("selection:change", { selection: new Set() });
    this.#syncDiagram();
    return this;
  }

  beginInlineEdit(nodeId, options = {}) {
    const node = this.model.requireNode(nodeId);
    const doc = options.document || this.canvas.ownerDocument || globalThis.document;
    if (!doc?.createElement) {
      throw new Error("Inline editing requires a DOM document.");
    }
    this.commitInlineEdit({ silent: true });

    const input = doc.createElement("input");
    const viewport = this.#canvasViewport();
    const screen = this.scene.camera.worldToScreen(node.position);
    const display = this.#logicalToClient(screen);
    const zoom = this.scene.camera.zoom;
    input.value = node.label;
    input.setAttribute("aria-label", `Edit ${node.label}`);
    input.style.position = "fixed";
    input.style.left = `${display.x - node.width * zoom * viewport.scaleX / 2}px`;
    input.style.top = `${display.y - node.height * zoom * viewport.scaleY / 2}px`;
    input.style.width = `${Math.max(80, node.width * zoom * viewport.scaleX)}px`;
    input.style.height = `${Math.max(28, node.height * zoom * viewport.scaleY)}px`;
    input.style.border = "2px solid #2563eb";
    input.style.borderRadius = "8px";
    input.style.padding = "0 10px";
    input.style.font = "600 14px Inter, ui-sans-serif, system-ui, sans-serif";
    input.style.color = "#0f172a";
    input.style.background = "#ffffff";
    input.style.textAlign = "center";
    input.style.zIndex = "1000";
    input.style.boxShadow = "0 12px 28px rgba(15, 23, 42, 0.18)";

    const commit = () => this.commitInlineEdit();
    const cancel = () => this.cancelInlineEdit();
    const outsidePointerDown = (event) => {
      if (event.target !== input) commit();
    };
    const onKeyDown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commit();
      } else if (event.key === "Escape") {
        event.preventDefault();
        cancel();
      }
    };
    input.addEventListener("keydown", onKeyDown);
    input.addEventListener("blur", commit);
    doc.addEventListener?.("pointerdown", outsidePointerDown, true);
    doc.body.appendChild(input);
    input.focus();
    input.select();
    this.inlineEditor = {
      input,
      nodeId,
      originalLabel: node.label,
      cleanup: () => {
        input.removeEventListener?.("blur", commit);
        input.removeEventListener?.("keydown", onKeyDown);
        doc.removeEventListener?.("pointerdown", outsidePointerDown, true);
      }
    };
    this.emit("node:editstart", { node, input });
    return input;
  }

  commitInlineEdit(options = {}) {
    if (!this.inlineEditor) return this;
    const { input, nodeId, cleanup } = this.inlineEditor;
    const value = input.value.trim();
    this.inlineEditor = null;
    cleanup?.();
    input.remove();
    if (!options.silent && value) {
      const node = this.model.updateNode(nodeId, { label: value });
      this.emit("node:editcommit", { node, label: value });
    }
    return this;
  }

  cancelInlineEdit() {
    if (!this.inlineEditor) return this;
    const { input, nodeId, originalLabel, cleanup } = this.inlineEditor;
    this.inlineEditor = null;
    cleanup?.();
    input.remove();
    this.emit("node:editcancel", { node: this.model.requireNode(nodeId), label: originalLabel });
    return this;
  }

  startConnection(sourceId, options = {}) {
    const source = this.model.requireNode(sourceId);
    const edge = options.edgeId ? this.model.requireEdge(options.edgeId) : null;
    const previousTool = this.tool;
    this.pendingConnection = {
      sourceId: source.id,
      edgeId: edge?.id || null,
      endpoint: options.endpoint || "target",
      oneShot: options.oneShot ?? false
    };
    this.tool = "connect";
    if (this.canvas.style) this.canvas.style.cursor = "crosshair";
    this.connectionPreview.visible = true;
    this.connectionPreview.setPoints([source.position, source.position]);
    if (previousTool !== this.tool) {
      this.emit("tool:change", { tool: this.tool });
    }
    this.emit("connection:start", { source, edge, endpoint: this.pendingConnection.endpoint });
    this.#syncDiagram();
    this.render();
    return this;
  }

  completeConnection(targetId, options = {}) {
    if (!this.pendingConnection) return null;
    const target = this.model.requireNode(targetId);
    const pending = this.pendingConnection;
    let edge;
    if (pending.edgeId) {
      const endpoints = pending.endpoint === "source"
        ? { source: target.id, target: pending.sourceId }
        : { source: pending.sourceId, target: target.id };
      edge = this.model.reconnectEdge(pending.edgeId, endpoints, options);
      this.emit("connection:reconnect", { edge, endpoint: pending.endpoint, target });
    } else {
      edge = this.model.connect(pending.sourceId, target.id, options);
      this.emit("connection:create", { edge, source: this.model.requireNode(pending.sourceId), target });
    }
    const returnToSelect = pending.oneShot;
    this.pendingConnection = null;
    this.connectionPreview.visible = false;
    if (returnToSelect) {
      this.tool = "select";
      if (this.canvas.style) this.canvas.style.cursor = "";
      this.emit("tool:change", { tool: this.tool });
    }
    this.#syncDiagram();
    this.render();
    return edge;
  }

  cancelConnection(options = {}) {
    if (!this.pendingConnection) return this;
    const pending = this.pendingConnection;
    this.pendingConnection = null;
    this.connectionPreview.visible = false;
    if (pending.oneShot) {
      this.tool = "select";
      if (this.canvas.style) this.canvas.style.cursor = "";
      this.emit("tool:change", { tool: this.tool });
    }
    if (!options.silent) {
      this.emit("connection:cancel", { pending });
    }
    this.#syncDiagram();
    this.render();
    return this;
  }

  screenToWorld(point) {
    return this.scene.camera.screenToWorld(point);
  }

  hitTest(worldPoint) {
    const point = Vec2.from(worldPoint);
    const nodes = [...this.model.nodes.values()].reverse();
    return nodes.find((node) => {
      const halfW = node.width / 2;
      const halfH = node.height / 2;
      return point.x >= node.position.x - halfW &&
        point.x <= node.position.x + halfW &&
        point.y >= node.position.y - halfH &&
        point.y <= node.position.y + halfH;
    }) || null;
  }

  #bindModel() {
    this.modelDisposer = this.model.on("change", () => {
      this.#syncDiagram();
      this.render();
    });
  }

  #bindPointerEvents() {
    const canvas = this.canvas;
    this.#listen(canvas, "pointerdown", (event) => this.#onPointerDown(event));
    this.#listen(canvas, "pointermove", (event) => this.#onPointerMove(event));
    this.#listen(canvas, "pointerup", (event) => this.#onPointerUp(event));
    this.#listen(canvas, "pointercancel", (event) => this.#onPointerUp(event));
    this.#listen(canvas, "dblclick", (event) => this.#onDoubleClick(event));
    this.#listen(canvas, "contextmenu", (event) => this.#onContextMenu(event));
    this.#listen(canvas, "wheel", (event) => this.#onWheel(event), { passive: false });
  }

  #listen(target, type, listener, options) {
    target.addEventListener?.(type, listener, options);
    this.pointerDisposers.push(() => target.removeEventListener?.(type, listener, options));
  }

  #syncDiagram() {
    syncDiagramScene(this.diagramRoot, this.model, {
      ...this.diagramOptions,
      state: {
        selectedNodeIds: this.selection,
        hoveredNodeId: this.hovered?.id || null,
        connectingSourceId: this.pendingConnection?.sourceId || null
      }
    });
  }

  #eventPoint(event) {
    const viewport = this.#canvasViewport();
    return new Vec2(
      (event.clientX - viewport.rect.left) / viewport.scaleX,
      (event.clientY - viewport.rect.top) / viewport.scaleY
    );
  }

  #logicalToClient(point) {
    const viewport = this.#canvasViewport();
    const next = Vec2.from(point);
    return new Vec2(
      viewport.rect.left + next.x * viewport.scaleX,
      viewport.rect.top + next.y * viewport.scaleY
    );
  }

  #canvasViewport() {
    const rect = this.canvas.getBoundingClientRect();
    const logicalWidth = Math.max(1, this.canvas.clientWidth || this.canvas.width || rect.width || 1);
    const logicalHeight = Math.max(1, this.canvas.clientHeight || this.canvas.height || rect.height || 1);
    return {
      rect,
      logicalWidth,
      logicalHeight,
      scaleX: rect.width > 0 ? rect.width / logicalWidth : 1,
      scaleY: rect.height > 0 ? rect.height / logicalHeight : 1
    };
  }

  #caps() {
    if (this.interactions === "none") {
      return { pointer: false, pan: false, zoom: false, select: false, drag: false, edit: false };
    }
    if (this.interactions === "view") {
      return { pointer: true, pan: true, zoom: true, select: true, drag: false, edit: false };
    }
    const editable = !this.readonly;
    return { pointer: true, pan: true, zoom: true, select: true, drag: editable, edit: editable };
  }

  #onPointerDown(event) {
    if (event.button === 2) return;
    const caps = this.#caps();
    if (!caps.pointer) return;
    const screen = this.#eventPoint(event);
    const world = this.screenToWorld(screen);
    const node = this.hitTest(world);
    this.canvas.setPointerCapture?.(event.pointerId);

    if (this.pendingConnection) {
      if (node && (node.id !== this.pendingConnection.sourceId || this.pendingConnection.edgeId)) {
        this.completeConnection(node.id);
      } else {
        this.cancelConnection();
      }
      event.preventDefault();
      return;
    }

    if (this.tool === "connect" && node && caps.edit) {
      this.selectNode(node.id, { additive: event.shiftKey });
      this.startConnection(node.id);
      this.drag = {
        mode: "connect",
        startScreen: screen,
        moved: false
      };
      this.#updateConnectionPreview(world);
      event.preventDefault();
      return;
    }

    if (node && caps.drag) {
      this.selectNode(node.id, { additive: event.shiftKey });
      this.drag = {
        mode: "node",
        node,
        startWorld: world,
        startScreen: screen,
        startPosition: node.position.clone(),
        moved: false
      };
      this.emit("node:dragstart", { node, screen, world, nativeEvent: event });
    } else if (node && caps.select) {
      this.selectNode(node.id, { additive: event.shiftKey });
      this.drag = {
        mode: "click",
        node,
        startScreen: screen,
        startCamera: this.scene.camera.position.clone(),
        moved: false
      };
    } else if (caps.pan) {
      this.clearSelection();
      this.drag = {
        mode: "pan",
        startScreen: screen,
        startCamera: this.scene.camera.position.clone(),
        moved: false
      };
    }
    event.preventDefault();
  }

  #onPointerMove(event) {
    if (!this.#caps().pointer) return;
    const screen = this.#eventPoint(event);
    const world = this.screenToWorld(screen);
    const hovered = this.hitTest(world);
    const hoverChanged = hovered?.id !== this.hovered?.id;
    this.hovered = hovered;
    if (hoverChanged) {
      this.#syncDiagram();
    }
    if (!this.drag) {
      this.render();
      return;
    }
    this.drag.moved = this.drag.moved || screen.distance(this.drag.startScreen) > 3;
    if (this.drag.mode === "connect") {
      this.#updateConnectionPreview(world);
    } else if (this.drag.mode === "node") {
      const delta = Vec2.sub(world, this.drag.startWorld);
      this.drag.node.position.copy(this.drag.startPosition.clone().add(delta));
      this.#syncDiagram();
      this.emit("node:drag", { node: this.drag.node, screen, world, nativeEvent: event });
    } else if (this.drag.mode === "pan" || (this.drag.mode === "click" && this.#caps().pan)) {
      const delta = Vec2.sub(screen, this.drag.startScreen).scale(-1 / this.scene.camera.zoom);
      this.scene.camera.position.copy(this.drag.startCamera.clone().add(delta));
    }
    this.render();
  }

  #onPointerUp(event) {
    if (!this.#caps().pointer) return;
    const screen = this.#eventPoint(event);
    const world = this.screenToWorld(screen);
    const node = this.hitTest(world);
    const drag = this.drag;
    this.canvas.releasePointerCapture?.(event.pointerId);
    if (drag?.mode === "connect") {
      if (node && node.id !== this.pendingConnection?.sourceId) {
        this.completeConnection(node.id);
      } else {
        this.cancelConnection();
      }
    } else if (drag?.mode === "node") {
      if (drag.moved) {
        this.model.updateNode(drag.node.id, { position: drag.node.position });
        this.emit("node:dragend", { node: drag.node, screen, world, nativeEvent: event });
      } else {
        this.emit("node:click", { node: drag.node, screen, world, nativeEvent: event });
      }
    } else if (drag?.mode === "click" && !drag.moved) {
      this.emit("node:click", { node: drag.node, screen, world, nativeEvent: event });
    } else if (drag?.mode === "pan" && !drag.moved) {
      this.emit("canvas:click", { screen, world, nativeEvent: event });
    }
    this.drag = null;
  }

  #onDoubleClick(event) {
    if (!this.#caps().pointer) return;
    const screen = this.#eventPoint(event);
    const world = this.screenToWorld(screen);
    const node = this.hitTest(world);
    if (node) {
      this.emit("node:doubleclick", { node, screen, world, nativeEvent: event });
    } else {
      this.emit("canvas:doubleclick", { screen, world, nativeEvent: event });
    }
  }

  #onContextMenu(event) {
    if (!this.#caps().pointer) return;
    event.preventDefault();
    const screen = this.#eventPoint(event);
    const world = this.screenToWorld(screen);
    const node = this.hitTest(world);
    if (node) {
      this.selectNode(node.id, { additive: event.shiftKey });
      this.emit("node:contextmenu", { node, screen, world, nativeEvent: event });
    } else {
      this.emit("canvas:contextmenu", { screen, world, nativeEvent: event });
    }
  }

  #onWheel(event) {
    if (!this.#caps().zoom) return;
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.1 : 0.9;
    this.scene.camera.zoomAt(this.#eventPoint(event), factor);
    this.render();
  }

  #updateConnectionPreview(worldPoint) {
    if (!this.pendingConnection) return;
    const source = this.model.nodes.get(this.pendingConnection.sourceId);
    if (!source) return;
    const pointer = Vec2.from(worldPoint);
    const anchor = nodeBoundaryPoint(source, pointer);
    const points = this.pendingConnection.endpoint === "source"
      ? [pointer, anchor]
      : [anchor, pointer];
    this.connectionPreview.visible = true;
    this.connectionPreview.setPoints(points);
  }
}

function nodeBoundaryPoint(node, toward) {
  const target = Vec2.from(toward);
  const center = node.position.clone();
  const delta = Vec2.sub(target, center);
  if (delta.lengthSquared() === 0) return center;
  const halfW = Math.max(1, node.width / 2);
  const halfH = Math.max(1, node.height / 2);
  const scale = 1 / Math.max(Math.abs(delta.x) / halfW, Math.abs(delta.y) / halfH);
  return center.add(delta.scale(scale));
}
