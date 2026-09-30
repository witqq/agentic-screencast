// Слайды, которые движутся: новые виды, живые фоны, кинетический текст.
//
// Свидетельство — кадры, а не разметка: «кадр живой» проверяется разностью
// кадров в разные моменты сцены против порога, снятого на заведомо
// неподвижной странице (шум растеризации). Моменты берутся и ПОСЛЕ того, как
// все элементы появились: слайд, у которого движение кончается вместе с
// появлением, дальше стоит картинкой — ровно то, что здесь запрещено.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderScene, type RenderScene } from "../../render.js";
import { generateFrom } from "../../generate.js";
import { KINETIC } from "../../overlay.js";
import { BACKGROUNDS } from "../../provider/slides/index.js";
import { THEME_NAMES } from "../../theme.js";
import { rawOf } from "../support.js";

const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

const W = 480, H = 270;
const OPTS = { width: 960, height: 540 };

/** Кадр в сыром RGB уменьшенного размера. */
const raw = (png: Buffer): Buffer => rawOf(png, "rgb24", `scale=${W}:${H}`);
/** Средняя по пикселям разность двух кадров, уровни 0…255. */
const diff = (a: Buffer, b: Buffer): number => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i]! - b[i]!);
  return s / a.length;
};

/** Сценарий во временном каталоге → сцены сборки, готовые к рендеру. */
function scenes(story: string, files: Record<string, string> = {}): { dir: string; list: RenderScene[] } {
  const dir = mkdtempSync(join(tmpdir(), "sc-motion-"));
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
  writeFileSync(join(dir, "story.md"), story);
  const g = generateFrom(join(dir, "story.md"));
  const pitch = JSON.parse(readFileSync(g.pitchFile, "utf8")) as { scenes: RenderScene[]; theme?: unknown };
  return { dir, list: pitch.scenes.map((s) => ({ ...s, duration: 8, __src: dir,
    beats: (s.beats as unknown[]).length, theme: pitch.theme })) };
}

async function frameAt(s: RenderScene, t: number): Promise<Buffer> {
  const { shots } = await renderScene(s, { ...OPTS, at: t });
  return raw(shots[0]!.buf);
}

// Кадр сценария совпадает с кадром рендера: страница слайда свёрстана под кадр ролика.
const HEAD = `# Motion\nvoice: {"engine":"stub","name":"silent"}\nlang: en\nframe: {"width":960,"height":540}\n\n`;
const KINDS = `
## hero · slides.hero
title: Films that explain themselves
body: One scenario.
duration: 6

## steps · slides.steps
title: Steps
items: One :: first | Two :: second

First beat.

Second beat.

## feats · slides.features
title: Features
items: 🎬 One :: a | 🔍 Two :: b | 📱 Three :: c

Beat.

## tl · slides.timeline
title: Timeline
items: W1 :: start | W4 :: users | W8 :: beta

Beat.

## ctr · slides.counter
title: Numbers
values: 1,240 :: films | 98% :: cached

Beat.

## code · slides.code
title: Code
code: const a = 1;\\nconsole.log(a);

Beat.

## photo · slides.photo
image: pic.svg
title: Picture
duration: 6

## shot · slides.shot
image: pic.svg
device: browser app.example.com
duration: 6

## end · slides.outro
title: The end
cta: Try it
duration: 6
`;
const PIC = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><defs><linearGradient id="g" x1="0" x2="1">
<stop offset="0" stop-color="#1d3b6b"/><stop offset="1" stop-color="#c2643f"/></linearGradient></defs>
<rect width="1600" height="1000" fill="url(#g)"/><circle cx="1000" cy="420" r="220" fill="#f4d35e"/>
<rect x="120" y="640" width="900" height="80" fill="#fff"/></svg>`;

test("every new kind and every live background keeps moving after everything has appeared", async () => {
  // Порог — шум растеризации неподвижной страницы, снятой в те же моменты.
  const still = scenes(`${HEAD}## s · page\npage: still.html\nduration: 6\n`, {
    "still.html": "<!doctype html><html><body style=\"margin:0;background:#123;color:#fff;font:48px sans-serif\"><h1>Still</h1></body></html>" });
  const s0 = still.list[0]!;
  const noise = Math.max(diff(await frameAt(s0, 5.0), await frameAt(s0, 5.9)), diff(await frameAt(s0, 5.9), await frameAt(s0, 6.8)));
  const floor = noise * 3 + 0.05;

  const { list } = scenes(HEAD + KINDS, { "pic.svg": PIC });
  const bgs = BACKGROUNDS.filter((b) => b !== "none");
  const { list: backs } = scenes(HEAD + bgs.map((b) => `## bg-${b} · slides.hero\ntitle: ${b}\nbackground: ${b}\ntext: rise\nduration: 6\n`).join("\n"));
  for (const s of [...list, ...backs]) {
    // С пятой секунды все элементы на местах: такты без измерений считаются
    // равными, и последний пункт трёх тактов выходит на 5,3 с восьмисекундной
    // сцены — поэтому у проверочных сцен не больше двух тактов, а у выхода
    // (затемнения в конце сцены) запас.
    const f = [await frameAt(s, 5.0), await frameAt(s, 5.9), await frameAt(s, 6.8)];
    const d = [diff(f[0]!, f[1]!), diff(f[1]!, f[2]!), diff(f[0]!, f[2]!)];
    assert.ok(d.every((x) => x > floor), `${String(s.id)}: settled frames move (${d.map((x) => x.toFixed(3)).join(", ")} > ${floor.toFixed(3)})`);
  }
  // WebGL у шейдерных фонов действительно работает, а не откатился к сетке.
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    for (const b of ["aurora", "mesh", "waves"]) {
      const s = backs.find((x) => x.id === `bg-${b}`)!;
      const page = await browser.newPage();
      await page.goto(`file://${join(String(s.__src), String(s.page))}`);
      assert.equal(await page.evaluate(() => document.body.dataset.bgRenderer), "webgl", `${b} draws with WebGL`);
      await page.close();
    }
  } finally { await browser.close(); }
});

