// Документация: переменные окружения, ссылки, команды README, агентские файлы, обязательные поля.
// Проверки этого класса выполняются по порядку при импорте модуля; итог печатает suite.ts.
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { sourceFiles, SOURCE_ROOT } from "../../self-hash.js";
import { allKinds } from "../../schema.js";
import { HERE, run, check, README_RU, PUBLIC_READMES, DOC_CMDS, ENTRY, tokenize, RAN, runDoc } from "./common.js";

// 4. Каждая переменная окружения, читаемая кодом, названа в README.
await check("переменные окружения описаны", () => {
  // Обход ПОЛНЫЙ: тот же список файлов, что входит в хеш исходников.
  // Прежний брал один каталог по маске расширений, и после переезда
  // в `src/` нашёл бы пустоту — а пустое множество имён означает «ничего
  // не пропущено», то есть проверка позеленела бы молча. Питон добавляется
  // отдельно: он лежит в корне продукта и в дерево исходников не входит.
  const files = sourceFiles().map((f) => resolve(SOURCE_ROOT, f));
  if (files.length < 5) return `обход исходников нашёл файлов: ${files.length}`;
  const src = files.map((f) => readFileSync(f, "utf8")).join("\n");
  const used = new Set<string>();
  for (const m of src.matchAll(/process\.env\.([A-Z][A-Z_]+)/g)) used.add(m[1]);
  for (const m of src.matchAll(/os\.environ(?:\.get)?\(\s*["']([A-Z][A-Z_]+)["']/g)) used.add(m[1]);
  // Имена, читаемые собственными разборщиками .env, — они переопределяемы данными.
  for (const m of src.matchAll(/env(?:_key)?\(\s*(?:[\w.?\s]*\?\?\s*)?"([A-Z][A-Z_]+)"/g)) used.add(m[1]);
  for (const m of src.matchAll(/get\(\s*'key_env',\s*'([A-Z_]+)'/g)) used.add(m[1]);
  used.delete("PATH");
  const missing = [...used].filter((v) => !PUBLIC_READMES.includes(v));
  return missing.length === 0 ? true : `не описаны: ${missing.join(", ")}`;
});

// 5. Ключ доступа не оседает в данных: объект голоса не должен его содержать.
await check("ключ не в данных голоса", () => {
  const b = readFileSync(resolve(SOURCE_ROOT, "build.ts"), "utf8");
  const bad = /voice\s*=\s*\{[^}]*key/i.test(b) || /CLOUD_KEY/.test(b);
  return bad ? "сборщик знает про ключ — он должен жить только в провайдере" : true;
});

await check("нет ссылок наружу", () => {
  // Смотрится то, что может попасть в продукт: отслеживаемое и неотслеживаемое,
  // но не игнорируемое. Прежде обход шёл по всему диску каталога, и ссылка
  // в игнорируемом рабочем месте агента (`agent_temp_files_local/`, рабочее
  // пространство процесса) роняла проверку, хотя в историю она не попадёт никогда.
  const listed = run("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"]);
  if (listed.status !== 0) return `git ls-files не выполнился: ${listed.stderr.trim()}`;
  const links = listed.stdout.split("\0").filter(Boolean)
    .filter((f) => !f.startsWith("node_modules/"))
    .filter((f) => { try { return lstatSync(resolve(HERE, f)).isSymbolicLink(); } catch { return false; } });
  const outside = links.filter((l) => {
    const t = run("readlink", [l]).stdout.trim();
    return t.startsWith("/") || t.startsWith("..");
  });
  return outside.length === 0 ? true : `ведут наружу: ${outside.join(", ")}`;
});

// 7. При незаданных переменных ни одно умолчание не уводит за корень
// продукта. Проверка симлинков этого не видит: привязка живёт
// в вычислении пути, а не в ссылке.
await check("умолчания не уводят наружу", () => {
  const clean = { ...process.env };
  delete clean.AGENTIC_SCREENCAST_HOME;
  // Спрашиваются ОБЕ половины: сам инструмент и движок голоса. Прежде
  // вторую половину отвечал питоновский драйвер; после выноса питона
  // за границу инструмента её отвечает поставляемый движок — иначе
  // измерение исчезло бы вместе с драйвером, а не сменило источник.
  const node = run("node", [ENTRY, "paths"], { env: clean });
  if (node.status !== 0) return `точка входа не назвала пути: ${(node.stderr || "").slice(0, 160)}`;
  const engine = run("node", [resolve(HERE, "dist", "voice-cli.js"), "paths"], { env: clean });
  if (engine.status !== 0) return `движок голоса не назвал пути: ${(engine.stderr || "").slice(0, 160)}`;

  // Признак «наружу» не зависит от имён: путь разворачивается в абсолютный
  // и обязан лежать под корнем продукта либо под текущим рабочим каталогом.
  // Подстрочный признак поймал бы только уже известную ошибку — и ничего,
  // кроме неё, у постороннего пользователя.
  const roots = [HERE, process.cwd()].map((p) => resolve(p) + "/");
  const paths: Record<string, unknown> = { ...JSON.parse(engine.stdout), ...JSON.parse(node.stdout) };
  if (Object.keys(paths).length < 3) return `путей названо слишком мало: ${Object.keys(paths).length}`;
  const bad = Object.entries(paths)
    .filter(([, v]) => typeof v === "string")
    .filter(([, v]) => !roots.some((r) => (resolve(v as string) + "/").startsWith(r)));
  return bad.length === 0 ? true
    : bad.map(([k, v]) => `${k} уходит наружу: ${resolve(v as string)}`).join("; ");
});

// 8. Каждая команда, напечатанная в README, действительно исполняется.
// Сверки имён мало: команда может состоять из существующих флагов и всё равно
// падать, потому что документация называет вход, которого нет, — так и было.
// Поэтому команды запускаются, а не разбираются, и запускаются они в каталоге
// примера, где лежит `story.md`: README обещает читателю ровно это.
//
// Проверка обязана значить одно и то же в голом окружении и в полностью
// установленном. Прежде она этого не делала: без переменных из README
// падали ВСЕ команды синтеза, и набор краснел; с переменными — зеленел.
// То есть результат сообщал про оболочку запускающего, а не про документ.
// Различать надо два состояния: README называет вход, которого нет
// (дефект документа), и читатель ещё не скачал названные README же
// большие файлы (его окружение). Второе прощается поимённо, первое — нет.
await check("команды README исполняются", () => {
  if (DOC_CMDS.length < 3) return `в README нашлось команд: ${DOC_CMDS.length}`;
  const failed = [];
  // Прощение делает проверку уязвимой к зелени от пустоты: если не
  // исполнилась НИ ОДНА команда, прощены будут все, и проверка пройдёт,
  // ничего не показав. Поэтому считаем исполнившиеся и требуем не ноль.
  let ran = 0;
  const skipped = [];
  // Исключений по подкомандам здесь нет. Прежде `check` и `verify`
  // пропускались как «их гоняют первые две проверки», но те гоняли свои
  // команды, а не напечатанные, — и подложенная в README негодная строка
  // оставалась незамеченной. Теперь первые две проверки берут свои команды
  // отсюда же, поэтому каждая документированная строка запускается ровно раз:
  // `verify` — проверкой 1, `check` — проверкой 2, остальные — этой.
  // Строка с подстановкой вида «/путь/…» — иллюстрация, а не обещание:
  // такого пути на машине читателя нет и быть не может. Считаем такие
  // отдельно, чтобы прощение не превратилось в зелень от пустоты.
  const illustrations: string[] = [];
  for (const line of DOC_CMDS) {
    if (RAN.has(line)) continue;              // уже запущена выше, а не пропущена
    if (line.includes("/путь/") || line.includes("/path/") || line.includes("<")) { illustrations.push(line); continue; }
    const sub = tokenize(line)[0];
    // Интерфейс записи — сервер: он не завершается, а ждёт человека.
    // Запустить его здесь значило бы повесить прогон. Прощение поимённое
    // и не слепое: сквозной проход через эту же страницу гоняет
    // отдельная проверка, и она доходит до готового ролика.
    if (sub === "record") { skipped.push(`«${line}» — это сервер, его гоняет проверка сквозного прохода`); continue; }
    // Сборку гоняем без рендера: проверяется исполнимость команды,
    // а не картинка, — картинку проверяют первые две.
    const r = runDoc(line, sub === "build" ? ["--keys-only"] : []);
    if (r.status === 0) { ran++; continue; }
    // Прощаются ровно те помехи, которые от документа не зависят: чужой
    // ключ доступа и не поставленный читателем внешний движок голоса.
    // В обоих случаях команда разобрана и дошла до внешнего ресурса,
    // то есть исполнилась. Отсутствие входного файла или неверный флаг
    // таким снисхождением не пользуются — именно они и были дефектом.
    const why = ((r.stderr || "") + (r.stdout || "")).trim();
    const asset =
      /нет ключа [A-Z_]+|no key [A-Z_]+/.test(why) ? "нет ключа доступа"
      : (r.error as NodeJS.ErrnoException | undefined)?.code === "ENOENT"
        || /программа не найдена|program not found/.test(why)
        ? "внешний движок голоса не поставлен"
      : /нет файла модели/.test(why) ? "нет файла модели голоса"
      : null;
    if (asset) { skipped.push(`«${line}» — ${asset}`); continue; }
    failed.push(`«${line}» → код ${r.status}: ${why.split("\n")[0]}`);
  }
  if (failed.length) return failed.join("; ");
  if (ran === 0) return `ни одна документированная команда не исполнилась: ${skipped.join("; ")}`;
  if (illustrations.length > DOC_CMDS.length / 2) {
    return `иллюстраций больше, чем исполнимых команд: ${illustrations.length} из ${DOC_CMDS.length}`;
  }
  return true;
});

// 12. То, что документация внешней половины велит поставить в дерево,
// закрыто правилом игнорирования.
//
// Дефект, который это ловит, уже случался: окружение переехало
// из `external/silero/` в `external/`, документация переехала вместе
// с ним, а правило осталось на прежнем месте. Последствие тихое
// и дорогое: поставивший внешнюю половину получает шестьсот мегабайт
// неотслеживаемых файлов, `git status` перестаёт быть сигналом,
// а коммит по всему дереву уносит их в историю инструмента.
//
// Список путей НЕ пишется здесь заново — он извлекается из тех самых
// команд, которые документация велит выполнить. Иначе появился бы
// второй список истины, и разошёлся бы он ровно так же.
await check("что документация велит поставить, то и игнорируется", () => {
  const doc = resolve(HERE, "external", "README.md");
  if (!existsSync(doc)) return true;              // внешней половины нет — нечего проверять
  const text = readFileSync(doc, "utf8");
  const wanted = new Set<string>();
  for (const m of text.matchAll(/python3 -m venv (\S+)/g)) wanted.add(m[1]!);
  for (const m of text.matchAll(/curl -L -o (\S+)/g)) wanted.add(m[1]!);
  if (wanted.size === 0) return "в документации внешней половины не нашлось команд установки";

  const probe = run("git", ["check-ignore", "-q", "external/README.md"]);
  // Код 128 означает «git недоступен или это не репозиторий»; 0 и 1 —
  // обычные ответы «игнорируется» и «нет».
  if (probe.status === 128) return true;

  const missed = [...wanted].filter((p) => {
    const path = `external/${p.replace(/^\.\//, "")}`;
    // Спрашиваем и о самом пути, и о файле внутри него: правило вида
    // `external/.venv/` закрывает КАТАЛОГ, а несуществующий путь без
    // косой черты git каталогом не считает и ответит «не игнорируется».
    const asFile = run("git", ["check-ignore", "-q", path]).status === 0;
    const asDir = run("git", ["check-ignore", "-q", `${path}/файл`]).status === 0;
    return !asFile && !asDir;
  });
  return missed.length === 0 ? true
    : `документация велит поставить, но правило не закрывает: ${missed.join(", ")}`;
});

// 13. Агентский файл не пересказывает документацию, а отсылает к ней,
// и файл для Клода не несёт своего содержания, а импортирует агентский.
//
// Требование пользователя дословно: «в агентские файлы много не пиши,
// лучше там сослаться на другую существующую документацию». Проверяется
// именно это, а не наличие двух файлов: два файла с одинаковым текстом
// прошли бы проверку на существование и разошлись бы при первой правке.
await check("агентские файлы отсылают, а не пересказывают", () => {
  const agents = resolve(HERE, "AGENTS.md");
  const claude = resolve(HERE, "CLAUDE.md");
  if (!existsSync(agents)) return "нет AGENTS.md";
  if (!existsSync(claude)) return "нет CLAUDE.md";

  const claudeText = readFileSync(claude, "utf8").trim();
  if (!/^@AGENTS\.md$/m.test(claudeText)) return "CLAUDE.md не импортирует AGENTS.md";
  if (claudeText.split("\n").filter((l) => l.trim()).length !== 1) {
    return "CLAUDE.md несёт собственное содержание, а должен только импортировать";
  }

  const agentsText = readFileSync(agents, "utf8");
  const lines = agentsText.split("\n").length;
  if (lines > 60) return `AGENTS.md разросся до ${lines} строк — это уже пересказ`;
  // Отсылка обязана быть настоящей: файл называет документы, где лежат
  // подробности, а не заменяет их собой.
  for (const doc of ["README.md", "external/README.md"]) {
    if (!agentsText.includes(doc)) return `AGENTS.md не отсылает к ${doc}`;
  }
  return true;
});

// 16. Таблица видов сцен в README называет ровно те обязательные поля,
// которых требует разбор.
//
// Это третье место, где обязательность полей может быть написана рукой,
// и оно уже расходилось: README называл обязательными у сцены-экрана
// `target` и `mustRead`, которых разбор не требует, а у величины — `values`
// там, где описание формата требовало `value`. Читатель верит документу,
// поэтому расхождение стоит ему правки работающего сценария.
//
// Ожидаемое берётся из `REQUIRED` — той же таблицы, что применяет разбор
// и из которой порождается схема; четвёртого списка не заводится.
await check("README называет те же обязательные поля, что и поставщики", () => {
  // Таблица README пишет вид так же, как его пишут в заголовке сцены:
  // `slides.compare`, `page`. Точка в имени — часть имени, поэтому образец
  // берёт и её.
  // Ищем в РАЗДЕЛЕ про виды сцен, а не по всему документу: имя `page`
  // носят и вид сцены, и подкоманда договора о поставщике, и таблицы
  // с ними стоят в разных местах — по всему файлу совпало бы не то.
  const from = README_RU.indexOf("Инструмент приносит с собой");
  if (from < 0) return "в README не нашлось раздела про виды сцен";
  const to = README_RU.indexOf("\n## ", from);
  const section = README_RU.slice(from, to > 0 ? to : undefined);
  const rows = [...section.matchAll(/^\|\s*`([\w.]+)`\s*\|[^|]*\|([^|]*)\|/gm)];
  const kinds = allKinds();
  const nameOf = (e: (typeof kinds)[number]): string =>
    (e.kind === e.provider ? e.provider : `${e.provider}.${e.kind}`);
  const names = kinds.map(nameOf);
  const documented = new Map(rows
    .filter((m) => names.includes(m[1]!))
    .map((m) => [m[1]!, new Set([...m[2]!.matchAll(/`(\w+)`/g)].map((f) => f[1]!))]));
  if (documented.size !== kinds.length) {
    return `в README описано видов сцен: ${documented.size} из ${kinds.length}`;
  }
  const wrong: string[] = [];
  for (const e of kinds) {
    const want = new Set(e.spec.required.flat());
    const got = documented.get(nameOf(e))!;
    const extra = [...got].filter((f) => !want.has(f));
    const missing = [...want].filter((f) => !got.has(f));
    if (extra.length) wrong.push(`${nameOf(e)}: README требует лишнее — ${extra.join(", ")}`);
    if (missing.length) wrong.push(`${nameOf(e)}: README не называет обязательное — ${missing.join(", ")}`);
  }
  return wrong.length === 0 ? true : wrong.join("; ");
});

// 23. В инструменте и его документации не остаётся опознавательных
// признаков конкретного потребителя. Требуемое состояние: средство
// общего назначения не знает, кто им пользуется. Правдоподобное неверное:
// признак вернули не в код, а в документ — таблицу переменных, пример
// в README, — и наблюдение, глядящее только в исходники, зелено.
// Поэтому множество здесь одно: исходники продукта И постоянная
// документация.
//
// Исключений больше нет. Прежде им был словарь произношения: имя чужого
// продукта лежало в коде инструмента, и убрать его молча было нельзя —
// изменилась бы строка синтеза, а с нею ключ кэша, то есть оплаченный
// звук пришлось бы покупать заново. Теперь правила чтения — данные,
// и термины своей области ролик приносит сам.
await check("ни в коде, ни в документации нет признаков потребителя", () => {
  const MARKS = ["better-auth", "react-flow"];
  // Пути исходников приходят относительно их корня, а документация
  // лежит от корня проекта: складываем оба вида в один перечень пар
  // «как показать» и «где лежит».
  const files: Array<[string, string]> = [
    ...sourceFiles()
      .filter((f) => !f.startsWith("tests/"))
      .map((f): [string, string] => [`src/${f}`, resolve(SOURCE_ROOT, f)]),
    ...["README.md", "AGENTS.md", "external/README.md"]
      .map((f): [string, string] => [f, resolve(HERE, f)]),
  ];
  const hits: string[] = [];
  for (const [rel, full] of files) {
    if (!existsSync(full)) continue;
    const body = readFileSync(full, "utf8").toLowerCase();
    for (const m of MARKS) {
      let at = body.indexOf(m);
      while (at >= 0) {
        hits.push(`${rel}:${body.slice(0, at).split("\n").length}:${m}`);
        at = body.indexOf(m, at + m.length);
      }
    }
  }
  return hits.length === 0 ? true : `признак потребителя в инструменте: ${hits.join(", ")}`;
});
