// Переходы между сценами: каждый вид — не простой наплыв, геометрические
// виды двигают кадр, путь рендера назван честно, склейка держит время и звук.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { KINDS, KIND_NAMES, parseTransition, renderTransition } from "../../transition.js";
import { timeline } from "../../assemble.js";
import { parseFade } from "../../source.js";
import { recordingPath } from "../../voice/recorded.js";
import { resolveTheme } from "../../theme.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const here = dirname(fileURLToPath(import.meta.url));
const ENTRY = resolve(here, "..", "..", "agentic-screencast.js");
const W = 160, H = 90;

/** Кадры с узором: A — красные, B — синие, чтобы по оттенку было видно, чей пиксель. */
function frames(dir: string, hue: "red" | "blue", n: number): string[] {
  mkdirSync(dir, { recursive: true });
  const [r, b] = hue === "red" ? [230, 30] : [30, 230];
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i",
    `color=c=0x${r.toString(16).padStart(2, "0")}20${b.toString(16).padStart(2, "0")}:s=${W}x${H}:r=10:d=${n / 10}`,
    "-vf", "drawgrid=w=20:h=20:t=2:c=white@0.5", resolve(dir, "%05d.png")]);
  return readdirSync(dir).sort().map((f) => resolve(dir, f));
}
const rgb = (file: string): Buffer => execFileSync(ffmpeg, ["-loglevel", "error", "-i", file, "-f", "rawvideo",
  "-pix_fmt", "rgb24", "-"]);

test("the transition field accepts a name, a name with length, or an object, and refuses the rest", () => {
  assert.deepEqual(parseTransition("cube"), { kind: "cube", duration: 0.8 });
  assert.deepEqual(parseTransition("mask 1.2"), { kind: "mask", duration: 1.2 });
  // Слитое имя отвергается с названием замены.
  assert.throws(() => parseTransition("iris 1.2"), /iris.*mask/u);
  assert.equal(parseTransition('{"kind":"whip","duration":0.5,"snap":"music"}').snap, "music");
  assert.throws(() => parseTransition("crossfade"), /unknown kind/);
  assert.throws(() => parseTransition("cube 5"), /0.2–2 seconds/);
  assert.throws(() => parseTransition('{"kind":"cube","speed":2}'), /unknown property/);
});

test("every kind differs from a plain blend, and geometric kinds move the picture", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-trans-"));
  const a = frames(join(dir, "a"), "red", 8), b = frames(join(dir, "b"), "blue", 8);
  const k = 3; // прогресс (3 + 0.5) / 8 ≈ 0.44: середина перехода, не его край
  const ra = rgb(a[k]!), rb = rgb(b[k]!);
  // Просветы между гранями заливаются цветом темы (--tr-fill), а не чёрным: «пусто» — это он.
  const fillHex = resolveTheme(undefined)["--tr-fill"]!.slice(1);
  const fill = [0, 2, 4].map((o) => Number.parseInt(fillHex.slice(o, o + 2), 16));
  for (const kind of KIND_NAMES) {
    const got = await renderTransition({ kind, a, b, width: W, height: H, out: join(dir, `t-${kind}`) });
    assert.equal(got.renderer, "webgl", `${kind} rendered by WebGL`);
    const m = rgb(got.frames[k]!);
    let diff = 0, onlyA = 0, onlyB = 0, dark = 0;
    for (let i = 0; i < m.length; i += 3) {
      const [r, , bl] = [m[i]!, m[i + 1]!, m[i + 2]!];
      diff += Math.abs(r - (ra[i]! + rb[i]!) / 2) + Math.abs(bl - (ra[i + 2]! + rb[i + 2]!) / 2);
      if (r > bl + 60) onlyA++;
      if (bl > r + 60) onlyB++;
      if (Math.abs(r - fill[0]!) < 12 && Math.abs(m[i + 1]! - fill[1]!) < 12 && Math.abs(bl - fill[2]!) < 12) dark++;
    }
    const px = m.length / 3;
    assert.ok(diff / (px * 2) > 12, `${kind}: the middle frame is not a plain (A+B)/2 blend (${(diff / (px * 2)).toFixed(1)})`);
    if (KINDS[kind]!.geometric) {
      if (kind === "flip") {
        // Карточка на ребре: видна сжатая сторона A, по краям пусто.
        assert.ok(onlyA / px < 0.7 && dark / px > 0.2, `flip: the card is scaled (${(onlyA / px).toFixed(2)} A, ${(dark / px).toFixed(2)} empty)`);
      } else {
        assert.ok(onlyA / px > 0.03 && onlyB / px > 0.03,
          `${kind}: the middle frame has regions of only A (${(onlyA / px).toFixed(2)}) and only B (${(onlyB / px).toFixed(2)})`);
      }
    }
  }
});

