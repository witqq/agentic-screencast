// Отделка ролика по готовому файлу: вид плёнки, тема из фирменных цветов и
// клип в рамке устройства. Всё проверяется по кадрам собранного MP4.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { brandTheme, contrast, dominantColors, parseHex } from "../../brand.js";
import { THEMES } from "../../theme.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");
const W = 320, H = 180;

const frame = (file: string, t: number): Buffer => execFileSync(ffmpeg, ["-loglevel", "error", "-ss", String(t), "-i", file,
  "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
const luma = (f: Buffer, x0: number, y0: number, w: number, h: number): number => {
  let s = 0;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const i = (y * W + x) * 3; s += (f[i]! + f[i + 1]! + f[i + 2]!) / 3; }
  return s / (w * h);
};
const pixel = (f: Buffer, x: number, y: number): [number, number, number] => {
  const i = (Math.round(y) * W + Math.round(x)) * 3;
  return [f[i]!, f[i + 1]!, f[i + 2]!];
};

function build(dir: string, story: string): { status: number | null; stderr: string; stdout: string } {
  writeFileSync(join(dir, "story.md"), story);
  return spawnSync("node", [ENTRY, "build", "--source", "story.md", "--out", "f.mp4"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
}
const HEAD = (extra = ""): string => `# Look\nvoice: {"engine":"stub","name":"silent"}\nframe: {"width":${W},"height":${H},"fps":10,"scale":1}\n${extra}\n`;
const GREY = "<!doctype html><html><body style=\"margin:0;background:#808080\"></body></html>";

test("a film look darkens the corners, grains the picture over time and rebuilds to the same frames", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-look-"));
  writeFileSync(join(dir, "grey.html"), GREY);
  // Страница без подсветки: умолчание поставщика включает её на 55 % сцены, и
  // соседние кадры различались бы и без всякого зерна. Кадры — после того, как
  // курсор дошёл до места (40 % сцены).
  const scene = "## g · page\npage: grey.html\nspotFrom: 1000%\nduration: 2\n";
  const plain = build(dir, HEAD() + scene);
  assert.equal(plain.status, 0, plain.stderr);
  const p5 = frame(join(dir, "f.mp4"), 1.2), p6 = frame(join(dir, "f.mp4"), 1.3);
  const edge = (f: Buffer): number => (luma(f, 0, 0, 24, 24) + luma(f, W - 24, H - 24, 24, 24)) / 2;
  const centre = (f: Buffer): number => luma(f, W / 2 - 20, H / 2 - 20, 40, 40);
  assert.ok(Math.abs(edge(p5) - centre(p5)) < 3, "without a look the grey frame is even");
  // Кодировщик не воспроизводит неподвижный кадр побайтно, поэтому сравнение —
  // по средней разности: без зерна она почти нулевая, с зерном — заметная.
  const meanDiff = (x: Buffer, y: Buffer): number => { let d = 0; for (let i = 0; i < x.length; i++) d += Math.abs(x[i]! - y[i]!); return d / x.length; };
  const still = meanDiff(p5, p6);
  assert.ok(still < 0.5, `without a look neighbouring frames of a still page are nearly the same (${still.toFixed(3)})`);

  const looked = build(dir, HEAD(`look: {"vignette":0.8,"grain":0.6}`) + scene);
  assert.equal(looked.status, 0, looked.stderr);
  const a = frame(join(dir, "f.mp4"), 1.2), b = frame(join(dir, "f.mp4"), 1.3);
  assert.ok(centre(a) - edge(a) > 25, `corners darker than the centre (${edge(a).toFixed(1)} vs ${centre(a).toFixed(1)})`);
  const md5 = (x: Buffer): string => createHash("md5").update(x).digest("hex");
  assert.ok(meanDiff(a, b) > still + 1, `grain differs between neighbouring frames of a still page (${meanDiff(a, b).toFixed(3)})`);
  const again = build(dir, HEAD(`look: {"vignette":0.8,"grain":0.6}`) + scene);
  assert.equal(again.status, 0, again.stderr);
  assert.equal(md5(frame(join(dir, "f.mp4"), 1.2)), md5(a), "a rebuild gives the same grained frame");
});

test("a brand theme takes the two dominant colours of a picture and stays readable", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-brand-"));
  const logo = join(dir, "logo.png");
  // Белый фон, крупное оранжевое поле и бирюзовая полоса: как у типичного логотипа.
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "color=c=white:s=400x200", "-frames:v", "1",
    "-vf", "drawbox=x=20:y=20:w=220:h=160:color=0xe4572e:t=fill,drawbox=x=270:y=60:w=110:h=80:color=0x17bebb:t=fill", logo]);
  const found = dominantColors(logo);
  const hue = (c: [number, number, number]): number => {
    const [r, g, b] = c.map((v) => v / 255) as [number, number, number];
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };
  assert.equal(found.length, 2);
  assert.ok(Math.abs(hue(found[0]!) - hue(parseHex("#e4572e"))) < 12, `first colour is the orange (${hue(found[0]!).toFixed(0)}°)`);
  assert.ok(Math.abs(hue(found[1]!) - hue(parseHex("#17bebb"))) < 12, `second colour is the teal (${hue(found[1]!).toFixed(0)}°)`);
  for (const base of ["midnight", "daylight"]) {
    const theme = brandTheme(found, base);
    const bg = parseHex(THEMES[base]!["--bg"]!);
    assert.ok(contrast(parseHex(theme["--acc"]!), bg) >= 4.5, `${base}: the accent reads on the background`);
    assert.ok(contrast(parseHex(theme["--acc2"]!), bg) >= 4.5, `${base}: the second accent reads on the background`);
  }
  // Слайд в этой теме проходит проверку кадра, включая контраст.
  const said = spawnSync("node", [ENTRY, "theme", "--from", logo, "--base", "daylight"], { encoding: "utf8" });
  assert.equal(said.status, 0, said.stderr);
  const header = (JSON.parse(said.stdout) as { header: string }).header;
  writeFileSync(join(dir, "story.md"), `# Brand\nvoice: {"engine":"stub","name":"silent"}\n${header}\n\n`
    + "## s · slides.steps\ntitle: Brand colours\nitems: One :: first | Two :: second\n\nBeat one.\n\nBeat two.\n");
  const check = spawnSync("node", [ENTRY, "check", "--source", "story.md"], { cwd: dir, encoding: "utf8" });
  assert.equal(check.status, 0, check.stdout.slice(0, 600));
});

