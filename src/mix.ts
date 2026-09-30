// Звук ролика: речь, музыкальная подложка и звуки-акценты.
//
// Инструмент звук не порождает и не поставляет: музыку и акценты называет
// сценарий файлами, а здесь они только сводятся с речью. Сведение делается по
// отсчётам, а не цепочкой фильтров: так огибающая подложки вычисляется точно,
// одинаково при каждой сборке и проверяется измерением.
//
// Правила сведения — из практики монтажа под голос:
//  - подложка в паузах звучит на заданном уровне, а под каждым тактом речи
//    опускается до уровня «речь минус запас». Запас считается от ИЗМЕРЕННОЙ
//    громкости такта, поэтому тихая запись человека не тонет под музыкой,
//    которой хватило бы для громкого синтеза;
//  - границы тактов берутся из измеренных длин звука: смена голоса или темпа
//    сама сдвигает окна приглушения;
//  - фронты плавные: подложка уходит перед словом и возвращается после него;
//  - акцент, попавший на слова, звучит тише речи на заданный запас — только та его часть, что
//    лежит под словами: удар в паузе звучит в полную силу, а его хвост уходит под голос;
//  - итог нормируется по громкости (LUFS) с потолком пика.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { msg } from "./msg.js";

const require = createRequire(import.meta.url);
const FFMPEG = require("ffmpeg-static") as string;

export const RATE = 48000;
/** Уровень речи, принятый для тишины черновика: так звучит обычный голос. */
export const NOMINAL_SPEECH_DB = -20;

/** Музыкальная подложка ролика, как её пишут в шапке сценария. */
export interface Music {
  file: string;
  /** уровень подложки в паузах, dBFS по среднеквадратичному */
  level?: number;
  /** на сколько подложка тише речи под тактом, дБ */
  duck?: number;
  fadeIn?: number;
  fadeOut?: number;
  /** с какой секунды файла начинать */
  from?: number;
  /** темп и сдвиг первой доли — для ритма склеек и якорей `m8` */
  bpm?: number;
  offset?: number;
}

/**
 * Смена музыки во времени ролика: новая подложка с момента `at` (с файлом) или остановка
 * (`stop`). Шапка задаёт подложку с нуля, сцены — смены после неё.
 */
export type MusicCue = { at: number } & ({ stop: true; fadeOut?: number } | (Music & { stop?: undefined }));

/** Отрезок, на котором звучит одна подложка: откуда и докуда во времени ролика, как входит и уходит. */
export interface MusicSpan { music: Music; start: number; end: number; fadeIn: number; fadeOut: number }

/**
 * Отрезки подложек по сменам. Новая подложка входит за свой `fadeIn` (у шапки 1 с, у сцены 0,5 с),
 * и прежняя уходит за то же время — наплыв; остановка обрывает звучащую за `fadeOut` (0,05 с —
 * почти мгновенно, чтобы без щелчка); последняя уходит к концу ролика за свой `fadeOut` (2 с).
 */
export function musicSpans(header: Music | undefined, cues: MusicCue[], total: number): MusicSpan[] {
  const all: MusicCue[] = [...(header ? [{ ...header, at: 0 }] : []), ...[...cues].sort((a, b) => a.at - b.at)];
  const spans: MusicSpan[] = [];
  let open: MusicSpan | null = null;
  const close = (at: number, fade: number): void => {
    if (!open) return;
    open.end = Math.min(total, Math.max(open.start, at)); open.fadeOut = Math.min(fade, open.end - open.start);
    if (open.end > open.start) spans.push(open);
    open = null;
  };
  all.forEach((c, i) => {
    const at = Math.max(0, Math.min(total, c.at));
    if (c.stop) { close(at, c.fadeOut ?? 0.05); return; }
    const fadeIn = c.fadeIn ?? (i === 0 && header ? 1 : 0.5);
    close(at + fadeIn, fadeIn);
    const music: Music = { file: c.file, ...(c.level !== undefined ? { level: c.level } : {}), ...(c.duck !== undefined ? { duck: c.duck } : {}),
      ...(c.from !== undefined ? { from: c.from } : {}), ...(c.bpm !== undefined ? { bpm: c.bpm, offset: c.offset ?? 0 } : {}) };
    open = { music, start: at, end: total, fadeIn, fadeOut: c.fadeOut ?? 2 };
  });
  if (open) close(total, (open as MusicSpan).fadeOut);
  return spans;
}

