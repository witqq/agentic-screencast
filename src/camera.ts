/** Наезд камеры ПО ВИДЕО: выражения увеличения и смещения для фильтра сборки.
 *
 * Зачем это здесь, а не в слое композиции. Слой рисуется прозрачной картинкой поверх клипа и сам
 * клип двигать не может: он умеет только нарисовать рамку и затенение. Поэтому наезд над готовым
 * материалом делает сборка — тем же законом времени, что и слой, чтобы подсветка ехала ровно
 * вместе с картинкой, а не отставала от неё.
 *
 * Прежде наезд над видео был запрещён вовсе и требовал отдельной сцены с замороженным кадром;
 * из-за этого «замирание» превращалось в склейку, карточка отрывалась от момента, а остаток сцены
 * стоял неподвижно.
 */
import type { OverlayCamera } from "./overlay.js";

/**
 * Доля прохождения с плавным началом и концом — та же кривая, что у слоя
 * композиции (smootherstep): подсветка и картинка едут в одном темпе. В
 * выражениях `ffmpeg` функции нет, пишем явно.
 */
function smooth(phase: string): string {
  return `(${phase})*(${phase})*(${phase})*((${phase})*((${phase})*6-15)+10)`;
}

/** Ограничение доли отрезком [0, 1]. */
const clip = (value: string): string => `min(1,max(0,${value}))`;

/** Увеличение наезда по умолчанию. */
export const PUSH = 1.65;
/** Доля кадра по каждой оси, которую цель может занять на удержании наезда: остальное — поле. */
export const PUSH_ROOM = 0.9;

/**
 * Увеличение, при котором цель (ширина и высота в долях кадра) целиком в кадре с полем.
 * Слой композиции считает то же для цели-селектора (`cuePose` в `browser/stage.ts`).
 */
export const fitScale = (w: number, h: number): number => Math.min(PUSH_ROOM / Math.max(w, 1e-6), PUSH_ROOM / Math.max(h, 1e-6));

/** Увеличение наезда: названное сценарием или умолчание, уменьшенное до вмещающего цель. */
export const pushScale = (cue: { scale?: number }, w: number, h: number): number =>
  cue.scale ?? Math.max(1, Math.min(PUSH, fitScale(w, h)));

/** Куда смотрит камера: середина названной области в долях кадра. */
function centre(cue: OverlayCamera): { x: number; y: number } {
  const area = cue.area ?? [0, 0, 1, 1];
  return { x: area[0] + area[2] / 2, y: area[1] + area[3] / 2 };
}

export interface CameraFilter {
  /** выражение увеличения для `zoompan` */
  z: string;
  /** выражения смещения окна в координатах увеличенной картинки */
  x: string;
  y: string;
}

/** Отрезок пути камеры: за [t0, t1] увеличение и центр меняются на dz, dx, dy (`linear` — ровно, без разгона). */
interface Leg { t0: number; t1: number; dz: number; dx: number; dy: number; linear?: boolean }

/** Путь курсора дубля: секунды сцены и точка в долях кадра. */
export type CursorPath = ReadonlyArray<{ t: number; x: number; y: number }>;

/** Точка курсора в момент t: между записанными точками — по прямой. */
function cursorAt(path: CursorPath, t: number): { x: number; y: number } | null {
  if (!path.length) return null;
  if (t <= path[0]!.t) return path[0]!;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!, b = path[i]!;
    if (t <= b.t) { const w = (t - a.t) / Math.max(1e-6, b.t - a.t); return { x: a.x + (b.x - a.x) * w, y: a.y + (b.y - a.y) * w }; }
  }
  return path[path.length - 1]!;
}

/**
 * Окно наезда следует за курсором (`follow: "cursor"`): пока курсор в середине окна (60 % его
 * стороны), окно стоит; выходит — окно подтягивается, пока курсор снова не окажется на границе
 * этой зоны, с мягким догоном. Шаг — десятая секунды; результат — ровные отрезки пути, чистая
 * функция пути курсора и времени сцены.
 */
function followLegs(path: CursorPath, from: number, to: number, z: number, start: { x: number; y: number }): { legs: Leg[]; end: { x: number; y: number } } {
  const legs: Leg[] = [];
  const half = 0.5 / z, dead = 0.3 / z, dt = 0.1;
  let { x, y } = start;
  const clampC = (v: number): number => Math.min(1 - half, Math.max(half, v));
  for (let t = from; t < to - 1e-6; t += dt) {
    const t1 = Math.min(to, t + dt), c = cursorAt(path, t1);
    if (!c) break;
    const want = (cur: number, v: number): number => (v > cur + dead ? v - dead : v < cur - dead ? v + dead : cur);
    const k = Math.min(1, dt * 6);
    const nx = clampC(x + (want(x, c.x) - x) * k), ny = clampC(y + (want(y, c.y) - y) * k);
    if (Math.abs(nx - x) > 1e-5 || Math.abs(ny - y) > 1e-5) legs.push({ t0: t, t1, dz: 0, dx: nx - x, dy: ny - y, linear: true });
    x = nx; y = ny;
  }
  return { legs, end: { x, y } };
}

