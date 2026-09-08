#!/usr/bin/env node
// Порядок появления элементов слайда.
//
// Признак кадра меряет УСТОЯВШЕЕСЯ состояние и потому слеп к тому, как
// кадр собирается: элемент, стоящий в разметке позже, может проявиться
// раньше соседа, и через полсекунды всё встанет на места. Окно
// расхождения — доли секунды; проверка по одному моменту в него
// не попадёт иначе как случайно.
//
// Нарушение выглядит так: у элемента, идущего в разметке ПОЗЖЕ, момент
// появления МЕНЬШЕ, чем у предыдущего. Первая редакция этой проверки
// сравнивала в обратную сторону и потому была зелена на обоих
// отрицательных контролях — то есть проверяла не то.
//
// Меряется двумя способами, и оба обязаны сойтись:
//   1) назначенные моменты в порядке разметки не убывают;
//   2) при переборе времени ни один элемент не появляется раньше
//      предыдущего по разметке.
// Первое ловит причину, второе — следствие на настоящей странице.
//
// Запуск: order-check.js <файл-сцен.json>
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Слой композиции нужен и здесь: моменты появления записаны ЯКОРЯМИ
// (`b2`, `40%`), и разрешает их он. Без него в разметке лежали бы строки,
// `Number(...)` давал бы NaN, а сравнение моментов молча проходило бы
// на любом порядке — проверка зеленела бы, ничего не проверив.
const HERE = dirname(fileURLToPath(import.meta.url));
const CLOCK = readFileSync(resolve(HERE, "browser", "clock.js"), "utf8");
const STAGE = readFileSync(resolve(HERE, "browser", "stage.js"), "utf8");

const file = process.argv[2];
if (!file) {
  console.error("order-check.js <файл-сцен.json>");
  process.exit(2);
}
const pitch = JSON.parse(readFileSync(file, "utf8"));
const SRC = dirname(resolve(file));
const STEP = 0.05;

// Положительный пол. Без него проверка зелена по пустоте, и это не догадка:
// оба состояния воспроизведены. Подмена класса `.el` на любой другой даёт
// «сцен проверено: 1, нарушений 0» — отчиталась, не проверив ничего; питч
// из одних съёмок экрана даёт «сцен проверено: 0» — ноль проверенных сцен
// как успех.
//
// Пол считается ПО ДАННЫМ СЦЕНЫ, а не константой. Константа ловит только
// «ничего не отрисовалось»; цепочка, у которой из пяти узлов появился один,
// порог в два проходит. Сколько элементов обязано быть, известно из того же
// файла сцен, и это единственное число, которое различает «страница та»
// и «страница отрисовалась наполовину».
//
// Сколько элементов обязано быть, говорит САМА страница атрибутом
// `data-slidecast-elements`. Прежде это число считала проверка, зная
// устройство пяти видов слайда, — и чужая страница была для неё пустой,
// сколько бы элементов ни отрисовала. Страница, которая о себе молчит,
// проверяется только на непустоту: требовать от чужой вёрстки объявления
// нельзя, а зеленеть по пустоте — тем более.
const FLOOR = 1;

const browser = await chromium.launch();
const bad = [];
const empty = [];
let checked = 0;
for (const s of pitch.scenes) {
  // Готовый файл проверять нечем: элементы расписания рисует страница,
  // а тут её никто не рисовал. Что материал готовый, говорит сцена.
  if (s.video || s.page?.endsWith(".mhtml")) continue;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript({ content: CLOCK });
  await ctx.addInitScript({ content: STAGE });
  const p = await ctx.newPage();
  await p.goto(pathToFileURL(resolve(SRC, s.page)).href, { waitUntil: "load" });
  await p.evaluate((sc) => window.__stage.mount(sc),
    { ...s, duration: s.duration ?? 6, beats: s.beats?.length ?? 1 });
  const ats = await p.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".el")].map((e) => Number(e.dataset.at || 0)));
  const declared = await p.evaluate(() => document.body.dataset.slidecastElements ?? null);
  const want = declared === null ? FLOOR : Number(declared);
  if (ats.length < want) {
    empty.push({ scene: s.id, found: ats.length, expected: want,
      why: ats.length === 0
        ? "noElements"
        : "fewerThanDeclared" });
    checked++;
    await ctx.close();
    continue;
  }

  // 1. Моменты не убывают в порядке разметки.
  for (let i = 1; i < ats.length; i++) {
    if (ats[i] < ats[i - 1]) {
      bad.push({ scene: s.id, kind: "momentDecreases",
        element: i, at: ats[i], previous: ats[i - 1] });
    }
  }

  // 2. То же на настоящей странице: перебор времени.
  const end = Math.max(0, ...ats) + 0.6;
  let seen = false;
  for (let t = 0; t <= end && !seen; t += STEP) {
    const vis = await p.evaluate((tt) => {
      window.renderAt?.(tt);
      return [...document.querySelectorAll<HTMLElement>(".el")]
        .map((e) => Number(e.style.opacity) > 0.5);
    }, t);
    for (let i = 1; i < vis.length; i++) {
      if (vis[i] && !vis[i - 1]) {
        bad.push({ scene: s.id, kind: "appearedBeforePrevious",
          element: i, at: Number(t.toFixed(2)) });
        seen = true;
        break;
      }
    }
  }
  checked++;
  await ctx.close();
}
await browser.close();

if (!checked) {
  empty.push({ why: "nothingToCheck" });
}

console.log(JSON.stringify({
  scenesChecked: checked,
  orderViolations: bad.length,
  ...(bad.length ? { violations: bad.slice(0, 8) } : {}),
  ...(empty.length ? { nothingToCheck: empty } : {}),
}, null, 1));
// Коды разведены: 1 — нашли нарушения, 2 — проверка не состоялась.
// Снаружи «сломалась» иначе неотличима от «нашла».
// Находка важнее пустоты: при совпадении наружу должен уйти более сильный
// факт. Прежде порядок был обратным, и настоящая инверсия пряталась
// за кодом «проверка не состоялась».
if (bad.length) process.exit(1);
process.exit(empty.length ? 2 : 0);
