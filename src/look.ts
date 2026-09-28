// Вид плёнки: цветовой грейд, виньетка, зерно и каше одной строкой шапки.
//
// Трейлер держится на отделке кадра не меньше, чем на монтаже: чистый
// цифровой кадр без грейда и зерна выглядит «сырым», как запись экрана,
// сколько бы движения в нём ни было. Отделка ложится на готовый ролик
// одним проходом, поверх всех сцен сразу, — поэтому она одинакова у слайда,
// у снятого интерфейса и у видеовставки и не может разойтись между ними.
//
// Всё здесь — фильтры ffmpeg с явными параметрами: зерно с закреплённым
// зерном генератора, виньетка без пересчёта по кадрам. Повторная сборка
// даёт тот же файл, а соседние кадры неподвижного слайда при этом
// различаются — ровно так, как у плёнки.

export type Grade = "none" | "teal-orange" | "warm" | "cool" | "mono" | "bleach";

export interface Look {
  grade?: Grade;
  /** сила зерна 0…1 */
  grain?: number;
  /** сила виньетки 0…1 */
  vignette?: number;
  /** каше: соотношение сторон изображения между чёрными полосами, например 2.39 */
  bars?: number;
}

export const GRADES: Grade[] = ["none", "teal-orange", "warm", "cool", "mono", "bleach"];

/** Готовые виды: имя вместо четырёх чисел. */
export const LOOKS: Record<string, Look> = {
  cinematic: { grade: "teal-orange", grain: 0.35, vignette: 0.45 },
  vintage: { grade: "warm", grain: 0.65, vignette: 0.6 },
  soft: { grade: "none", grain: 0.2, vignette: 0.3 },
  mono: { grade: "mono", grain: 0.5, vignette: 0.5 },
  trailer: { grade: "teal-orange", grain: 0.3, vignette: 0.5, bars: 2.39 },
};

/** Шапка `look:` — имя готового вида, JSON или имя с правками `{"preset":"cinematic","grain":0.1}`. */
export function parseLook(raw: string): Look {
  const text = raw.trim();
  if (!text.startsWith("{")) {
    const found = LOOKS[text];
    if (!found) throw new Error(`look: unknown «${text}»; available: ${Object.keys(LOOKS).join(", ")}, or JSON`);
    return { ...found };
  }
  let v: Record<string, unknown>;
  try { v = JSON.parse(text) as Record<string, unknown>; } catch { throw new Error("look: expected a name or a JSON object"); }
  for (const k of Object.keys(v)) if (!["preset", "grade", "grain", "vignette", "bars"].includes(k)) throw new Error(`look: unknown property «${k}»`);
  const base = v.preset === undefined ? {} : parseLook(String(v.preset));
  if (v.grade !== undefined && !GRADES.includes(v.grade as Grade)) throw new Error(`look.grade: expected ${GRADES.join(" | ")}`);
  for (const k of ["grain", "vignette"]) {
    if (v[k] !== undefined && (typeof v[k] !== "number" || (v[k] as number) < 0 || (v[k] as number) > 1)) throw new Error(`look.${k}: expected 0…1`);
  }
  if (v.bars !== undefined && (typeof v.bars !== "number" || v.bars < 1.5 || v.bars > 3)) throw new Error("look.bars: expected an aspect ratio 1.5…3, e.g. 2.39");
  const own: Record<string, unknown> = { ...v };
  delete own.preset;
  return { ...base, ...(own as Look) };
}

/** Цветовые решения: баланс теней, середины и светов плюс контраст и насыщенность. */
const GRADE_FILTERS: Record<Grade, string> = {
  none: "",
  // Тени в бирюзу, света в тёплое: кожа и интерфейсные акценты отделяются от фона.
  "teal-orange": "colorbalance=rs=-0.07:gs=-0.01:bs=0.09:rh=0.08:gh=0.02:bh=-0.07,eq=contrast=1.06:saturation=1.08",
  warm: "colorbalance=rs=0.05:bs=-0.05:rm=0.05:bm=-0.05:rh=0.03:bh=-0.03,eq=saturation=1.04",
  cool: "colorbalance=rs=-0.04:bs=0.06:rm=-0.03:bm=0.04,eq=saturation=0.96",
  mono: "hue=s=0,eq=contrast=1.12",
  bleach: "eq=saturation=0.68:contrast=1.16",
};

/**
 * Граф фильтров вида: из метки `input` в метку `output`. Пустой вид — `null`.
 *
 * Зерно — не шум в каждом пикселе. Такой шум не сжимается вовсе: замер на
 * шести секундах слайдов дал 53 МБ против 1,6 МБ чистого ролика, и
 * восьмидесятисекундная витрина весила 783 МБ. Зерно здесь — отдельный
 * серый слой в треть кадра, который меняется каждый кадр и накладывается
 * режимом overlay: зёрна крупнее пикселя, как у плёнки, и при силе 0,15
 * файл растёт в несколько раз, а не в тридцать.
 */
export function lookGraph(look: Look, frame: { width: number; height: number; fps: number }, input: string, output: string): string | null {
  const chain: string[] = [];
  const grade = GRADE_FILTERS[look.grade ?? "none"];
  if (grade) chain.push(grade);
  if (look.vignette && look.vignette > 0) chain.push(`vignette=angle=${(0.3 + look.vignette * 0.6).toFixed(3)}`);
  const bars: string[] = [];
  if (look.bars) {
    const h = Math.round((frame.height - frame.width / look.bars) / 2);
    if (h > 0) bars.push(`drawbox=x=0:y=0:w=iw:h=${h}:color=black:t=fill`, `drawbox=x=0:y=ih-${h}:w=iw:h=${h}:color=black:t=fill`);
  }
  const grain = look.grain && look.grain > 0 ? look.grain : 0;
  if (!chain.length && !bars.length && !grain) return null;
  const graded = chain.length ? chain.join(",") : "null";
  if (!grain) return `${input}${[graded, ...bars].join(",")}${output}`;
  const gw = Math.max(2, Math.round(frame.width / 6) * 2), gh = Math.max(2, Math.round(frame.height / 6) * 2);
  // Каше рисуется после зерна: полосы не зернятся.
  return `${input}${graded},split[lk_a][lk_b];`
    + `[lk_b]scale=${gw}:${gh},format=gray,geq=lum='128',`
    + `noise=alls=16:allf=t:all_seed=20260924,scale=${frame.width}:${frame.height}:flags=bicubic,format=yuv420p[lk_g];`
    + `[lk_a]format=yuv420p[lk_c];[lk_c][lk_g]blend=all_mode=overlay:all_opacity=${(0.1 + grain * 0.45).toFixed(3)}`
    + `${bars.length ? "," + bars.join(",") : ""}${output}`;
}
