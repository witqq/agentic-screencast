import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { THEMES, THEME_KEYS, THEME_NAMES, resolveTheme } from "../../theme.js";
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

test("every shipped theme names every variable of the contract", () => {
  for (const name of THEME_NAMES) {
    const vars = THEMES[name]!;
    for (const key of THEME_KEYS) {
      assert.ok(vars[key], `theme ${name} is missing ${key}`);
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

test("a film without a theme keeps the previous look", () => {
  assert.deepEqual(resolveTheme(undefined), {});
});

test("the header accepts a bare theme name and rejects an unknown one", () => {
  const named = parseSource(source("calm-paper"));
  assert.equal(named.theme?.["--bg"], THEMES["calm-paper"]!["--bg"]);
  assert.throws(() => parseSource(source("plasma")), /unknown theme/);
});
