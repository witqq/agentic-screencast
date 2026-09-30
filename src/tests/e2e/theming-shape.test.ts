// Токены формы действуют: радиусы, толщины линий и обводок, размеры, отступы, тени и шрифты,
// которые задаёт тема, меняют то, что нарисовано. Для каждого такого токена тест собирает кадр с
// темой, где значение токена изменено, и меряет элемент, который его читает: геометрию
// отрисованного элемента (прямоугольник, толщину, радиус, отступ) или точки кадра, если элемент
// рисует холст, WebGL или ffmpeg. Величина меняется в ожидаемую сторону; токен, который никто не
// читает или который перебит числом в коде, этого не проходит.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { chromium, type Browser, type Page } from "playwright";
import { NON_COLOUR_TOKENS, THEMES, type ThemeVars } from "../../theme.js";
import { parseOverlay } from "../../overlay.js";
import { generateFrom } from "../../generate.js";
import { rawOf } from "../support.js";
import { renderTransition } from "../../transition.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const here = dirname(fileURLToPath(import.meta.url));
const CLOCK = readFileSync(resolve(here, "..", "..", "browser", "clock.js"), "utf8");
const STAGE = readFileSync(resolve(here, "..", "..", "browser", "stage.js"), "utf8");
const W = 1280, H = 720;
const BASE = THEMES.midnight!;

async function mount(browser: Browser, file: string, scene: Record<string, unknown>, at: number): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  await ctx.addInitScript({ content: CLOCK });
  await ctx.addInitScript({ content: STAGE });
  const p = await ctx.newPage();
  await p.goto(pathToFileURL(file).href);
  await p.evaluate((s) => window.__stage.mount(s as never), scene);
  await p.evaluate((t) => window.__clock.seek(t), at);
  return p;
}

/** Что меряется у элемента: число из отрисованной геометрии или разрешённого стиля. */
type Measure = { sel: string; read: string };
const px = (sel: string, prop: string): Measure => ({ sel, read: `parseFloat(getComputedStyle(e).${prop})` });
const box = (sel: string, side: "width" | "height"): Measure => ({ sel, read: `e.getBoundingClientRect().${side}` });
const text = (sel: string, prop: string): Measure => ({ sel, read: `getComputedStyle(e).${prop}` });
/** Ширина набранного текста элемента: от шрифта зависит она, а не ширина блока. */
const inked = (sel: string): Measure => ({ sel, read: "(() => { const r = document.createRange(); r.selectNodeContents(e); return r.getBoundingClientRect().width; })()" });

async function read(p: Page, m: Measure): Promise<number | string> {
  return p.evaluate(({ sel, read: expr }) => {
    const e = document.querySelector(sel) as HTMLElement | null;
    if (!e) return Number.NaN;
    return new Function("e", `return (${expr});`)(e) as number | string;
  }, m);
}

const GIF = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
const PAGE = `<!doctype html><html><body style="margin:0;background:#7f7f7f">
<div id="ui" style="position:absolute;left:760px;top:260px;width:240px;height:110px;background:#5a6070"></div></body></html>`;

/** Токены слоя поверх кадра: значение → элемент и величина, которая от него зависит. */
const OVERLAY: Array<[string, string, Measure]> = [
  ["--sc-card-radius", "calc(var(--u)*2.5)", px(".__card", "borderTopLeftRadius")],
  ["--sc-radius", "calc(var(--u)*2)", px(".__lower", "borderTopLeftRadius")],
  ["--sc-sub-radius", "calc(var(--u)*1.2)", px("#__sub .__line", "borderTopLeftRadius")],
  ["--sc-hairline", "5px", px(".__card", "borderTopWidth")],
  ["--sc-pad-x", "calc(var(--u)*4)", px(".__card", "paddingLeft")],
  ["--sc-pad-y", "calc(var(--u)*3)", px(".__card", "paddingTop")],
  ["--sc-sub-pad-y", "calc(var(--u)*.6)", px("#__sub .__line", "paddingTop")],
  ["--sc-badge-pad-x", "calc(var(--u)*2.5)", px(".__badge", "paddingLeft")],
  ["--sc-badge-pad-y", "calc(var(--u)*1.2)", px(".__badge", "paddingTop")],
  ["--sc-edge", "calc(var(--u)*5)", { sel: ".__card", read: "e.getBoundingClientRect().top" }],
  ["--radius-pill", "3px", px(".__badge", "borderTopLeftRadius")],
  ["--sc-cap-bar-size", "calc(var(--u)*1)", box("#__capbar", "height")],
  ["--sc-spot-radius", "calc(var(--u)*3)", px("#__spot", "borderTopLeftRadius")],
  ["--sc-cursor-size", "calc(var(--u)*4)", box("#__cur", "width")],
  ["--sc-cursor-line-width", "4", px("#__cur path", "strokeWidth")],
  ["--sc-mark-width", ".012", { sel: ".__mark", read: "parseFloat(e.getAttribute('stroke-width'))" }],
  ["--sc-arrow-width", ".008", { sel: ".__arrow", read: "parseFloat(e.getAttribute('stroke-width'))" }],
  ["--sc-arrow-head", ".03", { sel: ".__arrowhead", read: "e.getBBox().width + e.getBBox().height" }],
  ["--sc-scrim-blur", ".02", { sel: "#__scrim", read: "parseFloat((e.style.backdropFilter.match(/blur\\(([\\d.]+)px/) || [0, 0])[1])" }],
];

