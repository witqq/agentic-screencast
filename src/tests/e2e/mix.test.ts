// Звук вместе с озвучкой — проверка измерением.
//
// Речь, подложка и акцент разнесены по частоте (речь — шумовая полоса 1–3 кГц,
// подложка — тон 220 Гц, акцент — тон 5 кГц), поэтому в готовой смеси уровень
// каждого слоя меряется отдельно полосовым фильтром. Все фикстуры порождаются
// тестом: ни сети, ни `say`, ни звуковых файлов в пакете.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { levelDb, mixFilm, musicBeat, musicSpans, nextMusicBeat, pcm } from "../../mix.js";
import { parseSource } from "../../source.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const here = dirname(fileURLToPath(import.meta.url));
const ENTRY = resolve(here, "..", "..", "agentic-screencast.js");

const gen = (out: string, lavfi: string, af = "anull"): string => {
  execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-f", "lavfi", "-i", lavfi, "-af", af, "-ar", "48000", "-ac", "1", out]);
  return out;
};
/** Речеподобная полоса шума с заданным усилением в дБ. */
const speech = (out: string, secs: number, gainDb: number): string =>
  gen(out, `anoisesrc=d=${secs}:c=white:a=0.8`, `highpass=f=1100,lowpass=f=2800,lowpass=f=2800,lowpass=f=2800,lowpass=f=2800,volume=${gainDb}dB`);
const tone = (out: string, f: number, secs: number, gainDb = 0): string =>
  gen(out, `sine=frequency=${f}:duration=${secs}`, `volume=${gainDb}dB`);

/** Уровень полосы смеси на отрезке времени, dBFS. */
function band(file: string, af: string, from: number, to: number): number {
  const raw = execFileSync(ffmpeg, ["-loglevel", "error", "-i", file, "-af", af, "-f", "f32le", "-ac", "1", "-ar", "48000", "-"],
    { maxBuffer: 256 * 1024 * 1024 });
  const s = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4).subarray(Math.round(from * 48000), Math.round(to * 48000));
  let sum = 0;
  for (const v of s) sum += v * v;
  return 10 * Math.log10(sum / Math.max(1, s.length) + 1e-12);
}
const MUSIC = "lowpass=f=300,lowpass=f=300";
const SPEECH = "highpass=f=900,lowpass=f=3400";
const SFX = "highpass=f=4200,highpass=f=4200";

/** Интегральная громкость файла, LUFS. */
function lufs(file: string): number {
  const said = execFileSync("/bin/sh", ["-c", `"${ffmpeg}" -nostdin -i "${file}" -af ebur128 -f null - 2>&1`], { encoding: "utf8" });
  return Number(/I:\s+(-?[\d.]+) LUFS/.exec(said.slice(said.lastIndexOf("Summary")))![1]);
}

test("the bed dips under each beat with smooth edges and returns in the pause between beats", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-mix-"));
  const s1 = speech(join(dir, "b1.wav"), 1.5, -12), s2 = speech(join(dir, "b2.wav"), 1.5, -12);
  const music = tone(join(dir, "m.wav"), 220, 8, -6);
  const out = join(dir, "mix.wav");
  mixFilm({ total: 7, out, musicDir: dir, speech: [{ wav: s1, at: 1 }, { wav: s2, at: 4 }],
    beats: [{ start: 1, end: 2.5, wav: s1 }, { start: 4, end: 5.5, wav: s2 }], music: { file: music, fadeIn: 0.2 }, sfx: [] });
  const pause = band(out, MUSIC, 3.1, 3.5), under = band(out, MUSIC, 1.3, 2.3);
  assert.ok(pause - under > 6, `the bed is louder in the pause (${pause.toFixed(1)}) than under a beat (${under.toFixed(1)})`);
  // Фронт к такту: уровни в окнах по 40 мс перед началом такта идут ступенями
  // между уровнем паузы и уровнем под тактом, а не скачком.
  const steps = [0.84, 0.88, 0.92, 0.96].map((t) => band(out, MUSIC, t, t + 0.04));
  const between = steps.filter((l) => l < pause - 1 && l > under + 1);
  assert.ok(between.length >= 2, `the edge passes intermediate levels: ${steps.map((l) => l.toFixed(1)).join(", ")}`);
});