/**
 * Путь камеры как отрезки: наезд к цели, возврат к общему плану или — у
 * движения, оставшегося в приближении, — проезд сразу к следующей цели.
 */
export function cameraLegs(cues: readonly OverlayCamera[], path: CursorPath = []): Leg[] {
  const legs: Leg[] = [];
  let z = 1, x = 0.5, y = 0.5;
  for (const cue of [...cues].filter((c) => c.area).sort((a, b) => a.at - b.at)) {
    const move = cue.move ?? 0.9, back = cue.return ?? 0.9;
    const to = { z: pushScale(cue, cue.area![2], cue.area![3]), ...centre(cue) };
    legs.push({ t0: cue.at, t1: cue.at + move, dz: to.z - z, dx: to.x - x, dy: to.y - y });
    ({ z, x, y } = to);
    const end = cue.at + move + cue.hold;
    if (cue.follow === "cursor" && path.length) {
      const f = followLegs(path, cue.at + move, end, z, { x, y });
      legs.push(...f.legs);
      ({ x, y } = f.end);
    }
    if (cue.keep) continue;
    legs.push({ t0: end, t1: end + back, dz: 1 - z, dx: 0.5 - x, dy: 0.5 - y });
    z = 1; x = 0.5; y = 0.5;
  }
  return legs;
}

/**
 * Выражения наезда для всех кадров сцены.
 *
 * Кадры считаются по номеру ВЫХОДНОГО кадра: `zoompan` не знает времени сцены, а номер кадра и
 * частота дают его точно. Отрезки пути идут один за другим, поэтому сумма их вкладов в любой
 * момент равна состоянию камеры в этот момент.
 */
export function cameraFilter(cues: readonly OverlayCamera[], fps: number, path: CursorPath = []): CameraFilter | null {
  const legs = cameraLegs(cues, path);
  if (!legs.length) return null;
  const time = `(on/${fps})`;
  const s = (l: Leg): string => (l.linear ? clip : (v: string): string => smooth(clip(v)))(`(${time}-${l.t0})/${Math.max(1e-3, l.t1 - l.t0)}`);
  const sum = (base: string, pick: (l: Leg) => number): string =>
    legs.filter((l) => pick(l) !== 0).map((l) => `(${pick(l)})*(${s(l)})`).reduce((a, b) => `${a}+${b}`, base);
  const zoom = sum("1", (l) => l.dz);
  const at = (axis: "x" | "y"): string => sum("0.5", (l) => (axis === "x" ? l.dx : l.dy));
  // Окно не выходит за края картинки: иначе у края кадра появляется чёрная полоса.
  const span = (size: "iw" | "ih", axis: "x" | "y"): string =>
    `max(0,min(${size}-${size}/zoom,(${at(axis)})*${size}-${size}/zoom/2))`;
  return { z: `min(6,${zoom})`, x: span("iw", "x"), y: span("ih", "y") };
}

/** Шаги пути окна кадрирования: переезд к середине области за [t0, t1]. */
function windowLegs(cues: readonly OverlayCamera[]): { x0: number; legs: Array<{ t0: number; t1: number; dx: number }> } {
  const list = [...cues].filter((c) => c.area).sort((a, b) => a.at - b.at);
  let x = list.length ? centre(list[0]!).x : 0.5;
  const x0 = x, legs: Array<{ t0: number; t1: number; dx: number }> = [];
  for (const cue of list.slice(1)) {
    const to = centre(cue).x;
    if (to !== x) legs.push({ t0: cue.at, t1: cue.at + Math.max(1e-3, cue.move ?? 0.9), dx: to - x });
    x = to;
  }
  return { x0, legs };
}

/**
 * Окно кадрирования по видео для сборки в другом формате (`build --format vertical`):
 * выражение левого края окна `crop` по времени кадра `t`.
 *
 * Окно ведёт середина области фокуса, а не центр кадра: до первого фокуса оно
 * ждёт у первой области, на наезде переезжает к новой тем же законом, что и камера
 * (smootherstep), и после фокуса остаётся у последней области — окно само и есть
 * наезд, возвращаться к общему плану ему некуда. Без фокусов окно стоит по центру.
 */
export function windowFilter(cues: readonly OverlayCamera[]): string {
  const { x0, legs } = windowLegs(cues);
  const path = legs.reduce((acc, l) => `${acc}+(${l.dx})*(${smooth(clip(`(t-${l.t0})/${l.t1 - l.t0}`))})`, String(x0));
  return `max(0,min(iw-ow,(${path})*iw-ow/2))`;
}

/** Та же середина окна в доле ширины кадра — числом, для проверок пути без ffmpeg. */
export function windowCentre(cues: readonly OverlayCamera[], t: number): number {
  const { x0, legs } = windowLegs(cues);
  const p = (v: number): number => { const q = Math.min(1, Math.max(0, v)); return q * q * q * (q * (q * 6 - 15) + 10); };
  return legs.reduce((acc, l) => acc + l.dx * p((t - l.t0) / (l.t1 - l.t0)), x0);
}
