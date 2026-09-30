// Удобство агента в разборе: пресет формата, многострочные поля, подсказки к
// опечаткам и режиссёрский линтер.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { parseSource } from "../../source.js";
import { clicheSigns, lint } from "../../lint.js";
import { useLang } from "../../msg.js";
import { THEMES, themeFingerprint, wholeThemeFingerprint } from "../../theme.js";

function story(text: string): string {
  const dir = mkdtempSync(join(tmpdir(), "sc-fmt-"));
  const file = join(dir, "story.md");
  writeFileSync(file, text);
  return file;
}
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");
const HEAD = `# F\nvoice: {"engine":"stub","name":"silent","cps":15}\nlang: en\n`;
const HERO = `\n## a · slides.hero\ntitle: Hi\nduration: 3\n`;

test("a format preset sets the frame and the safe zone of the platforms", () => {
  const v = parseSource(story(`${HEAD}format: vertical\n${HERO}`));
  assert.deepEqual(v.frame, { width: 1080, height: 1920, fps: 30 });
  assert.deepEqual(v.safe, { top: 170, bottom: 484, left: 65, right: 180 });
  // `frame` перекрывает числа пресета, а зона пересчитывается под настоящий кадр.
  const small = parseSource(story(`${HEAD}frame: {"width":720,"height":1280,"fps":30}\nformat: vertical\n${HERO}`));
  assert.deepEqual(small.frame, { width: 720, height: 1280, fps: 30 });
  assert.deepEqual(small.safe, { top: 113, bottom: 323, left: 43, right: 120 });
  const sq = parseSource(story(`${HEAD}format: square\n${HERO}`));
  assert.deepEqual(sq.frame, { width: 1080, height: 1080, fps: 30 });
  assert.equal(parseSource(story(`${HEAD}format: landscape\n${HERO}`)).safe, undefined);
  assert.throws(() => parseSource(story(`${HEAD}format: portrait\n${HERO}`)), /unknown «portrait»; available: landscape, vertical, square/);
});

test("long fields are written on several lines: a block, a list and JSON", () => {
  const src = parseSource(story(`${HEAD}
## c · slides.code
title: Code
code: |
  function add(a, b) {
    return a + b;
  }

Beat one.

## s · slides.steps
title: Steps
items: |
  - One :: first
  - Two :: second
overlay: {"titles":[
  {"at":0.2,"text":"Hello","style":"fly","hold":4}
]}

Beat two.
`));
  assert.equal(src.scenes[0]!.fields.code, "function add(a, b) {\n  return a + b;\n}");
  assert.equal(src.scenes[0]!.beats[0]!.text, "Beat one.");
  assert.equal(src.scenes[1]!.fields.items, "One :: first | Two :: second");
  assert.equal(JSON.parse(src.scenes[1]!.fields.overlay!).titles[0].style, "fly");
  // Свёрнутое поле разбирается целиком: ошибка в нём называет сцену (строку
  // её заголовка), а не обрывок JSON на третьей строке.
  assert.throws(() => parseSource(story(`${HEAD}\n## s · slides.steps\ntitle: S\nitems: A :: a\noverlay: {"titles":[\n  {"at":0.2,"text":"Hello","hold":1}\n]}\n\nBeat.\n`)),
    /line 5: overlay\.titles\[0\]\.hold/);
});

test("a typo in a field or a header names the closest valid name", () => {
  useLang("en");
  assert.throws(() => parseSource(story(`${HEAD}theem: aurora\n${HERO}`)), /unknown film field: theem — did you mean «theme»\?/);
  assert.throws(() => parseSource(story(`${HEAD}\n## a · slides.hero\ntitel: Hi\nduration: 3\n`)), /«titel» is not allowed for kind hero — did you mean «title»\?/);
  // Далёкое от всех имён слово подсказки не получает: неверная подсказка хуже никакой.
  assert.throws(() => parseSource(story(`${HEAD}\n## a · slides.hero\ntitle: Hi\nzzzzzz: 1\nduration: 3\n`)),
    (e: Error) => /not allowed/.test(e.message) && !/did you mean/.test(e.message));
});

