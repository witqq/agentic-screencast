#!/usr/bin/env node
// Генератор слайдов: из данных сцены собирает самодостаточную HTML-страницу.
// Виды и их поля перечислены у поставщика (`slides/index.ts`).
//
// Разметку описывают компоненты (`slides/Slide.tsx`), а отдаётся она
// статичной строкой: страница не оживает в браузере и ничего не грузит,
// поэтому упаковщик ей не нужен. Появление элементов — чистая функция
// времени: страница объявляет `window.renderAt(t)`, ядро рендера подаёт
// время кадра.
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { CSS, RUNTIME } from "./styles.js";
import { SlideBody, type Grid } from "./Slide.js";
import { DEVICE_CSS } from "../../device.js";
import type { Deck, Film, Slide } from "../../source.js";
import { partLabelHeight } from "../../part-label.js";

const esc = (s: string): string =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Оболочка страницы остаётся строкой, а не компонентом, намеренно.
 * Внутри `<style>` и `<script>` содержимое обязано попасть в документ
 * как есть, а компонент экранировал бы угловые скобки — правило вида
 * `.cols>.el` превратилось бы в `.cols&gt;.el`, и вёрстка молча уехала бы.
 */
/**
 * Что на этой странице считается содержанием. Объявляет её ТОТ, КТО ЕЁ
 * РИСУЕТ: проверка кадра иначе знала бы классы чужой разметки, и кадр
 * любого другого материала объявлялся бы пустым.
 */
const CONTENT = ".chain .node, .cols .col, .huge, .quote, .chapter-title, .chapter-body, .hero-title, .step, "
  + ".feat, .tl-item, .ctr, .code, .photo, .shot-img, .outro-title, .chart-bar, .chart-path, .ba-frame, .px-panel, .pv-cv, .pv-src, "
  + ".card-word, .tc-name";

/**
 * Фон страницы: слои тихой сетки и холст живого фона. Какой из них виден,
 * решает скрипт страницы по полю сцены или по теме (`--bg-motion`).
 */
const AMBIENT = `<div class="amb"><span class="amb-glow"></span><span class="amb-grid"></span><span class="amb-sheen"></span>`
  + `<canvas class="amb-cv"></canvas></div>`;

const page = (title: string, body: string, elements: number, theme: string,
  lang: string, bg: string | undefined, align: string | undefined): string => `<!DOCTYPE html>
<html lang="${esc(lang)}"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>${CSS}${DEVICE_CSS}${theme}</style></head><body data-slidecast-elements="${elements}" data-slidecast-content="${CONTENT}"${bg ? ` data-bg="${esc(bg)}"` : ""}${align ? ` data-align="${esc(align)}"` : ""}>${AMBIENT}${body}<div class="rule"></div><script>${RUNTIME}</script></body></html>
`;

/**
 * Тема ролика — пары «переменная — значение», и они идут ПОСЛЕ основных
 * правил: слайд объявляет свои цвета переменными в `:root`, а тема их
 * перебивает. Ролик без темы выглядит ровно как прежде.
 */
const themeCss = (film?: Film): string => {
  const pairs = Object.entries(film?.theme ?? {});
  if (!pairs.length) return "";
  return `:root{${pairs.map(([k, v]) => `${k.startsWith("--") ? k : `--${k}`}:${v}`).join(";")}}`;
};

/**
 * Сетка страницы под кадр РОЛИКА.
 *
 * Слайд свёрстан в сетке шириной `GRID`, а в кадр попадает целиком
 * за счёт увеличения корня документа. Прежде увеличение было числом
 * (1,5) и высота тоже (720), то есть страница годилась ровно одному
 * размеру кадра: у`же — вёрстка вылезала за край и признак кадра краснел
 * на всех сценах, шире — прижималась к левому верхнему углу, оставляя
 * почти половину кадра чернотой, и признак этого не замечал вовсе.
 *
 * Кегли и отступы при этом остаются теми же числами: меняется только
 * увеличение, поэтому сцена, годная в одном кадре, годна и в другом.
 */
/**
 * Ширина сетки по форме кадра. Горизонтальный кадр — 1280, квадрат — 960,
 * вертикальный — 720. Прежде сетка была 1280 при любом кадре, и вертикальный
 * ролик получал горизонтальную вёрстку, ужатую в верхнюю треть кадра: крупные
 * кегли становились мелкими, а две трети кадра оставались пустыми. Узкая сетка
 * при том же увеличении перекладывает вёрстку в столбец (правила
 * `@media (max-aspect-ratio: 4/5)` в оформлении).
 */
