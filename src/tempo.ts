// Темп музыки и её первая доля — по самому файлу, без поля `bpm` в шапке.
//
// Ритм склеек (`snap`) и якоря `m8` прежде требовали, чтобы автор знал темп трека
// и вписал его руками; ошибка на пару ударов в минуту к концу ролика уводила склейку
// с доли на полсекунды. Здесь темп находится так, как его слышит ухо: по моментам,
// где звук резко становится громче (атаки), и по тому, с каким шагом они повторяются.
//
// Шаги:
// 1. файл читается одноканальным с частотой 11 025 Гц, с секунды `from`, не дольше минуты;
// 2. кривая атак — рост громкости с шагом 64 отсчёта (≈ 6 мс): мельче шаг — точнее темп;
// 3. автокорреляция кривой на периодах 60–200 ударов в минуту, со вкладом кратных
//    периодов: у ударной музыки удвоенный и половинный темп тоже дают пики, и сумма
//    по кратным выбирает тот, у которого совпадают все;
// 4. вершина уточняется параболой по соседним отсчётам — между шагами сетки;
// 5. первая доля — сдвиг гребёнки с найденным периодом, собирающий больше всего атак.
//
// Всё — чистая функция файла: повторный разбор даёт те же числа.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const FFMPEG = require("ffmpeg-static") as string;

const RATE = 11025;
const HOP = 64;

export interface Tempo {
  /** ударов в минуту */
  bpm: number;
  /** первая доля в секундах от начала звучания (от `from` файла) */
  offset: number;
  /** доля выраженности ритма 0…1: ниже 0,1 темп не назван */
  confidence: number;
}

/** Кривая атак: положительный прирост логарифма энергии между соседними шагами. */
export function onsets(samples: Float32Array): Float32Array {
  const n = Math.floor(samples.length / HOP);
  const energy = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let e = 0;
    for (let k = 0; k < HOP; k++) {
      const j = i * HOP + k;
      // Разность соседних отсчётов — грубый фильтр высоких: атака слышна по верху.
      const d = samples[j]! - (j > 0 ? samples[j - 1]! : 0);
      e += d * d;
    }
    energy[i] = Math.log(1e-9 + e);
  }
  const out = new Float32Array(n);
  for (let i = 1; i < n; i++) out[i] = Math.max(0, energy[i]! - energy[i - 1]!);
  // Среднее вычитается: автокорреляция ищет повторение атак, а не общий уровень.
  const mean = out.reduce((a, b) => a + b, 0) / Math.max(1, n);
  for (let i = 0; i < n; i++) out[i] = Math.max(0, out[i]! - mean);
  return out;
}

/** Темп и первая доля по кривой атак. `null` — ритма не слышно. */
export function tempoOf(env: Float32Array): Tempo | null {
  const perSec = RATE / HOP;
  // Ни одной атаки — энергия нигде не прыгает хотя бы в 1,6 раза — ритма нет: отношение
  // двух почти нулевых сумм ниже было бы случайным числом, а не темпом.
  let peak = 0;
  for (const v of env) if (v > peak) peak = v;
  if (peak < 0.5) return null;
  const lo = Math.floor((60 / 200) * perSec), hi = Math.ceil((60 / 60) * perSec);
  const ac = (lag: number): number => {
    let s = 0;
    for (let i = lag; i < env.length; i++) s += env[i]! * env[i - lag]!;
    return s / (env.length - lag);
  };
  const zero = ac(0) || 1;
  const cache = new Map<number, number>();
  const A = (lag: number): number => { if (!cache.has(lag)) cache.set(lag, ac(lag)); return cache.get(lag)!; };
  // Вклад кратных периодов с затуханием: удвоенный темп не набирает веса на нечётных.
  // Вес темпа — логнормальный вокруг 120 ударов в минуту с шириной в пол-октавы, как у оценщиков
  // темпа: у равных пиков на удвоенном и половинном периоде выигрывает тот, что ближе к
  // обычному темпу музыки, а не край диапазона.
  const prior = (lag: number): number => Math.exp(-0.5 * Math.pow(Math.log2((60 * perSec) / lag / 120) / 0.5, 2));
  const score = (lag: number): number => (A(lag) + 0.5 * A(2 * lag) + 0.25 * A(3 * lag) + 0.125 * A(4 * lag)) * prior(lag);
  let best = lo, bestScore = -Infinity;
  for (let lag = lo; lag <= hi; lag++) {
    const sc = score(lag);
    if (sc > bestScore) { bestScore = sc; best = lag; }
  }
  // Парабола по трём соседним значениям — вершина между шагами сетки.
  const a = score(best - 1), b = score(best), c = score(best + 1);
  const shift = a - 2 * b + c !== 0 ? (0.5 * (a - c)) / (a - 2 * b + c) : 0;
  const rough = best + Math.max(-0.5, Math.min(0.5, shift));
  const confidence = Math.max(0, Math.min(1, A(best) / zero));
  if (!(confidence >= 0.1)) return null;
  // Период и первая доля уточняются вместе: гребёнка с чуть неверным периодом за минуту
  // уходит с атак на десятки миллисекунд и выбирает сдвиг-компромисс. Поэтому ищется пара
  // «период, сдвиг», при которой зубцы гребёнки приходятся на атаки точнее всего.
  const at = (x: number): number => {
    const i = Math.floor(x), f = x - i;
    return (env[i] ?? 0) * (1 - f) + (env[i + 1] ?? 0) * f;
  };
  const comb = (period: number, phase: number): number => {
    let sum = 0;
    for (let x = phase; x < env.length; x += period) sum += at(x);
    return sum;
  };
  let period = rough, phase = 0, top = -Infinity;
  for (let pr = rough - 1; pr <= rough + 1; pr += 0.02) {
    for (let ph = 0; ph < pr; ph += 0.5) {
      const v = comb(pr, ph);
      if (v > top) { top = v; period = pr; phase = ph; }
    }
  }
  // Сдвиг — точнее, на четверть шага вокруг найденного.
  for (let ph = Math.max(0, phase - 0.5); ph <= phase + 0.5; ph += 0.125) {
    const v = comb(period, ph);
    if (v > top) { top = v; phase = ph; }
  }
  return { bpm: Number(((60 * perSec) / period).toFixed(2)), offset: Number(((phase * HOP) / RATE).toFixed(3)), confidence: Number(confidence.toFixed(3)) };
}

/** Темп музыкального файла с секунды `from` (как он звучит в ролике). */
export function detectTempo(file: string, from = 0): Tempo | null {
  const raw = execFileSync(FFMPEG, ["-nostdin", "-loglevel", "error", "-ss", String(from), "-t", "60", "-i", file,
    "-ac", "1", "-ar", String(RATE), "-f", "f32le", "-"], { maxBuffer: 64 * 1024 * 1024 });
  const samples = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.byteLength / 4));
  return tempoOf(onsets(samples));
}
