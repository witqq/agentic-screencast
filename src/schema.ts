#!/usr/bin/env node
// Машинно читаемое описание входного формата.
//
// Зачем: агенту-потребителю нужно проверить свой файл сценария до сборки,
// а для этого он должен узнать состав полей, не читая разборщик. Печатать
// его человеку мало — нужен формат, который читает программа.
//
// Здесь НЕ пишется заново ничего из того, что решает разбор: ни состав
// полей (`FIELDS`, `COMMON`), ни их обязательность (`REQUIRED`). Второй
// список разошёлся бы с первым молча — этот дефект в продукте уже случался,
// в том числе в первой редакции этого самого файла, где обязательные поля
// были перечислены рукой и разошлись с разбором на собственном примере
// инструмента. Способ против него принят: описание извлекается оттуда,
// где предмет живёт.
//
// Описывается СЦЕНА В ТОЙ ФОРМЕ, В КАКОЙ ЕЁ ОТДАЁТ РАЗБОР, — та самая,
// что печатает `agentic-screencast scenes`. Форма, которой нет ни у одного артефакта,
// проверять было бы нечем: документ выглядел бы описанием, а подать ему
// на вход было бы нечего.
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import { COMMON } from "./source.js";
import { BUILTIN, providerFor, type KindSpec } from "./provider/index.js";
import { BACKGROUNDS } from "./provider/slides/index.js";
import { THEME_NAMES } from "./theme.js";
import { LOOKS, GRADES } from "./look.js";
import { DEVICE_KINDS } from "./device.js";
import { LOUPE_PLACES } from "./overlay.js";
import { SPOTLIGHT_KEYS } from "./spotlight.js";
import { msg } from "./msg.js";

/**
 * Все виды всех поставщиков — поставляемых и объявленных роликом.
 * Ключ — то, что пишут в заголовке сцены: `slides.compare`, `page`.
 * Поставщик с единственным видом, названным как он сам, пишется без точки.
 */
export interface KindEntry { provider: string; kind: string; spec: KindSpec }

export function allKinds(declared: Record<string, string> = {}): KindEntry[] {
  const out: KindEntry[] = [];
  for (const provider of [...Object.keys(BUILTIN), ...Object.keys(declared)]) {
    for (const [kind, spec] of Object.entries(providerFor(provider, declared).kinds())) {
      out.push({ provider, kind, spec });
    }
  }
  return out;
}

/** Имя вида в схеме: то же, что пишут в заголовке сцены. */
const nameOf = (e: KindEntry): string =>
  (e.kind === e.provider ? e.provider : `${e.provider}.${e.kind}`);

export interface JsonSchema {
  $schema: string;
  title: string;
  description: string;
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
  additionalProperties: false;
  allOf: unknown[];
  $defs: Record<string, unknown>;
  /** значения шапки ролика и полей оформления: справка для агента, проверке не подлежит */
  "x-film": Record<string, unknown>;
  /** параметры фокуса и лупы внутри полей `spotlight` и `overlay`: справка, проверке не подлежит */
  "x-attention": Record<string, unknown>;
}

/**
 * Требование обязательности одной группы. Группа из одного поля — обычное
 * `required`; группа из нескольких — «хотя бы одно из», потому что разбор
 * принимает любой из вариантов.
 */
function requiredOf(spec: KindSpec): Record<string, unknown> {
  const groups = spec.required;
  const single = groups.filter((g) => g.length === 1).map((g) => g[0]!);
  const choice = groups.filter((g) => g.length > 1);
  return {
    ...(single.length ? { required: single } : {}),
    ...(choice.length
      ? { allOf: choice.map((g) => ({ anyOf: g.map((f) => ({ required: [f] })) })) }
      : {}),
  };
}

/** Описание объекта `fields` у сцены названного вида. */
function fieldsOf(kind: string, spec: KindSpec): Record<string, unknown> {
  return {
    description: `fields of a ${kind} scene: ${spec.about}`,
    type: "object",
    properties: Object.fromEntries(
      [...spec.fields, ...COMMON].map((f) => [f, { type: "string" }]),
    ),
    ...requiredOf(spec),
    additionalProperties: false,
  };
}

/**
 * Схема одной сцены источника.
 *
 * Описывается именно СЦЕНА, а не файл целиком: файл — это проза
 * с размеченными полями, и схемой её не выразить. Проверять по схеме
 * имеет смысл то, что у сцены объявлено: вид, набор полей и реплика.
 *
 * Вид выбирает набор полей через `allOf` из пар «если вид такой — то поля
 * такие». Складывать описания видов в `$defs`, ни на что не ссылаясь,
 * нельзя: `$defs` — хранилище, применяемое только по ссылке, и документ
 * с пустым `properties` при `additionalProperties: false` оказался бы
 * годен ровно для пустого объекта, то есть отвергал бы любую сцену.
 */
