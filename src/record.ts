#!/usr/bin/env node
// Локальный сервер интерфейса записи.
//
// Почему сервер, а не файл на диске: браузер даёт микрофон только
// в защищённом контексте. `http://127.0.0.1` входит туда исключением,
// `file://` — нет, и там `navigator.mediaDevices` попросту отсутствует.
// Проверено запуском: со страницы, открытой файлом, объекта нет вовсе.
// Поэтому страницу поднимает сам инструмент, и слушает он только петлю:
// наружу интерфейс записи не смотрит.
//
// Хранилище записей у сервера и у движка записанного голоса ОДНО, и адрес
// файла считается тем же кодом (`voice/recorded.ts`). Второе правило
// адресации значило бы, что человек записал реплику, а сборка её
// не нашла, — и разошлись бы они молча.
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { renderScene } from "./render.js";
import { generate } from "./generate.js";
import { parseSource, specOf, type RawScene, type Source } from "./source.js";
import { speechFor } from "./speech.js";
import { durationOf, ff } from "./voice/audio.js";
import { recordingPath, slotFor, storeDir } from "./voice/recorded.js";
import type { VoiceData } from "./voice/types.js";
import { msg, useLang } from "./msg.js";

/** Что страница знает о такте речи. */
export interface BeatCard {
  /** номер такта в сцене, начиная с единицы */
  n: number;
  /** что человек читает вслух */
  text: string;
  /** имя файла записи без расширения — адрес в хранилище */
  slot: string;
  /** записан ли такт */
  recorded: boolean;
  /** длительность записи в секундах; `null`, пока записи нет */
  duration: number | null;
  /** ориентир: сколько это примерно займёт, если записи ещё нет */
  estimate: number;
}

/** Что страница знает о сцене. */
export interface SceneCard {
  id: string;
  kind: string;
  /** такты речи по порядку: записывается каждый отдельно */
  beats: BeatCard[];
  /** вся речь сцены одной строкой */
  caption: string;
  /** сколько тактов уже записано */
  done: number;
  /** длительность сцены, когда записаны ВСЕ такты; иначе `null` */
  duration: number | null;
  /** ориентир на всю сцену: записанное настоящей длиной, прочее оценкой */
  estimate: number;
}

/**
 * Ориентир темпа до записи. Это ОЦЕНКА, и называется она отдельно
 * от `duration`: настоящую длительность даёт только звук, и подменять
 * одно другим значило бы показывать человеку число, которого в сборке
 * не будет. Четырнадцать знаков в секунду — спокойное чтение вслух.
 */
export const CPS = 14;
export const estimateOf = (text: string): number =>
  Math.round((text.length / CPS) * 10) / 10;

/** Сцены источника в том виде, в каком их показывает страница. */
export function cardsOf(src: Source, voice: VoiceData): SceneCard[] {
  // Правила те же, что у сборки: ролик их назвал, данные голоса могут
  // перебить. Разойдись эти два места — человек записал бы такт, а сборка
  // искала бы его под другим слепком.
  const rules = voice.rules ?? src.pronounce;
  return src.scenes.map((s: RawScene) => {
    // Адресуется то же, что озвучивает сборка: строка синтеза ТАКТА,
    // а не речь сцены целиком. При пустых правилах чтения строка совпадает
    // с текстом такта, и движок записанного голоса правила отвергает —
    // но брать текст надо там же, где его берёт сборка, иначе адреса
    // разойдутся на первом же сценарии с правилами.
    const beats: BeatCard[] = s.beats.map((b, i) => {
      const speech = b.speech ?? speechFor(rules, b.text, src.dir);
      const file = recordingPath(speech, voice);
      const has = existsSync(file);
      return {
        n: i + 1,
        text: speech,
        slot: slotFor(speech),
        recorded: has,
        duration: has ? durationOf(file) : null,
        estimate: estimateOf(speech),
      };
    });
    const done = beats.filter((b) => b.recorded).length;
    return {
      id: s.id,
      kind: s.kind,
      beats,
      caption: beats.map((b) => b.text).join(" "),
      done,
      // Длина сцены известна, только когда записаны ВСЕ такты: сумма
      // с оценкой вместо недостающего была бы числом, которого в сборке
      // не будет, а страница выдавала бы его за настоящее.
      duration: done === beats.length
        ? Math.round(beats.reduce((n, b) => n + (b.duration ?? 0), 0) * 10) / 10
        : null,
      estimate: Math.round(beats.reduce((n, b) => n + (b.duration ?? b.estimate), 0) * 10) / 10,
    };
  });
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
};

const json = (res: ServerResponse, code: number, body: unknown): void => {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
};

const body = async (req: IncomingMessage): Promise<Buffer> => {
  const parts: Buffer[] = [];
  for await (const c of req) parts.push(c as Buffer);
  return Buffer.concat(parts);
};

export interface ServerOpts {
  source: string;
  voice: VoiceData;
  /** каталог собранной страницы; без него сервер отдаёт только API */
  ui?: string;
  port?: number;
}

