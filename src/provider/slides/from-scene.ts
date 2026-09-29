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
import { didYouMean, MissingMaterialError, SourceError, type Column, type RawScene, type Slide } from "../../source.js";
import { BACKGROUNDS } from "./styles.js";
import { parseDevice } from "../../device.js";
import { highlight, lineSet } from "./code.js";
import { KINETIC } from "../../overlay.js";
import { ENTERS } from "./Slide.js";
import { msg } from "../../msg.js";

const require = createRequire(import.meta.url);
const FFPROBE = require("@ffprobe-installer/ffprobe").path as string;

/**
 * Картинка сцены встраивается в страницу, а не ссылается на файл рядом:
 * ключ сегмента считается по файлу страницы, и замена картинки под тем же
 * именем иначе не пересобрала бы сцену.
 */
function image(file: string, dir: string, id: string): NonNullable<Slide["image"]> {
  const path = resolve(dir, file);
  const type = ({ ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
    ".gif": "image/gif", ".svg": "image/svg+xml", ".avif": "image/avif" } as Record<string, string>)[extname(path).toLowerCase()];
  if (!type) throw new SourceError(msg("slides.imageType", { id, file }));
  if (!existsSync(path)) throw new MissingMaterialError(msg("slides.imageMissing", { id, file }), "image", file);
  let width = 1600, height = 1000;
  if (type !== "image/svg+xml") {
    const said = execFileSync(FFPROBE, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
      "-of", "csv=p=0:s=x", path], { encoding: "utf8" }).trim();
    const m = /^(\d+)x(\d+)/.exec(said);
    if (!m) throw new SourceError(msg("slides.imageSize", { id, file }));
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
  if (n.length !== 2 || n.some((x) => !Number.isFinite(x) || x < lo || x > hi))
    throw new SourceError(msg("slides.pair", { where: what, low: lo, high: hi, value: v }));
  return [n[0]!, n[1]!];
}

/** «а | б | в» → ["а","б","в"] */
const list = (v: string): string[] => v.split("|").map((s) => s.trim()).filter(Boolean);

