#!/usr/bin/env node
// Набор проверок продукта. Одна команда, один код возврата.
//
// Зелёное — все проверки прошли. Красное — хотя бы одна не прошла,
// и код возврата ненулевой: в чужих сценариях «нет такого провайдера»
// не должно быть неотличимо от успеха.
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import type { SpawnSyncReturns } from "node:child_process";
import { Ajv2020 } from "ajv/dist/2020.js";
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { sourceFiles, SOURCE_ROOT } from "../self-hash.js";
import { allKinds } from "../schema.js";
import { FFMPEG as FFMPEG_BIN, FFPROBE as FFPROBE_BIN } from "../voice/audio.js";
import { fileURLToPath } from "node:url";

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const run = (cmd: string, args: string[], opts: Record<string, unknown> = {}): SpawnSyncReturns<string> =>
  spawnSync(cmd, args, { cwd: HERE, encoding: "utf8", ...opts });

const results: Array<[string, boolean, string]> = [];
// Проверка может быть и обещанием: часть предметов измеряется только
// в браузере, а он отвечает не сразу. Ждём каждую по очереди — порядок
// вывода тогда совпадает с порядком в файле, и красная строка находится
// глазами там, где написана.
const check = async (name: string, fn: () => true | string | Promise<true | string>): Promise<void> => {
  try { const r = await fn(); results.push([name, r === true, r === true ? "" : String(r)]); }
  catch (e) { results.push([name, false, String((e as Error).message).slice(0, 200)]); }
};