test("a frame taken first in a fresh page equals the same frame of a sequential run", async () => {
  // Облёт, WebGL-фон, кинетика текста и входы с поворотом вместе: каждая из них
  // могла бы оставить состояние между кадрами, и кадр с середины разошёлся бы.
  const { list } = scenes(`${HEAD}## a · slides.features\ntitle: Seek\ntext: fly\nenter: spin\nbackground: aurora\n`
    + `items: One :: a | Two :: b | Three :: c\n\nBeat one.\n\nBeat two.\n`);
  const s = { ...list[0]!, duration: 3 };
  const all = await renderScene(s, { ...OPTS, fps: 10 });
  for (const t of [1.2, 2.6]) {
    const one = await renderScene(s, { ...OPTS, fps: 10, at: t });
    assert.equal(one.shots[0]!.md5, all.shots[Math.round(t * 10)]!.md5, `frame ${t}s is the same when rendered cold`);
  }
});

test("every kinetic style moves mid-entry and settles into the plain layout, or keeps its look where that is the style", async () => {
  const titles = KINETIC.map((k) => `## k-${k} · slides.hero\ntitle: Every phrase lands\ntext: ${k}\nbackground: none\nmove: still\nduration: 6\n`);
  const { list } = scenes(HEAD + `## plain · slides.hero\ntitle: Every phrase lands\nbackground: none\nmove: still\nduration: 6\n\n` + titles.join("\n"));
  const plain = await frameAt(list[0]!, 5);
  for (const s of list.slice(1)) {
    const mid = await frameAt(s, 0.62), settled = await frameAt(s, 5);
    // Посередине входа кадр заметно другой, в конце — тот же, что без анимации:
    // слова стоят на своих местах. Буквы отдельными узлами теряют кернинг пар,
    // отсюда небольшой допуск.
    assert.ok(diff(mid, settled) > 0.4, `${String(s.id)}: the phrase is moving at 0.6 s (${diff(mid, settled).toFixed(3)})`);
    // Дуга и живой градиент — облик, а не вход: собранная фраза остаётся изогнутой или переливается.
    if (["k-aurora", "k-arc"].includes(String(s.id))) {
      assert.ok(diff(settled, plain) > 0.35, `${String(s.id)}: the settled phrase keeps its look (${diff(settled, plain).toFixed(3)})`);
    } else if (String(s.id) === "k-sparkle") {
      // Искры вспыхивают вокруг стоящих слов: кадр чуть отличается от простого заголовка, но не раскладкой.
      const d = diff(settled, plain);
      assert.ok(d > 0.1 && d < 0.8, `${String(s.id)}: words stand in place and sparks flash around them (${d.toFixed(3)})`);
    } else {
      assert.ok(diff(settled, plain) < 0.35, `${String(s.id)}: settled phrase matches the plain title (${diff(settled, plain).toFixed(3)})`);
    }
  }
});

test("default kickers follow the language of the film", () => {
  const { dir } = scenes(`${HEAD}## c · slides.compare\ntitle: Why\nleft: A :: a\nright: B :: b\n\nBeat.\n\n## ch · slides.chapter\ntitle: T\nbody: B\nduration: 3\n`);
  const compare = readFileSync(join(dir, "slides", "c.html"), "utf8");
  const chapter = readFileSync(join(dir, "slides", "ch.html"), "utf8");
  assert.match(compare, />comparison</);
  assert.match(chapter, />Next chapter</);
  const ru = scenes(`# Р\nvoice: {"engine":"stub","name":"silent"}\n\n## ch · slides.chapter\ntitle: Глава\nbody: Текст\nduration: 3\n`);
  assert.match(readFileSync(join(ru.dir, "slides", "ch.html"), "utf8"), />Следующая глава</);
});

test("every new kind passes the frame check in every shipped theme", () => {
  // Контраст, кегль, переполнение и покрытие кадра — по устоявшемуся кадру.
  // Подложки из color-mix меряются по их настоящему цвету: прежде запись
  // `color(srgb …)` читалась как уровни 0…255, и светлая карточка считалась чёрной.
  for (const theme of THEME_NAMES) {
    const dir = mkdtempSync(join(tmpdir(), "sc-theme-"));
    writeFileSync(join(dir, "pic.svg"), PIC);
    writeFileSync(join(dir, "story.md"), HEAD.replace("lang: en", `lang: en\ntheme: ${theme}`) + KINDS);
    const r = spawnSync("node", [ENTRY, "check", "--source", "story.md"], { cwd: dir, encoding: "utf8" });
    assert.equal(r.status, 0, `${theme}: ${r.stdout.slice(0, 500)}`);
  }
});
