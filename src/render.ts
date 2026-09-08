#!/usr/bin/env node
// Ядро рендера: страница композиции → кадры → сегмент видео.
// Детерминировано по построению: время подаётся явно, реального времени
// в кадре нет.
//
// Запуск:
//   render.js --scene scene.json --out seg.mp4
//   render.js --scene scene.json --frames-only --hash   (хеши кадров)
//   render.js --scene scene.json --frames-only --at 1.2 (одиночный кадр)
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, rmSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const FFMPEG = require("ffmpeg-static");
const HERE = dirname(fileURLToPath(import.meta.url));
// Слой композиции читается из СОБРАННОГО каталога, а не из исходников:
// он уходит в браузер текстом, а браузер TypeScript не понимает. Пара
// файлов собирается отдельным проходом (`tsconfig.browser.json`) —
// у них нет ни импортов, ни экспортов, поэтому компилятор оставляет их
// обычными скриптами, без обёртки модуля.
const CLOCK = readFileSync(resolve(HERE, "browser", "clock.js"), "utf8");
const STAGE = readFileSync(resolve(HERE, "browser", "stage.js"), "utf8");

const args: Record<string, string | boolean> = Object.fromEntries(
  process.argv.slice(2).flatMap((a, i, arr): Array<[string, string | boolean]> =>
    a.startsWith("--") ? [[a.slice(2), arr[i + 1]?.startsWith("--") ?? true ? true : arr[i + 1]!]] : [],
  ),
);

// Умолчание кадра — 1920×1080, но это именно УМОЛЧАНИЕ: размер, темп
// и качество объявляет ролик, и вертикальный ролик на тридцати кадрах
// делается его шапкой, а не правкой инструмента.
//
// Почему умолчание такое. Причина не в «сделать покрасивее»:
// снимок интерфейса показывается увеличенным, чтобы подписи в 10–12
// пикселей читались, и при кадре в 1280 пикселей в него влезало 700–800
// пикселей ширины страницы — макет приложения обрезался посреди слова.
// Требования «текст крупнее шестнадцати пикселей» и «виден весь макет»
// вместе выполнимы только при большем числе пикселей в кадре.
/** Как кодировать сегмент: качество, предустановка, формат пикселей. */
export interface EncodeOpts {
  crf: number;
  preset: string;
  pix: string;
  /** битрейт звука в готовом файле */
  audio: string;
}

export const ENCODE: EncodeOpts = { crf: 18, preset: "veryfast", pix: "yuv420p", audio: "192k" };

export interface RenderOpts {
  fps: number;
  width: number;
  height: number;
  scale: number;
  /** параметры кодирования; умолчание — ENCODE */
  encode?: EncodeOpts;
  /** одиночный кадр в этот момент вместо всей сцены */
  at?: number;
  /** заморозить время на этом значении, каким бы ни был номер кадра */
  freeze?: number;
}

/** Кадр: номер, картинка и её контрольная сумма. */
export interface Shot {
  f: number;
  buf: Buffer;
  md5: string;
}

/** Сцена в том виде, в каком её рендерит ядро. */
export interface RenderScene {
  page: string;
  duration: number;
  offline?: boolean;
  __src?: string;
  [key: string]: unknown;
}

export const DEFAULTS: RenderOpts = { fps: 25, width: 1920, height: 1080, scale: 1 };

export async function renderScene(
  scene: RenderScene,
  opts: Partial<RenderOpts> = {},
): Promise<{ frames: number; shots: Shot[]; opts: RenderOpts }> {
  const o = { ...DEFAULTS, ...opts };
  const frames = Math.ceil(scene.duration * o.fps);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: o.width, height: o.height },
    deviceScaleFactor: o.scale,
  });
  // Часы внедряются ДО документа — иначе композиция успеет прочитать реальные.
  await ctx.addInitScript({ content: CLOCK });
  // Композиция — тоже до документа, а не тегом <script> в него. Причина
  // в подложках-снимках интерфейса: в файле MHTML скрипты документа
  // не исполняются вовсе, и добавленный тег молча ничего не делает,
  // а кадр при этом получается — просто без зума и подсветки.
  await ctx.addInitScript({ content: STAGE });
  const page = await ctx.newPage();
  // Снимок интерфейса самодостаточен: сеть в прогоне запрещена, чтобы
  // «работает» не означало «дотянулось до живого сервера».
  if (scene.offline) {
    await page.route("**", (r) =>
      r.request().url().startsWith("file:") ? r.continue() : r.abort());
  }
  await page.goto(pathToFileURL(resolve(scene.__src ?? HERE, scene.page)).href, {
    waitUntil: "load",
  });
  await page.evaluate((s) => window.__stage.mount(s), scene);

  const shots: Shot[] = [];
  const list = o.at !== undefined ? [Math.round(o.at * o.fps)] : [...Array(frames).keys()];
  for (const f of list) {
    const t = f / o.fps;
    await page.evaluate((tt) => window.__clock.seek(tt), o.freeze ?? t);
    // Кадры вложенных фреймов: у каждого свои часы.
    for (const fr of page.frames()) {
      if (fr === page.mainFrame()) continue;
      await fr.evaluate((tt) => window.__clock?.seek(tt), o.freeze ?? t).catch(() => {});
    }
    const buf = await page.screenshot({ animations: "allow" });
    shots.push({ f, buf, md5: createHash("md5").update(buf).digest("hex") });
  }
  await browser.close();
  return { frames, shots, opts: o };
}

export function encode(shots: Shot[], out: string, o: RenderOpts): string {
  const e = o.encode ?? ENCODE;
  const dir = `${out}.frames`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  shots.forEach((s, i) =>
    writeFileSync(`${dir}/${String(i).padStart(5, "0")}.png`, s.buf),
  );
  execFileSync(FFMPEG, [
    "-nostdin", "-y", "-loglevel", "error",
    "-framerate", String(o.fps), "-i", `${dir}/%05d.png`,
    "-c:v", "libx264", "-preset", e.preset, "-crf", String(e.crf),
    "-pix_fmt", e.pix, "-g", String(o.fps * 2), out,
  ]);
  rmSync(dir, { recursive: true, force: true });
  return out;
}

// Сравниваются РАЗРЕШЁННЫЕ ПУТИ, а не URL со строкой пути: файловый URL
// процентно кодирован (путь с пробелом не совпадёт никогда), а URL модуля
// уже разрешён по ссылкам, тогда как argv[1] — нет. В обоих случаях блок
// молча не исполняется: команда печатает пустоту с кодом 0.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const scene = JSON.parse(readFileSync(String(args.scene), "utf8")) as RenderScene;
  const opts: Partial<RenderOpts> = {};
  if (args.at !== undefined && args.at !== true) opts.at = Number(args.at);
  if (args.freeze !== undefined && args.freeze !== true) opts.freeze = Number(args.freeze);
  const { frames, shots, opts: o } = await renderScene(scene, opts);
  if (args["frames-only"]) {
    console.log(JSON.stringify({ frames: shots.length, expected: frames,
      md5: shots.map((s) => s.md5) }, null, 1));
  } else {
    encode(shots, String(args.out), o);
    console.log(JSON.stringify({ frames: shots.length, out: args.out }));
  }
}
