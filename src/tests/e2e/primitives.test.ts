// Текстовые примитивы слоя композиции: титры, нижний титр, выноска, стикеры,
// субтитры с подсветкой слова. Каждый проверяется по кадру, а не по данным:
// примитив, который разобрался, но не нарисовался, для зрителя не существует.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { chromium, type Page } from "playwright";
import { parseOverlay } from "../../overlay.js";
import { parseCaptions, parsePip, parseProgress } from "../../source.js";
import { emojiImage, emojiIn, emojiMap, notoName } from "../../emoji.js";
import { stickerImage } from "../../stage-assets.js";
import { rawOf } from "../support.js";
import { THEMES } from "../../theme.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const here = dirname(fileURLToPath(import.meta.url));
const CLOCK = readFileSync(resolve(here, "..", "..", "browser", "clock.js"), "utf8");
const STAGE = readFileSync(resolve(here, "..", "..", "browser", "stage.js"), "utf8");

const page = (html = "<div id='ui' style='position:absolute;left:380px;top:260px;width:240px;height:120px;"
  + "background:#2b6;border-radius:12px'></div><div style='position:absolute;left:40px;top:40px;"
  + "font:22px system-ui;color:#9ab'>Settings · Billing · Team · Reports · Export</div>"): string => {
  const dir = mkdtempSync(join(tmpdir(), "sc-prim-"));
  const file = join(dir, "page.html");
  writeFileSync(file, `<!doctype html><html><body style="margin:0;background:#101826">${html}</body></html>`);
  return file;
};

async function withStage(scene: Record<string, unknown>, run: (p: Page) => Promise<void>,
  file = page()): Promise<void> {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await ctx.addInitScript({ content: CLOCK });
    await ctx.addInitScript({ content: STAGE });
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(file).href);
    await p.evaluate((s) => window.__stage.mount(s as never),
      { duration: 12, beats: 1, theme: THEMES.midnight, ...scene });
    await run(p);
  } finally {
    await browser.close();
  }
}

const seek = (p: Page, t: number): Promise<void> => p.evaluate((tt) => window.__clock!.seek(tt), t);

/** Прямоугольник элемента на экране. */
const box = (p: Page, sel: string): Promise<{ x: number; y: number; w: number; h: number } | null> =>
  p.evaluate((s) => {
    const n = document.querySelector(s) as HTMLElement | null;
    if (!n || getComputedStyle(n).display === "none") return null;
    const r = n.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }, sel);

/**
 * Контраст надписи с подложкой по пикселям снимка: отношение яркостей
 * светлых и тёмных пикселей области по формуле WCAG. Меряется то, что видит
 * зритель, а не цвета из правил: тема могла перебить подложку.
 */
async function contrast(p: Page, r: { x: number; y: number; w: number; h: number }): Promise<number> {
  const png = await p.screenshot({ clip: { x: Math.max(0, r.x), y: Math.max(0, r.y),
    width: Math.max(4, Math.min(r.w, 1280 - r.x)), height: Math.max(4, Math.min(r.h, 720 - r.y)) } });
  const raw = rawOf(png);
  const lum: number[] = [];
  const lin = (c: number): number => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  for (let i = 0; i + 2 < raw.length; i += 3) lum.push(0.2126 * lin(raw[i]!) + 0.7152 * lin(raw[i + 1]!) + 0.0722 * lin(raw[i + 2]!));
  lum.sort((a, b) => a - b);
  const lo = lum[Math.floor(lum.length * 0.05)]!, hi = lum[Math.floor(lum.length * 0.98)]!;
  return (hi + 0.05) / (lo + 0.05);
}

/** Примитив виден, лежит внутри кадра и читается. */
async function assertReadable(p: Page, sel: string): Promise<void> {
  const r = await box(p, sel);
  assert.ok(r, `${sel} is drawn`);
  assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= 1280 && r.y + r.h <= 720, `${sel} stays inside the frame: ${JSON.stringify(r)}`);
  const c = await contrast(p, r);
  assert.ok(c >= 3, `${sel}: contrast ${c.toFixed(2)} ≥ 3`);
}

