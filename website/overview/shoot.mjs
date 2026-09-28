// Records every live take of the overview film, in Russian and English UI, each in the theme of
// the scene that shows it (the cursor, clicks, key caps and cards are baked into its pixels).
//
//   node website/overview/shoot.mjs                  all takes, both languages
//   node website/overview/shoot.mjs board phone      only these takes
//   node website/overview/shoot.mjs --probe          three seconds of the landscape and phone takes
//   node website/overview/shoot.mjs --lang ru        one language
//
// Takes go to website/overview/captures/ and are not committed: this script regenerates them.
// The record-page take needs the film's scenario and starts `agentic-screencast record` itself.
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const { recordTake } = await import(pathToFileURL(join(ROOT, "dist", "capture.js")).href);
const CAPTURES = join(HERE, "captures");
mkdirSync(CAPTURES, { recursive: true });

const args = process.argv.slice(2);
const probe = args.includes("--probe");
const langArg = args.includes("--lang") ? args[args.indexOf("--lang") + 1] : null;
const only = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--lang");
const LANGS = langArg ? [langArg] : ["ru", "en"];

const TEXT = {
  ru: {
    task: "Снять ролик к релизу", quick: "Обновить скриншоты", done: "Готово", report: "отч", suffix: ".ru",
    card: { title: "Настоящий клик", body: "Карточка уходит в «Готово»" }, first: "Написать заметки к релизу",
    anna: "Анна", doing: "Починить выгрузку счетов", reportTab: "Отчёт",
  },
  en: {
    task: "Record the release film", quick: "Refresh the screenshots", done: "Done", report: "rep", suffix: "",
    card: { title: "A real click", body: "The card moves to Done" }, first: "Write release notes",
    anna: "Anna", doing: "Fix the invoice export", reportTab: "Report",
  },
};
// The film's own theme, from the scenario header: the takes shown in the film's scenes are recorded
// in it, so switching the header's theme and running this script again keeps lint's take-theme clean.
const HEADER_THEME = (readFileSync(join(HERE, "story.md"), "utf8").match(/^theme: (.+)$/m)?.[1] ?? "midnight").trim();
const FILM_THEME = HEADER_THEME.startsWith("{") ? JSON.parse(HEADER_THEME) : HEADER_THEME;
const wide = { width: 1920, height: 1080 };
const app = (lang, view = "board") => pathToFileURL(join(HERE, "app", `${view}${TEXT[lang].suffix}.html`)).href;
const out = (name, lang) => join(CAPTURES, `${name}${TEXT[lang].suffix}.webm`);
const open = (url) => async (page) => { await page.goto(url); await page.waitForTimeout(300); };
const pause = (take, ms) => take.page.waitForTimeout(ms);

