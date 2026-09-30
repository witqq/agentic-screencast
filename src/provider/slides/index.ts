// Поставщик слайдов: раскладки, которые инструмент приносит с собой.
//
// Он один из поставщиков, а не устройство ядра. Ядро о словах `compare`
// и `chain` не знает ничего: оно спрашивает у названного поставщика,
// какие у него виды и какие у них поля, и просит породить страницу.
import { buildSlide } from "./page.js";
import { slideOf } from "./from-scene.js";
import type { Film, RawScene } from "../../source.js";
import type { KindSpec, Provider } from "../types.js";

export { BACKGROUNDS } from "./styles.js";

/** Расписание слайда: он не двигается, только проступают его элементы. */
const still = {
  zoom: { from: 0, to: 0, scale: 1 },
  cursor: { hidden: true, from: 0, to: 0.01, start: [-500, -500] },
  spot: { from: 9999 },
  caption: { from: 9999 },
  fade: { in: 0.3, out: 0.3 },
};

const common = ["kicker", "title", "at", "note", "background", "text", "enter", "align", "alive", "glow", "ease", "wave", "stagger", "swap", "pace"];
/** Новые виды держат кадр в движении целиком: облёт, наезд или покой. */
const staged = [...common, "move"];

/**
 * Пороги слайда. Кегль 28 и предел в 220 знаков — про то, что слайд
 * читают с расстояния и он не должен превращаться в страницу текста.
 * Чужому материалу эти числа ничего не должны: он объявит свои.
 */
//
// `coverShareMin` — какую долю кадра страница обязана закрывать собой.
// Слайд рисуется под кадр целиком, поэтому порог высокий: доля заметно
// меньше означает, что вёрстка не по кадру и остаток занимает чернота.
//
// `contrastMin` — отношение контраста текста к его подложке по формуле
// WCAG. Порог 3 — требование к КРУПНОМУ тексту, кеглю заголовка от 48 точек
// на кадр 1080; основной текст мельче, и ему проверка ставит 4,5 (WCAG AA):
// слайд смотрят уменьшенным, и 28 точек кадра на экране — уже не крупный
// текст. Порог различает два состояния,
// между которыми зритель не выбирает: тема сменила фон, но не подложку
// карточек, и текст лёг на чужой цвет — читать нельзя, хотя все прочие
// признаки зелены. Поставляемая тема даёт с запасом: минимум по всем
// сценам собственного примера — 6,56, у сценария заявки столько же.
const check = { chars: 220, body: 28, title: 40, huge: 80,
  coverShareMin: 0.95, contrastMin: 3 };

