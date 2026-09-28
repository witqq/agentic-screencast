// Голос: договор движка, сборка из записей, запись голосом через страницу.
// Проверки этого класса выполняются по порядку при импорте модуля; итог печатает suite.ts.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { FFMPEG as FFMPEG_BIN } from "../../voice/audio.js";
import { childFailure } from "../support.js";
import { HERE, run, check, ENTRY } from "./common.js";

// 11. Договор о движке голоса исполним, и это проверяется на программе,
// а не на пересказе. Предмет — поставляемая реализация, выставленная
// наружу тем же интерфейсом, что и любая посторонняя: если договор
// перестанет соблюдаться, покраснеет именно то требование, которое
// нарушено.
await check("договор о движке голоса выполняется", () => {
  const engine = resolve(HERE, "dist", "voice-cli.js");
  const r = run("node", [resolve(HERE, "dist", "voice-check.js"), `node ${engine}`,
    "--voice-json", JSON.stringify({ engine: "stub", name: "nullvoice", cps: 18 })]);
  if (r.status === 0) return true;
  const failed = r.stdout.split("\n").filter((l) => l.startsWith("ПРОВАЛ"));
  return failed.length ? failed.join("; ") : `код ${r.status}: ${r.stderr.slice(0, 160)}`;
});

// 19. Ролик собирается из записанного голоса, и перезапись до него доходит.
//
// Предмет — не то, что движок существует, а инвариант, ради которого
// в договор заведён отпечаток: заменили запись — следующая сборка отдаёт
// новый звук и новую длительность сцены. Похожее неверное состояние
// выглядит успешной сборкой: ключ кэша звука не изменился, взят прежний
// файл, длительность прежняя. Различает измерение длительности сцены
// до и после перезаписи — оно и стоит здесь.
//
// Сборка доводится до вычисления ключей: рендерить сцены незачем,
// предмет проверки лежит до рендера. Денег это не стоит — синтеза нет,
// звук берётся из положенных файлов.
/**
 * Основной тон в окне файла, по переходам через ноль.
 *
 * Приём годится для ОБРАЗЦОВ — в записях проверки лежит синусоида;
 * человеческую речь так не измерить. Здесь он нужен ровно затем, чтобы
 * отличить «взяли эту запись» от «взяли другую» и от «синтезировали»,
 * и с этим он справляется точно.
 */
function toneOf(file: string, at: number): number {
  const r = spawnSync(FFMPEG_BIN, ["-nostdin", "-v", "error", "-ss", String(at), "-t", "0.5",
    "-i", file, "-f", "s16le", "-ar", "48000", "-ac", "1", "-"], { maxBuffer: 16 * 1024 * 1024 });
  const buf = r.stdout;
  if (!buf || buf.length < 4) return -1;
  let crossings = 0;
  let prev = 0;
  for (let i = 0; i + 1 < buf.length; i += 2) {
    const v = buf.readInt16LE(i);
    if ((v >= 0) !== (prev >= 0)) crossings++;
    prev = v;
  }
  return Math.round(crossings / 2 / (buf.length / 2 / 48000));
}