test("speech stays above the bed by the same margin at two speech levels 10 dB apart", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-mix-lv-"));
  const music = tone(join(dir, "m.wav"), 220, 6, -6);
  const margins: number[] = [];
  for (const gain of [-10, -22]) {
    const s = speech(join(dir, `s${gain}.wav`), 2, gain);
    const out = join(dir, `mix${gain}.wav`);
    mixFilm({ total: 4, out, musicDir: dir, speech: [{ wav: s, at: 1 }], beats: [{ start: 1, end: 3, wav: s }],
      music: { file: music }, sfx: [] });
    margins.push(band(out, SPEECH, 1.4, 2.6) - band(out, MUSIC, 1.4, 2.6));
  }
  for (const m of margins) assert.ok(m > 15, `speech over bed margin ${m.toFixed(1)} dB`);
  assert.ok(Math.abs(margins[0]! - margins[1]!) < 4, `the margin follows the speech level: ${margins.map((m) => m.toFixed(1)).join(" vs ")}`);
});

test("an accent that lands on words stays quieter than them", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-mix-sfx-"));
  const s = speech(join(dir, "s.wav"), 2, -14);
  const hit = tone(join(dir, "hit.wav"), 5000, 0.5, 0);
  const out = join(dir, "mix.wav");
  const rep = mixFilm({ total: 4, out, musicDir: dir, speech: [{ wav: s, at: 1 }], beats: [{ start: 1, end: 3, wav: s }],
    sfx: [{ file: hit, at: 1.5 }, { file: hit, at: 3.3 }] });
  assert.deepEqual(rep.sfx.map((x) => x.underSpeech), [true, false]);
  // Уровень слов — по их собственной записи: полосовой фильтр срезал бы и часть речи.
  const onWords = band(out, SFX, 1.55, 1.95), words = levelDb(pcm(s));
  assert.ok(words - onWords > 8, `the accent on words is ${(words - onWords).toFixed(1)} dB under them`);
  assert.ok(band(out, SFX, 3.35, 3.75) - onWords > 6, "the same accent in a pause is louder");
});

test("the result is normalised to the loudness target whatever the bed's own level", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-mix-lufs-"));
  const s = speech(join(dir, "s.wav"), 3, -16);
  for (const gain of [0, -24]) {
    const music = tone(join(dir, `m${gain}.wav`), 220, 8, gain);
    const out = join(dir, `mix${gain}.wav`);
    mixFilm({ total: 8, out, musicDir: dir, speech: [{ wav: s, at: 2 }], beats: [{ start: 2, end: 5, wav: s }],
      music: { file: music }, sfx: [], loudness: -14 });
    assert.ok(Math.abs(lufs(out) + 14) < 1, `integrated loudness ${lufs(out)} LUFS with a bed at ${gain} dB`);
  }
});

test("music beats resolve to seconds and a cut snaps to the next beat", () => {
  assert.equal(musicBeat(8, 120), 4);
  assert.equal(musicBeat(8, 120, 0.25), 4.25);
  assert.equal(nextMusicBeat(3.1, 120), 3.5);
  assert.equal(nextMusicBeat(3.5, 120), 3.5);
});

test("a missing music or accent file is a parse error", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-mix-miss-"));
  const file = join(dir, "story.md");
  writeFileSync(file, `# M\nmusic: {"file":"nope.mp3"}\n\n## a · slides.chapter\ntitle: T\nbody: B\nduration: 3\n`);
  assert.throws(() => parseSource(file), /music.file: file not found/);
  writeFileSync(file, `# M\n\n## a · slides.chapter\ntitle: T\nbody: B\nduration: 3\nsfx: [{"at":"1s","file":"none.wav"}]\n`);
  assert.throws(() => parseSource(file), /file not found: none.wav/);
});

