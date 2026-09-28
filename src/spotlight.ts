// Фокус внимания одной записью.
//
// Режиссёрский приём «камера едет к предмету, всё остальное гаснет, у
// предмета появляется пояснение, время замедляется, потом общий план» прежде
// собирался из трёх полей и ручной арифметики секунд: наезд в `overlay.camera`,
// карточка в `overlay.cards` с моментом «наезд плюс шесть десятых», шаг в
// `speed` в секундах исходного клипа. Любая смена голоса сдвигала речь, а
// секунды оставались прежними, и фокус отставал от слов.
//
// `spotlight` пишется одной строкой — `#result @ b2 | #chart @ b3` — или списком
// объектов, моменты в нём — якоря тактов речи, и сборка сама переводит его в
// движения камеры, карточки и шаги замедления по ИЗМЕРЕННЫМ тактам. Несколько
// фокусов подряд становятся проездом камеры от цели к цели без возврата к
// общему плану.
import { CAMERA_STYLES, cardHold, parseOverlay, type OverlayCamera, type OverlayCard, type SceneOverlay } from "./overlay.js";
import { msg } from "./msg.js";
import type { SpeedStep } from "./speed.js";

/** Один фокус так, как его пишут в сценарии. */
export interface Spotlight {
  /** CSS-селектор на странице или слайде; `el3` — третий появляющийся элемент слайда */
  target?: string;
  /** прямоугольник [x, y, w, h] в долях кадра — единственный способ для видео */
  area?: [number, number, number, number];
  /** момент начала наезда: якорь такта (`b2`, `b2+0.3`), доля сцены или секунды */
  at: string;
  /** момент возврата; без него фокус держится до конца такта или до следующего фокуса */
  until?: string;
  scale?: number;
  move?: number;
  shape?: "rounded" | "circle";
  blur?: number;
  desaturate?: boolean;
  /** false — без рамки вокруг цели */
  ring?: boolean;
  /** доля затемнения вне фокуса от затемнения темы */
  dim?: number;
  /** пройти вдоль широкой цели от начала к концу */
  pan?: boolean;
  /** характер движения камеры: gentle | snappy */
  style?: string;
  /** замедлить клип под фокусом (доля скорости) или остановить время */
  slow?: number | "stop";
  /** пояснение рядом с целью */
  card?: { title: string; body?: string };
  /** остаться в приближении до следующего фокуса или до конца сцены, не возвращаясь к общему плану */
  keep?: boolean;
}

export const SPOTLIGHT_KEYS = ["target", "area", "at", "until", "scale", "move", "shape", "blur", "desaturate", "ring", "dim", "pan", "slow", "card", "style", "keep"];

/**
 * Разбор поля `spotlight`: строка `цель @ якорь [.. якорь-возврата]` через `|`
 * или JSON — объект либо список объектов.
 */
export function parseSpotlight(raw: string): Spotlight[] {
  const text = raw.trim();
  let list: unknown[];
  if (text.startsWith("[")) {
    let v: unknown;
    try { v = JSON.parse(text); } catch { throw new Error(msg("spotlight.form")); }
    list = Array.isArray(v) ? v : [v];
  } else {
    // Цепочка через `|` может смешивать краткую запись и объект: краткая — для простых фокусов,
    // объект — для того, которому нужны параметры. `|` внутри строк объекта не делит цепочку.
    list = chainParts(text).map((part) => {
      if (part.startsWith("{")) {
        try { return JSON.parse(part) as unknown; } catch { throw new Error(msg("spotlight.jsonObject", { part })); }
      }
      const m = /^(.+?)\s+@\s+(\S+)(?:\s*\.\.\s*(\S+))?$/.exec(part);
      if (!m) throw new Error(msg("spotlight.shortForm", { part }));
      return { target: m[1]!.trim(), at: m[2], ...(m[3] ? { until: m[3] } : {}) };
    });
  }
  if (!list.length) throw new Error(msg("spotlight.empty"));
  return list.map((v, i) => {
    const where = `spotlight[${i}]`;
    if (!v || typeof v !== "object") throw new Error(msg("overlay.object", { where }));
    const r = v as Record<string, unknown>;
    for (const k of Object.keys(r)) if (!SPOTLIGHT_KEYS.includes(k)) throw new Error(msg("source.unknownProperty", { field: where, key: k }));
    if ((typeof r.target === "string") === Array.isArray(r.area)) throw new Error(msg("overlay.oneTargetArea", { where }));
    if (typeof r.at !== "string" && typeof r.at !== "number") throw new Error(msg("spotlight.anchor", { where: `${where}.at` }));
    if (r.slow !== undefined && r.slow !== "stop" && (typeof r.slow !== "number" || r.slow < 0.1 || r.slow > 0.9))
      throw new Error(msg("spotlight.slow", { where: `${where}.slow` }));
    if (r.ring !== undefined && typeof r.ring !== "boolean") throw new Error(msg("overlay.trueFalse", { where: `${where}.ring` }));
    if (r.pan !== undefined && typeof r.pan !== "boolean") throw new Error(msg("overlay.trueFalse", { where: `${where}.pan` }));
    if (r.keep !== undefined && typeof r.keep !== "boolean") throw new Error(msg("overlay.trueFalse", { where: `${where}.keep` }));
    if (r.keep === true && r.until !== undefined) throw new Error(msg("spotlight.keepUntil", { where }));
    if (r.style !== undefined && !CAMERA_STYLES[String(r.style)]) throw new Error(msg("overlay.options", { where: `${where}.style`, options: Object.keys(CAMERA_STYLES).join(" | ") }));
    if (r.dim !== undefined && (typeof r.dim !== "number" || r.dim < 0 || r.dim > 1)) throw new Error(msg("overlay.dim", { where: `${where}.dim` }));
    if (r.card !== undefined) {
      const c = r.card as Record<string, unknown>;
      if (!c || typeof c.title !== "string" || !c.title.trim()) throw new Error(msg("spotlight.card", { where: `${where}.card` }));
    }
    return { ...(r as unknown as Spotlight), at: String(r.at), ...(r.until !== undefined ? { until: String(r.until) } : {}) };
  });
}

