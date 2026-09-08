// Машинно читаемое описание входного формата.
//
// Проверяется одно свойство, и оно же — единственная причина, по которой
// схема вообще может врать: она обязана принимать ровно те сцены, которые
// принимает разбор. Разойдись они — агент проверит свой сценарий по схеме
// и получит ответ, не имеющий отношения к сборке: либо «годится» перед
// ошибкой разбора, либо «негодится» на работающем файле. Обе половины
// уже случались, поэтому схема здесь ВЫЧИСЛЯЕТСЯ над входом, а не
// осматривается по полям: документ, не принимающий ни одной сцены, при
// осмотре полей неотличим от верного.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// Схему вычисляет посторонняя реализация JSON Schema, а не своя: свой
// проверяльщик был бы вторым толкованием формата и зеленел бы вместе
// с описанием, которое проверяет.
import { Ajv2020 } from "ajv/dist/2020.js";
import { allKinds, sceneSchema, type KindEntry } from "../../schema.js";
import { COMMON, parseSource, type RawScene } from "../../source.js";
import { PRODUCT_ROOT } from "../../self-hash.js";

// Виды берутся у ПОСТАВЩИКОВ — тем же способом, каким их берёт схема
// и разбор. Своего списка тест не заводит: он разошёлся бы ровно так же,
// как расходились прежние три.
const kinds: KindEntry[] = allKinds();
const nameOf = (e: KindEntry): string => (e.kind === e.provider ? e.provider : `${e.provider}.${e.kind}`);
const validate = new Ajv2020({ strict: false }).compile(sceneSchema());
const ok = (scene: unknown): boolean => validate(scene) as boolean;

/**
 * Наименьшая сцена вида, годная по разбору: по одному полю на каждую
 * группу обязательных. Строится ИЗ ТЕХ ЖЕ ТАБЛИЦ, что и схема с разбором,
 * поэтому появление нового вида сцены не оставит его без проверки.
 */
const minimal = (e: KindEntry): RawScene => ({
  id: `t-${e.kind}`,
  provider: e.provider,
  kind: e.kind,
  beats: [{ text: "Реплика сцены." }],
  caption: "Реплика сцены.",
  fields: Object.fromEntries(e.spec.required.map((g) => [g[0]!, "значение"])),
});

const dir = mkdtempSync(join(tmpdir(), "slidecast-schema-"));
let n = 0;
/** Тот же вход глазами разбора: сцена → текст сценария → разбор. */
const parses = (e: KindEntry, fields: Record<string, string>): boolean => {
  const body = Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join("\n");
  const file = join(dir, `story-${n++}.md`);
  writeFileSync(file, `# Ролик\n\n## t01 · ${nameOf(e)}\n${body}\n\nРеплика сцены.\n`);
  try { parseSource(file); return true; } catch { return false; }
};

test("схема принимает настоящие сцены собственного примера инструмента", () => {
  // Положительная половина признака. Именно она обнаружила бы документ,
  // который не принимает ни одной сцены, — на осмотре полей он зелен.
  const src = parseSource(join(PRODUCT_ROOT, "example", "story.md"));
  assert.ok(src.scenes.length >= 3, "пример обязан содержать несколько сцен");
  for (const scene of src.scenes) {
    assert.ok(ok(scene), `сцена ${scene.id} (${scene.kind}): ${JSON.stringify(validate.errors)}`);
  }
});

test("схема принимает наименьшую годную сцену каждого вида", () => {
  assert.ok(kinds.length >= 6, `видов у поставщиков: ${kinds.length}`);
  for (const e of kinds) {
    assert.ok(ok(minimal(e)), `вид ${nameOf(e)}: ${JSON.stringify(validate.errors)}`);
  }
});

test("схема принимает любое из равноправных обязательных полей", () => {
  // Расхождение, которое здесь и жило: описание требовало у `number` поля
  // `value`, тогда как разбор принимает и `values`, и пример инструмента
  // написан через `values`. Перебираются все варианты всех групп, а не
  // тот один, о котором вспомнили.
  for (const e of kinds) {
    for (const group of e.spec.required) {
      for (const variant of group) {
        const fields = Object.fromEntries(
          e.spec.required.map((g) => [g === group ? variant : g[0]!, "значение"]),
        );
        assert.ok(ok({ ...minimal(e), fields }), `вид ${nameOf(e)}, поле ${variant}`);
        assert.ok(parses(e, fields), `разбор отверг то, что схема приняла: ${nameOf(e)}/${variant}`);
      }
    }
  }
});

test("схема отвергает поле, которого разбор не знает", () => {
  for (const e of kinds) {
    const scene = minimal(e);
    const bad = { ...scene, fields: { ...scene.fields, kikcer: "опечатка" } };
    assert.equal(ok(bad), false, `вид ${nameOf(e)}`);
    assert.equal(parses(e, bad.fields), false, `разбор принял то, что схема отвергла: ${nameOf(e)}`);
  }
});

test("схема отвергает сцену без обязательного поля — и разбор тоже", () => {
  // Класс целиком: каждая группа обязательных полей каждого вида
  // выбрасывается по очереди, и оба судьи обязаны сказать «нет».
  for (const e of kinds) {
    for (const group of e.spec.required) {
      const fields = Object.fromEntries(
        e.spec.required.filter((g) => g !== group).map((g) => [g[0]!, "значение"]),
      );
      assert.equal(ok({ ...minimal(e), fields }), false, `вид ${nameOf(e)} без ${group.join("/")}`);
      assert.equal(parses(e, fields), false, `разбор принял ${nameOf(e)} без ${group.join("/")}`);
    }
  }
});

const first = kinds[0]!;

test("схема отвергает незнакомый вид сцены и сцену без речи", () => {
  assert.equal(ok({ ...minimal(first), kind: "кружочки" }), false);
  const { caption: _drop, ...noCaption } = minimal(first);
  assert.equal(ok(noCaption), false);
  // Пустой список тактов — та же беда, что и отсутствие реплики прежде:
  // сцене нечем задать длину, и разбор её тоже отвергает.
  assert.equal(ok({ ...minimal(first), beats: [] }), false);
});

test("схема описывает все виды сцен, которые предлагают поставщики", () => {
  const defs = sceneSchema().$defs;
  assert.deepEqual(Object.keys(defs).sort(), kinds.map(nameOf).sort());
});

test("у каждого вида схема называет ровно те поля, что и поставщик", () => {
  const defs = sceneSchema().$defs as Record<string, { properties: Record<string, unknown> }>;
  for (const e of kinds) {
    const expected = new Set([...e.spec.fields, ...COMMON]);
    assert.deepEqual(
      Object.keys(defs[nameOf(e)]!.properties).sort(),
      [...expected].sort(),
      `вид ${nameOf(e)}`,
    );
  }
});
