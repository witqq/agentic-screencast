// Поставка: что лежит в пакете, хеш исходников, запуск из чужого каталога.
// Проверки этого класса выполняются по порядку при импорте модуля; итог печатает suite.ts.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, symlinkSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { sourceFiles, SOURCE_ROOT } from "../../self-hash.js";
import { HERE, run, jsonSuffix, moduleSpecifiers, check, ENTRY } from "./common.js";

// 6. Продукт самодостаточен: ни одной ссылки за пределы каталога.
// Звук ролика называет сценарий, а инструмент его только сводит: в поставке нет
// ни одного звукового файла, а исходники (кроме тишины чернового голоса) звук
// не порождают. Нарушение обоих незаметно на вид — ролик звучит, — и ловится
// только здесь.
await check("поставка не несёт звука, а исходники его не порождают", () => {
  const packed = run("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"]);
  if (packed.status !== 0) return `упаковка не отработала: ${packed.stderr.slice(0, 160)}`;
  const files = jsonSuffix<Array<{ files: Array<{ path: string }> }>>(packed.stdout)[0]!.files.map((f) => f.path);
  if (files.length < 20) return `в поставке насчиталось файлов: ${files.length}`;
  const audio = files.filter((f) => /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|aiff?)$/i.test(f));
  if (audio.length) return `в поставке звук: ${audio.join(", ")}`;
  const makers = sourceFiles().filter((f) => !f.startsWith("tests/"))
    .filter((f) => /\b(sine=|aevalsrc|anoisesrc|flite)\b/.test(readFileSync(resolve(SOURCE_ROOT, f), "utf8")));
  return makers.length ? `исходники порождают звук: ${makers.join(", ")}` : true;
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
  const files: string[] = jsonSuffix<Array<{ files: Array<{ path: string }> }>>(packed.stdout)[0]!
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
  const probe = moduleSpecifiers('const help = `import { x } from "not-a-dependency"`; '
    + 'const require = createRequire(import.meta.url); require("real-dependency"); '
    + 'createRequire(import.meta.url)("another-dependency"); import("dynamic-dependency");');
  if (probe.includes("not-a-dependency") || !probe.includes("real-dependency")
    || !probe.includes("another-dependency") || !probe.includes("dynamic-dependency"))
    return "разбор импортов принял текст справки за код";
  const manifest = JSON.parse(readFileSync(resolve(HERE, "package.json"), "utf8")) as
    { dependencies?: Record<string, string> };
  const allowed = new Set(Object.keys(manifest.dependencies ?? {}));
  const packed = run("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"]);
  if (packed.status !== 0) return `упаковка не отработала: ${packed.stderr.slice(0, 160)}`;
  const shipped = jsonSuffix<Array<{ files: Array<{ path: string }> }>>(packed.stdout)[0]!
    .files.map((f) => f.path).filter((p) => p.startsWith("dist/") && p.endsWith(".js"));
  if (shipped.length < 5) return `в поставке собранных модулей: ${shipped.length}`;

  const outside: string[] = [];
  for (const file of shipped) {
    const text = readFileSync(resolve(HERE, file), "utf8");
    // AST distinguishes executable module references from examples in CLI help.
    // Both require() and direct createRequire(import.meta.url)(...) are real edges.
    for (const spec of moduleSpecifiers(text)) {
      if (spec.startsWith(".")) continue;
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