/** Части цепочки фокусов по `|` вне фигурных скобок и строк JSON. */
function chainParts(text: string): string[] {
  const out: string[] = [];
  let depth = 0, quoted = false, from = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (c === "\\") i++; else if (c === '"') quoted = false; continue; }
    if (c === '"' && depth > 0) quoted = true;
    else if (c === "{") depth++;
    else if (c === "}") depth = Math.max(0, depth - 1);
    else if (c === "|" && depth === 0) { out.push(text.slice(from, i).trim()); from = i + 1; }
  }
  out.push(text.slice(from).trim());
  return out;
}

/** Якорь момента в секундах сцены — то же правило, что у слоя композиции. */
export function anchorSeconds(a: string, starts: number[], duration: number, ends?: number[]): number {
  const text = a.trim();
  const beat = /^b(\d+)(\.end)?(?:\s*([+-])\s*([\d.]+))?$/i.exec(text);
  if (beat) {
    const i = Number(beat[1]) - 1;
    // `bN.end` — конец речи такта: у всех тактов, кроме последнего, это начало следующего, а у
    // последнего — конец его речи, а не конец сцены вместе с хвостом и уходящим переходом.
    const base = beat[2] ? (ends?.[i] ?? starts[i + 1] ?? duration) : (starts[Math.min(i, starts.length - 1)] ?? 0);
    return base + (beat[4] ? Number(beat[4]) * (beat[3] === "-" ? -1 : 1) : 0);
  }
  const share = /^([\d.]+)\s*%$/.exec(text);
  if (share) return (Number(share[1]) / 100) * duration;
  return Number.parseFloat(text) || 0;
}

/**
 * Начала и концы тактов по оценке — длина текста делится на темп голоса — там, где звука ещё нет:
 * `lint` и разбор сценария. Сборка берёт измеренные.
 */
export function estimateBeats(beats: Array<{ text: string; speech?: string }>, lead: number, cps: number): { starts: number[]; ends: number[] } {
  const starts: number[] = [], ends: number[] = [];
  beats.reduce((t, b) => {
    const len = Math.max(0.6, (b.speech ?? b.text).length / cps);
    starts.push(t); ends.push(t + len);
    return t + len;
  }, beats.length ? lead : 0);
  return { starts, ends };
}

/** Конец такта, в котором лежит момент t: до него фокус держится по умолчанию. */
function beatEndAround(t: number, starts: number[], ends: number[]): number {
  for (let i = starts.length - 1; i >= 0; i--) if (t >= starts[i]! - 1e-6) return ends[i]!;
  return ends[0] ?? t + 2;
}

export interface Compiled {
  camera: OverlayCamera[];
  cards: OverlayCard[];
  speed: SpeedStep[];
  /** куда пришёлся каждый фокус: для отчёта сборки и проверки */
  resolved: Array<{ at: number; hold: number }>;
}

/**
 * Фокусы → движения камеры, карточки и шаги замедления.
 *
 * `starts`/`ends` — измеренные начала и концы тактов сцены. Для видео моменты
 * сцены переводятся в секунды исходного клипа: каждое замедление или
 * остановка до этого фокуса растягивает сцену относительно клипа.
 */
