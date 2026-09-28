// Место субтитров по самому кадру (`captions.position: auto`).
//
// Субтитры закрывают то, над чем стоят. Внизу кадра настоящего экрана часто лежит самое нужное —
// конец списка, строка ввода, панель вкладок, — а верх пуст; у слайда наоборот. Сборка смотрит
// на кадры сцены и прямоугольники названных в ней целей. Полосы над целями исключаются; среди
// остальных выбирается та, где меньше деталей по плотности краёв. Низ — умолчание зрителя,
// поэтому он уступает, только если другая полоса заметно пустее либо закрывает цель.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import type { CaptionPosition } from "./source.js";

const FFMPEG = createRequire(import.meta.url)("ffmpeg-static") as string;

export type Band = Exclude<CaptionPosition, "auto">;
export interface Zone { top: number; bottom: number }
export interface SubjectRect { left: number; top: number; width: number; height: number }

/** Кадры в оттенках серого, `w`×`h`: вход — аргументы ffmpeg, `vf` — фильтры до уменьшения. */
export function grayOf(args: string[], vf: string, w: number, h: number, input?: Buffer): Buffer[] {
  const raw = execFileSync(FFMPEG, ["-nostdin", "-loglevel", "error", ...args, "-vf", `${vf ? `${vf},` : ""}scale=${w}:${h}:flags=area,format=gray`, "-f", "rawvideo", "-"],
    { maxBuffer: 256 * 1024 * 1024, ...(input ? { input } : {}) });
  const out: Buffer[] = [];
  for (let k = 0; (k + 1) * w * h <= raw.length; k++) out.push(raw.subarray(k * w * h, (k + 1) * w * h));
  return out;
}

/**
 * Плотность краёв в трёх полосах зоны: средний перепад яркости между соседними точками по
 * горизонтали и вертикали. Высота полосы — место двух строк субтитров, в долях высоты кадра.
 */
function rowsOf(h: number, zone: Zone, frameH: number, band: number): Record<Band, [number, number]> {
  const k = h / frameH;
  const top0 = Math.round(zone.top * k), bottom1 = h - Math.round(zone.bottom * k), bh = Math.max(2, Math.round(band * h));
  return {
    top: [top0, top0 + bh],
    middle: [Math.round((top0 + bottom1 - bh) / 2), Math.round((top0 + bottom1 + bh) / 2)],
    bottom: [bottom1 - bh, bottom1],
  };
}

export function bandDensity(frames: Buffer[], w: number, h: number, zone: Zone, frameH: number, band: number): Record<Band, number> {
  const rows = rowsOf(h, zone, frameH, band);
  const out = { top: 0, middle: 0, bottom: 0 } as Record<Band, number>;
  for (const [name, [y0, y1]] of Object.entries(rows) as Array<[Band, [number, number]]>) {
    let sum = 0, n = 0;
    for (const f of frames) {
      for (let y = Math.max(1, y0); y < Math.min(h, y1); y++) {
        for (let x = 1; x < w; x++) {
          const v = f[y * w + x]!;
          sum += Math.abs(v - f[y * w + x - 1]!) + Math.abs(v - f[(y - 1) * w + x]!);
          n++;
        }
      }
    }
    out[name] = n ? sum / n : 0;
  }
  return out;
}

/** Полоса для субтитров: низ, если ни верх, ни середина не пустее его заметно (в полтора раза). */
export function chooseBand(d: Record<Band, number>): Band {
  const other = d.top <= d.middle ? "top" : "middle";
  return d[other] * 1.5 < d.bottom ? other : "bottom";
}

/** A named subject may be flat and have almost no edges. Keep the caption lane off its visible rectangle. */
export function chooseBandAwayFrom(d: Record<Band, number>, subjects: SubjectRect[], frame: { width: number; height: number }, zone: Zone, share: number): Band {
  const rows = rowsOf(frame.height, zone, frame.height, share);
  const lane = [frame.width * 0.08, frame.width * 0.92];
  const risk = Object.fromEntries((Object.entries(rows) as Array<[Band, [number, number]]>).map(([name, [top, bottom]]) => {
    const overlap = subjects.reduce((sum, r) => {
      if (r.width <= 0 || r.height <= 0 || r.height >= frame.height * 0.85) return sum;
      const x = Math.max(0, Math.min(lane[1], r.left + r.width) - Math.max(lane[0], r.left));
      const y = Math.max(0, Math.min(bottom, r.top + r.height) - Math.max(top, r.top));
      return sum + x * y / Math.max(1, Math.min(r.width, lane[1] - lane[0]) * Math.min(r.height, bottom - top));
    }, 0);
    return [name, overlap];
  })) as Record<Band, number>;
  const clear = (Object.keys(risk) as Band[]).filter((name) => risk[name] < 0.02);
  if (clear.length) return chooseBand({ top: clear.includes("top") ? d.top : Infinity,
    middle: clear.includes("middle") ? d.middle : Infinity, bottom: clear.includes("bottom") ? d.bottom : Infinity });
  return (Object.keys(risk) as Band[]).sort((a, b) => risk[a] - risk[b] || d[a] - d[b])[0]!;
}

/** Высота полосы двух строк субтитров в долях высоты кадра — та же мера, что у слоя (browser/stage.ts). */
export function bandShare(frame: { width: number; height: number }, safe: boolean, size = 1): number {
  const u = safe ? Math.min(frame.width, frame.height) / 56 * 3.5 : frame.width / 100 * 3.33;
  return (u * size * 2.6 + u * 0.7) / frame.height;
}

/**
 * Полоса для сцены с `auto`: кадры клипа (два в секунду, как их впишет сцена) или один кадр
 * нарисованной сцены без субтитров посередине её длительности.
 */
export async function autoBand(o: { frame: { width: number; height: number }; zone: Zone; share: number;
  clip?: { file: string; from: number; to: number; vf: string }; render?: () => Promise<{ image: Buffer; subjects: SubjectRect[] }>; subjects?: SubjectRect[] }): Promise<Band> {
  const w = 54, h = Math.round(54 * o.frame.height / o.frame.width);
  const rendered = o.render ? await o.render() : undefined;
  const frames = o.clip
    ? grayOf(["-ss", o.clip.from.toFixed(2), "-t", Math.max(0.2, o.clip.to - o.clip.from).toFixed(2), "-i", o.clip.file], `fps=2,${o.clip.vf}`, w, h)
    : grayOf(["-f", "png_pipe", "-i", "-"], "", w, h, rendered!.image);
  return frames.length ? chooseBandAwayFrom(bandDensity(frames, w, h, o.zone, o.frame.height, o.share),
    [...(o.subjects ?? []), ...(rendered?.subjects ?? [])], o.frame, o.zone, o.share) : "bottom";
}
