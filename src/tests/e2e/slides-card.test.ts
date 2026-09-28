// Трейлерная карта и титул: слова во всю ширину кадра и не за его краем, движение по времени сцены
// (удар, блик, вспышка, искры), и так в каждой теме.
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

test("a trailer card fills the frame's width without leaving it, moves in time, and so does the title card, in every theme", async () => {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    for (const name of THEME_NAMES) {
      const theme = THEMES[name]!;
      const dir = mkdtempSync(join(tmpdir(), "sc-card-"));
      writeFileSync(join(dir, "story.md"), `# C\nlang: ru\nvoice: {"engine":"stub","name":"silent","cps":14}\ntheme: ${name}\n\n`
        + `## short · slides.card\ntitle: Ноль пощады\nduration: 2\n\n`
        + `## long · slides.card\ntitle: Достопримечательность\nduration: 2\n\n`
        + `## name · slides.titlecard\nkicker: Этой осенью\ntitle: Последний / паштет\nbody: Скоро\nduration: 4\n`);
      const g = generateFrom(join(dir, "story.md"));
      for (const id of ["short", "long", "name"]) {
        const ctx = await browser.newContext({ viewport: { width: W, height: H } });
        await ctx.route("**", (r) => /^(file|data|about):/.test(r.request().url()) ? r.continue() : r.abort());
        await ctx.addInitScript({ content: CLOCK });
        await ctx.addInitScript({ content: STAGE });
        const p = await ctx.newPage();
        await p.goto(pathToFileURL(g.pages[id]!).href);
        const duration = id === "name" ? 4 : 2;
        await p.evaluate((s) => window.__stage.mount(s as never), { duration, beats: 0, theme, effects: {}, __fontCss: fontFaceCss(theme) });
        const fams = themeFamilies(theme).map((f) => f.family);
        const m = await p.evaluate(async ({ fams, sel }) => {
          await Promise.all(fams.map((f) => document.fonts.load(`700 40px "${f}"`, "Aa Жж")));
          await document.fonts.ready;
          (window as unknown as { __refit?: () => void }).__refit?.();
          const at = (t: number): { box: DOMRect; style: string; flash: number; sparks: number } => {
            window.__clock.seek(t);
            const el = document.querySelector(sel)!;
            // Ширина слов — по их строке, без увеличения облёта и удара.
            const r = el.getBoundingClientRect();
            const flash = Number(getComputedStyle(document.querySelector(".card-flash") ?? document.body).opacity || 0);
            const sparks = [...document.querySelectorAll(".card-embers i")].filter((e) => Number(getComputedStyle(e).opacity) > 0.05).length;
            return { box: r, style: `${getComputedStyle(el).transform}|${getComputedStyle(el).filter}|${getComputedStyle(el).backgroundPosition}|${getComputedStyle(el.parentElement!).transform}`, flash, sparks };
          };
          const early = at(0.2), flash = at(0.35), late = at(1.6), settled = at(sel === ".tc-name" ? 3.5 : 1.9);
          return { early: early.style, late: late.style, flash: flash.flash, sparks: late.sparks,
            left: settled.box.left, right: settled.box.right, width: settled.box.width };
        }, { fams, sel: id === "name" ? ".tc-name" : ".card-word" });
        const share = m.width / W;
        if (id !== "name") {
          assert.ok(share > 0.7, `${name}/${id}: the card's words span ${Math.round(share * 100)}% of the frame's width`);
          assert.ok(m.left >= 0 && m.right <= W, `${name}/${id}: the words stay in the frame (${m.left.toFixed(0)}–${m.right.toFixed(0)})`);
          assert.ok(m.flash > 0.3, `${name}/${id}: the frame flashes on the hit (${m.flash})`);
        } else {
          assert.ok(share > 0.45 && m.left >= 0 && m.right <= W, `${name}: the title spans ${Math.round(share * 100)}% and stays in the frame`);
        }
        assert.notEqual(m.early, m.late, `${name}/${id}: the frame at the hit differs from the frame after it`);
        assert.ok(m.sparks > 0, `${name}/${id}: sparks rise`);
        await ctx.close();
      }
    }
  } finally { await browser.close(); }
});
