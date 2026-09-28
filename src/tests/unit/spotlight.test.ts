// Фокус внимания одной записью: разбор, перевод в камеру и карточки, кадры на
// трёх типах сцен, привязка к тактам, замедление, проезд по полотну, размытие
// движения и воспроизводимость кадра.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { chromium, type Page } from "playwright";
import { compileSpotlights, parseSpotlight } from "../../spotlight.js";
import { parseOverlay } from "../../overlay.js";
import { buildSlide } from "../../provider/slides/page.js";
import { renderScene } from "../../render.js";
import { rawOf } from "../support.js";
import { THEMES } from "../../theme.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const here = dirname(fileURLToPath(import.meta.url));
const ENTRY = resolve(here, "..", "..", "agentic-screencast.js");
const CLOCK = readFileSync(resolve(here, "..", "..", "browser", "clock.js"), "utf8");
const STAGE = readFileSync(resolve(here, "..", "..", "browser", "stage.js"), "utf8");

const gray = (png: Buffer): Uint8Array =>
  new Uint8Array(rawOf(png, "gray"));

async function stage(file: string, scene: Record<string, unknown>, run: (p: Page) => Promise<void>, size = { width: 1280, height: 720 }): Promise<void> {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: size });
    await ctx.addInitScript({ content: CLOCK });
    await ctx.addInitScript({ content: STAGE });
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(file).href);
    await p.evaluate((s) => window.__stage.mount(s as never), { duration: 10, beats: 1, theme: THEMES.midnight, target: "body", ...scene });
    await run(p);
  } finally { await browser.close(); }
}
const seek = (p: Page, t: number): Promise<void> => p.evaluate((tt) => window.__clock!.seek(tt), t);
const rect = (p: Page, sel: string): Promise<{ x: number; y: number; w: number; h: number }> => p.evaluate((s) => {
  const r = document.querySelector(s)!.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}, sel);
/** Средняя яркость внутри прямоугольника и вне его на снимке кадра. */
async function lightness(p: Page, r: { x: number; y: number; w: number; h: number },
  skip: Array<{ x: number; y: number; w: number; h: number }> = []): Promise<{ inside: number; outside: number }> {
  const png = await p.screenshot();
  const vp = p.viewportSize()!;
  const raw = new Uint8Array(rawOf(png, "gray"));
  // «Снаружи» — только то, что дальше поля от цели: рамка подсветки и край
  // увеличенной цели к остальному кадру не относятся.
  const margin = 70;
  let si = 0, ni = 0, so = 0, no = 0;
  for (let y = 0; y < vp.height; y++) for (let x = 0; x < vp.width; x++) {
    const v = raw[y * vp.width + x]!;
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) { si += v; ni++; }
    else if ((x < r.x - margin || x > r.x + r.w + margin || y < r.y - margin || y > r.y + r.h + margin)
      && !skip.some((k) => x >= k.x && x < k.x + k.w && y >= k.y && y < k.y + k.h)) { so += v; no++; }
  }
  return { inside: si / ni, outside: so / no };
}

test("spotlight reads a one-line chain and a JSON object, and refuses a CSS target on video", () => {
  assert.deepEqual(parseSpotlight("#a @ b1 | .card:nth-child(2) @ b2 .. b3").map((f) => [f.target, f.at, f.until]),
    [["#a", "b1", undefined], [".card:nth-child(2)", "b2", "b3"]]);
  const [f] = parseSpotlight('{"area":[0.1,0.1,0.3,0.3],"at":"b2","slow":"stop","card":{"title":"Here"}}');
  assert.equal(f!.slow, "stop");
  assert.throws(() => parseSpotlight("#a b2"), /target @ anchor/);
  assert.throws(() => parseSpotlight('{"target":"#a","area":[0,0,1,1],"at":"1"}'), /exactly one/);
  assert.throws(() => compileSpotlights(parseSpotlight("#a @ b1"), { starts: [0], ends: [3], duration: 3, video: true }), /by area/);
});

