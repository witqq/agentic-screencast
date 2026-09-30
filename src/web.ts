#!/usr/bin/env node
// Готовый ролик — в форматах для веба: AV1, VP9 и H.264 с постером и фрагментом `<video>`.
//
// Сборка пишет H.264 с высоким качеством: это формат монтажа и приёмки, его
// открывает всё. Для страницы он не лучший: AV1 при том же виде кадра весит
// заметно меньше, VP9 — между ними. Но AV1 играют не все браузеры (старые Safari),
// поэтому страница получает несколько источников по порядку предпочтения, и
// браузер берёт первый, который умеет; H.264 остаётся последним — запасным.
//
// Каждый выход проверяется, а не принимается на слово: его кодек, размер кадра и
// длительность сверяются с исходником, сходство кадров (SSIM) меряется против
// исходника того же размера, а у MP4 индекс стоит в начале файла, чтобы ролик
// начинал играть до конца загрузки.
//
// Запуск: web.js <film.mp4> [--out каталог] [--formats av1,vp9,h264] [--width 1280]
//   [--quality high|balanced|small] [--mute] [--poster 1.5]
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, openSync, readSync, closeSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, extname, join, resolve } from "node:path";

import { vttStamp } from "./film.js";
import { msg } from "./msg.js";

const require = createRequire(import.meta.url);
const FFMPEG = require("ffmpeg-static") as string;
const FFPROBE = require("@ffprobe-installer/ffprobe").path as string;

export type WebFormat = "av1" | "vp9" | "h264";
export const WEB_FORMATS: WebFormat[] = ["av1", "vp9", "h264"];
export type WebQuality = "high" | "balanced" | "small";
export const WEB_QUALITIES: WebQuality[] = ["high", "balanced", "small"];

/**
 * Постоянное качество по кодеку. Числа подобраны так, чтобы три кодека на одной
 * ступени давали сопоставимый вид кадра: у каждого своя шкала, и одинаковое
 * число значит разное.
 */
const CRF: Record<WebFormat, Record<WebQuality, number>> = {
  av1: { high: 28, balanced: 35, small: 42 },
  vp9: { high: 24, balanced: 30, small: 35 },
  h264: { high: 19, balanced: 23, small: 27 },
};

export interface WebOutput {
  format: WebFormat;
  file: string;
  bytes: number;
  codec: string;
  encoder: string;
  /** значение `type` у `<source>`: контейнер и кодеки */
  type: string;
  width: number;
  height: number;
  duration: number;
  /** сходство кадров с исходником того же размера, 0…1 */
  ssim: number;
  /** у MP4: индекс (`moov`) стоит до данных (`mdat`) */
  faststart?: boolean;
}

export interface WebReport {
  source: string;
  sourceBytes: number;
  outputs: WebOutput[];
  skipped: Array<{ format: WebFormat; reason: string }>;
  posters: string[];
  /** главы WebVTT рядом с выпуском, если у ролика есть файл глав */
  chapters?: string;
  /** миниатюры для перемотки: спрайт и дорожка WebVTT с областями `#xywh` */
  thumbnails?: { sprite: string; vtt: string; every: number; count: number };
  /** зацикленный GIF ролика или его куска: для README, задачи, чата, где видео не играет */
  gif?: { file: string; from: number; to: number; width: number; height: number; fps: number; bytes: number };
  html: string;
  /** манифест выпуска `<ролик>.web.json`: всё, что нужно странице, путями от каталога выпуска */
  manifest: string;
}

/**
 * Манифест выпуска для страницы. Страница (например `::video{from=…}` у agentic-report) берёт из
 * него источники в порядке предпочтения, постер, главы и миниатюры, не разбирая имена файлов.
 * Пути — относительно каталога выпуска, чтобы каталог можно было переносить целиком.
 */
export interface WebManifest {
  version: 1;
  film: string;
  width: number;
  height: number;
  duration: number;
  audio: boolean;
  lang?: string;
  poster: { jpg: string; webp: string };
  /** в порядке предпочтения: браузер берёт первый, который умеет играть; H.264 — последним */
  sources: Array<{ src: string; type: string; format: WebFormat; width: number; height: number; bytes: number }>;
  chapters?: string;
  thumbnails?: { sprite: string; vtt: string };
  gif?: string;
}

interface Probe { width: number; height: number; fps: number; duration: number; audio: boolean; codec: string; level?: number }

