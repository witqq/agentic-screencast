// Знание в момент решения: `agentic-screencast craft <тема>` отдаёт 3–7 правил базы, нужных сейчас,
// — при выборе вида сцены, приёма или жанра. Длинный документ агент читает один раз в начале и
// теряет при сжатии контекста; короткая выдача по теме приходит тогда, когда решение принимается.
//
// Текст правил не копируется: команда читает заголовок и первый абзац правила из
// docs/film-craft.md, поэтому знание живёт в одном месте. Здесь лежит только то, какие правила
// относятся к теме. Находка `lint` или сборки тоже тема: `craft still-scene` — её правило.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PRODUCT_ROOT } from "./self-hash.js";
import { RULES } from "./rules.js";
import { msg } from "./msg.js";

/** Тема → номера правил film-craft, по порядку важности для решения. */
export const TOPICS: Record<string, number[]> = {
  // виды сцен
  slides: [58, 59, 36, 9, 43],
  page: [13, 43, 9, 58, 60],
  video: [21, 25, 54, 19, 46],
  report: [60, 58, 7, 18, 33],
  trailer: [44, 63, 52, 61, 48],
  // приёмы
  spotlight: [7, 18, 33, 50, 45, 60],
  camera: [7, 45, 50, 33, 60],
  speed: [17, 8, 54, 25],
  freeze: [17, 8, 45],
  captions: [5, 6, 16, 34, 35, 51, 53],
  text: [5, 16, 24, 36, 59],
  cards: [24, 5, 6, 16],
  transitions: [52, 61, 48],
  sound: [61, 44, 63],
  vertical: [35, 51, 53, 58, 60],
  capture: [19, 21, 22, 29, 42, 55],
  stills: [37, 57, 31, 14],
  theme: [10, 32, 38, 62],
  numbers: [56, 12, 2],
  // жанры
  "product-demo": [40, 41, 27, 12, 64, 65],
  explainer: [3, 4, 41, 13, 65],
  pitch: [64, 40, 41, 65, 2],
  reel: [64, 58, 35, 65, 66],
  release: [2, 27, 40, 64, 65],
  story: [1, 2, 4, 40, 41, 64, 65],
};

export interface CraftRule { rule: string; title: string; text: string }

/** Правило film-craft по номеру: заголовок и первый абзац — само правило, без контрпримера. */
function ruleOf(doc: string, n: number): CraftRule {
  const m = new RegExp(`\\n## ${n}\\. ([^\\n]+)\\n\\n([\\s\\S]*?)(?:\\n\\n|$)`, "u").exec(doc);
  if (!m) throw new Error(`film-craft has no rule ${n}`);
  return { rule: `FC-${n}`, title: m[1]!.trim(), text: m[2]!.replace(/\s+/gu, " ").trim() };
}

export function craftTopics(): string[] {
  return [...Object.keys(TOPICS), ...Object.keys(RULES).filter((id) => RULES[id]!.startsWith("FC-"))];
}

/** Правила темы. Неизвестная тема — ошибка с перечнем тем. */
export function craft(topic: string): CraftRule[] {
  const file = resolve(PRODUCT_ROOT, "docs", "film-craft.md");
  if (!existsSync(file)) throw new Error(msg("craft.noDoc", { path: file }));
  const doc = readFileSync(file, "utf8");
  const finding = RULES[topic];
  const numbers = TOPICS[topic] ?? (finding?.startsWith("FC-") ? [Number(finding.slice(3))] : undefined);
  if (!numbers) throw new Error(msg("craft.unknown", { topic, topics: Object.keys(TOPICS).join(", ") }));
  return numbers.map((n) => ruleOf(doc, n));
}