test("a chain becomes kept camera moves, a card lives inside its focus window, a slow focus retimes the clip", () => {
  const c = compileSpotlights(parseSpotlight('[{"target":"#a","at":"b1","card":{"title":"First thing"}},{"target":"#b","at":"b2"}]'),
    { starts: [0.5, 6], ends: [5.5, 9], duration: 10, video: false });
  assert.equal(c.camera[0]!.keep, true);
  assert.equal(c.camera[0]!.at + c.camera[0]!.move! + c.camera[0]!.hold, 6, "the first focus hands over exactly when the second starts");
  assert.throws(() => compileSpotlights(parseSpotlight('[{"target":"#a","at":"b1","card":{"title":"First thing"}},{"target":"#b","at":"b2"}]'),
    { starts: [0.5, 2.5], ends: [2.5, 9], duration: 10, video: false }), /for its card to be read/);
  const card = c.cards[0]!;
  assert.ok(card.at >= c.camera[0]!.at && card.at + card.hold! <= c.camera[0]!.at + c.camera[0]!.move! + c.camera[0]!.hold,
    "the card appears and leaves inside the focus window");
  const v = compileSpotlights(parseSpotlight('[{"area":[0.2,0.2,0.3,0.3],"at":"1s","until":"4s","slow":0.25}]'),
    { starts: [0], ends: [6], duration: 6, video: true });
  assert.deepEqual(v.speed, [{ from: 1.8, to: 1.8 + 2.2 * 0.25, rate: 0.25 }]);
  parseOverlay(JSON.stringify({ camera: c.camera, cards: c.cards }));
  // Названный конец раньше приезда камеры — ошибка, а не молчаливые 0,8 с удержания.
  assert.throws(() => compileSpotlights(parseSpotlight('{"area":[0.2,0.2,0.3,0.3],"at":"2s","until":"2s","slow":"stop"}'),
    { starts: [0], ends: [6], duration: 6, video: true }), /comes before the camera arrives at 2\.80s/);
});

test("on a slide and on a page the focus dims the rest, keeps the subject bright, zooms in and keeps the card off the subject", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-spot-"));
  const slide = buildSlide({ id: "n", kind: "number", title: "One number", values: [{ value: "38", label: "frames a second" }],
    tags: ["three thousand shapes", "one board"] }, dir, { frame: { width: 1280, height: 720 } });
  const page = join(dir, "page.html");
  writeFileSync(page, `<html><body style="margin:0;background:#1a2433;font:20px sans-serif;color:#cde">
    <div style="padding:30px">Toolbar · Files · Share · Present</div>
    <div id="card" style="position:absolute;left:520px;top:280px;width:220px;height:130px;background:#e8f0ff;border-radius:14px"></div>
    <div style="position:absolute;left:60px;top:500px;width:1100px;height:120px;background:#2d3c55"></div></body></html>`);
  for (const [file, target] of [[slide, "el2"], [page, "#card"]] as const) {
    const compiled = compileSpotlights(parseSpotlight(JSON.stringify([{ target, at: "1s", until: "7s", card: { title: "This is the subject" } }])),
      { starts: [0], ends: [9], duration: 10, video: false });
    const overlay = parseOverlay(JSON.stringify({ camera: compiled.camera, cards: compiled.cards }));
    await stage(file, { overlay }, async (p) => {
      const pick = async (): Promise<{ x: number; y: number; w: number; h: number }> => p.evaluate((t) => {
        const n = t === "el2" ? document.querySelectorAll(".el")[1]! : document.querySelector(t)!;
        const r = n.getBoundingClientRect();
        return { x: r.left, y: r.top, w: r.width, h: r.height };
      }, target);
      // Исходный кадр — когда слайд уже проявился, а камера ещё не тронулась.
      await seek(p, 0.95);
      const before = await pick();
      const base = await lightness(p, before);
      await seek(p, 4);
      const held = await pick();
      // Карточка — намеренная надпись поверх кадра, а не его фон: её не меряем.
      const card = await rect(p, ".__card");
      const now = await lightness(p, held, [card]);
      // Затемнение меряется на ТОМ ЖЕ кадре с тем же наездом: пятно снято — пятно
      // на месте. Сравнение с общим планом смешало бы затемнение с тем, что
      // наезд показывает другую часть кадра.
      await p.evaluate(() => { (document.querySelector("#__spot") as HTMLElement).style.visibility = "hidden"; });
      const undimmed = await lightness(p, held, [card]);
      await p.evaluate(() => { (document.querySelector("#__spot") as HTMLElement).style.visibility = ""; });
      // Наезд по умолчанию — ×1,65, но не дальше того, при котором цель целиком в кадре на 0,9 его
      // стороны: широкий блок слайда приближается меньше, чем карточка страницы.
      const vw = await p.evaluate(() => innerWidth), vh = await p.evaluate(() => innerHeight);
      const k = Math.max(1, Math.min(1.65, (0.9 * vw) / before.w, (0.9 * vh) / before.h));
      assert.ok(Math.abs(held.w / before.w - k) < 0.04, `${target}: the subject is zoomed in ×${k.toFixed(2)} (${before.w.toFixed(0)} → ${held.w.toFixed(0)})`);
      assert.ok(held.x >= 0 && held.y >= 0 && held.x + held.w <= vw && held.y + held.h <= vh, `${target}: the zoomed subject stays whole in the frame`);
      assert.ok(now.outside < undimmed.outside * 0.8, `${target}: the rest dims (${undimmed.outside.toFixed(1)} → ${now.outside.toFixed(1)})`);
      assert.ok(now.inside >= base.inside - 3, `${target}: the subject stays bright (${base.inside.toFixed(1)} → ${now.inside.toFixed(1)})`);
      const overlap = !(card.x + card.w <= held.x || held.x + held.w <= card.x || card.y + card.h <= held.y || held.y + held.h <= card.y);
      assert.ok(!overlap, `${target}: the card stays off the subject`);
    });
  }
});

