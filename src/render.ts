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
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { fontFaceCss, themeFamilies, FONT_PROBE } from "./fonts.js";
import { parseOverlay } from "./overlay.js";
import { msg } from "./msg.js";

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
  /**
   * Размытие движения: кадр, на котором камера едет, собирается из `samples`
   * подкадров внутри выдержки `shutter` (доля интервала кадра). Кадры
   * удержания остаются одиночными и побайтово прежними.
   */
  motionBlur?: { samples: number; shutter: number };
  /**
   * Окно кадрирования шириной в точках страницы: вместо всего вьюпорта снимается
   * полоса во всю высоту у цели фокуса (`__stage.focusX`). Так горизонтальная
   * страница даёт вертикальный кадр в полном разрешении: вьюпорт — её кадр,
   * `scale` — во сколько раз высота нового кадра больше.
   */
  crop?: { width: number };
  /** Прямоугольники предметов в названные моменты, в точках кадра: так сборка узнаёт, где лупа. */
  probes?: Array<{ t: number; anchor: unknown }>;
  /** замеры читаемости: кегль самого мелкого текста цели в момент t, в точках готового кадра */
  legible?: Array<{ t: number; target: string }>;
  /** моменты и цели фокусов, у которых проверить строки, срезанные кадром */
  cuts?: Array<{ t: number; target: string }>;
  /** Цели фокусов в момент, когда камера к ним приходит: видна ли цель на экране. */
  unseen?: Array<{ t: number; target: string }>;
  /** момент и порог в точках готового кадра, мельче которого строки страницы называются */
  small?: { t: number; min: number };
  /** моменты и безопасная зона ленты (в точках готового кадра), за которую не должен заходить текст */
  unsafe?: { times: number[]; safe: { top: number; bottom: number; left: number; right: number } };
  /** момент, в который снять видимый текст кадра (страница и слой) */
  readText?: number;
  /** Селектор, который на кадрах не рисуется: так переход общим элементом получает фон без предмета. */
  hide?: string;
  /** Видимый экземпляр общего элемента перехода, если селектор встречается в скрытых видах страницы. */
  morphTarget?: string;
}

/** Кадр: номер, картинка и её контрольная сумма. */
export interface Shot {
  f: number;
  buf: Buffer;
  md5: string;
  /** левый край окна кадрирования в точках страницы, если кадр вырезан окном */
  x?: number;
}

/** Сцена в том виде, в каком её рендерит ядро. */
export interface RenderScene {
  page: string;
  duration: number;
  offline?: boolean;
  __src?: string;
  __overlayOnly?: boolean;
  /** Какую часть слоя рисовать: кадровую (подсветка), экранную (карточки) или обе. */
  __layerPart?: "scene" | "screen" | "both";
  /** Наезд над видео делает сборка: слой остаётся в координатах кадра. */
  __videoCamera?: boolean;
  [key: string]: unknown;
}

export const DEFAULTS: RenderOpts = { fps: 25, width: 1920, height: 1080, scale: 1 };

