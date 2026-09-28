// Отступы и выравнивание: однотипные элементы слоя стоят по одной мере. У подложек (карточка,
// нижний титр, выноска, плашка подписи) внутренний отступ — один шаг темы; элементы, привязанные
// к кадру (карточка, нижний титр, титр, субтитры), отстоят от края безопасной зоны на один шаг
// `--sc-edge`; привязанное к низу стоит над полосой субтитров с тем же шагом; выноски — внутри
// зоны. Блоки слайдов начинаются на одной левой границе. Меряется отрисованный кадр.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { parseOverlay } from "../../overlay.js";
import { generateFrom } from "../../generate.js";
import { THEMES } from "../../theme.js";

const here = dirname(fileURLToPath(import.meta.url));
const CLOCK = readFileSync(resolve(here, "..", "..", "browser", "clock.js"), "utf8");
const STAGE = readFileSync(resolve(here, "..", "..", "browser", "stage.js"), "utf8");
const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;

type Box = { pad: [number, number]; left: number; top: number; right: number; bottom: number };
interface Measured { edge: number; u: number; sub: number; zone: { l: number; t: number; r: number; b: number }; els: Record<string, Box> }

const FORMATS: Array<{ name: string; W: number; H: number; safe?: Record<string, number> }> = [
  { name: "landscape", W: 1280, H: 720 },
  { name: "vertical", W: 1080, H: 1920, safe: { top: 170, bottom: 484, left: 65, right: 180 } },
];

async function measure(f: typeof FORMATS[number], overlay: Record<string, unknown>, captions: boolean): Promise<Measured> {
  const dir = mkdtempSync(join(tmpdir(), "sc-space-"));
  const file = join(dir, "p.html");
  writeFileSync(file, `<!doctype html><body style="margin:0;background:#445"><div id="ui" style="position:absolute;left:${f.W * 0.5}px;top:${f.H * 0.4}px;width:200px;height:100px;background:#667"></div></body>`);
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: f.W, height: f.H } });
    await ctx.addInitScript({ content: CLOCK });
    await ctx.addInitScript({ content: STAGE });
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(file).href);
    await p.evaluate((s) => window.__stage.mount(s as never), { duration: 12, beats: 1, theme: THEMES.midnight, starts: [0], spoken: [10],
      ...(f.safe ? { safe: f.safe } : {}), ...(captions ? { captionStyle: "karaoke", captionLook: "plate", captionEverywhere: true } : {}),
      beatTexts: ["Every word lights up while it is spoken"], target: "#ui", effects: {}, overlay: parseOverlay(JSON.stringify(overlay)) });
    await p.evaluate(() => window.__clock.seek(3));
    return await p.evaluate(() => {
      const st = getComputedStyle(document.querySelector("#__st")!);
      const n = (k: string): number => parseFloat(st.getPropertyValue(k));
      const zone = { l: n("--sl"), t: n("--st"), r: innerWidth - n("--sr"), b: innerHeight - n("--sb") };
      const probe = document.createElement("div");
      probe.style.cssText = "position:absolute;width:var(--sc-edge);height:var(--u);font-size:var(--sub-size)";
      document.querySelector("#__st")!.appendChild(probe);
      const edge = probe.getBoundingClientRect().width, u = probe.getBoundingClientRect().height, sub = parseFloat(getComputedStyle(probe).fontSize);
      probe.remove();
      const els: Record<string, Box> = {};
      for (const [name, sel] of [["card", ".__card"], ["lower", ".__lower"], ["callout", ".__callout"], ["title", ".__title"], ["cap", "#__cap"], ["sub", "#__sub"], ["subLine", "#__sub .__line"]]) {
        const e = document.querySelector(sel!) as HTMLElement | null;
        if (!e || getComputedStyle(e).display === "none") continue;
        // Положение по вёрстке, без «дыхания» и въезда: трансформация на время замера снята.
        const tf = e.style.transform; e.style.transform = "none";
        const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
        e.style.transform = tf;
        els[name!] = { pad: [parseFloat(cs.paddingTop), parseFloat(cs.paddingLeft)], left: r.left - zone.l, top: r.top - zone.t, right: zone.r - r.right, bottom: zone.b - r.bottom };
      }
      return { edge, u, sub, zone, els };
    });
  } finally { await browser.close(); }
}

