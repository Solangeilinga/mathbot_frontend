// Convertit le LaTeX courant en texte lisible : l'app n'a pas de moteur de rendu
// mathématique, et la synthèse vocale lirait "\frac{2}{5}" tel quel.

const SUPERSCRIPTS = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹", n: "ⁿ", x: "ˣ", "+": "⁺", "-": "⁻" };
const SUBSCRIPTS = { 0: "₀", 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉", n: "ₙ", x: "ₓ", i: "ᵢ" };

// Retourne null si un caractère n'a pas d'équivalent Unicode (on garde alors la notation brute).
const mapChars = (str, table) => {
  const out = [...str.trim()].map((c) => table[c]);
  return out.length && out.every(Boolean) ? out.join("") : null;
};
const isSimple = (s) => /^[\w.,]+$/.test(s.trim());
const wrap = (s) => (isSimple(s) ? s.trim() : `(${s.trim()})`);

export function cleanMath(input) {
  if (!input || typeof input !== "string") return input;
  let s = input;

  s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, (_, a) => `√${wrap(a)}`);
  s = s.replace(/\\(?:vec|overrightarrow)\s*\{([^{}]*)\}/g, "→$1");
  s = s.replace(/\\text\s*\{([^{}]*)\}/g, "$1");
  for (let i = 0; i < 3; i++) {
    s = s.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (_, a, b) => `${wrap(a)}/${wrap(b)}`);
  }
  s = s.replace(/\^\{\\circ\}|\^\\circ|\\circ/g, "°");
  s = s.replace(/\^(?:\{([^{}]*)\}|([0-9nx+-]))/g, (m, a, b) => mapChars(a ?? b, SUPERSCRIPTS) ?? `^${a ?? b}`);
  s = s.replace(/_(?:\{([^{}]*)\}|([0-9nxi]))/g, (m, a, b) => mapChars(a ?? b, SUBSCRIPTS) ?? `_${a ?? b}`);

  const symbols = {
    times: "×", cdot: "·", div: "÷", pm: "±",
    leq: "≤", le: "≤", geq: "≥", ge: "≥", neq: "≠", ne: "≠", approx: "≈",
    pi: "π", infty: "∞", angle: "∠", Rightarrow: "⇒", rightarrow: "→", Leftrightarrow: "⇔",
    in: "∈", cup: "∪", cap: "∩",
  };
  s = s.replace(/\\([A-Za-z]+)/g, (_, name) => symbols[name] ?? (name === "left" || name === "right" ? "" : name));

  s = s
    .replace(/\\[()[\]]/g, "")
    .replace(/\$\$?([^$\n]+)\$\$?/g, "$1")
    .replace(/\\[,;!]/g, " ")
    .replace(/\\%/g, "%");

  return s;
}
