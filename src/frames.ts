#!/usr/bin/env node
// Кадры сценария без сборки: лист ключевых кадров и отдельные кадры по моменту.
//
// Полная сборка озвучивает каждый такт и рисует каждый кадр — минуты, а у
// платного голоса ещё и деньги. Чтобы увидеть, как лежит вёрстка, этого не
// нужно: достаточно одного кадра сцены в названный момент. Длины тактов здесь
// ОЦЕНИВАЮТСЯ по тексту и темпу голоса (знаков в секунду), без синтеза, —
// поэтому кадр совпадает со сборкой по вёрстке, а по моменту — с точностью
// оценки. Видеосцена показывает кадр своего клипа.
//
// Запуск: frames.js <сценарий> [--at 0.8|80%|2.4s|b2+0.5] [--scene id] [--out sheet.png]
import { fitFilter, type Fit } from "./fit.js";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve, basename } from "node:path";
import { chromium } from "playwright";
import { renderScene, DEFAULTS, type RenderScene } from "./render.js";
import { generateFrom } from "./generate.js";
import { assetsForCheck } from "./stage-assets.js";
import { ffmpegColour } from "./theme.js";
import { subtitleMax } from "./film.js";
import { layerSafe } from "./part-label.js";
import { anchorSeconds, estimateBeats } from "./spotlight.js";
import { flatShare } from "./lint.js";

const require = createRequire(import.meta.url);
const FFMPEG = require("ffmpeg-static") as string;
const FFPROBE = require("@ffprobe-installer/ffprobe").path as string;

const args = process.argv.slice(2);
const arg = (k: string): string | undefined => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
const source = args[0];
if (!source || source.startsWith("--")) {
  console.error("frames.js <story.md> [--at 0.8|80%|2.4s|b2+0.5] [--scene id] [--out sheet.png]");
  process.exit(2);
}

// Ошибка сценария — словами, как у остальных команд, а не дампом стека.
let g: ReturnType<typeof generateFrom>;
try { g = generateFrom(resolve(source)); } catch (e) {
  const err = e as { sourceError?: boolean; code?: string; message?: string };
  if (!err.sourceError && err.code !== "ENOENT") throw e;
  console.error(`source ${source}: ${err.code === "ENOENT" ? "file not found" : err.message}`);
  process.exit(2);
}
const SRC = dirname(g.pitchFile);
const pitch = JSON.parse(readFileSync(g.pitchFile, "utf8")) as {
  scenes: Array<RenderScene & { id: string; beats: Array<{ text: string; speech?: string }>; video?: boolean; tail?: number;
    freezeAt?: number; trim?: { from: number; to?: number }; captionsAt?: "bottom" | "top" | "middle" | "auto" }>;
  frame?: { width?: number; height?: number }; theme?: Record<string, string>; tail?: number;
  safe?: { top: number; bottom: number; left: number; right: number };
  emoji?: { dir: string }; dir?: string;
  captions?: { style?: "bar" | "subtitle" | "karaoke"; everywhere?: boolean; size?: number; look?: "outline" | "plate"; position?: "bottom" | "top" | "middle" | "auto" };
};
const voice = g.src.voice as { cps?: number } | null;
const cps = Number(voice?.cps) > 0 ? Number(voice!.cps) : 15;
const W = Number(pitch.frame?.width ?? DEFAULTS.width), H = Number(pitch.frame?.height ?? DEFAULTS.height);
const only = arg("scene");
if (only && !pitch.scenes.some((s) => s.id === only)) {
  console.error(`no scene «${only}»; scenes: ${pitch.scenes.map((s) => s.id).join(", ")}`);
  process.exit(2);
}
const atArg = (arg("at") ?? "0.8").trim();
// Момент кадра: доля сцены (0.8 или 80%), секунды (2.4s) или момент речи, как в `stills` и у
// фокуса (b2, b2+0.5, b2.end). Иное — отказ с подсказкой, а не молча чёрный кадр: `90%` прежде
// читалось как не-число и давало кадр за концом сцены.
const atBeat = /^b\d+(?:\.end)?(?:\s*[+-]\s*[\d.]+)?$/i.test(atArg);
const atShare = /^([\d.]+)%$/.exec(atArg), atSecs = /^([\d.]+)s$/i.exec(atArg);
const atValue = atBeat ? 0 : atShare ? Number(atShare[1]) / 100 : atSecs ? Number(atSecs[1]) : Number(atArg);
if (!Number.isFinite(atValue) || atValue < 0 || (!atSecs && atValue > 1)) {
  console.error(`--at ${atArg}: expected a share of the scene (0.8 or 80%), seconds (2.4s) or a moment of the speech (b2, b2+0.5, b2.end)`);
  process.exit(2);
}
const out = resolve(arg("out") ?? (only ? `${only}.png` : "frames.png"));
// Лист и кадр пишутся в PNG: иначе путь без расширения доходил до снимка страницы и
// падал там стеком браузера про неизвестный тип файла.
if (!/\.png$/iu.test(out)) {
  console.error(`--out: the sheet is a PNG file; name it with .png, e.g. --out ${basename(out).replace(/\.[^.]*$/u, "")}.png`);
  process.exit(2);
}
const dir = only ? dirname(out) : resolve(dirname(out), `${basename(out).replace(/\.png$/, "")}-frames`);
mkdirSync(dir, { recursive: true });

