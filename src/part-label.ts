// Название части у полосы хода (`progress.parts`): его кегль и полоса, которую оно занимает у края
// кадра или зоны. Одно число нужно трём местам — картинке названия (film.ts), зоне слоя сцены и
// полям слайда, — и расходиться им нельзя: иначе субтитры или низ слайда ложатся на название.

/**
 * Кегль названия части у полосы хода. В горизонтальном кадре — 0,95 сотой ширины (18 точек на
 * 1920). В вертикальном та же доля давала 10 точек на 1080 — не прочесть на телефоне; там кегль —
 * не мельче 36 точек на 1080, нижней границы читаемого второстепенного текста
 * (docs/vertical-video.md, «Text»).
 */
export function chapterFontPx(frame: { width: number; height: number }): number {
  const u = frame.width / 100;
  return frame.height > frame.width ? Math.max(u * 0.95, frame.width * 36 / 1080) : u * 0.95;
}

/** Высота плашки названия: строка в 1,2 кегля, поля по 0,35 её единицы и кайма. */
export function partLabelHeight(frame: { width: number; height: number }): number {
  const px = chapterFontPx(frame);
  return Math.ceil(px * 1.2 + 2 * 0.35 * (px / 0.95) + 2);
}

/**
 * Зона слоя сцены: зона площадки без полосы, которую у её края занимает название части
 * (`progress.label: zone`). Субтитры, карточки и титры у того же края иначе ложились на название.
 */
export function layerSafe<Z extends { top: number; bottom: number; left: number; right: number }>(pitch: {
  safe?: Z; progress?: { position?: "top" | "bottom"; label?: "edge" | "zone"; parts?: boolean };
  scenes: Array<{ chapter?: string }>;
}, frame: { width: number; height: number }): Z | undefined {
  const z = pitch.safe, p = pitch.progress;
  if (!z || !p || p.parts === false || (p.label ?? "zone") !== "zone" || !pitch.scenes.some((s) => s.chapter)) return z;
  const band = partLabelHeight(frame) + Math.round(z.left * 0.6);
  return p.position === "top" ? { ...z, top: z.top + band } : { ...z, bottom: z.bottom + band };
}
