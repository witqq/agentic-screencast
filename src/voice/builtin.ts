// Поставляемые движки голоса. Питон не нужен ни одному: сеть, системная
// команда и ffmpeg покрывают всё.
//
// Четверо синтезируют, пятый — `recorded` — не синтезирует, а находит
// записанное человеком. Он живёт в соседнем файле, потому что у него
// своё устройство: хранилище, адресация по тексту реплики и настоящий
// отпечаток. Договор при этом один на всех, и сборщик их не различает.
//
// Локальный синтез Silero остался питоновским и живёт ВНЕ инструмента:
// он держится за torch, а torch тянет окружение на шестьсот мегабайт.
// Как подключить его внешней реализацией договора — в README.
import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { durationOf, ff, FFMPEG, FFPROBE } from "./audio.js";
import { envKey } from "./env.js";
import { recorded } from "./recorded.js";
import { CHANNELS, SAMPLE_RATE, type SynthResult, type VoiceData, type VoiceEngine } from "./types.js";

export { durationOf };

const said = (file: string, voice: VoiceData, engine: string): SynthResult => ({
  file, duration: durationOf(file), engine, voice: String(voice.name ?? ""),
});

const SPEECHKIT_URL = "https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize";
// Список сверен ЖИВЫМИ вызовами, а не документацией: 24 августа 2026 каждое
// имя отправлено в API, и оставлены только те, что дали ответ 200. Прежний
// список врал в обе стороны — в нём были dasha и kirill, которых API отвергает
// с «Unsupported voice is requested», и не было oksana, sasha, nastya, john,
// madi_ru, которых принимает. Голоса «alisa» и «alice» API не знает.
const SPEECHKIT_VOICES = ["kuznetsov", "filipp", "ermil", "zahar", "john", "madi_ru",
  "alena", "jane", "marina", "omazh", "oksana", "sasha", "nastya"];

/** Yandex SpeechKit: синтез по сети. Отвечает сырым потоком — заворачиваем. */
const speechkit: VoiceEngine = {
  name: "speechkit",
  voices: () => SPEECHKIT_VOICES,
  async synth(text, voice, out) {
    const body = new URLSearchParams({
      text,
      lang: String(voice.lang ?? "ru-RU"),
      voice: String(voice.name ?? ""),
      speed: String(voice.speed ?? 1.0),
      format: "lpcm",
      sampleRateHertz: String(SAMPLE_RATE),
    });
    const key = envKey(String(voice.key_env ?? "CLOUD_KEY"));
    const res = await fetch(SPEECHKIT_URL, {
      method: "POST",
      headers: { Authorization: `Api-Key ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      throw new Error(`SpeechKit отказал (${res.status}): ${detail}`);
    }
    const raw = `${out}.pcm`;
    writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
    ff(["-f", "s16le", "-ar", String(SAMPLE_RATE), "-ac", String(CHANNELS), "-i", raw, out]);
    rmSync(raw, { force: true });
    return said(out, voice, "speechkit");
  },
};

/**
 * Заглушка: тишина нужной длины. Нужна не для красоты — на ней гоняются
 * сквозные проверки, потому что она не тратит ни сети, ни денег.
 */
const stub: VoiceEngine = {
  name: "stub",
  voices: () => ["nullvoice"],
  synth(text, voice, out) {
    const secs = Math.max(0.5, text.length / Number(voice.cps ?? 15));
    ff(["-f", "lavfi", "-i", `anullsrc=r=${SAMPLE_RATE}:cl=mono`, "-t", secs.toFixed(3), out]);
    return said(out, voice, "stub");
  },
};

/** Системный синтез macOS: точка отсчёта, доступная без всего. */
const say: VoiceEngine = {
  name: "say",
  voices: () => [],
  synth(text, voice, out) {
    const aiff = `${out}.aiff`;
    execFileSync("/usr/bin/say", ["-v", String(voice.name ?? "Milena"), "-o", aiff, text]);
    ff(["-i", aiff, "-ar", String(SAMPLE_RATE), "-ac", String(CHANNELS), out]);
    rmSync(aiff, { force: true });
    return said(out, voice, "say");
  },
};

/** Piper: внешняя команда, если она у пользователя есть. */
const piper: VoiceEngine = {
  name: "piper",
  voices: () => [],
  synth(text, voice, out) {
    execFileSync("piper", ["-m", String(voice.name ?? ""), "-f", out], { input: text });
    return said(out, voice, "piper");
  },
};

export const BUILTIN: Record<string, VoiceEngine> = {
  [speechkit.name]: speechkit,
  [stub.name]: stub,
  [say.name]: say,
  [piper.name]: piper,
  [recorded.name]: recorded,
};

/** Есть ли поставляемый движок с таким именем. */
export const isBuiltin = (name: string): boolean => Object.hasOwn(BUILTIN, name);

/**
 * Ресурсы, которые поставляемые движки разрешают САМИ при нынешнем
 * окружении. Сюда попадает то, что движок может увести не туда: кэши,
 * файлы моделей, поставляемые бинарники. Системные команды, вызываемые
 * по своему постоянному адресу, сюда не входят — у них нет умолчания,
 * которое могло бы уехать.
 *
 * Спрашивается это затем, чтобы проверка «умолчания не уводят наружу»
 * задавала вопрос движку, а не догадывалась о нём.
 */
export function builtinPaths(): Record<string, string> {
  const out: Record<string, string> = { ffmpeg: FFMPEG, ffprobe: FFPROBE };
  for (const e of Object.values(BUILTIN)) Object.assign(out, e.paths?.() ?? {});
  return out;
}
