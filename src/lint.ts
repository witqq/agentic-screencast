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
import { resolve } from "node:path";
import { parseSource, SourceError, specOf, toPitch, type PitchScene } from "./source.js";
import { providerFor } from "./provider/index.js";
import { SHOWN_COMMON } from "./visible.js";
import { cameraEnd, cardHold } from "./overlay.js";
import { THEMES, themeFingerprint, wholeThemeFingerprint, type ThemeVars } from "./theme.js";
import { fitScale } from "./camera.js";
import { loupeLayout } from "./loupe.js";
import { FORMATS } from "./format.js";
import { estimateBeats, spotlightOverlay } from "./spotlight.js";
import { stepEnd } from "./speed.js";
import { marksOf } from "./marks.js";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

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

export interface Finding { scene: string; index: number; rule: string; message: string }

/** Две строки субтитров по 84 знака: больше на экране не держат (правило 5). */
const LINE = 84;
/** Сцена длиннее — это уже не кадр, а несколько кадров под одной подписью. */
const LONG = 25;

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
      out.push({ scene: "(film)", index: 0, rule: "untranslated", message: `the film title has no ${src.variant} translation; write title.${src.variant}: in the header` });
    } else if (u.scene >= 0) {
      const sc = src.scenes[u.scene]!;
      const shown = [...SHOWN_COMMON, ...(specOf(sc, src.providers ?? {}).shown ?? [])];
      if (!shown.includes(u.key)) continue;
      // Накладка и фокус видны переводу только текстом: пометки, лупа и всплески без
      // единой надписи одинаковы на любом языке.
      if ((u.key === "overlay" || u.key === "spotlight") && !/"(text|title|subtitle|body)"\s*:/u.test(sc.fields[u.key] ?? "")) continue;
      out.push({ scene: sc.id, index: u.scene + 1, rule: "untranslated", message: `line ${u.n}: ${u.key} is shown on screen and has no ${src.variant} translation; write ${u.key}.${src.variant}:` });
    }
  }
  pitch.scenes.forEach((s: PitchScene, i: number) => {
    const n = i + 1;
    const add = (rule: string, message: string): void => { out.push({ scene: s.id, index: n, rule, message }); };
    const spec = specOf(s, src.providers ?? {});
    const spoken = (s.beats.length ? s.speechAt ?? 0 : 0) + s.beats.reduce((t, b) => t + Math.max(0.6, (b.speech ?? b.text).length / cps), 0);
    const duration = Math.max(s.duration ?? 0, spoken + (s.tail ?? pitch.tail ?? 0.4));

    // Правило 5: не больше двух строк текста на экране.
    s.beats.forEach((b, k) => {
      if (b.text.length > LINE * 2) {
        add("overloaded-line", `beat ${k + 1} is ${b.text.length} characters — more than two subtitle lines (${LINE * 2}); split it into two beats`);
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
        add("two-text-layers", `card «${card.title}» at ${from.toFixed(1)}s shares the frame with the caption; hold it on a camera push-in, or move the words into the narration`);
      }
    }
    const titles = s.overlay?.titles ?? [];
    for (const t of titles) {
      for (const card of s.overlay?.cards ?? []) {
        if (t.at < card.at + (card.hold ?? cardHold(card)) && card.at < t.at + (t.hold ?? 3)) {
          add("two-text-layers", `title «${t.text}» and card «${card.title}» are on screen together; give each its own moment`);
        }
      }
    }

    // Титр у верхнего края поверх интерфейса ложится на его собственную шапку —
    // название приложения, поля, заголовок страницы, — и затемнение под титром
    // этого не спасает: две надписи читаются одной кашей.
    if (!spec.moving || s.video) {
      for (const t of titles) {
        if (t.position === "top") add("title-over-interface", `title «${t.text}» sits at the top of an interface, over its own header; put it at the centre, where the frame dims under it`);
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
          add("speed-range", `speed ends at ${end}s, but the clip the scene shows is ${piece.toFixed(2)}s long`
            + (asSource ? `; speed seconds count from the start of the piece (from: ${s.trim!.from}s of the source), so write ${(end - s.trim!.from).toFixed(2)}s, not ${end}s`
              : `; end the speed at ${piece.toFixed(2)}s at the latest, or lengthen the piece (to)`));
        }
      }
    }

    // Субтитры сверху и полоса хода сверху делят один край: полоса с названием части
    // накладывается на текст реплики поверх всего ролика, и сдвинуть её сцена не может.
    const capAt = s.captionsAt ?? src.captions?.position ?? "bottom";
    if (capAt === "top" && src.progress?.position === "top") {
      add("captions-top-progress", "subtitles stand at the top and so does the progress bar with the part label; put one of them at the bottom (progress.position or captions)");
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
          add("take-small", `the clip is ${size.width}×${size.height} and is enlarged ${need.toFixed(2)}× to fill the ${frame.width}×${frame.height} frame, so it goes soft; `
            + (take ? "record it at the frame's size — recordTake({ viewport, scale }) records a phone layout in device pixels" : "take a larger file of the same clip if the source has one"));
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
      const block = head < 0 ? "" : raw.slice(head, tail < 0 ? undefined : tail).join("\n");
      const end = s.trim.to ?? Infinity;
      const crossed = Object.entries(all)
        .filter(([name, t]) => t > s.trim!.from + 0.05 && t < end - 0.05 && !new RegExp(`@${name}(?![\\w-])`).test(block))
        .sort((a, b) => a[1] - b[1]);
      if (crossed.length) {
        const [name, t] = crossed[0]!;
        add("piece-crosses-mark", `the piece ${s.trim.from}–${Number.isFinite(end) ? end : "end"}s of the take runs past @${name} (${t}s), which this scene does not name — the next shot starts there; end the piece at to: @${name}`);
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
          if (empty > 0.3) add("empty-area", `in ${Math.round(empty * 100)}% of the scene's frames a third of the picture or more is one flat colour — an empty filler or a page that slid away; fill the frame with the real screen, move the subtitles instead of padding the content (film craft 53)`);
          const marks = Object.values(marksOf(clip)?.marks ?? {}).map((t) => t - from);
          if (marksOf(clip)) {
            const jump = jumpsOf(frames, FPS).find((t) => t > 0.3 && !marks.some((m) => Math.abs(m - t) <= 0.6));
            if (jump !== undefined) add("scene-jump", `the screen changes abruptly ${jump.toFixed(1)}s into the piece, where the take has no mark — a navigation inside the shot; end the piece at a mark placed before it (film craft 54)`);
          }
        }
      }
    }

    // Переход встаёт на стык со сценой перед ним; у первой сцены стыка нет.
    if (i === 0 && s.transition) {
      add("first-transition", "the first scene has no scene before it, so its transition is never played; move it to the second scene or remove it");
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
        add("take-theme", `the take ${s.page} was recorded before takes stored their theme, so its cursor, clicks and cards may not match the scene's ${want.name ?? "theme"}; to be sure, record it again with theme: ${want.name ? `"${want.name}"` : "the scene's theme"}`);
      } else if (!same) {
        add("take-theme", `the take ${s.page} was recorded in ${recorded.name ?? "another theme"}, the scene wears ${want.name ?? "another theme"}; record it again with theme: ${want.name ? `"${want.name}"` : "the scene's theme"}`);
      }
    }

    // Фокус и лупа по области кадра: их геометрию видно в сценарии. Наезд с названным
    // увеличением, при котором область не помещается в кадр, режет цель; лупа, чей предмет
    // не входит в линзу предельного размера, рисуется с меньшим увеличением. Цель-селектор
    // меряет только рендер — о ней говорит отчёт сборки (`pushes`, `loupes` сцены).
    const frame = { width: Number(src.frame?.width ?? FORMATS.landscape.width), height: Number(src.frame?.height ?? FORMATS.landscape.height) };
    const pushed = [...(s.overlay?.camera ?? []).filter((c) => !c.pan).map((c) => ({ at: `${c.at}s`, scale: c.scale, area: c.area })),
      ...(s.spotlight ?? []).filter((f) => !f.pan).map((f) => ({ at: f.at, scale: f.scale, area: f.area }))];
    // У клипа в рамке устройства области переводятся в экран рамки только при сборке; о нём
    // скажет её отчёт, а по долям клипа lint назвал бы обрезку, которой нет.
    for (const c of s.device ? [] : pushed) {
      if (c.scale === undefined || !c.area) continue;
      const fit = fitScale(c.area[2], c.area[3]);
      if (c.scale > fit + 0.005) add("push-crop", `the push-in at ${c.at} scales ×${c.scale}, but its area stays whole in the frame only up to ×${fit.toFixed(2)}; drop scale to fit it or name a smaller area`);
    }
    for (const l of s.overlay?.loupe ?? []) {
      if (!l.area) continue;
      const g = loupeLayout(l, { left: l.area[0] * frame.width, top: l.area[1] * frame.height, width: l.area[2] * frame.width, height: l.area[3] * frame.height }, frame);
      if (g.k < g.asked - 0.005) add("loupe-scale", `the loupe at ${l.at}s magnifies ×${g.k.toFixed(2)} instead of ×${g.asked}: its area does not fit a lens of the largest size at that scale; name a smaller area`);
    }

    // Правило 9: в кадре ничто не стоит.
    // Пометка, блик, всплеск и лупа — тоже движение в кадре: штрих рисуется, полоса едет.
    const moves = Boolean(s.overlay?.camera?.length || s.focus?.length || spotlit || s.overlay?.titles?.length
      || s.overlay?.pointer?.length || s.overlay?.stickers?.length || s.overlay?.marks?.length
      || s.overlay?.glints?.length || s.overlay?.bursts?.length || s.overlay?.loupe?.length);
    const zoom = (s.effects?.zoom as { scale?: number } | undefined)?.scale ?? 1;
    // Страница, которая движется сама — CSS-анимацией, Web Animations, своим циклом кадров или по
    // времени сцены (`window.renderAt`, набор `data-type`, кинетика `data-kinetic`), — не стоит: её
    // движение идёт по времени сцены так же, как слой композиции. Один `data-at` ничего не двигает:
    // слой лишь переводит якорь в секунды.
    const pageFile = !s.video ? resolve(src.dir, String(s.page)) : "";
    const animated = pageFile && existsSync(pageFile)
      && /@keyframes|animation(?:-name)?\s*:|\.animate\(|requestAnimationFrame|\brenderAt\s*=|\bdata-(?:type|kinetic)\s*=/u.test(readFileSync(pageFile, "utf8"));
    if (!spec.moving && duration > 5 && !moves && zoom <= 1 && !animated) {
      add("still-scene", `the page stands still for ${duration.toFixed(1)}s; add a camera move, a spotlight or a focus that follows the narration`);
    }
    if (s.video && s.freezeAt !== undefined && !s.overlay?.camera?.length && !spotlit) {
      add("still-scene", "a frozen frame without a camera move or highlight reads as a pause; push in on what the narration names");
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
            if (still > 2) add("still-hold", `spotlight[${k}] holds from ${from.toFixed(1)}s for ${r.hold.toFixed(1)}s while the clip stands still for ${still.toFixed(1)}s; pass that stretch faster with speed: [{"from":${from.toFixed(1)},"to":${(from + r.hold).toFixed(1)},"rate":2}], or end the focus sooner with until`);
          });
        }
      } catch (e) { add("spotlight-collision", (e as Error).message); }
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
        add("typing-too-fast", `the ${t.field} (${len} characters) is typed from ${t.from}s and must finish before the scene ends at ${duration.toFixed(1)}s — ${need === Infinity ? "no time is left" : `${need.toFixed(0)} characters per second, faster than can be read`}; make the scene at least ${fits.toFixed(1)}s or shorten the ${t.field}`);
      }
    }

    // Число на слайде называет источник и дату (film craft 12, 56): цифра без них — снимок,
    // выданный за текущее положение, или число, которое неоткуда проверить.
    if (spec.numbers) {
      const note = f.note?.trim() ?? "";
      if (!/\b(?:19|20)\d\d\b/u.test(note)) {
        add("number-source", `the ${s.kind} slide shows numbers with no source and date under them; write note: <where the numbers come from>, <date or month and year> (film craft 12, 56)`);
      }
    }

    // Слишком длинная сцена.
    if (duration > LONG) {
      add("long-scene", `about ${duration.toFixed(0)}s in one scene; split it into shots of one idea each (over ${LONG}s the viewer loses the thread)`);
    }
  });
  return out;
}