// Команды берутся из обеих публичных README, а не пишутся здесь заново. Иначе набор гоняет
// свои команды, документированные остаются непроверенными, и расхождение
// документа с кодом снова становится невидимым — уже проходили.
// Запускаются они в каталоге примера: README обещает читателю ровно это.
const README = readFileSync(resolve(HERE, "README.md"), "utf8");
const README_RU = readFileSync(resolve(HERE, "README.ru.md"), "utf8");
const PUBLIC_READMES = `${README}\n${README_RU}`;
// Хвостовой комментарий отрезается: иначе его слова уезжают в аргументы
// команды, и в них может оказаться что угодно, вплоть до похожего на флаг.
// Команды берутся в той форме, в какой README их и печатает: инструмент
// вызывается как команда, а не запуском файла. Форма документа и форма
// запуска обязаны совпадать — иначе читатель копирует одно, а проверяется
// другое.
const DOC_CMDS = [...new Set([...PUBLIC_READMES.matchAll(/^(?:npx )?agentic-screencast (.*)$/gm)]
  .map((m) => m[1].replace(/\s+#.*$/, "").trim())
  .filter((line) => !line.endsWith("\\")))];
const ENTRY = resolve(HERE, "dist", "agentic-screencast.js");
const EXAMPLE = resolve(HERE, "example");
// Разбор как в оболочке: у одной из команд аргумент — объект в кавычках.
const tokenize = (s: string): string[] => [...s.matchAll(/'([^']*)'|"([^"]*)"|(\S+)/g)]
  .map((m) => (m[1] ?? m[2] ?? m[3])!);
const docCmd = (sub: string): string | undefined => DOC_CMDS.find((c) => tokenize(c)[0] === sub);
// Учёт ведётся по СТРОКАМ, а не по подкомандам: пропуск по подкоманде
// оставлял бы вторую и последующие строки `check` или `verify` в README
// не запущенными никем — первые две проверки берут только первое вхождение.
const RAN = new Set<string>();
const runDoc = (line: string, extra: string[] = []): SpawnSyncReturns<string> => {
  RAN.add(line);
  return run("node", [ENTRY, ...tokenize(line), ...extra], { cwd: EXAMPLE });
};

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

// 6. Продукт самодостаточен: ни одной ссылки за пределы каталога.
await check("нет ссылок наружу", () => {
  const out = run("find", [".", "-type", "l", "-not", "-path", "./node_modules/*"]);
  const links = out.stdout.split("\n").filter(Boolean);
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
      /нет ключа [A-Z_]+/.test(why) ? "нет ключа доступа"
      : (r.error as NodeJS.ErrnoException | undefined)?.code === "ENOENT"
        || /программа не найдена/.test(why)
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

// 9. Хеш исходников покрывает ВСЁ дерево исходников, а не его часть.
// Проверка кадра и модульные тесты этого не видят: правка одного файла
// меняет ключ и тогда, когда в обход попала половина дерева. Поэтому
// множество файлов, вошедших в хеш, сверяется с НЕЗАВИСИМЫМ обходом —
// системным `find`, а где есть git, ещё и с его описью. Совпадать обязаны
// оба: расхождение с `find` означает дыру в обходе, расхождение
// с git — исходник, который не доедет до потребителя.
await check("хеш исходников покрывает всё дерево", () => {
  const mine = new Set(sourceFiles().map((f) => f.replaceAll("\\", "/")));
  if (mine.size === 0) return "обход исходников пуст";

  const found = run("find", [SOURCE_ROOT, "-type", "f"]);
  if (found.status !== 0) return `независимый обход не отработал: ${found.stderr.slice(0, 120)}`;
  const theirs = new Set(found.stdout.split("\n").filter(Boolean)
    .map((p) => relative(SOURCE_ROOT, p).replaceAll("\\", "/")));
  const missed = [...theirs].filter((f) => !mine.has(f));
  if (missed.length) return `в хеш не входят: ${missed.slice(0, 5).join(", ")}`;

  const tracked = run("git", ["ls-files", "src"]);
  if (tracked.status === 0) {
    const inGit = new Set(tracked.stdout.split("\n").filter(Boolean)
      .map((p) => relative("src", p).replaceAll("\\", "/")));
    const untracked = [...mine].filter((f) => !inGit.has(f));
    if (untracked.length) {
      return `исходники вне истории (потребитель их не получит): ${untracked.slice(0, 5).join(", ")}`;
    }
  }
  return true;
});

// 10. Поставка содержит всё, что продукт разрешает ОТ СВОЕГО КОРНЯ.
//
// Проверка 6 меряет самодостаточность КАТАЛОГА, и этого мало: модули
// уезжают потребителю каталогом собранного, а файлы данных перечисляются
// в манифесте поимённо, и забыть там один — значит отдать пакет,
// в котором документированная команда падает. Так и было: `verify` без
// флага разрешает `scene.example.json` в корне продукта, а перечень
// файлов пакета его не называл. Проверка 8 этого не видит по устройству:
// она гоняет команды в рабочем дереве, где файл лежит рядом.
//
// Список путей берётся ИЗ ИСХОДНИКОВ, а не пишется здесь заново: иначе
// новый файл данных придётся не забыть добавить в двух местах, и второе
// снова забудут.
await check("поставка содержит всё, что продукт ищет в своём корне", () => {
  const src = sourceFiles().map((f) => readFileSync(resolve(SOURCE_ROOT, f), "utf8")).join("\n");
  const wanted = new Set<string>();
  // Ищется обращение к пути от корня продукта: подъём на уровень вверх
  // от каталога собранного кода (или на два — так делает сам набор проверок)
  // и имя файла строкой. Образец сканирует исходник как текст, поэтому
  // писать такое обращение в комментарии нельзя: оно попадёт в список
  // ожидаемых путей и покрасит проверку именем из комментария.
  for (const m of src.matchAll(/resolve\(HERE,\s*"\.\.",\s*(?:"\.\.",\s*)?"([^"$]+)"\)/g)) {
    wanted.add(m[1]!);
  }
  if (wanted.size === 0) return "в исходниках не нашлось ни одного пути от корня продукта";

  // `--ignore-scripts` существен, а не осторожность: без него `npm pack`
  // запускает `prepack`, то есть ПЕРЕСОБИРАЕТ продукт прямо посреди
  // прогона. Проверка с побочным действием на предмет чужой проверки
  // делает соседний отрицательный контроль невозможным — так и вышло:
  // снятое право на исполнение восстанавливалось этой пересборкой,
  // и проверка запуска командой оставалась зелёной на сломанном дереве.
  const packed = run("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"]);
  if (packed.status !== 0) return `упаковка не отработала: ${packed.stderr.slice(0, 160)}`;
  const files: string[] = (JSON.parse(packed.stdout) as Array<{ files: Array<{ path: string }> }>)[0]!
    .files.map((f) => f.path);
  const has = (p: string): boolean =>
    files.includes(p) || files.some((f) => f.startsWith(p.replace(/\/$/, "") + "/"));

  const missing = [...wanted].filter((p) => !has(p));
  if (missing.length) {
    return `продукт ищет в своём корне, но в поставку не входит: ${missing.join(", ")}`;
  }

  // Страница записи уезжает СОБРАННОЙ, а не исходниками: в работающем
  // инструменте её отдаёт собственный сервер из `dist/record-ui`,
  // и средство сборки страницы в поставке не участвует. Исходники
  // страницы едут тоже — как и все прочие исходники продукта, — но
  // читаются, а не исполняются.
  for (const p of ["dist/record-ui/index.html", "dist/record-ui/index.js"]) {
    if (!has(p)) return `собранная страница записи не входит в поставку: ${p}`;
  }
  // Спрашивается МАНИФЕСТ, а не перечень файлов: `npm pack` чужих
  // зависимостей не перечисляет вовсе (`node_modules` в него не попадает,
  // `bundleDependencies` в манифесте нет), поэтому условие про файл
  // средства сборки было бы ложным при любом состоянии — включая то,
  // ради которого написано. Различает объявление: средство сборки
  // страницы обязано лежать в разработческих зависимостях, а не в тех,
  // что потребитель ставит вместе с продуктом.
  const manifest = JSON.parse(readFileSync(resolve(HERE, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  if (manifest.dependencies?.vite) {
    return "средство сборки страницы объявлено обычной зависимостью — потребитель поставит его вместе с продуктом";
  }
  if (!manifest.devDependencies?.vite) {
    return "средство сборки страницы не объявлено разработческой зависимостью, а сборка его вызывает";
  }
  return true;
});

// 11. Договор о движке голоса исполним, и это проверяется на программе,
// а не на пересказе. Предмет — поставляемая реализация, выставленная
// наружу тем же интерфейсом, что и любая посторонняя: если договор
// перестанет соблюдаться, покраснеет именно то требование, которое
// нарушено.
await check("договор о движке голоса выполняется", () => {
  const engine = resolve(HERE, "dist", "voice-cli.js");
  const r = run("node", [resolve(HERE, "dist", "voice-check.js"), `node ${engine}`,
    "--voice-json", JSON.stringify({ engine: "stub", name: "nullvoice", cps: 18 })]);
  if (r.status === 0) return true;
  const failed = r.stdout.split("\n").filter((l) => l.startsWith("ПРОВАЛ"));
  return failed.length ? failed.join("; ") : `код ${r.status}: ${r.stderr.slice(0, 160)}`;
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

// 14. Инструмент вызывается КАК КОМАНДА, а не запуском файла.
//
// Это главный исход единицы про потребителя, и держался он на ручных
// прогонах. Отказ тихий и половинчатый: убери из сборки право
// на исполнение — `npx` продолжит работать, потому что у него свой
// посредник в `node_modules/.bin`, а ссылка в `PATH` перестанет.
// Заметит это только посторонний пользователь.
//
// Проверяются оба наблюдения: режим собранной точки входа и настоящий
// запуск через ссылку из каталога, который инструменту не принадлежит.
await check("инструмент запускается как команда из чужого каталога", () => {
  if (!existsSync(ENTRY)) return "нет собранной точки входа";
  const mode = statSync(ENTRY).mode & 0o111;
  if (mode === 0) return "у собранной точки входа нет права на исполнение";

  const dir = mkdtempSync(join(tmpdir(), "slidecast-bin-"));
  try {
    const link = join(dir, "agentic-screencast");
    symlinkSync(ENTRY, link);
    // Запуск идёт ИМЕНЕМ команды через PATH и из чужого рабочего каталога:
    // так его и зовёт потребитель. Прямой вызов файла тем же node ничего
    // бы не различал — он работает и без права на исполнение.
    const r = spawnSync("/bin/sh", ["-c", "agentic-screencast paths"], {
      cwd: dir, encoding: "utf8", env: { ...process.env, PATH: `${dir}:${process.env.PATH ?? ""}` },
    });
    if (r.status !== 0) return `запуск через ссылку не отработал: ${(r.stderr || "").slice(0, 160)}`;
    const paths = JSON.parse(r.stdout) as Record<string, string>;
    // Каталог данных обязан считаться от рабочего каталога, а не от места
    // инструмента: иначе это не команда, а файл, привязанный к своему месту.
    // Пути сравниваются по НАСТОЯЩЕМУ расположению: на macOS временный
    // каталог лежит за символической ссылкой, и сравнение как есть
    // покраснело бы на верном поведении.
    // Каталог данных ещё не создан — он появляется при первой сборке,
    // поэтому сравниваем его РОДИТЕЛЯ с настоящим расположением
    // временного каталога.
    const home = resolve(paths.home ?? "");
    if (realpathSync(dirname(home)) !== realpathSync(dir)) {
      return `каталог данных не от рабочего каталога: ${paths.home}`;
    }
    return true;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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

// 17. Собранный код, уезжающий потребителю, не зависит ни от чего, чего
// потребитель не получает.
//
// Дефект тихий и односторонний: у разработчика установлено всё, поэтому
// модуль загружается, а у потребителя тот же файл падает разрешением
// модуля — сообщением, по которому причину не восстановить. Так и вышло:
// набору проверок понадобился посторонний проверяльщик JSON Schema, он
// нужен только разработке, а собранный набор уезжал в поставку целиком.
//
// Состав поставки берётся у самой упаковки, а список разрешённого —
// из раздела зависимостей манифеста; ни то, ни другое здесь не пишется
// заново.
await check("собранное в поставке не зависит от разработческого", () => {
  const manifest = JSON.parse(readFileSync(resolve(HERE, "package.json"), "utf8")) as
    { dependencies?: Record<string, string> };
  const allowed = new Set(Object.keys(manifest.dependencies ?? {}));
  const packed = run("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"]);
  if (packed.status !== 0) return `упаковка не отработала: ${packed.stderr.slice(0, 160)}`;
  const shipped = (JSON.parse(packed.stdout) as Array<{ files: Array<{ path: string }> }>)[0]!
    .files.map((f) => f.path).filter((p) => p.startsWith("dist/") && p.endsWith(".js"));
  if (shipped.length < 5) return `в поставке собранных модулей: ${shipped.length}`;

  const outside: string[] = [];
  for (const file of shipped) {
    const text = readFileSync(resolve(HERE, file), "utf8");
    // Ищутся ВСЕ способы назвать чужой пакет, а не один. Статический
    // импорт — не главный из них: тяжёлые бинари продукт тянет через
    // `createRequire(import.meta.url)`, и образец, знающий только `from`,
    // отвечал бы «зелено» на разработческом пакете, затянутом ровно той
    // идиомой, которой пользуется сам продукт в четырёх файлах. Форм
    // у неё две — через промежуточную переменную и вызовом по месту, —
    // и обе взяты: узкий образец уже один раз пропустил отрицательный
    // контроль, поставленный второй формой.
    for (const m of text.matchAll(
      /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|createRequire\([^)]*\)\s*\(\s*)["']([^."'][^"']*)["']/g,
    )) {
      const spec = m[1]!;
      if (spec.startsWith("node:")) continue;
      // Имя пакета: у обычного — до первой косой черты, у пространства
      // имён — две части.
      const parts = spec.split("/");
      const name = spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]!;
      if (!allowed.has(name)) outside.push(`${file} → ${name}`);
    }
  }
  return outside.length === 0 ? true
    : `в поставке есть модули, зависящие от неотдаваемого: ${[...new Set(outside)].slice(0, 5).join(", ")}`;
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

// 19. Ролик собирается из записанного голоса, и перезапись до него доходит.
//
// Предмет — не то, что движок существует, а инвариант, ради которого
// в договор заведён отпечаток: заменили запись — следующая сборка отдаёт
// новый звук и новую длительность сцены. Похожее неверное состояние
// выглядит успешной сборкой: ключ кэша звука не изменился, взят прежний
// файл, длительность прежняя. Различает измерение длительности сцены
// до и после перезаписи — оно и стоит здесь.
//
// Сборка доводится до вычисления ключей: рендерить сцены незачем,
// предмет проверки лежит до рендера. Денег это не стоит — синтеза нет,
// звук берётся из положенных файлов.
/**
 * Основной тон в окне файла, по переходам через ноль.
 *
 * Приём годится для ОБРАЗЦОВ — в записях проверки лежит синусоида;
 * человеческую речь так не измерить. Здесь он нужен ровно затем, чтобы
 * отличить «взяли эту запись» от «взяли другую» и от «синтезировали»,
 * и с этим он справляется точно.
 */
function toneOf(file: string, at: number): number {
  const r = spawnSync(FFMPEG_BIN, ["-nostdin", "-v", "error", "-ss", String(at), "-t", "0.5",
    "-i", file, "-f", "s16le", "-ar", "48000", "-ac", "1", "-"], { maxBuffer: 16 * 1024 * 1024 });
  const buf = r.stdout;
  if (!buf || buf.length < 4) return -1;
  let crossings = 0;
  let prev = 0;
  for (let i = 0; i + 1 < buf.length; i += 2) {
    const v = buf.readInt16LE(i);
    if ((v >= 0) !== (prev >= 0)) crossings++;
    prev = v;
  }
  return Math.round(crossings / 2 / (buf.length / 2 / 48000));
}

await check("ролик собирается из записей, и перезапись доезжает", () => {
  const dir = mkdtempSync(join(tmpdir(), "slidecast-rec-"));
  try {
    const store = join(dir, "recordings");
    const home = join(dir, "home");
    // Записи кладутся в НЕ договорном формате — 44,1 кГц и два канала,
    // как отдаёт обычный диктофон. Клади их сразу 48 кГц моно, и вся эта
    // проверка молчала бы о приведении формата: путь остался бы зелёным
    // и с движком, который просто копирует файл. Проверено исполнением.
    const rec = (text: string, secs: number, hz: number): void => {
      const md5 = createHash("md5").update(text).digest("hex");
      run(FFMPEG_BIN, ["-nostdin", "-y", "-loglevel", "error", "-f", "lavfi",
        "-i", `sine=frequency=${hz}:duration=${secs}`, "-ar", "44100", "-ac", "2",
        join(store, `${md5}.wav`)]);
    };
    const speech = "Реплика, записанная человеком.";
    mkdirSync(store, { recursive: true });

    const story = join(dir, "story.md");
    writeFileSync(story, `# Проба\nvoice: ${JSON.stringify({ engine: "recorded", name: "человек", dir: store })}\n`
      + `\n## r1 · slides.number\nvalues: 7 :: реплик\n\n${speech}\n`);
    const build = (): { keys: Array<{ spoken: number; key: string; voiced: string }> } => {
      const r = run("node", [ENTRY, "build", "--source", story, "--out", join(dir, "out.mp4"), "--keys-only"],
        { cwd: dir, env: { ...process.env, AGENTIC_SCREENCAST_HOME: home } });
      if (r.status !== 0) throw new Error(`сборка отказала: ${(r.stderr || r.stdout || "").slice(0, 200)}`);
      return JSON.parse(r.stdout) as { keys: Array<{ spoken: number; key: string; voiced: string }> };
    };

    // Отказ на недостающей записи — половина того же предмета: без него
    // «сборка прошла» ничего не значило бы, потому что тишину подходящей
    // длины подставить нетрудно.
    const missing = run("node", [ENTRY, "build", "--source", story, "--out", join(dir, "out.mp4"), "--keys-only"],
      { cwd: dir, env: { ...process.env, AGENTIC_SCREENCAST_HOME: home } });
    if (missing.status === 0) return "сборка без записи прошла молча";
    if (!(missing.stderr || "").includes(speech.slice(0, 20))) {
      return `отказ не назвал реплику: ${(missing.stderr || "").slice(0, 120)}`;
    }

    rec(speech, 2.0, 440);
    const before = build().keys[0]!;
    if (before.voiced !== "recorded") return `сцена озвучена не записью: ${before.voiced}`;
    if (Math.abs(before.spoken - 2.0) > 0.05) return `длительность от записи не взята: ${before.spoken}`;

    rec(speech, 3.5, 880);
    const after = build().keys[0]!;
    if (Math.abs(after.spoken - 3.5) > 0.05) {
      return `перезапись не доехала: длительность осталась ${after.spoken}`;
    }
    if (after.key === before.key) return "ключ сегмента не изменился после перезаписи";

    // Ключи — это ещё не дорожка. Между ними лежит добивание тишиной,
    // склейка звука и мультиплекс; правка там оставила бы всё выше
    // зелёным. Признак единицы говорит именно про готовый файл, поэтому
    // сборка доводится до конца и сверяется СОДЕРЖАНИЕ дорожки.
    //
    // Побайтового совпадения требовать нельзя — звук в ролике сжат.
    // Сверяется основной тон в окне сцены: он различает и «звук
    // синтезирован», и «взят не тот файл», чего длительность не даёт.
    const out = join(dir, "out.mp4");
    const built = run("node", [ENTRY, "build", "--source", story, "--out", out],
      { cwd: dir, env: { ...process.env, AGENTIC_SCREENCAST_HOME: home } });
    if (built.status !== 0) {
      return `сборка ролика отказала: ${(built.stderr || built.stdout || "").slice(0, 200)}`;
    }
    const inVideo = toneOf(out, 1.0);
    // Сравнение идёт с тоном САМОЙ записи, измеренным тем же способом,
    // а не с числом, написанным здесь руками: иначе проверка сверяла бы
    // дорожку со своим представлением о ней.
    const inRec = toneOf(join(store, `${createHash("md5").update(speech).digest("hex")}.wav`), 1.0);
    if (Math.abs(inVideo - inRec) > 15) {
      return `дорожка готового файла (${inVideo} Гц) не совпадает с записью (${inRec} Гц)`;
    }
    return true;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// 20. Человек записывает ролик своим голосом через страницу.
//
// Предмет — весь путь: страница открылась, кнопка нажата, микрофон
// записан, файл лёг в хранилище, сборка взяла его и в готовом ролике
// слышно записанное. Признак единицы говорит прямо: «страница
// открывается, кнопки нажимаются, до сборки ничего не доезжает»
// на снимке экрана неотличимо от работающего, поэтому проверка идёт
// до готового файла и сверяет его звук.
//
// Микрофон подменяется файлом с тоном: браузер видит обычное устройство,
// страница идёт своим обычным путём, а мы знаем, что «сказал» человек,
// и узнаём это в дорожке ролика.
await check("человек записывает ролик голосом через страницу", () => {
  const r = run("node", [resolve(HERE, "dist", "tests", "record-e2e.js")], { timeout: 300_000 });
  if (r.status === 0) return true;
  const said = ((r.stderr || "") + (r.stdout || "")).trim().split("\n").filter(Boolean);
  return said.length ? `код ${r.status}:\n${said.slice(-40).join("\n")}` : `код ${r.status}`;
});

// 21. Вердикт проверки кадров зависит от кадра, а не от того, чьей
// страницей он нарисован. Инструмент общего назначения не вправе знать
// имена файлов своих потребителей: правило по имени `demo/index.html`
// пережило выделение инструмента из репозитория заявки и объявляло
// негодной любую сцену с такой подложкой — при любых её числах.
//
// Требуемое состояние: сцена судится по своим числам. Правдоподобное
// неверное: правило убрано из описания, но осталось в коде — по тексту
// это неотличимо. Различает только прогон на сцене с таким именем
// подложки: до снятия правила проверка отвечала ненулевым кодом,
// после — нулевым, а числа при этом те же самые.
await check("вердикт кадра не зависит от имени файла подложки", () => {
  const dir = mkdtempSync(join(tmpdir(), "slidecast-verdict-"));
  const demo = join(dir, "demo");
  mkdirSync(demo, { recursive: true });
  // Берётся готовый слайд примера — он признаку слайда заведомо
  // удовлетворяет, — и кладётся под тем именем, из-за которого
  // проверка прежде отказывала.
  const slide = resolve(EXAMPLE, "slides", "e1.html");
  if (!existsSync(slide)) return `нет слайда примера: ${slide}`;
  writeFileSync(join(demo, "index.html"), readFileSync(slide, "utf8"));
  // Страница во весь кадр с крупной надписью — годная сцена-экран:
  // при масштабе единица цель закрывает кадр целиком, превышения нет,
  // правило «меньше половины кадра» не применяется, а обещанное репликой
  // читается с запасом.
  // Имя у страницы экрана то же самое — иначе снятое правило её просто
  // не касалось бы, и наблюдение было бы зелёным при вернувшемся правиле:
  // это показал отрицательный контроль.
  const demoScreen = join(dir, "screen", "demo");
  mkdirSync(demoScreen, { recursive: true });
  writeFileSync(join(demoScreen, "index.html"), [
    '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Экран</title>',
    "<style>html{margin:0}body{margin:0;width:100vw;height:100vh;",
    "background:#101820;color:#fff;font:20px/1.4 system-ui,sans-serif}",
    "#mustread{position:absolute;top:40px;left:40px;font-size:20px}</style></head>",
    '<body><p id="mustread">Обещанное репликой видно и читается.</p></body></html>',
  ].join(""));
  const effects = { zoom: { from: 0, to: 0, scale: 1 },
    cursor: { from: 0, to: 0.01, start: [-200, -200] },
    spot: { from: 9999 }, caption: { from: 9999 }, fade: { in: 0.2, out: 0.2 } };
  // Обе ветви вердикта разом: правило входило и в слайдовую, и в экранную,
  // и возврат его в ОДНУ из них — правдоподобное неверное состояние.
  const scenes = [
    { id: "s1", provider: "slides", kind: "compare", page: "demo/index.html", target: "body",
      beats: [{ text: "Сцена, нарисованная страницей с таким именем." }],
      caption: "Сцена, нарисованная страницей с таким именем.", duration: 4, effects },
    { id: "s2", provider: "page", kind: "page", page: "screen/demo/index.html", target: "body",
      mustRead: "#mustread",
      beats: [{ text: "Экран, нарисованный страницей с таким же именем." }],
      caption: "Экран, нарисованный страницей с таким же именем.", duration: 4, effects },
  ];
  const pitch = join(dir, "pitch.json");
  writeFileSync(pitch, JSON.stringify({ scenes }));
  const r = run("node", [resolve(HERE, "dist", "slide-check.js"), pitch, "0.95"],
    { timeout: 180_000 });
  if (r.status === 0) return true;
  const said = (r.stdout || "").trim();
  const failed = said.startsWith("{") ? JSON.stringify((JSON.parse(said) as { failed: unknown[] }).failed) : said.slice(-200);
  return `сцена признана негодной: ${failed || r.stderr.slice(0, 200)}`;
});

// Подставное приложение для проверки съёмки: своё имя куки сессии, своя
// кука согласия, своя вёрстка и своя поверхность, которую таскают.
// Оно само сообщает исход в разметке — смещение цели от середины кадра
// и признак того, что тащили не поверхность, — потому что снимок
// сохраняет разметку, а не события.
const FAKE_APP = [
  'import { createServer } from "node:http";',
  "const head = '<!DOCTYPE html><html lang=\"ru\"><head><meta charset=\"utf-8\">'",
  "  + '<title>Подставное приложение</title><style>body{margin:0;width:100vw;height:100vh;'",
  "  + 'background:#0b0f14;color:#fff;font:20px system-ui;overflow:hidden}</style></head><body>';",
  "const ready = '<div id=\"ready\">Данные приложения на месте</div>';",
  "const locked = '<div id=\"locked\">Нужен вход</div>';",
  "const board = '<div id=\"pane\" style=\"position:absolute;left:60%;top:0;right:0;bottom:0;background:#0f1621\">'",
  "  + '<div id=\"content\" style=\"position:absolute;left:1500px;top:900px;transform:translate(0px,0px)\">'",
  "  + '<div id=\"far\" style=\"width:120px;height:60px;background:#2b6cb0\">цель</div></div></div>'",
  "  + '<div id=\"self\" style=\"position:absolute;left:60%;top:0;right:0;height:82%;background:#16202b\">тащится сам</div>'",
  "  + '<div id=\"offset\" style=\"position:absolute;right:8px;bottom:8px\">dx=? dy=?</div>'",
  '  + \'<script>(function(){var panX=0,panY=0,mode=null,last=null;\'',
  "  + 'var far=document.getElementById(\"far\"),content=document.getElementById(\"content\");'",
  "  + 'var self_=document.getElementById(\"self\"),out=document.getElementById(\"offset\");'",
  "  + 'function report(){var r=far.getBoundingClientRect();'",
  "  + 'var dx=Math.round(r.left+r.width/2-innerWidth/2),dy=Math.round(r.top+r.height/2-innerHeight/2);'",
  "  + 'out.textContent=\"dx=\"+dx+\" dy=\"+dy;}report();'",
  "  + 'document.addEventListener(\"mousedown\",function(e){mode=e.target.closest(\"#self\")?\"self\":'",
  "  + '(e.target.closest(\"#pane\")?\"pane\":null);'",
  "  + 'last={x:e.clientX,y:e.clientY};});'",
  "  + 'document.addEventListener(\"mousemove\",function(e){if(!mode)return;'",
  "  + 'var ddx=e.clientX-last.x,ddy=e.clientY-last.y;last={x:e.clientX,y:e.clientY};'",
  "  + 'if(mode===\"self\"){self_.setAttribute(\"data-moved\",\"yes\");}'",
  "  + 'else{panX+=ddx;panY+=ddy;content.style.transform=\"translate(\"+panX+\"px,\"+panY+\"px)\";}report();});'",
  "  + 'document.addEventListener(\"mouseup\",function(){mode=null;});})();<\\/script>';",
  'createServer((req, res) => {',
  '  if (req.url === "/enter") {',
  '    res.writeHead(200, { "set-cookie": ["app-session=s3cret; Path=/", "junk=no; Path=/"],',
  '      "content-type": "application/json" });',
  '    return res.end(JSON.stringify({ ok: true }));',
  '  }',
  '  const c = req.headers.cookie ?? "";',
  '  const ok = c.includes("app-session=s3cret") && c.includes("app-consent=yes");',
  '  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });',
  '  if (req.url.startsWith("/board")) return res.end(head + board + "</body></html>");',
  '  res.end(head + (ok ? ready : locked) + "</body></html>");',
  '}).listen(__PORT__, "127.0.0.1");',
].join("\n");

// 22. Съёмка подложек работает с приложением, о котором инструмент
// не знает ничего. Требуемое состояние: как войти, какие куки поставить,
// чего дождаться, что подвинуть — приходит настройкой. Правдоподобное
// неверное: имена вынесены в настройку, но вход, разбор кук и приём
// перетаскивания по-прежнему знают одно приложение — код читается как
// универсальный, а работает только с ним. Прежде здесь были зашиты адрес
// адрес входа, имена session/consent cookies и классы полотна одного UI.
//
// Подставное приложение отвечает тремя страницами: за входом, гостевой
// и с поверхностью, которую таскают. Оно само сообщает исход в разметке
// (`#offset`, `data-moved`), поэтому проверяется РЕЗУЛЬТАТ приёма,
// а не факт того, что команда отработала.
await check("съёмка снимает приложение, о котором инструмент не знает", () => {
  const dir = mkdtempSync(join(tmpdir(), "slidecast-snap-"));
  const port = 7900 + Math.floor(Math.random() * 90);
  writeFileSync(join(dir, "app.mjs"), FAKE_APP.replace("__PORT__", String(port)));
  const server = spawn("node", [join(dir, "app.mjs")], { stdio: "ignore" });
  const unfold = (f: string): string =>
    readFileSync(f, "utf8").replace(/=\r?\n/g, "").replace(/=3D/g, "=");
  try {
    // Ждём готовности приложения, а не спим наугад: иначе съёмка упёрлась
    // бы в неподнятый сервер, и проверка краснела бы не о том.
    let up = false;
    for (let i = 0; i < 50 && !up; i++) {
      up = run("curl", ["-s", "-o", "/dev/null", `http://127.0.0.1:${port}/`]).status === 0;
      if (!up) run("sleep", ["0.2"]);
    }
    if (!up) return "подставное приложение не поднялось";

    // Всё, что относится к приложению, названо настройкой: адрес входа,
    // имя куки сессии, имя и значение куки согласия, селектор ожидания,
    // поверхность перетаскивания и то, за что хвататься нельзя.
    // Учётные данные приходят из окружения по имени, которое выбрал
    // потребитель, — инструмент этих имён не знает.
    writeFileSync(join(dir, "screens.json"), JSON.stringify({
      base: `http://127.0.0.1:${port}`,
      width: 800, height: 600,
      signIn: { url: "/enter", json: { user: "${DEMO_APP_USER}" }, cookies: ["app-session"] },
      cookies: [{ name: "app-consent", value: "yes" }],
      screens: [
        { id: "app", path: "/", await: "#ready" },
        { id: "board", path: "/board", await: "#far",
          prep: [{ drag: { to: "#far", surface: "#pane", avoid: ["#self"] } }] },
      ],
    }));
    // Съёмка ГОСТЯ — отдельная настройка без `signIn`: три подложки заявки
    // из девяти сняты без входа, и это своя ветвь, а не частный случай.
    writeFileSync(join(dir, "guest.json"), JSON.stringify({
      base: `http://127.0.0.1:${port}`,
      width: 800, height: 600,
      screens: [{ id: "guest", path: "/", await: "#locked" }],
    }));
    const out = join(dir, "screens");
    const env = { ...process.env, DEMO_APP_USER: "кто-то" };
    const r = run("node", [resolve(HERE, "dist", "snapshot.js"), join(dir, "screens.json"), out],
      { timeout: 180_000, env });
    if (r.status !== 0) return `съёмка не отработала: ${(r.stderr || r.stdout).trim().slice(-200)}`;

    // 1. Вошли: в подложке то, что приложение показывает только после входа.
    const app = join(out, "app.mhtml");
    if (!existsSync(app)) return "подложка не записана";
    if (!/id="?ready"?/.test(unfold(app))) return "в подложке нет данных приложения: снят экран до входа";

    // 2. Перетаскивание: цель приехала к середине кадра, и поверхность
    // двигалась именно поверхностью — то, что тащится само, не тронуто.
    const board = unfold(join(out, "board.mhtml"));
    const off = /dx=(-?\d+) dy=(-?\d+)/.exec(board);
    if (!off) return "подставное приложение не сообщило смещения цели";
    const [dx, dy] = [Number(off[1]), Number(off[2])];
    if (Math.abs(dx) > 60 || Math.abs(dy) > 60) return `цель не приехала в середину кадра: dx=${dx} dy=${dy}`;
    if (/data-moved="?yes"?/.test(board)) return "тащили то, что тащится само: поверхность осталась на месте";

    // 3. Гость: без `signIn` снимается то, что видит посторонний.
    const guestOut = join(dir, "guest-screens");
    const g = run("node", [resolve(HERE, "dist", "snapshot.js"), join(dir, "guest.json"), guestOut],
      { timeout: 120_000, env });
    if (g.status !== 0) return `съёмка без входа не отработала: ${(g.stderr || g.stdout).trim().slice(-200)}`;
    const guest = join(guestOut, "guest.mhtml");
    if (!existsSync(guest)) return "подложка гостя не записана";
    if (!/id="?locked"?/.test(unfold(guest))) return "в подложке гостя нет экрана до входа";

    // 4. Настройка со столкновением имён экранов отвергается ДО всякой
    // работы: имя файла подложки берётся из `id`, и молчаливое затирание
    // выглядит успешным — отчёт покажет оба экрана снятыми, а файл
    // останется один. Так уже случилось с настройкой заявки, склеенной
    // из двух прежних.
    writeFileSync(join(dir, "dup.json"), JSON.stringify({
      base: `http://127.0.0.1:${port}`,
      screens: [
        { id: "same", path: "/", await: "#locked" },
        { id: "same", path: "/board", await: "#far" },
      ],
    }));
    const d = run("node", [resolve(HERE, "dist", "snapshot.js"), join(dir, "dup.json"), join(dir, "dup-out")],
      { timeout: 60_000, env });
    if (d.status === 0) return "настройка с двумя экранами одного id принята молча";
    if (!/два экрана с одним id/.test(d.stderr || d.stdout)) {
      return `отказ не называет причину: ${(d.stderr || d.stdout).trim().slice(-160)}`;
    }
    if (existsSync(join(dir, "dup-out"))) return "при негодной настройке уже создан каталог подложек";
    return true;

  } finally {
    server.kill("SIGTERM");
  }
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

// 24. Расписание картинки тянется вместе с речью, потому что записано
// ЯКОРЯМИ на такты, а не секундами.
//
// Различающее наблюдение — РАЗРЕШЁННОЕ расписание при двух разных длинах
// записей, а не картинка: на сцене, где такты равны, обе реализации дают
// одно и то же, и кадр их не различает. Поэтому такты берутся разной
// длины и сравниваются два разрешения одной и той же страницы.
//
// Заодно проверяется вторая половина: момент, названный секундами,
// НЕ тянется. Без неё «всё умножилось на длительность» неотличимо
// от «якоря работают».
await check("расписание тянется вместе с речью, а секунды остаются секундами", async () => {
  const dir = mkdtempSync(join(tmpdir(), "slidecast-anchor-"));
  try {
    const story = join(dir, "story.md");
    // Первый элемент — на втором такте, второй — на 1,2 секунде.
    writeFileSync(story, [
      "# Якоря", "",
      "## a · slides.compare",
      "title: Проба",
      "left: Слева :: раз",
      "right: Справа :: два",
      "at: b2 1.2s", "",
      "Первый такт.", "",
      "Второй такт.", "",
    ].join("\n"));
    const made = run("node", [ENTRY, "slides", "--source", story], { cwd: dir });
    if (made.status !== 0) return `слайды не породились: ${(made.stderr || "").slice(0, 160)}`;
    const page = resolve(made.stdout.trim(), "a.html");
    if (!existsSync(page)) return `нет порождённого слайда: ${page}`;

    const HEREDIST = resolve(HERE, "dist");
    const clock = readFileSync(resolve(HEREDIST, "browser", "clock.js"), "utf8");
    const stage = readFileSync(resolve(HEREDIST, "browser", "stage.js"), "utf8");
    const browser = await chromium.launch();
    /** Разрешённые моменты появления при названных длинах тактов. */
    const resolved = async (starts: number[], duration: number): Promise<number[]> => {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      await ctx.addInitScript({ content: clock });
      await ctx.addInitScript({ content: stage });
      const p = await ctx.newPage();
      await p.goto(pathToFileURL(page).href, { waitUntil: "load" });
      await p.evaluate((sc) => window.__stage.mount(sc),
        { target: "body", caption: "", duration, beats: starts.length, starts,
          effects: { zoom: { from: 0, to: 0, scale: 1 }, cursor: { hidden: true, from: 0, to: 0.01 },
            spot: { from: 9999 }, caption: { from: 9999 }, fade: { in: 0, out: 0 } } });
      const got = await p.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>(".el")].map((e) => Number(e.dataset.at)));
      await ctx.close();
      return got;
    };
    // Такты 2 + 2 против 4 + 4: второй такт начинается вдвое дальше.
    const short = await resolved([0, 2], 4.5);
    const long = await resolved([0, 4], 8.5);
    await browser.close();
    if (short.length < 3 || long.length < 3) return `элементов на странице: ${short.length}`;
    // Порядок элементов: шапка, левая колонка (b2), правая (1.2s).
    const [, leftShort, rightShort] = short as [number, number, number];
    const [, leftLong, rightLong] = long as [number, number, number];
    if (Math.abs(leftShort - 2) > 0.01 || Math.abs(leftLong - 4) > 0.01) {
      return `якорь на такт разрешён не в начало такта: ${leftShort} и ${leftLong}`;
    }
    if (Math.abs(rightShort - 1.2) > 0.01 || Math.abs(rightLong - 1.2) > 0.01) {
      return `момент в секундах поехал вместе с длительностью: ${rightShort} и ${rightLong}`;
    }
    return true;
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
      '  fs.writeFileSync(file, `<!doctype html><html lang="ru"><head><meta charset="utf-8">`',
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
  const hits: string[] = [];
  for (const [file, body] of core) {
    for (const line of body.split("\n")) {
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

// 27. Кадр, темп, качество и оформление — данные РОЛИКА, а не числа
// инструмента.
//
// Требуемое состояние: вертикальный ролик на тридцати кадрах в светлой
// теме делается шапкой сценария. Правдоподобное неверное: параметры
// объявлены, читаются и даже входят в ключ, но где-то ниже остаётся
// прежнее число — размер окна браузера, кадры в секунду у кодировщика,
// цвет фона в стилях. Наблюдение поэтому меряет ГОТОВЫЙ ФАЙЛ: его
// размер, темп и яркость картинки. Сборка идёт на движке тишины —
// ни сети, ни денег.
await check("кадр, темп и оформление ролика доезжают до готового файла", () => {
  const dir = mkdtempSync(join(tmpdir(), "slidecast-frame-"));
  try {
    const story = join(dir, "story.md");
    writeFileSync(story, [
      "# Вертикальный",
      `voice: {"engine":"stub","name":"nullvoice","cps":18}`,
      `frame: {"width":720,"height":1280,"fps":30}`,
      `theme: {"--bg":"#ffffff","--ink":"#101010","--body":"#202020"}`, "",
      "## v1 · slides.number",
      "title: Светлая тема",
      "values: 30 :: кадров в секунду", "",
      "Такт речи вертикального ролика.", "",
    ].join("\n"));
    const out = join(dir, "out.mp4");
    const home = join(dir, "home");
    const built = run("node", [ENTRY, "build", "--source", story, "--out", out],
      { cwd: dir, env: { ...process.env, AGENTIC_SCREENCAST_HOME: home }, timeout: 600_000 });
    if (built.status !== 0) {
      return `сборка отказала: ${(built.stderr || built.stdout || "").trim().slice(-200)}`;
    }
    const probe = run(FFPROBE_BIN, ["-v", "error", "-select_streams", "v:0",
      "-show_entries", "stream=width,height,avg_frame_rate", "-of", "default=nw=1", out]);
    if (probe.status !== 0) return `готовый файл не читается: ${probe.stderr.slice(0, 160)}`;
    const got = Object.fromEntries(probe.stdout.trim().split("\n")
      .map((l) => l.split("=") as [string, string]));
    if (got.width !== "720" || got.height !== "1280") {
      return `кадр ролика не доехал: ${got.width}×${got.height}`;
    }
    if (got.avg_frame_rate !== "30/1") return `темп не доехал: ${got.avg_frame_rate}`;

    // Тема: кадр обязан быть светлым. Меряется средняя яркость кадра —
    // тот же приём, что и с тоном звука: он различает «тема доехала»
    // и «тема прочитана, но не применена», чего размер файла не даёт.
    const grey = run("/bin/sh", ["-c",
      `${FFMPEG_BIN} -nostdin -v error -ss 1 -i ${out} -frames:v 1 -vf format=gray `
      + `-f rawvideo - | od -An -tu1 -v | awk '{for(i=1;i<=NF;i++){s+=$i;n++}} END{print int(s/n)}'`]);
    const brightness = Number(grey.stdout.trim());
    if (!(brightness > 200)) return `кадр не светлый: средняя яркость ${brightness}`;
    return true;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// 28. Признак содержания кадра спрашивается у СТРАНИЦЫ, а не знается
// проверкой.
//
// Требуемое состояние: чужая страница со своей разметкой проходит признак
// кадра, объявив, что у неё считается содержанием. Правдоподобное
// неверное: список классов остался в проверке, просто пополнился —
// поставляемые слайды при этом зелены, и наблюдение на них ничего
// не значит. Различает страница, ни одного класса которой в инструменте
// нет; вторая половина — страница, объявившая то, чего не отрисовала:
// без неё «всё принимается» неотличимо от «признак работает».
await check("что считать содержанием кадра, объявляет сама страница", () => {
  const dir = mkdtempSync(join(tmpdir(), "slidecast-content-"));
  try {
    const mk = (name: string, body: string, declares: string): string => {
      const file = join(dir, name);
      writeFileSync(file, [
        '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Своя вёрстка</title>',
        "<style>html,body{margin:0;width:100vw;height:100vh;background:#101820;color:#fff;",
        "font:34px/1.4 system-ui,sans-serif;display:flex;align-items:center;justify-content:center}",
        ".плитка{padding:40px;border:2px solid #7aa2ff;border-radius:20px}</style></head>",
        `<body data-slidecast-content="${declares}">${body}</body></html>`,
      ].join(""));
      return file;
    };
    // Своя вёрстка: ни одного класса инструмента, признак объявлен ею самой.
    mk("своя.html", '<div class="плитка">Своя вёрстка чужого автора</div>', ".плитка");
    // Та же страница, но объявившая то, чего не нарисовала.
    mk("пустая.html", "<div>Текста тут ровно столько же, сколько и рядом</div>", ".плитка");

    const effects = { zoom: { from: 0, to: 0, scale: 1 },
      cursor: { hidden: true, from: 0, to: 0.01, start: [-500, -500] },
      spot: { from: 9999 }, caption: { from: 9999 }, fade: { in: 0, out: 0 } };
    const scene = (id: string, page: string) => ({
      id, provider: "slides", kind: "compare", page, target: "body",
      beats: [{ text: "Такт речи." }], caption: "Такт речи.", duration: 4, effects,
    });
    const one = join(dir, "своя.json");
    writeFileSync(one, JSON.stringify({ scenes: [scene("s1", "своя.html")] }));
    const good = run("node", [resolve(HERE, "dist", "slide-check.js"), one, "0.95"], { timeout: 180_000 });
    if (good.status !== 0) {
      const said = (good.stdout || "").trim();
      return `чужая страница объявлена негодной: ${said.startsWith("{") ? JSON.stringify((JSON.parse(said) as { failed: unknown[] }).failed) : said.slice(-200)}`;
    }

    const two = join(dir, "пустая.json");
    writeFileSync(two, JSON.stringify({ scenes: [scene("s2", "пустая.html")] }));
    const bad = run("node", [resolve(HERE, "dist", "slide-check.js"), two, "0.95"], { timeout: 180_000 });
    if (bad.status === 0) return "страница, не отрисовавшая объявленного, признана годной";
    return true;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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

// 30. Готовое видео — такой же материал сцены, как страница.
//
// Требуемое состояние: ролик из слайда и видеовставки собирается в один
// файл, вставка стоит на своём месте и звучит своей речью. Правдоподобное
// неверное: сцену отдали рендеру страницы — в кадре окажется пустой экран,
// а длительность и число сцен сойдутся, то есть по отчёту сборки два
// состояния неразличимы. Поэтому наблюдение смотрит СОДЕРЖИМОЕ кадра
// в окне видеосцены.
await check("готовое видео встаёт в ролик наравне со страницей", () => {
  const dir = mkdtempSync(join(tmpdir(), "slidecast-video-"));
  try {
    // Вставка — ровный зелёный прямоугольник: его ни с чем не спутать,
    // и он не мог бы получиться отрисовкой страницы.
    const clip = join(dir, "clip.mp4");
    const made = run(FFMPEG_BIN, ["-nostdin", "-y", "-loglevel", "error", "-f", "lavfi",
      "-i", "color=c=green:s=640x360:d=2", "-pix_fmt", "yuv420p", clip]);
    if (made.status !== 0) return `вставку не удалось сделать: ${made.stderr.slice(0, 160)}`;

    const story = join(dir, "story.md");
    writeFileSync(story, [
      "# С видеовставкой",
      `voice: {"engine":"stub","name":"nullvoice","cps":18}`,
      "frame: {\"width\":640,\"height\":360,\"fps\":25}", "",
      "## s1 · slides.number",
      "values: 1 :: сцена со слайдом", "",
      "Первая сцена, нарисованная слайдом.", "",
      "## s2 · video",
      "file: clip.mp4", "",
      "Речь поверх готового видео.", "",
    ].join("\n"));

    const out = join(dir, "out.mp4");
    const home = join(dir, "home");
    const built = run("node", [ENTRY, "build", "--source", story, "--out", out],
      { cwd: dir, env: { ...process.env, AGENTIC_SCREENCAST_HOME: home }, timeout: 600_000 });
    if (built.status !== 0) {
      return `сборка отказала: ${(built.stderr || built.stdout || "").trim().slice(-200)}`;
    }
    const report = JSON.parse(built.stdout) as { scenes: Array<{ id: string; video?: boolean }>; duration: number };
    if (report.scenes.length !== 2) return `сцен в отчёте: ${report.scenes.length}`;

    // Цвет кадра в окне видеосцены. Первая сцена — слайд на тёмном фоне,
    // вторая — зелёный прямоугольник; спутать их нельзя.
    // Средний цвет кадра считает САМ ffmpeg, сжимая кадр в один пиксель.
    // Складывать байты снаружи нельзя: поток не выровнен по тройкам,
    // и сумма получается по всем каналам разом — зелёный кадр при этом
    // выглядит серым. Проверено исполнением на исходной вставке.
    const green = run("/bin/sh", ["-c",
      `${FFMPEG_BIN} -nostdin -v error -ss ${(report.duration - 1).toFixed(2)} -i ${out} `
      + "-frames:v 1 -vf format=rgb24,scale=1:1 -f rawvideo - | od -An -tu1 -v"]);
    const [r, g, b] = green.stdout.trim().split(/\s+/).map(Number) as [number, number, number];
    if (!(g > 80 && g > r * 2 && g > b * 2)) {
      return `в окне видеосцены не кадр вставки: r=${r} g=${g} b=${b}`;
    }
    return true;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// 31. Признак кадра меряет ЧИТАЕМОСТЬ, а не только размеры.
//
// Требуемое состояние: слайд, у которого текст лёг на чужую подложку,
// признаётся негодным. Правдоподобное неверное — то, на чём споткнулся
// посторонний: тема сменила фон, но не подложку карточек, и тёмный текст
// оказался на тёмной карточке. Все прежние признаки при этом зелены —
// текст короткий, кегль большой, за край не вылезает, содержание
// на месте, страница закрывает кадр, — а прочесть кадр нельзя.
//
// Обе половины обязательны: без положительной «всё красное» неотличимо
// от работающего признака.
await check("нечитаемый слайд признаётся негодным по контрасту", () => {
  const dir = mkdtempSync(join(tmpdir(), "slidecast-contrast-"));
  try {
    const story = (name: string, theme: string): string => {
      const file = join(dir, name);
      writeFileSync(file, [
        "# Тема", `voice: {"engine":"stub","name":"nullvoice"}`, `theme: ${theme}`, "",
        "## c1 · slides.compare",
        "title: Светлый фон",
        "left: Слева :: первый пункт | второй пункт",
        "right: Справа :: третий пункт | четвёртый пункт", "",
        "Такт речи.", "",
      ].join("\n"));
      return file;
    };
    // Полдела: сменили фон и цвет текста, подложку карточек не тронули.
    const half = story("half.md",
      '{"--bg":"#faf5ec","--ink":"#2b1d12","--body":"#3a2a1b","--line":"#d8c9b4"}');
    const bad = run("node", [ENTRY, "check", "--source", half], { cwd: dir, timeout: 300_000 });
    if (bad.status === 0) return "текст на чужой подложке признан читаемым";
    const said = JSON.parse(bad.stdout) as { failed: Array<{ contrast?: number }> };
    if (!said.failed.length || !(said.failed[0]!.contrast! < 3)) {
      return `сцена забракована не по контрасту: ${JSON.stringify(said.failed[0])}`;
    }

    // Полный набор переменных — та же тема, но карточки тоже светлые.
    const full = story("full.md",
      '{"--bg":"#faf5ec","--glow":"#f0e6d2","--ink":"#2b1d12","--body":"#3a2a1b",'
      + '"--mut":"#6b5842","--line":"#d8c9b4","--card":"#fffaf2","--node":"#fff4e3",'
      + '"--node-line":"#d8c9b4","--bad-line":"#e7c3a8","--acc":"#b45309",'
      + '"--acc2":"#92400e","--bad":"#9a3412","--good":"#3f6212"}');
    const ok = run("node", [ENTRY, "check", "--source", full], { cwd: dir, timeout: 300_000 });
    if (ok.status !== 0) {
      const why = (ok.stdout || "").trim();
      return `честная светлая тема признана негодной: ${why.startsWith("{") ? JSON.stringify((JSON.parse(why) as { failed: unknown[] }).failed) : why.slice(-200)}`;
    }
    return true;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const bad = results.filter((r) => !r[1]);
for (const [name, ok, why] of results) console.log(`${ok ? "  ok  " : "ПРОВАЛ"}  ${name}${why ? " — " + why : ""}`);
console.log(`\n${results.length - bad.length} из ${results.length} проверок зелены`);
process.exit(bad.length ? 1 : 0);
