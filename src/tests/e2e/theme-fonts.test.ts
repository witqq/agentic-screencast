// Каждая тема набирает заголовки, текст и код своими шрифтами из набора, и длинный русский заголовок
// в самых широких из них (Unbounded, разреженные заглавные) остаётся в кадре. Заголовок не ужат
// плотнее −0,025em и не тяжелее 720 (слова кириллицы при большем слипаются), а надзаголовок набран
// регистром, который назначает тема, — обычным, кроме жанровых тем.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { generateFrom } from "../../generate.js";
import { fontFaceCss, themeFamilies } from "../../fonts.js";
import { THEMES, THEME_NAMES } from "../../theme.js";

const here = dirname(fileURLToPath(import.meta.url));
const CLOCK = readFileSync(resolve(here, "..", "..", "browser", "clock.js"), "utf8");
const STAGE = readFileSync(resolve(here, "..", "..", "browser", "stage.js"), "utf8");
const W = 1920, H = 1080;

test("every theme sets titles, text and code in its own bundled fonts, and a long Russian title stays in the frame", async () => {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    for (const name of THEME_NAMES) {
      const theme = THEMES[name]!;
      const fams = themeFamilies(theme).map((f) => f.family);
      const roles = ["--display", "--sans", "--mono", "--sub-font"].map((k) => theme[k]!.split(",")[0]!.replace(/["']/g, "").trim());
      assert.deepEqual(fams.sort(), [...new Set(roles)].sort(), `${name} names bundled families for titles, text, code and subtitles (${fams.join(", ")})`);
      const dir = mkdtempSync(join(tmpdir(), "sc-theme-fonts-"));
      writeFileSync(join(dir, "story.md"), `# F\nlang: ru\nvoice: {"engine":"stub","name":"silent","cps":14}\ntheme: ${name}\n\n## hero · slides.hero\nkicker: ИТОГИ НЕДЕЛИ\ntitle: Пять работ недели: сервис анимаций, показ в редакторе и плеере\nbody: Сервис анимаций уже в транке — Animations ship in the trunk.\nduration: 4\n\n## code · slides.code\ntitle: Код\ncode: |\n  const done = await take.clickAt(260, 150);\nduration: 4\n\nКлик по точке.\n`);
      const g = generateFrom(join(dir, "story.md"));
      for (const id of ["hero", "code"]) {
        const ctx = await browser.newContext({ viewport: { width: W, height: H } });
        await ctx.route("**", (r) => /^(file|data|about):/.test(r.request().url()) ? r.continue() : r.abort());
        await ctx.addInitScript({ content: CLOCK });
        await ctx.addInitScript({ content: STAGE });
        const p = await ctx.newPage();
        await p.goto(pathToFileURL(g.pages[id]!).href);
        await p.evaluate((s) => window.__stage.mount(s as never), { duration: 4, beats: 0, theme, effects: {}, __fontCss: fontFaceCss(theme) });
        const m = await p.evaluate(async ({ fams }) => {
          await Promise.all(fams.flatMap((f) => ["300", "700"].map((w) => document.fonts.load(`${w} 40px "${f}"`, "Aa Жж"))));
          await document.fonts.ready;
          (window as unknown as { __refit?: () => void }).__refit?.();
          window.__clock.seek(3.5);
          const first = (sel: string): string => { const e = document.querySelector(sel); return e ? getComputedStyle(e).fontFamily.split(",")[0]!.replace(/["']/g, "").trim() : ""; };
          const loaded = [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/["']/g, ""));
          const h1 = document.querySelector("h1")!.getBoundingClientRect();
          const hs = getComputedStyle(document.querySelector("h1")!), kicker = document.querySelector(".kicker");
          return { title: first("h1"), body: first("p"), code: first(".code"), loaded: [...new Set(loaded)], right: h1.right, left: h1.left, overflow: document.body.dataset.overflow,
            tracking: (parseFloat(hs.letterSpacing) || 0) / parseFloat(hs.fontSize), weight: Number(hs.fontWeight), kickerCase: kicker ? getComputedStyle(kicker).textTransform : "" };
        }, { fams });
        const want = [theme["--display"]!, theme["--sans"]!, theme["--mono"]!].map((v) => v.split(",")[0]!.replace(/["']/g, "").trim());
        assert.equal(m.title, want[0], `${name}/${id}: the title is set in ${want[0]}`);
        if (id === "hero") assert.equal(m.body, want[1], `${name}: the text is set in ${want[1]}`);
        if (id === "code") assert.equal(m.code, want[2], `${name}: the code is set in ${want[2]}`);
        for (const f of want) if (id === "hero" ? f !== want[2] : true) assert.ok(m.loaded.includes(f) || (id === "hero" && f === want[2]), `${name}/${id}: ${f} is loaded from the set (${m.loaded.join(", ")})`);
        assert.ok(m.left >= 0 && m.right <= W, `${name}/${id}: the title stays in the frame (${m.left.toFixed(0)}–${m.right.toFixed(0)})`);
        assert.equal(m.overflow, undefined, `${name}/${id}: the slide fits`);
        assert.ok(m.tracking >= -0.025 - 1e-3, `${name}/${id}: the title is tracked ${m.tracking.toFixed(3)}em, not tighter than -0.025em`);
        assert.ok(m.weight <= 720, `${name}/${id}: the title weighs ${m.weight}, not over 720`);
        if (id === "hero") assert.equal(m.kickerCase, ["synthwave", "blockbuster"].includes(name) ? "uppercase" : "none", `${name}: the kicker's case`);
        await ctx.close();
      }
    }
  } finally { await browser.close(); }
});
