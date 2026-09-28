// Единый источник ролика: один текстовый файл, из которого порождается
// всё остальное — слайды, сборка и читаемый сценарий.
//
// Почему текст, а не структура данных: сценарий состоит из прозы, и проза
// должна быть первым классом, а не значением поля в кавычках. Но содержимое
// слайдов прозой не является — это две колонки, цепочка узлов, величина, —
// поэтому оно записывается коротким размеченным списком, а не абзацем
// с самодельной разметкой внутри.
//
// Формат:
//
//   # Заголовок ролика
//   voice: {"engine":"speechkit","name":"kuznetsov","speed":1.2}
//   tail: 0.4
//
//   ## s00 · number
//   kicker: пример
//   title: Заголовок сцены
//   value: величина · подпись
//   tags: что это | зачем | как устроено | как начать
//   at: 0.6 2.0
//
//   Первый такт речи. Абзац — это такт: у него своя запись, своя длина,
//   и расписание картинки может на него ссылаться.
//
//   Второй такт. Абзацев столько, сколько логических кусков в реплике.
//   ~ Второй такт, записанный так, как его надо ПРОИЗНЕСТИ.
//
// Строка, начинающаяся с «~», задаёт произносимый вариант своего такта:
// на экране и перед чтецом остаётся обычный текст, а синтезу и адресации
// записи достаётся вариант. Прежнее поле `speech` этим и заменено —
// оно относилось к сцене целиком и такта назвать не могло.
//
// Сцена-экран вместо полей слайда несёт параметры съёмки:
//
//   ## s09 · screen
//   page: screens/graph.mhtml
//   target: .card.selected
//   mustRead: span.font-mono.text-xs
//   zoom: 1.0
//
// Незнакомое поле — ошибка разбора, а не молчаливое игнорирование:
// иначе опечатка в имени поля тихо выкинет содержимое слайда.

import { parseHits, type Hit } from "./effects.js";
import { clipToFrame, parseFit, type Fit } from "./fit.js";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { providerFor, type KindSpec } from "./provider/index.js";
import { parseOverlay, type SceneOverlay } from "./overlay.js";
import { resolveTheme, type ThemeInput } from "./theme.js";
import { parseSpeed, type SpeedStep } from "./speed.js";
import { msg, useLang } from "./msg.js";
import { parseTransition, type Transition } from "./transition.js";
import { anchorSeconds, estimateBeats, parseSpotlight, type Spotlight } from "./spotlight.js";
import { parseStills, type Still } from "./stills.js";
import { marksOf, resolveMarks, trimMarks, type AutoZoom, type Trim } from "./marks.js";
import type { Music } from "./mix.js";
import { parseDevice, type Device } from "./device.js";
import { parseLook, type Look } from "./look.js";
import { frameOf, parseFormat, parseZone, safeOf, type Safe, type Zone } from "./format.js";
import { existsSync } from "node:fs";

/**
 * Вид сцены — ПРОИЗВОЛЬНАЯ строка: его смысл знает поставщик материала,
 * а не разбор. Незнакомый вид — по-прежнему ошибка, но отвечает на этот
 * вопрос поставщик, названный заголовком сцены.
 */
export type SceneKind = string;

// Данные голоса объявлены там, где живёт договор о движке: два
// одинаковых объявления прошли бы проверку типов структурно и разошлись
// бы молча. Реэкспорт оставлен ради читателя разбора источника.
export type { VoiceData } from "./voice/types.js";

/**
 * Такт речи: логический кусок реплики со своей записью и своей длиной.
 *
 * `text` человек читает вслух и видит зритель; `speech` — то же самое
 * в том виде, в каком это надо ПРОИЗНЕСТИ, когда они расходятся.
 * Такт — единица не только звука, но и времени: расписание картинки
 * ссылается на такты, поэтому оно тянется вместе с голосом, а не живёт
 * в секундах, назначенных до записи.
 */
export interface Beat {
  text: string;
  speech?: string;
}

/** Сцена как она записана в источнике: поля ещё строки, речь уже разобрана. */
export interface RawScene {
  id: string;
  /** имя поставщика материала: часть заголовка до точки */
  provider: string;
  /** вид сцены у этого поставщика: часть после точки */
  kind: SceneKind;
  fields: Record<string, string>;
  /** такты речи по порядку; пустой список разрешает silentOk у вида поставщика */
  beats: Beat[];
  /** вся речь сцены одной строкой — для подсказки в кадре и отчётов */
  caption: string;
  __line?: number;
}

/** Кадр ролика: размер, темп и множитель плотности. */
export interface Frame { width?: number; height?: number; fps?: number; scale?: number }

/** Как кодируется готовый файл. */
export interface Encode { crf?: number; preset?: string; pix?: string; audio?: string }

/**
 * Оформление: пары «переменная — значение», которые уходят в корень
 * страницы и в слой композиции. Ядро их не толкует: имена переменных
 * знают тот, кто рисует страницу, и тема, которая их задаёт.
 *
 * В шапке источника вместо набора пишут ИМЯ поставляемой темы — тогда
 * разбор разрешает его в полный набор здесь же, и всё, что ниже по
 * течению, по-прежнему видит обычные переменные.
 */
export type Theme = Record<string, string>;

/** Всё, что относится к ролику целиком, а не к отдельной сцене. */
/** Как ролик показывает речь на экране и нужен ли файл субтитров. */
export interface Captions {
  /** bar — плашка внизу (умолчание); subtitle — субтитры по тактам; karaoke — с подсветкой слова */
  style?: "bar" | "subtitle" | "karaoke";
  /** показывать и на тех сценах, где поставщик подпись прячет (слайды) */
  everywhere?: boolean;
  /** положить рядом с MP4 файл субтитров .srt */
  srt?: boolean;
  /** кегль субтитров относительно обычного, 0,8–1,6: кадр и SRT режут реплику под него, слайды оставляют ему место */
  size?: number;
  /** outline — белый текст с чёрной обводкой без плашки (умолчание); plate — текст на плашке */
  look?: "outline" | "plate";
  /** где стоят субтитры и подпись: внизу (умолчание), вверху или посередине; сцена может сменить полем `captions` */
  position?: CaptionPosition;
}

export const CAPTION_POSITIONS = ["bottom", "top", "middle", "auto"] as const;
export type CaptionPosition = typeof CAPTION_POSITIONS[number];

/** Ведущий в кадре: видео в круге поверх всего ролика. */
export interface Pip {
  file: string;
  corner?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  /** диаметр круга долей ширины кадра */
  size?: number;
  from?: number;
  to?: number;
}

/** Полоса хода ролика с названием текущей главы. */
export interface Progress {
  position?: "top" | "bottom";
  /** где название части: edge — в строке полосы, у края кадра; zone — у края безопасной зоны */
  label?: "edge" | "zone";
  /** показывать название текущей части ролика */
  parts?: boolean;
}

export interface Film {
  frame?: Frame;
  encode?: Encode;
  theme?: Theme;
  /** правила чтения: имя поставляемого набора, путь к своему или сам набор */
  pronounce?: unknown;
  /** язык ролика: им помечается страница и по нему форматируются числа */
  lang?: string;
  /** каталог сценария: от него считаются файлы, названные сценой */
  dir?: string;
  /** безопасная зона кадра: отступы в точках кадра, куда площадка кладёт своё */
  safe?: Safe;
  /** подписи идут и поверх слайдов: низ слайда оставляет им место */
  captionsOnSlides?: boolean;
  /** кегль субтитров относительно обычного (`captions.size`) */
  captionsSize?: number;
  /** где на этой сцене стоят субтитры: слайд оставляет им место у того края */
  captionsAt?: CaptionPosition;
  /** у ролика полоса хода с названиями частей: край слайда у неё оставляет им место */
  progressAt?: "top" | "bottom";
}

export interface Source {
  title: string;
  /** языки, на которых написан сценарий: язык шапки и все `.xx` и `[xx]` */
  langs?: string[];
  /** выбранный перевод, если он не язык шапки: от него зависят имена порождённого */
  variant?: string;
  /** поля оригинала без перевода в этом варианте; видимые из них называет `lint` */
  untranslated?: Array<{ n: number; key: string; scene: number }>;
  voice: import("./voice/types.js").VoiceData | null;
  tail?: number;
  /** посторонние поставщики материала: имя → команда */
  providers?: Record<string, string>;
  /** кадр, кодирование и оформление — свойства ролика, а не инструмента */
  frame?: Frame;
  encode?: Encode;
  theme?: Theme;
  pronounce?: unknown;
  lang?: string;
  captions?: Captions;
  pip?: Pip;
  progress?: Progress;
  /** свои каталоги с картинками эмодзи Noto — дополняют поставляемый набор */
  emoji?: { dir: string };
  music?: Music;
  /** звуки-акценты ролика: момент ролика (секунды или доля музыки `m8`) и файл */
  sfx?: SfxCue[];
  /** цель громкости итога, LUFS */
  loudness?: number;
  /** false — ролик без звуковой дорожки (немой ролик под свою музыку или субтитры) */
  audio?: boolean;
  /** размытие движения камеры: подкадров на кадр и доля выдержки */
  motionBlur?: { samples: number; shutter: number };
  /** вид плёнки: грейд, виньетка, зерно, каше */
  look?: Look;
  /** пресет формата: кадр и безопасная зона */
  format?: string;
  /** где ролик смотрят: в ленте площадки (зона её кнопок) или вне её (поля симметричны) */
  zone?: Zone;
  safe?: Safe;
  /**
   * Горизонтальный сценарий, собираемый в другом формате (`build --format vertical`):
   * кадр, в котором свёрстаны его страницы и сняты клипы. Страницы и видео
   * кадрируются из него окном формата, а не перекладываются.
   */
  reframe?: { width: number; height: number };
  /** что сборка в другом формате оставила от вида плёнки: каше в высоком кадре не рисуется */
  lookNote?: string;
  scenes: RawScene[];
  dir: string;
}

