// Справочник по-английски (docs/reference.md) и его русская версия (README.ru.md) — один документ
// на двух языках. Правка одной версии без другой расходит их молча; здесь сверяется устройство:
// заголовки каждого уровня, строки таблиц и блоки кода.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** Устройство документа без текста: уровни заголовков по порядку, число строк таблиц и блоков кода. */
function shape(file: string): { headings: string; tableRows: number; fences: number } {
  const lines = readFileSync(resolve(ROOT, file), "utf8").split("\n");
  let inCode = false;
  const heads: string[] = [];
  let rows = 0, fences = 0;
  for (const l of lines) {
    if (l.startsWith("```")) { inCode = !inCode; fences++; continue; }
    if (inCode) continue;
    const h = /^(#{2,4}) /u.exec(l);
    if (h) heads.push(h[1]!);
    if (l.startsWith("|")) rows++;
  }
  return { headings: heads.join(" "), tableRows: rows, fences };
}

test("the English reference and README.ru.md have the same sections, tables and code blocks", () => {
  assert.deepEqual(shape("docs/reference.md"), shape("README.ru.md"));
});
