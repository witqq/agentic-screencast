// Эффекты слоя композиции: пометки от руки, блик, конфетти и искры. Каждый проверяется
// по пикселям кадра так, чтобы подделка не проходила: штрих растёт, а не проявляется
// целиком или прозрачностью; блик едет; частицы появляются в момент успеха, движутся,
// зависят от зерна и воспроизводятся побайтно.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium, type Page } from "playwright";
import { parseOverlay } from "../../overlay.js";
import { rawOf } from "../support.js";
import { THEMES } from "../../theme.js";

const here = dirname(fileURLToPath(import.meta.url));
const CLOCK = readFileSync(resolve(here, "..", "..", "browser", "clock.js"), "utf8");
const STAGE = readFileSync(resolve(here, "..", "..", "browser", "stage.js"), "utf8");
const W = 1280, H = 720;
/** Предмет пометок на странице теста. */
const T = { x: 700, y: 300, w: 260, h: 120 };

async function withStage(overlay: string, run: (p: Page) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "sc-fx-"));
  const file = join(dir, "page.html");
  writeFileSync(file, `<!doctype html><html><body style="margin:0;background:#101826">
<div id="ui" style="position:absolute;left:${T.x}px;top:${T.y}px;width:${T.w}px;height:${T.h}px;background:#2b6;border-radius:12px"></div>
<h1 id="h" style="position:absolute;left:80px;top:60px;margin:0;font:40px system-ui;color:#dde">Board</h1></body></html>`);
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    await ctx.addInitScript({ content: CLOCK });
    await ctx.addInitScript({ content: STAGE });
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(file).href);
    // Курсор по умолчанию едет в первые секунды сцены — здесь он не нужен и мешал бы сравнивать кадры.
    await p.evaluate((s) => window.__stage.mount(s as never), { duration: 10, beats: 1, theme: THEMES.midnight,
      overlay: parseOverlay(overlay), effects: { cursor: { hidden: true } } });
    await run(p);
  } finally { await browser.close(); }
}
const seek = (p: Page, t: number): Promise<void> => p.evaluate((tt) => window.__clock.seek(tt), t);
/** Кадр целиком как RGB. */
async function rgb(p: Page): Promise<Buffer> {
  return rawOf(await p.screenshot());
}
/** Точки цвета штриха полной насыщенности: проявление прозрачностью сюда не попадает. */
function ink(f: Buffer, colour: [number, number, number] = [255, 0, 255], tol = 60): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3;
    if (Math.abs(f[i]! - colour[0]) + Math.abs(f[i + 1]! - colour[1]) + Math.abs(f[i + 2]! - colour[2]) < tol) out.push([x, y]);
  }
  return out;
}
const md5 = async (p: Page): Promise<string> => createHash("md5").update(await p.screenshot()).digest("hex");

