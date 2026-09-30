// Тема доходит до кадра: каждый элемент, который рисует инструмент, в каждой из восьми тем
// рисуется цветом СВОЕЙ темы. Ожидаемый цвет берётся из токена, а не из самого элемента:
// на место элемента (сам он скрыт) кладётся образец с `background: var(--token)` той же
// величины, и точка образца сравнивается с точкой элемента — прозрачный токен ложится на ту
// же подложку, что и элемент. У текста сравнивается закрашенная часть буквы:
// сглаженные кромки в Linux могут отличаться от цвета токена по каналам.
// Элемент, забывший тему, рисуется цветом ночной темы в светлой и проваливает сравнение.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { chromium, type Browser, type Page } from "playwright";
import { THEMES, themeVariants, type ThemeVars } from "../../theme.js";

/** Каждая тема в каждой своей схеме: слой рисуется по набору, а не по имени. */
const VARIANTS = themeVariants().map((v) => ({ label: `${v.name} ${v.scheme}`, theme: v.name, scheme: v.scheme, vars: v.vars }));
import { parseOverlay } from "../../overlay.js";
import { generateFrom } from "../../generate.js";
import { rawOf } from "../support.js";
import { renderTransition } from "../../transition.js";
import { loupeLayout } from "../../loupe.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const here = dirname(fileURLToPath(import.meta.url));
const CLOCK = readFileSync(resolve(here, "..", "..", "browser", "clock.js"), "utf8");
const STAGE = readFileSync(resolve(here, "..", "..", "browser", "stage.js"), "utf8");
const ENTRY = resolve(here, "..", "..", "agentic-screencast.js");
const W = 1280, H = 720;
type RGB = [number, number, number];

const hexRgb = (hex: string): RGB => { const v = Number.parseInt(hex.trim().slice(1, 7), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
const far = (a: RGB, b: RGB): number => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
const decode = (png: Buffer, w: number): { px: (x: number, y: number) => RGB; w: number } => {
  const raw = rawOf(png);
  return { w, px: (x, y) => { const i = (Math.round(y) * w + Math.round(x)) * 3; return [raw[i]!, raw[i + 1]!, raw[i + 2]!]; } };
};

/** Проба элемента: заливка в точке (доли прямоугольника) или цвет букв. */
interface Probe { name: string; sel: string; token: string; mode: "fill" | "text"; at?: [number, number];
  /** скрыть только буквы, сохранив заливку самого элемента */
  textOnly?: boolean;
  /** выражение страницы перед замером: убрать движущийся блик, который не есть заливка */
  prep?: string;
  /** образец, собранный из токенов темы, если заливка — не один токен (градиент двух акцентов) */
  css?: string }

/** Цвет элемента и цвет токена на том же месте. */
async function probe(p: Page, pr: Probe): Promise<{ got: RGB; want: RGB }> {
  if (pr.prep) await p.evaluate(pr.prep);
  const rect = await p.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }, pr.sel);
  assert.ok(rect && rect.w > 2 && rect.h > 2, `${pr.name}: ${pr.sel} is on the frame`);
  const shot = decode(await p.screenshot(), W);
  let got: RGB = [0, 0, 0];
  const textPixels: RGB[] = [];
  if (pr.mode === "fill") {
    const [fx, fy] = pr.at ?? [0.92, 0.9];
    got = shot.px(rect.x + rect.w * fx, rect.y + rect.h * fy);
  }
  // Скрываем элемент и сравниваем два кадра в одной точке времени. Так образец текста
  // берётся из действительно нарисованной буквы, а не из неоднородного фона.
  await p.evaluate(({ sel, textOnly }) => {
    const el = document.querySelector(sel) as HTMLElement;
    if (textOnly) {
      el.dataset.hiddenColorForSwatch = el.style.color;
      el.style.color = "transparent";
    } else {
      el.dataset.hiddenForSwatch = el.style.visibility;
      el.style.visibility = "hidden";
    }
  }, { sel: pr.sel, textOnly: pr.textOnly });
  if (pr.mode === "text") {
    const backdrop = decode(await p.screenshot(), W);
    let change = 0;
    for (let y = rect.y + 1; y < rect.y + rect.h - 1; y += 1) for (let x = rect.x + 1; x < rect.x + rect.w - 1; x += 1) {
      const c = shot.px(x, y), delta = far(c, backdrop.px(x, y));
      if (delta > change) change = delta;
      if (delta > 8) textPixels.push(c);
    }
    assert.ok(change > 8, `${pr.name}: text is visible on the frame`);
  }
  // Образец токена на месте скрытого элемента.
  await p.evaluate(({ token, rect: r }) => {
    const s = document.createElement("div");
    s.id = "__swatch";
    // Страница слайда увеличена (zoom корня): прямоугольник элемента уже в точках кадра, а
    // координаты образца увеличатся ещё раз — делим на увеличение.
    const z = Number.parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    s.style.cssText = `position:fixed;z-index:2147483647;left:${r.x / z}px;top:${r.y / z}px;width:${r.w / z}px;height:${r.h / z}px;`
      + `background:${token}`;
    // Токены слоя задаются на #__st (там живёт --u): образец кладётся туда, если слой есть.
    (document.getElementById("__st") ?? document.body).appendChild(s);
  }, { token: pr.css ?? `var(${pr.token})`, rect });
  const sw = decode(await p.screenshot(), W);
  const [fx, fy] = pr.mode === "fill" ? pr.at ?? [0.92, 0.9] : [0.5, 0.5];
  const want = sw.px(rect.x + rect.w * fx, rect.y + rect.h * fy);
  if (pr.mode === "text") {
    // На кромке буквы сглаживание LCD может оставить синий канал цвета чернил,
    // а красный и зелёный взять частично из фона. Из изменившихся пикселей
    // ищем наиболее плотный участок чернил, сравнивая его с образцом токена.
    got = textPixels.reduce((best, c) => far(c, want) < far(best, want) ? c : best);
  }
  await p.evaluate((sel) => {
    document.getElementById("__swatch")?.remove();
    const el = document.querySelector(sel) as HTMLElement;
    if (el.dataset.hiddenColorForSwatch !== undefined) el.style.color = el.dataset.hiddenColorForSwatch;
    else el.style.visibility = el.dataset.hiddenForSwatch ?? "";
  }, pr.sel);
  return { got, want };
}

