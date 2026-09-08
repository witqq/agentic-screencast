// Сцена источника → данные слайда.
//
// Живёт у слайдов, а не в разборе источника: разбор не знает ни одного
// вида сцены и не вправе решать, что значит «левая колонка» или «узел
// цепочки». Это знание принадлежит поставщику слайдов, и переезд сюда —
// ровно то, что делает вид сцены сменяемым.
import type { Column, RawScene, Slide } from "../../source.js";

/** «а | б | в» → ["а","б","в"] */
const list = (v: string): string[] => v.split("|").map((s) => s.trim()).filter(Boolean);

/** «Заголовок :: пункт | пункт» → {title, items} либо {title, text} */
function column(v: string, id: string): Column {
  const [head, rest] = v.split("::").map((s) => s.trim());
  if (rest === undefined) {
    throw new Error(`сцена ${id}: колонка описывается как «Заголовок :: содержимое»`);
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

/** Данные слайда по сцене источника. */
export function slideOf(s: RawScene): Slide {
  const f = s.fields;
  const slide: Slide = { id: s.id, kind: s.kind };
  if (f.kicker) slide.kicker = f.kicker;
  if (f.title) slide.title = f.title;
  if (f.note) slide.note = f.note;
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
  if (s.kind === "number") {
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
  // Моменты остаются СТРОКАМИ: это якоря, и разрешает их слой композиции,
  // когда длины тактов уже известны из звука.
  if (f.at) slide.at = f.at.split(/\s+/);
  return slide;
}
