// Клип другой пропорции в кадре: `contain` оставляет поля, `cover` заполняет кадр и держит точку.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parseFit } from "../../fit.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

test("the fit field reads a mode and a point, and refuses the rest", () => {
  assert.deepEqual(parseFit("cover"), { mode: "cover", x: 0.5, y: 0.5 });
  assert.deepEqual(parseFit("cover 0.2 1"), { mode: "cover", x: 0.2, y: 1 });
  assert.deepEqual(parseFit('{"mode":"cover","y":0}'), { mode: "cover", x: 0.5, y: 0 });
  assert.throws(() => parseFit("stretch"), /contain or cover/);
  assert.throws(() => parseFit("contain 0.5 0.5"), /only cover/);
  assert.throws(() => parseFit("cover 2 0"), /0…1/);
});

test("a square clip fills a wide frame with fit: cover, and the point chooses the part kept in frame", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-fit-"));
  // Квадратный клип: верхняя половина красная, нижняя синяя.
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "color=c=0xe03030:s=180x90:r=10:d=3",
    "-f", "lavfi", "-i", "color=c=0x3030e0:s=180x90:r=10:d=3", "-filter_complex", "[0:v][1:v]vstack", join(dir, "sq.mp4")]);
  const scene = (id: string, fit: string): string => `## ${id} · video\nfile: sq.mp4\nto: 1\ntail: 0\nfade: none\n${fit}\n`;
  writeFileSync(join(dir, "story.md"), `# F
voice: {"engine":"stub","name":"silent","cps":15}
frame: {"width":320,"height":180,"fps":10,"scale":1}

${scene("contain", "")}
${scene("top", "fit: cover 0.5 0")}
${scene("bottom", "fit: cover 0.5 1")}`);
  const r = spawnSync("node", [ENTRY, "build", "--source", "story.md", "--out", "f.mp4"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr);
  const px = (t: number, x: number, y: number): number[] => [...execFileSync(ffmpeg, ["-loglevel", "error", "-ss", String(t),
    "-i", join(dir, "f.mp4"), "-frames:v", "1", "-vf", `format=rgb24,crop=2:2:${x}:${y}`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"])].slice(0, 3);
  const kind = ([r, , b]: number[]): string => (r! > b! + 80 ? "red" : b! > r! + 80 ? "blue" : "other");
  // contain: по бокам поля, клип только посередине.
  assert.equal(kind(px(0.5, 10, 44)), "other", "contain leaves a bar at the left edge");
  assert.equal(kind(px(0.5, 160, 44)), "red", "contain shows the clip in the middle");
  // cover: края кадра — клип; точка 0 держит верх (красный), точка 1 — низ (синий).
  // Кадр 320×180 из клипа, растянутого до 320×320, — это 56 % его высоты: точка 0 берёт строки
  // 0–180 (красное до 160), точка 1 — строки 140–320 (синее с 20-й строки кадра).
  for (const [t, want, rows] of [[1.5, "red", [4, 90, 150]], [2.5, "blue", [30, 90, 174]]] as const) {
    for (const [x, y] of rows.flatMap((row) => [[4, row], [314, row], [160, row]])) {
      assert.equal(kind(px(t, x!, y!)), want, `cover at ${t}s fills (${x},${y}) with the ${want} part`);
    }
  }
});
