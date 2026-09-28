// `schema <вид>` — короткая справка: поля вида с записью, обязательные, общие поля сцены; `schema
// film` — поля шапки. Каждое поле обязано иметь запись: новое поле не выходит без описания.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { allKinds, FIELD_FORMATS, FILM_FORMATS } from "../../schema.js";
import { COMMON, FILM_FIELDS } from "../../source.js";

const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

test("every scene field and every header field has a written form for the short schema", () => {
  const fields = new Set([...COMMON, ...allKinds().flatMap((e) => e.spec.fields)]);
  assert.deepEqual([...fields].filter((f) => !FIELD_FORMATS[f]), []);
  assert.deepEqual(FILM_FIELDS.filter((f) => !FILM_FORMATS[f]), []);
});

test("schema slides.steps prints the kind's fields briefly, and schema film the header", () => {
  const run = (...args: string[]): { out: string; status: number | null } => {
    const r = spawnSync("node", [ENTRY, "schema", ...args], { encoding: "utf8" });
    return { out: r.stdout + r.stderr, status: r.status };
  };
  const steps = run("slides.steps");
  assert.equal(steps.status, 0);
  assert.match(steps.out, /^slides\.steps — /);
  assert.match(steps.out, /required: items/);
  assert.match(steps.out, /\n {2}items: Title :: text/);
  assert.match(steps.out, /\n {2}stills: /, "the fields of every scene are listed too");
  assert.ok(steps.out.split("\n").length < 40, "it is short");
  assert.match(run("film").out, /\n {2}progress: \{"position":"top\|bottom","parts":true,"label":"edge\|zone"\}/);
  const bad = run("slides.nope");
  assert.equal(bad.status, 2);
  assert.match(bad.out, /unknown kind «slides\.nope»; known: .*slides\.steps/);
});
