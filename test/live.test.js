import assert from "node:assert/strict";
import test from "node:test";
import { DiagramModel, LiveDiagramEngine } from "../src/index.js";

test("LiveDiagramEngine exposes connection creation and reconnection flow", () => {
  const model = new DiagramModel();
  model.addNode({ id: "a" });
  model.addNode({ id: "b" });
  model.addNode({ id: "c" });
  const engine = new LiveDiagramEngine({
    canvas: fakeCanvas(),
    model,
    renderer: fakeRenderer()
  });

  let created = null;
  let reconnected = null;
  engine.on("connection:create", ({ edge }) => {
    created = edge;
  });
  engine.on("connection:reconnect", ({ edge }) => {
    reconnected = edge;
  });

  engine.startConnection("a");
  engine.completeConnection("b");
  assert.equal(created.source, "a");
  assert.equal(created.target, "b");

  engine.startConnection("a", { edgeId: created.id, endpoint: "target" });
  engine.completeConnection("c");
  assert.equal(reconnected.id, created.id);
  assert.equal(model.requireEdge(created.id).target, "c");
});

test("LiveDiagramEngine can commit inline node text edits", () => {
  const model = new DiagramModel();
  model.addNode({ id: "a", label: "Old" });
  const document = fakeDocument();
  const canvas = fakeCanvas();
  canvas.ownerDocument = document;
  const engine = new LiveDiagramEngine({
    canvas,
    model,
    renderer: fakeRenderer()
  });

  const input = engine.beginInlineEdit("a");
  input.value = "New";
  engine.commitInlineEdit();

  assert.equal(model.requireNode("a").label, "New");
  assert.equal(document.body.children.length, 0);
});

test("LiveDiagramEngine commits inline edits when clicking outside the editor", () => {
  const model = new DiagramModel();
  model.addNode({ id: "a", label: "Old" });
  const document = fakeDocument();
  const canvas = fakeCanvas();
  canvas.ownerDocument = document;
  const engine = new LiveDiagramEngine({
    canvas,
    model,
    renderer: fakeRenderer()
  });

  const input = engine.beginInlineEdit("a");
  input.value = "Clicked away";
  document.dispatch("pointerdown", { target: canvas });

  assert.equal(model.requireNode("a").label, "Clicked away");
  assert.equal(document.body.children.length, 0);
});

test("LiveDiagramEngine destroy removes pointer listeners", () => {
  const model = new DiagramModel();
  model.addNode({ id: "a" });
  const canvas = fakeCanvas();
  const engine = new LiveDiagramEngine({ canvas, model, renderer: fakeRenderer() });
  assert.ok(canvas.listeners.length > 0);
  engine.destroy();
  assert.equal(canvas.listeners.length, 0);
});

test("LiveDiagramEngine sync redraws diagram state", () => {
  const model = new DiagramModel();
  model.addNode({ id: "a" });
  const renderer = countingRenderer();
  const engine = new LiveDiagramEngine({ canvas: fakeCanvas(), model, renderer });

  engine.sync();

  assert.equal(renderer.renders, 1);
});

test("LiveDiagramEngine maps transformed canvas pointers to logical hit tests", () => {
  const model = new DiagramModel();
  model.addNode({ id: "a", x: 0, y: 0 });
  const canvas = fakeCanvas({
    width: 1280,
    height: 720,
    clientWidth: 1280,
    clientHeight: 720,
    rect: { left: 0, top: 0, width: 320, height: 180 }
  });
  const engine = new LiveDiagramEngine({ canvas, model, renderer: fakeRenderer() });
  engine.scene.camera.resize(1280, 720);
  engine.scene.camera.position.set(0, 0);
  engine.scene.camera.zoom = 1;
  let clicked = null;
  engine.on("node:click", ({ node }) => {
    clicked = node;
  });

  dispatch(canvas, "pointerdown", scaledPointerEvent(160, 90));
  dispatch(canvas, "pointerup", scaledPointerEvent(160, 90));

  assert.equal(clicked.id, "a");
});