test("push and whip take a direction, zoom takes a point or an element", () => {
  assert.deepEqual(parseTransition("push 0.6 up"), { kind: "push", duration: 0.6, direction: "up" });
  assert.equal(parseTransition('{"kind":"whip","direction":"right"}').direction, "right");
  assert.deepEqual(parseTransition('{"kind":"zoom","at":"0.7 0.3"}').at, [0.7, 0.3]);
  assert.equal(parseTransition('{"kind":"zoom","element":".feat"}').element, ".feat");
  assert.throws(() => parseTransition("push 0.6 sideways"), /not a direction/);
  assert.throws(() => parseTransition('{"kind":"cube","direction":"up"}'), /not a direction/);
  assert.throws(() => parseTransition('{"kind":"zoom","at":"2 0"}'), /two fractions/);
});

test("a push goes where its direction says", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-trans-dir-"));
  const a = frames(join(dir, "a"), "red", 8), b = frames(join(dir, "b"), "blue", 8);
  // Доля красного (уходящая сцена) в полосе кадра на середине перехода.
  const redIn = (m: Buffer, x0: number, x1: number, y0: number, y1: number): number => {
    let red = 0, all = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 3;
      all++;
      if (m[i]! > m[i + 2]! + 60) red++;
    }
    return red / all;
  };
  const left = rgb((await renderTransition({ kind: "push", a, b, width: W, height: H, out: join(dir, "l") })).frames[3]!);
  assert.ok(redIn(left, 0, W / 5, 0, H) > 0.5 && redIn(left, W * 4 / 5, W, 0, H) < 0.1, "left: the old scene leaves by the left edge");
  const up = rgb((await renderTransition({ kind: "push", a, b, width: W, height: H, out: join(dir, "u"), direction: "up" })).frames[3]!);
  assert.ok(redIn(up, 0, W, 0, H / 5) > 0.5 && redIn(up, 0, W, H * 4 / 5, H) < 0.1, "up: the old scene leaves by the top edge");
});

test("the webgl mark comes only from the WebGL branch", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-trans-ff-"));
  const a = frames(join(dir, "a"), "red", 6), b = frames(join(dir, "b"), "blue", 6);
  const ff = await renderTransition({ kind: "wipe", a, b, width: W, height: H, out: join(dir, "ff"), engine: "ffmpeg" });
  assert.equal(ff.renderer, "ffmpeg");
  assert.equal(ff.frames.length, 6);
});

test("the timeline overlaps scenes by their transitions", () => {
  const t = timeline([{ frames: 60 }, { frames: 50, transition: { kind: "cube", duration: 0.8 } },
    { frames: 40, transition: { kind: "mask", duration: 0.5 } }], 20);
  assert.deepEqual(t.starts, [0, 60 / 20 - 16 / 20, (60 - 16 + 50 - 10) / 20]);
  assert.equal(t.total, (60 + 50 + 40 - 16 - 10) / 20);
});

