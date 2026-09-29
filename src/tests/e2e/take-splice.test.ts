// Смежные куски одного дубля склеиваются встык, без затемнения: правило 21 снимает живое
// приложение одним дублем, а затемнение в чёрное на каждом стыке выглядело перезагрузкой (замер
// базы: демо уходило в чёрный семь раз внутри одной записи). Автор, назвавший fade, решает сам.
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

const lumaAt = (file: string, t: number): number => {
  const raw = execFileSync(ffmpeg, ["-loglevel", "error", "-ss", String(t), "-i", file, "-frames:v", "1", "-vf", "scale=32:18,format=gray", "-f", "rawvideo", "-"]);
  return raw.reduce((a, v) => a + v, 0) / raw.length;
};

test("adjacent pieces of one take join edge to edge, and an authored fade still dips", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-splice-"));
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=s=320x180:r=10:d=4", "-c:v", "libx264", "-pix_fmt", "yuv420p", join(dir, "take.mp4")]);
  const story = (fade: string): string => `# S\nlang: en\nvoice: {"engine":"stub","name":"silent","cps":15}\nframe: {"width":320,"height":180,"fps":10,"scale":1}\n\n`
    + `## a · video\nfile: take.mp4\nfrom: 0\nto: 2\n${fade}\n## b · video\nfile: take.mp4\nfrom: 2\nto: 4\n`;
  // Стык — начало второй сцены по отчёту сборки: к клипу без речи прибавляется хвост сцены.
  const build = (fade: string, out: string): { file: string; splice: number } => {
    writeFileSync(join(dir, "story.md"), story(fade));
    const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", out], { cwd: dir, encoding: "utf8",
      env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
    assert.equal(r.status, 0, r.stderr.slice(-400));
    const report = JSON.parse(r.stdout) as { scenes: Array<{ id: string; start: number }> };
    return { file: join(dir, out), splice: report.scenes.find((x) => x.id === "b")!.start };
  };
  const around = (f: { file: string; splice: number }): number[] =>
    [-0.25, -0.15, -0.05, 0.05, 0.15].map((d) => lumaAt(f.file, Math.max(0, f.splice + d)));
  const joined = build("", "joined.mp4");
  const mid = lumaAt(joined.file, 0.8);
  assert.ok(Math.min(...around(joined)) > mid * 0.7, `no dip to black at the splice (${around(joined).map((v) => v.toFixed(0))} vs ${mid.toFixed(0)})`);
  const faded = build("fade: 0.4\n", "faded.mp4");
  assert.ok(Math.min(...around(faded)) < mid * 0.5, `an authored fade keeps its dip (${around(faded).map((v) => v.toFixed(0))})`);
});
