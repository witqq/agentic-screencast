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

/** Доля прохождения с плавным началом и концом; в выражениях `ffmpeg` нет функции, пишем явно. */
function smooth(phase: string): string {
  return `(${phase})*(${phase})*(3-2*(${phase}))`;
}

/** Ограничение доли отрезком [0, 1]. */
const clip = (value: string): string => `min(1,max(0,${value}))`;

/** Сила наезда в момент `t`: нарастает за `move`, держится `hold`, спадает за `return`. */
function power(cue: OverlayCamera, time: string): string {
  const move = cue.move ?? 0.9;
  const back = cue.return ?? 0.9;
  const plateau = cue.at + move + cue.hold;
  const rise = smooth(clip(`(${time}-${cue.at})/${move}`));
  const fall = smooth(clip(`(${time}-${plateau})/${back}`));
  return `(${rise})*(1-(${fall}))`;
}

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

/**
 * Выражения наезда для всех кадров сцены.
 *
 * Кадры считаются по номеру ВЫХОДНОГО кадра: `zoompan` не знает времени сцены, а номер кадра и
 * частота дают его точно. Несколько наездов складываются: проверка запрещает им пересекаться,
 * поэтому в любой момент работает не больше одного.
 */
export function cameraFilter(cues: readonly OverlayCamera[], fps: number): CameraFilter | null {
  const withArea = cues.filter((cue) => cue.area);
  if (!withArea.length) return null;
  const time = `(on/${fps})`;
  const zoom = withArea
    .map((cue) => `(${(cue.scale ?? 1.65) - 1})*(${power(cue, time)})`)
    .reduce((left, right) => `${left}+${right}`, "1");
  // Середина кадра идёт к середине области с той же силой, с какой растёт увеличение: иначе
  // картинка приближалась бы к своей середине, а не к тому, о чём говорит карточка.
  const at = (axis: "x" | "y"): string => withArea
    .map((cue) => `(${centre(cue)[axis] - 0.5})*(${power(cue, time)})`)
    .reduce((left, right) => `${left}+${right}`, "0.5");
  // Окно не выходит за края картинки: иначе у края кадра появляется чёрная полоса.
  const span = (size: "iw" | "ih", axis: "x" | "y"): string =>
    `max(0,min(${size}-${size}/zoom,(${at(axis)})*${size}-${size}/zoom/2))`;
  return { z: `min(6,${zoom})`, x: span("iw", "x"), y: span("ih", "y") };
}
