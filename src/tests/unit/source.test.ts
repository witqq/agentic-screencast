// Разбор сценария. Проверяется то, что раньше не проверялось ничем
// и падало тихо: отказ на незнакомом поле, отказ на сцене без реплики
// и правило продолжения ряда моментов появления.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseSource, toPitch, toScript } from "../../source.js";
import { slideOf } from "../../provider/slides/from-scene.js";

const dir = mkdtempSync(join(tmpdir(), "slidecast-source-"));
let n = 0;
/** Кладёт сценарий во временный файл и разбирает его. */
const parse = (text: string): ReturnType<typeof parseSource> => {
  const file = join(dir, `story-${n++}.md`);
  writeFileSync(file, text);
  return parseSource(file);
};

const COMPARE = `# Ролик
voice: {"engine":"stub","name":"nullvoice"}

## s01 · slides.compare
kicker: знакомая картина
title: Заголовок
left: Что вы просите :: Одна фраза
right: Что приходит :: раз | два
at: 0.7 2.2

Реплика первой сцены.
`;

test("сцена разбирается со всеми полями и репликой", () => {
  const src = parse(COMPARE);
  assert.equal(src.title, "Ролик");
  assert.deepEqual(src.voice, { engine: "stub", name: "nullvoice" });
  assert.equal(src.scenes.length, 1);
  const s = src.scenes[0]!;
  assert.equal(s.id, "s01");
  assert.equal(s.kind, "compare");
  assert.equal(s.caption, "Реплика первой сцены.");
  assert.equal(s.fields.title, "Заголовок");
});

test("незнакомое поле — ошибка разбора, а не молчание", () => {
  // Дефект, который это ловит: опечатка в имени поля тихо выбрасывает
  // содержимое слайда, и сцена собирается пустой.
  assert.throws(
    () => parse(COMPARE.replace("kicker:", "kikcer:")),
    /поле «kikcer» недопустимо|field «kikcer» is not allowed/,
  );
});

test("незнакомый вид сцены — ошибка разбора", () => {
  assert.throws(() => parse(COMPARE.replace("· slides.compare", "· slides.кружочки")),
    /не знает вида «кружочки»|does not know kind «кружочки»/);
});

test("сцена без обязательного поля — ошибка разбора, называющая вид и поле", () => {
  // Сообщение здесь и есть предмет: без него отказ неотличим от падения
  // сборщика слайдов на чтении несуществующей строки, каким он и был.
  // Равноправные варианты названы оба — иначе читатель, написавший
  // `values`, пошёл бы искать несуществующее требование `value`.
  assert.throws(
    () => parse(COMPARE.replace("· slides.compare", "· slides.number")
      .replace(/left:.*\nright:.*\n/, "")),
    // Сообщения ядра идут словарём, и язык у прогона может быть любой:
    // ролик его называет, иначе он берётся из окружения. Поэтому здесь
    // проверяется то, что от языка НЕ зависит, — вид сцены и оба
    // равноправных поля названы поимённо.
    /number.*«values».*«value»/,
  );
});

test("сцена без реплики — ошибка разбора", () => {
  assert.throws(() => parse(COMPARE.replace("Реплика первой сцены.", "")), /нет реплики|no speech/);
});

test("колонка без разделителя — ошибка, но при сборке слайдов, а не при разборе", () => {
  // Разбор проверяет только имена полей; смысл значения — дело того, кто
  // строит слайд. Тест закрепляет обе половины, чтобы «ошибка есть»
  // не путалось с «ошибка тогда же».
  const bad = COMPARE.replace("left: Что вы просите :: Одна фраза", "left: Одна фраза");
  const src = parse(bad);
  assert.equal(src.scenes.length, 1);
  assert.throws(() => slideOf(src.scenes[0]!), /колонка описывается/);
});

test("колонка с перечнем и колонка с текстом различаются", () => {
  const slide = slideOf(parse(COMPARE).scenes[0]!);
  assert.equal(slide.left?.text, "Одна фраза");
  assert.deepEqual(slide.right?.items, ["раз", "два"]);
});

test("окраска колонки берётся из данных, а не из положения", () => {
  const slide = slideOf(parse(COMPARE.replace("left: Что вы просите ::", "left: Что вы просите (good) ::")).scenes[0]!);
  assert.equal(slide.left?.tone, "good");
});

test("сцена-экран порождает сцену сборки с подложкой и подвижным фокусом", () => {
  const src = parse(`# Ролик

## s02 · page
page: screens/graph.mhtml
target: .node
mustRead: .label
zoom: 1.45
focus: .a @ 5% | .b @ b2

Первый такт сцены-экрана.

Второй такт: на нём подсветка переходит ко второму месту.
`);
  const pitch = toPitch(src);
  const s = pitch.scenes[0]!;
  assert.equal(s.kind, "page");
  assert.equal(s.page, "screens/graph.mhtml");
  assert.equal(s.offline, true);
  // Моменты фокуса остаются ЯКОРЯМИ: разрешает их слой композиции,
  // когда длины тактов уже известны из звука. Здесь сцена написана
  // долями, но на их месте могло стоять `b2`.
  assert.deepEqual(s.focus, [{ sel: ".a", at: "5%" }, { sel: ".b", at: "b2" }]);
});

