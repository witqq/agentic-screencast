// Сцена источника → данные слайда.
//
// Живёт у слайдов, а не в разборе источника: разбор не знает ни одного
// вида сцены и не вправе решать, что значит «левая колонка» или «узел
// цепочки». Это знание принадлежит поставщику слайдов, и переезд сюда —
// ровно то, что делает вид сцены сменяемым.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, extname, resolve } from "node:path";
import { didYouMean, SourceError, type Column, type RawScene, type Slide } from "../../source.js";
import { BACKGROUNDS } from "./styles.js";
import { parseDevice } from "../../device.js";
import { highlight, lineSet } from "./code.js";
import { KINETIC } from "../../overlay.js";
import { ENTERS } from "./Slide.js";

const require = createRequire(import.meta.url);
const FFPROBE = require("@ffprobe-installer/ffprobe").path as string;

/**
 * Картинка сцены встраивается в страницу, а не ссылается на файл рядом:
 * ключ сегмента считается по файлу страницы, и замена картинки под тем же
 * именем иначе не пересобрала бы сцену.
 */
function image(file: string, dir: string, id: string): NonNullable<Slide["image"]> {
  const path = resolve(dir, file);
  if (!existsSync(path)) throw new SourceError(`scene ${id}: image not found: ${file}`);
  const type = ({ ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
    ".gif": "image/gif", ".svg": "image/svg+xml", ".avif": "image/avif" } as Record<string, string>)[extname(path).toLowerCase()];
  if (!type) throw new SourceError(`scene ${id}: image must be png, jpg, webp, gif, svg or avif: ${file}`);
  let width = 1600, height = 1000;
  if (type !== "image/svg+xml") {
    const said = execFileSync(FFPROBE, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
      "-of", "csv=p=0:s=x", path], { encoding: "utf8" }).trim();
    const m = /^(\d+)x(\d+)/.exec(said);
    if (!m) throw new SourceError(`scene ${id}: cannot read the size of ${file}`);
    width = Number(m[1]); height = Number(m[2]);
  }
  return { src: `data:${type};base64,${readFileSync(path).toString("base64")}`, width, height };
}

/** Эмодзи в начале пункта становится его значком: «🚀 Быстро :: …». */
const ICON = /^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}\uFE0F?)*)\s*/u;

/** «Заголовок :: пояснение | …» → пункты. */
function items(v: string): NonNullable<Slide["items"]> {
  return list(v).map((part) => {
    const [head, ...rest] = part.split("::");
    let title = head!.trim();
    const m = ICON.exec(title);
    const icon = m ? m[1] : undefined;
    if (m) title = title.slice(m[0].length).trim();
    const text = rest.join("::").trim();
    return { ...(icon ? { icon } : {}), title, ...(text ? { text } : {}) };
  });
}

/** «0.6 0.4» → пара чисел в пределах. */
function pair(v: string, what: string, lo: number, hi: number): [number, number] {
  const n = v.trim().split(/\s+/).map(Number);
  if (n.length !== 2 || n.some((x) => !Number.isFinite(x) || x < lo || x > hi)) throw new SourceError(`${what}: expected two numbers ${lo}–${hi}, got «${v}»`);
  return [n[0]!, n[1]!];
}

/** «а | б | в» → ["а","б","в"] */
const list = (v: string): string[] => v.split("|").map((s) => s.trim()).filter(Boolean);

/** «Заголовок :: пункт | пункт» → {title, items} либо {title, text} */
function column(v: string, id: string): Column {
  const [head, rest] = v.split("::").map((s) => s.trim());
  if (rest === undefined) {
    throw new SourceError(`сцена ${id}: колонка описывается как «Заголовок :: содержимое»`);
  }
  // Окраска задаётся в заголовке пометкой (bad|good|plain): цвет — часть
  // смысла, а не положения, и решать его должен тот, кто пишет сцену.
  const m = head!.match(/^(.*?)\s*\((bad|good|plain)\)$/);
  const title = m ? m[1]! : head!;
  const tone = (m ? m[2] : undefined) as Column["tone"];
  const base = rest.includes("|")
    ? { title, items: list(rest) }
    : { title, text: rest };
  return tone ? { ...base, tone } : base;
}

/**
 * Строки CSV: запятая разделяет поля, кавычки защищают запятую внутри подписи.
 * Первая строка — заголовок, если её второе поле не число.
 */
export function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/u)) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let cur = "", quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') quoted = false; else cur += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ",") { cells.push(cur.trim()); cur = ""; } else cur += ch;
    }
    cells.push(cur.trim());
    rows.push(cells);
  }
  return rows;
}

