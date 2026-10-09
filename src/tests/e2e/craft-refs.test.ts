// Ссылки на правила режиссуры по номеру. Правила в docs/film-craft.md пронумерованы, и на них
// ссылаются по номеру скилл, база знаний, справка и чеклист («film craft 5», «rules 2, 11, 27 and
// 40»). Номер служит идентификатором: вставка правила в середину молча сдвинула бы все ссылки на
// соседние правила. Поэтому пары «номер — название» зафиксированы здесь. Изменились номера — тест
// красный: поправьте каждую ссылку, которую он перечисляет, и только потом этот список.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const ENTRY = resolve(ROOT, "dist", "agentic-screencast.js");

/** Правила, на которые можно ссылаться: номер и название в том виде, в каком ссылки их подразумевают. */
const RULES: Array<[number, string]> = [
  [1, "The genre: a short film, not a screen recording"],
  [2, "The subject comes from the source, never from imagination"],
  [3, "Parts follow a meaningful order and preserve context"],
  [4, "Narration is one continuous text, cut afterwards"],
  [5, "One text layer at a time"],
  [6, "A caption must not cover what it describes"],
  [7, "The camera explains where and how to look"],
  [8, "Freezing alone is not a rhythm"],
  [9, "Motion develops the explanation; holds give time to understand"],
  [10, "The look is a named theme, not a pile of hand-set variables"],
  [11, "Cover the inventory, not the convenient parts"],
  [12, "Show what it holds under load"],
  [13, "The animation being filmed must itself be worth filming"],
  [14, "Verify by measurement, not impression"],
  [15, "Ask before building"],
  [16, "A caption must say what is on screen right now"],
  [17, "Stop time inside the shot, do not cut to a still"],
  [18, "Choose isolation or additive emphasis for the evidence"],
  [19, "Screen recording has its own frame budget — measure it"],
  [21, "Film a live application in ONE unbroken take"],
  [22, "Time marks must come from the recording, not from the wall clock"],
  [23, "When debug chrome is to be hidden, hide it AFTER it exists, and verify it is gone"],
  [24, "A card arrives as an object, not as a sticker"],
  [25, "A video scene with speech is cut to the speech, not to the clip"],
  [26, "Requirements come from the owner, not from the agent's taste"],
  [27, "Take stock of the products and the showcases before writing a scenario"],
  [28, "One chapter, one document"],
  [29, "Fail the shoot on a page error"],
  [30, "The tool's demo assets are not product footage"],
  [31, "After the build, check every caption against its frame"],
  [32, "Everything drawn wears the theme — and so does a live take"],
  [33, "An attention tool shows the whole subject"],
  [34, "Nothing covers the line of speech"],
  [35, "Two subtitle lines, measured in every language and format"],
  [36, "Frame-anchored text shares one step"],
  [37, "Name the moments to check in the scenario"],
  [38, "A change of look rebuilds what the look is baked into"],
  [39, "The sheet you look at must not hide what you look at"],
  [40, "The strongest result gets the strongest shot"],
  [41, "The inventory serves the story, not the other way round"],
  [42, "Stage the feature in content that looks like real use"],
  [43, "The filmed material is designed too"],
  [44, "Captions and cards speak in the film's chosen voice"],
  [45, "Vary the camera; one repeated move is a tic"],
  [46, "Keep the picture sharp: record big, encode once"],
  [47, "Every remark stays on a list until the frames show it fixed"],
  [48, "When cuts keep failing, rethink the concept"],
  [49, "The quality bar depends on the audience"],
  [50, "Camera moves need time — lint estimates it, the build measures it"],
  [51, "Subtitles: readable first, big enough, one accent at most"],
  [52, "Transitions express the relation between scenes"],
  [53, "Move the subtitles, never pad the content"],
  [54, "Cut a piece from mark to mark"],
  [55, "A three-second probe take before the whole take"],
  [56, "Every factual clause of the narration is checked against its source"],
  [57, "Review at the size the viewer sees, and between the stills"],
  [58, "One subject per frame, large, in every format"],
  [59, "An entrance serves reading"],
  [60, "Establish the whole interface and preserve its truth"],
  [61, "A sound accent follows the law of a colour accent"],
  [62, "The subtitle face is chosen, and the word lights by colour only"],
  [63, "Choose film treatment for the subject and protect evidence"],
  [64, "The first three seconds show the product"],
  [65, "The film ends on its result"],
  [66, "Coordinate motion around an understandable focus"],
];
/** Правило 20 — ловушки инструментов сборки — живёт в CONTRIBUTING.md, а не в film-craft.md. */
const ELSEWHERE: Record<number, { file: string; heading: string }> = { 20: { file: "CONTRIBUTING.md", heading: "## Traps of the assembly tools" } };