const clipLength = (file: string): number => Number(execFileSync(FFPROBE, ["-v", "error", "-show_entries", "format=duration",
  "-of", "default=nw=1:nk=1", file], { encoding: "utf8" }).trim());

const shots: Array<{ scene: string; at: number; file: string; estimated: boolean; source?: number }> = [];
// Пустая ровная полоса в треть кадра у нарисованной сцены — слайда или своей страницы —
// тот же дефект, что у дубля (film craft 53, 58): кадр без предмета. Клип судит lint по всему куску;
// нарисованную сцену видно только на отрисованном кадре, поэтому её меряет лист кадров.
const empty: Array<{ scene: string; share: number; message: string }> = [];
const flatOf = (png: string): number => {
  const raw = execFileSync(FFMPEG, ["-nostdin", "-loglevel", "error", "-i", png, "-vf", "scale=48:64:flags=area,format=gray", "-f", "rawvideo", "-"],
    { maxBuffer: 1 << 20 });
  return flatShare(raw, 48, 64);
};
for (const s of pitch.scenes) {
  if (only && s.id !== only) continue;
  // Оценка тактов: текст (или его произносимый вариант) на темп голоса.
  const { starts, ends } = estimateBeats(s.beats, Number(s.speechAt ?? 0), cps);
  const spoken = ends.at(-1) ?? (s.beats.length ? Number(s.speechAt ?? 0) : 0);
  const page = resolve(SRC, String(s.page));
  // Видеосцена играет кусок клипа (from/to): и длина, и кадр — из куска, а секунды сцены и
  // freezeAt считаются от его начала, как в сборке.
  const whole = s.video ? clipLength(page) : 0;
  const cut = s.trim?.from ?? 0, pieceEnd = Math.min(s.trim?.to ?? whole, whole);
  const clip = Math.max(0, pieceEnd - cut);
  const duration = Math.max(Number(s.duration ?? 0), spoken + Number(s.tail ?? pitch.tail ?? 0.4),
    s.video && !s.beats.length && s.duration === undefined ? clip : 0);
  const at = atBeat ? Math.max(0, Math.min(duration, anchorSeconds(atArg, starts.length ? starts : [0], duration, ends)))
    : atSecs ? atValue : atValue * duration;
  const file = only ? out : resolve(dir, `${s.id}.png`);
  let source: number | undefined;
  if (s.video) {
    const t = cut + (s.freezeAt ?? Math.min(at, Math.max(0, clip - 0.05)));
    source = Number(t.toFixed(2));
    execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-ss", String(t), "-i", page, "-frames:v", "1",
      "-vf", fitFilter(s.fit as Fit | undefined, W, H, ffmpegColour(((s.theme ?? pitch.theme) as Record<string, string>)["--sc-letterbox"]!)), file]);
  } else {
    // Подпись и субтитры — как в сборке: кадр показывает, не ложится ли речь на содержимое.
    const theme = (s.theme ?? pitch.theme) as Record<string, string>;
    const { shots: got } = await renderScene({ ...s, ...assetsForCheck(s, SRC, pitch), duration, __src: SRC, beats: s.beats.length, starts,
      theme, ...(pitch.safe ? { safe: layerSafe(pitch as Parameters<typeof layerSafe>[0], { width: W, height: H }) } : {}),
      ...(pitch.captions?.style ? { captionStyle: pitch.captions.style } : {}),
      ...(pitch.captions?.everywhere ? { captionEverywhere: true } : {}),
      ...(pitch.captions?.size ? { subScale: pitch.captions.size } : {}),
      ...(pitch.captions?.look ? { captionLook: pitch.captions.look } : {}),
      // `auto` решает сборка по готовому кадру; лист кадров показывает место по умолчанию.
      ...((s.captionsAt ?? pitch.captions?.position) && (s.captionsAt ?? pitch.captions?.position) !== "auto" ? { captionPos: s.captionsAt ?? pitch.captions!.position } : {}),
      subMax: subtitleMax({ width: W, height: H }, pitch.safe, theme, pitch.captions?.size ?? 1),
      beatTexts: s.beats.map((b) => b.text), spoken } as RenderScene, { width: W, height: H, at });
    writeFileSync(file, got[0]!.buf);
    const share = flatOf(file);
    if (share >= 0.3) empty.push({ scene: s.id, share: Number(share.toFixed(2)),
      message: `a flat empty band ${Math.round(share * 100)}% of the frame high at ${at.toFixed(1)}s: the frame has no subject there; fill it with the product or its evidence, or let the content take the height (align, film craft 58)` });
  }
  shots.push({ scene: s.id, at: Number(at.toFixed(2)), file, estimated: s.beats.length > 0, ...(source !== undefined ? { source } : {}) });
}

