#!/usr/bin/env node
// Проверка движка голоса на соответствие договору.
//
// Зачем она есть: договор — внешний контракт, по которому постороннюю
// реализацию пишут на любом языке, не читая исходников инструмента.
// Утверждение «моя программа договору соответствует» нечем подтвердить,
// кроме как проверив её саму, а читать чужой код инструмент не может
// и не должен. Потребитель у проверки настоящий — тот, кто пишет движок.
//
// Она проверяет ЧУЖУЮ программу, а не то, что какая-то другая проверка
// запускалась. Вывод различает соответствующий движок от несоответствующего
// поимённо: каждое требование договора названо и получает свой вердикт.
//
// Запуск: voice-check.js <программа> [--voice-json '{"engine":"…","name":"…"}']
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const FFPROBE: string = require("@ffprobe-installer/ffprobe").path;

// Без аргумента проверяется ПОСТАВЛЯЕМАЯ реализация — та, что выставляет
// встроенные движки наружу тем же интерфейсом. Так команда из README
// работает из любого рабочего каталога: путь к ней вычисляется от места
// этого файла, а не от того, откуда её позвали.
const REFERENCE = `${process.execPath} ${resolve(dirname(fileURLToPath(import.meta.url)), "voice-cli.js")}`;
const first = process.argv[2];
const command = !first || first.startsWith("--") ? REFERENCE : first;
const vjIndex = process.argv.indexOf("--voice-json");
const voice: Record<string, unknown> = vjIndex > 0
  ? JSON.parse(process.argv[vjIndex + 1]!) as Record<string, unknown>
  : command === REFERENCE
    ? { engine: "stub", name: "nullvoice", cps: 18 }
    : { engine: command, name: "" };

const TEXT = "Проверка договора: одна короткая фраза.";
const dir = mkdtempSync(join(tmpdir(), "slidecast-voice-check-"));
const out = join(dir, "take.wav");

interface Result { name: string; ok: boolean; why: string }
const results: Result[] = [];
const check = (name: string, fn: () => true | string): void => {
  try {
    const r = fn();
    results.push({ name, ok: r === true, why: r === true ? "" : String(r) });
  } catch (e) {
    results.push({ name, ok: false, why: String((e as Error).message).slice(0, 200) });
  }
};

// Команду можно назвать вместе с тем, чем её запускать: «python3 voice.py».
const parts = command.trim().split(/\s+/);
const bin = parts[0]!;
const prefix = parts.slice(1);

