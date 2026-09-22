/** Retiming of an imported clip: a named stretch plays slower or faster.
 *
 * Why the tool owns this. Slow motion is a storytelling device, not an
 * editing accident: it is how a shot says «this is the moment to look at».
 * Without it an author either re-records the take at another speed, which
 * changes what the product actually did, or re-encodes the clip by hand
 * outside the scenario, and the scenario stops describing the film.
 */
export interface SpeedSpan {
  /** Second of the SOURCE clip where the retimed stretch begins. */
  from: number;
  /** Second of the source clip where it ends. */
  to: number;
  /** Playback rate: 0.5 is half speed, 2 is double speed. */
  rate: number;
}

/**
 * A stop of time inside a clip: the named second is held for `hold` seconds, then the clip goes on.
 *
 * Why it belongs to the clip and not to a separate scene. A held frame is a SHOT DEVICE: motion
 * runs, time stops, the camera walks the frozen frame, and motion resumes — all in one continuous
 * shot. Cutting the hold into its own scene breaks that: the viewer sees a jump, the card loses
 * the moment it explains, and the rest of the scene stands still because its material ran out.
 */
export interface SpeedHold {
  /** Second of the SOURCE clip that is held. */
  at: number;
  /** How long it is held, in seconds of the finished film. */
  hold: number;
}

/** Either kind of retiming, in the order they appear in the clip. */
export type SpeedStep = SpeedSpan | SpeedHold;

/** Остановка времени отличается от переигрывания полем: у неё есть `hold`, а не `rate`. */
export function isHold(step: SpeedStep): step is SpeedHold {
  return (step as SpeedHold).hold !== undefined;
}

/** Момент, с которого шаг начинается в ИСХОДНОМ клипе. */
export const stepStart = (step: SpeedStep): number => (isHold(step) ? step.at : step.from);

/** Момент, которым шаг кончается в исходном клипе: остановка времени клип не тратит. */
export const stepEnd = (step: SpeedStep): number => (isHold(step) ? step.at : step.to);

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Reject malformed, overlapping or unreadably extreme retiming. */
export function parseSpeed(json: string): SpeedStep[] {
  let value: unknown;
  try { value = JSON.parse(json); }
  catch { throw new Error("speed: expected a JSON array of steps"); }
  if (!Array.isArray(value) || !value.length) {
    throw new Error("speed: expected a non-empty JSON array of steps");
  }
  let previousEnd = 0;
  const steps = value.map((raw: unknown, i: number): SpeedStep => {
    if (!object(raw)) throw new Error(`speed[${i}]: expected an object`);
    const hold = raw.hold !== undefined;
    const allowed = hold ? ["at", "hold"] : ["from", "to", "rate"];
    for (const key of Object.keys(raw)) {
      if (!allowed.includes(key)) {
        throw new Error(`speed[${i}]: unknown property «${key}» for a ${hold ? "hold" : "span"}`);
      }
    }
    if (hold) {
      const { at, hold: length } = raw as { at: unknown; hold: unknown };
      for (const [name, v] of [["at", at], ["hold", length]] as const) {
        if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
          throw new Error(`speed[${i}].${name}: expected a non-negative number of seconds`);
        }
      }
      // Пределы — из читаемости: короче полусекунды остановка не читается как остановка,
      // длиннее двенадцати секунд замерший кадр перестаёт быть приёмом и становится паузой.
      if ((length as number) < 0.5 || (length as number) > 12) {
        throw new Error(`speed[${i}].hold: expected 0.5–12 seconds`);
      }
      return { at: at as number, hold: length as number };
    }
    const { from, to, rate } = raw as { from: unknown; to: unknown; rate: unknown };
    for (const [name, v] of [["from", from], ["to", to], ["rate", rate]] as const) {
      if (typeof v !== "number" || !Number.isFinite(v)) {
        throw new Error(`speed[${i}].${name}: expected a number`);
      }
    }
    const span = { from: from as number, to: to as number, rate: rate as number };
    if (span.from < 0) throw new Error(`speed[${i}].from: expected a non-negative second`);
    if (span.to <= span.from) throw new Error(`speed[${i}]: to must be later than from`);
    // Пределы взяты из читаемости, а не из возможностей кодека: медленнее пятой доли скорости
    // движение перестаёт читаться как движение, быстрее четырёхкратного — как показ, а не как
    // перемотка.
    if (span.rate < 0.2 || span.rate > 4) throw new Error(`speed[${i}].rate: expected 0.2–4`);
    if (span.rate === 1) throw new Error(`speed[${i}].rate: 1 changes nothing`);
    return span;
  });
  for (const [i, step] of steps.entries()) {
    if (stepStart(step) < previousEnd) {
      throw new Error(`speed[${i}]: steps must not overlap and must go in order`);
    }
    previousEnd = stepEnd(step);
  }
  return steps;
}

