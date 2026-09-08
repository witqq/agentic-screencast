#!/usr/bin/env node
// Сборщик: сценарий → озвучка → сегменты (с кэшем) → склейка.
// Запуск: build.js --pitch pitch.json --out video.mp4 [--voice baya]
import { renderScene, encode, DEFAULTS, ENCODE } from "./render.js";
import { speechFor } from "./speech.js";
import { selfHash } from "./self-hash.js";
import { engineFor, fingerprint, voiceKey } from "./voice/index.js";
import type { VoiceData } from "./source.js";
import type { RenderOpts } from "./render.js";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync,
} from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { msg, useLang } from "./msg.js";

const require = createRequire(import.meta.url);
const FFMPEG = require("ffmpeg-static");
const FFPROBE = require("@ffprobe-installer/ffprobe").path;
const HERE = dirname(fileURLToPath(import.meta.url));
// Тяжёлое живёт там, куда укажет окружение: без этого прогон в изоляции
// обслуживается чужим кэшем и чужим окружением.
// Каталог данных (кэш, окружение синтеза, вывод) задаётся окружением.
// Умолчание — рядом с источником, а не в чужом проекте: продукт не должен
// знать, что где-то выше по дереву лежит каталог конкретной работы.
const TMP = resolve(process.env.AGENTIC_SCREENCAST_HOME ?? resolve(process.cwd(), ".agentic-screencast"));
const CACHE = `${TMP}/cache`;


/**
 * Чем озвучена реплика — по ответу движка, сохранённому рядом с записью.
 * Неизвестно, если файла ответа нет: звук положили в кэш руками, и врать
 * про его происхождение хуже, чем сказать, что оно неизвестно.
 */
function voicedBy(wav: string): string {
  const side = `${wav}.json`;
  if (!existsSync(side)) return "неизвестно";
  try {
    return String((JSON.parse(readFileSync(side, "utf8")) as { engine?: string }).engine ?? "неизвестно");
  } catch {
    return "неизвестно";
  }
}

/** Значение флага командной строки; `d` — умолчание. */
function arg(k: string): string | undefined;
function arg(k: string, d: string): string;
function arg(k: string, d?: string): string | undefined {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
}

/** Такт речи так, как его видит сборка. */
interface BuiltBeat {
  text: string;
  speech?: string;
  /** строка, отданная движку */
  __speech?: string;
  /** длина звука такта */
  __spoken?: number;
  /** файл звука в кэше */
  __wav?: string;
  __key?: string;
}

/** Сцена сборки вместе с тем, что сборщик о ней вычислил по ходу. */
interface BuiltScene {
  id: string;
  page: string;
  caption: string;
  beats: BuiltBeat[];
  tail?: number;
  duration: number;
  /** начала тактов в секундах от начала сцены */
  __starts?: number[];
  __spoken?: number;
  __seg?: string;
  __wav?: string;
  __key?: string;
  [key: string]: unknown;
}

const md5 = (b: string | Buffer): string => createHash("md5").update(b).digest("hex");
const md5file = (p: string): string => md5(readFileSync(p));
/** Хеш всех файлов каталога — для подложек с их стилями и шрифтами. */
function md5tree(p: string): string {
  // Отсутствие подложки — ошибка сборки, а не пустой хеш: иначе сцена
  // с опечаткой в пути молча попадёт в кэш и никогда не пересоберётся.
  if (!existsSync(p)) throw new Error(msg("build.noPage", { path: p }));
  if (statSync(p).isFile()) return md5file(p);
  return md5(readdirSync(p).sort().map((f) => f + md5tree(join(p, f))).join("|"));
}

// Версии внешних исполнителей: они тоже влияют на байты.
const ver = (bin: string, a: string[] = ["-version"]): string =>
  execFileSync(bin, a, { encoding: "utf8" }).split("\n")[0];
const BROWSER_VER = execFileSync("node", ["-e",
  "import('playwright').then(p=>process.stdout.write(p.chromium.executablePath()))"],
  { encoding: "utf8", cwd: HERE });
