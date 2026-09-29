// Проход по готовому ролику целиком: то, что принадлежит фильму, а не сцене.
//
// Полоса хода с названием главы и ведущий в круге живут на всём протяжении
// ролика и пересекают границы сцен. Нарисованные внутри сцены, они вошли бы
// в ключ каждого сегмента вместе с длиной всего ролика, и правка одной сцены
// пересобирала бы все остальные. Поэтому сегменты остаются прежними, а эти
// слои накладываются одним проходом поверх склеенного ролика.
//
// Файл субтитров — тоже свойство ролика: его время отсчитывается от начала
// фильма, а начала реплик берутся из измеренных длин тактов.
import { chapterFontPx } from "./part-label.js";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { fontFaceCss } from "./fonts.js";
import type { Pip, Progress } from "./source.js";
import { lookGraph, type Look } from "./look.js";
import { ffmpegColour } from "./theme.js";
import { msg } from "./msg.js";

const require = createRequire(import.meta.url);
const FFMPEG = require("ffmpeg-static") as string;

/** Реплика субтитров: время от начала ролика и текст. */
export interface Cue { start: number; end: number; text: string }

/** Сцена так, как её видит проход по ролику. */
export interface FilmScene {
  duration: number;
  /** начало сцены во времени ролика; без него сцены считаются встык */
  at?: number;
  beats: Array<{ text: string; spoken: number }>;
  starts: number[];
  chapter?: string;
  /** тема сцены, если у неё своя: слои ролика над ней рисуются в этой теме */
  theme?: Record<string, string>;
}

/**
 * Отрезки ролика с одной темой: подряд идущие сцены с одинаковой темой. Слои ролика — полоса хода,
 * название части, кайма ведущего — рисуются над каждым отрезком в его теме: прежде они были в теме
 * шапки на всём ролике, и над сценой со своей темой висела плашка чужой.
 */
export function themeRuns(scenes: FilmScene[], total: number, fallback: Record<string, string>):
  Array<{ from: number; to: number; theme: Record<string, string> }> {
  const runs: Array<{ from: number; to: number; theme: Record<string, string>; key: string }> = [];
  let offset = 0;
  for (const s of scenes) {
    if (s.at !== undefined) offset = s.at;
    const theme = s.theme ?? fallback, key = JSON.stringify(theme);
    const lastRun = runs[runs.length - 1];
    if (lastRun && lastRun.key === key) lastRun.to = offset + s.duration;
    else {
      if (lastRun) lastRun.to = offset;
      runs.push({ from: offset, to: offset + s.duration, theme, key });
    }
    offset += s.duration;
  }
  if (!runs.length) return [{ from: 0, to: total, theme: fallback }];
  runs[0]!.from = 0;
  runs[runs.length - 1]!.to = total;
  return runs.map(({ from, to, theme }) => ({ from, to, theme }));
}

/** Две строки субтитра в горизонтальном кадре: столько знаков помещает блок субтитров. */
export const SUB_MAX = 84;

/** Множитель единицы кадра в значении токена `calc(var(--u)*K)`; иначе запасное число. */
const uShare = (v: string | undefined, fallback: number): number => {
  const m = /var\(--u\)\s*\*\s*([\d.]+)/.exec(v ?? "");
  return m ? Number(m[1]) : fallback;
};

/**
 * Сколько знаков помещают две строки субтитров в кадре с безопасной зоной. Блок субтитров там
 * шириной в симметричную полосу зоны вокруг середины кадра без шага `--sc-edge` и отступа `--sc-pad-x` с каждой стороны, кегль — 3,5 единицы
 * кадра (`--sub-size` формата в browser/stage.ts), средний знак жирного шрифта — 0,56 кегля.
 * Без зоны (горизонталь) — `SUB_MAX`. Так кусок реплики не выходит за две строки и в вертикали,
 * где строка вдвое короче; кадр и SRT режутся по одному числу, а кусок, который шрифтом кадра занял бы три
 * строки, кадр делит дальше сам (`screenChunks` в browser/stage.ts).
 */
