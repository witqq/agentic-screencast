// Подсветка кода для слайда с набором.
//
// Подсветка нужна не для красоты: зритель узнаёт код по форме — ключевые
// слова, строки, комментарии — раньше, чем прочтёт его, и одноцветный блок
// читается как текст. Разбор намеренно общий, без грамматики языка: ролику
// хватает узнаваемости, а точность парсера здесь ничего не даёт.
//
// Каждый знак кладётся отдельным узлом: набор открывает знаки по одному на
// их собственных местах, и строка не перекладывается, пока её набирают.
import { SourceError } from "../../source.js";
import { msg } from "../../msg.js";

const KEYWORDS = new Set(`
abstract and as async await break case catch class const continue def default defer del delete do elif else enum
export extends false final finally fn for from func function go if impl implements import in instanceof interface is
lambda let loop match mod module mut new nil none not null of or package pass private protected pub public raise
return select self static struct super switch this throw true try type typeof use val var void where while with yield
SELECT FROM WHERE JOIN GROUP BY ORDER INSERT UPDATE DELETE INTO VALUES LIMIT
`.split(/\s+/).filter(Boolean));

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Знаки токена отдельными узлами, внутри узла с классом токена. */
const wrap = (cls: string, text: string): string => {
  const chars = Array.from(text).map((ch) => `<i>${esc(ch)}</i>`).join("");
  return cls ? `<span class="tk-${cls}">${chars}</span>` : chars;
};

/** Одна строка кода → разметка с подсветкой; состояние многострочного комментария переходит дальше. */
function line(src: string, state: { block: boolean }): string {
  let out = "";
  let i = 0;
  const rest = (): string => src.slice(i);
  while (i < src.length) {
    if (state.block) {
      const end = src.indexOf("*/", i);
      const stop = end < 0 ? src.length : end + 2;
      out += wrap("com", src.slice(i, stop));
      i = stop;
      if (end >= 0) state.block = false;
      continue;
    }
    const r = rest();
    let m: RegExpExecArray | null;
    if (r.startsWith("/*")) { state.block = true; continue; }
    if ((m = /^(\/\/|#(?!\[)|--\s).*/.exec(r))) { out += wrap("com", m[0]); i += m[0].length; continue; }
    if ((m = /^("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|`(?:[^`\\]|\\.)*`?)/.exec(r))) { out += wrap("str", m[0]); i += m[0].length; continue; }
    if ((m = /^\d[\d_.]*[a-z]*/i.exec(r))) { out += wrap("num", m[0]); i += m[0].length; continue; }
    if ((m = /^[A-Za-z_$][\w$]*/.exec(r))) {
      const word = m[0];
      const after = src.slice(i + word.length);
      const cls = KEYWORDS.has(word) ? "kw" : /^\s*\(/.test(after) ? "fn" : /^[A-Z]/.test(word) ? "type" : "";
      out += wrap(cls, word);
      i += word.length;
      continue;
    }
    if ((m = /^\s+/.exec(r))) { out += wrap("", m[0]); i += m[0].length; continue; }
    out += wrap("pun", src[i]!);
    i += 1;
  }
  return out;
}

/**
 * Код → строки с номерами. `range` — «3-14» или «3»: какие строки файла
 * показать. Табуляция становится двумя пробелами: ширина табуляции у
 * моноширинного шрифта в кадре иначе зависит от машины.
 */
export function highlight(text: string, range?: string): Array<{ no: number; html: string }> {
  const all = text.replace(/\r\n?/g, "\n").replace(/\t/g, "  ").split("\n");
  let from = 1, to = all.length;
  if (range) {
    const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(range.trim());
    if (!m) throw new SourceError(msg("code.lines", { value: range }));
    from = Number(m[1]);
    to = m[2] ? Number(m[2]) : from;
    if (from < 1 || to > all.length || from > to) throw new SourceError(msg("code.linesOutside", { value: range, count: all.length }));
  }
  // Общий отступ снимается: показанный кусок из середины файла иначе стоит
  // лесенкой у правого края.
  const picked = all.slice(from - 1, to);
  while (picked.length && !picked[picked.length - 1]!.trim()) picked.pop();
  const indent = Math.min(...picked.filter((l) => l.trim()).map((l) => /^ */.exec(l)![0].length));
  const state = { block: false };
  return picked.map((l, k) => ({ no: from + k, html: line(l.slice(Number.isFinite(indent) ? indent : 0), state) }));
}

/** «5 7-9» → [5, 7, 8, 9] */
export function lineSet(v: string | undefined): number[] {
  if (!v) return [];
  return v.split(/[\s,]+/).filter(Boolean).flatMap((part) => {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!m) throw new SourceError(msg("code.highlight", { value: part }));
    const a = Number(m[1]), b = m[2] ? Number(m[2]) : a;
    return Array.from({ length: b - a + 1 }, (_, i) => a + i);
  });
}
