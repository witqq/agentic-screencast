// Лупа: круг над предметом, в котором его деталь увеличена, а кадр вокруг стоит как был.
//
// Лупа входит в граф, который пишет сегмент сцены, поэтому она одинакова
// у слайда, у страницы и у видео и не зависит от того, чем нарисован кадр: вырезается
// квадрат вокруг середины предмета, увеличивается до диаметра лупы, получает круглую
// маску с каймой в цвет акцента темы и проступает и уходит за четверть секунды.
// Вне круга пиксели сегмента не трогаются.
//
// Предмет виден в линзе целиком: вырезаемый квадрат не меньше предмета с полем. Если при
// названном увеличении такой квадрат не помещается в линзу, линза растёт до предела, а
// затем уменьшается увеличение — сборка называет это в отчёте сцены. Линза не выходит за
// край кадра; где она стоит — над предметом, рядом с ним или в углу кадра — задаёт `place`.
import type { OverlayLoupe } from "./overlay.js";
import { yuvOf } from "./film.js";
import { ffmpegColour, resolveTheme, type ThemeVars } from "./theme.js";

export interface LoupeAt { loupe: OverlayLoupe; rect: { left: number; top: number; width: number; height: number };
  /** нижняя граница линзы в точках кадра: верх полосы субтитров сцены; без неё — низ кадра */
  floor?: number }

const even = (v: number): number => Math.max(2, Math.round(v / 2) * 2);
const evenUp = (v: number): number => Math.max(2, Math.ceil(v / 2) * 2);

/** Увеличение по умолчанию и доля кадра по ширине, которую линза занимает, пока предмет в неё входит. */
export const LOUPE_SCALE = 2;
export const LOUPE_SIZE = 0.22;
/** Поле вокруг предмета в вырезаемом квадрате: края предмета не касаются кольца. */
const ROOM = 1.12;
/** Предел роста линзы — доля меньшей стороны кадра: дальше линза закрыла бы сам кадр. */
const LENS_MAX = 0.6;

export interface LoupeLayout {
  /** диаметр линзы и увеличение, с которым она рисуется */
  D: number; k: number;
  /** сторона и левый верхний угол вырезаемого квадрата */
  c: number; x0: number; y0: number;
  /** левый верхний угол линзы в кадре */
  X: number; Y: number;
  /** увеличение, которое просил сценарий */
  asked: number;
}

/**
 * Геометрия лупы в кадре W×H: сколько вырезать, во сколько увеличить и куда поставить.
 * Считается одна для графа сборки и для отчёта, поэтому отчёт называет ровно то, что нарисовано.
 */
export function loupeLayout(loupe: OverlayLoupe, rect: LoupeAt["rect"], frame: { width: number; height: number }, floor = frame.height): LoupeLayout {
  const { width: W, height: H } = frame;
  const asked = loupe.scale ?? LOUPE_SCALE;
  const need = Math.max(rect.width, rect.height) * ROOM;
  const most = even(LENS_MAX * Math.min(W, H));
  let D = Math.min(even((loupe.size ?? LOUPE_SIZE) * W), even(Math.min(W, H)));
  let k = asked;
  if (need * k > D) D = Math.max(D, Math.min(most, evenUp(need * k)));
  if (need * k > D) k = Math.max(1, D / need);
  const c = Math.min(evenUp(D / k), D);
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  const x0 = Math.round(Math.max(0, Math.min(W - c, cx - c / 2))), y0 = Math.round(Math.max(0, Math.min(H - c, cy - c / 2)));
  const inX = (x: number): number => Math.round(Math.max(0, Math.min(W - D, x)));
  // Линза не заходит в полосу субтитров, если помещается над ней: её содержимое — квадрат у
  // предмета, поэтому сдвиг линзы вверх предмет не режет.
  const inY = (y: number): number => Math.round(Math.max(0, Math.min(Math.min(H, floor) - D, y)));
  const place = loupe.place ?? "over";
  const edge = Math.round(Math.min(W, H) * 0.04);
  let X = inX(cx - D / 2), Y = inY(cy - D / 2);
  if (place === "top-left" || place === "top-right" || place === "bottom-left" || place === "bottom-right") {
    X = place.endsWith("left") ? edge : W - D - edge;
    Y = place.startsWith("top") ? edge : Math.max(0, Math.min(H, floor) - D - edge);
  } else if (place === "beside") {
    // Рядом с предметом: первая сторона, где линза встаёт целиком в кадр и не касается предмета;
    // если такой нет — сторона, где места больше всего, и линза прижимается к краю кадра.
    const gap = Math.round(Math.min(W, H) * 0.02);
    const sides = [
      { room: W - (rect.left + rect.width) - gap, X: rect.left + rect.width + gap, Y: cy - D / 2 },
      { room: rect.left - gap, X: rect.left - gap - D, Y: cy - D / 2 },
      { room: H - (rect.top + rect.height) - gap, X: cx - D / 2, Y: rect.top + rect.height + gap },
      { room: rect.top - gap, X: cx - D / 2, Y: rect.top - gap - D },
    ];
    const side = sides.find((o) => o.room >= D) ?? sides.reduce((a, b) => (b.room > a.room ? b : a));
    X = inX(side.X); Y = inY(side.Y);
  }
  return { D, k, c, x0, y0, X, Y, asked };
}

