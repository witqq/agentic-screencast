// Горизонтальный сценарий, собранный вертикальным (`build --format vertical`): страницы и
// клипы кадрируются окном у цели фокуса в полном разрешении, а не вписываются с полями,
// не перекладываются вёрсткой и не растягиваются из готового кадра.
//
// Свидетельства различают эти состояния. Кадр сборки сравнивается с окном у цели,
// вырезанным из горизонтального кадра того же момента, и сходство с ним должно быть выше,
// чем с центральным окном, с кадром, вписанным с полями, и с перекладкой вёрсткой. Резкость
// в области цели отличает честный рендер от окна, вырезанного из готового кадра 1920×1080
// и увеличенного. Слой подписей проверяется отдельно: всё, что он рисует, лежит внутри
// безопасной зоны вертикального кадра.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { renderScene, type RenderScene } from "../../render.js";
import { windowCentre } from "../../camera.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const ffprobe = require("@ffprobe-installer/ffprobe").path as string;
const DIST = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENTRY = join(DIST, "agentic-screencast.js");
const W = 1080, H = 1920;
/** Рабочая зона вертикали (docs/vertical-video.md). */
const ZONE = { l: 65, t: 170, r: W - 180, b: H - 484 };

const PAGE = `<!doctype html><html><body style="margin:0;width:100vw;height:100vh;background:#0e1626;font:22px system-ui;color:#dfe8ff;position:relative;overflow:hidden">
<h1 style="position:absolute;left:60px;top:40px;margin:0;font-size:44px">Operations board</h1>
<div style="position:absolute;left:60px;top:160px;width:640px;height:380px;background:#1b2a48;border-radius:18px;padding:30px;box-sizing:border-box">
${"Left panel line with small readable words. ".repeat(12)}</div>
<div id="kpi" style="position:absolute;left:1500px;top:380px;width:360px;height:260px;background:#2f6bff;border-radius:18px;padding:24px;box-sizing:border-box">
<b style="font-size:60px">12,480</b><br>orders today<br><small>${"fine print ".repeat(8)}</small></div></body></html>`;

