// Слайды: правило моментов появления и структура порождаемой разметки.
//
// Оба свойства до сих пор не проверялись ничем. Признак кадра меряет
// число знаков, кегль, наличие графики и переполнение — он не видит
// ни числа колонок, ни того, что стрелка стоит ПЕРЕД узлом, ни момента
// в обёртке появления. Сравнение кадров до и после переписывания было
// одноразовым свидетельством перехода, а не постоянной проверкой.
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { at, SlideBody, tone } from "../../provider/slides/Slide.js";
import type { Slide } from "../../source.js";

const markup = (s: Slide): string => renderToStaticMarkup(SlideBody({ s }));
/** Все якоря появления в порядке следования элементов. */
const moments = (html: string): string[] =>
  [...html.matchAll(/data-at="([^"]+)"/g)].map((m) => m[1]!);

test("без названных моментов элемент появляется на своём такте речи", () => {
  // Умолчание — то, ради чего якоря и заводились: слайд собирается вслед
  // за речью и тянется вместе с записью любой длины. Секунда так не умеет:
  // она назначена до записи и о ней ничего не знает.
  const s = { id: "x", kind: "chain" } as Slide;
  assert.equal(at(s, 0), "b1");
  assert.equal(at(s, 2), "b3");
});

test("недостающие моменты продолжают ряд, а не считаются по номеру", () => {
  // Настоящий дефект, ради которого правило и переписывалось: прежнее
  // `0.5 + i * 0.5` давало шестому элементу 3,0 при пятом на 3,2 —
  // элемент появлялся РАНЬШЕ соседа. Кадр в устоявшемся состоянии
  // при этом верен, поэтому признак кадра к дефекту слеп.
  const s = { id: "x", kind: "chain", at: ["0.6", "1.4", "2.2", "2.7", "3.2"] } as Slide;
  assert.equal(at(s, 4), "3.2", "заданный момент берётся как есть");
  assert.equal(at(s, 5), "3.7", "следующий продолжает ряд от последнего заданного");
  assert.equal(at(s, 6), "4.2");
  // По номеру шестой получил бы 3.0 — раньше пятого.
  assert.ok(Number(at(s, 5)) > Number(at(s, 4)));
});

test("ряд якорей на такты продолжается тактами, а не секундами", () => {
  // Смешивать нельзя: продолжив «b2» числом, ядро вернуло бы момент
  // в секундах, и хвост цепочки перестал бы тянуться вместе с речью,
  // тогда как её начало тянулось бы. Дефект тихий — кадр в конце сцены
  // при обоих правилах одинаков.
  const s = { id: "x", kind: "chain", at: ["b1", "b2"] } as Slide;
  assert.equal(at(s, 2), "b3");
  assert.equal(at(s, 4), "b5");
});

test("ряд моментов не убывает ни на одном элементе цепочки", () => {
  const s = {
    id: "s", kind: "chain", title: "Т", at: ["0.6", "1.4"],
    nodes: [{ label: "раз" }, { label: "два" }, { label: "три" }, { label: "четыре" }],
    back: "возврат",
  } as Slide;
  const ms = moments(markup(s)).map(Number);
  assert.ok(ms.length >= 5, `моментов в разметке: ${ms.length}`);
  for (let i = 1; i < ms.length; i++) {
    assert.ok(ms[i]! >= ms[i - 1]!, `момент ${i} (${ms[i]}) раньше предыдущего (${ms[i - 1]})`);
  }
});

