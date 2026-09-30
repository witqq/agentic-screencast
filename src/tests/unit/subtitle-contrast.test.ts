// Субтитры читаются на любом кадре, как плашка подписи. Прежде подложка строки в тёмных темах была
// прозрачна на треть, и над светлой страницей белый текст ложился на серое — контраст падал ниже
// читаемого. Проверка — по крайним фонам: подложка, наложенная на белый и на чёрный кадр, ограничивает
// всё, что может оказаться под ней на пёстром кадре.
import { test } from "node:test";
import assert from "node:assert/strict";
import { themeVariants } from "../../theme.js";

type RGB = [number, number, number];
const parse = (c: string): { rgb: RGB; a: number } => {
  const h = /^#([0-9a-f]{6})$/i.exec(c.trim());
  if (h) { const v = Number.parseInt(h[1]!, 16); return { rgb: [(v >> 16) & 255, (v >> 8) & 255, v & 255], a: 1 }; }
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(c.trim());
  assert.ok(m, `a plain colour: ${c}`);
  return { rgb: [Number(m[1]), Number(m[2]), Number(m[3])], a: m[4] === undefined ? 1 : Number(m[4]) };
};
const over = (top: { rgb: RGB; a: number }, under: RGB): RGB => top.rgb.map((v, i) => v * top.a + under[i]! * (1 - top.a)) as RGB;
const lum = (c: RGB): number => { const f = (v: number): number => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const contrast = (a: RGB, b: RGB): number => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

test("subtitles keep readable contrast over a white, a black and so any busy frame in every theme", () => {
  for (const { name: theme, scheme, vars: t } of themeVariants()) {
    const name = `${theme} ${scheme}`;
    const bg = parse(t["--sc-sub-bg"]!), ink = parse(t["--sc-sub-ink"]!);
    assert.ok(bg.a >= 0.88, `${name}: the subtitle backing is dense like the caption plate (alpha ${bg.a})`);
    for (const under of [[255, 255, 255], [0, 0, 0], [128, 128, 128]] as RGB[]) {
      const plate = over(bg, under);
      const c = contrast(ink.rgb, plate);
      assert.ok(c >= 4.5, `${name}: subtitle text over its backing on ${under} has contrast ${c.toFixed(2)}`);
      // Караоке: ещё не сказанное — текст при непрозрачности 0,55; текущее слово — своя пара цветов.
      const dim = over({ rgb: ink.rgb, a: 0.55 }, plate);
      assert.ok(contrast(dim, plate) >= 3, `${name}: an unspoken karaoke word on ${under} (${contrast(dim, plate).toFixed(2)})`);
    }
    const now = contrast(parse(t["--sc-karaoke-ink"]!).rgb, parse(t["--sc-karaoke-bg"]!).rgb);
    assert.ok(now >= 4.5, `${name}: the current karaoke word reads on its highlight (${now.toFixed(2)})`);
  }
});
