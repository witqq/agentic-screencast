// Разрешение движка голоса: поставляемый — прямым вызовом, посторонний —
// запуском программы по договору.
//
// Инструмент нигде не ветвится по ИМЕНИ движка: он спрашивает у того,
// кто разрешён данными голоса, и получает одинаковый ответ обоими путями.
// Поставляемый движок вызывается в том же процессе — это не оптимизация
// ради оптимизации: отпечаток спрашивается у каждой реплики перед
// вычислением ключа, и запуск отдельной программы двадцать четыре раза
// стоил бы заметного времени там, где отвечать нечего.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { BUILTIN, isBuiltin } from "./builtin.js";
import type { SynthResult, VoiceData, VoiceEngine } from "./types.js";
import { msg } from "../msg.js";

/** Отказ движка: наружу идёт причина словами, а не дамп запуска процесса. */
export class EngineError extends Error {
  readonly engineError = true;
}

/**
 * Посторонняя реализация: программа, которую запускают с подкомандой.
 * Имя берётся из данных голоса — если оно не совпало с поставляемым,
 * оно и есть команда (путь или имя в `PATH`).
 */
export function splitCommand(command: string): [string, string[]] {
  const parts = command.trim().split(/\s+/);
  return [parts[0]!, parts.slice(1)];
}

function external(command: string): VoiceEngine {
  // Имя движка может нести не только путь, но и то, чем его запускать:
  // «python3 /путь/voice.py». Без этого посторонняя реализация обязана
  // быть исполняемым файлом с правом на запуск, а распакованный архив
  // или файл, пришедший по сети, этого права не имеет — и договор
  // упирался бы в права доступа, а не в поведение.
  const [bin, prefix] = splitCommand(command);
  const call = (args: string[], input?: string): string => {
    const r = spawnSync(bin, [...prefix, ...args], { encoding: "utf8", input, maxBuffer: 64 * 1024 * 1024 });
    if (r.error) {
      throw new EngineError((r.error as NodeJS.ErrnoException).code === "ENOENT"
        ? msg("engine.notFound", { command })
        : msg("engine.failed", { command, code: "—", said: String(r.error.message) }));
    }
    if (r.status !== 0) {
      const said = (r.stderr || r.stdout || "").trim().split("\n")[0] ?? "";
      throw new EngineError(msg("engine.failed", { command, code: String(r.status), said }));
    }
    return r.stdout;
  };
  /** Ответ обязан быть JSON и ничем больше: посторонний вывод — нарушение. */
  const json = <T>(out: string, what: string): T => {
    try {
      return JSON.parse(out) as T;
    } catch {
      throw new EngineError(msg("engine.notJson", { command, what, said: out.trim().slice(0, 120) }));
    }
  };
  return {
    name: command,
    voices: () => json<string[]>(call(["voices"]), "voices"),
    synth: (text, voice, out) => json<SynthResult>(
      call(["synth", "--voice-json", JSON.stringify(voice), "--text", text, "--out", out]),
      "synth"),
    // «Отпечатка нет» — это ПОЛОЖИТЕЛЬНЫЙ ответ `{"fingerprint": ""}`
    // с нулевым кодом, а не отказ и не молчание. Прежде отказ, пустой
    // вывод и честный пустой отпечаток были неразличимы, и сломавшийся
    // `probe` читался как «звук зависит только от текста и данных
    // голоса»: перезаписанная реплика не доехала бы до готового файла,
    // а сборка выглядела бы успешной — ровно то, ради предотвращения
    // чего отпечаток и заводился.
    probe: (text, voice) => String(json<{ fingerprint?: string }>(
      call(["probe", "--voice-json", JSON.stringify(voice), "--text", text]),
      "probe").fingerprint ?? ""),
    paths: () => json<Record<string, string>>(call(["paths"]), "paths"),
  };
}

/** Движок, названный данными голоса. */
export function engineFor(voice: VoiceData): VoiceEngine {
  const name = String(voice.engine ?? "");
  if (!name) throw new EngineError(msg("engine.unnamed"));
  if (isBuiltin(name)) return BUILTIN[name]!;
  return external(name);
}

/**
 * Отпечаток реплики: пустая строка, если звук зависит только от текста
 * и данных голоса. Сборка подмешивает его в ключ кэша ТОЛЬКО когда
 * он непуст — иначе ключи всех уже синтезированных реплик сменились бы,
 * и оплаченный звук пришлось бы покупать заново.
 */
export async function fingerprint(text: string, voice: VoiceData): Promise<string> {
  const engine = engineFor(voice);
  if (!engine.probe) return "";
  return String((await engine.probe(text, voice)) ?? "");
}

/**
 * Ключ кэша звука.
 *
 * Отпечаток входит в ключ ТОЛЬКО когда он непуст, и это не мелочь
 * оформления. Синтез отвечает пустым отпечатком; подмешай его безусловно —
 * и ключи всех уже синтезированных реплик сменятся, а оплаченный звук
 * придётся покупать заново. Дефект при этом тихий: сборка выглядит
 * успешной, просто идёт в сеть.
 *
 * Правило живёт здесь, а не в теле цикла сборки, потому что иначе его
 * нечем позвать — а значит и нечем проверить.
 */
export function voiceKey(speech: string, voice: VoiceData, fp: string): string {
  const parts = fp ? [speech, voice, fp] : [speech, voice];
  return createHash("md5").update(JSON.stringify(parts)).digest("hex");
}
