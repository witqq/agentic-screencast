// Субтитр — не больше двух строк в кадре. Нарезка меряет куски шириной слов на canvas, а в кадре
// слово — отдельный блок с пробелом внутри и межбуквенным интервалом стиля; прежний счёт был уже
// строки на пробел, и кусок, который он клал в две строки, ложился в три (тизер из замера базы:
// «планёрки тонут в голосовых.»). Сборка теперь и считает строки по кадру, и предупреждает.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const ENTRY = resolve(here, "..", "..", "agentic-screencast.js");

test("a vertical plate karaoke subtitle stays within two lines in the frame", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-caplines-"));
  writeFileSync(join(dir, "p.html"), "<!doctype html><html><body style='margin:0;background:#1d1f24'></body></html>");
  writeFileSync(join(dir, "story.md"), `# F\nlang: ru\nformat: vertical\nzone: platform\ntheme: ember\nframe: {"fps":5}\n`
    + `voice: {"engine":"stub","name":"silent","cps":14}\ncaptions: {"style":"karaoke","look":"plate","everywhere":true}\n\n`
    + `## pain · page\npage: p.html\n\nОбычно договорённости после планёрки тонут в голосовых.\n`);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8",
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-400));
  const report = JSON.parse(r.stdout) as { warnings: Array<{ id: string; message: string }> };
  assert.deepEqual(report.warnings.filter((w) => w.id === "caption-lines").map((w) => w.message), []);
});

test("a plate's side padding is not taken from its line twice: a two-line beat stays two lines", () => {
  // Блок субтитров был уже полосы на два поля плашки, а поля лежат и внутри строки: тексту
  // оставалось на два поля меньше, чем считает нарезка, и кусок в 28 знаков ложился в три строки.
  const dir = mkdtempSync(join(tmpdir(), "sc-caplines-plate-"));
  writeFileSync(join(dir, "story.md"), `# F\nlang: en\nformat: vertical\nzone: platform\nframe: {"fps":5}\n`
    + `voice: {"engine":"stub","name":"silent","cps":13}\ncaptions: {"style":"karaoke","look":"plate","everywhere":true}\n\n`
    + `## a · slides.hero\ntitle: Hook\nduration: 3\n\nAn AI agent made this video.\n`);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8",
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-400));
  const report = JSON.parse(r.stdout) as { warnings: Array<{ id: string; message: string }> };
  assert.deepEqual(report.warnings.filter((w) => w.id === "caption-lines").map((w) => w.message), []);
});

test("the stage counts a subtitle's lines as they fall in the frame", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-caplines-stage-"));
  const page = join(dir, "p.html");
  writeFileSync(page, "<!doctype html><html><body style='background:#222'></body></html>");
  const text = "Планёрки тонут в голосовых.";
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
    for (const f of ["clock.js", "stage.js"]) await ctx.addInitScript({ content: readFileSync(resolve(here, "..", "..", "browser", f), "utf8") });
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(page).href);
    const lines = async (): Promise<number> => (await p.evaluate(() => (window as unknown as { __stage: { captionLines(): { lines: number } } }).__stage.captionLines())).lines;
    await p.evaluate((s) => (window as unknown as { __stage: { mount(x: unknown): void } }).__stage.mount(s),
      { id: "s", page, duration: 4, beats: 1, starts: [0], spoken: 3.5, caption: text, beatTexts: [text],
        captionStyle: "karaoke", captionEverywhere: true, subMax: 40 });
    const seek = (t: number): Promise<void> => p.evaluate((tt) => (window as unknown as { __clock: { seek(t: number): void } }).__clock.seek(tt), t);
    await seek(0.5);
    assert.equal(await lines(), 1, "a short line in a wide frame is one line");
    // Раскладка сузилась после нарезки: кусок в кадре лёг в три строки, и слой это видит.
    await p.addStyleTag({ content: "#__sub{width:260px !important}" });
    await seek(0.7);
    assert.ok(await lines() >= 3, `the stage sees the third line (${await lines()})`);
  } finally { await browser.close(); }
});

test("a word longer than the subtitle line wraps inside the frame, counts its lines, and lint names it first", async () => {
  // Слово-блок не переносился: имя переменной уходило за край кадра, а счёт строк видел одну.
  const dir = mkdtempSync(join(tmpdir(), "sc-caplines-word-"));
  const page = join(dir, "p.html");
  writeFileSync(page, "<!doctype html><html><body style='background:#222'></body></html>");
  const text = "AGENTIC_SCREENCAST_NO_LIVE_CAMERA_AND_MORE=1";
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
    for (const f of ["clock.js", "stage.js"]) await ctx.addInitScript({ content: readFileSync(resolve(here, "..", "..", "browser", f), "utf8") });
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(page).href);
    await p.evaluate((s) => (window as unknown as { __stage: { mount(x: unknown): void } }).__stage.mount(s),
      { id: "s", page, duration: 4, beats: 1, starts: [0], spoken: 3.5, caption: text, beatTexts: [text],
        captionStyle: "subtitle", captionEverywhere: true, subMax: 40, subScale: 1.6 });
    await p.evaluate(() => (window as unknown as { __clock: { seek(t: number): void } }).__clock.seek(0.6));
    const got = await p.evaluate(() => {
      const r = document.createRange();
      r.selectNodeContents(document.querySelector("#__sub")!);
      const right = Math.max(...[...r.getClientRects()].map((x) => x.right));
      return { right, lines: (window as unknown as { __stage: { captionLines(): { lines: number } } }).__stage.captionLines().lines };
    });
    assert.ok(got.right <= 1080, `the long word stays inside the frame (${got.right})`);
    assert.ok(got.lines >= 2, `its lines are counted (${got.lines})`);
  } finally { await browser.close(); }
  writeFileSync(join(dir, "story.md"), `# W\nlang: en\nformat: vertical\nvoice: {"engine":"stub","name":"silent","cps":13}\n\n## a · slides.hero\ntitle: T\nduration: 3\n\nSet ${text} first.\n`);
  const l = spawnSync("node", [ENTRY, "lint", "story.md"], { cwd: dir, encoding: "utf8" });
  assert.match(l.stdout + l.stderr, /"long-word"/u);
});
