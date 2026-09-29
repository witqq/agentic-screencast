// Геометрия фокуса и лупы: инструменты внимания выделяют и увеличивают ровно названный предмет
// и не обрезают его. Каждый тест меряет кадр: где края цели, где линза, светлы ли углы цели под
// круглым фокусом, остаются ли углы крупной цели в кадре на удержании наезда. Несоответствия, от
// которых идут тесты, записаны по сценам ролика-обзора и демо эффектов в рабочем пространстве
// задачи (evidence/attention-geometry.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { loupeGraph, loupeLayout } from "../../loupe.js";
import { parseOverlay } from "../../overlay.js";
import { lint } from "../../lint.js";
import { rawOf } from "../support.js";
import { THEMES } from "../../theme.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const here = dirname(fileURLToPath(import.meta.url));
const ENTRY = resolve(here, "..", "..", "agentic-screencast.js");
const CLOCK = readFileSync(resolve(here, "..", "..", "browser", "clock.js"), "utf8");
const STAGE = readFileSync(resolve(here, "..", "..", "browser", "stage.js"), "utf8");
const W = 1280, H = 720;
type RGB = [number, number, number];
type Rect = { left: number; top: number; width: number; height: number };
const far = (a: RGB, b: RGB): number => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
const hexRgb = (hex: string): RGB => { const v = Number.parseInt(hex.slice(1, 7), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };

/** Кадр W×H: серый фон и цель с красным левым и синим правым краем, середина — зелёная. */
function still(dir: string, r: Rect, name = "still.png"): string {
  const f = join(dir, name);
  execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-f", "lavfi", "-i", `color=c=0x505050:s=${W}x${H}`, "-vf",
    `drawbox=x=${r.left}:y=${r.top}:w=${r.width}:h=${r.height}:color=0x20c040:t=fill,`
    + `drawbox=x=${r.left}:y=${r.top}:w=12:h=${r.height}:color=0xff0000:t=fill,`
    + `drawbox=x=${r.left + r.width - 12}:y=${r.top}:w=12:h=${r.height}:color=0x0000ff:t=fill`, "-frames:v", "1", f]);
  return f;
}
/** Кадр с лупой: картинка — клип в 2 с, лупа с момента 0,2. */
function withLoupe(dir: string, src: string, loupe: Record<string, unknown>, rect: Rect, tag: string): (x: number, y: number) => RGB {
  const out = join(dir, `${tag}.png`);
  const graph = loupeGraph([{ loupe: parseOverlay(JSON.stringify({ loupe: [{ at: 0.2, hold: 3, ...loupe }] })).loupe![0]!, rect }], { width: W, height: H }, THEMES.midnight!);
  execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-loop", "1", "-t", "2", "-i", src, "-filter_complex", graph, "-map", "[v]",
    "-ss", "1", "-frames:v", "1", out]);
  return decode(readFileSync(out));
}
function decode(png: Buffer, w = W): (x: number, y: number) => RGB {
  const raw = rawOf(png);
  return (x, y) => { const i = (Math.round(y) * w + Math.round(x)) * 3; return [raw[i]!, raw[i + 1]!, raw[i + 2]!]; };
}
/** Есть ли цвет c в круге (cx, cy, r). */
function inCircle(px: (x: number, y: number) => RGB, cx: number, cy: number, r: number, c: RGB): boolean {
  for (let y = cy - r; y <= cy + r; y += 2) for (let x = cx - r; x <= cx + r; x += 2) {
    if (x < 0 || y < 0 || x >= W || y >= H || Math.hypot(x - cx, y - cy) > r - 4) continue;
    if (far(px(x, y), c) < 40) return true;
  }
  return false;
}

