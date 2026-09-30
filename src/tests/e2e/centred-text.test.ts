// Что стоит посередине, стоит посередине КАДРА. Зона площадки в вертикали несимметрична: справа
// столбец кнопок (180 точек), слева 65. Субтитры, подпись, титр и карточка в центре, поставленные
// посередине зоны, уезжали влево на полсотни точек — это видно глазом на телефоне. Меряется
// отрисованный слой в обоих режимах зоны: `zone: platform` (лента) и `zone: plain` (вне ленты).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { parseOverlay } from "../../overlay.js";
import { THEMES } from "../../theme.js";
import { safeOf, parseZone } from "../../format.js";
import { subtitleMax } from "../../film.js";
import { parseSource } from "../../source.js";

const here = dirname(fileURLToPath(import.meta.url));
const CLOCK = readFileSync(resolve(here, "..", "..", "browser", "clock.js"), "utf8");
const STAGE = readFileSync(resolve(here, "..", "..", "browser", "stage.js"), "utf8");
const W = 1080, H = 1920;

type Rect = { left: number; right: number };

async function measure(safe: Record<string, number>, style: string): Promise<Record<string, Rect>> {
  const dir = mkdtempSync(join(tmpdir(), "sc-centre-"));
  const file = join(dir, "p.html");
  writeFileSync(file, `<!doctype html><body style="margin:0;background:#445"></body>`);
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    await ctx.addInitScript({ content: CLOCK });
    await ctx.addInitScript({ content: STAGE });
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(file).href);
    await p.evaluate((s) => window.__stage.mount(s as never), { duration: 12, beats: 1, theme: THEMES.midnight, starts: [0], spoken: [10],
      safe, captionStyle: style, captionEverywhere: true,
      beatTexts: ["Every word lights up while it is spoken on the phone"], effects: {},
      overlay: parseOverlay(JSON.stringify({
        titles: [{ at: 0.2, text: "Claim", style: "rise", position: "center", hold: 20 }],
        cards: [{ at: 0.2, title: "Orders", body: "Up eighteen percent", position: "center", hold: 20 }],
      })) });
    await p.evaluate(() => window.__clock.seek(3));
    return await p.evaluate(() => {
      const out: Record<string, { left: number; right: number }> = {};
      for (const [name, sel] of [["sub", "#__sub"], ["cap", "#__cap"], ["title", ".__title"], ["card", ".__card"]] as const) {
        const e = document.querySelector(sel) as HTMLElement | null;
        if (!e || getComputedStyle(e).display === "none") continue;
        // Положение по вёрстке, без въезда: сдвиг анимации снимается на время замера, центровка остаётся.
        const tf = e.style.transform;
        if (name === "card") e.style.transform = "none";
        const r = e.getBoundingClientRect();
        e.style.transform = tf;
        out[name] = { left: r.left, right: r.right };
      }
      return out;
    });
  } finally { await browser.close(); }
}

test("subtitles, the caption, a centre title and a centre card stand in the middle of a vertical frame in both zones", async () => {
  for (const zone of ["platform", "plain"] as const) {
    const safe = safeOf("vertical", { width: W, height: H } as never, "safe", zone)!;
    for (const style of ["karaoke", "bar"]) {
      const m = await measure(safe as unknown as Record<string, number>, style);
      const block = style === "bar" ? "cap" : "sub";
      for (const k of [block, "title", "card"]) {
        const r = m[k];
        assert.ok(r, `${zone} ${style}: ${k} is drawn`);
        const mid = (r.left + r.right) / 2;
        assert.ok(Math.abs(mid - W / 2) <= 2, `${zone} ${style}: ${k} centre ${mid.toFixed(1)} ≠ ${W / 2}`);
        assert.ok(r.left >= safe.left - 1 && r.right <= W - safe.right + 1,
          `${zone} ${style}: ${k} ${r.left.toFixed(0)}–${r.right.toFixed(0)} leaves the zone ${safe.left}–${W - safe.right}`);
      }
    }
  }
});

test("zone: plain gives even margins and longer subtitle lines; an unknown zone is a parse error", () => {
  const platform = safeOf("vertical", undefined, "safe", "platform")!;
  const plain = safeOf("vertical", undefined, "safe", "plain")!;
  assert.equal(plain.left, plain.right);
  assert.ok(platform.right > platform.left);
  const theme = THEMES.midnight as unknown as Record<string, string>;
  assert.ok(subtitleMax({ width: W, height: H }, plain, theme) > subtitleMax({ width: W, height: H }, platform, theme));
  assert.throws(() => parseZone("feed"), /zone: unknown «feed»; available: platform, plain/);
  const dir = mkdtempSync(join(tmpdir(), "sc-zone-"));
  const story = (zone: string): string => {
    const f = join(dir, `${zone}.md`);
    writeFileSync(f, `# Z\nformat: vertical\nzone: ${zone}\nvoice: {"engine":"stub","name":"silent","cps":15}\n\n## a · slides.chapter\ntitle: A\nbody: B\n\nOne.\n`);
    return f;
  };
  assert.deepEqual(parseSource(story("plain")).safe, plain);
  assert.deepEqual(parseSource(story("platform")).safe, platform);
  assert.throws(() => parseSource(story("feed")), /zone: unknown/);
});

