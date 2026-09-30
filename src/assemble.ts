// Склейка ролика с переходами.
//
// Без переходов сегменты сцен идут встык и склеиваются копированием. С
// переходом длиной d сцены перекрываются: следующая начинается на d раньше,
// чем кончилась предыдущая, и эти d секунд занимает клип перехода, собранный
// из последних кадров первой сцены и первых кадров второй. Остальное каждой
// сцены — её сегмент, обрезанный ровно по номерам кадров. Обрезки и клипы
// переходов кэшируются по содержимому, поэтому правка одной сцены
// пересобирает только её и два соседних перехода.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { CUT, framesOf, isJoint, renderMorph, renderTransition, type MorphInput, type Renderer, type Transition } from "./transition.js";
import { msg } from "./msg.js";

const require = createRequire(import.meta.url);
const FFMPEG = require("ffmpeg-static") as string;

const md5 = (b: Buffer | string): string => createHash("md5").update(b).digest("hex");

export interface AssembleScene { id: string; seg: string; frames: number; transition?: Transition;
  /** входящий переход общим элементом: кадры обеих сцен с предметом и без, его места */
  morph?: MorphInput;
  /** тема сцены: входящий в неё переход рисуется её цветами */
  theme?: Record<string, string> }

export interface Encoding { fps: number; width: number; height: number; crf: number; preset: string; pix: string }

/** Сколько кадров занимает переход: длительность, округлённая до кадра, не меньше двух; у склейки — ноль. */
export const transitionFrames = (t: Transition, fps: number): number =>
  t.kind === CUT ? 0 : Math.max(2, Math.round(t.duration * fps));

/**
 * Насколько переход перекрывает сцены, в кадрах. Переход на стыке (`joint`) не перекрывает: его
 * кадры — последние кадры первой сцены и первые кадры второй, взятые по очереди.
 */
export const overlapFrames = (t: Transition, fps: number): number => (isJoint(t.kind) ? 0 : transitionFrames(t, fps));
/** Сколько кадров переход на стыке берёт у каждой сцены: у первой — больше половины при нечётном. */
const jointSplit = (k: number): { out: number; in: number } => ({ out: k - Math.floor(k / 2), in: Math.floor(k / 2) });

/**
 * Начала сцен во времени ролика и его длина. Сцена с переходом начинается
 * на длину перекрытия раньше конца предыдущей.
 */
export function timeline(scenes: Array<{ frames: number; transition?: Transition }>, fps: number):
  { starts: number[]; total: number } {
  const starts: number[] = [];
  let frame = 0;
  scenes.forEach((s, i) => {
    if (i > 0 && s.transition) frame -= overlapFrames(s.transition, fps);
    starts.push(frame / fps);
    frame += s.frames;
  });
  return { starts, total: frame / fps };
}

const encodeArgs = (e: Encoding): string[] => ["-c:v", "libx264", "-preset", e.preset, "-crf", String(e.crf),
  "-pix_fmt", e.pix, "-g", String(e.fps * 2), "-r", String(e.fps)];