export function subtitleMax(frame: { width: number; height: number }, safe: { left: number; right: number } | undefined, theme: Record<string, string>, size = 1): number {
  if (!safe) return Math.floor(SUB_MAX / size);
  const u = Math.min(frame.width, frame.height) / 56;
  // Блок субтитров стоит посередине кадра, и ширина его — симметричная полоса внутри зоны
  // (`--cw` в browser/stage.ts): у зоны площадки правое поле шире левого.
  const band = 2 * Math.min(frame.width / 2 - safe.left, frame.width / 2 - safe.right);
  const width = band / u - 2 * uShare(theme["--sc-edge"], 2.3) - 2 * uShare(theme["--sc-pad-x"], 1.7);
  return Math.max(16, Math.min(Math.floor(SUB_MAX / size), 2 * Math.floor(width / (3.5 * size * 0.56))));
}

/**
 * Куски реплики не длиннее двух строк субтитра, по словам. Кусков столько же, сколько
 * дала бы жадная нарезка, длина у них ровная (от двух третей до четырёх третей средней),
 * а среди ровных нарезок берётся та, что режет по смыслу: после конца предложения, потом
 * после запятой или тире, перед союзом, перед предлогом — и никогда после предлога или
 * союза. Прежде резалось только по счёту знаков, и кусок кончался «прошли путь от» или
 * «что и когда / играть, и». Та же нарезка — в `chunksOf` сцены (browser/stage.ts).
 */
export function chunks(text: string, max = SUB_MAX): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const cut = (limit: number): string[] => {
    const out: string[] = [];
    let cur = "";
    for (const w of words) {
      if (cur && `${cur} ${w}`.length > limit) { out.push(cur); cur = w; } else cur = cur ? `${cur} ${w}` : w;
    }
    if (cur) out.push(cur);
    return out;
  };
  const greedy = cut(max);
  if (greedy.length < 2) return greedy;
  return byMeaning(words, greedy.length, max) ?? evenCut(words, greedy.length, max, cut) ?? greedy;
}

function evenCut(words: string[], k: number, max: number, cut: (limit: number) => string[]): string[] | null {
  for (let limit = Math.ceil(words.join(" ").length / k); limit < max; limit++) {
    const even = cut(limit);
    if (even.length === k) return even;
  }
  return null;
}

/** Слова, после которых кусок не кончается и перед которыми начинается новая часть фразы. */
const CONJ = new Set("и а но или либо что чтобы когда если потому поэтому где куда откуда как пока хотя зато однако который которая которое которые которым которой которых and but or so because when if that which while where who whose though although".split(" "));
const PREP = new Set("в во на с со к ко по из от до за для о об обо у при про без через под над перед между после вокруг около the a an to from in on at for with of by into through over under about after before between".split(" "));

