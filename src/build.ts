#!/usr/bin/env node
// Сборщик: сценарий → озвучка → сегменты (с кэшем) → склейка.
// Запуск: build.js --pitch pitch.json --out video.mp4 [--voice baya]
import { FLASH_DEFAULT, SHAKE_DEFAULT, hitsFilter, type FilmHit, type Hit } from "./effects.js";
import { fitFilter, type Fit } from "./fit.js";
import { renderScene, encode, DEFAULTS, ENCODE } from "./render.js";
import { speechFor } from "./speech.js";
import { selfHash } from "./self-hash.js";
import { engineFor, fingerprint, voiceKey } from "./voice/index.js";
import type { VoiceData } from "./source.js";
import type { RenderOpts, RenderScene } from "./render.js";
import { createHash } from "node:crypto";
import { cpus, totalmem } from "node:os";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import {
  readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, rmSync, renameSync,
} from "node:fs";
import { dirname, resolve, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { msg, useLang } from "./msg.js";
import { overlayEnd, parseOverlay, type SceneOverlay } from "./overlay.js";
import { filmTimeOf, speedFilter, type SpeedStep } from "./speed.js";
import { cameraFilter, fitScale, windowCentre, windowFilter } from "./camera.js";
import { detectTempo } from "./tempo.js";
import { loupeLayout, withLoupes, type LoupeAt } from "./loupe.js";
import { stageAssets } from "./stage-assets.js";
import { chaptersOf, filmPass, subtitleMax, writeChapters, writeSrt, type FilmScene } from "./film.js";
import { layerSafe } from "./part-label.js";
import type { Captions, Pip, Progress, SceneMusic, SfxCue } from "./source.js";
import { assembleVideo, timeline, transitionFrames } from "./assemble.js";
import { mixFilm, musicBeat, nextMusicBeat, type Music, type MusicCue, type Sfx } from "./mix.js";
import { MORPH, type MorphInput, type Transition } from "./transition.js";
import { anchorSeconds, compileSpotlights, spotlightOverlay, type Spotlight } from "./spotlight.js";
import { stillName, stillSteps, stillTime, type Still } from "./stills.js";
import { autoBand, bandShare } from "./capband.js";
import { actionZoomCues, autoZoomCues, marksOf, trimMarks, type AutoZoom, type Trim } from "./marks.js";
import { DEVICE_CSS, deviceLayout, deviceMarkup, type Device, type DeviceLayout } from "./device.js";
import type { Look } from "./look.js";
import type { Safe } from "./format.js";
import { ffmpegColour, resolveTheme } from "./theme.js";

/** Порог читаемости текста в кадре — доля короткой стороны: 48 точек на кадре 1080 (docs/vertical-video.md). */
const LEGIBLE_SHARE = 48 / 1080;
// Нижняя граница читаемого второстепенного текста в вертикальном кадре (docs/vertical-video.md,
// «Text»): 36 точек на 1080. Мельче неё сборка называет строки встроенного слайда.
const SMALL_SHARE = 36 / 1080;
const require = createRequire(import.meta.url);
const FFMPEG = require("ffmpeg-static");
const FFPROBE = require("@ffprobe-installer/ffprobe").path;
/**
 * `ffmpeg` без блокировки: сцены собираются по нескольку сразу, и синхронный вызов остановил бы
 * цикл событий — браузеры соседних сцен стояли бы, а их ожидания истекали бы по таймеру.
 */
const ffAsync = promisify(execFile);
const ff = (args: string[]): Promise<unknown> => ffAsync(FFMPEG, args, { maxBuffer: 64 * 1024 * 1024 });
const HERE = dirname(fileURLToPath(import.meta.url));
// Тяжёлое живёт там, куда укажет окружение: без этого прогон в изоляции
// обслуживается чужим кэшем и чужим окружением.
// Каталог данных (кэш, окружение синтеза, вывод) задаётся окружением.
// Умолчание — рядом с источником, а не в чужом проекте: продукт не должен
// знать, что где-то выше по дереву лежит каталог конкретной работы.
const TMP = resolve(process.env.AGENTIC_SCREENCAST_HOME ?? resolve(process.cwd(), ".agentic-screencast"));
const CACHE = `${TMP}/cache`;
// Рабочие файлы склейки этого процесса (`<имя>-<pid>.<расширение>`, недописанные сегменты) — не кэш:
// уходят при выходе, чтобы не копиться от сборки к сборке.
process.on("exit", () => {
  try {
    for (const f of readdirSync(CACHE)) if (f.includes(`-${process.pid}.`) || f.includes(`.${process.pid}.part.`)) rmSync(`${CACHE}/${f}`, { force: true });
  } catch { /* кэша ещё нет */ }
});


/**
 * Чем озвучена реплика — по ответу движка, сохранённому рядом с записью.
 * Неизвестно, если файла ответа нет: звук положили в кэш руками, и врать
 * про его происхождение хуже, чем сказать, что оно неизвестно.
 */
function voicedBy(wav: string): string {
  const side = `${wav}.json`;
  if (!existsSync(side)) return msg("build.unknownVoice");
  try {
    return String((JSON.parse(readFileSync(side, "utf8")) as { engine?: string }).engine ?? msg("build.unknownVoice"));
  } catch {
    return msg("build.unknownVoice");
  }
}

/** Значение флага командной строки; `d` — умолчание. */
function arg(k: string): string | undefined;
function arg(k: string, d: string): string;
function arg(k: string, d?: string): string | undefined {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
}

/** Такт речи так, как его видит сборка. */
type Rect = { left: number; top: number; width: number; height: number };

interface BuiltBeat {
  text: string;
  speech?: string;
  /** строка, отданная движку */
  __speech?: string;
  /** длина звука такта */
  __spoken?: number;
  /** файл звука в кэше */
  __wav?: string;
  __key?: string;
}

/** Сцена сборки вместе с тем, что сборщик о ней вычислил по ходу. */
interface BuiltScene {
  id: string;
  page: string;
  caption: string;
  beats: BuiltBeat[];
  tail?: number;
  duration: number;
  freezeAt?: number;
  fit?: Fit;
  /** кусок дубля: секунды исходного клипа */
  trim?: Trim;
  speed?: SpeedStep[];
  overlay?: SceneOverlay;
  chapter?: string;
  transition?: Transition;
  sfx?: SfxCue[];
  music?: SceneMusic;
  speechAt?: number;
  captionsAt?: "bottom" | "top" | "middle" | "auto";
  flash?: Hit[];
  shake?: Hit[];
  spotlight?: Spotlight[];
  /** контрольные кадры сцены */
  stills?: Still[];
  autoZoom?: AutoZoom;
  device?: Device;
  /** начала тактов в секундах от начала сцены */
  __starts?: number[];
  __spoken?: number;
  __seg?: string;
  __wav?: string;
  __key?: string;
  /** начало сцены во времени ролика */
  __at?: number;
  /** куда пришлись фокусы внимания, секунды сцены */
  __spotlights?: Array<{ at: number; hold: number }>;
  /** сколько кликов дали наезды */
  __autoZoom?: number;
  /** чем рисуется сцена-страница: нужно переходу общим элементом, чтобы снять её кадр без предмета */
  __render?: RenderScene;
  [key: string]: unknown;
}

const md5 = (b: string | Buffer): string => createHash("md5").update(b).digest("hex");
const md5file = (p: string): string => md5(readFileSync(p));
/** Хеш всех файлов каталога — для подложек с их стилями и шрифтами. */
function md5tree(p: string): string {
  // Отсутствие подложки — ошибка сборки, а не пустой хеш: иначе сцена
  // с опечаткой в пути молча попадёт в кэш и никогда не пересоберётся.
  if (!existsSync(p)) throw new Error(msg("build.noPage", { path: p }));
  if (statSync(p).isFile()) return /\.html?$/i.test(p) ? md5page(p) : md5file(p);
  return md5(readdirSync(p).sort().map((f) => f + md5tree(join(p, f))).join("|"));
}

/**
 * Хеш страницы вместе с тем, что она подгружает по относительным путям: картинки, стили, скрипты,
 * вложенные страницы и `url()` в стилях. Без этого смена картинки рядом со страницей не меняла
 * ключ, и сцена приходила из кэша со старой картинкой. Весь каталог страницы не хешируется: рядом
 * со страницей часто лежат сценарий, готовый ролик и кэш, и сцена не попадала бы в кэш никогда.
 */
function md5page(p: string, seen = new Set<string>(), root = dirname(p)): string {
  seen.add(p);
  const body = readFileSync(p);
  if (!/\.(html?|css)$/i.test(p)) return md5(body);
  const refs = new Set<string>();
  for (const m of body.toString("utf8").matchAll(/(?:\b(?:src|href|poster|data)\s*=\s*["']|url\(\s*["']?|@import\s+["'])([^"')\s?#]+)/gi)) {
    const ref = m[1]!;
    if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(ref)) continue;
    refs.add(resolve(dirname(p), decodeURIComponent(ref)));
  }
  // Путь в ключе — от каталога страницы: перенос проекта целиком кэш не сбрасывает. Каталог
  // страница не грузит, и он не хешируется.
  const parts = [...refs].sort().map((f) => {
    const name = relative(root, f);
    if (seen.has(f)) return name;
    if (!existsSync(f)) return `${name}:missing`;
    return statSync(f).isFile() ? `${name}:${md5page(f, seen, root)}` : name;
  });
  return md5([md5(body), ...parts].join("|"));
}

// Версии внешних исполнителей: они тоже влияют на байты.
const ver = (bin: string, a: string[] = ["-version"]): string =>
  execFileSync(bin, a, { encoding: "utf8" }).split("\n")[0];
const BROWSER_VER = execFileSync("node", ["-e",
  "import('playwright').then(p=>process.stdout.write(p.chromium.executablePath()))"],
  { encoding: "utf8", cwd: HERE });
// Хеш собственных исходников: без него исправление дефекта в ядре
// не пересобирает ничего, и сборка отдаёт старые сегменты из кэша.
// Считается ОБХОДОМ каталога, а не списком: новый файл инструмента
// (например слой слайдов) обязан менять ключ сам по себе.
const SELF = selfHash();

function keyOf(
  scene: Record<string, unknown>,
  neighbours: Array<string | null>,
  voice: VoiceData,
  opts: RenderOpts,
  SRC: string,
): string {
  return md5(JSON.stringify({
    scene, neighbours, voice,
    render: { ...opts, gop: opts.fps * 2, audio: { rate: 48000, channels: 1 } },
    page: md5tree(resolve(SRC, String(scene.page))),
    self: SELF, ffmpeg: ver(FFMPEG), browser: BROWSER_VER,
  }));
}

const dur = (f: string): number => Number(execFileSync(FFPROBE, ["-v", "error", "-show_entries",
  "format=duration", "-of", "default=nw=1:nk=1", f], { encoding: "utf8" }).trim());

/**
 * Насколько разнообразен кусок картинки: среднеквадратичное отклонение яркости.
 *
 * Плоская заливка даёт около нуля, содержательный кусок — десятки. Числом, а не глазом: пустую
 * подсветку в готовом ролике замечает зритель, а не автор, и стоит это целого круга пересъёмки.
 */
function areaContrast(image: string, area: [number, number, number, number], size: { width: number; height: number }): number {
  const crop = [Math.round(area[2] * size.width), Math.round(area[3] * size.height),
    Math.round(area[0] * size.width), Math.round(area[1] * size.height)];
  const said = execFileSync(FFMPEG, ["-nostdin", "-v", "info", "-i", image,
    "-vf", `crop=${crop.join(":")},signalstats,metadata=print:key=lavfi.signalstats.YSTDEV`,
    "-f", "null", "-"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const found = /YSTDEV=([\d.]+)/.exec(said);
  return found ? Number(found[1]) : Number.NaN;
}

/** Ниже этого разнообразия подсвеченная область считается пустой: в ней нечего показывать. */
const EMPTY_AREA_CONTRAST = 8;


/**
 * Сколько сцен рисуется одновременно. Каждая сцена рисуется своим браузером от первого кадра до
 * последнего, как при одной; одновременно идут разные сцены. Под общей нагрузкой растеризатор
 * Chromium изредка округляет точку иначе (замер: PSNR не ниже 56 дБ против сборки по одной),
 * поэтому побайтовая пересборка — с `AGENTIC_SCREENCAST_JOBS=1`. Умолчание — треть ядер, не больше
 * четырёх: замер на 14 ядрах — 4 сцены уже загружают машину на 85–88 %, 6 и 8 не быстрее.
 */
/** Байт на точку снимка PNG в памяти: замер 24 кадров ролика-обзора 1920×1080 — в среднем 0,21, до 0,41. */
const PNG_BYTES_PER_PIXEL = 0.3;

function sceneJobs(): number {
  const raw = process.env.AGENTIC_SCREENCAST_JOBS;
  if (raw !== undefined && raw !== "") {
    const named = Number(raw);
    if (!Number.isInteger(named) || named < 1) throw new Error(msg("build.jobs", { raw }));
    return Math.min(named, 16);
  }
  return Math.max(1, Math.min(4, Math.floor(cpus().length / 3)));
}

async function main() {
  const PITCH_FILE = resolve(arg("pitch", "pitch.json"));
  // Подложки адресуются относительно ФАЙЛА-ИСТОЧНИКА, а не каталога
  // инструмента: иначе опубликованный продукт годен только из одного
  // места на диске.
  const SRC = dirname(PITCH_FILE);
  const pitch = JSON.parse(readFileSync(PITCH_FILE, "utf8")) as {
    scenes: BuiltScene[]; tail?: number;
    frame?: Partial<RenderOpts>; encode?: Partial<typeof ENCODE>; theme?: Record<string, string>;
    pronounce?: unknown; lang?: string; dir?: string;
    captions?: Captions; pip?: Pip; progress?: Progress; emoji?: { dir: string };
    music?: Music; sfx?: SfxCue[]; loudness?: number; audio?: boolean; motionBlur?: { samples: number; shutter: number };
    look?: Look;
    safe?: Safe;
    reframe?: { width: number; height: number };
    lookNote?: string;
  };
  // Ролик без темы (в том числе собранный из готового pitch) носит ночную тему из таблицы тем.
  // Ролик без темы носит neutral. Тема из готового pitch.json (старого или написанного руками)
  // проверяется так же, как в сценарии: неполная — ошибка с перечнем недостающего, а не падение
  // на первом отсутствующем токене посреди сборки.
  pitch.theme = resolveTheme(pitch.theme);
  const emojiDirs = pitch.emoji ? [resolve(pitch.dir ?? SRC, pitch.emoji.dir)] : [];
  // Темп музыки: названный в шапке — как есть; не названный — по самому файлу, с той
  // секунды, с которой музыка звучит в ролике. От него работают `snap` и якоря `m8`.
  let tempo: { bpm: number; offset: number; detected: boolean; confidence?: number } | null = null;
  if (pitch.music?.bpm) tempo = { bpm: pitch.music.bpm, offset: pitch.music.offset ?? 0, detected: false };
  else if (pitch.music) {
    const found = detectTempo(resolve(SRC, pitch.music.file), pitch.music.from ?? 0);
    if (found) {
      tempo = { bpm: found.bpm, offset: found.offset, detected: true, confidence: found.confidence };
      pitch.music = { ...pitch.music, bpm: found.bpm, offset: found.offset };
    }
  }
  // Данные голоса — объект целиком: провайдер, имя голоса и его собственные
  // параметры (темп у SpeechKit). Иначе третий параметр терялся бы между
  // сборщиком и драйвером, и добавление провайдера требовало бы правки сборщика.
  const voiceJson = arg("voice-json");
  // Умолчание — поставляемый движок. Silero больше не умолчание: он живёт
  // внешней реализацией, и молча уводить туда сборку значило бы обещать
  // окружение, которого у поставившего инструмент нет.
  const voice: VoiceData = voiceJson
    ? (JSON.parse(voiceJson) as VoiceData)
    : { engine: arg("engine", "speechkit"), name: arg("voice", "kuznetsov") };
  const semis = (voice as { pitch?: unknown }).pitch;
  useLang(pitch.lang);
  if (semis !== undefined && (typeof semis !== "number" || !Number.isFinite(semis) || semis < -12 || semis > 12 || semis === 0)) {
    console.error(msg("build.voicePitch"));
    process.exit(2);
  }
  // Кадр и кодирование приходят из ролика; умолчания — прежние числа.
  // Они входят в ключ сегмента: сменился размер или качество — кадры
  // обязаны пересобраться, а не прийти из кэша прежними.
  // Язык ролика — язык отказов этой сборки.
  const opts: RenderOpts = { ...DEFAULTS, ...pitch.frame,
    encode: { ...ENCODE, ...pitch.encode }, ...(pitch.motionBlur ? { motionBlur: pitch.motionBlur } : {}) };
  // Длина куска субтитров — одна на ролик: по ней режутся и субтитры кадра, и файл SRT.
  const subMax = subtitleMax(opts, pitch.safe, pitch.theme!, pitch.captions?.size ?? 1);
  // Зона слоя: без полосы названия части у края зоны площадки.
  const stageSafe = layerSafe(pitch, opts);
  // Одна названная сцена вместо всего ролика: этим живёт предпросмотр
  // на странице записи — человек прочитал такт и хочет увидеть, что
  // получилось, не пересобирая двадцать минут.
  //
  // Соседи в ключе сегмента при этом СОХРАНЯЮТСЯ: от них зависит переход,
  // и сегмент, собранный в одиночку, обязан быть тем же самым файлом,
  // что и в полном ролике, — иначе предпросмотр показывал бы одно,
  // а готовый ролик содержал другое.
  const only = arg("only");
  if (only && !pitch.scenes.some((s) => s.id === only)) {
    console.error(msg("build.noScene", { id: only }));
    process.exit(2);
  }
  mkdirSync(CACHE, { recursive: true });
  const log: Array<Record<string, unknown>> = [];
  /** места субтитров, выбранные сборкой для сцен с `captions: auto` */
  const autoPlaces: Array<{ scene: string; position: string }> = [];

  /**
   * Звук одного такта: из кэша либо у движка. Возвращает файл и длину.
   *
   * Ключ считается на ТАКТ, а не на сцену: перезапись одного такта обязана
   * пересобирать только его, а не всю речь сцены. Отпечаток спрашивается
   * до вычисления ключа и подмешивается, только если непуст, — правило
   * то же, что и прежде, и оно живёт в `voiceKey`.
   */
  async function voiceOf(speech: string): Promise<{ wav: string; key: string; spoken: number }> {
    // Сдвиг высоты (`pitch`, полутоны) — обработка готовой записи, а не просьба к движку: запись
    // одна на любую высоту, и её смена не синтезирует такт заново (у сетевого движка — не платит).
    const { pitch, ...base } = voice as VoiceData & { pitch?: number };
    const fp = await fingerprint(speech, base);
    const key = voiceKey(speech, base, fp);
    const wav = `${CACHE}/${key}.wav`;
    if (!existsSync(wav)) {
      try {
        const said = await engineFor(base).synth(speech, base, wav);
        writeFileSync(`${wav}.json`, JSON.stringify(said));
      } catch (e) {
        if ((e as { engineError?: boolean }).engineError) {
          console.error(String((e as Error).message));
          process.exit(1);
        }
        throw e;
      }
    }
    if (!pitch) return { wav, key, spoken: dur(wav) };
    // Высота меняется вместе со скоростью, а темп возвращается обратно: длина такта прежняя.
    const f = 2 ** (pitch / 12);
    const shifted = `${CACHE}/${key}.pitch${pitch}.wav`;
    if (!existsSync(shifted)) {
      execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-i", wav, "-af",
        `asetrate=${Math.round(48000 * f)},aresample=48000,atempo=${(1 / f).toFixed(6)}`, "-ar", "48000", "-ac", "1", shifted]);
    }
    // Кто озвучил такт — тот же движок, что записал исходник: без этой пометки у сдвинутой записи
    // отчёт ключей говорил «неизвестно».
    if (!existsSync(`${shifted}.json`) && existsSync(`${wav}.json`)) {
      writeFileSync(`${shifted}.json`, JSON.stringify({ ...JSON.parse(readFileSync(`${wav}.json`, "utf8")), pitch }));
    }
    return { wav: shifted, key: md5(`${key}|pitch${pitch}`), spoken: dur(shifted) };
  }

  /**
   * Речь сцены целиком: такты подряд, одним файлом.
   *
   * Склейка идёт ЧЕРЕЗ ФАЙЛ СПИСКА, а не пересжатием: такты уже приведены
   * к формату договора, и второй проход через кодек менял бы звук, который
   * человек записал. Имя файла — от ключей тактов, поэтому перезапись
   * одного такта даёт другой файл склейки, а не берёт прежний из кэша.
   */
  function joinBeats(beats: BuiltBeat[]): string {
    if (beats.length === 1) return beats[0]!.__wav!;
    const key = md5(beats.map((b) => b.__key).join("|"));
    const out = `${CACHE}/join-${key}.wav`;
    if (!existsSync(out)) {
      const list = `${CACHE}/join-${key}.txt`;
      writeFileSync(list, beats.map((b) => `file '${b.__wav}'`).join("\n"));
      execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-f", "concat",
        "-safe", "0", "-i", list, "-ar", "48000", "-ac", "1", out]);
    }
    return out;
  }

  /**
   * Клип сцены с переигранными кусками — или сам исходный файл, когда
   * переигрывать нечего.
   *
   * Переигрывание делается ОТДЕЛЬНЫМ проходом и кладётся в кэш, а не
   * вклеивается в фильтр сегмента: длина сцены считается по длине
   * материала, и считать её до переигрывания значило бы обрезать
   * замедленный кусок ровно на том месте, ради которого он и замедлен.
   */
  function clipOf(s: BuiltScene): string {
    const src = trimmed(s);
    if (!s.video || !s.speed?.length) return src;
    if (!existsSync(src)) throw new Error(msg("build.noPage", { path: src }));
    // Отказ называет сцену: «кусок кончается за пределами клипа» без
    // имени сцены в ролике из двадцати сцен искать нечем.
    let filter: string | null;
    try { filter = speedFilter(s.speed, dur(src), opts.fps); }
    catch (e) {
      // Частая причина — секунды исходника вместо секунд куска: у сцены с from они считаются от него.
      const hint = s.trim ? msg("build.speedHint", { from: s.trim.from }) : "";
      throw new Error(msg("build.sceneError", { id: s.id, why: `${(e as Error).message}${hint}` }));
    }
    if (!filter) return src;
    const key = md5(JSON.stringify({ speed: s.speed, page: md5file(src) }));
    const out = `${CACHE}/speed-${key}.mp4`;
    if (!existsSync(out)) {
      execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-i", src,
        "-filter_complex", filter, "-map", "[v]", "-an",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", out]);
    }
    return out;
  }

  /**
   * Кусок дубля (`from`/`to` сцены), вырезанный в кэш с перекодированием: резка по опорным кадрам
   * сдвинула бы начало куска, а с ним — все отметки, посчитанные от него.
   */
  function trimmed(s: BuiltScene): string {
    const src = resolve(SRC, String(s.page));
    if (!s.video || !s.trim) return src;
    if (!existsSync(src)) throw new Error(msg("build.noPage", { path: src }));
    const whole = dur(src);
    if (s.trim.from >= whole) throw new Error(msg("build.trimPast", { id: s.id, from: s.trim.from, whole: whole.toFixed(2) }));
    const to = Math.min(s.trim.to ?? whole, whole);
    const out = `${CACHE}/trim-${md5(JSON.stringify({ from: s.trim.from, to, page: md5file(src) }))}.mp4`;
    if (!existsSync(out)) {
      execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-ss", String(s.trim.from), "-i", src, "-t", (to - s.trim.from).toFixed(3),
        "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", out]);
    }
    return out;
  }

  /**
   * Рамка устройства вокруг клипа. Клип встаёт в экран рамки, а области камеры
   * сцены — доли КЛИПА, как их и видит автор, — переводятся в доли кадра:
   * иначе наезд на кнопку в клипе попадал бы мимо, на корпус рамки.
   */
  function deviceFor(s: BuiltScene, src: string): { layout: DeviceLayout; overlay?: SceneOverlay; html: string } | null {
    if (!s.device) return null;
    const said = execFileSync(FFPROBE, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
      "-of", "csv=p=0:s=x", src], { encoding: "utf8" }).trim();
    const [cw, ch] = said.split("x").map(Number);
    const W = opts.width, H = opts.height;
    const box = H > W ? { x: W * 0.05, y: H * 0.1, w: W * 0.9, h: H * 0.8 } : { x: W * 0.07, y: H * 0.08, w: W * 0.86, h: H * 0.84 };
    const layout = deviceLayout(s.device, box, cw && ch ? cw / ch : undefined);
    const sc = layout.screen;
    const map = (a: [number, number, number, number]): [number, number, number, number] =>
      [(sc.x + a[0] * sc.w) / W, (sc.y + a[1] * sc.h) / H, (a[2] * sc.w) / W, (a[3] * sc.h) / H];
    const overlay = s.overlay ? { ...s.overlay, camera: s.overlay.camera?.map((c) => (c.area ? { ...c, area: map(c.area) } : c)) } : undefined;
    return { layout, overlay, html: deviceMarkup(layout, { surround: { width: W, height: H } }) };
  }

  // Время ролика, с которого начинается очередная сцена: переход сдвигает
  // следующую сцену на свою длину раньше. Нужно для привязки переходов к долям
  // музыки; при сборке одной сцены его не знает никто, и привязка не делается.
  let clock = 0;
  const jobs: Array<() => Promise<void>> = [];
  const weights: number[] = [];
  const slots: Array<Array<Record<string, unknown>>> = [];
  const t0 = Date.now();
  for (const s of pitch.scenes) {
    // Чужие сцены при одиночной сборке не озвучиваются и не рисуются:
    // за ключом сегмента нужны только имена соседей, а они известны
    // из списка. Иначе предпросмотр одной сцены стоил бы синтеза всего
    // ролика — то есть денег.
    if (only && s.id !== only) continue;
    if (s.overlay) s.overlay = parseOverlay(JSON.stringify(s.overlay));
    // 1. Озвучка. Текст для синтеза ≠ текст на экране, и правила чтения
    //    принадлежат провайдеру: Silero молча пропускает латиницу, поэтому
    //    её переписывают кириллицей, а SpeechKit читает её сам.
    //    В кадре при этом остаётся исходное написание из `caption`.
    // Правила чтения выбираются по имени, названному данными голоса.
    // Обычно это имя движка, но у ПОСТОРОННЕЙ реализации имя — путь
    // к программе, и по нему правил не найти. Поэтому данные голоса
    // могут назвать правила прямо: `"rules": "silero"`. Без этого
    // внешний Silero молча проглатывал бы латиницу — тот самый дефект,
    // ради которого переписывание и заводилось.
    // Правила чтения называет ролик; данные голоса могут их перебить,
    // потому что чтение зависит и от того, кто читает. Имя движка
    // правилами больше не считается: инструмент не знает, на каком
    // языке ролик, и решать это за автора не вправе.
    const rules = voice.rules ?? pitch.pronounce;
    // Такт за тактом: у каждого своя строка синтеза, свой ключ, свой звук
    // и своя длина. Начала тактов копятся по ходу — по ним расписание
    // картинки узнаёт, когда наступает каждый кусок речи.
    const starts: number[] = [];
    // Речь может начаться не с начала сцены (`speechAt`): сначала удар или картинка, потом голос.
    // Начала тактов сдвигаются вместе с ней — по ним сдвигаются и субтитры, и окна приглушения.
    const lead = s.beats.length ? s.speechAt ?? 0 : 0;
    let spoken = lead;
    for (const b of s.beats) {
      const speech = b.speech ?? speechFor(rules, b.text, pitch.dir ?? SRC);
      const got = await voiceOf(speech);
      b.__speech = speech;
      b.__wav = got.wav;
      b.__key = got.key;
      b.__spoken = got.spoken;
      starts.push(spoken);
      spoken += got.spoken;
    }
    s.__starts = starts;
    // Моменты накладки, названные якорями тактов, — по ИЗМЕРЕННОЙ речи: разбор ставил их по оценке.
    if (s.overlayRaw) {
      const ends = s.beats.map((b, k) => starts[k]! + (b.__spoken ?? 0));
      const duration = Math.max(spoken, s.duration ?? 0);
      try { s.overlay = parseOverlay(String(s.overlayRaw), (a) => anchorSeconds(a, starts.length ? starts : [0], duration, ends)); }
      catch (e) { console.error(msg("build.sceneError", { id: s.id, why: (e as Error).message })); process.exit(2); }
    }
    // Фокусы внимания переводятся в камеру, карточки и замедление по
    // ИЗМЕРЕННЫМ тактам: смена голоса или темпа сдвигает их вместе с речью.
    if (s.spotlight?.length) {
      const ends = s.beats.map((b, k) => starts[k]! + (b.__spoken ?? 0));
      let compiled: ReturnType<typeof compileSpotlights>;
      try {
        ({ compiled, overlay: s.overlay } = spotlightOverlay(s.spotlight, s.overlay, { starts, ends,
          duration: Math.max(spoken, s.duration ?? 0), video: Boolean(s.video) }));
      } catch (e) { console.error(msg("build.sceneError", { id: s.id, why: (e as Error).message })); process.exit(2); }
      if (compiled.speed.length) s.speed = compiled.speed;
      s.__spotlights = compiled.resolved;
    }
    // Наезды к местам кликов живого дубля: клики лежат в файле отметок рядом с роликом.
    if (s.autoZoom && s.video) {
      const take = trimMarks(marksOf(resolve(SRC, String(s.page))), s.trim);
      const clicks = take?.clicks ?? [];
      // Дубль, записавший действия с элементами, наезжает по действиям; прежний — по кликам.
      const cues = take?.actions?.length ? actionZoomCues(take.actions, clicks, s.autoZoom) : autoZoomCues(clicks, s.autoZoom);
      try {
        s.overlay = parseOverlay(JSON.stringify({ ...s.overlay,
          camera: [...(s.overlay?.camera ?? []), ...cues].sort((a, b) => a.at - b.at) }));
      } catch (e) { console.error(msg("build.autoZoomCollision", { id: s.id, why: (e as Error).message })); process.exit(2); }
      s.__autoZoom = clicks.length;
    }
    // Клип берётся уже переигранным: и длина сцены, и кадры считаются
    // по тому материалу, который попадёт в ролик.
    const clip = s.video ? clipOf(s) : "";
    if (!s.beats.length && s.video && s.freezeAt === undefined && s.duration === undefined) {
      // Длину задаёт сам материал: иначе сцена длилась бы только хвост
      // тишины, то есть мелькала бы. Названная `duration` сильнее файла: клип
      // длиннее неё обрезается, короче — достаивается последним кадром.
      spoken = dur(clip);
    }
    // Пауза на стыке сцен. Без неё длительность сцены равна длине реплики,
    // и следующая начинается ровно на последнем слоге предыдущей: граница
    // сцены попадает в речь, а не в тишину. Хвост задаётся данными
    // (`tail` у сцены или у питча) и добивается тишиной шагом ниже.
    // Переход в следующую сцену съедает конец этой: хвост тишины обязан быть
    // не короче перехода, иначе последние слова реплики ушли бы под чужую
    // картинку и наложились на речь следующей сцены.
    const index = pitch.scenes.indexOf(s);
    const into = pitch.scenes[index + 1]?.transition;
    const tail = Math.max(s.tail ?? pitch.tail ?? 0.4, into ? into.duration + 0.15 : 0);
    let frames = Math.ceil(Math.max(spoken + tail, s.duration ?? 0,
      s.overlay ? overlayEnd(s.overlay) + 0.25 : 0) * opts.fps);
    // Переход «в долю»: сцена продлевается до ближайшей доли музыки, чтобы
    // склейка пришлась на ритм. Сцена только растёт — речь не обрезается.
    if (into?.snap && pitch.music?.bpm && !only) {
      const start = clock + frames / opts.fps - transitionFrames(into, opts.fps) / opts.fps;
      const beat = nextMusicBeat(start, pitch.music.bpm, pitch.music.offset ?? 0);
      frames += Math.round((beat - start) * opts.fps);
    }
    s.duration = frames / opts.fps;
    s.__spoken = spoken;
    s.__at = clock;
    clock += s.duration - (into ? transitionFrames(into, opts.fps) / opts.fps : 0);
    // На стыке с переходом затемнения нет: переход сам ведёт из сцены в сцену.
    if ((s.transition && index > 0) || into) {
      const fx: Record<string, unknown> = Object.assign({}, s.effects);
      const fade = { ...(fx.fade as Record<string, unknown> | undefined) };
      if (s.transition && index > 0) fade.in = 0;
      if (into) fade.out = 0;
      fx.fade = fade;
      s.effects = fx;
    }

    // 2. Сегмент: рендер или кэш.
    // Текст синтеза входит в ключ: смена правил чтения обязана пересобрать сегмент.
    // Соседи в ключе — только непосредственные: от них зависит переход.
    // Весь список сделал бы добавление сцены в конец причиной пересборки всего.
    const i = pitch.scenes.indexOf(s);
    const neighbours = [pitch.scenes[i - 1]?.id ?? null, pitch.scenes[i + 1]?.id ?? null];
    // Эмодзи и картинки стикеров слой получает готовыми, а их отпечаток идёт
    // в ключ: иначе замена картинки под тем же именем не пересобрала бы сцену.
    let assets: ReturnType<typeof stageAssets>;
    try {
      assets = stageAssets({ overlay: s.overlay, texts: [s.caption, ...s.beats.map((b) => b.text)],
        pageFile: s.video ? undefined : resolve(SRC, String(s.page)), srcDir: SRC, cache: CACHE, emojiDirs });
    } catch (e) {
      console.error(msg("build.sceneError", { id: s.id, why: (e as Error).message }));
      process.exit(1);
    }
    // Место субтитров `auto` решается по кадру самой сцены: клип смотрится как его впишет
    // сцена, нарисованная сцена — одним кадром без подписи посередине своей длительности.
    let captionPos = s.captionsAt ?? pitch.captions?.position;
    if (captionPos === "auto") {
      const zone = stageSafe ?? { top: Math.round(opts.height * 0.03), bottom: Math.round(opts.height * 0.03) };
      const theme = (s.theme ?? pitch.theme) as Record<string, string>;
      captionPos = await autoBand({ frame: { width: opts.width, height: opts.height }, zone,
        share: bandShare({ width: opts.width, height: opts.height }, Boolean(pitch.safe), pitch.captions?.size ?? 1),
        ...(s.video
          ? { clip: { file: resolve(SRC, String(s.page)), from: s.trim?.from ?? 0, to: (s.trim?.from ?? 0) + s.duration!,
            vf: fitFilter(s.fit, opts.width, opts.height, ffmpegColour(theme["--sc-letterbox"]!)) } }
          : { render: async () => (await renderScene({ ...s, stills: undefined, emoji: assets.emoji, __stickers: assets.stickers,
            ...(stageSafe ? { safe: stageSafe } : {}), __src: SRC, beats: s.beats.length, starts, theme } as RenderScene,
          { ...opts, at: s.duration! / 2 })).shots[0]!.buf }) });
      autoPlaces.push({ scene: s.id, position: captionPos });
    }
    // Всё, что слой знает о сцене сверх её данных: эмодзи, стикеры, стиль
    // подписи и речь по тактам для субтитров.
    const stage = { emoji: assets.emoji, __stickers: assets.stickers, ...(stageSafe ? { safe: stageSafe } : {}),
      ...(pitch.captions?.style ? { captionStyle: pitch.captions.style } : {}),
      ...(pitch.captions?.everywhere ? { captionEverywhere: true } : {}),
      ...(pitch.captions?.size ? { subScale: pitch.captions.size } : {}),
      ...(pitch.captions?.look ? { captionLook: pitch.captions.look } : {}),
      ...(captionPos ? { captionPos } : {}),
      subMax, beatTexts: s.beats.map((b) => b.text), spoken };
    // Нарисованная сцена помнит, чем её рисовать: переход общим элементом снимает с неё
    // кадр без предмета уже после того, как сегмент готов (или взят из кэша).
    if (!s.video) s.__render = { ...s, stills: undefined, ...stage, __src: SRC, beats: s.beats.length, starts, theme: s.theme ?? pitch.theme } as RenderScene;
    // В ключ сегмента входят строки синтеза ВСЕХ тактов и их начала:
    // от первых зависит звук, от вторых — расписание картинки, и оба
    // обязаны пересобирать кадр.
    // Место сцены в ролике в ключ не входит: оно меняется от правки любой
    // сцены раньше, а кадры этой сцены от него не зависят.
    // Кадрируется ли сцена из горизонтального кадра — часть ключа: тот же материал в том же
    // кадре выглядит иначе, если его не перекладывают, а вырезают окном.
    const reframe = pitch.reframe && (s.provider === "page" || s.video) ? pitch.reframe : null;
    // Контрольные кадры снимаются из готового ролика и сегмента не меняют: в ключ они не входят.
    const key = keyOf({ ...s, __at: undefined, stills: undefined, __speech: s.beats.map((b) => b.__speech), __starts: starts,
      // Тема, которой рисуется слой: у слайда она вписана и в страницу, а у видеосцены страница —
      // клип, и без темы в ключе правка темы в шапке отдавала из кэша сегмент со старым слоем.
      __theme: s.theme ?? pitch.theme, __safe: stageSafe ?? null,
      __assets: assets.hash, __captions: pitch.captions ?? null, __reframe: reframe,
      __bare: process.env.AGENTIC_SCREENCAST_BARE === "1" },
      neighbours, voice, opts, SRC);
    const seg = `${CACHE}/${key}.mp4`;
    // Сегмент пишется во временный файл и встаёт на место одним переименованием: две сборки с общим
    // кэшем (например, два языка одновременно) иначе видели чужой недописанный файл как готовый и
    // склеивали повреждённое видео.
    const part = `${seg}.${process.pid}.part.mp4`;
    // Экранная половина слоя поверх окна: подписи, титры, карточки — в новом кадре и в
    // его безопасной зоне. Камеры, выносок и стикеров в ней нет: они привязаны к предмету
    // и едут вместе с окном в предметной половине. Карточка «у фокуса» встаёт наверх:
    // середину окна занимает сама цель.
    const screenOverlay = (o: typeof s.overlay): typeof s.overlay => {
      if (!o) return o;
      const { camera: _c, callouts: _l, stickers: _s, marks: _m, glints: _g, bursts: _b, ...rest } = o;
      const kept = { ...rest,
        ...(o.cards ? { cards: o.cards.map((c) => (c.position === "near-focus" ? { ...c, position: "top-left" as const } : c)) } : {}) };
      // Слой без единого экранного примитива — не слой: разбор такой накладки отвергает.
      return (kept.cards?.length || kept.titles?.length || kept.lower?.length || kept.pointer?.length) ? kept : undefined;
    };
    // Лупы сцены: момент и предмет. Прямоугольник предмета на странице меряет рендер (он
    // знает вёрстку), у видео — доли кадра. Лупа ложится на готовый сегмент.
    const loupes = s.overlay?.loupe ?? [];
    // Наезды с названным увеличением на цель-селектор: прямоугольник цели меряет рендер, чтобы
    // отчёт назвал увеличение, при котором цель не помещается в кадр.
    // Проход по цели (`pan`) её целиком и не вписывает — обрезка там задумана, её не называют.
    const pushes = (s.overlay?.camera ?? []).filter((c) => c.scale !== undefined && c.target && !c.pan);
    const loupeProbes = [...loupes.map((l) => ({ t: l.at, anchor: l })), ...pushes.map((c) => ({ t: c.at, anchor: { cue: c.target } }))];
    /**
     * Что геометрия фокуса и лупы сделала не так, как просил сценарий: лупа с уменьшенным
     * увеличением (предмет не вошёл бы в линзу предельного размера), наезд, при котором цель
     * не помещается в кадр, лупа, чей предмет вне окна кадрирования. Пишется в отчёт сцены и
     * рядом с сегментом, чтобы сцена из кэша отчитывалась так же.
     */
    // Читаемость: кегль самого мелкого текста цели каждого фокуса в середине его удержания, в точках
    // готового кадра. Порог — доля короткой стороны кадра (LEGIBLE_SHARE): 48 точек на 1080.
    const legibleProbes = (s.overlay?.camera ?? []).filter((c) => c.target)
      .map((c) => ({ t: Number((c.at + (c.move ?? 0.9) + c.hold / 2).toFixed(3)), target: c.target! }));
    const legibleMin = Math.round(Math.min(opts.width, opts.height) * LEGIBLE_SHARE);
    let legibleGot: Array<{ t: number; target: string; px: number | null }> = [];
    let cutsGot: Array<{ t: number; target: string; text: string[] }> = [];
    // Мелкий текст встроенного слайда в вертикальном кадре — вся страница, когда элементы вошли.
    const smallProbe = s.provider === "slides" && opts.height > opts.width
      ? { t: Number((s.duration! * 0.9).toFixed(3)), min: Math.round(opts.width * SMALL_SHARE) } : undefined;
    let smallGot: Array<{ text: string; px: number }> = [];
    const geometry = (items: LoupeAt[], frame: { width: number; height: number }, cams: Array<{ at: number; scale: number; rect: Rect }>): Record<string, unknown> => {
      const lens = items.flatMap(({ loupe, rect, floor }) => {
        const g = loupeLayout(loupe, rect, frame, floor);
        const outside = rect.left + rect.width < 0 || rect.left > frame.width;
        return g.k < g.asked - 0.005 || outside
          ? [{ at: loupe.at, asked: g.asked, scale: Number(g.k.toFixed(2)), ...(outside ? { outside: "the subject is outside the reframed window" } : {}) }] : [];
      });
      const push = cams.flatMap(({ at, scale, rect }) => {
        const fit = fitScale(rect.width / frame.width, rect.height / frame.height);
        return scale > fit + 0.005 ? [{ at, scale, fits: Number(fit.toFixed(2)) }] : [];
      });
      const legibility = legibleGot.filter((l) => l.px !== null).map((l) => ({ at: l.t, target: l.target, px: l.px!, min: legibleMin }));
      const cut = cutsGot.map((c) => ({ at: c.t, target: c.target, text: c.text }));
      const small = smallGot.length ? { at: smallProbe!.t, min: smallProbe!.min, lines: smallGot.slice(0, 5) } : undefined;
      const out = { ...(lens.length ? { loupes: lens } : {}), ...(push.length ? { pushes: push } : {}),
        ...(legibility.length ? { legibility } : {}), ...(cut.length ? { cut } : {}), ...(small ? { small } : {}) };
      writeFileSync(`${seg}.geometry.json`, JSON.stringify(out));
      return out;
    };
    const camRects = (rects: Rect[]): Array<{ at: number; scale: number; rect: Rect }> =>
      pushes.map((c, i) => ({ at: c.at, scale: c.scale!, rect: rects[loupes.length + i]! }));
    // Наезды по области клипа или страницы меряются долями кадра без рендера.
    // У клипа в рамке устройства камера ведёт по областям, переведённым в экран рамки
    // (`deviceFor`), поэтому и мерить надо их.
    const areaPushes = (ov: SceneOverlay | undefined = s.overlay): Array<{ at: number; scale: number; rect: Rect }> => (ov?.camera ?? [])
      .filter((c) => c.scale !== undefined && c.area)
      .map((c) => ({ at: c.at, scale: c.scale!, rect: { left: c.area![0] * opts.width, top: c.area![1] * opts.height, width: c.area![2] * opts.width, height: c.area![3] * opts.height } }));
    const byFractions = (l: NonNullable<typeof s.overlay>["loupe"] extends (infer U)[] | undefined ? U : never): { left: number; top: number; width: number; height: number } => {
      if (l.target) throw new Error(msg("build.loupeTarget", { id: s.id }));
      const b = l.area ?? [l.point![0], l.point![1], 0, 0];
      return { left: b[0] * opts.width, top: b[1] * opts.height, width: b[2] * opts.width, height: b[3] * opts.height };
    };
    const sceneTheme = (s.theme ?? pitch.theme) as Record<string, string> | undefined;
    // Страница горизонтального сценария в другом формате: предметная половина рисуется
    // в исходном кадре с плотностью, при которой окно даёт кадр нужной высоты, и
    // снимается окном у цели; экранная половина — в новом кадре; сборка кладёт вторую
    // на первую и затемняет входы, как затемнил бы слой.
    const reframePage = async (material: RenderScene): Promise<Record<string, unknown>> => {
      const src = reframe!;
      const sceneDir = `${CACHE}/${key}.scene.frames`, screenDir = `${CACHE}/${key}.screen.frames`;
      try {
        mkdirSync(sceneDir, { recursive: true });
        mkdirSync(screenDir, { recursive: true });
        const scale = (opts.height / src.height) * (opts.scale ?? 1);
        const a = await renderScene({ ...material, __layerPart: "scene" },
          { ...opts, width: src.width, height: src.height, scale, crop: { width: (opts.width / opts.height) * src.height }, probes: loupeProbes, legible: legibleProbes, cuts: legibleProbes });
        legibleGot = a.legible ?? [];
        cutsGot = a.cuts ?? [];
        a.shots.forEach((shot, i) => writeFileSync(`${sceneDir}/${String(i).padStart(5, "0")}.png`, shot.buf));
        // Предмет лупы — в координатах окна: его прямоугольник на исходном кадре минус левый край
        // окна в момент лупы, в точках нового кадра.
        const b = await renderScene({ ...s, ...stage, overlay: screenOverlay(s.overlay), __overlayOnly: true, __layerPart: "screen",
          beats: s.beats.length, starts, theme: s.theme ?? pitch.theme }, opts);
        const k = opts.height / src.height;
        const items: LoupeAt[] = loupes.map((loupe, li) => {
          const r = a.rects[li]!, x = a.shots[Math.min(a.shots.length - 1, Math.round(loupe.at * opts.fps))]?.x ?? 0;
          return { loupe, rect: { left: (r.left - x) * k, top: r.top * k, width: r.width * k, height: r.height * k }, floor: b.floor };
        });
        b.shots.forEach((shot, i) => writeFileSync(`${screenDir}/${String(i).padStart(5, "0")}.png`, shot.buf));
        const e = opts.encode!;
        const fx = (s.effects as { fade?: { in?: number; out?: number } } | undefined)?.fade;
        const fin = fx?.in ?? 0.35, fout = fx?.out ?? 0.35;
        const fade = [fin > 0 ? `fade=t=in:st=0:d=${fin}` : "", fout > 0 ? `fade=t=out:st=${Math.max(0, s.duration - fout)}:d=${fout}` : ""]
          .filter(Boolean).join(",") || "null";
        await ff(["-nostdin", "-y", "-loglevel", "error",
          "-framerate", String(opts.fps), "-i", `${sceneDir}/%05d.png`, "-framerate", String(opts.fps), "-i", `${screenDir}/%05d.png`,
          ...withLoupes(["-filter_complex", `[0:v]scale=${opts.width}:${opts.height}:flags=lanczos[a];[a][1:v]overlay=0:0:format=auto,${fade}[v]`,
            "-map", "[v]"], items, opts, sceneTheme),
          "-c:v", "libx264", "-preset", e.preset, "-crf", String(e.crf), "-pix_fmt", e.pix, "-g", String(opts.fps * 2), part]);
        renameSync(part, seg);
        return geometry(items, opts, []);
      } finally {
        rmSync(sceneDir, { recursive: true, force: true });
        rmSync(screenDir, { recursive: true, force: true });
      }
    };
    if (process.argv.includes("--keys-only")) {
      // Строка синтеза и длительность печатаются здесь, потому что больше
      // их взять неоткуда: полный отчёт даёт только суммарную длительность
      // готового файла, а ответ движка сохраняется рядом с записью и в этот
      // отчёт не попадает.
      // Без строки нечем сверить правила чтения до и после переезда,
      // без длительности нечем замерить бюджет хронометража.
      // Чем озвучена сцена — вопрос, на который сборка обязана отвечать:
      // записанный человеком голос и синтез дают правдоподобную
      // длительность одинаково, и без этого поля их не различить.
      // Ответ берётся из того, что сказал сам движок, а не из данных
      // голоса: данные говорят, кого просили, ответ — кто сделал.
      // Такты перечисляются поимённо: у каждого свой ключ, своя строка
      // синтеза, своя длина и своё начало в сцене. Без этого перезапись
      // одного такта неотличима снаружи от перезаписи всей сцены —
      // суммарная длительность в обоих случаях меняется одинаково.
      log.push({ id: s.id, key, cached: existsSync(seg),
        beats: s.beats.map((b, bi) => ({
          key: b.__key, speech: b.__speech, voiced: voicedBy(b.__wav!),
          spoken: Number((b.__spoken ?? 0).toFixed(3)),
          starts: Number((starts[bi] ?? 0).toFixed(3)),
        })),
        voiced: s.beats.length ? voicedBy(s.beats[0]!.__wav!) : "silent",
        spoken: Number(spoken.toFixed(3)), duration: s.duration });
      s.__seg = seg; s.__wav = s.beats.length ? joinBeats(s.beats) : ""; s.__key = key;
      continue;
    }
    // Дальше — дорогая часть сцены: кадры, сегмент, звук. Она зависит только от самой сцены,
    // поэтому сцены рисуются по нескольку сразу (`AGENTIC_SCREENCAST_JOBS`), каждая — своим
    // браузером от первого кадра до последнего, как и прежде. Отчёт сцены копится в её ячейке
    // и встаёт в общий по порядку сценария.
    const slot: Array<Record<string, unknown>> = [];
    slots.push(slot);
    // Сколько памяти займут снимки сцены до кодирования: кадры PNG держатся в памяти целиком.
    // Точнее не нужно — это только очередь, которая не даёт крупным сценам собраться разом.
    weights.push(frames * opts.width * opts.height * (opts.scale ?? 1) ** 2 * PNG_BYTES_PER_PIXEL);
    jobs.push(async () => {
      const at = pitch.scenes.indexOf(s) + 1;
      let notes: Record<string, unknown> = {};
      const of = pitch.scenes.length;
      if (existsSync(seg)) {
        process.stderr.write(msg("build.sceneCached", { at, of, id: s.id }) + "\n");
        const noted = existsSync(`${seg}.geometry.json`) ? JSON.parse(readFileSync(`${seg}.geometry.json`, "utf8")) as Record<string, unknown> : {};
        slot.push({ id: s.id, cached: true, key: key.slice(0, 10), frames, ...noted });
      } else if (s.video && s.freezeAt !== undefined) {
        process.stderr.write(msg("build.sceneRender", { at, of, id: s.id, frames }) + "\n");
        const src = clip;
        if (!existsSync(src)) throw new Error(msg("build.noPage", { path: src }));
        if (s.freezeAt >= dur(src)) throw new Error(msg("build.freezePast", { id: s.id }));
        const still = `${CACHE}/${key}.freeze.png`;
        const html = `${CACHE}/${key}.freeze.html`;
        // В кадрировании кадр снимается сразу в высоту нового кадра: страница рисуется с той же
        // плотностью, и браузер кладёт его пиксель в пиксель, а не растягивает своим фильтром.
        await ff(["-nostdin", "-y", "-loglevel", "error", "-i", src,
          "-ss", String(s.freezeAt), "-frames:v", "1",
          ...(reframe && !deviceFor(s, src) ? ["-vf", `scale=-2:${opts.height}:flags=lanczos`] : []), still]);
        // Подсветка обязана ложиться НА ПРЕДМЕТ. Области названы долями кадра, и промах в доле
        // виден только на готовом ролике — там, где зритель смотрит на пустое место и не понимает,
        // о чём подпись. Поэтому каждая область проверяется по самому замороженному кадру.
        for (const cue of s.overlay?.camera ?? []) {
          if (!cue.area) continue;
          const contrast = areaContrast(still, cue.area, { width: opts.width, height: opts.height });
          if (Number.isFinite(contrast) && contrast < EMPTY_AREA_CONTRAST) {
            throw new Error(msg("build.cameraEmpty", { id: s.id, area: cue.area.join(", "),
              contrast: contrast.toFixed(1), minimum: EMPTY_AREA_CONTRAST }));
          }
        }
        const image = readFileSync(still).toString("base64");
        const dev = deviceFor(s, src);
        // В рамке остановленный кадр встаёт в её экран, а рамка рисуется самой страницей:
        // она часть картинки и увеличивается вместе с ней.
        writeFileSync(html, dev
          ? `<!doctype html><html><head><meta charset="utf-8"><style>${DEVICE_CSS}`
            + `html,body{margin:0;width:100%;height:100%;overflow:hidden;background:var(--bg)}`
            + `.dv img{display:block;width:100%;height:100%;object-fit:cover}</style></head><body>`
            + deviceMarkup(dev.layout, { surround: { width: opts.width, height: opts.height },
              inner: `<div class="dv-scr"><img src="data:image/png;base64,${image}"></div>` }) + `</body></html>`
          : `<!doctype html><html><head><meta charset="utf-8"><style>`
            + `html,body{margin:0;width:100%;height:100%;overflow:hidden;background:var(--sc-letterbox)}`
            + `img{display:block;width:100%;height:100%;object-fit:${s.fit?.mode ?? "contain"};`
            + `object-position:${((s.fit?.x ?? 0.5) * 100).toFixed(1)}% ${((s.fit?.y ?? 0.5) * 100).toFixed(1)}%}`
            + `</style></head><body><img src="data:image/png;base64,${image}"></body></html>`);
        if (reframe && !dev) {
          // Как у видео: окно само и есть наезд — камера кадра не приближает, а только ведёт
          // окно к области фокуса. Без слоя (`AGENTIC_SCREENCAST_BARE=1`) нет и затенения.
          notes = await reframePage({ ...s, ...stage, page: html, offline: true, beats: s.beats.length, starts, theme: s.theme ?? pitch.theme, __noZoom: true,
            ...(process.env.AGENTIC_SCREENCAST_BARE === "1" ? { __bareLayer: true } : {}) });
        } else {
          const { shots, rects, floor } = await renderScene({ ...s, ...stage, page: html, offline: true,
            ...(dev ? { overlay: dev.overlay } : {}), beats: s.beats.length, starts, theme: s.theme ?? pitch.theme },
            { ...opts, ...(dev ? {} : { probes: loupeProbes }) });
          const items = dev ? [] : loupes.map((loupe, li) => ({ loupe, rect: rects[li]!, floor }));
          await encode(shots, part, opts, withLoupes([], items, opts, sceneTheme));
          renameSync(part, seg);
          notes = geometry(items, opts, dev ? [] : [...camRects(rects), ...areaPushes()]);
        }
        slot.push({ id: s.id, cached: false, key: key.slice(0, 10), frames, freezeAt: s.freezeAt, ...(reframe && !dev ? { reframe: true } : {}), ...notes });
      } else if (s.video) {
        process.stderr.write(msg("build.sceneVideo", { at, of, id: s.id }) + "\n");
        // Материал — готовый файл: кадры берутся из него, а не рисуются.
        // Он приводится к кадру ролика (размер, темп, качество, формат
        // пикселей) и к длине сцены: короче — достаивается последним кадром,
        // длиннее — обрезается. Иначе склейка получила бы сегмент с чужими
        // параметрами, и готовый файл разъехался бы со звуком.
        const src = clip;
        if (!existsSync(src)) throw new Error(msg("build.noPage", { path: src }));
        const e = opts.encode!;
        const dev = deviceFor(s, src);
        const sc = dev?.layout.screen;
        // В рамке клип масштабируется в экран рамки и ставится на его место; фон вокруг и
        // корпус рисует слой композиции.
        // Кадрирование в другой формат (кроме клипа в рамке — рамку раскладывают заново):
        // клип ставится в свой горизонтальный кадр, а новый кадр вырезается из него окном.
        const cut = reframe && !dev ? reframe : null;
        const fw = cut ? cut.width : opts.width, fh = cut ? cut.height : opts.height;
        // Поля вокруг клипа другой пропорции — цвет полей темы сцены, а не чёрный на любой теме.
        const fill = ffmpegColour(sceneTheme!["--sc-letterbox"]!);
        const base = (sc ? `scale=${sc.w}:${sc.h},pad=${opts.width}:${opts.height}:${sc.x}:${sc.y}:color=${fill},`
          : `${fitFilter(s.fit, fw, fh, fill)},`)
          + `fps=${opts.fps},tpad=stop_mode=clone:stop_duration=3600,trim=duration=${s.duration},setpts=PTS-STARTPTS`;
        const overlay = dev ? dev.overlay : s.overlay;
        const device = dev ? { __device: { html: dev.html, css: DEVICE_CSS } } : {};
        const transition = (s.effects as { fade?: { in?: number; out?: number } } | undefined)?.fade;
        const fadeIn = transition?.in ?? 0.3;
        const fadeOut = transition?.out ?? 0.3;
        const fade = [fadeIn > 0 ? `fade=t=in:st=0:d=${fadeIn}` : "",
          fadeOut > 0 ? `fade=t=out:st=${Math.max(0, s.duration - fadeOut)}:d=${fadeOut}` : ""]
          .filter(Boolean).join(",") || "null";
        const sceneDir = `${CACHE}/${key}.scene.frames`;
        const screenDir = `${CACHE}/${key}.screen.frames`;
        // Слой поверх клипа рисуется и ради ПОДСКАЗКИ, а не только ради карточек: сцена с речью
        // над готовым материалом — обычный случай такого ролика, и прежде её реплика не попадала
        // в кадр вовсе, потому что слой заводился только по полю `overlay`.
        // `AGENTIC_SCREENCAST_BARE=1` — сборка без слоя поверх клипа: так проверка сравнивает
        // сам клип в окне кадрирования с его кадром, без затенения и подписей.
        const needsOverlay = process.env.AGENTIC_SCREENCAST_BARE !== "1"
          && (Boolean(s.overlay) || s.beats.length > 0 || Boolean(dev));
        // Наезд НАД ВИДЕО делает сборка, и тогда слой делится надвое: подсветка с затенением
        // ложится ПОД наезд и едет вместе с картинкой, а карточки и подсказка — ПОВЕРХ него и
        // остаются прежнего размера. Одним слоем это не выразить: либо текст карточки растёт
        // вместе с кадром и не помещается, либо подсветка стоит на месте, пока кадр приближается.
        // В кадрировании наезда нет: окно и есть наезд — оно ведёт область фокуса.
        // Окно, которое следует за курсором (`follow: "cursor"`), берёт путь курсора из дубля.
        const cursorPath = overlay?.camera?.some((c) => c.follow) ? trimMarks(marksOf(resolve(SRC, String(s.page))), s.trim)?.path ?? [] : [];
        // Размытие движения (`motionBlur`) у наезда по видео: камера считается на подкадрах, и
        // подкадры одного кадра усредняются. Кадр клипа внутри своего периода не меняется (подкадры —
        // его копии), поэтому размывается только движение камеры, а удержание остаётся резким.
        const sub = opts.motionBlur ? opts.motionBlur.samples : 1;
        const camera = cut ? null : cameraFilter(overlay?.camera ?? [], opts.fps * sub, cursorPath);
        // Верх полосы субтитров в кадре сцены: его знает экранная половина слоя.
        let floor = opts.height;
        const layer = async (dir: string, part: "scene" | "screen"): Promise<void> => {
          mkdirSync(dir, { recursive: true });
          const own = cut && part === "screen";
          const { shots, floor: line } = await renderScene({ ...s, ...stage, ...device, overlay: own ? screenOverlay(overlay) : overlay,
            __overlayOnly: true, __layerPart: part, __videoCamera: true, beats: s.beats.length, starts, theme: s.theme ?? pitch.theme },
          cut && part === "scene" ? { ...opts, width: cut.width, height: cut.height } : opts);
          shots.forEach((shot, index) => writeFileSync(
            `${dir}/${String(index).padStart(5, "0")}.png`, shot.buf));
          if (part === "screen") floor = line;
        };
        if (needsOverlay && (camera || cut)) { await layer(sceneDir, "scene"); await layer(screenDir, "screen"); }
        else if (needsOverlay) {
          mkdirSync(screenDir, { recursive: true });
          const { shots, floor: line } = await renderScene({ ...s, ...stage, ...device, overlay, __overlayOnly: true,
            beats: s.beats.length, starts, theme: s.theme ?? pitch.theme }, opts);
          floor = line;
          shots.forEach((shot, index) => writeFileSync(
            `${screenDir}/${String(index).padStart(5, "0")}.png`, shot.buf));
        }
        try {
          const frames = (dir: string): string[] => ["-framerate", String(opts.fps), "-i", `${dir}/%05d.png`];
          const shutter = opts.motionBlur ? Math.max(2, Math.min(sub, Math.round(sub * opts.motionBlur.shutter))) : 1;
          const zoom = camera
            ? (sub > 1 ? `,fps=${opts.fps * sub}` : "")
              + `,zoompan=z='${camera.z}':x='${camera.x}':y='${camera.y}':d=1:`
              + `s=${opts.width}x${opts.height}:fps=${opts.fps * sub}`
              + (sub > 1 ? `,tmix=frames=${shutter},select='eq(mod(n,${sub}),${sub - 1})',setpts=N/(${opts.fps}*TB),fps=${opts.fps}` : "")
            : "";
          const window = cut ? `scale=-2:${opts.height}:flags=lanczos,crop=${opts.width}:${opts.height}:'${windowFilter(overlay?.camera ?? [])}':0` : "";
          const inputs = needsOverlay && (camera || cut) ? [...frames(sceneDir), ...frames(screenDir)]
            : needsOverlay ? frames(screenDir) : [];
          const videoFilter = cut
            ? needsOverlay
              ? ["-filter_complex", `[0:v]${base}[bg];[bg][1:v]overlay=0:0:shortest=1:format=auto,${window}[in];`
                + `[in][2:v]overlay=0:0:shortest=1:format=auto,${fade}[v]`, "-map", "[v]"]
              : ["-vf", `${base},${window},${fade}`]
            : needsOverlay && camera
            ? ["-filter_complex",
              `[0:v]${base}[bg];[bg][1:v]overlay=0:0:shortest=1:format=auto${zoom}[in];`
              + `[in][2:v]overlay=0:0:shortest=1:format=auto,${fade}[v]`, "-map", "[v]"]
            : needsOverlay
              ? ["-filter_complex", `[0:v]${base}[bg];[bg][1:v]overlay=0:0:shortest=1:format=auto,${fade}[v]`, "-map", "[v]"]
              : ["-vf", `${base},${fade}`];
          // В кадрировании предмет лупы переводится в координаты окна: доли исходного кадра — в
          // точки картинки, приведённой к высоте нового кадра, минус левый край окна в момент лупы.
          const wide = cut ? Math.round((fw * opts.height) / fh / 2) * 2 : 0;
          const items: LoupeAt[] = loupes.map((loupe) => {
            const plain = byFractions(loupe);
            if (!cut) return { loupe, rect: plain, floor };
            const b = loupe.area ?? [loupe.point![0], loupe.point![1], 0, 0];
            const x = Math.max(0, Math.min(wide - opts.width, windowCentre(overlay?.camera ?? [], loupe.at) * wide - opts.width / 2));
            return { loupe, rect: { left: b[0] * wide - x, top: b[1] * opts.height, width: b[2] * wide, height: b[3] * opts.height }, floor };
          });
          const graph = withLoupes(videoFilter, items, opts, sceneTheme);
          notes = geometry(items, opts, cut ? [] : areaPushes(overlay));
          // Частота кадров сегмента — всегда кадра ролика: подкадры размытия идут в `sub` раз чаще, и без
          // явной частоты кодер писал их все, а склейка на частоте ролика растягивала сцену в `sub` раз.
          await ff(["-nostdin", "-y", "-loglevel", "error", "-i", src,
            ...inputs, "-an", ...graph, "-r", String(opts.fps), "-t", String(s.duration),
            "-c:v", "libx264", "-preset", e.preset, "-crf", String(e.crf),
            "-pix_fmt", e.pix, "-g", String(opts.fps * 2), part]);
          renameSync(part, seg);
        } finally {
          rmSync(sceneDir, { recursive: true, force: true });
          rmSync(screenDir, { recursive: true, force: true });
        }
        slot.push({ id: s.id, cached: false, key: key.slice(0, 10), frames, video: true, ...(cut ? { reframe: true } : {}), ...notes });
      } else {
        // Слою композиции отдаются ИЗМЕРЕННЫЕ начала тактов и их число:
        // по ним он разрешает якоря вида `b2` в секунды. Само число тактов
        // передаётся отдельным полем, потому что в сцене под этим именем
        // лежит их содержание, а разрешению нужен только счёт.
        process.stderr.write(msg("build.sceneRender", { at, of, id: s.id, frames }) + "\n");
        let renderer: string | undefined;
        if (reframe) {
          notes = await reframePage({ ...s, ...stage, __src: SRC, beats: s.beats.length, starts, theme: s.theme ?? pitch.theme });
        } else {
          const { shots, rects, floor, renderer: drawn, overflow, legible, cuts, small } = await renderScene(
            { ...s, ...stage, __src: SRC, beats: s.beats.length, starts, theme: s.theme ?? pitch.theme },
            { ...opts, probes: loupeProbes, legible: legibleProbes, cuts: legibleProbes, ...(smallProbe ? { small: smallProbe } : {}) });
          legibleGot = legible ?? [];
          cutsGot = cuts ?? [];
          smallGot = small ?? [];
          const items = loupes.map((loupe, li) => ({ loupe, rect: rects[li]!, floor }));
          await encode(shots, part, opts, withLoupes([], items, opts, sceneTheme));
          renameSync(part, seg);
          notes = geometry(items, opts, [...camRects(rects), ...areaPushes()]);
          if (drawn) renderer = drawn;
          if (overflow) {
            // Отчёт о переполнении живёт рядом с сегментом, как геометрия: сцена из кэша скажет то же.
            notes = { ...notes, overflow };
            writeFileSync(`${seg}.geometry.json`, JSON.stringify(notes));
          }
        }
        slot.push({ id: s.id, cached: false, key: key.slice(0, 10), frames, ...(reframe ? { reframe: true } : {}),
          ...(renderer ? { renderer } : {}), ...notes });
      }
      // 3. Звук сцены добивается тишиной до длины сегмента. У сцены без
      // речи звук — тишина целиком: дорожка обязана быть у КАЖДОЙ сцены,
      // иначе склейка сдвинет звук всех следующих.
      const padded = `${CACHE}/${key}.wav`;
      if (!existsSync(padded)) {
        if (s.beats.length) {
          const lead = s.speechAt ? `adelay=${Math.round(s.speechAt * 1000)}:all=1,` : "";
          await ff(["-nostdin", "-y", "-loglevel", "error", "-i", joinBeats(s.beats),
            "-af", `${lead}apad=whole_dur=${s.duration}`, "-ar", "48000", "-ac", "1", padded]);
        } else {
          await ff(["-nostdin", "-y", "-loglevel", "error", "-f", "lavfi",
            "-i", "anullsrc=r=48000:cl=mono", "-t", String(s.duration), padded]);
        }
      }
      s.__seg = seg; s.__wav = padded; s.__key = key;
    });
  }

  const tVoice = Date.now();
  // Сцены берутся по порядку, пока их число не больше `sceneJobs()`, а оценка памяти снимков
  // идущих сцен не больше бюджета (40 % памяти машины). Одна сцена идёт всегда, даже крупная.
  const budget = totalmem() * 0.4;
  let next = 0, held = 0, running = 0;
  await new Promise<void>((done, fail) => {
    const pump = (): void => {
      if (next >= jobs.length && running === 0) { done(); return; }
      while (next < jobs.length && running < sceneJobs() && (running === 0 || held + weights[next]! <= budget)) {
        const k = next++, w = weights[k]!;
        held += w; running++;
        jobs[k]!().then(() => { held -= w; running--; pump(); }, fail);
      }
    };
    pump();
  });
  for (const slot of slots) log.push(...slot);
  // Мелкий текст у цели фокуса называется сразу: на телефоне его не прочтут, а по кадру на
  // большом экране этого не видно.
  for (const e of log) {
    for (const l of (e.legibility as Array<{ at: number; target: string; px: number; min: number }> | undefined) ?? []) {
      if (l.px < l.min) process.stderr.write(msg("build.legible", { id: String(e.id), target: l.target, px: l.px, at: l.at, min: l.min }) + "\n");
    }
    const small = e.small as { at: number; min: number; lines: Array<{ text: string; px: number }> } | undefined;
    if (small) {
      process.stderr.write(msg("build.small", { id: String(e.id), min: small.min,
        lines: small.lines.slice(0, 3).map((l) => `«${l.text}» ${l.px} px`).join(", ") }) + "\n");
    }
    for (const c of (e.cut as Array<{ at: number; target: string; text: string[] }> | undefined) ?? []) {
      process.stderr.write(msg("build.cut", { id: String(e.id), target: c.target, at: c.at,
        text: `«${c.text.slice(0, 3).join("», «")}»` }) + "\n");
    }
  }
  const tScenes = Date.now();

  // Куда пришлись фокусы внимания — в отчёт сцены: по ним видно, что фокус
  // сдвинулся вместе с речью, без просмотра кадров.
  for (const entry of log) {
    if (entry.overflow) process.stderr.write(msg("build.overflow", { id: String(entry.id), px: Number(entry.overflow) }) + "\n");
    const sc = pitch.scenes.find((x) => x.id === entry.id);
    if (sc?.__spotlights) entry.spotlights = sc.__spotlights;
    if (sc?.__autoZoom !== undefined) entry.camera = sc.overlay?.camera?.map((c) => ({ at: Number(c.at.toFixed(3)), area: c.area }));
  }
  if (process.argv.includes("--keys-only")) {
    console.log(JSON.stringify({ keys: log }, null, 1));
    return;
  }

  // 4. Склейка. Без переходов и сведения звука — прежний путь: видео
  // копированием, речь одной дорожкой. С ними — склейка с переходами и
  // сведение речи, подложки и акцентов по времени ролика.
  const taken = only ? pitch.scenes.filter((s) => s.id === only) : pitch.scenes;
  const out = arg("out", `${TMP}/pitch.mp4`);
  // Слои всего ролика (полоса глав, ведущий в круге) накладываются одним
  // проходом поверх склейки; без них склейка и есть готовый файл.
  const filmLayers = Boolean(pitch.progress || pitch.pip || pitch.look);
  // Рабочие файлы склейки названы номером процесса: кэш общий, и две сборки одновременно (два языка,
  // два формата) иначе писали друг другу в один список сегментов и получали чужой или обрезанный ролик.
  const muxed = filmLayers ? `${CACHE}/film-raw-${process.pid}.mp4` : out;
  const sceneFrames = (s: BuiltScene): number => Math.round(s.duration * opts.fps);
  // При сборке одной сцены переходов нет: соседей в склейке нет.
  const useTransitions = !only && taken.some((s, i) => i > 0 && s.transition);
  /** Концы речи тактов сцены: `bN.end` у звука, музыки и ударов — конец речи такта. */
  const speechEnds = (s: BuiltScene): number[] => s.beats.map((b, k) => (s.__starts?.[k] ?? 0) + (b.__spoken ?? 0));
  const tl = timeline(taken.map((s) => ({ frames: sceneFrames(s),
    ...(useTransitions && s.transition ? { transition: s.transition } : {}) })), opts.fps);
  // Где каждая сцена стоит в готовом ролике: начало и конец с учётом перекрытий переходов. По ним
  // ставят музыку, звуки и проверки кадров, не пересчитывая время из кадров и переходов.
  taken.forEach((s, i) => {
    const entry = log.find((e) => e.id === s.id);
    if (entry) Object.assign(entry, { start: Number(tl.starts[i]!.toFixed(3)), end: Number((tl.starts[i]! + sceneFrames(s) / opts.fps).toFixed(3)) });
  });
  const filmSfx: Sfx[] = [];
  taken.forEach((s, i) => {
    for (const cue of s.sfx ?? []) {
      filmSfx.push({ ...cue, file: resolve(SRC, cue.file), at: tl.starts[i]! + anchorSeconds(cue.at, s.__starts ?? [], s.duration, speechEnds(s)) });
    }
    // Звук перехода начинается чуть раньше склейки: свист ведёт в неё.
    if (useTransitions && i > 0 && s.transition?.sound)
      filmSfx.push({ file: resolve(SRC, s.transition.sound), at: Math.max(0, tl.starts[i]! - 0.1) });
  });
  for (const cue of only ? [] : pitch.sfx ?? []) {
    const m = /^m(\d+(?:\.\d+)?)$/.exec(cue.at);
    if (m && !pitch.music?.bpm) {
      console.error(msg("build.sfxTempo", { at: cue.at }));
      process.exit(2);
    }
    const at = m ? musicBeat(Number(m[1]), pitch.music!.bpm!, pitch.music!.offset ?? 0) : Number.parseFloat(cue.at);
    filmSfx.push({ ...cue, file: resolve(SRC, cue.file), at });
  }
  // Смены музыки по сценам: новая подложка или остановка в момент сцены.
  const musicCues: MusicCue[] = [];
  taken.forEach((s, i) => {
    if (!s.music || only) return;
    const at = tl.starts[i]! + anchorSeconds(s.music.at.replace(/s$/i, ""), s.__starts ?? [], s.duration, speechEnds(s));
    const m = s.music;
    musicCues.push(m.stop ? { at, stop: true, ...(m.fadeOut !== undefined ? { fadeOut: m.fadeOut } : {}) }
      : { ...m, stop: undefined, file: resolve(SRC, m.file!), at });
  });
  // Вспышки и тряска — в секундах ролика; цвет вспышки — из темы своей сцены.
  const flashes: FilmHit[] = [], shakes: FilmHit[] = [];
  taken.forEach((s, i) => {
    const at = (h: Hit): number => tl.starts[i]! + anchorSeconds(h.at.replace(/s$/i, ""), s.__starts ?? [], s.duration, speechEnds(s));
    const colour = ffmpegColour(((s.theme ?? pitch.theme) as Record<string, string>)["--tr-flash"]!);
    for (const h of s.flash ?? []) flashes.push({ at: at(h), length: h.length ?? FLASH_DEFAULT.length, strength: h.strength ?? FLASH_DEFAULT.strength, colour });
    for (const h of s.shake ?? []) shakes.push({ at: at(h), length: h.length ?? SHAKE_DEFAULT.length, strength: h.strength ?? SHAKE_DEFAULT.strength });
  });
  const hits = flashes.length + shakes.length > 0;
  // Звук ролика сводится и нормируется всегда, когда он есть: ролик только с голосом прежде
  // выходил около −19 LUFS при цели площадок −14 (docs/sound.md), и зритель прибавлял громкость.
  const mixNeeded = useTransitions || hits || pitch.audio !== false;
  let mux: string;
  let transitionsDone: Awaited<ReturnType<typeof assembleVideo>>["transitions"] = [];
  let audioReport: ReturnType<typeof mixFilm> | undefined;
  if (!mixNeeded) {
    const vlist = `${CACHE}/v-${process.pid}.txt`, alist = `${CACHE}/a-${process.pid}.txt`;
    writeFileSync(vlist, taken.map((s) => `file '${s.__seg}'`).join("\n"));
    writeFileSync(alist, taken.map((s) => `file '${s.__wav}'`).join("\n"));
    const audio = `${CACHE}/all-${process.pid}.wav`;
    execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-f", "concat",
      "-safe", "0", "-i", alist, "-c", "copy", audio]);
    mux = execFileSync("/bin/sh", ["-c",
      `${FFMPEG} -nostdin -y -f concat -safe 0 -i ${vlist} -i ${audio} ` +
      `-c:v copy -c:a aac -b:a ${opts.encode!.audio} -shortest ${muxed} 2>&1`], { encoding: "utf8" });
  } else {
    const video = `${CACHE}/film-video-${process.pid}.mp4`;
    if (useTransitions) {
      // Переход общим элементом: кадр конца первой сцены и начала второй — с предметом и
      // без него, и место предмета в каждой. Рисуются по одному кадру теми же страницами.
      const morphs = new Map<string, MorphInput>();
      for (let i = 1; i < taken.length; i++) {
        const s = taken[i]!, prev = taken[i - 1]!, t = s.transition;
        if (t?.kind !== MORPH) continue;
        if (!prev.__render || !s.__render) {
          console.error(msg("build.morphVideo", { id: s.id }));
          process.exit(2);
        }
        const k = transitionFrames(t, opts.fps);
        const shot = async (scene: RenderScene, at: number, hide: boolean, name: string): Promise<{ file: string; rect: MorphInput["ra"] }> => {
          const r = await renderScene(scene, { ...opts, at, ...(hide ? { hide: t.element! } : {}), probes: [{ t: at, anchor: { target: t.element } }] });
          const file = `${CACHE}/morph-${s.__key}-${name}.png`;
          writeFileSync(file, r.shots[0]!.buf);
          return { file, rect: r.rects[0]! };
        };
        const tA = (sceneFrames(prev) - k) / opts.fps, tB = (k - 1) / opts.fps;
        try {
          const aBg = await shot(prev.__render, tA, true, "abg"), aFull = await shot(prev.__render, tA, false, "af");
          const bBg = await shot(s.__render, tB, true, "bbg"), bFull = await shot(s.__render, tB, false, "bf");
          morphs.set(s.id, { aBg: aBg.file, bBg: bBg.file, aFull: aFull.file, bFull: bFull.file, ra: aFull.rect, rb: bFull.rect });
        } catch (e) {
          console.error(msg("build.morphElement", { id: s.id, element: t.element!, why: (e as Error).message.split("\n")[0]! }));
          process.exit(2);
        }
      }
      ({ transitions: transitionsDone } = await assembleVideo({ out: video, cache: CACHE, self: SELF,
        scenes: taken.map((s) => ({ id: s.id, seg: s.__seg!, frames: sceneFrames(s),
          ...(s.transition ? { transition: s.transition } : {}), ...(morphs.has(s.id) ? { morph: morphs.get(s.id)! } : {}),
          theme: (s.theme ?? pitch.theme) as Record<string, string> })),
        enc: { fps: opts.fps, width: opts.width, height: opts.height, crf: opts.encode!.crf,
          preset: opts.encode!.preset, pix: opts.encode!.pix } }));
    } else {
      const vlist = `${CACHE}/v-${process.pid}.txt`;
      writeFileSync(vlist, taken.map((s) => `file '${s.__seg}'`).join("\n"));
      execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", vlist,
        "-c", "copy", video]);
    }
    if (hits) {
      // Удары — одним проходом поверх склейки: вспышка и тряска одинаковы на слайде и на клипе.
      const hit = `${CACHE}/film-hits-${process.pid}.mp4`;
      execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-i", video, "-filter_complex",
        hitsFilter({ flashes, shakes, width: opts.width, height: opts.height, fps: opts.fps }), "-map", "[v]",
        "-c:v", "libx264", "-preset", opts.encode!.preset, "-crf", String(opts.encode!.crf), "-pix_fmt", opts.encode!.pix,
        "-g", String(opts.fps * 2), "-r", String(opts.fps), hit]);
      renameSync(hit, video);
    }
    const mixed = `${CACHE}/film-mix-${process.pid}.wav`;
    audioReport = mixFilm({ total: tl.total, out: mixed, musicDir: SRC,
      speech: taken.map((s, i) => ({ wav: s.__wav!, at: tl.starts[i]! })),
      beats: taken.flatMap((s, i) => s.beats.map((b, k) => ({ wav: b.__wav!,
        start: tl.starts[i]! + (s.__starts?.[k] ?? 0), end: tl.starts[i]! + (s.__starts?.[k] ?? 0) + (b.__spoken ?? 0) }))),
      ...(pitch.music ? { music: { ...pitch.music, file: resolve(SRC, pitch.music.file) } } : {}),
      ...(musicCues.length ? { musicCues } : {}),
      sfx: filmSfx,
      // Итог нормируется к цели ролика, по умолчанию −14 LUFS — и с подложкой, и одной речью.
      loudness: pitch.loudness ?? -14 });
    mux = execFileSync("/bin/sh", ["-c",
      `${FFMPEG} -nostdin -y -i ${video} -i ${mixed} ` +
      `-c:v copy -c:a aac -b:a ${opts.encode!.audio} -shortest ${muxed} 2>&1`], { encoding: "utf8" });
  }
  const filmScenes: FilmScene[] = taken.map((s, i) => ({ duration: s.duration, at: tl.starts[i]!,
    beats: s.beats.map((b) => ({ text: b.text, spoken: b.__spoken ?? 0 })),
    starts: s.__starts ?? [], ...(s.chapter ? { chapter: s.chapter } : {}),
    ...(s.theme ? { theme: s.theme as Record<string, string> } : {}) }));
  let chapters: Array<{ name: string; start: number; end: number }> = [];
  if (filmLayers) {
    ({ chapters } = await filmPass({ input: muxed, output: out, cache: CACHE, srcDir: SRC,
      scenes: filmScenes, total: dur(muxed), theme: pitch.theme!,
      frame: { width: opts.width, height: opts.height, fps: opts.fps }, encode: opts.encode!,
      ...(pitch.progress ? { progress: pitch.progress } : {}), ...(pitch.pip ? { pip: pitch.pip } : {}),
      ...(pitch.look ? { look: pitch.look } : {}), ...(pitch.safe ? { safe: pitch.safe } : {}),
      // Наезды во времени ролика: ведущий в круге уменьшается, пока камера приближает кадр.
      pushes: taken.flatMap((s, i) => (s.overlay?.camera ?? []).filter((c) => c.scale !== 1).map((c) => ({
        from: tl.starts[i]! + c.at, to: tl.starts[i]! + c.at + (c.move ?? 0.9) + c.hold + (c.keep ? 0 : c.return ?? 0.9) }))) }));
  }
  // Ролик без звуковой дорожки: звук снимается с готового файла копированием видеопотока, без
  // перекодирования — речь по-прежнему задаёт длительности сцен, в файл она не идёт.
  if (pitch.audio === false) {
    const silent = `${CACHE}/film-silent-${process.pid}.mp4`;
    execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-i", out, "-map", "0:v", "-map_metadata", "0", "-c", "copy", "-an", "-movflags", "+faststart", silent]);
    renameSync(silent, out);
  }
  const srt = pitch.captions?.srt ? writeSrt(out, filmScenes, subMax) : undefined;
  // Главы есть у всякого ролика с частями, а не только с полосой хода: они же — оглавление
  // для плеера страницы (`agentic-screencast web` подключает этот файл дорожкой).
  if (!chapters.length) chapters = chaptersOf(filmScenes);
  const chaptersFile = writeChapters(out, chapters);

  // Контрольные кадры: моменты, названные сценой, снимаются из готового ролика в каталог рядом
  // с ним — агент смотрит их сразу по окончании сборки. Каталог каждый раз собирается заново,
  // чтобы в нём не оставалось кадров прежней редакции сценария.
  const stillsDir = `${out.replace(/\.[^./]+$/, "")}.stills`;
  // Предпросмотр одной сцены (`--only`) кадров не снимает и прежних не трогает: его ролик —
  // одна сцена со своим отсчётом времени, а каталог принадлежит полной сборке.
  if (!only) rmSync(stillsDir, { recursive: true, force: true });
  const stills: Array<{ scene: string; moment: string; time: number; note?: string; file: string }> = [];
  if (!only) taken.forEach((s, i) => {
    for (const st of s.stills ?? []) {
      const starts = s.__starts ?? [];
      const ends = s.beats.map((b, k) => (starts[k] ?? 0) + (b.__spoken ?? 0));
      // Шаг `every` — кадр каждые столько секунд сцены: между названными моментами тоже что-то
      // происходит, и смена страницы посреди плана видна только в такой выборке.
      const local = st.every !== undefined ? stillSteps(st.every, s.duration!, opts.fps)
        : [stillTime(st, { starts, ends, duration: s.duration!, ...(s.speed ? { speed: s.speed } : {}) }, opts.fps)];
      for (const at of local) {
        const time = Number((tl.starts[i]! + at).toFixed(3));
        const moment = st.every !== undefined ? `${at.toFixed(2)}s` : st.at;
        mkdirSync(stillsDir, { recursive: true });
        const file = resolve(stillsDir, stillName(stills.length, s.id, { ...st, at: moment }));
        execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-ss", String(time), "-i", out, "-frames:v", "1", file]);
        stills.push({ scene: s.id, moment, time, ...(st.note ? { note: st.note } : {}), file });
      }
    }
  });
  if (stills.length) process.stderr.write(msg("build.stills", { count: stills.length, path: stillsDir }) + "\n");

  // Отметки живых дублей во времени ролика: в файле отметок они — секунды клипа, а замедление
  // и остановки сдвигают их в сцене. Автор сверяет по ним фокусы и контрольные кадры.
  const takeMarks = taken.flatMap((s, i) => {
    const m = s.video ? trimMarks(marksOf(resolve(SRC, String(s.page))), s.trim)?.marks : undefined;
    return Object.entries(m ?? {}).map(([name, clip]) => {
      const scene = s.speed?.length ? filmTimeOf(s.speed, clip) : clip;
      return { scene: s.id, mark: `@${name}`, clip, film: Number((tl.starts[i]! + scene).toFixed(3)) };
    });
  });

  const warnings = mux.split("\n").filter((l) => /Non-monoton|DTS|Invalid/.test(l));
  // Человеческая строка — в поток ошибок, отчёт — в стандартный вывод:
  // разбирающему нужен чистый JSON, а человеку одна строка вместо того,
  // чтобы искать длительность и путь в двух экранах вывода.
  process.stderr.write(msg("build.done", {
    out, secs: dur(out).toFixed(1), w: opts.width, h: opts.height, fps: opts.fps,
    scenes: taken.length }) + "\n");
  // Отчёт — ещё и файлом рядом с роликом (`<ролик>.report.json`): поток вывода прочитан
  // один раз, а по файлу сцены, их начала и контрольные кадры сверяют и через час.
  const reportFile = `${out.replace(/\.[^./]+$/, "")}.report.json`;
  const report = JSON.stringify({
    out, report: reportFile, scenes: log, ...(only ? { only } : {}),
    segments: taken.map((s) => ({ id: s.id, seg: s.__seg, md5: md5file(s.__seg!) })),
    // Начала тактов от начала ролика: по ним сверяются субтитры и всё, что
    // привязано к речи, без повторного измерения звука.
    beats: filmScenes.flatMap((fs, i) => fs.beats.map((b, k) => ({ scene: taken[i]!.id,
      start: Number((fs.at! + (fs.starts[k] ?? 0)).toFixed(3)), spoken: Number(b.spoken.toFixed(3)) }))),
    ...(transitionsDone.length ? { transitions: transitionsDone } : {}),
    ...(audioReport ? { audio: audioReport } : {}),
    ...(hits ? { hits: { flash: flashes.map((h) => Number(h.at.toFixed(3))), shake: shakes.map((h) => Number(h.at.toFixed(3))) } } : {}),
    ...(srt ? { srt } : {}), ...(chapters.length ? { chapters, chaptersFile } : {}),
    ...(stills.length ? { stills } : {}), ...(takeMarks.length ? { marks: takeMarks } : {}),
    ...(autoPlaces.length ? { captionPlaces: autoPlaces } : {}),
    // Сборка горизонтального сценария в другом формате: из какого кадра вырезаны страницы
    // и клипы и что сборка не нарисовала из вида плёнки.
    ...(pitch.reframe ? { reframe: { from: pitch.reframe } } : {}), ...(pitch.lookNote ? { look: pitch.lookNote } : {}),
    // Темп, от которого считались доли: названный автором или найденный в файле.
    ...(tempo ? { tempo } : {}),
    duration: dur(out), warnings,
    // Где ушло время сборки, секунды: озвучка и расписание сцен (по порядку), кадры и сегменты
    // сцен (одновременно, `jobs` штук), склейка, звук и проход ролика.
    timing: { jobs: Math.min(sceneJobs(), Math.max(1, jobs.length)), plan: Number(((tVoice - t0) / 1000).toFixed(1)), scenes: Number(((tScenes - tVoice) / 1000).toFixed(1)),
      finish: Number(((Date.now() - tScenes) / 1000).toFixed(1)) },
  }, null, 1);
  writeFileSync(reportFile, report + "\n");
  console.log(report);
}

// Отказ сборки — одной строкой со смыслом, а не стеком Node: автор сценария читает её, чтобы
// исправить сценарий, и стек ему ничего не говорит. Стек нужен тому, кто чинит инструмент, —
// он печатается с AGENTIC_SCREENCAST_DEBUG=1.
try {
  await main();
} catch (e) {
  const err = e as Error & { stderr?: Buffer | string };
  if (process.env.AGENTIC_SCREENCAST_DEBUG === "1") throw e;
  // У отказа ffmpeg смысл — в его собственном выводе, а не в строке команды.
  const tool = err.stderr ? String(err.stderr).trim().split("\n").filter(Boolean).slice(-2).join("; ") : "";
  const said = (err.message ?? "").startsWith("Command failed") ? `a tool the build runs failed${tool ? `: ${tool}` : ""}`
    : `${err.message ?? String(e)}${tool ? ` (${tool})` : ""}`;
  console.error(msg("build.failed", { said }));
  process.exit(1);
}
