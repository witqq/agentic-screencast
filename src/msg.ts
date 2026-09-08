// Слова, которые инструмент говорит человеку.
//
// Зачем отдельный модуль. Средство общего назначения не должно объясняться
// с чужим агентом на языке, который он не выбирал: строки, вшитые в код,
// делают язык интерфейса свойством инструмента, а не работы. Здесь
// поставляются два словаря; ролик может назвать язык сам (`lang`), иначе
// он берётся из окружения, иначе — английский.
//
// Английский умолчанием не из предпочтения, а потому, что он —
// единственный, который посторонний потребитель наверняка прочтёт.
// Русский поставляется и включается одним словом.
//
// Ключ сообщения — устойчивый идентификатор, а не фраза: по нему пишут
// проверки, и перевод не должен их ломать.
export type Lang = "en" | "ru";

type Dict = Record<string, string>;

const en: Dict = {
  "source.notFound": "source {path}: file not found",
  "source.error": "source {path}: {why}",
  "source.line": "line {line}: {why}",
  "source.noScenes": "the source has no scenes",
  "source.textOutside": "text outside a scene",
  "source.badHeader": "a scene header looks like «## s01 · slides.compare»",
  "source.noSpeech": "scene {id}: no speech",
  "source.required": "scene {id}: kind {kind} requires field {names}",
  "source.badField": "field «{key}» is not allowed for kind {kind}",
  "source.badFilmField": "unknown film field: {key}",
  "source.badAnchor": "«{anchor}» is not a time anchor; use b2, b2.end, b2+0.4, 40% or 1.2s",
  "source.beatOutOfRange": "anchor «{anchor}» points past the speech of scene {id}: it has {beats} beat(s)",
  "provider.unknown": "unknown provider «{name}»; known: {known}\n"
    + "declare an outside one in the film header: providers: {\"name\": \"command\"}",
  "provider.unknownKind": "provider «{provider}» does not know kind «{kind}»; it offers: {kinds}",
  "provider.notFound": "provider «{command}»: program not found",
  "provider.failed": "provider «{command}» failed (code {code}): {said}",
  "provider.notJson": "provider «{command}» answered {what} with non-JSON: {said}",
  "provider.noFile": "provider «{command}» did not name the page file",
  "provider.cannotDraw": "provider «{name}» cannot draw a page and named no ready file",
  "engine.unnamed": "no engine named in the voice data",
  "engine.notFound": "engine «{command}»: program not found",
  "engine.failed": "engine «{command}» failed (code {code}): {said}",
  "engine.notJson": "engine «{command}» answered {what} with non-JSON: {said}",
  "build.noPage": "no page: {path}",
  "build.noScene": "no scene «{id}» in this film",
  "build.sceneCached": "[{at}/{of}] {id}: taken from cache",
  "build.sceneRender": "[{at}/{of}] {id}: drawing {frames} frames…",
  "build.sceneVideo": "[{at}/{of}] {id}: bringing the clip to the film frame…",
  "build.done": "done: {out} — {secs} s, {w}×{h}, {fps} fps, {scenes} scene(s)",
  "speech.noRules": "no speech rules «{name}»: neither shipped nor at {path}",
  "record.notBuilt": "the recording page is not built: run npm run build in the tool directory",
  "record.noScene": "no scene {id}",
  "record.noRecording": "no recording",
  "record.unreadable": "the recording cannot be read: {why}",
  "record.noDuration": "the recording has no measurable duration",
  "record.noFile": "no such file",
};

const ru: Dict = {
  "source.notFound": "источник {path}: файл не найден",
  "source.error": "источник {path}: {why}",
  "source.line": "строка {line}: {why}",
  "source.noScenes": "в источнике нет ни одной сцены",
  "source.textOutside": "текст вне сцены",
  "source.badHeader": "заголовок сцены пишется как «## s01 · slides.compare»",
  "source.noSpeech": "сцена {id}: нет реплики",
  "source.required": "сцена {id}: у вида {kind} обязательно поле {names}",
  "source.badField": "поле «{key}» недопустимо у сцены вида {kind}",
  "source.badFilmField": "неизвестное поле ролика: {key}",
  "source.badAnchor": "«{anchor}» не якорь момента; пишут b2, b2.end, b2+0.4, 40% или 1.2s",
  "source.beatOutOfRange": "якорь «{anchor}» указывает дальше речи сцены {id}: в ней тактов {beats}",
  "provider.unknown": "неизвестный поставщик «{name}»; известны: {known}\n"
    + "посторонний объявляется в шапке ролика строкой providers: {\"имя\": \"команда\"}",
  "provider.unknownKind": "поставщик «{provider}» не знает вида «{kind}»; он предлагает: {kinds}",
  "provider.notFound": "поставщик «{command}»: программа не найдена",
  "provider.failed": "поставщик «{command}» отказал (код {code}): {said}",
  "provider.notJson": "поставщик «{command}» ответил на {what} не JSON: {said}",
  "provider.noFile": "поставщик «{command}» не назвал файл страницы",
  "provider.cannotDraw": "поставщик «{name}» не умеет порождать страницу и не назвал готовый файл",
  "engine.unnamed": "в данных голоса не назван движок",
  "engine.notFound": "движок «{command}»: программа не найдена",
  "engine.failed": "движок «{command}» отказал (код {code}): {said}",
  "engine.notJson": "движок «{command}» ответил на {what} не JSON: {said}",
  "build.noPage": "нет подложки: {path}",
  "build.noScene": "в этом ролике нет сцены «{id}»",
  "build.sceneCached": "[{at}/{of}] {id}: взята из кэша",
  "build.sceneRender": "[{at}/{of}] {id}: рисую {frames} кадров…",
  "build.sceneVideo": "[{at}/{of}] {id}: привожу вставку к кадру ролика…",
  "build.done": "готово: {out} — {secs} с, {w}×{h}, {fps} кадров, сцен {scenes}",
  "speech.noRules": "нет набора правил чтения «{name}»: ни среди поставляемых, ни по пути {path}",
  "record.notBuilt": "страница записи не собрана: выполните npm run build в каталоге инструмента",
  "record.noScene": "нет сцены {id}",
  "record.noRecording": "записи нет",
  "record.unreadable": "запись не читается: {why}",
  "record.noDuration": "у записи не определяется длительность",
  "record.noFile": "нет такого файла",
};

export const DICTS: Record<Lang, Dict> = { en, ru };

/** Язык, на котором инструмент говорит в этом запуске. */
export function langOf(named?: string): Lang {
  const want = (named ?? process.env.AGENTIC_SCREENCAST_LANG ?? process.env.LANG ?? "")
    .toLowerCase().slice(0, 2);
  return want === "ru" ? "ru" : "en";
}

let current: Lang = langOf();

/** Назначить язык — например тот, что объявил ролик. */
export const useLang = (named?: string): void => { current = langOf(named); };

/**
 * Сообщение по ключу. Подстановки — пары в фигурных скобках. Ключ,
 * которого в словаре нет, возвращается как есть: это видно в выводе
 * и чинится, а молчание — нет.
 */
export function msg(key: string, vars: Record<string, string | number> = {}): string {
  const text = DICTS[current][key] ?? DICTS.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name: string) =>
    (Object.hasOwn(vars, name) ? String(vars[name]) : `{${name}}`));
}
