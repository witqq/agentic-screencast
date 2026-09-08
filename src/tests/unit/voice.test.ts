// Договор о движке голоса со стороны инструмента.
//
// Отдельно проверяется то, ради чего договор и заводился: сборщик
// не должен знать имён движков, отпечаток не должен обесценивать
// уже синтезированное, а отказ обязан приходить причиной, а не дампом
// запуска процесса.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { engineFor, fingerprint, splitCommand, voiceKey, EngineError } from "../../voice/index.js";
import { BUILTIN, isBuiltin } from "../../voice/builtin.js";

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("поставляемые движки разрешаются по имени", () => {
  for (const name of ["speechkit", "stub", "say", "piper"]) {
    assert.ok(isBuiltin(name), `нет движка ${name}`);
    assert.equal(engineFor({ engine: name }).name, name);
  }
});

test("незнакомое имя становится командой, а не молчаливым отказом", () => {
  // Так подключается посторонняя реализация: имя движка — это путь
  // или имя программы в PATH.
  const engine = engineFor({ engine: "/нет/такой/программы" });
  assert.equal(engine.name, "/нет/такой/программы");
  assert.throws(() => engine.voices(), (e: Error) => {
    assert.ok((e as EngineError).engineError, "отказ обязан быть отказом движка");
    assert.match(e.message, /программа не найдена|program not found/);
    return true;
  });
});

test("движок без имени — внятный отказ", () => {
  assert.throws(() => engineFor({}), /не назван движок|no engine named/);
});

test("имя движка может нести и то, чем его запускать", () => {
  // Иначе посторонняя реализация обязана быть исполняемым файлом,
  // и договор упирался бы в права доступа, а не в поведение.
  assert.deepEqual(splitCommand("python3 /путь/voice.py"), ["python3", ["/путь/voice.py"]]);
  assert.deepEqual(splitCommand("  ./движок  "), ["./движок", []]);
});

test("у синтеза отпечатка нет, и это не случайность", async () => {
  // Пустой отпечаток означает «звук зависит только от текста и данных
  // голоса». Именно поэтому появление подкоманды не обесценило ни одной
  // уже синтезированной реплики: сборка подмешивает отпечаток в ключ
  // только когда он непуст.
  for (const name of Object.keys(BUILTIN)) {
    assert.equal(await fingerprint("текст", { engine: name, name: "x" }), "");
  }
});