test("a loupe over a subject wider than the lens shows both of its edges inside the circle", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-geo-wide-"));
  // Цель 250 точек: при ×2 ей нужна линза в 560, а предел — 0,6 высоты кадра (432): линза
  // вырастает до предела, увеличение падает до вмещающего.
  const r = { left: 515, top: 310, width: 250, height: 100 };
  const px = withLoupe(dir, still(dir, r), { target: "#x", scale: 2, size: 0.22 }, r, "wide");
  const g = loupeLayout({ at: 0.2, target: "#x", scale: 2, size: 0.22 }, r, { width: W, height: H });
  const cx = g.X + g.D / 2, cy = g.Y + g.D / 2;
  assert.ok(inCircle(px, cx, cy, g.D / 2, [255, 0, 0]), "the subject's red left edge is inside the lens");
  assert.ok(inCircle(px, cx, cy, g.D / 2, [0, 0, 255]), "the subject's blue right edge is inside the lens");
  assert.equal(g.D, 432, "the lens grew to its largest size");
  assert.ok(g.k > 1.5 && g.k < 2, `then the magnification dropped to what holds the subject (×${g.k.toFixed(2)})`);
});

test("a loupe over a subject at the frame's edge stays whole inside the frame", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-geo-edge-"));
  const r = { left: 0, top: 640, width: 60, height: 60 };
  for (const place of ["over", "beside", "top-left", "bottom-right"]) {
    const g = loupeLayout({ at: 0.2, target: "#x", place: place as never }, r, { width: W, height: H });
    assert.ok(g.X >= 0 && g.Y >= 0 && g.X + g.D <= W && g.Y + g.D <= H, `${place}: the lens ${g.X},${g.Y} ⌀${g.D} is inside the frame`);
  }
  // На кадре: кольцо у правого края линзы в кадре, линза не срезана краем.
  const g = loupeLayout({ at: 0.2, target: "#x" }, r, { width: W, height: H });
  const px = withLoupe(dir, still(dir, r), { target: "#x" }, r, "edge");
  const ring = hexRgb(THEMES.midnight!["--sc-loupe-ring"]!);
  assert.ok(far(px(g.X + 2, g.Y + g.D / 2), ring) < 60 || far(px(g.X + 3, g.Y + g.D / 2), ring) < 60, "the lens' left ring is drawn inside the frame");
});

test("a loupe placed beside its subject leaves the subject's pixels as they were", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-geo-beside-"));
  const r = { left: 300, top: 300, width: 160, height: 90 };
  const src = still(dir, r);
  // Тот же путь через граф лупы, но кадр раньше её момента: разница — только сама линза.
  const plain = withLoupe(dir, src, { target: "#x", place: "beside", at: 1.5 }, r, "plain");
  const px = withLoupe(dir, src, { target: "#x", place: "beside" }, r, "beside");
  let worst = 0;
  for (let y = r.top; y < r.top + r.height; y += 3) for (let x = r.left; x < r.left + r.width; x += 3) worst = Math.max(worst, far(px(x, y), plain(x, y)));
  assert.ok(worst <= 12, `the subject is not covered by the lens (largest difference ${worst})`);
  const g = loupeLayout({ at: 0.2, target: "#x", place: "beside" }, r, { width: W, height: H });
  assert.ok(inCircle(px, g.X + g.D / 2, g.Y + g.D / 2, g.D / 2, [255, 0, 0]) && inCircle(px, g.X + g.D / 2, g.Y + g.D / 2, g.D / 2, [0, 0, 255]),
    "the lens beside shows the whole subject magnified");
});

/** Страница с целью и слой композиции в момент t. */
async function stageAt(target: Rect, cue: Record<string, unknown>, t: number): Promise<{ png: Buffer; rect: Rect; spot: Rect & { radius: string } }> {
  const dir = mkdtempSync(join(tmpdir(), "sc-geo-stage-"));
  const file = join(dir, "page.html");
  writeFileSync(file, `<!doctype html><html><body style="margin:0;width:${W}px;height:${H}px;background:#404040">
<div id="t" style="position:absolute;left:${target.left}px;top:${target.top}px;width:${target.width}px;height:${target.height}px;background:#ffffff"></div></body></html>`);
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    await ctx.addInitScript({ content: CLOCK });
    await ctx.addInitScript({ content: STAGE });
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(file).href);
    await p.evaluate((s) => window.__stage.mount(s as never), { duration: 6, beats: 0, theme: THEMES.midnight, effects: {},
      overlay: parseOverlay(JSON.stringify({ camera: [{ at: 0.5, hold: 3, target: "#t", ...cue }] })) });
    await p.evaluate((tt) => window.__clock.seek(tt), t);
    const rect = await p.evaluate(() => { const r = document.querySelector("#t")!.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; });
    const spot = await p.evaluate(() => { const e = document.querySelector("#__spot") as HTMLElement; const r = e.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height, radius: e.style.borderRadius }; });
    return { png: await p.screenshot(), rect, spot };
  } finally { await browser.close(); }
}

