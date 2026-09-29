#!/usr/bin/env node
// Режиссёрский линтер: правила смотрибельного ролика, проверяемые по сценарию.
//
// Правила из `docs/film-craft.md` прежде проверялись только глазами, по
// готовому ролику, — и прошлые ошибки повторялись: подпись и карточка
// одновременно, строка на три экрана, неподвижная сцена. Всё это видно уже в
// сценарии, до сборки и без синтеза. Длины тактов оцениваются по тексту и
// темпу голоса, как у листа кадров.
//
// Запуск: lint.js <сценарий>. Код выхода 1 — есть замечания.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { foldLines, parseSource, SourceError, specOf, toPitch, type PitchScene } from "./source.js";
import { providerFor } from "./provider/index.js";
import { SHOWN_COMMON } from "./visible.js";
import { cameraEnd, cardHold } from "./overlay.js";
import { THEMES, themeFingerprint, wholeThemeFingerprint, type ThemeVars } from "./theme.js";
import { fitScale } from "./camera.js";
import { loupeLayout } from "./loupe.js";
import { FORMATS } from "./format.js";
import { subtitleMax } from "./film.js";
import { estimateBeats, spotlightOverlay } from "./spotlight.js";
import { stepEnd } from "./speed.js";
import { marksOf } from "./marks.js";
import { msg } from "./msg.js";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { finding, type Finding as RuleFinding } from "./rules.js";
import { karaokeRestContrast } from "./brand.js";

const FFMPEG = createRequire(import.meta.url)("ffmpeg-static") as string;

/** Самый долгий неподвижный отрезок клипа между `from` и `to`, секунды (ffmpeg freezedetect). */
function frozenFor(clip: string, from: number, to: number): number {
  const r = spawnSync(FFMPEG, ["-hide_banner", "-ss", from.toFixed(2), "-t", (to - from).toFixed(2), "-i", clip,
    "-vf", "freezedetect=n=0.003:d=1,metadata=print", "-an", "-f", "null", "-"], { encoding: "utf8" });
  const log = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  let longest = 0, open: number | null = null;
  for (const m of log.matchAll(/freeze_(start|end): ([\d.]+)/g)) {
    const t = Number(m[2]);
    if (m[1] === "start") open = t;
    else if (open !== null) { longest = Math.max(longest, t - open); open = null; }
  }
  if (open !== null) longest = Math.max(longest, to - from - open);
  return longest;
}

/** Кадры куска клипа в оттенках серого, мелко: `w`×`h` точек, `fps` в секунду. */
function grayFrames(clip: string, from: number, to: number, fps: number, w: number, h: number): Buffer[] {
  const r = spawnSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-ss", from.toFixed(2), "-t", Math.max(0.1, to - from).toFixed(2), "-i", clip,
    "-vf", `fps=${fps},scale=${w}:${h}:flags=area,format=gray`, "-f", "rawvideo", "-"], { maxBuffer: 256 * 1024 * 1024 });
  const raw = r.stdout as unknown as Buffer;
  if (!raw?.length) return [];
  const out: Buffer[] = [];
  for (let k = 0; (k + 1) * w * h <= raw.length; k++) out.push(raw.subarray(k * w * h, (k + 1) * w * h));
  return out;
}

/**
 * Самая высокая ровная полоса кадра — доля высоты: подряд идущие строки одного цвета без
 * деталей. Пустой серый заполнитель под страницей или несдвинутый фон дают такую полосу;
 * настоящий экран — строки с текстом, рамками и значками — нет.
 */
export function flatShare(frame: Buffer, w: number, h: number): number {
  let best = 0, run = 0, colour = -1;
  for (let y = 0; y < h; y++) {
    const row = frame.subarray(y * w, (y + 1) * w);
    let min = 255, max = 0, sum = 0;
    for (const v of row) { min = Math.min(min, v); max = Math.max(max, v); sum += v; }
    const mean = sum / w;
    const flat = max - min <= 6;
    if (flat && run > 0 && Math.abs(mean - colour) <= 4) run++;
    else if (flat) { run = 1; colour = mean; }
    else run = 0;
    best = Math.max(best, run);
  }
  return best / h;
}

