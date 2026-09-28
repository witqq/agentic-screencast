// Темизация как договор: тема не может ничего пропустить. Каждая из восьми тем хранит каждый
// токен сама; код рисования не содержит своих цветов, шрифтов, теней, радиусов, отступов и
// толщин; каждая переменная, которую код читает, входит в договор, и каждый токен договора кто-то
// читает. Проверяется форма ХРАНЕНИЯ (исходник), а не итог разрешения: итог одинаков и у темы,
// которая задала значение сама, и у темы, которая унаследовала его от другой.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pieces, scanText, scanTree, sourceFiles, type Form } from "../theming-scan.js";
import { NON_COLOUR_TOKENS, THEMES, THEME_KEYS, THEME_NAMES, resolveTheme } from "../../theme.js";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");

/**
 * Закрытый список исключений: файл, точный фрагмент и причина. Место вне списка роняет тест.
 * Фрагмент, а не номер строки: номер съезжает от любой правки выше, и исключение стало бы
 * держаться не за то место.
 */
export const ALLOWED: Array<{ file: string; text: string; why: string }> = [
  { file: "agentic-screencast.ts", text: "#ff5a1f", why: "help text: an example colour in a point edit, a mark and the brand command, not drawn" },
  { file: "agentic-screencast.ts", text: "#1f6fff", why: "help text: the second example colour of theme --colors, not drawn" },
  { file: "agentic-screencast.ts", text: "#7aa2ff", why: "help text: an example point edit of a theme, not drawn" },
  { file: "agentic-screencast.ts", text: "cyan", why: "help text: words describing the synthwave, daylight and blueprint themes" },
  { file: "agentic-screencast.ts", text: "blue", why: "help text: words describing the midnight, aurora and blueprint themes" },
  { file: "agentic-screencast.ts", text: "yellow", why: "help text: words describing the blueprint theme" },
  { file: "agentic-screencast.ts", text: "black", why: "help text: a word describing the blockbuster theme" },
  { file: "agentic-screencast.ts", text: "#ffd27a", why: "help text: an example colour a scenario names for a dip, not drawn" },
  { file: "agentic-screencast.ts", text: "white", why: "help text: the word white in an example dip, not drawn" },
  { file: "brand.ts", text: "#ff5a1f", why: "error message: an example of the colour form the command expects" },
  { file: "brand.ts", text: "grey", why: "error message: tells the user the picture is grey" },
  { file: "fonts.ts", text: "font-family:", why: "the bundled font table: its @font-face rules name each family that a theme's --display, --sans and --mono refer to" },
  { file: "look.ts", text: "=black", why: "film look: cinema letterbox bars are black by definition; part of the look, not of the theme" },
  { file: "transition.ts", text: "#000000", why: "the word black a scenario may name as the colour of a dip: the author's colour, not a theme's" },
  { file: "transition.ts", text: "#ffffff", why: "the word white a scenario may name as the colour of a dip: the author's colour, not a theme's" },
  { file: "transition.ts", text: "black", why: "the word black a scenario may name as the colour of a dip: the author's colour, not a theme's" },
  { file: "transition.ts", text: "fadeblack", why: "without WebGL ffmpeg dips only to black or white: the fallback takes the one nearer the dip's colour" },
  { file: "transition.ts", text: "fadewhite", why: "without WebGL ffmpeg dips only to black or white: the fallback takes the one nearer the dip's colour" },
  { file: "transition.ts", text: "(1.0 - w) * 9.0 / 11.0", why: "the flip transition darkens its face by 9/11 of the theme's --tr-shade: a property of the kind, the strength comes from the theme" },
  { file: "transition.ts", text: "p * 7.0 / 11.0", why: "the push transition darkens the leaving scene by 7/11 of the theme's --tr-shade: a property of the kind, the strength comes from the theme" },
];

const allowed = (f: { file: string; text: string }): boolean =>
  ALLOWED.some((a) => a.file === f.file && (f.text === a.text || f.text.includes(a.text)));

test("no drawing source outside the theme table writes a visual value of its own", () => {
  const found = scanTree(SRC).filter((f) => !allowed(f));
  assert.deepEqual(found.map((f) => `${f.file}:${f.line} ${f.form} ${f.text}`), []);
});

test("every exception is still needed, so the list cannot grow stale", () => {
  const found = scanTree(SRC);
  for (const a of ALLOWED) {
    assert.ok(found.some((f) => f.file === a.file && (f.text === a.text || f.text.includes(a.text))),
      `exception ${a.file} «${a.text}» matches nothing; remove it`);
  }
});

