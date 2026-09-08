// Поставщик слайдов: пять раскладок, которые инструмент приносит с собой.
//
// Он один из поставщиков, а не устройство ядра. Ядро о словах `compare`
// и `chain` не знает ничего: оно спрашивает у названного поставщика,
// какие у него виды и какие у них поля, и просит породить страницу.
import { buildSlide } from "./page.js";
import { slideOf } from "./from-scene.js";
import type { Film, RawScene } from "../../source.js";
import type { KindSpec, Provider } from "../types.js";

/** Расписание слайда: он не двигается, только проступают его элементы. */
const still = {
  zoom: { from: 0, to: 0, scale: 1 },
  cursor: { hidden: true, from: 0, to: 0.01, start: [-500, -500] },
  spot: { from: 9999 },
  caption: { from: 9999 },
  fade: { in: 0.3, out: 0.3 },
};

const common = ["kicker", "title", "at", "note"];

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
// WCAG. Порог 3 — это требование к КРУПНОМУ тексту, а слайдовый текст
// крупный по построению (кегль не ниже 28). Он различает два состояния,
// между которыми зритель не выбирает: тема сменила фон, но не подложку
// карточек, и текст лёг на чужой цвет — читать нельзя, хотя все прочие
// признаки зелены. Поставляемая тема даёт с запасом: минимум по всем
// сценам собственного примера — 6,56, у сценария заявки столько же.
const check = { chars: 220, body: 28, title: 40, huge: 80,
  coverShareMin: 0.95, contrastMin: 3 };

export const KINDS: Record<string, KindSpec> = {
  compare: {
    about: "сравнение «без / с» в две колонки",
    fields: [...common, "left", "right"],
    required: [["left"], ["right"]],
    effects: still,
    check,
  },
  chain: {
    about: "цепочка узлов со стрелками и подписью возврата",
    fields: [...common, "nodes", "back"],
    required: [["nodes"]],
    effects: still,
    check,
  },
  number: {
    about: "крупная величина с подписью",
    fields: [...common, "value", "label", "values", "tags"],
    required: [["values", "value"]],
    effects: still,
    check,
  },
  quote: {
    about: "дословная цитата чужого ответа",
    fields: [...common, "parts"],
    required: [["parts"]],
    effects: still,
    check,
  },
};

export const slidesProvider: Provider = {
  name: "slides",
  kinds: () => KINDS,
  page: (scene: RawScene, outDir: string, film: Film): string =>
    buildSlide(slideOf(scene), outDir, film),
};
