#!/usr/bin/env node
// Сквозной проход интерфейса записи: человек нажимает кнопку — из этого
// получается ролик, в котором слышно записанное.
//
// Различающее наблюдение здесь одно и оно названо признаком приёмки:
// «страница открывается, кнопки нажимаются, до сборки ничего
// не доезжает» на снимке экрана неотличимо от работающего. Поэтому
// проход идёт ДО ГОТОВОГО ФАЙЛА и сверяет его звук.
//
// Микрофон подменяется файлом с тоном (`--use-file-for-fake-audio-capture`):
// браузер видит обычное устройство ввода, страница идёт своим обычным
// путём через `getUserMedia` и `MediaRecorder`, а мы знаем, что именно
// «сказал» человек, и можем узнать это в дорожке готового ролика.
import { chromium, type Page } from "playwright";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "../record.js";
import { FFMPEG, durationOf } from "../voice/audio.js";
import { storeDir } from "../voice/recorded.js";

const HERE = resolve(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const ENTRY = join(HERE, "dist", "agentic-screencast.js");

/** Основной тон в окне файла — тем же способом, что и в наборе проверок. */
export function toneOf(file: string, at: number): number {
  const r = execFileSync(FFMPEG, ["-nostdin", "-v", "error", "-ss", String(at), "-t", "0.5",
    "-i", file, "-f", "s16le", "-ar", "48000", "-ac", "1", "-"],
    { maxBuffer: 16 * 1024 * 1024 });
  let crossings = 0;
  let prev = 0;
  for (let i = 0; i + 1 < r.length; i += 2) {
    const v = r.readInt16LE(i);
    if ((v >= 0) !== (prev >= 0)) crossings++;
    prev = v;
  }
  return Math.round(crossings / 2 / (r.length / 2 / 48000));
}

/** Записывает текущую сцену через страницу и ждёт, пока запись сохранится. */
async function recordHere(page: Page, seconds: number, beat = 0): Promise<void> {
  const li = page.locator("li.beat").nth(beat);
  await li.getByRole("button", { name: /Записать|Перезаписать/ }).click();
  await page.getByRole("button", { name: "Стоп" }).waitFor();
  await page.waitForTimeout(seconds * 1000);
  // Ждём ПРИЁМА записи сервером, а не появления слов «записано:» на
  // странице: при перезаписи они уже стоят там от прошлой записи, и
  // ожидание возвращалось бы сразу — сборка успевала прочитать прежний
  // звук. Наблюдение обязано различать новую запись и прежнюю.
  const accepted = page.waitForResponse((r) =>
    r.request().method() === "PUT" && r.url().includes("/api/recording/"),
  { timeout: 30_000 });
  await page.getByRole("button", { name: "Стоп" }).click();
  await accepted;
  await li.locator("p.pace", { hasText: "записано:" }).waitFor({ timeout: 30_000 });
}

export interface PassResult {
  dir: string;
  shots: Record<string, string>;
  facts: Record<string, string | number>;
}

export async function pass(shotsDir?: string): Promise<PassResult> {
  const dir = mkdtempSync(join(tmpdir(), "slidecast-e2e-"));
  const home = join(dir, "home");
  const mic = join(dir, "mic.wav");
  const shots: Record<string, string> = {};
  const facts: Record<string, string | number> = {};
  if (shotsDir) mkdirSync(shotsDir, { recursive: true });
  const shot = async (page: Page, name: string): Promise<void> => {
    if (!shotsDir) return;
    const file = join(shotsDir, `${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    shots[name] = file;
  };

  // Голос «человека» — тон, который потом узнаем в ролике.
  execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-f", "lavfi",
    "-i", "sine=frequency=640:duration=30", "-ar", "48000", "-ac", "1", mic]);

  const story = join(dir, "story.md");
  writeFileSync(story, `# Проба записи
lang: ru
voice: {"engine":"recorded","name":"человек"}

## a · slides.number
title: Первая сцена
values: 7 :: реплик

Первая реплика, её читают вслух.

## b · slides.compare
title: Вторая сцена
left: Было :: синтез
right: Стало :: свой голос

Вторая реплика, её первый такт.

И второй такт той же сцены, он записывается отдельно.
`);

  const voice = { engine: "recorded", name: "человек", dir: join(home, "recordings") };
  process.env.AGENTIC_SCREENCAST_HOME = home;
  const server = await serve({ source: story, voice, ui: join(HERE, "dist", "record-ui") });
  facts["адрес страницы"] = server.url;

  const browser = await chromium.launch({
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream",
      `--use-file-for-fake-audio-capture=${mic}`],
  });
  try {
    const ctx = await browser.newContext({
      permissions: ["microphone"],
      viewport: { width: 1000, height: 1200 },
    });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(server.url, { waitUntil: "networkidle" });
    await page.locator("figure img").waitFor();
    await shot(page, "01-открыта");

    facts["микрофонов в списке"] = await page.locator("#mic option").count();
    facts["сцен на странице"] = await page.locator("nav .chip").count();
    facts["тактов у первой сцены"] = await page.locator("li.beat").count();
    facts["ориентир до записи"] = (await page.locator("li.beat p.pace").first().innerText()).trim();

    await recordHere(page, 2.0);
    await shot(page, "02-записана-первая");
    facts["после записи"] = (await page.locator("li.beat p.pace").first().innerText()).trim();

    await page.getByRole("button", { name: /следующая/ }).click();
    // Ждём картинку ИМЕННО ВТОРОЙ сцены: изображение на странице уже стоит
    // от первой, и ожидание «есть картинка» вернулось бы мгновенно —
    // снимок мог бы застать прежний кадр.
    await page.locator('figure img[src$="/api/picture/b"]').waitFor();
    // Оба такта второй сцены — по отдельности и разной длины: сумма
    // и есть длина сцены, а по одной длине сцены два устройства
    // (такты против одной записи на сцену) неразличимы.
    await recordHere(page, 1.2, 0);
    await recordHere(page, 0.8, 1);
    facts["тактов у второй сцены"] = await page.locator("li.beat").count();
    await shot(page, "03-записаны-обе");

    if (errors.length) facts["ошибки страницы"] = errors.join(" | ");

    // Предпросмотр: одна сцена собирается тем же путём, что и готовый
    // ролик. Различающее наблюдение — не то, что кнопка нажалась,
    // а длительность и звук собранного: предпросмотр, отдающий соседнюю
    // сцену или прежний файл из кэша, выглядит на экране точно так же.
    //
    // Сначала спрашивается сервер, потом нажимается кнопка. Обратный
    // порядок давал два запроса разом: сервер собирает сцену синхронно,
    // и второй обрывался по сбросу соединения — проверка краснела
    // на исправном предпросмотре.
    const shown = (await page.locator("figcaption b").innerText()).trim();
    facts["предпросмотр: сцена"] = shown;
    const previewFile = join(dir, "preview.mp4");
    const got = await fetch(new URL(`/api/preview/${shown}`, server.url));
    facts["предпросмотр: ответ"] = got.status;
    const body = Buffer.from(await got.arrayBuffer());
    facts["предпросмотр: байт"] = body.length;
    writeFileSync(previewFile, body);
    if (got.status === 200) {
      facts["предпросмотр: длительность"] = durationOf(previewFile);
      facts["предпросмотр: тон"] = toneOf(previewFile, 0.4);
    } else {
      facts["предпросмотр: отказ"] = body.toString("utf8").slice(0, 200);
    }
    // И то же самое кнопкой: человек нажимает её, и на странице появляется
    // проигрыватель. Сегменты уже в кэше, поэтому это быстро.
    await page.getByRole("button", { name: /Собрать и посмотреть/ }).click();
    await page.locator("video.preview-video").waitFor({ timeout: 600_000 });
    facts["предпросмотр: проигрыватель на странице"] = "да";
    await shot(page, "08-предпросмотр-сцены");

    // Хранилище наполнилось тем же путём, каким его читает сборка.
    const store = storeDir(voice);
    const scenes = (await (await fetch(new URL("/api/scenes", server.url))).json()) as {
      scenes: Array<{ id: string; duration: number | null;
        beats: Array<{ n: number; slot: string; recorded: boolean; duration: number | null }> }>;
    };
    for (const s of scenes.scenes) {
      // Файл лежит у КАЖДОГО такта: одна запись на сцену была бы здесь
      // неотличима, пока сцена состоит из одного такта, — поэтому вторая
      // сцена и написана двумя абзацами.
      for (const b of s.beats) {
        const file = join(store, `${b.slot}.wav`);
        if (!b.recorded || !existsSync(file)) throw new Error(`такт ${s.id}/${b.n} не записан`);
        facts[`длительность ${s.id}/${b.n} в хранилище`] = durationOf(file);
      }
      facts[`длительность ${s.id} на странице`] = s.duration ?? 0;
    }

    // Сборка теми же командами, что и из синтеза.
    const out = join(dir, "out.mp4");
    const keys = execFileSync("node", [ENTRY, "build", "--source", story, "--out", out, "--keys-only"],
      { encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: home } });
    const spoken = (JSON.parse(keys) as {
      keys: Array<{ id: string; spoken: number; voiced: string;
        beats: Array<{ key: string; spoken: number; starts: number }> }>;
    }).keys;
    for (const k of spoken) {
      facts[`длительность ${k.id} в сборке`] = k.spoken;
      facts[`чем озвучена ${k.id}`] = k.voiced;
      facts[`тактов ${k.id} в сборке`] = k.beats.length;
    }
    // Сцена из двух тактов: её длина — сумма их длин, ключи тактов разные,
    // а второй такт начинается там, где кончился первый. Именно это
    // и отличает такты от одной записи на сцену: при склейке текста
    // сумма та же, но такт был бы один и ключ один.
    const two = spoken.find((k) => k.id === "b")!;
    facts["сумма тактов b"] = Number(two.beats.reduce((n, b) => n + b.spoken, 0).toFixed(3));
    facts["ключи тактов b различны"] =
      new Set(two.beats.map((b) => b.key)).size === two.beats.length ? "да" : "НЕТ";
    facts["начало второго такта b"] = two.beats[1]?.starts ?? -1;
    execFileSync("node", [ENTRY, "build", "--source", story, "--out", out],
      { env: { ...process.env, AGENTIC_SCREENCAST_HOME: home }, stdio: "pipe" });
    facts["ролик"] = `${out} (${durationOf(out)} с)`;
    facts["тон в ролике"] = toneOf(out, 0.6);
    facts["тон микрофона"] = toneOf(mic, 0.6);

    // Картинка принадлежит ИМЕННО ТОЙ сцене. Проверяется не глазами:
    // слайд первой сцены меняется на диске, и у второго сервера — своя
    // свежая память картинок — первая картинка обязана измениться,
    // а вторая остаться прежней. Отдай сервер кадр соседней сцены,
    // перепутай их или отдай один на всех — это разойдётся.
    const pic = async (url: string, id: string): Promise<Buffer> =>
      Buffer.from(await (await fetch(new URL(`/api/picture/${id}`, url))).arrayBuffer());
    const picA = await pic(server.url, "a");
    const picB = await pic(server.url, "b");
    facts["картинки сцен различны"] = Buffer.compare(picA, picB) === 0 ? "НЕТ" : "да";
    if (Buffer.compare(picA, picB) === 0) throw new Error("сцены показаны одной картинкой");

    // Меняется ИСТОЧНИК, а не порождённый слайд: слайды порождаются
    // из сценария при каждом запуске сервера, и правка порождённого
    // была бы затёрта — это свойство продукта, а не помеха. Заодно
    // проверяется вся цепочка «источник → слайд → картинка».
    writeFileSync(story, readFileSync(story, "utf8")
      .replace("title: Первая сцена", "title: Первая сцена, переименованная"));
    const second = await serve({ source: story, voice, ui: join(HERE, "dist", "record-ui") });
    try {
      const picA2 = await pic(second.url, "a");
      const picB2 = await pic(second.url, "b");
      const aChanged = Buffer.compare(picA, picA2) !== 0;
      const bSame = Buffer.compare(picB, picB2) === 0;
      facts["картинка сцены следует за её слайдом"] = aChanged && bSame ? "да" : "НЕТ";
      if (!aChanged) throw new Error("правка слайда сцены a не изменила её картинку");
      if (!bSame) throw new Error("правка слайда сцены a изменила картинку сцены b");
    } finally {
      await second.close();
    }

    // Перезапись ЧЕРЕЗ СТРАНИЦУ доезжает до готового файла. Между кнопкой
    // и роликом лежит кэш сборки, и правдоподобное неверное состояние
    // выглядит успешным: страница показывает новую длительность, а ролик
    // собран из прежнего звука. Различает тон в дорожке до и после.
    //
    // Второй браузер — потому что подставной микрофон задаётся при
    // запуске: у него другой тон, и «человек сказал иначе» становится
    // наблюдаемым.
    const mic2 = join(dir, "mic2.wav");
    execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-f", "lavfi",
      "-i", "sine=frequency=980:duration=30", "-ar", "48000", "-ac", "1", mic2]);
    const again = await chromium.launch({
      args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream",
        `--use-file-for-fake-audio-capture=${mic2}`],
    });
    try {
      const ctx2 = await again.newContext({ permissions: ["microphone"], viewport: { width: 1000, height: 1200 } });
      const p2 = await ctx2.newPage();
      await p2.goto(server.url, { waitUntil: "networkidle" });
      await p2.locator("figure img").waitFor();
      await recordHere(p2, 2.5);
      await shot(p2, "05-перезаписана-первая");
      facts["после перезаписи"] = (await p2.locator("li.beat p.pace").first().innerText()).trim();
    } finally {
      await again.close();
    }
    const out2 = join(dir, "out2.mp4");
    execFileSync("node", [ENTRY, "build", "--source", story, "--out", out2],
      { env: { ...process.env, AGENTIC_SCREENCAST_HOME: home }, stdio: "pipe" });
    facts["тон в ролике после перезаписи"] = toneOf(out2, 0.6);
    facts["тон второго микрофона"] = toneOf(mic2, 0.6);

    // Предмет записи нельзя сменить, пока запись идёт. Правдоподобное
    // неверное состояние тихое и разрушительное: человек нажал «Записать»
    // на одной сцене, перешёл к соседней, дочитал и нажал «Стоп» — звук
    // ушёл в первую сцену ПОВЕРХ сделанной там записи, а вторая осталась
    // пустой, хотя человек смотрел именно на неё. Различает не наличие
    // кнопок, а показанная сцена после нажатия во время записи.
    const showing = async (): Promise<string> =>
      (await page.locator("figcaption b").innerText()).trim();
    facts["сцена до записи"] = await showing();
    await page.locator("li.beat").first().getByRole("button", { name: /Записать|Перезаписать/ }).click();
    await page.getByRole("button", { name: "Стоп" }).waitFor();
    // Метка ДРУГОЙ сцены: переход кнопкой «следующая» здесь заперт ещё
    // и границей списка, и наблюдение держалось бы на неверной причине.
    const other = page.locator("nav .chip").first();
    facts["метка чужой сцены заперта"] = (await other.isDisabled()) ? "да" : "НЕТ";
    // Органов перехода три, и запереть надо все: оставленный открытым
    // возвращает тот же вред целиком. «Предыдущая», а не «следующая»:
    // проход стоит на последней сцене, где вторая заперта ещё и границей
    // списка, и утверждение о ней держалось бы на неверной причине.
    facts["кнопка перехода заперта"] =
      (await page.getByRole("button", { name: /предыдущая/ }).isDisabled()) ? "да" : "НЕТ";
    // Нажатие силой — не обход помехи, а само проверяемое действие:
    // человеку кнопка видна, и вопрос ровно в том, что будет, если
    // по ней ударить во время записи.
    await shot(page, "07-идёт-запись");
    await other.click({ force: true });
    facts["сцена во время записи после нажатий"] = await showing();
    await page.getByRole("button", { name: "Стоп" }).click();
    await page.locator("li.beat p.pace", { hasText: "записано:" }).first().waitFor({ timeout: 30_000 });

    // Отказ СЕРВЕРА виден человеку с его же словами. Это вторая ветвь,
    // где на странице появляется сообщение, и её неверное состояние
    // выглядит буднично: человек прочёл реплику, нажал «Стоп», и ничего
    // не изменилось — ни длительности, ни проигрывателя, ни причины.
    //
    // Ответ подменяется на настоящий отказ сервера (сервер такой же
    // отвечает на не-звук, это проверено отдельно): различает не факт
    // появления строки, а ЕГО слова на странице.
    const refusal = "запись не читается: подменённый ответ сервера";
    await page.route(/\/api\/recording\//, async (route) => {
      if (route.request().method() !== "PUT") return route.continue();
      await route.fulfill({
        status: 400, contentType: "application/json",
        body: JSON.stringify({ error: refusal }),
      });
    });
    await page.locator("li.beat").first().getByRole("button", { name: /Записать|Перезаписать/ }).click();
    await page.getByRole("button", { name: "Стоп" }).waitFor();
    await page.waitForTimeout(700);
    await page.getByRole("button", { name: "Стоп" }).click();
    await page.locator(".error").waitFor({ timeout: 20_000 });
    facts["страница про отказ сервера"] = (await page.locator(".error").innerText()).trim();
    await shot(page, "06-сервер-не-принял-запись");
    await page.unroute(/\/api\/recording\//);

    // Отказ на УДАЛЕНИИ виден так же, как отказ на выгрузке: это вторая
    // кнопка, меняющая хранилище, и молчание оставило бы человека
    // с кнопкой, которая «не работает» без причины.
    const dropRefusal = "сервер не смог удалить запись: подменённый отказ";
    await page.route(/\/api\/recording\//, async (route) => {
      if (route.request().method() !== "DELETE") return route.continue();
      await route.fulfill({
        status: 500, contentType: "application/json",
        body: JSON.stringify({ error: dropRefusal }),
      });
    });
    await page.locator("li.beat").first().getByRole("button", { name: "Удалить" }).click();
    await page.locator(".error").waitFor({ timeout: 20_000 });
    facts["страница про отказ удаления"] = (await page.locator(".error").innerText()).trim();
    await page.unroute(/\/api\/recording\//);

    // Отказ микрофона виден человеку, а не уходит в консоль. Разрешения
    // нет и поддельного устройства нет — браузер отказывает, и страница
    // обязана назвать причину.
    const denied = await chromium.launch();
    try {
      const p3 = await (await denied.newContext({ viewport: { width: 1000, height: 900 } })).newPage();
      await p3.goto(server.url, { waitUntil: "networkidle" });
      await p3.locator("figure img").waitFor();
      facts["кнопка разрешения без разрешения"] =
        (await p3.getByRole("button", { name: "Разрешить доступ к микрофону" }).count()) > 0 ? "да" : "нет";
      await p3.locator("li.beat").first().getByRole("button", { name: /Записать|Перезаписать/ }).click();
      await p3.locator(".error").waitFor({ timeout: 20_000 });
      facts["страница про отказ микрофона"] = (await p3.locator(".error").innerText()).trim();
      await shot(p3, "04-микрофон-запрещён");
    } finally {
      await denied.close();
    }

    return { dir, shots, facts };
  } finally {
    await browser.close();
    await server.close();
  }
}

// Разрешённые пути, а не URL со склейкой: см. причину в src/record.ts.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf("--shots");
  const r = await pass(i > 0 ? process.argv[i + 1] : undefined);
  for (const [k, v] of Object.entries(r.facts)) console.log(`${k}: ${v}`);
  for (const [k, v] of Object.entries(r.shots)) console.log(`снимок ${k}: ${v}`);
  const near = (a: string, b: string): boolean =>
    Math.abs(Number(r.facts[a]) - Number(r.facts[b])) <= 15;
  if (!near("тон в ролике", "тон микрофона")) {
    console.error("дорожка ролика не совпала с тем, что «сказал» человек"); process.exit(1);
  }
  if (!near("тон в ролике после перезаписи", "тон второго микрофона")) {
    console.error("перезапись через страницу не доехала до готового файла"); process.exit(1);
  }
  if (near("тон в ролике после перезаписи", "тон микрофона")) {
    console.error("после перезаписи в ролике остался прежний звук"); process.exit(1);
  }
  // Предпросмотр обязан быть ТОЙ сценой: её длиной и её звуком. Отдай
  // сервер соседнюю — длительность разошлась бы; отдай прежний файл —
  // разошёлся бы тон после перезаписи.
  if (Number(r.facts["предпросмотр: ответ"]) !== 200) {
    console.error("предпросмотр сцены не собрался"); process.exit(1);
  }
  if (Math.abs(Number(r.facts["предпросмотр: длительность"])
    - Number(r.facts["длительность b в сборке"]) - 0.4) > 0.3) {
    console.error("длительность предпросмотра не совпала с длиной сцены в сборке"); process.exit(1);
  }
  if (Math.abs(Number(r.facts["предпросмотр: тон"]) - Number(r.facts["тон микрофона"])) > 15) {
    console.error("в предпросмотре звучит не то, что записал человек"); process.exit(1);
  }
  if (Number(r.facts["тактов b в сборке"]) !== 2) {
    console.error("сцена из двух абзацев дала не два такта: речь не разбита"); process.exit(1);
  }
  if (r.facts["ключи тактов b различны"] !== "да") {
    console.error("такты сцены получили один ключ кэша: перезапись одного затронет соседний"); process.exit(1);
  }
  if (Math.abs(Number(r.facts["длительность b в сборке"]) - Number(r.facts["сумма тактов b"])) > 0.05) {
    console.error("длина сцены не равна сумме длин её тактов"); process.exit(1);
  }
  if (Math.abs(Number(r.facts["начало второго такта b"]) - Number(r.facts["сумма тактов b"]) / 2) > 0.4) {
    console.error("второй такт начинается не там, где кончился первый"); process.exit(1);
  }
  if (r.facts["кнопка перехода заперта"] !== "да") {
    console.error("во время записи кнопка перехода осталась нажимаемой"); process.exit(1);
  }
  if (r.facts["кнопка разрешения без разрешения"] !== "да") {
    console.error("разрешение не спрашивается заранее: кнопки на странице нет"); process.exit(1);
  }
  if (Number(r.facts["микрофонов в списке"]) < 2) {
    console.error("выбирать не из чего: в списке микрофонов только умолчание"); process.exit(1);
  }
  if (r.facts["метка чужой сцены заперта"] !== "да") {
    console.error("во время записи метки сцен остались нажимаемыми"); process.exit(1);
  }
  if (r.facts["сцена до записи"] !== r.facts["сцена во время записи после нажатий"]) {
    console.error("сцену удалось сменить во время записи: звук уйдёт не в ту сцену"); process.exit(1);
  }
  if (!String(r.facts["страница про отказ удаления"] ?? "").includes("подменённый отказ")) {
    console.error("страница промолчала об отказе на удалении записи"); process.exit(1);
  }
  if (!String(r.facts["страница про отказ сервера"] ?? "").includes("подменённый ответ сервера")) {
    console.error("страница не показала человеку слова сервера об отказе"); process.exit(1);
  }
  if (!String(r.facts["страница про отказ микрофона"] ?? "").trim()) {
    console.error("страница промолчала об отказе микрофона"); process.exit(1);
  }
  rmSync(r.dir, { recursive: true, force: true });
  console.log("сквозной проход: голос доехал до готового файла");
}
