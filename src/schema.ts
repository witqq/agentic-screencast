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
    description: `поля сцены вида ${kind}: ${spec.about}`,
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
    title: "Сцена сценария Agentic Screencast",
    description:
      "Сцена в том виде, в каком её отдаёт разбор источника и печатает " +
      "`agentic-screencast scenes`. Незнакомое поле — ошибка разбора, а не молчание: " +
      "опечатка в имени иначе тихо выбрасывает содержимое слайда. Состав " +
      "полей и их обязательность порождаются из тех же таблиц, по которым " +
      "разбор и отвергает неверную сцену.",
    type: "object",
    properties: {
      id: { type: "string", description: "имя сцены, оно же имя порождённого слайда" },
      provider: { enum: [...new Set(entries.map((e) => e.provider))],
        description: "поставщик материала: часть заголовка сцены до точки" },
      kind: { enum: [...new Set(entries.map((e) => e.kind))],
        description: "вид сцены у этого поставщика; вместе они выбирают набор полей" },
      beats: {
        type: "array",
        minItems: 1,
        description:
          "такты речи по порядку: абзац прозы — один такт. У каждого своя " +
          "запись, своя длина и свой ключ кэша; длительность сцены — их сумма " +
          "плюс хвост. Строка «~» внутри абзаца задаёт произносимый вариант такта.",
        items: {
          type: "object",
          properties: {
            text: { type: "string", description: "что читают вслух и видит зритель" },
            speech: { type: "string", description: "то же в том виде, в каком это произносится" },
          },
          required: ["text"],
          additionalProperties: false,
        },
      },
      caption: { type: "string", description: "вся речь сцены одной строкой; порождается из тактов" },
      fields: { type: "object", description: "поля сцены, зависящие от вида" },
    },
    required: ["id", "provider", "kind", "beats", "caption", "fields"],
    additionalProperties: false,
    // Пара «поставщик плюс вид» выбирает набор полей: одно имя вида
    // у двух поставщиков — обычное дело, и по нему одному поля не выбрать.
    allOf: entries.map((e) => ({
      if: { properties: { provider: { const: e.provider }, kind: { const: e.kind } },
        required: ["provider", "kind"] },
      // `then` здесь — ключевое слово JSON Schema, а не обещание: линтер
      // предупреждает о значении, которое случайно попадёт в `await`,
      // а этот объект уходит в поток вывода строкой.
      // oxlint-disable-next-line unicorn/no-thenable
      then: { properties: { fields: { $ref: `#/$defs/${nameOf(e)}` } } },
    })),
    $defs: Object.fromEntries(entries.map((e) => [nameOf(e), fieldsOf(nameOf(e), e.spec)])),
  };
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
  console.log(JSON.stringify(sceneSchema(declared), null, 1));
}