export function sceneSchema(declared: Record<string, string> = {}): JsonSchema {
  const entries = allKinds(declared);

  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "A scene of an Agentic Screencast scenario",
    description:
      "A scene as the scenario parser returns it and `agentic-screencast scenes` prints it. " +
      "An unknown field is a parse error, not silence: a misspelt name would otherwise drop " +
      "the slide's content quietly. The fields and which of them are required come from the " +
      "same tables the parser rejects a wrong scene by.",
    type: "object",
    properties: {
      id: { type: "string", description: "the scene's name, also the name of its generated slide" },
      provider: { enum: [...new Set(entries.map((e) => e.provider))],
        description: "the material provider: the part of the scene header before the dot" },
      kind: { enum: [...new Set(entries.map((e) => e.kind))],
        description: "the scene's kind at that provider; together they choose the fields" },
      beats: {
        type: "array",
        description:
          "the beats of narration in order: a paragraph of prose is one beat. Each has its own " +
          "take, length and cache key; the scene lasts their sum plus its tail. An empty list is " +
          "allowed only for kinds whose provider declares silentOk. A line starting with ~ in a " +
          "paragraph gives the spoken variant of the beat.",
        items: {
          type: "object",
          properties: {
            text: { type: "string", description: "what is read aloud and what the viewer sees" },
            speech: { type: "string", description: "the same as it is pronounced" },
          },
          required: ["text"],
          additionalProperties: false,
        },
      },
      caption: { type: "string", description: "the scene's whole narration in one line, made from the beats" },
      fields: { type: "object", description: "the scene's fields, which depend on its kind" },
    },
    required: ["id", "provider", "kind", "beats", "caption", "fields"],
    additionalProperties: false,
    // Пара «поставщик плюс вид» выбирает набор полей: одно имя вида
    // у двух поставщиков — обычное дело, и по нему одному поля не выбрать.
    allOf: [{
      // Речь нужна по умолчанию; исключения приходят из того же договора,
      // по которому parseSource допускает молчаливую сцену.
      anyOf: [
        { properties: { beats: { minItems: 1 } } },
        ...entries.filter((e) => e.spec.silentOk).map((e) => ({
          properties: { provider: { const: e.provider }, kind: { const: e.kind },
            ...(e.spec.video ? {} : { fields: { required: ["duration"] } }) },
        })),
      ],
    }, ...entries.map((e) => ({
      if: { properties: { provider: { const: e.provider }, kind: { const: e.kind } },
        required: ["provider", "kind"] },
      // `then` здесь — ключевое слово JSON Schema, а не обещание: линтер
      // предупреждает о значении, которое случайно попадёт в `await`,
      // а этот объект уходит в поток вывода строкой.
      // oxlint-disable-next-line unicorn/no-thenable
      then: { properties: { fields: { $ref: `#/$defs/${nameOf(e)}` } } },
    }))],
    $defs: Object.fromEntries(entries.map((e) => [nameOf(e), fieldsOf(nameOf(e), e.spec)])),
    // Шапка ролика в эту схему не входит — она описывает сцену, — но допустимые
    // имена оформления агенту нужны до сборки. Они берутся из тех же списков,
    // по которым разбор отвергает незнакомое имя.
    "x-film": {
      theme: { names: THEME_NAMES, note: "theme: <name> or {\"preset\":<name>,\"--var\":…}; agentic-screencast theme --from logo.png builds one from brand colours" },
      background: { names: BACKGROUNDS, note: "slide field background, or the theme variable --bg-motion" },
      look: { names: Object.keys(LOOKS), grades: GRADES, note: "look: <name> or {\"grade\",\"grain\",\"vignette\",\"bars\"}" },
      device: { names: DEVICE_KINDS, note: "device: browser [url] | phone | frame — on video and slides.shot scenes" },
    },
    // Параметры фокуса и лупы лежат внутри строковых полей `spotlight` и `overlay`; их области
    // значений и то, как сборка подгоняет геометрию, агенту нужны до сборки.
    "x-attention": {
      spotlight: {
        fields: SPOTLIGHT_KEYS,
        shape: ["rounded", "circle"],
        note: "scale >1 and <=3; without it ×1.65, lowered so the subject with its margin takes at most 0.9 of the frame; a named scale that does not fit is named by lint (area) or the build report's pushes (target); a circle is drawn around the subject's rectangle",
      },
      loupe: {
        fields: ["at", "target", "area", "point", "scale", "size", "hold", "place"],
        place: LOUPE_PLACES,
        note: "scale 1.5–4 (default 2), size 0.08–0.5 of the frame width (default 0.22); the lens grows to hold the whole subject up to 0.6 of the short side, then the scale drops and the build report's loupes (or lint, for an area) names it; the lens stays inside the frame",
      },
    },
  };
}

