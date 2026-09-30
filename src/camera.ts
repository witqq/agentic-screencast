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

// Provenance belongs to the build, not the authored overlay grammar. A symbol survives
// deviceFor's object spread but is absent from JSON sent to the scene renderer.
const automaticCue = Symbol("automatic camera cue");
type CameraCue = OverlayCamera & { [automaticCue]?: true };
export function markAutomaticCamera<T extends OverlayCamera>(cue: T): T {
  (cue as CameraCue)[automaticCue] = true;
  return cue;
}
const isAutomaticCamera = (cue: OverlayCamera): boolean => (cue as CameraCue)[automaticCue] === true;

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
function followLegs(path: CursorPath, from: number, to: number, z: number, start: { x: number; y: number },
  view = { x: 1, y: 1 }): { legs: Leg[]; end: { x: number; y: number } } {
  const legs: Leg[] = [];
  const halfX = 0.5 * view.x / z, halfY = 0.5 * view.y / z;
  const deadX = 0.3 * view.x / z, deadY = 0.3 * view.y / z, dt = 0.1;
  let { x, y } = start;
  const clampC = (v: number, half: number): number => Math.min(1 - half, Math.max(half, v));
  for (let t = from; t < to - 1e-6; t += dt) {
    const t1 = Math.min(to, t + dt), c = cursorAt(path, t1);
    if (!c) break;
    const want = (cur: number, v: number, dead: number): number => (v > cur + dead ? v - dead : v < cur - dead ? v + dead : cur);
    const k = Math.min(1, dt * 6);
    const nx = clampC(x + (want(x, c.x, deadX) - x) * k, halfX);
    const ny = clampC(y + (want(y, c.y, deadY) - y) * k, halfY);
    if (Math.abs(nx - x) > 1e-5 || Math.abs(ny - y) > 1e-5) legs.push({ t0: t, t1, dz: 0, dx: nx - x, dy: ny - y, linear: true });
    x = nx; y = ny;
  }
  return { legs, end: { x, y } };
}

/** Generated action cues keep their subject until the pointer first reaches that subject. */
function followStart(cue: OverlayCamera, path: CursorPath, end: number): number | null {
  const [left, top, width, height] = cue.area!;
  const inside = (p: { x: number; y: number } | null): boolean => Boolean(p
    && p.x >= left && p.x <= left + width && p.y >= top && p.y <= top + height);
  if (inside(cursorAt(path, cue.at))) return cue.at;
  for (const point of path) if (point.t >= cue.at && point.t <= end && inside(point)) return point.t;
  return null;
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
      const entered = isAutomaticCamera(cue) ? followStart(cue, path, end) : cue.at;
      if (entered !== null) {
        const f = followLegs(path, Math.max(cue.at + move, entered), end, z, { x, y });
        legs.push(...f.legs);
        ({ x, y } = f.end);
      }
    }
    if (cue.keep) continue;
    legs.push({ t0: end, t1: end + back, dz: 1 - z, dx: 0.5 - x, dy: 0.5 - y });
    z = 1; x = 0.5; y = 0.5;
  }
  return legs;
}

/**
 * Наезд камеры над видео фильтром `perspective`: четыре угла окна в точках исходника, с долями
 * точки. Кадры считаются по номеру выходного кадра `on`, путь — сумма отрезков `cameraLegs`.
 * `zoompan` ставил окно на целые точки исходника, и при медленном наезде край предмета ходил
 * туда-обратно на точку-две (замер: 8–23 возврата края за 3,3 с); `perspective` берёт отсчёты
 * между точками кубической интерполяцией, и движение плавное, как у наезда в браузере.
 */
export function cameraPerspective(cues: readonly OverlayCamera[], fps: number, path: CursorPath = [], moment?: number): string | null {
  const legs = cameraLegs(cues, path);
  if (!legs.length) return null;
  // Названный момент (превью одного кадра) ставит камеру в её положение в этот момент сцены.
  const time = moment === undefined ? `(on/${fps})` : `(${moment.toFixed(3)})`;
  const s = (l: Leg): string => (l.linear ? clip : (v: string): string => smooth(clip(v)))(`(${time}-${l.t0})/${Math.max(1e-3, l.t1 - l.t0)}`);
  const sum = (base: string, pick: (l: Leg) => number): string =>
    legs.filter((l) => pick(l) !== 0).map((l) => `(${pick(l)})*(${s(l)})`).reduce((a, b) => `${a}+${b}`, base);
  const z = `min(6,${sum("1", (l) => l.dz)})`;
  const at = (axis: "x" | "y"): string => sum("0.5", (l) => (axis === "x" ? l.dx : l.dy));
  // Окно не выходит за края картинки: иначе у края кадра появляется чёрная полоса.
  const left = `max(0,min(W-W/(${z}),(${at("x")})*W-W/(${z})/2))`;
  const top = `max(0,min(H-H/(${z}),(${at("y")})*H-H/(${z})/2))`;
  const right = `(${left})+W/(${z})`, bottom = `(${top})+H/(${z})`;
  const q = (v: string): string => `'${v}'`;
  return `perspective=x0=${q(left)}:y0=${q(top)}:x1=${q(right)}:y1=${q(top)}:x2=${q(left)}:y2=${q(bottom)}`
    + `:x3=${q(right)}:y3=${q(bottom)}:interpolation=cubic:sense=source:eval=frame`;
}