test("the director lint names a card over the caption and an overloaded line, and passes a clean film", () => {
  const long = "This beat runs on and on, far longer than two lines of subtitles can hold, so the viewer "
    + "would have to read a paragraph at the bottom of a moving frame while also watching the product.";
  const CAPS = `captions: {"style":"subtitle","everywhere":true}\n`;
  const found = lint(story(`${HEAD}${CAPS}
## p · page
page: p.html
overlay: {"cards":[{"at":0.5,"title":"A card while the caption runs","position":"bottom-right","hold":4}],"camera":[]}

The first beat is spoken while the card is on screen.

${long}
`));
  const rules = found.map((f) => `${f.index}:${f.id}`);
  assert.ok(rules.includes("1:two-text-layers"), rules.join(", "));
  assert.ok(rules.includes("1:overloaded-line"), rules.join(", "));
  // Та же карточка на удержании камеры законна: подпись в это время уходит.
  const held = lint(story(`${HEAD}${CAPS}
## p · page
page: p.html
overlay: {"cards":[{"at":1.0,"title":"A card on a held push-in","position":"near-focus","hold":4}],"camera":[{"at":0.6,"move":0.4,"hold":4.4,"target":"h1","scale":1.6}]}

The first beat is spoken while the camera holds.
`));
  assert.deepEqual(held, []);
});

test("lint names narrated scenes without subtitles, and a word longer than a subtitle line", () => {
  const plain = story(`${HEAD}\n## p · page\npage: p.html\n\nA spoken line on a drawn page.\n`);
  assert.ok(lint(plain).some((f) => f.id === "no-subtitles" && f.rule === "FC-51"), "a narrated page without captions.everywhere is named");
  const covered = story(`${HEAD}captions: {"style":"subtitle","everywhere":true}\n\n## p · page\npage: p.html\n\nA spoken line on a drawn page.\n`);
  assert.ok(!lint(covered).some((f) => f.id === "no-subtitles"), "captions everywhere cover it");
  const word = story(`${HEAD}captions: {"style":"subtitle","everywhere":true}\n\n## p · page\npage: p.html\n\nSet AGENTIC_SCREENCAST_NO_LIVE_CAMERA_AND_EVERYTHING_ELSE_TOO=1 first.\n`);
  assert.ok(lint(word).some((f) => f.id === "long-word" && f.rule === "FC-35"), "a variable longer than a line is named");
});

test("lint estimates the film's length from the narration and the scenes' durations, less transition overlaps", () => {
  const info: { seconds?: number } = {};
  lint(story(`${HEAD}\n## a · page\npage: p.html\nduration: 4\n\n## b · page\npage: p.html\nduration: 5\ntransition: dots 1\n`), info);
  assert.equal(info.seconds, 8);
});

test("lint names hits in a scene with nothing to sound them, even when the scene is narrated", () => {
  const cap = `captions: {"style":"subtitle","everywhere":true}\n\n`;
  const found = lint(story(`${HEAD}${cap}## a · page\npage: p.html\nshake: 0.5s\nduration: 3\n\nThe narration is not a hit.\n`));
  assert.ok(found.some((f) => f.id === "silent-hits" && f.rule === "FC-63"), found.map((f) => f.id).join(", "));
  const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;
  const withSfx = story(`${HEAD}${cap}## a · page\npage: p.html\nshake: 0.5s\nsfx: [{"at":"0.5s","file":"hit.wav"}]\nduration: 3\n`);
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", "0.3", join(dirname(withSfx), "hit.wav")]);
  const sounded = lint(withSfx);
  assert.ok(!sounded.some((f) => f.id === "silent-hits"), "a hit with its sfx is not named");
});

test("a name that is only a property of every object (constructor) is refused, not taken as a theme, look, format, kind or transition", () => {
  const head = (line: string): string => story(`${HEAD}${line}\n\n## a · slides.hero\ntitle: T\nduration: 3\n\nSpoken.\n`);
  for (const line of ["theme: constructor", "look: constructor", "format: toString"]) {
    assert.throws(() => lint(head(line)), (e: Error) => /constructor|toString/u.test(e.message) && !/undefined|native code/u.test(e.message), line);
  }
  assert.throws(() => lint(story(`${HEAD}\n## a · slides.constructor\ntitle: T\nduration: 3\n\nSpoken.\n`)), /constructor/u);
  assert.throws(() => lint(story(`${HEAD}\n## a · slides.hero\ntitle: T\nduration: 3\n\nOne.\n\n## b · slides.hero\ntitle: T\ntransition: constructor\nduration: 3\n\nTwo.\n`)), /constructor/u);
});

