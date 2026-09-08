#!/usr/bin/env node
// Поставляемые движки, выставленные наружу по договору.
//
// Два потребителя, и оба настоящие. Первый — тот, кто пишет свой движок:
// ему нужен образец, который договору заведомо соответствует, чтобы
// сверять поведение. Второй — сам инструмент: проверка соответствия
// гоняется против этой программы, то есть договор проверяется на чём-то
// исполняемом, а не на пересказе.
//
// Подкоманды и их ответы описаны в README, раздел про договор о движке.
import { BUILTIN } from "./voice/builtin.js";
import type { VoiceData } from "./voice/types.js";

const [, , cmd, ...rest] = process.argv;
const arg = (k: string): string | undefined => {
  const i = rest.indexOf(`--${k}`);
  return i >= 0 ? rest[i + 1] : undefined;
};

const fail = (why: string): never => {
  console.error(why);
  process.exit(1);
};

const voiceData = (): VoiceData => {
  const raw = arg("voice-json");
  if (!raw) return { engine: arg("engine") ?? "stub", name: arg("voice") ?? "" };
  return JSON.parse(raw) as VoiceData;
};

const engineOf = (voice: VoiceData): (typeof BUILTIN)[string] => {
  const name = String(voice.engine ?? "");
  const engine = BUILTIN[name];
  if (!engine) fail(`нет такого движка: ${name || "(не назван)"}`);
  return engine!;
};

/** Голос назван и известен движку — иначе отказ, а не молчаливый синтез. */
const requireKnownVoice = async (engine: (typeof BUILTIN)[string], voice: VoiceData): Promise<void> => {
  const known = await engine.voices();
  const name = String(voice.name ?? "");
  if (known.length && !known.includes(name)) {
    fail(`движок ${engine.name} не знает голоса ${name || "(не назван)"}`);
  }
};

switch (cmd) {
  case "voices": {
    const voice = voiceData();
    console.log(JSON.stringify(await engineOf(voice).voices()));
    break;
  }
  case "synth": {
    const voice = voiceData();
    const text = arg("text");
    const out = arg("out");
    if (!text || !out) fail("synth требует --text и --out");
    const engine = engineOf(voice);
    await requireKnownVoice(engine, voice);
    try {
      console.log(JSON.stringify(await engine.synth(text!, voice, out!)));
    } catch (e) {
      fail(String((e as Error).message));
    }
    break;
  }
  case "probe": {
    // Отпечаток спрашивается у НАЗВАННОГО движка, а не отвечается за всех.
    // Прежде здесь стояла пустая строка для любого: синтезирующим движкам
    // она верна — звук зависит только от текста и данных голоса, — но
    // у записанного голоса отпечаток есть, и через программную форму
    // договора перезапись реплики не доехала бы до готового файла: ключ
    // кэша не изменился бы, а сборка выглядела бы успешной.
    const voice = voiceData();
    const text = arg("text") ?? "";
    const engine = engineOf(voice);
    console.log(JSON.stringify({ fingerprint: await engine.probe?.(text, voice) ?? "" }));
    break;
  }
  case "paths": {
    const { builtinPaths } = await import("./voice/builtin.js");
    console.log(JSON.stringify(builtinPaths()));
    break;
  }
  default:
    console.error("voice-cli.js voices|synth|probe|paths [--voice-json '{…}'] [--text …] [--out …]");
    process.exit(2);
}
