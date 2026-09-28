// `bN.end` значит одно и то же везде: конец речи такта. У звука, музыки и ударов он прежде значил
// начало следующего такта, а у последнего — конец сцены вместе с хвостом, и остановка музыки
// «на конце реплики» приходилась на две секунды позже (пересборка трейлера про кота).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { anchorSeconds } from "../../spotlight.js";

const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

test("b1.end of the last beat is the end of its speech for music stops and accents, not the scene's end", () => {
  assert.equal(anchorSeconds("b1.end", [0], 6, [2.5]), 2.5);
  assert.equal(anchorSeconds("b1.end", [0, 3], 6, [2.9, 5]), 2.9);
  assert.equal(anchorSeconds("b2.end+0.2", [0, 3], 6, [2.9, 5]), 5.2);
  const dir = mkdtempSync(join(tmpdir(), "sc-bend-"));
  mkdirSync(join(dir, "a"));
  execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=220:duration=12", join(dir, "a", "bed.wav")]);
  execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=880:duration=0.3", join(dir, "a", "hit.wav")]);
  // Такт в 30 знаков при 15 знаках в секунду — около двух секунд речи; сцена — шесть секунд.
  writeFileSync(join(dir, "story.md"), `# B\nvoice: {"engine":"stub","name":"silent","cps":15}\nmusic: {"file":"a/bed.wav"}\n\n## a · slides.chapter\ntitle: A\nbody: B\nduration: 6\nmusic: stop b1.end\nsfx: [{"at":"b1.end","file":"a/hit.wav"}]\n\nThirty characters of speech ok.\n`);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-400));
  const rep = JSON.parse(r.stdout) as { beats: Array<{ start: number; spoken: number }>; audio: { music: { spans: Array<{ end: number }> }; sfx: Array<{ at: number }> } };
  const speechEnd = rep.beats[0]!.start + rep.beats[0]!.spoken;
  assert.ok(speechEnd < 4, `the beat's speech ends well before the scene (${speechEnd.toFixed(2)} s)`);
  assert.ok(Math.abs(rep.audio.music.spans[0]!.end - speechEnd) < 0.15, `the music stops at the end of the speech: ${rep.audio.music.spans[0]!.end} vs ${speechEnd.toFixed(2)}`);
  assert.ok(Math.abs(rep.audio.sfx[0]!.at - speechEnd) < 0.15, `the accent lands at the end of the speech: ${rep.audio.sfx[0]!.at} vs ${speechEnd.toFixed(2)}`);
});
