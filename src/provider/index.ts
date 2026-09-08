// Разрешение поставщика материала: поставляемый — прямым вызовом,
// посторонний — запуском программы по договору.
//
// Ядро нигде не ветвится по ИМЕНИ поставщика и не знает ни одного вида
// сцены: оно спрашивает у того, кого назвал заголовок сцены, и одинаково
// поступает с любым ответом. Тот же приём, что и с движком голоса.
import { spawnSync } from "node:child_process";
import { pageProvider } from "./page.js";
import { slidesProvider } from "./slides/index.js";
import { videoProvider } from "./video.js";
import type { KindSpec, Provider } from "./types.js";
import type { Film, RawScene } from "../source.js";
import { msg } from "../msg.js";

export type { KindSpec, Provider } from "./types.js";

/** Отказ поставщика: наружу идёт причина словами, а не дамп запуска. */
export class ProviderError extends Error {
  readonly providerError = true;
}

export const BUILTIN: Record<string, Provider> = {
  [slidesProvider.name]: slidesProvider,
  [pageProvider.name]: pageProvider,
  [videoProvider.name]: videoProvider,
};

export const isBuiltin = (name: string): boolean => Object.hasOwn(BUILTIN, name);

/** Команда вместе с тем, чем её запускать: «python3 /путь/prov.py». */
export function splitCommand(command: string): [string, string[]] {
  const parts = command.trim().split(/\s+/);
  return [parts[0]!, parts.slice(1)];
}

function external(command: string): Provider {
  const [bin, prefix] = splitCommand(command);
  const call = (args: string[]): string => {
    const r = spawnSync(bin, [...prefix, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (r.error) {
      throw new ProviderError((r.error as NodeJS.ErrnoException).code === "ENOENT"
        ? msg("provider.notFound", { command })
        : msg("provider.failed", { command, code: "—", said: String(r.error.message) }));
    }
    if (r.status !== 0) {
      const said = (r.stderr || r.stdout || "").trim().split("\n")[0] ?? "";
      throw new ProviderError(msg("provider.failed", { command, code: String(r.status), said }));
    }
    return r.stdout;
  };
  /** Ответ обязан быть JSON и ничем больше: посторонний вывод — нарушение. */
  const json = <T>(out: string, what: string): T => {
    try {
      return JSON.parse(out) as T;
    } catch {
      throw new ProviderError(
        msg("provider.notJson", { command, what, said: out.trim().slice(0, 120) }));
    }
  };
  // Виды спрашиваются ОДИН раз на запуск: их спрашивает каждая сцена,
  // и запуск программы на каждую был бы заметен на ролике из двух десятков.
  let known: Record<string, KindSpec> | null = null;
  return {
    name: command,
    kinds: () => (known ??= json<Record<string, KindSpec>>(call(["kinds"]), "kinds")),
    page: (scene: RawScene, outDir: string, film: Film): string => {
      const said = json<{ file?: string }>(
        call(["page", "--scene-json", JSON.stringify(scene),
          "--film-json", JSON.stringify(film), "--out", outDir]), "page");
      if (!said.file) throw new ProviderError(msg("provider.noFile", { command }));
      return said.file;
    },
  };
}

/**
 * Поставщик по имени. Совпало с поставляемым — работает поставляемый;
 * иначе имя ищется среди объявленных роликом, а не считается командой
 * само по себе: команда, взятая из имени вида сцены, запускала бы
 * что попало по опечатке в заголовке.
 */
export function providerFor(name: string, declared: Record<string, string> = {}): Provider {
  if (isBuiltin(name)) return BUILTIN[name]!;
  const command = declared[name];
  if (!command) {
    const known = [...Object.keys(BUILTIN), ...Object.keys(declared)].join(", ");
    throw new ProviderError(msg("provider.unknown", { name, known }));
  }
  return external(command);
}
