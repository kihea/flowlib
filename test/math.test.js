import assert from "node:assert/strict";
import test from "node:test";
import {
  COMPUTER_MODERN_FONT_FAMILY,
  layoutMath,
  MathTextNode,
  parseMathText,
  registerComputerModernFonts,
  registerFontFamily,
  resolveFontFamily
} from "../src/index.js";

test("math parser accepts relaxed and TeX-style fractions", () => {
  const relaxed = parseMathText("frac{x}{y}");
  const tex = parseMathText("\\frac{x}{y}");

  assert.equal(relaxed.type, "fraction");
  assert.equal(tex.type, "fraction");
  assert.equal(relaxed.numerator.value, "x");
  assert.equal(relaxed.denominator.value, "y");
});

test("math parser handles functions, exponents, subscripts, and big operators", () => {
  const ast = parseMathText("sum_{i=1}^{n} e^{-d_{i}t} sin(f_{i}t+p_{i})");

  assert.equal(ast.type, "group");
  assert.equal(ast.children[0].type, "script");
  assert.equal(ast.children[0].base.type, "bigop");
  assert.equal(ast.children[0].base.value, "∑");
  assert.equal(ast.children.some((child) => child.type === "function" && child.value === "sin"), true);
});

test("math parser preserves top-level closing square fences", () => {
  const ast = parseMathText("t in [0,200]");
  const last = ast.children[ast.children.length - 1];

  assert.equal(last.type, "fence");
  assert.equal(last.value, "]");
});

test("math layout creates stacked geometry for fractions and limits", () => {
  const fraction = layoutMath(parseMathText("frac{x}{y}"), { fontSize: 24 });
  assert.ok(fraction.width > 20);
  assert.ok(fraction.ascent > 12);
  assert.ok(fraction.descent > 12);

  const sum = layoutMath(parseMathText("sum_{i=1}^{n} x_i^2"), { fontSize: 24 });
  assert.ok(sum.ascent > 24);
  assert.ok(sum.descent > 12);
});

test("math layout keeps subscripts close to their base glyph", () => {
  const script = layoutMath(parseMathText("x_i"), { fontSize: 20 });
  const subscript = script.items[1];

  assert.ok(subscript.y > 0);
  assert.ok(subscript.y < 10.5);
});

test("MathTextNode reparses direct text mutations", () => {
  const node = new MathTextNode({ formula: "frac{x}{y}", fontSize: 20 });
  assert.equal(node.getMathAst().type, "fraction");

  node.text = "sqrt{x_1}";
  assert.equal(node.getMathAst().type, "sqrt");
  assert.ok(node.getLocalBounds().width > 0);
});

test("MathTextNode bounds honor horizontal alignment", () => {
  const left = new MathTextNode({ formula: "frac{x}{y}", align: "left", fontSize: 20 });
  const centered = new MathTextNode({ formula: "frac{x}{y}", fontSize: 20 });

  assert.equal(left.getLocalBounds().x, 0);
  assert.ok(centered.getLocalBounds().x < 0);
});

test("MathTextNode defaults to upright variables but can opt into italic identifiers", () => {
  const uprightNode = new MathTextNode({ formula: "x_i", fontSize: 20 });
  assert.equal(uprightNode.fontStyle, "normal");
  assert.equal(uprightNode.fontWeight, 400);
  assert.equal(uprightNode.mathOptions.identifierStyle, "normal");

  const uprightLayout = layoutMath(parseMathText("x_i"), { fontSize: 20, ...uprightNode.mathOptions });
  assert.equal(uprightLayout.items[0].box.style.fontStyle, "normal");

  const italicLayout = layoutMath(parseMathText("x_i"), { fontSize: 20, identifierStyle: "italic" });
  assert.equal(italicLayout.items[0].box.style.fontStyle, "italic");
});

test("font registry resolves built-in and registered aliases", () => {
  const mathFont = resolveFontFamily("math");
  assert.match(mathFont, /Flowlib CMU Serif/);
  assert.match(mathFont, /Cambria Math/);
  registerFontFamily("display-test", "Aptos Display, sans-serif");
  assert.equal(resolveFontFamily("display-test"), "Aptos Display, sans-serif");
});

test("Computer Modern font loader registers CMU faces and aliases", () => {
  registerComputerModernFonts({ baseUrl: "/assets/cmu/" });

  assert.equal(COMPUTER_MODERN_FONT_FAMILY, "Flowlib CMU Serif");
  assert.match(resolveFontFamily("cmu"), /Flowlib CMU Serif/);
  assert.match(resolveFontFamily("computer-modern"), /Flowlib CMU Serif/);
  assert.match(resolveFontFamily("math"), /Flowlib CMU Serif/);
});
