import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { THEMES, THEME_KEYS, resolveTheme, themeVariants } from "../../theme.js";
import { parseSource } from "../../source.js";

const source = (theme: string): string => {
  const dir = mkdtempSync(join(tmpdir(), "sc-theme-"));
  const file = join(dir, "story.md");
  writeFileSync(file, [
    "# Theme",
    "lang: en",
    `theme: ${theme}`,
    'voice: {"engine":"stub","name":"silent"}',
    "",
    "## opening · slides.chapter",
    "kicker: THEME",
    "title: One word sets the look.",
    "body: The preset names every variable the page and the stage need.",
    "duration: 5",
    "",
  ].join("\n"));
  return file;
};

test("every shipped theme names every variable of the contract in each of its schemes", () => {
  for (const { name, scheme, vars } of themeVariants()) {
    for (const key of THEME_KEYS) {
      assert.ok(vars[key], `theme ${name} (${scheme}) is missing ${key}`);
    }
  }
});

test("a preset name resolves to the full variable set", () => {
  const vars = resolveTheme("synthwave");
  assert.equal(vars["--acc"], THEMES.synthwave!["--acc"]);
  assert.equal(Object.keys(vars).length, Object.keys(THEMES.synthwave!).length);
});

test("own variables override the named preset", () => {
  const vars = resolveTheme({ preset: "noir", "--acc": "#00ff00", bg: "#010101" });
  assert.equal(vars["--acc"], "#00ff00");
  // Имя без дефисов принимается и приводится к виду переменной: в шапке
  // источника пишут и так, и так.
  assert.equal(vars["--bg"], "#010101");
  assert.equal(vars["--ink"], THEMES.noir!["--ink"]);
});

test("a film without a theme wears neutral from the table", () => {
  // Прежде ролик без темы получал пустой набор и держался на запасных значениях, вписанных в код
  // рисования; теперь запасных значений в коде нет, и тема по умолчанию приходит из таблицы тем.
  assert.deepEqual(resolveTheme(undefined), THEMES.neutral);
});

test("a theme without a named base and without every token is a parse error that lists what is missing", () => {
  assert.throws(() => resolveTheme({ "--acc": "#ff0000" }), /without a named base must write every token.*missing \d+: --bg/su);
  const full = { ...THEMES.noir!, "--acc": "#ff0000" };
  assert.equal(resolveTheme(full)["--acc"], "#ff0000");
});

test("colours that ffmpeg and the shaders read must be written as #rrggbb, not silently swapped", () => {
  assert.throws(() => resolveTheme({ preset: "noir", "--sc-progress": "rgb(255,0,0)" }), /--sc-progress: .*#rrggbb/u);
  assert.throws(() => resolveTheme({ preset: "noir", "--sc-confetti": "#ff0000,red" }), /--sc-confetti/u);
  assert.equal(resolveTheme({ preset: "noir", "--sc-progress-track": "#00000059" })["--sc-progress-track"], "#00000059");
});

test("the header accepts a bare theme name and rejects an unknown one", () => {
  const named = parseSource(source("calm-paper"));
  assert.equal(named.theme?.["--bg"], THEMES["calm-paper"]!["--bg"]);
  assert.throws(() => parseSource(source("plasma")), /unknown theme/);
});