function fakeCanvas(options = {}) {
  const width = options.width ?? 800;
  const height = options.height ?? 600;
  const clientWidth = options.clientWidth ?? width;
  const clientHeight = options.clientHeight ?? height;
  const rect = options.rect || { left: 0, top: 0, width: clientWidth, height: clientHeight };
  return {
    width,
    height,
    clientWidth,
    clientHeight,
    style: {},
    listeners: [],
    addEventListener(type, listener, options) {
      this.listeners.push({ type, listener, options });
    },
    removeEventListener(type, listener) {
      const index = this.listeners.findIndex((entry) => entry.type === type && entry.listener === listener);
      if (index >= 0) this.listeners.splice(index, 1);
    },
    setPointerCapture() {},
    releasePointerCapture() {},
    getBoundingClientRect() {
      return rect;
    }
  };
}

function dispatch(canvas, type, event) {
  for (const entry of canvas.listeners.filter((item) => item.type === type)) {
    entry.listener(event);
  }
}

function scaledPointerEvent(clientX, clientY) {
  return {
    button: 0,
    clientX,
    clientY,
    pointerId: 1,
    preventDefault() {}
  };
}

function fakeDocument() {
  const doc = {
    listeners: {},
    body: {
      children: [],
      appendChild(node) {
        this.children.push(node);
      }
    },
    addEventListener(type, listener) {
      this.listeners[type] ||= [];
      this.listeners[type].push(listener);
    },
    removeEventListener(type, listener) {
      const listeners = this.listeners[type] || [];
      const index = listeners.indexOf(listener);
      if (index >= 0) listeners.splice(index, 1);
    },
    dispatch(type, event) {
      for (const listener of this.listeners[type] || []) listener(event);
    },
    createElement() {
      const input = {
        value: "",
        style: {},
        listeners: {},
        setAttribute(name, value) {
          this[name] = value;
        },
        addEventListener(type, listener) {
          this.listeners[type] = listener;
        },
        removeEventListener(type, listener) {
          if (this.listeners[type] === listener) delete this.listeners[type];
        },
        focus() {},
        select() {},
        remove() {
          const index = doc.body.children.indexOf(this);
          if (index >= 0) doc.body.children.splice(index, 1);
        }
      };
      return input;
    }
  };
  return doc;
}

function fakeRenderer() {
  return {
    resize() {},
    render() {}
  };
}

function countingRenderer() {
  return {
    renders: 0,
    resize() {},
    render() {
      this.renders += 1;
    }
  };
}

test("LiveDiagramEngine view mode allows selection but blocks node dragging", () => {
  const model = new DiagramModel();
  model.addNode({ id: "a", x: 0, y: 0 });
  const canvas = fakeCanvas();
  const engine = new LiveDiagramEngine({ canvas, model, renderer: fakeRenderer(), interactions: "view" });
  engine.scene.camera.resize(800, 600);
  engine.scene.camera.position.set(0, 0);
  engine.scene.camera.zoom = 1;

  let clicked = null;
  engine.on("node:click", ({ node }) => {
    clicked = node;
  });

  dispatch(canvas, "pointerdown", scaledPointerEvent(400, 300));
  dispatch(canvas, "pointermove", scaledPointerEvent(460, 300));
  dispatch(canvas, "pointerup", scaledPointerEvent(460, 300));

  assert.equal(model.requireNode("a").position.x, 0, "node must not move in view mode");
  assert.equal(engine.scene.camera.position.x, -60, "dragging over a node pans the camera in view mode");
  assert.equal(clicked, null, "a drag gesture is not a click");
  assert.ok(engine.selection.has("a"), "selection still works in view mode");

  dispatch(canvas, "pointerdown", scaledPointerEvent(460, 300));
  dispatch(canvas, "pointerup", scaledPointerEvent(460, 300));
  assert.equal(clicked?.id, "a", "click events still fire in view mode");
});