/** Тени, шрифты и режимы слоя: при замене токена меняется разрешённое значение у элемента. */
const OVERLAY_TEXT: Array<[string, string, Measure]> = [
  ["--sc-card-shadow", "0 0 0 7px rgb(255, 0, 0)", text(".__card", "boxShadow")],
  ["--sc-title-shadow", "rgb(255, 0, 0) 5px 5px 0px", text(".__title", "textShadow")],
  ["--sc-badge-shadow", "0 0 0 6px rgb(255, 0, 0)", text(".__badge", "boxShadow")],
  ["--sc-cap-shadow", "0 0 0 8px rgb(255, 0, 0)", text("#__cap", "boxShadow")],
  ["--sc-sticker-shadow", "drop-shadow(rgb(255, 0, 0) 9px 9px 0px)", text(".__sticker img", "filter")],
  ["--sc-cursor-shadow", "drop-shadow(rgb(255, 0, 0) 9px 9px 0px)", text("#__cur", "filter")],
  ["--sc-spot-shadow", "0 0 0 11px rgb(255, 0, 0)", text("#__spot", "boxShadow")],
  ["--sc-karaoke-halo", "0 0 0 9px rgb(255, 0, 0)", text("#__sub .__word.__now", "boxShadow")],
  ["--sc-glint-blend", "multiply", text(".__glint", "mixBlendMode")],
  ["--sans", "monospace", inked(".__card-body")],
  ["--display", "monospace", inked(".__card-title")],
  ["--display-weight", "300", text(".__title", "fontWeight")],
  ["--sc-sub-outline-shadow", "rgb(255, 0, 0) 4px 4px 0px", text("#__sub", "textShadow")],
  ["--display-tracking", ".3em", text(".__title", "letterSpacing")],
  ["--display-case", "lowercase", text(".__title", "textTransform")],
  ["--sub-font", "monospace", text("#__sub", "fontFamily")],
  ["--sub-weight", "300", text("#__sub", "fontWeight")],
];

