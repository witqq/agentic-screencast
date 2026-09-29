// Ресурсы слоя композиции, которые готовит сборка: эмодзи картинками и кадры
// стикеров.
//
// Слой живёт в браузере и относительных путей сценария не знает: над видео
// он рисуется на пустой странице, у слайда страница лежит в чужом каталоге.
// Поэтому всё, что примитив показывает, сборка кладёт в данные сцены готовым
// data-URI, а анимированную картинку — списком кадров: кадр выбирается по
// времени сцены, а не по собственному таймеру браузера, и рендер остаётся
// воспроизводимым с любого места.
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { createRequire } from "node:module";
import { emojiMap } from "./emoji.js";
import type { SceneOverlay } from "./overlay.js";
import { msg } from "./msg.js";

const require = createRequire(import.meta.url);
const FFMPEG = require("ffmpeg-static") as string;
const FFPROBE = require("@ffprobe-installer/ffprobe").path as string;

const MIME: Record<string, string> = {
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};
/** Частота, к которой приводятся кадры анимированного стикера, и их предел. */
const STICKER_FPS = 15;
const STICKER_MAX_FRAMES = 180;

const md5 = (b: Buffer | string): string => createHash("md5").update(b).digest("hex");

/** PNG с чанком `acTL` — анимированный (APNG). */
const isApng = (buf: Buffer): boolean => buf.subarray(0, 256).includes(Buffer.from("acTL"));

export class StageAssetError extends Error {}

/** Картинка стикера: data-URI либо кадры с частотой. */
export function stickerImage(file: string, cache: string): { src?: string; frames?: string[]; fps?: number; hash: string } {
  if (!existsSync(file)) throw new StageAssetError(msg("sticker.notFound", { file }));
  const buf = readFileSync(file);
  const hash = md5(buf);
  const ext = extname(file).toLowerCase();
  const animated = ext === ".gif" || ext === ".webm" || (ext === ".png" && isApng(buf));
  if (!animated) {
    const mime = MIME[ext];
    if (!mime) throw new StageAssetError(msg("sticker.type", { file }));
    return { src: `data:${mime};base64,${buf.toString("base64")}`, hash };
  }
  const dir = resolve(cache, `sticker-${hash}`);
  if (!existsSync(resolve(dir, "0001.png"))) {
    mkdirSync(dir, { recursive: true });
    // VP9 с прозрачностью читает только libvpx: встроенный декодер теряет альфу.
    let decoder: string[] = [];
    if (ext === ".webm") {
      const codec = execFileSync(FFPROBE, ["-v", "error", "-select_streams", "v:0", "-show_entries",
        "stream=codec_name", "-of", "default=nw=1:nk=1", file], { encoding: "utf8" }).trim();
      if (codec === "vp9") decoder = ["-c:v", "libvpx-vp9"];
      else if (codec === "vp8") decoder = ["-c:v", "libvpx"];
    }
    execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", ...decoder,
      ...(ext === ".png" ? ["-f", "apng"] : []), "-i", file,
      "-vf", `fps=${STICKER_FPS},format=rgba`, "-frames:v", String(STICKER_MAX_FRAMES),
      resolve(dir, "%04d.png")]);
  }
  const frames = readdirSync(dir).filter((f) => f.endsWith(".png")).sort()
    .map((f) => `data:image/png;base64,${readFileSync(resolve(dir, f)).toString("base64")}`);
  if (!frames.length) throw new StageAssetError(msg("sticker.noFrames", { file }));
  return { frames, fps: STICKER_FPS, hash };
}

/** Все тексты оверлея, в которых могут встретиться эмодзи. */
export function overlayTexts(o: SceneOverlay | undefined): string[] {
  if (!o) return [];
  return [
    ...(o.cards ?? []).flatMap((c) => [c.title, c.body ?? ""]),
    ...(o.titles ?? []).map((t) => t.text),
    ...(o.lower ?? []).flatMap((l) => [l.title, l.subtitle ?? ""]),
    ...(o.callouts ?? []).map((c) => c.text),
    ...(o.stickers ?? []).flatMap((s) => [s.emoji ?? "", s.text ?? ""]),
  ];
}