test("a hand-drawn circle, arrow and underline grow along their path and end on the subject", async () => {
  const cx = T.x + T.w / 2, cy = T.y + T.h / 2;
  // Обводка: доля оборота вокруг центра предмета.
  await withStage('{"marks":[{"at":1,"kind":"circle","target":"#ui","draw":1,"color":"#ff00ff","hold":4}]}', async (p) => {
    const share = async (t: number): Promise<number> => {
      await seek(p, t);
      const bins = new Set(ink(await rgb(p)).map(([x, y]) => Math.floor(((Math.atan2(y - cy, x - cx) + Math.PI) / (2 * Math.PI)) * 72)));
      return bins.size / 72;
    };
    const a = await share(1.35), b = await share(1.6), end = await share(2.5);
    // Круг — больше оборота по спирали и перо толще к середине: доля углов растёт быстрее прежнего.
    assert.ok(a >= 0.15 && a <= 0.9 && b >= 0.15 && b <= 0.92 && b > a, `the ring grows: ${a.toFixed(2)} then ${b.toFixed(2)}`);
    assert.ok(end > 0.97, `at the end the ring goes all the way round (${end.toFixed(2)})`);
    const pts = ink(await rgb(p));
    const xs = pts.map(([x]) => x), ys = pts.map(([, y]) => y);
    assert.ok(Math.min(...xs) < T.x && Math.max(...xs) > T.x + T.w && Math.min(...ys) < T.y && Math.max(...ys) > T.y + T.h,
      "the ring encloses the subject");
  });
  // Стрелка из явной точки: пройденная доля пути и наконечник только после древка.
  await withStage('{"marks":[{"at":1,"kind":"arrow","target":"#ui","from":[0.1,0.1],"draw":1.25,"color":"#ff00ff","hold":4}]}', async (p) => {
    const sx = 0.1 * W, sy = 0.1 * H, ex = T.x, ey = T.y;
    const reach = async (t: number): Promise<number> => {
      await seek(p, t);
      const len = Math.hypot(ex - sx, ey - sy);
      return Math.max(0, ...ink(await rgb(p)).map(([x, y]) => ((x - sx) * (ex - sx) + (y - sy) * (ey - sy)) / (len * len)));
    };
    const a = await reach(1.4), b = await reach(1.7);
    assert.ok(a >= 0.15 && a <= 0.85 && b >= 0.15 && b <= 0.85 && b > a, `the shaft grows: ${a.toFixed(2)} then ${b.toFixed(2)}`);
    // Наконечник — штрихи в стороны от древка у его конца: точки у конца, отстоящие от оси
    // древка. Ось — от центра точек древка в 30–45 точках от конца к самому концу.
    const head = async (t: number): Promise<number> => {
      await seek(p, t);
      const pts = ink(await rgb(p));
      const back = pts.filter(([x, y]) => { const d = Math.hypot(x - ex, y - ey); return d > 30 && d < 45; });
      const bx = back.reduce((s1, q) => s1 + q[0], 0) / back.length, by = back.reduce((s1, q) => s1 + q[1], 0) / back.length;
      const ux = (ex - bx) / Math.hypot(ex - bx, ey - by), uy = (ey - by) / Math.hypot(ex - bx, ey - by);
      return pts.filter(([x, y]) => { const d = Math.hypot(x - ex, y - ey); return d > 6 && d < 26 && Math.abs((x - ex) * uy - (y - ey) * ux) > 6; }).length;
    };
    const before = await head(1 + 1.25 * 0.8 - 0.02), after = await head(3);
    assert.ok(before < 5 && after > 30, `the head appears only after the shaft: ${before} px, then ${after} px`);
    const tip = ink(await rgb(p)).filter(([x, y]) => Math.hypot(x - ex, y - ey) < 4);
    assert.ok(tip.length > 0 && ex >= T.x - 1 && ey >= T.y - 1, "the head ends inside the subject");
  });
  // Подчёркивание: закрашенная длина от левого края предмета.
  await withStage('{"marks":[{"at":1,"kind":"underline","target":"#ui","draw":1,"color":"#ff00ff","hold":4}]}', async (p) => {
    const span = async (t: number): Promise<{ from: number; share: number }> => {
      await seek(p, t);
      const xs = ink(await rgb(p)).map(([x]) => x);
      return { from: Math.min(...xs), share: (Math.max(...xs) - Math.min(...xs)) / T.w };
    };
    const a = await span(1.35), b = await span(1.6), end = await span(2.5);
    assert.ok(a.share >= 0.15 && a.share <= 0.85 && b.share >= 0.15 && b.share <= 0.85 && b.share > a.share,
      `the underline grows: ${a.share.toFixed(2)} then ${b.share.toFixed(2)}`);
    assert.ok(Math.abs(a.from - T.x) < 30, `it starts at the subject's left edge (${a.from})`);
    assert.ok(end.share >= 1, `at the end it is at least as long as the subject (${end.share.toFixed(2)})`);
  });
});

test("a glint crosses its subject once, and the same moment renders the same bytes", async () => {
  await withStage('{"glints":[{"at":1,"target":"#ui","hold":1}]}', async (p) => {
    /** Столбец с наибольшей яркостью внутри предмета: там идёт полоса. */
    const band = async (t: number): Promise<number> => {
      await seek(p, t);
      const f = await rgb(p);
      let best = -1, at = -1;
      for (let x = T.x; x < T.x + T.w; x++) {
        let sum = 0;
        for (let y = T.y + 20; y < T.y + T.h - 20; y++) { const i = (y * W + x) * 3; sum += f[i]! + f[i + 1]! + f[i + 2]!; }
        if (sum > best) { best = sum; at = x; }
      }
      return at;
    };
    const a = await band(1.35), b = await band(1.65);
    assert.ok(b - a > 20, `the band moves across (${a} → ${b})`);
    await seek(p, 1.5); const one = await md5(p);
    await seek(p, 3); await seek(p, 1.5);
    assert.equal(await md5(p), one);
  });
});