/** Образец каждой формы литерала: подброшенный в новый файл `src/`, он обязан уронить проверку. */
const PLANTED: Array<[Form, string]> = [
  ["hex", 'export const a = "color:#12ab34";'],
  ["hex", 'export const a = "color:#1a3";'],
  ["rgb", 'export const a = "background:rgba(10,20,30,.5)";'],
  ["hsl", 'export const a = "color:hsl(210 50% 40%)";'],
  ["named-colour", 'export const a = "border:1px solid white;";'],
  ["named-colour", 'export const a = `color:black;`;'],
  ["named-colour", 'export const a = `drawbox=x=0:color=black:t=fill`;'],
  ["0xRRGGBB", 'export const a = 0x12ab34;'],
  ["0xRRGGBB", 'export const a = "color=0x12ab34";'],
  ["name@alpha", 'export const a = "drawbox=color=black@0.35:t=fill";'],
  ["colour-filter", 'export const a = { xfade: "fadewhite" };'],
  ["glsl-colour", 'export const a = `void main(){ color = vec4(vec3(0.9, 0.7, 0.2), 1.0); }`;'],
  ["glsl-colour-term", 'export const a = `void main(){ vec4 c = A(uv); gl_FragColor = vec4(c.rgb * 0.8 + g, c.a); }`;'],
  ["font-family", 'export const a = "font:600 18px system-ui";'],
  ["font-family", 'export const a = "font-family:Georgia,serif";'],
  ["shadow", 'export const a = "box-shadow:0 12px 30px rgba(0,0,0,.4)";'],
  ["shadow", 'export const a = "filter:drop-shadow(0 3px 6px var(--x))";'],
  ["radius", 'export const a = "border-radius:12px";'],
  ["radius", 'export const a = "clip-path:inset(0 0 0 0 round 18px)";'],
  ["radius", "export const a = (e: number) => 'inset(0 ' + e + '% 0 0 round 18px)';"],
  ["padding", 'export const a = "padding:12px 18px";'],
  ["thickness", 'export const a = "stroke-width:6";'],
  ["thickness", 'export const a = "border:2px solid var(--line)";'],
];

