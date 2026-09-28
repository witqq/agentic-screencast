// The codec can raise a safe pre-encode waveform. Judge the finished AAC while
// checking that an audio correction leaves the film's picture and chapters intact.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureEncodedPeak } from "../../encoded-audio.js";
import { FFMPEG, FFPROBE } from "../../voice/audio.js";

const dir = mkdtempSync(join(tmpdir(), "sc-encoded-peak-"));

const probe = (file: string): { streams: Array<{ codec_name: string; duration: string; nb_frames: string }>;
  format: { tags?: { title?: string } }; chapters: Array<{ start_time: string; end_time: string }> } =>
  JSON.parse(execFileSync(FFPROBE, ["-v", "error", "-show_streams", "-show_format", "-show_chapters", "-of", "json", file],
    { encoding: "utf8" })) as ReturnType<typeof probe>;

const pictureHash = (file: string): string => execFileSync(FFMPEG,
  ["-nostdin", "-loglevel", "error", "-i", file, "-map", "0:v:0", "-c:v", "copy", "-f", "hash", "-hash", "SHA256", "-"],
  { encoding: "utf8" }).trim();

const decodedPeak = (file: string): number => {
  const result = spawnSync(FFMPEG, ["-nostdin", "-hide_banner", "-i", file, "-map", "0:a:0", "-vn", "-af",
    "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr.slice(-400));
  const summary = result.stderr.slice(result.stderr.lastIndexOf("Summary:"));
  const peak = /True peak:\s*Peak:\s*(-?[\d.]+) dBFS/u.exec(summary);
  assert.ok(peak, summary);
  return Number(peak[1]);
};

test("hot finished AAC is corrected below -1 dBTP without changing video or chapters", () => {
  const file = join(dir, "hot.mp4"), metadata = join(dir, "chapters.txt");
  writeFileSync(metadata, ";FFMETADATA1\ntitle=Peak fixture\n[CHAPTER]\nTIMEBASE=1/1000\nSTART=0\nEND=1000\ntitle=Opening\n");
  execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error",
    "-f", "lavfi", "-i", "color=c=blue:s=320x180:r=24:d=2",
    "-f", "lavfi", "-i", "sine=frequency=1000:duration=2,volume=8",
    "-f", "ffmetadata", "-i", metadata, "-map", "0:v:0", "-map", "1:a:0",
    "-map_metadata", "2", "-map_chapters", "2", "-c:v", "libx264", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-shortest", file]);
  const before = probe(file), hash = pictureHash(file);
  assert.equal(before.streams[1]!.codec_name, "aac");
  assert.ok(decodedPeak(file) > -1, "fixture must distinguish a hot encoded AAC from a compliant one");

  const result = ensureEncodedPeak(file, "192k");
  const after = probe(file);
  assert.equal(result.corrected, true);
  assert.ok(result.truePeak !== null && result.truePeak <= -1, `measured ${result.truePeak} dBTP`);
  assert.ok(decodedPeak(file) <= -1, "an independent decoded-AAC meter confirms the ceiling");
  assert.equal(pictureHash(file), hash, "the H.264 packets are copied, not encoded again");
  assert.deepEqual(after.streams.map((s) => s.codec_name), before.streams.map((s) => s.codec_name));
  assert.equal(after.streams[0]!.duration, before.streams[0]!.duration);
  assert.equal(after.streams[0]!.nb_frames, before.streams[0]!.nb_frames);
  assert.equal(after.format.tags?.title, "Peak fixture");
  assert.deepEqual(after.chapters.map((c) => [c.start_time, c.end_time]),
    before.chapters.map((c) => [c.start_time, c.end_time]));
  const bytes = readFileSync(file);
  const second = ensureEncodedPeak(file, "192k");
  assert.equal(second.corrected, false);
  assert.ok(readFileSync(file).equals(bytes), "a compliant file is left untouched");
});

test("a silent AAC stream reports no measured loudness and needs no correction", () => {
  const file = join(dir, "silent.mp4");
  execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error",
    "-f", "lavfi", "-i", "color=c=blue:s=320x180:r=24:d=1",
    "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
    "-t", "1", "-c:v", "libx264", "-c:a", "aac", file]);
  assert.deepEqual(ensureEncodedPeak(file, "192k"), { truePeak: null, integrated: null, corrected: false });
});

test("a very short AAC stream still has a measured true peak when integrated loudness is undefined", () => {
  const file = join(dir, "short.mp4");
  execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error",
    "-f", "lavfi", "-i", "color=c=blue:s=320x180:r=24:d=0.2",
    "-f", "lavfi", "-i", "sine=frequency=1000:duration=0.2,volume=8",
    "-c:v", "libx264", "-c:a", "aac", "-shortest", file]);
  const result = ensureEncodedPeak(file, "192k");
  assert.equal(result.integrated, null);
  assert.ok(result.truePeak !== null && result.truePeak <= -1);
});
