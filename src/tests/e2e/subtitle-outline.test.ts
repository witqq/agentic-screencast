// Субтитры по умолчанию — контуром: белый текст с чёрной обводкой без плашки, шрифтом субтитров темы
// (`--sub-font`, у каждой темы свой), крупнее прежнего. Плашка — по выбору (captions.look: plate).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { THEMES, THEME_NAMES } from "../../theme.js";
import { parseCaptions } from "../../source.js";

const here = dirname(fileURLToPath(import.meta.url));
const CLOCK = readFileSync(resolve(here, "..", "..", "browser", "clock.js"), "utf8");
const STAGE = readFileSync(resolve(here, "..", "..", "browser", "stage.js"), "utf8");
type RGB = [number, number, number];
const hex = (h: string): RGB => { const v = Number.parseInt(h.slice(1, 7), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
const lum = (c: RGB): number => { const f = (v: number): number => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const contrast = (a: RGB, b: RGB): number => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

test("every theme's outline subtitles read: text and the karaoke word against the outline", () => {
  for (const name of THEME_NAMES) {
    const t = THEMES[name]!;
    const ink = hex(t["--sc-sub-outline-ink"]!), line = hex(t["--sc-sub-outline"]!), acc = hex(t["--sc-sub-accent"]!);
    assert.ok(contrast(ink, line) >= 4.5, `${name}: text on its outline (${contrast(ink, line).toFixed(1)})`);
    assert.ok(contrast(acc, line) >= 4.5, `${name}: the karaoke word on the outline (${contrast(acc, line).toFixed(1)})`);
  }
  assert.equal(parseCaptions('{"look":"plate"}').look, "plate");
  assert.throws(() => parseCaptions('{"look":"box"}'), /captions\.look/);
});

test("subtitles default to the outline look in the theme's subtitle font, larger than before; plate is a choice", async () => {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const probe = async (w: number, h: number, name: string, look?: "plate"): Promise<{ bg: string; shadow: string; size: number; family: string; lines: number }> => {
      const p = await browser.newPage({ viewport: { width: w, height: h } });
      await p.addInitScript({ content: CLOCK }); await p.addInitScript({ content: STAGE });
      await p.goto("about:blank");
      await p.evaluate((s) => window.__stage.mount(s as never), { duration: 6, beats: 1, theme: THEMES[name], starts: [0], spoken: 5,
        captionStyle: "subtitle", captionEverywhere: true, beatTexts: ["Каждая правка закрыта тестом, который падал на прежнем коде, и это видно в кадре"], effects: {},
        ...(h > w ? { safe: { top: 170, bottom: 484, left: 65, right: 180 }, subMax: 30 } : {}), ...(look ? { captionLook: look } : {}) });
      const m = await p.evaluate(() => { window.__clock.seek(1); const e = document.querySelector("#__sub") as HTMLElement; const cs = getComputedStyle(e);
        const line = e.querySelector(".__line") as HTMLElement;
        return { bg: getComputedStyle(line).backgroundColor, shadow: cs.textShadow, size: parseFloat(cs.fontSize), family: cs.fontFamily.split(",")[0]!.replace(/["']/g, "").trim(),
          lines: Math.round(e.getBoundingClientRect().height / parseFloat(cs.lineHeight)) }; });
      await p.close();
      return m;
    };
    for (const name of THEME_NAMES) {
      const m = await probe(1920, 1080, name);
      assert.equal(m.bg, "rgba(0, 0, 0, 0)", `${name}: no plate behind the outline subtitles`);
      const offsets = [...m.shadow.matchAll(/rgb\(0, 0, 0\) (-?[\d.]+)px (-?[\d.]+)px 0px/g)].map((x) => Math.hypot(Number(x[1]), Number(x[2])));
      assert.ok(offsets.length >= 12 && Math.min(...offsets) >= 0.08 * m.size * 0.99, `${name}: a black outline of at least 8% of the size (${Math.min(...offsets).toFixed(1)} px at ${m.size.toFixed(0)} px)`);
      assert.equal(m.family, THEMES[name]!["--sub-font"]!.split(",")[0]!.replace(/["']/g, "").trim(), `${name}: subtitles in the theme's subtitle font`);
      assert.ok(m.size >= 62, `${name}: the subtitle is 62 px or more at 1080 (${m.size.toFixed(0)})`);
      assert.ok(m.lines <= 2, `${name}: a piece stays within two lines (${m.lines})`);
    }
    const v = await probe(1080, 1920, "midnight");
    assert.ok(v.size >= 64 && v.lines <= 2, `vertical: ${v.size.toFixed(0)} px in ${v.lines} lines`);
    const plate = await probe(1920, 1080, "midnight", "plate");
    assert.notEqual(plate.bg, "rgba(0, 0, 0, 0)", "captions.look: plate draws the plate");
  } finally { await browser.close(); }
});
