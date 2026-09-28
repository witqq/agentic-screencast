import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { auditFilm, type AuditChapter } from "../../film-audit.js";

const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;

test("final encoded streams and chapter cues are audited independently of the report", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-film-audit-"));
  const chapters: AuditChapter[] = [
    { name: "Intro", start: 0, end: 1.5 },
    { name: "Detail", start: 1.5, end: 3 },
  ];
  const encode = (name: string, videoSeconds: number, audioSeconds?: number): string => {
    const file = join(dir, name);
    execFileSync(ffmpeg, ["-nostdin", "-y", "-loglevel", "error", "-f", "lavfi", "-i",
      `color=c=black:s=160x90:r=10:d=${videoSeconds}`,
      ...(audioSeconds === undefined ? [] : ["-f", "lavfi", "-i", `sine=frequency=440:sample_rate=48000:duration=${audioSeconds}`]),
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart", file]);
    return file;
  };
  const codes = (file: string, chapterFile?: string): string[] => auditFilm({ file, expectedFrames: 30, fps: 10, audio: true,
    reportedChapters: chapters, expectedPartNames: ["Intro", "Detail"], ...(chapterFile ? { chaptersFile: chapterFile } : {}) })
    .issues.map((issue) => issue.code);
  try {
    const good = encode("good.mp4", 3, 3);
    const shortAudio = encode("short-audio.mp4", 3, 2);
    const shortBoth = encode("short-both.mp4", 2, 2);
    const vtt = join(dir, "good.chapters.vtt");
    writeFileSync(vtt, "WEBVTT\n\n1\n00:00:00.000 --> 00:00:01.500\nIntro\n\n2\n00:00:01.500 --> 00:00:03.000\nDetail\n");
    const baseline = auditFilm({ file: good, expectedFrames: 30, fps: 10, audio: true,
      chaptersFile: vtt, expectedPartNames: ["Intro", "Detail"], reportedChapters: chapters });
    assert.deepEqual(baseline.issues, []);
    assert.equal(baseline.measured.video?.frames, 30);
    assert.equal(baseline.measured.video?.codec, "h264");
    assert.equal(baseline.measured.audio?.codec, "aac");
    assert.deepEqual(auditFilm({ file: good, expectedFrames: 30, fps: 10, audio: true,
      chaptersFile: vtt, reportedChapters: chapters }).issues, [], "implicit chapters need no explicit part list");
    const wrongReport = auditFilm({ file: good, expectedFrames: 30, fps: 10, audio: true, chaptersFile: vtt,
      expectedPartNames: ["Intro", "Detail"], reportedChapters: [{ ...chapters[0]!, name: "Wrong" }, chapters[1]!] });
    assert.ok(wrongReport.issues.some((issue) => issue.code === "chapters.reportName"));

    const audio = codes(shortAudio, vtt);
    assert.ok(audio.includes("audio.duration"), audio.join(", "));
    assert.ok(!audio.includes("video.duration") && !audio.includes("video.frameCount"), audio.join(", "));
    const both = codes(shortBoth, vtt);
    assert.ok(both.includes("video.duration") && both.includes("video.frameCount"), both.join(", "));
    assert.ok(!both.includes("audio.duration"), both.join(", "));

    writeFileSync(vtt, "WEBVTT\n\n1\n00:00:00.000 --> 00:00:01.500\nIntro\n");
    const cue = codes(good, vtt);
    assert.ok(cue.includes("chapters.cueCount"), cue.join(", "));
    assert.ok(!cue.includes("video.duration") && !cue.includes("audio.duration"), cue.join(", "));

    const silent = auditFilm({ file: encode("silent.mp4", 2), expectedFrames: 20, fps: 10,
      audio: false, reportedChapters: [] });
    assert.deepEqual(silent.issues, []);
    assert.equal(silent.measured.audioStreams, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
