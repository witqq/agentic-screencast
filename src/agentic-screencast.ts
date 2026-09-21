#!/usr/bin/env node
// Agentic Screencast — сборщик видео из сценария и воспроизводимых сцен.
// Единая точка входа. Правка сценария не требует правки кода.
//
// Вход один — файл сценария; слайды и сцены порождаются из него.
//
//   agentic-screencast build  [--source story.md] [--out video.mp4] [--only <сцена>]
//   agentic-screencast slides [--source story.md]     — только собрать слайды
//   agentic-screencast check  [--source story.md]     — признак кадра по готовым кадрам
//   agentic-screencast order  [--source story.md]     — порядок появления элементов
//   agentic-screencast script [--source story.md]     — печатает читаемый сценарий
//   agentic-screencast scenes [--source story.md]     — сцены источника как JSON
//   agentic-screencast verify [--scene scene.json]    — четыре проверки ядра рендера
//   agentic-screencast voices [--voice-json '{…}']    — голоса движка
//   agentic-screencast voice-check [<программа>]      — движок голоса против договора
//   agentic-screencast provider-check <программа>     — поставщик материала против договора
//   agentic-screencast schema                         — описание входного формата
//   agentic-screencast record [--source story.md]     — интерфейс записи озвучки
//   agentic-screencast snapshot screens.json out-dir  — снимки интерфейса в подложки
//   agentic-screencast paths                          — куда смотрит при этом окружении
//
// Флаги --pitch и --deck принимают готовые данные в обход сценария. Они для
// чужих наборов данных; для своего ролика источник один, иначе описание
// разъедется на две редакции — ради устранения чего вход и сведён к одной.
//
// Пути к тяжёлому (окружение синтеза, модель голоса, кэш, вывод) задаются
// переменными окружения, поэтому инструмент запускается в изоляции:
//   AGENTIC_SCREENCAST_HOME — каталог кэша и вывода (по умолчанию ./.agentic-screencast)
//
// Голос порождает движок — обычная программа, названная данными голоса.
// Свои переменные окружения объявляет он сам; инструмент о них не знает.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { parseSource, toScript, SLIDES_DIR } from "./source.js";
import { generate as generateSlides } from "./generate.js";
import type { Source } from "./source.js";
import { engineFor } from "./voice/index.js";
import { builtinPaths } from "./voice/builtin.js";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { msg } from "./msg.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const cmd = process.argv[2];
const rest = process.argv.slice(3);
const VERSION = String((JSON.parse(readFileSync(resolve(HERE, "..", "package.json"), "utf8")) as {
  version: string;
}).version);
const HELP = `Agentic Screencast ${VERSION}

Build reproducible videos from one declarative scenario.

Usage:
  agentic-screencast build [--source story.md] [--out video.mp4] [--only scene]
  agentic-screencast record [--source story.md]
  agentic-screencast check|order|script|scenes [--source story.md]
  agentic-screencast schema [--source story.md]
  agentic-screencast snapshot <config.json> [output-directory]
  agentic-screencast verify [--scene scene.json]
  agentic-screencast voices [--voice-json '{...}']
  agentic-screencast voice-check [command]
  agentic-screencast provider-check <command>
  agentic-screencast paths

Guides: agentic-screencast help video | help capture | help overlay
        agentic-screencast help themes | help voice
Use the stub voice for cost-free checks. See README.md for the scenario and extension contracts.`;
const VIDEO_HELP = `Turn a product, prototype, idea, or finding into a visual story

Before you build, ask the viewer's owner what you cannot infer. Offer the
options; do not silently pick one: theme (agentic-screencast help themes),
length, narration mode (help voice), language, pace, and how deep the demo
goes. Skip a question only when the request or the repository already
answers it.

Start with the viewer's question, not a list of features. Write a short arc:
orientation → a meaningful action or claim → the visible evidence → why it
matters. Every UI action shown needs a nearby explanation of what changed
and why; a camera move cannot substitute for that explanation.

Write the narration as ONE continuous text first, in whole sentences that
pick up from each other, and only then cut it into shots. Telegraphic
labels ("Trajectory", "Entry") read as a slide deck, not as a film. Keep
one text layer on screen at a time: a bottom caption during motion, a card
only during a held frame.

Nothing in the frame may sit still. Slides carry an ambient layer of their
own, a held card keeps breathing, and a static diagram that stops moving
turns the film back into a presentation. Where motion is faster than the
eye, slow the stretch down (speed on a video scene) instead of asking the
viewer to rewind.

1. Inspect the source and distinguish real footage from a mockup. Prepare
   authentication outside capture. Use Playwright locator actions for real
   clicks, typing and scrubbing; do not reconstruct them with overlay.pointer.
   Label a prototype or untested result in the frame itself.
2. Open with a silent slides.chapter (title, one sentence, duration). Between
   distinct ideas, use another short chapter instead of a hard unexplained
   cut. Avoid a stack of static four-box slides.
3. For a dense interface, hold a genuine video frame with freezeAt and add
   overlay.camera. Move in, highlight one region, explain it with a typed
   near-focus card, hold for reading, then return to the overview. On a
   saved page use a CSS target instead of normalized frame coordinates.
   A silent saved HTML page is a page scene with page and duration fields.
4. Draft silently with voice: {"engine":"stub","name":"silent"}; narration
   can use prose beats and an authorized voice. Check each action/result
   pair and give longer text more time, never rely on a fast transition to
   carry missing context.
5. Check inputs: agentic-screencast scenes --source story.md
   Preview: agentic-screencast build --source story.md --only scene-id --out preview.mp4
   Build:   agentic-screencast build --source story.md --out video.mp4
   Decode the MP4 and inspect the introduction, each action/result and each
   transition at normal speed. Check readable text, factual claims and secrets.

See: agentic-screencast help capture | help overlay
Examples: example/live-capture.mjs, example/kinetic-video.md and
example/idea-video.md (a self-contained prototype page).`;
const CAPTURE_HELP = `Record real browser actions without timing or frame coordinates

import { recordTake } from "agentic-screencast/capture";

await recordTake({
  output: "captures/run.webm",
  prepare: async (page, context) => {
    // Authenticate here, before the recording starts, if needed.
    await page.goto("https://your-app.example/run");
  },
}, async (take) => {
  await take.withFocusCard(take.page.getByRole("tab", { name: "Graph" }),
    { title: "The route is visible here", body: "This view reveals the links.",
      reveal: "type", motion: "glide" },
    async () => take.click(take.page.getByRole("tab", { name: "Graph" })));
  await take.type(take.page.getByLabel("Search"), "example");
});

take.click/hover/type/press/drag/range work on Playwright locators. They
auto-wait, scroll, move the visible cursor and pace the recording. A click
ripple is drawn by the actual pointerdown event, so it cannot lead the UI.
withFocusCard(locator, card, action) places the explanation next to the
control while the real action runs; no authored card coordinates are needed.
Cards can use reveal:"type" and motion:"rise"|"pop"|"glide".
Use { until: locator } when an action reveals an asynchronous result.
take.range(rangeLocator, 0.75) means 75% of its own track, not screen pixels.
take.type refuses password fields: log in during prepare, outside capture.

The output is WebM. Use it as file: captures/run.webm in a video scene;
then build the scenario to MP4. A runnable local example is packaged at
example/live-capture.mjs. capturePage(page, { output }) also attaches to an
existing Playwright page without owning its browser.`;
const OVERLAY_HELP = `Timed overlays and tutorial camera for page and video scenes

Add one JSON object on a single scenario line:

## demo · video
file: captures/real-run.mp4
overlay: {"pointer":[{"at":0.2,"x":0.2,"y":0.5},{"at":1.5,"x":0.7,"y":0.5,"click":true}],"cards":[{"at":0.4,"title":"Follow the real run","body":"One idea at a time.","position":"bottom-right"}]}

Pointer points are ordered by at (seconds); x/y are fractions of the final
frame from 0 to 1. The pointer eases between points. click:true draws a
0.65-second ripple at that point; it does not click the underlying UI.
For real UI actions, use agentic-screencast help capture instead. A manual
pointer on imported footage is only a graphic annotation, not synchronized
interaction.

Cards support position: corners, center, or near-focus; reveal:"type" and
motion:"rise"|"pop"|"glide". enter/exit are seconds; hold is optional and
its minimum grows with text and typing time. Leave 0.35 seconds between cards.

For a held explanation, freezeAt selects a real frame of a video clip:

## detail · video
file: captures/real-run.mp4
freezeAt: 5
overlay: {"camera":[{"at":0.8,"move":1.1,"hold":3,"return":1.1,"area":[0.3,0.2,0.35,0.3],"scale":1.7}],"cards":[{"at":1.5,"title":"The result is here","body":"This changed because of the action.","position":"near-focus","reveal":"type"}]}

camera.area is [left, top, width, height] in 0–1 frame fractions. For a
saved page scene, camera.target can name a CSS selector instead. Camera
moves are time-derived, deterministic under seek, and must not overlap.
Show the full interface before and after a focus shot. Keep a near-focus
card outside the highlighted control; inspect the composed MP4 at normal
speed, not just a still frame.

Slow motion is a separate field of a video scene, because it retimes the
clip itself rather than drawing over it:

## landing · video
file: captures/real-run.mp4
speed: [{"from":4.2,"to":6.0,"rate":0.5}]

from/to are seconds of the SOURCE clip, rate is playback speed: 0.5 is half
speed, 2 is double. Spans are ordered, must not overlap, must stay inside
the clip, and rate is limited to 0.2–4 — beyond that a shot stops reading
as motion. The scene grows by exactly the time the stretch gains, and the
retimed clip is cached, so an unchanged scene is not re-encoded.`;
const THEMES_HELP = `Named looks: one word in the header styles the whole film

# My film
theme: calm-paper

A theme sets the palette, the type pairing, backgrounds, card and caption
shapes for slides AND for the overlay drawn on captured footage, so the
film cannot end up with a caption from one palette and a card from another.
Shipped themes:

  midnight     deep blue-grey, cool blue and teal accents; the default look
  calm-paper   warm off-white paper, serif display, one clay accent
  synthwave    violet night, neon magenta and cyan, light text on dark
  noir         near-black, cold grey text, one restrained amber accent

Point edits stay possible: theme: {"preset":"noir","--acc":"#7aa2ff"} keeps
the preset and replaces one variable. A bare object without "preset" is the
old behaviour — your own variables and nothing else. An unknown name is a
parse error listing the available ones, not a silent fallback.

Every theme fills the same contract of variables, so a new scene kind or a
new overlay part never picks a stray colour from a rule default. Ask the
owner which look they want before building; do not assume the default.`;
const VOICE_HELP = `Narration modes: synthesis, a recorded human, or silence

voice: {"engine":"speechkit","name":"kuznetsov","speed":1.2}

Shipped engines:

  stub       silence of the right length; free, for drafts and checks
  speechkit  Yandex SpeechKit; needs credentials in the environment
  say        the macOS built-in synthesizer, offline
  piper      a local neural synthesizer, offline
  recorded   no synthesis: it finds the take a human recorded for the beat

Any other name is a command implementing the engine contract, so a project
can bring its own synthesizer without changing the tool.

A silent film is a legitimate mode, not a missing feature: leave the scenes
without prose, give each one duration, and the film carries its meaning in
captions and cards. agentic-screencast record opens the recording UI where
a person reads the beats one by one; recorded then picks those takes up.

Each paragraph of prose is one beat: it has its own take, its own length and
its own cache key, so rewriting one sentence re-renders one beat. A line
starting with ~ gives the spoken variant of that beat, while the screen keeps
the written one. Reading rules (pronounce) and lang belong to the film.

Ask which mode the owner wants — voiced or silent, which engine and voice,
which language and pace — unless they already said so. voices lists what an
engine offers; voice-check exercises an external one.`;