test("every overlay shape token changes the element that reads it", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-shape-"));
  const file = join(dir, "page.html");
  writeFileSync(file, PAGE);
  const overlay = parseOverlay(JSON.stringify({
    cards: [{ at: 0.2, title: "Orders", body: "Up eighteen percent", position: "top-left", hold: 20 }],
    lower: [{ at: 0.2, title: "Route planner", subtitle: "Illustrative", side: "right", hold: 20 }],
    callouts: [{ at: 0.2, text: "Closed", target: "#ui", hold: 20 }],
    stickers: [{ at: 0.2, text: "new", point: [0.3, 0.3], hold: 20 }, { at: 0.2, image: GIF, point: [0.5, 0.2], hold: 20 }],
    marks: [{ at: 0.2, kind: "underline", target: "#ui", draw: 0.4, hold: 20 }],
    titles: [{ at: 0.2, text: "Claim", style: "rise", position: "top", hold: 20 }],
    glints: [{ at: 2.8, target: "#ui", hold: 2 }],
  }));
  const scene = (theme: ThemeVars): Record<string, unknown> => ({ duration: 12, beats: 1, theme, starts: [0], spoken: [10],
    captionStyle: "karaoke", captionLook: "plate", captionEverywhere: true, beatTexts: ["Every word lights up while it is spoken"],
    target: "#ui", effects: { spot: { from: 0 } }, overlay, __stickers: [{}, { src: GIF }] });
  const capScene = (theme: ThemeVars): Record<string, unknown> => ({ duration: 12, beats: 1, theme, starts: [0], spoken: [10],
    beatTexts: ["A caption plate with its progress stripe"], caption: "A caption plate with its progress stripe", effects: { caption: { from: 0 } } });
  const browser = await chromium.launch();
  try {
    for (const [token, value, m] of [...OVERLAY, ...OVERLAY_TEXT]) {
      // Обводка субтитров действует только у субтитров контуром (умолчание), а halo караоке — у плашки.
      const make = token === "--sc-cap-bar-size" || token === "--sc-cap-shadow" ? capScene
        : token === "--sc-sub-outline-shadow" ? (t: ThemeVars) => ({ ...scene(t), captionLook: "outline" }) : scene;
      const at = token === "--sc-cursor-size" || token === "--sc-cursor-line-width" || token === "--sc-cursor-shadow" ? 1.2 : 3;
      const a = await mount(browser, file, make(BASE), at), before = await read(a, m); await a.context().close();
      const b = await mount(browser, file, make({ ...BASE, [token]: value }), at), after = await read(b, m); await b.context().close();
      assert.ok(typeof before === "number" ? Number.isFinite(before) : before !== "", `${token}: ${m.sel} is drawn`);
      if (typeof before === "number") {
        assert.ok(Math.abs((after as number) - before) > 0.5, `${token}: ${m.sel} changes when the token changes (${before} → ${after})`);
        if (token !== "--radius-pill" && !OVERLAY_TEXT.some(([t]) => t === token)) assert.ok((after as number) > before, `${token}: a larger token draws larger (${before} → ${after})`);
      } else {
        assert.notEqual(after, before, `${token}: ${m.sel} takes the token (${before} → ${after})`);
      }
    }
  } finally { await browser.close(); }
});

/** Сценарий со всеми видами слайдов; тема — имя или набор с правкой, как в шапке. */
function slides(themeSpec: string): string {
  const dir = mkdtempSync(join(tmpdir(), "sc-shape-slides-"));
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "color=c=0x808080:s=1600x1000", "-vf",
    "drawbox=x=0:y=0:w=1600:h=120:color=0x2040e0:t=fill", "-frames:v", "1", join(dir, "shot.png")]);
  writeFileSync(join(dir, "data.csv"), "Jan,12\nFeb,18\nMar,15\nApr,30\n");
  const kinds = `
## chapter · slides.chapter
kicker: CHAPTER
title: A chapter opens
body: The body line.

## compare · slides.compare
title: Compare
left: Before :: one | two
right: After :: three | four

## chain · slides.chain
title: Chain
nodes: Data | Slide | Video

## number · slides.number
title: Number
values: 220 :: characters
tags: one | two

## hero · slides.hero
kicker: Hero
title: A hero headline
body: The body.

## steps · slides.steps
title: Steps
items: One :: first | Two :: second | Three :: third

## features · slides.features
title: Features
items: 🎬 One :: first | 🔍 Two :: second

## timeline · slides.timeline
title: Timeline
items: W1 :: start | W4 :: users

## counter · slides.counter
title: Counter
values: 1,240 :: films | 98% :: cached

## chart · slides.chart
title: Chart
data: data.csv
peak: max

## line · slides.chart
title: Line
data: data.csv
type: line
peak: max

## code · slides.code
title: Code
code: const answer = await take(42);\\nconst next = answer + 1;
highlight: 1

## ba · slides.beforeafter
title: Before and after
image: shot.png
after: shot.png

## px · slides.parallax
title: Parallax
image: shot.png
panels: 0.1 0.3 0.3 0.3 @ 1

## pv · slides.perspective
title: Perspective
image: shot.png

## shot · slides.shot
title: Shot
image: shot.png
device: browser app.example.com

## phone · slides.shot
title: Phone
image: shot.png
device: phone

## outro · slides.outro
title: The end
cta: npx agentic-screencast
`.split("\n## ").map((b, i) => (i === 0 ? b : `## ${b}\nduration: 8\n\nOne line.\n`)).join("\n");
  writeFileSync(join(dir, "story.md"), `# Shapes\nlang: en\nvoice: {"engine":"stub","name":"silent","cps":15}\nframe: {"width":1280,"height":720,"fps":25,"scale":1}\ntheme: ${themeSpec}\n${kinds}`);
  return join(dir, "story.md");
}