// Хеш собственных исходников: без него исправление дефекта в ядре
// не пересобирает ничего, и сборка отдаёт старые сегменты из кэша.
// Считается ОБХОДОМ каталога, а не списком: новый файл инструмента
// (например слой слайдов) обязан менять ключ сам по себе.
const SELF = selfHash();

function keyOf(
  scene: Record<string, unknown>,
  neighbours: Array<string | null>,
  voice: VoiceData,
  opts: RenderOpts,
  SRC: string,
): string {
  return md5(JSON.stringify({
    scene, neighbours, voice,
    render: { ...opts, gop: opts.fps * 2, audio: { rate: 48000, channels: 1 } },
    page: md5tree(resolve(SRC, String(scene.page))),
    self: SELF, ffmpeg: ver(FFMPEG), browser: BROWSER_VER,
  }));
}

const dur = (f: string): number => Number(execFileSync(FFPROBE, ["-v", "error", "-show_entries",
  "format=duration", "-of", "default=nw=1:nk=1", f], { encoding: "utf8" }).trim());

async function main() {
  const PITCH_FILE = resolve(arg("pitch", "pitch.json"));
  // Подложки адресуются относительно ФАЙЛА-ИСТОЧНИКА, а не каталога
  // инструмента: иначе опубликованный продукт годен только из одного
  // места на диске.
  const SRC = dirname(PITCH_FILE);
  const pitch = JSON.parse(readFileSync(PITCH_FILE, "utf8")) as {
    scenes: BuiltScene[]; tail?: number;
    frame?: Partial<RenderOpts>; encode?: Partial<typeof ENCODE>; theme?: Record<string, string>;
    pronounce?: unknown; lang?: string; dir?: string;
  };
  // Данные голоса — объект целиком: провайдер, имя голоса и его собственные
  // параметры (темп у SpeechKit). Иначе третий параметр терялся бы между
  // сборщиком и драйвером, и добавление провайдера требовало бы правки сборщика.
  const voiceJson = arg("voice-json");
  // Умолчание — поставляемый движок. Silero больше не умолчание: он живёт
  // внешней реализацией, и молча уводить туда сборку значило бы обещать
  // окружение, которого у поставившего инструмент нет.
  const voice: VoiceData = voiceJson
    ? (JSON.parse(voiceJson) as VoiceData)
    : { engine: arg("engine", "speechkit"), name: arg("voice", "kuznetsov") };
  // Кадр и кодирование приходят из ролика; умолчания — прежние числа.
  // Они входят в ключ сегмента: сменился размер или качество — кадры
  // обязаны пересобраться, а не прийти из кэша прежними.
  // Язык ролика — язык отказов этой сборки.
  useLang(pitch.lang);
  const opts: RenderOpts = { ...DEFAULTS, ...pitch.frame,
    encode: { ...ENCODE, ...pitch.encode } };
  // Одна названная сцена вместо всего ролика: этим живёт предпросмотр
  // на странице записи — человек прочитал такт и хочет увидеть, что
  // получилось, не пересобирая двадцать минут.
  //
  // Соседи в ключе сегмента при этом СОХРАНЯЮТСЯ: от них зависит переход,
  // и сегмент, собранный в одиночку, обязан быть тем же самым файлом,
  // что и в полном ролике, — иначе предпросмотр показывал бы одно,
  // а готовый ролик содержал другое.
  const only = arg("only");
  if (only && !pitch.scenes.some((s) => s.id === only)) {
    console.error(msg("build.noScene", { id: only }));
    process.exit(2);
  }
  mkdirSync(CACHE, { recursive: true });
  const log: Array<Record<string, unknown>> = [];

  /**
   * Звук одного такта: из кэша либо у движка. Возвращает файл и длину.
   *
   * Ключ считается на ТАКТ, а не на сцену: перезапись одного такта обязана
   * пересобирать только его, а не всю речь сцены. Отпечаток спрашивается
   * до вычисления ключа и подмешивается, только если непуст, — правило
   * то же, что и прежде, и оно живёт в `voiceKey`.
   */
  async function voiceOf(speech: string): Promise<{ wav: string; key: string; spoken: number }> {
    const fp = await fingerprint(speech, voice);
    const key = voiceKey(speech, voice, fp);
    const wav = `${CACHE}/${key}.wav`;
    if (!existsSync(wav)) {
      try {
        const said = await engineFor(voice).synth(speech, voice, wav);
        writeFileSync(`${wav}.json`, JSON.stringify(said));
      } catch (e) {
        if ((e as { engineError?: boolean }).engineError) {
          console.error(String((e as Error).message));
          process.exit(1);
        }
        throw e;
      }
    }
    return { wav, key, spoken: dur(wav) };
  }

  /**
   * Речь сцены целиком: такты подряд, одним файлом.
   *
   * Склейка идёт ЧЕРЕЗ ФАЙЛ СПИСКА, а не пересжатием: такты уже приведены
   * к формату договора, и второй проход через кодек менял бы звук, который
   * человек записал. Имя файла — от ключей тактов, поэтому перезапись
   * одного такта даёт другой файл склейки, а не берёт прежний из кэша.
   */
  function joinBeats(beats: BuiltBeat[]): string {
    if (beats.length === 1) return beats[0]!.__wav!;
    const key = md5(beats.map((b) => b.__key).join("|"));
    const out = `${CACHE}/join-${key}.wav`;
    if (!existsSync(out)) {
      const list = `${CACHE}/join-${key}.txt`;
      writeFileSync(list, beats.map((b) => `file '${b.__wav}'`).join("\n"));
      execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-f", "concat",
        "-safe", "0", "-i", list, "-ar", "48000", "-ac", "1", out]);
    }
    return out;
  }

  for (const s of pitch.scenes) {
    // Чужие сцены при одиночной сборке не озвучиваются и не рисуются:
    // за ключом сегмента нужны только имена соседей, а они известны
    // из списка. Иначе предпросмотр одной сцены стоил бы синтеза всего
    // ролика — то есть денег.
    if (only && s.id !== only) continue;
    // 1. Озвучка. Текст для синтеза ≠ текст на экране, и правила чтения
    //    принадлежат провайдеру: Silero молча пропускает латиницу, поэтому
    //    её переписывают кириллицей, а SpeechKit читает её сам.
    //    В кадре при этом остаётся исходное написание из `caption`.
    // Правила чтения выбираются по имени, названному данными голоса.
    // Обычно это имя движка, но у ПОСТОРОННЕЙ реализации имя — путь
    // к программе, и по нему правил не найти. Поэтому данные голоса
    // могут назвать правила прямо: `"rules": "silero"`. Без этого
    // внешний Silero молча проглатывал бы латиницу — тот самый дефект,
    // ради которого переписывание и заводилось.
    // Правила чтения называет ролик; данные голоса могут их перебить,
    // потому что чтение зависит и от того, кто читает. Имя движка
    // правилами больше не считается: инструмент не знает, на каком
    // языке ролик, и решать это за автора не вправе.
    const rules = voice.rules ?? pitch.pronounce;
    // Такт за тактом: у каждого своя строка синтеза, свой ключ, свой звук
    // и своя длина. Начала тактов копятся по ходу — по ним расписание
    // картинки узнаёт, когда наступает каждый кусок речи.
    const starts: number[] = [];
    let spoken = 0;
    for (const b of s.beats) {
      const speech = b.speech ?? speechFor(rules, b.text, pitch.dir ?? SRC);
      const got = await voiceOf(speech);
      b.__speech = speech;
      b.__wav = got.wav;
      b.__key = got.key;
      b.__spoken = got.spoken;
      starts.push(spoken);
      spoken += got.spoken;
    }
    s.__starts = starts;
    if (!s.beats.length && s.video) {
      // Длину задаёт сам материал: иначе сцена длилась бы только хвост
      // тишины, то есть мелькала бы.
      spoken = dur(resolve(SRC, String(s.page)));
    }
    // Пауза на стыке сцен. Без неё длительность сцены равна длине реплики,
    // и следующая начинается ровно на последнем слоге предыдущей: граница
    // сцены попадает в речь, а не в тишину. Хвост задаётся данными
    // (`tail` у сцены или у питча) и добивается тишиной шагом ниже.
    const tail = s.tail ?? pitch.tail ?? 0.4;
    const frames = Math.ceil((spoken + tail) * opts.fps);
    s.duration = frames / opts.fps;
    s.__spoken = spoken;

    // 2. Сегмент: рендер или кэш.
    // Текст синтеза входит в ключ: смена правил чтения обязана пересобрать сегмент.
    // Соседи в ключе — только непосредственные: от них зависит переход.
    // Весь список сделал бы добавление сцены в конец причиной пересборки всего.
    const i = pitch.scenes.indexOf(s);
    const neighbours = [pitch.scenes[i - 1]?.id ?? null, pitch.scenes[i + 1]?.id ?? null];
    // В ключ сегмента входят строки синтеза ВСЕХ тактов и их начала:
    // от первых зависит звук, от вторых — расписание картинки, и оба
    // обязаны пересобирать кадр.
    const key = keyOf({ ...s, __speech: s.beats.map((b) => b.__speech), __starts: starts },
      neighbours, voice, opts, SRC);
    const seg = `${CACHE}/${key}.mp4`;
    if (process.argv.includes("--keys-only")) {
      // Строка синтеза и длительность печатаются здесь, потому что больше
      // их взять неоткуда: полный отчёт даёт только суммарную длительность
      // готового файла, а ответ движка сохраняется рядом с записью и в этот
      // отчёт не попадает.
      // Без строки нечем сверить правила чтения до и после переезда,
      // без длительности нечем замерить бюджет хронометража.
      // Чем озвучена сцена — вопрос, на который сборка обязана отвечать:
      // записанный человеком голос и синтез дают правдоподобную
      // длительность одинаково, и без этого поля их не различить.
      // Ответ берётся из того, что сказал сам движок, а не из данных
      // голоса: данные говорят, кого просили, ответ — кто сделал.
      // Такты перечисляются поимённо: у каждого свой ключ, своя строка
      // синтеза, своя длина и своё начало в сцене. Без этого перезапись
      // одного такта неотличима снаружи от перезаписи всей сцены —
      // суммарная длительность в обоих случаях меняется одинаково.
      log.push({ id: s.id, key, cached: existsSync(seg),
        beats: s.beats.map((b, bi) => ({
          key: b.__key, speech: b.__speech, voiced: voicedBy(b.__wav!),
          spoken: Number((b.__spoken ?? 0).toFixed(3)),
          starts: Number((starts[bi] ?? 0).toFixed(3)),
        })),
        voiced: s.beats.length ? voicedBy(s.beats[0]!.__wav!) : "silent",
        spoken: Number(spoken.toFixed(3)), duration: s.duration });
      s.__seg = seg; s.__wav = s.beats.length ? joinBeats(s.beats) : ""; s.__key = key;
      continue;
    }
    const at = pitch.scenes.indexOf(s) + 1;
    const of = pitch.scenes.length;
    if (existsSync(seg)) {
      process.stderr.write(msg("build.sceneCached", { at, of, id: s.id }) + "\n");
      log.push({ id: s.id, cached: true, key: key.slice(0, 10), frames });
    } else if (s.video) {
      process.stderr.write(msg("build.sceneVideo", { at, of, id: s.id }) + "\n");
      // Материал — готовый файл: кадры берутся из него, а не рисуются.
      // Он приводится к кадру ролика (размер, темп, качество, формат
      // пикселей) и к длине сцены: короче — достаивается последним кадром,
      // длиннее — обрезается. Иначе склейка получила бы сегмент с чужими
      // параметрами, и готовый файл разъехался бы со звуком.
      const src = resolve(SRC, String(s.page));
      if (!existsSync(src)) throw new Error(msg("build.noPage", { path: src }));
      const e = opts.encode!;
      execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-i", src,
        "-an", "-t", String(s.duration),
        "-vf", `scale=${opts.width}:${opts.height}:force_original_aspect_ratio=decrease,`
          + `pad=${opts.width}:${opts.height}:-1:-1:color=black,fps=${opts.fps},`
          + "tpad=stop_mode=clone:stop_duration=3600",
        "-t", String(s.duration),
        "-c:v", "libx264", "-preset", e.preset, "-crf", String(e.crf),
        "-pix_fmt", e.pix, "-g", String(opts.fps * 2), seg]);
      log.push({ id: s.id, cached: false, key: key.slice(0, 10), frames, video: true });
    } else {
      // Слою композиции отдаются ИЗМЕРЕННЫЕ начала тактов и их число:
      // по ним он разрешает якоря вида `b2` в секунды. Само число тактов
      // передаётся отдельным полем, потому что в сцене под этим именем
      // лежит их содержание, а разрешению нужен только счёт.
      process.stderr.write(msg("build.sceneRender", { at, of, id: s.id, frames }) + "\n");
      const { shots } = await renderScene(
        { ...s, __src: SRC, beats: s.beats.length, starts, theme: pitch.theme }, opts);
      encode(shots, seg, opts);
      log.push({ id: s.id, cached: false, key: key.slice(0, 10), frames });
    }
    // 3. Звук сцены добивается тишиной до длины сегмента. У сцены без
    // речи звук — тишина целиком: дорожка обязана быть у КАЖДОЙ сцены,
    // иначе склейка сдвинет звук всех следующих.
    const padded = `${CACHE}/${key}.wav`;
    if (!existsSync(padded)) {
      if (s.beats.length) {
        execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-i", joinBeats(s.beats),
          "-af", `apad=whole_dur=${s.duration}`, "-ar", "48000", "-ac", "1", padded]);
      } else {
        execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-f", "lavfi",
          "-i", "anullsrc=r=48000:cl=mono", "-t", String(s.duration), padded]);
      }
    }
    s.__seg = seg; s.__wav = padded; s.__key = key;
  }

  if (process.argv.includes("--keys-only")) {
    console.log(JSON.stringify({ keys: log }, null, 1));
    return;
  }

  // 4. Склейка: звук одной дорожкой, видео копированием, один мультиплекс.
  const taken = only ? pitch.scenes.filter((s) => s.id === only) : pitch.scenes;
  const vlist = `${CACHE}/v.txt`, alist = `${CACHE}/a.txt`;
  writeFileSync(vlist, taken.map((s) => `file '${s.__seg}'`).join("\n"));
  writeFileSync(alist, taken.map((s) => `file '${s.__wav}'`).join("\n"));
  const audio = `${CACHE}/all.wav`;
  execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-f", "concat",
    "-safe", "0", "-i", alist, "-c", "copy", audio]);
  const out = arg("out", `${TMP}/pitch.mp4`);
  const mux = execFileSync("/bin/sh", ["-c",
    `${FFMPEG} -nostdin -y -f concat -safe 0 -i ${vlist} -i ${audio} ` +
    `-c:v copy -c:a aac -b:a ${opts.encode!.audio} -shortest ${out} 2>&1`], { encoding: "utf8" });

  const warnings = mux.split("\n").filter((l) => /Non-monoton|DTS|Invalid/.test(l));
  // Человеческая строка — в поток ошибок, отчёт — в стандартный вывод:
  // разбирающему нужен чистый JSON, а человеку одна строка вместо того,
  // чтобы искать длительность и путь в двух экранах вывода.
  process.stderr.write(msg("build.done", {
    out, secs: dur(out).toFixed(1), w: opts.width, h: opts.height, fps: opts.fps,
    scenes: taken.length }) + "\n");
  console.log(JSON.stringify({
    out, scenes: log, ...(only ? { only } : {}),
    segments: taken.map((s) => ({ id: s.id, seg: s.__seg, md5: md5file(s.__seg!) })),
    duration: dur(out), warnings,
  }, null, 1));
}

await main();
