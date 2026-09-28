// Как клип другой пропорции ложится в кадр ролика.
//
// `contain` (умолчание) — клип целиком, по бокам или сверху и снизу поля цвета темы: так снятый
// интерфейс не теряет ни края. `cover` — клип заполняет кадр целиком, лишнее срезается; точка
// `x y` (доли клипа, 0.5 0.5 — середина) говорит, какую его часть держать в кадре. Так ставят
// чужие клипы — квадратные, 4:3, вертикальные — в фильм без полей.

/** Вписывание клипа: режим и точка, которую `cover` держит в кадре. */
export interface Fit { mode: "contain" | "cover"; x: number; y: number }

/** Поле `fit`: `contain`, `cover`, `cover 0.5 0.3` или `{"mode":"cover","x":0.5,"y":0.3}`. */
export function parseFit(raw: string): Fit {
  const text = raw.trim();
  let v: Record<string, unknown>;
  if (text.startsWith("{")) {
    try { v = JSON.parse(text) as Record<string, unknown>; } catch { throw new Error('fit: expected contain, cover [x y] or {"mode","x","y"}'); }
    for (const k of Object.keys(v)) if (!["mode", "x", "y"].includes(k)) throw new Error(`fit: unknown property «${k}»`);
  } else {
    const [mode, x, y] = text.split(/\s+/);
    v = { mode, ...(x !== undefined ? { x: Number(x) } : {}), ...(y !== undefined ? { y: Number(y) } : {}) };
  }
  if (v.mode !== "contain" && v.mode !== "cover") throw new Error(`fit: expected contain or cover, got «${String(v.mode)}»`);
  if (v.mode === "contain" && (v.x !== undefined || v.y !== undefined)) throw new Error("fit: only cover keeps a point in frame");
  const share = (k: "x" | "y"): number => {
    if (v[k] === undefined) return 0.5;
    const n = Number(v[k]);
    if (!Number.isFinite(n) || n < 0 || n > 1) throw new Error(`fit.${k}: expected a share of the clip, 0…1`);
    return n;
  };
  return { mode: v.mode, x: share("x"), y: share("y") };
}

/**
 * Фильтр ffmpeg, который кладёт клип в кадр w×h: `contain` — вписать и добить полями `fill`,
 * `cover` — заполнить и срезать лишнее вокруг точки фокуса.
 */
export function fitFilter(fit: Fit | undefined, w: number, h: number, fill: string): string {
  if (fit?.mode === "cover") {
    return `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}:(iw-${w})*${fit.x}:(ih-${h})*${fit.y}`;
  }
  return `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:-1:-1:color=${fill}`;
}

/**
 * Прямоугольник в долях клипа → в доли кадра, как клип в него ложится: `contain` вписывает и
 * центрирует, `cover` заполняет и срезает лишнее вокруг точки фокуса (та же арифметика, что у
 * `fitFilter`). Так элемент, записанный в дубле, находится в кадре без ручного замера.
 */
export function clipToFrame(rect: readonly [number, number, number, number], clip: { width: number; height: number },
  frame: { width: number; height: number }, fit: Fit | undefined): [number, number, number, number] {
  const cover = fit?.mode === "cover";
  const k = cover ? Math.max(frame.width / clip.width, frame.height / clip.height) : Math.min(frame.width / clip.width, frame.height / clip.height);
  const sw = clip.width * k, sh = clip.height * k;
  const ox = cover ? -(sw - frame.width) * fit!.x : (frame.width - sw) / 2;
  const oy = cover ? -(sh - frame.height) * fit!.y : (frame.height - sh) / 2;
  const x0 = Math.max(0, (ox + rect[0] * sw) / frame.width), y0 = Math.max(0, (oy + rect[1] * sh) / frame.height);
  const x1 = Math.min(1, (ox + (rect[0] + rect[2]) * sw) / frame.width), y1 = Math.min(1, (oy + (rect[1] + rect[3]) * sh) / frame.height);
  const r = (v: number): number => Math.round(v * 10000) / 10000;
  return [r(x0), r(y0), r(Math.max(0.0001, x1 - x0)), r(Math.max(0.0001, y1 - y0))];
}