/** Слайдовые токены формы: вид слайда, значение, мерка. */
const SLIDES: Array<[string, string, string, Measure, number?]> = [
  ["--radius-sm", "30px", "chart", px(".chart-bar", "borderTopLeftRadius")],
  ["--radius-md", "40px", "chain", px(".node", "borderTopLeftRadius")],
  ["--radius-lg", "44px", "compare", px(".col", "borderTopLeftRadius")],
  ["--radius-xl", "50px", "features", px(".feat", "borderTopLeftRadius")],
  ["--space-xs", "20px", "compare", px(".col li", "paddingTop")],
  ["--space-s", "30px", "number", px(".tag", "paddingTop")],
  ["--space-m", "40px", "chain", px(".node", "paddingTop")],
  ["--space-l", "50px", "chain", px(".node", "paddingLeft")],
  ["--space-xl", "60px", "compare", px(".col", "paddingTop")],
  ["--space-2xl", "70px", "counter", px(".ctr", "paddingTop")],
  ["--space-3xl", "80px", "outro", px(".outro-cta span", "paddingLeft")],
  ["--hairline", "6px", "compare", px(".col", "borderTopWidth")],
  ["--rule-size", "12px", "chapter", box(".chapter-line", "height")],
  ["--rail-size", "10px", "steps", box(".steps-rail", "width")],
  ["--ring-size", "8px", "steps", px(".step-n", "borderTopWidth")],
  ["--dot-ring", "10px", "timeline", px(".tl-dot", "borderTopWidth")],
  ["--ring-width", "20", "counter", px(".ring circle", "strokeWidth")],
  ["--chart-axis", "9px", "chart", px(".chart-plot", "borderBottomWidth")],
  ["--chart-line-width", "14", "line", px(".chart-path", "strokeWidth")],
  ["--chart-dot-ring", "11px", "line", px(".chart-dot", "borderTopWidth")],
  ["--ba-line-width", "14px", "ba", box(".ba-line", "width")],
  ["--dv-url-pad", "3em", "shot", px(".dv-url", "paddingLeft")],
  ["--dv-rim-width", "9px", "phone", px(".dv-phone", "outlineWidth")],
  ["--mono", "serif", "code", inked(".code .ln")],
  ["--display", "monospace", "hero", inked(".hero-title")],
  ["--sans", "monospace", "hero", inked(".hero-body")],
];
const SLIDES_TEXT: Array<[string, string, string, Measure, number?]> = [
  ["--shadow-3", "0 0 0 7px rgb(255, 0, 0)", "code", text(".code-win", "boxShadow")],
  ["--orbit-glow", "0 0 0 7px rgb(255, 0, 0)", "chapter", text(".chapter-orbit span:nth-child(3)", "boxShadow")],
  ["--step-halo", "0 0 0 7px rgb(255, 0, 0)", "steps", text(".step.on .step-n", "boxShadow")],
  ["--dot-halo", "0 0 0 7px rgb(255, 0, 0)", "timeline", text(".tl-dot", "boxShadow")],
  ["--code-hl-shadow", "inset 9px 0 0 rgb(255, 0, 0)", "code", text(".ln.hl", "boxShadow")],
  ["--code-hl-bar", "13px", "code", text(".ln.hl", "boxShadow")],
  ["--cta-glow", "0 0 0 7px rgb(255, 0, 0)", "outro", text(".outro-cta span", "boxShadow")],
  ["--ba-line-shadow", "0 0 0 7px rgb(255, 0, 0)", "ba", text(".ba-line", "boxShadow")],
  ["--dv-shadow", "0 0 0 7px rgb(255, 0, 0)", "phone", text(".dv-phone", "boxShadow")],
  ["--dv-browser-shadow", "0 0 0 7px rgb(255, 0, 0)", "shot", text(".dv-browser", "boxShadow")],
  ["--px-dim", "brightness(0.2)", "px", text(".px-base", "filter")],
  ["--code-caret", "9px 0 0 rgb(255, 0, 0)", "code", text(".code i.cur", "boxShadow"), 1.5],
  ["--kicker-case", "uppercase", "hero", text(".kicker", "textTransform")],
  ["--kicker-tracking", ".4em", "chapter", text(".chapter-kicker", "letterSpacing")],
];

