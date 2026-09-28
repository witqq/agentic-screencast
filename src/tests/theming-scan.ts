// Сканер визуальных литералов: всё, что рисует инструмент, берёт цвета, шрифты, тени, радиусы,
// отступы и толщины из темы, поэтому такое значение, записанное в исходнике прямо, — дыра в
// темизации. Сканер читает содержимое строковых литералов (CSS, SVG, фильтры ffmpeg, шейдеры
// GLSL живут в строках) и сам код за пределами комментариев — там ищутся числа цвета `0xRRGGBB`.
// Комментарии не читаются: в них цвет называют словами и примерами, и это не рисует ничего.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export type Form =
  | "hex" | "rgb" | "hsl" | "named-colour" | "0xRRGGBB" | "name@alpha" | "colour-filter"
  | "glsl-colour" | "glsl-colour-term" | "font-family" | "shadow" | "radius" | "padding" | "thickness";

export interface Finding { file: string; line: number; form: Form; text: string }

interface Piece { text: string; line: number; code: boolean }

/** Исходник TypeScript → куски: содержимое строк и код без комментариев, с номером строки начала. */
export function pieces(src: string): Piece[] {
  const out: Piece[] = [];
  let i = 0, line = 1, codeStart = 0, codeLine = 1;
  const flushCode = (end: number): void => { if (end > codeStart) out.push({ text: src.slice(codeStart, end), line: codeLine, code: true }); };
  // Шаблонные строки вкладываются через ${…}: стек держит глубину фигурных скобок каждого уровня.
  const tpl: number[] = [];
  let braces = 0;
  const count = (s: string): number => (s.match(/\n/g) ?? []).length;
  while (i < src.length) {
    const c = src[i]!, n = src[i + 1];
    if (c === "/" && n === "/") { flushCode(i); const e = src.indexOf("\n", i); i = e < 0 ? src.length : e; codeStart = i; codeLine = line; continue; }
    if (c === "/" && n === "*") { flushCode(i); const e = src.indexOf("*/", i + 2); const end = e < 0 ? src.length : e + 2; line += count(src.slice(i, end)); i = end; codeStart = i; codeLine = line; continue; }
    if (c === '"' || c === "'" || c === "`" || (c === "}" && tpl.length && braces === tpl[tpl.length - 1])) {
      flushCode(c === "}" ? i : i);
      let j = i + 1; const q = c === "}" ? "`" : c;
      if (c === "}") tpl.pop();
      const startLine = line;
      let buf = "";
      while (j < src.length) {
        const d = src[j]!;
        if (d === "\\") { buf += src.slice(j, j + 2); if (src[j + 1] === "\n") line++; j += 2; continue; }
        if (d === "\n") { line++; if (q !== "`") break; }
        if (d === q) { j++; break; }
        if (q === "`" && d === "$" && src[j + 1] === "{") { tpl.push(braces); j += 2; break; }
        buf += d; j++;
      }
      out.push({ text: buf, line: startLine, code: false });
      i = j; codeStart = i; codeLine = line;
      continue;
    }
    // Литерал регулярного выражения: в нём бывают кавычки, и без пропуска лексер принял бы их за строку.
    if (c === "/" && /[(,=:[!&|?{};+\-*%<>~^]$|^$|\breturn$|\btypeof$/.test(src.slice(Math.max(0, i - 8), i).trimEnd())) {
      let j = i + 1, cls = false;
      while (j < src.length && src[j] !== "\n") {
        const d = src[j]!;
        if (d === "\\") { j += 2; continue; }
        if (d === "[") cls = true; else if (d === "]") cls = false;
        else if (d === "/" && !cls) break;
        j++;
      }
      if (src[j] === "/") { i = j + 1; while (/[a-z]/.test(src[i] ?? "")) i++; continue; }
    }
    if (c === "{") braces++;
    else if (c === "}") braces--;
    else if (c === "\n") line++;
    i++;
  }
  flushCode(src.length);
  return out;
}

const NAMED = ["aliceblue", "antiquewhite", "aqua", "aquamarine", "azure", "beige", "bisque", "black", "blanchedalmond", "blue",
  "blueviolet", "brown", "burlywood", "cadetblue", "chartreuse", "chocolate", "coral", "cornflowerblue", "cornsilk", "crimson",
  "cyan", "darkblue", "darkcyan", "darkgoldenrod", "darkgray", "darkgreen", "darkgrey", "darkkhaki", "darkmagenta",
  "darkolivegreen", "darkorange", "darkorchid", "darkred", "darksalmon", "darkseagreen", "darkslateblue", "darkslategray",
  "darkturquoise", "darkviolet", "deeppink", "deepskyblue", "dimgray", "dodgerblue", "firebrick", "floralwhite", "forestgreen",
  "fuchsia", "gainsboro", "ghostwhite", "gold", "goldenrod", "gray", "green", "greenyellow", "grey", "honeydew", "hotpink",
  "indianred", "indigo", "ivory", "khaki", "lavender", "lawngreen", "lemonchiffon", "lightblue", "lightcoral", "lightcyan",
  "lightgray", "lightgreen", "lightgrey", "lightpink", "lightsalmon", "lightseagreen", "lightskyblue", "lightslategray",
  "lightsteelblue", "lightyellow", "lime", "limegreen", "linen", "magenta", "maroon", "mediumblue", "mediumorchid",
  "mediumpurple", "mediumseagreen", "mediumslateblue", "mediumspringgreen", "mediumturquoise", "mediumvioletred",
  "midnightblue", "mintcream", "mistyrose", "moccasin", "navajowhite", "navy", "oldlace", "olive", "olivedrab", "orange",
  "orangered", "orchid", "palegreen", "palevioletred", "papayawhip", "peachpuff", "peru", "pink", "plum", "powderblue",
  "purple", "red", "rosybrown", "royalblue", "saddlebrown", "salmon", "sandybrown", "seagreen", "seashell", "sienna", "silver",
  "skyblue", "slateblue", "slategray", "snow", "springgreen", "steelblue", "tan", "teal", "thistle", "tomato", "turquoise",
  "violet", "wheat", "white", "whitesmoke", "yellow", "yellowgreen"];

/** Правила по содержимому строки: форма и выражение. */
const STRING_RULES: Array<[Form, RegExp]> = [
  ["hex", /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b/g],
  ["rgb", /\brgba?\(\s*[\d.]/g],
  ["hsl", /\bhsla?\(\s*[\d.]/g],
  // Имя цвета — только там, где строка выглядит как значение CSS или ffmpeg: после двоеточия,
  // знака равенства, запятой, скобки или пробела внутри объявления.
  ["named-colour", new RegExp(`(?:[:=(,]\\s*|\\s)(?:${NAMED.join("|")})(?=\\s*[;,:)@!"'}\\n]|\\s+\\d|$)`, "g")],
  ["0xRRGGBB", /\b0x[0-9a-fA-F]{6}\b/g],
  ["name@alpha", /\b[a-z]+@(?:0?\.\d+|1(?:\.0+)?)\b/g],
  ["colour-filter", /\bfade(?:white|black|grays)\b/g],
  ["font-family", /(?:font-family\s*:(?!\s*(?:var\(|inherit))|\bfont\s*:[^;"'`]*?(?:system-ui|sans-serif|serif|monospace)|(?:^|[,:(\s])(?:system-ui|ui-sans-serif|ui-serif|ui-monospace|-apple-system)\b)/g],
  ["shadow", /drop-shadow\(\s*\d/g],
  ["radius", /\binset\([^)]*\bround\s+\d|\bround\s+\d+(?:\.\d+)?px/g],
];

/**
 * Объявления, у которых число — литерал формы: значение берётся целиком, переменные из него
 * убираются, и остаток не должен содержать чисел (кроме нуля и разрешённых слов). Так
 * `padding: var(--space-3xl)` не литерал, а `padding: 12px 18px` и `border: 2px solid var(--line)` — литерал.
 */
const DECLARATIONS: Array<[Form, RegExp, RegExp]> = [
  ["shadow", /\b(box-shadow|text-shadow)\s*:([^;"'`}]*)/g, /^\s*none\s*$/],
  ["radius", /\b(border(?:-(?:top|bottom)-(?:left|right))?-radius)\s*:([^;"'`}]*)/g, /^\s*(?:0|50%|inherit)\s*$/],
  ["padding", /\b(padding(?:-(?:top|right|bottom|left))?)\s*:([^;"'`}]*)/g, /^[\s0]*$/],
  ["thickness", /\b(stroke-width|border(?:-(?:top|right|bottom|left))?(?:-width)?)\s*[:=]\s*["']?([^;"'`}]*)/g, /^\s*(?:0|none)\s*$/],
];

function declarations(text: string): Array<[Form, number, string]> {
  const out: Array<[Form, number, string]> = [];
  for (const [form, re, ok] of DECLARATIONS) {
    for (const m of text.matchAll(re)) {
      let v = m[2]!;
      // Переменные и доли смеси с цветом темы — не литералы: цвет внутри смеси ловят правила цвета.
      for (let prev = ""; prev !== v;) { prev = v; v = v.replace(/var\([^()]*\)/g, "").replace(/color-mix\([^()]*\)/g, ""); }
      if (/\d/.test(v.replace(/^\s*0\s*/, "").replace(/\b0\b/g, "")) && !ok.test(v)) out.push([form, m.index, m[0].trim()]);
    }
  }
  return out;
}

/** Шейдер: строка с `void main`. Числовые цвета и числовые слагаемые/множители цвета — литералы. */
function glsl(text: string): Array<[Form, string, number]> {
  const out: Array<[Form, string, number]> = [];
  const lines = text.split("\n");
  lines.forEach((l, k) => {
    for (const m of l.matchAll(/\bvec[34]\(\s*(?:\d*\.\d+|\d+\.?\d*)\s*,\s*(?:\d*\.\d+|\d+\.?\d*)\s*,\s*(?:\d*\.\d+|\d+\.?\d*)/g)) {
      out.push(["glsl-colour", m[0], k]);
    }
    // Присваивание выходному цвету: числа в нём, кроме 0 и 1 (тождество и непрозрачность), — оттенок,
    // вписанный в код. Вклад цвета приходит через uniform темы.
    const a = /\b(?:gl_FragColor|color|fragColor)\s*[+*]?=\s*(.+?)(?:;|$)/.exec(l);
    if (a) {
      // Аргументы функций формы и времени (порог, волна, затухание) — геометрия, а не оттенок;
      // деление — усреднение выборок. Они из проверки убираются.
      let expr = a[1]!;
      for (let prev = ""; prev !== expr;) { prev = expr; expr = expr.replace(/\b(?:smoothstep|step|sin|cos|exp|pow|length|fract|clamp|min|max|abs|mod|distance|dot|normalize)\s*\([^()]*\)/g, "f"); }
      expr = expr.replace(/\/\s*(?:\d*\.\d+|\d+\.?\d*)/g, "");
      for (const n of expr.matchAll(/(?<![\w.])(?:\d*\.\d+|\d+\.\d*|\d+)(?![\w.])/g)) {
        if (!/^(?:0|1|0\.0|1\.0|0\.|1\.)$/.test(n[0])) out.push(["glsl-colour-term", a[0].trim(), k]);
      }
    }
  });
  return out;
}

export function scanText(file: string, src: string): Finding[] {
  const found: Finding[] = [];
  for (const p of pieces(src)) {
    if (p.code) {
      for (const m of p.text.matchAll(/\b0x[0-9a-fA-F]{6}\b/g)) {
        found.push({ file, line: p.line + (p.text.slice(0, m.index).match(/\n/g) ?? []).length, form: "0xRRGGBB", text: m[0] });
      }
      continue;
    }
    const at = (idx: number): number => p.line + (p.text.slice(0, idx).match(/\n/g) ?? []).length;
    for (const [form, re] of STRING_RULES) {
      for (const m of p.text.matchAll(re)) {
        if (form === "named-colour") {
          const before = p.text.slice(Math.max(0, m.index - 60), m.index + 1);
          // Маска задаёт прозрачность, а не цвет; `format=gray` — формат пикселей ffmpeg.
          if (/mask(?:-image)?\s*:[^;{}]*$/.test(before) || /(?:format|pix_fmt)\s*=\s*$/.test(before.slice(0, -1) + "")) continue;
          if (/(?:format|pix_fmt)=$/.test(p.text.slice(Math.max(0, m.index - 12), m.index + 1))) continue;
        }
        found.push({ file, line: at(m.index), form, text: m[0].trim() });
      }
    }
    for (const [form, idx, text] of declarations(p.text)) found.push({ file, line: at(idx), form, text });
    if (/\bvoid\s+main\s*\(/.test(p.text) || /gl_FragColor|\bcolor\s*=/.test(p.text) && /\bvec[234]\b/.test(p.text)) {
      for (const [form, text, k] of glsl(p.text)) found.push({ file, line: p.line + k, form, text });
    }
  }
  return found;
}

/** Все исходники `src/`, кроме таблицы тем и тестов. */
export function sourceFiles(srcDir: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) { if (e !== "tests") walk(p); continue; }
      if (!/\.(ts|tsx|mts|js|mjs|css|glsl|html)$/.test(e) || e.endsWith(".d.ts")) continue;
      if (relative(srcDir, p) === "theme.ts") continue;
      out.push(p);
    }
  };
  walk(srcDir);
  return out.sort();
}

export function scanTree(srcDir: string): Finding[] {
  return sourceFiles(srcDir).flatMap((f) => scanText(relative(srcDir, f), readFileSync(f, "utf8")));
}