/** Значение флага; без умолчания может отсутствовать. */
function arg(k: string): string | undefined;
function arg(k: string, d: string): string;
function arg(k: string, d?: string): string | undefined {
  const i = rest.indexOf(`--${k}`);
  return i >= 0 ? rest[i + 1] : d;
}

const run = (file: string, args: string[]): never => {
  const r = spawnSync("node", [resolve(HERE, file), ...args], { stdio: "inherit" });
  process.exit(r.status ?? 1);
};

const HOME = resolve(process.env.AGENTIC_SCREENCAST_HOME ?? resolve(process.cwd(), ".agentic-screencast"));

/** Источник → порождённые слайды и сцены. Ничего рукописного между ними. */
/** Разбор источника с внятной ошибкой: стек здесь не помогает никому. */
function readSource(path: string): Source {
  try { return parseSource(path); }
  catch (e) {
    const err = e as { sourceError?: boolean; code?: string; message?: string };
    if (err.sourceError || err.code === "ENOENT") {
      console.error(err.sourceError
        ? msg("source.error", { path, why: String(err.message) })
        : msg("source.notFound", { path }));
      process.exit(2);
    }
    throw e;
  }
}

/** Готовые данные в обход сценария: внятная ошибка вместо стека. */
function requireFile(path: string, what: string): string {
  if (existsSync(path)) return path;
  // Подсказка называет источник только там, где подкоманда его принимает:
  // у `verify` входом служит сцена, и совет «--source» увёл бы читателя.
  const hint = ["build", "check", "script", "slides"].includes(cmd)
    ? `Вход инструмента — файл сценария: agentic-screencast ${cmd} --source story.md`
    : `Укажите существующий файл: agentic-screencast ${cmd} --scene scene.example.json`;
  console.error(`${what} не найден: ${path}\n${hint}`);
  process.exit(2);
}

