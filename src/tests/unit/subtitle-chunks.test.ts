// Нарезка реплики на субтитры: кусков столько же, сколько нужно по длине, но они
// ровные, и хвост реплики не остаётся одним словом на экране.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chunks } from "../../film.js";

test("a beat a little over two subtitle lines splits into even halves, not a line and an orphan word", () => {
  const text = "Каждое слово этой речи подсвечивается, пока звучит, а субтитры не выходят за две строки.";
  assert.ok(text.length > 84, "the beat does not fit in one subtitle");
  const parts = chunks(text);
  assert.equal(parts.length, 2);
  assert.equal(parts.join(" "), text, "no word is lost or reordered");
  const [a, b] = parts.map((p) => p.length) as [number, number];
  assert.ok(Math.min(a, b) >= 0.6 * Math.max(a, b), `the two cues are even: ${parts.map((p) => `«${p}»`).join(" / ")}`);
});

/** Жадная нарезка: столько кусков нужно, чтобы каждый уместился в две строки. */
function greedy(text: string, max = 84): string[] {
  const out: string[] = [];
  let cur = "";
  for (const w of text.split(" ")) {
    if (cur && `${cur} ${w}`.length > max) { out.push(cur); cur = w; } else cur = cur ? `${cur} ${w}` : w;
  }
  return cur ? [...out, cur] : out;
}

test("even cuts keep every cue within two lines and use no more cues than needed", () => {
  const words = Array.from({ length: 60 }, (_, i) => ["a", "word", "longer", "narration", "x"][i % 5]!);
  for (let n = 1; n <= words.length; n++) {
    const text = words.slice(0, n).join(" ");
    const parts = chunks(text);
    assert.equal(parts.join(" "), text);
    assert.ok(parts.every((p) => p.length <= 84), `every cue fits: ${parts.map((p) => p.length).join(",")}`);
    assert.equal(parts.length, greedy(text).length, "as many cues as a greedy cut needs, no more");
    if (parts.length > 1) {
      const lens = parts.map((p) => p.length);
      assert.ok(Math.min(...lens) >= 0.5 * Math.max(...lens), `cues of ${n} words are even: ${lens.join(",")}`);
    }
  }
  assert.deepEqual(chunks("One short line."), ["One short line."]);
});

test("in a frame with a safe zone a subtitle chunk never takes more than two lines", async () => {
  const { chromium } = await import("playwright");
  const { readFileSync } = await import("node:fs");
  const { dirname, resolve } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { subtitleMax } = await import("../../film.js");
  const { THEMES } = await import("../../theme.js");
  const here = dirname(fileURLToPath(import.meta.url));
  const CLOCK = readFileSync(resolve(here, "..", "..", "browser", "clock.js"), "utf8");
  const STAGE = readFileSync(resolve(here, "..", "..", "browser", "stage.js"), "utf8");
  const safe = { top: 170, bottom: 484, left: 65, right: 180 };
  const frame = { width: 1080, height: 1920 };
  const max = subtitleMax(frame, safe, THEMES.midnight!);
  assert.ok(max < 84, `a vertical frame holds fewer characters in two lines than a landscape one (${max})`);
  assert.equal(subtitleMax({ width: 1920, height: 1080 }, undefined, THEMES.midnight!), 84);
  // Английская реплика и русская: у кириллицы знак шире, и длинное слово переносит строку
  // раньше, чем подсказывает число знаков.
  const texts = ["Fourteen ways to assemble a phrase, thirteen new slide kinds, and every one of them wears its theme.",
    "Четырнадцать способов собрать фразу, тринадцать новых видов слайдов."];
  const browser = await chromium.launch();
  try {
   for (const text of texts) {
    const ctx = await browser.newContext({ viewport: frame });
    await ctx.addInitScript({ content: CLOCK });
    await ctx.addInitScript({ content: STAGE });
    const p = await ctx.newPage();
    await p.goto("about:blank");
    await p.evaluate((s) => window.__stage.mount(s as never), { duration: 8, beats: 1, theme: THEMES.midnight, starts: [0], spoken: 7, safe,
      captionStyle: "karaoke", captionEverywhere: true, subMax: max, beatTexts: [text], effects: {} });
    for (let t = 0.2; t < 7; t += 0.4) {
      await p.evaluate((tt) => window.__clock.seek(tt), t);
      const lines = await p.evaluate(() => {
        const e = document.querySelector("#__sub") as HTMLElement;
        if (getComputedStyle(e).display === "none") return 0;
        return Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight));
      });
      assert.ok(lines <= 2, `«${text.slice(0, 20)}…» at ${t.toFixed(1)}s the subtitle takes ${lines} lines`);
    }
    await ctx.close();
   }
  } finally { await browser.close(); }
});

// Реплики о недельной работе: по счёту знаков они резались «прошли путь от / переписанного»
// и «что и когда / играть, и». Кусок кончается на знаке препинания или перед союзом и предлогом.
const MEANT = [
  ["За неделю анимации сцены прошли путь от переписанного движка до показа в редакторе и плеере.",
    ["За неделю анимации сцены прошли путь", "от переписанного движка до показа в редакторе и плеере."]],
  ["Раньше движок сам решал, что и когда играть, и помнил путь, которым пришёл в текущее состояние.",
    ["Раньше движок сам решал, что и когда играть,", "и помнил путь, которым пришёл в текущее состояние."]],
] as const;

test("a beat is cut where its sense breaks — after punctuation or before a clause or phrase — not inside a phrase", () => {
  for (const [text, want] of MEANT) assert.deepEqual(chunks(text), want);
  const narrow = chunks(MEANT[0][0], 40);
  assert.ok(narrow.every((p) => p.length <= 40), `narrow cues fit: ${narrow.join(" / ")}`);
  assert.ok(narrow.slice(0, -1).every((p) => !/\s(от|до|в|и|что)$/u.test(p)), `no cue ends on a preposition or conjunction: ${narrow.join(" / ")}`);
});

test("the frame shows a beat in the same pieces as the SRT", async () => {
  const { chromium } = await import("playwright");
  const { readFileSync } = await import("node:fs");
  const { dirname, resolve } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { THEMES } = await import("../../theme.js");
  const here = dirname(fileURLToPath(import.meta.url));
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    await ctx.addInitScript({ content: readFileSync(resolve(here, "..", "..", "browser", "clock.js"), "utf8") });
    await ctx.addInitScript({ content: readFileSync(resolve(here, "..", "..", "browser", "stage.js"), "utf8") });
    const p = await ctx.newPage();
    await p.goto("about:blank");
    const text = MEANT[1][0];
    await p.evaluate((s) => window.__stage.mount(s as never), { duration: 8, beats: 1, theme: THEMES.midnight, starts: [0], spoken: 7,
      captionStyle: "subtitle", captionEverywhere: true, beatTexts: [text], effects: {} });
    const seen: string[] = [];
    for (let t = 0.1; t < 7; t += 0.25) {
      const shown = await p.evaluate((tt) => { window.__clock.seek(tt); return (document.querySelector("#__sub") as HTMLElement).textContent!.replace(/\s+/g, " ").trim(); }, t);
      if (shown && seen[seen.length - 1] !== shown) seen.push(shown);
    }
    assert.deepEqual(seen, chunks(text));
  } finally { await browser.close(); }
});
