// Экран в перспективе на WebGL: углы экрана — неправоугольный четырёхугольник, который
// меняется при облёте; блик едет по экрану; под экраном — тусклое отражение его низа;
// кадр повторяется побайтно; пометку WebGL страница ставит только после настоящей
// отрисовки, без WebGL — нет. Текстура нарочно простая: серое поле, синяя полоса сверху,
// красная снизу, — чтобы блик и отражение были видны прямо по цвету.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { chromium, type Page } from "playwright";
import { rawOf } from "../support.js";
import { generateFrom } from "../../generate.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const here = dirname(fileURLToPath(import.meta.url));
const CLOCK = readFileSync(resolve(here, "..", "..", "browser", "clock.js"), "utf8");
const STAGE = readFileSync(resolve(here, "..", "..", "browser", "stage.js"), "utf8");
const ENTRY = resolve(here, "..", "..", "agentic-screencast.js");
const W = 1920, H = 1080;

function scenario(): string {
  const dir = mkdtempSync(join(tmpdir(), "sc-pv-"));
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "color=c=0x606060:s=1600x1000", "-vf",
    "drawbox=x=0:y=0:w=1600:h=120:color=0x2040e0:t=fill,drawbox=x=0:y=880:w=1600:h=120:color=0xe02020:t=fill",
    "-frames:v", "1", join(dir, "shot.png")]);
  writeFileSync(join(dir, "story.md"), `# PV
lang: en
voice: {"engine":"stub","name":"silent","cps":15}

## pv · slides.perspective
title: A screen in perspective
image: shot.png
duration: 8
`);
  return join(dir, "story.md");
}

async function withSlide(file: string, run: (p: Page) => Promise<void>, noGl = false): Promise<void> {
  const g = generateFrom(file);
  const scene = (JSON.parse(readFileSync(g.pitchFile, "utf8")) as { scenes: Array<{ id: string; effects?: unknown }> }).scenes[0]!;
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    // Подмена пути рендера: контекста WebGL нет, как на машине без него.
    if (noGl) await ctx.addInitScript({ content: "const g=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(k,o){return /webgl/.test(k)?null:g.call(this,k,o)};" });
    await ctx.addInitScript({ content: CLOCK });
    await ctx.addInitScript({ content: STAGE });
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(g.pages.pv!).href);
    await p.evaluate((fx) => window.__stage.mount({ duration: 8, beats: 0, effects: fx } as never), scene.effects);
    await run(p);
  } finally { await browser.close(); }
}
const seek = (p: Page, t: number): Promise<void> => p.evaluate((tt) => window.__clock.seek(tt), t);
type Pt = [number, number];
/** Углы экрана в точках страницы: верх-лево, верх-право, низ-право, низ-лево. */
const corners = (p: Page): Promise<Pt[]> => p.evaluate(() => {
  const cv = document.querySelector(".pv-cv") as HTMLCanvasElement, r = cv.getBoundingClientRect();
  const k = r.width / cv.clientWidth;
  return (JSON.parse(cv.dataset.corners!) as Pt[]).map(([x, y]) => [r.left + x * k, r.top + y * k] as Pt);
});
async function rgb(p: Page): Promise<Buffer> {
  return rawOf(await p.screenshot());
}
const px = (f: Buffer, [x, y]: Pt): [number, number, number] => { const i = (Math.round(y) * W + Math.round(x)) * 3; return [f[i]!, f[i + 1]!, f[i + 2]!]; };
const lerp = (a: Pt, b: Pt, u: number): Pt => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];

test("the screen stands in perspective, the camera orbits it, a glint crosses it and a reflection lies below", async () => {
  await withSlide(scenario(), async (p) => {
    await seek(p, 1.5);
    assert.equal(await p.evaluate(() => document.body.dataset.screenRenderer), "webgl", "the page marks a real WebGL draw");
    const a = await corners(p);
    const len = (u: Pt, v: Pt): number => Math.hypot(u[0] - v[0], u[1] - v[1]);
    const top = len(a[0]!, a[1]!), bottom = len(a[3]!, a[2]!), left = len(a[0]!, a[3]!), right = len(a[1]!, a[2]!);
    assert.ok(Math.abs(left - right) / Math.max(left, right) > 0.03 || Math.abs(top - bottom) / Math.max(top, bottom) > 0.03,
      `the screen is not a rectangle: edges ${[top, right, bottom, left].map((x) => x.toFixed(0)).join(" ")}`);
    await seek(p, 5);
    const b = await corners(p);
    assert.ok(a.some((c, i) => len(c, b[i]!) > 5), "the camera orbit changes the screen's shape");

    // Блик: самое светлое место на средней линии экрана (серое поле), по доле ширины экрана.
    const glintAt = async (t: number): Promise<number> => {
      await seek(p, t);
      const c = await corners(p), f = await rgb(p);
      const l = lerp(c[0]!, c[3]!, 0.5), r = lerp(c[1]!, c[2]!, 0.5);
      let best = -1, at = 0;
      for (let u = 0.03; u <= 0.97; u += 0.01) { const [x, y, z] = px(f, lerp(l, r, u)); if (x + y + z > best) { best = x + y + z; at = u; } }
      return at;
    };
    const g1 = await glintAt(2), g2 = await glintAt(3);
    assert.ok(Math.abs(g2 - g1) > 0.1, `the glint moves along the screen (${g1.toFixed(2)} → ${g2.toFixed(2)})`);

    // Отражение: сразу под экраном — красный низ экрана, отражённый и тусклее; синего верха там нет.
    await seek(p, 1.5);
    const c = await corners(p), f = await rgb(p);
    const midBottom = lerp(c[3]!, c[2]!, 0.5), midTop = lerp(c[0]!, c[1]!, 0.5);
    const down: Pt = [midBottom[0] - midTop[0], midBottom[1] - midTop[1]];
    const at = (k: number): Pt => [midBottom[0] + down[0] * k, midBottom[1] + down[1] * k];
    const stripe = px(f, at(-0.04)), mirror = px(f, at(0.07));
    assert.ok(stripe[0] > stripe[2] + 80, `the screen's bottom stripe is red: ${stripe}`);
    assert.ok(mirror[0] > mirror[2] + 15 && mirror[0] < stripe[0] - 30, `below the screen the red is mirrored and dimmer: ${mirror} under ${stripe}`);

    await seek(p, 2.5); const h1 = createHash("md5").update(await p.screenshot()).digest("hex");
    await seek(p, 6); await seek(p, 2.5);
    assert.equal(createHash("md5").update(await p.screenshot()).digest("hex"), h1, "the same moment renders the same bytes");
  });
});

test("without WebGL the page shows the flat screenshot and does not claim WebGL", async () => {
  await withSlide(scenario(), async (p) => {
    await seek(p, 1.5);
    assert.equal(await p.evaluate(() => document.body.dataset.screenRenderer), "fallback");
    assert.equal(await p.evaluate(() => getComputedStyle(document.querySelector(".pv-src")!).visibility), "visible");
  }, true);
});

test("the build report names the WebGL renderer of the perspective scene", () => {
  const file = scenario(), dir = dirname(file);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8",
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-400));
  const report = JSON.parse(r.stdout) as { scenes: Array<{ id: string; renderer?: string }> };
  assert.equal(report.scenes.find((s) => s.id === "pv")!.renderer, "webgl");
});
