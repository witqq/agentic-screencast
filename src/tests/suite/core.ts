// Ядро: рендер, признак кадра, поставщики и их договоры, язык инструмента, чистота ядра.
// Проверки этого класса выполняются по порядку при импорте модуля; итог печатает suite.ts.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { Ajv2020 } from "ajv/dist/2020.js";
import { sourceFiles, SOURCE_ROOT } from "../../self-hash.js";
import { allKinds } from "../../schema.js";
import { run, check, ENTRY, EXAMPLE, docCmd, runDoc } from "./common.js";

// 1. Ядро рендера: воспроизводимость, живость, замороженное время, сикабельность.
await check("ядро рендера", () => {
  const line = docCmd("verify");
  if (!line) return "в README нет команды verify";
  const r = runDoc(line);
  return r.status === 0 ? true : `«${line}» → код ${r.status}`;
});

// 2. Признак кадра на примере.
await check("признак кадра", () => {
  const line = docCmd("check");
  if (!line) return "в README нет команды check";
  const r = runDoc(line);
  return r.status === 0 ? true : `«${line}» → код ${r.status}`;
});

// 3. Неизвестный провайдер обязан валить команду, а не молчать.
await check("неизвестный провайдер краснеет", () => {
  const r = run("node", [ENTRY, "voices", "--engine", "нет-такого"]);
  return r.status !== 0 ? true : "код 0 при неизвестном провайдере";
});

// 15. Описание формата годно к употреблению ЧУЖИМ агентом: он берёт схему
// одной командой инструмента, сцены — другой, и проверяет одно другим.
//
// Модульные тесты это же свойство меряют на функции. Здесь предмет иной
// и он тоже уже ломался: годная функция ничего не стоит, если печатает
// её не та подкоманда, если сцены отдать нечем или если два вывода
// описывают разные формы. Различающее наблюдение — вычисление схемы,
// а не осмотр её полей: документ, не принимающий НИ ОДНОЙ сцены, при
// осмотре полей неотличим от верного, и ровно таким он тут и был.
await check("напечатанная схема проверяет напечатанные сцены", () => {
  const schemaOut = run("node", [ENTRY, "schema"], { cwd: EXAMPLE });
  if (schemaOut.status !== 0) return `schema → код ${schemaOut.status}`;
  const scenesOut = run("node", [ENTRY, "scenes", "--source", "story.md"], { cwd: EXAMPLE });
  if (scenesOut.status !== 0) return `scenes → код ${scenesOut.status}`;

  const validate = new Ajv2020({ strict: false }).compile(JSON.parse(schemaOut.stdout));
  const scenes = JSON.parse(scenesOut.stdout) as Array<Record<string, unknown>>;
  if (scenes.length < 3) return `сцен напечатано: ${scenes.length}`;
  const ok = (scene: unknown): boolean => validate(scene) as boolean;
  for (const scene of scenes) {
    if (!ok(scene)) {
      return `схема отвергает собственный пример, сцена ${String(scene.id)}: `
        + JSON.stringify(validate.errors?.[0]);
    }
  }
  // Обратная половина: схема, принимающая что угодно, зелена на любом
  // входе — её положительный ответ выше ничего бы не значил.
  const spoiled = scenes.map((s) => ({ ...s, fields: { ...(s.fields as object), kikcer: "опечатка" } }));
  if (spoiled.some((s) => ok(s))) return "схема принимает поле, которого разбор не знает";
  return true;
});

