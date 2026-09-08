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

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { providerFor, type KindSpec } from "./provider/index.js";
import { msg, useLang } from "./msg.js";

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
  /** такты речи по порядку; их не меньше одного */
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
 */
export type Theme = Record<string, string>;

/** Всё, что относится к ролику целиком, а не к отдельной сцене. */
export interface Film {
  frame?: Frame;
  encode?: Encode;
  theme?: Theme;
  /** правила чтения: имя поставляемого набора, путь к своему или сам набор */
  pronounce?: unknown;
  /** язык ролика: им помечается страница и по нему форматируются числа */
  lang?: string;
}

export interface Source {
  title: string;
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
  left?: Column;
  right?: Column;
  nodes?: Array<{ label: string; kind?: "acc" | "bad" }>;
  back?: string;
  values?: Array<{ value: string; label: string }>;
  tags?: string[];
  parts?: Array<{ label: string; text: string }>;
  /** приписка под содержимым; порождается только чужими наборами данных */
  note?: string;
  /** моменты появления элементов якорями: `b2`, `b2+0.4`, `40%`, `1.2s` */
  at?: string[];
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
  effects: Record<string, unknown>;
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
}

/**
 * Поля, допустимые у ЛЮБОЙ сцены, чьим бы ни был вид. Их всего одно:
 * хвост тишины после речи — свойство сборки, а не материала.
 */
export const COMMON: string[] = ["tail"];

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

export function parseSource(file: string): Source {
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
    // Отсутствие обязательного поля — ошибка разбора, а не пустой слайд:
    // раньше `toDeck` спотыкался на этом дампом чтения несуществующей
    // строки, то есть о причине читателю не сообщал никто.
    for (const group of spec(s).required) {
      if (group.some((f) => s.fields[f])) continue;
      const names = group.map((f) => `«${f}»`).join(" / ");
      err(s.__line ?? 0, msg("source.required", { id: s.id, kind: s.kind, names }));
    }
    // Якоря проверяются здесь, а не при чтении поля: номер такта имеет
    // смысл только когда речь сцены разобрана целиком.
    const anchors: string[] = [
      ...(s.fields.at ? s.fields.at.split(/\s+/) : []),
      ...(s.fields.spotFrom ? [s.fields.spotFrom] : []),
      ...(s.fields.focus ? s.fields.focus.split("|").map((x) => x.split("@")[1] ?? "") : []),
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

  lines.forEach((raw, i) => {
    const n = i + 1;
    const line = raw.trimEnd();

    if (line.startsWith("# ")) { out.title = line.slice(2).trim(); return; }

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
      return;
    }

    const m = line.match(/^([a-zA-Z][a-zA-Z]*):\s*(.*)$/);
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
        else if (key === "theme") out.theme = JSON.parse(value!) as Theme;
        // Правила чтения и язык — свойства РОЛИКА. Прежде правила
        // выбирались по имени движка голоса, то есть инструмент решал
        // за автора, на каком языке его ролик.
        else if (key === "pronounce") out.pronounce = JSON.parse(value!) as unknown;
        else if (key === "lang") { out.lang = value!.trim(); useLang(out.lang); }
        else err(n, msg("source.badFilmField", { key: key! }));
        return;
      }
      if (!spec(scene).fields.includes(key!) && !COMMON.includes(key!))
        err(n, msg("source.badField", { key: key!, kind: scene.kind }));
      scene.fields[key!] = value!.trim();
      return;
    }

    if (line.trim() === "") { if (prose.length) prose.push(""); return; }
    if (scene) prose.push(line.trim());
    else if (line.trim()) err(n, msg("source.textOutside"));
  });
  closeScene();

  if (!out.scenes.length) err(1, msg("source.noScenes"));
  return out;
}

/**
 * Каталог порождённых слайдов относительно источника. Одна константа на весь
 * продукт: разойдись она с той, по которой слайды пишутся, — и сборка возьмёт
 * подложки из пустого места, что уже случалось.
 */
export const SLIDES_DIR = "slides";

/**
 * Сцены источника → сцены сборки.
 *
 * Ядро не знает ни одного вида сцены: чем сцена нарисована и как она
 * движется, говорит поставщик. Сцена вправе перебить его расписание
 * своими полями — `zoom`, `spotFrom`, `focus`, — но выбирать умолчание
 * ядру не приходится.
 */
export function toPitch(src: Source, slidesDir: string = SLIDES_DIR): Pitch {
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
    return {
      ...(f.tail ? { tail: Number(f.tail) } : {}),
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