/** График: CSV «подпись,значение» рядом со сценарием, вид столбцов или линии, подсвеченная строка. */
function chartOf(f: Record<string, string>, dir: string, id: string): NonNullable<Slide["chart"]> {
  const path = resolve(dir, f.data!);
  if (!existsSync(path)) throw new SourceError(`scene ${id}: data file not found: ${f.data}`);
  const num = (v: string): number => Number(v.replace(/[\s_\u00a0\u202f]/gu, ""));
  let rows = csvRows(readFileSync(path, "utf8"));
  if (rows.length && !Number.isFinite(num(rows[0]![1] ?? ""))) rows = rows.slice(1);
  if (rows.length < 2 || rows.length > 24) throw new SourceError(`scene ${id}: data: a chart needs 2–24 rows «label,value», got ${rows.length}`);
  const out = rows.map((r, i) => {
    const value = num(r[1] ?? "");
    if (r.length < 2 || !Number.isFinite(value)) throw new SourceError(`scene ${id}: data row ${i + 1}: expected «label,value», got «${r.join(",")}»`);
    if (value < 0) throw new SourceError(`scene ${id}: data row ${i + 1}: a chart shows values from zero up, got ${value}`);
    return { label: r[0]!, value, shown: r[2] || r[1]! };
  });
  const type = (f.type ?? "bar").trim();
  if (type !== "bar" && type !== "line") throw new SourceError(`scene ${id}: type: expected bar | line`);
  const chart: NonNullable<Slide["chart"]> = { type, rows: out };
  const peak = f.peak?.trim();
  if (peak && peak !== "none") {
    // Номер строки не зависит от языка данных; подпись — только если она одна во всех переводах.
    const at = peak === "max" ? out.reduce((m, r, i) => (r.value > out[m]!.value ? i : m), 0)
      : /^\d+$/u.test(peak) ? Number(peak) - 1 : out.findIndex((r) => r.label === peak);
    if (at < 0 || at >= out.length) throw new SourceError(`scene ${id}: peak: expected max, none, a row number 1–${out.length} or a label from the data, got «${peak}»`);
    chart.peak = at;
  }
  return chart;
}