test("on a video the focus zooms and dims the frame and slows the clip inside its window", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-spot-video-"));
  // Тёмный кадр с белым прямоугольником и бегущей мозаикой в углу: размер
  // прямоугольника меряет наезд, мозаика — ход времени.
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "color=c=0x303030:s=320x180:r=10:d=8", "-f", "lavfi",
    "-i", "testsrc2=s=80x60:r=10:d=8", "-filter_complex", "[0][1]overlay=230:110,drawbox=x=100:y=50:w=60:h=40:c=white:t=fill",
    join(dir, "clip.mp4")]);
  writeFileSync(join(dir, "story.md"), `# V
voice: {"engine":"stub","name":"silent"}
theme: midnight
frame: {"width":320,"height":180,"fps":10,"scale":1}

## v · video
file: clip.mp4
spotlight: {"area":[0.28,0.24,0.28,0.3],"at":"1s","until":"4.5s","slow":0.25,"scale":1.8}
`);
  const r = spawnSync("node", [ENTRY, "build", "--source", "story.md", "--out", "v.mp4"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr);
  const frame = (t: number): Uint8Array => new Uint8Array(execFileSync(ffmpeg, ["-loglevel", "error", "-ss", String(t), "-i", join(dir, "v.mp4"),
    "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-"]));
  const whiteWidth = (f: Uint8Array, row: number): number => { let n = 0; for (let x = 0; x < 320; x++) if (f[row * 320 + x]! > 200) n++; return n; };
  const before = frame(0.5), held = frame(3.0);
  assert.ok(whiteWidth(held, 70) > whiteWidth(before, 70) * 1.4, `the box is zoomed in (${whiteWidth(before, 70)} → ${whiteWidth(held, 70)})`);
  // Угол кадра далеко от цели и её рамки: до фокуса и под фокусом.
  const corner = (f: Uint8Array): number => { let s = 0; for (let y = 0; y < 12; y++) for (let x = 0; x < 40; x++) s += f[y * 320 + x]!; return s / 480; };
  const open = frame(0.9);
  assert.ok(corner(held) < corner(open) * 0.8, `the corner dims (${corner(open).toFixed(1)} → ${corner(held).toFixed(1)})`);
  // Ход клипа: разница соседних кадров мозаики внутри окна фокуса меньше, чем до него.
  const motion = (a: number): number => { const x = frame(a), y = frame(a + 0.1); let d = 0; for (let i = 0; i < x.length; i++) d += Math.abs(x[i]! - y[i]!); return d; };
  assert.ok(motion(2.6) < motion(0.3) * 0.6, `the clip runs slower under the focus (${motion(0.3)} → ${motion(2.6)})`);
});

