// Вертикальный ролик одной строкой шапки — по готовой сборке и по кадрам.
//
// Свидетельства различают «сделано под портрет» и «горизонталь, вписанная в
// портрет»: сетка слайда высокая, содержимое каждого вида занимает заметную
// долю высоты (вписанная горизонталь сжимается в верхнюю полосу — замер: не
// больше 25 %), и всё, что читают, лежит внутри безопасной зоны площадок.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { generateFrom } from "../../generate.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const ffprobe = require("@ffprobe-installer/ffprobe").path as string;
const DIST = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENTRY = join(DIST, "agentic-screencast.js");
const W = 1080, H = 1920;
/** Рабочая зона вертикали: x 65–900, y 170–1436 (docs/vertical-video.md). */
const ZONE = { l: 65, t: 170, r: W - 180, b: H - 484 };
/** Доля высоты кадра, которую занимает содержимое слайда в портретной сетке. */
const SHARE = 0.28;

const PIC = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="1600" height="1000" fill="#1d3b6b"/>
<circle cx="1000" cy="420" r="220" fill="#f4d35e"/></svg>`;
const PAGE = `<!doctype html><html><body style="margin:0;padding-top:300px;box-sizing:border-box;min-height:100vh;background:#0b1525;color:#eef;font:40px system-ui">
<h1 style="margin:0 80px 40px">Board</h1><button id="save" style="margin:0 80px;font-size:40px;padding:20px 40px">Save</button>
<p id="note" style="margin:60px 80px">The saved state appears here.</p></body></html>`;

const SLIDES = `
## ch · slides.chapter
kicker: Chapter one
title: What changed, and why it matters
body: We follow one action from the overview to its result.
duration: 8

## cmp · slides.compare
title: One source for picture and sound
left: Separate timelines (bad) :: drift after every edit
right: One scenario (good) :: audio defines duration

Beat.

## chn · slides.chain
title: How it works
nodes: Scenario | Beats (acc) | Frames | Film

Beat.

## q · slides.quote
title: The real answer
parts: Engine :: done, all checks green | Reviewer :: two frames blurry

Beat.

## n · slides.number
title: The number
values: 1,240 :: films built | 98% :: frames cached

Beat.

## hero · slides.hero
kicker: Agentic Screencast
title: Films that explain themselves
body: Slides that move, one scenario file.
duration: 8

## steps · slides.steps
title: From idea to film
items: Write :: one file | Capture :: real clicks | Build :: beats

Beat.

## feats · slides.features
title: A kit, not a template
items: 🎬 Transitions :: WebGL | 🔍 Spotlight :: one line | 🎵 Sound :: ducking

Beat.

## tl · slides.timeline
title: Twelve weeks
items: W1 :: prototype | W4 :: users | W8 :: beta

Beat.

## ctr · slides.counter
title: What changed
values: 1,240 :: films | 98.5% :: cached

Beat.

## code · slides.code
title: A real take
code: |
  await recordTake({ output: "captures/board.webm" }, async (take) => {
    await take.click(take.page.getByRole("button", { name: "Save" }));
  });

Beat.

## photo · slides.photo
image: pic.svg
title: Slowly alive
duration: 8

## shot · slides.shot
image: pic.svg
device: browser app.example.com
title: Screens in context
duration: 8

## end · slides.outro
title: Make the film
body: One scenario.
cta: Try it
duration: 8
`;
const OVERLAY = `
## ui · page
page: page.html
mustRead: #note
duration: 17
overlay: {"titles":[{"at":0.2,"text":"Save in one click","style":"fly","hold":3.4}],"lower":[{"at":4,"title":"Ada Lovelace","subtitle":"Product lead","reveal":"rise","hold":3.4}],"callouts":[{"at":4.1,"text":"The real button","target":"#save","side":"right","hold":3}],"stickers":[{"at":4.2,"text":"NEW","target":"#save","hold":3},{"at":4.3,"emoji":"🎉","point":[0.97,0.95],"hold":3}],"cards":[{"at":6.6,"title":"Saved","body":"The state appears below the button.","position":"bottom-right","hold":3.8},{"at":10.8,"title":"Every card stays inside the zone","position":"near-focus","hold":3.8}],"camera":[{"at":10.4,"move":0.4,"hold":4,"target":"#save","scale":1.8}]}

The first beat runs with the title.

The second beat names the button.

The third beat shows the saved state and the card beside it.
`;

function setup(extra = ""): { dir: string; file: string } {
  const dir = mkdtempSync(join(tmpdir(), "sc-vertical-"));
  writeFileSync(join(dir, "pic.svg"), PIC);
  writeFileSync(join(dir, "page.html"), PAGE);
  const file = join(dir, "story.md");
  writeFileSync(file, `# Vertical\nvoice: {"engine":"stub","name":"silent","cps":15}\nlang: en\nformat: vertical\n`
    + `captions: {"style":"subtitle","everywhere":true}\n${extra}${SLIDES}${OVERLAY}`);
  return { dir, file };
}