function probe(file: string): Probe {
  // ffprobe без декодера AV1 ругается на поток, но заголовки читает верно: его жалобы не нужны.
  const j = JSON.parse(execFileSync(FFPROBE, ["-v", "error", "-show_streams", "-show_format", "-of", "json", file],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })) as { streams: Array<Record<string, unknown>>; format: { duration?: string } };
  const v = j.streams.find((s) => s.codec_type === "video");
  if (!v) throw new Error(msg("web.noVideo", { file }));
  const [n, d] = String(v.avg_frame_rate ?? v.r_frame_rate ?? "30/1").split("/").map(Number);
  return { width: Number(v.width), height: Number(v.height), fps: d ? n! / d : n!, codec: String(v.codec_name),
    duration: Number(v.duration ?? j.format.duration), audio: j.streams.some((s) => s.codec_type === "audio"),
    ...(v.level !== undefined ? { level: Number(v.level) } : {}) };
}

/**
 * Порог тишины: громче −80 dBFS в пике — уже звук (самый тихий фон комнаты в записи лежит около
 * −60), а цифровая тишина сборки даёт −91 dBFS, нижний край 16-битного отсчёта.
 */
export const SILENCE_DB = -80;

/** Звуковая дорожка — цифровая тишина: её пик не выше порога. Дорожки нет — тоже тишина. */
export function silent(file: string): boolean {
  const r = spawnSync(FFMPEG, ["-nostdin", "-hide_banner", "-i", file, "-vn", "-af", "volumedetect", "-f", "null", "-"],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const m = /max_volume:\s*(-?[\d.]+|-inf) dB/u.exec(r.stderr ?? "");
  if (!m) return true;
  return m[1] === "-inf" || Number(m[1]) <= SILENCE_DB;
}

/** Кодировщики, которые есть у этой сборки ffmpeg. */
function encoders(): Set<string> {
  const out = execFileSync(FFMPEG, ["-hide_banner", "-encoders"], { encoding: "utf8" });
  return new Set([...out.matchAll(/^\s*[VAS][^\s]*\s+(\S+)/gmu)].map((m) => m[1]!));
}

/** Порядок атомов верхнего уровня MP4: нужен, чтобы убедиться в `faststart`. */
export function topAtoms(file: string): string[] {
  const fd = openSync(file, "r");
  const size = statSync(file).size;
  const names: string[] = [];
  const head = Buffer.alloc(16);
  let at = 0;
  try {
    while (at + 8 <= size && names.length < 64) {
      readSync(fd, head, 0, 16, at);
      let len = head.readUInt32BE(0);
      names.push(head.toString("latin1", 4, 8));
      if (len === 1) len = Number(head.readBigUInt64BE(8));
      else if (len === 0) break;
      if (len < 8) break;
      at += len;
    }
  } finally { closeSync(fd); }
  return names;
}

/** SSIM выхода против исходника, приведённого к тому же размеру; итог ffmpeg пишет в stderr. */
function ssim(output: string, source: string, w: number, h: number): number {
  const r = spawnSync(FFMPEG, ["-nostdin", "-hide_banner", "-i", output, "-i", source, "-lavfi",
    `[1:v]scale=${w}:${h}:flags=bicubic,setsar=1[ref];[0:v]setsar=1[out];[out][ref]ssim`, "-f", "null", "-"],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const m = /All:([0-9.]+)/u.exec(r.stderr ?? "");
  if (r.status !== 0 || !m) throw new Error(msg("web.ssim", { file: output, why: (r.stderr ?? "").slice(-300) }));
  return Number(m[1]);
}

/** Содержимое бокса `moov` MP4: описания дорожек, из которых читаются строки кодеков. */
function moovOf(file: string): Buffer {
  const fd = openSync(file, "r");
  const size = statSync(file).size;
  const head = Buffer.alloc(16);
  let at = 0;
  try {
    while (at + 8 <= size) {
      readSync(fd, head, 0, 16, at);
      let len = head.readUInt32BE(0);
      const kind = head.toString("latin1", 4, 8);
      if (len === 1) len = Number(head.readBigUInt64BE(8));
      else if (len === 0) len = size - at;
      if (len < 8) break;
      if (kind === "moov") { const box = Buffer.alloc(len); readSync(fd, box, 0, len, at); return box; }
      at += len;
    }
  } finally { closeSync(fd); }
  throw new Error(msg("web.noMoov", { file }));
}

/** Длина дескриптора MPEG-4: до четырёх байт по семь бит, старший бит — «дальше ещё». */
function descriptorLength(b: Buffer, at: number): { len: number; next: number } {
  let len = 0, i = at;
  for (let k = 0; k < 4; k++) { const v = b[i++]!; len = (len << 7) | (v & 0x7f); if (!(v & 0x80)) break; }
  return { len, next: i };
}

/**
 * Строки кодеков для `type` — из байтов самого файла, а не по догадке о настройках: H.264 из `avcC`
 * (профиль, совместимость, уровень), AV1 из `av1C` (профиль, уровень, tier, глубина цвета), звук
 * из `esds` (тип объекта и профиль AAC). Уровень, угаданный по высоте кадра, у малого ролика
 * завышал требования, и браузер мог отказаться его играть.
 */
export function mp4Codecs(file: string): string[] {
  const moov = moovOf(file);
  const out: string[] = [];
  const avcC = moov.indexOf("avcC", 0, "latin1");
  if (avcC >= 0) out.push(`avc1.${[1, 2, 3].map((k) => moov[avcC + 4 + k]!.toString(16).padStart(2, "0")).join("")}`);
  const av1C = moov.indexOf("av1C", 0, "latin1");
  if (av1C >= 0) {
    const b1 = moov[av1C + 5]!, b2 = moov[av1C + 6]!;
    const profile = b1 >> 5, level = b1 & 0x1f, tier = b2 & 0x80 ? "H" : "M";
    const depth = b2 & 0x40 ? (profile === 2 && b2 & 0x20 ? 12 : 10) : 8;
    out.push(`av01.${profile}.${String(level).padStart(2, "0")}${tier}.${String(depth).padStart(2, "0")}`);
  }
  const esds = moov.indexOf("esds", 0, "latin1");
  if (esds >= 0) {
    // esds: версия и флаги (4 байта), затем ES_Descriptor (0x03) → DecoderConfig (0x04) → DecoderSpecificInfo (0x05).
    let i = esds + 8;
    let object = 0, aot = 0;
    while (i < esds + 64 && i < moov.length) {
      const tag = moov[i]!;
      const { len, next } = descriptorLength(moov, i + 1);
      if (tag === 0x03) { i = next + 3; continue; }
      if (tag === 0x04) { object = moov[next]!; i = next + 13; continue; }
      if (tag === 0x05) { aot = moov[next]! >> 3; break; }
      i = next + len;
    }
    if (object) out.push(`mp4a.${object.toString(16)}${aot ? `.${aot}` : ""}`);
  }
  return out;
}

export function encodeForWeb(input: string, opts: {
  out?: string; formats?: WebFormat[]; width?: number; quality?: WebQuality; mute?: boolean; poster?: number;
  /** файл глав WebVTT; по умолчанию — `<ролик>.chapters.vtt` рядом с роликом, если он есть */
  chapters?: string;
  /** шаг миниатюр в секундах; 0 — без миниатюр */
  thumbs?: number;
  /** язык дорожки глав */
  lang?: string;
  /** GIF: кусок ролика (секунды), ширина и частота кадров */
  gif?: { from?: number; to?: number; width?: number; fps?: number };
} = {}): WebReport {
  const source = resolve(input);
  if (!existsSync(source)) throw new Error(msg("web.notFound", { file: input }));
  const src = probe(source);
  const quality = opts.quality ?? "high";
  const formats = opts.formats ?? WEB_FORMATS;
  const outDir = resolve(opts.out ?? join(resolve(source, ".."), "web"));
  mkdirSync(outDir, { recursive: true });
  const name = basename(source, extname(source));
  // Ширина не растёт: увеличенный кадр весит больше и не становится резче.
  const width = Math.min(src.width, opts.width ?? src.width) - (Math.min(src.width, opts.width ?? src.width) % 2);
  const height = Math.round((src.height * width) / src.width / 2) * 2;
  const scale = width === src.width ? [] : ["-vf", `scale=${width}:${height}:flags=lanczos`];
  // Звук — это слышимый звук, а не дорожка: ролик на беззвучном голосе без музыки несёт дорожку
  // тишины, и потребитель манифеста не мог верить флагу `audio`. Такой ролик выходит без дорожки.
  const audio = src.audio && !opts.mute && !silent(source);
  const have = encoders();
  const report: WebReport = { source, sourceBytes: statSync(source).size, outputs: [], skipped: [], posters: [], html: "", manifest: "" };

  for (const format of formats) {
    const crf = String(CRF[format][quality]);
    let file: string, encoder: string, args: string[], type: string;
    if (format === "av1") {
      encoder = have.has("libsvtav1") ? "libsvtav1" : have.has("libaom-av1") ? "libaom-av1" : "";
      if (!encoder) { report.skipped.push({ format, reason: "this ffmpeg has no AV1 encoder (libsvtav1 or libaom-av1)" }); continue; }
      file = join(outDir, `${name}.av1.mp4`);
      args = encoder === "libsvtav1"
        ? ["-c:v", "libsvtav1", "-crf", crf, "-preset", "6", "-g", String(Math.round(src.fps * 8))]
        : ["-c:v", "libaom-av1", "-crf", crf, "-b:v", "0", "-cpu-used", "5", "-row-mt", "1"];
      args.push("-pix_fmt", "yuv420p", ...(audio ? ["-c:a", "aac", "-b:a", "160k"] : ["-an"]), "-movflags", "+faststart");
      type = "";
    } else if (format === "vp9") {
      encoder = "libvpx-vp9";
      file = join(outDir, `${name}.vp9.webm`);
      args = ["-c:v", "libvpx-vp9", "-crf", crf, "-b:v", "0", "-deadline", "good", "-cpu-used", "2", "-row-mt", "1",
        "-pix_fmt", "yuv420p", ...(audio ? ["-c:a", "libopus", "-b:a", "128k"] : ["-an"])];
      type = `video/webm; codecs="vp9${audio ? ", opus" : ""}"`;
    } else {
      encoder = "libx264";
      file = join(outDir, `${name}.h264.mp4`);
      args = ["-c:v", "libx264", "-crf", crf, "-preset", "slow", "-profile:v", "high", "-pix_fmt", "yuv420p",
        ...(audio ? ["-c:a", "aac", "-b:a", "160k"] : ["-an"]), "-movflags", "+faststart"];
      type = "";
    }
    // SVT-AV1 печатает баннер в поток ошибок мимо -loglevel; SVT_LOG=1 оставляет только ошибки.
    execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-i", source, ...scale, ...args, file],
      { stdio: ["ignore", "ignore", "pipe"], env: { ...process.env, SVT_LOG: "1" } });
    const got = probe(file);
    if (file.endsWith(".mp4")) type = `video/mp4; codecs="${mp4Codecs(file).join(", ")}"`;
    const expected = { av1: "av1", vp9: "vp9", h264: "h264" }[format];
    if (got.codec !== expected) throw new Error(msg("web.codec", { file, codec: got.codec, expected }));
    if (got.width !== width || got.height !== height) throw new Error(msg("web.size", { file, size: `${got.width}×${got.height}`, expected: `${width}×${height}` }));
    // Длительность — с точностью до кадра: контейнеры округляют по-своему.
    if (Math.abs(got.duration - src.duration) > 1.5 / src.fps + 0.05) {
      throw new Error(msg("web.duration", { file, got: got.duration.toFixed(3), film: src.duration.toFixed(3) }));
    }
    const out: WebOutput = { format, file, bytes: statSync(file).size, codec: got.codec, encoder, type,
      width, height, duration: got.duration, ssim: ssim(file, source, width, height) };
    if (file.endsWith(".mp4")) {
      const atoms = topAtoms(file);
      out.faststart = atoms.indexOf("moov") >= 0 && atoms.indexOf("moov") < atoms.indexOf("mdat");
      if (!out.faststart) throw new Error(msg("web.faststart", { file, atoms: atoms.join(" ") }));
    }
    report.outputs.push(out);
  }
  if (!report.outputs.length) throw new Error(msg("web.none"));

  // Постер: кадр, который браузер показывает до воспроизведения, в JPEG и WebP.
  const at = Math.min(opts.poster ?? Math.min(1, src.duration / 10), Math.max(0, src.duration - 0.1));
  for (const ext of ["jpg", "webp"]) {
    const poster = join(outDir, `${name}.poster.${ext}`);
    execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-ss", at.toFixed(3), "-i", source, "-frames:v", "1",
      ...(scale.length ? scale : []), ...(ext === "jpg" ? ["-q:v", "3"] : ["-quality", "82"]), poster]);
    report.posters.push(poster);
  }

  // Язык ролика — у его глав и подписей: названный командой, иначе записанный сборкой в отчёт
  // `<ролик>.report.json`. Без него страница ставила бы дорожке глав свой язык.
  const builtReport = source.replace(/\.[^./]+$/u, "") + ".report.json";
  const lang = opts.lang ?? (existsSync(builtReport)
    ? (JSON.parse(readFileSync(builtReport, "utf8")) as { lang?: string }).lang : undefined);

  // Главы: файл, который сборка кладёт рядом с роликом, едет в выпуск дорожкой.
  const chaptersSrc = opts.chapters ?? source.replace(/\.[^./]+$/u, "") + ".chapters.vtt";
  if (existsSync(chaptersSrc)) {
    report.chapters = join(outDir, `${name}.chapters.vtt`);
    if (resolve(chaptersSrc) !== report.chapters) copyFileSync(chaptersSrc, report.chapters);
  } else if (opts.chapters) throw new Error(msg("web.chapters", { file: opts.chapters }));

  // Миниатюры для перемотки: один спрайт-сетка и дорожка, где каждая реплика указывает
  // свою клетку спрайта (`#xywh`). Плееры страниц показывают её над шкалой при наведении.
  const every = opts.thumbs ?? Math.max(1, Math.round(src.duration / 60));
  if (every > 0) {
    const count = Math.max(1, Math.ceil(src.duration / every));
    const tw = 160, th = Math.round((src.height * tw) / src.width / 2) * 2;
    const cols = Math.min(10, count), rows = Math.ceil(count / cols);
    const sprite = join(outDir, `${name}.thumbs.jpg`);
    // Клетка k — кадр в НАЧАЛЕ своей реплики (k·every): туда встаёт плеер, когда зритель отпускает
    // перемотку. `round=down` отдавал последний кадр промежутка, то есть момент следующей клетки.
    execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-i", source, "-vf",
      `fps=1/${every}:round=up,scale=${tw}:${th},tile=${cols}x${rows}`, "-frames:v", "1", "-q:v", "4", sprite]);
    const cues = [...Array(count).keys()].map((k) => {
      const from = k * every, to = Math.min(src.duration, (k + 1) * every);
      return `${vttStamp(from)} --> ${vttStamp(to)}\n${basename(sprite)}#xywh=${(k % cols) * tw},${Math.floor(k / cols) * th},${tw},${th}\n`;
    });
    const vtt = join(outDir, `${name}.thumbs.vtt`);
    writeFileSync(vtt, "WEBVTT\n\n" + cues.join("\n"));
    report.thumbnails = { sprite, vtt, every, count };
  }

  // Фрагмент страницы: источники по порядку предпочтения, запасной — последним.
  const order = WEB_FORMATS.map((f) => report.outputs.find((o) => o.format === f)).filter((o): o is WebOutput => Boolean(o));
  const rel = (p: string): string => basename(p);
  const html = `<video controls playsinline preload="none"${audio ? "" : " muted loop"} width="${width}" height="${height}" poster="${rel(report.posters[0]!)}">\n`
    + order.map((o) => `  <source src="${rel(o.file)}" type='${o.type}'>\n`).join("")
    + (report.chapters ? `  <track kind="chapters" src="${rel(report.chapters)}" srclang="${lang ?? "en"}" label="Chapters" default>\n` : "")
    + (report.thumbnails ? `  <track kind="metadata" src="${rel(report.thumbnails.vtt)}" label="thumbnails">\n` : "")
    + "</video>\n";
  // GIF — для мест, где видео не играет (README, задача, чат): своя палитра на кусок, чтобы цвета не
  // полосили, и бесконечный повтор. Весит он в разы больше видео, поэтому по умолчанию — кусок
  // до шести секунд, 640 точек в ширину и 12 кадров в секунду.
  if (opts.gif) {
    const from = Math.max(0, opts.gif.from ?? 0), to = Math.min(src.duration, opts.gif.to ?? Math.min(src.duration, from + 6));
    if (!(to > from)) throw new Error(msg("web.gifOrder"));
    const gw = Math.min(src.width, opts.gif.width ?? 640) - (Math.min(src.width, opts.gif.width ?? 640) % 2);
    const gh = Math.round((src.height * gw) / src.width / 2) * 2, fps = opts.gif.fps ?? 12;
    const file = join(outDir, `${name}.gif`);
    execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-ss", String(from), "-t", String(to - from), "-i", source, "-vf",
      `fps=${fps},scale=${gw}:${gh}:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a`,
      "-loop", "0", file]);
    report.gif = { file, from, to, width: gw, height: gh, fps, bytes: statSync(file).size };
  }
  report.html = join(outDir, `${name}.html`);
  writeFileSync(report.html, html);
  const manifest: WebManifest = { version: 1, film: name, width, height, duration: Number(src.duration.toFixed(3)), audio,
    ...(lang ? { lang } : {}),
    poster: { jpg: rel(report.posters[0]!), webp: rel(report.posters[1]!) },
    sources: order.map((o) => ({ src: rel(o.file), type: o.type, format: o.format, width: o.width, height: o.height, bytes: o.bytes })),
    ...(report.chapters ? { chapters: rel(report.chapters) } : {}),
    ...(report.thumbnails ? { thumbnails: { sprite: rel(report.thumbnails.sprite), vtt: rel(report.thumbnails.vtt) } } : {}),
    ...(report.gif ? { gif: rel(report.gif.file) } : {}) };
  report.manifest = join(outDir, `${name}.web.json`);
  writeFileSync(report.manifest, JSON.stringify(manifest, null, 1) + "\n");
  return report;
}

