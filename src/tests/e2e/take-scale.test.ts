// Телефонная вёрстка живёт при малой CSS-ширине, а запись Chromium идёт в CSS-пикселях: дубль
// при viewport 432×768 выходил роликом 432×768, растянутым на кадр 1080×1920, а контекст с
// deviceScaleFactor и запрошенный размер 1080×1920 клали картинку в угол. Множитель записи
// `scale` даёт настоящий кадр в пикселях устройства; lint называет растянутый дубль.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { recordTake } from "../../capture.js";
import { lint } from "../../lint.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const ffprobe = require("@ffprobe-installer/ffprobe").path as string;

const sizeOf = (f: string): string => execFileSync(ffprobe, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", f], { encoding: "utf8" }).trim();

test("a take with scale records the viewport in device pixels, filling the frame", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-scale-"));
  const out = await recordTake({ output: join(dir, "phone.webm"), viewport: { width: 432, height: 768 }, scale: 2.5, trimStart: false,
    prepare: async (p) => { await p.setContent('<body style="margin:0;background:#c33"><div style="position:fixed;right:0;bottom:0;width:40px;height:40px;background:#3c3"></div></body>'); } },
  async (take) => { await take.page.waitForTimeout(900); });
  assert.equal(sizeOf(out), "1080x1920");
  // Правый нижний угол страницы — в правом нижнем углу кадра, а не посреди него: картинка заняла кадр.
  const px = execFileSync(ffmpeg, ["-loglevel", "error", "-ss", "0.5", "-i", out, "-frames:v", "1", "-vf", "crop=20:20:1050:1890", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
  const g = px.reduce((a, v, i) => a + (i % 3 === 1 ? v : 0), 0) / (px.length / 3), r = px.reduce((a, v, i) => a + (i % 3 === 0 ? v : 0), 0) / (px.length / 3);
  assert.ok(g > r, `the bottom-right corner of the frame shows the page's green square (r ${r.toFixed(0)}, g ${g.toFixed(0)})`);
  await assert.rejects(recordTake({ output: join(dir, "x.webm"), scale: 9 }, async () => {}), /scale: expected 1–4/);
});

test("lint names a clip enlarged to fill the frame, and passes one recorded at the frame's size", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-small-"));
  for (const [name, size] of [["small", "432x768"], ["full", "1080x1920"]]) {
    execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-f", "lavfi", "-i", `testsrc=size=${size}:duration=2:rate=25`, "-pix_fmt", "yuv420p", join(dir, `${name}.mp4`)]);
  }
  const story = join(dir, "story.md");
  writeFileSync(story, `# S\nformat: vertical\nvoice: {"engine":"stub","name":"silent","cps":15}\n\n## a · video\nfile: small.mp4\n\n## b · video\nfile: full.mp4\n`);
  const found = lint(story).filter((f) => f.rule === "take-small");
  assert.deepEqual(found.map((f) => f.scene), ["a"]);
  assert.match(found[0]!.message, /432×768 .* enlarged 2\.50×/);
});
