import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { generateFrom } from "../../generate.js";
import { renderScene, type RenderScene } from "../../render.js";

const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;
const W = 1920, H = 1080;
const here = dirname(fileURLToPath(import.meta.url));
const CLOCK = readFileSync(resolve(here, "..", "..", "browser", "clock.js"), "utf8");
const STAGE = readFileSync(resolve(here, "..", "..", "browser", "stage.js"), "utf8");

test("full height before/after and parallax pictures do not trigger false layout overflow", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-dense-ba-"));
  for (const name of ["before", "after"]) execFileSync(ffmpeg, ["-nostdin", "-y", "-loglevel", "error",
    "-f", "lavfi", "-i", `color=c=${name === "before" ? "red" : "blue"}:s=1920x1080`, "-frames:v", "1", join(dir, `${name}.png`)]);
  writeFileSync(join(dir, "story.md"), "# Layout\nlang: en\nvoice: {\"engine\":\"stub\",\"name\":\"silent\"}\n"
    + "frame: {\"width\":1920,\"height\":1080,\"fps\":10,\"scale\":1}\n\n"
    + "## ba · slides.beforeafter\nimage: before.png\nafter: after.png\nduration: 4\n\n"
    + "## px · slides.parallax\nimage: before.png\npanels: 0.1 0.2 0.3 0.3 @ 1\nduration: 4\n");
  const generated = generateFrom(join(dir, "story.md"));
  const pitch = JSON.parse(readFileSync(generated.pitchFile, "utf8")) as { theme: unknown; scenes: Array<{ effects?: unknown }> };
  for (const [i, id] of ["ba", "px"].entries()) {
    const scene: RenderScene = { page: generated.pages[id]!, duration: 4, beats: 0, theme: pitch.theme, effects: pitch.scenes[i]!.effects };
    const result = await renderScene(scene, { width: W, height: H, fps: 10, at: 2 });
    assert.equal(result.overflow, undefined, `${id}: picture fits the settled frame; reported ${result.overflow} grid px`);
  }
  const beforeAfter = generated.pages.ba!;
  writeFileSync(beforeAfter, readFileSync(beforeAfter, "utf8").replace("</head>", "<style>.ba{min-height:2000px}</style></head>"));
  const oversized: RenderScene = { page: beforeAfter, duration: 4, beats: 0, theme: pitch.theme, effects: pitch.scenes[0]!.effects };
  const result = await renderScene(oversized, { width: W, height: H, fps: 10, at: 2 });
  assert.ok((result.overflow ?? 0) > 0, "a comparison stage that really crosses the reading area is still reported");
});

test("eight steps keep their heading and all items inside the reading area", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-dense-steps-"));
  const items = ["Бриф", "Факты", "Сценарий", "Кадры", "Запись", "Монтаж", "Проверка", "Передача"]
    .map((title, i) => `${title} :: результат шага ${i + 1} виден в ролике`).join(" | ");
  writeFileSync(join(dir, "story.md"), `# Layout\nlang: ru\nvoice: {"engine":"stub","name":"silent"}\n`
    + `frame: {"width":1920,"height":1080,"fps":10,"scale":1}\n`
    + `captions: {"style":"subtitle","everywhere":true}\nprogress: {"position":"bottom","parts":true}\n\n`
    + `## steps · slides.steps\npart: Процесс\nkicker: Восемь шагов\ntitle: От идеи до ролика\nitems: ${items}\nduration: 8\n\nВосемь шагов доводят работу от идеи до передачи готового ролика.\n`);
  const generated = generateFrom(join(dir, "story.md"));
  const pitch = JSON.parse(readFileSync(generated.pitchFile, "utf8")) as { theme: unknown; scenes: Array<{ effects?: unknown }> };
  const scene: RenderScene = { page: generated.pages.steps!, duration: 8, beats: 0, theme: pitch.theme, effects: pitch.scenes[0]!.effects };
  const rendered = await renderScene(scene, { width: W, height: H, fps: 10, at: 7.5 });
  assert.equal(rendered.overflow, undefined, `eight steps reported ${rendered.overflow} grid px overflow`);
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    await ctx.addInitScript({ content: CLOCK });
    await ctx.addInitScript({ content: STAGE });
    const page = await ctx.newPage();
    await page.goto(pathToFileURL(generated.pages.steps!).href);
    await page.evaluate((s) => window.__stage.mount(s as never), { ...scene, beatTexts: [], starts: [], spoken: 0 });
    await page.evaluate(() => window.__clock.seek(7.5));
    const m = await page.evaluate(() => {
      const box = document.querySelector(".k-in")!, css = getComputedStyle(box), r = box.getBoundingClientRect();
      const k = r.height / (box as HTMLElement).offsetHeight;
      const top = r.top + parseFloat(css.paddingTop) * k, bottom = r.bottom - parseFloat(css.paddingBottom) * k;
      const head = document.querySelector(".k-head")!.getBoundingClientRect();
      const steps = [...document.querySelectorAll(".step")].map((el) => el.getBoundingClientRect());
      return { top, bottom, headTop: head.top, headBottom: head.bottom,
        first: steps[0]!.top, last: Math.max(...steps.map((s) => s.bottom)), count: steps.length };
    });
    assert.equal(m.count, 8);
    assert.ok(m.headTop >= m.top - 1 && m.headBottom < m.first, JSON.stringify(m));
    assert.ok(m.last <= m.bottom + 1, JSON.stringify(m));
  } finally { await browser.close(); }
});

