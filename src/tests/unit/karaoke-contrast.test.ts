// Непроизнесённое слово караоке приглушено прозрачностью темы и держит 4,5:1 к плашке в каждой
// поставляемой теме. Прежде прозрачность была одна на все темы (0,55), и на светлых — в том числе
// у neutral по умолчанию — слово давало 3,2–4,0:1 (замер базы, правило 62).
import { test } from "node:test";
import assert from "node:assert/strict";
import { THEMES, resolveTheme } from "../../theme.js";
import { karaokeRestContrast } from "../../brand.js";

test("every shipped theme keeps an unspoken karaoke word at 4.5:1 or more on the subtitle plate", () => {
  const low = Object.keys(THEMES).map((name) => [name, karaokeRestContrast(resolveTheme(name))] as const)
    .filter(([, c]) => c === null || c < 4.5);
  assert.deepEqual(low, []);
});

test("the old single dimming would have failed the light themes", () => {
  const neutral = { ...resolveTheme("neutral"), "--sc-karaoke-rest": "0.55" };
  assert.ok(karaokeRestContrast(neutral)! < 4.5, "0.55 on neutral's white plate is under 4.5:1");
});

test("lint names an author's theme that dims unspoken karaoke words under 4.5:1 on the plate", async () => {
  const { mkdtempSync, writeFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { lint } = await import("../../lint.js");
  const story = (rest: string): string => {
    const dir = mkdtempSync(join(tmpdir(), "sc-karaoke-"));
    writeFileSync(join(dir, "story.md"), `# F\nlang: en\nvoice: {"engine":"stub","name":"silent","cps":15}\n`
      + `theme: {"preset":"neutral","--sc-karaoke-rest":"${rest}"}\ncaptions: {"style":"karaoke","look":"plate"}\n\n`
      + `## a · slides.chapter\ntitle: Title\nbody: Body\n\nA spoken beat of the scene.\n`);
    return join(dir, "story.md");
  };
  const found = (rest: string): string[] => lint(story(rest)).filter((f) => f.id === "karaoke-contrast").map((f) => f.rule);
  assert.deepEqual(found("0.4"), ["FC-62"]);
  assert.deepEqual(found("0.8"), []);
});