test("a clip in a device frame sits in the screen, and camera areas are fractions of the clip", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-device-"));
  // Клип: левая верхняя четверть зелёная, остальное красное.
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "color=c=red:s=640x360:d=4:r=10",
    "-vf", "drawbox=x=0:y=0:w=128:h=72:color=lime:t=fill", "-c:v", "libx264", "-pix_fmt", "yuv420p", join(dir, "clip.mp4")]);
  // Кадры берутся вне затемнений входа и выхода (0,65 с у видеосцены).
  const r = build(dir, HEAD() + "## v · video\nfile: clip.mp4\ndevice: browser app.example.com\nduration: 3.5\n"
    + 'overlay: {"camera":[{"at":0.9,"move":0.4,"hold":1.4,"area":[0,0,0.2,0.2],"scale":2.4}]}\n');
  assert.equal(r.status, 0, r.stderr);
  const out = join(dir, "f.mp4");
  const still = frame(out, 0.75);
  const red = (p: [number, number, number]): boolean => p[0] > 180 && p[1] < 80 && p[2] < 80;
  const green = (p: [number, number, number]): boolean => p[1] > 160 && p[0] < 110;
  assert.ok(red(pixel(still, W * 0.6, H * 0.6)), "the clip fills the screen of the frame");
  assert.ok(!red(pixel(still, 3, 3)) && !green(pixel(still, 3, 3)), "around the device is the theme background, not the clip");
  // Наезд на область клипа [0,0,0.2,0.2]: в центре кадра — зелёный угол клипа.
  // Без перевода в доли кадра наезд пришёлся бы на фон вокруг рамки.
  const zoomed = frame(out, 1.9);
  assert.ok(green(pixel(zoomed, W / 2, H / 2)), `the camera arrives at the clip's corner (${pixel(zoomed, W / 2, H / 2).join(",")})`);
});
