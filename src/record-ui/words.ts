// Подписи страницы записи.
//
// Отдельным файлом и отдельным словарём от сообщений ядра: у страницы
// свой набор слов, и живёт она в браузере, куда узловой модуль не уедет.
// Язык приходит от РОЛИКА: человек читает вслух свой сценарий, и странно
// было бы подписывать её другим языком.
//
// Формы множественного числа считает `Intl.PluralRules`: своя таблица
// на каждый язык была бы третьим местом, где язык живёт в инструменте.

export interface PageWords {
  title: string;
  store: string;
  noScenes: string;
  scenes: string;
  scene: string;
  sec: string;
  mic: string;
  micDefault: string;
  input: string;
  allowMic: string;
  rec: string;
  again: string;
  stop: string;
  drop: string;
  saving: string;
  prev: string;
  next: string;
  recorded: string;
  about: string;
  realLengthFromTake: string;
  allBeatsDone: string;
  thatIsSceneLength: string;
  soFarAbout: string;
  serverRefused: string;
  deleteRefused: string;
  buildScene: string;
  building: string;
  recordFirst: string;
  buildRefused: string;
  beats: (n: number) => string;
  recordedOf: (done: number, all: number) => string;
}

const en = (lang: string): PageWords => {
  const plural = new Intl.PluralRules(lang);
  const beat = (n: number): string => (plural.select(n) === "one" ? "beat" : "beats");
  return {
    title: "Voice recording",
    store: "store",
    noScenes: "No scenes — check the script.",
    scenes: "scenes",
    scene: "scene",
    sec: "s",
    mic: "Microphone",
    micDefault: "default",
    input: "input",
    allowMic: "Allow microphone access",
    rec: "Record",
    again: "Record again",
    stop: "Stop",
    drop: "Delete",
    saving: "saving…",
    prev: "← previous",
    next: "next →",
    recorded: "recorded:",
    about: "about",
    realLengthFromTake: "the real length comes from the take",
    allBeatsDone: "every beat recorded:",
    thatIsSceneLength: "— that is how long the scene will run",
    soFarAbout: "so far about",
    serverRefused: "the server did not accept the recording",
    deleteRefused: "the server could not delete the recording",
    buildScene: "Build and watch",
    building: "building the scene…",
    recordFirst: "record at least one beat first",
    buildRefused: "the scene could not be built",
    beats: (n) => `${n} ${beat(n)}`,
    recordedOf: (done, all) => `Recorded ${done} of ${all} ${beat(all)}`,
  };
};

const ru = (lang: string): PageWords => {
  const plural = new Intl.PluralRules(lang);
  const beat = (n: number): string => {
    const form = plural.select(n);
    if (form === "one") return "такт";
    if (form === "few") return "такта";
    return "тактов";
  };
  return {
    title: "Запись озвучки",
    store: "хранилище",
    noScenes: "Сцен нет — проверьте сценарий.",
    scenes: "сцены",
    scene: "сцена",
    sec: "с",
    mic: "Микрофон",
    micDefault: "по умолчанию",
    input: "вход",
    allowMic: "Разрешить доступ к микрофону",
    rec: "Записать",
    again: "Перезаписать",
    stop: "Стоп",
    drop: "Удалить",
    saving: "сохраняю…",
    prev: "← предыдущая",
    next: "следующая →",
    recorded: "записано:",
    about: "ориентир: примерно",
    realLengthFromTake: "настоящая длина возьмётся из записи",
    allBeatsDone: "записаны все такты:",
    thatIsSceneLength: "— столько и будет длиться сцена",
    soFarAbout: "пока выходит примерно",
    serverRefused: "сервер не принял запись",
    deleteRefused: "сервер не смог удалить запись",
    buildScene: "Собрать и посмотреть",
    building: "собираю сцену…",
    recordFirst: "сначала запишите хотя бы один такт",
    buildRefused: "сцену собрать не удалось",
    beats: (n) => `${n} ${beat(n)}`,
    recordedOf: (done, all) => `Записано ${done} из ${all} ${beat(all)}`,
  };
};

/** Слова страницы на языке ролика; незнакомый язык — английский. */
export function pageWords(lang: string): PageWords {
  return lang.toLowerCase().startsWith("ru") ? ru(lang) : en(lang);
}