test("new overlay primitives and film headers validate their input", () => {
  const o = parseOverlay(JSON.stringify({
    titles: [{ at: 0.2, text: "Built for speed", style: "slam" }],
    lower: [{ at: 3, title: "Ada Lovelace", subtitle: "Engineer" }],
    callouts: [{ at: 7, text: "Here", target: "#ui" }],
    stickers: [{ at: 1, emoji: "🚀", point: [0.5, 0.5] }],
  }));
  assert.ok((o.titles![0]!.hold ?? 0) >= 2.2);
  assert.throws(() => parseOverlay('{"titles":[{"at":0,"text":"x","style":"boom"}]}'), /style/);
  assert.throws(() => parseOverlay('{"callouts":[{"at":0,"text":"x"}]}'), /name the subject/);
  assert.throws(() => parseOverlay('{"callouts":[{"at":0,"text":"x","target":"#a","point":[0.1,0.1]}]}'), /one of/);
  assert.throws(() => parseOverlay('{"stickers":[{"at":0,"emoji":"🚀","text":"new","point":[0.1,0.1]}]}'), /exactly one/);
  assert.throws(() => parseOverlay('{"lower":[{"at":0,"title":"Name","subtitle":"A long role that needs time","hold":1}]}'), /needed to read/);
  assert.deepEqual(parseCaptions('{"style":"karaoke","srt":true}'), { style: "karaoke", srt: true });
  assert.throws(() => parseCaptions('{"style":"marquee"}'), /captions.style/);
  assert.throws(() => parsePip('{"file":"me.mp4","size":0.9}'), /pip.size/);
  assert.throws(() => parseProgress('{"position":"left"}'), /position/);
});

test("emoji come from the bundled Noto set, and the build refuses when the set is missing", () => {
  assert.deepEqual(emojiIn("Ship it 🚀 with ✨ and 👍🏽!"), ["🚀", "✨", "👍🏽"]);
  assert.equal(notoName("❤️"), "emoji_u2764.svg");
  assert.match(emojiImage("🚀"), /^data:image\/svg\+xml;base64,/);
  const empty = mkdtempSync(join(tmpdir(), "sc-emoji-empty-"));
  const saved = process.env.AGENTIC_SCREENCAST_EMOJI_SET;
  process.env.AGENTIC_SCREENCAST_EMOJI_SET = empty;
  try {
    assert.throws(() => emojiMap(["launch 🚀"]), /not in the bundled set/);
  } finally {
    if (saved === undefined) delete process.env.AGENTIC_SCREENCAST_EMOJI_SET;
    else process.env.AGENTIC_SCREENCAST_EMOJI_SET = saved;
  }
});

test("each primitive is drawn inside the frame and reads against what is under it", async () => {
  const overlay = parseOverlay(JSON.stringify({
    titles: [{ at: 0.2, text: "One choice, explained 🚀", style: "slam", hold: 3 }],
    lower: [{ at: 3.6, title: "Route planner", subtitle: "Illustrative prototype", hold: 3.5 }],
    callouts: [{ at: 7.4, text: "The chosen route keeps its reason", target: "#ui", hold: 3.5 }],
    stickers: [{ at: 7.6, text: "new", target: "#ui", hold: 3 }, { at: 3.8, emoji: "🚀", point: [0.8, 0.3], hold: 3 }],
  }));
  await withStage({ overlay, emoji: emojiMap(["🚀"]) }, async (p) => {
    await seek(p, 1.4);
    await assertReadable(p, ".__title");
    // Эмодзи в тексте титра — тоже картинка набора, а не шрифт машины.
    assert.equal(await p.evaluate(() => document.querySelectorAll(".__title img[data-emoji-set='noto']").length), 1);
    await seek(p, 5.2);
    await assertReadable(p, ".__lower");
    await seek(p, 9.4);
    await assertReadable(p, ".__callout");
    await assertReadable(p, ".__badge");
  });
});

