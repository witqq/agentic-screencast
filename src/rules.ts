// Какое правило базы стоит за каждой машинной находкой. Находка `lint` и предупреждение сборки
// называют себя устойчивым `id`, а правило — номером: `FC-N` — правило N из docs/film-craft.md,
// `VA-N` — шаг N раздела «Checking a licence and writing the credit» из docs/visual-assets.md: по нему агент
// находит в базе, почему это плохо и как бывает хорошо, а не только что сработала проверка.
// Формат находки общий с agentic-report: {rule, id, message, hint}; подсказка — словами из словаря.
import { msg } from "./msg.js";

export const RULES: Record<string, `FC-${number}` | `VA-${number}`> = {
  // lint: по сценарию, до сборки
  "two-text-layers": "FC-5",
  "overloaded-line": "FC-35",
  "untranslated": "FC-35",
  "title-over-interface": "FC-6",
  "captions-top-progress": "FC-34",
  "speed-range": "FC-17",
  "still-hold": "FC-8",
  "still-scene": "FC-9",
  "page-unmarked": "FC-9",
  "take-small": "FC-46",
  "take-theme": "FC-32",
  "piece-crosses-mark": "FC-54",
  "scene-jump": "FC-16",
  "empty-area": "FC-58",
  "long-scene": "FC-58",
  "first-transition": "FC-52",
  "push-crop": "FC-33",
  "loupe-scale": "FC-33",
  "spotlight-collision": "FC-50",
  "typing-too-fast": "FC-59",
  "number-source": "FC-56",
  "karaoke-contrast": "FC-62",
  // visual-assets, «Checking a licence and writing the credit»: шаг N
  "uncredited": "VA-5",
  // сборка: по отрисованному и закодированному
  "caption-lines": "FC-35",
  "safe-zone": "FC-58",
  "still-stretch": "FC-9",
  "flashing": "FC-66",
  "silent-action": "FC-25",
  "still-in-fade": "FC-37",
  "still-note": "FC-57",
  "loop-start": "FC-64",
  "legibility": "FC-58",
  "small": "FC-58",
  "cut": "FC-58",
  "overflow": "FC-58",
  "audit": "FC-14",
  "mux": "FC-14",
  "faststart": "FC-14",
};

export interface Finding { rule: `FC-${number}` | `VA-${number}`; id: string; message: string; hint: string }

/** Находка по `id`: номер правила из таблицы и подсказка из словаря (`hint.<id>`). */
export function finding(id: string, message: string): Finding {
  const rule = RULES[id];
  if (!rule) throw new Error(`no film-craft rule for finding «${id}»`);
  return { rule, id, message, hint: msg(`hint.${id}`) };
}
