// Наезд камеры на готовый клип движется плавно: край предмета идёт в одну сторону без возвратов.
// Прежде zoompan ставил окно на целые точки исходника, и при медленном наезде край ходил
// туда-обратно на точку-две (8–23 возврата за 3,3 с) — картинка интерфейса дрожала.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");
const W = 960, H = 540;

test("a slow push-in over a clip moves an edge one way, without jitter", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-smooth-"));
  // Кадр интерфейса: белый фон и тёмная вертикальная полоса, которую наезд уводит вправо.
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", `color=white:s=${W}x${H}:d=6:r=30`,
    "-vf", "drawbox=x=760:y=160:w=3:h=300:color=black:t=fill,drawbox=x=300:y=150:w=360:h=200:color=black:t=2",
    "-c:v", "libx264", "-crf", "12", "-pix_fmt", "yuv420p", join(dir, "clip.mp4")]);
  writeFileSync(join(dir, "story.md"), `# S\nlang: en\nvoice: {"engine":"stub","name":"silent","cps":15}\nframe: {"width":${W},"height":${H},"fps":30,"scale":1}\n\n`
    + `## clip · video\nfile: clip.mp4\nduration: 5\nfade: none\n`
    + `overlay: {"camera":[{"at":0.5,"area":[0.25,0.2,0.6,0.6],"scale":1.35,"move":3.5,"hold":0.8}]}\n`);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8",
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-400));
  const raw = execFileSync(ffmpeg, ["-loglevel", "error", "-ss", "0.6", "-t", "3.3", "-i", join(dir, "f.mp4"), "-vf", "format=gray", "-f", "rawvideo", "-"],
    { maxBuffer: 1 << 30 });
  const size = W * H, row = 300;
  // Положение полосы в строке — центр тяжести темноты в узком окне вокруг прошлого положения, без
  // порога: жёсткий порог на тонкой полосе сам по себе даёт скачки центра.
  const bar: number[] = [];
  let at = 761;
  for (let k = 0; k + size <= raw.length; k += size) {
    let sum = 0, weight = 0;
    for (let x = Math.round(at) - 12; x <= Math.round(at) + 12; x++) {
      const v = Math.max(0, 230 - raw[k + row * W + x]!);
      sum += x * v; weight += v;
    }
    if (weight) { at = sum / weight; bar.push(at); }
  }
  const steps = bar.slice(1).map((x, i) => x - bar[i]!);
  const back = steps.filter((d) => d < -0.05).length;
  assert.ok(bar.at(-1)! - bar[0]! > 20, `the push-in moves the bar right (${bar[0]!.toFixed(1)} → ${bar.at(-1)!.toFixed(1)})`);
  assert.equal(back, 0, `the bar never steps back (${steps.map((d) => d.toFixed(2)).join(" ")})`);
});