/**
 * Запись поля в сценарии — для короткой справки `schema <вид>`. Поле без записи здесь — ошибка
 * теста: новое поле не выходит без описания того, как его писать.
 */
export const FIELD_FORMATS: Record<string, string> = {
  title: "text", kicker: "text over the title", body: "text", note: "text under the slide", cta: "button text", url: "text",
  items: "Title :: text | Title :: text | …  (features: 🚀 Title :: text)",
  values: "1,240 :: label | 98% :: label", value: "300 · label", tags: "a | b | c",
  left: "Heading :: item | item", right: "Heading :: item | item",
  nodes: "A | B (acc) | C (bad)", back: "text of the return arrow", parts: "Label :: quoted text | …",
  at: "moments of the items in order: b2 b3+0.5 4.2s 60%",
  image: "picture.png (beside the scenario)", after: "picture.png — the «after» state", labels: "Before | After",
  split: "0.8 0.2 — divider from, to", panels: "x y w h @ depth | … (fractions; depth 1 nearest)",
  point: "x y (fractions)", push: "1 1.16 — scale from, to", device: "browser [url] | phone | frame",
  data: "file.csv (label,value per line)", type: "bar | line", peak: "max | a row number | a label",
  code: "| then the lines (or file:)", file: "path (code: snippet.ts; video: take.webm)", lines: "3-14", highlight: "5 7-8",
  cps: "characters per second, 5–400 (default: typing fits the scene)", name: "tab name",
  move: "drift | push | still", count: "on | off", background: "grid | aurora | mesh | waves | particles | bokeh | none",
  text: "kinetic style of the title [and the body]: fly scramble …", enter: "how items enter: rise | left | pop | flip | …",
  label: "text", report: "page.md — an agentic-report source, rebuilt for the scene", page: "pages/app.html", pageVertical: "pages/app.vertical.html — replaces page in a vertical build (pageVertical.en for English)", target: "CSS selector the scene frames", mustRead: "CSS selector that must be readable",
  focus: "CSS selector @ anchor | …", zoom: "scale, e.g. 1.2", spotFrom: "seconds when the spot starts", freezeAt: "seconds or @mark",
  speed: "[{\"from\":1,\"to\":2.5,\"rate\":0.5,\"ramp\":0.3,\"interpolate\":true},{\"at\":4,\"hold\":2}] — clip seconds or @marks  (help overlay)",
  autoZoom: "true | {\"scale\":1.8,\"hold\":1.2,\"size\":0.36}", from: "clip second or @mark where the piece starts",
  to: "clip second or @mark where the piece ends",
  fit: "contain (default: the whole clip, bars of the theme's letterbox colour) or cover [x y]: fill the frame, keep the point x y (shares of the clip, 0.5 0.5 = centre)",
  tail: "seconds after the speech", overlay: "{\"cards\":[…],\"camera\":[…],\"titles\":[…],…}; at is seconds, b2+0.5, b3.end or 40%  (help overlay)",
  duration: "seconds (a silent scene needs it)", part: "name of the part the scene starts", transition: "kind [seconds], cut, dip [seconds] [colour], or {\"kind\",\"duration\",\"sound\",\"snap\",\"element\",\"color\"}",
  fade: "none, seconds, or {\"in\":…,\"out\":…}: the fades at the scene's edges (default about 0.3 s each)",
  align: "top | center | bottom | fill: where a slide's content stands by height (help slides)",
  speechAt: "seconds from the scene's start where the narration begins (a hit first, the voice after it)",
  captions: "bottom | top | middle | auto: where this scene's subtitles stand, over captions.position  (help text)",
  flash: "anchors «b2 | 1.5s» or [{\"at\",\"length\",\"strength\"}]: the frame lights up in the theme's flash colour and dies out  (help overlay)",
  shake: "anchors «b2 | 1.5s» or [{\"at\",\"length\",\"strength\"}]: the frame jolts and settles  (help overlay)",
  music: "stop [anchor] or {\"file\",\"at\",\"from\",\"level\",\"duck\",\"fadeIn\",\"fadeOut\"}: a new bed or a music stop from this scene  (help sound)",
  sfx: "[{\"at\":\"b2\",\"file\":\"click.wav\",\"gain\":-6,\"from\":0.2,\"length\":1,\"fadeOut\":0.2,\"duck\":12,\"duckAll\":false}]  (help sound)", spotlight: "selector @ b2 [.. b2.end] | … or JSON with area, card, slow, scale (1: no push-in), ring, dim  (help overlay)",
  theme: "name or {\"preset\":name,\"--var\":value}", stills: "b2+0.3 :: what to check | 80% | @done",
};

