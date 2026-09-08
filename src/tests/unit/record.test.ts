// Интерфейс записи: то, что можно спросить без браузера.
//
// Сквозной проход — человек нажал кнопку, из этого получился ролик —
// живёт отдельно (`tests/record-e2e.ts`) и требует поднятого браузера.
// Здесь то, чего сквозной проход не различает: разбор причин отказа
// микрофона (в одном прогоне видно ровно одну причину) и договор сервера
// с страницей.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { request } from "node:http";
import { cpSync, existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { micReason } from "../../mic-reason.js";
import { cardsOf, estimateOf, serve } from "../../record.js";
import { FFMPEG, FFPROBE } from "../../voice/audio.js";
import { parseSource } from "../../source.js";
import { slotFor } from "../../voice/recorded.js";

test("причина отказа микрофона называется своя для каждого состояния", () => {
  // Пять состояний требуют пяти разных действий читателя. Одно общее
  // «не получилось» не говорит ему ничего, а в живом прогоне видно
  // ровно одно состояние — поэтому спрашиваем прямо.
  assert.match(micReason(new Error("x"), false), /не с localhost/);
  assert.match(micReason({ name: "NotAllowedError" }, true), /запрещён/);
  assert.match(micReason({ name: "NotFoundError" }, true), /не найден/);
  assert.match(micReason({ name: "NotReadableError" }, true), /не запустился/);
  assert.match(micReason({ name: "NotSupportedError" }, true), /отказал в записи/);
  // Незнакомое состояние не проглатывается: имя видно читателю.
  assert.match(micReason({ name: "OverconstrainedError", message: "нет" }, true),
    /OverconstrainedError/);
});

test("незащищённый контекст объясняется раньше имени ошибки", () => {
  // Иначе читатель, открывший страницу файлом, чинил бы разрешения
  // браузера, тогда как чинить надо адрес.
  assert.match(micReason({ name: "NotAllowedError" }, false), /не с localhost/);
});

test("ориентир длины растёт с длиной реплики и не выдаётся за длительность", () => {
  const short = estimateOf("Коротко.");
  const long = estimateOf("Реплика заметно длиннее предыдущей, и читать её дольше.");
  assert.ok(long > short, `${long} против ${short}`);
  assert.ok(short > 0);
});

// Точка входа собранного инструмента: тесты гоняются из dist, рядом с ней.
const CLI = fileURLToPath(new URL("../../agentic-screencast.js", import.meta.url));
const root = mkdtempSync(join(tmpdir(), "slidecast-record-"));
const store = join(root, "recordings");
mkdirSync(store, { recursive: true });
const voice = { engine: "recorded", name: "человек", dir: store };
const story = join(root, "story.md");
writeFileSync(story, `# Проба
voice: {"engine":"recorded"}

## a · slides.number
values: 7 :: реплик

Первая реплика.

Её второй такт.

## b · slides.quote
parts: кто :: человек | что :: прочитал

Вторая реплика.
~ Вторая реплика, произносимая иначе.
`);

test("такты страницы адресуются тем же слепком, что и хранилище движка", () => {
  // Второе правило адресации значило бы: человек записал такт, а сборка
  // его не нашла. Слепок обязан считаться одним кодом.
  //
  // Первая сцена написана двумя абзацами — значит, тактов два, и у каждого
  // свой адрес. Число тактов здесь и есть то, что различает нынешнее
  // устройство и прежнее, где вся сцена была одной записью.
  const cards = cardsOf(parseSource(story), voice);
  assert.equal(cards.length, 2);
  assert.equal(cards[0]!.beats.length, 2);
  assert.equal(cards[0]!.beats[0]!.slot, slotFor("Первая реплика."));
  assert.equal(cards[0]!.beats[1]!.slot, slotFor("Её второй такт."));
  assert.equal(cards[1]!.beats.length, 1);
  assert.equal(cards[0]!.beats[0]!.recorded, false);
  assert.equal(cards[0]!.duration, null, "длительности нет, пока записан не каждый такт");
  assert.ok(cards[0]!.beats[0]!.estimate > 0, "ориентир есть всегда");
});

test("произносимый вариант такта задаётся строкой с «~» и адресует запись", () => {
  // Прежде это было поле сцены целиком, и назвать такт им было нельзя.
  // Различающее наблюдение — адрес: он считается от того, что произносится,
  // а не от того, что написано рядом.
  const cards = cardsOf(parseSource(story), voice);
  assert.equal(cards[1]!.beats[0]!.text, "Вторая реплика, произносимая иначе.");
  assert.equal(cards[1]!.beats[0]!.slot, slotFor("Вторая реплика, произносимая иначе."));
  assert.notEqual(cards[1]!.beats[0]!.slot, slotFor("Вторая реплика."));
});

test("сервер принимает сжатый поток и кладёт в хранилище договорный WAV", async () => {
  // Браузер отдаёт webm/opus. Хранилище обязано быть источником, а не
  // полуфабрикатом: заглянувший в каталог человек должен найти звук.
  const src = parseSource(story);
  const server = await serve({ source: story, voice });
  try {
    const slot = slotFor("Первая реплика.");
    const webm = join(root, "up.webm");
    execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-f", "lavfi",
      "-i", "sine=frequency=500:duration=1.4", "-c:a", "libopus", webm]);

    const res = await fetch(new URL(`/api/recording/${slot}`, server.url), {
      method: "PUT",
      body: new Uint8Array(readFileSync(webm)),
    });
    assert.equal(res.status, 200);
    const said = (await res.json()) as { duration: number };
    assert.ok(Math.abs(said.duration - 1.4) < 0.1, `длительность ${said.duration}`);

    const probe = execFileSync(FFPROBE,
      ["-v", "error", "-show_entries", "stream=codec_name,sample_rate,channels",
        "-of", "default=nw=1", join(store, `${slot}.wav`)], { encoding: "utf8" });
    assert.match(probe, /sample_rate=48000/);
    assert.match(probe, /channels=1/);

    // Страница теперь показывает НАСТОЯЩУЮ длительность, а не ориентир.
    const cards = cardsOf(src, voice);
    assert.equal(cards[0]!.beats[0]!.recorded, true);
    assert.ok(Math.abs((cards[0]!.beats[0]!.duration ?? 0) - 1.4) < 0.1);
    assert.equal(cards[0]!.done, 1, "второй такт этой сцены ещё не записан");
    assert.equal(cards[0]!.duration, null, "длина сцены известна только целиком");
  } finally {
    await server.close();
  }
});

