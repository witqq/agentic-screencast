// Набор на слайдах успевает к словам: код, набираемый «сам», кончается до второго такта, где голос
// называет строку, а команда терминала — так, чтобы успеть поработать и показать вывод до следующей
// команды и до конца сцены.
// Прежде код набирался на две трети сцены, и подсветка второго такта стояла на пустой строке, а три
// команды одного такта ещё набирались на 85 % сцены.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium, type Page } from "playwright";
import { generateFrom } from "../../generate.js";

const here = dirname(fileURLToPath(import.meta.url));
const CLOCK = readFileSync(resolve(here, "..", "..", "browser", "clock.js"), "utf8");
const STAGE = readFileSync(resolve(here, "..", "..", "browser", "stage.js"), "utf8");
const HEAD = `# T\nlang: en\nvoice: {"engine":"stub","name":"silent","cps":15}\nframe: {"width":1280,"height":720,"fps":25,"scale":1}\n\n`;

async function at<T>(story: string, id: string, scene: Record<string, unknown>, t: number, read: (p: Page) => Promise<T>): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), "sc-typing-"));
  writeFileSync(join(dir, "story.md"), story);
  const g = generateFrom(join(dir, "story.md"));
  const pitch = JSON.parse(readFileSync(g.pitchFile, "utf8")) as { scenes: Array<{ id: string; effects?: unknown }>; theme: unknown };
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await ctx.addInitScript({ content: CLOCK });
    await ctx.addInitScript({ content: STAGE });
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(g.pages[id]!).href);
    await p.evaluate((sc) => window.__stage.mount(sc as never), { theme: pitch.theme, effects: pitch.scenes.find((s) => s.id === id)!.effects, ...scene });
    await p.evaluate((tt) => window.__clock.seek(tt), t);
    return await read(p);
  } finally { await browser.close(); }
}

test("code that types itself is complete before the second beat, where the narration names its line", async () => {
  const lines = Array.from({ length: 14 }, (_, i) => `  const value${i} = compute(input, ${i}); // step ${i}`).join("\n");
  const story = `${HEAD}## c · slides.code\ntitle: The scenario\ncode: |\n${lines}\nhighlight: 7\n\nThe build reads this file.\n\nLine seven sets the background.\n`;
  const hidden = await at(story, "c", { duration: 12, beats: 2, starts: [0, 3.5] }, 3.4,
    (p) => p.evaluate(() => [...document.querySelectorAll("pre.code .src i")].filter((i) => (i as HTMLElement).style.visibility === "hidden").length));
  assert.equal(hidden, 0, `every character is typed when the second beat begins (${hidden} still hidden)`);
});

test("three commands of one beat have their output on screen before the scene ends", async () => {
  const story = `${HEAD}## s · slides.shell\ntitle: It runs\nitems: $ agentic-screencast lint launch.md :: ✔ lint clean | $ agentic-screencast build launch.md :: ✔ 12 scenes drawn | $ agentic-screencast handover launch.md :: ✔ ready to send\nduration: 3\n\nLint, build, hand over.\n`;
  const shown = await at(story, "s", { duration: 3, beats: 1, starts: [0] }, 2.9,
    (p) => p.evaluate(() => [...document.querySelectorAll(".term-late")].map((x) => (x as HTMLElement).style.display !== "none")));
  assert.ok(shown.length === 3 && shown.every(Boolean), `each command's output is visible before the scene ends (${JSON.stringify(shown)})`);
});

test("a typed command is set without ligatures, so a pair of hyphens is never drawn as one glyph", async () => {
  // Буквы набора — отдельные узлы, а Chromium строит лигатуру и через их границы: «--» моноширинного
  // шрифта темы становился одним знаком, и после смены видимости один дефис пропадал из кадра.
  const story = `${HEAD}## s · slides.shell\ntheme: terminal\nitems: $ tool lint story.md --format vertical :: ✔ ok\nduration: 3\n\nLint it.\n`;
  const got = await at(story, "s", { duration: 3, beats: 1, starts: [0] }, 2.5,
    (p) => p.evaluate(() => [...document.querySelectorAll(".term-in .__g")].map((g) => getComputedStyle(g).fontVariantLigatures)));
  assert.ok(got.length > 10 && got.every((v) => v === "none"), `every typed glyph has ligatures off (${[...new Set(got)].join(",")})`);
});

test("a terminal under a kicker and subtitles gives up height instead of overflowing its slide", async () => {
  // Окно терминала стояло высотой 520 точек: с надзаголовком и местом под субтитрами слайд
  // вылезал за свою область на 24 точки даже при уменьшении до 72 %.
  const story = `# T\nlang: en\nvoice: {"engine":"stub","name":"silent","cps":15}\ncaptions: {"style":"subtitle","look":"plate","everywhere":true}\n`
    + `frame: {"width":1920,"height":1080,"fps":25,"scale":1}\n\n## s · slides.shell\nkicker: The build\ntitle: It runs\n`
    + `items: $ npm test :: ✔ 3 passed | $ npm run build :: ✔ ready\nduration: 4\n\nIt runs.\n`;
  const got = await at(story, "s", { duration: 4, beats: 1, starts: [0] }, 2,
    (p) => p.evaluate(() => ({ overflow: document.body.dataset.overflow ?? null, fit: document.body.dataset.fit })));
  assert.equal(got.overflow, null, JSON.stringify(got));
});

test("a pipe inside a terminal command is written \\| and stays in the command", async () => {
  const story = `${HEAD}## s · slides.shell\nitems: $ cat build.log \\| grep warn :: 2 lines | ✔ done\nduration: 3\n\nFilter the log.\n`;
  const got = await at(story, "s", { duration: 3, beats: 1, starts: [0] }, 2.8,
    (p) => p.evaluate(() => ({ cmds: [...document.querySelectorAll(".term-in")].map((e) => e.textContent), blocks: document.querySelectorAll(".term-block").length })));
  assert.deepEqual(got, { cmds: ["cat build.log | grep warn"], blocks: 2 });
});

test("code that starts on the second beat types toward the next beat, not in an instant", async () => {
  // Срок брался от второго такта и тогда, когда код на нём и вставал: весь набор укладывался в миг.
  const lines = Array.from({ length: 8 }, (_, i) => `  const v${i} = step(${i});`).join("\n");
  const story = `${HEAD}## c · slides.code\ntitle: The scenario\ncode: |\n${lines}\nat: 3.2\n\nFirst beat.\n\nThe code arrives.\n\nIt is complete.\n`;
  const hiddenAt = (t: number): Promise<number> => at(story, "c", { duration: 12, beats: 3, starts: [0, 3, 8] }, t,
    (p) => p.evaluate(() => [...document.querySelectorAll("pre.code .src i")].filter((i) => (i as HTMLElement).style.visibility === "hidden").length));
  assert.ok(await hiddenAt(4.2) > 0, "a second after it starts, the code is still being typed");
  assert.equal(await hiddenAt(7.8), 0, "when the third beat begins the code is complete");
});