async function mountStage(browser: Browser, html: string, scene: Record<string, unknown>, at: number): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  await ctx.addInitScript({ content: CLOCK });
  await ctx.addInitScript({ content: STAGE });
  const p = await ctx.newPage();
  const dir = mkdtempSync(join(tmpdir(), "sc-tr-"));
  const file = html.startsWith("/") ? html : join(dir, "page.html");
  if (!html.startsWith("/")) writeFileSync(file, html);
  await p.goto(pathToFileURL(file).href);
  await p.evaluate((s) => window.__stage.mount(s as never), scene);
  await p.evaluate((t) => window.__clock.seek(t), at);
  return p;
}

/** Цвета элементов по темам: для сверки светлой и тёмной. */
const seen = new Map<string, Map<string, RGB>>();
function check(theme: string, name: string, token: string, r: { got: RGB; want: RGB }, tol = 18): void {
  assert.ok(far(r.got, r.want) <= tol, `${theme} · ${name}: drawn ${r.got.join(",")}, the token ${token} gives ${r.want.join(",")}`);
  const m = seen.get(name) ?? new Map<string, RGB>(); m.set(theme, r.got); seen.set(name, m);
}

test("text colour probe reads a glyph instead of a changing background", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    await page.setContent(`<style>:root{--acc:#8a5c00}body{margin:0;background:linear-gradient(90deg,#d48f00,#111)}
      .label{position:absolute;left:100px;top:100px;width:360px;height:80px;font:bold 48px sans-serif;color:var(--acc)}</style>
      <div class="label">Timeline</div>`);
    const result = await probe(page, { name: "text on gradient", sel: ".label", token: "--acc", mode: "text" });
    assert.ok(far(result.got, result.want) <= 12, `the glyph ${result.got} uses the token ${result.want}`);
  } finally { await browser.close(); }
});
/** Там, где у светлой и тёмной темы токен разный, разный и цвет на кадре. */
function contrast(name: string, token: string): void {
  if (THEMES.midnight![token] === THEMES.daylight![token]) return;
  const m = seen.get(name)!;
  const [dark, light] = [m.get("midnight dark") ?? m.get("midnight"), m.get("daylight light") ?? m.get("daylight")];
  assert.ok(far(dark!, light!) > 20, `${name}: midnight and daylight draw different colours (${dark} vs ${light})`);
}

const PAGE = `<!doctype html><html><body style="margin:0;background:#7f7f7f">
<div id="ui" style="position:absolute;left:760px;top:260px;width:240px;height:110px;background:#5a6070;border-radius:10px"></div></body></html>`;