if (process.argv[1] && resolve(process.argv[1]).endsWith("web.js")) {
  const args = process.argv.slice(2);
  const arg = (k: string): string | undefined => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
  const input = args[0];
  const usage = "agentic-screencast web <film.mp4> [--out web] [--formats av1,vp9,h264] [--width 1280] "
    + "[--quality high|balanced|small] [--mute] [--poster 1.5] [--chapters film.chapters.vtt] [--thumbs 2] [--lang ru] [--gif 2-8] [--gif-width 640]";
  if (!input || input.startsWith("--")) { console.error(usage); process.exit(2); }
  try {
    const formats = arg("formats")?.split(",").map((f) => f.trim()) as WebFormat[] | undefined;
    for (const f of formats ?? []) if (!WEB_FORMATS.includes(f)) throw new Error(msg("web.formats", { format: f, available: WEB_FORMATS.join(", ") }));
    const quality = arg("quality") as WebQuality | undefined;
    if (quality && !WEB_QUALITIES.includes(quality)) throw new Error(msg("web.quality", { available: WEB_QUALITIES.join(" | ") }));
    const width = arg("width") ? Number(arg("width")) : undefined;
    if (width !== undefined && !(width >= 16)) throw new Error(msg("web.width"));
    const poster = arg("poster") ? Number.parseFloat(arg("poster")!) : undefined;
    const thumbs = arg("thumbs") !== undefined ? Number(arg("thumbs")) : undefined;
    if (thumbs !== undefined && !(thumbs >= 0)) throw new Error(msg("web.thumbs"));
    const gifArg = args.includes("--gif") ? (arg("gif") && !arg("gif")!.startsWith("--") ? arg("gif")! : "") : undefined;
    let gif: { from?: number; to?: number; width?: number } | undefined;
    if (gifArg !== undefined) {
      const m = /^(?:([\d.]+)-([\d.]+))?$/.exec(gifArg);
      if (!m) throw new Error(msg("web.gif"));
      gif = { ...(m[1] ? { from: Number(m[1]), to: Number(m[2]) } : {}), ...(arg("gif-width") ? { width: Number(arg("gif-width")) } : {}) };
    }
    const report = encodeForWeb(input, { ...(arg("out") ? { out: arg("out") } : {}), ...(formats ? { formats } : {}), ...(gif ? { gif } : {}),
      ...(arg("chapters") ? { chapters: arg("chapters") } : {}), ...(thumbs !== undefined ? { thumbs } : {}),
      // `--lang` у команды уходит окружением (как у всех команд); язык дорожки глав — он же.
      ...(arg("lang") ?? process.env.AGENTIC_SCREENCAST_FILM_LANG ? { lang: arg("lang") ?? process.env.AGENTIC_SCREENCAST_FILM_LANG } : {}),
      ...(width ? { width } : {}), ...(quality ? { quality } : {}), mute: args.includes("--mute"),
      ...(poster !== undefined ? { poster } : {}) });
    console.log(JSON.stringify(report, null, 1));
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }
}
