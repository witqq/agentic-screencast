// Мелкий текст встроенного слайда в вертикальном кадре. Отчёт мерил кегль только у цели фокуса, и
// код или подписи узлов цепочки выходили мельче 36 точек на 1080 — нижней границы читаемого на
// телефоне (docs/vertical-video.md) — молча. Теперь слой меряет всю страницу слайда, сборка
// называет строки мельче порога, а встроенные виды держат порог сами.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { THEMES } from "../../theme.js";

const here = dirname(fileURLToPath(import.meta.url));
const ENTRY = resolve(here, "..", "..", "agentic-screencast.js");

test("the layer names lines under the threshold by their laid-out size, not by an entrance scale", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-small-"));
  writeFileSync(join(dir, "p.html"), `<!doctype html><html style="zoom:1.5"><body style="margin:0;background:#223;color:#eee">
    <p id="a" style="font-size:20px">Twenty grid points, thirty in the frame</p>
    <p style="font-size:30px;transform:scale(0.5)">Thirty grid points mid-entrance</p>
    <p style="font-size:14px;visibility:hidden">Hidden</p></body></html>`);
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
    await ctx.addInitScript({ content: readFileSync(resolve(here, "..", "..", "browser", "clock.js"), "utf8") });
    await ctx.addInitScript({ content: readFileSync(resolve(here, "..", "..", "browser", "stage.js"), "utf8") });
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(join(dir, "p.html")).href);
    await p.evaluate((s) => window.__stage.mount(s as never), { duration: 2, beats: 1, theme: THEMES.midnight, effects: {} });
    const small = await p.evaluate(() => window.__stage.smallText(36));
    assert.deepEqual(small, [{ text: "Twenty grid points, thirty in the frame", px: 30 }]);
  } finally { await browser.close(); }
});

test("built-in slides hold 36 px in a vertical frame, and a horizontal film is not measured", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-small-b-"));
  writeFileSync(join(dir, "d.csv"), "Jan,12\nFeb,18\nMar,15\nApr,30\n");
  const scenes = `## chn · slides.chain
kicker: Pipeline
title: The build
nodes: story.md | voice | frames | ffmpeg | MP4

One beat.

## tl · slides.timeline
kicker: When
title: Timeline
items: 2025 :: first build | 2026 :: vertical films | Next :: live cursor

One beat.

## code · slides.code
kicker: The scenario
title: story.md
code: ## hook · slides.hero\\ntitle: A film from one file of text that runs long\\nbody: Agentic Screencast

One beat.

## chart · slides.chart
kicker: Growth
title: Films per month
data: d.csv

One beat.
`;
  const build = (format: string): Array<{ id: string; small?: unknown }> => {
    writeFileSync(join(dir, "story.md"), `# S\n${format}voice: {"engine":"stub","name":"silent","cps":15}\nframe: {"fps":5}\n\n${scenes}`);
    const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
    assert.equal(r.status, 0, r.stderr.slice(-500));
    assert.doesNotMatch(r.stderr, /a phone reads/);
    return (JSON.parse(r.stdout) as { scenes: Array<{ id: string; small?: unknown }> }).scenes;
  };
  for (const s of build("format: vertical\n")) assert.equal(s.small, undefined, `${s.id}: ${JSON.stringify(s.small)}`);
  for (const s of build("")) assert.equal(s.small, undefined, `${s.id}: ${JSON.stringify(s.small)}`);
});