test("the overlay — cards, lower thirds, callouts, badges, titles, subtitles, marks, cursor, spotlight — wears its scene's theme in every theme", async () => {
  const overlay = parseOverlay(JSON.stringify({
    cards: [{ at: 0.2, title: "Orders up", body: "Eighteen percent more", position: "top-left", hold: 20 }],
    lower: [{ at: 0.2, title: "Route planner", subtitle: "Illustrative", side: "right", hold: 20 }],
    callouts: [{ at: 0.2, text: "Closed", target: "#ui", hold: 20 }],
    stickers: [{ at: 0.2, text: "new", point: [0.3, 0.2], hold: 20 }],
    marks: [{ at: 0.2, kind: "underline", target: "#ui", draw: 0.5, hold: 20 }],
  }));
  const titled = parseOverlay(JSON.stringify({ titles: [{ at: 0.2, text: "Big claim", style: "rise", position: "center", hold: 20 }] }));
  const browser = await chromium.launch();
  try {
    for (const { label: name, vars: theme } of VARIANTS) {
      const base = { duration: 12, beats: 1, theme, starts: [0], spoken: [10], captionStyle: "karaoke", captionLook: "plate", captionEverywhere: true,
        beatTexts: ["Every word lights up while it is spoken"], effects: { cursor: { hidden: true } } };
      const p = await mountStage(browser, PAGE, { ...base, overlay }, 3.2);
      const probes: Probe[] = [
        { name: "card fill", sel: ".__card", token: "--sc-card-bg", mode: "fill" },
        { name: "card title", sel: ".__card-title", token: "--sc-card-ink", mode: "text" },
        { name: "card body", sel: ".__card-body", token: "--sc-card-body", mode: "text" },
        { name: "lower third fill", sel: ".__lower", token: "--sc-card-bg", mode: "fill", at: [0.5, 0.92] },
        { name: "callout fill", sel: ".__callout", token: "--sc-card-bg", mode: "fill", at: [0.96, 0.5] },
        { name: "badge fill", sel: ".__badge", token: "--sc-badge-bg", mode: "fill", at: [0.5, 0.12] },
        { name: "badge text", sel: ".__badge", token: "--sc-badge-ink", mode: "text", textOnly: true },
        { name: "subtitle plate", sel: "#__sub .__line", token: "--sc-sub-bg", mode: "fill", at: [0.004, 0.5] },
        { name: "karaoke word", sel: "#__sub .__word.__now", token: "--sc-karaoke-bg", mode: "fill", at: [0.5, 0.06] },
        { name: "mark stroke", sel: ".__mark-body", token: "--sc-mark", mode: "text" },
      ];
      for (const pr of probes) check(name, pr.name, pr.token, await probe(p, pr), pr.mode === "text" ? 34 : 18);
      await p.context().close();
      // Субтитры контуром (умолчание): в строке есть буквы цвета текста, обводка и слово караоке
      // цветом акцента темы — все три из её токенов.
      const o = await mountStage(browser, PAGE, { ...base, captionLook: undefined }, 3.2);
      const box = async (sel: string): Promise<{ x: number; y: number; w: number; h: number }> => o.evaluate((q) => {
        const r = document.querySelector(q)!.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, sel);
      const shot = decode(await o.screenshot(), W);
      const count = (r: { x: number; y: number; w: number; h: number }, c: RGB, tol: number): number => {
        let n = 0; for (let y = r.y; y < r.y + r.h; y += 1) for (let x = r.x; x < r.x + r.w; x += 1) if (far(shot.px(x, y), c) < tol) n++; return n; };
      const line = await box("#__sub .__line"), now = await box("#__sub .__word.__now");
      for (const [what, r, token] of [["outline subtitle text", line, "--sc-sub-outline-ink"], ["subtitle outline", line, "--sc-sub-outline"], ["outline karaoke word", now, "--sc-sub-accent"]] as const) {
        const n = count(r, hexRgb(theme[token]!), 40);
        assert.ok(n > 20, `${name} · ${what}: the token ${token} ${theme[token]} is drawn (${n} points)`);
      }
      await o.context().close();
      // Титр над затемнением: буквы — цвет титра темы, а не тёмный на тёмном.
      const t = await mountStage(browser, PAGE, { ...base, beatTexts: [""], overlay: titled }, 3);
      check(name, "title", "--sc-title-ink", await probe(t, { name: "title", sel: ".__title", token: "--sc-title-ink", mode: "text" }), 34);
      await t.context().close();
      // Фокус: всё вне цели гаснет цветом затемнения темы; курсор — цветом курсора темы.
      const s = await mountStage(browser, PAGE, { duration: 12, beats: 0, theme, target: "#ui", effects: { spot: { from: 0 } } }, 3);
      // Вне цели страница #7f7f7f гаснет под затемнением темы: ждём их смесь по прозрачности токена.
      const m = /rgba?\((\d+),(\d+),(\d+),?([\d.]*)\)/.exec(theme["--sc-dim"]!)!;
      const al = m[4] ? Number(m[4]) : 1;
      const want = [1, 2, 3].map((k) => Math.round(127 * (1 - al) + Number(m[k]) * al)) as RGB;
      check(name, "spotlight dim", "--sc-dim", { got: decode(await s.screenshot(), W).px(40, 40), want });
      await s.context().close();
      const c = await mountStage(browser, PAGE, { duration: 12, beats: 0, theme, target: "#ui" }, 1.4);
      // Точка внутри стрелки (контур M4 2 L4 20 … в квадрате 24): заливка, а не обводка.
      check(name, "cursor", "--sc-cursor-fill", await probe(c, { name: "cursor", sel: "#__cur", token: "--sc-cursor-fill", mode: "fill", at: [0.25, 0.42] }), 30);
      await c.context().close();
    }
  } finally { await browser.close(); }
  for (const [n, token] of [["card fill", "--sc-card-bg"], ["card title", "--sc-card-ink"], ["badge fill", "--sc-badge-bg"],
    ["subtitle plate", "--sc-sub-bg"], ["karaoke word", "--sc-karaoke-bg"], ["mark stroke", "--sc-mark"], ["title", "--sc-title-ink"],
    ["cursor", "--sc-cursor-fill"], ["spotlight dim", "--sc-dim"]] as const) contrast(n, token);
});

/** Сценарий со всеми восемнадцатью видами слайдов в названной теме и материалы к нему. */
function slidesStory(theme: string, scheme?: string): string {
  const dir = mkdtempSync(join(tmpdir(), "sc-tr-slides-"));
  // Снимок: ровное серое поле с синей полосой сверху — по нему видно, чем его закрасил вид.
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "color=c=0x808080:s=1600x1000", "-vf",
    "drawbox=x=0:y=0:w=1600:h=120:color=0x2040e0:t=fill", "-frames:v", "1", join(dir, "shot.png")]);
  writeFileSync(join(dir, "data.csv"), "Jan,12\nFeb,18\nMar,15\nApr,30\n");
  writeFileSync(join(dir, "story.md"), `# All kinds
lang: en
voice: {"engine":"stub","name":"silent","cps":15}
frame: {"width":1280,"height":720,"fps":25,"scale":1}
theme: ${theme}
${scheme ? `scheme: ${scheme}\n` : ""}
## chapter · slides.chapter
kicker: CHAPTER
title: A chapter opens
body: The body line.
duration: 8

## compare · slides.compare
title: Compare
left: Before :: one | two
right: After :: three | four
duration: 8

## chain · slides.chain
title: Chain
nodes: Data | Slide | Video
duration: 8

## number · slides.number
title: Number
values: 220 :: characters
tags: one | two
duration: 8

## quote · slides.quote
title: Quote
parts: Answer :: a quoted answer
duration: 8

## hero · slides.hero
kicker: Hero
title: A hero headline
body: The body.
duration: 8

## steps · slides.steps
title: Steps
items: One :: first | Two :: second
duration: 8

## features · slides.features
title: Features
items: 🎬 One :: first | 🔍 Two :: second
duration: 8

## timeline · slides.timeline
title: Timeline
items: W1 :: start | W4 :: users
duration: 8

## counter · slides.counter
title: Counter
values: 1,240 :: films | 98% :: cached
duration: 8

## chart · slides.chart
title: Chart
data: data.csv
peak: max
duration: 8

## code · slides.code
title: Code
code: const answer = await take(42);
duration: 8

## ba · slides.beforeafter
title: Before and after
image: shot.png
after: shot.png
labels: Before | After
duration: 8

## px · slides.parallax
title: Parallax
image: shot.png
panels: 0.1 0.3 0.3 0.3 @ 1
duration: 8

## pv · slides.perspective
title: Perspective
image: shot.png
duration: 8

## photo · slides.photo
title: Photo
image: shot.png
duration: 8

## shot · slides.shot
title: Shot
image: shot.png
device: browser app.example.com
duration: 8

## phone · slides.shot
title: Phone
image: shot.png
device: phone
duration: 8

## outro · slides.outro
title: The end
cta: npx agentic-screencast
duration: 8
`);
  // Каждой сцене — строка речи: часть видов без речи не бывает.
  writeFileSync(join(dir, "story.md"), readFileSync(join(dir, "story.md"), "utf8").replaceAll("duration: 8\n", "duration: 8\n\nOne line.\n"));
  return join(dir, "story.md");
}