const call = (args: string[]): { status: number | null; stdout: string; stderr: string } => {
  const r = spawnSync(bin, [...prefix, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.error) return { status: null, stdout: "", stderr: String(r.error.message) };
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
};

// 1. Программа вообще запускается.
check("программа запускается", () => {
  const r = call(["voices"]);
  return r.status === null ? `не запустилась: ${r.stderr}` : true;
});

// 2. `voices` отвечает списком имён в JSON и ничем больше.
check("voices отвечает списком JSON", () => {
  const r = call(["voices"]);
  if (r.status !== 0) return `код ${r.status}: ${r.stderr.trim().slice(0, 120)}`;
  let parsed: unknown;
  try {
    parsed = JSON.parse(r.stdout);
  } catch {
    return `ответ не JSON: ${r.stdout.trim().slice(0, 120)}`;
  }
  if (!Array.isArray(parsed)) return "ответ не список";
  if (!parsed.every((v) => typeof v === "string")) return "в списке не только строки";
  return true;
});

// 3. `synth` пишет файл и отвечает объектом с длительностью.
check("synth пишет файл и отвечает объектом", () => {
  const r = call(["synth", "--voice-json", JSON.stringify(voice), "--text", TEXT, "--out", out]);
  if (r.status !== 0) return `код ${r.status}: ${(r.stderr || r.stdout).trim().slice(0, 160)}`;
  if (!existsSync(out)) return "файла нет, хотя код возврата нулевой";
  let said: { file?: string; duration?: number };
  try {
    said = JSON.parse(r.stdout) as { file?: string; duration?: number };
  } catch {
    return `ответ не JSON: ${r.stdout.trim().slice(0, 120)}`;
  }
  if (typeof said.duration !== "number" || !(said.duration > 0)) {
    return `длительность не названа числом больше нуля: ${String(said.duration)}`;
  }
  return true;
});

// 4. Звук — WAV 48 кГц моно. Из его длины выводится длительность сцены,
//    поэтому сжатый формат или иная частота ломают сборку молча.
check("звук — WAV 48 кГц моно", () => {
  if (!existsSync(out)) return "файла нет — предыдущее требование не выполнено";
  const probe = spawnSync(FFPROBE, ["-v", "error", "-select_streams", "a:0",
    "-show_entries", "stream=codec_name,sample_rate,channels",
    "-of", "default=nw=1:nk=0", out], { encoding: "utf8" });
  if (probe.status !== 0) return `файл не читается как звук: ${probe.stderr.slice(0, 120)}`;
  const got = Object.fromEntries(probe.stdout.trim().split("\n")
    .map((l) => l.split("=") as [string, string]));
  const bad: string[] = [];
  if (!String(got.codec_name).startsWith("pcm")) bad.push(`кодек ${got.codec_name}`);
  if (got.sample_rate !== "48000") bad.push(`частота ${got.sample_rate}`);
  if (got.channels !== "1") bad.push(`каналов ${got.channels}`);
  return bad.length === 0 ? true : bad.join(", ");
});

// 5. Отказ виден кодом возврата, а не только словами.
//
// Провоцируется тем, что договор объявляет обязательным: у `synth`
// названы три аргумента, и без места для записи выполнить его нельзя.
// Прежде провокацией было несуществующее имя голоса — но такого правила
// договор не объявляет, движок вправе голоса не перечислять вовсе,
// и требование оказалось бы взято из исходников, а не из текста.
check("отказ виден кодом возврата", () => {
  const r = call(["synth", "--voice-json", JSON.stringify(voice), "--text", TEXT]);
  if (r.status === 0) return "движок согласился синтезировать, не получив --out";
  return true;
});

// 6. `probe` отвечает отпечатком строкой — возможно, пустой.
//
// Пустая строка означает «звук зависит только от текста и данных
// голоса»; это положительный ответ, а не отказ. Отказ подкоманды
// отпечатка нарушает договор: инструмент не может отличить «нечего
// сказать» от «не смог сказать», и перезапись реплики молча пропадёт.
check("probe отвечает отпечатком строкой", () => {
  const r = call(["probe", "--voice-json", JSON.stringify(voice), "--text", TEXT]);
  if (r.status !== 0) return `код ${r.status}: ${(r.stderr || r.stdout).trim().slice(0, 120)}`;
  let parsed: { fingerprint?: unknown };
  try {
    parsed = JSON.parse(r.stdout) as { fingerprint?: unknown };
  } catch {
    return `ответ не JSON: ${r.stdout.trim().slice(0, 120)}`;
  }
  if (typeof parsed.fingerprint !== "string") return "отпечаток не назван строкой";
  return true;
});

// 7. Отпечаток устойчив: тот же вход — то же значение. Иначе он обесценивал
//    бы кэш на каждой сборке, а не тогда, когда изменился звук.
check("отпечаток устойчив на одном и том же входе", () => {
  const once = call(["probe", "--voice-json", JSON.stringify(voice), "--text", TEXT]);
  if (once.status !== 0) return "probe не отработал — требование непроверяемо";
  const twice = call(["probe", "--voice-json", JSON.stringify(voice), "--text", TEXT]);
  return once.stdout.trim() === twice.stdout.trim()
    ? true : "два запроса подряд дали разные отпечатки";
});

// 8. Стандартный вывод несёт только ответ. Посторонняя строка ломает
//    разбор у всякого, кто читает ответ программно.
check("в стандартный вывод не попадает лишнее", () => {
  const r = call(["voices"]);
  if (r.status !== 0) return "voices не отработал — требование непроверяемо";
  const text = r.stdout.trim();
  return text.startsWith("[") || text.startsWith("{")
    ? true : `вывод начинается не с JSON: ${text.slice(0, 80)}`;
});

rmSync(dir, { recursive: true, force: true });

const bad = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "  ok  " : "ПРОВАЛ"}  ${r.name}${r.why ? " — " + r.why : ""}`);
console.log(`\n${results.length - bad.length} из ${results.length} требований договора выполнено`);
process.exit(bad.length ? 1 : 0);
