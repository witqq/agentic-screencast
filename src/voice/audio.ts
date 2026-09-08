// Работа со звуком, общая для всех поставляемых движков: где лежат
// ffmpeg и ffprobe, как их звать и как измерить длительность.
//
// Вынесено отдельно, потому что этим пользуются и синтезирующие движки,
// и движок записанного голоса. Второй способ измерить длительность
// разошёлся бы с первым молча, а импорт из соседнего движка ради одной
// функции завёл бы цикл между модулями.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const FFMPEG: string = require("ffmpeg-static");
export const FFPROBE: string = require("@ffprobe-installer/ffprobe").path;

/**
 * Запуск ffmpeg: молча, без вопросов, с перезаписью.
 *
 * Поток ошибок ЗАХВАТЫВАЕТСЯ, а не отдаётся наружу. По умолчанию узел
 * отдаёт его в поток ошибок родителя, и тогда при неудаче читатель видит
 * десятки строк разбора потока раньше и вместо причины. Захваченный
 * поток достаётся вызывающему через исключение, и тот говорит словами.
 */
export const ff = (args: string[]): void => {
  execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", ...args],
    { stdio: ["ignore", "pipe", "pipe"] });
};

/**
 * Длительность готового файла в секундах, с точностью до тысячных.
 * Тем же средством, что и у сборки: из этого числа выводится
 * длительность сцены.
 */
export function durationOf(file: string): number {
  const out = execFileSync(FFPROBE, ["-v", "error", "-show_entries", "format=duration",
    "-of", "default=nw=1:nk=1", file],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  return Math.round(Number(out) * 1000) / 1000;
}
