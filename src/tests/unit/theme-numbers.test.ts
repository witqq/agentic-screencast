// Нормы облика числами (docs/visual-design.md, «Norms with numbers»): у каждой поставляемой темы
// заголовок не тяжелее 720 и не ужат плотнее −0,03em, текстовые токены читаются по WCAG AA
// (4,5:1) на своём фоне, второй цвет — тихий, плашки и кромки — один акцент, а не градиент двух,
// и акцент не лежит в индиго и фиолете палитры фреймворка. Жанровые темы — synthwave и
// blockbuster — держат два ярких цвета намеренно; blueprint — чертёжная пара голубого и жёлтого,
// как в agentic-report. Проверка сама краснеет на контрпримере: прежняя midnight с бирюзовым
// вторым акцентом и градиентной плашкой, daylight на индиго Tailwind.
import { test } from "node:test";
import assert from "node:assert/strict";
import { THEMES, THEME_NAMES, type ThemeVars } from "../../theme.js";

type RGB = [number, number, number];
const GENRE = new Set(["synthwave", "blockbuster"]);
const TWO_COLOUR = new Set([...GENRE, "blueprint"]);

const lin = (v: number): number => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const lum = (c: RGB): number => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const contrast = (a: RGB, b: RGB): number => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };
const hex = (h: string): RGB => { const n = Number.parseInt(h.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
/** Цвета значения — `#rrggbb` и `rgba(…)` — наложенные на подложку по своей прозрачности. */
const colours = (value: string, under: RGB): RGB[] => [...value.matchAll(/#[0-9a-f]{6}\b|rgba?\(([^)]*)\)/giu)].map((m) => {
  if (m[0].startsWith("#")) return hex(m[0]);
  const [r, g, b, a = "1"] = m[1]!.split(",").map((x) => x.trim());
  const k = Number(a);
  return [Number(r), Number(g), Number(b)].map((v, i) => v * k + under[i]! * (1 - k)) as RGB;
});
/** OKLCH: светлота, насыщенность, тон в градусах. */
export function oklch(h: string): [number, number, number] {
  const [r, g, b] = hex(h).map(lin) as RGB;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, Math.hypot(A, B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360];
}

/** Нарушения норм у одной темы — словами, чтобы контрпример показывал, что именно он ломает. */
export function themeFaults(name: string, t: ThemeVars): string[] {
  const out: string[] = [];
  const weight = Number(t["--display-weight"]);
  if (!(weight <= 720)) out.push(`display weight ${weight} is over 720`);
  // Стиль заголовка ужимает на −0,02em, тема добавляет своё; итог не плотнее −0,03em.
  const tracking = -0.02 + Number.parseFloat(t["--display-tracking"] ?? "0");
  if (tracking < -0.03 - 1e-9) out.push(`title tracking ${tracking.toFixed(3)}em is tighter than -0.03em`);
  const bg = hex(t["--bg"]!);
  for (const k of ["--ink", "--body", "--mut"]) {
    const c = contrast(hex(t[k]!), bg);
    if (c < 4.5) out.push(`${k} on --bg has contrast ${c.toFixed(2)}, under 4.5`);
  }
  // Код читается целиком: номера строк и комментарии — тоже текст кадра.
  const code = hex(t["--code-bg"]!);
  for (const k of ["--code-ink", "--code-com", "--code-gutter", "--code-name"]) {
    const c = contrast(hex(t[k]!), code);
    if (c < 4.5) out.push(`${k} on --code-bg has contrast ${c.toFixed(2)}, under 4.5`);
  }
  for (const card of colours(t["--sc-card-bg"]!, bg)) {
    for (const k of ["--sc-card-ink", "--sc-card-body"]) {
      const c = contrast(hex(t[k]!), card);
      if (c < 4.5) out.push(`${k} on the card has contrast ${c.toFixed(2)}, under 4.5`);
    }
  }
  if (!TWO_COLOUR.has(name)) {
    const [, chroma] = oklch(t["--acc2"]!);
    if (chroma > 0.09) out.push(`the second colour ${t["--acc2"]} is a second accent (OKLCH chroma ${chroma.toFixed(3)} > 0.09), not a quiet one`);
  }
  if (!GENRE.has(name)) {
    for (const k of ["--sc-cap-bar", "--sc-card-accent", "--sc-lower-bar"]) {
      if (/gradient/u.test(t[k]!)) out.push(`${k} is a gradient, not the one accent`);
    }
    const [, chroma, hue] = oklch(t["--acc"]!);
    if (chroma > 0.12 && hue >= 268 && hue <= 300) out.push(`the accent ${t["--acc"]} lies in the framework indigo and violet (hue ${hue.toFixed(0)}°)`);
  }
  return out;
}

test("every shipped theme keeps the look's numeric norms; the genre themes keep only the type and contrast ones", () => {
  assert.equal(THEME_NAMES.length, 11);
  const faults = THEME_NAMES.flatMap((n) => themeFaults(n, THEMES[n]!).map((f) => `${n}: ${f}`));
  assert.deepEqual(faults, []);
});

test("the norms are red on the themes they were written against", () => {
  // Прежняя midnight: бирюзовый второй акцент, градиент двух акцентов в плашке, дисплей 800 и −0,045em.
  const oldMidnight = { ...THEMES.midnight!, "--acc2": "#4fd1c5", "--sc-cap-bar": "linear-gradient(90deg,#7aa2ff,#4fd1c5)",
    "--display-weight": "800", "--display-tracking": "-.025em" };
  const faults = themeFaults("midnight", oldMidnight);
  assert.ok(faults.some((f) => /second accent/u.test(f)), faults.join("; "));
  assert.ok(faults.some((f) => /--sc-cap-bar is a gradient/u.test(f)), faults.join("; "));
  assert.ok(faults.some((f) => /weight 800/u.test(f)), faults.join("; "));
  assert.ok(faults.some((f) => /tighter than -0.03em/u.test(f)), faults.join("; "));
  // Прежняя daylight: индиго-600 палитры Tailwind.
  assert.ok(themeFaults("daylight", { ...THEMES.daylight!, "--acc": "#4f46e5" }).some((f) => /framework indigo/u.test(f)));
  // Приглушённый текст, прозрачный до нечитаемого.
  assert.ok(themeFaults("neutral", { ...THEMES.neutral!, "--mut": "#a8a8a4" }).some((f) => /--mut on --bg/u.test(f)));
});