test("a round spotlight is drawn around its subject: the subject's corners are in the light", async () => {
  const { png, rect } = await stageAt({ left: 540, top: 260, width: 200, height: 200 }, { shape: "circle", scale: 1.2 }, 2.5);
  const px = decode(png);
  // Угол цели под затенением темнее белого; в светлом круге он белый.
  for (const [x, y] of [[rect.left + 3, rect.top + 3], [rect.left + rect.width - 4, rect.top + 3],
    [rect.left + 3, rect.top + rect.height - 4], [rect.left + rect.width - 4, rect.top + rect.height - 4]] as const) {
    const c = px(x, y);
    assert.ok(c[0] > 235 && c[1] > 235 && c[2] > 235, `the corner ${Math.round(x)},${Math.round(y)} is in the light (${c})`);
  }
});

test("a push-in on a subject wider than 60% of the frame keeps its four corners in the frame on the hold", async () => {
  const { rect } = await stageAt({ left: 180, top: 200, width: 900, height: 300 }, {}, 2.5);
  assert.ok(rect.width > 900, `the camera still pushes in (${rect.width.toFixed(0)} wide)`);
  assert.ok(rect.left >= 0 && rect.top >= 0 && rect.left + rect.width <= W && rect.top + rect.height <= H,
    `the subject ${JSON.stringify(rect)} is inside the frame`);
});

test("lint names a push-in whose named scale crops its area, and a loupe that has to lower its magnification", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-geo-lint-"));
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "color=c=gray:s=320x180:r=10:d=4", "-c:v", "libx264", "-pix_fmt", "yuv420p", join(dir, "clip.mp4")]);
  const file = join(dir, "story.md");
  const scene = (overlay: string): void => writeFileSync(file, `# G\nvoice: {"engine":"stub","name":"silent","cps":15}\nlang: en\n\n## v · video\nfile: clip.mp4\nduration: 4\noverlay: ${overlay}\n`);
  const rules = (): string[] => lint(file).filter((f) => f.id === "push-crop" || f.id === "loupe-scale").map((f) => `${f.id}: ${f.message}`);
  scene('{"camera":[{"at":0.5,"hold":1,"area":[0.1,0.1,0.7,0.5],"scale":1.8}],"loupe":[{"at":2.5,"area":[0.1,0.1,0.6,0.6],"scale":3,"hold":1}]}');
  const found = rules().join("\n");
  assert.match(found, /push-crop: the push-in at 0\.5s scales ×1\.8, but its area stays whole in the frame only up to ×1\.29/);
  assert.match(found, /loupe-scale: the loupe at 2\.5s magnifies ×1\.\d+ instead of ×3/);
  scene('{"camera":[{"at":0.5,"hold":1,"area":[0.1,0.1,0.3,0.3],"scale":1.8}],"loupe":[{"at":2.5,"area":[0.4,0.4,0.1,0.1],"scale":3,"hold":1}]}');
  assert.deepEqual(rules(), []);
});