test("LiveDiagramEngine none mode ignores pointer input entirely", () => {
  const model = new DiagramModel();
  model.addNode({ id: "a", x: 0, y: 0 });
  const canvas = fakeCanvas();
  const engine = new LiveDiagramEngine({ canvas, model, renderer: fakeRenderer(), interactions: "none" });
  engine.scene.camera.resize(800, 600);
  engine.scene.camera.position.set(0, 0);
  engine.scene.camera.zoom = 1;

  let clicked = false;
  engine.on("node:click", () => {
    clicked = true;
  });

  dispatch(canvas, "pointerdown", scaledPointerEvent(400, 300));
  dispatch(canvas, "pointerup", scaledPointerEvent(400, 300));

  assert.equal(clicked, false);
  assert.equal(engine.selection.size, 0);
});

test("LiveDiagramEngine setInteractions restores editing", () => {
  const model = new DiagramModel();
  model.addNode({ id: "a", x: 0, y: 0 });
  const canvas = fakeCanvas();
  const engine = new LiveDiagramEngine({ canvas, model, renderer: fakeRenderer(), interactions: "view" });
  engine.scene.camera.resize(800, 600);
  engine.scene.camera.position.set(0, 0);
  engine.scene.camera.zoom = 1;

  engine.setInteractions("edit");
  assert.equal(engine.interactions, "edit");

  dispatch(canvas, "pointerdown", scaledPointerEvent(400, 300));
  dispatch(canvas, "pointermove", scaledPointerEvent(460, 300));
  dispatch(canvas, "pointerup", scaledPointerEvent(460, 300));

  assert.equal(model.requireNode("a").position.x, 60, "node dragging works again in edit mode");
});

test("LiveDiagramEngine readonly option maps to view interactions", () => {
  const model = new DiagramModel();
  const engine = new LiveDiagramEngine({ canvas: fakeCanvas(), model, renderer: fakeRenderer(), readonly: true });
  assert.equal(engine.interactions, "view");
});

test("DiagramView renders a model statically without pointer listeners", async () => {
  const { DiagramView } = await import("../src/index.js");
  const model = new DiagramModel();
  model.addNode({ id: "a", label: "A" });
  model.addNode({ id: "b", label: "B" });
  model.connect("a", "b", { directed: true });
  const canvas = fakeCanvas();
  const renderer = countingRenderer();
  const view = new DiagramView({ canvas, model, renderer });

  assert.equal(canvas.listeners.length, 0, "static view must not attach pointer listeners");
  assert.ok(renderer.renders >= 1, "constructing a view renders once");

  const before = renderer.renders;
  model.addNode({ id: "c", label: "C" });
  assert.ok(renderer.renders > before, "model changes re-render the view");

  view.destroy();
  const after = renderer.renders;
  model.addNode({ id: "d" });
  assert.equal(renderer.renders, after, "destroyed views stop watching the model");
});

test("renderStaticDiagram is a one-call static presenter", async () => {
  const { renderStaticDiagram } = await import("../src/index.js");
  const model = new DiagramModel();
  model.addNode({ id: "a" });
  const canvas = fakeCanvas();
  const view = renderStaticDiagram(canvas, { model, renderer: countingRenderer() });
  assert.ok(view.renderer.renders >= 1);
  assert.equal(canvas.listeners.length, 0);
});

test("DiagramView pan-zoom mode attaches listeners and pans the camera", async () => {
  const { DiagramView } = await import("../src/index.js");
  const model = new DiagramModel();
  model.addNode({ id: "a", x: 0, y: 0 });
  const canvas = fakeCanvas();
  const view = new DiagramView({ canvas, model, renderer: countingRenderer(), interactive: true, fit: false });
  view.scene.camera.resize(800, 600);
  view.scene.camera.position.set(0, 0);
  view.scene.camera.zoom = 1;
  assert.ok(canvas.listeners.length > 0);

  dispatch(canvas, "pointerdown", scaledPointerEvent(100, 100));
  dispatch(canvas, "pointermove", scaledPointerEvent(60, 100));
  dispatch(canvas, "pointerup", scaledPointerEvent(60, 100));
  assert.equal(view.scene.camera.position.x, 40, "dragging pans the camera");

  view.destroy();
  assert.equal(canvas.listeners.length, 0);
});
