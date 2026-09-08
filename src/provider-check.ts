#!/usr/bin/env node
// Проверка поставщика материала на соответствие договору.
//
// Зачем она есть: договор — внешний контракт, по которому постороннюю
// реализацию пишут на любом языке, не читая исходников инструмента.
// Утверждение «моя программа договору соответствует» нечем подтвердить,
// кроме как проверив её саму. Потребитель у проверки настоящий — тот,
// кто пишет поставщика.
//
// Запуск: provider-check.js <программа>
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const command = process.argv[2];
if (!command) {
  console.error("provider-check.js <программа>\n"
    + "пример: provider-check.js 'python3 /путь/provider.py'");
  process.exit(2);
}

const parts = command.trim().split(/\s+/);
const bin = parts[0]!;
const prefix = parts.slice(1);
const dir = mkdtempSync(join(tmpdir(), "slidecast-provider-check-"));

const call = (args: string[]): { status: number | null; stdout: string; stderr: string } => {
  const r = spawnSync(bin, [...prefix, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.error) return { status: null, stdout: "", stderr: String(r.error.message) };
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
};

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

/** Виды поставщика — они же вход для остальных требований. */
interface KindSpec { about?: unknown; fields?: unknown; required?: unknown }
let kinds: Record<string, KindSpec> = {};

check("программа запускается", () => {
  const r = call(["kinds"]);
  return r.status === null ? `не запустилась: ${r.stderr}` : true;
});

check("kinds отвечает описанием видов в JSON", () => {
  const r = call(["kinds"]);
  if (r.status !== 0) return `код ${r.status}: ${r.stderr.trim().slice(0, 120)}`;
  let parsed: unknown;
  try {
    parsed = JSON.parse(r.stdout);
  } catch {
    return `ответ не JSON: ${r.stdout.trim().slice(0, 120)}`;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return "ответ не объект видов";
  kinds = parsed as Record<string, KindSpec>;
  if (Object.keys(kinds).length === 0) return "поставщик не предлагает ни одного вида";
  return true;
});

check("каждый вид называет поля и их обязательность", () => {
  // Без этого ядру нечем отвергнуть опечатку в имени поля, и содержимое
  // сцены тихо выпадет — тот самый дефект, ради которого состав полей
  // и объявляется.
  const bad: string[] = [];
  for (const [name, spec] of Object.entries(kinds)) {
    if (typeof spec.about !== "string" || !spec.about) bad.push(`${name}: нет пояснения`);
    if (!Array.isArray(spec.fields) || spec.fields.some((f) => typeof f !== "string")) {
      bad.push(`${name}: поля не список строк`);
    }
    if (!Array.isArray(spec.required)
      || spec.required.some((g) => !Array.isArray(g) || g.some((f) => typeof f !== "string"))) {
      bad.push(`${name}: обязательность не список групп`);
    }
  }
  return bad.length === 0 ? true : bad.join("; ");
});

check("page пишет страницу и отвечает объектом с файлом", () => {
  const name = Object.keys(kinds)[0];
  if (!name) return "видов нет — требование непроверяемо";
  const spec = kinds[name]!;
  const fields = Object.fromEntries(
    ((spec.required as string[][] | undefined) ?? []).map((g) => [g[0]!, "значение"]));
  const scene = { id: "проба", provider: "проверяемый", kind: name,
    beats: [{ text: "Такт речи." }], caption: "Такт речи.", fields };
  const out = join(dir, "pages");
  const r = call(["page", "--scene-json", JSON.stringify(scene), "--out", out]);
  if (r.status !== 0) return `код ${r.status}: ${(r.stderr || r.stdout).trim().slice(0, 160)}`;
  let said: { file?: unknown };
  try {
    said = JSON.parse(r.stdout) as { file?: unknown };
  } catch {
    return `ответ не JSON: ${r.stdout.trim().slice(0, 120)}`;
  }
  if (typeof said.file !== "string" || !said.file) return "файл страницы не назван строкой";
  if (!existsSync(said.file)) return `файла нет, хотя код возврата нулевой: ${said.file}`;
  const body = readFileSync(said.file, "utf8");
  if (!body.trim()) return "страница пуста";
  return true;
});

check("отказ виден кодом возврата", () => {
  // Провоцируется тем, что договор объявляет обязательным: у `page`
  // названы два аргумента, и без места для записи выполнить его нельзя.
  const r = call(["page", "--scene-json", "{}"]);
  return r.status === 0 ? "поставщик согласился рисовать, не получив --out" : true;
});

check("в стандартный вывод не попадает лишнее", () => {
  const r = call(["kinds"]);
  if (r.status !== 0) return "kinds не отработал — требование непроверяемо";
  const text = r.stdout.trim();
  return text.startsWith("{") ? true : `вывод начинается не с JSON: ${text.slice(0, 80)}`;
});

rmSync(dir, { recursive: true, force: true });

const bad = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "  ok  " : "ПРОВАЛ"}  ${r.name}${r.why ? " — " + r.why : ""}`);
console.log(`\n${results.length - bad.length} из ${results.length} требований договора выполнено`);
process.exit(bad.length ? 1 : 0);