/** Секунды куска (от его начала), где соседние кадры резко различаются: смена экрана. */
export function jumpsOf(frames: Buffer[], fps: number): number[] {
  const out: number[] = [];
  for (let k = 1; k < frames.length; k++) {
    const a = frames[k - 1]!, b = frames[k]!;
    let d = 0;
    for (let i = 0; i < a.length; i++) d += Math.abs(a[i]! - b[i]!);
    if (d / a.length > 28) out.push(Number((k / fps).toFixed(2)));
  }
  return out;
}

/** Размер кадра клипа по заголовку ffmpeg; null, если его не прочесть. */
function clipSize(clip: string): { width: number; height: number } | null {
  const r = spawnSync(FFMPEG, ["-hide_banner", "-i", clip], { encoding: "utf8" });
  const m = /Video:.*?\b(\d{2,5})x(\d{2,5})\b/.exec(r.stderr ?? "");
  return m ? { width: Number(m[1]), height: Number(m[2]) } : null;
}

/** Длина клипа в секундах по заголовку ffmpeg; 0, если её не прочесть. */
function clipLength(clip: string): number {
  const r = spawnSync(FFMPEG, ["-hide_banner", "-i", clip], { encoding: "utf8" });
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(r.stderr ?? "");
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
}

/** Находка по сцене: номер сцены и общий формат находки (правило базы, id, сообщение, подсказка). */
export type Finding = { scene: string; index: number } & RuleFinding;

/** Сцена длиннее — это уже не кадр, а несколько кадров под одной подписью. */
const LONG = 25;

