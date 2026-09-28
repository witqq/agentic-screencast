// Кинонаезд: без рамки вокруг цели и без затемнения вокруг; по умолчанию — рамка и затемнение темы.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parseSpotlight } from "../../spotlight.js";
import { parseOverlay } from "../../overlay.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

test("ring and dim are read on a spotlight and a camera cue, and bad values are refused", () => {
  assert.equal(parseSpotlight('{"target":"#t","at":"b1","ring":false,"dim":0}')[0]!.ring, false);
  assert.throws(() => parseSpotlight('{"target":"#t","at":"b1","dim":2}'), /0–1/);
  const cam = parseOverlay('{"camera":[{"at":0.5,"hold":1,"target":"#t","ring":false,"dim":0.3}]}').camera![0]!;
  assert.equal(cam.ring, false);
  assert.equal(cam.dim, 0.3);
  assert.throws(() => parseOverlay('{"camera":[{"at":0.5,"hold":1,"target":"#t","ring":"no"}]}'), /ring/);
});

test("a push-in with ring: false and dim: 0 leaves no frame around the subject and no darkening around it", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-spot-plain-"));
  writeFileSync(join(dir, "p.html"), `<html><body style="margin:0;background:#888"><div id="t" style="position:absolute;left:560px;top:280px;width:160px;height:160px;background:#2266cc"></div></body></html>`);
  const frame = (spot: string): Buffer => {
    writeFileSync(join(dir, "story.md"), `# S\nvoice: {"engine":"stub","name":"silent","cps":15}\nframe: {"width":1280,"height":720,"fps":10,"scale":1}\n\n## one · page\npage: p.html\nduration: 3\nfade: none\nspotlight: ${spot}\n`);
    const out = join(dir, "f.mp4");
    const r = spawnSync("node", [ENTRY, "build", "--source", "story.md", "--out", out],
      { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
    assert.equal(r.status, 0, r.stderr);
    return execFileSync(ffmpeg, ["-loglevel", "error", "-ss", "2", "-i", out, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 64 * 1024 * 1024 });
  };
  const W = 1280, H = 720;
  const px = (b: Buffer, x: number, y: number): number[] => [b[(y * W + x) * 3]!, b[(y * W + x) * 3 + 1]!, b[(y * W + x) * 3 + 2]!];
  // Цель — синий прямоугольник; её рамка по кадру без затемнения.
  const box = (b: Buffer): { l: number; r: number; t: number; bt: number } => {
    let l = W, r = 0, t = H, bt = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const [cr, , cb] = px(b, x, y);
      if (cb! > cr! + 60) { l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); bt = Math.max(bt, y); }
    }
    return { l, r, t, bt };
  };
  // Полоса вокруг цели: от 4 до 14 точек за её краем — там рисуется рамка подсветки.
  const band = (b: Buffer, k: { l: number; r: number; t: number; bt: number }): number[][] => {
    const out: number[][] = [];
    for (let d = 4; d <= 14; d += 2) {
      for (let x = k.l; x <= k.r; x += 8) { out.push(px(b, x, k.t - d)); out.push(px(b, x, k.bt + d)); }
      for (let y = k.t; y <= k.bt; y += 8) { out.push(px(b, k.l - d, y)); out.push(px(b, k.r + d, y)); }
    }
    return out;
  };
  const plainF = frame('{"target":"#t","at":"0.3","ring":false,"dim":0}');
  const usualF = frame('{"target":"#t","at":"0.3"}');
  const k = box(plainF);
  assert.ok(k.r - k.l > 160, `the camera pushed in on the subject (${k.r - k.l} points wide)`);
  const off = (c: number[], ref: number[]): number => Math.abs(c[0]! - ref[0]!) + Math.abs(c[1]! - ref[1]!) + Math.abs(c[2]! - ref[2]!);
  const plainCorner = px(plainF, 20, 20), usualCorner = px(usualF, 20, 20);
  assert.ok(off(plainCorner, [0x88, 0x88, 0x88]) <= 12, `dim: 0 leaves the page around the subject at its own brightness (${plainCorner})`);
  assert.ok(usualCorner[0]! < 0x88 - 30, `by default the page around the subject is dimmed (${usualCorner})`);
  const ringPlain = band(plainF, k).filter((c) => off(c, plainCorner) > 30).length;
  const ringUsual = band(usualF, k).filter((c) => off(c, usualCorner) > 30).length;
  const n = band(plainF, k).length;
  assert.ok(ringUsual > n * 0.3, `by default a frame is drawn around the subject (${ringUsual} of ${n} band points differ from the dimmed page)`);
  assert.ok(ringPlain < n * 0.05, `ring: false draws none (${ringPlain} of ${n})`);
});