test("every slide and device shape token changes the element that reads it", async () => {
  const browser = await chromium.launch();
  try {
    for (const [token, value, id, m, at = 6.5] of [...SLIDES, ...SLIDES_TEXT]) {
      const measure = async (spec: string): Promise<number | string> => {
        const g = generateFrom(slides(spec));
        const pitch = JSON.parse(readFileSync(g.pitchFile, "utf8")) as { scenes: Array<{ id: string; effects?: unknown }>; theme: ThemeVars };
        const p = await mount(browser, g.pages[id]!, { duration: 8, beats: 0, theme: pitch.theme, effects: pitch.scenes.find((s) => s.id === id)!.effects }, at);
        const v = await read(p, m);
        await p.context().close();
        return v;
      };
      const before = await measure("midnight"), after = await measure(JSON.stringify({ preset: "midnight", [token]: value }));
      assert.ok(typeof before === "number" ? Number.isFinite(before) : before !== "", `${token}: ${m.sel} is drawn on ${id}`);
      if (typeof before === "number") {
        assert.ok(Math.abs((after as number) - before) > 0.5, `${token}: ${m.sel} changes when the token changes (${before} → ${after})`);
        if (!["--mono", "--display", "--sans"].includes(token)) assert.ok((after as number) > before, `${token}: a larger token draws larger (${before} → ${after})`);
      } else assert.notEqual(after, before, `${token}: ${m.sel} takes the token (${before} → ${after})`);
    }
  } finally { await browser.close(); }
});