test("confetti appear at the moment of success, fly, depend on the seed and repeat to the byte", async () => {
  const overlay = (seed: number): string => `{"bursts":[{"at":1,"kind":"confetti","target":"#ui","seed":${seed},"hold":2.5}]}`;
  let seeded3 = "";
  await withStage(overlay(3), async (p) => {
    await seek(p, 0.9); const blank = await rgb(p);
    await seek(p, 0.95); const still = await rgb(p);
    assert.ok(blank.equals(still), "nothing before the burst");
    const changed = async (t: number): Promise<Array<[number, number]>> => {
      await seek(p, t);
      const f = await rgb(p), out: Array<[number, number]> = [];
      for (let i = 0; i < f.length; i += 3) if (Math.abs(f[i]! - blank[i]!) + Math.abs(f[i + 1]! - blank[i + 1]!) + Math.abs(f[i + 2]! - blank[i + 2]!) > 60) out.push([(i / 3) % W, Math.floor(i / 3 / W)]);
      return out;
    };
    const a = await changed(1.3), b = await changed(1.9);
    assert.ok(a.length > 200 && b.length > 200, `particles are there after the burst (${a.length}, ${b.length} px)`);
    const centre = (ps: Array<[number, number]>): [number, number] => [ps.reduce((s, q) => s + q[0], 0) / ps.length, ps.reduce((s, q) => s + q[1], 0) / ps.length];
    const [ax, ay] = centre(a), [bx, by] = centre(b);
    assert.ok(Math.hypot(bx - ax, by - ay) > 15, `the confetti move (${ax.toFixed(0)},${ay.toFixed(0)} → ${bx.toFixed(0)},${by.toFixed(0)})`);
    const setA = new Set(a.map(([x, y]) => y * W + x));
    assert.ok(b.filter(([x, y]) => setA.has(y * W + x)).length < b.length * 0.5, "the particles are not a picture standing still");
    await seek(p, 1.6); seeded3 = await md5(p);
    await seek(p, 2.8); await seek(p, 1.6);
    assert.equal(await md5(p), seeded3, "the same seed and moment render the same bytes");
  });
  await withStage(overlay(3), async (p) => { await seek(p, 1.6); assert.equal(await md5(p), seeded3, "a new run repeats the layout"); });
  await withStage(overlay(4), async (p) => { await seek(p, 1.6); assert.notEqual(await md5(p), seeded3, "another seed, another layout"); });
});

test("sparks fly out as light streaks of their own colour and fade within a second", async () => {
  await withStage('{"bursts":[{"at":1,"kind":"sparks","target":"#ui","seed":5,"hold":2}]}', async (p) => {
    await seek(p, 0.9); const blank = await rgb(p);
    const spark = async (t: number): Promise<{ pts: Array<[number, number]>; warm: number }> => {
      await seek(p, t);
      const f = await rgb(p), pts: Array<[number, number]> = [];
      let warm = 0;
      for (let i = 0; i < f.length; i += 3) {
        const d = f[i]! - blank[i]! + f[i + 1]! - blank[i + 1]! + f[i + 2]! - blank[i + 2]!;
        if (d > 45) { pts.push([(i / 3) % W, Math.floor(i / 3 / W)]); if (f[i]! >= f[i + 2]! - 10 && f[i + 1]! >= f[i + 2]! - 10) warm++; }
      }
      return { pts, warm };
    };
    assert.equal((await spark(0.95)).pts.length, 0, "no sparks before the moment");
    const a = await spark(1.1), b = await spark(1.35);
    assert.ok(a.pts.length > 20 && b.pts.length > 20, `sparks are drawn (${a.pts.length}, ${b.pts.length} px)`);
    assert.ok(a.warm > a.pts.length * 0.5, `most spark pixels are warm light, not the confetti palette (${a.warm} of ${a.pts.length})`);
    const cx = T.x + T.w / 2, cy = T.y + T.h / 2;
    const r = (ps: Array<[number, number]>): number => ps.reduce((s1, [x, y]) => s1 + Math.hypot(x - cx, y - cy), 0) / ps.length;
    assert.ok(r(b.pts) > r(a.pts) + 10, `sparks fly outwards (${r(a.pts).toFixed(0)} → ${r(b.pts).toFixed(0)} px from the centre)`);
    assert.equal((await spark(2.3)).pts.length, 0, "sparks are gone once their life is over");
  });
});