/** Эмодзи, о которых сборка уже предупредила. */
const warned = new Set<string>();

/**
 * Данные слоя для сцены: карта эмодзи и оверлей с подставленными картинками
 * стикеров. `hash` — отпечаток всех подставленных файлов: он входит в ключ
 * сегмента, иначе замена картинки под тем же именем не пересобрала бы сцену.
 */
export function stageAssets(opts: {
  overlay?: SceneOverlay; texts: string[]; pageFile?: string; srcDir: string; cache: string; emojiDirs: string[];
}): { emoji: Record<string, string>; stickers: StickerMedia[]; hash: string } {
  const texts = [...opts.texts, ...overlayTexts(opts.overlay)];
  // Текст порождённого слайда тоже может нести эмодзи: страница читается как есть.
  if (opts.pageFile && opts.pageFile.endsWith(".html") && existsSync(opts.pageFile)) {
    texts.push(readFileSync(opts.pageFile, "utf8").replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, " "));
  }
  // Эмодзи вне набора — кружок-заместитель и одно предупреждение на эмодзи за сборку.
  const emoji = emojiMap(texts, opts.emojiDirs, (g, hint) => {
    if (warned.has(g)) return;
    warned.add(g);
    process.stderr.write(msg("sticker.emojiFallback", { hint }) + "\n");
  });
  const hashes: string[] = [md5(JSON.stringify(Object.keys(emoji).map((k) => [k, md5(emoji[k]!)])))];
  // Картинки стикеров идут ОТДЕЛЬНЫМ списком по порядку стикеров, а не внутрь
  // оверлея: оверлей проверяется разбором, и чужие поля в нём — ошибка.
  const stickers = (opts.overlay?.stickers ?? []).map((s): StickerMedia => {
    if (!s.image) return {};
    const got = stickerImage(resolve(opts.srcDir, s.image), opts.cache);
    hashes.push(got.hash);
    return { ...(got.src ? { src: got.src } : {}), ...(got.frames ? { frames: got.frames, fps: got.fps } : {}) };
  });
  return { emoji, stickers, hash: md5(hashes.join("|")) };
}

/** Картинка стикера для слоя: одна или кадрами. */
export interface StickerMedia { src?: string; frames?: string[]; fps?: number }

/**
 * То же для проверок, которые монтируют слой без сборки: признака кадра,
 * порядка появления и листа кадров. Прежде они слоя картинками не снабжали,
 * и первый же стикер-эмодзи ронял проверку отказом «у стикера нет картинки»,
 * хотя сборка той же сцены проходила.
 */
export function assetsForCheck(s: { overlay?: SceneOverlay; caption?: string; beats?: unknown; page?: unknown; video?: boolean },
  srcDir: string, pitch: { emoji?: { dir: string }; dir?: string }): { emoji: Record<string, string>; __stickers: StickerMedia[] } {
  const beats = Array.isArray(s.beats) ? (s.beats as Array<{ text?: string }>).map((b) => b.text ?? "") : [];
  // Отказ — словами и с именем сцены, как у сборки, а не дампом стека.
  let got: ReturnType<typeof stageAssets>;
  try {
    got = stageAssets({ overlay: s.overlay, texts: [s.caption ?? "", ...beats],
    pageFile: s.video ? undefined : resolve(srcDir, String(s.page)), srcDir,
    cache: resolve(tmpdir(), "agentic-screencast-check"),
    emojiDirs: pitch.emoji ? [resolve(pitch.dir ?? srcDir, pitch.emoji.dir)] : [] });
  } catch (e) {
    console.error(msg("sticker.sceneError", { id: String((s as { id?: unknown }).id ?? "?"), why: (e as Error).message }));
    process.exit(2);
  }
  return { emoji: got.emoji, __stickers: got.stickers };
}
