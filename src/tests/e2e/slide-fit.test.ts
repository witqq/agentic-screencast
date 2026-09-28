// Слайд вписывает содержимое в свои поля: четыре пункта в две строки с надзаголовком не уходят
// за верхний край кадра и не ложатся на полосу субтитров и на плашку части полосы хода. Если
// места не хватает и при предельном ужатии, рендер говорит, на сколько (сборка называет сцену).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateFrom } from "../../generate.js";
import { renderScene, type RenderScene } from "../../render.js";
import { partLabelHeight } from "../../part-label.js";

const W = 1920, H = 1080;

function story(items: string, extra = ""): { page: string; scene: RenderScene } {
  const dir = mkdtempSync(join(tmpdir(), "sc-fit-"));
  writeFileSync(join(dir, "story.md"), `# Fit
lang: ru
voice: {"engine":"stub","name":"silent","cps":14}
captions: {"style":"subtitle","everywhere":true}
frame: {"width":${W},"height":${H},"fps":10,"scale":1}
progress: {"position":"bottom","parts":true}
${extra}
## overview · slides.steps
part: Неделя
kicker: ВИДЕО · 18–25 СЕНТЯБРЯ
title: Четыре работы недели
items: ${items}
duration: 4

Две работы уже в коде, ещё две мы исследуем.
`);
  const g = generateFrom(join(dir, "story.md"));
  const pitch = JSON.parse(readFileSync(g.pitchFile, "utf8")) as { theme: unknown; scenes: Array<{ id: string; effects?: unknown }> };
  return { page: g.pages.overview!, scene: { page: g.pages.overview!, duration: 4, beats: 1, theme: pitch.theme, effects: pitch.scenes[0]!.effects,
    captionStyle: "subtitle", captionEverywhere: true, beatTexts: ["Две работы уже в коде, ещё две мы исследуем."], starts: [0], spoken: 3.5 } };
}

const FOUR = "ЗАДАЧА-1 :: сервис анимаций — в транке и уже работает в продукте у всех | ЗАДАЧА-2 :: показ в продукте — в PR, осталось закрыть замечания ревью | ЗАДАЧА-3 :: эффекты экспорта — исследуем, нужно решение продукта | ЗАДАЧА-4 :: режим слайдшоу — исследуем прототип и решение";

test("a tall steps slide shrinks to fit between the frame's top and the subtitle band and part label", async () => {
  const { scene } = story(FOUR);
  const { chromium } = await import("playwright");
  const { readFileSync: rf } = await import("node:fs");
  const { dirname, resolve } = await import("node:path");
  const { fileURLToPath, pathToFileURL } = await import("node:url");
  const here = dirname(fileURLToPath(import.meta.url));
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    await ctx.addInitScript({ content: rf(resolve(here, "..", "..", "browser", "clock.js"), "utf8") });
    await ctx.addInitScript({ content: rf(resolve(here, "..", "..", "browser", "stage.js"), "utf8") });
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(scene.page).href);
    await p.evaluate((s) => window.__stage.mount(s as never), scene);
    await p.evaluate(() => window.__clock.seek(3.5));
    const m = await p.evaluate(() => {
      const rect = (sel: string) => { const r = document.querySelector(sel)!.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; };
      const steps = [...document.querySelectorAll(".step")].map((e) => e.getBoundingClientRect().bottom);
      return { kicker: rect(".kicker"), last: Math.max(...steps), sub: rect("#__sub"), fit: Number(document.body.dataset.fit), overflow: document.body.dataset.overflow };
    });
    assert.ok(m.fit < 1, `the slide shrank (fit ${m.fit})`);
    assert.ok(m.kicker.top >= 0.03 * H, `the kicker stays below the frame's top (${m.kicker.top.toFixed(0)})`);
    assert.ok(m.last <= m.sub.top, `the last step (${m.last.toFixed(0)}) ends above the subtitle band (${m.sub.top.toFixed(0)})`);
    // Плашка части (film.ts): низ кадра — полоса 0,6 %, над ней на 0,6 поля плашка (part-label.ts).
    const labelTop = H - H * 0.006 - W * 0.018 * 0.6 - partLabelHeight({ width: W, height: H });
    assert.ok(m.last <= labelTop, `the last step (${m.last.toFixed(0)}) ends above the part label (${labelTop.toFixed(0)})`);
    assert.equal(m.overflow, undefined);
  } finally { await browser.close(); }
});