const TAKES = {
  // Chapters 3 and 4: typing under a live push-in with key caps, a click beside a card, the
  // command palette opened by ⌘K and the report it leads to. Marks name every shot.
  board: (L) => recordTake({ output: out("board", L), viewport: wide, theme: FILM_THEME,
    prepare: open(app(L)) }, async (take) => {
    const p = take.page, t = TEXT[L];
    await pause(take, 700);
    await take.mark("start");
    await take.focus(p.locator("#task"), { scale: 1.7 });
    await take.type(p.locator("#task"), t.task);
    await take.mark("typed");
    await take.press(p.locator("#task"), "Enter");
    await pause(take, 800);
    await take.mark("zoomout");
    await take.unfocus();
    const added = p.locator("#todo .card", { hasText: t.task });
    await take.mark("added", added);
    await pause(take, 400);
    await take.withFocusCard(added.getByRole("button", { name: t.done }), { ...t.card, reveal: "type", motion: "glide" },
      async () => take.click(added.getByRole("button", { name: t.done }), { until: p.locator("#done .card", { hasText: t.task }) }));
    await take.mark("done", p.locator("#done .card", { hasText: t.task }));
    await pause(take, 1200);
    await take.mark("keys");
    await take.press(p.locator("body"), "Meta+K", { until: p.locator("#palette.on") });
    await take.mark("palette", p.locator("#palette .box"));
    await take.type(p.locator("#cmd"), t.report);
    await take.mark("go");
    await take.press(p.locator("#cmd"), "Enter", { until: p.locator("#view-report.on") });
    await take.mark("report");
    await pause(take, 3200);
    await take.mark("end");
  }),
  // Chapter 3, autoZoom: nobody places the camera. A field, typing, a menu, a range and a button,
  // then a long drag across the board for "follow": "cursor".
  auto: (L) => recordTake({ output: out("auto", L), viewport: wide, theme: FILM_THEME,
    prepare: open(app(L)) }, async (take) => {
    const p = take.page, t = TEXT[L];
    await pause(take, 700);
    await take.mark("start");
    await take.click(p.locator("#task"));
    await take.type(p.locator("#task"), t.quick);
    await take.click(p.locator("#assignee"), { until: p.locator("#people.open") });
    await take.click(p.locator("#people button", { hasText: t.anna }));
    await take.range(p.locator("#estimate"), 0.5);
    await take.click(p.locator("#add"), { until: p.locator("#todo .card", { hasText: t.quick }) });
    await take.mark("added", p.locator("#todo .card", { hasText: t.quick }));
    await pause(take, 600);
    await take.mark("drag");
    await take.drag(p.locator("#todo .card", { hasText: t.quick }).locator(".t"), p.locator("#done"),
      { until: p.locator("#done .card", { hasText: t.quick }) });
    await take.mark("dragged", p.locator("#done .card", { hasText: t.quick }));
    await pause(take, 700);
    await take.drag(p.locator("#done .card", { hasText: t.quick }).locator(".t"), p.locator("#doing"),
      { until: p.locator("#doing .card", { hasText: t.quick }) });
    await take.mark("back", p.locator("#doing .card", { hasText: t.quick }));
    await pause(take, 1400);
    await take.mark("end");
  }),
  // Chapter 3, click effects: the same click with a soft spot of light and with an echo.
  spot: (L) => clickTake(L, "spot", "spot", FILM_THEME),
  echo: (L) => clickTake(L, "echo", "echo", FILM_THEME),
  // Chapter 10: the same click recorded in daylight — the cursor and the ripple wear the theme.
  daylight: (L) => clickTake(L, "daylight", "ripple", "daylight"),
  // Chapter 11: the phone layout at 432 CSS px, recorded at 2.5 device pixels per CSS pixel.
  phone: (L) => recordTake({ output: out("phone", L), viewport: { width: 432, height: 768 }, scale: 2.5,
    theme: FILM_THEME, prepare: open(app(L)) }, async (take) => {
    const p = take.page, t = TEXT[L];
    await pause(take, 700);
    await take.mark("start");
    const first = p.locator("#todo .card", { hasText: t.first });
    await take.click(first.getByRole("button", { name: t.done }), { until: p.locator("#done .card", { hasText: t.first }) });
    await take.mark("done", p.locator("#done .card", { hasText: t.first }));
    await pause(take, 1300);
    await take.click(p.locator("#tab-report"), { until: p.locator("#view-report.on") });
    await take.mark("report");
    await pause(take, 3000);
    await take.mark("end");
  }),
  // Chapter 9, the trailer, in blockbuster: a long drag, a click and the palette.
  trailer: (L) => recordTake({ output: out("trailer", L), viewport: wide, theme: "blockbuster", click: "echo",
    prepare: open(app(L)) }, async (take) => {
    const p = take.page, t = TEXT[L];
    await pause(take, 600);
    await take.mark("start");
    await take.drag(p.locator("#doing .card", { hasText: t.doing }).locator(".t"), p.locator("#done"),
      { until: p.locator("#done .card", { hasText: t.doing }) });
    await take.mark("dragged", p.locator("#done .card", { hasText: t.doing }));
    await pause(take, 500);
    const first = p.locator("#todo .card", { hasText: t.first });
    await take.click(first.getByRole("button", { name: t.done }), { until: p.locator("#done .card", { hasText: t.first }) });
    await take.mark("done", p.locator("#done .card", { hasText: t.first }));
    await pause(take, 800);
    await take.mark("keys");
    await take.press(p.locator("body"), "Meta+K", { until: p.locator("#palette.on") });
    await take.mark("palette", p.locator("#palette .box"));
    await take.type(p.locator("#cmd"), t.report);
    await take.mark("go");
    await take.press(p.locator("#cmd"), "Enter", { until: p.locator("#view-report.on") });
    await take.mark("report");
    await pause(take, 3200);
    await take.mark("end");
  }),
  // Chapter 8: the recording page of `agentic-screencast record`, opened on this film's scenario.
  record: (L) => recordPage(L),
};

