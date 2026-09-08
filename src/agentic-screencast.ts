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

Use the stub voice for cost-free checks. See README.md for the scenario and extension contracts.`;
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
    console.log(HELP);
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