export async function renderScene(
  scene: RenderScene,
  opts: Partial<RenderOpts> = {},
): Promise<{ frames: number; shots: Shot[]; opts: RenderOpts; rects: Array<{ left: number; top: number; width: number; height: number }>; floor: number; renderer?: string; overflow?: number; legible?: Array<{ t: number; target: string; px: number | null }>; cuts?: Array<{ t: number; target: string; text: string[] }>; unseen?: Array<{ t: number; target: string }>; small?: Array<{ text: string; px: number }>; captionLines?: { lines: number; text: string }; outside?: Array<{ t: number; text: string; side: string }>; text?: string }> {
  const o = { ...DEFAULTS, ...opts };
  const frames = Math.ceil(scene.duration * o.fps);
  const browser = await chromium.launch();
  // Браузер закрывается и при ошибке кадра или пробы: иначе процесс ждал бы его вечно.
  try {
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
    if (scene.__overlayOnly) {
      await page.goto("about:blank");
      await page.evaluate(() => { document.documentElement.style.background = "transparent"; });
    } else {
      await page.goto(pathToFileURL(resolve(scene.__src ?? HERE, scene.page)).href, {
        waitUntil: "load",
      });
    }
    // Direct scene.json/pitch consumers bypass parseSource. Normalize their
    // cards too, so automatic reading time matches the rendered duration.
    const staged = scene.overlay
      ? { ...scene, overlay: parseOverlay(JSON.stringify(scene.overlay)) } : scene;
    // Шрифты темы — из набора, вшитыми в страницу; кадр снимается только после того, как они
    // загружены на латинице и кириллице, и слайд перемерен уже ими.
    const families = themeFamilies(scene.theme as Record<string, string> | undefined).map((f) => f.family);
    await page.evaluate((s) => window.__stage.mount(s), { ...staged, __fontCss: fontFaceCss(scene.theme as Record<string, string> | undefined),
      ...(o.crop ? { __cropWidth: o.crop.width } : {}) });
    if (families.length) {
      await page.evaluate(async ({ fams, probe }) => {
        await Promise.all(fams.flatMap((f) => ["400", "700"].map((w) => document.fonts.load(`${w} 40px "${f}"`, probe))));
        await document.fonts.ready;
        (window as unknown as { __refit?: () => void }).__refit?.();
      }, { fams: families, probe: FONT_PROBE });
    }
    if (o.morphTarget) {
      // У одностраничного интерфейса тот же id может стоять в скрытом виде раньше нужного.
      // Отмечаем один видимый предмет в момент снимка ДО кадра без него;
      // CSS-селектор скрыл бы обе копии, а начальный кадр может показывать другой вид страницы.
      await page.evaluate((t) => window.__clock.seek(t), o.at ?? o.probes?.[0]?.t ?? 0);
      await page.evaluate((selector) => {
        const shown = [...document.querySelectorAll(selector)].filter((node) => {
          const r = node.getBoundingClientRect();
          if (r.width < 1 || r.height < 1) return false;
          for (let p: Element | null = node; p; p = p.parentElement) {
            const css = getComputedStyle(p);
            if (css.display === "none" || css.visibility === "hidden" || Number(css.opacity) === 0) return false;
          }
          return true;
        });
        if (shown.length !== 1) throw new Error(msg("render.morphTarget", { selector, found: shown.length }));
        shown[0]!.setAttribute("data-sc-morph-target", "");
      }, o.morphTarget);
    }
    if (o.hide) await page.addStyleTag({ content: o.morphTarget
      ? "[data-sc-morph-target]{visibility:hidden!important}"
      : `${o.hide}{visibility:hidden!important}` });

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
      // Окно кадрирования: левый край — по середине фокуса, прижат к краям страницы и
      // округлён до целого пикселя снимка, чтобы кадр оставался побайтово повторимым.
      let clip: { x: number; y: number; width: number; height: number } | undefined;
      if (o.crop) {
        const mid = await page.evaluate(() => window.__stage.focusX());
        const x = Math.max(0, Math.min(o.width - o.crop.width, mid - o.crop.width / 2));
        clip = { x: Math.round(x * o.scale) / o.scale, y: 0, width: o.crop.width, height: o.height };
      }
      let buf = await page.screenshot({ animations: "allow", ...(clip ? { clip } : {}),
        ...(scene.__overlayOnly ? { omitBackground: true } : {}) });
      const mb = o.motionBlur;
      if (mb && mb.samples > 1 && o.freeze === undefined && !scene.__overlayOnly
        && await page.evaluate((tt) => window.__stage.moving(tt), t)) {
        const subs: Buffer[] = [];
        for (let i = 0; i < mb.samples; i++) {
          await page.evaluate((tt) => window.__clock.seek(tt), t + ((i + 0.5) / mb.samples - 0.5) * mb.shutter / o.fps);
          subs.push(await page.screenshot({ animations: "allow", ...(clip ? { clip } : {}) }));
        }
        buf = await averageFrames(subs);
      }
      shots.push({ f, buf, md5: createHash("md5").update(buf).digest("hex"), ...(clip ? { x: clip.x } : {}) });
    }
    const rects: Array<{ left: number; top: number; width: number; height: number }> = [];
    for (const probe of o.probes ?? []) {
      await page.evaluate((tt) => window.__clock.seek(tt), probe.t);
      const target = probe.anchor && typeof probe.anchor === "object" ? (probe.anchor as { target?: unknown }).target : undefined;
      const anchor = o.morphTarget && target === o.morphTarget
        ? { target: "[data-sc-morph-target]" } : probe.anchor;
      rects.push(await page.evaluate((a) => window.__stage.rectOf(a), anchor));
    }
    // Кегль текста цели в точках снимка: плотность снимка (у кадрирования — отношение высот
    // кадров) переводит точки страницы в точки готового кадра.
    const legible: Array<{ t: number; target: string; px: number | null }> = [];
    for (const l of o.legible ?? []) {
      await page.evaluate((tt) => window.__clock.seek(tt), l.t);
      const css = await page.evaluate((sel) => window.__stage.fontPx(sel), l.target);
      legible.push({ ...l, px: css === null ? null : Number((css * o.scale).toFixed(1)) });
    }
    const cuts: Array<{ t: number; target: string; text: string[] }> = [];
    for (const c of o.cuts ?? []) {
      await page.evaluate((tt) => window.__clock.seek(tt), c.t);
      const text = await page.evaluate((sel) => window.__stage.cutText(sel), c.target);
      if (text.length) cuts.push({ ...c, text });
    }
    const unseen: Array<{ t: number; target: string }> = [];
    for (const u of o.unseen ?? []) {
      await page.evaluate((tt) => window.__clock.seek(tt), u.t);
      if (!(await page.evaluate((sel) => window.__stage.shown(sel), u.target))) unseen.push(u);
    }
    // Мелкий текст страницы — в точках готового кадра: порог переводится в точки страницы.
    let small: Array<{ text: string; px: number }> = [];
    if (o.small) {
      await page.evaluate((tt) => window.__clock.seek(tt), o.small.t);
      small = (await page.evaluate((m) => window.__stage.smallText(m), o.small.min / o.scale))
        .map((x) => ({ ...x, px: Number((x.px * o.scale).toFixed(1)) }));
    }
    let text: string | undefined;
    if (o.readText !== undefined) {
      await page.evaluate((tt) => window.__clock.seek(tt), o.readText);
      text = await page.evaluate(() => window.__stage.visibleText());
    }
    // Текст за безопасной зоной ленты — в каждый названный момент, с наездом камеры.
    const outside: Array<{ t: number; text: string; side: string }> = [];
    for (const t of o.unsafe?.times ?? []) {
      await page.evaluate((tt) => window.__clock.seek(tt), t);
      const k = o.scale ?? 1;
      const zone = { top: o.unsafe!.safe.top / k, bottom: o.unsafe!.safe.bottom / k, left: o.unsafe!.safe.left / k, right: o.unsafe!.safe.right / k };
      for (const x of await page.evaluate((z) => window.__stage.outsideSafe(z), zone)) {
        if (!outside.some((y) => y.text === x.text)) outside.push({ t, ...x });
      }
    }
    // Верх полосы субтитров: над ним сборка держит линзу лупы.
    const floor = await page.evaluate(() => window.__stage.floor());
    // Чем нарисован кадр, говорит сама страница: пометку она ставит только после настоящей
    // отрисовки (экран в перспективе — WebGL). Сборка переносит её в отчёт сцены.
    const renderer = scene.__overlayOnly ? undefined
      : await page.evaluate(() => document.body?.dataset.screenRenderer).catch(() => undefined);
    // Слайд, которому не хватило места и при предельном ужатии, говорит, на сколько точек сетки.
    const overflow = scene.__overlayOnly ? undefined
      : await page.evaluate(() => Number(document.body?.dataset.overflow) || undefined).catch(() => undefined);
    const captionLines = await page.evaluate(() => window.__stage.captionLines()).catch(() => ({ lines: 0, text: "" }));
    return { frames, shots, opts: o, rects, floor, ...(text !== undefined ? { text } : {}), ...(captionLines.lines ? { captionLines } : {}), ...(outside.length ? { outside } : {}), ...(legible.length ? { legible } : {}), ...(cuts.length ? { cuts } : {}), ...(unseen.length ? { unseen } : {}), ...(small.length ? { small } : {}), ...(renderer ? { renderer } : {}), ...(overflow ? { overflow } : {}) };
  } catch (e) {
    throw stageError(e);
  } finally {
    await browser.close();
  }
}

