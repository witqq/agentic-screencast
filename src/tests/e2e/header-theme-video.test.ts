// Тема шапки красит весь ролик, и видеосцены тоже. Прежде ключ кэша видеосцены не включал тему
// ролика: у слайда тема вписана в его страницу и меняет ключ сама, а у видеосцены «страница» —
// клип, и после правки темы в шапке сегмент брался из кэша со старыми субтитрами. Так владелец
// получил двойные субтитры: токены, спрятавшие субтитры инструмента, подействовали только на слайды.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { rawOf } from "../support.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");
const W = 640, H = 360;

function build(dir: string, ink: string): Uint8Array {
  writeFileSync(join(dir, "story.md"), `# T
lang: en
voice: {"engine":"stub","name":"silent","cps":12}
frame: {"width":${W},"height":${H},"fps":10,"scale":1}
captions: {"style":"subtitle"}
theme: {"preset":"midnight","--sc-sub-outline-ink":"${ink}"}

## v · video
file: clip.mp4
duration: 4

Subtitles over the clip wear the header's ink.
`);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "out.mp4"], { cwd: dir, encoding: "utf8",
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-600));
  const png = join(dir, `${ink.slice(1)}.png`);
  execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-ss", "1.5", "-i", join(dir, "out.mp4"), "-frames:v", "1", png]);
  return rawOf(readFileSync(png));
}

/** Сколько точек нижней трети кадра близки к цвету. */
function count(raw: Uint8Array, [r, g, b]: [number, number, number]): number {
  let n = 0;
  for (let y = Math.round(H * 0.6); y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3;
    if (Math.abs(raw[i]! - r) < 60 && Math.abs(raw[i + 1]! - g) < 60 && Math.abs(raw[i + 2]! - b) < 60) n++;
  }
  return n;
}

test("a video scene without its own theme draws subtitles in the ink the film's header names, also after the header changes", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-head-theme-"));
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", `color=c=0x505050:s=${W}x${H}:r=10:d=4`, "-c:v", "libx264", "-pix_fmt", "yuv420p", join(dir, "clip.mp4")]);
  const red = build(dir, "#ff2020");
  assert.ok(count(red, [255, 32, 32]) > 50, "the subtitles are drawn in the header's red");
  const green = build(dir, "#20ff20");
  assert.ok(count(green, [32, 255, 32]) > 50, "after the header changes to green, the video scene is drawn again in green");
  assert.ok(count(green, [255, 32, 32]) < 10, "and no red subtitle is left from the cached segment");
});
