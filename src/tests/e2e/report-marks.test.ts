// Отчёт сборки называет отметки живого дубля во времени ролика — после замедления и остановок, —
// и пути к файлам субтитров и глав на верхнем уровне: автор сверяет по ним фокусы и кадры,
// не пересчитывая секунды клипа вручную.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { filmTimeOf } from "../../speed.js";

const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

test("the build report gives a take's marks in film time after speed, and the subtitle and chapter files at its top level", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-report-marks-"));
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=s=320x180:r=10:d=5", "-c:v", "libx264", "-pix_fmt", "yuv420p", join(dir, "take.mp4")]);
  writeFileSync(join(dir, "take.mp4.marks.json"), JSON.stringify({ marks: { done: 3 }, clicks: [] }));
  const speed = [{ from: 1, to: 2, rate: 0.5 }];
  writeFileSync(join(dir, "story.md"), `# R
lang: en
voice: {"engine":"stub","name":"silent","cps":15}
frame: {"width":320,"height":180,"fps":10,"scale":1}
captions: {"style":"subtitle","srt":true}

## intro · slides.chapter
part: Start
title: Start
body: A short start
duration: 2

## v · video
part: Take
file: take.mp4
speed: ${JSON.stringify(speed)}
spotlight: [{"area":[0.1,0.1,0.4,0.4],"at":"@done"}]

The take slows down, then the focus lands on the finished state.
`);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "out.mp4"], { cwd: dir, encoding: "utf8",
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-800));
  const report = JSON.parse(r.stdout) as { marks?: Array<{ scene: string; mark: string; clip: number; film: number }>;
    beats: Array<{ scene: string; start: number }>; srt?: string; chaptersFile?: string };
  const done = report.marks?.find((m) => m.mark === "@done");
  assert.ok(done, `the report names the mark (${JSON.stringify(report.marks)})`);
  // Начало сцены в ролике — начало её первого такта (у видеосцены речь идёт с нуля сцены).
  const sceneStart = report.beats.find((b) => b.scene === "v")!.start;
  assert.equal(done.clip, 3);
  assert.ok(Math.abs(done.film - (sceneStart + filmTimeOf(speed, 3))) < 0.01, `@done is at ${done.film}s of the film (scene from ${sceneStart}s, +${filmTimeOf(speed, 3)}s)`);
  assert.ok(report.srt && existsSync(report.srt), `the report names the .srt (${report.srt})`);
  assert.ok(report.chaptersFile && existsSync(report.chaptersFile), `the report names the chapters file (${report.chaptersFile})`);
  // Тот же отчёт лежит файлом рядом с роликом: поток вывода читают один раз, файл — когда угодно.
  assert.equal(readFileSync(join(dir, "out.report.json"), "utf8").trim(), r.stdout.trim());
});
