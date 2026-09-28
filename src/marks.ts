// Отметки живого дубля в сценарии.
//
// Дубль, записанный `agentic-screencast/capture`, кладёт рядом с роликом
// `<ролик>.marks.json`: именованные моменты от нуля записи и след кликов.
// Сценарий видеосцены ссылается на момент по имени — `@saved` — в `freezeAt`,
// `speed` и `spotlight`, и секунды угадывать не нужно: переснятый дубль
// приносит новые отметки, а сценарий остаётся прежним. След кликов даёт
// `autoZoom`: камера сама наезжает туда, где был клик.
import { existsSync, readFileSync } from "node:fs";
import type { OverlayCamera } from "./overlay.js";
import { pushScale } from "./camera.js";
import { msg } from "./msg.js";

export interface TakeMarks {
  trimmed: number;
  marks: Record<string, number>;
  clicks: Array<{ t: number; x: number; y: number }>;
  /** путь курсора (дубли, снятые до его записи, его не имеют) */
  path?: Array<{ t: number; x: number; y: number }>;
  /** действия с их элементами: вид, начало, конец, прямоугольник в долях кадра */
  actions?: Array<{ kind: string; t: number; end: number; rect?: [number, number, number, number] }>;
  /** движение камеры, уже впечённое в дубль (секунды исходного клипа) */
  cameraMoves?: Array<{ from: number; to: number }>;
  /** прямоугольники элементов у отметок, названных с локатором */
  rects?: Record<string, [number, number, number, number]>;
}

/** Отметки ролика или undefined, если ролик снят не через capture. */
export function marksOf(video: string): TakeMarks | undefined {
  const file = `${video}.marks.json`;
  if (!existsSync(file)) return undefined;
  return JSON.parse(readFileSync(file, "utf8")) as TakeMarks;
}

/** Кусок дубля, который показывает сцена: секунды исходного клипа. */
export interface Trim { from: number; to?: number }

/**
 * Отметки куска дубля: секунды от начала куска. Отметки и клики вне куска отпадают — сцена их
 * не показывает, и наезд к клику за её пределами ехал бы в пустоту.
 */
export function trimMarks(m: TakeMarks | undefined, trim: Trim | undefined): TakeMarks | undefined {
  if (!m || !trim) return m;
  const end = trim.to ?? Infinity;
  const inside = (t: number): boolean => t >= trim.from - 1e-6 && t <= end + 1e-6;
  const at = (t: number): number => Math.round((t - trim.from) * 1000) / 1000;
  // Keep the position at a cut boundary. Dropping the samples just outside the cut made
  // cursor following begin at a later position, so the portrait window jumped on entry.
  const path = m.path ? [...m.path].sort((a, b) => a.t - b.t) : undefined;
  const boundary = (time: number): NonNullable<TakeMarks["path"]>[number] | undefined => {
    if (!path || !Number.isFinite(time)) return undefined;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1]!, b = path[i]!;
      if (a.t < time && time < b.t) {
        const p = (time - a.t) / (b.t - a.t);
        return { t: time, x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
      }
    }
    return undefined;
  };
  const keptPath = path ? [boundary(trim.from), ...path.filter((p) => inside(p.t)), boundary(end)]
    .filter((p): p is NonNullable<TakeMarks["path"]>[number] => Boolean(p))
    .map((p) => ({ ...p, t: at(p.t) })) : undefined;
  return { ...m, marks: Object.fromEntries(Object.entries(m.marks).filter(([, t]) => inside(t)).map(([k, t]) => [k, at(t)])),
    clicks: m.clicks.filter((c) => inside(c.t)).map((c) => ({ ...c, t: at(c.t) })),
    ...(keptPath ? { path: keptPath } : {}),
    ...(m.actions ? { actions: m.actions.filter((a) => inside(a.t)).map((a) => ({ ...a, t: at(a.t), end: at(Math.min(a.end, end)) })) } : {}),
    ...(m.cameraMoves ? { cameraMoves: m.cameraMoves.filter((move) => move.to > trim.from && move.from < end)
      .map((move) => ({ from: at(Math.max(move.from, trim.from)), to: at(Math.min(move.to, end)) })) } : {}) };
}

