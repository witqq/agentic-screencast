// Lint по самому материалу видеосцены: ровная пустая полоса в трети кадра и больше (серый
// заполнитель под страницей) и резкая смена экрана посреди куска там, где у дубля нет отметки
// (незамеченная навигация). Оба дефекта видны только в готовом вертикальном ролике,
// на готовом кадре — по сценарию их не заметить.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { lint } from "../../lint.js";
import { trimMarks } from "../../marks.js";

const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;

test("lint names a flat empty third of the frame and a screen change inside a piece that no mark explains", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-framelint-"));
  const make = (name: string, vf: string): void => {
    execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=540x960:duration=4:rate=25", "-vf", vf, "-pix_fmt", "yuv420p", join(dir, name)]);
  };
  make("clean.mp4", "null");
  make("filler.mp4", "drawbox=x=0:y=600:w=540:h=360:color=gray:t=fill");
  make("jump.mp4", "negate=enable='gte(t,2)',vflip=enable='gte(t,2)'");
  make("marked.mp4", "negate=enable='gte(t,2)',vflip=enable='gte(t,2)'");
  writeFileSync(join(dir, "clean.mp4.marks.json"), JSON.stringify({ version: 1, trimmed: 0, marks: { start: 0 }, clicks: [] }));
  writeFileSync(join(dir, "jump.mp4.marks.json"), JSON.stringify({ version: 1, trimmed: 0, marks: { start: 0 }, clicks: [] }));
  writeFileSync(join(dir, "marked.mp4.marks.json"), JSON.stringify({ version: 1, trimmed: 0, marks: { start: 0, next: 2 }, clicks: [] }));
  const scene = (id: string): string => `## ${id} · video\nfile: ${id}.mp4\n\nOne line of speech.\n\n`;
  writeFileSync(join(dir, "story.md"), `# F\nlang: en\nformat: vertical\nvoice: {"engine":"stub","name":"silent","cps":15}\n\n${["clean", "filler", "jump", "marked"].map(scene).join("")}`);
  const found = lint(join(dir, "story.md")).filter((f) => f.id === "empty-area" || f.id === "scene-jump");
  assert.deepEqual(found.map((f) => `${f.scene}:${f.id}`).sort(), ["filler:empty-area", "jump:scene-jump"], JSON.stringify(found));
  assert.match(found.find((f) => f.id === "scene-jump")!.message, /2\.0s into the piece/);
});

test("a recorded camera move is not navigation, but a later screen change remains a scene-jump", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-cameralint-"));
  const make = (name: string, vf: string): void => {
    execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=540x960:duration=5:rate=25",
      "-vf", vf, "-pix_fmt", "yuv420p", join(dir, name)]);
  };
  make("camera.mp4", "negate=enable='gte(t,2)'");
  make("navigation.mp4", "negate=enable='gte(t,2)',negate=enable='gte(t,3.5)'");
  for (const name of ["camera", "navigation"]) {
    writeFileSync(join(dir, `${name}.mp4.marks.json`), JSON.stringify({ version: 1, trimmed: 0,
      marks: { start: 0 }, clicks: [], cameraMoves: [{ from: 1.75, to: 2.25 }] }));
  }
  writeFileSync(join(dir, "story.md"), `# F\nlang: en\nformat: vertical\nvoice: {"engine":"stub","name":"silent","cps":15}\n\n`
    + `## camera · video\nfile: camera.mp4\n\nOne line.\n\n`
    + `## navigation · video\nfile: navigation.mp4\n\nAnother line.\n`);
  const found = lint(join(dir, "story.md")).filter((f) => f.id === "scene-jump");
  assert.deepEqual(found.map((f) => f.scene), ["navigation"], JSON.stringify(found));
  assert.match(found[0]!.message, /3\.5s into the piece/);
  const trimmed = trimMarks({ trimmed: 0, marks: {}, clicks: [], cameraMoves: [{ from: 1.75, to: 2.25 }] }, { from: 2, to: 4 });
  assert.deepEqual(trimmed?.cameraMoves, [{ from: 0, to: 0.25 }], "a cut retains the overlapping part of a camera move");
});
