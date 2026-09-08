// Хеш исходников. Ошибка здесь единственная во всём продукте, которая
// не проявляется ничем, кроме устаревшей картинки в готовом ролике:
// сборка отдаёт кадры из кэша и выглядит успешной.
//
// Проверяются два разных свойства, и второе — то, которого не хватало
// прежнему обходу. Он брал ОДИН каталог по маске расширений: правка файла
// в корне ключ меняла, а появление подкаталога с половиной инструмента —
// нет. Признак «правка меняет ключ» зелен в обоих случаях, поэтому нужен
// отдельный: файл, добавленный В ГЛУБИНЕ дерева, обязан менять хеш.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { selfHash, sourceFiles, SOURCE_ROOT, PRODUCT_ROOT, compilerVersion, CONFIG_FILES } from "../../self-hash.js";

/** Крошечное дерево исходников: корневой файл и файл в подкаталоге. */
function tree(): string {
  const root = mkdtempSync(join(tmpdir(), "slidecast-hash-"));
  writeFileSync(join(root, "a.ts"), "export const a = 1;\n");
  mkdirSync(join(root, "глубже", "ещё"), { recursive: true });
  writeFileSync(join(root, "глубже", "ещё", "b.tsx"), "export const b = 2;\n");
  return root;
}

test("правка содержимого меняет хеш", () => {
  const root = tree();
  const before = selfHash(root);
  writeFileSync(join(root, "a.ts"), "export const a = 2;\n");
  assert.notEqual(selfHash(root), before);
  rmSync(root, { recursive: true, force: true });
});

test("файл, добавленный в глубине дерева, меняет хеш", () => {
  const root = tree();
  const before = selfHash(root);
  writeFileSync(join(root, "глубже", "ещё", "c.ts"), "export const c = 3;\n");
  assert.notEqual(selfHash(root), before);
  rmSync(root, { recursive: true, force: true });
});

test("обход спускается в подкаталоги и ничего не отбрасывает по расширению", () => {
  const root = tree();
  writeFileSync(join(root, "данные.json"), "{}\n");
  const files = sourceFiles(root).map((f) => f.replaceAll("\\", "/"));
  assert.deepEqual(files, ["a.ts", "глубже/ещё/b.tsx", "данные.json"]);
  rmSync(root, { recursive: true, force: true });
});

test("удаление файла меняет хеш", () => {
  const root = tree();
  const before = selfHash(root);
  rmSync(join(root, "глубже", "ещё", "b.tsx"));
  assert.notEqual(selfHash(root), before);
  rmSync(root, { recursive: true, force: true });
});

test("хеш устойчив: то же дерево даёт то же значение", () => {
  const root = tree();
  assert.equal(selfHash(root), selfHash(root));
  rmSync(root, { recursive: true, force: true });
});

test("версия компилятора названа и входит в хеш", () => {
  // Компилятор выпускает код, то есть влияет на байты кадра так же,
  // как версии ffmpeg и браузера.
  const v = compilerVersion();
  assert.match(v, /^\d+\.\d+\.\d+$/);
  const root = tree();
  // Тот же набор файлов, другая объявленная версия — хеш обязан отличаться.
  assert.notEqual(selfHash(root, "7.0.2"), selfHash(root, "7.0.3"));
  // И умолчание берётся из манифеста, а не выдумывается.
  assert.equal(selfHash(root), selfHash(root, v));
  rmSync(root, { recursive: true, force: true });
});

test("корень исходников продукта существует и непуст", () => {
  const files = sourceFiles(SOURCE_ROOT);
  assert.ok(files.length > 10, `файлов в дереве исходников: ${files.length}`);
  assert.ok(files.includes("build.ts"));
  assert.ok(files.some((f) => f.includes("Slide.tsx")));
  assert.ok(files.some((f) => f.includes("clock.ts")));
});

test("настройки компилятора входят в хеш и адресуются именем, а не путём", () => {
  // Они задают цель, библиотеку и способ выпуска кода, то есть влияют
  // на байты кадра так же, как версия самого компилятора. Лежат в корне
  // продукта, поэтому обход `src` их не видит и добавляет отдельно.
  assert.deepEqual(CONFIG_FILES, ["tsconfig.json", "tsconfig.browser.json"]);
  for (const f of CONFIG_FILES) assert.ok(existsSync(join(PRODUCT_ROOT, f)), `нет ${f}`);

  // Настройки подставляются, как и версия: рабочее дерево продукта тест
  // не трогает.
  const src = tree();
  const cfgA = mkdtempSync(join(tmpdir(), "slidecast-cfg-a-"));
  const cfgB = mkdtempSync(join(tmpdir(), "slidecast-cfg-b-"));
  try {
    for (const f of CONFIG_FILES) {
      writeFileSync(join(cfgA, f), '{"compilerOptions":{"target":"ES2023"}}\n');
      writeFileSync(join(cfgB, f), '{"compilerOptions":{"target":"ES2023"}}\n');
    }
    assert.equal(selfHash(src, "7.0.2", cfgA), selfHash(src, "7.0.2", cfgB),
      "одинаковые настройки в разных каталогах обязаны давать один хеш");

    writeFileSync(join(cfgB, "tsconfig.browser.json"), '{"compilerOptions":{"target":"ES2015"}}\n');
    assert.notEqual(selfHash(src, "7.0.2", cfgA), selfHash(src, "7.0.2", cfgB),
      "иная настройка обязана менять хеш");
  } finally {
    for (const d of [src, cfgA, cfgB]) rmSync(d, { recursive: true, force: true });
  }
});

test("хеш не зависит от того, где продукт лежит на диске", () => {
  // Дефект, который это ловит: в строку хеша уходил развёрнутый путь
  // файла настройки. Тогда переименование каталога продукта обесценивало
  // кэш всех сегментов, а два клона одного среза по разным путям никогда
  // не делили бы кэш.
  const a = tree();
  const b = tree();
  const cfgA = mkdtempSync(join(tmpdir(), "slidecast-loc-a-"));
  const cfgB = mkdtempSync(join(tmpdir(), "slidecast-loc-b-"));
  try {
    for (const d of [cfgA, cfgB]) {
      for (const f of CONFIG_FILES) writeFileSync(join(d, f), "{}\n");
    }
    assert.equal(selfHash(a, "7.0.2", cfgA), selfHash(b, "7.0.2", cfgB));
  } finally {
    for (const d of [a, b, cfgA, cfgB]) rmSync(d, { recursive: true, force: true });
  }
});
