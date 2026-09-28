// Отчёт называет громкость ГОТОВОГО звука: прежде в `audio.loudness.measured` стоял замер смеси до
// нормировки (−12,59 при готовых −13,9 в пересборке трейлера).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

test("the build report's loudness is the finished film's, within half a LU of ebur128", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-lufs-"));
  mkdirSync(join(dir, "a"));
  // Громкая музыка: до нормировки смесь заметно громче цели.
  execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=330:duration=8,volume=0.9", join(dir, "a", "bed.wav")]);
  writeFileSync(join(dir, "story.md"), `# L\nvoice: {"engine":"stub","name":"silent","cps":15}\nmusic: {"file":"a/bed.wav","level":-6}\n\n## a · slides.chapter\ntitle: A\nbody: B\nduration: 5\n\nA beat of silent speech.\n`);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-400));
  const rep = JSON.parse(r.stdout) as { audio: { loudness: { target: number; measured: number; input: number } } };
  const probe = spawnSync(ffmpeg, ["-nostdin", "-hide_banner", "-i", join(dir, "f.mp4"), "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" });
  const integrated = Number(/I:\s+(-?[\d.]+) LUFS/.exec(probe.stderr.slice(probe.stderr.lastIndexOf("Summary")))![1]);
  assert.ok(Math.abs(rep.audio.loudness.measured - integrated) < 0.5, `report ${rep.audio.loudness.measured} vs file ${integrated}`);
  assert.ok(Math.abs(rep.audio.loudness.input - rep.audio.loudness.measured) > 0.5, "the mix before normalising is reported apart");
});
