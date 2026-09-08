// Текст для озвучки ≠ текст на экране.
//
// Одни движки читают латиницу сами, другие молча её пропускают; одни
// аббревиатуры надо произносить по буквам, а адреса сайтов не надо
// произносить вовсе. Всё это — свойства ЯЗЫКА и ПРЕДМЕТНОЙ ОБЛАСТИ
// ролика, а не инструмента, и потому приходят данными.
//
// Здесь остаётся только истолкователь правил: он ничего не знает
// ни про один язык. Поставляемые наборы лежат в `rules/`, свой набор
// ролик объявляет полем `pronounce` — именем поставляемого, путём
// к своему файлу или прямо объектом.
//
// Порядок применения фиксирован и важен:
//   1. `say`     — словарь замен, от длинных ключей к коротким, чтобы
//                  «JSON Schema» не распалось на «JSON»;
//   2. `translit`— побуквенная замена остатка чужого письма;
//   3. `drop`    — то, что из произносимого выбрасывается целиком;
//   4. `cleanup` — уборка после замен: сдвоенные запятые и подобное.
//
// Смена правил меняет строку синтеза, а с ней и ключ кэша: это верно
// и намеренно — сменились правила чтения, значит запись обязана
// пересобраться.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { msg } from "./msg.js";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Набор правил чтения: данные, а не код. */
export interface SpeechRules {
  /** замены целых слов и выражений: «MCP» → «эм-си-пи» */
  say?: Record<string, string>;
  /** побуквенная замена остатка: пары «что» → «чем», по длине ключа */
  translit?: Array<[string, string]>;
  /** какие последовательности выбрасываются из произносимого */
  drop?: string[];
  /** уборка после замен: пары «образец» → «замена» */
  cleanup?: Array<[string, string]>;
  /** к какому письму применять побуквенную замену; умолчание — латиница */
  script?: string;
  /**
   * Порядок шагов. Он не мелочь оформления: словарь, применённый раньше
   * выбрасывания адресов, успевает переписать кусок внутри домена, и адрес
   * перестаёт быть адресом — вместо того чтобы исчезнуть, он произносится
   * наполовину переписанным. Умолчание: say, translit, drop, cleanup.
   */
  order?: Array<"say" | "translit" | "drop" | "cleanup">;
  /**
   * Различать ли регистр в словаре. Различать нужно там, где то же слово
   * строчными встречается внутри адреса или имени файла: «MCP» надо
   * произнести по буквам, а «mcp» в домене — не трогать, его выбросят.
   */
  caseSensitive?: boolean;
}

// Дефис здесь НЕ экранируется: вне символьного класса он ничего не значит,
// а в режиме Unicode `\-` — недопустимая последовательность, и выражение
// с ним не собирается вовсе. Проверено исполнением на ключе «JSON-RPC».
const escapeRe = (s: string): string => s.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&");

/** Побуквенная замена одного слова по таблице пар. */
export function translitWord(w: string, pairs: Array<[string, string]>): string {
  const lower = w.toLowerCase();
  let out = "", i = 0;
  while (i < lower.length) {
    const pair = pairs.find(([from]) => lower.startsWith(from, i));
    if (pair) {
      out += pair[1];
      i += pair[0].length;
    } else {
      out += lower[i];
      i += 1;
    }
  }
  return out;
}

/** Применить набор правил к тексту. */
export function speak(rules: SpeechRules, text: string): string {
  let s = text;
  const step = {
    say: (): void => {
      const flags = rules.caseSensitive ? "gu" : "giu";
      // Границы слова — по БУКВАМ ЛЮБОГО ПИСЬМА, а не через `\b`:
      // тот считает словесными только латиницу с цифрами, и словарь
      // из русских слов молча не применялся бы вовсе. Проверено
      // исполнением: «включите СВЧ» оставалось непереписанным.
      //
      // От длинных ключей к коротким: иначе «JSON Schema» распадётся
      // на «JSON» и остаток, прочитанный по буквам.
      for (const key of Object.keys(rules.say ?? {}).sort((a, b) => b.length - a.length)) {
        s = s.replace(
          new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(key)}(?![\\p{L}\\p{N}])`, flags),
          rules.say![key]!);
      }
    },
    translit: (): void => {
      if (!rules.translit?.length) return;
      const script = new RegExp(rules.script ?? "[A-Za-z][A-Za-z-]*", "g");
      s = s.replace(script, (w) => translitWord(w, rules.translit!));
    },
    drop: (): void => {
      for (const pattern of rules.drop ?? []) s = s.replace(new RegExp(pattern, "gi"), "");
    },
    cleanup: (): void => {
      for (const [pattern, to] of rules.cleanup ?? []) {
        s = s.replace(new RegExp(pattern, "g"), to);
      }
    },
  };
  for (const name of rules.order ?? ["say", "translit", "drop", "cleanup"]) step[name]();
  return s.replace(/\s{2,}/g, " ").trim();
}

/**
 * Разрешение набора правил по тому, как его назвали данные ролика:
 * имя поставляемого набора, путь к файлу или сам объект правил.
 * Ничего не названо — текст идёт как есть, и это верное умолчание:
 * инструмент не знает языка ролика и не вправе его переписывать.
 */
export function rulesOf(named: unknown, dir = "."): SpeechRules {
  if (!named) return {};
  if (typeof named === "object") return named as SpeechRules;
  const name = String(named);
  const shipped = resolve(HERE, "rules", `${name}.json`);
  const own = resolve(dir, name);
  const file = existsSync(shipped) ? shipped : own;
  if (!existsSync(file)) {
    throw new Error(msg("speech.noRules", { name, path: own }));
  }
  return JSON.parse(readFileSync(file, "utf8")) as SpeechRules;
}

/** Подготовка текста для озвучки по названным правилам. */
export function speechFor(named: unknown, text: string, dir = "."): string {
  return speak(rulesOf(named, dir), text);
}