/** Сборка сценария в каталоге; отчёт сборки. */
function build(dir: string, story: string, args: string[] = []): { report: { scenes: Array<Record<string, unknown>> }; out: string } {
  writeFileSync(join(dir, "story.md"), story);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "out.mp4", ...args], { cwd: dir, encoding: "utf8",
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-600));
  return { report: JSON.parse(r.stdout) as { scenes: Array<Record<string, unknown>> }, out: join(dir, "out.mp4") };
}
// Кольцо лупы ищется цветом ночной темы, поэтому она названа явно: умолчание — neutral.
const HEAD = (w: number, h: number): string => `# G\nlang: en\ntheme: midnight\nvoice: {"engine":"stub","name":"silent","cps":15}\nframe: {"width":${w},"height":${h},"fps":10,"scale":1}\n`;

test("the build report names a loupe whose subject does not fit a lens of the largest size and a named push-in that crops a CSS target", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-geo-report-"));
  writeFileSync(join(dir, "page.html"), `<!doctype html><html><body style="margin:0;background:#303a48">
<div id="big" style="position:absolute;left:120px;top:80px;width:520px;height:220px;background:#20c040"></div></body></html>`);
  const { report } = build(dir, `${HEAD(640, 360)}
## p · page
page: page.html
duration: 4
overlay: {"camera":[{"at":2.2,"move":0.4,"hold":0.8,"target":"#big","scale":1.8}],"loupe":[{"at":0.4,"target":"#big","scale":2,"hold":1.2}]}
`);
  const p = report.scenes.find((s) => s.id === "p")!;
  const loupes = p.loupes as Array<{ asked: number; scale: number }>, pushes = p.pushes as Array<{ scale: number; fits: number }>;
  assert.ok(loupes?.length === 1 && loupes[0]!.asked === 2 && loupes[0]!.scale < 2, `the report names the lowered loupe (${JSON.stringify(p.loupes)})`);
  assert.ok(pushes?.length === 1 && pushes[0]!.scale === 1.8 && pushes[0]!.fits < 1.8, `the report names the cropping push-in (${JSON.stringify(p.pushes)})`);
  // Сцена из кэша отчитывается так же.
  const again = build(dir, readFileSync(join(dir, "story.md"), "utf8")).report.scenes.find((s) => s.id === "p")!;
  assert.equal(again.cached, true);
  assert.deepEqual(again.loupes, p.loupes);
});

