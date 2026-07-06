import { Color } from "../core/color.js";
import { Vec2 } from "../core/vec2.js";
import { SDF_FRAGMENT_SHADER, SDF_VERTEX_SHADER, SOLID_FRAGMENT_SHADER, SOLID_VERTEX_SHADER } from "./webgl/shaders.js";

const INSTANCE_FLOATS = 22;

export class WebGL2Renderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.gl = options.gl || canvas.getContext("webgl2", { antialias: true, alpha: true });
    if (!this.gl) {
      throw new Error("WebGL2 is not available for this canvas.");
    }
    this.pixelRatio = options.pixelRatio || globalThis.devicePixelRatio || 1;
    this.shapeCapacity = options.shapeCapacity || 4096;
    this.instances = new Float32Array(this.shapeCapacity * INSTANCE_FLOATS);
    this.instanceCount = 0;
    this.lineVertices = [];
    this.#init();
  }

  resize(width = this.canvas.clientWidth || this.canvas.width, height = this.canvas.clientHeight || this.canvas.height) {
    const ratio = this.pixelRatio;
    const displayWidth = Math.max(1, Math.floor(width));
    const displayHeight = Math.max(1, Math.floor(height));
    if (this.canvas.width !== displayWidth * ratio || this.canvas.height !== displayHeight * ratio) {
      this.canvas.width = displayWidth * ratio;
      this.canvas.height = displayHeight * ratio;
      this.canvas.style.width = `${displayWidth}px`;
      this.canvas.style.height = `${displayHeight}px`;
    }
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    return this;
  }

  render(scene) {
    const gl = this.gl;
    const width = this.canvas.width;
    const height = this.canvas.height;
    scene.camera.resize(width / this.pixelRatio, height / this.pixelRatio);
    const background = scene.background || Color.from("#ffffff");

    this.instanceCount = 0;
    this.lineVertices.length = 0;
    this.#collect(scene);

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(background.r, background.g, background.b, background.a);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.#drawShapes();
    this.#drawLines();
  }

  #init() {
    const gl = this.gl;
    this.shapeProgram = createProgram(gl, SDF_VERTEX_SHADER, SDF_FRAGMENT_SHADER);
    this.lineProgram = createProgram(gl, SOLID_VERTEX_SHADER, SOLID_FRAGMENT_SHADER);

    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, 1, 1,
      -1, -1, 1, 1, -1, 1
    ]), gl.STATIC_DRAW);

    this.instanceBuffer = gl.createBuffer();
    this.lineBuffer = gl.createBuffer();
    this.shapeVao = gl.createVertexArray();

    gl.bindVertexArray(this.shapeVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    enableAttribute(gl, this.shapeProgram, "a_unit", 2, 2 * 4, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    const attrs = [
      ["a_center", 2],
      ["a_axisX", 2],
      ["a_axisY", 2],
      ["a_halfSize", 2],
      ["a_radius", 1],
      ["a_shape", 1],
      ["a_fill", 4],
      ["a_stroke", 4],
      ["a_strokeWidth", 1],
      ["a_opacity", 1],
      ["a_reserved", 2]
    ];
    let offset = 0;
    for (const [name, size] of attrs) {
      enableAttribute(gl, this.shapeProgram, name, size, INSTANCE_FLOATS * 4, offset * 4, 1);
      offset += size;
    }
    gl.bindVertexArray(null);
  }

  #collect(scene) {
    const camera = scene.camera;
    for (const child of scene.children) {
      child.traverse((node, matrix, opacity) => {
        if (node.kind === "rect") {
          this.#pushShape(node, matrix, camera, opacity, 0, node.width, node.height, node.cornerRadius || 0);
        } else if (node.kind === "circle") {
          this.#pushShape(node, matrix, camera, opacity, 1, node.radius * 2, node.radius * 2, node.radius);
        } else if (node.kind === "ellipse") {
          this.#pushShape(node, matrix, camera, opacity, 1, node.radiusX * 2, node.radiusY * 2, 0);
        } else if (node.kind === "line" || node.kind === "diagram-edge") {
          this.#pushLine(node, matrix, camera, opacity);
        }
      });
    }
  }

  #pushShape(node, matrix, camera, opacity, shape, width, height, radius) {
    if (this.instanceCount >= this.shapeCapacity) return;
    const center = camera.worldToScreen(matrix.apply({ x: 0, y: 0 }));
    const xAxis = camera.worldToScreen(matrix.apply({ x: width / 2, y: 0 })).sub(center);
    const yAxis = camera.worldToScreen(matrix.apply({ x: 0, y: height / 2 })).sub(center);
    const fill = Color.from(node.style.fill || "#ffffff").toArray();
    const stroke = Color.from(node.style.stroke || "transparent").toArray();
    const strokeWidth = node.style.strokeWidth ?? 0;
    const base = this.instanceCount * INSTANCE_FLOATS;
    const values = [
      center.x * this.pixelRatio, center.y * this.pixelRatio,
      xAxis.x * this.pixelRatio, xAxis.y * this.pixelRatio,
      yAxis.x * this.pixelRatio, yAxis.y * this.pixelRatio,
      Math.abs(xAxis.length()) * this.pixelRatio, Math.abs(yAxis.length()) * this.pixelRatio,
      radius * camera.zoom * this.pixelRatio,
      shape,
      ...fill,
      ...stroke,
      strokeWidth * camera.zoom * this.pixelRatio,
      opacity,
      0, 0
    ];
    this.instances.set(values, base);
    this.instanceCount += 1;
  }

  #pushLine(node, matrix, camera, opacity) {
    if (node.points.length < 2) return;
    const color = Color.from(node.style.stroke || "#334155").toArray();
    const width = (node.style.strokeWidth ?? 1) * camera.zoom * this.pixelRatio;
    for (let index = 0; index < node.points.length - 1; index += 1) {
      const a = camera.worldToScreen(matrix.apply(node.points[index])).scale(this.pixelRatio);
      const b = camera.worldToScreen(matrix.apply(node.points[index + 1])).scale(this.pixelRatio);
      pushLineSegment(this.lineVertices, a, b, width, color, opacity);
    }
  }

  #drawShapes() {
    if (this.instanceCount === 0) return;
    const gl = this.gl;
    gl.useProgram(this.shapeProgram);
    gl.uniform2f(gl.getUniformLocation(this.shapeProgram, "u_resolution"), this.canvas.width, this.canvas.height);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.instances.subarray(0, this.instanceCount * INSTANCE_FLOATS), gl.DYNAMIC_DRAW);
    gl.bindVertexArray(this.shapeVao);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.instanceCount);
    gl.bindVertexArray(null);
  }

  #drawLines() {
    if (this.lineVertices.length === 0) return;
    const gl = this.gl;
    gl.useProgram(this.lineProgram);
    gl.uniform2f(gl.getUniformLocation(this.lineProgram, "u_resolution"), this.canvas.width, this.canvas.height);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.lineVertices), gl.DYNAMIC_DRAW);
    const stride = 6 * 4;
    enableAttribute(gl, this.lineProgram, "a_position", 2, stride, 0, 0);
    enableAttribute(gl, this.lineProgram, "a_color", 4, stride, 2 * 4, 0);
    gl.drawArrays(gl.TRIANGLES, 0, this.lineVertices.length / 6);
  }
}

function pushLineSegment(out, a, b, width, color, opacity) {
  const delta = Vec2.sub(b, a);
  if (delta.length() === 0) return;
  const normal = delta.normalize().perp().scale(width / 2);
  const p1 = Vec2.add(a, normal);
  const p2 = Vec2.sub(a, normal);
  const p3 = Vec2.add(b, normal);
  const p4 = Vec2.sub(b, normal);
  pushVertex(out, p1, color, opacity);
  pushVertex(out, p2, color, opacity);
  pushVertex(out, p3, color, opacity);
  pushVertex(out, p2, color, opacity);
  pushVertex(out, p4, color, opacity);
  pushVertex(out, p3, color, opacity);
}

function pushVertex(out, point, color, opacity) {
  out.push(point.x, point.y, color[0], color[1], color[2], color[3] * opacity);
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertex = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || "Unable to link WebGL program.");
  }
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  return program;
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || "Unable to compile WebGL shader.");
  }
  return shader;
}

function enableAttribute(gl, program, name, size, stride, offset, divisor = 0) {
  const location = gl.getAttribLocation(program, name);
  if (location < 0) return;
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset);
  gl.vertexAttribDivisor(location, divisor);
}
