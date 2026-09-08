#!/usr/bin/env node
// Генератор слайдов: из данных сцены собирает самодостаточную HTML-страницу.
// Четыре вида: сравнение в две колонки, цепочка со связями, крупная величина,
// дословная цитата ответа продукта.
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
import { SlideBody } from "./Slide.js";
import type { Deck, Film, Slide } from "../../source.js";

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
const CONTENT = ".chain .node, .cols .col, .huge, .quote";

const page = (title: string, body: string, elements: number, theme: string,
  lang: string): string => `<!DOCTYPE html>
<html lang="${esc(lang)}"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>${CSS}${theme}</style></head><body data-slidecast-elements="${elements}" data-slidecast-content="${CONTENT}">${body}<div class="rule"></div><script>${RUNTIME}</script></body></html>
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
const GRID = 1280;
const gridCss = (film?: Film): string => {
  const w = Number(film?.frame?.width ?? 1920);
  const h = Number(film?.frame?.height ?? 1080);
  const zoom = w / GRID;
  return `:root{--sc-zoom:${(Math.round(zoom * 1e4) / 1e4)};`
    + `--sc-grid-w:${GRID}px;--sc-grid-h:${Math.round(h / zoom)}px}`;
};

export function buildSlide(scene: Slide, outDir: string, film?: Film): string {
  const body = renderToStaticMarkup(SlideBody({ s: scene }));
  // Сколько элементов расписания на странице — говорит САМА страница.
  // Прежде это считала проверка порядка, зная устройство пяти видов
  // слайда: чужая страница для неё была пустой, сколько бы элементов
  // ни отрисовала. Считается по факту разметки, а не по данным сцены:
  // иначе объявленное разошлось бы с нарисованным ровно там, где
  // проверка и должна краснеть.
  const elements = [...body.matchAll(/class="el"/g)].length;
  // Язык страницы — язык ролика: от него зависят переносы и типографика,
  // и «ru» навсегда было бы решением инструмента за автора.
  // Сетка идёт ПЕРЕД темой: тема вправе перебить и её.
  const html = page(scene.title ?? "", body, elements,
    gridCss(film) + themeCss(film), film?.lang ?? "en");
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