test("a vertical build of a landscape scenario draws the loupe over its subject in the reframed window", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-geo-vertical-"));
  writeFileSync(join(dir, "page.html"), `<!doctype html><html><body style="margin:0;background:#303a48">
<div id="sub" style="position:absolute;left:520px;top:200px;width:60px;height:30px;background:#20c040"></div></body></html>`);
  const { report, out } = build(dir, `${HEAD(1920, 1080)}
## p · page
page: page.html
duration: 4
spotlight: {"target":"#sub","at":0.2,"scale":1.2}
overlay: {"loupe":[{"at":1.3,"target":"#sub","scale":2,"size":0.3,"hold":0.9}]}
`, ["--format", "vertical"]);
  const p = report.scenes.find((s) => s.id === "p")!;
  assert.equal(p.reframe, true);
  assert.equal(p.loupe, undefined, "the report no longer says the loupe is not drawn");
  const VW = 1080, VH = 1920;
  const px = decode(execFileSync(ffmpeg, ["-loglevel", "error", "-ss", "2", "-i", out, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"]), VW);
  // Кольцо лупы темы midnight есть в кадре; внутри его круга зелёный предмет стоит посередине.
  const ring = hexRgb(THEMES.midnight!["--sc-loupe-ring"]!);
  let x0 = VW, x1 = -1, y0 = VH, y1 = -1;
  // Кольцо сглажено и смешано с фоном: чистым цветом токена его точки почти не бывают, и при допуске
  // 30 находились считанные точки, а середина линзы по ним выходила случайной.
  for (let y = 0; y < VH; y += 2) for (let x = 0; x < VW; x += 2) if (far(px(x, y), ring) < 45) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  assert.ok(x1 > x0 + 100, "the loupe's ring is in the vertical frame");
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, r = (x1 - x0) / 2;
  let green = 0, gx = 0, gy = 0;
  for (let y = cy - r; y < cy + r; y += 3) for (let x = cx - r; x < cx + r; x += 3) {
    if (Math.hypot(x - cx, y - cy) > r - 8) continue;
    const c = px(x, y);
    if (c[1] > 150 && c[0] < 90 && c[2] < 110) { green++; gx += x; gy += y; }
  }
  assert.ok(green > 200, `the magnified subject is inside the lens (${green} green samples)`);
  assert.ok(Math.hypot(gx / green - cx, gy / green - cy) < r / 4, `the subject sits in the middle of the lens (${(gx / green).toFixed(0)},${(gy / green).toFixed(0)} vs ${cx},${cy})`);
});

test("a loupe stays above the subtitle band, so the line of speech stays readable", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-geo-subs-"));
  writeFileSync(join(dir, "page.html"), `<!doctype html><html><body style="margin:0;background:#303a48">
<div id="low" style="position:absolute;left:560px;top:560px;width:120px;height:60px;background:#20c040"></div></body></html>`);
  const story = (overlay: string): string => `${HEAD(1280, 720)}captions: {"style":"karaoke","everywhere":true}

## p · page
page: page.html
duration: 5
${overlay}

Every word of this line lights up while it is spoken.
`;
  const plain = build(dir, story('overlay: {"camera":[{"at":2.6,"move":0.4,"hold":0.8,"target":"#low","scale":1.1}]}')).out;
  const plainCopy = join(dir, "plain.mp4");
  execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-i", plain, "-c", "copy", plainCopy]);
  const lens = build(dir, story('overlay: {"camera":[{"at":2.6,"move":0.4,"hold":0.8,"target":"#low","scale":1.1}],"loupe":[{"at":0.5,"target":"#low","scale":2,"hold":2.5}]}')).out;
  const at = (f: string): ((x: number, y: number) => RGB) => decode(execFileSync(ffmpeg, ["-loglevel", "error", "-ss", "2", "-i", f, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"]));
  const a = at(plainCopy), b = at(lens);
  // Полоса субтитров — нижние 16 % кадра: строки там одинаковы с лупой и без неё.
  let diff = 0, n = 0;
  for (let y = Math.round(H * 0.84); y < H; y += 2) for (let x = 0; x < W; x += 2) { diff += far(a(x, y), b(x, y)); n++; }
  assert.ok(diff / n < 1.5, `the subtitle band is untouched by the lens (mean difference ${(diff / n).toFixed(2)})`);
  // И лупа при этом нарисована: над полосой кадр изменился.
  let above = 0;
  for (let y = 0; y < H * 0.84; y += 4) for (let x = 0; x < W; x += 4) if (far(a(x, y), b(x, y)) > 40) above++;
  assert.ok(above > 200, `the lens is drawn above the band (${above} changed samples)`);
});

test("a named push-in on a slide element (el2) builds and is measured, and a chained spotlight's second target is measured unzoomed", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-geo-el-"));
  writeFileSync(join(dir, "page.html"), `<!doctype html><html><body style="margin:0;background:#303a48">
<div id="a" style="position:absolute;left:60px;top:60px;width:120px;height:60px;background:#20c040"></div>
<div id="b" style="position:absolute;left:420px;top:220px;width:90px;height:50px;background:#c04020"></div></body></html>`);
  const { report } = build(dir, `${HEAD(640, 360)}
## s · slides.steps
title: Steps
items: One :: first | Two :: second | Three :: third
spotlight: {"target":"el2","at":"b1","scale":1.1}

The second element of the slide is pushed in on by name.

## p · page
page: page.html
spotlight: [{"target":"#a","at":"b1","scale":1.6},{"target":"#b","at":"b2","scale":1.6}]

The first target is near the corner.

The second target is small and fits at this scale.
`);
  const s = report.scenes.find((x) => x.id === "s")!, p = report.scenes.find((x) => x.id === "p")!;
  assert.equal(s.pushes, undefined, `el2 at ×1.1 fits and is measured (${JSON.stringify(s.pushes)})`);
  assert.equal(p.pushes, undefined, `the second target at ×1.6 fits once measured without the first push-in's zoom (${JSON.stringify(p.pushes)})`);
});