await check("ролик собирается из записей, и перезапись доезжает", () => {
  const dir = mkdtempSync(join(tmpdir(), "slidecast-rec-"));
  try {
    const store = join(dir, "recordings");
    const home = join(dir, "home");
    // Записи кладутся в НЕ договорном формате — 44,1 кГц и два канала,
    // как отдаёт обычный диктофон. Клади их сразу 48 кГц моно, и вся эта
    // проверка молчала бы о приведении формата: путь остался бы зелёным
    // и с движком, который просто копирует файл. Проверено исполнением.
    const rec = (text: string, secs: number, hz: number): void => {
      const md5 = createHash("md5").update(text).digest("hex");
      run(FFMPEG_BIN, ["-nostdin", "-y", "-loglevel", "error", "-f", "lavfi",
        "-i", `sine=frequency=${hz}:duration=${secs}`, "-ar", "44100", "-ac", "2",
        join(store, `${md5}.wav`)]);
    };
    const speech = "Реплика, записанная человеком.";
    mkdirSync(store, { recursive: true });

    const story = join(dir, "story.md");
    writeFileSync(story, `# Проба\nvoice: ${JSON.stringify({ engine: "recorded", name: "человек", dir: store })}\n`
      + `\n## r1 · slides.number\nvalues: 7 :: реплик\n\n${speech}\n`);
    const build = (): { keys: Array<{ spoken: number; key: string; voiced: string }> } => {
      const r = run("node", [ENTRY, "build", "--source", story, "--out", join(dir, "out.mp4"), "--keys-only"],
        { cwd: dir, env: { ...process.env, AGENTIC_SCREENCAST_HOME: home } });
      if (r.status !== 0) throw new Error(`сборка отказала: ${(r.stderr || r.stdout || "").slice(0, 200)}`);
      return JSON.parse(r.stdout) as { keys: Array<{ spoken: number; key: string; voiced: string }> };
    };

    // Отказ на недостающей записи — половина того же предмета: без него
    // «сборка прошла» ничего не значило бы, потому что тишину подходящей
    // длины подставить нетрудно.
    const missing = run("node", [ENTRY, "build", "--source", story, "--out", join(dir, "out.mp4"), "--keys-only"],
      { cwd: dir, env: { ...process.env, AGENTIC_SCREENCAST_HOME: home } });
    if (missing.status === 0) return "сборка без записи прошла молча";
    if (!(missing.stderr || "").includes(speech.slice(0, 20))) {
      return `отказ не назвал реплику: ${(missing.stderr || "").slice(0, 120)}`;
    }

    rec(speech, 2.0, 440);
    const before = build().keys[0]!;
    if (before.voiced !== "recorded") return `сцена озвучена не записью: ${before.voiced}`;
    if (Math.abs(before.spoken - 2.0) > 0.05) return `длительность от записи не взята: ${before.spoken}`;

    rec(speech, 3.5, 880);
    const after = build().keys[0]!;
    if (Math.abs(after.spoken - 3.5) > 0.05) {
      return `перезапись не доехала: длительность осталась ${after.spoken}`;
    }
    if (after.key === before.key) return "ключ сегмента не изменился после перезаписи";

    // Ключи — это ещё не дорожка. Между ними лежит добивание тишиной,
    // склейка звука и мультиплекс; правка там оставила бы всё выше
    // зелёным. Признак единицы говорит именно про готовый файл, поэтому
    // сборка доводится до конца и сверяется СОДЕРЖАНИЕ дорожки.
    //
    // Побайтового совпадения требовать нельзя — звук в ролике сжат.
    // Сверяется основной тон в окне сцены: он различает и «звук
    // синтезирован», и «взят не тот файл», чего длительность не даёт.
    const out = join(dir, "out.mp4");
    const built = run("node", [ENTRY, "build", "--source", story, "--out", out],
      { cwd: dir, env: { ...process.env, AGENTIC_SCREENCAST_HOME: home } });
    if (built.status !== 0) {
      return `сборка ролика отказала: ${(built.stderr || built.stdout || "").slice(0, 200)}`;
    }
    const inVideo = toneOf(out, 1.0);
    // Сравнение идёт с тоном САМОЙ записи, измеренным тем же способом,
    // а не с числом, написанным здесь руками: иначе проверка сверяла бы
    // дорожку со своим представлением о ней.
    const inRec = toneOf(join(store, `${createHash("md5").update(speech).digest("hex")}.wav`), 1.0);
    if (Math.abs(inVideo - inRec) > 15) {
      return `дорожка готового файла (${inVideo} Гц) не совпадает с записью (${inRec} Гц)`;
    }
    return true;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// 20. Человек записывает ролик своим голосом через страницу.
//
// Предмет — весь путь: страница открылась, кнопка нажата, микрофон
// записан, файл лёг в хранилище, сборка взяла его и в готовом ролике
// слышно записанное. Признак единицы говорит прямо: «страница
// открывается, кнопки нажимаются, до сборки ничего не доезжает»
// на снимке экрана неотличимо от работающего, поэтому проверка идёт
// до готового файла и сверяет его звук.
//
// Микрофон подменяется файлом с тоном: браузер видит обычное устройство,
// страница идёт своим обычным путём, а мы знаем, что «сказал» человек,
// и узнаём это в дорожке ролика.
await check("человек записывает ролик голосом через страницу", () => {
  const r = run("node", [resolve(HERE, "dist", "tests", "record-e2e.js")], { timeout: 300_000 });
  if (r.status === 0) return true;
  return childFailure(r);
});