test("a vertical film lays slides out in portrait and keeps everything readable inside the safe zone", async () => {
  const { dir, file } = setup();
  const g = generateFrom(file);
  const pitch = JSON.parse(readFileSync(g.pitchFile, "utf8")) as { scenes: Array<Record<string, unknown> & { id: string; page: string;
    beats: unknown[]; provider: string }>; safe: unknown; theme?: unknown; frame: { width: number; height: number } };
  assert.deepEqual([pitch.frame.width, pitch.frame.height], [W, H]);
  const css = readFileSync(join(dir, "slides", "hero.html"), "utf8");
  const gw = Number(/--sc-grid-w:(\d+)px/.exec(css)![1]), gh = Number(/--sc-grid-h:(\d+)px/.exec(css)![1]);
  assert.ok(gh > gw, `the slide grid is portrait (${gw}×${gh})`);

  const clock = readFileSync(join(DIST, "browser", "clock.js"), "utf8");
  const stage = readFileSync(join(DIST, "browser", "stage.js"), "utf8");
  const browser = await chromium.launch();
  try {
    for (const s of pitch.scenes) {
      const duration = s.id === "ui" ? 17 : 8;
      const ctx = await browser.newContext({ viewport: { width: W, height: H } });
      await ctx.addInitScript({ content: clock });
      await ctx.addInitScript({ content: stage });
      const p = await ctx.newPage();
      await p.goto(pathToFileURL(join(dir, s.page)).href);
      // Эмодзи стикера слой берёт картинкой из поставляемого набора, как в сборке.
      const emoji = { "🎉": pathToFileURL(resolve(DIST, "..", "assets", "emoji", "emoji_u1f389.svg")).href };
      await p.evaluate((sc) => window.__stage.mount(sc as never), { ...s, duration, beats: s.beats.length, theme: pitch.theme, safe: pitch.safe, emoji,
        captionStyle: "subtitle", captionEverywhere: true, beatTexts: (s.beats as Array<{ text: string }>).map((b) => b.text), spoken: duration - 1 });
      const slide = s.provider === "slides";
      for (const t of slide ? [2.5, 5, 7.2] : [0.6, 1.8, 3.2, 5.2, 6.4, 8.5, 12, 14]) {
        await p.evaluate((tt) => window.__clock.seek(tt), t);
        const m = await p.evaluate(({ slide, now }) => {
          const boxes: Array<{ what: string; l: number; t: number; r: number; b: number }> = [];
          let top = Infinity, bottom = -Infinity;
          for (const el of document.querySelectorAll("body *, #__st *")) {
            if (el.closest(".amb")) continue;
            const inLayer = Boolean(el.closest("#__st"));
            // На странице автора читается её собственная вёрстка — она предмет съёмки;
            // зона проверяется у того, что кладёт инструмент.
            if (!slide && !inLayer) continue;
            const own = [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim())
              || el.matches(".__sticker, img.__emoji");
            if (!own) continue;
            const st = getComputedStyle(el);
            if (st.display === "none" || st.visibility === "hidden") continue;
            let o = 1;
            for (let n: Element | null = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
            if (o < 0.15) continue;
            // Пункт, который ещё входит (самый долгий вход — 1,3 с), едет из-за края и читаемым не
            // считается; зона проверяется у севшего на место. Пункты выходят по одному, и вход
            // одного из них приходится на любой момент проверки.
            const entering = el.closest<HTMLElement>("[data-at][data-enter]");
            if (entering && now >= Number(entering.dataset.at) && now < Number(entering.dataset.at) + 1.3) continue;
            const r = el.getBoundingClientRect();
            if (r.width < 1 || r.height < 1) continue;
            boxes.push({ what: `${el.tagName.toLowerCase()}.${el.className}: ${(el.textContent ?? "").trim().slice(0, 30)}`,
              l: r.left, t: r.top, r: r.right, b: r.bottom });
            if (!inLayer) { top = Math.min(top, r.top); bottom = Math.max(bottom, r.bottom); }
          }
          // Содержимое вида целиком: картинка во весь кадр у фото и снимка — тоже содержимое.
          for (const el of document.querySelectorAll(".photo, .dv")) {
            const r = el.getBoundingClientRect();
            top = Math.min(top, Math.max(0, r.top)); bottom = Math.max(bottom, Math.min(innerHeight, r.bottom));
          }
          const cam = document.querySelector("#save")?.getBoundingClientRect();
          return { boxes, share: (bottom - top) / innerHeight,
            target: cam ? { l: cam.left, t: cam.top, r: cam.right, b: cam.bottom } : null };
        }, { slide, now: t });
        for (const x of m.boxes) {
          assert.ok(x.l >= ZONE.l - 2 && x.t >= ZONE.t - 2 && x.r <= ZONE.r + 2 && x.b <= ZONE.b + 2,
            `${s.id} at ${t}s: «${x.what}» (${x.l.toFixed(0)},${x.t.toFixed(0)}–${x.r.toFixed(0)},${x.b.toFixed(0)}) is outside the safe zone`);
        }
        if (slide && t === 7.2) assert.ok(m.share >= SHARE, `${s.id}: content fills ${(m.share * 100).toFixed(0)}% of the frame height`);
        if (!slide && t === 12) {
          const c = m.target!;
          assert.ok(c.l >= 0 && c.t >= 0 && c.r <= W && c.b <= H, `the focused target stays inside the frame (${JSON.stringify(c)})`);
        }
      }
      await ctx.close();
    }
  } finally { await browser.close(); }

  const check = spawnSync("node", [ENTRY, "check", "--source", "story.md"], { cwd: dir, encoding: "utf8" });
  assert.equal(check.status, 0, check.stdout.slice(0, 800));
});

test("the vertical film builds at 1080×1920 and the presenter circle sits inside the safe zone", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-vertical-build-"));
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "color=c=magenta:s=320x320:d=2:r=5", "-c:v", "libx264",
    "-pix_fmt", "yuv420p", join(dir, "host.mp4")]);
  writeFileSync(join(dir, "story.md"), `# V\nvoice: {"engine":"stub","name":"silent"}\nformat: vertical\nframe: {"fps":5}\n`
    + `pip: {"file":"host.mp4","corner":"bottom-right","size":0.24}\n\n## a · slides.hero\ntitle: Vertical\nbackground: none\nduration: 2\n`);
  const r = spawnSync("node", [ENTRY, "build", "--source", "story.md", "--out", "v.mp4"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr);
  const size = execFileSync(ffprobe, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
    "-of", "csv=p=0:s=x", join(dir, "v.mp4")], { encoding: "utf8" }).trim();
  assert.equal(size, `${W}x${H}`);
  const f = execFileSync(ffmpeg, ["-loglevel", "error", "-ss", "1", "-i", join(dir, "v.mp4"), "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
    { maxBuffer: 1 << 26 });
  let l = W, t = H, rr = 0, b = 0;
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
    const i = (y * W + x) * 3;
    if (f[i]! > 200 && f[i + 1]! < 80 && f[i + 2]! > 200) { l = Math.min(l, x); t = Math.min(t, y); rr = Math.max(rr, x); b = Math.max(b, y); }
  }
  assert.ok(rr > l, "the presenter circle is in the frame");
  assert.ok(l >= ZONE.l && t >= ZONE.t && rr <= ZONE.r + 2 && b <= ZONE.b + 2, `the circle (${l},${t}–${rr},${b}) is inside the safe zone`);
});