const PAGE_MOTION = /@keyframes|animation(?:-name)?\s*:|\.animate\(|requestAnimationFrame|\brenderAt\s*=/u;
/** Набор и кинетика слоя по атрибутам страницы: движение только на странице, отданной слою меткой. */
const LAYER_MOTION = /\bdata-(?:type|kinetic)\s*=/u;
/** Атрибуты страницы, которые читает слой композиции. */
const LAYER_ATTRS = /\bdata-(?:type|kinetic|at)\s*=|dataset\.(?:type|kinetic|at)\b/u;
/** Метка страницы, отданной слою: `<html data-sc-page>`. */
const MARKED = /<html\b[^>]*\sdata-sc-page\b/iu;

/** Текст страницы и её локальных скриптов; внешняя сеть не в счёт. */
function pageTexts(file: string): { html: string; scripts: string[] } {
  const html = readFileSync(file, "utf8");
  const scripts: string[] = [];
  for (const match of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/giu)) {
    const ref = match[1] ?? match[2] ?? match[3] ?? "";
    if (!ref || ref.startsWith("/") || /^[a-z][a-z\d+.-]*:/iu.test(ref)) continue;
    const local = resolve(dirname(file), ref.split(/[?#]/u, 1)[0]!);
    if (existsSync(local)) scripts.push(readFileSync(local, "utf8"));
  }
  return { html, scripts };
}

/** Анимация в странице или в её локальных скриптах; набор и кинетика слоя — только у помеченной. */
function pageMoves(file: string): boolean {
  if (!existsSync(file)) return false;
  const { html, scripts } = pageTexts(file);
  const marked = MARKED.test(html);
  return [html, ...scripts].some((t) => PAGE_MOTION.test(t) || (marked && LAYER_MOTION.test(t)));
}

/** Страница пользуется атрибутами слоя, но не отдана ему меткой: слой их не прочтёт. */
function pageUnmarked(file: string): boolean {
  if (!existsSync(file)) return false;
  const { html, scripts } = pageTexts(file);
  return !MARKED.test(html) && [html, ...scripts].some((t) => LAYER_ATTRS.test(t));
}

/** Ошибки компиляции фокуса приходят из общего движка; для lint сохраняем их числа и язык запуска. */
function spotlightFinding(why: string): string {
  let m = /^spotlight\[(\d+)\]: until ([\d.]+)s comes before the camera arrives at ([\d.]+)s/u.exec(why);
  if (m) return msg("lint.spotUntilEarly", { index: m[1]!, until: m[2]!, arrival: m[3]! });
  m = /^spotlight\[(\d+)\] at ([\d.]+)s holds until ([\d.]+)s and is back at ([\d.]+)s, but spotlight\[(\d+)\] starts at ([\d.]+)s;.*start the next focus at ([\d.]+)s/u.exec(why);
  if (m) return msg("lint.spotGap", { index: m[1]!, at: m[2]!, hold: m[3]!, back: m[4]!, next: m[5]!, nextAt: m[6]!, start: m[7]! });
  m = /^spotlight\[(\d+)\]: it needs until ([\d.]+)s( for its card to be read)?, but the next focus starts at ([\d.]+)s/u.exec(why);
  if (m) return msg("lint.spotCardOverlap", { index: m[1]!, until: m[2]!, card: m[3] ? msg("lint.spotCardReason") : "", nextAt: m[4]! });
  m = /^spotlight collides with its overlay — overlay\.camera: the move at ([\d.]+)s starts during the hold of the kept move before it, which ends at ([\d.]+)s/u.exec(why);
  if (m) return msg("lint.spotCameraChained", { at: m[1]!, end: m[2]! });
  m = /^spotlight collides with its overlay — overlay\.camera: the move at ([\d.]+)s starts before the one before it is back at ([\d.]+)s;.*start it at ([\d.]+)s/u.exec(why);
  if (m) return msg("lint.spotCameraBack", { at: m[1]!, end: m[2]!, start: m[3]! });
  return why;
}

export function lint(file: string): Finding[] {
  const src = parseSource(file);
  const raw = readFileSync(file, "utf8").split("\n");
  // Поля сцены проверяет её поставщик: опечатка в значении — ошибка сценария, как при сборке.
  for (const scene of src.scenes) {
    try { providerFor(scene.provider, src.providers ?? {}).validate?.(scene, { dir: src.dir, lang: src.lang }); }
    catch (e) { throw new SourceError((e as Error).message); }
  }
  const pitch = toPitch(src);
  const cps = Number((src.voice as { cps?: number } | null)?.cps) > 0 ? Number((src.voice as { cps: number }).cps) : 15;
  const out: Finding[] = [];
  // Вариант на другом языке: видимое поле без перевода — текст оригинала в чужом ролике.
  for (const u of src.untranslated ?? []) {
    if (u.scene < 0 && u.key === "title") {
      out.push({ scene: "(film)", index: 0, ...finding("untranslated", msg("lint.untranslatedFilm", { lang: src.variant ?? "" })) });
    } else if (u.scene >= 0) {
      const sc = src.scenes[u.scene]!;
      const shown = [...SHOWN_COMMON, ...(specOf(sc, src.providers ?? {}).shown ?? [])];
      if (!shown.includes(u.key)) continue;
      // Накладка и фокус видны переводу только текстом: пометки, лупа и всплески без
      // единой надписи одинаковы на любом языке.
      if ((u.key === "overlay" || u.key === "spotlight") && !/"(text|title|subtitle|body)"\s*:/u.test(sc.fields[u.key] ?? "")) continue;
      out.push({ scene: sc.id, index: u.scene + 1, ...finding("untranslated", msg("lint.untranslatedScene",
        { line: u.n, field: u.key, lang: src.variant ?? "" })) });
    }
  }
  pitch.scenes.forEach((s: PitchScene, i: number) => {
    const n = i + 1;
    const add = (id: string, message: string): void => { out.push({ scene: s.id, index: n, ...finding(id, message) }); };
    const spec = specOf(s, src.providers ?? {});
    const spoken = (s.beats.length ? s.speechAt ?? 0 : 0) + s.beats.reduce((t, b) => t + Math.max(0.6, (b.speech ?? b.text).length / cps), 0);
    const duration = Math.max(s.duration ?? 0, spoken + (s.tail ?? pitch.tail ?? 0.4));

    // Правило 5: ширина двух строк берётся из той же зоны и темы, что у рендера.
    const frame = { width: Number(src.frame?.width ?? FORMATS.landscape.width), height: Number(src.frame?.height ?? FORMATS.landscape.height) };
    const line = subtitleMax(frame, src.safe, s.theme ?? pitch.theme ?? {}, src.captions?.size ?? 1);
    s.beats.forEach((b, k) => {
      if (b.text.length > line * 2) {
        add("overloaded-line", msg("lint.overloadedLine", { beat: k + 1, chars: b.text.length, limit: line * 2 }));
      }
    });

    // Правило 5: подпись и карточка не бывают на экране одновременно. Плашка
    // подписи уходит, пока едет камера, поэтому карточка на удержании камеры
    // законна; субтитры на удержании остаются — это речь для смотрящих без звука,
    // карточка стоит у предмета, а субтитр уступает ей, если она легла поверх.
    const captionFrom = (spec.effects?.caption as { from?: unknown } | undefined)?.from;
    const captionShown = s.beats.length > 0 && (src.captions?.everywhere
      || (captionFrom !== undefined && Number.parseFloat(String(captionFrom)) < 9999));
    const camera = (s.overlay?.camera ?? []).map((c) => [c.at, cameraEnd(c)] as const);
    const spotlit = (s.spotlight ?? []).length > 0;
    for (const card of s.overlay?.cards ?? []) {
      const from = card.at, to = card.at + (card.hold ?? cardHold(card));
      const covered = spotlit || camera.some(([a, b]) => a <= from + 0.2 && b >= to - 0.2);
      if (captionShown && !covered) {
        add("two-text-layers", msg("lint.cardCaption", { title: card.title, at: from.toFixed(1) }));
      }
    }
    const titles = s.overlay?.titles ?? [];
    for (const t of titles) {
      for (const card of s.overlay?.cards ?? []) {
        if (t.at < card.at + (card.hold ?? cardHold(card)) && card.at < t.at + (t.hold ?? 3)) {
          add("two-text-layers", msg("lint.titleCard", { title: t.text, card: card.title }));
        }
      }
    }

    // Титр у верхнего края поверх интерфейса ложится на его собственную шапку —
    // название приложения, поля, заголовок страницы, — и затемнение под титром
    // этого не спасает: две надписи читаются одной кашей.
    if (!spec.moving || s.video) {
      for (const t of titles) {
        if (t.position === "top") add("title-over-interface", msg("lint.titleOverInterface", { title: t.text }));
      }
    }

    // Переигрывание клипа кончается в пределах куска, который показывает сцена. Секунды `speed`
    // у сцены с `from` считаются от начала куска, и секунды исходника, записанные по привычке,
    // иначе всплывали отказом посреди сборки.
    if (s.video && s.speed?.length) {
      const clip = resolve(src.dir, String(s.page));
      const whole = existsSync(clip) ? clipLength(clip) : 0;
      if (whole > 0) {
        const piece = Math.min(s.trim?.to ?? whole, whole) - (s.trim?.from ?? 0);
        const end = Math.max(...s.speed.map(stepEnd));
        if (end > piece + 0.001) {
          // Подсказка по тому, какая ошибка вероятнее: секунды исходника вместо секунд куска (конец за
          // `from` и после вычитания ложится в кусок) — или просто перелёт за конец куска.
          const asSource = s.trim && end > s.trim.from && end - s.trim.from <= piece + 0.001;
          add("speed-range", asSource
            ? msg("lint.speedRangeSource", { end, piece: piece.toFixed(2), from: s.trim!.from, local: (end - s.trim!.from).toFixed(2) })
            : msg("lint.speedRange", { end, piece: piece.toFixed(2) }));
        }
      }
    }

    // Субтитры сверху и полоса хода сверху делят один край: полоса с названием части
    // накладывается на текст реплики поверх всего ролика, и сдвинуть её сцена не может.
    const capAt = s.captionsAt ?? src.captions?.position ?? "bottom";
    if (capAt === "top" && src.progress?.position === "top") {
      add("captions-top-progress", msg("lint.captionsTopProgress"));
    }

    // Дубль, снятый меньше кадра, растягивается и мылится: телефонная вёрстка при малой
    // CSS-ширине пишется в CSS-пикселях, и без множителя записи (`recordTake({ scale })`)
    // 432 точки ролика растягиваются на 1080.
    if (s.video && !s.device) {
      const clip = resolve(src.dir, String(s.page));
      const size = existsSync(clip) ? clipSize(clip) : null;
      const frame = src.reframe ?? { width: Number(src.frame?.width ?? 1920), height: Number(src.frame?.height ?? 1080) };
      if (size) {
        const kx = frame.width / size.width, ky = frame.height / size.height;
        const need = s.fit?.mode === "cover" ? Math.max(kx, ky) : Math.min(kx, ky);
        if (need > 1.25) {
          const take = existsSync(`${clip}.marks.json`);
          add("take-small", msg(take ? "lint.takeSmallRecorded" : "lint.takeSmallExternal",
            { clip: `${size.width}×${size.height}`, scale: need.toFixed(2), frame: `${frame.width}×${frame.height}` }));
        }
      }
    }

    // Кусок дубля, который переходит через отметку, не названную самой сценой, почти всегда
    // захватил следующий план: отметки ставят на границах планов, перед навигацией. Отметки,
    // которые сцена сама называет (фокус, стоп-кадр, контрольный кадр), — её внутренние моменты.
    if (s.video && s.trim) {
      const all = marksOf(resolve(src.dir, String(s.page)))?.marks ?? {};
      // Блок сцены в тексте сценария — от её заголовка до следующего заголовка сцены.
      const head = raw.findIndex((l) => new RegExp(`^##\\s+${s.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*·`).test(l));
      const tail = head < 0 ? -1 : raw.findIndex((l, k) => k > head && /^##\s/.test(l));
      const block = head < 0 ? [] : raw.slice(head, tail < 0 ? undefined : tail);
      // Отметка в подписи или заметке не превращает следующий план во внутренний момент.
      // Только момент контрольного кадра описывает состояние, которое сцена намеренно проходит.
      const checked = foldLines(block).map(({ line }) => line).filter((l) => /^stills:\s*/u.test(l))
        .flatMap((l) => l.slice(l.indexOf(":") + 1).split("|"))
        .map((part) => part.split("::", 1)[0]!.trim());
      const end = s.trim.to ?? Infinity;
      const crossed = Object.entries(all)
        .filter(([name, t]) => t > s.trim!.from + 0.05 && t < end - 0.05
          && !checked.some((moment) => new RegExp(`^@${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s*[+-]\\s*[\\d.]+)?$`).test(moment)))
        .sort((a, b) => a[1] - b[1]);
      if (crossed.length) {
        const [name, t] = crossed[0]!;
        add("piece-crosses-mark", msg("lint.pieceCrossesMark",
          { from: s.trim.from, end: Number.isFinite(end) ? end : "end", mark: name, at: t }));
      }
    }

    // По самому материалу: пустая ровная полоса в трети кадра и больше — заполнитель или
    // уехавшая страница; резкая смена экрана посреди куска не на отметке — незамеченная
    // навигация, и подпись о прежнем экране стоит над новым.
    if (s.video) {
      const clip = resolve(src.dir, String(s.page));
      if (existsSync(clip)) {
        const from = s.trim?.from ?? 0, to = s.trim?.to ?? (clipLength(clip) || from + 60);
        const W = 48, H = 64, FPS = 4;
        const frames = grayFrames(clip, from, to, FPS, W, H);
        if (frames.length) {
          const empty = frames.filter((f) => flatShare(f, W, H) >= 0.3).length / frames.length;
          if (empty > 0.3) add("empty-area", msg("lint.emptyArea", { percent: Math.round(empty * 100) }));
          const take = marksOf(clip);
          const marks = Object.values(take?.marks ?? {}).map((t) => t - from);
          if (take) {
            const jump = jumpsOf(frames, FPS).find((t) => t > 0.3 && !marks.some((m) => Math.abs(m - t) <= 0.6)
              && !(take.cameraMoves ?? []).some((move) => t + from >= move.from && t + from <= move.to));
            if (jump !== undefined) add("scene-jump", msg("lint.sceneJump", { at: jump.toFixed(1) }));
          }
        }
      }
    }

    // Переход встаёт на стык со сценой перед ним; у первой сцены стыка нет.
    if (i === 0 && s.transition) {
      add("first-transition", msg("lint.firstTransition"));
    }

    // Живой дубль несёт в пикселях свой слой — курсор, клик, клавиши, карточку — в той теме,
    // в которой его сняли. Показанный в сцене другой темы, он выглядит чужим, и пересборка
    // этого не исправит: переснять нужно сам дубль.
    const marksFile = s.video ? resolve(src.dir, `${s.page}.marks.json`) : "";
    if (marksFile && existsSync(marksFile)) {
      const recorded = (JSON.parse(readFileSync(marksFile, "utf8")) as { theme?: { id: string; name?: string; of?: string } }).theme;
      const vars = s.theme ?? pitch.theme ?? {};
      const want = themeFingerprint(vars);
      // Дубль, снятый до отпечатка по впекаемой части, помнит отпечаток всей темы.
      const same = recorded && (recorded.of === "baked" ? recorded.id === want.id
        : recorded.id === wholeThemeFingerprint(vars) || (recorded.name !== undefined && recorded.name === want.name));
      if (!recorded) {
        add("take-theme", msg("lint.takeThemeOld", { file: String(s.page), wanted: want.name ?? msg("lint.themeUnnamed"),
          hint: want.name ? `"${want.name}"` : msg("lint.themeUnnamed") }));
      } else if (!same) {
        add("take-theme", msg("lint.takeThemeMismatch", { file: String(s.page), recorded: recorded.name ?? msg("lint.themeOther"),
          wanted: want.name ?? msg("lint.themeOther"), hint: want.name ? `"${want.name}"` : msg("lint.themeUnnamed") }));
      }
    }

    // Фокус и лупа по области кадра: их геометрию видно в сценарии. Наезд с названным
    // увеличением, при котором область не помещается в кадр, режет цель; лупа, чей предмет
    // не входит в линзу предельного размера, рисуется с меньшим увеличением. Цель-селектор
    // меряет только рендер — о ней говорит отчёт сборки (`pushes`, `loupes` сцены).
    const pushed = [...(s.overlay?.camera ?? []).filter((c) => !c.pan).map((c) => ({ at: `${c.at}s`, scale: c.scale, area: c.area })),
      ...(s.spotlight ?? []).filter((f) => !f.pan).map((f) => ({ at: f.at, scale: f.scale, area: f.area }))];
    // У клипа в рамке устройства области переводятся в экран рамки только при сборке; о нём
    // скажет её отчёт, а по долям клипа lint назвал бы обрезку, которой нет.
    for (const c of s.device ? [] : pushed) {
      if (c.scale === undefined || !c.area) continue;
      const fit = fitScale(c.area[2], c.area[3]);
      if (c.scale > fit + 0.005) add("push-crop", msg("lint.pushCrop", { at: c.at, scale: c.scale ?? "", fit: fit.toFixed(2) }));
    }
    for (const l of s.overlay?.loupe ?? []) {
      if (!l.area) continue;
      const g = loupeLayout(l, { left: l.area[0] * frame.width, top: l.area[1] * frame.height, width: l.area[2] * frame.width, height: l.area[3] * frame.height }, frame);
      if (g.k < g.asked - 0.005) add("loupe-scale", msg("lint.loupeScale",
        { at: l.at, actual: g.k.toFixed(2), asked: g.asked }));
    }

    // Правило 9: в кадре ничто не стоит.
    // Пометка, блик, всплеск и лупа — тоже движение в кадре: штрих рисуется, полоса едет.
    const moves = Boolean(s.overlay?.camera?.length || s.focus?.length || spotlit || s.overlay?.titles?.length
      || s.overlay?.pointer?.length || s.overlay?.stickers?.length || s.overlay?.marks?.length
      || s.overlay?.glints?.length || s.overlay?.bursts?.length || s.overlay?.loupe?.length);
    const zoom = (s.effects?.zoom as { scale?: number } | undefined)?.scale ?? 1;
    // Страница, которая движется сама — CSS-анимацией, Web Animations, своим циклом кадров или по
    // времени сцены (`window.renderAt`, набор `data-type`, кинетика `data-kinetic` на странице с меткой `data-sc-page`), — не стоит: её
    // движение идёт по времени сцены так же, как слой композиции. Один `data-at` ничего не двигает:
    // слой лишь переводит якорь в секунды.
    const pageFile = !s.video ? resolve(src.dir, String(s.page)) : "";
    const animated = pageFile && pageMoves(pageFile);
    if (!spec.moving && duration > 5 && !moves && zoom <= 1 && !animated) {
      add("still-scene", msg("lint.stillPage", { duration: duration.toFixed(1) }));
    }
    // Своя страница автора с атрибутами слоя, но без метки: набор, кинетика и якоря не сработают.
    if (s.provider === "page" && pageFile && pageUnmarked(pageFile)) add("page-unmarked", msg("lint.pageUnmarked"));
    if (s.video && s.freezeAt !== undefined && !s.overlay?.camera?.length && !spotlit) {
      add("still-scene", msg("lint.stillVideo"));
    }

    // Фокусы — заранее, по оценке тактов: столкновение движений камеры иначе видит только
    // сборка. Удержание фокуса на видеосцене, под которым клип стоит дольше 2 с, читается как
    // зависание: такой отрезок проходят быстрее (`speed`) или держат короче.
    if (s.spotlight?.length) {
      const { starts, ends } = estimateBeats(s.beats, s.speechAt ?? 0, cps);
      try {
        const { compiled } = spotlightOverlay(s.spotlight, s.overlay, { starts: starts.length ? starts : [0], ends: ends.length ? ends : [duration],
          duration, video: Boolean(s.video) });
        const clip = s.video ? resolve(src.dir, String(s.page)) : "";
        if (clip && existsSync(clip) && !s.speed?.length) {
          compiled.resolved.forEach((r, k) => {
            const f = s.spotlight![k]!;
            if (f.slow !== undefined || r.hold <= 2) return;
            const from = r.at + (f.move ?? 0.8), cut = s.trim?.from ?? 0, still = frozenFor(clip, cut + from, cut + from + r.hold);
            if (still > 2) add("still-hold", msg("lint.stillHold", { index: k, from: from.toFixed(1),
              hold: r.hold.toFixed(1), still: still.toFixed(1), to: (from + r.hold).toFixed(1) }));
          });
        }
      } catch (e) { add("spotlight-collision", spotlightFinding((e as Error).message)); }
    }

    // Набираемые поля вида должны успеть до конца сцены. Страница набор ускоряет, но быстрее
    // полутора обычных скоростей он уже не читается: сцене нужна длительность или текст короче.
    const f = src.scenes[i]?.fields ?? {};
    for (const t of spec.typing ?? []) {
      const text = f[t.field]?.trim();
      if (!text || (t.unless && f[t.unless])) continue;
      const len = [...text].length, room = duration - 0.6 - t.from;
      const need = room > 0 ? len / room : Infinity;
      if (need > t.cps * 1.5) {
        const fits = t.from + 0.6 + len / (t.cps * 1.5);
        add("typing-too-fast", msg("lint.typingTooFast", { field: t.field, chars: len, from: t.from,
          end: duration.toFixed(1), pace: need === Infinity ? msg("lint.typingNoTime") : msg("lint.typingRate", { rate: need.toFixed(0) }),
          fits: fits.toFixed(1) }));
      }
    }

    // Число на слайде называет источник и дату (film craft 12, 56): цифра без них — снимок,
    // выданный за текущее положение, или число, которое неоткуда проверить.
    if (spec.numbers) {
      const note = f.note?.trim() ?? "";
      if (!/\b(?:19|20)\d\d\b/u.test(note)) {
        add("number-source", msg("lint.numberSource", { kind: s.kind }));
      }
    }

    // Слишком длинная сцена.
    if (duration > LONG) {
      add("long-scene", msg("lint.longScene", { duration: duration.toFixed(0), limit: LONG }));
    }
    // Караоке на плашке: непроизнесённое слово приглушено прозрачностью темы и держит 4,5:1. Тема
    // автора или бренда может его погасить; поставляемые темы держат порог (тест тем).
    if (src.captions?.style === "karaoke" && src.captions.look === "plate" && s.beats.length) {
      const c = karaokeRestContrast((s.theme ?? pitch.theme ?? {}) as Record<string, string>);
      if (c !== null && c < 4.5) add("karaoke-contrast", msg("lint.karaokeContrast", { ratio: c.toFixed(2) }));
    }
  });
  return out;
}

/** Признак клише облика: приём, взятый без причины (docs/visual-design.md). */
export interface Sign { id: string; scenes: string[]; message: string }

const DECORATIVE = new Set(["aurora", "mesh", "bokeh", "particles"]);
const PLACEHOLDER_URL = /^(?:$|https?:\/\/)?(?:$|(?:www\.)?(?:example\.(?:com|org)|localhost|127\.0\.0\.1|your[-\w]*\.\w+|app\.com|placeholder|acme\.\w+))/iu;
const EMOJI = /\p{Extended_Pictographic}/u;

/** Тема из жанровых (synthwave, blockbuster): их неон и металл — намеренный жанр. */
const genre = (vars: ThemeVars | undefined): boolean => Boolean(vars)
  && ["synthwave", "blockbuster"].some((n) => THEMES[n]!["--bg"] === vars!["--bg"] && THEMES[n]!["--display"] === vars!["--display"]);

/**
 * Признаки клише облика по сценарию. Не замечания: каждый приём бывает решением, поэтому
 * признаки не валят проверку, а считаются; четыре и больше — ролик средний, а не особенный
 * (docs/visual-design.md, «Why a film looks generated»). Трейлер узнаётся по его картам
 * (`slides.card`, `slides.titlecard`), виду `trailer` или жанровой теме: там удары, зерно и
 * капс — законный словарь жанра.
 */
export function clicheSigns(file: string): Sign[] {
  const src = parseSource(file);
  const pitch = toPitch(src);
  const out: Sign[] = [];
  const sign = (id: string, scenes: string[], message: string): void => { if (scenes.length) out.push({ id, scenes, message }); };
  const scenes = pitch.scenes.map((s, i) => ({ s, f: src.scenes[i]?.fields ?? {}, vars: s.theme ?? pitch.theme, spec: specOf(s, src.providers ?? {}) }));
  const trailer = scenes.some(({ spec }) => spec.trailer)
    || (src.look?.bars !== undefined && src.look?.grade === "teal-orange") || scenes.some(({ vars }) => genre(vars));
  if (!trailer) {
    sign("hit-outside-trailer", scenes.filter(({ f }) => f.flash || f.shake).map(({ s }) => s.id),
      msg("lint.clicheHit"));
    if ((src.look?.grain ?? 0) > 0) sign("grain", ["(film)"], msg("lint.clicheGrain"));
  }
  const sparkles = scenes.filter(({ s }) => (s.overlay?.bursts?.length ?? 0) + (s.overlay?.glints?.length ?? 0) > 0);
  const sparkleCount = scenes.reduce((n, { s }) => n + (s.overlay?.bursts?.length ?? 0) + (s.overlay?.glints?.length ?? 0), 0);
  if (sparkleCount > 2) sign("many-sparkles", sparkles.map(({ s }) => s.id), msg("lint.clicheSparkles", { count: sparkleCount }));
  const kinds = new Map<string, string[]>();
  for (const { s } of scenes) {
    const k = (s.transition as { kind?: string } | undefined)?.kind;
    if (k) kinds.set(k, [...(kinds.get(k) ?? []), s.id]);
  }
  if (kinds.size > 2) sign("transition-kinds", [...kinds.values()].flat(), msg("lint.clicheTransitions",
    { count: kinds.size, kinds: [...kinds.keys()].join(", ") }));
  sign("decorative-background", scenes.filter(({ f, vars, spec }) => spec.fields.includes("background") && !genre(vars) && !trailer
    && DECORATIVE.has(f.background?.trim() || vars?.["--bg-motion"] || "")).map(({ s }) => s.id),
    msg("lint.clicheBackground"));
  sign("placeholder-address", scenes.filter(({ f }) => /^\s*browser\b/u.test(f.device ?? "") && PLACEHOLDER_URL.test((f.device ?? "").replace(/^\s*browser\s*/u, "").trim()))
    .map(({ s }) => s.id), msg("lint.clicheAddress"));
  sign("kicker-caps", scenes.filter(({ f, vars, spec }) => spec.fields.includes("kicker") && !genre(vars) && !spec.trailer
    && (vars?.["--kicker-case"] === "uppercase" || ((f.kicker ?? "").replace(/[^\p{L}]/gu, "").length >= 4 && f.kicker === f.kicker!.toUpperCase())))
    .map(({ s }) => s.id), msg("lint.clicheKicker"));
  sign("emoji-icons", scenes.filter(({ f, spec }) => spec.icons !== undefined && EMOJI.test(f[spec.icons] ?? "")).map(({ s }) => s.id),
    msg("lint.clicheEmoji"));
  const enterable = scenes.filter(({ spec }) => spec.fields.includes("enter"));
  const entered = enterable.filter(({ f }) => f.enter);
  if (entered.length >= 3 && new Set(entered.map(({ f }) => f.enter!.trim())).size === 1 && entered.length === enterable.length) {
    sign("same-entrance", entered.map(({ s }) => s.id), msg("lint.clicheEntrance", { enter: entered[0]!.f.enter ?? "" }));
  }
  return out;
}

if (process.argv[1] && resolve(process.argv[1]).endsWith("lint.js")) {
  const file = process.argv[2] ?? "story.md";
  // Ошибка сценария — словами, как у остальных команд, а не дампом стека.
  let findings: Finding[];
  try { findings = lint(file); } catch (e) {
    const err = e as { sourceError?: boolean; code?: string; message?: string };
    if (!err.sourceError && err.code !== "ENOENT") throw e;
    console.error(err.code === "ENOENT" ? msg("source.notFound", { path: file })
      : msg("source.error", { path: file, why: String(err.message) }));
    process.exit(2);
  }
  const signs = clicheSigns(file);
  const cliches = { count: signs.length, signs,
    ...(signs.length >= 4 ? { verdict: msg("lint.clicheVerdict") } : {}) };
  // Признаки клише не валят проверку: каждый бывает решением, их число — предупреждение.
  console.log(JSON.stringify({ findings, ok: findings.length === 0, cliches }, null, 1));
  process.exit(findings.length ? 1 : 0);
}