test("marks, glints and bursts reject what they cannot draw", () => {
  assert.throws(() => parseOverlay('{"marks":[{"at":1,"kind":"box","target":"#a"}]}'), /circle \| arrow \| underline/);
  assert.throws(() => parseOverlay('{"marks":[{"at":1,"kind":"circle","target":"#a","from":[0.1,0.1]}]}'), /only an arrow starts somewhere/);
  assert.throws(() => parseOverlay('{"marks":[{"at":1,"kind":"underline","target":"#a","color":"red"}]}'), /#rrggbb/);
  assert.throws(() => parseOverlay('{"glints":[{"at":1,"point":[0.5,0.5]}]}'), /unknown property «point»/);
  assert.throws(() => parseOverlay('{"bursts":[{"at":1,"kind":"stars","point":[0.5,0.5]}]}'), /confetti \| sparks/);
  assert.throws(() => parseOverlay('{"bursts":[{"at":1,"kind":"confetti","point":[0.5,0.5],"seed":1.5}]}'), /whole number/);
});

// Пометка от руки — гладкая, а не «пила»: прежде каждая точка пути дрожала отдельно, и круг выходил
// ломаной с зубцами. Теперь путь идёт медленными волнами: угол поворота между соседними отрезками
// мал, толщина пера плавно меняется вдоль штриха, конец круга проходит снаружи начала, а не
// замыкается на него; тот же момент рисуется побайтно так же.
test("hand-drawn marks are smooth strokes with a changing width, and a circle does not close on itself", async () => {
  await withStage('{"marks":[{"at":1,"kind":"circle","target":"#ui","draw":1,"hold":4},{"at":1,"kind":"underline","target":"#h","draw":1,"hold":4},{"at":1,"kind":"arrow","target":"#ui","from":[0.2,0.8],"draw":1,"hold":4}]}', async (p) => {
    await seek(p, 3);
    const strokes = await p.evaluate(() => {
      const segs = [...document.querySelectorAll("path.__mark")] as SVGPathElement[];
      return segs.filter((s) => s.style.display !== "none").map((s) => {
        const m = /M([\d.-]+),([\d.-]+) L([\d.-]+),([\d.-]+)/.exec(s.getAttribute("d") ?? "")!;
        return { a: [Number(m[1]), Number(m[2])], b: [Number(m[3]), Number(m[4])], w: Number(s.getAttribute("stroke-width")) };
      });
    });
    // Первые 64 отрезка — круг, следующие 64 — подчёркивание, дальше — стрелка и её наконечник.
    for (const [name, from] of [["circle", 0], ["underline", 64], ["arrow shaft", 128]] as const) {
      const run = strokes.slice(from, from + 64);
      let worst = 0;
      for (let k = 1; k < run.length; k++) {
        const u = [run[k - 1]!.b[0]! - run[k - 1]!.a[0]!, run[k - 1]!.b[1]! - run[k - 1]!.a[1]!], v = [run[k]!.b[0]! - run[k]!.a[0]!, run[k]!.b[1]! - run[k]!.a[1]!];
        const turn = Math.abs(Math.atan2(u[0]! * v[1]! - u[1]! * v[0]!, u[0]! * v[0]! + u[1]! * v[1]!));
        worst = Math.max(worst, turn);
      }
      assert.ok(worst < 0.3, `${name}: the sharpest turn between segments is ${(worst * 180 / Math.PI).toFixed(1)}°`);
      const ws = run.map((s) => s.w);
      assert.ok(Math.max(...ws) / Math.min(...ws) > 1.6, `${name}: the pen's width changes along the stroke`);
    }
    const circle = strokes.slice(0, 64), start = circle[0]!.a, end = circle[63]!.b;
    assert.ok(Math.hypot(end[0]! - start[0]!, end[1]! - start[1]!) > 6, "the circle's end passes by its start instead of closing on it");
    const one = await md5(p);
    await seek(p, 2); await seek(p, 3);
    assert.equal(await md5(p), one, "the same moment draws the same bytes");
  });
});
