// Порождение из источника: слайды рядом со сценарием и данные сборки.
//
// Вынесено отдельно, потому что этим пользуются двое — сборка роликов
// и сервер интерфейса записи. Второй способ породить слайды разошёлся бы
// с первым молча: пути подложек разрешаются относительно файла сцен,
// и достаточно разойтись в одном каталоге, чтобы сцены собрались
// из пустого места.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseSource, specOf, toPitch, SLIDES_DIR, type Source } from "./source.js";
import { providerFor } from "./provider/index.js";
import { msg } from "./msg.js";

export interface Generated {
  src: Source;
  /** файл данных сборки рядом с источником */
  pitchFile: string;
  /** каталог порождённых слайдов рядом с источником */
  slidesDir: string;
  /** порождённые страницы: сцена → файл. Готовые файлы сюда не входят. */
  pages: Record<string, string>;
}

/**
 * Источник → слайды и данные сборки. Ничего рукописного между ними.
 *
 * Порождённое кладётся РЯДОМ С ИСТОЧНИКОМ, а не во временный каталог:
 * пути подложек разрешаются относительно файла сцен, и из чужого места
 * слайды не нашлись бы. Имена начинаются с точки и помечены как
 * порождаемые — их не правят руками.
 */
export function generate(src: Source): Generated {
  const dir = src.dir;
  const slidesDir = resolve(dir, SLIDES_DIR);
  const declared = src.providers ?? {};
  const pages: Record<string, string> = {};
  for (const scene of src.scenes) {
    const spec = specOf(scene, declared);
    // Готовый файл порождать нечего: сцена уже назвала его полем.
    if (spec.fileField) continue;
    const provider = providerFor(scene.provider, declared);
    if (!provider.page) {
      throw new Error(msg("provider.cannotDraw", { name: scene.provider }));
    }
    pages[scene.id] = provider.page(scene, slidesDir,
      { frame: src.frame, encode: src.encode, theme: src.theme,
        pronounce: src.pronounce, lang: src.lang });
  }
  const pitchFile = resolve(dir, ".generated-pitch.json");
  writeFileSync(pitchFile, JSON.stringify(toPitch(src)));
  return { src, pitchFile, slidesDir, pages };
}

/** То же от пути к сценарию. */
export const generateFrom = (sourcePath: string): Generated => generate(parseSource(sourcePath));