/** Звук-акцент: файл (или кусок файла) в момент ролика и то, как он уступает речи. */
export interface Sfx {
  file: string; at: number; gain?: number;
  /** кусок файла: с какой секунды и какой длины; `fadeOut` — затухание в конце куска */
  from?: number; length?: number; fadeOut?: number;
  /** на сколько дБ акцент тише слов под ними (12); 0 — не уступает вовсе */
  duck?: number;
  /** уступать речи всем акцентом, а не только той частью, что под словами */
  duckAll?: boolean;
}

/** Затухание конца куска: плавно к нулю за `secs`. */
function fadeTail(src: Float32Array, secs: number): void {
  const n = Math.min(src.length / 2, Math.round(secs * RATE));
  for (let i = 0; i < n; i++) {
    const k = i / n, j = src.length - 2 * (i + 1);
    src[j] *= k; src[j + 1] *= k;
  }
}

/** Такт речи во времени ролика и его запись. */
export interface BeatWindow { start: number; end: number; wav: string }

/** Декодировать звук в стерео 48 кГц float32. */
export function pcm(file: string, from = 0): Float32Array {
  const buf = execFileSync(FFMPEG, ["-nostdin", "-loglevel", "error", ...(from ? ["-ss", String(from)] : []),
    "-i", file, "-f", "f32le", "-ac", "2", "-ar", String(RATE), "-"], { maxBuffer: 2 ** 31 - 1 });
  return new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4));
}

const db = (v: number): number => (v > 0 ? 20 * Math.log10(v) : -Infinity);
const lin = (d: number): number => 10 ** (d / 20);

/**
 * Среднеквадратичный уровень звучащей части, dBFS. Отсчёты тише порога не
 * считаются: паузы внутри реплики занизили бы её уровень.
 */
export function levelDb(s: Float32Array, gateDb = -50): number {
  const gate = lin(gateDb);
  let sum = 0, n = 0;
  for (let i = 0; i < s.length; i++) { const v = s[i]!; if (Math.abs(v) >= gate) { sum += v * v; n++; } }
  return n ? db(Math.sqrt(sum / n)) : -Infinity;
}

/** Плавный шаг от 0 до 1 на [a, b]. */
const smooth = (t: number, a: number, b: number): number => {
  if (t <= a) return 0;
  if (t >= b) return 1;
  const x = (t - a) / (b - a);
  return x * x * (3 - 2 * x);
};

/**
 * Огибающая подложки в дБ относительно уровня пауз. Под каждым тактом она
 * опускается на столько, чтобы подложка была на `duck` дБ тише ИМЕННО ЭТОГО
 * такта; к такту и от него — плавные фронты.
 */
export function duckingEnvelope(windows: Array<{ start: number; end: number; speechDb: number }>,
  pauseDb: number, duck: number, attack = 0.18, release = 0.45): (t: number) => number {
  const dips = windows.map((w) => ({ ...w, dip: Math.min(0, w.speechDb - duck - pauseDb) }));
  return (t: number): number => {
    let g = 0;
    for (const w of dips) {
      if (t < w.start - attack || t > w.end + release) continue;
      const k = t < w.start ? smooth(t, w.start - attack, w.start) : t > w.end ? 1 - smooth(t, w.end, w.end + release) : 1;
      g = Math.min(g, w.dip * k);
    }
    return g;
  };
}

/** Уровень речи каждого такта; тишина черновика считается обычным голосом. */
export function beatLevels(beats: BeatWindow[]): Array<{ start: number; end: number; speechDb: number }> {
  const cache = new Map<string, number>();
  return beats.map((b) => {
    if (!cache.has(b.wav)) {
      const l = levelDb(pcm(b.wav));
      cache.set(b.wav, Number.isFinite(l) ? l : NOMINAL_SPEECH_DB);
    }
    return { start: b.start, end: b.end, speechDb: cache.get(b.wav)! };
  });
}

/** Шаг таблицы переменного усиления: 5 мс — много мельче самого короткого фронта. */
const BLOCK = 240;

