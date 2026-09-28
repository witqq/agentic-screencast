// Общее для модулей набора: запуск команд, чтение README и документированных команд, учёт
// результатов. Проверки пишут результат через check, а suite.ts печатает итог.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { SpawnSyncReturns } from "node:child_process";
import { fileURLToPath } from "node:url";
export const HERE = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const run = (cmd: string, args: string[], opts: Record<string, unknown> = {}): SpawnSyncReturns<string> =>
  spawnSync(cmd, args, { cwd: HERE, encoding: "utf8", ...opts });

/** npm 10 may print prepare/build output before a --json report. */
export const jsonSuffix = <T>(output: string): T => {
  for (let at = output.lastIndexOf("["); at >= 0; at = output.lastIndexOf("[", at - 1)) {
    try { return JSON.parse(output.slice(at)) as T; }
    catch { /* Keep looking for the top-level report opening bracket. */ }
  }
  return JSON.parse(output) as T;
};

/** Tokenize executable JS, skipping comments and template-literal documentation. */
export const moduleSpecifiers = (source: string): string[] => {
  const tokens: Array<{ kind: "id" | "str" | "punct"; text: string }> = [];
  for (let i = 0; i < source.length;) {
    const c = source[i]!;
    if (/\s/.test(c)) { i++; continue; }
    if (c === "/" && source[i + 1] === "/") {
      i = source.indexOf("\n", i + 2);
      if (i < 0) break;
      continue;
    }
    if (c === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end < 0 ? source.length : end + 2;
      continue;
    }
    if (c === "`" || c === "'" || c === '"') {
      const quote = c;
      const start = ++i;
      while (i < source.length) {
        if (source[i] === "\\") { i += 2; continue; }
        if (source[i] === quote) break;
        i++;
      }
      if (quote !== "`") tokens.push({ kind: "str", text: source.slice(start, i) });
      i++;
      continue;
    }
    if (/[\w$]/.test(c)) {
      const start = i++;
      while (i < source.length && /[\w$]/.test(source[i]!)) i++;
      tokens.push({ kind: "id", text: source.slice(start, i) });
      continue;
    }
    tokens.push({ kind: "punct", text: c });
    i++;
  }
  const found: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (token.kind !== "id") continue;
    if (["import", "require"].includes(token.text) && tokens[i + 1]?.text === "("
      && tokens[i + 2]?.kind === "str") found.push(tokens[i + 2]!.text);
    if (token.text === "import" || token.text === "export") {
      if (token.text === "import" && tokens[i + 1]?.kind === "str") found.push(tokens[i + 1]!.text);
      for (let j = i + 1; j < tokens.length && j < i + 24 && tokens[j]?.text !== ";"; j++) {
        if (tokens[j]?.text === "from" && tokens[j + 1]?.kind === "str") {
          found.push(tokens[j + 1]!.text);
          break;
        }
      }
    }
    if (token.text === "createRequire" && tokens[i + 1]?.text === "(") {
      let depth = 1;
      let j = i + 2;
      for (; j < tokens.length && depth > 0; j++) {
        if (tokens[j]?.text === "(") depth++;
        if (tokens[j]?.text === ")") depth--;
      }
      if (tokens[j]?.text === "(" && tokens[j + 1]?.kind === "str") found.push(tokens[j + 1]!.text);
    }
  }
  return found;
};

export const results: Array<[string, boolean, string]> = [];
// Проверка может быть и обещанием: часть предметов измеряется только
// в браузере, а он отвечает не сразу. Ждём каждую по очереди — порядок
// вывода тогда совпадает с порядком в файле, и красная строка находится
// глазами там, где написана.
export const check = async (name: string, fn: () => true | string | Promise<true | string>): Promise<void> => {
  try { const r = await fn(); results.push([name, r === true, r === true ? "" : String(r)]); }
  catch (e) { results.push([name, false, String((e as Error).message).slice(0, 200)]); }
};

// Команды берутся из обеих публичных README, а не пишутся здесь заново. Иначе набор гоняет
// свои команды, документированные остаются непроверенными, и расхождение
// документа с кодом снова становится невидимым — уже проходили.
// Запускаются они в каталоге примера: README обещает читателю ровно это.
export const README = readFileSync(resolve(HERE, "README.md"), "utf8");
export const README_RU = readFileSync(resolve(HERE, "README.ru.md"), "utf8");
export const REFERENCE = readFileSync(resolve(HERE, "docs", "reference.md"), "utf8");
export const PUBLIC_READMES = `${README}\n${README_RU}\n${REFERENCE}`;
// Хвостовой комментарий отрезается: иначе его слова уезжают в аргументы
// команды, и в них может оказаться что угодно, вплоть до похожего на флаг.
// Команды берутся в той форме, в какой README их и печатает: инструмент
// вызывается как команда, а не запуском файла. Форма документа и форма
// запуска обязаны совпадать — иначе читатель копирует одно, а проверяется
// другое.
export const DOC_CMDS = [...new Set([...PUBLIC_READMES.matchAll(/^(?:npx )?agentic-screencast (.*)$/gm)]
  .map((m) => m[1].replace(/\s+#.*$/, "").trim())
  .filter((line) => !line.endsWith("\\")))];
export const ENTRY = resolve(HERE, "dist", "agentic-screencast.js");
export const EXAMPLE = resolve(HERE, "example");
// Разбор как в оболочке: у одной из команд аргумент — объект в кавычках.
export const tokenize = (s: string): string[] => [...s.matchAll(/'([^']*)'|"([^"]*)"|(\S+)/g)]
  .map((m) => (m[1] ?? m[2] ?? m[3])!);
export const docCmd = (sub: string): string | undefined => DOC_CMDS.find((c) => tokenize(c)[0] === sub);
// Учёт ведётся по СТРОКАМ, а не по подкомандам: пропуск по подкоманде
// оставлял бы вторую и последующие строки `check` или `verify` в README
// не запущенными никем — первые две проверки берут только первое вхождение.
export const RAN = new Set<string>();
export const runDoc = (line: string, extra: string[] = []): SpawnSyncReturns<string> => {
  RAN.add(line);
  return run("node", [ENTRY, ...tokenize(line), ...extra], { cwd: EXAMPLE });
};