/** Сборка на stub с подложкой: окна тактов из отчёта и смесь. */
function stubFilm(cps: number): { file: string; beats: Array<{ start: number; spoken: number }> } {
  const dir = mkdtempSync(join(tmpdir(), "sc-mix-stub-"));
  tone(join(dir, "m.wav"), 220, 20, -6);
  writeFileSync(join(dir, "story.md"), `# S
voice: {"engine":"stub","name":"silent","cps":${cps}}
frame: {"width":160,"height":90,"fps":10,"scale":1}
music: {"file":"m.wav","fadeIn":0.1}
tail: 2

## a · slides.chapter
title: Draft
body: Narration is silent in a draft.

The first beat of the draft lasts as long as its text.

## b · slides.chapter
title: Second
body: A pause separates the scenes.

A second beat follows after a pause.
`);
  const r = spawnSync("node", [ENTRY, "build", "--source", "story.md", "--out", "f.mp4"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr);
  return { file: join(dir, "f.mp4"), beats: (JSON.parse(r.stdout) as { beats: Array<{ start: number; spoken: number }> }).beats };
}

test("a silent stub draft still ducks the bed in beat windows, and a new pace moves the windows", () => {
  const slow = stubFilm(10), fast = stubFilm(20);
  for (const f of [slow, fast]) {
    const b = f.beats[0]!;
    const under = band(f.file, MUSIC, b.start + 0.4, b.start + b.spoken - 0.2);
    const pause = band(f.file, MUSIC, b.start + b.spoken + 0.7, b.start + b.spoken + 1.3);
    assert.ok(pause - under > 6, `bed dips under the silent draft beat: pause ${pause.toFixed(1)} vs beat ${under.toFixed(1)}`);
  }
  // Один и тот же момент: у быстрого черновика первая реплика уже кончилась и
  // идёт пауза, у медленного реплика ещё звучит. Окна приглушения сдвинулись
  // вместе с речью без правки сценария.
  const t = fast.beats[0]!.start + fast.beats[0]!.spoken + 0.8;
  assert.ok(t < slow.beats[0]!.start + slow.beats[0]!.spoken - 0.3, "the moment is inside the slow first beat");
  const fastLevel = band(fast.file, MUSIC, t, t + 0.3), slowLevel = band(slow.file, MUSIC, t, t + 0.3);
  assert.ok(fastLevel - slowLevel > 6, `at ${t.toFixed(2)}s the fast draft is in a pause (${fastLevel.toFixed(1)}), the slow one under words (${slowLevel.toFixed(1)})`);
});

test("through the recorded engine, the film keeps speech above the bed at two levels and snaps a cut to the beat", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-mix-rec-"));
  const recs = join(dir, "recs");
  execFileSync("mkdir", ["-p", recs]);
  const lines = ["A loud take is spoken here.", "A quiet take follows the cut."];
  // Записи людей: одна на 12 дБ тише другой.
  const { recordingPath } = require("../../voice/recorded.js") as typeof import("../../voice/recorded.js");
  speech(recordingPath(lines[0]!, { engine: "recorded", dir: recs }), 2, -10);
  speech(recordingPath(lines[1]!, { engine: "recorded", dir: recs }), 2, -22);
  tone(join(dir, "m.wav"), 220, 20, -6);
  writeFileSync(join(dir, "story.md"), `# R
voice: {"engine":"recorded","dir":"${recs}"}
frame: {"width":160,"height":90,"fps":10,"scale":1}
music: {"file":"m.wav","bpm":120}

## a · slides.chapter
title: Loud
body: The first take.

${lines[0]}

## b · slides.chapter
title: Quiet
body: The second take.
transition: {"kind":"dissolve","duration":0.4,"snap":"music"}

${lines[1]}
`);
  const r = spawnSync("node", [ENTRY, "build", "--source", "story.md", "--out", "f.mp4"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr);
  const rep = JSON.parse(r.stdout) as { beats: Array<{ start: number; spoken: number }>; transitions: Array<{ at: number }> };
  const film = join(dir, "f.mp4");
  const margins = rep.beats.map((b) => band(film, SPEECH, b.start + 0.3, b.start + b.spoken - 0.3)
    - band(film, MUSIC, b.start + 0.3, b.start + b.spoken - 0.3));
  for (const m of margins) assert.ok(m > 15, `speech over bed ${m.toFixed(1)} dB in the built film`);
  assert.ok(Math.abs(margins[0]! - margins[1]!) < 4, `the margin holds at both takes: ${margins.map((m) => m.toFixed(1)).join(" vs ")}`);
  // Переход «в долю»: при 120 ударах в минуту доля — полсекунды.
  const at = rep.transitions[0]!.at;
  assert.ok(Math.abs(at / 0.5 - Math.round(at / 0.5)) < 0.1 / 0.5 + 1e-9, `the cut starts on a beat: ${at}`);
});

test("music spans: a scene's track crossfades in, a stop cuts the bed, the last one fades at the end", () => {
  const spans = musicSpans({ file: "a.wav" }, [{ at: 3, stop: true }, { at: 4, file: "b.wav", fadeIn: 0.2 }], 6);
  assert.deepEqual(spans.map((s) => [s.music.file, s.start, s.end, s.fadeIn, s.fadeOut]),
    [["a.wav", 0, 3, 1, 0.05], ["b.wav", 4, 6, 0.2, 2]]);
  // Новая подложка без остановки: прежняя уходит тем же наплывом, которым входит новая.
  const cross = musicSpans({ file: "a.wav" }, [{ at: 2, file: "b.wav" }], 5);
  assert.deepEqual(cross.map((s) => [s.start, s.end, s.fadeOut]), [[0, 2.5, 0.5], [2, 5, 2]]);
  // Без шапки музыка начинается там, где её назвала сцена.
  assert.deepEqual(musicSpans(undefined, [{ at: 1, file: "b.wav" }], 3).map((s) => [s.start, s.fadeIn]), [[1, 0.5]]);
});

test("a built film stops its music on a scene's anchor and starts another track in a later scene", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-mix-parts-"));
  tone(join(dir, "a.wav"), 220, 20, -6);
  tone(join(dir, "b.wav"), 600, 20, -6);
  writeFileSync(join(dir, "p.html"), "<html><body style='margin:0;background:#234'></body></html>");
  const scene = (id: string, extra = ""): string => `## ${id} · page\npage: p.html\nduration: 2\n${extra}\n`;
  writeFileSync(join(dir, "story.md"), `# M
voice: {"engine":"stub","name":"silent","cps":15}
frame: {"width":160,"height":90,"fps":10,"scale":1}
music: {"file":"a.wav","fadeIn":0.2}

${scene("one")}
${scene("two", "music: stop 1s")}
${scene("three", 'music: {"file":"b.wav","fadeIn":0.2}')}`);
  const r = spawnSync("node", [ENTRY, "build", "--source", "story.md", "--out", "f.mp4"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr);
  const film = join(dir, "f.mp4");
  // Полосы разнесены крутыми фильтрами: тон 600 Гц не должен просачиваться в полосу 220 Гц.
  const A = "lowpass=f=260,lowpass=f=260,lowpass=f=260,lowpass=f=260", B = "highpass=f=450,highpass=f=450,highpass=f=450,lowpass=f=800,lowpass=f=800";
  const before = band(film, A, 0.8, 2.8), after = band(film, A, 3.2, 3.9), second = band(film, B, 4.5, 5.5), firstLate = band(film, A, 4.5, 5.5);
  assert.ok(before > -40, `the bed plays before the stop (${before.toFixed(1)})`);
  assert.ok(before - after > 40, `the bed is silent after the stop at 3 s (${before.toFixed(1)} → ${after.toFixed(1)})`);
  assert.ok(second > -40, `the second track plays in its scene (${second.toFixed(1)})`);
  assert.ok(second - firstLate > 30, `and the first one does not come back (${firstLate.toFixed(1)})`);
  const rep = JSON.parse(r.stdout) as { audio: { music: { spans: Array<{ file: string; start: number; end: number }> } } };
  assert.deepEqual(rep.audio.music.spans.map((s) => [s.file.endsWith("a.wav"), s.start, s.end]), [[true, 0, 3], [false, 4, 6]]);
});

test("an accent whose hit is in a pause keeps its full level there and ducks only its tail under the words", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-mix-side-"));
  const s = speech(join(dir, "s.wav"), 1.5, -14);
  const hit = tone(join(dir, "hit.wav"), 5000, 0.8, 0);
  const lone = join(dir, "lone.wav"), side = join(dir, "side.wav"), whole = join(dir, "whole.wav");
  const words = { speech: [{ wav: s, at: 1 }], beats: [{ start: 1, end: 2.5, wav: s }] };
  // Тот же удар без слов — мерка его полной громкости.
  mixFilm({ total: 3, out: lone, musicDir: dir, speech: [], beats: [], sfx: [{ file: hit, at: 0.5 }] });
  const rep = mixFilm({ total: 3, out: side, musicDir: dir, ...words, sfx: [{ file: hit, at: 0.5 }] });
  mixFilm({ total: 3, out: whole, musicDir: dir, ...words, sfx: [{ file: hit, at: 0.5, duckAll: true }] });
  assert.equal(rep.sfx[0]!.ducked, "overlap");
  const full = band(lone, SFX, 0.55, 0.85);
  // Удар в паузе — в полную силу; прежнее поведение (весь акцент под речь) — тише на 10+ дБ.
  assert.ok(Math.abs(band(side, SFX, 0.55, 0.85) - full) < 1, `the hit in the pause keeps its level (${band(side, SFX, 0.55, 0.85).toFixed(1)} vs ${full.toFixed(1)})`);
  assert.ok(full - band(whole, SFX, 0.55, 0.85) > 10, "duckAll lowers the whole accent, as before");
  // Хвост под словами — ниже слов на запас.
  const tail = band(side, SFX, 1.05, 1.25);
  assert.ok(full - tail > 10, `the tail under the words is ducked (${tail.toFixed(1)} vs ${full.toFixed(1)})`);
  // duck: 0 — акцент не уступает словам вовсе.
  const off = join(dir, "off.wav");
  mixFilm({ total: 3, out: off, musicDir: dir, ...words, sfx: [{ file: hit, at: 0.5, duck: 0 }] });
  assert.ok(Math.abs(band(off, SFX, 1.05, 1.25) - full) < 1.5, "duck: 0 leaves the accent at full level under words");
});