const near = (a: number, b: number, what: string): void => assert.ok(Math.abs(a - b) <= 1, `${what}: ${a.toFixed(1)} ≠ ${b.toFixed(1)}`);

test("plates share one inner padding, and frame-anchored elements stand one step from the safe zone", async () => {
  for (const f of FORMATS) {
    for (const [side, pos, tpos] of [["left", "top-left", "top"], ["right", "bottom-right", "bottom"]] as const) {
      const m = await measure(f, {
        cards: [{ at: 0.2, title: "Orders", body: "Up eighteen percent", position: pos, hold: 20 }],
        lower: [{ at: 0.2, title: "Route planner", subtitle: "Illustrative", side, hold: 20 }],
        callouts: [{ at: 0.2, text: "Closed", target: "#ui", hold: 20 }],
        titles: [{ at: 0.2, text: "Claim", style: "rise", position: tpos, hold: 20 }],
      }, true);
      const e = m.els, tag = `${f.name} ${side}`;
      // Внутренний отступ: карточка, нижний титр и выноска — один и тот же шаг; у строки субтитров
      // тот же шаг по горизонтали.
      for (const k of ["lower", "callout"]) { near(e[k]!.pad[0], e.card!.pad[0], `${tag}: ${k} top padding`); near(e[k]!.pad[1], e.card!.pad[1], `${tag}: ${k} side padding`); }
      near(e.subLine!.pad[1], e.card!.pad[1], `${tag}: subtitle line side padding`);
      // Край, обращённый к краю зоны, — на шаг от него.
      near(e.card![side], m.edge, `${tag}: card ${side}`);
      // Карточка сверху — на шаг от зоны; снизу — на линии нижнего титра, над полосой субтитров.
      if (pos.startsWith("top")) near(e.card!.top, m.edge, `${tag}: card top edge`);
      else near(e.card!.bottom, e.lower!.bottom, `${tag}: bottom card above the subtitle band`);
      near(e.lower![side], m.edge, `${tag}: lower third ${side}`);
      near(e.sub!.bottom, m.edge, `${tag}: subtitles bottom`);
      if (tpos === "top") near(e.title!.top, m.edge, `${tag}: top title`);
      // Привязанное к низу — над полосой двух строк субтитров с тем же шагом. Кегль субтитров берётся
      // из самого слоя (--sub-size), а не повторяется числом здесь: число устаревало при смене кегля.
      const band = 2.6 * m.sub + m.edge;
      near(e.lower!.bottom, m.edge + band, `${tag}: lower third above the subtitle band`);
      if (tpos === "bottom") near(e.title!.bottom, e.lower!.bottom, `${tag}: bottom title on the lower third's line`);
      // Выноска — внутри зоны.
      assert.ok(e.callout!.left >= 0 && e.callout!.right >= 0 && e.callout!.top >= 0 && e.callout!.bottom >= 0, `${tag}: the callout is inside the zone`);
    }
    // Без субтитров привязанное к низу стоит на шаг от края зоны.
    const plain = await measure(f, { lower: [{ at: 0.2, title: "Route planner", side: "left", hold: 20 }], titles: [{ at: 0.2, text: "Claim", style: "rise", position: "bottom", hold: 20 }],
      cards: [{ at: 0.2, title: "Orders", body: "Up", position: "bottom-right", hold: 20 }] }, false);
    near(plain.els.card!.bottom, plain.edge, `${f.name}: bottom card without subtitles`);
    near(plain.els.lower!.bottom, plain.edge, `${f.name}: lower third bottom without subtitles`);
    near(plain.els.title!.bottom, plain.edge, `${f.name}: bottom title without subtitles`);
  }
});

