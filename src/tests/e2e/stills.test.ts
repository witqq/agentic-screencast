// Контрольные кадры: моменты, названные в сценарии тактом, долей сцены, секундами или отметкой
// дубля, сборка снимает из готового ролика в файлы рядом с ним и перечисляет в отчёте. Время
// каждого кадра сверяется с тем, что сборка сама измерила: началом такта в отчёте, длиной сцены и
// отметкой дубля; сам кадр — с кадром ролика в эту секунду.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parseStills } from "../../stills.js";
import { rawOf } from "../support.js";

const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

test("a scene names its stills and the build writes them beside the film at the named moments", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-stills-"));
  writeFileSync(join(dir, "page.html"), `<!doctype html><html><body style="margin:0;background:#203040"><h1 id="t" style="color:#fff;margin:80px">Stills</h1></body></html>`);
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=s=320x180:r=10:d=4", "-c:v", "libx264", "-pix_fmt", "yuv420p", join(dir, "take.mp4")]);
  writeFileSync(join(dir, "take.mp4.marks.json"), JSON.stringify({ marks: { done: 2.5 }, clicks: [] }));
  writeFileSync(join(dir, "story.md"), `# Stills
lang: en
voice: {"engine":"stub","name":"silent","cps":15}
frame: {"width":640,"height":360,"fps":10,"scale":1}

## p · page
page: page.html
stills: b2+0.2 :: the second beat has begun | 50%

The first beat of this scene is spoken here.

The second beat follows it right away.

## v · video
file: take.mp4
stills: @done :: the take is done, even if @done appears in the note | @done+0.2 :: shortly after the mark | 0.5
`);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "film.mp4"], { cwd: dir, encoding: "utf8",
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-600));
  const report = JSON.parse(r.stdout) as { beats: Array<{ scene: string; start: number }>; scenes: Array<{ id: string; frames: number }>;
    stills: Array<{ scene: string; moment: string; time: number; note?: string; file: string }> };
  assert.equal(report.stills.length, 5);
  const [b2, half, done, offset, early] = report.stills;
  const beat2 = report.beats.filter((b) => b.scene === "p")[1]!.start;
  assert.ok(Math.abs(b2!.time - (beat2 + 0.2)) < 0.002, `b2+0.2 is 0.2s after the measured second beat (${b2!.time} vs ${beat2})`);
  assert.equal(b2!.note, "the second beat has begun");
  const pDur = report.scenes.find((s) => s.id === "p")!.frames / 10;
  assert.ok(Math.abs(half!.time - pDur / 2) < 0.051, `50% is the middle of the scene (${half!.time} vs ${pDur / 2})`);
  // Вторая сцена начинается сразу за первой; отметка @done — 2,5 с клипа.
  assert.ok(Math.abs(done!.time - (pDur + 2.5)) < 0.051, `@done is 2.5s into the take (${done!.time} vs ${pDur + 2.5})`);
  assert.equal(done!.moment, "@done");
  assert.ok(Math.abs(offset!.time - (pDur + 2.7)) < 0.051, `@done+0.2 is 2.7s into the take (${offset!.time} vs ${pDur + 2.7})`);
  assert.equal(offset!.moment, "@done+0.2");
  assert.ok(Math.abs(early!.time - (pDur + 0.5)) < 0.051);
  // Файлы лежат рядом с роликом, это кадры ролика (его размер), и разные моменты — разные кадры:
  // страница в кадре p и полосы испытательного клипа в кадре v.
  const stillsDir = join(dir, "film.stills");
  assert.deepEqual(readdirSync(stillsDir).sort(), report.stills.map((s) => s.file.split("/").pop()).sort());
  const raws = report.stills.map((s) => {
    assert.ok(existsSync(s.file), `${s.file} is written`);
    const png = execFileSync(ffmpeg, ["-loglevel", "error", "-i", s.file, "-f", "image2pipe", "-vcodec", "png", "-"]);
    const raw = rawOf(png);
    assert.equal(raw.length, 640 * 360 * 3, `${s.moment}: the still has the film's frame size`);
    return raw;
  });
  assert.ok(!raws[0]!.equals(raws[2]!), "a page moment and a take moment are different frames");
  // Новая редакция сценария без кадров не оставляет прежних.
  writeFileSync(join(dir, "story.md"), readFileSync(join(dir, "story.md"), "utf8").replace(/^stills: .*$/gm, ""));
  const again = spawnSync("node", [ENTRY, "build", "story.md", "--out", "film.mp4"], { cwd: dir, encoding: "utf8",
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(again.status, 0, again.stderr.slice(-400));
  assert.equal(existsSync(stillsDir), false, "stills of the previous edition are removed");
  // Сообщение называет сцену и ключи обеих сборок: сменился ключ — в него попало лишнее; ключ
  // тот же — пропал сегмент кэша.
  const keys = (out: string): string => (JSON.parse(out) as { scenes: Array<{ id: string; cached: boolean; key: string }> }).scenes
    .map((s) => `${s.id}:${s.key}${s.cached ? "(cached)" : ""}`).join(" ");
  assert.equal((JSON.parse(again.stdout) as { scenes: Array<{ cached: boolean }> }).scenes.every((s) => s.cached), true,
    `naming stills does not re-render scenes — first ${keys(r.stdout)}, again ${keys(again.stdout)}`);
});