test("every slide kind and the device frames draw with their theme's tokens in every theme", async () => {
  const kinds: Array<[string, Probe[]]> = [
    ["chapter", [{ name: "chapter title", sel: ".chapter-title", token: "--ink", mode: "text" }]],
    ["compare", [{ name: "compare column", sel: ".col", token: "--card", mode: "fill", at: [0.96, 0.95] }]],
    ["chain", [{ name: "chain node", sel: ".node", token: "--node", mode: "fill", at: [0.97, 0.9] }]],
    ["number", [{ name: "number", sel: ".huge", token: "--acc", mode: "text" }]],
    ["quote", [{ name: "quote block", sel: ".quote", token: "--card", mode: "fill", at: [0.98, 0.85] }]],
    ["hero", [{ name: "hero title", sel: ".hero-title", token: "--ink", mode: "text" }]],
    ["steps", [{ name: "step number", sel: ".step-n", token: "--node", mode: "fill", at: [0.5, 0.12] }]],
    ["features", [{ name: "feature card", sel: ".feat", token: "--card", mode: "fill", at: [0.96, 0.95] }]],
    ["timeline", [{ name: "timeline stop", sel: ".tl-when", token: "--acc", mode: "text" }]],
    ["counter", [{ name: "counter card", sel: ".ctr", token: "--card", mode: "fill", at: [0.04, 0.93] }]],
    // Подсвеченный столбец — акцентом; остальные рядом с ним — смесью акцента и линии, одного токена у них нет.
    ["chart", [{ name: "chart bar", sel: ".chart-col.peak .chart-bar", token: "--acc", mode: "fill", at: [0.5, 0.9] }]],
    ["code", [{ name: "code window", sel: ".code-win", token: "--code-bg", mode: "fill", at: [0.98, 0.9] },
      { name: "code bar", sel: ".code-bar", token: "--code-bar", mode: "fill", at: [0.98, 0.5] }]],
    ["ba", [{ name: "before/after divider", sel: ".ba-line", token: "--ba-line", mode: "fill", at: [0.5, 0.2] },
      { name: "before/after label", sel: ".ba-l1", token: "--ba-label-bg", mode: "fill", at: [0.5, 0.1] }]],
    ["photo", [{ name: "photo shade", sel: ".photo-shade", token: "--bg", mode: "fill", at: [0.5, 0.995] }]],
    ["outro", [{ name: "call to action", sel: ".outro-cta span", token: "--acc", mode: "fill", at: [0.05, 0.5],
      prep: "document.querySelector('.outro-cta span').style.setProperty('--sheen','-300%')" }]],
    ["shot", [{ name: "browser bar", sel: ".dv-bar", token: "--card", mode: "fill", at: [0.97, 0.94] },
      { name: "window button", sel: ".dv-bar i", token: "--sc-traffic-1", mode: "fill", at: [0.5, 0.5] }]],
  ];
  const browser = await chromium.launch();
  try {
    for (const { label: name, theme: themeName, scheme } of VARIANTS) {
      const g = generateFrom(slidesStory(themeName, scheme));
      const pitch = JSON.parse(readFileSync(g.pitchFile, "utf8")) as { scenes: Array<{ id: string; effects?: unknown }>; theme: ThemeVars };
      const mount = async (id: string, at = 6.5): Promise<Page> => mountStage(browser, g.pages[id]!,
        { duration: 8, beats: 0, theme: pitch.theme, effects: pitch.scenes.find((s) => s.id === id)!.effects }, at);
      for (const [id, probes] of kinds) {
        const p = await mount(id);
        for (const pr of probes) check(name, pr.name, pr.token, await probe(p, pr), pr.mode === "text" ? 34 : 20);
        await p.context().close();
      }
      // Корпус телефона — своя кромка элемента цветом корпуса темы.
      const ph = await mount("phone");
      const r = await ph.evaluate(() => { const e = document.querySelector(".dv-phone")!; const b = e.getBoundingClientRect();
        return { x: b.left, y: b.top, h: b.height, bz: Number.parseFloat(getComputedStyle(e).borderLeftWidth) }; });
      check(name, "phone bezel", "--dv-bezel", { got: decode(await ph.screenshot(), W).px(r.x + r.bz / 2, r.y + r.h / 2),
        want: hexRgb(pitch.theme["--dv-bezel"]!) }, 12);
      await ph.context().close();
      // Параллакс: снимок в глубине приглушён фильтром темы — серое поле 128 темнеет в долю, которую назвал токен.
      const px = await mount("px");
      const base = await px.evaluate(() => { const b = document.querySelector(".px-base")!.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
      const grey = decode(await px.screenshot(), W).px(base.x + base.w * 0.9, base.y + base.h * 0.9)[0];
      const k = Number(/brightness\(([\d.]+)\)/.exec(pitch.theme["--px-dim"]!)![1]);
      assert.ok(Math.abs(grey / 128 - k) < 0.06, `${name} · parallax base: dimmed to ${(grey / 128).toFixed(2)} of the picture, the theme asks ${k}`);
      await px.context().close();
    }
  } finally { await browser.close(); }
  for (const [n, token] of [["compare column", "--card"], ["chain node", "--node"], ["number", "--acc"], ["hero title", "--ink"],
    ["chart bar", "--acc"], ["code window", "--code-bg"], ["before/after divider", "--ba-line"], ["call to action", "--acc"],
    ["browser bar", "--card"], ["phone bezel", "--dv-bezel"]] as const) contrast(n, token);
});

test("confetti, sparks and the glint take their colours from the theme in every theme", async () => {
  const overlay = parseOverlay(JSON.stringify({
    bursts: [{ at: 1, kind: "confetti", target: "#ui", seed: 3, hold: 3 }, { at: 1, kind: "sparks", target: "#ui", seed: 5, hold: 3 }],
    glints: [{ at: 5, target: "#ui", hold: 1.2 }],
  }));
  const browser = await chromium.launch();
  try {
    for (const { label: name, vars: theme } of VARIANTS) {
      const p = await mountStage(browser, PAGE, { duration: 12, beats: 0, theme, overlay, effects: { cursor: { hidden: true } } }, 1.35);
      const f = decode(await p.screenshot(), W);
      // Частицы: у каждого цвета темы считаются точки кадра рядом с ним.
      const near = (c: RGB, tol: number): number => { let n = 0; for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) if (far(f.px(x, y), c) <= tol) n++; return n; };
      const confetti = theme["--sc-confetti"]!.split(",").map((c) => hexRgb(c));
      const found = confetti.filter((c) => near(c, 24) > 8).length;
      assert.ok(found >= 3, `${name} · confetti: ${found} of the theme's five colours are on the frame`);
      const sparks = [theme["--sc-spark"]!, theme["--sc-spark-2"]!].map((c) => near(hexRgb(c), 30));
      assert.ok(sparks.some((n) => n > 4), `${name} · sparks: the theme's spark colours are on the frame (${sparks})`);
      // Блик: точка посередине цели под полосой смещается к цвету блика темы — к белому у тёмных тем,
      // к акценту у светлых, где белый блик на светлом был бы не виден.
      await p.evaluate(() => window.__clock.seek(4.9));
      const before = decode(await p.screenshot(), W).px(880, 315);
      let moved: RGB = before, best = 0;
      // Полоса блика узкая: шаг выборки мельче её прохода, иначе пик попадает между выборками.
      for (let t = 5.4; t <= 5.8 + 1e-9; t += 0.025) {
        await p.evaluate((tt) => window.__clock.seek(tt), t);
        const c = decode(await p.screenshot(), W).px(880, 315);
        if (far(c, before) > best) { best = far(c, before); moved = c; }
      }
      const stop = /rgba?\((\d+),(\d+),(\d+)[^)]*\)\s*50%/.exec(theme["--sc-glint"]!)!;
      const toward = [1, 2, 3].map((k) => Number(stop[k])) as RGB;
      const d = [0, 1, 2].map((k) => moved[k]! - before[k]!), e = [0, 1, 2].map((k) => toward[k]! - before[k]!);
      const cos = (d[0]! * e[0]! + d[1]! * e[1]! + d[2]! * e[2]!) / (Math.hypot(...d) * Math.hypot(...e) || 1);
      assert.ok(best > 10 && cos > 0.8, `${name} · glint: the target moves toward the theme's glint colour (by ${best}, cos ${cos.toFixed(2)})`);
      await p.context().close();
    }
  } finally { await browser.close(); }
});

