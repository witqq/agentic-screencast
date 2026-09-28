// Эмодзи картинками из поставляемого набора.
//
// Шрифтовое эмодзи зависит от машины: на macOS его рисует Apple Color Emoji,
// на машине сборки без цветного шрифта — пустой прямоугольник. Одна и та же
// сцена давала бы разные кадры, и ни одна проверка кадра этого бы не заметила
// на машине автора. Поэтому каждое эмодзи ролика заменяется картинкой из набора
// Noto Emoji (Apache 2.0), который поставляется с инструментом, либо из каталога,
// который назвал сам ролик.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Каталог поставляемого набора. Переменная окружения подменяет его — так
 * проверка убеждается, что цвет в кадре даёт именно набор, а не шрифт машины:
 * при пустом каталоге сборка обязана отказать.
 */
export function bundledEmojiDir(): string {
  return process.env.AGENTIC_SCREENCAST_EMOJI_SET
    ? resolve(process.env.AGENTIC_SCREENCAST_EMOJI_SET)
    : resolve(HERE, "..", "assets", "emoji");
}

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/**
 * Графема — эмодзи, если её рисуют как картинку: знак с эмодзи-представлением
 * по умолчанию (🚀) или текстовый знак с селектором FE0F (❤️). Стрелка ↩ или ©
 * без селектора — обычный текст, и шрифт рисует его одинаково везде.
 */
export const isEmoji = (grapheme: string): boolean =>
  /\p{Emoji_Presentation}/u.test(grapheme) || /\p{Extended_Pictographic}\uFE0F/u.test(grapheme);

/** Все эмодзи текста, без повторов, в порядке появления. */
export function emojiIn(text: string): string[] {
  const found: string[] = [];
  for (const { segment } of segmenter.segment(text)) {
    if (isEmoji(segment) && !found.includes(segment)) found.push(segment);
  }
  return found;
}

/** Имя файла Noto: кодовые точки в нижнем регистре через `_`, без FE0F. */
export function notoName(grapheme: string): string {
  const points = Array.from(grapheme).map((c) => c.codePointAt(0)!).filter((p) => p !== 0xfe0f);
  return `emoji_u${points.map((p) => p.toString(16)).join("_")}.svg`;
}

export class EmojiError extends Error {}

/** Файл эмодзи в каталогах ролика или в наборе; undefined — нет нигде. */
function findEmoji(name: string, dirs: string[]): string | undefined {
  for (const dir of [...dirs, bundledEmojiDir()]) {
    const file = resolve(dir, name);
    if (existsSync(file)) return file;
  }
  return undefined;
}

const dataUri = (file: string): string => `data:image/svg+xml;base64,${readFileSync(file).toString("base64")}`;

/**
 * Картинка эмодзи data-URI: сначала из каталогов ролика, затем из набора. Составного эмодзи
 * (оттенок кожи, склейка ZWJ) нет — берётся его основа. Нет и её: без `onMissing` — ошибка с
 * подсказкой; с `onMissing` — нейтральный кружок из набора и предупреждение, а не падение сборки
 * на середине. Шрифтом машины эмодзи не рисуется никогда: иначе кадр снова зависел бы от машины.
 */
export function emojiImage(grapheme: string, extraDirs: string[] = [], onMissing?: (grapheme: string, hint: string) => void): string {
  const name = notoName(grapheme);
  const found = findEmoji(name, extraDirs)
    ?? findEmoji(`emoji_u${grapheme.codePointAt(0)!.toString(16)}.svg`, extraDirs);
  if (found) return dataUri(found);
  const hint = `emoji ${grapheme} (${name}) is not in the bundled set; download it from `
    + `https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/2D/svg/${name} into a folder `
    + `and name it in the header: emoji: {"dir":"<folder>"}`;
  const stand = onMissing ? findEmoji("fallback.svg", []) : undefined;
  if (!stand) throw new EmojiError(hint);
  onMissing!(grapheme, hint);
  return dataUri(stand);
}

/** Карта «эмодзи → картинка» для всех эмодзи, встреченных в текстах. */
export function emojiMap(texts: string[], extraDirs: string[] = [], onMissing?: (grapheme: string, hint: string) => void): Record<string, string> {
  const map: Record<string, string> = {};
  for (const text of texts) for (const e of emojiIn(text)) map[e] ??= emojiImage(e, extraDirs, onMissing);
  return map;
}
