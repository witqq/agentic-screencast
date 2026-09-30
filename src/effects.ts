// Вспышка, тряска и расслоение цвета: удары монтажа поверх любой сцены — слайда, страницы, клипа.
//
// Они ложатся одним проходом ffmpeg поверх уже склеенного ролика, а не рисуются каждой сценой
// по-своему: так вспышка одинакова на слайде и на снятом клипе, а тряска двигает весь кадр,
// включая чужое видео, которое сцена не рисует. Время — секунды ролика, в которые сборка
// переводит якоря сцены (`b2`, `1.5s`, `40%`), как у звуков-акцентов.
import { msg } from "./msg.js";

/** Удар: момент (якорь сцены), длина и сила. */
export interface Hit { at: string; length?: number; strength?: number }

/** Удар во времени ролика; у вспышки — цвет темы сцены (`--tr-flash`), в виде ffmpeg `0xRRGGBB`. */
export interface FilmHit { at: number; length: number; strength: number; colour?: string }

// `m16` — доля музыки ролика: удар в ритм, а не в речь сцены.
const ANCHOR = /^(b\d+(\.end)?(\s*[+-]\s*[\d.]+)?|[\d.]+\s*%|[\d.]+s?|m\d+(\.\d+)?)$/;

/**
 * Поле `flash` или `shake`: якоря через `|` (`b2 | b4+0.3`) или JSON-список
 * `[{"at":"b2","length":0.3,"strength":0.8}]`.
 */
export function parseHits(raw: string, what: "flash" | "shake" | "rgb"): Hit[] {
  const text = raw.trim();
  let list: unknown[];
  if (text.startsWith("[") || text.startsWith("{")) {
    let v: unknown;
    try { v = JSON.parse(text); } catch { throw new Error(msg("effects.form", { what })); }
    list = Array.isArray(v) ? v : [v];
  } else list = text.split("|").map((x) => ({ at: x.trim() }));
  const lim = what === "flash" ? { length: [0.05, 2], strength: [0.1, 1] } : { length: [0.1, 3], strength: [0.1, 3] };
  return list.map((raw, i) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(msg("overlay.object", { where: `${what}[${i}]` }));
    const r = raw as Record<string, unknown>;
    for (const k of Object.keys(r)) if (!["at", "length", "strength"].includes(k)) throw new Error(msg("source.unknownProperty", { field: `${what}[${i}]`, key: k }));
    const at = String(r.at ?? "").trim();
    if (!ANCHOR.test(at)) throw new Error(msg("effects.moment", { where: `${what}[${i}].at`, at }));
    for (const k of ["length", "strength"] as const) {
      const [lo, hi] = lim[k];
      if (r[k] !== undefined && (typeof r[k] !== "number" || (r[k] as number) < lo! || (r[k] as number) > hi!))
        throw new Error(msg("effects.range", { where: `${what}[${i}].${k}`, lo: lo!, hi: hi! }));
    }
    return { at, ...(r.length !== undefined ? { length: r.length as number } : {}), ...(r.strength !== undefined ? { strength: r.strength as number } : {}) };
  });
}

/** Умолчания: вспышка — 0,35 с на 85 % белизны, тряска — 0,35 с силой 1 (размах 1,5 % ширины кадра). */
export const FLASH_DEFAULT = { length: 0.35, strength: 0.85 };
export const SHAKE_DEFAULT = { length: 0.35, strength: 1 };
/** Расслоение цвета: 0,3 с, сила 1 — красный и синий расходятся на 1,2 % ширины кадра. */
export const RGB_DEFAULT = { length: 0.3, strength: 1 };

const n = (v: number): string => v.toFixed(4);

/**
 * Цепочка фильтров ffmpeg для ролика с ударами. Вспышка — наплыв к цвету: мгновенный вход и
 * затухание по квадрату до конца длины. Тряска — окно кадра с масштабом, который растёт на
 * время удара ровно настолько, чтобы сдвиг не открыл края, и затухающим сдвигом по двум осям;
 * вне ударов масштаб 1 и сдвиг 0, то есть кадр тот же.
 */
export function hitsFilter(opts: { flashes: FilmHit[]; shakes: FilmHit[]; rgbs?: FilmHit[]; width: number; height: number; fps: number }): string {
  const { width: W, height: H, fps } = opts;
  const parts: string[] = [];
  let label = "0:v";
  if (opts.shakes.length) {
    // Огибающая удара e = (1 - доля)^2 внутри окна, 0 вне; время — номер выходного кадра / fps.
    const env = (h: FilmHit): string => `if(between(on/${fps},${n(h.at)},${n(h.at + h.length)}),pow(1-(on/${fps}-${n(h.at)})/${n(h.length)},2),0)`;
    const amp = (h: FilmHit): number => 0.015 * h.strength;
    const zoom = opts.shakes.map((h) => `${n(2 * amp(h) + 0.002)}*${env(h)}`).join("+");
    const dx = opts.shakes.map((h) => `${n(amp(h))}*sin(on*2.7+${n(h.at)})*${env(h)}`).join("+");
    const dy = opts.shakes.map((h) => `${n(amp(h) * 0.6)}*cos(on*3.3+${n(h.at)})*${env(h)}`).join("+");
    parts.push(`[${label}]zoompan=z='1+${zoom}':x='iw/2-iw/zoom/2+iw*(${dx})':y='ih/2-ih/zoom/2+ih*(${dy})':d=1:s=${W}x${H}:fps=${fps}[sh]`);
    label = "sh";
  }
  if (opts.flashes.length) {
    // Каждая вспышка — свой слой цвета: у сцен разные темы, и цвет берётся из темы своей сцены.
    opts.flashes.forEach((h, i) => {
      const k = `if(between(T,${n(h.at)},${n(h.at + h.length)}),${n(h.strength)}*pow(1-(T-${n(h.at)})/${n(h.length)},2),0)`;
      parts.push(`color=c=${h.colour}:s=${W}x${H}:r=${fps}[c${i}]`);
      parts.push(`[${label}][c${i}]blend=all_expr='A+(B-A)*(${k})':shortest=1[f${i}]`);
      label = `f${i}`;
    });
  }
  // Расслоение цвета: красный уходит вправо, синий влево и сходятся за длину удара — тремя
  // ступенями, потому что сдвиг rgbashift задаётся числом, а не выражением времени.
  (opts.rgbs ?? []).forEach((h, i) => {
    [1, 0.55, 0.25].forEach((k, j) => {
      const px = Math.max(1, Math.round(W * 0.012 * h.strength * k));
      const a = h.at + (h.length * j) / 3, b = h.at + (h.length * (j + 1)) / 3;
      parts.push(`[${label}]rgbashift=rh=${px}:bh=${-px}:rv=${Math.round(px / 3)}:enable='between(t,${n(a)},${n(b)})'[r${i}_${j}]`);
      label = `r${i}_${j}`;
    });
  });
  return parts.length ? `${parts.join(";")};[${label}]null[v]` : "";
}