async function clickTake(L, name, click, theme) {
  return recordTake({ output: out(name, L), viewport: wide, theme, click, prepare: open(app(L)) }, async (take) => {
    const p = take.page, t = TEXT[L];
    await pause(take, 600);
    await take.mark("start");
    const first = p.locator("#todo .card", { hasText: t.first });
    await take.hover(first.locator(".t"));
    await take.click(first.getByRole("button", { name: t.done }), { until: p.locator("#done .card", { hasText: t.first }) });
    await take.mark("click", p.locator("#done .card", { hasText: t.first }));
    await pause(take, 1500);
    await take.mark("end");
  });
}

async function recordPage(L) {
  // The recording page parses the whole scenario, and the scene that shows this very take cannot
  // resolve its marks before the take exists: the page opens on a copy without that scene.
  const story = readFileSync(join(HERE, "story.md"), "utf8");
  const film = join(HERE, ".story-for-record.md");
  writeFileSync(film, story.replace(/^## c08-record · video\n[\s\S]*?(?=^## )/m, ""));
  const server = spawn(process.execPath, [join(ROOT, "dist", "agentic-screencast.js"), "record", "--source", film],
    { cwd: HERE, env: { ...process.env, AGENTIC_SCREENCAST_FILM_LANG: L } });
  try {
    const url = await new Promise((resolve, reject) => {
      let text = "";
      const seen = (chunk) => {
        text += chunk;
        const m = text.match(/http:\/\/127\.0\.0\.1:\d+\/?/);
        if (m) resolve(m[0]);
      };
      server.stdout.on("data", seen); server.stderr.on("data", seen);
      server.on("exit", (code) => reject(new Error(`record exited with ${code}: ${text}`)));
      setTimeout(() => reject(new Error(`no address from record: ${text}`)), 30000);
    });
    // The page opens on one scene, scrolled past the scene list and the storage path to the scene's
    // clip and its beats with their record buttons. Nothing is recorded: the cursor only points.
    return await recordTake({ output: out("record", L), viewport: wide, theme: FILM_THEME,
      contextOptions: { permissions: ["microphone"] }, prepare: async (page) => {
        await page.goto(url);
        await page.getByRole("button", { name: "c03-auto", exact: true }).click();
        await page.waitForTimeout(1500);
        await page.evaluate(() => window.scrollTo(0, 760));
        await page.waitForTimeout(500);
      } }, async (take) => {
      const p = take.page;
      await pause(take, 800);
      await take.mark("start");
      const rec = p.locator("button.rec");
      await take.hover(rec.nth(0));
      await pause(take, 1200);
      await take.mark("beats");
      await take.hover(rec.nth(1));
      await pause(take, 1200);
      await take.mark("turn");
      await take.click(p.getByRole("button", { name: /→/ }));
      await pause(take, 1800);
      await take.mark("next");
      await pause(take, 1500);
      await take.mark("end");
    });
  } finally {
    server.kill("SIGINT");
    rmSync(film, { force: true });
  }
}

// A three-second probe with the same viewport, scale and theme, to look at one frame at full size
// before the whole take is scripted (film craft 55).
async function probeTakes(L) {
  const wait = async (take) => { await pause(take, 3000); };
  await recordTake({ output: join(CAPTURES, `probe-wide${TEXT[L].suffix}.webm`), viewport: wide, theme: FILM_THEME,
    prepare: open(app(L)) }, wait);
  await recordTake({ output: join(CAPTURES, `probe-phone${TEXT[L].suffix}.webm`), viewport: { width: 432, height: 768 },
    scale: 2.5, theme: FILM_THEME, prepare: open(app(L)) }, wait);
}

for (const L of LANGS) {
  if (probe) { await probeTakes(L); console.log("probed", L); continue; }
  for (const [name, take] of Object.entries(TAKES)) {
    if (only.length && !only.includes(name)) continue;
    console.log("recorded", await take(L));
  }
}