/**
 * Номера правил, названные в тексте: после «film craft», «film-craft», «rule(s)» идёт список —
 * числа и диапазоны через запятую и «and», между ними бывают пояснения в скобках.
 */
export function ruleRefs(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/\b(?:film[ -]craft(?: rules?)?|[Rr]ules?)\s+(?=\d)/gu)) {
    let i = m.index! + m[0].length;
    for (;;) {
      const n = /^(\d+)(?:\s*[–-]\s*(\d+))?/u.exec(text.slice(i));
      if (!n) break;
      const from = Number(n[1]), to = Number(n[2] ?? n[1]);
      for (let k = from; k <= to; k++) out.push(k);
      i += n[0].length;
      const paren = /^\s*\([^)]*\)/u.exec(text.slice(i));
      if (paren) i += paren[0].length;
      const sep = /^\s*(?:,\s*(?:and\s+)?|and\s+)(?=\d)/u.exec(text.slice(i));
      if (!sep) break;
      i += sep[0].length;
    }
  }
  return out;
}

test("the film-craft rules keep their numbers, and every numbered reference names an existing rule", () => {
  const craft = readFileSync(resolve(ROOT, "docs", "film-craft.md"), "utf8");
  const headings = [...craft.matchAll(/^## (\d+)\. (.+)$/gmu)].map((m) => [Number(m[1]), m[2]!] as [number, string]);
  assert.deepEqual(headings, RULES, "the rules were renumbered or renamed: update every reference to the moved rules, then this list");
  for (const [n, { file, heading }] of Object.entries(ELSEWHERE)) {
    assert.ok(readFileSync(resolve(ROOT, file), "utf8").includes(heading), `rule ${n} lives in ${file} under «${heading}»`);
  }
  const known = new Set([...RULES.map(([n]) => n), ...Object.keys(ELSEWHERE).map(Number)]);
  const sources: Array<[string, string]> = [
    ...["skills/agentic-screencast/SKILL.md", "docs/film-craft.md", "docs/scenario-playbook.md", "docs/vertical-video.md",
      "docs/visual-assets.md", "docs/visual-design.md", "docs/sound.md", "templates/checklist.md", "README.md", "README.ru.md", "CONTRIBUTING.md"]
      .map((f) => [f, readFileSync(resolve(ROOT, f), "utf8")] as [string, string]),
    ["help", ["", "video", "capture", "overlay", "slides", "vertical", "text", "transitions", "sound", "themes", "voice", "web"]
      .map((t) => execFileSync(process.execPath, [ENTRY, "help", ...(t ? [t] : [])], { encoding: "utf8" })).join("\n")],
  ];
  const bad = sources.flatMap(([file, text]) => ruleRefs(text).filter((n) => !known.has(n)).map((n) => `${file}: rule ${n}`));
  assert.deepEqual(bad, [], "a reference names a rule that does not exist");
  const all = sources.flatMap(([, text]) => ruleRefs(text));
  assert.ok(all.length >= 30, `the references were read (${all.length})`);
});

test("rule references are read as lists with ranges and remarks in brackets", () => {
  assert.deepEqual(ruleRefs("film craft rules 19 (the frame budget), 21–23, 28–30, 32 and 53–55 before a take"),
    [19, 21, 22, 23, 28, 29, 30, 32, 53, 54, 55]);
  assert.deepEqual(ruleRefs("see film-craft 49; and rules 2, 11, 27 and 40."), [49, 2, 11, 27, 40]);
});