test("a still names a moment the scenario understands, and a mark only on a take", () => {
  assert.deepEqual(parseStills("b2 | b3.end-0.3 :: last words | 80% | 1.5", "x").map((s) => s.at), ["b2", "b3.end-0.3", "80%", "1.5"]);
  assert.throws(() => parseStills("soon", "scene s stills"), /«soon» (?:is not a moment|не является моментом)/);
  const dir = mkdtempSync(join(tmpdir(), "sc-stills-bad-"));
  writeFileSync(join(dir, "story.md"), `# S\nvoice: {"engine":"stub","name":"silent"}\n\n## a · slides.hero\ntitle: Hi\nduration: 3\nstills: @done\n`);
  const r = spawnSync("node", [ENTRY, "check", "--source", "story.md"], { cwd: dir, encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr + r.stdout, /a take's @mark works only on a video scene|отметка дубля @имя работает только у видеосцены/);
});


test("bN.end in a still is the end of that beat's speech, not the scene's tail with its outgoing transition", async () => {
  const { stillTime } = await import("../../stills.js");
  const scene = { starts: [0, 2.5], ends: [2.1, 4.8], duration: 6.2 };
  assert.equal(stillTime({ at: "b2.end" }, scene, 25), 4.8);
  assert.equal(stillTime({ at: "b2.end-0.3" }, scene, 25), 4.5);
  assert.equal(stillTime({ at: "b1.end" }, scene, 25), 2.1);
  // Без измеренных концов речи — прежний смысл: начало следующего такта или конец сцены.
  assert.equal(stillTime({ at: "b2.end" }, { starts: [0, 2.5], duration: 6.2 }, 25), 6.2 - 1 / 25);
});

test("stills: every 1s samples the scene at that step, beside the named moments, and refuses a wrong step", () => {
  assert.deepEqual(parseStills("every 1s :: the page does not change", "s"), [{ at: "every 1s", every: 1, note: "the page does not change" }]);
  assert.throws(() => parseStills("every 0.1s", "s"), /the step is 0\.25–10 seconds|шаг должен быть от 0,25 до 10 секунд/);
  assert.throws(() => parseStills("every 30", "s"), /the step is 0\.25–10 seconds|шаг должен быть от 0,25 до 10 секунд/);
  const dir = mkdtempSync(join(tmpdir(), "sc-every-"));
  writeFileSync(join(dir, "story.md"), `# E\nvoice: {"engine":"stub","name":"silent","cps":15}\n\n## a · slides.chapter\ntitle: Sampling\nbody: A frame a second\nduration: 5\nstills: every 1s | 50% :: the middle\n`);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "film.mp4"], { cwd: dir, encoding: "utf8",
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-600));
  const report = JSON.parse(r.stdout) as { stills: Array<{ moment: string; time: number; file: string }> };
  const sampled = report.stills.filter((x) => x.moment.endsWith("s") && !x.moment.includes("%"));
  assert.ok(sampled.length >= 4 && sampled.length <= 6, `a 5 s scene sampled every second: ${sampled.map((x) => x.moment).join(", ")}`);
  assert.ok(report.stills.some((x) => x.moment === "50%"), "a named moment is kept beside the samples");
  assert.equal(readdirSync(join(dir, "film.stills")).length, report.stills.length);
  for (const x of report.stills) assert.ok(existsSync(x.file));
});