/** Цена разреза между словами `a` и `b`: чем осмысленнее граница, тем дешевле. */
function breakCost(a: string, b: string): number {
  const bare = (w: string): string => w.toLowerCase().replace(/^[«"'([]+|[»"')\].,;:!?…]+$/gu, "");
  const tail = bare(a), head = bare(b);
  if (/[.!?…]["»)]*$/u.test(a)) return 0;
  if (/[,;:]["»)]*$/u.test(a) || /^[—–-]$/u.test(b) || /^[—–]$/u.test(a)) return 1;
  if (CONJ.has(tail) || PREP.has(tail)) return 12;
  if (CONJ.has(head)) return 2;
  if (PREP.has(head)) return 3;
  return 5;
}

/**
 * Лучшая по смыслу нарезка на `k` кусков: каждый не длиннее `max` и в коридоре от двух третей
 * до четырёх третей средней длины. Нет такой — `null`, и режется по длине.
 */
function byMeaning(words: string[], k: number, max: number): string[] | null {
  const n = words.length;
  const mean = words.join(" ").length / k;
  const lo = Math.floor(mean * 2 / 3), hi = Math.min(max, Math.ceil(mean * 4 / 3));
  const pre = [0];
  for (const w of words) pre.push(pre[pre.length - 1]! + w.length);
  const len = (i: number, j: number): number => pre[j]! - pre[i]! + (j - i - 1);
  // best[c][j] — цена первых j слов, разрезанных на c кусков; from — где начался последний.
  const best: number[][] = Array.from({ length: k + 1 }, () => Array(n + 1).fill(Infinity));
  const from: number[][] = Array.from({ length: k + 1 }, () => Array(n + 1).fill(-1));
  best[0]![0] = 0;
  for (let c = 1; c <= k; c++) {
    for (let j = 1; j <= n; j++) {
      for (let i = c - 1; i < j; i++) {
        if (best[c - 1]![i] === Infinity) continue;
        const l = len(i, j);
        if (l > hi) continue;
        if (l < lo) break;
        const cost = best[c - 1]![i]! + (j < n ? breakCost(words[j - 1]!, words[j]!) : 0) + 4 * ((l - mean) / mean) ** 2;
        if (cost < best[c]![j]!) { best[c]![j] = cost; from[c]![j] = i; }
      }
    }
  }
  if (best[k]![n] === Infinity) return null;
  const out: string[] = [];
  for (let c = k, j = n; c > 0; c--) { const i = from[c]![j]!; out.unshift(words.slice(i, j).join(" ")); j = i; }
  return out;
}

/**
 * Реплики ролика. Такт начинается там, где его поставил звук; длинный такт
 * делится на куски не длиннее двух строк, и время такта делится между ними
 * по длине текста — первый кусок начинается ровно с такта.
 */
export function cuesOf(scenes: FilmScene[], max = SUB_MAX): Cue[] {
  const cues: Cue[] = [];
  let offset = 0;
  for (const s of scenes) {
    if (s.at !== undefined) offset = s.at;
    s.beats.forEach((b, i) => {
      const from = offset + (s.starts[i] ?? 0);
      const parts = chunks(b.text, max);
      const total = parts.reduce((n, p) => n + p.length + 1, 0);
      let at = from;
      for (const p of parts) {
        const span = (b.spoken * (p.length + 1)) / total;
        cues.push({ start: at, end: at + span, text: p });
        at += span;
      }
    });
    offset += s.duration;
  }
  return cues;
}

const stamp = (t: number): string => {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
  const pad = (n: number, w = 2): string => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms % 1000, 3)}`;
};

/** Текст файла SRT. Две строки по 42 знака — норма субтитров. */
export function srtOf(cues: Cue[]): string {
  return cues.map((c, i) => {
    const words = c.text.split(" ");
    let first = "";
    while (words.length && `${first} ${words[0]}`.trim().length <= 42) first = `${first} ${words.shift()}`.trim();
    const lines = [first, words.join(" ")].filter(Boolean);
    return `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${lines.join("\n")}\n`;
  }).join("\n");
}

/** Главы ролика: где начинается каждая названная глава. */
export function chaptersOf(scenes: FilmScene[]): Array<{ name: string; start: number; end: number }> {
  const out: Array<{ name: string; start: number; end: number }> = [];
  let offset = 0;
  for (const s of scenes) {
    if (s.at !== undefined) offset = s.at;
    if (s.chapter) {
      if (out.length) out[out.length - 1]!.end = offset;
      out.push({ name: s.chapter, start: offset, end: Infinity });
    }
    offset += s.duration;
  }
  if (out.length) out[out.length - 1]!.end = offset;
  return out;
}

/** Картинки названий глав: их рисует браузер, каждую в цветах своей темы. */
async function chapterLabels(labels: Array<{ name: string; theme: Record<string, string> }>, dir: string,
  frame: { width: number; height: number }): Promise<string[]> {
  mkdirSync(dir, { recursive: true });
  // Поля плашки растут вместе с кеглем: единица плашки — кегль, а не сотая ширины.
  const px = chapterFontPx(frame);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: frame.width, height: 400 } });
    const files: string[] = [];
    for (const [i, { name, theme }] of labels.entries()) {
      const vars = Object.entries(theme).map(([k, v]) => `${k}:${v}`).join(";");
      await page.setContent(`<html><head><style>${fontFaceCss(theme)}</style><style>:root{${vars};--u:${px / 0.95}px}html,body{margin:0;background:transparent}
        #l{display:inline-block;padding:var(--sc-badge-pad-y) var(--sc-badge-pad-x);border-radius:var(--sc-sub-radius);
        font:600 ${px}px/1.2 var(--sans);letter-spacing:var(--kicker-tracking);text-transform:var(--kicker-case);
        color:var(--sc-card-ink);background:var(--sc-card-bg);border:var(--sc-hairline) solid var(--sc-card-line)}</style></head>
        <body><span id="l"></span></body></html>`);
      await page.evaluate(async (text) => { document.getElementById("l")!.textContent = text; await document.fonts.ready; }, name);
      const file = resolve(dir, `chapter-${i}.png`);
      await page.locator("#l").screenshot({ path: file, omitBackground: true });
      files.push(file);
    }
    return files;
  } finally {
    await browser.close();
  }
}


/** Цвет `0xRRGGBB` в Y, Cb, Cr узкого диапазона BT.601 — те числа, которые пишет geq. */
export function yuvOf(hex: string): [number, number, number] {
  const v = Number.parseInt(hex.replace(/^0x/u, ""), 16);
  const r = ((v >> 16) & 255) / 255, g = ((v >> 8) & 255) / 255, b = (v & 255) / 255;
  return [Math.round(16 + 65.481 * r + 128.553 * g + 24.966 * b),
    Math.round(128 - 37.797 * r - 74.203 * g + 112 * b),
    Math.round(128 + 112 * r - 93.786 * g - 18.214 * b)];
}

/**
 * Наложить на готовый ролик полосу хода с главами и ведущего в круге.
 * Звук копируется как есть; видео перекодируется один раз.
 */
export async function filmPass(opts: {
  input: string; output: string; cache: string; srcDir: string;
  scenes: FilmScene[]; total: number; theme: Record<string, string>;
  frame: { width: number; height: number; fps: number };
  encode: { crf: number; preset: string; pix: string };
  progress?: Progress; pip?: Pip; look?: Look;
  /** безопасная зона формата: названия глав и ведущий в круге стоят внутри неё */
  safe?: { top: number; bottom: number; left: number; right: number };
  /** наезды камеры во времени ролика: на них ведущий в круге уменьшается и не спорит с приближением */
  pushes?: Array<{ from: number; to: number }>;
}): Promise<{ chapters: Array<{ name: string; start: number; end: number }> }> {
  const { width: W, height: H } = opts.frame;
  const inputs: string[] = ["-i", opts.input];
  const graph: string[] = [];
  let last = "[0:v]";
  let n = 1;
  // Вид плёнки ложится на картинку ПЕРВЫМ: полоса хода, названия глав и ведущий
  // в круге — оформление поверх фильма, их не тонируют и не зернят.
  const look = opts.look ? lookGraph(opts.look, opts.frame, last, "[lk]") : null;
  if (look) {
    graph.push(look);
    last = "[lk]";
  }
  const chapters = opts.progress?.parts === false ? [] : chaptersOf(opts.scenes);
  const runs = themeRuns(opts.scenes, opts.total, opts.theme);
  const during = (a: number, b: number): string => `enable='between(t,${a.toFixed(3)},${b.toFixed(3)})'`;
  if (opts.progress) {
    const barH = Math.max(4, Math.round(H * Number(opts.theme["--sc-progress-size"])));
    const y = opts.progress.position === "top" ? 0 : H - barH;
    // Над каждым отрезком — дорожка и заливка его темы. Полоса въезжает слева: её левый край —
    // минус ширина плюс пройденная доля ролика, одна и та же для всех отрезков.
    runs.forEach((r, k) => {
      const fill = ffmpegColour(r.theme["--sc-progress"]!), track = ffmpegColour(r.theme["--sc-progress-track"]!);
      inputs.push("-f", "lavfi", "-i", `color=c=${fill}:s=${W}x${barH}:r=${opts.frame.fps}`);
      graph.push(`${last}drawbox=x=0:y=${y}:w=${W}:h=${barH}:color=${track}:t=fill:${during(r.from, r.to)}[pt${k}]`,
        `[pt${k}][${n}:v]overlay=x='-w+w*t/${opts.total.toFixed(3)}':y=${y}:shortest=1:${during(r.from, r.to)}[pf${k}]`);
      last = `[pf${k}]`;
      n++;
    });
    if (chapters.length) {
      // Часть может идти через сцены разных тем: её название рисуется кусками, каждый в теме
      // своего отрезка.
      const pieces = chapters.flatMap((c) => runs.filter((r) => r.to > c.start && r.from < c.end)
        .map((r) => ({ name: c.name, theme: r.theme, start: Math.max(c.start, r.from), end: Math.min(c.end, r.to) })));
      const files = await chapterLabels(pieces, resolve(opts.cache, "chapters"), opts.frame);
      const z = opts.safe;
      const margin = z ? z.left : Math.round(W * 0.018);
      // В строке полосы (`label: edge`) название стоит вплотную к ней у края кадра и не
      // ложится на интерфейс; у края зоны (`zone`) — там, где его не закроет лента площадки.
      const atZone = z && (opts.progress.label ?? "zone") === "zone";
      const gap = Math.round(margin * 0.6);
      const ly = atZone ? (opts.progress.position === "top" ? z.top : `H-h-${z.bottom}`)
        : opts.progress.position === "top" ? barH + gap : `H-h-${barH + gap}`;
      files.forEach((file, i) => {
        const c = pieces[i]!;
        inputs.push("-loop", "1", "-i", file);
        graph.push(`${last}[${n}:v]overlay=x=${margin}:y=${ly}:shortest=1:`
          + `enable='between(t,${c.start.toFixed(3)},${c.end.toFixed(3)})'[c${i}]`);
        last = `[c${i}]`;
        n++;
      });
    }
  }
  if (opts.pip) {
    const file = resolve(opts.srcDir, opts.pip.file);
    if (!existsSync(file)) throw new Error(msg("film.pipMissing", { file }));
    const D = Math.round((opts.pip.size ?? 0.2) * W / 2) * 2;
    const margin = Math.round(W * 0.03);
    const corner = opts.pip.corner ?? "bottom-right";
    // С безопасной зоной круг стоит внутри неё: угол кадра закрыт кнопками площадки.
    const z = opts.safe ?? { top: margin, bottom: margin, left: margin, right: margin };
    const x = corner.endsWith("right") ? `W-w-${z.right}` : `${z.left}`;
    const yy = corner.startsWith("bottom") ? `H-h-${z.bottom}` : `${z.top}`;
    const from = opts.pip.from ?? 0, to = opts.pip.to ?? opts.total;
    // Пока камера приближает кадр, круг ведущего уменьшается до двух третей и остаётся в своём углу:
    // зритель смотрит в приближенную деталь, а ведущий ему не мешает. Входит и выходит за треть секунды.
    const ramp = 0.3;
    const inPush = (opts.pushes ?? []).map((p) => `min(1,max(0,(t-${p.from.toFixed(3)})/${ramp}))*min(1,max(0,(${p.to.toFixed(3)}-t)/${ramp}))`);
    const shrink = inPush.length ? `2*trunc(${D}*(1-0.33*min(1,${inPush.join("+")}))/2)` : "";
    inputs.push("-stream_loop", "-1", "-i", file);
    // Круг — маска альфы по расстоянию от центра, с каймой в цвет акцента.
    // Кайма — в теме отрезка: поток ведущего делится по отрезкам, у каждого своя кайма.
    const shown = runs.filter((r) => r.to > from && r.from < to);
    graph.push(`[${n}:v]fps=${opts.frame.fps},scale=${D}:${D}:force_original_aspect_ratio=increase,crop=${D}:${D},`
      + `setpts=PTS-STARTPTS+${from}/TB,format=yuva420p,split=${shown.length}${shown.map((_, k) => `[pv${k}]`).join("")}`);
    shown.forEach((r, k) => {
      const ring = Math.max(2, Math.round(D * Number(r.theme["--sc-pip-ring-width"])));
      const [ry, rcb, rcr] = yuvOf(ffmpegColour(r.theme["--sc-pip-ring"]!));
      // Координаты у каждой плоскости свои (цветовые — вдвое мельче), поэтому
      // центр и радиус считаются от размеров самой плоскости: W и H.
      graph.push(`[pv${k}]geq=lum='if(gt(hypot(X-W/2,Y-H/2),W/2-${ring}),${ry},p(X,Y))':`
        + `cb='if(gt(hypot(X-W/2,Y-H/2),W/2-${ring / 2}),${rcb},p(X,Y))':`
        + `cr='if(gt(hypot(X-W/2,Y-H/2),W/2-${ring / 2}),${rcr},p(X,Y))':`
        + `a='if(lte(hypot(X-W/2,Y-H/2),W/2),255,0)'` + (shrink ? `,scale=w='${shrink}':h='${shrink}':eval=frame` : "") + `[pip${k}]`,
        `${last}[pip${k}]overlay=x=${x}:y=${yy}:eof_action=pass:${shrink ? "eval=frame:" : ""}${during(Math.max(from, r.from), Math.min(to, r.to))}[vp${k}]`);
      last = `[vp${k}]`;
    });
    n++;
  }
  if (!graph.length) throw new Error("film pass requested with nothing to draw");
  execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", ...inputs,
    "-filter_complex", graph.join(";"), "-map", last, "-map", "0:a?", "-t", opts.total.toFixed(3),
    "-c:v", "libx264", "-preset", opts.encode.preset, "-crf", String(opts.encode.crf),
    "-pix_fmt", opts.encode.pix, "-c:a", "copy", opts.output]);
  return { chapters };
}

/** Записать субтитры ролика рядом с ним. */
/** Метка времени WebVTT: часы, минуты, секунды и миллисекунды через точку. */
export const vttStamp = (t: number): string => {
  const ms = Math.round(t * 1000);
  const pad = (n: number, w = 2): string => String(n).padStart(w, "0");
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)}.${pad(ms % 1000, 3)}`;
};

/** Главы ролика дорожкой WebVTT: по ней плеер страницы показывает оглавление и метки на шкале. */
export function chaptersVtt(chapters: Array<{ name: string; start: number; end: number }>): string {
  return "WEBVTT\n\n" + chapters.map((c, i) => `${i + 1}\n${vttStamp(c.start)} --> ${vttStamp(c.end)}\n${c.name}\n`).join("\n");
}

/** Файл глав рядом с роликом (`film.chapters.vtt`) — если у ролика есть части. */
export function writeChapters(out: string, chapters: Array<{ name: string; start: number; end: number }>): string | undefined {
  const file = resolve(out.replace(/\.[^./]+$/, "") + ".chapters.vtt");
  if (!chapters.length) {
    rmSync(file, { force: true });
    return undefined;
  }
  writeFileSync(file, chaptersVtt(chapters));
  return file;
}

export function writeSrt(out: string, scenes: FilmScene[], max = SUB_MAX): string {
  const file = resolve(out.replace(/\.[^./]+$/, "") + ".srt");
  writeFileSync(file, srtOf(cuesOf(scenes, max)));
  return file;
}
