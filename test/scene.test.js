import assert from "node:assert/strict";
import test from "node:test";
import {
  DifferenceNode,
  EllipseNode,
  GroupNode,
  ImageNode,
  IntersectionNode,
  MathTextNode,
  RectNode,
  Scene,
  UnionNode,
  createCanvasImage,
  createSvgImage,
  svgToDataUri
} from "../src/index.js";

test("Scene bounds include nested group children", () => {
  const scene = new Scene();
  const group = new GroupNode({ x: 100, y: 50 });
  group.add(new RectNode({ width: 40, height: 20 }));
  scene.add(group);

  const bounds = scene.getSceneBounds();
  assert.equal(bounds.x, 80);
  assert.equal(bounds.y, 40);
  assert.equal(bounds.width, 40);
  assert.equal(bounds.height, 20);
});

test("BooleanShapeNode exposes operation bounds as a normal scene node", () => {
  const left = new EllipseNode({ x: -20, radiusX: 50, radiusY: 40 });
  const right = new EllipseNode({ x: 20, radiusX: 50, radiusY: 40 });
  const union = new UnionNode([left, right]);
  assert.deepEqual(union.getLocalBounds().toJSON(), { x: -70, y: -40, width: 140, height: 80 });

  const intersection = new IntersectionNode([left, right]);
  assert.deepEqual(intersection.getLocalBounds().toJSON(), { x: -30, y: -40, width: 60, height: 80 });

  const difference = new DifferenceNode([left, right]);
  assert.deepEqual(difference.getLocalBounds().toJSON(), { x: -70, y: -40, width: 100, height: 80 });
});

test("rich text and image nodes expose scene bounds", () => {
  const math = new MathTextNode({ formula: "x' = x / z", fontSize: 20 });
  assert.equal(math.kind, "math-text");
  assert.ok(math.getLocalBounds().width > 0);

  const image = new ImageNode({ width: 160, height: 90 });
  assert.deepEqual(image.getLocalBounds().toJSON(), { x: -80, y: -45, width: 160, height: 90 });
});

test("image helpers build displayable image nodes from code", () => {
  const svg = createSvgImage('<svg width="320" height="180"><rect width="320" height="180"/></svg>');
  assert.equal(svg.width, 320);
  assert.equal(svg.height, 180);
  assert.match(svg.src, /^data:image\/svg\+xml/);
  assert.match(svgToDataUri("<circle />"), /^data:image\/svg\+xml/);

  let drew = false;
  const canvas = {
    style: {},
    getContext() {
      return {
        setTransform() {},
        fillRect() {
          drew = true;
        }
      };
    },
    toDataURL() {
      return "data:image/png;base64,generated";
    }
  };
  const raster = createCanvasImage((ctx) => ctx.fillRect(0, 0, 10, 10), { canvas, width: 80, height: 40, pixelRatio: 2 });
  assert.equal(drew, true);
  assert.equal(canvas.width, 160);
  assert.equal(canvas.height, 80);
  assert.equal(raster.src, "data:image/png;base64,generated");
});