export interface Column {
  title: string;
  text?: string;
  items?: string[];
  tone?: "bad" | "good" | "plain";
}

export interface Slide {
  id: string;
  kind: Exclude<SceneKind, "screen">;
  kicker?: string;
  title?: string;
  /** One complete explanatory sentence in an opening or chapter. */
  body?: string;
  left?: Column;
  right?: Column;
  nodes?: Array<{ label: string; kind?: "acc" | "bad" }>;
  back?: string;
  values?: Array<{ value: string; label: string }>;
  tags?: string[];
  parts?: Array<{ label: string; text: string }>;
  /** приписка под содержимым; порождается только чужими наборами данных */
  note?: string;
  /** пункты шагов, возможностей и таймлайна: значок, заголовок, пояснение */
  items?: Array<{ icon?: string; title: string; text?: string }>;
  /** картинка сцены, уже встроенная в страницу, и её размер в пикселях */
  image?: { src: string; width: number; height: number };
  /** куда наезжает картинка (доли кадра) и масштаб в начале и в конце сцены */
  focus?: [number, number];
  zoom?: [number, number];
  /** код: строки с номерами, уже размеченные подсветкой, и выделенные строки */
  code?: { lines: Array<{ no: number; html: string }>; name?: string; highlight: number[]; speed: number };
  /** рамка устройства вокруг снимка */
  device?: import("./device.js").Device;
  /** призыв и адрес финальной карточки */
  cta?: string;
  url?: string;
  /** живой фон слайда вместо того, что назвала тема */
  background?: string;
  /** где содержимое слайда стоит по высоте: сверху, посередине, снизу или разложено на всю высоту */
  align?: "top" | "center" | "bottom" | "fill";
  /** движение кадра целиком: медленный облёт, наезд или неподвижность */
  move?: "drift" | "push" | "still";
  /** крутить ли числа при появлении */
  count?: boolean;
  /** сколько тактов речи у сцены: от этого зависят умолчания моментов */
  beats?: number;
  /** как собираются заголовок и текст: стили кинетики (см. KINETIC) */
  text?: { title?: string; body?: string };
  /** как входят пункты слайда: имя входа поставщика слайдов */
  enter?: string;
  /** моменты появления элементов якорями: `b2`, `b2+0.4`, `40%`, `1.2s` */
  at?: string[];
  /** «было/стало»: второй снимок, подписи сторон и путь разделителя (доли ширины) */
  after?: { src: string; width: number; height: number };
  labels?: [string, string];
  split?: [number, number];
  /** параллакс: панели снимка (доли картинки) и их глубина 0…1, где 1 — ближе всего */
  panels?: Array<{ x: number; y: number; w: number; h: number; depth: number }>;
  /** график из CSV: вид, строки «подпись — значение», подсвеченная строка */
  chart?: { type: "bar" | "line"; rows: Array<{ label: string; value: number; shown: string }>; peak?: number };
}

export interface Deck { slides: Slide[] }

/** Подвижный фокус: «селектор @ якорь момента». */
export interface Focus { sel: string; at: string }

export interface PitchScene {
  id: string;
  /** поставщик материала и его вид — как их назвал заголовок сцены */
  provider: string;
  kind: string;
  /** страница либо готовый файл: что именно, знает поставщик */
  page: string;
  /** материал — видеофайл, а не страница */
  video?: boolean;
  target?: string;
  mustRead?: string;
  focus?: Focus[];
  offline?: boolean;
  tail?: number;
  /** такты речи: у каждого своя запись, своя длина и свой ключ кэша */
  beats: Beat[];
  caption: string;
  duration?: number;
  /** Freeze this second of a source clip for a camera-guided explanation. */
  freezeAt?: number;
  /** как клип другой пропорции ложится в кадр: целиком с полями или на весь кадр со срезом */
  fit?: Fit;
  /** кусок дубля, который показывает видеосцена: секунды исходного клипа */
  trim?: Trim;
  /** Retiming of the source clip: stretches played at another rate and stops of time. */
  speed?: SpeedStep[];
  effects: Record<string, unknown>;
  overlay?: SceneOverlay;
  /** накладка как написана, когда её моменты названы якорями тактов: сборка переводит их по речи */
  overlayRaw?: string;
  /** название главы, которая начинается этой сценой */
  chapter?: string;
  /** переход ИЗ предыдущей сцены В эту */
  transition?: Transition;
  /** фокусы внимания одной записью; сборка переводит их в камеру, карточки и замедление */
  spotlight?: Spotlight[];
  /** контрольные кадры: моменты, в которые сборка снимает кадр готового ролика в файл */
  stills?: Still[];
  /** наезды к местам кликов живого дубля */
  autoZoom?: AutoZoom;
  /** звуки-акценты сцены: момент — якорь сцены (`b2`, `1.5s`) */
  sfx?: SfxCue[];
  /** музыка с этой сцены: новая подложка или остановка музыки, с начала сцены или с якоря в ней */
  music?: SceneMusic;
  /** с какой секунды сцены начинается речь: сначала удар или картинка, потом голос */
  speechAt?: number;
  /** где на этой сцене стоят субтитры и подпись, поверх `captions.position` шапки */
  captionsAt?: CaptionPosition;
  /** вспышки и тряска кадра на якорях сцены */
  flash?: Hit[];
  shake?: Hit[];
  /** рамка устройства вокруг материала сцены */
  device?: Device;
  /** тема этой сцены поверх темы ролика: слайды, страница и слой сцены рисуются ею */
  theme?: Theme;
}

/** Звук-акцент: момент и файл рядом со сценарием; кусок файла и то, как акцент уступает речи. */
export interface SfxCue { at: string; file: string; gain?: number; from?: number; length?: number; fadeOut?: number; duck?: number; duckAll?: boolean }

/**
 * Музыка сцены. С файлом — новая подложка с момента `at` сцены: она сменяет прежнюю наплывом
 * длиной `fadeIn` и звучит до следующей смены, остановки или конца ролика. `stop` — музыка
 * замолкает в момент `at` за `fadeOut` секунд (по умолчанию почти мгновенно — это приём).
 */
export interface SceneMusic {
  at: string; stop?: boolean; file?: string; from?: number; level?: number; duck?: number; fadeIn?: number; fadeOut?: number;
}

export interface Pitch {
  scenes: PitchScene[];
  tail?: number;
  /** посторонние поставщики: их объявил ролик, и проверкам они тоже нужны */
  providers?: Record<string, string>;
  frame?: Frame;
  encode?: Encode;
  theme?: Theme;
  pronounce?: unknown;
  lang?: string;
  /** каталог источника: по нему разрешается путь к своему набору правил */
  dir?: string;
  captions?: Captions;
  pip?: Pip;
  progress?: Progress;
  emoji?: { dir: string };
  music?: Music;
  sfx?: SfxCue[];
  loudness?: number;
  audio?: boolean;
  motionBlur?: { samples: number; shutter: number };
  look?: Look;
  format?: string;
  safe?: Safe;
  reframe?: { width: number; height: number };
  lookNote?: string;
}

/**
 * Поля, допустимые у ЛЮБОЙ сцены: хвост тишины и временные аннотации
 * принадлежат композиции, а не конкретному поставщику материала.
 */
export const COMMON: string[] = ["tail", "overlay", "duration", "part", "transition", "fade", "sfx", "music", "flash", "shake", "speechAt", "captions", "spotlight", "theme", "stills"];

/**
 * Состав полей и их обязательность живут у ПОСТАВЩИКА и спрашиваются
 * у него. Второй список в ядре разошёлся бы с первым молча — этот дефект
 * в продукте уже случался трижды, и способ против него принят: описание
 * извлекается оттуда, где предмет живёт.
 */
export function specOf(scene: { provider: string; kind: string },
  providers: Record<string, string> = {}): KindSpec {
  const p = providerFor(scene.provider, providers);
  const kinds = p.kinds();
  const spec = kinds[scene.kind];
  if (!spec) {
    throw new SourceError(msg("provider.unknownKind", {
      provider: scene.provider, kind: scene.kind,
      kinds: Object.keys(kinds).join(", ") || "—" }));
  }
  return spec;
}

export class SourceError extends Error {
  readonly sourceError = true;
}

const err = (line: number, why: string): never => {
  throw new SourceError(msg("source.line", { line, why }));
};

export function beatsOf(prose: string[]): Beat[] {
  const beats: Beat[] = [];
  let text: string[] = [];
  let speech: string[] = [];
  const close = (): void => {
    const t = text.join(" ").replace(/\s+/g, " ").trim();
    const s = speech.join(" ").replace(/\s+/g, " ").trim();
    if (t || s) beats.push(s ? { text: t || s, speech: s } : { text: t });
    text = [];
    speech = [];
  };
  for (const raw of prose) {
    const line = raw.trim();
    if (!line) { close(); continue; }
    if (line.startsWith("~")) speech.push(line.slice(1).trim());
    else text.push(line);
  }
  close();
  return beats;
}

