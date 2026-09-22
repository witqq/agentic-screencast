import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const CLI = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

test("a finished clip is reported as not judged by the frame criterion", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-video-check-"));
  const clip = join(dir, "clip.mp4");
  execFileSync(ffmpeg, ["-nostdin", "-y", "-loglevel", "error", "-f", "lavfi",
    "-i", "testsrc=size=320x180:rate=15:duration=2", "-pix_fmt", "yuv420p", clip]);
  writeFileSync(join(dir, "story.md"), [
    "# Video check",
    "lang: en",
    'voice: {"engine":"stub","name":"silent"}',
    "",
    "## shot · video",
    "file: clip.mp4",
    "",
  ].join("\n"));

  // Прежде такая сцена объявлялась негодной: клип открывался браузером
  // как страница, текста в нём не находилось, и признак слайда краснел
  // на нулевом объёме текста.
  const out = execFileSync("node", [CLI, "check", "--source", join(dir, "story.md")],
    { encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  const report = JSON.parse(out) as {
    failed: unknown[];
    byCriterion: { video: string[] };
    rows: Array<{ criterion: string; note?: string }>;
  };
  assert.deepEqual(report.failed, []);
  assert.deepEqual(report.byCriterion.video, ["shot"]);
  assert.equal(report.rows[0]!.criterion, "video");
  assert.match(report.rows[0]!.note ?? "", /признак кадра неприменим/);
});