test("a callout arrow ends inside its target, and titles and callouts type in without re-wrapping", async () => {
  const overlay = parseOverlay(JSON.stringify({
    titles: [{ at: 0.2, text: "Three thousand shapes move while the editor stays responsive", style: "type", hold: 8 }],
    callouts: [{ at: 7, text: "This panel shows the chosen route and the reason it won", target: "#ui", hold: 5 }],
  }));
  await withStage({ overlay }, async (p) => {
    await seek(p, 9.5);
    const end = await p.evaluate(() => (document.querySelector(".__arrow") as SVGPathElement).dataset.end!);
    const [ex, ey] = end.split(",").map(Number) as [number, number];
    const ui = (await box(p, "#ui"))!;
    assert.ok(ex >= ui.x && ex <= ui.x + ui.w && ey >= ui.y && ey <= ui.y + ui.h,
      `arrow end ${ex},${ey} lies inside the target ${JSON.stringify(ui)}`);
    for (const [sel, moments, full] of [[".__title", [0.8, 1.4, 2.0], 7.5], [".__callout", [7.4, 7.8], 11.5]] as const) {
      const glyphs = async (): Promise<Map<number, string>> => new Map(await p.evaluate((s) => {
        const root = document.querySelector(s) as HTMLElement;
        const o = root.getBoundingClientRect();
        return [...root.querySelectorAll<HTMLElement>(".__g")].map((g, i) => {
          const r = g.getBoundingClientRect();
          return [i, getComputedStyle(g).visibility === "hidden" ? "" : `${Math.round(r.left - o.left)},${Math.round(r.top - o.top)}`] as [number, string];
        });
      }, sel));
      await seek(p, full);
      const settled = await glyphs();
      assert.ok(settled.size > 20, `${sel} is split into glyphs`);
      for (const t of moments) {
        await seek(p, t);
        const now = await glyphs();
        const shown = [...now].filter(([, v]) => v);
        assert.ok(shown.length > 0 && shown.length < settled.size, `${sel} is half typed at ${t}s`);
        for (const [i, v] of shown) assert.equal(v, settled.get(i), `${sel} glyph ${i} stays in place at ${t}s`);
      }
    }
  });
});