/**
 * Поднимает сервер и возвращает адрес. Порт по умолчанию нулевой —
 * система выдаёт свободный: два запущенных интерфейса не должны драться
 * за один номер, а человеку адрес всё равно печатается.
 */
export interface Server {
  /** Адрес страницы для человека. */
  url: string;
  /** Адрес, на котором сервер ДЕЙСТВИТЕЛЬНО слушает: его называет сокет,
   *  а не строка выше. Наружу отдаётся потому, что по `url` отличить
   *  петлю от всех интерфейсов нельзя — номер порта в обоих случаях тот же. */
  address: string;
  close: () => Promise<void>;
}

export async function serve(opts: ServerOpts): Promise<Server> {
  const src = parseSource(opts.source);
  useLang(src.lang);
  const { slidesDir, pitchFile } = generate(src);
  const store = storeDir(opts.voice);
  mkdirSync(store, { recursive: true });

  // Картинки сцен рисуются по требованию и складываются рядом с кэшем:
  // рисовать все двадцать при старте значило бы держать человека минуту
  // перед пустым экраном, а рисовать заново на каждый показ — секунду
  // на каждое переключение сцены.
  // Каталог у каждого поднятого сервера СВОЙ: общий на процесс делился бы
  // между двумя интерфейсами, и второй показывал бы картинки первого —
  // при том, что сценарий у него может быть другой.
  const pics = mkdtempSync(join(tmpdir(), "slidecast-pictures-"));

  async function pictureOf(id: string): Promise<Buffer | null> {
    const cached = join(pics, `${id}.png`);
    if (existsSync(cached)) return readFileSync(cached);
    const scene = src.scenes.find((s) => s.id === id);
    if (!scene) return null;
    // Кадр берётся ТЕМ ЖЕ ядром, что рисует ролик, и на шестой секунде
    // сцены. Момент здесь в СЕКУНДАХ, а не в долях сцены, и это важно:
    // элементы слайда появляются по расписанию, тоже в секундах
    // (последняя колонка сравнения — на первой), и кадр, снятый раньше,
    // показал бы полуготовый слайд. Шесть секунд заведомо больше любого
    // расписания появлений.
    // Чем сцена нарисована, говорит поставщик: готовый файл назван полем,
    // порождённая страница лежит в каталоге порождённого. Имени вида
    // сервер не знает — это знание уехало к поставщикам.
    const spec = specOf(scene, src.providers ?? {});
    const page = spec.fileField
      ? String(scene.fields[spec.fileField] ?? "")
      : `${slidesDir}/${scene.id}.html`;
    const { shots } = await renderScene(
      { page, duration: 10, offline: spec.offline ?? true, __src: src.dir, theme: src.theme,
        effects: { zoom: { from: 0, to: 0, scale: 1 }, cursor: { hidden: true, from: 0, to: 0.01, start: [-500, -500] },
          spot: { from: 9999 }, caption: { from: 9999 }, fade: { in: 0, out: 0 } },
        ...(scene.kind === "screen" ? { target: scene.fields.target, mustRead: scene.fields.mustRead } : {}) },
      // Кадр снимается В ПОЛНЫЙ размер ролика и уменьшается множителем,
      // а не окном поменьше: страница свёрстана под кадр и в узком окне
      // не сжимается, а обрезается — содержимое уезжает за нижний край.
      { at: 6, width: Number(src.frame?.width ?? 1920),
        height: Number(src.frame?.height ?? 1080), scale: 0.5 },
    );
    const buf = shots[0]!.buf;
    writeFileSync(cached, buf);
    return buf;
  }

  const srv = createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const path = url.pathname;

      if (path === "/api/scenes") {
        // Язык — от РОЛИКА: страница подписана тем же языком, на котором
        // написан сценарий, который человек будет читать вслух.
        return json(res, 200, { scenes: cardsOf(src, opts.voice), store, lang: src.lang ?? "en" });
      }

      const pic = path.match(/^\/api\/picture\/([\w.-]+)$/);
      if (pic) {
        const buf = await pictureOf(pic[1]!);
        if (!buf) return json(res, 404, { error: msg("record.noScene", { id: pic[1]! }) });
        res.writeHead(200, { "content-type": "image/png" });
        return res.end(buf);
      }

      // Предпросмотр: собрать ОДНУ сцену и отдать готовый файл. Платного
      // синтеза здесь не бывает — озвучка берётся из записей человека,
      // а сцены без записи собирать нечем, и сборка честно откажет.
      const prev = path.match(/^\/api\/preview\/([\w.-]+)$/);
      if (prev) {
        const id = prev[1]!;
        const file = join(pics, `preview-${id}.mp4`);
        const built = spawnSync(process.execPath,
          [resolve(fileURLToPath(new URL(".", import.meta.url)), "build.js"),
            "--pitch", pitchFile, "--out", file, "--only", id,
            "--voice-json", JSON.stringify(opts.voice)],
          { encoding: "utf8" });
        if (built.status !== 0) {
          const said = ((built.stderr || "") + (built.stdout || "")).trim().split("\n");
          return json(res, 400, { error: said[said.length - 1] ?? msg("record.noScene", { id }) });
        }
        res.writeHead(200, { "content-type": "video/mp4", "cache-control": "no-store" });
        return res.end(readFileSync(file));
      }

      const rec = path.match(/^\/api\/recording\/([0-9a-f]{32})$/);
      if (rec) {
        const slot = rec[1]!;
        const file = join(store, `${slot}.wav`);
        if (req.method === "PUT") {
          // Браузер отдаёт сжатый поток; в хранилище кладётся то, чего
          // ждёт договор о движке, — WAV 48 кГц моно. Приводит формат
          // сервер, а не движок: хранилище обязано быть источником,
          // а не полуфабрикатом, и человек, заглянувший в каталог,
          // должен найти там звук, а не контейнер браузера.
          const raw = join(pics, `${slot}.upload`);
          writeFileSync(raw, await body(req));
          try {
            ff(["-i", raw, "-ar", "48000", "-ac", "1", file]);
          } catch (e) {
            const said = String((e as { stderr?: Buffer }).stderr ?? "").trim().split("\n").pop();
            return json(res, 400, { error: msg("record.unreadable", { why: said ?? "?" }) });
          } finally {
            rmSync(raw, { force: true });
          }
          const duration = durationOf(file);
          if (!Number.isFinite(duration) || duration <= 0) {
            rmSync(file, { force: true });
            return json(res, 400, { error: msg("record.noDuration") });
          }
          return json(res, 200, { slot, duration });
        }
        if (req.method === "DELETE") {
          rmSync(file, { force: true });
          return json(res, 200, { slot, recorded: false });
        }
        if (!existsSync(file)) return json(res, 404, { error: msg("record.noRecording") });
        res.writeHead(200, { "content-type": "audio/wav" });
        return res.end(readFileSync(file));
      }

      // Страница и её файлы. Без собранной страницы сервер честно говорит,
      // что показывать нечего: молчаливая пустая страница выглядела бы
      // как поломка интерфейса, а не как несобранный он.
      if (!opts.ui || !existsSync(opts.ui)) {
        res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        return res.end(msg("record.notBuilt"));
      }
      const file = resolve(opts.ui, path === "/" ? "index.html" : path.slice(1));
      if (!file.startsWith(resolve(opts.ui)) || !existsSync(file)) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        return res.end(msg("record.noFile"));
      }
      res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
      return res.end(readFileSync(file));
    })().catch((e: Error) => {
      json(res, 500, { error: e.message });
    });
  });

  await new Promise<void>((ok) => srv.listen(opts.port ?? 0, "127.0.0.1", ok));
  const addr = srv.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  const address = typeof addr === "object" && addr ? addr.address : "";
  return {
    url: `http://127.0.0.1:${port}/`,
    address,
    close: () => new Promise<void>((ok) => { rmSync(pics, { recursive: true, force: true }); srv.close(() => ok()); }),
  };
}