test("transitions light, fill and shade with the incoming scene's theme; colourless ones add no colour", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-tr-tx-"));
  const TW = 320, TH = 180, A: RGB = [64, 96, 160], B: RGB = [160, 96, 64];
  const frames = (name: string, c: RGB): string[] => [...Array(8).keys()].map((k) => {
    const f = join(dir, `${name}${k}.png`);
    execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-f", "lavfi", "-i", `color=c=0x${c.map((v) => v.toString(16).padStart(2, "0")).join("")}:s=${TW}x${TH}`, "-frames:v", "1", f]);
    return f;
  });
  const a = frames("a", A), b = frames("b", B);
  const mid = [0, 1, 2].map((k) => (A[k]! + B[k]!) / 2) as RGB;
  const clampAdd = (base: RGB, add: RGB, k: number): RGB => base.map((v, i) => Math.min(255, v + add[i]! * k)) as RGB;
  for (const { label: name, vars: theme } of VARIANTS) {
    const run = async (kind: string): Promise<(x: number, y: number) => RGB> => {
      const got = await renderTransition({ kind, a, b, width: TW, height: TH, out: join(dir, `${name}-${kind}`), theme });
      assert.equal(got.renderer, "webgl");
      return decode(readFileSync(got.frames[4]!), TW).px; // прогресс 4,5/8 ≈ 0,56
    };
    // Засветка: в середине пятна (оно идёт слева направо, на прогрессе p — в точке mix(-0.25, 1.25, p))
    // к кадру прибавлен свет темы экраном: A + свет · (1 − A), свет — вспышка темы и немного кольца.
    const leak = await run("leak");
    const p = 4.5 / 8, g = Math.exp(-(((p - 0.5) / 0.26) ** 2)), cx = -0.25 + 1.5 * p;
    const spot = 1 + 0.6 * Math.exp(-(0.45 ** 2 + 0.35 ** 2) * 5);
    const fl = hexRgb(theme["--tr-flash"]!), ir = hexRgb(theme["--tr-iris"]!);
    const lit = [0, 1, 2].map((k) => Math.round(A[k]! + ((fl[k]! / 255) * spot * 0.8 + (ir[k]! / 255) * 0.15) * g * (255 - A[k]!))) as RGB;
    check(name, "leak light", "--tr-flash", { got: leak(TW * cx, TH * 0.3), want: lit.map((v) => Math.min(255, v)) as RGB }, 14);
    // Шов шторки и кольцо круглой маски: самая светлая точка полосы вокруг середины — середина смеси плюс свет темы.
    for (const [kind, token, amp] of [["wipe", "--tr-seam", Math.sin(Math.PI * p)], ["mask", "--tr-iris", Math.sin(Math.PI * p)]] as const) {
      const px = await run(kind);
      let best: RGB = [0, 0, 0];
      for (let y = TH / 2 - 20; y < TH / 2 + 20; y++) for (let x = 0; x < TW; x++) { const c = px(x, y); if (c[0] + c[1] + c[2] > best[0] + best[1] + best[2]) best = c; }
      check(name, `${kind} light`, token, { got: best, want: clampAdd(mid, hexRgb(theme[token]!), amp) }, 16);
    }
    // Просветы между гранями: у куба над поворачивающейся гранью — заливка темы, а не чёрный.
    const cube = await run("cube");
    check(name, "cube gap", "--tr-fill", { got: cube(TW * 0.05, 1), want: hexRgb(theme["--tr-fill"]!) }, 6);
  }
  // Переходы без своего цвета: каждая точка середины — в пределах цветов двух сцен по каждому каналу.
  for (const kind of ["dots", "zoom", "pixelate", "glitch", "whip"]) {
    const got = await renderTransition({ kind, a, b, width: TW, height: TH, out: join(dir, `plain-${kind}`), theme: THEMES.synthwave! });
    const px = decode(readFileSync(got.frames[4]!), TW).px;
    for (let y = 0; y < TH; y += 7) for (let x = 0; x < TW; x += 7) {
      const c = px(x, y);
      for (let k = 0; k < 3; k++) assert.ok(c[k]! >= Math.min(A[k]!, B[k]!) - 4 && c[k]! <= Math.max(A[k]!, B[k]!) + 4, `${kind} adds no colour of its own (${c} at ${x},${y})`);
    }
  }
  for (const [n, token] of [["leak light", "--tr-flash"], ["cube gap", "--tr-fill"]] as const) contrast(n, token);
});