/**
 * Разбор якоря момента: `b2`, `b2.end`, `b2+0.4`, `b2-0.2`, `40%`, `1.2s`,
 * голое число — секунды. Возвращает номер такта, если якорь на такт,
 * иначе `null`; на мусоре бросает.
 *
 * Проверять значения обязательно. Имена полей разбор проверяет с самого
 * начала — ровно затем, чтобы опечатка не выбрасывала содержимое молча, —
 * а значения якорей принимались какими угодно: `b9` при трёх тактах
 * и `zz+` проходили и разбор, и проверку порядка, и сборку. Узнать
 * об этом можно было, только отрисовав кадр.
 */
export function beatOfAnchor(a: string): number | null {
  const text = a.trim();
  const beat = /^b(\d+)(\.end)?(?:\s*[+-]\s*[\d.]+)?$/i.exec(text);
  if (beat) return Number(beat[1]);
  if (/^[\d.]+\s*%$/.test(text)) return null;
  if (/^[\d.]+\s*s?$/i.test(text)) return null;
  throw new SourceError(msg("source.badAnchor", { anchor: text }));
}

/** Поля шапки ролика: по ним подсказывается ближайшее к опечатке. */
export const FILM_FIELDS = ["voice", "tail", "providers", "frame", "encode", "theme", "pronounce", "lang", "captions",
  "pip", "progress", "music", "sfx", "loudness", "audio", "motionBlur", "format", "zone", "look", "emoji"];

/**
 * Расстояние правки с перестановкой соседей: сколько знаков вставить, убрать,
 * заменить или поменять местами. Перестановка — самая частая опечатка
 * («titel»), и без неё она стоила бы двух правок и оставалась без подсказки.
 */
