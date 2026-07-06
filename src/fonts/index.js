export const DEFAULT_TEXT_FONT_FAMILY = "Inter, Segoe UI, ui-sans-serif, system-ui, sans-serif";

export const COMPUTER_MODERN_FONT_FAMILY = "Flowlib CMU Serif";

export const DEFAULT_MATH_FONT_NAMES = [
  COMPUTER_MODERN_FONT_FAMILY,
  "CMU Serif",
  "Computer Modern Serif",
  "Computer Modern",
  "Latin Modern Math",
  "Latin Modern Roman",
  "Latin Modern Roman 10",
  "CMU Concrete",
  "STIX Two Math",
  "Cambria Math",
  "Noto Sans Math",
  "Times New Roman",
  "serif"
];

export const DEFAULT_MATH_FONT_FAMILY = DEFAULT_MATH_FONT_NAMES.map(quoteFontFamily).join(", ");

export const COMPUTER_MODERN_FONT_BASE_URL = new URL("./cmu/", import.meta.url).href;

export const COMPUTER_MODERN_FONT_FACES = [
  { file: "cmunrm.ttf", weight: "400", style: "normal" },
  { file: "cmunti.ttf", weight: "400", style: "italic" },
  { file: "cmunbx.ttf", weight: "700", style: "normal" },
  { file: "cmunbi.ttf", weight: "700", style: "italic" }
];

export const BUILT_IN_FONT_FAMILIES = new Map([
  ["text", DEFAULT_TEXT_FONT_FAMILY],
  ["sans", DEFAULT_TEXT_FONT_FAMILY],
  ["math", DEFAULT_MATH_FONT_FAMILY],
  ["serif", "Georgia, Cambria, Times New Roman, serif"],
  ["mono", "Cascadia Code, SFMono-Regular, Consolas, Liberation Mono, monospace"]
]);

export class FontRegistry {
  constructor() {
    this.families = new Map(BUILT_IN_FONT_FAMILIES);
    this.faces = [];
  }

  registerFamily(name, family) {
    this.families.set(name, family);
    return this;
  }

  resolve(nameOrFamily, fallback = DEFAULT_TEXT_FONT_FAMILY) {
    if (!nameOrFamily) return fallback;
    return this.families.get(nameOrFamily) || nameOrFamily;
  }

  registerFace(definition) {
    if (!definition?.family || !definition?.source) {
      throw new TypeError("registerFace requires { family, source }.");
    }
    this.faces.push({ descriptors: {}, ...definition });
    this.registerFamily(definition.name || definition.family, definition.family);
    return this;
  }

  async load(document = globalThis.document) {
    if (!document?.fonts || typeof globalThis.FontFace !== "function") return [];
    const loaded = [];
    for (const face of this.faces) {
      const fontFace = new globalThis.FontFace(face.family, face.source, face.descriptors || {});
      const result = await fontFace.load();
      document.fonts.add(result);
      loaded.push(result);
    }
    return loaded;
  }
}

export const globalFontRegistry = new FontRegistry();

export function registerFontFamily(name, family) {
  globalFontRegistry.registerFamily(name, family);
  return globalFontRegistry;
}

export function registerFontFace(definition) {
  globalFontRegistry.registerFace(definition);
  return globalFontRegistry;
}

export function resolveFontFamily(nameOrFamily, fallback) {
  return globalFontRegistry.resolve(nameOrFamily, fallback);
}

export function loadRegisteredFonts(document = globalThis.document) {
  return globalFontRegistry.load(document);
}

const registeredComputerModernKeys = new Set();

export function registerComputerModernFonts(options = {}) {
  const family = options.family || COMPUTER_MODERN_FONT_FAMILY;
  const baseUrl = options.baseUrl || COMPUTER_MODERN_FONT_BASE_URL;
  const display = options.display || "swap";
  const key = `${family}\0${baseUrl}`;

  if (!registeredComputerModernKeys.has(key)) {
    for (const face of COMPUTER_MODERN_FONT_FACES) {
      registerFontFace({
        family,
        source: fontFaceSource(baseUrl, face.file),
        descriptors: {
          weight: face.weight,
          style: face.style,
          display
        }
      });
    }
    registeredComputerModernKeys.add(key);
  }

  const cssFamily = quoteFontFamily(family);
  registerFontFamily("cmu", cssFamily);
  registerFontFamily("computer-modern", cssFamily);
  registerFontFamily("math", [family, ...DEFAULT_MATH_FONT_NAMES.filter((name) => name !== family)].map(quoteFontFamily).join(", "));
  return globalFontRegistry;
}

export async function loadComputerModernFonts(document = globalThis.document, options = {}) {
  registerComputerModernFonts(options);
  return loadRegisteredFonts(document);
}

function quoteFontFamily(name) {
  if (name === "serif" || name === "sans-serif" || name === "monospace" || name === "system-ui") return name;
  return `"${name}"`;
}

function fontFaceSource(baseUrl, file) {
  const root = String(baseUrl || "");
  const separator = root.endsWith("/") ? "" : "/";
  return `url("${root}${separator}${file}") format("truetype")`;
}
