// Формат ролика одной строкой шапки: горизонталь, вертикаль 9:16 или квадрат.
//
// Вертикальный ролик — не горизонтальный, повёрнутый на бок. Площадки рисуют
// поверх него своё: имя автора, подпись, столбец кнопок справа, призыв внизу, —
// и всё, что зритель обязан прочесть, должно лежать внутри безопасной зоны.
// Пресет задаёт кадр и эту зону, а раскладка слайдов, подписей, карточек и
// примитивов берёт её отсюда: иначе каждое место пришлось бы подгонять руками.
//
// Числа зон — из базы знаний `docs/vertical-video.md`: по каждой стороне берётся
// худшее из площадок (Reels, TikTok, Shorts) для кадра 1080×1920. «Рабочая»
// зона — для подписей и текста, «строгая» — для призыва и главного предмета.
// У кадра другого размера зона масштабируется в той же пропорции.
import type { Frame } from "./source.js";
import { msg } from "./msg.js";

export interface Safe { top: number; bottom: number; left: number; right: number }

export interface FormatPreset {
  width: number;
  height: number;
  /** частота мастера площадок: 30 кадров (docs/vertical-video.md, «One master for every platform») */
  fps?: number;
  /** рабочая зона: подписи, карточки, текст; отступы в точках кадра пресета */
  safe?: Safe;
  /** строгая зона: призыв и главный предмет */
  strict?: Safe;
  /** зона ролика, который смотрят вне ленты площадки (`zone: plain`): поля симметричны */
  plain?: Safe;
}

export const FORMATS: Record<string, FormatPreset> = {
  landscape: { width: 1920, height: 1080 },
  vertical: { width: 1080, height: 1920, fps: 30,
    safe: { top: 170, bottom: 484, left: 65, right: 180 },
    strict: { top: 269, bottom: 672, left: 65, right: 180 },
    plain: { top: 96, bottom: 128, left: 65, right: 65 } },
  // Квадрат в ленте перекрывается меньше: сверху имя, снизу подпись и кнопки.
  square: { width: 1080, height: 1080, fps: 30,
    safe: { top: 80, bottom: 150, left: 65, right: 65 },
    plain: { top: 65, bottom: 65, left: 65, right: 65 } },
};

export const FORMAT_NAMES = Object.keys(FORMATS);

export function parseFormat(raw: string): string {
  const name = raw.trim();
  if (!Object.hasOwn(FORMATS, name)) throw new Error(msg("format.unknown", { name, available: FORMAT_NAMES.join(", ") }));
  return name;
}

/** Кадр пресета, поверх которого названное полем `frame` имеет приоритет. */
export const frameOf = (format: string | undefined, frame: Frame | undefined): Frame | undefined =>
  format ? { width: FORMATS[format]!.width, height: FORMATS[format]!.height,
    ...(FORMATS[format]!.fps ? { fps: FORMATS[format]!.fps } : {}), ...frame } : frame;

// Где ролик смотрят, решает, от чего беречь кадр. В ленте Reels, Shorts и TikTok поверх него
// лежат имя, подпись и столбец кнопок справа — зона площадки. В мессенджере, на странице или
// у коллег на телефоне этого нет, и несимметричная зона только сдвигает и сужает текст.
export const ZONES = ["platform", "plain"] as const;
export type Zone = typeof ZONES[number];

export function parseZone(raw: string): Zone {
  const name = raw.trim();
  if (!(ZONES as readonly string[]).includes(name)) throw new Error(msg("zone.unknown", { name, available: ZONES.join(", ") }));
  return name as Zone;
}

/** Зона пресета, пересчитанная на настоящий размер кадра. */
export function safeOf(format: string | undefined, frame: Frame | undefined, zone: "safe" | "strict" = "safe", where: Zone = "platform"): Safe | undefined {
  const p = format ? FORMATS[format] : undefined;
  const z = where === "plain" && p?.plain ? p.plain : p?.[zone] ?? (zone === "strict" ? p?.safe : undefined);
  if (!p || !z) return undefined;
  const kx = Number(frame?.width ?? p.width) / p.width, ky = Number(frame?.height ?? p.height) / p.height;
  return { top: Math.round(z.top * ky), bottom: Math.round(z.bottom * ky), left: Math.round(z.left * kx), right: Math.round(z.right * kx) };
}
