// Поставщик страницы agentic-report: сцена — отчёт, презентация или лендинг, собранные из
// декларативного Markdown компилятором agentic-report.
//
// Зачем отдельный поставщик, а не `page` с готовым HTML. Отчёт живёт исходником: его правят
// словами, и сцена обязана показывать последнюю правку, а не забытую сборку. Поэтому страница
// собирается при каждой генерации сцены из `report.md`, а камера наезжает на её блоки по тем же
// якорям, что знает сам отчёт: `data-review-target` у блока и id у раздела.
//
// Компилятор — необязательная зависимость: кто не снимает отчёты, его не ставит. Договор
// поставщика синхронный, а `buildReport` — асинхронный, поэтому сборка идёт отдельным процессом.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import type { KindSpec, Provider } from "./types.js";
import type { Film, RawScene } from "../source.js";
import { SourceError } from "../source.js";
import { msg } from "../msg.js";
import { PRODUCT_ROOT } from "../self-hash.js";

/**
 * Поля наезда и подсветки — те же, что у готовой страницы: отчёт в кадре — плотный экран, и
 * зритель узнаёт место, о котором говорит речь, а не читает страницу целиком.
 */
const report: KindSpec = {
  about: "a page built by agentic-report from its Markdown source; the camera frames its blocks by data-review-target or section id",
  fields: ["report", "target", "mustRead", "zoom", "spotFrom", "focus", "at"],
  // Язык отчёта — язык его исходника: переводится файлом (`report.ru`), а не полем.
  shown: [],
  staging: ["report", "target", "mustRead", "zoom", "spotFrom", "focus", "at"],
  required: [["report"]],
  offline: true,
  silentOk: true,
  check: {
    mustReadSize: 16,
    targetShareRawMax: 0.5,
    targetShareFullMax: 1.15,
    coverShareMin: 0.85,
    targetShareMin: 0.002,
  },
  effects: {
    zoom: { from: "5%", to: "35%" },
    spot: { from: "55%", to: "100%" },
    cursor: { hidden: true, from: 0, to: 0.01, start: [-500, -500] },
    caption: { from: 9999 },
    fade: { in: 0.3, out: 0.3 },
  },
};

/**
 * Где лежит компилятор: у проекта, который снимает, либо рядом с самим инструментом. Пакет отдаёт
 * только ESM-экспорт, и `require.resolve` его не видит, поэтому каталог ищется подъёмом по
 * `node_modules`, а вход — по полю `exports` его манифеста.
 */
function compilerEntry(filmDir: string): string {
  for (const start of [resolve(filmDir), PRODUCT_ROOT]) {
    for (let dir = start; ; dir = dirname(dir)) {
      const manifest = join(dir, "node_modules", "agentic-report", "package.json");
      if (existsSync(manifest)) {
        const pkg = JSON.parse(readFileSync(manifest, "utf8")) as { exports?: Record<string, { import?: string } | string>; main?: string };
        const dot = pkg.exports?.["."];
        const rel = typeof dot === "string" ? dot : dot?.import ?? pkg.main ?? "index.js";
        return join(dirname(manifest), rel);
      }
      if (dirname(dir) === dir) break;
    }
  }
  throw new SourceError(msg("report.noCompiler"));
}

/**
 * Верхняя панель отчёта и всё, что из неё открывается, — переключатели схемы и темы, ревью, — в
 * ролике ничего не делают и только занимают кадр: сцена снимает страницу без панели, если автор не
 * назвал эти ключи сам. Ревью и выбор темы открываются только из панели, поэтому без неё
 * компилятор требует выключить и их.
 */
export const SCENE_KEYS: ReadonlyArray<[string, string]> = [
  ["topbar", "false"], ["review", "false"], ["schemeToggle", "false"], ["themeSwitcher", "false"]];

export function sceneSource(markdown: string, keys: ReadonlyArray<[string, string]> = SCENE_KEYS): string {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/u.exec(markdown);
  const head = m ? m[1]! : "";
  const add = keys.filter(([k]) => !new RegExp(`^${k}\\s*:`, "mu").test(head)).map(([k, v]) => `${k}: ${v}`);
  if (!add.length) return markdown;
  return m ? `---\n${head}\n${add.join("\n")}\n---\n${markdown.slice(m[0].length)}` : `---\n${add.join("\n")}\n---\n${markdown}`;
}

export const reportProvider: Provider = {
  name: "report",
  kinds: () => ({ report }),
  validate: (scene: RawScene, film: Film): void => {
    const file = resolve(film.dir ?? ".", String(scene.fields.report ?? ""));
    if (!existsSync(file)) throw new SourceError(msg("report.notFound", { id: scene.id, path: file }));
  },
  page: (scene: RawScene, outDir: string, film: Film): string => {
    const input = resolve(film.dir ?? ".", String(scene.fields.report ?? ""));
    if (!existsSync(input)) throw new SourceError(msg("report.notFound", { id: scene.id, path: input }));
    const entry = compilerEntry(film.dir ?? ".");
    // Копия исходника рядом с ним: относительные пути отчёта (данные, картинки, частичные файлы)
    // остаются верными, а исходник автора не трогается.
    const staged = join(dirname(input), `.${basename(input, ".md")}.scene.md`);
    writeFileSync(staged, sceneSource(readFileSync(input, "utf8")));
    const output = join(outDir, `${scene.id}.html`);
    const script = "const [entry, input, output] = process.argv.slice(1);"
      + "import(require('node:url').pathToFileURL(entry).href)"
      + ".then((m) => m.buildReport({ input, output, format: 'single-file' }))"
      + ".catch((e) => { console.error(e && e.message ? e.message : String(e)); process.exit(1); });";
    const r = spawnSync(process.execPath, ["-e", script, entry, staged, output], { encoding: "utf8" });
    if (r.status !== 0 || !existsSync(output)) {
      throw new SourceError(msg("report.buildFailed", { id: scene.id, why: (r.stderr || r.stdout || "").trim().split("\n")[0] ?? "" }));
    }
    return output;
  },
};