function distance(a: string, b: string): number {
  const A = a.toLowerCase(), B = b.toLowerCase();
  const d = Array.from({ length: A.length + 1 }, (_, i) => Array.from({ length: B.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= A.length; i++) {
    for (let j = 1; j <= B.length; j++) {
      const cost = A[i - 1] === B[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && A[i - 1] === B[j - 2] && A[i - 2] === B[j - 1]) v = Math.min(v, d[i - 2]![j - 2]! + 1);
      d[i]![j] = v;
    }
  }
  return d[A.length]![B.length]!;
}

/**
 * Подсказка к опечатке: ближайшее допустимое имя, если оно близко. Отказ
 * «поле titel недопустимо» заставлял читать схему; «возможно, title» —
 * нет.
 */
export function didYouMean(word: string, known: string[]): string {
  const best = known.map((k) => ({ k, d: distance(word, k) })).sort((x, y) => x.d - y.d)[0];
  return best && best.d <= Math.max(1, Math.floor(word.length / 3)) ? msg("source.didYouMean", { name: best.k }) : "";
}

/**
 * Многострочные поля сворачиваются в одну логическую строку до разбора.
 *
 *   key: |            — значение: следующие строки с отступом, переносы сохраняются
 *     первая строка     (код, длинный текст); если каждая строка начинается
 *     вторая строка     с «- », это список, и пункты соединяются через « | »
 *   key: {"a":        — JSON продолжается, пока не закроются скобки
 *     1}
 *
 * Прежде длинная накладка писалась одной строкой в несколько сотен знаков, и
 * ошибку в ней нельзя было найти глазами. Номер строки у свёрнутого поля —
 * номер его первой строки.
 */
export function foldLines(lines: string[]): Array<{ n: number; line: string }> {
  const out: Array<{ n: number; line: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!.trimEnd();
    const m = /^([a-zA-Z][a-zA-Z]*(?:\.[a-z]{2,3}(?:-[A-Za-z]{2,4})?)?):\s*(.*)$/.exec(raw);
    if (m && m[2] === "|") {
      const block: string[] = [];
      let j = i + 1;
      for (; j < lines.length; j++) {
        const l = lines[j]!.replace(/\s+$/, "");
        if (l === "" && j + 1 < lines.length && /^\s{2,}\S/.test(lines[j + 1]!)) { block.push(""); continue; }
        if (!/^\s{2,}\S/.test(l)) break;
        block.push(l);
      }
      const indent = Math.min(...block.filter(Boolean).map((l) => /^\s*/.exec(l)![0].length));
      const body = block.map((l) => l.slice(Number.isFinite(indent) ? indent : 0));
      const items = body.filter(Boolean);
      const value = items.length && items.every((l) => l.startsWith("- "))
        ? items.map((l) => l.slice(2).trim()).join(" | ") : body.join("\n");
      out.push({ n: i + 1, line: `${m[1]}: ${value}` });
      i = j - 1;
      continue;
    }
    if (m && /^[[{]/.test(m[2]!.trim())) {
      // Считаются скобки вне строк JSON: закрылись — значение кончилось.
      let text = raw, j = i;
      const open = (t: string): number => {
        let depth = 0, str = false, esc = false;
        for (const ch of t.slice(t.indexOf(":") + 1)) {
          if (str) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') str = false; continue; }
          if (ch === '"') str = true; else if (ch === "{" || ch === "[") depth++; else if (ch === "}" || ch === "]") depth--;
        }
        return depth;
      };
      while (open(text) > 0 && j + 1 < lines.length && lines[j + 1]!.trim() !== "" && !/^##? /.test(lines[j + 1]!)) {
        j++;
        text += " " + lines[j]!.trim();
      }
      out.push({ n: i + 1, line: text });
      i = j;
      continue;
    }
    out.push({ n: i + 1, line: raw });
  }
  return out;
}

/** Имя языка в суффиксе поля и в метке блока речи: `ru`, `en`, `pt-BR`. */
const LANG = "[a-z]{2,3}(?:-[A-Za-z]{2,4})?";
const LOCAL_KEY = new RegExp(`^([a-zA-Z][a-zA-Z]*)\\.(${LANG}):\\s*([\\s\\S]*)$`);
const LANG_BLOCK = new RegExp(`^\\[(${LANG})\\]$`);
const FIELD = /^([a-zA-Z][a-zA-Z]*):\s*([\s\S]*)$/;

export interface Localized {
  lines: Array<{ n: number; line: string }>;
  /** язык шапки и все языки переводов, по порядку появления */
  langs: string[];
  /** выбранный язык, если он не язык шапки */
  variant?: string;
  /** поля чужих языков, выброшенные из этого варианта: их имена проверяются всё равно */
  dropped: Array<{ n: number; key: string; scene: number }>;
  /** поля оригинала, оставшиеся в варианте без перевода; `scene` −1 — шапка */
  untranslated: Array<{ n: number; key: string; scene: number }>;
  errors: Array<{ n: number; why: string }>;
}

/**
 * Один сценарий на несколько языков: вариант выбирается до разбора.
 *
 * Перевод пишется рядом с оригиналом: поле — с суффиксом языка (`title.ru:`,
 * `overlay.ru:`, `page.ru: page.ru.html`, в шапке `voice.ru:` и `title.ru:` для
 * названия ролика), речь — блоком после метки `[ru]` внутри сцены. Язык шапки
 * (`lang:`) — язык полей без суффикса. Выбранный вариант подменяет поле его
 * переводом на том же месте, а речь — блоком перевода; поля и блоки остальных
 * языков выбрасываются. Дальше идёт обычный разбор, поэтому перевод проверяется
 * теми же правилами, что и оригинал.
 *
 * Монтаж у всех языков один: якоря `b2`, `b3` называют такты по номеру, поэтому
 * у перевода столько же тактов, сколько у оригинала, и сцена с речью без
 * перевода — ошибка варианта, а не молчаливая подстановка чужого языка.
 */
export function localize(folded: Array<{ n: number; line: string }>, want?: string): Localized {
  const errors: Localized["errors"] = [], dropped: Localized["dropped"] = [], untranslated: Localized["untranslated"] = [];
  // Разбивка на шапку и сцены: у каждой — поля, речь оригинала и блоки переводов.
  interface Part { head?: { n: number; line: string }; body: Array<{ n: number; line: string }> }
  const parts: Part[] = [{ body: [] }];
  for (const l of folded) {
    if (l.line.startsWith("## ")) parts.push({ head: l, body: [] });
    else parts[parts.length - 1]!.body.push(l);
  }
  let base: string | undefined;
  const langs: string[] = [];
  const note = (x: string): void => { if (!langs.includes(x)) langs.push(x); };
  for (const l of parts[0]!.body) {
    const m = FIELD.exec(l.line);
    if (m && m[1] === "lang") base = m[2]!.trim();
  }
  if (base) note(base);
  for (const p of parts) for (const l of p.body) {
    const k = LOCAL_KEY.exec(l.line), b = LANG_BLOCK.exec(l.line.trim());
    if (k) note(k[2]!); else if (b) note(b[1]!);
  }
  const target = want && want !== base ? want : undefined;
  if (target && !langs.includes(target)) {
    errors.push({ n: 1, why: `lang ${target}: the scenario has no ${target} text; write title.${target}:, fields like overlay.${target}: and a [${target}] block of narration in each scene` });
  }
  if (!base && langs.length) errors.push({ n: 1, why: "a scenario with translations names its own language in the header: lang: en" });

  const out: Array<{ n: number; line: string }> = [];
  parts.forEach((p, idx) => {
    const scene = idx - 1;
    if (p.head) out.push(p.head);
    // Первый проход: переводы полей и блоки речи этой части.
    const local = new Map<string, { n: number; value: string }>();
    const blocks = new Map<string, Array<{ n: number; line: string }>>();
    const baseKeys = new Set<string>();
    let inProse = false, block: string | null = null;
    const baseProse: Array<{ n: number; line: string }> = [];
    for (const l of p.body) {
      const b = LANG_BLOCK.exec(l.line.trim());
      if (b && p.head) { block = b[1]!; blocks.set(block, blocks.get(block) ?? []); continue; }
      if (block) { blocks.get(block)!.push(l); continue; }
      const k = !inProse ? LOCAL_KEY.exec(l.line) : null;
      if (k) {
        if (k[2] === target) local.set(k[1]!, { n: l.n, value: k[3]! });
        else dropped.push({ n: l.n, key: k[1]!, scene });
        continue;
      }
      const f = !inProse ? FIELD.exec(l.line) : null;
      if (f) { baseKeys.add(f[1]!); continue; }
      if (p.head && l.line.trim()) { inProse = true; baseProse.push(l); }
      else if (inProse) baseProse.push(l);
    }
    // Второй проход: вывод варианта.
    const translated = target ? blocks.get(target) : undefined;
    const paragraphs = (ls: Array<{ line: string }>): number =>
      ls.map((x) => x.line.trim()).join("\n").split(/\n\s*\n/u).filter((x) => x.trim()).length;
    if (target && p.head && baseProse.some((x) => x.line.trim()) && !translated) {
      errors.push({ n: p.head.n, why: `scene ${p.head.line.slice(3).split("·")[0]!.trim()}: no [${target}] narration; each spoken scene is translated beat for beat` });
    }
    if (translated && paragraphs(translated) !== paragraphs(baseProse)) {
      errors.push({ n: translated[0]?.n ?? p.head!.n, why: `scene ${p.head!.line.slice(3).split("·")[0]!.trim()}: [${target}] has ${paragraphs(translated)} beats, the original ${paragraphs(baseProse)}; anchors like b2 name beats by number, so a translation keeps the same beats` });
    }
    inProse = false; block = null;
    for (const l of p.body) {
      const b = LANG_BLOCK.exec(l.line.trim());
      if (b && p.head) { block = b[1]!; continue; }
      if (block) { if (block === target) out.push(l); continue; }
      if (!inProse && LOCAL_KEY.exec(l.line)) {
        const k = LOCAL_KEY.exec(l.line)!;
        // Перевод поля, которого нет в оригинале, встаёт на своём месте.
        if (k[2] === target && !baseKeys.has(k[1]!)) {
          if (!p.head && k[1] === "title") out.push({ n: l.n, line: `# ${k[3]!.trim()}` });
          else out.push({ n: l.n, line: `${k[1]}: ${k[3]}` });
        }
        continue;
      }
      const f = !inProse ? FIELD.exec(l.line) : null;
      if (f) {
        const t = local.get(f[1]!);
        if (target && !t && !(!p.head && f[1] === "lang")) untranslated.push({ n: l.n, key: f[1]!, scene });
        if (!p.head && f[1] === "lang" && target) out.push({ n: l.n, line: `lang: ${target}` });
        else out.push(t ? { n: t.n, line: `${f[1]}: ${t.value}` } : l);
        continue;
      }
      if (!p.head && l.line.startsWith("# ") && target && !local.has("title")) untranslated.push({ n: l.n, key: "title", scene: -1 });
      if (!p.head && l.line.startsWith("# ") && target && local.has("title")) {
        out.push({ n: local.get("title")!.n, line: `# ${local.get("title")!.value.trim()}` });
        continue;
      }
      if (p.head && l.line.trim()) inProse = true;
      if (inProse && translated) continue;
      out.push(l);
    }
  });
  return { lines: out, langs, ...(target ? { variant: target } : {}), dropped, untranslated, errors };
}

export function parseSource(file: string, opts: { lang?: string; format?: string } = {}): Source {
  // Язык сбрасывается к тому, что задало окружение, и только затем ролик
  // может его назвать. Без сброса язык прошлого разбора оставался бы
  // назначенным: в одном процессе роликов бывает несколько — так, сервер
  // записи разбирает свой сценарий, а проверка рядом чужой, — и второй
  // говорил бы языком первого. Обнаружено прогоном: сообщения соседнего
  // разбора приходили на чужом языке.
  useLang(undefined);
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");
  const out: Source = { title: "", voice: null, scenes: [], dir: dirname(resolve(file)) };
  let lookLine = 1;
  const spec = (sc: { provider: string; kind: string }): KindSpec => specOf(sc, out.providers ?? {});
  let scene: RawScene | null = null;
  let prose: string[] = [];

  const closeScene = () => {
    const s = scene;
    if (!s) return;
    const beats = beatsOf(prose);
    const caption = beats.map((b) => b.text).join(" ").replace(/\s+/g, " ").trim();
    s.beats = beats;
    // Речь обязательна всем, кроме видов, объявивших себя молчаливыми:
    // ею задаётся длина сцены, и её отсутствие — почти всегда обрыв
    // сценария. У готового видео длину задаёт файл.
    if (!beats.length && !spec(s).silentOk) err(s.__line ?? 0, msg("source.noSpeech", { id: s.id }));
    if (s.fields.duration !== undefined) {
      const duration = Number(s.fields.duration);
      if (!Number.isFinite(duration) || duration <= 0 || duration > 600)
        err(s.__line ?? 0, `duration in ${s.id} must be >0 and <=600 seconds`);
    }
    // Отметки живого дубля: `@имя` в полях видеосцены становится секундами
    // из файла отметок рядом с роликом, до всех остальных проверок.
    if (spec(s).video && s.fields.file) {
      const full = marksOf(resolve(out.dir, s.fields.file));
      // Кусок дубля: `from`/`to` — секунды или отметки исходного клипа. Дальше все секунды клипа
      // в сцене — отметки, `speed`, `freezeAt`, `stills` — считаются от начала куска.
      let trim: Trim | undefined;
      if (s.fields.from !== undefined || s.fields.to !== undefined) {
        try {
          const sec = (k: "from" | "to"): number | undefined => s.fields[k] === undefined ? undefined
            : Number(resolveMarks(s.fields[k]!.trim(), full, `scene ${s.id} ${k}`));
          const from = sec("from") ?? 0, to = sec("to");
          if (!Number.isFinite(from) || from < 0) throw new Error(`scene ${s.id}: from must be a second of the clip or a take's @mark`);
          if (to !== undefined && !(Number.isFinite(to) && to > from)) throw new Error(`scene ${s.id}: to must come after from (${from}s)`);
          s.fields.from = String(from);
          if (to !== undefined) s.fields.to = String(to);
          trim = { from, ...(to !== undefined ? { to } : {}) };
        } catch (e) { err(s.__line ?? 0, String((e as Error).message)); }
      }
      const marks = trimMarks(full, trim);
      // Элемент, записанный в дубле у отметки (`take.mark(name, locator)`), — цель по имени:
      // `"area":"@name"` в накладке и фокусе становится его прямоугольником в долях кадра, как
      // клип ложится в кадр (fit). В рамке устройства области и так в долях клипа.
      for (const k of ["overlay", "spotlight"]) {
        if (!s.fields[k]?.includes('"@')) continue;
        s.fields[k] = s.fields[k]!.replace(/"area"\s*:\s*"@([A-Za-z][\w-]*)"/g, (_, name: string) => {
          const rect = full?.rects?.[name];
          if (!rect) {
            err(s.__line ?? 0, `scene ${s.id} ${k}: area @${name} needs the element recorded with take.mark("${name}", locator)`
              + (full?.rects ? `; recorded: ${Object.keys(full.rects).join(", ") || "none"}` : ""));
            return '"area":[0,0,1,1]';
          }
          const frame = frameOf(out.format, out.frame) ?? { width: 1920, height: 1080 };
          let fit: Fit | undefined;
          try { fit = s.fields.fit ? parseFit(s.fields.fit) : undefined; } catch { fit = undefined; }
          const clip = (full as { size?: { width: number; height: number } }).size ?? { width: Number(frame.width), height: Number(frame.height) };
          const area = s.fields.device ? rect : clipToFrame(rect, clip, { width: Number(frame.width), height: Number(frame.height) }, fit);
          return `"area":${JSON.stringify(area)}`;
        });
      }
      // В накладке отметкой бывает только момент (`"at":"@saved"`): текст карточки или стикера
      // вида «@handle» — проза, а не ссылка.
      if (s.fields.overlay?.includes('"@')) {
        s.fields.overlay = s.fields.overlay.replace(/"at"\s*:\s*"(@[^"]+)"/g, (whole, ref: string) => {
          try { return `"at":${resolveMarks(ref, marks, `scene ${s.id} overlay`)}`; }
          catch (e) { err(s.__line ?? 0, String((e as Error).message)); return whole; }
        });
      }
      for (const k of ["freezeAt", "speed", "spotlight"]) {
        if (s.fields[k]?.includes("@")) {
          try { s.fields[k] = resolveMarks(s.fields[k], marks, `scene ${s.id} ${k}`); }
          catch (e) { err(s.__line ?? 0, String((e as Error).message)); }
        }
      }
      // У контрольных кадров отметка — отдельный момент: он становится секундой клипа с пометкой,
      // чтобы сборка сдвинула её вместе с замедлением и остановками клипа.
      if (s.fields.stills?.split("|").some((i) => i.split("::")[0]!.includes("@"))) {
        try {
          s.fields.stills = s.fields.stills.split("|").map((item) => {
            const [moment, ...rest] = item.split("::");
            const m = moment!.trim();
            return m.startsWith("@") ? [`clip:${resolveMarks(m, marks, `scene ${s.id} stills`)}`, ...rest].join(" ::") : item;
          }).join("|");
        } catch (e) { err(s.__line ?? 0, String((e as Error).message)); }
      }
      if (s.fields.autoZoom) {
        if (!marks) err(s.__line ?? 0, `scene ${s.id}: autoZoom needs the clicks recorded by agentic-screencast/capture (${s.fields.file}.marks.json)`);
        try { parseAutoZoom(s.fields.autoZoom); } catch (e) { err(s.__line ?? 0, `scene ${s.id}: ${(e as Error).message}`); }
        if (s.fields.speed) err(s.__line ?? 0, `scene ${s.id}: autoZoom follows the clip's own time and cannot share a scene with speed`);
      }
    }
    if (s.fields.stills !== undefined) {
      // У видеосцены отметки уже заменены секундами выше (или об ошибке уже сказано там).
      if (!spec(s).video && s.fields.stills.split("|").some((i) => i.split("::")[0]!.includes("@"))) err(s.__line ?? 0, `scene ${s.id} stills: a take's @mark works only on a video scene with its .marks.json`);
      try { parseStills(s.fields.stills, `scene ${s.id} stills`); } catch (e) { err(s.__line ?? 0, (e as Error).message); }
    }
    if (s.fields.freezeAt !== undefined) {
      const freezeAt = Number(s.fields.freezeAt);
      if (!Number.isFinite(freezeAt) || freezeAt < 0)
        err(s.__line ?? 0, `freezeAt in ${s.id} must be a non-negative second`);
    }
    if (!beats.length && spec(s).silentOk && !spec(s).video && !s.fields.duration)
      err(s.__line ?? 0, `silent scene ${s.id} needs duration`);
    // Отсутствие обязательного поля — ошибка разбора, а не пустой слайд:
    // раньше `toDeck` спотыкался на этом дампом чтения несуществующей
    // строки, то есть о причине читателю не сообщал никто.
    for (const group of spec(s).required) {
      if (group.some((f) => s.fields[f])) continue;
      const names = group.map((f) => `«${f}»`).join(" / ");
      err(s.__line ?? 0, msg("source.required", { id: s.id, kind: s.kind, names }));
    }
    if (s.fields.overlay) {
      try { parseOverlay(s.fields.overlay, overlayMoment(s.beats, s.fields, out.voice)); }
      catch (e) { err(s.__line ?? 0, String((e as Error).message)); }
    }
    // Переигрывание проверяется здесь же, на разборе: негодная запись
    // иначе всплыла бы отказом `ffmpeg` посреди сборки, где о причине
    // читателю не скажет никто.
    if (s.fields.transition) {
      try {
        const t = parseTransition(s.fields.transition);
        if (t.sound && !existsSync(resolve(out.dir, t.sound))) throw new Error(`transition.sound: file not found: ${t.sound}`);
      } catch (e) { err(s.__line ?? 0, `scene ${s.id}: ${String((e as Error).message)}`); }
    }
    if (s.fields.captions !== undefined && !(CAPTION_POSITIONS as readonly string[]).includes(s.fields.captions.trim()))
      err(s.__line ?? 0, `scene ${s.id}: captions: expected ${CAPTION_POSITIONS.join(" | ")} — where this scene's subtitles stand`);
    if (s.fields.speechAt !== undefined) {
      const v = Number(s.fields.speechAt.replace(/s$/i, ""));
      if (!Number.isFinite(v) || v < 0 || v > 10) err(s.__line ?? 0, `scene ${s.id}: speechAt: expected 0–10 seconds from the scene's start`);
    }
    for (const k of ["flash", "shake"] as const) {
      if (!s.fields[k]) continue;
      try { parseHits(s.fields[k], k); }
      catch (e) { err(s.__line ?? 0, `scene ${s.id}: ${String((e as Error).message)}`); }
    }
    if (s.fields.fit) {
      try { parseFit(s.fields.fit); }
      catch (e) { err(s.__line ?? 0, `scene ${s.id}: ${String((e as Error).message)}`); }
    }
    if (s.fields.music) {
      try { parseSceneMusic(s.fields.music, out.dir); }
      catch (e) { err(s.__line ?? 0, `scene ${s.id}: ${String((e as Error).message)}`); }
    }
    if (s.fields.fade) {
      try { parseFade(s.fields.fade); }
      catch (e) { err(s.__line ?? 0, `scene ${s.id}: ${String((e as Error).message)}`); }
    }
    if (s.fields.sfx) {
      try { parseSfx(s.fields.sfx, out.dir, `scene ${s.id} sfx`, SCENE_ANCHOR); }
      catch (e) { err(s.__line ?? 0, String((e as Error).message)); }
    }
    if (s.fields.spotlight) {
      try {
        const list = parseSpotlight(s.fields.spotlight);
        if (s.fields.speed && list.some((f) => f.slow !== undefined))
          throw new Error("a spotlight that slows the clip and a speed field cannot share a scene; keep one of them");
      } catch (e) { err(s.__line ?? 0, `scene ${s.id}: ${String((e as Error).message)}`); }
    }
    if (s.fields.theme) {
      try { sceneTheme(s.fields.theme, out.theme); }
      catch (e) { err(s.__line ?? 0, `scene ${s.id}: theme: ${String((e as Error).message)}`); }
    }
    if (s.fields.device) {
      try { parseDevice(s.fields.device); }
      catch (e) { err(s.__line ?? 0, `scene ${s.id}: ${String((e as Error).message)}`); }
    }
    if (s.fields.speed) {
      try { parseSpeed(s.fields.speed); }
      catch (e) { err(s.__line ?? 0, String((e as Error).message)); }
    }
    // Якоря проверяются здесь, а не при чтении поля: номер такта имеет
    // смысл только когда речь сцены разобрана целиком.
    const anchors: string[] = [
      ...(s.fields.at ? s.fields.at.split(/\s+/) : []),
      ...(s.fields.spotFrom ? [s.fields.spotFrom] : []),
      ...(s.fields.focus ? s.fields.focus.split("|").map((x) => x.split("@")[1] ?? "") : []),
      ...[...(s.fields.overlay ?? "").matchAll(/"at"\s*:\s*"(b\d[^"]*)"/g)].map((m) => m[1]!),
    ].filter((x) => x.trim());
    for (const a of anchors) {
      let n: number | null;
      try { n = beatOfAnchor(a); }
      catch (e) { err(s.__line ?? 0, String((e as Error).message)); continue; }
      if (n !== null && n > beats.length) {
        err(s.__line ?? 0, msg("source.beatOutOfRange",
          { anchor: a.trim(), id: s.id, beats: beats.length }));
      }
    }
    s.caption = caption;
    delete s.__line;
    out.scenes.push(s);
    scene = null;
    prose = [];
  };

  // Вариант языка выбирается до разбора: `--lang` у команды доходит сюда окружением.
  const loc = localize(foldLines(lines), opts.lang ?? (process.env.AGENTIC_SCREENCAST_FILM_LANG || undefined));
  for (const e of loc.errors) err(e.n, e.why);
  if (loc.langs.length > 1) out.langs = loc.langs;
  if (loc.variant) { out.variant = loc.variant; out.untranslated = loc.untranslated; }
  for (const { n, line } of loc.lines) {

    if (line.startsWith("# ")) { out.title = line.slice(2).trim(); continue; }

    if (line.startsWith("## ")) {
      closeScene();
      const [id, what] = line.slice(3).split("·").map((s) => s.trim());
      if (!id || !what) err(n, msg("source.badHeader"));
      // До точки — поставщик материала, после — его вид. Без точки имя
      // значит и то и другое: так устроены поставщики с единственным
      // видом, вроде готовой страницы и готового видео.
      const dot = what!.indexOf(".");
      const providerName = dot > 0 ? what!.slice(0, dot) : what!;
      const kind = dot > 0 ? what!.slice(dot + 1) : what!;
      scene = { id: id as string, provider: providerName, kind, __line: n,
        fields: {}, beats: [], caption: "" };
      // Вид проверяется СРАЗУ: иначе опечатка в имени всплывёт много позже,
      // на первом же поле, и читатель будет чинить поле вместо заголовка.
      try { spec(scene); } catch (e) { err(n, String((e as Error).message)); }
      continue;
    }

    const m = line.match(/^([a-zA-Z][a-zA-Z]*):\s*([\s\S]*)$/);
    if (m && (!scene || prose.length === 0)) {
      const [, key, value] = m;
      if (!scene) {                       // шапка ролика
        if (key === "voice") out.voice = JSON.parse(value!) as import("./voice/types.js").VoiceData;
        else if (key === "tail") out.tail = Number(value);
        // Посторонние поставщики объявляются ДО первой сцены: их имена
        // нужны уже на разборе заголовка, а шапка ролика идёт раньше.
        else if (key === "providers") out.providers = JSON.parse(value!) as Record<string, string>;
        // Кадр, кодирование и оформление — данные ролика. Прежде это были
        // числа в ядре, и вертикальный ролик или светлую тему нельзя было
        // сделать, не правя инструмент.
        else if (key === "frame") out.frame = JSON.parse(value!) as Frame;
        else if (key === "encode") out.encode = JSON.parse(value!) as Encode;
        // Тема пишется именем (`theme: synthwave`), набором переменных
        // или тем и другим (`{"preset":"noir","--acc":"#fff"}`). Разрешается
        // она СРАЗУ: дальше по течению тема — всегда плоский набор, и ни
        // страница слайдов, ни слой композиции о поставляемых наборах
        // не знают.
        else if (key === "theme") {
          const raw = value!.trim();
          const written: ThemeInput = raw.startsWith("{")
            ? (JSON.parse(raw) as ThemeInput) : raw;
          try { out.theme = resolveTheme(written); }
          catch (e) { err(n, String((e as Error).message)); }
        }
        // Правила чтения и язык — свойства РОЛИКА. Прежде правила
        // выбирались по имени движка голоса, то есть инструмент решал
        // за автора, на каком языке его ролик.
        else if (key === "pronounce") {
          // Путь к набору правил пишут и без кавычек: `pronounce: rules.json` — это строка, а не ошибка JSON.
          try { out.pronounce = JSON.parse(value!) as unknown; } catch { out.pronounce = value!.trim(); }
        }
        else if (key === "lang") { out.lang = value!.trim(); useLang(out.lang); }
        else if (key === "captions") {
          try { out.captions = parseCaptions(value!); } catch (e) { err(n, String((e as Error).message)); }
        } else if (key === "pip") {
          try { out.pip = parsePip(value!); } catch (e) { err(n, String((e as Error).message)); }
        } else if (key === "progress") {
          try { out.progress = parseProgress(value!); } catch (e) { err(n, String((e as Error).message)); }
        } else if (key === "music") {
          try { out.music = parseMusic(value!, out.dir); } catch (e) { err(n, String((e as Error).message)); }
        } else if (key === "sfx") {
          try { out.sfx = parseSfx(value!, out.dir, "sfx", /^(m\d+(\.\d+)?|[\d.]+s?)$/); }
          catch (e) { err(n, String((e as Error).message)); }
        } else if (key === "loudness") {
          const v = Number(value);
          if (!Number.isFinite(v) || v < -30 || v > -8) err(n, "loudness: expected a LUFS target from -30 to -8");
          out.loudness = v;
        } else if (key === "audio") {
          if (value!.trim() !== "false" && value!.trim() !== "true") err(n, "audio: expected false (a film without a sound track) or true");
          out.audio = value!.trim() !== "false";
        } else if (key === "motionBlur") {
          const raw = value!.trim();
          if (raw === "true") out.motionBlur = { samples: 6, shutter: 0.5 };
          else {
            try {
              const v = JSON.parse(raw) as { samples?: unknown; shutter?: unknown };
              const samples = v.samples === undefined ? 6 : Number(v.samples);
              const shutter = v.shutter === undefined ? 0.5 : Number(v.shutter);
              if (!Number.isInteger(samples) || samples < 2 || samples > 16) throw new Error("motionBlur.samples: expected 2–16");
              if (!(shutter > 0 && shutter <= 1)) throw new Error("motionBlur.shutter: expected a share of the frame from 0 to 1");
              out.motionBlur = { samples, shutter };
            } catch (e) { err(n, String((e as Error).message)); }
          }
        } else if (key === "format") {
          try { out.format = parseFormat(value!); } catch (e) { err(n, String((e as Error).message)); }
        } else if (key === "zone") {
          try { out.zone = parseZone(value!); } catch (e) { err(n, String((e as Error).message)); }
        } else if (key === "look") {
          try { out.look = parseLook(value!); lookLine = n; } catch (e) { err(n, String((e as Error).message)); }
        } else if (key === "emoji") {
          try {
            const v = JSON.parse(value!) as { dir?: unknown };
            if (typeof v.dir !== "string" || !v.dir.trim()) throw new Error("emoji: expected {\"dir\":\"<folder>\"}");
            out.emoji = { dir: v.dir.trim() };
          } catch (e) { err(n, String((e as Error).message)); }
        }
        else err(n, msg("source.badFilmField", { key: key! }) + didYouMean(key!, FILM_FIELDS));
        continue;
      }
      if (!spec(scene).fields.includes(key!) && !COMMON.includes(key!))
        err(n, msg("source.badField", { key: key!, kind: scene.kind }) + didYouMean(key!, [...spec(scene).fields, ...COMMON]));
      scene.fields[key!] = value!.trim();
      continue;
    }

    if (line.trim() === "") { if (prose.length) prose.push(""); continue; }
    if (scene) prose.push(line.trim());
    else if (line.trim()) err(n, msg("source.textOutside"));
  }
  closeScene();
  // Поле чужого языка выброшено из варианта, но его имя проверяется всё равно:
  // опечатка в `titel.ru` иначе всплыла бы только в сборке на русском.
  for (const d of loc.dropped) {
    if (d.scene < 0) {
      if (d.key !== "title" && !FILM_FIELDS.includes(d.key)) err(d.n, msg("source.badFilmField", { key: d.key }) + didYouMean(d.key, FILM_FIELDS));
      continue;
    }
    const sc = out.scenes[d.scene];
    if (sc && !spec(sc).fields.includes(d.key) && !COMMON.includes(d.key))
      err(d.n, msg("source.badField", { key: d.key, kind: sc.kind }) + didYouMean(d.key, [...spec(sc).fields, ...COMMON]));
  }

  // Сборка горизонтального сценария в другом формате (`build --format vertical`).
  // Сценарий не переписывается: его страницы свёрстаны в своём кадре, клипы сняты
  // в нём же, и сборка кадрирует их окном нового формата у цели фокуса. Слайды
  // рисуются заново под новый кадр — у них вёрстка и есть содержание.
  const want = opts.format ?? (process.env.AGENTIC_SCREENCAST_FILM_FORMAT || undefined);
  if (want && want !== (out.format ?? "landscape")) {
    try { parseFormat(want); } catch (e) { err(1, `--format: ${(e as Error).message}`); }
    if (out.format && out.format !== "landscape") err(1, `--format ${want}: the scenario is already ${out.format}; only a landscape scenario is reframed`);
    if (want !== "landscape") {
      const src = { width: Number(out.frame?.width ?? 1920), height: Number(out.frame?.height ?? 1080) };
      out.reframe = src;
      const { width: _w, height: _h, ...rest } = out.frame ?? {};
      out.frame = rest as Frame;
      out.format = want;
      // Каше — приём широкого кадра; в высоком от него осталась бы лента.
      if (out.look?.bars) {
        const { bars: _b, ...look } = out.look;
        out.look = look;
        out.lookNote = `letterbox bars are not drawn in a ${want} build of a landscape scenario`;
      }
    }
  }
  // Формат разрешается в конце шапки: `frame` может стоять и до него, и после,
  // и названные им числа перекрывают числа пресета.
  if (out.format) {
    out.frame = frameOf(out.format, out.frame);
    const safe = safeOf(out.format, out.frame, "safe", out.zone);
    if (safe) out.safe = safe;
    // Название части в ленте площадки встаёт у края зоны: у края кадра его закроют имя и кнопки
    // площадки. Вне ленты (`zone: plain`) ему место в строке полосы хода — там оно не ложится
    // на интерфейс в кадре.
    if (out.progress && !out.progress.label) out.progress = { ...out.progress, label: safe && out.zone !== "plain" ? "zone" : "edge" };
  }
  // Каше ложится на готовый ролик поверх всех сцен, поэтому всё, что читают, —
  // подписи, субтитры, карточки, содержимое слайдов — раскладывается между
  // полосами: полоса входит в безопасную зону. Высокому кадру каше не нужно:
  // в вертикали от 2.39 остаётся лента в четверть высоты.
  if (out.look?.bars) {
    const w = Number(out.frame?.width ?? 1920), h = Number(out.frame?.height ?? 1080);
    if (w <= h * 1.2) err(lookLine, `look.bars: letterbox bars need a landscape frame, this film is ${w}×${h}; use a look without bars, e.g. look: cinematic`);
    const bar = Math.max(0, Math.round((h - w / out.look.bars) / 2));
    if (bar > 0) {
      const z = out.safe ?? { top: 0, bottom: 0, left: 0, right: 0 };
      out.safe = { ...z, top: Math.max(z.top, bar), bottom: Math.max(z.bottom, bar) };
    }
  }
  if (!out.scenes.length) err(1, msg("source.noScenes"));
  // Ролик без темы носит ночную тему из таблицы тем: запасных значений в коде рисования больше нет.
  out.theme ??= resolveTheme(undefined);
  return out;
}

/**
 * Каталог порождённых слайдов относительно источника. Одна константа на весь
 * продукт: разойдись она с той, по которой слайды пишутся, — и сборка возьмёт
 * подложки из пустого места, что уже случалось.
 */
export const SLIDES_DIR = "slides";

/**
 * Тема сцены. Названная тема (`theme: noir`, `{"preset":"noir",…}`) берётся целиком, как в
 * шапке: иначе переменные темы ролика, которых нет в названной, протекли бы в сцену. Набор
 * переменных без имени ложится поверх темы ролика — чтобы сменить акцент одной сцены, не
 * переписывая тему.
 */
export function sceneTheme(raw: string, film: Theme | undefined): Theme {
  const text = raw.trim();
  const written = (text.startsWith("{") ? JSON.parse(text) : text) as ThemeInput;
  if (typeof written === "string" || written.preset !== undefined) return resolveTheme(written);
  return resolveTheme(written, film ?? resolveTheme(undefined));
}

/**
 * Якоря тактов в `at` накладки — в секунды по оценке тактов: разбор сценария ещё не знает
 * звука. Сборка переводит те же якоря заново по измеренным тактам (`overlayRaw`).
 */
export function overlayMoment(beats: Beat[], fields: Record<string, string | undefined>, voice: Source["voice"]): (a: string) => number {
  const cps = Number((voice as { cps?: number } | null)?.cps) > 0 ? Number((voice as { cps: number }).cps) : 15;
  const { starts, ends } = estimateBeats(beats, Number((fields.speechAt ?? "0").replace(/s$/i, "")) || 0, cps);
  const duration = Math.max(ends.at(-1) ?? 0, Number(fields.duration) || 0);
  return (a) => anchorSeconds(a, starts.length ? starts : [0], duration, ends);
}

/** В накладке есть момент, названный якорем такта, — сборка переводит его по измеренной речи. */
const overlayAnchored = (raw: string): boolean => /"at"\s*:\s*"(?!@)/.test(raw);

/**
 * Сцены источника → сцены сборки.
 *
 * Ядро не знает ни одного вида сцены: чем сцена нарисована и как она
 * движется, говорит поставщик. Сцена вправе перебить его расписание
 * своими полями — `zoom`, `spotFrom`, `focus`, — но выбирать умолчание
 * ядру не приходится.
 */
export function toPitch(src: Source, slidesDir: string = SLIDES_DIR): Pitch {
  // Части ролика: явные `part:` берут верх. Если автор назвал части сам, заставки глав и титры
  // (виды с `chapterFrom`) новых частей не открывают — иначе обзор с пятнадцатью частями получал в
  // полосе хода и в главах каждый титр и каждую заставку темы отдельной частью.
  const explicitParts = src.scenes.some((s) => s.fields.part);
  const scenes: PitchScene[] = src.scenes.map((s): PitchScene => {
    const f = s.fields;
    const spec = specOf(s, src.providers ?? {});
    // Материал: готовый файл, названный полем, либо страница, которую
    // поставщик порождает рядом с источником.
    const page = spec.fileField ? f[spec.fileField]! : `${slidesDir}/${s.id}.html`;
    const effects: Record<string, unknown> = { ...spec.effects };
    // Наезд и пятно — ручки самой сцены поверх умолчаний поставщика.
    const zoom = effects.zoom as Record<string, unknown> | undefined;
    if (zoom) effects.zoom = { ...zoom, scale: Number(f.zoom ?? (zoom.scale as number) ?? 1) };
    const spot = effects.spot as Record<string, unknown> | undefined;
    if (spot && f.spotFrom) effects.spot = { ...spot, from: f.spotFrom };
    // Затемнения краёв сцены: поле сцены поверх умолчаний поставщика.
    if (f.fade) effects.fade = { ...(effects.fade as Record<string, unknown> | undefined), ...parseFade(f.fade) };
    return {
      ...(f.tail ? { tail: Number(f.tail) } : {}),
      ...(f.duration ? { duration: Number(f.duration) } : {}),
      ...(f.freezeAt ? { freezeAt: Number(f.freezeAt) } : {}),
      ...(f.fit ? { fit: parseFit(f.fit) } : {}),
      ...(spec.video && (f.from !== undefined || f.to !== undefined) ? { trim: { from: Number(f.from ?? 0), ...(f.to !== undefined ? { to: Number(f.to) } : {}) } } : {}),
      ...(f.speed ? { speed: parseSpeed(f.speed) } : {}),
      ...(spec.offline ? { offline: true } : {}),
      ...(spec.video ? { video: true } : {}),
      ...(f.target ? { target: f.target } : { target: "body" }),
      ...(f.mustRead ? { mustRead: f.mustRead } : {}),
      // Подвижный фокус: «селектор @ якорь момента», через «|».
      // Кадр при этом стоит на месте — переходит только пятно, вслед
      // за голосом. Без этого реплика вела зрителя по трём местам экрана,
      // а подсвечено всё это время было одно.
      ...(f.focus ? { focus: f.focus.split("|").map((x) => {
        const [sel, at] = x.split("@").map((y) => y.trim());
        return { sel: sel!, at: at! };
      }) } : {}),
      beats: s.beats,
      id: s.id,
      provider: s.provider,
      kind: s.kind,
      page,
      caption: s.caption,
      effects,
      ...(f.overlay ? { overlay: parseOverlay(f.overlay, overlayMoment(s.beats, f, src.voice)) } : {}),
      ...(f.overlay && overlayAnchored(f.overlay) ? { overlayRaw: f.overlay } : {}),
      // Глава начинается там, где её назвали полем, а заставка главы
      // называет её сама — своим надзаголовком или заголовком.
      ...(f.transition ? { transition: parseTransition(f.transition) } : {}),
      ...(f.autoZoom ? { autoZoom: parseAutoZoom(f.autoZoom) } : {}),
      ...(f.device ? { device: parseDevice(f.device) } : {}),
      ...(f.theme ? { theme: sceneTheme(f.theme, src.theme) } : {}),
      ...(f.spotlight ? { spotlight: parseSpotlight(f.spotlight) } : {}),
      ...(f.stills ? { stills: parseStills(f.stills, `scene ${s.id} stills`) } : {}),
      ...(f.sfx ? { sfx: parseSfx(f.sfx, src.dir, `scene ${s.id} sfx`, /./) } : {}),
      ...(f.music ? { music: parseSceneMusic(f.music, src.dir) } : {}),
      ...(f.speechAt ? { speechAt: Number(f.speechAt.replace(/s$/i, "")) } : {}),
      ...(f.captions ? { captionsAt: f.captions.trim() as CaptionPosition } : {}),
      ...(f.flash ? { flash: parseHits(f.flash, "flash") } : {}),
      ...(f.shake ? { shake: parseHits(f.shake, "shake") } : {}),
      ...(f.part ? { chapter: f.part }
        : !explicitParts && spec.chapterFrom?.some((k) => f[k]) ? { chapter: spec.chapterFrom.map((k) => f[k]).find(Boolean)! } : {}),
    };
  });
  const pitch: Pitch = { scenes };
  if (src.tail !== undefined) pitch.tail = src.tail;
  if (src.providers) pitch.providers = src.providers;
  if (src.frame) pitch.frame = src.frame;
  if (src.encode) pitch.encode = src.encode;
  if (src.theme) pitch.theme = src.theme;
  if (src.pronounce !== undefined) pitch.pronounce = src.pronounce;
  if (src.lang) pitch.lang = src.lang;
  if (src.captions) pitch.captions = src.captions;
  if (src.pip) pitch.pip = src.pip;
  if (src.progress) pitch.progress = src.progress;
  if (src.emoji) pitch.emoji = src.emoji;
  if (src.music) pitch.music = src.music;
  if (src.sfx) pitch.sfx = src.sfx;
  if (src.loudness !== undefined) pitch.loudness = src.loudness;
  if (src.audio === false) pitch.audio = false;
  if (src.motionBlur) pitch.motionBlur = src.motionBlur;
  if (src.look) pitch.look = src.look;
  if (src.format) pitch.format = src.format;
  if (src.safe) pitch.safe = src.safe;
  if (src.reframe) pitch.reframe = src.reframe;
  if (src.lookNote) pitch.lookNote = src.lookNote;
  pitch.dir = src.dir;
  return pitch;
}

/** Сцены источника → читаемый сценарий. Печатается, а не хранится. */
export function toScript(src: Source): string {
  const out = [`# ${src.title}`, ""];
  for (const s of src.scenes) {
    out.push(`## ${s.id} · ${s.kind}${s.fields.title ? " · " + s.fields.title : ""}`, "");
    // Такты печатаются по одному абзацу: читатель видит те же куски,
    // которыми речь и записывается, а не склейку.
    for (const b of s.beats) out.push(b.text, "");
  }
  const words = src.scenes.reduce((n, s) => n + s.caption.split(/\s+/).length, 0);
  const beats = src.scenes.reduce((n, s) => n + s.beats.length, 0);
  out.push("---", "", `Сцен: ${src.scenes.length}. Тактов: ${beats}. Слов в репликах: ${words}.`);
  return out.join("\n");
}

const objectOf = (json: string, what: string): Record<string, unknown> => {
  let v: unknown;
  try { v = JSON.parse(json); } catch { throw new Error(`${what}: expected a JSON object`); }
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error(`${what}: expected a JSON object`);
  return v as Record<string, unknown>;
};
const onlyKeys = (v: Record<string, unknown>, allowed: string[], what: string): void => {
  for (const k of Object.keys(v)) if (!allowed.includes(k)) throw new Error(`${what}: unknown property «${k}»`);
};

/**
 * Поле `fade`: затемнения на входе и выходе сцены. `none` снимает оба (сцена встаёт и уходит
 * встык), число задаёт обоим длину в секундах, объект `{"in":0.2,"out":0}` — каждому свою.
 */
export function parseFade(raw: string): { in?: number; out?: number } {
  const text = raw.trim();
  const secs = (v: unknown, what: string): number => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 3) throw new Error(`fade${what}: expected 0–3 seconds`);
    return n;
  };
  if (text === "none") return { in: 0, out: 0 };
  if (!text.startsWith("{")) { const n = secs(text, ""); return { in: n, out: n }; }
  let v: Record<string, unknown>;
  try { v = JSON.parse(text) as Record<string, unknown>; } catch { throw new Error('fade: expected none, seconds or {"in":…,"out":…}'); }
  for (const k of Object.keys(v)) if (k !== "in" && k !== "out") throw new Error(`fade: unknown property «${k}»`);
  return { ...(v.in !== undefined ? { in: secs(v.in, ".in") } : {}), ...(v.out !== undefined ? { out: secs(v.out, ".out") } : {}) };
}

