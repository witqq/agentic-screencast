// Лупа: внутри круга предмет увеличен в названное число раз, вне круга кадр тот же, что
// без лупы, — и на странице, и на готовом видео. Мера увеличения — ширина полосы известной
// ширины, мера «кадр тот же» — разность с кадром сборки без лупы вне круга.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");
const W = 1280, H = 720;
/** Полоса-мерка: 40 точек шириной, середина — в (620, 404). */
const BAR = { x: 600, y: 400, w: 40, h: 8 };

function build(dir: string, scene: string, name: string): string {
  writeFileSync(join(dir, `${name}.md`), `# L
lang: en
voice: {"engine":"stub","name":"silent","cps":15}
frame: {"width":${W},"height":${H},"fps":25,"scale":1}
${scene}`);
  const r = spawnSync("node", [ENTRY, "build", `${name}.md`, "--out", `${name}.mp4`], { cwd: dir, encoding: "utf8",
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-400));
  return join(dir, `${name}.mp4`);
}
function frame(file: string, t: number): Buffer {
  return execFileSync(ffmpeg, ["-loglevel", "error", "-ss", String(t), "-i", file, "-frames:v", "1",
    "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 64 * 1024 * 1024 });
}
/** Ширина пурпурной полосы: самая широкая пурпурная строка в полосе ±30 точек от y. */
function barWidth(f: Buffer, y: number): number {
  let best = 0;
  for (let yy = Math.max(0, y - 30); yy < Math.min(H, y + 30); yy++) {
    let n = 0;
    for (let x = 0; x < W; x++) { const i = (yy * W + x) * 3; if (f[i]! > 180 && f[i + 1]! < 90 && f[i + 2]! > 180) n++; }
    best = Math.max(best, n);
  }
  return best;
}
/** Средняя разность кадров вне круга лупы (с полосой запаса у края круга). */
function outside(a: Buffer, b: Buffer, cx: number, cy: number, r: number): number {
  let sum = 0, n = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (Math.hypot(x - cx, y - cy) < r + 16) continue;
    const i = (y * W + x) * 3;
    sum += Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!);
    n += 3;
  }
  return sum / n;
}

test("a loupe magnifies the subject inside its circle and leaves the frame around it as it was", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-loupe-"));
  writeFileSync(join(dir, "page.html"), `<!doctype html><html><body style="margin:0;background:#101826;font:14px system-ui;color:#9ab">
${"<p style='margin:6px 20px'>Fine print that should stay exactly as it was outside the lens.</p>".repeat(30)}
<div id="bar" style="position:absolute;left:${BAR.x}px;top:${BAR.y}px;width:${BAR.w}px;height:${BAR.h}px;background:#ff00ff"></div></body></html>`);
  const page = (overlay: string): string => `
## p · page
page: page.html
duration: 5
${overlay}`;
  // Камера в самом конце сцены — только чтобы у страницы не было наезда по умолчанию в первой трети.
  const size = 0.25, D = Math.round((size * W) / 2) * 2, cx = BAR.x + BAR.w / 2, cy = BAR.y + BAR.h / 2;
  const plain = build(dir, page('overlay: {"camera":[{"at":3.5,"move":0.4,"hold":0.8,"target":"#bar","scale":1.2}]}'), "plain");
  const lens = build(dir, page(`overlay: {"camera":[{"at":3.5,"move":0.4,"hold":0.8,"target":"#bar","scale":1.2}],"loupe":[{"at":1,"target":"#bar","scale":2,"size":${size},"hold":3}]}`), "lens");
  const a = frame(plain, 2.5), b = frame(lens, 2.5);
  const w0 = barWidth(a, cy), w1 = barWidth(b, cy);
  assert.ok(Math.abs(w0 - BAR.w) <= 2, `without the loupe the bar is ${w0} px`);
  assert.ok(Math.abs(w1 / w0 - 2) < 0.1, `inside the loupe the bar is twice as wide (${w1} vs ${w0})`);
  const diff = outside(a, b, cx, cy, D / 2);
  assert.ok(diff < 1, `outside the circle the frame is as it was (mean difference ${diff.toFixed(2)})`);
  // До и после окна лупы кадр тот же, что без неё.
  assert.ok(Math.abs(barWidth(frame(lens, 0.5), cy) - w0) <= 1, "no loupe before its moment");
});

test("a loupe over a clip magnifies its area the same way", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-loupe-v-"));
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", `color=c=0x203040:s=${W}x${H}:r=25:d=5`,
    "-vf", `drawbox=x=${BAR.x}:y=${BAR.y}:w=${BAR.w}:h=${BAR.h}:color=0xff00ff:t=fill`, "-c:v", "libx264", "-crf", "8", join(dir, "clip.mp4")]);
  const clip = (overlay: string): string => `
## v · video
file: clip.mp4
${overlay}`;
  const px = (BAR.x + BAR.w / 2) / W, py = (BAR.y + BAR.h / 2) / H;
  const plain = build(dir, clip(""), "plain");
  const lens = build(dir, clip(`overlay: {"loupe":[{"at":1,"point":[${px.toFixed(5)},${py.toFixed(5)}],"scale":3,"hold":3}]}`), "lens");
  const cy = BAR.y + BAR.h / 2;
  const w0 = barWidth(frame(plain, 2.5), cy), w1 = barWidth(frame(lens, 2.5), cy);
  assert.ok(Math.abs(w1 / w0 - 3) < 0.15, `the clip's bar is three times as wide inside the loupe (${w1} vs ${w0})`);
});