/** Первый момент, где звук громче порога. */
function onset(file: string): number {
  const raw = execFileSync(ffmpeg, ["-loglevel", "error", "-i", file, "-f", "f32le", "-ac", "1", "-ar", "8000", "-"],
    { maxBuffer: 64 * 1024 * 1024 });
  const s = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  for (let i = 0; i < s.length; i++) if (Math.abs(s[i]!) > 0.05) return i / 8000;
  return -1;
}

test("a film with transitions across a slide, a page and a clip keeps its length and its speech on its picture", () => {
  for (const [w, h] of [[320, 180], [180, 320]] as const) {
    const dir = mkdtempSync(join(tmpdir(), "sc-trans-film-"));
    const recs = join(dir, "recs");
    mkdirSync(recs);
    // Речь третьей сцены — запись с шумом с первого отсчёта: по её началу видно,
    // где в ролике зазвучала сцена.
    const line = "The clip arrives through an opening circle.";
    execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "anoisesrc=d=1.5:a=0.5", "-ar", "48000", "-ac", "1",
      recordingPath(line, { engine: "recorded", dir: recs })]);
    for (const quiet of ["The film opens on a chapter.", "A page follows on a cube."]) {
      execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", "1.2",
        recordingPath(quiet, { engine: "recorded", dir: recs })]);
    }
    execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", `testsrc2=size=${w}x${h}:rate=10:duration=4`, join(dir, "clip.mp4")]);
    writeFileSync(join(dir, "page.html"), "<html><body style='margin:0;background:#1d4'><h1 style='font:40px sans-serif'>Page</h1></body></html>");
    writeFileSync(join(dir, "story.md"), `# T
voice: {"engine":"recorded","dir":"${recs}"}
frame: {"width":${w},"height":${h},"fps":10,"scale":1}

## one · slides.chapter
title: One
body: The first scene.

The film opens on a chapter.

## two · page
page: page.html
transition: cube 0.8

A page follows on a cube.

## three · video
file: clip.mp4
transition: mask 0.6
duration: 3

${line}
`);
    const r = spawnSync("node", [ENTRY, "build", "--source", "story.md", "--out", "f.mp4"],
      { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
    assert.equal(r.status, 0, r.stderr);
    const rep = JSON.parse(r.stdout) as { duration: number; transitions: Array<{ at: number; duration: number; renderer: string }>;
      scenes: Array<{ frames?: number; start: number; end: number }> };
    // Место сцен в ролике: первая с нуля, каждая следующая — на длину перехода раньше конца
    // предыдущей, конец последней — конец ролика.
    const [a, b, c] = rep.scenes;
    assert.equal(a!.start, 0);
    assert.ok(Math.abs(a!.end - b!.start - 0.8) < 0.001 && Math.abs(b!.end - c!.start - 0.6) < 0.001,
      `${w}x${h}: scenes overlap by their transitions (${rep.scenes.map((x) => `${x.start}–${x.end}`).join(", ")})`);
    assert.ok(Math.abs(c!.end - rep.duration) < 0.12, `${w}x${h}: the last scene ends with the film (${c!.end} vs ${rep.duration})`);
    assert.deepEqual(rep.transitions.map((t) => t.renderer), ["webgl", "webgl"]);
    const frames = rep.scenes.map((s) => s.frames!);
    const want = (frames.reduce((a, b) => a + b, 0) - 8 - 6) / 10;
    assert.ok(Math.abs(rep.duration - want) < 0.12, `${w}x${h}: film length ${rep.duration} equals the computed ${want}`);
    // Сцена три начинается вместе со своим переходом — там же начинается её речь.
    const third = rep.transitions[1]!.at;
    assert.ok(Math.abs(onset(join(dir, "f.mp4")) - third) < 0.1, `${w}x${h}: speech starts with its picture at ${third}`);
  }
});

