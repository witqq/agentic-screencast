// Стильная рамка `device: frame`: клип на фоне темы с полями, скруглёнными углами и тенью, без
// корпуса и строки адреса. Области камеры у клипа в рамке — доли клипа, как у других рамок.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { deviceLayout, parseDevice } from "../../device.js";

const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

test("device: frame sets a clip on the theme's background with margins, round corners and a shadow, and aims the camera in clip fractions", () => {
  assert.deepEqual(parseDevice("frame"), { kind: "frame" });
  const dir = mkdtempSync(join(tmpdir(), "sc-frame-"));
  // Красный клип 1280×720 с белым квадратом в правой нижней четверти.
  execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=red:s=1280x720:d=4:r=25",
    "-vf", "drawbox=x=896:y=432:w=128:h=144:color=white:t=fill", "-pix_fmt", "yuv420p", join(dir, "clip.mp4")]);
  writeFileSync(join(dir, "story.md"), `# F\nvoice: {"engine":"stub","name":"silent","cps":15}\n\n## v · video\nfile: clip.mp4\ndevice: frame\nduration: 3.5\n`
    + `overlay: {"camera":[{"at":1.6,"move":0.5,"hold":1.2,"area":[0.7,0.6,0.1,0.2],"scale":2,"ring":false,"dim":0}]}\n`);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-400));
  const W = 1920, H = 1080;
  const at = (t: number): (x: number, y: number) => [number, number, number] => {
    const raw = execFileSync(ffmpeg, ["-loglevel", "error", "-ss", String(t), "-i", join(dir, "f.mp4"), "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 64 * 1024 * 1024 });
    return (x, y) => { const i = (Math.round(y) * W + Math.round(x)) * 3; return [raw[i]!, raw[i + 1]!, raw[i + 2]!]; };
  };
  const px = at(1.0);
  const l = deviceLayout({ kind: "frame" }, { x: W * 0.07, y: H * 0.08, w: W * 0.86, h: H * 0.84 }, 1280 / 720);
  const red = ([rr, g, b]: [number, number, number]): boolean => rr > 180 && g < 80 && b < 80;
  assert.ok(red(px(l.screen.x + l.screen.w / 2, l.screen.y + l.screen.h / 2)), "the clip fills the frame's screen");
  assert.ok(!red(px(l.screen.x - 30, l.screen.y + l.screen.h / 2)) && !red(px(20, 20)), "a margin of the theme's background surrounds it");
  assert.ok(!red(px(l.screen.x + 2, l.screen.y + 2)), "the corner is rounded off");
  // Тень: под нижним краем темнее, чем далеко в поле.
  const lum = ([rr, g, b]: [number, number, number]): number => rr * 0.3 + g * 0.59 + b * 0.11;
  const below = lum(px(l.screen.x + l.screen.w / 2, l.screen.y + l.screen.h + 10)), far = lum(px(l.screen.x + l.screen.w / 2, H - 4));
  assert.ok(below < far - 1, `a shadow darkens the margin under the clip (${below.toFixed(1)} under it, ${far.toFixed(1)} far away)`);
  // Наезд по доле клипа приводит белый квадрат к середине кадра.
  const hold = at(2.6);
  const white = ([rr, g, b]: [number, number, number]): boolean => rr > 220 && g > 220 && b > 220;
  assert.ok(white(hold(W / 2, H / 2)), "the camera aimed at the clip's square in clip fractions lands on it");
});
