// Слои всего ролика и файл субтитров — проверка по готовому MP4.
//
// Полоса глав и ведущий в круге рисуются поверх склейки одним проходом;
// субтитры отсчитываются от начала ролика по измеренным тактам. Всё это
// проверяется на собранном файле: число в отчёте сборки не доказывает, что
// слой лёг в кадр.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { THEMES } from "../../theme.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const here = dirname(fileURLToPath(import.meta.url));
const ENTRY = resolve(here, "..", "..", "agentic-screencast.js");
const W = 640, H = 360;

/** Кадр ролика в момент t как сырые RGB. */
function frame(file: string, t: number): Buffer {
  return execFileSync(ffmpeg, ["-loglevel", "error", "-ss", String(t), "-i", file, "-frames:v", "1",
    "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 32 * 1024 * 1024 });
}
const px = (f: Buffer, x: number, y: number): [number, number, number] => {
  const i = (y * W + x) * 3;
  return [f[i]!, f[i + 1]!, f[i + 2]!];
};
/** Средняя разница двух прямоугольников кадров. */
function diff(a: Buffer, b: Buffer, x: number, y: number, w: number, h: number): number {
  let sum = 0;
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const p = px(a, xx, yy), q = px(b, xx, yy);
    sum += Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]);
  }
  return sum / (w * h * 3);
}

test("a film carries SRT subtitles, a chapter progress bar and a presenter circle", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-film-"));
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=size=320x240:rate=10:duration=4", join(dir, "me.mp4")]);
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=80x80:rate=10:duration=1", join(dir, "spin.gif")]);
  writeFileSync(join(dir, "story.md"), `# Film layers
lang: en
voice: {"engine":"stub","name":"silent","cps":20}
frame: {"width":${W},"height":${H},"fps":10,"scale":1}
theme: midnight
captions: {"style":"subtitle","srt":true}
progress: {"position":"bottom"}
pip: {"file":"me.mp4","corner":"bottom-right","size":0.2}

## one · slides.chapter
kicker: FIRST PART
title: The first part of the film
body: A short chapter with narration.

The first beat of the first chapter is spoken here.

A second beat follows and has its own start.

## two · slides.chapter
kicker: SECOND PART
title: The second part of the film
body: The label in the corner changes here.
overlay: {"stickers":[{"at":0.3,"image":"spin.gif","point":[0.4,0.4],"size":160,"hold":3}]}

The second chapter begins with this sentence.
`);
  const home = join(dir, ".home");
  const r = spawnSync("node", [ENTRY, "build", "--source", "story.md", "--out", "film.mp4"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: home } });
  assert.equal(r.status, 0, r.stderr);
  const report = JSON.parse(r.stdout) as { duration: number; srt: string; chapters: Array<{ name: string; start: number; end: number }>;
    beats: Array<{ start: number }> };
  // Кадр без слоёв ролика — тот же сценарий без полосы хода и ведущего (сегменты сцен берутся из кэша):
  // рабочий файл склейки сборка удаляет при выходе.
  writeFileSync(join(dir, "raw.md"), readFileSync(join(dir, "story.md"), "utf8").replace(/^progress: .*\n/mu, "").replace(/^pip: .*\n/mu, ""));
  const plain = spawnSync("node", [ENTRY, "build", "--source", "raw.md", "--out", "raw.mp4"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: home } });
  assert.equal(plain.status, 0, plain.stderr);
  const film = join(dir, "film.mp4"), raw = join(dir, "raw.mp4");

  // Субтитры: каждый такт начинается ровно там, где его поставил звук.
  const cues = [...readFileSync(report.srt, "utf8").matchAll(/(\d\d):(\d\d):(\d\d),(\d\d\d) -->/g)]
    .map((m) => Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000);
  assert.equal(report.beats.length, 3);
  for (const b of report.beats) assert.ok(cues.some((c) => Math.abs(c - b.start) < 0.002), `a cue starts at beat ${b.start}`);

  // Полоса хода: доля закрашенной ширины совпадает с долей прошедшего времени.
  const barRow = H - 2;
  const lit = (f: Buffer): number => {
    let n = 0;
    for (let x = 0; x < W; x++) { const [rr, , bb] = px(f, x, barRow); if (bb > 180 && rr > 80 && rr < 170) n++; }
    return n / W;
  };
  for (const share of [0.25, 0.7]) {
    const t = report.duration * share;
    assert.ok(Math.abs(lit(frame(film, t)) - share) < 0.05, `bar at ${share} of the film is ${lit(frame(film, t)).toFixed(3)} wide`);
  }

  // Название главы меняется на границе глав: слева внизу стоит своя картинка.
  assert.deepEqual(report.chapters.map((c) => c.name), ["FIRST PART", "SECOND PART"]);
  const c1 = report.chapters[0]!, c2 = report.chapters[1]!;
  // Рамка — там, где стоит плашка: отступ 1,8 % ширины слева, над полосой хода. Средняя разница по
  // широкой рамке тонула в фоне вокруг мелкой (6 точек при ширине кадра 640) надписи.
  const labelBox = [Math.round(W * 0.018) - 2, H - 30, 70, 18] as const;
  const inFirst = frame(film, c1.start + 1), inSecond = frame(film, c2.start + 1);
  const rawFirst = frame(raw, c1.start + 1);
  assert.ok(diff(inFirst, rawFirst, ...labelBox) > 8, "the first chapter's label is drawn over the film");
  assert.ok(diff(inFirst, inSecond, ...labelBox) > 8, "the label differs between chapters");

  // Ведущий в круге: внутри круга картинка клипа меняется, угол квадрата прозрачен.
  const D = Math.round(0.2 * W / 2) * 2, m = Math.round(W * 0.03);
  const x0 = W - D - m, y0 = H - D - m;
  const a = frame(film, 1.0), b = frame(film, 2.0);
  assert.ok(diff(a, b, x0 + D / 4, y0 + D / 4, D / 2, D / 2) > 4, "the circle shows the moving clip");
  assert.ok(diff(a, frame(raw, 1.0), x0 + 1, y0 + 1, 4, 4) < 6, "the square's corner stays transparent");
  // Кайма круга — в цвет акцента темы, а не белая.
  const acc = THEMES.midnight["--acc"]!.replace("#", "");
  const want = [0, 2, 4].map((k) => Number.parseInt(acc.slice(k, k + 2), 16));
  const edge = px(a, x0 + D / 2, y0 + 1);
  const dist = (p: number[], q: number[]): number => Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!);
  assert.ok(dist(edge, want) < dist(edge, [255, 255, 255]), `the ring takes the accent ${acc}, got ${edge.join(",")}`);

  // Стикер из GIF собирается — это путь, который руководство предлагает для анимаций.
  const s1 = frame(film, c2.start + 1.0), s2 = frame(film, c2.start + 1.25);
  assert.ok(diff(s1, s2, Math.round(0.4 * W) - 30, Math.round(0.4 * H) - 30, 60, 60) > 5, "the GIF sticker animates");
});