export function compileSpotlights(list: Spotlight[], o: {
  starts: number[]; ends: number[]; duration: number; video: boolean;
}): Compiled {
  const camera: OverlayCamera[] = [], cards: OverlayCard[] = [], speed: SpeedStep[] = [];
  const resolved: Array<{ at: number; hold: number }> = [];
  let extra = 0;
  list.forEach((f, i) => {
    if (o.video && !f.area) throw new Error(msg("spotlight.videoArea", { index: i }));
    const style = f.style ? CAMERA_STYLES[f.style] : undefined;
    const move = f.move ?? style?.move ?? 0.8;
    const back = style?.return ?? 0.8;
    const at = Math.max(0, anchorSeconds(f.at, o.starts, o.duration, o.ends));
    const next = list[i + 1];
    const nextAt = next ? anchorSeconds(next.at, o.starts, o.duration, o.ends) : undefined;
    // Следующий фокус начинается раньше, чем этот успел бы вернуться, — камера
    // остаётся в приближении и едет к нему напрямую.
    // `keep` у последнего фокуса держит приближение до конца сцены.
    const keep = (nextAt !== undefined && f.until === undefined) || f.keep === true;
    let hold = f.until !== undefined ? anchorSeconds(f.until, o.starts, o.duration, o.ends) - at - move
      : keep ? (nextAt ?? o.duration) - at - move : beatEndAround(at, o.starts, o.ends) - at - move;
    // Названный конец раньше, чем камера доедет, — противоречие сценария, а не повод
    // молча держать 0,8 с: автор ждал другого, и кадр его обманул бы.
    if (f.until !== undefined && hold < 0) {
      throw new Error(msg("lint.spotUntilEarly", { index: i, until: (at + move + hold).toFixed(2), arrival: (at + move).toFixed(2) }));
    }
    const card = f.card ? { at: at + move * 0.6, title: f.card.title.trim(), ...(f.card.body ? { body: f.card.body.trim() } : {}),
      position: "near-focus" as const, reveal: "type" as const, motion: "glide" as const } : undefined;
    // Карточка живёт внутри окна фокуса: удержание не короче, чем нужно её прочесть.
    if (card) hold = Math.max(hold, cardHold(card) - move * 0.4 + 0.15);
    hold = Math.max(0.8, hold);
    // Названный конец и следующий фокус: камера возвращается 0,8 с и ждёт ещё 0,35 с, прежде
    // чем ехать дальше. Не успевает — называются оба фокуса, их моменты и нужный зазор.
    if (!keep && nextAt !== undefined && at + move + hold + back + 0.35 > nextAt + 1e-6) {
      const backAt = at + move + hold + back;
      throw new Error(msg("lint.spotGap", { index: i, at: at.toFixed(2), hold: (at + move + hold).toFixed(2), back: backAt.toFixed(2),
        next: i + 1, nextAt: nextAt.toFixed(2), start: (backAt + 0.35).toFixed(2) }));
    }
    if (keep && nextAt !== undefined && at + move + hold > nextAt + 1e-6) {
      throw new Error(msg("lint.spotCardOverlap", { index: i, until: (at + move + hold).toFixed(2),
        card: card ? msg("lint.spotCardReason") : "", nextAt: nextAt.toFixed(2) }));
    }
    camera.push({ at, hold, move, return: back, ...(f.scale !== undefined ? { scale: f.scale } : {}),
      ...(f.target ? { target: f.target } : { area: f.area! }), ...(keep ? { keep: true } : {}),
      ...(f.shape ? { shape: f.shape } : {}), ...(f.blur ? { blur: f.blur } : {}), ...(f.desaturate ? { desaturate: true } : {}),
      ...(f.ring === false ? { ring: false } : {}), ...(f.dim !== undefined ? { dim: f.dim } : {}), ...(f.pan ? { pan: true } : {}) });
    // Карточка уходит чуть раньше, чем камера трогается дальше.
    if (card) cards.push({ ...card, hold: hold + move * 0.4 - 0.1 });
    if (f.slow !== undefined && o.video) {
      // Клип идёт своим ходом, пока камера едет; замедление или остановка
      // начинаются, когда она пришла, и занимают всё удержание.
      const source = at + move - extra;
      if (f.slow === "stop") { speed.push({ at: source, hold }); extra += hold; }
      else { speed.push({ from: source, to: source + hold * f.slow, rate: f.slow }); extra += hold * (1 - f.slow); }
    }
    resolved.push({ at: Number(at.toFixed(3)), hold: Number(hold.toFixed(3)) });
  });
  return { camera, cards, speed, resolved };
}

/**
 * Фокусы сцены, сложенные с её накладкой: то же, что делает сборка, — и то же, что `lint` делает
 * заранее по оценке тактов. Ошибка — словами сценария: что с чем столкнулось и в какие секунды.
 */
export function spotlightOverlay(list: Spotlight[], overlay: SceneOverlay | undefined, o: {
  starts: number[]; ends: number[]; duration: number; video: boolean;
}): { compiled: Compiled; overlay: SceneOverlay } {
  const compiled = compileSpotlights(list, o);
  try {
    return { compiled, overlay: parseOverlay(JSON.stringify({ ...overlay,
      camera: [...(overlay?.camera ?? []), ...compiled.camera].sort((a, b) => a.at - b.at),
      cards: [...(overlay?.cards ?? []), ...compiled.cards].sort((a, b) => a.at - b.at) })) };
  } catch (e) { throw new Error(msg("spotlight.overlayCollision", { why: (e as Error).message })); }
}
