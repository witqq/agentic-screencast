// График из CSV: столбцы и линия стоят по данным, растут и прорисовываются во времени,
// подсвечивают пик, берут подписи из файла данных своего языка и читаются в любой теме.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium, type Page } from "playwright";
import { generateFrom } from "../../generate.js";
import { parseSource } from "../../source.js";
import { THEME_NAMES } from "../../theme.js";

const here = dirname(fileURLToPath(import.meta.url));
const CLOCK = readFileSync(resolve(here, "..", "..", "browser", "clock.js"), "utf8");
const STAGE = readFileSync(resolve(here, "..", "..", "browser", "stage.js"), "utf8");
const ENTRY = resolve(here, "..", "..", "agentic-screencast.js");

const DATA = "month,orders\nJan,1200\nFeb,1850\nMar,1600\nApr,2400\nMay,2100\nJun,3050\n";
const story = (dir: string, extra = "", data = DATA): string => {
  writeFileSync(join(dir, "d.csv"), data);
  writeFileSync(join(dir, "d.ru.csv"), DATA.replace("month", "месяц").replace("Jan", "Янв").replace("Feb", "Фев")
    .replace("Mar", "Мар").replace("Apr", "Апр").replace("May", "Май").replace("Jun", "Июн"));
  writeFileSync(join(dir, "story.md"), `# Chart
lang: en
voice: {"engine":"stub","name":"silent","cps":15}
${extra}
## b · slides.chart
title: Orders by month
title.ru: Заказы по месяцам
data: d.csv
data.ru: d.ru.csv
peak: max
duration: 5

## l · slides.chart
title: The same, as a line
title.ru: То же линией
data: d.csv
data.ru: d.ru.csv
type: line
peak: 4
duration: 5
`);
  return join(dir, "story.md");
};

/** Страница слайда с часами и слоем композиции; `run` получает её, смонтированную. */
async function withSlide(file: string, id: string, run: (p: Page) => Promise<void>): Promise<void> {
  const g = generateFrom(file);
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    await ctx.addInitScript({ content: CLOCK });
    await ctx.addInitScript({ content: STAGE });
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(g.pages[id]!).href);
    // Сцена монтируется так же, как в сборке: с умолчаниями своего вида из данных сборки.
    const scene = (JSON.parse(readFileSync(g.pitchFile, "utf8")) as { scenes: Array<{ id: string; effects?: unknown }> }).scenes.find((x) => x.id === id)!;
    await p.evaluate((fx) => window.__stage.mount({ duration: 5, beats: 0, effects: fx } as never), scene.effects);
    await run(p);
  } finally { await browser.close(); }
}
const seek = (p: Page, t: number): Promise<void> => p.evaluate((tt) => window.__clock.seek(tt), t);
const bars = (p: Page): Promise<number[]> => p.evaluate(() =>
  [...document.querySelectorAll(".chart-bar")].map((b) => b.getBoundingClientRect().height));
const values = DATA.trim().split("\n").slice(1).map((l) => Number(l.split(",")[1]));

test("bars stand in proportion to the CSV, grow in time, light the peak, and one changed value moves only its bar", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-chart-"));
  const file = story(dir);
  let settled: number[] = [];
  await withSlide(file, "b", async (p) => {
    await seek(p, 4.5);
    settled = await bars(p);
    const max = Math.max(...values), hmax = Math.max(...settled);
    settled.forEach((h, i) => assert.ok(Math.abs(h / hmax - values[i]! / max) < 0.03, `bar ${i} is ${(h / hmax).toFixed(3)} of the tallest, the data says ${(values[i]! / max).toFixed(3)}`));
    await seek(p, 1.0);
    const mid = await bars(p);
    assert.ok(mid.some((h, i) => h < settled[i]! - 5), "mid-entrance the bars are still growing");
    const colours = await p.evaluate(() => [...document.querySelectorAll(".chart-bar")].map((b) => getComputedStyle(b).backgroundColor));
    const peak = values.indexOf(Math.max(...values));
    assert.ok(colours.every((c, i) => (i === peak) === (c === colours[peak])), `only the peak has its own colour: ${colours.join(" ")}`);
    // Тот же момент рисуется теми же пикселями, откуда бы к нему ни пришли.
    await seek(p, 2.2); const a = createHash("md5").update(await p.screenshot()).digest("hex");
    await seek(p, 4.5); await seek(p, 2.2); const b = createHash("md5").update(await p.screenshot()).digest("hex");
    assert.equal(a, b, "a moment renders the same bytes");
  });
  // Одно значение, не наибольшее, меняется — меняется только его столбец.
  const dir2 = mkdtempSync(join(tmpdir(), "sc-chart-"));
  await withSlide(story(dir2, "", DATA.replace("Mar,1600", "Mar,900")), "b", async (p) => {
    await seek(p, 4.5);
    const changed = await bars(p);
    changed.forEach((h, i) => (i === 2 ? assert.ok(h < settled[i]! - 20, "the changed bar is lower")
      : assert.ok(Math.abs(h - settled[i]!) < 0.5, `bar ${i} did not move`)));
  });
});

