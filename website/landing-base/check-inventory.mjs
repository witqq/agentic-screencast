// Сверка инвентаря с самим инструментом: каждый вид сцены, каждое поле сцены и шапки, каждая
// команда и каждое правило lint названы в features.md и features.ru.md. Запуск из корня
// репозитория после npm run build: node website/landing-base/check-inventory.mjs
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const cli = resolve(here, "..", "..", "dist", "agentic-screencast.js");
const schema = JSON.parse(execFileSync("node", [cli, "schema"], { encoding: "utf8" }));
const help = execFileSync("node", [cli, "help"], { encoding: "utf8" });
const vertical = execFileSync("node", [cli, "help", "vertical"], { encoding: "utf8" });
const source = readFileSync(resolve(here, "..", "..", "src", "source.ts"), "utf8");

const kinds = Object.keys(schema.$defs);
const sceneFields = [...new Set(kinds.flatMap((k) => Object.keys(schema.$defs[k].properties ?? {})))];
const filmFields = JSON.parse(`[${/FILM_FIELDS = \[([^\]]+)\]/.exec(source)[1]}]`);
const commands = [...new Set([...help.matchAll(/^\s+agentic-screencast ([a-z|-]+)/gm)].flatMap((m) => m[1].split("|")))];
const rules = [...vertical.matchAll(/\(([a-z]+(?:-[a-z]+)+)\)/g)].map((m) => m[1]);

let failed = 0;
for (const file of ["features.md", "features.ru.md"]) {
  const text = readFileSync(resolve(here, file), "utf8");
  // Имя считается названным, только если оно стоит внутри одного фрагмента кода `…`.
  const spans = text.split("`").filter((_, i) => i % 2 === 1);
  const has = (name) => spans.some((c) => new RegExp(`(^|[^\\w.-])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\w-])`).test(c));
  const missing = [
    ...kinds.filter((k) => !has(k)).map((k) => `kind ${k}`),
    ...sceneFields.filter((f) => !has(f)).map((f) => `scene field ${f}`),
    ...filmFields.filter((f) => !has(f)).map((f) => `film field ${f}`),
    ...commands.filter((c) => !has(c)).map((c) => `command ${c}`),
    ...rules.filter((r) => !text.includes(r)).map((r) => `lint rule ${r}`),
  ];
  if (missing.length) { failed++; console.log(`${file}: missing ${missing.join(", ")}`); }
  else console.log(`${file}: ${kinds.length} kinds, ${sceneFields.length} scene fields, ${filmFields.length} film fields, ${commands.length} commands, ${rules.length} lint rules — all named`);
}
process.exit(failed ? 1 : 0);