test("сравнение даёт ровно две колонки, и окраска приходит из данных", () => {
  const s = {
    id: "s", kind: "compare", title: "Т",
    left: { title: "Слева", text: "текст" },
    right: { title: "Справа", items: ["раз", "два"], tone: "plain" },
  } as Slide;
  const html = markup(s);
  assert.equal([...html.matchAll(/class="col /g)].length, 2);
  // Умолчание по положению сохранено, но перебивается данными.
  assert.match(html, /class="col bad"/);
  assert.match(html, /class="col plain"/);
  assert.doesNotMatch(html, /class="col good"/);
  assert.equal([...html.matchAll(/<li>/g)].length, 2);
});

test("в цепочке стрелка стоит ПЕРЕД узлом и её на одну меньше", () => {
  // Правило заведено затем, чтобы перенос строки начинался стрелкой,
  // а не заканчивался стрелкой, указывающей в пустоту.
  const s = {
    id: "s", kind: "chain", title: "Т",
    nodes: [{ label: "раз" }, { label: "два", kind: "bad" }, { label: "три" }],
  } as Slide;
  const html = markup(s);
  assert.equal([...html.matchAll(/class="arrow"/g)].length, 2);
  assert.equal([...html.matchAll(/class="node/g)].length, 3);
  assert.doesNotMatch(html, /class="node[^"]*">[^<]*<\/span><span class="arrow"/);
  assert.match(html, /<span class="arrow">→<\/span><span class="node/);
  assert.match(html, /class="node bad"/);
});

test("каждый узел цепочки лежит в собственной обёртке появления", () => {
  // Обёртка — элемент строки: именно она растягивается. Пока правило
  // висело на внутреннем узле, ширины оставались по тексту и цепочка
  // выглядела рваной.
  const s = {
    id: "s", kind: "chain", title: "Т",
    nodes: [{ label: "раз" }, { label: "два" }],
  } as Slide;
  const html = markup(s);
  assert.equal([...html.matchAll(/<div class="el" data-at="[^"]+"><span class="pairwrap">/g)].length, 2);
});

test("величина отдаёт число и подпись, метки — отдельным элементом", () => {
  const s = {
    id: "s", kind: "number", title: "Т",
    values: [{ value: "300", label: "узлов" }], tags: ["что", "зачем"],
  } as Slide;
  const html = markup(s);
  assert.match(html, /class="huge">300</);
  assert.match(html, /class="huge-sub">узлов</);
  assert.equal([...html.matchAll(/class="tag"/g)].length, 2);
});

test("цитата отдаёт подпись и дословный текст, а приписку пишет сцена", () => {
  // Прежде под цитатой стояла вшитая фраза про чужой продукт: в ролике
  // на любую другую тему она появлялась сама собой, и выключить её было
  // нечем. Теперь приписка — поле сцены, и без него её нет вовсе.
  const s = {
    id: "s", kind: "quote", title: "Т",
    parts: [{ label: "ответ", text: "первая строка\nвторая" }],
  } as Slide;
  const html = markup(s);
  assert.match(html, /class="qlabel">ответ</);
  assert.match(html, /<pre>первая строка\nвторая<\/pre>/);
  assert.doesNotMatch(html, /класс|disclaimer|интерфейс/);

  const withNote = markup({ ...s, note: "приписка от автора сцены" });
  assert.match(withNote, /приписка от автора сцены/);
});

test("текст сцены экранируется, а не попадает в разметку как есть", () => {
  const s = {
    id: "s", kind: "number", title: "<b>жирный</b> & прочее",
    values: [{ value: "1", label: "<i>метка</i>" }],
  } as Slide;
  const html = markup(s);
  assert.doesNotMatch(html, /<b>жирный<\/b>/);
  assert.match(html, /&lt;b&gt;жирный/);
  assert.match(html, /&lt;i&gt;метка/);
});

test("неизвестный вид слайда — ошибка, а не пустая страница", () => {
  assert.throws(() => markup({ id: "s", kind: "кружочки" } as unknown as Slide),
    /неизвестный вид слайда/);
});

test("окраска колонки: недопустимое значение откатывается к умолчанию", () => {
  assert.equal(tone({ title: "т", tone: "фиолетовый" } as never, "bad"), "bad");
  assert.equal(tone({ title: "т" }, "good"), "good");
  assert.equal(tone({ title: "т", tone: "plain" }, "bad"), "plain");
});