/**
 * Источник → слайды и данные сборки. Само порождение живёт в отдельном
 * модуле: им пользуется и сервер интерфейса записи, и второй способ
 * породить слайды разошёлся бы с первым молча.
 */
function generate(sourcePath: string): { src: Source; pitchFile: string; slidesDir: string } {
  // Разбор идёт через `readSource`: он превращает ошибку сценария
  // во внятный отказ. Порождение — общее с сервером интерфейса записи.
  try {
    return generateSlides(readSource(sourcePath));
  } catch (e) {
    console.error(String((e as Error).message));
    process.exit(1);
  }
}

switch (cmd) {
  case undefined:
  case "help":
  case "--help":
  case "-h": {
    const topic = cmd === "help" ? rest[0] : undefined;
    if (topic === "video") console.log(VIDEO_HELP);
    else if (topic === "capture") console.log(CAPTURE_HELP);
    else if (topic === "overlay") console.log(OVERLAY_HELP);
    else if (topic === "themes") console.log(THEMES_HELP);
    else if (topic === "voice") console.log(VOICE_HELP);
    else if (!topic) console.log(HELP);
    else { console.error(`Unknown help topic: ${topic}\n\n${HELP}`); process.exit(2); }
    break;
  }
  case "version":
  case "--version":
  case "-v": {
    console.log(VERSION);
    break;
  }
  case "script": {
    // Читаемый сценарий ПЕЧАТАЕТСЯ, а не хранится файлом: копия ушла бы
    // жить своей жизнью, ради устранения чего всё и делалось.
    console.log(toScript(readSource(arg("source", "story.md"))));
    break;
  }
  case "scenes": {
    // Сцены источника машине — вход для проверки по `agentic-screencast schema`.
    // Без этой команды описание формата было бы нечем воспользоваться:
    // сценарий это текст, схема проверяет JSON, и подать ей на вход было
    // бы нечего. Печатается ровно то, что вернул разбор, без второй формы.
    console.log(JSON.stringify(readSource(arg("source", "story.md")).scenes, null, 1));
    break;
  }
  case "build": {
    // Источник — вход по умолчанию; готовые данные берутся, только если
    // о них попросили явно.
    const source = arg("pitch") || arg("deck") ? arg("source") : arg("source", "story.md");
    if (source) {
      const { src, pitchFile } = generate(source);
      const voiceJson = arg("voice-json") ?? JSON.stringify(src.voice ?? {});
      run("build.js", ["--pitch", pitchFile, "--out", arg("out", `${HOME}/pitch.mp4`),
        ...(voiceJson && voiceJson !== "{}" ? ["--voice-json", voiceJson] : []),
        ...(arg("only") ? ["--only", arg("only")!] : []),
        ...(rest.includes("--keys-only") ? ["--keys-only"] : [])]);
      break;
    }
    const deck = arg("deck");
    if (deck) {
      requireFile(deck, "файл слайдов");
      const r = spawnSync("node", [resolve(HERE, "slides.js"), deck,
        resolve(dirname(deck), SLIDES_DIR)], { stdio: "inherit" });
      if (r.status) process.exit(r.status);
    }
    // Голос задаётся либо парой флагов, либо объектом целиком: у провайдера
    // могут быть свои параметры (темп у SpeechKit), и они не должны теряться.
    const voiceJson = arg("voice-json");
    run("build.js", ["--pitch", requireFile(arg("pitch", ""), "файл сцен"),
      "--out", arg("out", `${HOME}/pitch.mp4`),
      ...(voiceJson ? ["--voice-json", voiceJson]
        : ["--voice", arg("voice", "kuznetsov"), "--engine", arg("engine", "speechkit")]),
      ...(rest.includes("--keys-only") ? ["--keys-only"] : [])]);
    break;
  }
  case "slides": {
    // Третий потребитель тоже ходит от источника: без этого слайды остались бы
    // единственным, что нельзя пересобрать из сценария одной командой.
    const source = arg("deck") ? undefined : arg("source", "story.md");
    if (source) { const { slidesDir } = generate(source); console.log(slidesDir); break; }
    const deck = requireFile(arg("deck") ?? "", "файл слайдов");
    run("slides.js", [deck, arg("out", resolve(dirname(deck), SLIDES_DIR))]);
    break;
  }
  case "order": {
    // Порядок сборки кадра: признак кадра меряет устоявшееся состояние
    // и к этому дефекту слеп по устройству.
    const source = arg("pitch") ? undefined : arg("source", "story.md");
    const pitchFile = source ? generate(source).pitchFile
      : requireFile(arg("pitch") ?? "", "файл сцен");
    run("order-check.js", [pitchFile]);
    break;
  }
  case "check": {
    const source = arg("pitch") ? undefined : arg("source", "story.md");
    const pitchFile = source ? generate(source).pitchFile
      : requireFile(arg("pitch") ?? "", "файл сцен");
    run("slide-check.js", [pitchFile, arg("at", "0.95")]);
    break;
  }
  case "verify": {
    // Порядок важен: verify-render.js ждёт сцену, затем моменты, и только
    // потом флаги. Иначе флаг занимает позицию списка моментов и роняет разбор.
    // Образец сцены и каталог примера лежат в КОРНЕ продукта, а не рядом
    // с собранным кодом: они входят в поставку как данные, а не как модули.
    const scene = requireFile(arg("scene", resolve(HERE, "..", "scene.example.json")), "файл сцены");
    // Подложка сцены-образца порождаема, и в свежем клоне её ещё нет:
    // проверка ядра рендера падала сразу после клонирования, а в рабочем
    // дереве проходила на слайдах, оставшихся от прошлых запусков.
    // Порождаем молча — источник тут же, рядом.
    const page = resolve(HERE, "..", (JSON.parse(readFileSync(scene, "utf8")) as { page?: string }).page ?? "");
    const exampleSource = resolve(HERE, "..", "example/story.md");
    if (!existsSync(page) && existsSync(exampleSource)) generate(exampleSource);
    const probes = arg("probes", "0.8,1.8,2.6,3.4");
    const minD = arg("min-distinct", "20");
    run("verify-render.js", [scene, probes, "--min-distinct", minD]);
    break;
  }
  case "paths": {
    // Куда инструмент смотрит при нынешнем окружении. Печатает то, что
    // вычислено, а не пересчитывает: иначе в продукте появилось бы две
    // реализации разрешения пути и они разошлись бы молча.
    //
    // Сюда же попадают ресурсы, которые разрешают поставляемые движки
    // голоса. Спрашивать их важно: именно умолчание движка однажды и вело
    // за корень продукта, в каталог с внутренним именем чужого проекта.
    console.log(JSON.stringify({ home: HOME, cache: `${HOME}/cache`, ...builtinPaths() }, null, 1));
    break;
  }
  case "voice-check": {
    run("voice-check.js", rest);
    break;
  }
  case "provider-check": {
    // Договор о поставщике материала — внешний контракт, и утверждение
    // «моя программа ему соответствует» нечем подтвердить, кроме как
    // проверив её саму.
    run("provider-check.js", rest);
    break;
  }
  case "record": {
    // Интерфейс записи: страница поднимается своим сервером, потому что
    // микрофон браузер даёт только в защищённом контексте, а `file://`
    // туда не входит.
    // Запуск НЕ блокирующий, в отличие от прочих подкоманд: сервер живёт
    // до Ctrl+C, а при spawnSync родитель не может обработать сигнал —
    // он умирает первым и оставляет сервер сиротой, с занятым портом
    // и неубранным каталогом картинок. Сигнал передаётся серверу, и код
    // выхода — его.
    const server = spawn("node", [resolve(HERE, "record.js"), ...rest], { stdio: "inherit" });
    for (const signal of ["SIGINT", "SIGTERM"] as const) {
      process.on(signal, () => { server.kill(signal); });
    }
    server.on("exit", (code, signal) => process.exit(signal ? 0 : code ?? 0));
    break;
  }
  case "snapshot": {
    // Снятие страниц приложения в подложки. Отдельной командой, а не
    // отдельным файлом: у инструмента одна точка входа, и документировать
    // вторую значило бы обещать читателю два разных способа запуска.
    run("snapshot.js", rest);
    break;
  }
  case "schema": {
    // Машинно читаемое описание входного формата: чужой агент проверяет
    // свой сценарий до сборки, не читая разборщик.
    //
    // Сценарий здесь НЕОБЯЗАТЕЛЕН, но полезен: посторонние поставщики
    // объявлены в его шапке, и без него схема опишет только поставляемых.
    const source = arg("source");
    const declared = source ? JSON.stringify(readSource(source).providers ?? {}) : "{}";
    run("schema.js", [declared]);
    break;
  }
  case "voices": {
    // Список голосов спрашивается у движка, названного данными голоса.
    // Поставляемый отвечает сам, посторонний — своей подкомандой.
    const voiceJson = arg("voice-json");
    const voice = voiceJson ? JSON.parse(voiceJson) : { engine: arg("engine", "speechkit") };
    try {
      console.log(JSON.stringify(await engineFor(voice).voices(), null, 1));
    } catch (e) {
      console.error(String((e as Error).message));
      process.exit(1);
    }
    break;
  }
  default:
    console.error(`Unknown command: ${cmd}\n\n${HELP}`);
    process.exit(1);
}