test("the perspective screen's glint and the live backgrounds wear their theme in every theme", async () => {
  const browser = await chromium.launch();
  try {
    for (const { label: name, theme: themeName, scheme, vars: theme } of VARIANTS) {
      const g = generateFrom(slidesStory(themeName, scheme));
      const pitch = JSON.parse(readFileSync(g.pitchFile, "utf8")) as { scenes: Array<{ id: string; effects?: unknown }>; theme: ThemeVars };
      // Блик по экрану в перспективе: самая светлая точка серого снимка (0,5) — снимок плюс блик темы
      // силы --pv-glint-strength: 0,5 + сила · цвет блика по каждому каналу.
      const pv = await mountStage(browser, g.pages.pv!, { duration: 8, beats: 0, theme: pitch.theme, effects: pitch.scenes.find((s) => s.id === "pv")!.effects }, 0);
      assert.equal(await pv.evaluate(() => document.body.dataset.screenRenderer), "webgl");
      const strength = Number(theme["--pv-glint-strength"]), L = hexRgb(theme["--pv-glint"]!);
      const want = L.map((v) => Math.min(255, Math.round(255 * (0.5 + strength * v / 255)))) as RGB;
      let best: RGB = [0, 0, 0];
      for (const t of [1.2, 1.8, 2.4, 3.0, 3.6]) {
        await pv.evaluate((tt) => window.__clock.seek(tt), t);
        const f = decode(await pv.screenshot(), W);
        const cv = await pv.evaluate(() => { const r = document.querySelector(".pv-cv")!.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
        for (let y = cv.y + cv.h * 0.2; y < cv.y + cv.h * 0.7; y += 2) for (let x = cv.x + 4; x < cv.x + cv.w - 4; x += 2) {
          const c = f.px(x, y);
          if (c[0] + c[1] + c[2] > best[0] + best[1] + best[2]) best = c;
        }
      }
      check(name, "perspective glint", "--pv-glint", { got: best, want }, 16);
      await pv.context().close();
      // Живой фон: средний цвет пустой полосы кадра — рядом с фоном своей темы, а если в теме заменить
      // --bg на зелёный, фон зеленеет: живой фон читает токен, а не свой цвет.
      // Тема вписывается в страницу при порождении (живой фон на холсте читает её при загрузке), поэтому
      // замена токена идёт через шапку сценария, как у автора ролика.
      const meanOf = async (spec: string): Promise<RGB> => {
        const gg = generateFrom(slidesStory(spec, scheme));
        const pp = JSON.parse(readFileSync(gg.pitchFile, "utf8")) as { scenes: Array<{ id: string; effects?: unknown }>; theme: ThemeVars };
        const pg = await mountStage(browser, gg.pages.hero!, { duration: 8, beats: 0, theme: pp.theme, effects: pp.scenes.find((s) => s.id === "hero")!.effects }, 4);
        const f = decode(await pg.screenshot(), W);
        const sum = [0, 0, 0]; let n = 0;
        for (let y = H * 0.85; y < H * 0.98; y += 3) for (let x = 20; x < W - 20; x += 5) { const c = f.px(x, y); sum[0] += c[0]; sum[1] += c[1]; sum[2] += c[2]; n++; }
        await pg.context().close();
        return sum.map((v) => v / n) as RGB;
      };
      const mean = await meanOf(themeName);
      const l1 = (x: RGB, y: RGB): number => Math.abs(x[0] - y[0]) + Math.abs(x[1] - y[1]) + Math.abs(x[2] - y[2]);
      assert.ok(l1(mean, hexRgb(theme["--bg"]!)) <= 45, `${name} · live background (${theme["--bg-motion"]}): mean ${mean.map(Math.round)} is near the theme's --bg ${theme["--bg"]}`);
      const green = await meanOf(JSON.stringify({ preset: themeName, "--bg": "#00a000" }));
      const target: RGB = [0, 160, 0];
      assert.ok(l1(green, target) < l1(mean, target) - 60, `${name} · live background follows --bg: ${mean.map(Math.round)} → ${green.map(Math.round)}`);
    }
  } finally { await browser.close(); }
});

/** Цвет выражения CSS из токенов темы на подложке — так, как его нарисует браузер. */
async function cssOver(browser: Browser, theme: ThemeVars, css: string, backdrop: string, size: [number, number], at: [number, number], u = 6.4): Promise<RGB> {
  const p = await browser.newPage({ viewport: { width: 800, height: 400 } });
  const vars = Object.entries(theme).map(([k, v]) => `${k}:${v}`).join(";");
  await p.setContent(`<html><head><style>:root{${vars};--u:${u}px}</style></head><body style="margin:0;background:${backdrop}">
    <div style="position:absolute;left:10px;top:10px;width:${size[0]}px;height:${size[1]}px;background:${css}"></div></body></html>`);
  const c = decode(await p.screenshot(), 800).px(10 + size[0] * at[0], 10 + size[1] * at[1]);
  await p.close();
  return c;
}

test("the progress bar, chapter labels, the presenter ring and the loupe ring drawn by ffmpeg wear the film's theme", async () => {
  const FW = 640, FH = 360;
  const browser = await chromium.launch();
  try {
    for (const { label: name, theme: themeName, scheme, vars: theme } of VARIANTS) {
      const dir = mkdtempSync(join(tmpdir(), "sc-tr-film-"));
      writeFileSync(join(dir, "page.html"), `<!doctype html><html><body style="margin:0;background:#808080">
<div id="t" style="position:absolute;left:260px;top:120px;width:120px;height:80px;background:#606060"></div></body></html>`);
      execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "color=c=0x202020:s=160x160:r=10:d=2", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", join(dir, "face.mp4")]);
      writeFileSync(join(dir, "story.md"), `# Film
lang: en
voice: {"engine":"stub","name":"silent","cps":15}
frame: {"width":${FW},"height":${FH},"fps":10,"scale":1}
theme: ${themeName}
scheme: ${scheme}
progress: {"position":"bottom"}
pip: {"file":"face.mp4","size":0.2}

## one · page
page: page.html
part: FIRST
duration: 4
overlay: {"loupe":[{"at":0.5,"target":"#t","scale":2,"size":0.22,"hold":3}]}
`);
      const r = execFileSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8",
        env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
      assert.ok(r.includes('"chapters"'), `${name}: the film builds`);
      const at = (t: number): ReturnType<typeof decode> => decode(execFileSync(ffmpeg, ["-loglevel", "error", "-ss", String(t), "-i", join(dir, "f.mp4"),
        "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"]), FW);
      const f = at(2);
      const barH = Math.max(4, Math.round(FH * Number(theme["--sc-progress-size"])));
      check(name, "progress fill", "--sc-progress", { got: f.px(6, FH - barH / 2), want: hexRgb(theme["--sc-progress"]!) }, 16);
      // Дорожка полосы: цвет дорожки темы с её прозрачностью поверх серой страницы.
      const tr = /^#(\w{6})(\w{2})?$/.exec(theme["--sc-progress-track"]!)!, ta = tr[2] ? Number.parseInt(tr[2], 16) / 255 : 1;
      const tc = hexRgb(`#${tr[1]}`);
      check(name, "progress track", "--sc-progress-track", { got: f.px(FW - 20, FH - barH / 2), want: tc.map((v) => Math.round(128 * (1 - ta) + v * ta)) as RGB }, 12);
      // Подпись главы: подложка карточки темы поверх серой страницы, у левого нижнего угла над полосой.
      const label = await cssOver(browser, theme, "var(--sc-card-bg)", "#808080", [60, 12], [0.1, 0.5]);
      const lx = Math.round(FW * 0.018) + 3, ly = FH - barH - Math.round(FW * 0.018 * 0.6) - 4;
      check(name, "chapter label", "--sc-card-bg", { got: f.px(lx, ly), want: label }, 22);
      // Кольцо ведущего: круг 0,2 ширины у правого нижнего угла на 0,03 ширины от краёв.
      const D = Math.round(0.2 * FW / 2) * 2, margin = Math.round(FW * 0.03);
      const cx = FW - margin - D / 2, cy = FH - margin - D / 2;
      const ring = Math.max(2, Math.round(D * Number(theme["--sc-pip-ring-width"])));
      // Кольца в две-три точки проходят YUV и прореживание цветности 4:2:0: насыщенный цвет на узком кольце
      // смешивается с соседями, отсюда допуск шире, чем у заливок.
      check(name, "presenter ring", "--sc-pip-ring", { got: f.px(cx + D / 2 - ring / 2 - 1.5, cy), want: hexRgb(theme["--sc-pip-ring"]!) }, 32);
      // Кольцо лупы: правый край линзы по её раскладке (цель 120×80 не входит в линзу 0,22, линза растёт).
      const lens = loupeLayout({ at: 0.5, target: "#t", scale: 2, size: 0.22, hold: 3 }, { left: 260, top: 120, width: 120, height: 80 }, { width: FW, height: FH });
      check(name, "loupe ring", "--sc-loupe-ring", { got: f.px(lens.X + lens.D - 2, lens.Y + lens.D / 2), want: hexRgb(theme["--sc-loupe-ring"]!) }, 32);
    }
  } finally { await browser.close(); }
  for (const [n, token] of [["progress fill", "--sc-progress"], ["chapter label", "--sc-card-bg"], ["presenter ring", "--sc-pip-ring"], ["loupe ring", "--sc-loupe-ring"]] as const) contrast(n, token);
});

test("a live take draws its cursor, click, key caps, card and spotlight in the theme it is recorded with", async () => {
  const { recordTake } = await import("../../capture.js");
  const CW = 1280, CH = 720;
  const browser = await chromium.launch();
  try {
    for (const { label: name, theme: themeName, scheme, vars: theme } of VARIANTS) {
      const dir = mkdtempSync(join(tmpdir(), "sc-tr-take-"));
      const out = join(dir, "take.webm");
      await recordTake({ output: out, viewport: { width: CW, height: CH }, theme: { preset: themeName, scheme },
        prepare: async (page) => { await page.setContent(`<body style="margin:0;background:#ffffff">
<button id="b" style="position:absolute;left:560px;top:300px;width:160px;height:60px">Go</button>
<input id="i" style="position:absolute;left:560px;top:420px;width:160px;height:30px"></body>`); } },
      async (take) => {
        await take.page.waitForTimeout(500);
        await take.click(take.page.locator("#b"));
        take.mark("clicked");
        await take.press(take.page.locator("#i"), "Enter");
        take.mark("keyed");
        take.mark("carding");
        await take.card({ title: "Waiting" });
        take.mark("carded");
        await take.focus(take.page.locator("#b"), { scale: 1.2 });
        take.mark("focused");
        await take.page.waitForTimeout(600);
      });
      const marks = JSON.parse(readFileSync(`${out}.marks.json`, "utf8")) as { marks: Record<string, number>; clicks: Array<{ t: number; x: number; y: number }>; theme: { name?: string; scheme?: string } };
      assert.equal(`${marks.theme.name} ${marks.theme.scheme}`, name, `${name}: the take records its theme and scheme (${JSON.stringify(marks.theme)})`);
      const frame = (t: number): ReturnType<typeof decode> => decode(execFileSync(ffmpeg, ["-loglevel", "error", "-ss", String(Math.max(0, t)), "-i", out,
        "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"]), CW);
      /** Ближайшая к цвету точка в прямоугольнике — есть ли там этот цвет. */
      const closest = (f: ReturnType<typeof decode>, box: [number, number, number, number], c: RGB): RGB => {
        let best: RGB = [0, 0, 0], d = 999;
        for (let y = box[1]; y < box[1] + box[3]; y++) for (let x = box[0]; x < box[0] + box[2]; x++) { const p = f.px(x, y), e = far(p, c); if (e < d) { d = e; best = p; } }
        return best;
      };
      const click = marks.clicks[0]!, cx = Math.round(click.x * CW), cy = Math.round(click.y * CH);
      const at = frame(click.t + 0.25);
      const cur = hexRgb(theme["--sc-cursor-fill"]!);
      check(name, "take cursor", "--sc-cursor-fill", { got: closest(at, [cx, cy, 14, 18], cur), want: cur }, 26);
      const ring = hexRgb(theme["--sc-ripple-ring"]!);
      let dot: RGB = [0, 0, 0];
      // Время клика в файле отметок точно до десятой доли секунды (в замере — на 0,08 с позже
      // кадра), а точка клика видна у острия курсора лишь первые кадры: окно поиска начинается
      // на 0,1 с раньше записанного времени.
      for (const dt of [-0.1, -0.06, -0.02, 0.02, 0.06, 0.1]) { const c = closest(frame(click.t + dt), [cx - 16, cy - 16, 32, 32], ring); if (far(c, ring) < far(dot, ring)) dot = c; }
      check(name, "take click", "--sc-ripple-ring", { got: dot, want: ring }, 40);
      // Клавиши: середина плашки — середина градиента плашки темы.
      const keys = await cssOver(browser, theme, "var(--sc-keys-bg)", "#ffffff", [80, 48], [0.1, 0.5], 12.8);
      check(name, "take key caps", "--sc-keys-bg", { got: closest(frame(marks.marks.keyed! - 0.05), [CW / 2 - 90, CH * 0.93 - 60, 180, 60], keys), want: keys }, 18);
      // Карточка дубля: подложка карточки темы поверх белой страницы, в правом нижнем углу.
      const card = await cssOver(browser, theme, "var(--sc-card-bg)", "#ffffff", [460, 60], [0.9, 0.5], 12.8);
      check(name, "take card", "--sc-card-bg", { got: closest(frame(marks.marks.carding! + 1.2), [CW - 200, CH - 90, 180, 80], card), want: card }, 18);
      // Подсветка наезда: белая страница вне цели гаснет цветом затемнения темы.
      const m = /rgba?\((\d+),(\d+),(\d+),?([\d.]*)\)/.exec(theme["--sc-dim"]!)!;
      const al = m[4] ? Number(m[4]) : 1;
      check(name, "take dim", "--sc-dim", { got: frame(marks.marks.focused! + 0.4).px(20, 20), want: [1, 2, 3].map((k) => Math.round(255 * (1 - al) + Number(m[k]) * al)) as RGB }, 14);
    }
  } finally { await browser.close(); }
  for (const [n, token] of [["take cursor", "--sc-cursor-fill"], ["take key caps", "--sc-keys-bg"], ["take card", "--sc-card-bg"], ["take dim", "--sc-dim"]] as const) contrast(n, token);
});

test("a transition between scenes in different themes wears the incoming scene's theme, and the theme is part of its cache key", async () => {
  const { assembleVideo } = await import("../../assemble.js");
  const { mkdirSync, readdirSync } = await import("node:fs");
  const dir = mkdtempSync(join(tmpdir(), "sc-tr-between-"));
  const TW = 320, TH = 180, cache = join(dir, "cache");
  mkdirSync(cache);
  const seg = (name: string, c: string): string => {
    const f = join(dir, `${name}.mp4`);
    execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", `color=c=${c}:s=${TW}x${TH}:r=10:d=2`, "-c:v", "libx264", "-pix_fmt", "yuv444p", f]);
    return f;
  };
  const a = seg("a", "0x606060"), b = seg("b", "0xa0a0a0");
  const enc = { fps: 10, width: TW, height: TH, crf: 8, preset: "veryfast", pix: "yuv444p" };
  const clips = (): string[] => readdirSync(cache).filter((f) => /^transition-.*\.mp4$/.test(f));
  const gap = async (incoming: string): Promise<RGB> => {
    const out = join(dir, `${incoming}.mp4`);
    await assembleVideo({ out, cache, self: "test", enc, scenes: [
      { id: "a", seg: a, frames: 20, theme: THEMES.midnight! },
      { id: "b", seg: b, frames: 20, transition: { kind: "cube", duration: 1 }, theme: THEMES[incoming]! }] });
    // Переход занимает 1,0–2,0 с; у куба на середине над поворачивающейся гранью — просвет заливки.
    const f = decode(execFileSync(ffmpeg, ["-loglevel", "error", "-ss", "1.45", "-i", out, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"]), TW);
    return f.px(TW * 0.05, 1);
  };
  const paper = await gap("calm-paper");
  assert.ok(far(paper, hexRgb(THEMES["calm-paper"]!["--tr-fill"]!)) <= 10, `the gap is the incoming calm-paper fill, not midnight's (${paper})`);
  assert.equal(clips().length, 1);
  const noir = await gap("noir");
  assert.ok(far(noir, hexRgb(THEMES.noir!["--tr-fill"]!)) <= 10, `after the incoming theme changes, the gap is noir's fill (${noir})`);
  assert.equal(clips().length, 2, "the new incoming theme renders a new transition clip instead of reusing the cached one");
});
