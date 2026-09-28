// Мелочи CLI: язык заготовки, язык описаний в schema, высота голоса.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { recordingPath } from "../../voice/recorded.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

test("new --lang writes the film's language into the skeleton", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-new-lang-"));
  const r = spawnSync("node", [ENTRY, "new", "trailer", "--lang", "ru"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(readFileSync(join(dir, "story.md"), "utf8"), /^lang: ru$/m);
  assert.notEqual(spawnSync("node", [ENTRY, "new", "trailer", "--lang", "Русский", "--out", "b.md"], { cwd: dir, encoding: "utf8" }).status, 0);
});

test("new --format vertical gives a phone skeleton: the zone to decide and the phone pace, and it builds on the stub", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-new-vert-"));
  const r = spawnSync("node", [ENTRY, "new", "explainer", "--format", "vertical"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const text = readFileSync(join(dir, "story.md"), "utf8");
  assert.match(text, /^format: vertical\nzone: platform$/m);
  assert.match(text, /^voice: \{"engine":"stub","name":"silent","cps":13\}$/m, "13 characters a second, the phone pace of docs/vertical-video.md");
  writeFileSync(join(dir, "story.md"), text.replace("zone: platform", "zone: platform\nframe: {\"fps\":5}"));
  const b = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(b.status, 0, b.stderr.slice(-500));
  const plain = spawnSync("node", [ENTRY, "new", "explainer", "--out", "h.md"], { cwd: dir, encoding: "utf8" });
  assert.equal(plain.status, 0);
  assert.doesNotMatch(readFileSync(join(dir, "h.md"), "utf8"), /^zone: /m, "a horizontal skeleton has no zone");
});

test("the schema describes every kind in English, like the rest of the help", () => {
  const out = execFileSync("node", [ENTRY, "schema"], { encoding: "utf8" });
  const kinds = [...out.matchAll(/"description":\s*"([^"]*)"/g)].map((m) => m[1]!).filter((d) => /[а-яё]/iu.test(d));
  assert.deepEqual(kinds, [], "no description is written in Russian");
});

test("pitch shifts a beat's voice by semitones and keeps its length", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-pitch-"));
  const recs = join(dir, "recs");
  mkdirSync(recs);
  const line = "A tone reads this beat.";
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=200:duration=1.5", "-ar", "48000", "-ac", "1",
    recordingPath(line, { engine: "recorded", dir: recs })]);
  writeFileSync(join(dir, "p.html"), "<html><body style='margin:0;background:#222'></body></html>");
  const build = (pitch: string): { beat: number; crossings: number } => {
    writeFileSync(join(dir, "story.md"), `# P\nvoice: {"engine":"recorded","dir":"${recs}"${pitch}}\nframe: {"width":160,"height":90,"fps":10,"scale":1}\n\n## one · page\npage: p.html\n\n${line}\n`);
    const r = spawnSync("node", [ENTRY, "build", "--source", "story.md", "--out", "f.mp4"],
      { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
    assert.equal(r.status, 0, r.stderr);
    const rep = JSON.parse(r.stdout) as { beats: Array<{ spoken: number }> };
    const raw = execFileSync(ffmpeg, ["-loglevel", "error", "-ss", "0.3", "-t", "1", "-i", join(dir, "f.mp4"), "-f", "f32le", "-ac", "1", "-ar", "48000", "-"]);
    const s = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
    let c = 0;
    for (let i = 1; i < s.length; i++) if ((s[i - 1]! < 0) !== (s[i]! < 0)) c++;
    return { beat: rep.beats[0]!.spoken, crossings: c };
  };
  const plain = build(""), low = build(',"pitch":-12');
  assert.ok(Math.abs(low.beat - plain.beat) < 0.05, `the beat keeps its length (${plain.beat} → ${low.beat})`);
  assert.ok(Math.abs(low.crossings / plain.crossings - 0.5) < 0.08, `an octave down halves the fundamental (${plain.crossings} → ${low.crossings} crossings a second)`);
  writeFileSync(join(dir, "story.md"), readFileSync(join(dir, "story.md"), "utf8").replace('"pitch":-12', '"pitch":30'));
  const bad = spawnSync("node", [ENTRY, "build", "--source", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.match(bad.stderr, /voice\.pitch: expected semitones from -12 to 12/);
});