test("a merged name is refused with the one to write wherever it is written", () => {
  const scene = (body: string): string => story(`${HEAD}\n${body}duration: 3\n\nSpoken.\n`);
  const refused = (file: string, re: RegExp): void => { assert.throws(() => lint(file), re); };
  refused(scene("## a · slides.hero\ntitle: T\nenter: lift\n"), /«lift» was merged into «rise»/u);
  refused(scene("## a · slides.hero\ntitle: T\ntext: scramble\n"), /«scramble» was merged into «flap»/u);
  refused(scene("## a · slides.hero\ntitle: T\nbackground: mesh\n"), /«mesh» was merged into «aurora»/u);
  refused(scene(`## a · page\npage: p.html\noverlay: {"cards":[{"at":0.3,"title":"A","reveal":"shuffle","hold":2.5}]}\n`), /«shuffle» was merged into «fly»/u);
  refused(scene(`## a · page\npage: p.html\noverlay: {"titles":[{"at":0.3,"text":"A","style":"scramble","hold":2.5}]}\n`), /«scramble» was merged into «flap»/u);
  refused(story(`${HEAD}theme: {"preset":"neutral","--bg-motion":"spotlight"}\n\n## a · slides.hero\ntitle: T\nduration: 3\n\nSpoken.\n`), /«spotlight» was merged into «lamp»/u);
  // Имя, совпадающее со свойством объекта, — не слитое имя, а просто неизвестное.
  assert.throws(() => lint(scene("## a · slides.hero\ntitle: T\ntransition: constructor\n")), (e: Error) => !/merged/u.test(e.message));
  const page = scene("## a · page\npage: p.html\n");
  writeFileSync(join(dirname(page), "p.html"), `<!doctype html><html data-sc-page><body><h1 data-kinetic="scramble">Hi</h1></body></html>`);
  const found = lint(page).find((f) => f.id === "page-retired");
  assert.match(String(found?.message), /«scramble» was merged into «flap»/u);
});

test("overloaded-line uses the effective portrait subtitle width, including --format", () => {
  const beat = "A readable sentence with enough words to need several subtitle lines in a narrow portrait frame.";
  const file = story(`${HEAD}\n## p · page\npage: p.html\n\n${beat}\n`);
  assert.ok(!lint(file).some((f) => f.id === "overloaded-line"), "the same beat fits the landscape limit");
  const previous = process.env.AGENTIC_SCREENCAST_FILM_FORMAT;
  process.env.AGENTIC_SCREENCAST_FILM_FORMAT = "vertical";
  try {
    const finding = lint(file).find((f) => f.id === "overloaded-line");
    assert.ok(finding, "the portrait cut uses its narrower subtitle band");
    assert.match(finding.message, /more than two subtitle screens of two lines each/);
    const russian = story(`# Ролик\nlang: ru\nformat: vertical\nvoice: {"engine":"stub","name":"silent","cps":15}\n\n## p · page\npage: p.html\n\n${"Очень длинная реплика о том, как человек работает с интерфейсом и почему ему нужен читаемый вертикальный кадр."}\n`);
    assert.match(lint(russian).find((f) => f.id === "overloaded-line")!.message, /такт 1 содержит .* знаков — больше двух экранов субтитров по две строки/);
  } finally {
    if (previous === undefined) delete process.env.AGENTIC_SCREENCAST_FILM_FORMAT;
    else process.env.AGENTIC_SCREENCAST_FILM_FORMAT = previous;
  }
});

test("letterbox bars join the safe zone of a wide film and are refused in a tall one", () => {
  // 1920×1080 при 2.39: полоса (1080 − 1920 / 2.39) / 2 = 138 точек сверху и снизу.
  const wide = parseSource(story(`${HEAD}look: trailer\n${HERO}`));
  assert.deepEqual(wide.safe, { top: 138, bottom: 138, left: 0, right: 0 });
  // В высоком кадре от 2.39 осталась бы лента в четверть высоты — это отказ разбора.
  assert.throws(() => parseSource(story(`${HEAD}format: vertical\nlook: trailer\n${HERO}`)), /letterbox bars need a landscape frame/);
  assert.throws(() => parseSource(story(`${HEAD}format: square\nlook: {"bars":2}\n${HERO}`)), /letterbox bars need a landscape frame/);
  assert.equal(parseSource(story(`${HEAD}format: vertical\nlook: cinematic\n${HERO}`)).look?.bars, undefined);
});

