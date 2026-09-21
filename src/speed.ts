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

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Reject malformed, overlapping or unreadably extreme retiming. */
export function parseSpeed(json: string): SpeedSpan[] {
  let value: unknown;
  try { value = JSON.parse(json); }
  catch { throw new Error("speed: expected a JSON array of spans"); }
  if (!Array.isArray(value) || !value.length) {
    throw new Error("speed: expected a non-empty JSON array of spans");
  }
  let previousEnd = 0;
  return value.map((raw: unknown, i: number): SpeedSpan => {
    if (!object(raw)) throw new Error(`speed[${i}]: expected an object`);
    for (const key of Object.keys(raw)) {
      if (!["from", "to", "rate"].includes(key)) {
        throw new Error(`speed[${i}]: unknown property «${key}»`);
      }
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
    // Пределы взяты из читаемости, а не из возможностей кодека: медленнее
    // пятой доли скорости движение перестаёт читаться как движение,
    // быстрее четырёхкратного — как показ, а не как перемотка.
    if (span.rate < 0.2 || span.rate > 4) {
      throw new Error(`speed[${i}].rate: expected 0.2–4`);
    }
    if (span.rate === 1) throw new Error(`speed[${i}].rate: 1 changes nothing`);
    if (span.from < previousEnd) throw new Error("speed: spans must not overlap and must go in order");
    previousEnd = span.to;
    return span;
  });
}

/**
 * Фильтр `ffmpeg`, который переигрывает названные куски и склеивает
 * их с остальными в прежнем порядке.
 *
 * Возвращает `null`, когда переигрывать нечего: вызывающему тогда не нужен
 * ни временный файл, ни лишний проход через кодек.
 */
export function speedFilter(spans: SpeedSpan[], duration: number): string | null {
  if (!spans.length) return null;
  const last = spans[spans.length - 1]!;
  if (last.to > duration + 0.001) {
    throw new Error(`speed: span ends at ${last.to}s, past the ${duration.toFixed(2)}s clip`);
  }
  const parts: Array<{ from: number; to: number; rate: number }> = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.from > cursor) parts.push({ from: cursor, to: span.from, rate: 1 });
    parts.push(span);
    cursor = span.to;
  }
  if (duration > cursor) parts.push({ from: cursor, to: duration, rate: 1 });
  const chains = parts.map((part, i) =>
    `[0:v]trim=start=${part.from}:end=${part.to},setpts=(PTS-STARTPTS)`
    + `${part.rate === 1 ? "" : `/${part.rate}`}[p${i}]`);
  return `${chains.join(";")};${parts.map((_, i) => `[p${i}]`).join("")}`
    + `concat=n=${parts.length}:v=1:a=0[v]`;
}

/** На сколько удлинится клип после переигрывания названных кусков. */
export function speedDuration(spans: SpeedSpan[], duration: number): number {
  let out = duration;
  for (const span of spans) {
    const length = span.to - span.from;
    out += length / span.rate - length;
  }
  return out;
}
