// Движок записанного голоса.
//
// Проверяется то, ради чего он вообще отличается от синтеза: звук берётся
// снаружи и при перезаписи меняется при тех же тексте и данных голоса.
// Всё остальное в нём — обычная реализация уже объявленного договора.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { FFMPEG, FFPROBE } from "../../voice/audio.js";
import { recorded, fingerprintOf, recordingPath, slotFor, storeDir } from "../../voice/recorded.js";
import { voiceKey } from "../../voice/index.js";

const root = mkdtempSync(join(tmpdir(), "slidecast-recorded-"));
const store = join(root, "recordings");
mkdirSync(store, { recursive: true });
const voice = { engine: "recorded", name: "человек", dir: store };

/**
 * Кладёт «запись» нужной длины и высоты тона: тон слышно в дорожке.
 *
 * Формат намеренно НЕ договорный — 44,1 кГц и два канала, как отдаёт
 * обычный диктофон. Записывай фикстура сразу 48 кГц моно, утверждение
 * «запись приводится к формату договора» повторяло бы свойство самой
 * фикстуры: убери приведение формата из движка — и тест остался бы
 * зелёным. Проверено исполнением, прежде чем фикстуру сменили.
 */
function record(text: string, seconds: number, hz: number): string {
  const file = recordingPath(text, voice);
  execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error",
    "-f", "lavfi", "-i", `sine=frequency=${hz}:duration=${seconds}`,
    "-ar", "44100", "-ac", "2", file]);
  return file;
}

/** Частота и число каналов у файла — так их видит сборка. */
function formatOf(file: string): string {
  return execFileSync(FFPROBE,
    ["-v", "error", "-show_entries", "stream=sample_rate,channels", "-of", "default=nw=1", file],
    { encoding: "utf8" });
}

test("запись адресуется текстом реплики, а не порядком сцен", () => {
  // Следствие, названное в документации: две сцены с дословно одинаковой
  // репликой получат одну запись. Тест закрепляет именно это правило,
  // чтобы адресация не сменилась молча.
  assert.equal(slotFor("Одна и та же реплика."), slotFor("Одна и та же реплика."));
  assert.notEqual(slotFor("Реплика А."), slotFor("Реплика Б."));
  assert.match(recordingPath("Реплика А.", voice), /recordings\/[0-9a-f]{32}\.wav$/);
});

test("хранилище задаётся данными голоса, а не местом инструмента", () => {
  assert.equal(storeDir(voice), store);
});

test("относительный каталог данных разрешается от рабочего каталога", () => {
  const previous = process.env.AGENTIC_SCREENCAST_HOME;
  process.env.AGENTIC_SCREENCAST_HOME = "relative-data";
  try {
    assert.equal(storeDir({}), resolve(process.cwd(), "relative-data/recordings"));
  } finally {
    if (previous === undefined) delete process.env.AGENTIC_SCREENCAST_HOME;
    else process.env.AGENTIC_SCREENCAST_HOME = previous;
  }
});

test("отпечаток пуст, пока записи нет", () => {
  // Отказывать здесь нельзя: сборка считает ключ до синтеза, и отказ
  // на этом месте не дал бы ей дойти до внятного сообщения о том,
  // какой реплики не хватает.
  assert.equal(fingerprintOf("Реплики ещё нет.", voice), "");
});

test("отпечаток меняется при перезаписи — иначе перезапись не доедет", () => {
  // Это главное свойство движка. Похожее неверное состояние: отпечаток
  // считается от имени файла или от текста реплики. Он непуст, договор
  // формально соблюдён, но при перезаписи НЕ меняется — ключ кэша
  // остаётся прежним, и сборка отдаёт прежний звук, выглядя успешной.
  const text = "Реплика, которую перезапишут.";
  record(text, 1.0, 440);
  const before = fingerprintOf(text, voice);
  assert.notEqual(before, "");

  record(text, 2.5, 880);
  const after = fingerprintOf(text, voice);
  assert.notEqual(after, before, "отпечаток обязан отличать перезаписанное");

  // И через ключ кэша — там, где им пользуется сборка.
  assert.notEqual(voiceKey(text, voice, before), voiceKey(text, voice, after));
});

test("перезапись тем же содержимым отпечаток не меняет", () => {
  // Обратная половина: отпечаток обязан меняться ТОГДА И ТОЛЬКО ТОГДА,
  // когда изменился бы звук. Меняйся он от времени правки или от числа
  // запусков — каждая сборка пересобирала бы все сцены заново.
  const text = "Реплика, которую положат дважды.";
  const file = record(text, 1.0, 440);
  const first = fingerprintOf(text, voice);
  writeFileSync(file, readFileSync(file));
  assert.equal(fingerprintOf(text, voice), first);
});