type RGB = [number, number, number];
const far = (a: RGB, b: RGB): number => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
const hexRgb = (hex: string): RGB => { const v = Number.parseInt(hex.trim().slice(1, 7), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
function decode(png: Buffer, w: number): (x: number, y: number) => RGB {
  const raw = rawOf(png);
  return (x, y) => { const i = (Math.round(y) * w + Math.round(x)) * 3; return [raw[i]!, raw[i + 1]!, raw[i + 2]!]; };
}
const frameAt = (file: string, t: number, w: number): ((x: number, y: number) => RGB) =>
  decode(execFileSync(ffmpeg, ["-loglevel", "error", "-ss", String(t), "-i", file, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"]), w);
/** Сколько точек подряд от (x, y) шагом (dx, dy) имеют цвет c: толщина нарисованной полосы. */
function run(px: (x: number, y: number) => RGB, x: number, y: number, dx: number, dy: number, c: RGB, tol: number, limit = 200): number {
  let n = 0, seen = false;
  for (let k = 0; k < limit; k++) {
    const hit = far(px(x + dx * k, y + dy * k), c) <= tol;
    if (hit) { n++; seen = true; } else if (seen) break;
  }
  return n;
}
/** Меняет величину: запись «до → после» и требование, что после больше (или просто иначе). */
function grows(token: string, before: number, after: number, larger = true): void {
  assert.ok(Number.isFinite(before) && Number.isFinite(after), `${token}: measured (${before} → ${after})`);
  if (larger) assert.ok(after > before + 0.5, `${token}: a larger token draws larger (${before} → ${after})`);
  else assert.ok(Math.abs(after - before) > 0.5, `${token}: the drawing changes with the token (${before} → ${after})`);
}

test("canvas-drawn marks, sparks and the click ripple follow their theme tokens", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-shape-cv-"));
  const file = join(dir, "page.html");
  writeFileSync(file, PAGE);
  // Толщину искр рисует холст: запоминаем наибольшую толщину линии, которую страница задала.
  const LW = `(() => { const d = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, "lineWidth");
    window.__lw = 0; Object.defineProperty(CanvasRenderingContext2D.prototype, "lineWidth", { get() { return d.get.call(this); },
    set(v) { window.__lw = Math.max(window.__lw, v); d.set.call(this, v); }, configurable: true }); })();`;
  const cases: Array<[string, string, Record<string, unknown>, number, Measure]> = [
    ["--sc-mark-head", ".05", { marks: [{ at: 0.2, kind: "arrow", target: "#ui", draw: 0.4, hold: 20 }] }, 2,
      { sel: "body", read: "(() => { const h = document.querySelector('.__mark-head').getBBox(); return h.width + h.height; })()" }],
    ["--sc-mark-wobble", ".02", { marks: [{ at: 0.2, kind: "underline", target: "#ui", draw: 0.4, hold: 20 }] }, 2,
      { sel: ".__mark-body", read: "e.getBBox().height" }],
    ["--sc-ripple-size", ".1", { pointer: [{ at: 0.2, x: 0.5, y: 0.5 }, { at: 1, x: 0.5, y: 0.5, click: true }] }, 1.2, box("#__rip", "width")],
    ["--sc-spark-width", ".01", { bursts: [{ at: 0.5, kind: "sparks", target: "#ui" }] }, 0.8, { sel: "body", read: "window.__lw" }],
  ];
  const browser = await chromium.launch();
  try {
    for (const [token, value, over, at, m] of cases) {
      const measure = async (theme: ThemeVars): Promise<number> => {
        const ctx = await browser.newContext({ viewport: { width: W, height: H } });
        await ctx.addInitScript({ content: LW });
        await ctx.addInitScript({ content: CLOCK });
        await ctx.addInitScript({ content: STAGE });
        const p = await ctx.newPage();
        await p.goto(pathToFileURL(file).href);
        await p.evaluate((s) => window.__stage.mount(s as never), { duration: 12, beats: 0, theme, target: "#ui", effects: {}, overlay: parseOverlay(JSON.stringify(over)) });
        for (let t = 0; t <= at; t += 0.1) await p.evaluate((tt) => window.__clock.seek(tt), Math.min(t, at));
        const v = await read(p, m) as number;
        await ctx.close();
        return v;
      };
      grows(token, await measure(BASE), await measure({ ...BASE, [token]: value }));
    }
  } finally { await browser.close(); }
});

test("the live take's click ring and key caps follow their theme tokens", async () => {
  const { installCaptureOverlay } = await import("../../capture-overlay.js");
  // Слой дубля закрыт в теневом корне; для замера корень открывается до его установки.
  const OPEN = `(() => { const a = Element.prototype.attachShadow; Element.prototype.attachShadow = function (o) { const r = a.call(this, { ...o, mode: "open" }); window.__sr = r; return r; }; })();`;
  const cases: Array<[string, string, string, string]> = [
    ["--sc-spot-width", "calc(var(--u)*0.8)", ".ripple", "parseFloat(getComputedStyle(e).borderTopWidth)"],
    ["--sc-keys-radius", "30px", "#keys kbd", "parseFloat(getComputedStyle(e).borderTopLeftRadius)"],
    ["--sc-keys-size", "50px", "#keys kbd", "parseFloat(getComputedStyle(e).fontSize)"],
    ["--sc-keys-pad", "30px 40px", "#keys kbd", "parseFloat(getComputedStyle(e).paddingLeft)"],
  ];
  const page = join(mkdtempSync(join(tmpdir(), "sc-shape-take-")), "page.html");
  writeFileSync(page, `<!doctype html><body style="margin:0;background:#fff"><button id="b" style="position:absolute;left:500px;top:300px;width:160px;height:60px">Go</button></body>`);
  const browser = await chromium.launch();
  try {
    for (const [token, value, sel, expr] of cases) {
      const measure = async (theme: ThemeVars): Promise<number> => {
        const ctx = await browser.newContext({ viewport: { width: W, height: H } });
        await ctx.addInitScript({ content: OPEN });
        await ctx.addInitScript(installCaptureOverlay, { theme });
        const p = await ctx.newPage();
        // Страница грузится адресом: у setContent документ сменяется в том же окне, и слой, уже
        // поставленный на about:blank, второй раз не ставится.
        await p.goto(pathToFileURL(page).href);
        await p.mouse.move(580, 330);
        await p.mouse.click(580, 330);
        await p.evaluate(() => (window as unknown as Record<string, { key: (l: string) => void }>).__agenticScreencastCapture_v1!.key("Ctrl+K"));
        const v = await p.evaluate(({ s, x }) => {
          const e = (window as unknown as { __sr: ShadowRoot }).__sr.querySelector(s);
          return e ? (new Function("e", `return (${x});`)(e) as number) : Number.NaN;
        }, { s: sel, x: expr });
        await ctx.close();
        return v;
      };
      grows(token, await measure(BASE), await measure({ ...BASE, [token]: value }));
    }
  } finally { await browser.close(); }
});

test("the perspective screen, the live background and the geometric transitions follow their strength tokens", async () => {
  const browser = await chromium.launch();
  try {
    /** Точки экрана в перспективе на нескольких мгновениях: наибольшая яркость и снимок для сравнения. */
    const pvShot = async (spec: string): Promise<{ peak: number; bottom: number }> => {
      const g = generateFrom(slides(spec));
      const pitch = JSON.parse(readFileSync(g.pitchFile, "utf8")) as { scenes: Array<{ id: string; effects?: unknown }>; theme: ThemeVars };
      const p = await mount(browser, g.pages.pv!, { duration: 8, beats: 0, theme: pitch.theme, effects: pitch.scenes.find((s) => s.id === "pv")!.effects }, 0);
      let peak = 0, bottom = 0, nb = 0;
      for (const t of [1.2, 1.8, 2.4, 3.0, 3.6]) {
        await p.evaluate((tt) => window.__clock.seek(tt), t);
        const px = decode(await p.screenshot(), W);
        const cv = await p.evaluate(() => { const r = document.querySelector(".pv-cv")!.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
        for (let y = cv.y + cv.h * 0.2; y < cv.y + cv.h * 0.7; y += 3) for (let x = cv.x + 4; x < cv.x + cv.w - 4; x += 3) {
          const c = px(x, y), v = c[0] + c[1] + c[2];
          peak = Math.max(peak, v);
        }
        // Отражение — под экраном, в нижней пятой холста.
        for (let y = cv.y + cv.h * 0.82; y < cv.y + cv.h * 0.98; y += 3) for (let x = cv.x + 4; x < cv.x + cv.w - 4; x += 3) { const c = px(x, y); bottom += c[0] + c[1] + c[2]; nb++; }
      }
      await p.context().close();
      return { peak, bottom: bottom / nb };
    };
    const base = await pvShot("midnight");
    // Блик серого снимка в midnight уже упирается в белый, поэтому сила сравнивается слабая против обычной.
    grows("--pv-glint-strength", (await pvShot(JSON.stringify({ preset: "midnight", "--pv-glint-strength": ".05" }))).peak, base.peak);
    grows("--pv-reflection", base.bottom, (await pvShot(JSON.stringify({ preset: "midnight", "--pv-reflection": "1" }))).bottom);
    // --pv-shade — яркость отражения: при нуле отражение гаснет.
    grows("--pv-shade", (await pvShot(JSON.stringify({ preset: "midnight", "--pv-shade": "0" }))).bottom, base.bottom);
    // Живой фон: отклонение пустой полосы кадра от --bg растёт с силой фона, а имя фона меняет картину.
    const band = async (spec: Record<string, string>): Promise<{ dev: number; px: RGB[] }> => {
      const g = generateFrom(slides(JSON.stringify({ preset: "midnight", ...spec })));
      const pitch = JSON.parse(readFileSync(g.pitchFile, "utf8")) as { scenes: Array<{ id: string; effects?: unknown }>; theme: ThemeVars };
      const p = await mount(browser, g.pages.hero!, { duration: 8, beats: 0, theme: pitch.theme, effects: pitch.scenes.find((s) => s.id === "hero")!.effects }, 4);
      const px = decode(await p.screenshot(), W), bg = hexRgb(pitch.theme["--bg"]!), out: RGB[] = [];
      let dev = 0;
      for (let y = H * 0.85; y < H * 0.98; y += 3) for (let x = 20; x < W - 20; x += 5) { const c = px(x, y); out.push(c); dev += Math.abs(c[0] - bg[0]) + Math.abs(c[1] - bg[1]) + Math.abs(c[2] - bg[2]); }
      await p.context().close();
      return { dev: dev / out.length, px: out };
    };
    const grid = await band({}), aurora = await band({ "--bg-motion": "aurora" });
    const changed = grid.px.filter((c, i) => far(c, aurora.px[i]!) > 6).length / grid.px.length;
    grows("--bg-motion", 0, changed * 100);
    grows("--bg-intensity", (await band({ "--bg-motion": "aurora", "--bg-intensity": ".1" })).dev, (await band({ "--bg-motion": "aurora", "--bg-intensity": "1.2" })).dev);
  } finally { await browser.close(); }
  // Затенение уходящей грани куба: чем сильнее --tr-shade, тем темнее первая сцена на середине.
  const dir = mkdtempSync(join(tmpdir(), "sc-shape-tr-"));
  const TW = 320, TH = 180;
  const shots = (name: string): string[] => [...Array(8).keys()].map((k) => {
    const f = join(dir, `${name}${k}.png`);
    execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-f", "lavfi", "-i", `color=c=0xc0c0c0:s=${TW}x${TH}`, "-frames:v", "1", f]);
    return f;
  });
  const a = shots("a"), b = shots("b");
  const lum = async (theme: ThemeVars, tag: string): Promise<number> => {
    const got = await renderTransition({ kind: "cube", a, b, width: TW, height: TH, out: join(dir, tag), theme });
    const c = decode(readFileSync(got.frames[4]!), TW)(TW * 0.15, TH / 2);
    return c[0] + c[1] + c[2];
  };
  grows("--tr-shade", await lum({ ...BASE, "--tr-shade": ".9" }, "strong"), await lum(BASE, "base"));
});

test("the loupe ring, the presenter ring and the progress bar drawn by ffmpeg follow their size tokens", async () => {
  const { loupeGraph } = await import("../../loupe.js");
  const { filmPass } = await import("../../film.js");
  const FW = 640, FH = 360;
  const dir = mkdtempSync(join(tmpdir(), "sc-shape-ff-"));
  const src = join(dir, "src.mp4"), face = join(dir, "face.mp4");
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", `color=c=0x808080:s=${FW}x${FH}:r=10:d=2`, "-c:v", "libx264", "-pix_fmt", "yuv444p", src]);
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "color=c=0x202020:s=160x160:r=10:d=2", "-c:v", "libx264", "-pix_fmt", "yuv420p", face]);
  const ringOf = (theme: ThemeVars): RGB => hexRgb(theme["--sc-loupe-ring"]!);
  const loupe = (theme: ThemeVars, tag: string): number => {
    const out = join(dir, `loupe-${tag}.mp4`);
    const graph = loupeGraph([{ loupe: { at: 0.2, target: "#t", scale: 2, size: 0.3, hold: 3 } as never, rect: { left: 260, top: 140, width: 120, height: 80 } }], { width: FW, height: FH }, theme);
    execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-i", src, "-filter_complex", graph, "-map", "[v]", "-c:v", "libx264", "-pix_fmt", "yuv444p", "-crf", "8", out]);
    const D = Math.round(0.3 * FW / 2) * 2;
    return run(frameAt(out, 1, FW), 320 + D / 2 - 1, 180, -1, 0, ringOf(theme), 40);
  };
  grows("--sc-loupe-ring-width", loupe(BASE, "a"), loupe({ ...BASE, "--sc-loupe-ring-width": ".06" }, "b"));
  const film = async (theme: ThemeVars, tag: string): Promise<{ bar: number; ring: number }> => {
    const out = join(dir, `film-${tag}.mp4`);
    await filmPass({ input: src, output: out, cache: join(dir, "cache"), srcDir: dir, scenes: [], total: 2, theme,
      frame: { width: FW, height: FH, fps: 10 }, encode: { crf: 8, preset: "veryfast", pix: "yuv444p" },
      progress: { position: "bottom", parts: false }, pip: { file: "face.mp4", size: 0.3 } });
    const px = frameAt(out, 1.5, FW);
    const D = Math.round(0.3 * FW / 2) * 2, margin = Math.round(FW * 0.03);
    return { bar: run(px, 6, FH - 1, 0, -1, hexRgb(theme["--sc-progress"]!), 40),
      ring: run(px, FW - margin - 1, FH - margin - D / 2, -1, 0, hexRgb(theme["--sc-pip-ring"]!), 48) };
  };
  const a = await film(BASE, "a"), b = await film({ ...BASE, "--sc-progress-size": ".03", "--sc-pip-ring-width": ".08" }, "b");
  grows("--sc-progress-size", a.bar, b.bar);
  grows("--sc-pip-ring-width", a.ring, b.ring);
});

test("every non-colour token is measured by a test of this file", () => {
  const self = readFileSync(join(here, "..", "..", "..", "src", "tests", "e2e", "theming-shape.test.ts"), "utf8");
  assert.deepEqual(NON_COLOUR_TOKENS.filter((k) => !self.includes(`"${k}"`)), []);
});