export function gridOf(film?: Film): Grid {
  const w = Number(film?.frame?.width ?? 1920), h = Number(film?.frame?.height ?? 1080);
  const gw = w / h >= 1.2 ? 1280 : w / h > 0.8 ? 960 : 720;
  const zoom = w / gw;
  // Отступы страницы — не меньше безопасной зоны формата: площадка кладёт
  // поверх кадра своё, и текст под её кнопками не прочтут.
  const s = film?.safe;
  // Запас в 24 точки сетки — на облёт кадра: сдвиг до девяти точек и дыхание
  // масштаба уводят край содержимого наружу ещё на полтора десятка.
  const pad = (v: number | undefined, d: number): number => Math.max(d, v === undefined ? 0 : Math.ceil(v / zoom) + 24);
  // Подписи поверх слайда стоят у нижнего края зоны: низ слайда оставляет им
  // две строки, иначе подпись ложилась на нижнюю карточку.
  const reserve = s && film?.captionsOnSlides ? Math.round((Math.min(w, h) / 56) * 3.5 * (film.captionsSize ?? 1) * 1.3 * 2 / zoom) + 16 : 0;
  // В кадре без зоны субтитры стоят в 7 % от низа двумя строками кегля 2,15 % ширины
  // (слой композиции); низ слайда уходит над ними, иначе нижний ряд содержимого —
  // подписи оси графика, нижние карточки — ложится под субтитр.
  const under = !s && film?.captionsOnSlides ? Math.round((h * 0.07 + (w / 100) * 3.33 * (film.captionsSize ?? 1) * 1.3 * 2) / zoom) + 16 : 0;
  // Полоса хода и название части (film.ts) стоят у своего края кадра: полоса в 0,6 % высоты,
  // над ней на 0,6 поля плашка названия (part-label.ts). Край слайда у полосы оставляет им место,
  // иначе плашка ложилась на надзаголовок или нижний пункт.
  const bar = film?.progressAt ? Math.round((h * 0.006 + w * 0.018 * 0.6 + partLabelHeight({ width: w, height: h }) + 16) / zoom) + 16 : 0;
  // Субтитры сверху забирают себе верх слайда, посередине — ничего: там они стоят над
  // содержимым по выбору автора, и слайд под ними не сжимается.
  // `auto` решает сборка по готовому кадру; слайд оставляет место внизу, как по умолчанию.
  const at = film?.captionsAt === "auto" ? "bottom" : film?.captionsAt ?? "bottom";
  const top = at === "top" ? reserve : 0, bottom = at === "bottom" ? reserve : 0;
  const underTop = at === "top" ? under : 0, underBottom = at === "bottom" ? under : 0;
  return { w: gw, h: Math.round(h / zoom), zoom,
    pad: { t: Math.max(pad(s?.top, 52) + top, underTop, film?.progressAt === "top" ? bar : 0), r: pad(s?.right, 72),
      b: Math.max(pad(s?.bottom, 64) + bottom, underBottom, film?.progressAt === "bottom" ? bar : 0), l: pad(s?.left, 72) },
    safe: Boolean(s), ...(underBottom ? { under: true } : {}) };
}

// Поля страницы пишутся всегда: у всех видов слайда один левый край заголовка, надзаголовка и
// содержимого. Прежде без зоны поля брались из запасных значений правил, и виды во весь кадр
// стояли на 84 точках от края, заставка — на 92, а текстовые виды — на 72.
const gridCss = (g: Grid): string =>
  `:root{--sc-zoom:${(Math.round(g.zoom! * 1e4) / 1e4)};--sc-grid-w:${g.w}px;--sc-grid-h:${g.h}px`
  + `;--pad-t:${g.pad!.t}px;--pad-r:${g.pad!.r}px;--pad-b:${g.pad!.b}px;--pad-l:${g.pad!.l}px}`;

export function buildSlide(scene: Slide, outDir: string, film?: Film): string {
  const grid = gridOf(film);
  const body = renderToStaticMarkup(SlideBody({ s: scene, lang: film?.lang, grid }));
  // Сколько элементов расписания на странице — говорит САМА страница.
  // Прежде это считала проверка порядка, зная устройство пяти видов
  // слайда: чужая страница для неё была пустой, сколько бы элементов
  // ни отрисовала. Считается по факту разметки, а не по данным сцены:
  // иначе объявленное разошлось бы с нарисованным ровно там, где
  // проверка и должна краснеть.
  const elements = [...body.matchAll(/class="[^"]*\bel\b[^"]*"/g)].length;
  // Язык страницы — язык ролика: от него зависят переносы и типографика,
  // и «ru» навсегда было бы решением инструмента за автора.
  // Сетка идёт ПЕРЕД темой: тема вправе перебить и её.
  const html = page(scene.title ?? "", body, elements,
    gridCss(grid) + themeCss(film), film?.lang ?? "en", scene.background, scene.align);
  mkdirSync(outDir, { recursive: true });
  const file = `${outDir}/${scene.id}.html`;
  writeFileSync(file, html);
  return file;
}

// Сравниваются РАЗРЕШЁННЫЕ ПУТИ, а не URL со строкой пути: файловый URL
// процентно кодирован (путь с пробелом не совпадёт никогда), а URL модуля
// уже разрешён по ссылкам, тогда как argv[1] — нет. В обоих случаях блок
// молча не исполняется: команда печатает пустоту с кодом 0.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Оба аргумента обязательны: умолчание писало слайды внутрь каталога
  // продукта, то есть чужой запуск мусорил в установленном пакете.
  // Точка входа — `agentic-screencast slides --source story.md`.
  if (!process.argv[2] || !process.argv[3]) {
    console.error("slides.js <файл-слайдов.json> <каталог-вывода>");
    process.exit(2);
  }
  const deck = JSON.parse(readFileSync(process.argv[2], "utf8")) as Deck;
  const out = process.argv[3];
  const files = deck.slides.map((s) => buildSlide(s, out));
  console.log(JSON.stringify({ built: files.length, dir: out }, null, 1));
}