test("сцена поставщика ссылается на порождённую им страницу", () => {
  const pitch = toPitch(parse(COMPARE));
  assert.equal(pitch.scenes[0]!.page, "slides/s01.html");
  assert.equal(pitch.scenes[0]!.provider, "slides");
  assert.equal(pitch.scenes[0]!.kind, "compare");
});

test("сцена готового файла ссылается на него, а не на порождённое", () => {
  // Материал бывает уже готовым: тогда порождать нечего, и ядро берёт
  // то, на что указала сцена. Различает именно путь: порождённая страница
  // лежала бы в каталоге слайдов и звалась бы по имени сцены.
  const pitch = toPitch(parse(`# Ролик

## s02 · page
page: screens/graph.mhtml

Реплика.
`));
  assert.equal(pitch.scenes[0]!.page, "screens/graph.mhtml");
  assert.equal(pitch.scenes[0]!.provider, "page");
  assert.equal(pitch.scenes[0]!.offline, true);
});

test("якорь дальше последней речи — ошибка разбора, а не тихий кадр", () => {
  // Имена полей разбор проверял с самого начала — затем, чтобы опечатка
  // не выбрасывала содержимое молча. Значения якорей не проверялись вовсе:
  // `b9` при одном такте и мусор вида `zz+` проходили разбор, проверку
  // порядка и сборку, а узнать об этом можно было только отрисовав кадр.
  const one = `# Ролик

## s01 · slides.compare
left: Слева :: раз
right: Справа :: два
at: ЯКОРЬ

Один такт речи.
`;
  assert.throws(() => parse(one.replace("ЯКОРЬ", "b9")),
    /указывает дальше речи|points past the speech/);
  assert.throws(() => parse(one.replace("ЯКОРЬ", "zz+")),
    /не якорь момента|is not a time anchor/);
  // Годные якоря по-прежнему принимаются во всех формах.
  assert.ok(parse(one.replace("ЯКОРЬ", "b1 40% 1.2s")).scenes.length === 1);
});

test("сцена без речи законна только там, где вид объявил это сам", () => {
  // Речью задаётся длина сцены, и её отсутствие — почти всегда обрыв
  // сценария. У готового видео длину задаёт файл, и молчаливая вставка
  // законна: вид объявляет это о себе сам, ядро такого правила не знает.
  assert.throws(() => parse(`# Ролик

## s01 · slides.number
values: 7 :: штук
`), /нет реплики|no speech/);
  const silent = parse(`# Ролик

## s02 · video
file: clips/intro.mp4
`);
  assert.equal(silent.scenes[0]!.beats.length, 0);
});

test("сцена видео объявляет себя видео, а не страницей", () => {
  const pitch = toPitch(parse(`# Ролик

## s03 · video
file: clips/intro.mp4

Реплика поверх видео.
`));
  assert.equal(pitch.scenes[0]!.page, "clips/intro.mp4");
  assert.equal(pitch.scenes[0]!.video, true);
});

test("незнакомый поставщик — отказ, называющий известных", () => {
  assert.throws(() => parse(`# Ролик

## s04 · чужой.card
title: Т

Реплика.
`), /неизвестный поставщик «чужой»|unknown provider «чужой»/);
});

test("читаемый сценарий печатает все реплики и их число", () => {
  const out = toScript(parse(COMPARE));
  assert.match(out, /Реплика первой сцены\./);
  assert.match(out, /Сцен: 1\./);
});

test("язык сообщений называет ролик, а не инструмент", () => {
  // Прежде все отказы были русскими навсегда. Теперь язык — свойство
  // работы: ролик называет его в шапке, и отказы разбора идут на нём.
  // Различающее наблюдение — ОДНА И ТА ЖЕ ошибка на двух языках.
  const broken = `# Ролик
lang: ru

## s01 · slides.compare
kikcer: опечатка

Реплика.
`;
  assert.throws(() => parse(broken), /поле «kikcer» недопустимо/);
  assert.throws(() => parse(broken.replace("lang: ru", "lang: en")),
    /field «kikcer» is not allowed/);
});

test("источник без сцен — ошибка разбора", () => {
  assert.throws(() => parse("# Только заголовок\nlang: en\n"), /the source has no scenes/);
});

test("язык прошлого разбора не остаётся назначенным", () => {
  // В одном процессе роликов бывает несколько: сервер записи разбирает
  // свой сценарий, проверка рядом — чужой. Без сброса второй говорил бы
  // языком первого, и это тихо: сообщение осмысленное, просто не на том
  // языке. Различает пара разборов подряд.
  //
  // Язык окружения назначается ЯВНО: иначе наблюдение зависело бы
  // от машины, на которой его гоняют, — на русской системе оба разбора
  // были бы русскими и при сломанном сбросе.
  const was = process.env.AGENTIC_SCREENCAST_LANG;
  process.env.AGENTIC_SCREENCAST_LANG = "en";
  try {
    assert.throws(() => parse(`# Ролик
lang: ru

## s01 · slides.compare
kikcer: опечатка

Реплика.
`), /поле «kikcer» недопустимо/);
    assert.throws(() => parse("# Только заголовок\n"), /the source has no scenes/);
  } finally {
    if (was === undefined) delete process.env.AGENTIC_SCREENCAST_LANG;
    else process.env.AGENTIC_SCREENCAST_LANG = was;
  }
});
