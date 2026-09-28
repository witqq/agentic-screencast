// Каждое поле сценария и каждая команда названы в скилле или в справке.
//
// Новая возможность, о которой не знает ни скилл, ни `help`, для агента не
// существует: он пишет сценарий по тому, что прочёл. Список берётся из самого
// продукта — разбора, поставщиков и ветвей точки входа, — а не пишется здесь.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { allKinds } from "../../schema.js";
import { COMMON, FILM_FIELDS } from "../../source.js";

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENTRY = resolve(DIST, "agentic-screencast.js");

test("every scenario field and every command is named in the skill or the help", () => {
  const cli = readFileSync(ENTRY, "utf8");
  const commands = [...new Set([...cli.matchAll(/case "([a-z-]+)":/gu)].map((m) => m[1]!))].filter((c) => !c.startsWith("-"));
  const topics = [...cli.matchAll(/topic === "([a-z]+)"/gu)].map((m) => m[1]!);
  assert.ok(commands.length > 15 && topics.length > 8, "the entry point was read");
  const help = [execFileSync(process.execPath, [ENTRY, "help"], { encoding: "utf8" }),
    ...topics.map((t) => execFileSync(process.execPath, [ENTRY, "help", t], { encoding: "utf8" }))].join("\n");
  const skill = readFileSync(resolve(DIST, "..", "skills", "agentic-screencast", "SKILL.md"), "utf8");
  const text = `${skill}\n${help}`;
  const fields = [...new Set([...COMMON, ...FILM_FIELDS, ...allKinds().flatMap((k) => k.spec.fields)])];
  // Названо — ещё не описано: имя, стоящее только в перечне через запятую, агенту ничего не
  // объясняет. Имя засчитывается в строке, где кроме названий полей и команд есть объяснение —
  // хотя бы четыре слова прозы.
  const names = new Set([...fields, ...commands]);
  // Строка вместе со строками продолжения — теми, что под ней с большим отступом: так в справке
  // пишется команда и её объяснение.
  const lines = text.split("\n");
  const indent = (l: string): number => l.length - l.trimStart().length;
  const blocks = lines.map((l, i) => {
    let j = i + 1;
    while (j < lines.length && lines[j]!.trim() && indent(lines[j]!) > indent(l)) j++;
    return lines.slice(i, j).join(" ");
  });
  const described = (name: string): boolean => blocks.some((block) => {
    if (!new RegExp(`(^|[^\\w-])${name}([^\\w-]|$)`, "u").test(block.split("  ").join(" ").slice(0, 200))) return false;
    const prose = (block.match(/[A-Za-z][A-Za-z'-]{2,}/gu) ?? []).filter((w) => !names.has(w) && w !== "and" && w !== "agentic-screencast");
    return prose.length >= 4;
  });
  const missing = [...fields.map((f) => `field ${f}`), ...commands.map((c) => `command ${c}`)]
    .filter((item) => !described(item.split(" ")[1]!));
  assert.deepEqual(missing, [], "named only in a bare list, without a line that explains it");
  // Флаги, которые меняют сборку, а не поле сценария: язык варианта, правило перевода и
  // вертикаль из горизонтального сценария.
  for (const [what, re] of [["--lang", /--lang \w+/u], ["lint with --lang", /lint[^\n]*--lang/u], ["build --format vertical", /build[^\n]*--format vertical/u]] as const) {
    assert.match(text, re, `the skill or the help names ${what}`);
  }
});

test("the schema gives every field of every kind and of the header a description, not only its name", () => {
  const film = execFileSync(process.execPath, [ENTRY, "schema", "film"], { encoding: "utf8" });
  const kinds = allKinds().map((k) => (k.kind === k.provider ? k.provider : `${k.provider}.${k.kind}`));
  const bare: string[] = [];
  for (const out of [film, ...kinds.map((k) => execFileSync(process.execPath, [ENTRY, "schema", k], { encoding: "utf8" }))]) {
    for (const m of out.matchAll(/^ {2}([A-Za-z.]+): ?(.*)$/gmu)) if (!m[2]!.trim()) bare.push(m[1]!);
  }
  assert.deepEqual([...new Set(bare)], [], "a field printed by schema without a description");
});