/** Шапка `captions:` — стиль подписи, показ везде, файл субтитров, кегль, вид и место. */
export function parseCaptions(json: string): Captions {
  const v = objectOf(json, "captions");
  onlyKeys(v, ["style", "everywhere", "srt", "size", "look", "position"], "captions");
  if (v.position !== undefined && !(CAPTION_POSITIONS as readonly unknown[]).includes(v.position))
    throw new Error(`captions.position: expected ${CAPTION_POSITIONS.join(" | ")}`);
  if (v.look !== undefined && !["outline", "plate"].includes(String(v.look)))
    throw new Error("captions.look: expected outline (white text with a dark outline, the default) or plate");
  if (v.size !== undefined && !(typeof v.size === "number" && v.size >= 0.8 && v.size <= 1.6))
    throw new Error("captions.size: expected a number from 0.8 to 1.6 (1 is the usual subtitle size)");
  if (v.style !== undefined && !["bar", "subtitle", "karaoke"].includes(String(v.style)))
    throw new Error("captions.style: expected bar | subtitle | karaoke");
  for (const k of ["everywhere", "srt"]) if (v[k] !== undefined && typeof v[k] !== "boolean")
    throw new Error(`captions.${k}: expected true or false`);
  return v as Captions;
}

/** Шапка `pip:` — видео ведущего в круге. */
export function parsePip(json: string): Pip {
  const v = objectOf(json, "pip");
  onlyKeys(v, ["file", "corner", "size", "from", "to"], "pip");
  if (typeof v.file !== "string" || !v.file.trim()) throw new Error("pip.file: expected a video file");
  if (v.corner !== undefined && !["bottom-right", "bottom-left", "top-right", "top-left"].includes(String(v.corner)))
    throw new Error("pip.corner: expected bottom-right | bottom-left | top-right | top-left");
  if (v.size !== undefined && (typeof v.size !== "number" || v.size < 0.08 || v.size > 0.45))
    throw new Error("pip.size: expected 0.08–0.45 of the frame width");
  for (const k of ["from", "to"]) if (v[k] !== undefined && (typeof v[k] !== "number" || (v[k] as number) < 0))
    throw new Error(`pip.${k}: expected seconds of the film`);
  return v as unknown as Pip;
}