test("непустой отпечаток доезжает до вызывающего", async () => {
  const dir = mkdtempSync(join(tmpdir(), "slidecast-engine-"));
  const prog = join(dir, "engine.mjs");
  writeFileSync(prog, `
const cmd = process.argv[2];
if (cmd === "probe") { console.log(JSON.stringify({ fingerprint: "отпечаток-1" })); }
else if (cmd === "voices") { console.log("[]"); }
else { process.exit(1); }
`);
  try {
    const fp = await fingerprint("текст", { engine: `${process.execPath} ${prog}` });
    assert.equal(fp, "отпечаток-1");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("отказ подкоманды отпечатка приходит отказом, а не пустой строкой", async () => {
  // Дефект, который это ловит: сломавшийся `probe` читался как «звук
  // зависит только от текста и данных голоса». Тогда перезаписанная
  // человеком реплика не доехала бы до готового файла, а сборка
  // выглядела бы успешной — ровно то, ради чего отпечаток и заводился.
  const dir = mkdtempSync(join(tmpdir(), "slidecast-engine-"));
  const prog = join(dir, "сломанный.mjs");
  writeFileSync(prog, `
const cmd = process.argv[2];
if (cmd === "voices") console.log("[]");
else if (cmd === "probe") process.exit(3);
else console.log("{}");
`);
  try {
    await assert.rejects(fingerprint("текст", { engine: `${process.execPath} ${prog}` }),
      /отказал \(код 3\)|failed \(code 3\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("посторонний вывод вместо JSON — отказ с причиной, а не разбор мусора", () => {
  const dir = mkdtempSync(join(tmpdir(), "slidecast-engine-"));
  const prog = join(dir, "болтливый.mjs");
  writeFileSync(prog, 'console.log("готово!");\n');
  try {
    const engine = engineFor({ engine: `${process.execPath} ${prog}` });
    assert.throws(() => engine.voices(), /ответил на voices не JSON|answered voices with non-JSON/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("проверка соответствия краснеет на нарушении договора поимённо", () => {
  // Отрицательный контроль: без него «проверка зелена» означало бы лишь
  // «мой движок зелен», а не «проверка умеет краснеть».
  const dir = mkdtempSync(join(tmpdir(), "slidecast-bad-engine-"));
  const prog = join(dir, "плохой.mjs");
  // Нарушает три требования: отвечает не JSON, соглашается на любой голос
  // и не пишет файла.
  writeFileSync(prog, `
const cmd = process.argv[2];
if (cmd === "voices") console.log("голоса: раз, два");
else console.log("сделано");
`);
  chmodSync(prog, 0o644);
  try {
    const r = spawnSync(process.execPath, [join(DIST, "voice-check.js"),
      `${process.execPath} ${prog}`], { encoding: "utf8" });
    assert.notEqual(r.status, 0, "проверка обязана краснеть на негодном движке");
    assert.match(r.stdout, /ПРОВАЛ {2}voices отвечает списком JSON/);
    assert.match(r.stdout, /ПРОВАЛ {2}synth пишет файл/);
    assert.match(r.stdout, /ПРОВАЛ {2}отказ виден кодом возврата/);
    assert.match(r.stdout, /ПРОВАЛ {2}в стандартный вывод не попадает лишнее/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("программная форма договора отдаёт настоящий отпечаток движка", () => {
  // Дефект, который это ловит: программа отвечала пустым отпечатком
  // за ЛЮБОЙ движок. Синтезирующим это верно, а записанному голосу нет,
  // и перезапись реплики не доехала бы до готового файла: ключ кэша
  // остался бы прежним, сборка выглядела бы успешной. В самой сборке
  // это не проявляется — она зовёт поставляемый движок напрямую, —
  // поэтому наблюдение идёт ЧЕРЕЗ ПРОГРАММУ.
  const dir = mkdtempSync(join(tmpdir(), "slidecast-probe-"));
  const store = join(dir, "recordings");
  mkdirSync(store, { recursive: true });
  const voice = { engine: "recorded", name: "человек", dir: store };
  const text = "Реплика, которую перезапишут.";
  const ask = (): string => {
    const r = spawnSync(process.execPath, [join(DIST, "voice-cli.js"), "probe",
      "--voice-json", JSON.stringify(voice), "--text", text], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    return (JSON.parse(r.stdout) as { fingerprint: string }).fingerprint;
  };
  try {
    assert.equal(ask(), "", "записи нет — отпечатка нет");
    writeFileSync(join(store, createHash("md5").update(text).digest("hex") + ".wav"), "звук раз");
    const first = ask();
    assert.notEqual(first, "", "запись есть — отпечаток обязан быть");
    writeFileSync(join(store, createHash("md5").update(text).digest("hex") + ".wav"), "звук два");
    assert.notEqual(ask(), first, "перезапись обязана менять отпечаток");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("проверка соответствия зелена на поставляемой реализации", () => {
  const r = spawnSync(process.execPath, [join(DIST, "voice-check.js")], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /из \d+ требований договора выполнено/);
  assert.doesNotMatch(r.stdout, /ПРОВАЛ/);
});

test("пустой отпечаток не меняет ключ кэша звука", () => {
  // Единственное место продукта, где ошибка стоит денег: подмешай
  // отпечаток безусловно — и все уже оплаченные реплики окажутся
  // «не в кэше», а сборка молча уйдёт синтезировать их заново.
  const speech = "Это Мойра.";
  const voice = { engine: "speechkit", name: "kuznetsov", speed: 1.2 };
  const expected = createHash("md5").update(JSON.stringify([speech, voice])).digest("hex");
  assert.equal(voiceKey(speech, voice, ""), expected);
});

test("непустой отпечаток меняет ключ кэша звука", () => {
  // Обратная сторона того же правила: перезаписанная человеком реплика
  // обязана перестать попадать в прежний файл кэша.
  const speech = "Это Мойра.";
  const voice = { engine: "recorded", name: "я" };
  const base = voiceKey(speech, voice, "");
  assert.notEqual(voiceKey(speech, voice, "отпечаток-1"), base);
  assert.notEqual(voiceKey(speech, voice, "отпечаток-2"), voiceKey(speech, voice, "отпечаток-1"));
  assert.equal(voiceKey(speech, voice, "отпечаток-1"), voiceKey(speech, voice, "отпечаток-1"));
});