test("an accent can take a piece of its file: from, length and a fade at its end", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-mix-piece-"));
  // Файл: секунда тишины, затем полсекунды тона — «разгон», которого в акценте не нужно.
  const file = gen(join(dir, "fx.wav"), "sine=frequency=5000:duration=1.5", "volume='if(lt(t,1),0,1)':eval=frame");
  const out = join(dir, "mix.wav");
  mixFilm({ total: 4, out, musicDir: dir, speech: [], beats: [], sfx: [{ file, at: 2, from: 1, length: 0.3, fadeOut: 0.1 }] });
  const on = band(out, SFX, 2.02, 2.15), after = band(out, SFX, 2.35, 3.2), before = band(out, SFX, 1.2, 1.9);
  assert.ok(on > -40, `the piece sounds at its moment (${on.toFixed(1)})`);
  assert.ok(on - after > 40, `length cuts the file (${after.toFixed(1)} after the piece)`);
  assert.ok(on - before > 40, `from skips the silent start (${before.toFixed(1)} before)`);
  const edge = band(out, SFX, 2.25, 2.29);
  assert.ok(on - edge > 3, `the piece fades at its end (${edge.toFixed(1)} vs ${on.toFixed(1)})`);
});

test("speechAt starts the narration later in its scene, and the bed ducks from there, not from the scene's start", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-mix-lead-"));
  const recs = join(dir, "recs");
  execFileSync("mkdir", ["-p", recs]);
  const line = "The hit comes first, the voice after it.";
  const { recordingPath } = require("../../voice/recorded.js") as typeof import("../../voice/recorded.js");
  speech(recordingPath(line, { engine: "recorded", dir: recs }), 1.5, -10);
  tone(join(dir, "m.wav"), 220, 10, -6);
  writeFileSync(join(dir, "p.html"), "<html><body style='margin:0;background:#223'></body></html>");
  writeFileSync(join(dir, "story.md"), `# L\nvoice: {"engine":"recorded","dir":"${recs}"}\nframe: {"width":160,"height":90,"fps":10,"scale":1}\nmusic: {"file":"m.wav","fadeIn":0}\n\n## one · page\npage: p.html\nspeechAt: 0.8\n\n${line}\n`);
  const r = spawnSync("node", [ENTRY, "build", "--source", "story.md", "--out", "f.mp4"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr);
  const rep = JSON.parse(r.stdout) as { beats: Array<{ start: number }> };
  assert.ok(Math.abs(rep.beats[0]!.start - 0.8) < 0.01, `the beat starts at 0.8 s in the report (${rep.beats[0]!.start})`);
  const film = join(dir, "f.mp4");
  assert.ok(band(film, SPEECH, 0.1, 0.55) < band(film, SPEECH, 1.0, 1.6) - 10, "no speech before 0.8 s, speech after it");
  // Приглушение начинается перед словом, а не с начала сцены: до 0,5 с подложка в полную силу.
  assert.ok(band(film, MUSIC, 0.1, 0.5) - band(film, MUSIC, 1.0, 1.6) > 10, "the bed is full before the voice and ducked under it");
});