/** Шапка `progress:` — полоса хода и название главы. */
export function parseProgress(json: string): Progress {
  const v = objectOf(json, "progress");
  onlyKeys(v, ["position", "parts", "label"], "progress");
  if (v.label !== undefined && !["edge", "zone"].includes(String(v.label)))
    throw new Error("progress.label: expected edge (beside the bar at the frame's edge) | zone (at the safe zone's edge)");
  if (v.position !== undefined && !["top", "bottom"].includes(String(v.position)))
    throw new Error("progress.position: expected top | bottom");
  if (v.parts !== undefined && typeof v.parts !== "boolean")
    throw new Error("progress.parts: expected true or false");
  return v as Progress;
}

/** Шапка `music:` — файл подложки и её уровни; файл обязан существовать. */
export function parseMusic(json: string, dir: string): Music {
  const v = objectOf(json, "music");
  onlyKeys(v, ["file", "level", "duck", "fadeIn", "fadeOut", "from", "bpm", "offset"], "music");
  if (typeof v.file !== "string" || !v.file.trim()) throw new Error("music.file: expected an audio file");
  if (!existsSync(resolve(dir, v.file))) throw new Error(`music.file: file not found: ${v.file}`);
  const range = (k: string, lo: number, hi: number): void => {
    if (v[k] !== undefined && (typeof v[k] !== "number" || (v[k] as number) < lo || (v[k] as number) > hi))
      throw new Error(`music.${k}: expected ${lo}…${hi}`);
  };
  range("level", -50, -6); range("duck", 6, 40); range("fadeIn", 0, 10); range("fadeOut", 0, 10);
  range("from", 0, 3600); range("bpm", 40, 240); range("offset", 0, 60);
  return v as unknown as Music;
}