export const KINDS: Record<string, KindSpec> = {
  chapter: {
    about: "animated opening or chapter with a clear headline and one explanatory sentence",
    fields: [...common, "body"],
    required: [["title"], ["body"]],
    silentOk: true,
    chapterFrom: ["kicker", "title"],
    arrival: true,
    // Заставка набирает заголовок с 0,7 с и текст с 2,4 с (Slide.tsx), если у неё не задан
    // кинетический текст (`text`).
    typing: [{ field: "title", from: 0.7, cps: 22, unless: "text" }, { field: "body", from: 2.4, cps: 34, unless: "text" }],
    effects: { ...still, fade: { in: 0.7, out: 0.7 } },
    check,
  },
  compare: {
    about: "a comparison in two columns: without and with, «Title (bad|good|plain) :: text | item»",
    fields: [...common, "left", "right"],
    required: [["left"], ["right"]],
    effects: still,
    check,
  },
  chain: {
    about: "a chain of nodes joined by arrows, with a line about what goes back",
    fields: [...common, "nodes", "back"],
    required: [["nodes"]],
    effects: still,
    check,
  },
  number: {
    about: "a large number with its label; several side by side, tags below",
    fields: [...common, "value", "label", "values", "tags", "count"],
    required: [["values", "value"]],
    numbers: true,
    effects: still,
    check,
  },
  quote: {
    about: "a verbatim quote of a real answer, in parts «label :: text»",
    fields: [...common, "parts"],
    required: [["parts"]],
    effects: still,
    check,
  },
  hero: {
    about: "opening statement: a headline that rises word by word over a live background, optional picture behind it; fill pours a picture into the letters of the headline",
    fields: [...staged, "body", "image", "fill"],
    required: [["title"]],
    silentOk: true,
    chapterFrom: ["kicker", "title"],
    effects: { ...still, fade: { in: 0.5, out: 0.5 } },
    check,
  },
  steps: {
    about: "numbered steps that light up one by one with the narration: «Title :: text | …»",
    fields: [...staged, "items"],
    required: [["items"]],
    effects: still,
    check,
  },
  features: {
    about: "a grid of two to six capabilities with icons that flip in one by one: «🚀 Title :: text | …»",
    fields: [...staged, "items"],
    required: [["items"]],
    icons: "items",
    effects: still,
    check,
  },
  timeline: {
    about: "milestones along a line that draws itself: «2024 :: text | …»",
    fields: [...staged, "items"],
    required: [["items"]],
    effects: still,
    check,
  },
  counter: {
    about: "figures that roll up like an odometer, a ring for percentages: «1200+ :: label | 98% :: label»",
    fields: [...staged, "values", "value", "count", "spark"],
    required: [["values", "value"]],
    numbers: true,
    effects: still,
    check,
  },
  beforeafter: {
    about: "two states of an interface in one frame: before on the left, after on the right, and a divider that travels across",
    fields: [...staged, "image", "after", "labels", "split"],
    required: [["image"], ["after"]],
    silentOk: true,
    effects: still,
    check,
  },
  perspective: {
    about: "a screenshot on a screen in perspective, drawn with WebGL: the camera orbits it, a glint crosses it, a reflection lies below",
    fields: [...staged, "image", "body"],
    required: [["image"]],
    silentOk: true,
    effects: still,
    check,
  },
  parallax: {
    about: "a screenshot that comes apart into panels at different depths: «x y w h @ depth | …», the near ones move more",
    fields: [...staged, "image", "panels"],
    required: [["image"], ["panels"]],
    silentOk: true,
    effects: still,
    check,
  },
  chart: {
    about: "a bar or line chart drawn from a CSV «label,value» beside the scenario: bars grow, a line draws itself, the peak lights up; type: race runs a bar chart race over the periods of a CSV «name,2020,2021,…»",
    fields: [...staged, "data", "type", "peak"],
    required: [["data"]],
    numbers: true,
    silentOk: true,
    effects: still,
    check,
  },
  // Код читают с экрана, а не с расстояния слайда: знаков в нём больше, а
  // кегль моноширинного шрифта мельче. Пороги объявлены для него отдельно.
  code: {
    about: "code that types itself with syntax colours; from the scenario (code) or a file (file, lines), highlight lines",
    fields: [...staged, "code", "file", "lines", "highlight", "cps", "name"],
    required: [["code", "file"]],
    effects: still,
    check: { ...check, chars: 520, body: 22 },
  },
  photo: {
    about: "a picture with a slow push-in towards a point (Ken Burns) and an optional caption",
    fields: [...staged, "body", "image", "point", "push"],
    required: [["image"]],
    silentOk: true,
    effects: still,
    check,
  },
  // Строка адреса — часть рамки, а не текст для чтения: её кегль мельче.
  shot: {
    about: "a screenshot inside a browser or phone frame that floats in 3D; a tall screenshot scrolls",
    fields: [...staged, "body", "image", "device"],
    required: [["image"]],
    silentOk: true,
    effects: still,
    check: { ...check, body: 16 },
  },
  // Живые виды: кадр держит движение, пока идёт речь, — лента едет, стопка листается,
  // орбита вращается, чат пишет (docs/motion-design.md, «Effect vocabulary»).
  marquee: {
    about: "an endless strip of logos or short labels that runs sideways, one row or two in opposite directions: «🟣 Linear | 🟢 Notion | …» — \"many use it and the list goes on\"",
    fields: [...staged, "items", "rows", "speed"],
    required: [["items"]],
    icons: "items",
    silentOk: true,
    effects: still,
    check,
  },
  stack: {
    about: "a deck of cards: the top one flies off on each beat and the deck springs forward: «Title :: text | …» — one at a time, the rest waiting",
    fields: [...staged, "items"],
    required: [["items"]],
    icons: "items",
    silentOk: true,
    effects: still,
    check,
  },
  orbit: {
    about: "icons circling the product on one or two orbits around the centre (kicker and title in the middle): «🟣 Linear | 🟢 Notion | …» — integrations, an ecosystem",
    fields: [...staged, "items"],
    required: [["items"]],
    icons: "items",
    silentOk: true,
    effects: still,
    check,
  },
  chat: {
    about: "a conversation that writes itself: bubbles pop in turn, before each answer the assistant shows «Thinking…» with a sheen running over it and skeleton bars: «you :: question | bot :: answer | …»",
    fields: [...staged, "items"],
    required: [["items"]],
    silentOk: true,
    effects: still,
    check,
  },
  carousel: {
    about: "cards standing in a real 3D ring that turns to bring the next card forward on each beat: «🚀 Title :: text | …» — a whole set with no start or end",
    fields: [...staged, "items"],
    required: [["items"]],
    icons: "items",
    silentOk: true,
    effects: still,
    check,
  },
  globe: {
    about: "a WebGL globe of dots that turns; from the first city arcs fly to the others in turn and ping where they land: «Berlin :: 52.5 13.4 | Tokyo :: 35.7 139.7 | …» (latitude longitude)",
    fields: [...staged, "items", "map"],
    required: [["items"]],
    silentOk: true,
    effects: still,
    check,
  },
  wall: {
    about: "a wall of screenshots tilted in 3D, its columns sliding past each other with the title over it: «images: a.png | b.png | c.png | …» — the product is big, there are many screens",
    fields: [...staged, "images"],
    required: [["images"]],
    silentOk: true,
    effects: still,
    check,
  },
  cloud: {
    about: "labels or icons on a turning sphere, near ones large and bright, far ones small and dim: «🟣 Linear | 🟢 Notion | …» — everything revolves around the product, in depth",
    fields: [...staged, "items"],
    required: [["items"]],
    icons: "items",
    silentOk: true,
    effects: still,
    check,
  },
  shell: {
    about: "a terminal that works: commands type themselves after a prompt, a spinner turns, output appears line by line: «$ npm test :: ✔ 302 passed | …» — a developer product doing real work",
    fields: [...staged, "items", "name"],
    required: [["items"]],
    silentOk: true,
    effects: still,
    check: { ...check, chars: 520, body: 22 },
  },
  layers: {
    about: "an exploded view of a screenshot: its panels («x y w h @ depth | …») lift off in 3D, the camera tilts round the stack, and they settle back flat by the end",
    fields: [...staged, "image", "panels"],
    required: [["image"], ["panels"]],
    silentOk: true,
    effects: still,
    check,
  },
  bento: {
    about: "a bento grid: cells of different sizes, the first one large and the last ones wide so the grid closes, each tilting in from depth: «🚀 Title :: text | …» — what matters most gets the most room",
    fields: [...staged, "items"],
    required: [["items"]],
    icons: "items",
    silentOk: true,
    effects: still,
    check,
  },
  // Кегль карты подбирается под ширину кадра, а не задаётся: пороги текста у неё свои.
  card: {
    about: "a trailer card: one to three words across the whole frame that slam in with a flash, a shake, a sheen over metal letters and rising sparks",
    fields: ["title", "kicker", "at", "background", "fill"],
    required: [["title"]],
    trailer: true,
    silentOk: true,
    effects: { ...still, fade: { in: 0.05, out: 0.2 } },
    check,
  },
  titlecard: {
    about: "the film's title: spaced capitals in the theme's accent with a metal sheen, a line above (kicker), a date below (body), a flare across the frame; « / » breaks the title into lines",
    fields: ["title", "kicker", "body", "at", "background"],
    required: [["title"]],
    trailer: true,
    silentOk: true,
    chapterFrom: ["title"],
    effects: { ...still, fade: { in: 0.3, out: 0.6 } },
    check,
  },
  outro: {
    about: "closing card: headline, one line, a call to action and an address; with image, a short line over the frame of the result",
    fields: [...staged, "body", "cta", "url", "image"],
    required: [["title"]],
    silentOk: true,
    arrival: true,
    effects: { ...still, fade: { in: 0.5, out: 0.9 } },
    check,
  },
};