test("a focus anchored to a beat moves with the beat when the pace changes", () => {
  const at = (cps: number): { focus: number; beat: number } => {
    const dir = mkdtempSync(join(tmpdir(), "sc-spot-cps-"));
    writeFileSync(join(dir, "p.html"), "<html><body style='margin:0;background:#123'><div id='x' style='margin:200px;width:200px;height:100px;background:#fff'></div></body></html>");
    writeFileSync(join(dir, "story.md"), `# C
voice: {"engine":"stub","name":"silent","cps":${cps}}
frame: {"width":320,"height":180,"fps":10,"scale":1}

## p · page
page: p.html
spotlight: #x @ b2

A first sentence runs for a while before the focus.

The focus arrives with this second sentence.
`);
    const r = spawnSync("node", [ENTRY, "build", "--source", "story.md", "--out", "c.mp4", "--keys-only"],
      { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
    assert.equal(r.status, 0, r.stderr);
    const rep = JSON.parse(r.stdout) as { keys: Array<{ spotlights: Array<{ at: number }>; beats: Array<{ starts: number }> }> };
    return { focus: rep.keys[0]!.spotlights[0]!.at, beat: rep.keys[0]!.beats[1]!.starts };
  };
  const slow = at(10), fast = at(20);
  assert.equal(slow.focus, slow.beat);
  assert.equal(fast.focus, fast.beat);
  assert.ok(slow.focus - fast.focus > 1, `the focus moved with the beat (${slow.focus} vs ${fast.focus})`);
});

test("the camera travels across a wide canvas from target to target without returning", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-spot-canvas-"));
  const file = join(dir, "canvas.html");
  writeFileSync(file, `<html><body style="margin:0;width:2600px;height:720px;background:#111;position:relative">
    <div id="a" style="position:absolute;left:150px;top:260px;width:300px;height:200px;background:#e33"></div>
    <div id="b" style="position:absolute;left:1150px;top:260px;width:300px;height:200px;background:#3e3"></div>
    <div id="c" style="position:absolute;left:2150px;top:260px;width:300px;height:200px;background:#33e"></div></body></html>`);
  const compiled = compileSpotlights(parseSpotlight("#a @ 0.5 | #b @ 3 | #c @ 5.5"), { starts: [0], ends: [9], duration: 9, video: false });
  assert.deepEqual(compiled.camera.map((c) => Boolean(c.keep)), [true, true, false]);
  await stage(file, { overlay: parseOverlay(JSON.stringify({ camera: compiled.camera })), duration: 9 }, async (p) => {
    const centre = async (t: number): Promise<string> => {
      await seek(p, t);
      const png = await p.screenshot({ clip: { x: 590, y: 310, width: 100, height: 100 } });
      const raw = rawOf(png);
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < raw.length; i += 3) { r += raw[i]!; g += raw[i + 1]!; b += raw[i + 2]!; }
      return r > g && r > b ? "red" : g > r && g > b ? "green" : "blue";
    };
    assert.deepEqual([await centre(2.5), await centre(5), await centre(7.5)], ["red", "green", "blue"]);
    // Между целями камера не уходит на общий план: масштаб в середине проезда больше единицы.
    await seek(p, 3.4);
    const k = await p.evaluate(() => Number(/scale\(([\d.]+)\)/.exec(document.body.style.transform)?.[1] ?? 1));
    assert.ok(k > 1.3, `mid-travel scale stays zoomed: ${k}`);
  }, { width: 1280, height: 720 });
});

test("a frame from the middle of a move renders the same bytes twice, and motion blur softens only moving frames", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-spot-blur-"));
  const file = join(dir, "page.html");
  writeFileSync(file, `<html><body style="margin:0;background:#fff">${Array.from({ length: 40 }, (_, i) =>
    `<div style="position:absolute;left:${(i % 8) * 80 + 10}px;top:${Math.floor(i / 8) * 70 + 10}px;width:60px;height:4px;background:#000"></div>`).join("")}
    <div id="t" style="position:absolute;left:280px;top:150px;width:80px;height:60px;border:3px solid #000"></div></body></html>`);
  const overlay = parseOverlay(JSON.stringify({ camera: [{ at: 0.5, move: 1.2, hold: 2, target: "#t", scale: 2.2 }] }));
  const scene = { page: file, duration: 5, overlay, target: "body", effects: { fade: { in: 0, out: 0 } } };
  const opts = { width: 640, height: 360, fps: 10 };
  const shot = async (at: number, blur: boolean): Promise<Buffer> =>
    (await renderScene(scene, { ...opts, at, ...(blur ? { motionBlur: { samples: 6, shutter: 0.8 } } : {}) })).shots[0]!.buf;
  const md5 = (b: Buffer): string => createHash("md5").update(b).digest("hex");
  assert.equal(md5(await shot(1.1, false)), md5(await shot(1.1, false)), "the mid-move frame is reproducible");
  const sharpness = (png: Buffer): number => {
    const g = gray(png);
    let s = 0, n = 0;
    for (let y = 1; y < 359; y++) for (let x = 1; x < 639; x++) {
      const i = y * 640 + x;
      const l = 4 * g[i]! - g[i - 1]! - g[i + 1]! - g[i - 640]! - g[i + 640]!;
      s += l * l; n++;
    }
    return s / n;
  };
  const sharp = sharpness(await shot(1.1, false)), soft = sharpness(await shot(1.1, true));
  assert.ok(soft < sharp * 0.8, `motion blur lowers sharpness mid-move (${sharp.toFixed(0)} → ${soft.toFixed(0)})`);
  assert.equal(md5(await shot(2.8, true)), md5(await shot(2.8, false)), "a held frame is untouched by motion blur");
});