test("lint reads the scene through its provider and names titles over an interface and a first transition", () => {
  useLang("en");
  assert.throws(() => lint(story(`${HEAD}${HERO}background: auroraa\n`)), /background: unknown «auroraa» — did you mean «aurora»\?/);
  const found = lint(story(`${HEAD}
## p · page
page: p.html
transition: whip
overlay: {"titles":[{"at":0.3,"text":"Over the header","position":"top","hold":3}],"camera":[{"at":0.6,"move":0.4,"hold":3,"target":"h1","scale":1.6}]}

The page is spoken over.

## s · slides.hero
title: A slide
transition: push
overlay: {"titles":[{"at":0.3,"text":"Fine on a slide","position":"top","hold":3}]}
duration: 4
`)).map((f) => `${f.index}:${f.id}`);
  assert.ok(found.includes("1:title-over-interface"), found.join(", "));
  assert.ok(found.includes("1:first-transition"), found.join(", "));
  assert.ok(!found.some((f) => f.startsWith("2:")), `a slide may carry a top title and a transition: ${found.join(", ")}`);
});

test("a command that reads a scenario takes its path first as well as by --source", () => {
  const file = story(`${HEAD}${HERO}`);
  for (const args of [["lint", file], ["lint", "--source", file], ["scenes", file]]) {
    const r = spawnSync("node", [ENTRY, ...args], { encoding: "utf8", cwd: tmpdir() });
    assert.equal(r.status, 0, `${args.join(" ")}: ${r.stderr}`);
  }
  const miss = spawnSync("node", [ENTRY, "lint"], { encoding: "utf8", cwd: mkdtempSync(join(tmpdir(), "sc-none-")),
    env: { ...process.env, AGENTIC_SCREENCAST_LANG: "en" } });
  assert.equal(miss.status, 2);
  assert.match(miss.stderr, /story\.md: file not found/);
});

test("one scenario carries its translations: fields with a language suffix and a [lang] block of narration", () => {
  const BI = `# Launch film
title.ru: Ролик к запуску
lang: en
voice: {"engine":"stub","name":"silent","cps":15}
voice.ru: {"engine":"stub","name":"silent","cps":12}

## a · slides.chapter
kicker: CHAPTER ONE
kicker.ru: ГЛАВА ПЕРВАЯ
title: The first part
title.ru: Первая часть
body: What comes first.
body.ru: Что идёт первым.
overlay: {"titles":[{"at":0.3,"text":"Hello","style":"slam","hold":3}]}
overlay.ru: {"titles":[{"at":0.3,"text":"Привет","style":"slam","hold":3}]}

The first beat is spoken here.

The second beat follows.

[ru]
Первый такт звучит здесь.

Второй такт идёт следом.
`;
  const file = story(BI);
  const en = parseSource(file);
  assert.equal(en.title, "Launch film");
  assert.equal(en.lang, "en");
  assert.equal(en.variant, undefined);
  assert.deepEqual(en.langs, ["en", "ru"]);
  assert.equal(en.scenes[0]!.fields.title, "The first part");
  assert.deepEqual(en.scenes[0]!.beats.map((b) => b.text), ["The first beat is spoken here.", "The second beat follows."]);
  const ru = parseSource(file, { lang: "ru" });
  assert.equal(ru.title, "Ролик к запуску");
  assert.equal(ru.lang, "ru");
  assert.equal(ru.variant, "ru");
  assert.equal((ru.voice as { cps?: number }).cps, 12, "the header's voice.ru replaces the voice");
  assert.equal(ru.scenes[0]!.fields.kicker, "ГЛАВА ПЕРВАЯ");
  assert.match(ru.scenes[0]!.fields.overlay!, /Привет/u);
  assert.deepEqual(ru.scenes[0]!.beats.map((b) => b.text), ["Первый такт звучит здесь.", "Второй такт идёт следом."]);
  // Язык шапки выбирается и явно — это тот же оригинал.
  assert.equal(parseSource(file, { lang: "en" }).scenes[0]!.fields.title, "The first part");

  // Перевод речи обязан быть в каждой сцене с речью и такт в такт. Ошибка русской сборки — на
  // языке ролика.
  assert.throws(() => parseSource(story(BI.replace(/\[ru\][\s\S]*$/u, "")), { lang: "ru" }), /сцена a: нет реплики \[ru\]/u);
  assert.throws(() => parseSource(story(BI.replace("\nВторой такт идёт следом.\n", "\n")), { lang: "ru" }),
    /в \[ru\] тактов 1, в оригинале 2/u);
  assert.throws(() => parseSource(file, { lang: "de" }), /the scenario has no de text/);
  // Опечатка в поле чужого языка видна и в сборке оригинала.
  assert.throws(() => parseSource(story(BI.replace("kicker.ru:", "kikcer.ru:"))), /kikcer.*kicker/su);
  assert.throws(() => parseSource(story(BI.replace("lang: en\n", ""))), /names its own language in the header: lang: en/);
});