async function vertical(captionPos: string): Promise<{ sub: DOMRect; card: DOMRect; zone: { t: number; b: number } }> {
  const dir = mkdtempSync(join(tmpdir(), "sc-cappos-"));
  const file = join(dir, "p.html");
  writeFileSync(file, `<!doctype html><body style="margin:0;background:#445"></body>`);
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    await ctx.addInitScript({ content: CLOCK });
    await ctx.addInitScript({ content: STAGE });
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(file).href);
    await p.evaluate((s) => window.__stage.mount(s as never), { duration: 12, beats: 1, theme: THEMES.midnight, starts: [0], spoken: [10],
      safe: safeOf("vertical", undefined)!, captionStyle: "karaoke", captionEverywhere: true, captionPos,
      beatTexts: ["Every word lights up while it is spoken"], effects: {},
      overlay: parseOverlay(JSON.stringify({ cards: [{ at: 0.2, title: "Orders", body: "Up", position: "top-left", hold: 20 }] })) });
    await p.evaluate(() => window.__clock.seek(3));
    return await p.evaluate(() => {
      const st = getComputedStyle(document.querySelector("#__st")!);
      const n = (k: string): number => parseFloat(st.getPropertyValue(k));
      const card = document.querySelector(".__card") as HTMLElement;
      card.style.transform = "none";
      return { sub: document.querySelector("#__sub")!.getBoundingClientRect().toJSON(), card: card.getBoundingClientRect().toJSON(),
        zone: { t: n("--st"), b: innerHeight - n("--sb") } };
    });
  } finally { await browser.close(); }
}

test("subtitles stand at the top, the middle or the bottom of the zone, and a top card steps below top subtitles", async () => {
  const top = await vertical("top"), bottom = await vertical("bottom"), middle = await vertical("middle");
  assert.ok(top.sub.top >= top.zone.t && top.sub.bottom < H / 3, `top subtitles ${top.sub.top.toFixed(0)}–${top.sub.bottom.toFixed(0)} are not in the upper third inside the zone`);
  assert.ok(top.card.top >= top.sub.bottom, `a top card (${top.card.top.toFixed(0)}) overlaps top subtitles ending at ${top.sub.bottom.toFixed(0)}`);
  assert.ok(bottom.sub.bottom <= bottom.zone.b && bottom.sub.top > H / 2, "bottom subtitles stand in the lower half inside the zone");
  assert.ok(bottom.card.top < bottom.sub.top && bottom.card.top < top.card.top, "without top subtitles a top card keeps the top edge");
  const mid = (middle.sub.top + middle.sub.bottom) / 2;
  assert.ok(Math.abs(mid - (middle.zone.t + middle.zone.b) / 2) <= 2, `middle subtitles centre ${mid.toFixed(0)}`);
});

test("captions.position and a scene's captions field parse, refuse the unknown, and lint names top subtitles under a top progress bar", async () => {
  const { lint } = await import("../../lint.js");
  const dir = mkdtempSync(join(tmpdir(), "sc-cappos-src-"));
  const story = (header: string, field = ""): string => {
    const f = join(dir, `s${Math.random().toString(36).slice(2)}.md`);
    writeFileSync(f, `# P\nformat: vertical\n${header}\nvoice: {"engine":"stub","name":"silent","cps":15}\n\n## a · slides.chapter\ntitle: A\nbody: B\n${field}\nOne.\n`);
    return f;
  };
  assert.equal(parseSource(story(`captions: {"style":"karaoke","position":"top"}`)).captions?.position, "top");
  assert.throws(() => parseSource(story(`captions: {"position":"left"}`)), /captions\.position: expected bottom \| top \| middle/);
  assert.throws(() => parseSource(story("", "captions: side\n")), /captions: expected bottom \| top \| middle/);
  const clash = lint(story(`captions: {"style":"karaoke","position":"top"}\nprogress: {"position":"top","parts":true}`));
  assert.ok(clash.some((f) => f.id === "captions-top-progress"), JSON.stringify(clash));
  const apart = lint(story(`captions: {"style":"karaoke"}\nprogress: {"position":"top","parts":true}`, "captions: bottom\n"));
  assert.ok(!apart.some((f) => f.id === "captions-top-progress"));
});
