// Тема сцены: часть ролика рисуется другой темой, чем весь ролик. Светлая `daylight` на
// тёмном `midnight` видна прямо по яркости кадра, поэтому тест меряет средний свет.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parseSource, sceneTheme } from "../../source.js";
import { resolveTheme } from "../../theme.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

const story = (second: string): string => `# Themes
lang: en
voice: {"engine":"stub","name":"silent","cps":15}
frame: {"width":640,"height":360,"fps":25,"scale":1}
theme: midnight

## a · slides.chapter
title: The film's own theme
body: Dark, as the film is.
duration: 2

## b · slides.chapter
title: A part in another theme
body: Light, as the scene asks.
duration: 2
${second}
`;

function meanLight(file: string, t: number): number {
  const f = execFileSync(ffmpeg, ["-loglevel", "error", "-ss", String(t), "-i", file, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-"]);
  return f.reduce((n, v) => n + v, 0) / f.length;
}

test("a scene's theme paints that scene, and the rest of the film keeps the film's theme", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-theme-"));
  writeFileSync(join(dir, "story.md"), story("theme: daylight"));
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8",
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-500));
  const a = meanLight(join(dir, "f.mp4"), 1.2), b = meanLight(join(dir, "f.mp4"), 3.4);
  assert.ok(a < 60, `the first scene stays dark midnight (mean ${a.toFixed(0)})`);
  assert.ok(b > 150, `the second scene is light daylight (mean ${b.toFixed(0)})`);
});

test("a named scene theme is taken whole; bare variables go over the film's theme", () => {
  const film = resolveTheme("midnight");
  assert.deepEqual(sceneTheme("daylight", film), resolveTheme("daylight"));
  assert.deepEqual(sceneTheme('{"preset":"noir","--acc":"#ff0000"}', film), { ...resolveTheme("noir"), "--acc": "#ff0000" });
  const tweaked = sceneTheme('{"--acc":"#ff0000"}', film);
  assert.equal(tweaked["--acc"], "#ff0000");
  for (const [k, v] of Object.entries(film)) if (k !== "--acc") assert.equal(tweaked[k], v, `${k} comes from the film's theme`);
});

test("an unknown scene theme is a parse error on the scene's line", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-theme-"));
  writeFileSync(join(dir, "story.md"), story("theme: daylite"));
  assert.throws(() => parseSource(join(dir, "story.md")), /line \d+: scene b: theme: unknown theme «daylite»/u);
});

test("frames draws a scene in its own theme, and names the PNG it wants for --out", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-theme-"));
  writeFileSync(join(dir, "story.md"), story("theme: daylight"));
  const env = { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") };
  for (const [id, light] of [["a", false], ["b", true]] as const) {
    const r = spawnSync("node", [ENTRY, "frames", "story.md", "--scene", id, "--out", `${id}.png`], { cwd: dir, encoding: "utf8", env });
    assert.equal(r.status, 0, r.stderr.slice(-400));
    const m = meanLight(join(dir, `${id}.png`), 0);
    assert.ok(light ? m > 150 : m < 60, `scene ${id} is ${light ? "light" : "dark"} in frames (mean ${m.toFixed(0)})`);
  }
  const bad = spawnSync("node", [ENTRY, "frames", "story.md", "--out", "sheet"], { cwd: dir, encoding: "utf8", env });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /--out: the sheet is a PNG file; name it with \.png, e\.g\. --out sheet\.png/u);
});