/**
 * Заменить ссылки на отметки секундами. Ссылка — ЗНАЧЕНИЕ момента целиком:
 * `@saved` или `@saved+0.5` (голое значение поля) либо строка `"@saved"`,
 * `"@saved-0.3"` внутри JSON. Текст карточки со словом «@saved» внутри не
 * трогается: подмена в прозе превращала бы подпись в набор цифр.
 */
export const MARK_REFERENCE = "@([A-Za-z][\\w-]*)(\\s*[+-]\\s*[\\d.]+)?";
const WHOLE_MARK = new RegExp(`^\\s*${MARK_REFERENCE}\\s*$`);

export const isMarkReference = (value: string): boolean => WHOLE_MARK.test(value);

export function resolveMarks(value: string, marks: TakeMarks | undefined, where: string): string {
  if (!value.includes("@")) return value;
  const find = (token: string, shift?: string): number => {
    // Имя отметки может содержать дефис (`steps-end`), и тогда `@steps-end-1` читается жадно
    // как имя «steps-end-1». Незнакомое имя с числовым хвостом после дефиса — это знакомая
    // отметка минус секунды: `@done-3` — три секунды до `done`.
    let name = token;
    const tail = /^(.+)-([\d.]+)$/.exec(token);
    if (marks?.marks[token] === undefined && tail && marks?.marks[tail[1]!] !== undefined && shift === undefined) {
      name = tail[1]!;
      shift = `-${tail[2]}`;
    }
    const t = marks?.marks[name];
    if (t === undefined) {
      const known = marks ? Object.keys(marks.marks).join(", ") || msg("source.none") : msg("marks.noFile");
      throw new Error(msg("marks.unknown", { where, name, known }));
    }
    return Math.round((t + (shift ? Number(shift.replace(/\s+/g, "")) : 0)) * 1000) / 1000;
  };
  const whole = WHOLE_MARK.exec(value);
  if (whole) return String(find(whole[1]!, whole[2]));
  return value.replace(new RegExp(`"${MARK_REFERENCE}"`, "g"), (_, name: string, shift?: string) => String(find(name, shift)));
}

/** Как наезжать на клики: увеличение, удержание и размер области. */
export interface AutoZoom { scale?: number; hold?: number; size?: number; follow?: "cursor" }

/**
 * Наезды к местам кликов, как у Screen Studio: камера приходит к точке клика
 * чуть после нажатия и держит результат. Клики, идущие плотно друг за другом,
 * становятся одним проездом от точки к точке без возврата к общему плану.
 */
export function autoZoomCues(clicks: TakeMarks["clicks"], opts: AutoZoom = {}): OverlayCamera[] {
  const scale = opts.scale ?? 1.8, hold = opts.hold ?? 1.2, size = opts.size ?? 0.36;
  const move = 0.5, back = 0.7, lead = 0.35;
  const cues: OverlayCamera[] = [];
  for (const c of [...clicks].sort((a, b) => a.t - b.t)) {
    const at = Math.max(0, c.t - lead);
    const area: [number, number, number, number] = [
      Math.min(1 - size, Math.max(0, c.x - size / 2)), Math.min(1 - size, Math.max(0, c.y - size / 2)), size, size];
    const prev = cues[cues.length - 1];
    if (prev) {
      const prevEnd = prev.at + (prev.move ?? move) + prev.hold;
      // Следующий клик раньше, чем камера успела бы вернуться: едем к нему прямо.
      if (at < prevEnd + back + 0.35) {
        prev.keep = true;
        prev.hold = Math.max(0.8, at - prev.at - (prev.move ?? move));
        cues.push({ at: prev.at + (prev.move ?? move) + prev.hold, hold, move, return: back, scale, area,
          ring: false, ...(opts.follow ? { follow: opts.follow } : {}) });
        continue;
      }
    }
    cues.push({ at, hold, move, return: back, scale, area,
      ring: false, ...(opts.follow ? { follow: opts.follow } : {}) });
  }
  return cues;
}

