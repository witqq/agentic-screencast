import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const cli = resolve(dirname(fileURLToPath(import.meta.url)), "../../agentic-screencast.js");

function lintScenario(lang: "en" | "ru", fields: { film?: string; scene?: string }): string {
  const dir = mkdtempSync(join(tmpdir(), "sc-validation-lang-"));
  const source = join(dir, "story.md");
  writeFileSync(source, `# Validation\nlang: ${lang}\nvoice: {"engine":"stub","name":"silent"}\n${fields.film ? `${fields.film}\n` : ""}\n## s · slides.hero\ntitle: Example\nduration: 2\n${fields.scene ?? ""}\n`);
  const result = spawnSync(process.execPath, [cli, "lint", "--source", source], { encoding: "utf8" });
  assert.equal(result.status, 2, result.stderr);
  return result.stdout + result.stderr;
}

const lintField = (lang: "en" | "ru", field: string): string => lintScenario(lang, { scene: field });

test("scenario lint explains overlay validation in the scenario language", () => {
  const field = 'overlay: {"cards":[{"at":0,"title":""}]}';
  const en = lintField("en", field);
  const ru = lintField("ru", field);
  assert.match(en, /line 5: overlay\.cards\[0\]\.title: expected 1–44 characters/);
  assert.match(ru, /строка 5: overlay\.cards\[0\]\.title: ожидается текст длиной от 1 до 44 символов/);
  assert.doesNotMatch(ru, /expected 1–44 characters/);
});

test("scenario lint explains spotlight validation in the scenario language", () => {
  const field = 'spotlight: [{"target":"#sample","area":[0.1,0.1,0.4,0.3],"at":"b1"}]';
  const en = lintField("en", field);
  const ru = lintField("ru", field);
  assert.match(en, /spotlight\[0\]: name exactly one target or area/);
  assert.match(ru, /spotlight\[0\]: укажите ровно одно из полей target и area/);
  assert.doesNotMatch(ru, /name exactly one/);
});

test("nested overlay and spotlight errors retain exact authoring fields", () => {
  const camera = lintField("ru", 'overlay: {"camera":[{"at":0,"hold":1,"area":[0.8,0,0.4,0.2]}]}');
  const focus = lintField("ru", 'spotlight: [{"target":"#sample","at":"b1","keep":true,"until":"b1.end"}]');
  assert.match(camera, /overlay\.camera\[0\]\.area: область выходит за пределы кадра/);
  assert.match(focus, /spotlight\[0\]: keep оставляет приближение, а until возвращает общий план/);
});

test("other scenario validators explain film and scene fields in the chosen language", () => {
  const look = 'look: {"grain":2}';
  const transition = 'transition: {"kind":"morph"}';
  assert.match(lintScenario("en", { film: look }), /look\.grain: expected 0…1/);
  assert.match(lintScenario("ru", { film: look }), /look\.grain: ожидается от 0 до 1/);
  assert.match(lintField("en", transition), /transition\.element: a morph names the element/);
  assert.match(lintField("ru", transition), /transition\.element: переход morph требует элемент/);
});
