const GREEK = new Map([
  ["alpha", "α"],
  ["beta", "β"],
  ["gamma", "γ"],
  ["delta", "δ"],
  ["epsilon", "ε"],
  ["zeta", "ζ"],
  ["eta", "η"],
  ["theta", "θ"],
  ["iota", "ι"],
  ["kappa", "κ"],
  ["lambda", "λ"],
  ["mu", "μ"],
  ["nu", "ν"],
  ["xi", "ξ"],
  ["pi", "π"],
  ["rho", "ρ"],
  ["sigma", "σ"],
  ["tau", "τ"],
  ["upsilon", "υ"],
  ["phi", "φ"],
  ["chi", "χ"],
  ["psi", "ψ"],
  ["omega", "ω"],
  ["Gamma", "Γ"],
  ["Delta", "Δ"],
  ["Theta", "Θ"],
  ["Lambda", "Λ"],
  ["Xi", "Ξ"],
  ["Pi", "Π"],
  ["Sigma", "Σ"],
  ["Phi", "Φ"],
  ["Psi", "Ψ"],
  ["Omega", "Ω"]
]);

const SYMBOLS = new Map([
  ["infty", "∞"],
  ["in", "∈"],
  ["notin", "∉"],
  ["subset", "⊂"],
  ["subseteq", "⊆"],
  ["cup", "∪"],
  ["cap", "∩"],
  ["emptyset", "∅"],
  ["forall", "∀"],
  ["exists", "∃"],
  ["partial", "∂"],
  ["nabla", "∇"],
  ["cdot", "·"],
  ["times", "×"],
  ["div", "÷"],
  ["pm", "±"],
  ["mp", "∓"],
  ["le", "≤"],
  ["leq", "≤"],
  ["ge", "≥"],
  ["geq", "≥"],
  ["neq", "≠"],
  ["approx", "≈"],
  ["equiv", "≡"],
  ["to", "→"],
  ["rightarrow", "→"],
  ["leftarrow", "←"],
  ["Rightarrow", "⇒"],
  ["Leftarrow", "⇐"],
  ["leftrightarrow", "↔"],
  ["degree", "°"]
]);

const FUNCTIONS = new Set([
  "sin",
  "cos",
  "tan",
  "sec",
  "csc",
  "cot",
  "asin",
  "acos",
  "atan",
  "sinh",
  "cosh",
  "tanh",
  "log",
  "ln",
  "lg",
  "exp",
  "lim",
  "min",
  "max",
  "det",
  "dim",
  "gcd",
  "mod",
  "Pr"
]);

const BIG_OPERATORS = new Map([
  ["sum", "∑"],
  ["prod", "∏"],
  ["coprod", "∐"],
  ["int", "∫"],
  ["iint", "∬"],
  ["iiint", "∭"],
  ["oint", "∮"],
  ["bigcup", "⋃"],
  ["bigcap", "⋂"]
]);

const RELAXED_COMMANDS = new Set([
  "frac",
  "sqrt",
  "root",
  ...GREEK.keys(),
  ...SYMBOLS.keys(),
  ...FUNCTIONS,
  ...BIG_OPERATORS.keys()
]);

export function parseMathText(source = "") {
  const parser = new MathParser(String(source));
  return parser.parse();
}

export function normalizeMathText(source = "") {
  return parseMathText(source);
}

class MathParser {
  constructor(source) {
    this.source = source;
    this.index = 0;
  }

  parse() {
    return this.#normalizeGroup(this.#parseExpression());
  }

  #parseExpression(stop = "") {
    const children = [];
    while (!this.#done()) {
      const char = this.#peek();
      if (stop && char === stop) {
        this.index += 1;
        break;
      }
      if (!stop && char === "}") {
        this.index += 1;
        break;
      }
      if (char === " " || char === "\n" || char === "\t") {
        this.#consumeWhitespace(children);
        continue;
      }
      const atom = this.#parseAtom();
      if (!atom) continue;
      children.push(this.#parseScripts(atom));
    }
    return { type: "group", children };
  }

  #parseAtom() {
    if (this.#done()) return null;
    const char = this.#peek();
    if (char === "{") {
      this.index += 1;
      return this.#normalizeGroup(this.#parseExpression("}"));
    }
    if (char === "(" || char === "[" || char === "|") {
      this.index += 1;
      return { type: "fence", value: char };
    }
    if (char === ")" || char === "]") {
      this.index += 1;
      return { type: "fence", value: char };
    }
    if (char === "\\") {
      this.index += 1;
      const command = this.#readCommandName();
      return this.#commandNode(command);
    }
    if (isAlpha(char)) {
      const word = this.#readWord();
      if (RELAXED_COMMANDS.has(word)) return this.#commandNode(word);
      return { type: "identifier", value: word };
    }
    return this.#symbolNode();
  }