test("сервер отвергает то, что не является звуком, причиной", async () => {
  // Вход сюда приходит из браузера, но прийти может что угодно: молчать
  // и класть мусор в хранилище нельзя — сборка споткнулась бы об него
  // далеко от места, где его положили.
  const server = await serve({ source: story, voice });
  try {
    const res = await fetch(new URL(`/api/recording/${slotFor("Вторая реплика, произносимая иначе.")}`, server.url), {
      method: "PUT", body: "не звук вовсе",
    });
    assert.equal(res.status, 400);
    const said = (await res.json()) as { error: string };
    assert.match(said.error, /не читается|cannot be read/);
  } finally {
    await server.close();
  }
});

test("записанное можно переслушать и удалить", async () => {
  // Три метода одного маршрута — три разных обещания странице. Выгрузка
  // проверена выше; здесь два остальных, и их неверные состояния тихие:
  // при неработающем GET человек не может переслушать себя, а при
  // неработающем DELETE стёртая реплика остаётся в хранилище и уезжает
  // в готовый ролик — это слышно только в собранном файле.
  const src = parseSource(story);
  const server = await serve({ source: story, voice });
  try {
    const slot = slotFor("Вторая реплика, произносимая иначе.");
    const wav = join(root, "listen.wav");
    execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-f", "lavfi",
      "-i", "sine=frequency=700:duration=1.1", "-ar", "48000", "-ac", "1", wav]);
    const put = await fetch(new URL(`/api/recording/${slot}`, server.url), {
      method: "PUT", body: new Uint8Array(readFileSync(wav)),
    });
    assert.equal(put.status, 200);

    // Переслушать: страница просит ровно этот адрес у элемента звука.
    const got = await fetch(new URL(`/api/recording/${slot}`, server.url));
    assert.equal(got.status, 200);
    assert.equal(got.headers.get("content-type"), "audio/wav");
    const heard = Buffer.from(await got.arrayBuffer());
    const stored = readFileSync(join(store, `${slot}.wav`));
    assert.equal(Buffer.compare(heard, stored), 0, "отдаётся то же, что лежит в хранилище");

    // Удалить: файла в хранилище нет, и сцена снова «не записана» —
    // сборка возьмёт синтез, а не забракованную реплику.
    const gone = await fetch(new URL(`/api/recording/${slot}`, server.url), { method: "DELETE" });
    assert.equal(gone.status, 200);
    assert.equal(existsSync(join(store, `${slot}.wav`)), false, "файл удалён из хранилища");
    assert.equal(cardsOf(src, voice)[1]!.beats[0]!.recorded, false);
    assert.equal((await fetch(new URL(`/api/recording/${slot}`, server.url))).status, 404);
  } finally {
    await server.close();
  }
});

