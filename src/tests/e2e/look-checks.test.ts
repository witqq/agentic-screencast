// Проверки облика по docs/visual-design.md: признаки клише в lint, источник и дата у чисел,
// пустая полоса нарисованной сцены на листе кадров и порог контраста основного текста в `check`.
// Каждая проверка показана красной на контрпримере и зелёной на исправленном сценарии.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { clicheSigns, lint } from "../../lint.js";

const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");
const HEAD = `# Film\nlang: en\nvoice: {"engine":"stub","name":"silent","cps":15}\n`;
const story = (body: string, head = HEAD): string => {
  const dir = mkdtempSync(join(tmpdir(), "sc-look-"));
  const file = join(dir, "story.md");
  writeFileSync(file, `${head}\n${body}`);
  return file;
};
const rules = (file: string): string[] => clicheSigns(file).map((s) => s.id).sort();

test("lint counts the signs of a template film, and a considered film carries none", () => {
  const cliche = story(`
## one · slides.hero
kicker: THE BIG IDEA
title: The AI-powered platform
background: aurora
flash: 1s
enter: rise
transition: cube

The first beat.

## two · slides.features
title: Why us
items: 🚀 Fast :: quick | 🔒 Safe :: secure | ✨ Simple :: easy
enter: rise
transition: whip
overlay: {"bursts":[{"at":0.5,"kind":"confetti","point":[0.5,0.5]},{"at":1.5,"kind":"sparks","point":[0.3,0.3]}],"glints":[{"at":1,"target":".feat"}]}

The second beat.

## three · slides.chapter
title: Next
body: What comes next.
enter: rise
transition: zoom

The third beat.
`, `${HEAD}look: {"grade":"teal-orange","grain":0.3}\n`);
  assert.deepEqual(rules(cliche), ["decorative-background", "emoji-icons", "grain", "hit-outside-trailer", "kicker-caps", "many-sparkles", "same-entrance", "transition-kinds"]);
  // Признаки не валят lint: каждый бывает решением.
  assert.ok(!lint(cliche).some((f) => f.id === "kicker-caps"));
  const r = spawnSync("node", [ENTRY, "lint", cliche], { encoding: "utf8" });
  const out = JSON.parse(r.stdout) as { cliches: { count: number; verdict?: string } };
  assert.equal(out.cliches.count, 8);
  assert.match(out.cliches.verdict ?? "", /four or more signs/u);

  const considered = story(`
## one · slides.hero
kicker: What changed
title: The build names every cut line
image: shot.png

The first beat.

## two · slides.features
title: Three checks
items: Lint :: before the build | Frames :: without a build | Report :: after the build

The second beat.
`);
  writeFileSync(join(dirname(considered), "shot.png"), "");
  assert.deepEqual(rules(considered), []);
});

test("a trailer keeps its impacts, grain and card capitals without a sign", () => {
  const trailer = story(`
## slam · slides.card
title: ZERO MERCY
flash: 0.2s
shake: 0.2s
duration: 2

## title · slides.titlecard
title: The Last Pie
kicker: THIS AUTUMN
duration: 3
`, `${HEAD}look: trailer\n`);
  assert.deepEqual(rules(trailer), []);
});

test("a number slide names its source and date, or lint says so", () => {
  const bare = story(`
## n · slides.counter
title: Rules
values: 65 :: directing rules

The rules.
`);
  assert.ok(lint(bare).some((f) => f.id === "number-source"));
  const noted = story(`
## n · slides.counter
title: Rules
values: 65 :: directing rules
note: docs/film-craft.md, September 2026

The rules.
`);
  assert.ok(!lint(noted).some((f) => f.id === "number-source"));
});

test("the frames sheet names a drawn scene whose frame has a flat empty third", () => {
  const file = story(`
## pad · page
page: pad.html
duration: 3

## full · page
page: full.html
duration: 3
`);
  const dir = dirname(file);
  // Страница в полкадра и серая заглушка под ней — контрпример film craft 53.
  writeFileSync(join(dir, "pad.html"), `<!doctype html><body style="margin:0;background:#cccccc"><div style="height:45vh;background:repeating-linear-gradient(90deg,#222 0 40px,#eee 40px 80px)"></div></body>`);
  writeFileSync(join(dir, "full.html"), `<!doctype html><body style="margin:0;height:100vh;background:repeating-linear-gradient(90deg,#222 0 40px,#eee 40px 80px)"></body>`);
  const r = spawnSync("node", [ENTRY, "frames", "--source", file], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout) as { empty?: Array<{ scene: string }> };
  assert.deepEqual((out.empty ?? []).map((e) => e.scene), ["pad"]);
});

test("check holds body text to 4.5:1 and title-sized text to 3:1", () => {
  // Серый текст на серой бумаге: 3,2:1 — прошёл бы прежний порог крупного текста, но не основного.
  const grey = story(`
## c · slides.compare
title: Before and after
left: Before :: one | two
right: After :: three | four

The beat.
`, `${HEAD}theme: {"preset":"neutral","--body":"#8a8a86","--mut":"#8a8a86"}\n`);
  const bad = spawnSync("node", [ENTRY, "check", "--source", grey], { cwd: dirname(grey), encoding: "utf8", timeout: 300_000 });
  assert.notEqual(bad.status, 0, "grey body text is refused");
  assert.match(bad.stdout, /< 4\.5/u);
  const fine = story(`
## c · slides.compare
title: Before and after
left: Before :: one | two
right: After :: three | four

The beat.
`, `${HEAD}theme: neutral\n`);
  const ok = spawnSync("node", [ENTRY, "check", "--source", fine], { cwd: dirname(fine), encoding: "utf8", timeout: 300_000 });
  assert.equal(ok.status, 0, ok.stdout.slice(-600));
});