/** Признак клише облика: приём, взятый без причины (docs/visual-design.md). */
export interface Sign { rule: string; scenes: string[]; message: string }

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
  const sign = (rule: string, scenes: string[], message: string): void => { if (scenes.length) out.push({ rule, scenes, message }); };
  const scenes = pitch.scenes.map((s, i) => ({ s, f: src.scenes[i]?.fields ?? {}, vars: s.theme ?? pitch.theme, spec: specOf(s, src.providers ?? {}) }));
  const trailer = scenes.some(({ spec }) => spec.trailer)
    || (src.look?.bars !== undefined && src.look?.grade === "teal-orange") || scenes.some(({ vars }) => genre(vars));
  if (!trailer) {
    sign("hit-outside-trailer", scenes.filter(({ f }) => f.flash || f.shake).map(({ s }) => s.id),
      "flash or shake in a film that is not a trailer: an impact without its genre reads as noise (film craft 63)");
    if ((src.look?.grain ?? 0) > 0) sign("grain", ["(film)"], "film grain on a film that is not a trailer: grain belongs over filmed footage in a trailer, and it multiplies the file size (film craft 63)");
  }
  const sparkles = scenes.filter(({ s }) => (s.overlay?.bursts?.length ?? 0) + (s.overlay?.glints?.length ?? 0) > 0);
  const sparkleCount = scenes.reduce((n, { s }) => n + (s.overlay?.bursts?.length ?? 0) + (s.overlay?.glints?.length ?? 0), 0);
  if (sparkleCount > 2) sign("many-sparkles", sparkles.map(({ s }) => s.id), `${sparkleCount} bursts and glints: more than two a film and they stop meaning success`);
  const kinds = new Map<string, string[]>();
  for (const { s } of scenes) {
    const k = (s.transition as { kind?: string } | undefined)?.kind;
    if (k) kinds.set(k, [...(kinds.get(k) ?? []), s.id]);
  }
  if (kinds.size > 2) sign("transition-kinds", [...kinds.values()].flat(), `${kinds.size} kinds of transition (${[...kinds.keys()].join(", ")}): one or two a film, chosen for what the cut means (film craft 52)`);
  sign("decorative-background", scenes.filter(({ f, vars, spec }) => spec.fields.includes("background") && !genre(vars) && !trailer
    && DECORATIVE.has(f.background?.trim() || vars?.["--bg-motion"] || "")).map(({ s }) => s.id),
    "an aurora, mesh, bokeh or particles background as depth: the AI-startup look; a quiet grid or none, unless the motion is the subject");
  sign("placeholder-address", scenes.filter(({ f }) => /^\s*browser\b/u.test(f.device ?? "") && PLACEHOLDER_URL.test((f.device ?? "").replace(/^\s*browser\s*/u, "").trim()))
    .map(({ s }) => s.id), "a browser frame with no real address or a placeholder one: a frame is for the real address, a mockup is labelled as an illustration (film craft 60)");
  sign("kicker-caps", scenes.filter(({ f, vars, spec }) => spec.fields.includes("kicker") && !genre(vars) && !spec.trailer
    && (vars?.["--kicker-case"] === "uppercase" || ((f.kicker ?? "").replace(/[^\p{L}]/gu, "").length >= 4 && f.kicker === f.kicker!.toUpperCase())))
    .map(({ s }) => s.id), "a kicker in capitals over the slide: capitals belong to a trailer card or the film's title; write kickers in sentence case");
  sign("emoji-icons", scenes.filter(({ f, spec }) => spec.icons !== undefined && EMOJI.test(f[spec.icons] ?? "")).map(({ s }) => s.id),
    "emoji as feature icons: interchangeable icons are a template; one claim with its evidence, or a fact that sets each card apart");
  const enterable = scenes.filter(({ spec }) => spec.fields.includes("enter"));
  const entered = enterable.filter(({ f }) => f.enter);
  if (entered.length >= 3 && new Set(entered.map(({ f }) => f.enter!.trim())).size === 1 && entered.length === enterable.length) {
    sign("same-entrance", entered.map(({ s }) => s.id), `every slide enters the same way (${entered[0]!.f.enter}): the one entrance that matters is lost among the others`);
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
    console.error(`source ${file}: ${err.code === "ENOENT" ? "file not found" : err.message}`);
    process.exit(2);
  }
  const signs = clicheSigns(file);
  const cliches = { count: signs.length, signs,
    ...(signs.length >= 4 ? { verdict: "four or more signs of a template: the film is average, not distinctive; turn each into a decision or drop it (docs/visual-design.md)" } : {}) };
  // Признаки клише не валят проверку: каждый бывает решением, их число — предупреждение.
  console.log(JSON.stringify({ findings, ok: findings.length === 0, cliches }, null, 1));
  process.exit(findings.length ? 1 : 0);
}