/** Якорь внутри сцены: такт (`b2`, `b2.end+0.3`), доля сцены (`40%`) или секунды (`1.5s`). */
const SCENE_ANCHOR = /^(b\d+(\.end)?(\s*[+-]\s*[\d.]+)?|[\d.]+\s*%|[\d.]+s?)$/;

/**
 * Поле `music` сцены: `stop`, `stop b2.end` или объект — `{"file":"a.mp3","at":"b2","from":12,
 * "level":-22,"duck":18,"fadeIn":0.5}` для новой подложки, `{"stop":true,"at":"b1","fadeOut":0.4}`
 * для остановки.
 */
export function parseSceneMusic(raw: string, dir: string): SceneMusic {
  const text = raw.trim();
  const words = /^stop(?:\s+(.+))?$/.exec(text);
  const v: Record<string, unknown> = words ? { stop: true, ...(words[1] ? { at: words[1] } : {}) } : objectOf(text, "music");
  onlyKeys(v, ["file", "at", "from", "level", "duck", "fadeIn", "fadeOut", "stop"], "music");
  const at = String(v.at ?? "0").trim();
  if (!SCENE_ANCHOR.test(at)) throw new Error(`music.at: unexpected moment «${at}»; a beat (b2, b2.end+0.3), a share (40%) or seconds (1.5s)`);
  const range = (k: string, lo: number, hi: number): void => {
    if (v[k] !== undefined && (typeof v[k] !== "number" || (v[k] as number) < lo || (v[k] as number) > hi))
      throw new Error(`music.${k}: expected ${lo}…${hi}`);
  };
  range("level", -50, -6); range("duck", 6, 40); range("fadeIn", 0, 10); range("fadeOut", 0, 10); range("from", 0, 3600);
  if (v.stop !== undefined && v.stop !== true) throw new Error("music.stop: expected true");
  if (v.stop) {
    for (const k of ["file", "from", "level", "duck", "fadeIn"]) if (v[k] !== undefined) throw new Error(`music.${k}: a stop plays nothing`);
    return { at, stop: true, ...(v.fadeOut !== undefined ? { fadeOut: v.fadeOut as number } : {}) };
  }
  if (typeof v.file !== "string" || !v.file.trim()) throw new Error("music.file: expected an audio file, or stop");
  if (!existsSync(resolve(dir, v.file))) throw new Error(`music.file: file not found: ${v.file}`);
  return { ...(v as unknown as SceneMusic), file: v.file.trim(), at };
}