test("an emoji sticker is an image from the bundled set and paints colour", async () => {
  const overlay = parseOverlay('{"stickers":[{"at":0.2,"emoji":"🚀","point":[0.5,0.5],"size":200,"hold":4}]}');
  await withStage({ overlay, emoji: emojiMap(["🚀"]) }, async (p) => {
    await seek(p, 2);
    const img = await p.evaluate(() => {
      const n = document.querySelector(".__sticker img") as HTMLImageElement;
      return { set: n.getAttribute("data-emoji-set"), src: n.src.slice(0, 26) };
    });
    assert.deepEqual(img, { set: "noto", src: "data:image/svg+xml;base64," });
    const r = (await box(p, ".__sticker"))!;
    const png = await p.screenshot({ clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
    const raw = rawOf(png);
    let coloured = 0;
    for (let i = 0; i + 2 < raw.length; i += 3) {
      const [r0, g0, b0] = [raw[i]!, raw[i + 1]!, raw[i + 2]!];
      if (Math.max(r0, g0, b0) - Math.min(r0, g0, b0) > 60) coloured++;
    }
    assert.ok(coloured > 500, `the sticker paints coloured pixels (${coloured})`);
  });
});

test("an animated GIF sticker follows scene time, not the browser's timer", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-gif-"));
  const gif = join(dir, "spin.gif");
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=120x120:rate=10:duration=2", gif]);
  const media = stickerImage(gif, dir);
  assert.ok((media.frames?.length ?? 0) > 10, "the GIF is decoded into frames");
  const overlay = parseOverlay('{"stickers":[{"at":0,"image":"spin.gif","point":[0.5,0.5],"size":240,"hold":8}]}');
  await withStage({ overlay, __stickers: [media] }, async (p) => {
    const shot = async (t: number): Promise<string> => {
      await seek(p, t);
      const r = (await box(p, ".__sticker"))!;
      return (await p.screenshot({ clip: { x: r.x, y: r.y, width: r.w, height: r.h } })).toString("base64");
    };
    const a = await shot(1.0), b = await shot(1.6), again = await shot(1.0);
    assert.notEqual(a, b, "two moments show different frames");
    assert.equal(a, again, "the same moment renders the same pixels");
  });
});

test("subtitles read against the frame and draw their emoji from the set", async () => {
  const text = "Launch day 🚀 every word stays readable over the interface";
  await withStage({ caption: text, captionStyle: "subtitle", captionEverywhere: true, emoji: emojiMap([text]),
    beatTexts: [text], starts: [0], spoken: 5, effects: { caption: { from: 0 } } }, async (p) => {
    await seek(p, 2);
    await assertReadable(p, "#__sub .__line");
    assert.equal(await p.evaluate(() => document.querySelectorAll("#__sub img[data-emoji-set='noto']").length), 1);
  });
});

test("karaoke highlights words in reading order, timed by the measured beat", async () => {
  const text = "Every word lights up as the narration reaches it";
  const now = async (starts: number[], spoken: number, t: number): Promise<number> => {
    let got = -1;
    await withStage({ caption: text, captionStyle: "karaoke", captionEverywhere: true,
      beatTexts: [text], starts, spoken, effects: { caption: { from: 0 } } }, async (p) => {
      await seek(p, t);
      got = await p.evaluate(() => Number((document.querySelector("#__sub .__now") as HTMLElement | null)?.dataset.i ?? -1));
    });
    return got;
  };
  const early = await now([0], 4, 0.6), late = await now([0], 4, 3.2);
  assert.ok(early >= 0 && late > early, `later moment highlights a later word (${early} → ${late})`);
  const slower = await now([0], 8, 3.2);
  assert.ok(slower < late, `a longer beat moves the same word later (${slower} < ${late})`);
});

test("subtitles live only in the screen half of a video layer, never in the zoomed half", async () => {
  const text = "Subtitles stay one size while the camera zooms the footage";
  for (const [part, shown] of [["scene", false], ["screen", true]] as const) {
    await withStage({ caption: text, captionStyle: "karaoke", captionEverywhere: true, beatTexts: [text], starts: [0], spoken: 5,
      effects: { caption: { from: 0 } }, __overlayOnly: true, __layerPart: part, __videoCamera: true,
      overlay: parseOverlay('{"camera":[{"at":3,"hold":1,"area":[0.2,0.2,0.3,0.3]}]}') }, async (p) => {
      await seek(p, 1.5);
      const visible = await p.evaluate(() => getComputedStyle(document.querySelector("#__sub")!).display !== "none");
      assert.equal(visible, shown, `${part} half ${shown ? "shows" : "hides"} the subtitles`);
    });
  }
});

test("subtitles stay on through a spotlight and give way only to a card laid over them", async () => {
  const text = "The words of this beat stay readable while the camera holds the subject for the viewer";
  const opacity = (p: Page): Promise<number> =>
    p.evaluate(() => Number(getComputedStyle(document.querySelector("#__sub")!).opacity));
  const base = { caption: text, captionStyle: "karaoke", captionEverywhere: true, beatTexts: [text], starts: [0], spoken: 8,
    effects: { caption: { from: 0 } } };
  // Камера держит цель с 1 по 6 с: субтитр такта остаётся на экране.
  await withStage({ ...base, overlay: parseOverlay('{"camera":[{"at":1,"hold":5,"area":[0.3,0.3,0.3,0.3]}]}') }, async (p) => {
    await seek(p, 3);
    assert.ok(await opacity(p) > 0.95, "a spotlight does not hide the spoken words");
  });
  // Карточка у нижнего края стоит над полосой субтитров: строка речи остаётся на экране.
  await withStage({ ...base, overlay: parseOverlay(
    '{"cards":[{"at":1,"title":"A card at the foot of the frame","body":"It stands above the subtitle line","position":"bottom-left","hold":5.5}]}') },
  async (p) => {
    await seek(p, 3);
    const s = await box(p, "#__sub"), c = await box(p, "#__cards > *");
    assert.ok(s && c && c.y + c.h <= s.y, "the bottom card stands above the subtitle");
    assert.ok(await opacity(p) > 0.95, "the subtitle stays on under a bottom card");
  });
  // Карточка у предмета внизу кадра ложится на субтитр — он уступает ей место, пока она видна.
  await withStage({ ...base, overlay: parseOverlay(
    // Фокус в нижней половине кадра так, чтобы карточка под ним ещё помещалась в кадр и ложилась
    // на строку субтитров: ниже фокуса карточка ставится, пока ей хватает места.
    '{"camera":[{"at":0.6,"move":0.4,"hold":6,"area":[0.1,0.6,0.3,0.14],"scale":1.05}],"cards":[{"at":1,"title":"A card low in the frame","body":"It covers the subtitle","position":"near-focus","hold":5.5}]}') },
  async (p) => {
    await seek(p, 3);
    const s = await box(p, "#__sub"), c = await box(p, "#__cards > *");
    assert.ok(s && c && c.x < s.x + s.w && s.x < c.x + c.w && c.y < s.y + s.h && s.y < c.y + c.h, `the card overlaps the subtitle (${JSON.stringify({ s, c })})`);
    assert.ok(await opacity(p) < 0.05, "the covered subtitle gives way to the card");
    await seek(p, 7.2);
    assert.ok(await opacity(p) > 0.95, "after the card leaves, the subtitle returns");
  });
});