/** Дополнительный масштаб портретного окна, ограниченный полным вмещением предмета. */
function windowZoom(cue: OverlayCamera, share: number): number {
  const area = cue.area!;
  const asked = cue.scale ?? 1;
  return Math.max(1, Math.min(asked, PUSH_ROOM * share / Math.max(area[2], 1e-6),
    PUSH_ROOM / Math.max(area[3], 1e-6)));
}

/** Шаги портретного окна: наезд и тот же мягкий догон курсора, что у горизонтальной камеры. */
function windowLegs(cues: readonly OverlayCamera[], path: CursorPath = [], share = 1): { start: { x: number; y: number; z: number }; legs: Leg[] } {
  const list = [...cues].filter((c) => c.area).sort((a, b) => a.at - b.at);
  let x = list.length ? centre(list[0]!).x : 0.5;
  let y = list.length ? centre(list[0]!).y : 0.5, z = 1;
  const start = { x, y, z }, legs: Leg[] = [];
  for (const cue of list) {
    const target = centre(cue), nextZ = windowZoom(cue, share);
    const move = cue.move ?? 0.9;
    if (target.x !== x || target.y !== y || nextZ !== z)
      legs.push({ t0: cue.at, t1: cue.at + Math.max(1e-3, move), dx: target.x - x, dy: target.y - y, dz: nextZ - z });
    ({ x, y } = target); z = nextZ;
    if (cue.follow === "cursor" && path.length) {
      const end = cue.at + move + cue.hold;
      const entered = isAutomaticCamera(cue) ? followStart(cue, path, end) : cue.at;
      if (entered !== null) {
        const followed = followLegs(path, Math.max(cue.at + move, entered), end, z, { x, y }, { x: share, y: 1 });
        legs.push(...followed.legs);
        ({ x, y } = followed.end);
      }
    }
  }
  return { start, legs };
}

const legPhase = (l: Leg, time: string): string => (l.linear ? clip : (v: string): string => smooth(clip(v)))
  (`(${time}-${l.t0})/${Math.max(1e-3, l.t1 - l.t0)}`);
function windowExpr(cues: readonly OverlayCamera[], axis: "x" | "y" | "z", path: CursorPath, share: number): string {
  const { start, legs } = windowLegs(cues, path, share);
  return legs.filter((l) => l[axis === "z" ? "dz" : axis === "x" ? "dx" : "dy"] !== 0)
    .reduce((acc, l) => `${acc}+(${l[axis === "z" ? "dz" : axis === "x" ? "dx" : "dy"]})*(${legPhase(l, "t")})`, String(start[axis]));
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
export function windowFilter(cues: readonly OverlayCamera[], path: CursorPath = [], share = 1, width = "iw"): string {
  return `max(0,min((${width})-ow,(${windowExpr(cues, "x", path, share)})*(${width})-ow/2))`;
}

/** Верх окна после портретного увеличения: без увеличения он остаётся нулём. */
export function windowYFilter(cues: readonly OverlayCamera[], path: CursorPath = [], share = 1, height = "ih"): string {
  return `max(0,min((${height})-oh,(${windowExpr(cues, "y", path, share)})*(${height})-oh/2))`;
}

/** Увеличение окна как выражение ffmpeg; базовая высота источника уже приведена к высоте кадра. */
export function windowZoomFilter(cues: readonly OverlayCamera[], path: CursorPath = [], share = 1): string {
  return windowExpr(cues, "z", path, share);
}

/** Требуется ли менять размер окна, а не только вести его по исходному кадру. */
export function windowNeedsZoom(cues: readonly OverlayCamera[], share: number): boolean {
  return cues.some((c) => c.area && windowZoom(c, share) > 1 + 1e-6);
}

/** Числовое положение окна: тот же путь используется для лупы и проверки итогового кадра. */
export function windowPose(cues: readonly OverlayCamera[], t: number, path: CursorPath = [], share = 1): { x: number; y: number; z: number } {
  const { start, legs } = windowLegs(cues, path, share);
  const phase = (l: Leg): number => {
    const q = Math.min(1, Math.max(0, (t - l.t0) / Math.max(1e-3, l.t1 - l.t0)));
    return l.linear ? q : q * q * q * (q * (q * 6 - 15) + 10);
  };
  return legs.reduce((pose, l) => ({ x: pose.x + l.dx * phase(l), y: pose.y + l.dy * phase(l),
    z: pose.z + l.dz * phase(l) }), start);
}

/** Та же середина окна в доле ширины кадра — числом, для проверок пути без ffmpeg. */
export function windowCentre(cues: readonly OverlayCamera[], t: number, path: CursorPath = [], share = 1): number {
  return windowPose(cues, t, path, share).x;
}