/** Граф лупы для кадра `frame`: вход `input` (по умолчанию `[0:v]`), выход `[v]`. */
export function loupeGraph(items: LoupeAt[], frame: { width: number; height: number }, theme: ThemeVars = resolveTheme(undefined), input = "[0:v]"): string {
  // Кайма — цвет и толщина из темы сцены; цвет ffmpeg читает числами, тема пишет его как #rrggbb.
  const [ry, rcb, rcr] = yuvOf(ffmpegColour(theme["--sc-loupe-ring"]!).split("@")[0]!);
  const ringShare = Number(theme["--sc-loupe-ring-width"]);
  const parts: string[] = [`${input}split=${items.length + 1}[b0]${items.map((_, i) => `[s${i}]`).join("")}`];
  items.forEach(({ loupe, rect, floor }, i) => {
    const { D, c, x0, y0, X, Y } = loupeLayout(loupe, rect, frame, floor);
    const at = loupe.at, end = loupe.at + (loupe.hold ?? 2.5), ring = Math.max(2, Math.round(D * ringShare));
    const fade = `clip((T-${at})/0.25,0,1)*clip((${end}-T)/0.25,0,1)`;
    parts.push(`[s${i}]crop=${c}:${c}:${x0}:${y0},scale=${D}:${D}:flags=lanczos,format=yuva444p,`
      + `geq=lum='if(gt(hypot(X-W/2,Y-H/2),W/2-${ring}),${ry},p(X,Y))':`
      + `cb='if(gt(hypot(X-W/2,Y-H/2),W/2-${ring}),${rcb},p(X,Y))':`
      + `cr='if(gt(hypot(X-W/2,Y-H/2),W/2-${ring}),${rcr},p(X,Y))':`
      + `a='255*lte(hypot(X-W/2,Y-H/2),W/2)*${fade}'[l${i}]`);
    parts.push(`[b${i}][l${i}]overlay=${X}:${Y}:enable='between(t,${at},${end})'${i === items.length - 1 ? "[v]" : `[b${i + 1}]`}`);
  });
  return parts.join(";");
}

/**
 * Лупа в том же проходе, что пишет сегмент: `ffmpeg` получает граф с лупами вместо
 * простого фильтра. Второй проход перекодировал бы весь кадр, и вне круга картинка
 * теряла бы поколение качества — ровно там, где она обязана остаться прежней.
 */
export function withLoupes(filter: string[], items: LoupeAt[], frame: { width: number; height: number }, theme?: ThemeVars): string[] {
  if (!items.length) return filter;
  if (filter[0] === "-vf") return ["-filter_complex", `[0:v]${filter[1]}[pre];${loupeGraph(items, frame, theme, "[pre]")}`, "-map", "[v]"];
  if (filter[0] === "-filter_complex") {
    const graph = filter[1]!.replace(/\[v\]$/u, "[pre]");
    return ["-filter_complex", `${graph};${loupeGraph(items, frame, theme, "[pre]")}`, "-map", "[v]"];
  }
  return ["-filter_complex", loupeGraph(items, frame, theme), "-map", "[v]"];
}