/** Список акцентов: момент (по правилу места), файл, усиление; файлы обязаны существовать. */
export function parseSfx(json: string, dir: string, what: string, anchor: RegExp): SfxCue[] {
  let v: unknown;
  try { v = JSON.parse(json); } catch { throw new Error(`${what}: expected a JSON list`); }
  if (!Array.isArray(v)) throw new Error(`${what}: expected a JSON list`);
  return v.map((raw, i) => {
    if (!raw || typeof raw !== "object") throw new Error(`${what}[${i}]: expected an object`);
    const r = raw as Record<string, unknown>;
    onlyKeys(r, ["at", "file", "gain", "from", "length", "fadeOut", "duck", "duckAll"], `${what}[${i}]`);
    const at = String(r.at ?? "").trim();
    if (!at || !anchor.test(at)) throw new Error(`${what}[${i}].at: unexpected moment «${at}»`);
    if (typeof r.file !== "string" || !r.file.trim()) throw new Error(`${what}[${i}].file: expected an audio file`);
    if (!existsSync(resolve(dir, r.file))) throw new Error(`${what}[${i}].file: file not found: ${r.file}`);
    if (r.gain !== undefined && (typeof r.gain !== "number" || r.gain < -30 || r.gain > 12))
      throw new Error(`${what}[${i}].gain: expected -30…12 dB`);
    for (const [k, lo, hi] of [["from", 0, 3600], ["length", 0.02, 600], ["fadeOut", 0, 30], ["duck", 0, 40]] as const)
      if (r[k] !== undefined && (typeof r[k] !== "number" || (r[k] as number) < lo || (r[k] as number) > hi))
        throw new Error(`${what}[${i}].${k}: expected ${lo}…${hi}`);
    if (r.duckAll !== undefined && typeof r.duckAll !== "boolean") throw new Error(`${what}[${i}].duckAll: expected true or false`);
    const extra = Object.fromEntries(["gain", "from", "length", "fadeOut", "duck", "duckAll"].filter((k) => r[k] !== undefined).map((k) => [k, r[k]]));
    return { at, file: r.file.trim(), ...extra } as SfxCue;
  });
}

/** Поле `autoZoom`: `true` или `{"scale":1.8,"hold":1.2,"size":0.36}`. */
export function parseAutoZoom(raw: string): AutoZoom {
  const text = raw.trim();
  if (text === "true") return {};
  const v = objectOf(text, "autoZoom");
  onlyKeys(v, ["scale", "hold", "size", "follow"], "autoZoom");
  if (v.follow !== undefined && v.follow !== "cursor") throw new Error('autoZoom.follow: expected "cursor"');
  if (v.scale !== undefined && (typeof v.scale !== "number" || v.scale <= 1 || v.scale > 3)) throw new Error("autoZoom.scale: expected >1 and <=3");
  if (v.hold !== undefined && (typeof v.hold !== "number" || v.hold < 0.8 || v.hold > 6)) throw new Error("autoZoom.hold: expected 0.8–6 seconds");
  if (v.size !== undefined && (typeof v.size !== "number" || v.size < 0.1 || v.size > 0.8)) throw new Error("autoZoom.size: expected 0.1–0.8 of the frame");
  return v as AutoZoom;
}