test("a line chart puts each vertex at its value and draws itself from left to right", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-chart-"));
  await withSlide(story(dir), "l", async (p) => {
    await seek(p, 4.5);
    const pts = await p.evaluate(() => {
      const plot = document.querySelector(".chart-plot")!.getBoundingClientRect();
      return [...document.querySelectorAll(".chart-dot")].map((d) => {
        const r = d.getBoundingClientRect();
        return { up: plot.bottom - (r.top + r.height / 2), x: r.left + r.width / 2 - plot.left, w: plot.width, h: plot.height };
      });
    });
    const max = Math.max(...values);
    pts.forEach((q, i) => assert.ok(Math.abs(q.up / q.h - values[i]! / max) < 0.03, `vertex ${i} at ${(q.up / q.h).toFixed(3)} of the height, the data says ${(values[i]! / max).toFixed(3)}`));
    // Середина прорисовки: слева линия уже есть, справа поля ещё пусто.
    const ink = async (t: number, from: number, to: number): Promise<number> => {
      await seek(p, t);
      const r = await p.evaluate(() => {
        const plot = document.querySelector(".chart-plot")!.getBoundingClientRect();
        const path = document.querySelector(".chart-path") as SVGPolylineElement;
        const len = Number(path.dataset.len), off = parseFloat(path.style.strokeDashoffset);
        // Доля нарисованного по длине и где она кончается по горизонтали.
        const drawn = path.getPointAtLength(Math.max(0, len - off));
        const x = drawn.x / (path.closest(".chart-plot") as HTMLElement).clientWidth;
        return { x, len, off, w: plot.width };
      });
      return r.x >= from ? Math.min(r.x, to) - from : 0;
    };
    assert.ok(await ink(1.0, 0, 0.3) > 0, "the left of the plot is drawn mid-entrance");
    assert.equal(await ink(1.0, 0.7, 1), 0, "the right of the plot is still empty mid-entrance");
    const end = await ink(4.5, 0.7, 1);
    assert.ok(end > 0.2, `at the end the line reaches the last vertex on the right (${end})`);
    const shown = await p.evaluate(() => [...document.querySelectorAll(".chart-dot")].map((d) => Number(getComputedStyle(d).opacity)));
    assert.ok(shown.every((o) => o > 0.99), `every vertex is shown once the line is drawn: ${shown.join(" ")}`);
  });
});

test("the chart takes its labels from the data of its language, and a wrong type or peak is refused", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-chart-"));
  const file = story(dir);
  const was = process.env.AGENTIC_SCREENCAST_FILM_LANG;
  process.env.AGENTIC_SCREENCAST_FILM_LANG = "ru";
  try {
    await withSlide(file, "b", async (p) => {
      await seek(p, 4.5);
      const labels = await p.evaluate(() => [...document.querySelectorAll(".chart-l")].map((l) => l.textContent));
      assert.deepEqual(labels, ["Янв", "Фев", "Мар", "Апр", "Май", "Июн"]);
    });
  } finally { if (was === undefined) delete process.env.AGENTIC_SCREENCAST_FILM_LANG; else process.env.AGENTIC_SCREENCAST_FILM_LANG = was; }
  await withSlide(file, "b", async (p) => {
    assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll(".chart-l")].map((l) => l.textContent)),
      ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]);
  });
  const text = readFileSync(file, "utf8");
  for (const [a, b, why] of [["type: line", "type: pie", /type: expected bar \| line/u], ["peak: 4", "peak: Dec", /peak: expected max, none, a row number 1–6 or a label/u], ["peak: 4", "peak: 9", /a row number 1–6/u]] as const) {
    writeFileSync(file, text.replace(a, b));
    assert.throws(() => generateFrom(file), why);
  }
  writeFileSync(file, text);
  assert.equal(parseSource(file).scenes.length, 2);
});

test("a chart reads in every theme", () => {
  for (const theme of THEME_NAMES) {
    const dir = mkdtempSync(join(tmpdir(), "sc-chart-"));
    story(dir, `theme: ${theme}\n`);
    const r = spawnSync("node", [ENTRY, "check", "story.md"], { cwd: dir, encoding: "utf8",
      env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
    assert.equal(r.status, 0, `${theme}: ${(r.stdout + r.stderr).slice(-500)}`);
  }
});

test("with subtitles on slides a landscape chart keeps its axis labels above the subtitle lines", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-chart-"));
  const file = story(dir, 'captions: {"style":"karaoke","everywhere":true}\n');
  await withSlide(file, "b", async (p) => {
    await seek(p, 4.5);
    const bottom = await p.evaluate(() => document.querySelector(".chart-labels")!.getBoundingClientRect().bottom);
    // Субтитры слоя: низ в 7 % от края кадра, две строки кегля 2,15 % ширины с интерлиньяжем 1,3.
    const top = 1080 - (1080 * 0.07 + 2 * (1920 / 100) * 2.15 * 1.3);
    assert.ok(bottom <= top, `the labels end at ${bottom.toFixed(0)}, the subtitles start at ${top.toFixed(0)}`);
  });
});