test("a slide that does not fit even at the smallest readable size reports its overflow", async () => {
  const many = [...Array(9).keys()].map((i) => `Пункт ${i + 1} :: описание пункта номер ${i + 1}, которое занимает целую строку текста`).join(" | ");
  const { scene } = story(many);
  const r = await renderScene(scene, { width: W, height: H, fps: 10, at: 3 });
  assert.ok((r.overflow ?? 0) > 0, `the renderer reports the overflow (${r.overflow})`);
});

function codeStory(lines: number): RenderScene {
  const dir = mkdtempSync(join(tmpdir(), "sc-fit-code-"));
  const code = [...Array(lines).keys()].map((i) => `  const value${i} = compute(${i}); // line ${i + 1}`).join("\n");
  writeFileSync(join(dir, "story.md"), `# Code
lang: en
voice: {"engine":"stub","name":"silent","cps":14}
captions: {"style":"subtitle","everywhere":true}
frame: {"width":${W},"height":${H},"fps":10,"scale":1}

## code · slides.code
kicker: CAPTURE
title: A take in ${lines} lines
code: |
${code}
duration: 8

The capture script clicks and types on the live page.
`);
  const g = generateFrom(join(dir, "story.md"));
  const pitch = JSON.parse(readFileSync(g.pitchFile, "utf8")) as { theme: unknown; scenes: Array<{ effects?: unknown }> };
  return { page: g.pages.code!, duration: 8, beats: 1, theme: pitch.theme, effects: pitch.scenes[0]!.effects,
    captionStyle: "subtitle", captionEverywhere: true, beatTexts: ["The capture script clicks and types on the live page."], starts: [0], spoken: 7 };
}

test("a code slide shows every one of its lines, and a code block past the readable limit reports its overflow", async () => {
  const { chromium } = await import("playwright");
  const { pathToFileURL } = await import("node:url");
  const browser = await chromium.launch();
  try {
    const p = await browser.newPage({ viewport: { width: W, height: H } });
    await p.goto(pathToFileURL(codeStory(10).page).href);
    const m = await p.evaluate(() => {
      const win = document.querySelector(".code-win")!.getBoundingClientRect();
      const lines = [...document.querySelectorAll(".code .ln")].map((l) => l.getBoundingClientRect());
      return { count: lines.length, lastBottom: Math.max(...lines.map((r) => r.bottom)), winBottom: win.bottom, overflow: document.body.dataset.overflow };
    });
    assert.equal(m.count, 10);
    assert.ok(m.lastBottom <= m.winBottom + 0.5, `the tenth line (${m.lastBottom.toFixed(0)}) is inside the code window (${m.winBottom.toFixed(0)})`);
    assert.ok(m.winBottom <= H, "the code window is inside the frame");
    assert.equal(m.overflow, undefined);
  } finally { await browser.close(); }
  const r = await renderScene(codeStory(40), { width: W, height: H, fps: 10, at: 7 });
  assert.ok((r.overflow ?? 0) > 0, `forty lines past the readable limit report the overflow (${r.overflow})`);
});