/**
 * Слой композиции живёт в странице, куда словарь сообщений не попадает, поэтому он бросает
 * устойчивый код `sc-stage:<код>:<цель>`, а слова на языке запуска подставляются здесь.
 */
function stageError(e: unknown): unknown {
  const m = /sc-stage:(\w+):([^\n]*)/.exec(String((e as Error)?.message ?? ""));
  return m ? new Error(msg(`stage.${m[1]}`, { target: m[2]!.trim() })) : e;
}

/**
 * `ffmpeg` без блокировки цикла событий: сборка рисует несколько сцен сразу, и синхронный вызов
 * остановил бы браузеры соседних сцен.
 */
const ffAsync = promisify(execFile);

/** Среднее нескольких снимков одного размера — кадр с размытием движения. */
async function averageFrames(frames: Buffer[]): Promise<Buffer> {
  const dir = mkdtempSync(resolve(tmpdir(), "sc-blur-"));
  try {
    frames.forEach((b, i) => writeFileSync(resolve(dir, `${String(i).padStart(3, "0")}.png`), b));
    const { stdout } = await ffAsync(FFMPEG, ["-nostdin", "-loglevel", "error", "-i", resolve(dir, "%03d.png"),
      "-vf", `tmix=frames=${frames.length},select=eq(n\\,${frames.length - 1})`, "-frames:v", "1",
      "-f", "image2pipe", "-vcodec", "png", "-"], { maxBuffer: 256 * 1024 * 1024, encoding: "buffer" });
    return stdout;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Кадры → сегмент. `filter` — граф поверх кадров (лупа), в том же проходе кодирования. */
export async function encode(shots: Shot[], out: string, o: RenderOpts, filter: string[] = []): Promise<string> {
  const e = o.encode ?? ENCODE;
  const dir = `${out}.frames`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  // Кадры на диске — только на время кодирования, и при его ошибке тоже убираются.
  try {
    shots.forEach((s, i) =>
      writeFileSync(`${dir}/${String(i).padStart(5, "0")}.png`, s.buf),
    );
    await ffAsync(FFMPEG, [
      "-nostdin", "-y", "-loglevel", "error",
      "-framerate", String(o.fps), "-i", `${dir}/%05d.png`, ...filter,
      "-c:v", "libx264", "-preset", e.preset, "-crf", String(e.crf),
      "-pix_fmt", e.pix, "-g", String(o.fps * 2), out,
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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
    await encode(shots, String(args.out), o);
    console.log(JSON.stringify({ frames: shots.length, out: args.out }));
  }
}
