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

test("every rule a finding names exists in the knowledge base", () => {
  // FC-N — заголовок «## N.» film-craft; VA-N — шаг N раздела о лицензиях в visual-assets.
  const craft = [...read("docs/film-craft.md").matchAll(/^## (\d+)\. /gmu)].map((m) => `FC-${m[1]}`);
  const assets = read("docs/visual-assets.md");
  const section = assets.slice(assets.indexOf("## Checking a licence and writing the credit"), assets.indexOf("\n## ", assets.indexOf("## Checking a licence") + 5));
  const steps = [...section.matchAll(/^(\d+)\. /gmu)].map((m) => `VA-${m[1]}`);
  assert.ok(steps.length >= 5, `found ${steps.length} licence steps`);
  const known = new Set([...craft, ...steps]);
  assert.deepEqual(Object.entries(RULES).filter(([, rule]) => !known.has(rule)), []);
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

test("lint names a sound file without a line in assets/CREDITS.md, and not one that has it", async () => {
  const { mkdtempSync, mkdirSync, writeFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { lint } = await import("../../lint.js");
  const dir = mkdtempSync(join(tmpdir(), "sc-credits-"));
  mkdirSync(join(dir, "audio"));
  writeFileSync(join(dir, "audio", "bed.mp3"), "");
  writeFileSync(join(dir, "story.md"), `# F\nlang: en\nvoice: {"engine":"stub","name":"silent","cps":15}\nmusic: {"file":"audio/bed.mp3"}\n\n`
    + `## a · slides.chapter\ntitle: Title\nbody: Body\n\nA spoken beat of the scene.\n`);
  const found = (): string[] => lint(join(dir, "story.md")).filter((f) => f.id === "uncredited").map((f) => f.rule);
  assert.deepEqual(found(), ["VA-5"]);
  mkdirSync(join(dir, "assets"));
  writeFileSync(join(dir, "assets", "CREDITS.md"), `Music: "Bed" — Kevin MacLeod (incompetech.com), CC BY 4.0 — audio/bed.mp3\n`);
  assert.deepEqual(found(), []);
});