test("сервер отдаёт только файлы собранной страницы", async () => {
  // Путь приходит из запроса, и выход за каталог страницы отсекается
  // одной строкой. Правдоподобное неверное состояние — сведение условия
  // к «файл существует»: страница при этом отдаётся по-прежнему, сквозной
  // проход её открывает, и наружу вместе с ней уезжает что угодно с диска.
  //
  // Запрос идёт СЫРЫМ, а не через fetch: клиент нормализует путь до
  // отправки, и «..» до сервера не доезжает вовсе — такое наблюдение было
  // бы зелёным и без защиты. Обратные косые сервер приводит к «//»,
  // и остаток становится абсолютным путём: это тот вход, который защиту
  // действительно достигает.
  const ui = mkdtempSync(join(tmpdir(), "slidecast-ui-"));
  writeFileSync(join(ui, "index.html"), "<!doctype html><title>страница</title>");
  // Имя латиницей: сырой запрос не пропускает неэкранированные символы.
  const secret = join(root, "outside.txt");
  writeFileSync(secret, "содержимое, которого сервер отдавать не должен");
  const server = await serve({ source: story, voice, ui });
  const port = Number(new URL(server.url).port);
  const raw = async (path: string): Promise<{ status: number; body: string }> =>
    new Promise((ok, no) => {
      const req = request({ host: "127.0.0.1", port, path, method: "GET" }, (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (c: string) => { body += c; });
        res.on("end", () => ok({ status: res.statusCode ?? 0, body }));
      });
      req.on("error", no);
      req.end();
    });
  try {
    assert.equal((await raw("/")).status, 200, "своя страница отдаётся");
    const outside = await raw(`/\\..\\${secret}`);
    assert.equal(outside.status, 404);
    assert.doesNotMatch(outside.body, /содержимое/, "содержимое чужого файла не отдано");
  } finally {
    await server.close();
  }
});

test("интерфейс поднимается по пути с пробелом и кириллицей", async () => {
  // Точка входа узнаёт себя, сравнивая себя с путём из argv, а каталог
  // собранной страницы берётся оттуда же. Сравнивать при этом надо
  // РАЗРЕШЁННЫЕ ПУТИ: склейка вида `file://` плюс путь ломается
  // по двум разным причинам, и обе дают одно тихое состояние — команда
  // печатает пустоту, выходит с кодом 0 и сервера не поднимает.
  //
  // Первая причина — кодирование: файловый URL процентно кодирован,
  // обычный путь нет, поэтому пробел или не-латиница не совпадут никогда.
  // Вторая — ссылки: URL модуля Node уже разрешён, а argv[1] — нет,
  // поэтому расходится и путь без единого особого знака (на macOS
  // `/tmp` ведёт в `/private/tmp`, а точка входа установленного пакета —
  // ссылка в `node_modules/.bin`). Форма через `pathToFileURL` закрывает
  // только первую: этот тест краснел на ней, и потому написан так.
  //
  // Различает только запуск ОТТУДА: имя каталога здесь и с пробелом,
  // и с кириллицей, а сам он во временном каталоге системы, то есть
  // и за ссылкой.
  const home = mkdtempSync(join(tmpdir(), "slidecast путь с пробелом-"));
  const there = join(home, "каталог инструмента");
  cpSync(dirname(CLI), there, { recursive: true });
  // Копии нужны те же зависимости, что и оригиналу: без них она падает
  // на первом импорте, и это была бы помеха теста, а не проверяемый
  // дефект. Ссылка, а не копия: node_modules весит сотни мегабайт.
  symlinkSync(join(dirname(CLI), "..", "node_modules"), join(home, "node_modules"), "dir");
  const started = spawn("node", [join(there, "record.js"), "--source", story, "--port", "0"], {
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: home },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    const url = await new Promise<string>((ok, no) => {
      const timer = setTimeout(() => no(new Error("интерфейс не назвал адрес")), 30_000);
      let said = "";
      started.stdout.on("data", (chunk: Buffer) => {
        said += chunk.toString();
        const found = /http:\/\/127\.0\.0\.1:\d+\//.exec(said);
        if (found) { clearTimeout(timer); ok(found[0]); }
      });
      started.on("exit", (code) => { clearTimeout(timer); no(new Error(`вышел с кодом ${code}, не назвав адреса`)); });
    });
    // Страница отдаётся, то есть и её каталог найден по тому же URL.
    const page = await fetch(url);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<div id="root">|<script/);
  } finally {
    started.kill("SIGINT");
  }
});