test("four short chain nodes share one landscape row", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-dense-chain-"));
  writeFileSync(join(dir, "story.md"), "# Layout\nlang: ru\nvoice: {\"engine\":\"stub\",\"name\":\"silent\"}\n"
    + "frame: {\"width\":1920,\"height\":1080,\"fps\":10,\"scale\":1}\n\n"
    + "## chain · slides.chain\ntitle: Путь ролика\nnodes: Сценарий | Голос | Кадры | MP4\nduration: 6\n\nСценарий ведёт голос, кадры и готовый ролик.\n");
  const generated = generateFrom(join(dir, "story.md"));
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    await ctx.addInitScript({ content: CLOCK });
    await ctx.addInitScript({ content: STAGE });
    const page = await ctx.newPage();
    await page.goto(pathToFileURL(generated.pages.chain!).href);
    await page.evaluate(() => window.__stage.mount({ duration: 6, beats: 0, effects: {} } as never));
    await page.evaluate(() => window.__clock.seek(5.5));
    const m = await page.evaluate(() => [...document.querySelectorAll(".chain .node")].map((el) => {
      const r = el.getBoundingClientRect(); return { top: r.top, left: r.left, right: r.right, width: r.width };
    }));
    assert.equal(m.length, 4);
    assert.ok(Math.max(...m.map((r) => r.top)) - Math.min(...m.map((r) => r.top)) < 4, JSON.stringify(m));
    assert.ok(m.every((r, i) => r.width >= 170 && (i === 0 || r.left > m[i - 1]!.right)), JSON.stringify(m));
  } finally { await browser.close(); }
});

test("the four-node chain remains a vertical sequence in portrait", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-dense-chain-portrait-"));
  writeFileSync(join(dir, "story.md"), "# Layout\nlang: ru\nformat: vertical\n"
    + "voice: {\"engine\":\"stub\",\"name\":\"silent\"}\n\n"
    + "## chain · slides.chain\ntitle: Путь ролика\nnodes: Сценарий | Голос | Кадры | MP4\nduration: 6\n\n"
    + "Сценарий ведёт голос, кадры и готовый ролик.\n");
  const generated = generateFrom(join(dir, "story.md"));
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
    await ctx.addInitScript({ content: CLOCK });
    await ctx.addInitScript({ content: STAGE });
    const page = await ctx.newPage();
    await page.goto(pathToFileURL(generated.pages.chain!).href);
    await page.evaluate(() => window.__stage.mount({ duration: 6, beats: 0, effects: {} } as never));
    await page.evaluate(() => window.__clock.seek(5.5));
    const rows = await page.evaluate(() => [...document.querySelectorAll(".chain .node")]
      .map((el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; }));
    assert.equal(rows.length, 4);
    assert.ok(rows.every((r, i) => r.left >= 65 && r.right <= 900 && (i === 0 || r.top > rows[i - 1]!.bottom)), JSON.stringify(rows));
  } finally { await browser.close(); }
});