// Лист: кадры по сетке с подписью сцены и момента. Собирается страницей, а не
// фильтром ffmpeg: подписи нужен шрифт, а у собранного ffmpeg его может не быть.
let sheet: string | undefined;
if (!only) {
  // Высокий кадр в ряду из шести выходил в четверть ширины листа, а лист — одной узкой полосой:
  // вертикальные кадры ложатся по четыре в ряд (по шесть, когда сцен больше восьми), рядами вниз.
  const cols = H > W ? Math.min(shots.length > 8 ? 6 : 4, Math.max(2, shots.length))
    : shots.length <= 4 ? 2 : shots.length <= 9 ? 3 : 4;
  const cellW = Math.round(1600 / cols);
  // Лист тоже в теме ролика: фон, шрифт, текст, скругление и отступы — её токены.
  const vars = Object.entries(pitch.theme ?? {}).map(([k, v]) => `${k}:${v}`).join(";");
  const html = `<!doctype html><html><head><style>:root{${vars}}</style></head><body style="margin:0;background:var(--bg);font:600 18px var(--sans);color:var(--ink)">
<div style="display:grid;grid-template-columns:repeat(${cols},${cellW - 16}px);gap:12px;padding:var(--space-s)">${shots.map((x) =>
    `<figure style="margin:0"><img src="file://${x.file}" style="width:100%;display:block;border-radius:var(--radius-sm)">`
    + `<figcaption style="padding:var(--space-xs) 0">${x.scene} · ${x.at}s${x.source !== undefined ? ` (clip ${x.source}s)` : ""}${x.estimated ? " (estimated beats)" : ""}</figcaption></figure>`).join("")}</div></body></html>`;
  const tmp = resolve(dir, "sheet.html");
  writeFileSync(tmp, html);
  const browser = await chromium.launch();
  try {
    // Высоту листа задаёт содержимое: окно в 900 точек дописывало под одним рядом пустое поле.
    const p = await browser.newPage({ viewport: { width: 1600, height: 100 } });
    await p.goto(`file://${tmp}`, { waitUntil: "load" });
    await p.screenshot({ path: out, fullPage: true });
  } finally { await browser.close(); }
  sheet = out;
}
if (!existsSync(out)) throw new Error("no frame written");
console.log(JSON.stringify({ ...(sheet ? { sheet } : {}), frames: shots.map(({ scene, at, file, source }) => ({ scene, at, file, ...(source !== undefined ? { source } : {}) })),
  ...(empty.length ? { empty } : {}) }, null, 1));
for (const e of empty) console.error(`frames: ${e.scene}: ${e.message}`);