// Сравниваются РАЗРЕШЁННЫЕ ПУТИ, а не URL со склейкой пути. Склейка
// ломается дважды: файловый URL процентно кодирован (путь с пробелом или
// не-латиницей не совпадёт никогда), а URL модуля уже разрешён по ссылкам,
// тогда как argv[1] — нет (на macOS /tmp это ссылка на /private/tmp,
// а точка входа пакета — ссылка в node_modules/.bin). В обоих случаях
// команда печатает пустоту, выходит с кодом 0 и сервера не поднимает.
const invokedDirectly = Boolean(process.argv[1])
  && realpathSync(process.argv[1]!) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const arg = (k: string, d?: string): string | undefined => {
    const i = process.argv.indexOf(`--${k}`);
    return i > 0 ? process.argv[i + 1] : d;
  };
  const voiceJson = arg("voice-json");
  const source = arg("source", "story.md")!;
  const src = parseSource(source);
  // Данные голоса берутся из сценария, если их не назвали флагом: каталог
  // записей обязан совпасть с тем, из которого потом читает сборка.
  const voice: VoiceData = voiceJson
    ? (JSON.parse(voiceJson) as VoiceData)
    : { ...src.voice, engine: "recorded" };
  // Свойство pathname файлового URL остаётся кодированным: каталог
  // с пробелом превратился бы в путь с «%20», и страница не нашлась бы.
  const ui = resolve(fileURLToPath(new URL(".", import.meta.url)), "record-ui");
  const server = await serve({
    source, voice, ui,
    ...(arg("port") ? { port: Number(arg("port")) } : {}),
  });
  const { url } = server;
  // Интерфейс останавливают Ctrl+C, и без этого временный каталог картинок
  // оставался бы в системном temp после каждого запуска: закрытия сервера
  // никто не вызывал.
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => { void server.close().then(() => process.exit(0)); });
  }
  console.log(`интерфейс записи: ${url}`);
  console.log(`хранилище записей: ${storeDir(voice)}`);
  console.log("остановить: Ctrl+C");
}