// Каждый слайд стоит на живом фоне и собирается входами — материал движется сам.
for (const spec of Object.values(KINDS)) spec.moving = true;

// Что из полей слайда зритель читает в кадре, а что управляет показом. Поле, не
// попавшее ни в один список, остаётся неразделённым, и тест полноты это ловит.
// Файл данных графика несёт его подписи: у варианта на другом языке — свой файл (`data.ru:`).
const SHOWN = ["title", "kicker", "body", "note", "items", "left", "right", "nodes", "back", "parts",
  "values", "value", "label", "tags", "cta", "data", "labels"];
const STAGING = ["align", "at", "background", "code", "count", "cps", "device", "enter", "file", "highlight", "image",
  "lines", "move", "name", "point", "push", "text", "url", "type", "peak", "after", "split", "panels", "rows", "speed",
  "images", "fill", "swap", "map", "pace"];
for (const spec of Object.values(KINDS)) {
  spec.shown = spec.fields.filter((f) => SHOWN.includes(f));
  spec.staging = spec.fields.filter((f) => STAGING.includes(f));
}

export const slidesProvider: Provider = {
  name: "slides",
  kinds: () => KINDS,
  page: (scene: RawScene, outDir: string, film: Film): string =>
    buildSlide(slideOf(scene, film.dir), outDir, film),
  validate: (scene: RawScene, film: Film): void => { slideOf(scene, film.dir); },
};