/**
 * Фильтр `ffmpeg`, который переигрывает названные куски, вставляет остановки времени и склеивает
 * всё с остальным в прежнем порядке.
 *
 * Возвращает `null`, когда делать нечего: вызывающему тогда не нужен ни временный файл, ни лишний
 * проход через кодек.
 */
export function speedFilter(steps: SpeedStep[], duration: number, fps: number): string | null {
  if (!steps.length) return null;
  const last = steps[steps.length - 1]!;
  if (stepEnd(last) > duration + 0.001) {
    throw new Error(`speed: step ends at ${stepEnd(last)}s, past the ${duration.toFixed(2)}s clip`);
  }
  const parts: string[] = [];
  let cursor = 0;
  const plain = (from: number, to: number, rate: number): void => {
    if (to <= from) return;
    parts.push(`[0:v]trim=start=${from}:end=${to},setpts=(PTS-STARTPTS)`
      + `${rate === 1 ? "" : `/${rate}`}[p${parts.length}]`);
  };
  for (const step of steps) {
    plain(cursor, stepStart(step), 1);
    if (isHold(step)) {
      // Остановка времени — ОДИН кадр, достоенный до нужной длины: клип на этом месте не тратится,
      // поэтому после остановки движение продолжается ровно с того же места.
      parts.push(`[0:v]trim=start=${step.at}:end=${step.at + 1 / fps},setpts=(PTS-STARTPTS),`
        + `tpad=stop_mode=clone:stop_duration=${step.hold}[p${parts.length}]`);
      cursor = step.at;
    } else {
      plain(step.from, step.to, step.rate);
      cursor = step.to;
    }
  }
  plain(cursor, duration, 1);
  const labels = parts.map((_, i) => `[p${i}]`).join("");
  return `${parts.join(";")};${labels}concat=n=${parts.length}:v=1:a=0[v]`;
}

/** На сколько удлинится клип после переигрывания и остановок. */
export function speedDuration(steps: SpeedStep[], duration: number): number {
  let out = duration;
  for (const step of steps) {
    if (isHold(step)) { out += step.hold; continue; }
    const length = step.to - step.from;
    out += length / step.rate - length;
  }
  return out;
}

/**
 * Момент ГОТОВОГО клипа, которому соответствует названная секунда исходного.
 *
 * Нужен расписанию камеры и карточек: они живут во времени сцены, а сцена идёт по переигранному
 * клипу. Без пересчёта подсветка приходит не туда, где остановилось время.
 */
export function filmTimeOf(steps: SpeedStep[], sourceTime: number): number {
  let out = sourceTime;
  for (const step of steps) {
    if (isHold(step)) {
      if (step.at < sourceTime) out += step.hold;
      continue;
    }
    if (step.to <= sourceTime) {
      const length = step.to - step.from;
      out += length / step.rate - length;
    } else if (step.from < sourceTime) {
      const length = sourceTime - step.from;
      out += length / step.rate - length;
    }
  }
  return out;
}