/** «Заголовок :: пункт | пункт» → {title, items} либо {title, text} */
function column(v: string, id: string): Column {
  const [head, rest] = v.split("::").map((s) => s.trim());
  if (rest === undefined) {
    throw new SourceError(msg("slides.column", { id }));
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
  const type = (f.type ?? "bar").trim();
  if (type !== "bar" && type !== "line") throw new SourceError(msg("slides.options", { id, field: "type", options: "bar | line" }));
  const path = resolve(dir, f.data!);
  if (!existsSync(path)) throw new MissingMaterialError(msg("slides.dataMissing", { id, file: f.data! }), "data", f.data!);
  const num = (v: string): number => Number(v.replace(/[\s_\u00a0\u202f]/gu, ""));
  let rows = csvRows(readFileSync(path, "utf8"));
  if (rows.length && !Number.isFinite(num(rows[0]![1] ?? ""))) rows = rows.slice(1);
  if (rows.length < 2 || rows.length > 24) throw new SourceError(msg("slides.chartRows", { id, count: rows.length }));
  const out = rows.map((r, i) => {
    const value = num(r[1] ?? "");
    if (r.length < 2 || !Number.isFinite(value)) throw new SourceError(msg("slides.chartRow", { id, row: i + 1, value: r.join(",") }));
    if (value < 0) throw new SourceError(msg("slides.chartValue", { id, row: i + 1, value }));
    return { label: r[0]!, value, shown: r[2] || r[1]! };
  });
  const chart: NonNullable<Slide["chart"]> = { type, rows: out };
  const peak = f.peak?.trim();
  if (peak && peak !== "none") {
    // Номер строки не зависит от языка данных; подпись — только если она одна во всех переводах.
    const at = peak === "max" ? out.reduce((m, r, i) => (r.value > out[m]!.value ? i : m), 0)
      : /^\d+$/u.test(peak) ? Number(peak) - 1 : out.findIndex((r) => r.label === peak);
    if (at < 0 || at >= out.length) throw new SourceError(msg("slides.peak", { id, count: out.length, value: peak }));
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
    if (!BACKGROUNDS.includes(bg)) throw new SourceError(msg("slides.background", {
      id: s.id, value: bg, hint: didYouMean(bg, BACKGROUNDS), available: BACKGROUNDS.join(", ") }));
    slide.background = bg;
  }
  // Карта и титул стоят на тёмной сцене с дымкой, а не на живом фоне темы: так их читают как кино.
  if (!f.background && (s.kind === "card" || s.kind === "titlecard")) slide.background = "none";
  if (f.align) {
    const a = f.align.trim();
    if (!["top", "center", "bottom", "fill"].includes(a))
      throw new SourceError(msg("slides.options", { id: s.id, field: "align", options: "top | center | bottom | fill" }));
    slide.align = a as Slide["align"];
  }
  if (f.move) {
    if (!["drift", "push", "still"].includes(f.move.trim()))
      throw new SourceError(msg("slides.options", { id: s.id, field: "move", options: "drift | push | still" }));
    slide.move = f.move.trim() as Slide["move"];
  }
  if (f.count) {
    if (!["on", "off"].includes(f.count.trim()))
      throw new SourceError(msg("slides.options", { id: s.id, field: "count", options: "on | off" }));
    slide.count = f.count.trim() === "on";
  }
  if (f.text) {
    // «fly» — так собирается заголовок; «fly scramble» — заголовок и текст.
    const [title, body, ...extra] = f.text.trim().split(/\s+/);
    for (const k of [title, body]) {
      if (k && !(KINETIC as readonly string[]).includes(k)) throw new SourceError(msg("slides.textStyle", { id: s.id, options: KINETIC.join(" | "), value: k }));
    }
    if (extra.length) throw new SourceError(msg("slides.textCount", { id: s.id }));
    slide.text = { ...(title ? { title } : {}), ...(body ? { body } : {}) };
  }
  if (f.enter) {
    if (!(ENTERS as readonly string[]).includes(f.enter.trim()))
      throw new SourceError(msg("slides.options", { id: s.id, field: "enter", options: ENTERS.join(" | ") }));
    slide.enter = f.enter.trim();
  }
  if (f.items) slide.items = items(f.items);
  if (s.kind === "globe" && slide.items) {
    // «Город :: широта долгота»: первый — откуда летят дуги.
    for (const [i, it] of slide.items.entries()) {
      const n = (it.text ?? "").split(/\s+/).map(Number);
      if (n.length !== 2 || !(Math.abs(n[0]!) <= 90) || !(Math.abs(n[1]!) <= 180))
        throw new SourceError(msg("slides.globePoint", { id: s.id, index: i + 1, value: it.text ?? "" }));
    }
    if (slide.items.length < 2) throw new SourceError(msg("slides.globePoint", { id: s.id, index: 1, value: "at least two cities" }));
  }
  if (f.point) slide.focus = pair(f.point, msg("slides.where", { id: s.id, field: "point" }), 0, 1);
  if (f.push) slide.zoom = pair(f.push, msg("slides.where", { id: s.id, field: "push" }), 1, 2);
  if (f.device) slide.device = parseDevice(f.device);
  if (f.cta) slide.cta = f.cta;
  if (f.url) slide.url = f.url;
  // Check code options before attempting to read its external file.
  const codeSpeed = f.cps ? Number(f.cps) : 0;
  if (f.cps && (!Number.isFinite(codeSpeed) || codeSpeed < 5 || codeSpeed > 400))
    throw new SourceError(msg("slides.cps", { id: s.id }));
  const codeHighlight = f.code || f.file ? lineSet(f.highlight) : [];
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
  if (f.labels) {
    const l = list(f.labels);
    if (l.length !== 2) throw new SourceError(msg("slides.labels", { id: s.id }));
    slide.labels = [l[0]!, l[1]!];
  }
  if (f.split) slide.split = pair(f.split, msg("slides.where", { id: s.id, field: "split" }), 0, 1);
  if (f.panels) {
    // «x y w h @ глубина | …»: прямоугольник в долях снимка и глубина 0…1.
    slide.panels = list(f.panels).map((p, i) => {
      const m = /^([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*@\s*([\d.]+)$/u.exec(p);
      const where = msg("slides.where", { id: s.id, field: `panels[${i + 1}]` });
      if (!m) throw new SourceError(msg("slides.panelForm", { where }));
      const [x, y, w, h, depth] = m.slice(1).map(Number) as [number, number, number, number, number];
      if (x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > 1 || y + h > 1) throw new SourceError(msg("slides.panelOutside", { where }));
      if (depth < 0 || depth > 1) throw new SourceError(msg("slides.panelDepth", { where }));
      return { x, y, w, h, depth };
    });
    if (slide.panels.length > 8) throw new SourceError(msg("slides.panelCount", { id: s.id }));
  }
  if (f.rows) {
    if (!["1", "2"].includes(f.rows.trim()))
      throw new SourceError(msg("slides.options", { id: s.id, field: "rows", options: "1 | 2" }));
    slide.rows = Number(f.rows.trim()) as 1 | 2;
  }
  if (f.speed) {
    const v = Number(f.speed.trim());
    if (!Number.isFinite(v) || v < 20 || v > 600) throw new SourceError(msg("slides.speed", { id: s.id }));
    slide.speed = v;
  }
  if (f.at) slide.at = f.at.split(/\s+/);
  // Material lookup is last: an unfinished file must not hide an invalid independent field.
  if (f.code || f.file) {
    const text = f.file ? (() => {
      const path = resolve(dir, f.file);
      if (!existsSync(path)) throw new MissingMaterialError(msg("slides.codeMissing", { id: s.id, file: f.file }), "file", f.file);
      return readFileSync(path, "utf8");
    })() : f.code!.replace(/\\n/g, "\n");
    slide.code = { lines: highlight(text, f.lines), highlight: codeHighlight, speed: codeSpeed,
      ...(f.name ? { name: f.name } : f.file ? { name: basename(f.file) } : {}) };
  }
  if (s.kind === "chart") slide.chart = chartOf(f, dir, s.id);
  if (f.image) slide.image = image(f.image, dir, s.id);
  if (f.after) slide.after = image(f.after, dir, s.id);
  return slide;
}
