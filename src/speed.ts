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
  /**
   * Seconds of the source over which the rate glides from 1 to `rate` at the start of the span and
   * back to 1 at its end — a speed ramp instead of a step. At most half the span.
   */
  ramp?: number;
  /**
   * Draw the frames a slowed stretch lacks instead of repeating them: `motion` estimates movement
   * between source frames (ffmpeg minterpolate), `blend` cross-fades neighbours (cheaper, softer).
   */
  interpolate?: "motion" | "blend";
}

/**
 * Секунда готового куска, которой соответствует секунда `s` от начала переигранного куска.
 *
 * Без разгона это `s / rate`. С разгоном растяжение k = 1/rate меняется линейно от 1 до K за `ramp`
 * секунд в начале куска и обратно в конце, а время готового куска — интеграл растяжения: так
 * кадры исходника расходятся постепенно, без ступеньки на границе куска.
 */
export function spanOut(span: SpeedSpan, s: number): number {
  const L = span.to - span.from, K = 1 / span.rate, a = Math.min(span.ramp ?? 0, L / 2);
  const x = Math.max(0, Math.min(L, s));
  if (a <= 0) return K * x;
  if (x <= a) return x + (K - 1) * x * x / (2 * a);
  const o1 = a + (K - 1) * a / 2;
  if (x <= L - a) return o1 + K * (x - a);
  const v = x - (L - a), o2 = o1 + K * (L - 2 * a);
  return o2 + K * v - (K - 1) * v * v / (2 * a);
}

/** Та же кривая выражением ffmpeg от `T` (секунд от начала куска) — для `setpts`. */
function spanOutExpr(span: SpeedSpan): string {
  const L = span.to - span.from, K = 1 / span.rate, a = Math.min(span.ramp ?? 0, L / 2);
  const f = (v: number): string => v.toFixed(6);
  if (a <= 0) return `T*${f(K)}`;
  const o1 = a + (K - 1) * a / 2, o2 = o1 + K * (L - 2 * a);
  return `if(lt(T,${f(a)}),T+${f(K - 1)}*T*T/${f(2 * a)},if(lt(T,${f(L - a)}),${f(o1)}+${f(K)}*(T-${f(a)}),`
    + `${f(o2)}+${f(K)}*(T-${f(L - a)})-${f(K - 1)}*(T-${f(L - a)})*(T-${f(L - a)})/${f(2 * a)}))`;
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
    const allowed = hold ? ["at", "hold"] : ["from", "to", "rate", "ramp", "interpolate"];
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
    const span: SpeedSpan = { from: from as number, to: to as number, rate: rate as number };
    const { ramp, interpolate } = raw as { ramp?: unknown; interpolate?: unknown };
    if (ramp !== undefined) {
      if (typeof ramp !== "number" || !Number.isFinite(ramp) || ramp <= 0) throw new Error(`speed[${i}].ramp: expected seconds of the source`);
      if (ramp > (span.to - span.from) / 2 + 1e-9) throw new Error(`speed[${i}].ramp: at most half the span (${((span.to - span.from) / 2).toFixed(2)} s)`);
      span.ramp = ramp;
    }
    if (interpolate !== undefined) {
      const mode = interpolate === true ? "motion" : interpolate;
      if (mode !== "motion" && mode !== "blend") throw new Error(`speed[${i}].interpolate: expected true, "motion" or "blend"`);
      span.interpolate = mode;
    }
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
  // Дорисованный отрезок (`interpolate`) идёт в частоте ролика, а простые части — в частоте клипа
  // (29,97, 31…): склейка частей разной частоты выдавала кадры без конца. Тогда все части приводятся
  // к частоте ролика; без дорисовки части идут как есть — метки времени каждого кадра исходника.
  const cfr = steps.some((st) => !isHold(st) && (st as SpeedSpan).interpolate) ? `,fps=${fps}` : "";
  const plain = (from: number, to: number, rate: number): void => {
    if (to <= from) return;
    parts.push(`[0:v]trim=start=${from}:end=${to},setpts=(PTS-STARTPTS)`
      + `${rate === 1 ? "" : `/${rate}`}${cfr}[p${parts.length}]`);
  };
  // Переигранный кусок: время по кривой разгона и, если названо, дорисованные кадры до частоты ролика.
  const span = (s: SpeedSpan): void => {
    const smooth = s.interpolate === "motion" ? `,minterpolate=fps=${fps}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1`
      : s.interpolate === "blend" ? `,minterpolate=fps=${fps}:mi_mode=blend` : "";
    parts.push(`[0:v]trim=start=${s.from}:end=${s.to},setpts=PTS-STARTPTS,setpts='(${spanOutExpr(s)})/TB'${smooth}${cfr}[p${parts.length}]`);
  };
  for (const step of steps) {
    plain(cursor, stepStart(step), 1);
    if (isHold(step)) {
      // Остановка времени — ОДИН кадр, достоенный до нужной длины: клип на этом месте не тратится,
      // поэтому после остановки движение продолжается ровно с того же места.
      parts.push(`[0:v]trim=start=${step.at}:end=${step.at + 1 / fps},setpts=(PTS-STARTPTS),`
        + `tpad=stop_mode=clone:stop_duration=${step.hold}${cfr}[p${parts.length}]`);
      cursor = step.at;
    } else {
      if (step.ramp || step.interpolate) span(step); else plain(step.from, step.to, step.rate);
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
    out += spanOut(step, length) - length;
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
      out += spanOut(step, length) - length;
    } else if (step.from < sourceTime) {
      const length = sourceTime - step.from;
      out += spanOut(step, length) - length;
    }
  }
  return out;
}
