// Шрифты тем приходят из поставляемого набора, вшитыми в страницу, без сети: один и тот же ролик на
// любой машине рисуется одними шрифтами. Прежде темы называли системные шрифты, и ролик зависел от
// того, что установлено на машине сборки.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FONTS, fontDir, fontFaceCss, themeFamilies, aliasedFonts } from "../../fonts.js";
import { THEMES } from "../../theme.js";

const here = dirname(fileURLToPath(import.meta.url));
const CLOCK = readFileSync(resolve(here, "..", "..", "browser", "clock.js"), "utf8");
const STAGE = readFileSync(resolve(here, "..", "..", "browser", "stage.js"), "utf8");

test("every bundled font has its Latin and Cyrillic files and its OFL licence", () => {
  for (const f of FONTS) {
    for (const sub of ["latin", "cyrillic"]) {
      const files = f.static ? f.static.map((w) => `${f.id}-${sub}-${w}.woff2`) : [`${f.id}-${sub}.woff2`];
      for (const file of files) assert.ok(existsSync(resolve(fontDir(), file)), `${file} is in the set`);
    }
    assert.match(readFileSync(resolve(fontDir(), `${f.id}.LICENSE.txt`), "utf8"), /SIL OPEN FONT LICENSE|Open Font License/i, `${f.family} is OFL`);
  }
});

test("a theme's fonts load with the network cut off and draw the text, Latin and Cyrillic", async () => {
  const theme = { ...THEMES.midnight!, "--display": '"Unbounded", sans-serif', "--sans": '"Golos Text", sans-serif', "--mono": '"JetBrains Mono", monospace', "--sub-font": '"Golos Text", sans-serif' };
  assert.deepEqual(themeFamilies(theme).map((f) => f.family).sort(), ["Golos Text", "JetBrains Mono", "Unbounded"]);
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const width = async (withFonts: boolean): Promise<{ w: number; loaded: Record<string, boolean> }> => {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      await ctx.route("**", (r) => r.request().url().startsWith("data:") || r.request().url().startsWith("about:") ? r.continue() : r.abort());
      await ctx.addInitScript({ content: CLOCK });
      await ctx.addInitScript({ content: STAGE });
      const p = await ctx.newPage();
      await p.setContent(`<h1 id=t style="font:800 60px var(--display);display:inline-block">Пять работ недели Week</h1>`);
      await p.evaluate((s) => window.__stage.mount(s as never), { duration: 2, beats: 0, theme, effects: {}, ...(withFonts ? { __fontCss: fontFaceCss(theme) } : {}) });
      const out = await p.evaluate(async () => {
        await Promise.all(["Unbounded", "Golos Text", "JetBrains Mono"].flatMap((f) => [document.fonts.load(`800 40px "${f}"`, "Aa Жж"), document.fonts.load(`400 40px "${f}"`, "Aa Жж")]));
        await document.fonts.ready;
        const loaded: Record<string, boolean> = {};
        for (const f of ["Unbounded", "Golos Text", "JetBrains Mono"]) loaded[f] = document.fonts.check(`400 40px "${f}"`, "Жж") && document.fonts.check(`400 40px "${f}"`, "Aa")
          && [...document.fonts].some((ff) => ff.family.replace(/"/g, "") === f && ff.status === "loaded");
        return { w: document.getElementById("t")!.getBoundingClientRect().width, loaded };
      });
      await ctx.close();
      return out;
    };
    const bundled = await width(true), fallback = await width(false);
    for (const [f, ok] of Object.entries(bundled.loaded)) assert.ok(ok, `${f} is loaded from the set with no network`);
    assert.ok(bundled.w > fallback.w * 1.15, `the title is drawn in the extra-wide Unbounded (${bundled.w.toFixed(0)} px against ${fallback.w.toFixed(0)} px of the fallback)`);
  } finally { await browser.close(); }
});

test("the live take's layer gets the theme fonts under their own names, leaving the product's fonts alone", () => {
  const a = aliasedFonts({ "--sans": '"Manrope", sans-serif', "--ink": "#fff" });
  assert.equal(a.theme["--sans"], '"sc Manrope", sans-serif');
  assert.match(a.css, /font-family:"sc Manrope"/);
  assert.doesNotMatch(a.css, /font-family:"Manrope"/);
});

test("every bundled family draws Cyrillic with its own glyphs, not the machine's fallback", async () => {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 200 } });
    await ctx.route("**", (r) => /^(data|about):/.test(r.request().url()) ? r.continue() : r.abort());
    const p = await ctx.newPage();
    for (const f of FONTS) {
      const css = fontFaceCss({ "--display": `"${f.family}", serif` });
      await p.setContent(`<style>${css} span{font-size:60px;font-weight:${f.weights[0] === f.weights[1] ? f.weights[0] : 400}}</style>`
        + `<span id=own style="font-family:'${f.family}',serif">Жизнь ЩЫЮЯ</span><br><span id=alt style="font-family:serif">Жизнь ЩЫЮЯ</span>`);
      const loaded = await p.evaluate(async (fam) => { await document.fonts.load(`60px "${fam}"`, "Жизнь"); await document.fonts.ready; return document.fonts.check(`60px "${fam}"`, "Ж"); }, f.family);
      assert.ok(loaded, `${f.family}: the Cyrillic face loads`);
      const own = await p.locator("#own").screenshot(), alt = await p.locator("#alt").screenshot();
      assert.ok(!own.equals(alt), `${f.family}: Cyrillic is drawn by the family itself`);
    }
    await ctx.close();
  } finally { await browser.close(); }
});
