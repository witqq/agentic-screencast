// Название части у полосы хода в вертикальном кадре читается на телефоне. Прежде его кегль был
// сотой долей ширины — 10 точек на 1080, — и метку «ИНТЕРФЕЙС» было не прочесть; горизонтальный
// кадр остаётся при своих 18 точках на 1920.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chapterFontPx, layerSafe, partLabelHeight } from "../../part-label.js";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { safeOf } from "../../format.js";
import { THEMES } from "../../theme.js";

const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");
const FFPROBE = (createRequire(import.meta.url)("@ffprobe-installer/ffprobe") as { path: string }).path;

/** Высота плашки названия части, нарисованной сборкой: она лежит в кэше рядом с сегментами. */
const labelHeight = (format: string): number => {
  const dir = mkdtempSync(join(tmpdir(), "sc-part-"));
  writeFileSync(join(dir, "story.md"), `# P\n${format}voice: {"engine":"stub","name":"silent","cps":15}\nframe: {"fps":5}\n`
    + `progress: {"position":"bottom","parts":true}\n\n## a · slides.chapter\ntitle: A\nbody: B\npart: Interface\n\nOne beat.\n`);
  const home = join(dir, ".home");
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: home } });
  assert.equal(r.status, 0, r.stderr.slice(-500));
  const chapters = join(home, "cache", "chapters");
  const file = join(chapters, readdirSync(chapters).find((f) => f.endsWith(".png"))!);
  return Number(execFileSync(FFPROBE, ["-v", "error", "-show_entries", "stream=height", "-of", "csv=p=0", file], { encoding: "utf8" }).trim());
};

test("the part label is at least 36 px on a 1080×1920 frame and keeps its size on a horizontal one", () => {
  assert.equal(chapterFontPx({ width: 1080, height: 1920 }), 36);
  assert.ok(Math.abs(chapterFontPx({ width: 1920, height: 1080 }) - 18.24) < 1e-9);
  // Строка в 1,2 кегля плюс поля плашки.
  const v = labelHeight("format: vertical\n");
  assert.ok(v >= 36 * 1.2, `the vertical label is ${v} px tall`);
  const h = labelHeight("");
  assert.ok(h < v && h >= 18 * 1.2, `the horizontal label keeps its size: ${h} px`);
});

test("in a vertical film with parts, subtitles stand above the part label at the zone's bottom", async () => {
  const W = 1080, H = 1920;
  const zone = safeOf("vertical", { width: W, height: H } as never, "safe", "platform")!;
  const safe = layerSafe({ safe: zone, progress: { position: "bottom", label: "zone", parts: true }, scenes: [{ chapter: "Interface" }] }, { width: W, height: H })!;
  assert.equal(safe.bottom, zone.bottom + partLabelHeight({ width: W, height: H }) + Math.round(zone.left * 0.6));
  assert.deepEqual(layerSafe({ safe: zone, progress: { position: "bottom", label: "zone", parts: true }, scenes: [{}] }, { width: W, height: H }), zone,
    "without parts the zone is the platform's");
  const here = dirname(fileURLToPath(import.meta.url));
  const dir = mkdtempSync(join(tmpdir(), "sc-part-sub-"));
  writeFileSync(join(dir, "p.html"), `<!doctype html><body style="margin:0;background:#223"></body>`);
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    await ctx.addInitScript({ content: readFileSync(resolve(here, "..", "..", "browser", "clock.js"), "utf8") });
    await ctx.addInitScript({ content: readFileSync(resolve(here, "..", "..", "browser", "stage.js"), "utf8") });
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(join(dir, "p.html")).href);
    await p.evaluate((s) => window.__stage.mount(s as never), { duration: 6, beats: 1, theme: THEMES.midnight, starts: [0], spoken: [5],
      safe, captionStyle: "karaoke", captionEverywhere: true, beatTexts: ["The build reads one file and makes a film out of it"], effects: {} });
    await p.evaluate(() => window.__clock.seek(2));
    const sub = await p.evaluate(() => document.querySelector("#__sub")!.getBoundingClientRect().bottom);
    const labelTop = H - zone.bottom - partLabelHeight({ width: W, height: H });
    assert.ok(sub <= labelTop, `subtitles end at ${sub.toFixed(0)}, above the label from ${labelTop}`);
  } finally { await browser.close(); }
});