test("a focus can desaturate and blur the rest of a page while the subject keeps its colour", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-spot-veil-"));
  const file = join(dir, "page.html");
  writeFileSync(file, `<html><body style="margin:0;background:#c0392b">
    <div id="t" style="position:absolute;left:560px;top:300px;width:160px;height:120px;background:#27ae60"></div></body></html>`);
  const compiled = compileSpotlights(parseSpotlight('[{"target":"#t","at":"0.5","until":"4","desaturate":true,"blur":6,"shape":"circle"}]'),
    { starts: [0], ends: [5], duration: 6, video: false });
  await stage(file, { overlay: parseOverlay(JSON.stringify({ camera: compiled.camera })), duration: 6 }, async (p) => {
    await seek(p, 2.5);
    const px = async (x: number, y: number): Promise<number[]> => {
      const raw = rawOf(await p.screenshot({ clip: { x, y, width: 1, height: 1 } }));
      return [raw[0]!, raw[1]!, raw[2]!];
    };
    const [r, g, b] = await px(60, 60);
    assert.ok(Math.max(r, g, b) - Math.min(r, g, b) < 20, `the corner turns grey: ${r},${g},${b}`);
    const [tr, tg, tb] = await px(640, 360);
    assert.ok(tg > tr + 40 && tg > tb + 40, `the subject keeps its green: ${tr},${tg},${tb}`);
    assert.equal(await p.evaluate(() => (document.querySelector("#__spot") as HTMLElement).style.borderRadius), "50%");
  });
});

test("keep from the help's example holds the last focus pushed in to the end of the scene; keep with until is refused", () => {
  // Пример берётся из самой справки: справка и разбор не расходятся.
  const help = spawnSync("node", [ENTRY, "help", "overlay"], { encoding: "utf8" }).stdout;
  const example = help.split("\n").find((l) => l.startsWith("{") && l.includes('"keep":true'));
  assert.ok(example, "the help shows a keep example");
  const c = compileSpotlights(parseSpotlight(example), { starts: [0.5, 4], ends: [4, 8], duration: 9, video: false });
  const cam = c.camera[0]!;
  assert.equal(cam.keep, true);
  assert.ok(Math.abs(cam.at + cam.move! + cam.hold - 9) < 1e-6, `the last kept focus holds to the scene's end: ${JSON.stringify(cam)}`);
  parseOverlay(JSON.stringify({ camera: c.camera }));
  const plain = compileSpotlights(parseSpotlight('{"target":"#hero","at":"b1"}'), { starts: [0.5, 4], ends: [4, 8], duration: 9, video: false });
  assert.equal(plain.camera[0]!.keep, undefined, "without keep the last focus returns at the end of its beat");
  assert.throws(() => parseSpotlight('{"target":"#a","at":"b1","until":"b2","keep":true}'), /keep stays pushed in and until returns/);
  assert.throws(() => parseSpotlight('{"target":"#a","at":"b1","keep":"yes"}'), /keep: expected true or false/);
});

test("a spotlight chain mixes the short form and objects, and a | inside an object's text does not split it", () => {
  const list = parseSpotlight('#n1 @ b1 | {"target":"#n2","at":"b2","scale":1,"card":{"title":"A | B"}} | #n3 @ b3 .. b4');
  assert.deepEqual(list.map((f) => [f.target, f.at, f.until, f.scale, f.card?.title]),
    [["#n1", "b1", undefined, undefined, undefined], ["#n2", "b2", undefined, 1, "A | B"], ["#n3", "b3", "b4", undefined, undefined]]);
  // Пример из справки разбирается как есть.
  const help = spawnSync("node", [ENTRY, "help", "overlay"], { encoding: "utf8" }).stdout;
  const mixed = help.split("\n").find((l) => l.startsWith("spotlight: #") && l.includes("{"));
  assert.ok(mixed, "the help shows a mixed chain");
  assert.equal(parseSpotlight(mixed.slice("spotlight:".length)).length, 3);
  assert.throws(() => parseSpotlight('#a @ b1 | {"target":"#b",'), /expected a JSON object/);
});