test("нет записи — отказ называет реплику, куда её класть и под каким именем", () => {
  const text = "Реплика, которой не записали.";
  assert.throws(
    () => recorded.synth(text, voice, join(root, "out.wav")),
    (e: Error & { engineError?: boolean }) => {
      assert.equal(e.engineError, true, "отказ обязан быть отказом движка, а не дампом");
      assert.match(e.message, /нет записи реплики «Реплика, которой не записали\.»/);
      assert.match(e.message, new RegExp(slotFor(text)));
      assert.match(e.message, new RegExp(store.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      return true;
    },
  );
});

test("правила чтения с записанным голосом — отказ, а не чужой слепок", () => {
  // Правила переписывают текст для синтеза; человек читает вслух реплику.
  // Считай мы адрес от переписанной строки — читатель получил бы «нет
  // записи» с именем файла, которого он не мог бы вывести из того, что
  // произносил. Отказ называет причину прямо.
  const text = "Процесс ведёт помощника.";
  assert.throws(
    () => recorded.synth(text, { ...voice, rules: "silero" }, join(root, "out.wav")),
    /не работает с правилами чтения/,
  );
});

test("нечитаемая запись — отказ с именем файла и причиной, а не дамп", () => {
  // Вход сюда приносит ЧЕЛОВЕК: положить в хранилище не тот файл —
  // обычное дело. Прежде отказ внешнего средства уходил наружу как есть,
  // и сборка умирала дампом буфера, по которому не видно ни файла,
  // ни причины.
  const text = "Реплика, положенная не тем файлом.";
  const file = recordingPath(text, voice);
  writeFileSync(file, "не звук вовсе");
  assert.throws(
    () => recorded.synth(text, voice, join(root, "broken.wav")),
    (e: Error & { engineError?: boolean }) => {
      assert.equal(e.engineError, true, "отказ обязан быть отказом движка");
      assert.match(e.message, /запись не читается/);
      assert.match(e.message, new RegExp(slotFor(text)), "отказ обязан называть файл");
      return true;
    },
  );
});

test("запись без определимой длительности — отказ, а не падение в рендере", () => {
  // Длительность сцены считается из длины звука. Файл, у которого её
  // не определить, прежде доезжал до рендера и ронял его на длине
  // массива — далеко от причины и без единого слова о записи.
  //
  // Состояние нужно СОЗДАТЬ, а не назначить. Пустой файл сюда не годится:
  // `ffmpeg` его отвергает, и отказ приходит из соседней ветки — той,
  // что проверяет предыдущий тест. Годится верный заголовок WAV с нулём
  // отсчётов — то, что оставляет прерванная запись: `ffmpeg` принимает
  // его (код 0), а `ffprobe` отвечает `N/A`, и число получается
  // нечисловым. Проверено исполнением.
  const text = "Реплика без длительности.";
  const file = recordingPath(text, voice);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36, 4); header.write("WAVE", 8);
  header.write("fmt ", 12); header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(48000, 24); header.writeUInt32LE(96000, 28);
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write("data", 36); header.writeUInt32LE(0, 40);
  writeFileSync(file, header);

  assert.throws(
    () => recorded.synth(text, voice, join(root, "nodur.wav")),
    (e: Error & { engineError?: boolean }) => {
      assert.equal(e.engineError, true);
      // Сообщение ожидается ОДНО: чередование скрыло бы, какая ветка
      // сработала, и тест зеленел бы на соседней.
      assert.match(e.message, /не определяется длительность/);
      assert.match(e.message, new RegExp(slotFor(text)));
      return true;
    },
  );
});

test("чужой формат записи приводится к договорному, длительность сохраняется", async () => {
  // Различающее наблюдение: на входе 44,1 кГц и два канала — то, что
  // отдаёт обычный диктофон и что уронило бы сборку, дойди оно до неё
  // как есть (длительность читается из звука, и чужая частота даёт
  // неверное число). Убери приведение формата из движка — тест краснеет
  // на частоте и на числе каналов.
  const text = "Реплика, которую соберут.";
  const src = record(text, 1.75, 440);
  const before = formatOf(src);
  assert.match(before, /sample_rate=44100/, "фикстура обязана быть НЕ в договорном формате");
  assert.match(before, /channels=2/);

  const out = join(root, "said.wav");
  // Договор допускает и обещание, и готовый ответ; этот движок отвечает
  // сразу, потому что читает файл, а не ждёт сети.
  const said = await recorded.synth(text, voice, out);
  assert.equal(said.engine, "recorded");
  assert.equal(said.voice, "человек");
  assert.equal(said.file, out);
  assert.ok(Math.abs(said.duration - 1.75) < 0.02, `длительность ${said.duration}`);

  const after = formatOf(out);
  assert.match(after, /sample_rate=48000/);
  assert.match(after, /channels=1/);
});
