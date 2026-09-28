// Переигранный отрезок с дорисовкой кадров (`interpolate`) внутри куска клипа другой частоты
// (29,97 кадра в секунду, как у многих роликов из сети): дорисованная часть шла в частоте ролика,
// простые — в частоте клипа, и склейка частей выдавала кадры без конца (25 минут, 485 МБ в кэше).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { speedFilter } from "../../speed.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const ffprobe = require("@ffprobe-installer/ffprobe").path as string;

test("a slowed span with drawn frames inside a 29.97 fps piece finishes with the computed length", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-speedrate-"));
  const clip = join(dir, "c.mp4");
  execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=320x180:duration=4:rate=30000/1001", "-pix_fmt", "yuv420p", clip]);
  for (const interpolate of ["motion", "blend"] as const) {
    const graph = speedFilter([{ from: 1, to: 2, rate: 0.5, interpolate }], 4, 30)!;
    const out = join(dir, `${interpolate}.mp4`);
    const r = spawnSync(ffmpeg, ["-loglevel", "error", "-y", "-i", clip, "-filter_complex", graph, "-map", "[v]", "-an", "-pix_fmt", "yuv420p", out], { timeout: 60_000 });
    assert.equal(r.status, 0, `${interpolate}: the retimed clip is written in time (${r.error?.message ?? r.stderr?.toString().slice(-200)})`);
    const dur = Number(execFileSync(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out], { encoding: "utf8" }));
    // 1 с до отрезка + 2 с замедленного отрезка + 2 с после = 5 с.
    assert.ok(Math.abs(dur - 5) < 0.1, `${interpolate}: ${dur}s instead of 5s`);
  }
});
