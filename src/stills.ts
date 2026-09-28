// Контрольные кадры: моменты сцены, в которые сборка снимает кадр готового ролика в файл.
//
// Агент проверяет ролик глазами, и моменты для этого он знает уже в сценарии: где карточка
// должна читаться, где лупа стоит над предметом, где субтитры не должны наезжать на слайд.
// Поле сцены `stills` называет эти моменты теми же словами, что и остальной сценарий, — такт
// (`b2`, `b2+0.5`, `b2.end-0.3`), доля сцены (`80%`), секунды (`1.5`) или отметка живого дубля
// (`@done`), — и по желанию что в кадре проверить (`b2 :: the card is readable`). Сборка кладёт
// кадры рядом с роликом и перечисляет их в отчёте: смотреть можно сразу, без угадывания секунд.
import { anchorSeconds } from "./spotlight.js";
import { filmTimeOf, type SpeedStep } from "./speed.js";

export interface Still {
  /** момент, как он записан в сценарии */
  at: string;
  /** что в этом кадре проверить */
  note?: string;
  /** момент — отметка живого дубля: секунды клипа, до замедления и остановок */
  clip?: number;
  /** не момент, а шаг: кадр каждые столько секунд сцены (`every 1s`) — видно, что идёт между моментами */
  every?: number;
}

const MOMENT = /^(b\d+(\.end)?(\s*[+-]\s*[\d.]+)?|[\d.]+\s*%|[\d.]+s?|clip:[\d.]+)$/i;

/**
 * Разбор поля `stills`: моменты через `|`, у каждого после `::` — что проверить. Отметка
 * дубля к этому времени уже заменена секундами клипа в виде `clip:<секунды>`.
 */
export function parseStills(value: string, where: string): Still[] {
  const out = value.split("|").map((raw) => raw.trim()).filter(Boolean).map((raw): Still => {
    const [moment, ...rest] = raw.split("::");
    const at = moment!.trim(), note = rest.join("::").trim();
    const every = /^every\s+([\d.]+)\s*s?$/i.exec(at);
    if (every) {
      const step = Number(every[1]);
      if (!(step >= 0.25 && step <= 10)) throw new Error(`${where}: «${at}» — the step is 0.25–10 seconds`);
      return { at: `every ${step}s`, every: step, ...(note ? { note } : {}) };
    }
    if (!MOMENT.test(at)) throw new Error(`${where}: «${at}» is not a moment; use b2, b2+0.5, b2.end, 80%, 1.5, @mark or every 1s`);
    const clip = /^clip:([\d.]+)$/i.exec(at);
    return { at: clip ? `@${clip[1]}` : at, ...(note ? { note } : {}), ...(clip ? { clip: Number(clip[1]) } : {}) };
  });
  if (!out.length) throw new Error(`${where}: name at least one moment`);
  return out;
}

/**
 * Секунда сцены, в которую снимается кадр. Такты — измеренные начала речи сцены; отметка дубля
 * — секунда клипа, которую замедление и остановки сдвигают так же, как сам клип. Кадр берётся
 * внутри сцены: не раньше её начала и не позже последнего кадра.
 */
export function stillTime(still: Still, scene: { starts: number[]; duration: number; speed?: SpeedStep[]; ends?: number[] }, fps: number): number {
  // `bN.end` у кадра — конец речи такта, а не начало следующего: у последнего такта это иначе
  // был бы конец сцены вместе с хвостом и уходящим переходом, и кадр попадал бы в переход.
  const end = /^b(\d+)\.end(?:\s*([+-])\s*([\d.]+))?$/i.exec(still.at.trim());
  const spokenEnd = end && scene.ends?.[Number(end[1]) - 1];
  const t = still.clip !== undefined ? (scene.speed?.length ? filmTimeOf(scene.speed, still.clip) : still.clip)
    : spokenEnd !== undefined && spokenEnd !== null ? spokenEnd + (end![3] ? Number(end![3]) * (end![2] === "-" ? -1 : 1) : 0)
    : anchorSeconds(still.at.replace(/s$/i, ""), scene.starts, scene.duration);
  return Math.max(0, Math.min(scene.duration - 1 / fps, t));
}

/** Секунды сцены для шага `every`: от начала сцены с этим шагом, пока сцена идёт. */
export function stillSteps(step: number, duration: number, fps: number): number[] {
  const out: number[] = [];
  for (let t = 0; t < duration - 1 / fps; t = Math.round((t + step) * 1000) / 1000) out.push(t);
  return out;
}

/** Имя файла кадра: номер по порядку, сцена и момент — по имени видно, что это за кадр. */
export function stillName(index: number, scene: string, still: Still): string {
  const slug = still.at.toLowerCase().replace(/[^a-z0-9.%+-]+/g, "").replace(/%/g, "pct").replace(/\+/g, "p").replace(/-/g, "m");
  return `${String(index + 1).padStart(2, "0")}-${scene}-${slug || "t"}.png`;
}