test("сервер слушает только петлю", async () => {
  // Интерфейс записи наружу не смотрит: он поднимается на время работы
  // человека, отдаёт его сценарий, его записи и его микрофон.
  //
  // Спрашивается адрес СОКЕТА, а не напечатанная строка: строка собрана
  // литералом, и при `listen(порт)` без петли она остаётся той же самой,
  // хотя сервер уже виден из сети. По ней два состояния неразличимы.
  const server = await serve({ source: story, voice });
  try {
    assert.equal(server.address, "127.0.0.1");
    assert.match(server.url, /^http:\/\/127\.0\.0\.1:\d+\/$/);
  } finally {
    await server.close();
  }
});

test("остановка интерфейса не оставляет ни сервера, ни каталога картинок", async () => {
  // Интерфейс останавливают Ctrl+C. Правдоподобное неверное состояние
  // выглядит успешным: обёртка умирает, человек видит приглашение
  // оболочки — а сервер остался сиротой, держит порт и каталог картинок
  // в системном temp. Различает не код выхода обёртки, а то, отвечает ли
  // адрес после сигнала и вернулось ли число каталогов к прежнему.
  // Следим за СВОИМ каталогом, а не за числом чужих. Счётчик — общее
  // состояние: рядом идут другие файлы проверок и может быть поднят
  // интерфейс человека, и тогда «стало на один больше» ложно и в ту,
  // и в другую сторону. Поймано общим прогоном: в одиночку тест зелен,
  // вместе с соседями красен.
  const pictureDirs = (): Set<string> =>
    new Set(readdirSync(tmpdir()).filter((n) => n.startsWith("slidecast-pictures-")));
  const before = pictureDirs();
  const home = mkdtempSync(join(tmpdir(), "slidecast-stop-"));
  const wrapper = spawn("node", [CLI, "record", "--source", story], {
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: home },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const url = await new Promise<string>((ok, no) => {
    const timer = setTimeout(() => no(new Error("интерфейс не назвал адрес")), 30_000);
    let said = "";
    wrapper.stdout.on("data", (chunk: Buffer) => {
      said += chunk.toString();
      const found = /http:\/\/127\.0\.0\.1:\d+\//.exec(said);
      if (found) { clearTimeout(timer); ok(found[0]); }
    });
  });
  assert.equal((await fetch(url)).status, 200, "страница обязана отвечать до сигнала");
  const mine = [...pictureDirs()].filter((n) => !before.has(n));
  assert.equal(mine.length, 1, `каталог картинок у запущенного сервера свой: ${mine.join(", ")}`);

  const exited = new Promise<void>((ok) => wrapper.on("exit", () => ok()));
  wrapper.kill("SIGINT");
  await exited;
  await new Promise((ok) => setTimeout(ok, 500));

  const left = [...pictureDirs()].filter((n) => mine.includes(n));
  assert.deepEqual(left, [], "каталог картинок убран");
  await assert.rejects(fetch(url), "адрес не должен отвечать: сервера больше нет");
});