// Пункты выходят по одному. Прежде у сцены с одним тактом пункты получали якоря b2…b4, прижатые
// к началу единственного такта: первый выходил через полсекунды, остальные три — разом в нуле.
test("list items appear one by one at an even pace when the speech has fewer beats than items", async () => {
  const { scene } = story(FOUR);
  const { chromium } = await import("playwright");
  const { dirname, resolve } = await import("node:path");
  const { fileURLToPath, pathToFileURL } = await import("node:url");
  const here = dirname(fileURLToPath(import.meta.url));
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    await ctx.addInitScript({ content: readFileSync(resolve(here, "..", "..", "browser", "clock.js"), "utf8") });
    await ctx.addInitScript({ content: readFileSync(resolve(here, "..", "..", "browser", "stage.js"), "utf8") });
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(scene.page).href);
    await p.evaluate((s) => window.__stage.mount(s as never), scene);
    // Момент выхода пункта — первый кадр, где он заметно проступил.
    const first: Array<number | undefined> = [undefined, undefined, undefined, undefined];
    for (let f = 0; f <= 40; f++) {
      const t = f / 10;
      const op = await p.evaluate((tt) => { window.__clock.seek(tt);
        return [...document.querySelectorAll(".step")].map((e) => Number(getComputedStyle(e).opacity)); }, t);
      op.forEach((o, i) => { if (first[i] === undefined && o > 0.05) first[i] = t; });
    }
    assert.ok(first.every((x) => x !== undefined), `every item appeared (${first.join(", ")})`);
    const at = first as number[];
    const gaps = at.slice(1).map((x, i) => x - at[i]!);
    assert.ok(gaps.every((g) => g >= 0.4), `items come one by one, not together (${at.join(", ")})`);
    assert.ok(Math.max(...gaps) - Math.min(...gaps) <= 0.2, `the pace is even (${at.join(", ")})`);
  } finally { await browser.close(); }
});

function chapterStory(duration: number, body: string): { file: string; scene: RenderScene } {
  const dir = mkdtempSync(join(tmpdir(), "sc-fit-ch-"));
  const file = join(dir, "story.md");
  writeFileSync(file, `# Chapter
lang: ru
voice: {"engine":"stub","name":"silent","cps":14}
frame: {"width":${W},"height":${H},"fps":10,"scale":1}

## part · slides.chapter
title: Что сделано за неделю
body: ${body}
duration: ${duration}
`);
  const g = generateFrom(file);
  const pitch = JSON.parse(readFileSync(g.pitchFile, "utf8")) as { theme: unknown; scenes: Array<{ effects?: unknown }> };
  return { file, scene: { page: g.pages.part!, duration, beats: 0, theme: pitch.theme, effects: pitch.scenes[0]!.effects, beatTexts: [], starts: [], spoken: 0 } };
}

// Набор заставки успевает до конца сцены. Прежде подзаголовок набирался своими 34 знаками в секунду
// с 2,4 с, и в пятисекундной сцене сотня знаков уходила в переход дописанной на треть.
test("a chapter's typed subtitle is whole by the scene's last frame, and lint names a duration too short to read it", async () => {
  const body = "Сервис анимаций уже в транке, показ в продуктах ждёт ревью, эффекты и слайдшоу ещё исследуем";
  const { scene } = chapterStory(5, body);
  const { chromium } = await import("playwright");
  const { dirname, resolve } = await import("node:path");
  const { fileURLToPath, pathToFileURL } = await import("node:url");
  const here = dirname(fileURLToPath(import.meta.url));
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    await ctx.addInitScript({ content: readFileSync(resolve(here, "..", "..", "browser", "clock.js"), "utf8") });
    await ctx.addInitScript({ content: readFileSync(resolve(here, "..", "..", "browser", "stage.js"), "utf8") });
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(scene.page).href);
    await p.evaluate((s) => window.__stage.mount(s as never), scene);
    const hiddenAt = (t: number): Promise<number> => p.evaluate((tt) => { window.__clock.seek(tt);
      const el = document.querySelector<HTMLElement>(".chapter-body")!;
      return [...el.querySelectorAll<HTMLElement>("*")].filter((g) => g.style.visibility === "hidden").length; }, t);
    assert.ok(await hiddenAt(3) > 0, "the subtitle is still being typed mid-scene");
    assert.equal(await hiddenAt(4.9), 0, "the whole subtitle is typed by the last frame");
  } finally { await browser.close(); }
  const { lint } = await import("../../lint.js");
  assert.deepEqual(lint(chapterStory(5, body).file).filter((f) => f.rule === "typing-too-fast"), [], "five seconds are enough");
  const short = lint(chapterStory(3.5, body).file).filter((f) => f.rule === "typing-too-fast");
  assert.equal(short.length, 1, "a 3.5 s chapter cannot type the subtitle readably");
  assert.match(short[0]!.message, /at least [\d.]+s or shorten the body/);
});