// 18. Подкоманда, получившая несуществующий вход, отвечает ПРИЧИНОЙ,
// а не дампом внутренностей.
//
// Это единственное, что видит чужой агент, ошибившийся путём, — то есть
// ровно тот читатель, ради которого инструмент и приводился в порядок.
// Класс чинился в продукте уже трижды и трижды оставался без постоянного
// наблюдения; отказ тихий и односторонний: команда с существующим входом
// продолжает работать, поэтому проверка 8, требующая нулевого кода
// возврата на командах README, к нему слепа по устройству.
//
// Различаются два состояния: отказ, называющий вход и форму вызова,
// и необработанное исключение — у второго ненулевой код тоже есть,
// но в потоке ошибок лежат кадры стека и внутренние пути узла.
await check("отказ подкоманды называет вход, а не сыплет дампом", () => {
  const dir = mkdtempSync(join(tmpdir(), "slidecast-refuse-"));
  try {
    // Три разных шва, ведущие к отказу: разрешение файла настройки,
    // разбор источника у новой подкоманды и он же у сборки.
    const cases: Array<[string, string[], string]> = [
      ["snapshot", ["snapshot", "нет-настройки.json", "out"], "нет-настройки.json"],
      ["scenes", ["scenes", "--source", "нет-источника.md"], "нет-источника.md"],
      ["build", ["build", "--source", "нет-источника.md"], "нет-источника.md"],
    ];
    const bad: string[] = [];
    for (const [name, argv, input] of cases) {
      const r = run("node", [ENTRY, ...argv], { cwd: dir });
      const said = ((r.stderr || "") + (r.stdout || "")).trim();
      if (r.status === 0) { bad.push(`${name}: код 0 на несуществующем входе`); continue; }
      if (!said.includes(input)) bad.push(`${name}: отказ не называет вход (${said.split("\n")[0]})`);
      if (/^\s+at\s/m.test(said) || said.includes("node:internal")) {
        bad.push(`${name}: отказ пришёл дампом (${said.split("\n")[0]})`);
      }
    }
    return bad.length === 0 ? true : bad.join("; ");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// 25. Материал сцены приходит от ПОСТАВЩИКА, и ядро не знает ни одного
// вида сцены.
//
// Требуемое состояние: посторонний вид, обслуживаемый чужой программой,
// проходит весь путь — разбор, схему, порождение страницы, сборку.
// Правдоподобное неверное: поставщики заведены, но виды по-прежнему
// перечислены в ядре, и работает только то, что в списке. По коду это
// неотличимо: список никуда не делся бы, просто назывался иначе.
// Различает сцена вида, которого в исходниках инструмента нет вовсе.
await check("сцену рисует посторонний поставщик, о котором ядро не знает", () => {
  const dir = mkdtempSync(join(tmpdir(), "slidecast-prov-"));
  try {
    // Поставщик в десяток строк: объявляет свой вид и рисует страницу.
    // Ни одного слова отсюда в исходниках инструмента нет.
    const prov = join(dir, "provider.mjs");
    writeFileSync(prov, [
      'const [, , cmd, ...rest] = process.argv;',
      'const arg = (k) => rest[rest.indexOf(`--${k}`) + 1];',
      'if (cmd === "kinds") {',
      '  console.log(JSON.stringify({ card: { about: "карточка чужого поставщика",',
      '    fields: ["heading", "at"], required: [["heading"]],',
      '    effects: { fade: { in: 0.2, out: 0.2 } } } }));',
      '} else if (cmd === "page") {',
      '  const scene = JSON.parse(arg("scene-json"));',
      '  const out = arg("out");',
      '  const fs = await import("node:fs"); const path = await import("node:path");',
      '  fs.mkdirSync(out, { recursive: true });',
      '  const file = path.join(out, `${scene.id}.html`);',
      '  fs.writeFileSync(file, `<!doctype html><html data-sc-page lang="ru"><head><meta charset="utf-8">`',
      '    + `<title>карточка</title></head><body data-at="b1">`',
      '    + `<h1 class="el" data-at="b1">${scene.fields.heading}</h1></body></html>`);',
      '  console.log(JSON.stringify({ file }));',
      '} else { process.exit(2); }',
    ].join("\n"));

    const story = join(dir, "story.md");
    writeFileSync(story, [
      "# Чужая тема",
      `voice: {"engine":"stub","name":"nullvoice","cps":18}`,
      `providers: {"my": "${process.execPath} ${prov}"}`, "",
      "## c1 · my.card",
      "heading: Карточка чужого поставщика", "",
      "Такт речи чужой сцены.", "",
    ].join("\n"));

    // 1. Схема знает вид чужого поставщика и его поля.
    const schema = run("node", [ENTRY, "schema", "--source", story], { cwd: dir });
    if (schema.status !== 0) return `schema → код ${schema.status}: ${schema.stderr.slice(0, 160)}`;
    const doc = JSON.parse(schema.stdout) as { $defs: Record<string, { properties: Record<string, unknown> }> };
    if (!doc.$defs["my.card"]) return `схема не знает вида чужого поставщика: ${Object.keys(doc.$defs).join(", ")}`;
    if (!Object.hasOwn(doc.$defs["my.card"].properties, "heading")) {
      return "схема не назвала поле, объявленное поставщиком";
    }

    // 2. Сборка доходит до конца и рисует страницу поставщика.
    const home = join(dir, "home");
    const built = run("node", [ENTRY, "build", "--source", story, "--out", join(dir, "out.mp4")],
      { cwd: dir, env: { ...process.env, AGENTIC_SCREENCAST_HOME: home }, timeout: 300_000 });
    if (built.status !== 0) {
      return `сборка отказала: ${(built.stderr || built.stdout || "").trim().slice(-200)}`;
    }
    const page = join(dir, "slides", "c1.html");
    if (!existsSync(page)) return "страница чужого поставщика не порождена";
    if (!readFileSync(page, "utf8").includes("Карточка чужого поставщика")) {
      return "в странице нет того, что назвала сцена";
    }

    // 3. Опечатка в поле отвергается — правилами ПОСТАВЩИКА, а не ядра.
    const typo = join(dir, "typo.md");
    writeFileSync(typo, readFileSync(story, "utf8").replace("heading:", "headnig:"));
    const bad = run("node", [ENTRY, "scenes", "--source", typo], { cwd: dir });
    if (bad.status === 0) return "поле, которого поставщик не объявлял, принято молча";

    // 4. Имени чужого вида нет в исходниках инструмента: если бы ядро
    // его знало, весь этот путь ничего не доказывал бы.
    // Каталог проверок исключён намеренно: имя чужого вида написано
    // прямо здесь, и без исключения наблюдение краснело бы на самом себе.
    const mine = sourceFiles().filter((f) => !f.startsWith("tests/"))
      .map((f) => readFileSync(resolve(SOURCE_ROOT, f), "utf8")).join("\n");
    if (mine.includes("my.card") || mine.includes("heading")) {
      return "имя чужого вида найдено в исходниках инструмента";
    }
    return true;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// 26. В ЯДРЕ не осталось ни имени вида сцены, ни порога приёмки.
//
// Требуемое состояние: то и другое принадлежит поставщику материала.
// Правдоподобное неверное: поставщики заведены и работают, но ядро
// на всякий случай помнит прежние умолчания — одну ветку по виду сцены
// или одно число «если поставщик промолчал». Работающий пример обоим
// состояниям одинаково зелен: свои виды и свои пороги никуда не делись.
// Различает только осмотр ядра, и он же ловит возврат числа под другим
// именем.
//
// Ядро — это `src` без каталога поставщиков и без проверок: у поставщика
// имена видов и числа на месте по праву, а проверки о них говорят.
await check("в ядре нет ни имён видов сцен, ни порогов приёмки", () => {
  const core = sourceFiles()
    .filter((f) => !f.startsWith("provider/") && !f.startsWith("tests/"))
    .map((f) => [f, readFileSync(resolve(SOURCE_ROOT, f), "utf8")] as const);
  if (core.length < 10) return `файлов ядра насчиталось: ${core.length}`;

  // Имена берутся у поставщиков, а не пишутся здесь: заведут новый вид —
  // проверка станет следить и за ним, ничего не требуя от автора.
  const names = allKinds().flatMap((e) => (e.kind === e.provider ? [] : [e.kind]));
  const numbers = ["220", "1.15", "0.85", "0.002"];
  // Совпадения, которые не решают ничего о виде сцены или приёмке кадра, названы поимённо —
  // файл и кусок строки, с причиной. Новое совпадение по-прежнему краснеет, пока его не
  // разберут здесь же: так исключение видно, а не растворено в ослабленном правиле.
  const ALLOWED: Array<[string, string]> = [
    // «card» — ещё и поле фокуса (карточка у предмета), а не вид сцены `slides.card`.
    ["spotlight.ts", `"slow", "card"`], ["schema.ts", `"slow", "card"]`], ["agentic-screencast.ts", `"card":{"title"`],
    // Сила вспышки и запас увеличения тряски — числа эффекта, а не пороги приёмки кадра.
    ["effects.ts", "strength: 0.85"], ["effects.ts", "+ 0.002)"], ["agentic-screencast.ts", "strength 0.85"],
    // Предмет выше 85% кадра — весь экран: полосу субтитров от него не уводят. Это геометрия
    // выбора полосы, а не приёмка кадра.
    ["capband.ts", "r.height >= frame.height * 0.85"],
    // Допуск округления времени главы в WebVTT (миллисекунды записи), а не порог качества кадра.
    ["film-audit.ts", "Math.abs(cue.start - r.start) > 0.002"],
  ];
  const hits: string[] = [];
  for (const [file, body] of core) {
    for (const line of body.split("\n")) {
      if (ALLOWED.some(([f, piece]) => f === file && line.includes(piece))) continue;
      // Комментарии не в счёт: они объясняют устройство, а не решают.
      const code = line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");
      if (!code.trim() || code.trim().startsWith("*")) continue;
      // Строки с проверкой типа не в счёт: «number» там — имя типа языка.
      if (code.includes("typeof")) continue;
      for (const n of names) {
        if (new RegExp(`["'\`]${n}["'\`]`).test(code)) hits.push(`${file}: вид «${n}»`);
      }
      for (const num of numbers) {
        if (new RegExp(`(?<![\\d.])${num.replace(".", "\\.")}(?![\\d])`).test(code)) {
          hits.push(`${file}: порог ${num}`);
        }
      }
    }
  }
  return hits.length === 0 ? true : `ядро всё ещё знает: ${[...new Set(hits)].join(", ")}`;
});

// 29. Языка в ЯДРЕ не осталось: он приходит от ролика или из окружения.
//
// Требуемое состояние: тот же отказ на том же сценарии приходит
// по-английски и по-русски, а машинные отчёты подписаны устойчивыми
// идентификаторами, а не словами языка. Правдоподобное неверное:
// словарь заведён, но часть строк осталась литералами — на русской
// машине этого не видно вовсе, потому что и словарь, и литералы
// по-русски. Поэтому наблюдение гоняет ОБА языка и осматривает вывод
// на чужие буквы.
await check("язык, на котором инструмент говорит, задаётся снаружи", () => {
  const dir = mkdtempSync(join(tmpdir(), "slidecast-lang-"));
  try {
    const bad = join(dir, "story.md");
    writeFileSync(bad, ["# Ролик", "", "## s01 · slides.compare", "kikcer: опечатка", "",
      "Реплика.", ""].join("\n"));
    const say = (lang: string): string => {
      const r = run("node", [ENTRY, "scenes", "--source", bad],
        { cwd: dir, env: { ...process.env, AGENTIC_SCREENCAST_LANG: lang } });
      if (r.status === 0) return "";
      return ((r.stderr || "") + (r.stdout || "")).trim();
    };
    const en = say("en");
    const ru = say("ru");
    if (!en || !ru) return "отказ не пришёл вовсе — наблюдение непроверяемо";
    if (!/is not allowed/.test(en)) return `по-английски сказано не то: ${en.slice(0, 120)}`;
    if (!/недопустимо/.test(ru)) return `по-русски сказано не то: ${ru.slice(0, 120)}`;
    // Английский отказ обязан быть английским целиком: одна строка,
    // оставшаяся литералом, здесь и видна.
    if (/[а-яё]/i.test(en.replace(/«[^»]*»/g, ""))) {
      return `в английском отказе осталась кириллица: ${en.slice(0, 160)}`;
    }

    // Машинные отчёты подписаны идентификаторами, а не словами языка:
    // по ним пишут проверки, и перевод не должен их ломать.
    const good = join(dir, "ok.md");
    writeFileSync(good, ["# Ролик", `voice: {"engine":"stub","name":"nullvoice"}`, "",
      "## s01 · slides.number", "values: 7 :: штук", "", "Реплика.", ""].join("\n"));
    const order = run("node", [ENTRY, "order", "--source", good],
      { cwd: dir, env: { ...process.env, AGENTIC_SCREENCAST_LANG: "ru" }, timeout: 300_000 });
    if (order.status !== 0) return `порядок не проверился: ${(order.stderr || "").slice(0, 160)}`;
    const keys = Object.keys(JSON.parse(order.stdout) as Record<string, unknown>);
    const cyrillic = keys.filter((k) => /[а-яё]/i.test(k));
    if (cyrillic.length) return `ключи отчёта на языке: ${cyrillic.join(", ")}`;
    if (!keys.includes("scenesChecked")) return `в отчёте нет ожидаемого ключа: ${keys.join(", ")}`;
    return true;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