  #parseScripts(base) {
    let sub = null;
    let sup = null;
    while (!this.#done()) {
      this.#skipWhitespace();
      const char = this.#peek();
      if (char !== "_" && char !== "^") break;
      this.index += 1;
      const body = this.#parseScriptBody();
      if (char === "_") sub = body;
      else sup = body;
    }
    if (!sub && !sup) return base;
    return { type: "script", base, sub, sup };
  }

  #parseScriptBody() {
    this.#skipWhitespace();
    if (this.#peek() === "{") {
      this.index += 1;
      return this.#normalizeGroup(this.#parseExpression("}"));
    }
    const atom = this.#parseAtom();
    return atom || { type: "space", width: 0 };
  }

  #commandNode(command) {
    if (!command) return { type: "operator", value: "\\" };
    if (command === "frac") {
      return {
        type: "fraction",
        numerator: this.#requiredGroup(),
        denominator: this.#requiredGroup()
      };
    }
    if (command === "sqrt") {
      const index = this.#optionalBracketGroup();
      return {
        type: "sqrt",
        index,
        radicand: this.#requiredGroup()
      };
    }
    if (command === "root") {
      return {
        type: "sqrt",
        index: this.#requiredGroup(),
        radicand: this.#requiredGroup()
      };
    }
    if (BIG_OPERATORS.has(command)) {
      return {
        type: "bigop",
        value: BIG_OPERATORS.get(command),
        name: command,
        limits: command !== "int" && command !== "iint" && command !== "iiint" && command !== "oint"
      };
    }
    if (FUNCTIONS.has(command)) {
      return { type: "function", value: command };
    }
    if (GREEK.has(command)) {
      return { type: "identifier", value: GREEK.get(command) };
    }
    if (SYMBOLS.has(command)) {
      return { type: "operator", value: SYMBOLS.get(command) };
    }
    return { type: "identifier", value: command };
  }

  #requiredGroup() {
    this.#skipWhitespace();
    if (this.#peek() === "{") {
      this.index += 1;
      return this.#normalizeGroup(this.#parseExpression("}"));
    }
    return this.#parseScriptBody();
  }

  #optionalBracketGroup() {
    this.#skipWhitespace();
    if (this.#peek() !== "[") return null;
    this.index += 1;
    return this.#normalizeGroup(this.#parseExpression("]"));
  }

  #symbolNode() {
    const two = this.source.slice(this.index, this.index + 2);
    const three = this.source.slice(this.index, this.index + 3);
    if (three === "...") {
      this.index += 3;
      return { type: "operator", value: "…" };
    }
    const replacements = {
      "->": "→",
      "<-": "←",
      "<=": "≤",
      ">=": "≥",
      "!=": "≠",
      "+-": "±",
      "-+": "∓"
    };
    if (replacements[two]) {
      this.index += 2;
      return { type: "operator", value: replacements[two] };
    }
    const value = this.source[this.index++];
    if ("+-=<>*/,:;".includes(value)) return { type: "operator", value };
    if ("0123456789.".includes(value)) return { type: "number", value };
    return { type: "symbol", value };
  }

  #consumeWhitespace(children) {
    const start = this.index;
    this.#skipWhitespace();
    const length = this.index - start;
    if (children.length > 0 && length > 0) {
      children.push({ type: "space", width: Math.min(0.8, 0.32 + length * 0.08) });
    }
  }

  #normalizeGroup(group) {
    if (group.children.length === 1) return group.children[0];
    return group;
  }

  #skipWhitespace() {
    while (!this.#done() && /\s/.test(this.#peek())) this.index += 1;
  }

  #readCommandName() {
    const start = this.index;
    while (!this.#done() && /[A-Za-z]/.test(this.#peek())) this.index += 1;
    if (this.index === start && !this.#done()) return this.source[this.index++];
    return this.source.slice(start, this.index);
  }

  #readWord() {
    const start = this.index;
    while (!this.#done() && /[A-Za-z]/.test(this.#peek())) this.index += 1;
    return this.source.slice(start, this.index);
  }

  #peek() {
    return this.source[this.index];
  }

  #done() {
    return this.index >= this.source.length;
  }
}

function isAlpha(value) {
  return /[A-Za-z]/.test(value);
}