test("every scene field is either shown on screen or marked as staging, so the translation rule misses none", async () => {
  const { allKinds } = await import("../../schema.js");
  const { COMMON } = await import("../../source.js");
  const { SHOWN_COMMON, STAGING_COMMON } = await import("../../visible.js");
  for (const f of COMMON) {
    const v = (SHOWN_COMMON as readonly string[]).includes(f), i = (STAGING_COMMON as readonly string[]).includes(f);
    assert.ok(v !== i, `common field «${f}» is ${v && i ? "in both lists" : "in neither list"} of src/visible.ts`);
  }
  for (const k of allKinds()) {
    for (const f of k.spec.fields) {
      const v = (k.spec.shown ?? []).includes(f), i = (k.spec.staging ?? []).includes(f);
      assert.ok(v !== i, `${k.provider}.${k.kind}: field «${f}» is ${v && i ? "both shown and staging" : "neither shown nor staging"}`);
    }
  }
});

test("lint --lang names each visible field left untranslated, and only those", () => {
  const BI = `# Film
title.ru: Ролик
lang: en
voice: {"engine":"stub","name":"silent","cps":15}

## a · slides.hero
kicker: Launch
kicker.ru: Запуск
title: A new board
title.ru: Новая доска
body: Everything in one place.
body.ru: Всё в одном месте.
background: aurora
duration: 4
`;
  assert.deepEqual(lint(story(BI)), [], "the original is not held to a translation");
  const ru = (text: string): string[] => {
    const was = process.env.AGENTIC_SCREENCAST_FILM_LANG;
    process.env.AGENTIC_SCREENCAST_FILM_LANG = "ru";
    try { return lint(story(text)).map((f) => `${f.scene}:${f.id}:${/поле ([A-Za-z]+)/u.exec(f.message)?.[1] ?? ""}`); }
    finally { if (was === undefined) delete process.env.AGENTIC_SCREENCAST_FILM_LANG; else process.env.AGENTIC_SCREENCAST_FILM_LANG = was; }
  };
  assert.deepEqual(ru(BI), [], "a full translation is clean; background and duration need none");
  assert.deepEqual(ru(BI.replace("body.ru: Всё в одном месте.\n", "")), ["a:untranslated:body"]);
  assert.deepEqual(ru(BI.replace("title.ru: Ролик\n", "")).map((x) => x.split(":")[0]), ["(film)"]);
  // Накладка без надписей — пометки, лупа — перевода не требует; с надписью — требует.
  const marks = BI.replace("background: aurora\n", 'background: aurora\noverlay: {"marks":[{"at":1,"kind":"circle","point":[0.5,0.5]}]}\n');
  assert.deepEqual(ru(marks), [], "an overlay without text needs no translation");
  const titled = BI.replace("background: aurora\n", 'background: aurora\noverlay: {"titles":[{"at":1,"text":"Launch day","hold":3}]}\n');
  assert.deepEqual(ru(titled), ["a:untranslated:overlay"], "an overlay with a title does");
});