/**
 * Наезды по действиям дубля, когда он записал их вместе с элементами (`actions` в файле отметок).
 * Действия, идущие подряд и рядом, — один наезд на их общую область с полем: клик по полю, ввод
 * и выбор из открывшегося списка видны одним кадром, а не тремя рывками. Ввод держит наезд до
 * конца набора — действие кончается, когда кончился набор. Далёкое или позднее действие — свой
 * наезд, и близкие по времени наезды едут друг к другу без возврата к общему плану.
 */
export function actionZoomCues(actions: NonNullable<TakeMarks["actions"]>, clicks: TakeMarks["clicks"], opts: AutoZoom = {}): OverlayCamera[] {
  const hold = opts.hold ?? 1.2, size = opts.size ?? 0.36, move = 0.5, back = 0.7, lead = 0.35;
  const margin = 0.04, gap = 1.2, reach = 0.55;
  type Box = [number, number, number, number];
  const boxOf = (a: NonNullable<TakeMarks["actions"]>[number]): Box | null => {
    // A viewport-sized locator is navigation context, not an element to outline. Its
    // click point is a more specific subject; absent that, there is no focus cue.
    if (a.rect && a.rect[2] <= 0.7 && a.rect[3] <= 0.7) return a.rect;
    // Клик в точку без элемента: маленькая область вокруг записанного клика.
    const c = [...clicks].sort((p, q) => Math.abs(p.t - a.t) - Math.abs(q.t - a.t))[0];
    return c && Math.abs(c.t - a.t) <= 1.2 ? [c.x - 0.01, c.y - 0.01, 0.02, 0.02] : null;
  };
  const union = (a: Box, b: Box): Box => {
    const x0 = Math.min(a[0], b[0]), y0 = Math.min(a[1], b[1]);
    return [x0, y0, Math.max(a[0] + a[2], b[0] + b[2]) - x0, Math.max(a[1] + a[3], b[1] + b[3]) - y0];
  };
  const groups: Array<{ t: number; end: number; box: Box }> = [];
  for (const a of [...actions].sort((p, q) => p.t - q.t)) {
    const box = boxOf(a);
    if (!box) continue;
    const g = groups[groups.length - 1];
    const joined = g ? union(g.box, box) : null;
    if (g && joined && a.t - g.end < gap && joined[2] <= reach && joined[3] <= reach) {
      g.box = joined; g.end = Math.max(g.end, a.end);
    } else groups.push({ t: a.t, end: a.end, box });
  }
  const cues: OverlayCamera[] = [];
  for (const g of groups) {
    // Область — общий прямоугольник с полем, не меньше `size` по каждой стороне, внутри кадра.
    const w = Math.min(1, Math.max(size, g.box[2] + margin * 2)), h = Math.min(1, Math.max(size, g.box[3] + margin * 2));
    const cx = g.box[0] + g.box[2] / 2, cy = g.box[1] + g.box[3] / 2;
    const area: Box = [Math.min(1 - w, Math.max(0, cx - w / 2)), Math.min(1 - h, Math.max(0, cy - h / 2)), w, h];
    const r = (v: number): number => Math.round(v * 10000) / 10000;
    const at = Math.max(0, g.t - lead);
    const span = Math.max(hold, g.end - g.t + hold);
    const cue: OverlayCamera = { at, hold: span, move, return: back, area: area.map(r) as Box,
      ring: false, scale: opts.scale ?? pushScale({}, area[2], area[3]),
      ...(opts.follow ? { follow: opts.follow } : {}) };
    const prev = cues[cues.length - 1];
    if (prev) {
      const prevEnd = prev.at + (prev.move ?? move) + prev.hold;
      if (at < prevEnd + back + 0.35) {
        prev.keep = true;
        prev.hold = Math.max(0.8, at - prev.at - (prev.move ?? move));
        cue.at = prev.at + (prev.move ?? move) + prev.hold;
      }
    }
    cues.push(cue);
  }
  return cues;
}