/** Данные слайда по сцене источника. */
export function slideOf(s: RawScene, dir = "."): Slide {
  const f = s.fields;
  const slide: Slide = { id: s.id, kind: s.kind, beats: s.beats.length };
  if (f.kicker) slide.kicker = f.kicker;
  if (f.title) slide.title = f.title;
  if (f.body) slide.body = f.body;
  if (f.note) slide.note = f.note;
  if (f.background) {
    // Опечатка в имени фона давала молча пустой фон: слайд проходил и check, и lint.
    const bg = f.background.trim();
    if (!BACKGROUNDS.includes(bg)) throw new SourceError(`scene ${s.id}: background: unknown «${bg}»${didYouMean(bg, BACKGROUNDS)}; available: ${BACKGROUNDS.join(", ")}`);
    slide.background = bg;
  }
  // Карта и титул стоят на тёмной сцене с дымкой, а не на живом фоне темы: так их читают как кино.
  if (!f.background && (s.kind === "card" || s.kind === "titlecard")) slide.background = "none";
  if (f.align) {
    const a = f.align.trim();
    if (!["top", "center", "bottom", "fill"].includes(a)) throw new SourceError(`scene ${s.id}: align: expected top | center | bottom | fill`);
    slide.align = a as Slide["align"];
  }
  if (f.move) {
    if (!["drift", "push", "still"].includes(f.move.trim())) throw new SourceError(`scene ${s.id}: move: expected drift | push | still`);
    slide.move = f.move.trim() as Slide["move"];
  }
  if (f.count) {
    if (!["on", "off"].includes(f.count.trim())) throw new SourceError(`scene ${s.id}: count: expected on | off`);
    slide.count = f.count.trim() === "on";
  }
  if (f.text) {
    // «fly» — так собирается заголовок; «fly scramble» — заголовок и текст.
    const [title, body, ...extra] = f.text.trim().split(/\s+/);
    for (const k of [title, body]) {
      if (k && !(KINETIC as readonly string[]).includes(k)) throw new SourceError(`scene ${s.id}: text: expected ${KINETIC.join(" | ")}, got «${k}»`);
    }
    if (extra.length) throw new SourceError(`scene ${s.id}: text: name at most two styles — for the title and for the body`);
    slide.text = { ...(title ? { title } : {}), ...(body ? { body } : {}) };
  }
  if (f.enter) {
    if (!(ENTERS as readonly string[]).includes(f.enter.trim())) throw new SourceError(`scene ${s.id}: enter: expected ${ENTERS.join(" | ")}`);
    slide.enter = f.enter.trim();
  }
  if (f.items) slide.items = items(f.items);
  if (f.image) slide.image = image(f.image, dir, s.id);
  if (f.point) slide.focus = pair(f.point, `scene ${s.id}: point`, 0, 1);
  if (f.push) slide.zoom = pair(f.push, `scene ${s.id}: push`, 1, 2);
  if (f.device) slide.device = parseDevice(f.device);
  if (f.cta) slide.cta = f.cta;
  if (f.url) slide.url = f.url;
  if (f.code || f.file) {
    // Код берётся строкой сценария (`\n` — перенос) или файлом рядом со сценарием.
    let text: string;
    if (f.file) {
      const path = resolve(dir, f.file);
      if (!existsSync(path)) throw new SourceError(`scene ${s.id}: code file not found: ${f.file}`);
      text = readFileSync(path, "utf8");
    } else text = f.code!.replace(/\\n/g, "\n");
    // Без названной скорости набор сам укладывается в сцену (0 — «подобрать»).
    const speed = f.cps ? Number(f.cps) : 0;
    if (f.cps && (!Number.isFinite(speed) || speed < 5 || speed > 400)) throw new SourceError(`scene ${s.id}: cps: expected 5–400 characters per second`);
    slide.code = { lines: highlight(text, f.lines), highlight: lineSet(f.highlight), speed,
      ...(f.name ? { name: f.name } : f.file ? { name: basename(f.file) } : {}) };
  }
  if (s.kind === "compare") {
    slide.left = column(f.left!, s.id);
    slide.right = column(f.right!, s.id);
  }
  if (s.kind === "chain") {
    slide.nodes = list(f.nodes!).map((label) => {
      const m = label.match(/^(.*?)\s*\((acc|bad)\)$/);
      return m ? { label: m[1]!, kind: m[2] as "acc" | "bad" } : { label };
    });
    if (f.back) slide.back = f.back;
  }
  if (f.values || f.value) {
    slide.values = f.values
      ? list(f.values).map((v) => {
          const [value, label] = v.split("::").map((x) => x.trim());
          return { value: value!, label: label! };
        })
      : [{ value: (f.value || "").split("·")[0]!.trim(),
           label: (f.value || "").split("·").slice(1).join("·").trim() }];
    if (f.tags) slide.tags = list(f.tags);
  }
  if (s.kind === "quote") {
    slide.parts = list(f.parts!).map((p) => {
      const [label, ...rest] = p.split("::");
      return { label: label!.trim(), text: rest.join("::").trim() };
    });
  }
  if (s.kind === "chart") slide.chart = chartOf(f, dir, s.id);
  if (f.after) slide.after = image(f.after, dir, s.id);
  if (f.labels) {
    const l = list(f.labels);
    if (l.length !== 2) throw new SourceError(`scene ${s.id}: labels: expected two, «Before | After»`);
    slide.labels = [l[0]!, l[1]!];
  }
  if (f.split) slide.split = pair(f.split, `scene ${s.id}: split`, 0, 1);
  if (f.panels) {
    // «x y w h @ глубина | …»: прямоугольник в долях снимка и глубина 0…1.
    slide.panels = list(f.panels).map((p, i) => {
      const m = /^([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*@\s*([\d.]+)$/u.exec(p);
      const where = `scene ${s.id}: panels[${i + 1}]`;
      if (!m) throw new SourceError(`${where}: expected «x y w h @ depth», e.g. «0.05 0.1 0.4 0.5 @ 0.8»`);
      const [x, y, w, h, depth] = m.slice(1).map(Number) as [number, number, number, number, number];
      if (x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > 1 || y + h > 1) throw new SourceError(`${where}: the panel lies outside the picture`);
      if (depth < 0 || depth > 1) throw new SourceError(`${where}: depth is 0–1, where 1 is nearest`);
      return { x, y, w, h, depth };
    });
    if (slide.panels.length > 8) throw new SourceError(`scene ${s.id}: panels: at most 8`);
  }
  // Моменты остаются СТРОКАМИ: это якоря, и разрешает их слой композиции,
  // когда длины тактов уже известны из звука.
  if (f.at) slide.at = f.at.split(/\s+/);
  return slide;
}