test("a mark, glint, burst or loupe keeps a page from counting as a still scene", () => {
  const page = (overlay: string): string => `${HEAD}
## p · page
page: p.html
duration: 8
${overlay}`;
  assert.ok(lint(story(page(""))).some((f) => f.id === "still-scene"), "a bare page stands still");
  for (const o of ['{"marks":[{"at":1,"kind":"circle","point":[0.5,0.5]}]}', '{"glints":[{"at":1,"area":[0.1,0.1,0.3,0.2]}]}',
    '{"bursts":[{"at":1,"kind":"confetti","point":[0.5,0.5]}]}', '{"loupe":[{"at":1,"point":[0.5,0.5]}]}']) {
    assert.ok(!lint(story(page(`overlay: ${o}`))).some((f) => f.id === "still-scene"), `moves with ${o.slice(2, 8)}`);
  }
});

test("a page that animates itself does not count as a still scene; a static one does", () => {
  const scene = `${HEAD}\n## p · page\npage: p.html\nduration: 8\n`;
  const withPage = (html: string): string => { const f = story(scene); writeFileSync(join(dirname(f), "p.html"), html); return f; };
  assert.ok(lint(withPage("<html><body><h1>Still</h1></body></html>")).some((f) => f.id === "still-scene"), "a static page stands still");
  assert.ok(lint(withPage("<ol><li data-at=\"b1\">One</li><li data-at=\"b2\">Two</li></ol>")).some((f) => f.id === "still-scene"),
    "data-at alone moves nothing: the layer only turns the anchor into seconds");
  for (const html of ["<style>@keyframes glow{to{opacity:.4}} h1{animation:glow 2s infinite}</style><h1>Title</h1>",
    "<h1 id=t>Title</h1><script>t.animate([{opacity:0},{opacity:1}],{duration:900})</script>",
    "<canvas></canvas><script>requestAnimationFrame(function f(){requestAnimationFrame(f)})</script>",
    // Движение по времени сцены: слой вызывает renderAt на каждом кадре и переводит data-at в секунды.
    "<div id=strip></div><script>window.renderAt = (t) => { strip.style.transform = `translateX(${-t * 90}px)`; };</script>",
    "<html data-sc-page><h1 data-kinetic=\"fly\" data-at=\"b1\">Title</h1></html>"]) {
    assert.ok(!lint(withPage(html)).some((f) => f.id === "still-scene"), `animated: ${html.slice(0, 40)}`);
  }
  // Атрибуты слоя действуют только на странице, отданной ему меткой: без неё фраза стоит, и lint
  // называет страницу, чтобы автор поставил метку.
  const unmarked = lint(withPage("<html><h1 data-kinetic=\"fly\" data-at=\"b1\">Title</h1></html>"));
  assert.ok(unmarked.some((f) => f.id === "still-scene"), "an unmarked page's kinetic phrase does not move");
  assert.ok(unmarked.some((f) => f.id === "page-unmarked"), "lint names the missing mark");
  assert.ok(!lint(withPage("<html data-sc-page><h1 data-kinetic=\"fly\">Title</h1></html>")).some((f) => f.id === "page-unmarked"));
  assert.ok(!lint(withPage("<html><h1>Plain</h1></html>")).some((f) => f.id === "page-unmarked"), "a page without layer attributes needs no mark");
});

test("still-scene follows local scripts linked by a page without treating a remote script as local movement", () => {
  const file = story(`${HEAD}\n## p · page\npage: p.html\nduration: 8\n`);
  const dir = dirname(file);
  writeFileSync(join(dir, "motion.js"), "window.renderAt = (t) => { document.body.style.opacity = String(t / 8); };\n");
  writeFileSync(join(dir, "p.html"), '<html><body><script defer src="./motion.js"></script></body></html>');
  assert.ok(!lint(file).some((f) => f.id === "still-scene"), "the local script moves the page");
  writeFileSync(join(dir, "p.html"), '<html><body><script src="https://example.org/motion.js"></script></body></html>');
  assert.ok(lint(file).some((f) => f.id === "still-scene"), "an unavailable remote script is not evidence of motion");
});

test("a Russian lint run reports findings and visual cliches in Russian", () => {
  const file = story(`# Ролик\nlang: ru\nformat: vertical\nlook: {"grain":0.1}\nvoice: {"engine":"stub","name":"silent","cps":15}\n\n`
    + `## p · page\npage: p.html\nduration: 8\n\n`
    + `Эта длинная реплика рассказывает о работе с интерфейсом достаточно подробно, чтобы не поместиться в две строки субтитров и задержать кадр.\n`);
  const findings = lint(file);
  assert.ok(findings.some((f) => f.id === "still-scene"));
  assert.ok(findings.some((f) => f.id === "overloaded-line"));
  for (const f of findings) assert.match(f.message, /[а-яё]/iu, `${f.id}: ${f.message}`);
  const signs = clicheSigns(file);
  assert.ok(signs.some((s) => s.id === "grain"));
  for (const sign of signs) assert.match(sign.message, /[а-яё]/iu, `${sign.id}: ${sign.message}`);
});