function run(dir: string, args: string[], env: Record<string, string> = {}): { status: number | null; stdout: string; stderr: string } {
  return spawnSync("node", [ENTRY, ...args], { cwd: dir, encoding: "utf8",
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home"), ...env } });
}
/** Кадр ролика в момент t как PNG. */
function still(file: string, t: number, out: string): string {
  execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-ss", String(t), "-i", file, "-frames:v", "1", out]);
  return out;
}
/** SSIM двух картинок одного размера. */
function ssim(a: string, b: string): number {
  const r = spawnSync(ffmpeg, ["-hide_banner", "-i", a, "-i", b, "-lavfi", "[0:v][1:v]ssim", "-f", "null", "-"], { encoding: "utf8" });
  return Number(/All:([0-9.]+)/u.exec(r.stderr)![1]);
}
/** Вырезать окно и привести к размеру вертикального кадра. */
function crop(src: string, x: number, w: number, h: number, out: string): string {
  execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-i", src, "-vf", `crop=${w}:${h}:${Math.round(x)}:0,scale=${W}:${H}:flags=bicubic`, out]);
  return out;
}
/** Серые пиксели прямоугольника картинки. */
function gray(file: string, box: { x: number; y: number; w: number; h: number }): Uint8Array {
  return execFileSync(ffmpeg, ["-loglevel", "error", "-i", file, "-vf", `crop=${box.w}:${box.h}:${box.x}:${box.y},format=gray`,
    "-f", "rawvideo", "-"], { maxBuffer: 64 * 1024 * 1024 });
}
/** Дисперсия лапласиана — мера резкости: у растянутой картинки она падает. */
function sharpness(file: string, box: { x: number; y: number; w: number; h: number }): number {
  const g = gray(file, box);
  const vals: number[] = [];
  for (let y = 1; y < box.h - 1; y++) for (let x = 1; x < box.w - 1; x++) {
    const i = y * box.w + x;
    vals.push(4 * g[i]! - g[i - 1]! - g[i + 1]! - g[i - box.w]! - g[i + box.w]!);
  }
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
}
/** Лучшее окно по сходству с кадром: левый край и SSIM. */
function bestWindow(ref: string, frame: string, width: number, height: number, w: number, dir: string): { x: number; s: number } {
  let best = { x: 0, s: -1 };
  const step = Math.max(8, Math.round(w / 24));
  const tryAt = (x: number): void => {
    const s = ssim(crop(ref, x, w, height, join(dir, "win.png")), frame);
    if (s > best.s) best = { x, s };
  };
  for (let x = 0; x <= width - w; x += step) tryAt(x);
  tryAt(width - w);
  // Уточнение вокруг лучшего шага: тонкая сетка клипа сравнивается точно, а не через полшага.
  const around = best.x;
  for (let x = Math.max(0, around - step); x <= Math.min(width - w, around + step); x += 2) tryAt(x);
  return best;
}

test("a landscape page and clip build as a vertical film cut sharply around the focus, not fitted, reflowed or stretched", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-reframe-"));
  writeFileSync(join(dir, "page.html"), PAGE);
  // Клип с деталью и областями фокуса у краёв. Сетки в пиксель поверх ровных полос нет: на ней
  // одно лишь кодирование сегмента (crf 18) даёт SSIM 0,87 — это мера сжатия, а не кадрирования.
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=s=1920x1080:r=25:d=6",
    "-c:v", "libx264", "-crf", "12", join(dir, "clip.mp4")]);
  const camera = '"camera":[{"at":0.8,"move":0.8,"hold":3.4,"target":"#kpi","scale":1.5}]';
  writeFileSync(join(dir, "story.md"), `# Reframe
lang: en
voice: {"engine":"stub","name":"silent","cps":15}
look: trailer

## hero · slides.hero
title: A board in one frame
duration: 3

## p · page
page: page.html
duration: 6
overlay: {${camera}}

## v · video
file: clip.mp4
duration: 5
overlay: {"camera":[{"at":0.5,"move":0.8,"hold":3,"area":[0.02,0.3,0.2,0.4]}]}

## f · video
file: clip.mp4
freezeAt: 2
duration: 5
overlay: {"camera":[{"at":0.5,"move":0.8,"hold":3,"area":[0.78,0.3,0.2,0.4]}]}
`);
  const r = run(dir, ["build", "story.md", "--format", "vertical", "--out", "v.mp4"]);
  assert.equal(r.status, 0, r.stderr.slice(-600));
  const report = JSON.parse(r.stdout) as { scenes: Array<{ id: string; reframe?: boolean }>; reframe?: unknown; look?: string };
  assert.deepEqual(report.reframe, { from: { width: 1920, height: 1080 } });
  assert.match(String(report.look), /letterbox bars are not drawn/u, "the report names the bars it left out");
  for (const id of ["p", "v", "f"]) assert.ok(report.scenes.find((s) => s.id === id)?.reframe, `${id} is reframed`);
  const size = execFileSync(ffprobe, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x",
    join(dir, "v.mp4")], { encoding: "utf8" }).trim();
  assert.equal(size, `${W}x${H}`);

  // Моменты удержания фокуса в готовом ролике: сцены идут подряд, у первой 3 с.
  const segs = (JSON.parse(r.stdout) as { segments: Array<{ seg: string }> }).segments.map((s) => s.seg);
  const pitch = JSON.parse(readFileSync(join(dir, ".generated-pitch-vertical.json"), "utf8")) as { scenes: RenderScene[] };
  const cw = Math.round((W / H) * 1080);

  // Страница: эталон — горизонтальный кадр в полном разрешении окна (плотность 16/9).
  const pScene = pitch.scenes.find((s) => s.id === "p")!;
  const tPage = 3;
  const frameP = still(segs[1]!, tPage, join(dir, "p.png"));
  const refHi = await renderScene({ ...pScene, __src: dir, beats: 0, starts: [], __layerPart: "scene" } as RenderScene,
    { width: 1920, height: 1080, scale: H / 1080, at: tPage });
  writeFileSync(join(dir, "ref-hi.png"), refHi.shots[0]!.buf);
  const hiW = Math.round(1920 * H / 1080);
  const best = bestWindow(join(dir, "ref-hi.png"), frameP, hiW, H, W, dir);
  assert.ok(best.s >= 0.9, `the page frame is a window of the full-resolution page (SSIM ${best.s})`);
  const centre = ssim(crop(join(dir, "ref-hi.png"), (hiW - W) / 2, W, H, join(dir, "c.png")), frameP);
  assert.ok(best.s - centre > 0.05, `the window sits at the focus, not the centre (${best.s} vs ${centre})`);
  // Вписанный с полями кадр и перекладка вёрсткой — другие картинки.
  execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-i", join(dir, "ref-hi.png"), "-vf",
    `scale=${W}:-2,pad=${W}:${H}:0:(oh-ih)/2:color=black`, join(dir, "fit.png")]);
  const fitted = ssim(join(dir, "fit.png"), frameP);
  assert.ok(best.s - fitted > 0.05, `not a fitted frame with bars (${best.s} vs ${fitted})`);
  const reflow = await renderScene({ ...pScene, __src: dir, beats: 0, starts: [], __layerPart: "scene" } as RenderScene,
    { width: W, height: H, scale: 1, at: tPage });
  writeFileSync(join(dir, "reflow.png"), reflow.shots[0]!.buf);
  const reflowed = ssim(join(dir, "reflow.png"), frameP);
  assert.ok(best.s - reflowed > 0.05, `not a portrait reflow of the page (${best.s} vs ${reflowed})`);
  // Резкость в области цели: окно из готового кадра 1920×1080, растянутое, заметно мягче.
  const refLo = await renderScene({ ...pScene, __src: dir, beats: 0, starts: [], __layerPart: "scene" } as RenderScene,
    { width: 1920, height: 1080, scale: 1, at: tPage });
  writeFileSync(join(dir, "ref-lo.png"), refLo.shots[0]!.buf);
  const stretched = crop(join(dir, "ref-lo.png"), best.x * 1080 / H, cw, 1080, join(dir, "stretch.png"));
  const honest = crop(join(dir, "ref-hi.png"), best.x, W, H, join(dir, "honest.png"));
  const area = { x: 200, y: 700, w: 680, h: 520 };
  const sHonest = sharpness(honest, area), sStretch = sharpness(stretched, area), sFrame = sharpness(frameP, area);
  assert.ok(sHonest > sStretch * 1.3, `the fixture tells sharp from stretched (${sHonest} vs ${sStretch})`);
  assert.ok(sFrame >= (sHonest + sStretch) / 2, `the page window is rendered sharp, not stretched (${sFrame}; threshold ${(sHonest + sStretch) / 2})`);

  // Видео и остановленный кадр: эталон — кадр клипа, увеличенный до высоты 1920 (выше у видео ничего нет).
  // Сравнивается сборка без слоя поверх клипа: затенение фокуса иначе отличало бы кадр от эталона.
  const bare = run(dir, ["build", "story.md", "--format", "vertical", "--out", "bare.mp4"], { AGENTIC_SCREENCAST_BARE: "1" });
  assert.equal(bare.status, 0, bare.stderr.slice(-400));
  const bareSegs = (JSON.parse(bare.stdout) as { segments: Array<{ seg: string }> }).segments.map((s) => s.seg);
  const clipHi = join(dir, "clip-hi.png");
  for (const [id, seg, t, src, edge] of [["v", bareSegs[2]!, 2.5, 2.5, "left"], ["f", bareSegs[3]!, 2.5, 2, "right"]] as const) {
    execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-ss", String(src), "-i", join(dir, "clip.mp4"), "-frames:v", "1",
      "-vf", `scale=-2:${H}:flags=lanczos`, clipHi]);
    const frame = still(seg, t, join(dir, `${id}.png`));
    const b = bestWindow(clipHi, frame, hiW, H, W, dir);
    const c = ssim(crop(clipHi, (hiW - W) / 2, W, H, join(dir, "c.png")), frame);
    assert.ok(b.s >= 0.9, `${id}: a window of the clip (SSIM ${b.s})`);
    assert.ok(b.s - c > 0.05, `${id}: the window follows the focus at the ${edge} edge (${b.s} vs centre ${c})`);
    assert.ok(edge === "left" ? b.x < hiW * 0.25 : b.x > hiW * 0.5, `${id}: window at x=${b.x}`);
  }

  // Слайды горизонтального сценария идут портретной сеткой.
  assert.match(readFileSync(join(dir, "slides-vertical", "hero.html"), "utf8"), /720/u, "the slide is laid out on the portrait grid");
});

