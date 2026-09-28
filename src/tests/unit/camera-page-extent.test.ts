// Камера ограничивает смещение краями всей страницы, а не тела документа. У страницы, где блоки
// расставлены абсолютно, тело высотой в одну шапку: прежде ограничение ставило эту полоску в середину
// кадра, страница уезжала вниз, а цель фокуса ложилась в нижний край кадра, под субтитры.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { rawOf } from "../support.js";

const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");
const W = 1280, H = 720;

test("a spotlight on a page of absolutely placed blocks keeps its target up in the frame, not under the subtitles", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-page-extent-"));
  mkdirSync(join(dir, "pages"));
  // Страница под кадр 1920×1080, как у продукта: шапка в потоке, остальное — абсолютно.
  writeFileSync(join(dir, "pages", "app.html"), `<!doctype html><body style="margin:0;background:#8a8f99">
    <div style="height:70px;background:#6b7079"></div>
    <div id="total" style="position:absolute;left:180px;top:200px;width:360px;height:160px;background:#ffffff"></div></body>`);
  writeFileSync(join(dir, "story.md"), `# P\nlang: en\nvoice: {"engine":"stub","name":"silent","cps":15}\nframe: {"width":${W},"height":${H},"fps":10,"scale":1}\n\n## ui · page\npage: pages/app.html\nduration: 5\nspotlight: #total @ 0.4s\n\nThe total is here.\n`);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "out.mp4"], { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-600));
  const raw = rawOf(execFileSync(ffmpeg, ["-loglevel", "error", "-i", join(dir, "out.mp4"), "-ss", "2.5", "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"]));
  // Середина белого блока цели по вертикали: точки ярче 235.
  let sum = 0, n = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 3; if (raw[i]! > 235 && raw[i + 1]! > 235 && raw[i + 2]! > 235) { sum += y; n++; } }
  assert.ok(n > 500, `the target is on the frame (${n} points)`);
  assert.ok(sum / n < H * 0.55, `the target's middle is in the upper part of the frame (${(sum / n / H * 100).toFixed(0)}% of the height), not pushed down under the subtitles`);
});