test("lint names a live take recorded in another theme than the scene that shows it, or without one", () => {
  const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;
  const file = story(`${HEAD}theme: midnight\n\n## v · video\nfile: take.mp4\ntheme: noir\nduration: 3\n`);
  const dir = dirname(file), marks = join(dir, "take.mp4.marks.json");
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "color=c=gray:s=320x180:r=10:d=3", "-c:v", "libx264", "-pix_fmt", "yuv420p", join(dir, "take.mp4")]);
  const takeTheme = (): string[] => lint(file).filter((f) => f.id === "take-theme").map((f) => f.message);
  writeFileSync(marks, JSON.stringify({ marks: {}, clicks: [] }));
  assert.match(takeTheme().join("\n"), /was recorded before takes stored their theme, .* noir; .* theme: "noir"/);
  // Дубль снят в теме ролика, а сцена носит свою: называется и та, и другая.
  writeFileSync(marks, JSON.stringify({ marks: {}, clicks: [], theme: themeFingerprint(THEMES.midnight!) }));
  assert.match(takeTheme().join("\n"), /recorded in midnight, the scene wears noir; record it again with theme: "noir"/);
  writeFileSync(marks, JSON.stringify({ marks: {}, clicks: [], theme: themeFingerprint(THEMES.noir!) }));
  assert.deepEqual(takeTheme(), []);
});

// Дубль чужим делает только то, что впечено в его пиксели: курсор, клик, клавиши, карточка.
// Прежде сверялась вся тема, и спрятанные в шапке субтитры объявляли чужими все дубли ролика.
test("lint compares only the tokens a take bakes in: subtitle tokens leave it alone, a cursor token does not", () => {
  const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;
  const at = (theme: string): string[] => {
    const file = story(`${HEAD}theme: ${theme}\n\n## v · video\nfile: take.mp4\nduration: 3\n`);
    const dir = dirname(file);
    execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "color=c=gray:s=320x180:r=10:d=3", "-c:v", "libx264", "-pix_fmt", "yuv420p", join(dir, "take.mp4")]);
    writeFileSync(join(dir, "take.mp4.marks.json"), JSON.stringify({ marks: {}, clicks: [], theme: themeFingerprint(THEMES.midnight!) }));
    return lint(file).filter((f) => f.id === "take-theme").map((f) => f.message);
  };
  assert.deepEqual(at('{"preset":"midnight","--sc-sub-ink":"#00000000","--sc-sub-bg":"#00000000"}'), []);
  assert.equal(at('{"preset":"midnight","--sc-cursor-fill":"#ff0000"}').length, 1);
  // Дубль, снятый до отпечатка по впекаемой части, сверяется по имени темы.
  const file = story(`${HEAD}theme: {"preset":"midnight","--sc-sub-ink":"#00000000"}\n\n## v · video\nfile: take.mp4\nduration: 3\n`);
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "color=c=gray:s=320x180:r=10:d=3", "-c:v", "libx264", "-pix_fmt", "yuv420p", join(dirname(file), "take.mp4")]);
  writeFileSync(join(dirname(file), "take.mp4.marks.json"), JSON.stringify({ marks: {}, clicks: [], theme: { id: wholeThemeFingerprint(THEMES.midnight!), name: "midnight" } }));
  assert.deepEqual(lint(file).filter((f) => f.id === "take-theme"), []);
});

test("the tokens a take bakes in are exactly those its capture layers draw with", async () => {
  const { BAKED_TOKENS } = await import("../../theme.js");
  const { readFileSync: rf } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const used = new Set<string>();
  for (const f of ["capture.js", "capture-overlay.js"]) {
    for (const m of rf(fileURLToPath(new URL(`../../${f}`, import.meta.url)), "utf8").matchAll(/var\((--[\w-]+)/g)) used.add(m[1]!);
  }
  assert.deepEqual([...used].sort(), [...BAKED_TOKENS].sort());
});