/** Положить `src` в `dst` с позиции `at` секунд, с усилением `gain`. */
function add(dst: Float32Array, src: Float32Array, at: number, gain: number | ((t: number) => number)): void {
  const offset = Math.round(at * RATE) * 2;
  // Переменное усиление считается по блокам и интерполируется: огибающая
  // гладкая, а вычислять её на каждом отсчёте — десятки секунд на ролик.
  let g: (frame: number) => number;
  if (typeof gain === "number") g = () => gain;
  else {
    const frames = Math.ceil(dst.length / 2 / BLOCK) + 2;
    const table = new Float32Array(frames);
    for (let b = 0; b < frames; b++) table[b] = gain((b * BLOCK) / RATE);
    g = (frame: number): number => {
      const x = frame / BLOCK, i = Math.floor(x), f = x - i;
      return table[i]! + (table[Math.min(i + 1, frames - 1)]! - table[i]!) * f;
    };
  }
  for (let i = 0; i < src.length && offset + i < dst.length; i += 2) {
    if (offset + i < 0) continue;
    const k = g((offset + i) / 2);
    dst[offset + i] += src[i]! * k;
    dst[offset + i + 1] += src[i + 1]! * k;
  }
}

export interface MixReport {
  music?: { file: string; pauseDb: number; duck: number; windows: number;
    /** где во времени ролика звучала каждая подложка — если их больше одной или музыку останавливали */
    spans?: Array<{ file: string; start: number; end: number }> };
  sfx: Array<{ file: string; at: number; levelDb: number; underSpeech: boolean;
    /** как акцент уступил словам: только перекрытой частью, целиком или никак */
    ducked?: "overlap" | "whole" | "off" }>;
  /** цель, громкость смеси до нормировки (`input`) и готового звука (`measured`), LUFS */
  loudness?: { target: number; measured: number; input: number };
}

/**
 * Потолок истинного пика при нормировке, dBTP. Цель площадок — −1 dBTP в готовом файле, а
 * кодирование в AAC добавляет межвыборочные пики на несколько десятых: при потолке −1 готовый
 * ролик выходил на −0,8. Запас в полдецибела держит готовый файл под −1.
 */
const PEAK = -1.5;

/**
 * Свести звук ролика в стерео WAV. Речь сцен кладётся по их началам во
 * времени ролика (с учётом перекрытий переходов), подложка — с огибающей,
 * акценты — по местам. Нормировка — двумя проходами loudnorm: сначала замер,
 * затем линейная поправка к цели с потолком истинного пика (PEAK).
 */
