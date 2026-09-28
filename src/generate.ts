// Порождение из источника: слайды рядом со сценарием и данные сборки.
//
// Вынесено отдельно, потому что этим пользуются двое — сборка роликов
// и сервер интерфейса записи. Второй способ породить слайды разошёлся бы
// с первым молча: пути подложек разрешаются относительно файла сцен,
// и достаточно разойтись в одном каталоге, чтобы сцены собрались
// из пустого места.
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { MissingMaterialError, parseSource, sceneTheme, specOf, toPitch, SLIDES_DIR,
  type Source, type UnavailableMaterial } from "./source.js";
import { providerFor } from "./provider/index.js";
import { msg } from "./msg.js";
import { layerSafe } from "./part-label.js";

export interface Generated {
  src: Source;
  /** файл данных сборки рядом с источником */
  pitchFile: string;
  /** каталог порождённых слайдов рядом с источником */
  slidesDir: string;
  /** порождённые страницы: сцена → файл. Готовые файлы сюда не входят. */
  pages: Record<string, string>;
  /** Scenes whose visual material is not ready yet, only when preparing the recording UI. */
  skipped: UnavailableMaterial[];
}

/**
 * Источник → слайды и данные сборки. Ничего рукописного между ними.
 *
 * Порождённое кладётся РЯДОМ С ИСТОЧНИКОМ, а не во временный каталог:
 * пути подложек разрешаются относительно файла сцен, и из чужого места
 * слайды не нашлись бы. Имена начинаются с точки и помечены как
 * порождаемые — их не правят руками.
 */
export function generate(src: Source, opts: { recording?: boolean; onlyScene?: string; exceptScene?: string } = {}): Generated {
  const dir = src.dir;
  // Каждый язык порождает своё: сборки двух языков рядом не затирают слайды друг друга.
  const tag = [src.variant, src.reframe ? src.format : undefined].filter(Boolean).join("-");
  const generated = tag ? `${SLIDES_DIR}-${tag}` : SLIDES_DIR;
  const slidesDir = resolve(dir, generated);
  const declared = src.providers ?? {};
  const pages: Record<string, string> = {};
  const skipped: UnavailableMaterial[] = [];
  const ready: Source["scenes"] = [];
  // Поля слайда — от зоны слоя: у края зоны может стоять название части, и низ слайда уходит над ним.
  const zone = layerSafe({ safe: src.safe, progress: src.progress, scenes: src.scenes.map((s) => ({
    chapter: s.fields.part ?? specOf(s, declared).chapterFrom?.map((k) => s.fields[k]).find(Boolean) })) },
  { width: Number(src.frame?.width ?? 1920), height: Number(src.frame?.height ?? 1080) });
  for (const scene of src.scenes) {
    if (opts.onlyScene && scene.id !== opts.onlyScene || opts.exceptScene && scene.id === opts.exceptScene) continue;
    if (opts.recording && scene.recordUnavailable) {
      skipped.push({ id: scene.id, ...scene.recordUnavailable });
      continue;
    }
    const spec = specOf(scene, declared);
    // Готовый файл порождать нечего: сцена уже назвала его полем.
    if (spec.fileField) {
      const file = scene.fields[spec.fileField]!;
      if (opts.recording && !existsSync(resolve(dir, file))) {
        skipped.push({ id: scene.id, kind: spec.video ? "video" : "page", file });
        continue;
      }
      ready.push(scene);
      continue;
    }
    const provider = providerFor(scene.provider, declared);
    if (!provider.page) {
      throw new Error(msg("provider.cannotDraw", { name: scene.provider }));
    }
    try {
      pages[scene.id] = provider.page(scene, slidesDir,
        { frame: src.frame, encode: src.encode,
          theme: scene.fields.theme ? sceneTheme(scene.fields.theme, src.theme) : src.theme,
          pronounce: src.pronounce, lang: src.lang, dir: src.dir, ...(zone ? { safe: zone } : {}),
          ...(src.captions?.everywhere ? { captionsOnSlides: true } : {}),
          ...(src.captions?.size ? { captionsSize: src.captions.size } : {}),
          ...((scene.fields.captions ?? src.captions?.position) ? { captionsAt: (scene.fields.captions?.trim() ?? src.captions!.position) as "bottom" | "top" | "middle" | "auto" } : {}),
          ...(src.progress ? { progressAt: src.progress.position ?? "bottom" } : {}) });
      ready.push(scene);
    } catch (error) {
      if (!opts.recording || !(error instanceof MissingMaterialError)) throw error;
      skipped.push({ id: scene.id, kind: error.kind, file: error.file });
    }
  }
  // A preview must not resolve marks or other material of an omitted scene in toPitch.
  // Keep the full source in the result so frames can still name every valid scene ID.
  const prepared = opts.recording || opts.onlyScene || opts.exceptScene ? { ...src, scenes: ready } : src;
  const pitchFile = resolve(dir, `.generated-pitch${tag ? `-${tag}` : ""}.json`);
  const pitch = toPitch(prepared, generated);
  writeFileSync(pitchFile, JSON.stringify(pitch));
  return { src: opts.recording ? prepared : src, pitchFile, slidesDir, pages, skipped };
}

/** То же от пути к сценарию. */
export const generateFrom = (sourcePath: string, opts: { onlyScene?: string; exceptScene?: string } = {}): Generated =>
  generate(parseSource(sourcePath, opts), opts);
