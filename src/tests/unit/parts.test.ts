// Части ролика: явные `part:` берут верх над заставками. Прежде обзор с пятнадцатью `part:` получал
// ещё и каждый титр, hero и заставку темы отдельной частью — в полосе хода и в главах WebVTT.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseSource, toPitch } from "../../source.js";

const film = (body: string): string[] => {
  const file = join(mkdtempSync(join(tmpdir(), "sc-parts-")), "story.md");
  writeFileSync(file, `# F\nvoice: {"engine":"stub","name":"silent","cps":15}\n${body}`);
  return toPitch(parseSource(file)).scenes.map((s) => (s as { chapter?: string }).chapter ?? "");
};
const SCENES = (part: string): string => `
## a · slides.hero
${part}title: Opening
duration: 2

## b · slides.chapter
kicker: Theme
title: A theme sample
body: Shown inside the look chapter.
duration: 2
`;

test("a film that names its parts gets only those; a film without part: gets one per chapter slide", () => {
  assert.deepEqual(film(SCENES("part: Look\n")), ["Look", ""]);
  assert.deepEqual(film(SCENES("")), ["Opening", "Theme"]);
});