export function mixFilm(opts: {
  total: number; out: string; speech: Array<{ wav: string; at: number }>; beats: BeatWindow[];
  music?: Music; musicCues?: MusicCue[]; sfx: Sfx[]; loudness?: number; musicDir: string;
}): MixReport {
  const mix = new Float32Array(Math.ceil(opts.total * RATE) * 2);
  for (const s of opts.speech) add(mix, pcm(s.wav), s.at, 1);
  const levels = beatLevels(opts.beats);
  const report: MixReport = { sfx: [] };
  const spans = musicSpans(opts.music, opts.musicCues ?? [], opts.total);
  for (const span of spans) {
    const m = span.music;
    const src = pcm(m.file, m.from ?? 0);
    if (!src.length) throw new Error(msg("mix.silentMusic", { file: m.file }));
    const pauseDb = m.level ?? -26;
    const duck = m.duck ?? 20;
    const base = pauseDb - levelDb(src);
    const env = duckingEnvelope(levels, pauseDb, duck);
    // Подложка повторяется до конца своего отрезка; вход и уход — плавные, обрыв — почти мгновенный.
    const looped = new Float32Array(Math.max(0, Math.ceil((span.end - span.start) * RATE)) * 2);
    for (let i = 0; i < looped.length; i++) looped[i] = src[i % src.length]!;
    add(mix, looped, span.start, (t) => lin(base + env(t))
      * smooth(t, span.start, span.start + span.fadeIn) * (1 - smooth(t, span.end - span.fadeOut, span.end)));
    report.music ??= { file: m.file, pauseDb, duck, windows: levels.length };
  }
  if (report.music && (spans.length > 1 || (opts.musicCues ?? []).length))
    report.music.spans = spans.map((s) => ({ file: s.music.file, start: Number(s.start.toFixed(3)), end: Number(s.end.toFixed(3)) }));
  for (const s of opts.sfx) {
    let src = pcm(s.file, s.from ?? 0);
    if (s.length !== undefined) src = src.subarray(0, Math.min(src.length, Math.round(s.length * RATE) * 2)).slice();
    if (s.fadeOut) fadeTail(src, s.fadeOut);
    const own = levelDb(src);
    const target = -18 + (s.gain ?? 0);
    const dur = src.length / 2 / RATE;
    const duck = s.duck ?? 12;
    // Акцент, попавший на слова, не спорит с ними: под словами он тише речи этого такта на `duck`.
    // По умолчанию уступает только перекрытая часть — удар в паузе звучит в полную силу, а хвост,
    // зашедший под голос, приглушается с короткими фронтами, как подложка.
    const hit = levels.filter((w) => s.at < w.end && s.at + dur > w.start);
    const mode = duck <= 0 || !hit.length ? "off" : s.duckAll ? "whole" : "overlap";
    const lowest = hit.length ? Math.min(target, Math.min(...hit.map((w) => w.speechDb)) - duck) : target;
    if (mode === "overlap") {
      const env = duckingEnvelope(hit, target, duck, 0.06, 0.2);
      add(mix, src, s.at, (t) => lin(target - own + env(t)));
    } else add(mix, src, s.at, lin((mode === "whole" ? lowest : target) - own));
    report.sfx.push({ file: s.file, at: s.at, levelDb: Number((mode === "whole" ? lowest : target).toFixed(1)),
      underSpeech: hit.length > 0, ...(hit.length ? { ducked: mode } : {}) });
  }
  const raw = `${opts.out}.f32`;
  writeFileSync(raw, Buffer.from(mix.buffer, mix.byteOffset, mix.byteLength));
  const input = ["-f", "f32le", "-ar", String(RATE), "-ac", "2", "-i", raw];
  if (opts.loudness === undefined) {
    execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", ...input, "-c:a", "pcm_s16le", opts.out]);
    return report;
  }
  const target = opts.loudness;
  // Замер пишется в поток ошибок: он и читается.
  const stderr = execFileSync("/bin/sh", ["-c", `"${FFMPEG}" -nostdin -hide_banner -f f32le -ar ${RATE} -ac 2 -i "${raw}" `
    + `-af loudnorm=I=${target}:TP=${PEAK}:LRA=11:print_format=json -f null - 2>&1`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const json = JSON.parse(stderr.slice(stderr.lastIndexOf("{"), stderr.lastIndexOf("}") + 1)) as Record<string, string>;
  // Тишина (немой голос `stub`, ролик без речи) нормировке не поддаётся: громкость её — минус
  // бесконечность, и поправка вышла бы бесконечной. Такой звук пишется как есть.
  if (!Number.isFinite(Number(json.input_i)) || Number(json.input_i) < -70) {
    execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", ...input, "-c:a", "pcm_s16le", opts.out]);
    return report;
  }
  execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", ...input, "-af",
    `loudnorm=I=${target}:TP=${PEAK}:LRA=11:measured_I=${json.input_i}:measured_TP=${json.input_tp}:`
    + `measured_LRA=${json.input_lra}:measured_thresh=${json.input_thresh}:offset=${json.target_offset}:linear=true`,
    "-ar", String(RATE), "-c:a", "pcm_s16le", opts.out]);
  // `measured` — громкость ГОТОВОГО звука: её сверяют с цифрой ebur128 готового ролика. Прежде
  // здесь стоял замер смеси до нормировки, и отчёт расходился с файлом на полтора LU.
  const after = execFileSync("/bin/sh", ["-c", `"${FFMPEG}" -nostdin -hide_banner -i "${opts.out}" `
    + `-af loudnorm=I=${target}:TP=${PEAK}:LRA=11:print_format=json -f null - 2>&1`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const done = JSON.parse(after.slice(after.lastIndexOf("{"), after.lastIndexOf("}") + 1)) as Record<string, string>;
  report.loudness = { target, measured: Number(done.input_i), input: Number(json.input_i) };
  return report;
}

/** Доли музыки внутри отрезка ролика [from, from + length), в секундах от его начала. */
export function beatsWithin(from: number, length: number, bpm: number, offset = 0): number[] {
  const len = 60 / bpm, out: number[] = [];
  for (let n = Math.max(0, Math.ceil((from - offset) / len)); offset + n * len < from + length; n++)
    out.push(Number((offset + n * len - from).toFixed(3)));
  return out;
}

/** Секунда доли номер n музыки с темпом bpm и сдвигом первой доли. */
export const musicBeat = (n: number, bpm: number, offset = 0): number => offset + (n * 60) / bpm;

/** Ближайшая доля музыки не раньше момента t. */
export function nextMusicBeat(t: number, bpm: number, offset = 0): number {
  const len = 60 / bpm;
  return offset + Math.ceil((t - offset - 1e-6) / len) * len;
}
