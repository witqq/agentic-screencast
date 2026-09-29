// Каждая машинная находка называет правило базы, и это правило существует: номер FC-N — заголовок
// «## N.» в docs/film-craft.md. Проверка идёт по исходникам lint и сборки, а не по списку в тесте:
// новая проверка без правила в таблице здесь и краснеет.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { RULES, finding } from "../../rules.js";
import { DICTS } from "../../msg.js";
import { PRODUCT_ROOT } from "../../self-hash.js";

const read = (p: string): string => readFileSync(resolve(PRODUCT_ROOT, p), "utf8");

test("every rule a finding names is a heading of film-craft", () => {
  const headings = new Set([...read("docs/film-craft.md").matchAll(/^## (\d+)\. /gmu)].map((m) => `FC-${m[1]}`));
  assert.deepEqual(Object.entries(RULES).filter(([, rule]) => !headings.has(rule)), []);
});

test("every finding lint and the build raise has a rule and a hint in both languages", () => {
  const ids = new Set([
    ...[...read("src/lint.ts").matchAll(/\badd\("([a-z-]+)"/gu)].map((m) => m[1]!),
    ...[...read("src/lint.ts").matchAll(/\bfinding\("([a-z-]+)"/gu)].map((m) => m[1]!),
    ...[...read("src/build.ts").matchAll(/\b(?:warn\([^,]+, |finding\()"([a-z-]+)"/gu)].map((m) => m[1]!),
  ]);
  assert.ok(ids.size >= 25, `found ${ids.size} finding ids`);
  assert.deepEqual([...ids].filter((id) => !RULES[id]), [], "ids without a rule");
  for (const id of ids) {
    for (const lang of ["en", "ru"] as const) assert.ok(DICTS[lang][`hint.${id}`], `hint.${id} in ${lang}`);
  }
  const f = finding("still-scene", "stands still");
  assert.deepEqual(Object.keys(f).sort(), ["hint", "id", "message", "rule"]);
  assert.equal(f.rule, "FC-9");
});