test("a cut has no length, a dip has a colour, and a scene's fades can be dropped", async () => {
  assert.deepEqual(parseTransition("cut"), { kind: "cut", duration: 0 });
  assert.throws(() => parseTransition("cut 0.5"), /a cut has no length/);
  assert.deepEqual(parseTransition("dip 0.6 white"), { kind: "dip", duration: 0.6, color: "#ffffff" });
  assert.equal(parseTransition('{"kind":"dip","color":"#f80"}').color, "#ff8800");
  assert.throws(() => parseTransition('{"kind":"cube","color":"#fff"}'), /only a dip has a colour/);
  assert.throws(() => parseTransition("dip 0.6 teal"), /black, white or #rrggbb/);
  assert.deepEqual(parseFade("none"), { in: 0, out: 0 });
  assert.deepEqual(parseFade("0.1"), { in: 0.1, out: 0.1 });
  assert.deepEqual(parseFade('{"out":0.6}'), { out: 0.6 });
  assert.throws(() => parseFade("{\"up\":1}"), /unknown property/);
  // Провал в белое: середина перехода — белый кадр, не смесь сцен.
  const dir = mkdtempSync(join(tmpdir(), "sc-dip-"));
  const a = frames(join(dir, "a"), "red", 9), b = frames(join(dir, "b"), "blue", 9);
  for (const engine of ["webgl", "ffmpeg"] as const) {
    const got = await renderTransition({ kind: "dip", a, b, width: W, height: H, out: join(dir, `t-${engine}`), engine, color: "#ffffff" });
    assert.equal(got.renderer, engine);
    const m = rgb(got.frames[4]!);
    let low = 255;
    for (const v of m) low = Math.min(low, v);
    // Запасной xfade проходит через белое не точно в середине: он светлее обеих сцен, но не белый.
    const floor = engine === "webgl" ? 225 : 170;
    assert.ok(low > floor, `${engine}: the middle of a dip to white is white (darkest channel ${low})`);
  }
});

/** Средняя яркость каждого кадра ролика, 0…255. */
function lumas(file: string): number[] {
  return [...execFileSync(ffmpeg, ["-loglevel", "error", "-i", file, "-vf", "scale=1:1:flags=area,format=gray", "-f", "rawvideo", "-"])];
}

test("a cut joins scenes without a dark frame, where plain scenes fade through black", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-cut-"));
  for (const [name, bg] of [["a", "#2c2"], ["b", "#39f"]]) writeFileSync(join(dir, `${name}.html`),
    `<html><body style='margin:0;background:${bg}'></body></html>`);
  const film = (seam: string, fade = ""): number[] => {
    // Затемнение простых сцен — в цвет затухания темы; ночная тема гасит в чёрный, светлая neutral — в бумагу.
    writeFileSync(join(dir, "story.md"), `# T
voice: {"engine":"stub","name":"silent","cps":15}
theme: midnight
frame: {"width":160,"height":90,"fps":10,"scale":1}

## one · page
page: a.html
duration: 1.5
${fade}

## two · page
page: b.html
duration: 1.5
${seam}
`);
    const r = spawnSync("node", [ENTRY, "build", "--source", "story.md", "--out", "f.mp4"],
      { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
    assert.equal(r.status, 0, r.stderr);
    return lumas(join(dir, "f.mp4"));
  };
  // Без перехода сцены уходят в чёрное и выходят из него: у стыка есть тёмный кадр.
  const plain = film("");
  const seam = plain.slice(10, 20);
  assert.ok(Math.min(...seam) < 40, `plain scenes dip to black at the seam (${seam.join(" ")})`);
  // Склейка: ни одного тёмного кадра у стыка, и ролик не короче суммы сцен.
  const cut = film("transition: cut");
  assert.equal(cut.length, 30, "a cut does not overlap the scenes");
  const joined = cut.slice(10, 20);
  assert.ok(Math.min(...joined) > 70, `a cut keeps every frame at the seam lit (${joined.join(" ")})`);
  // fade: none на первой сцене: ролик начинается не с чёрного.
  const bare = film("transition: cut", "fade: none");
  assert.ok(bare[0]! > 70, `a scene without fades starts lit (${bare[0]})`);
  assert.ok(cut[0]! < 40, `a scene with its default fade starts from black (${cut[0]})`);
});