test("the scanner catches every form of a visual literal planted in a new source file", () => {
  const dir = mkdtempSync(join(SRC, ".planted-"));
  try {
    PLANTED.forEach(([, code], k) => writeFileSync(join(dir, `p${k}.ts`), `${code}\n`));
    const found = scanTree(SRC);
    PLANTED.forEach(([form, code], k) => {
      const here = found.filter((f) => f.file.endsWith(`p${k}.ts`));
      assert.ok(here.some((f) => f.form === form), `planted ${form} «${code}» is not caught (${here.map((f) => f.form).join(",") || "nothing"})`);
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("a quote inside a regular expression does not blind the scanner to the code after it", () => {
  const src = 'const re = /["\']/g;\nexport const a = "color:#12ab34";\n';
  assert.deepEqual(scanText("x.ts", src).map((f) => f.form), ["hex"]);
  assert.ok(pieces('const s = `a ${b ? "x" : `y ${c}`} d`;').some((p) => !p.code && p.text.includes(" d")));
});

// --- Форма хранения таблицы тем -------------------------------------------------------------

const themeSource = readFileSync(join(SRC, "theme.ts"), "utf8");

/** Записи темы в исходнике: имя константы → строки её объекта. */
function themeBlocks(): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of themeSource.matchAll(/^const ([A-Z_]+): ThemeVars = \{\n([\s\S]*?)^\};/gm)) out.set(m[1]!, m[2]!);
  return out;
}

test("each theme is stored as its own complete object, not borrowed from another", () => {
  const blocks = themeBlocks();
  assert.equal(blocks.size, THEME_NAMES.length, `the theme table stores ${blocks.size} theme objects for ${THEME_NAMES.length} names`);
  for (const [name, body] of blocks) {
    assert.ok(!/\.\.\.|Object\.assign/.test(body), `${name} inherits another theme's set`);
    const entries = new Map([...body.matchAll(/^\s*"(--[\w-]+)":\s*(.+?),?\s*$/gm)].map((m) => [m[1]!, m[2]!]));
    for (const key of THEME_KEYS) {
      const v = entries.get(key);
      assert.ok(v !== undefined, `${name} does not write ${key}`);
      if (!NON_COLOUR_TOKENS.includes(key)) {
        assert.ok(/^(["'`]).*\1$/.test(v!), `${name} ${key} is not a string literal in its own entry: ${v}`);
      }
    }
    for (const key of entries.keys()) assert.ok((THEME_KEYS as readonly string[]).includes(key), `${name} writes ${key}, which is not in the contract`);
  }
});

test("a film without a theme wears neutral from the table, not fallbacks written in the drawing code", () => {
  assert.deepEqual(resolveTheme(undefined), THEMES.neutral);
});

// --- Чтения переменных ----------------------------------------------------------------------

/** Переменные, которые задаёт сам код рисования (раскладка, время), а не тема. */
function setByCode(): Set<string> {
  const set = new Set<string>();
  for (const f of sourceFiles(SRC)) {
    const text = readFileSync(f, "utf8");
    for (const m of text.matchAll(/(--[a-z][\w-]*)\s*:/g)) set.add(m[1]!);
    for (const m of text.matchAll(/setProperty\(\s*["'`](--[\w-]+)/g)) set.add(m[1]!);
  }
  return set;
}

function reads(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const f of sourceFiles(SRC)) {
    const text = readFileSync(f, "utf8");
    const rel = f.slice(SRC.length + 1);
    const add = (k: string): void => { out.set(k, [...(out.get(k) ?? []), rel]); };
    for (const m of text.matchAll(/var\(\s*(--[\w-]+)/g)) add(m[1]!);
    // Чтение из объекта темы: `theme["--acc"]`, `(s.theme ?? pitch.theme)["--acc"]`; флаги командной строки не в счёт.
    for (const m of text.matchAll(/(?:theme\W{0,4}|\))\[\s*["'`](--[\w-]+)["'`]\s*\]/g)) add(m[1]!);
    for (const m of text.matchAll(/\b(?:token|tokenText|colorOf)\(\s*["'`](--[\w-]+)["'`]/g)) add(m[1]!);
    for (const m of text.matchAll(/getPropertyValue\(\s*["'`](--[\w-]+)/g)) add(m[1]!);
  }
  // Составной токен темы (тень подсветки, ореол) ссылается на другие: код читает составной, а
  // через него — и те, на которые он ссылается.
  for (const m of themeSource.matchAll(/var\(\s*(--[\w-]+)/g)) out.set(m[1]!, [...(out.get(m[1]!) ?? []), "theme.ts (a composite token)"]);
  return out;
}

test("every variable the drawing code reads is either in the contract or set by the code itself", () => {
  const own = setByCode(), contract = new Set<string>(THEME_KEYS);
  const phantom = [...reads()].filter(([k]) => !contract.has(k) && !own.has(k)).map(([k, f]) => `${k} (${[...new Set(f)].join(", ")})`);
  assert.deepEqual(phantom, []);
});

test("every token of the contract is read by the drawing code", () => {
  const r = reads();
  assert.deepEqual(THEME_KEYS.filter((k) => !r.has(k)), []);
});

// --- Фирменная тема -------------------------------------------------------------------------

test("a brand theme carries its colours into every token the base theme derives from its accents", async () => {
  const { brandTheme, parseHex } = await import("../../brand.js");
  const rgbOf = (h: string): string => parseHex(h.slice(0, 7)).join(",");
  for (const base of THEME_NAMES) {
    const b = THEMES[base]!;
    const brand = brandTheme([[228, 87, 46], [23, 190, 187]], base);
    const theme = resolveTheme(brand);
    // Названные токены, которые рисуют акцент поставляемой темы: кольца, полоса хода, значок, пометка.
    for (const k of ["--sc-progress", "--sc-pip-ring", "--sc-loupe-ring", "--sc-badge-bg", "--sc-karaoke-bg", "--sc-mark", "--sc-ripple-ring"]) {
      for (const [src, into] of [["--acc", "--acc"], ["--acc2", "--acc2"]] as const) {
        if (b[k]!.toLowerCase() === b[src]!.toLowerCase()) assert.equal(theme[k]!.toLowerCase(), theme[into]!.toLowerCase(), `${base} ${k} follows the brand ${into}`);
      }
    }
    // И вообще: ни одно значение фирменной темы не хранит цвет акцента поставляемой, если фирменный другой.
    for (const src of ["--acc", "--acc2", "--glow"]) {
      if (theme[src]!.toLowerCase() === b[src]!.toLowerCase()) continue;
      const h = b[src]!.toLowerCase(), rgb = rgbOf(h);
      const left = Object.entries(theme).filter(([, v]) => v.toLowerCase().includes(h) || v.replace(/\s/g, "").includes(`(${rgb}`)).map(([k]) => k);
      assert.deepEqual(left, [], `${base}: tokens still carry the base ${src} ${h}`);
    }
  }
});
