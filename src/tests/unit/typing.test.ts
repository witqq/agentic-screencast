// Набор текста не меняет раскладку.
//
// Прежде набор срезал текст элемента до уже набранных знаков, и браузер
// раскладывал этот обрубок заново: у сбалансированного заголовка первая
// строка переезжала, центрированная карточка сдвигалась, а блок менял
// высоту на каждом новом слове. Проверка смотрит ровно на это: знак,
// видимый в середине набора, обязан стоять там же, где он стоит в полном
// тексте.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium, type Page } from "playwright";
import { buildSlide } from "../../provider/slides/page.js";

const here = dirname(fileURLToPath(import.meta.url));
const CLOCK = readFileSync(resolve(here, "..", "..", "browser", "clock.js"), "utf8");
const STAGE = readFileSync(resolve(here, "..", "..", "browser", "stage.js"), "utf8");

/** Прямоугольники видимых знаков элемента по порядку: и срезанный, и скрытый набор меряются одинаково. */
async function visibleGlyphs(page: Page, selector: string): Promise<{
  box: { w: number; h: number }; glyphs: Array<{ i: number; x: number; y: number }> }> {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) throw new Error(`no element ${sel}`);
    // Отсчёт от самого блока: слайд намеренно «дышит», и блок целиком плывёт на
    // полторы точки. Это движение не раскладки, и сравнение его не должно видеть.
    const origin = root.getBoundingClientRect();
    const out: Array<{ i: number; x: number; y: number }> = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let index = 0;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent ?? "";
      const parent = node.parentElement!;
      const hidden = getComputedStyle(parent).visibility === "hidden" || getComputedStyle(parent).opacity === "0";
      for (let k = 0; k < text.length; k++) {
        if (!/\s/.test(text[k]!) && !hidden) {
          const range = document.createRange();
          range.setStart(node, k);
          range.setEnd(node, k + 1);
          const r = range.getBoundingClientRect();
          out.push({ i: index, x: Math.round(r.left - origin.left), y: Math.round(r.top - origin.top) });
        }
        if (!/\s/.test(text[k]!)) index++;
      }
    }
    return { box: { w: Math.round(origin.width), h: Math.round(origin.height) }, glyphs: out };
  }, selector);
}

async function withPage(file: string, scene: Record<string, unknown>,
  run: (page: Page) => Promise<void>): Promise<void> {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await ctx.addInitScript({ content: CLOCK });
    await ctx.addInitScript({ content: STAGE });
    const page = await ctx.newPage();
    await page.goto(pathToFileURL(file).href);
    await page.evaluate((s) => window.__stage.mount(s as never), scene);
    await run(page);
  } finally {
    await browser.close();
  }
}

/** Каждый знак, видимый в момент t, стоит там же, где в полном тексте. */
async function assertStable(page: Page, selector: string, moments: number[], full: number): Promise<void> {
  await page.evaluate((t) => window.__clock!.seek(t), full);
  const final = await visibleGlyphs(page, selector);
  const settled = new Map(final.glyphs.map((g) => [g.i, g]));
  assert.ok(settled.size > 20, `${selector}: full text has glyphs`);
  let partialSeen = false;
  for (const t of moments) {
    await page.evaluate((tt) => window.__clock!.seek(tt), t);
    const snap = await visibleGlyphs(page, selector);
    const now = snap.glyphs;
    if (now.length > 0 && now.length < settled.size) partialSeen = true;
    if (now.length > 0) {
      assert.deepEqual(snap.box, final.box, `${selector} at ${t}s: the block changed size while typing`);
    }
    for (const g of now) {
      const want = settled.get(g.i)!;
      assert.ok(want, `${selector}: glyph ${g.i} exists in the full text`);
      assert.deepEqual([g.x, g.y], [want.x, want.y],
        `${selector} at ${t}s: glyph ${g.i} moved from ${want.x},${want.y} to ${g.x},${g.y}`);
    }
  }
  assert.ok(partialSeen, `${selector}: some moment shows the text half typed`);
}

test("a chapter title and body type in without re-wrapping", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-typing-"));
  const file = buildSlide({ id: "c", kind: "chapter", kicker: "THE QUESTION",
    title: "What changed in the renderer, and why does the whole board feel faster now?",
    body: "We will follow one document from a blank canvas to three thousand moving shapes at a steady frame rate." },
  dir, { frame: { width: 1280, height: 720 } });
  await withPage(file, { duration: 9, beats: 1 }, async (page) => {
    await assertStable(page, ".chapter-title", [1.2, 1.9, 2.6, 3.4], 8.5);
    await assertStable(page, ".chapter-body", [2.9, 3.6, 4.5], 8.5);
  });
});

test("a typed card over a page keeps its final layout from the first glyph", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-typing-card-"));
  const file = join(dir, "page.html");
  (await import("node:fs")).writeFileSync(file, "<!doctype html><html><body style='margin:0;background:#123'></body></html>");
  await withPage(file, { duration: 9, beats: 1, __overlayOnly: false,
    overlay: { cards: [{ at: 0.5, hold: 8, position: "center", reveal: "type",
      title: "The board keeps sixty frames a second",
      body: "Three thousand shapes animate while the editor stays responsive to every click." }] } },
  async (page) => {
    await assertStable(page, ".__card", [1.0, 1.5, 2.0, 2.6], 7);
  });
});