export async function assembleVideo(opts: {
  scenes: AssembleScene[]; enc: Encoding; cache: string; self: string; out: string;
}): Promise<{ transitions: Array<{ scene: string; kind: string; renderer: Renderer; at: number; duration: number }> }> {
  const { scenes, enc, cache } = opts;
  const { starts } = timeline(scenes, enc.fps);
  const parts: string[] = [];
  const done: Array<{ scene: string; kind: string; renderer: Renderer; at: number; duration: number }> = [];
  const segHash = scenes.map((s) => md5(readFileSync(s.seg)));
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i]!;
    const kIn = i > 0 && s.transition ? transitionFrames(s.transition, enc.fps) : 0;
    const next = scenes[i + 1];
    const kOut = next?.transition ? transitionFrames(next.transition, enc.fps) : 0;
    // Переход на стыке срезает с каждой сцены только свою долю своих кадров.
    const trimIn = kIn && isJoint(s.transition!.kind) ? jointSplit(kIn).in : kIn;
    const trimOut = kOut && isJoint(next!.transition!.kind) ? jointSplit(kOut).out : kOut;
    if (kIn) {
      const prev = scenes[i - 1]!;
      const morph = s.morph;
      // Тема входящей сцены — часть ключа: свет и просветы перехода рисуются её цветами.
      const key = md5(JSON.stringify({ a: segHash[i - 1], b: segHash[i], kind: s.transition!.kind, k: kIn, enc, self: opts.self,
        theme: s.theme ?? null, color: s.transition!.color ?? null, direction: s.transition!.direction ?? null, at: s.transition!.at ?? null,
        area: s.transition!.area ?? null,
        morph: morph ? { ...morph, files: [morph.aBg, morph.bBg, morph.aFull, morph.bFull].map((f) => md5(readFileSync(f))) } : null }));
      const clip = resolve(cache, `transition-${key}.mp4`);
      const meta = `${clip}.json`;
      let renderer: Renderer;
      if (!existsSync(clip)) {
        const work = resolve(cache, `transition-${key}.work`);
        let got: { frames: string[]; renderer: Renderer };
        if (morph) {
          got = await renderMorph({ ...morph, width: enc.width, height: enc.height, n: kIn, out: resolve(work, "t") });
        } else {
          let a: string[], b: string[];
          if (isJoint(s.transition!.kind)) {
            // На стыке шейдер получает один кадр в обеих текстурах: сначала конец первой сцены, потом начало второй.
            // Кадры лежат в одном каталоге подряд: запасной путь ffmpeg читает их по шаблону имени.
            const split = jointSplit(kIn);
            a = framesOf(prev.seg, prev.frames - split.out, split.out, resolve(work, "a"));
            if (split.in) {
              for (const [j, f] of framesOf(s.seg, 0, split.in, resolve(work, "b")).entries()) {
                const to = resolve(work, "a", `${String(split.out + j + 1).padStart(5, "0")}.png`);
                renameSync(f, to);
                a.push(to);
              }
            }
            b = a;
          } else {
            a = framesOf(prev.seg, prev.frames - kIn, kIn, resolve(work, "a"));
            b = framesOf(s.seg, 0, kIn, resolve(work, "b"));
          }
          got = await renderTransition({ kind: s.transition!.kind, a, b, width: enc.width, height: enc.height,
            out: resolve(work, "t"), ...(s.theme ? { theme: s.theme } : {}), ...(s.transition!.color ? { color: s.transition!.color } : {}),
            ...(s.transition!.direction ? { direction: s.transition!.direction } : {}), ...(s.transition!.at ? { at: s.transition!.at } : {}),
            ...(s.transition!.area ? { area: s.transition!.area } : {}) });
        }
        renderer = got.renderer;
        execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-framerate", String(enc.fps),
          "-i", resolve(work, "t", "%05d.png"), ...encodeArgs(enc), clip]);
        writeFileSync(meta, JSON.stringify({ renderer }));
        rmSync(work, { recursive: true, force: true });
      } else renderer = (JSON.parse(readFileSync(meta, "utf8")) as { renderer: Renderer }).renderer;
      parts.push(clip);
      const transitionStart = starts[i]! - (isJoint(s.transition!.kind) ? jointSplit(kIn).out / enc.fps : 0);
      done.push({ scene: s.id, kind: s.transition!.kind, renderer, at: Number(transitionStart.toFixed(3)),
        duration: Number((kIn / enc.fps).toFixed(3)) });
    }
    const from = trimIn, to = s.frames - trimOut;
    if (to - from < 1) throw new Error(msg("assemble.shortScene", { id: s.id, frames: s.frames, in: kIn, out: kOut }));
    if (!from && to === s.frames) { parts.push(s.seg); continue; }
    const key = md5(JSON.stringify({ seg: segHash[i], from, to, enc }));
    const part = resolve(cache, `part-${key}.mp4`);
    if (!existsSync(part)) {
      execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-i", s.seg,
        "-vf", `trim=start_frame=${from}:end_frame=${to},setpts=PTS-STARTPTS`, "-an", ...encodeArgs(enc), part]);
    }
    parts.push(part);
  }
  const list = resolve(cache, "parts.txt");
  writeFileSync(list, parts.map((p) => `file '${p}'`).join("\n"));
  execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list,
    "-c", "copy", "-an", opts.out]);
  return { transitions: done };
}