test("a genre skeleton scaffolds and builds, and the contact sheet has a frame per scene", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-scaffold-"));
  const made = spawnSync("node", [ENTRY, "new", "reel", "--out", "reel.md"], { cwd: dir, encoding: "utf8" });
  assert.equal(made.status, 0, made.stderr);
  // Кадров в секунду меньше — ради времени проверки; остальное — как у заготовки.
  const text = readFileSync(join(dir, "reel.md"), "utf8").replace("format: vertical", "format: vertical\nframe: {\"fps\":5}");
  writeFileSync(join(dir, "reel.md"), text);
  const built = spawnSync("node", [ENTRY, "build", "--source", "reel.md", "--out", "reel.mp4"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(built.status, 0, built.stderr);
  const sheet = spawnSync("node", [ENTRY, "frames", "--source", "reel.md", "--out", "sheet.png"], { cwd: dir, encoding: "utf8" });
  assert.equal(sheet.status, 0, sheet.stderr);
  const said = JSON.parse(sheet.stdout) as { sheet: string; frames: Array<{ scene: string }> };
  assert.deepEqual(said.frames.map((x) => x.scene), ["hook", "value", "proof", "cta"]);
  const one = spawnSync("node", [ENTRY, "frames", "--source", "reel.md", "--scene", "value", "--at", "1.5s", "--out", "value.png"],
    { cwd: dir, encoding: "utf8" });
  assert.equal(one.status, 0, one.stderr);
  const dims = execFileSync(ffprobe, ["-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", join(dir, "value.png")],
    { encoding: "utf8" }).trim();
  assert.equal(dims, `${W}x${H}`);
});