/** Запись полей шапки ролика. */
export const FILM_FORMATS: Record<string, string> = {
  voice: "{\"engine\":\"stub|say|recorded|…\",\"name\":…,\"cps\":15}", tail: "seconds after each scene's speech",
  providers: "{\"name\":\"./provider.js\"}", frame: "{\"width\":1920,\"height\":1080,\"fps\":30,\"scale\":1}",
  encode: "{\"crf\":18,\"preset\":\"medium\",\"pix\":\"yuv420p\",\"audio\":\"192k\"}", theme: "name or {\"preset\":name,\"--var\":value}",
  pronounce: "rules name", lang: "ru | en | …", captions: "{\"style\":\"bar|subtitle|karaoke\",\"everywhere\":true,\"srt\":true,\"size\":1.25,\"look\":\"outline|plate\",\"position\":\"bottom|top|middle|auto\"}",
  pip: "{\"file\":\"me.mp4\",\"corner\":…,\"size\":…,\"from\":…,\"to\":…}", progress: "{\"position\":\"top|bottom\",\"parts\":true,\"label\":\"edge|zone\"}",
  music: "{\"file\":\"bed.mp3\",\"level\":…,\"duck\":…,\"bpm\":…,\"offset\":…}", sfx: "[{\"at\":\"12.5s\"|\"m16\",\"file\":\"hit.wav\"}]", loudness: "LUFS target, -30…-8",
  audio: "false — the film without a sound track", motionBlur: "true | {\"samples\":6,\"shutter\":0.5}",
  format: "landscape | vertical | square",
  zone: "platform (default: the feed's buttons kept clear, Reels, Shorts, TikTok) | plain (watched outside a feed: even margins)",
  look: "name or {\"grade\",\"grain\",\"vignette\",\"bars\"}", emoji: "{\"dir\":\"emoji\"}",
};

/**
 * Короткая справка по виду: что это, какие поля и как их писать, какие обязательны, какие общие.
 * `film` — поля шапки ролика. Незнакомый вид — ошибка со списком известных.
 */
export function kindBrief(name: string, declared: Record<string, string> = {}): string {
  if (name === "film") {
    return ["film header fields (lines before the first scene):", ...Object.entries(FILM_FORMATS).map(([k, v]) => `  ${k}: ${v}`)].join("\n");
  }
  const entries = allKinds(declared);
  // Вид можно назвать и без поставщика (`parallax`), если имя однозначно.
  const bare = entries.filter((x) => x.kind === name);
  const e = entries.find((x) => nameOf(x) === name || `${x.provider}.${x.kind}` === name) ?? (bare.length === 1 ? bare[0] : undefined);
  if (!e) throw new Error(msg("schema.unknownKind", { name, known: `${entries.map(nameOf).join(", ")}, film` }));
  const required = e.spec.required.map((g) => g.join(" or "));
  const line = (f: string): string => `  ${f}: ${FIELD_FORMATS[f] ?? "text"}`;
  return [`${nameOf(e)} — ${e.spec.about}`,
    ...(required.length ? [`required: ${required.join(", ")}`] : []),
    ...(e.spec.silentOk ? [e.spec.video ? "may be silent" : "may be silent with duration"] : []),
    "fields:", ...e.spec.fields.map(line),
    "fields of every scene:", ...COMMON.map(line),
    "film header: agentic-screencast schema film",
    `rules for this kind: agentic-screencast craft ${e.provider === "slides" ? (e.spec.trailer ? "trailer" : "slides") : e.provider}`].join("\n");
}

// Сравниваются РАЗРЕШЁННЫЕ ПУТИ, а не URL со строкой пути: файловый URL
// процентно кодирован (путь с пробелом не совпадёт никогда), а URL модуля
// уже разрешён по ссылкам, тогда как argv[1] — нет. В обоих случаях блок
// молча не исполняется: команда печатает пустоту с кодом 0.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Объявленные роликом поставщики приходят первым аргументом: без них
  // схема описала бы только поставляемых, а сценарий с посторонним видом
  // выглядел бы негодным.
  const declared = process.argv[2] ? JSON.parse(process.argv[2]) as Record<string, string> : {};
  const kind = process.argv[3];
  if (kind) {
    try { console.log(kindBrief(kind, declared)); } catch (e) { console.error((e as Error).message); process.exit(2); }
  } else console.log(JSON.stringify(sceneSchema(declared), null, 1));
}
