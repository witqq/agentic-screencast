import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FFMPEG } from "../../voice/audio.js";
import { recordingPath } from "../../voice/recorded.js";

const entry = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

test("build reports decoded final streams, authored chapters and AAC true peak", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-final-audit-"));
  const recordings = join(dir, "recordings");
  mkdirSync(recordings);
  const lines = ["The opening is narrated.", "The details are narrated."];
  for (const line of lines) execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-f", "lavfi", "-i",
    "anoisesrc=d=1.5:c=white:a=0.8", "-af", "highpass=f=1100,lowpass=f=2800,volume=-12dB",
    "-ar", "48000", "-ac", "1", recordingPath(line, { engine: "recorded", dir: recordings })]);
  execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-f", "lavfi", "-i",
    "sine=frequency=440:duration=5", join(dir, "bed.wav")]);
  const story = `# Final film
lang: en
voice: {"engine":"recorded","dir":"${recordings}"}
frame: {"width":320,"height":180,"fps":10,"scale":1}
music: {"file":"bed.wav","bpm":120}

## first · slides.chapter
part: Opening
title: Opening
body: First part.
duration: 2

${lines[0]}

## second · slides.chapter
part: Details
title: Details
body: Second part.
duration: 2

${lines[1]}
`;
  writeFileSync(join(dir, "story.md"), story);
  const run = spawnSync("node", [entry, "build", "--source", "story.md", "--out", "film.mp4"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(run.status, 0, run.stderr.slice(-1500));
  const report = JSON.parse(run.stdout) as {
    audio: { encoded: { truePeak: number; integrated: number; corrected: boolean };
      loudness: { measured: number } };
    chapters: Array<{ name: string }>;
    beats: Array<{ start: number; spoken: number }>;
    audit: { expected: { frames: number; partNames: string[] };
      measured: { video: { frames: number; duration: number }; audio: { duration: number };
        chapters: Array<{ name: string }> }; issues: Array<{ code: string }> };
    warnings: string[];
  };
  assert.deepEqual(report.audit.expected.partNames, ["Opening", "Details"]);
  assert.equal(report.beats.length, 2);
  assert.deepEqual(report.chapters.map((chapter) => chapter.name), ["Opening", "Details"]);
  assert.deepEqual(report.audit.measured.chapters.map((chapter) => chapter.name), ["Opening", "Details"]);
  assert.equal(report.audit.measured.video.frames, report.audit.expected.frames);
  assert.ok(Math.abs(report.audit.measured.audio.duration - report.audit.measured.video.duration) < 0.15);
  assert.deepEqual(report.audit.issues, []);
  assert.deepEqual(report.warnings, []);
  assert.ok(report.audio.encoded.truePeak <= -1, `${report.audio.encoded.truePeak} dBTP`);
  assert.equal(report.audio.loudness.measured, report.audio.encoded.integrated);

  writeFileSync(join(dir, "story.md"), story.replace('music: {"file":"bed.wav","bpm":120}', "audio: false"));
  const silent = spawnSync("node", [entry, "build", "--source", "story.md", "--only", "second", "--out", "silent.mp4"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(silent.status, 0, silent.stderr.slice(-1500));
  const silentReport = JSON.parse(silent.stdout) as { audit: { expected: { audio: boolean; partNames: string[] };
    measured: { audioStreams: number }; issues: Array<{ code: string }> } };
  assert.equal(silentReport.audit.expected.audio, false);
  assert.equal(silentReport.audit.measured.audioStreams, 0);
  assert.deepEqual(silentReport.audit.expected.partNames, ["Details"]);
  assert.deepEqual(silentReport.audit.issues, []);
});