test("on every slide kind the kicker, the title and the content start on one left edge", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-space-slides-"));
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "color=c=0x808080:s=1600x1000", "-frames:v", "1", join(dir, "shot.png")]);
  writeFileSync(join(dir, "data.csv"), "Jan,12\nFeb,18\nMar,15\nApr,30\n");
  // Вид слайда: поля и блоки его содержимого.
  const kinds: Record<string, [string, string[]]> = {
    chapter: ["body: The body line.", [".chapter-title", ".chapter-body"]],
    compare: ["left: Before :: one | two\nright: After :: three | four", [".cols"]],
    chain: ["nodes: Data | Slide | Video", [".chain"]],
    number: ["values: 220 :: characters\ntags: one | two", [".pair", ".tags"]],
    quote: ["parts: Slides are drawn :: from data | Frames are cached :: per scene", [".quote"]],
    hero: ["body: The body.", [".hero-copy"]],
    steps: ["items: One :: first | Two :: second", [".steps"]],
    features: ["items: 🎬 One :: first | 🔍 Two :: second", [".feats"]],
    timeline: ["items: W1 :: start | W4 :: users", [".tl"]],
    counter: ["values: 1,240 :: films | 98% :: cached", [".ctrs"]],
    chart: ["data: data.csv", [".chart"]],
    code: ["code: const answer = await take(42);", [".code-win"]],
    beforeafter: ["image: shot.png\nafter: shot.png", [".ba"]],
    parallax: ["image: shot.png\npanels: 0.1 0.3 0.3 0.3 @ 1", [".px"]],
    perspective: ["image: shot.png", [".pv"]],
    shot: ["image: shot.png", [".shot-copy"]],
    photo: ["image: shot.png", [".photo-cap"]],
  };
  const browser = await chromium.launch();
  try {
    for (const [format, W, H] of [["", 1280, 720], ["format: vertical\n", 1080, 1920]] as const) {
      let story = `# A\nlang: en\nvoice: {"engine":"stub","name":"silent","cps":15}\n${format || 'frame: {"width":1280,"height":720,"fps":25,"scale":1}\n'}`;
      for (const [k, [body]] of Object.entries(kinds)) story += `\n## ${k} · slides.${k}\nkicker: ${k.toUpperCase()}\ntitle: The ${k} title\n${body}\nduration: 8\n\nOne line.\n`;
      writeFileSync(join(dir, "story.md"), story);
      const g = generateFrom(join(dir, "story.md"));
      const pitch = JSON.parse(readFileSync(g.pitchFile, "utf8")) as { scenes: Array<{ id: string; effects?: unknown }>; theme: unknown; safe?: unknown };
      for (const [k, [, blocks]] of Object.entries(kinds)) {
        const ctx = await browser.newContext({ viewport: { width: W, height: H } });
        await ctx.addInitScript({ content: CLOCK });
        await ctx.addInitScript({ content: STAGE });
        const p = await ctx.newPage();
        await p.goto(pathToFileURL(g.pages[k]!).href);
        await p.evaluate((sc) => window.__stage.mount(sc as never), { duration: 8, beats: 0, theme: pitch.theme,
          effects: pitch.scenes.find((x) => x.id === k)!.effects, ...(pitch.safe ? { safe: pitch.safe } : {}) });
        await p.evaluate(() => window.__clock.seek(6.5));
        // Левый край по вёрстке (без плавания элементов) относительно левой границы слайда `--pad-l`;
        // рамка блока не считается сдвигом.
        const edges = await p.evaluate((sels) => {
          // Край на экране относительно левого края поля: вписанный слайд уменьшен (\`zoom\`), и
          // смещения родителей там в разных масштабах, поэтому меряется видимое положение.
          // Движение (дрейф камеры, плавание, въезд) — не вёрстка: трансформации сняты на время замера.
          for (const n of document.querySelectorAll<HTMLElement>("body, body *")) n.style.transform = "none";
          const padL = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--pad-l"));
          const box = (document.querySelector(".k-in") ?? document.body) as HTMLElement;
          const br = box.getBoundingClientRect(), k = br.width / (box.offsetWidth || 1);
          const edge = br.left + padL * k;
          return sels.map((sel) => {
            const e = document.querySelector(sel) as HTMLElement | null;
            if (!e || !e.offsetWidth) return [sel, null] as const;
            return [sel, (e.getBoundingClientRect().left - edge) / k] as const;
          });
        }, [".kicker, .chapter-kicker", "h1", ...blocks]);
        await ctx.close();
        for (const [sel, x] of edges) {
          assert.ok(x !== null, `${W}x${H} ${k}: ${sel} is drawn`);
          assert.ok(Math.abs(x) <= 1, `${W}x${H} ${k}: ${sel} starts ${x!.toFixed(1)} px off the slide's left edge`);
        }
      }
    }
  } finally { await browser.close(); }
});
