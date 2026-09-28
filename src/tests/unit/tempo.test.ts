// Темп музыки по самому файлу: щелчковые дорожки с известным темпом и первой долей
// порождает тест, сборка без `bpm` в шапке ставит склейку на долю найденной сетки и
// называет темп в отчёте, а названный автором темп главнее найденного.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { detectTempo } from "../../tempo.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

/** Щелчки с затуханием каждую долю, начиная с first, под тихим шумом — как ударная партия в миксе. */
function clicks(file: string, bpm: number, first: number, secs = 30): string {
  const period = 60 / bpm;
  execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-f", "lavfi", "-i",
    `aevalsrc='0.8*sin(2*PI*1200*t)*exp(-60*mod(t-${first},${period}))*gte(t,${first})+0.1*random(0)-0.05':s=44100:d=${secs}`, file]);
  return file;
}

test("the tempo and first beat of a track are found within a beat per minute and 30 ms", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-tempo-"));
  for (const [bpm, first] of [[100, 0.37], [128, 0.12]] as const) {
    const t = detectTempo(clicks(join(dir, `c${bpm}.wav`), bpm, first))!;
    assert.ok(t, `a tempo is heard at ${bpm}`);
    assert.ok(Math.abs(t.bpm - bpm) <= 1, `${bpm} BPM found as ${t.bpm}`);
    assert.ok(Math.abs(t.offset - first) <= 0.03, `the first beat at ${first}s found at ${t.offset}s`);
  }
  // Без ритма — ровный тон — темп не назван, а не выдуман.
  execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=220:duration=20", join(dir, "tone.wav")]);
  assert.equal(detectTempo(join(dir, "tone.wav")), null);
});

test("a build without bpm snaps its cut to the beat found in the music, and a named bpm wins", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-tempo-film-"));
  clicks(join(dir, "m.wav"), 128, 0.12, 40);
  const film = (music: string): string => `# T
lang: en
voice: {"engine":"stub","name":"silent","cps":15}
frame: {"width":160,"height":90,"fps":25,"scale":1}
music: ${music}

## a · slides.chapter
title: First
body: The first scene.

The first beat of the narration runs for a while here.

## b · slides.chapter
title: Second
body: The second scene.
transition: {"kind":"dissolve","duration":0.4,"snap":"music"}

The second scene starts on a beat of the music.
`;
  const build = (music: string): { tempo: { bpm: number; offset: number; detected: boolean }; transitions: Array<{ at: number }> } => {
    writeFileSync(join(dir, "story.md"), film(music));
    const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8",
      env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
    assert.equal(r.status, 0, r.stderr.slice(-400));
    return JSON.parse(r.stdout) as ReturnType<typeof build>;
  };
  const found = build('{"file":"m.wav","level":-20}');
  assert.equal(found.tempo.detected, true);
  assert.ok(Math.abs(found.tempo.bpm - 128) <= 1 && Math.abs(found.tempo.offset - 0.12) <= 0.03, JSON.stringify(found.tempo));
  // Склейка встаёт на долю сетки 128 ударов с первой долей 0,12 с — с точностью до кадра.
  const period = 60 / 128, at = found.transitions[0]!.at;
  const k = (at - 0.12) / period;
  assert.ok(Math.abs(k - Math.round(k)) * period < 0.04 + 1e-9, `the cut at ${at}s is on a beat (${k.toFixed(3)} beats in)`);
  const named = build('{"file":"m.wav","level":-20,"bpm":90,"offset":0}');
  assert.deepEqual(named.tempo, { bpm: 90, offset: 0, detected: false }, "a bpm in the header is used as written");
  const k2 = named.transitions[0]!.at / (60 / 90);
  assert.ok(Math.abs(k2 - Math.round(k2)) * (60 / 90) < 0.04 + 1e-9, `with bpm 90 the cut lands on its grid (${k2.toFixed(3)})`);
});