test("the video window glides between focus areas without a jump", () => {
  const cues = [{ at: 0.5, move: 0.8, hold: 1, area: [0.02, 0.3, 0.2, 0.4] as [number, number, number, number] },
    { at: 3, move: 0.9, hold: 1, area: [0.7, 0.3, 0.2, 0.4] as [number, number, number, number] }];
  let prev = windowCentre(cues, 0), maxStep = 0;
  for (let f = 1; f <= 6 * 25; f++) {
    const x = windowCentre(cues, f / 25);
    maxStep = Math.max(maxStep, Math.abs(x - prev));
    prev = x;
  }
  assert.ok(Math.abs(windowCentre(cues, 0) - 0.12) < 1e-9 && Math.abs(windowCentre(cues, 5) - 0.8) < 1e-9, "from the first area to the last");
  // Путь 0,68 ширины за 0,9 с по smootherstep: наибольший шаг — 0,68 × 1,875 / 22,5 кадра ≈ 0,057.
  assert.ok(maxStep < 0.07, `no frame-to-frame jump (largest step ${maxStep.toFixed(3)} of the width)`);
});

test("captions, titles and cards of a reframed film stay inside the vertical safe zone, and the trailer skeleton builds", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-reframe-layer-"));
  writeFileSync(join(dir, "page.html"), PAGE);
  const scene = (extra: string): string => `# Layer
lang: en
voice: {"engine":"stub","name":"silent","cps":15}
${extra}
## p · page
page: page.html
spotlight: {"target":"#kpi","at":"b1","card":{"title":"Orders are up"}}
overlay: {"titles":[{"at":0.3,"text":"The board","style":"slam","hold":2.6}]}

The number on the right edge is what this scene is about, and the words stay readable.
`;
  const frames: string[] = [];
  for (const [name, head] of [["with", 'captions: {"style":"karaoke","everywhere":true}\n'], ["without", ""]] as const) {
    writeFileSync(join(dir, `${name}.md`), scene(head));
    const r = run(dir, ["build", `${name}.md`, "--format", "vertical", "--out", `${name}.mp4`]);
    assert.equal(r.status, 0, r.stderr.slice(-400));
    frames.push(join(dir, `${name}.mp4`));
  }
  // Разница кадров с субтитрами и без — это слой подписей. Вне рабочей зоны её нет.
  for (const t of [1.2, 3.5]) {
    const a = gray(still(frames[0]!, t, join(dir, "a.png")), { x: 0, y: 0, w: W, h: H });
    const b = gray(still(frames[1]!, t, join(dir, "b.png")), { x: 0, y: 0, w: W, h: H });
    let inside = 0, outside = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (Math.abs(a[y * W + x]! - b[y * W + x]!) < 40) continue;
      if (x >= ZONE.l && x < ZONE.r && y >= ZONE.t && y < ZONE.b) inside++; else outside++;
    }
    assert.ok(inside > 500, `the subtitle is drawn at ${t}s (${inside} px)`);
    assert.ok(outside < 50, `nothing of the subtitle leaves the safe zone at ${t}s (${outside} px outside)`);
  }
  // Заготовка трейлера с `look: trailer` собирается вертикальной: каше не рисуется.
  const tpl = resolve(DIST, "..", "templates");
  copyFileSync(join(tpl, "trailer.md"), join(dir, "trailer.md"));
  execFileSync("cp", ["-R", join(tpl, "pages"), join(dir, "pages")]);
  const r = run(dir, ["build", "trailer.md", "--format", "vertical", "--out", "trailer.mp4"]);
  assert.equal(r.status, 0, r.stderr.slice(-400));
  assert.match((JSON.parse(r.stdout) as { look?: string }).look ?? "", /letterbox bars are not drawn/u);
  // Полоса каше в высоком кадре заняла бы 734 верхних строки ровной чернотой: одно-два значения яркости.
  const top = gray(still(join(dir, "trailer.mp4"), 1.5, join(dir, "t.png")), { x: 0, y: 0, w: W, h: 700 });
  assert.ok(new Set(top).size > 8, `no letterbox bar across the top of the vertical trailer (${new Set(top).size} shades)`);
});
