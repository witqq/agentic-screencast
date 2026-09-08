// Хеш собственных исходников: он входит в ключ каждого сегмента, поэтому
// правка ядра обязана пересобирать кадры, а не отдавать старые из кэша.
//
// Два свойства, ради которых этот модуль отдельный.
//
// 1. Считается по ИСХОДНИКАМ, а не по собранному. Собранное — производная,
//    и правка исходника, не дошедшая до сборки, обязана быть видна как
//    другой ключ, а не как успешная сборка со старой картинкой.
//
// 2. Обход ПОЛНЫЙ и рекурсивный. Прежний обход брал один каталог
//    (`readdirSync` без спуска) и отбирал по маске расширений. Пока весь
//    инструмент лежал одним каталогом, это совпадало с «всеми исходниками»;
//    после переезда в `src/` с подкаталогами совпадать перестало бы —
//    и ключ молча перестал бы замечать половину дерева.
//
// Версия компилятора тоже входит в хеш: она влияет на выпускаемый код,
// то есть на байты кадра, ровно как версии ffmpeg и браузера. Берётся
// из манифеста, а не из установленного пакета: у потребителя, поставившего
// собранный продукт, компилятора нет вовсе, а манифест есть всегда.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Корень продукта: каталог, в котором лежат `dist`, `src` и настройки. */
export const PRODUCT_ROOT = resolve(HERE, "..");

/** Корень исходников: `src` рядом с собранным `dist`. */
export const SOURCE_ROOT = resolve(PRODUCT_ROOT, "src");

/**
 * Настройки компилятора входят в хеш наравне с исходниками. Причина
 * та же, по которой в него входит версия компилятора: они задают цель,
 * библиотеку и способ выпуска кода, то есть влияют на выпущенный код,
 * а значит на байты кадра. Особенно это верно для браузерного прохода —
 * он собирает слой композиции, который вливается в страницу текстом
 * и рисует кадр.
 *
 * Лежат они в корне продукта, а не в дереве исходников, поэтому
 * добавляются явно: обход `src` их не увидит.
 */
export const CONFIG_FILES = ["tsconfig.json", "tsconfig.browser.json"];

/**
 * Все файлы дерева исходников, путями относительно его корня,
 * в устойчивом порядке. Ничего не отбрасывается по расширению:
 * отбор — это ровно то место, где обход начинает врать.
 */
export function sourceFiles(root: string = SOURCE_ROOT): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(relative(root, p));
    }
  };
  walk(root);
  return out.sort();
}

/** Версия компилятора из манифеста продукта. */
export function compilerVersion(): string {
  const manifest = JSON.parse(
    readFileSync(resolve(HERE, "..", "package.json"), "utf8"),
  ) as { devDependencies?: Record<string, string> };
  return manifest.devDependencies?.typescript ?? "нет";
}

/**
 * Хеш дерева исходников вместе с версией компилятора.
 *
 * Версия — отдельный параметр, а не только чтение манифеста: иначе
 * утверждение «версия входит в хеш» нечем проверить, кроме как поверить
 * в него, глядя на строку.
 */
export function selfHash(
  root: string = SOURCE_ROOT,
  version: string = compilerVersion(),
  configRoot: string = PRODUCT_ROOT,
): string {
  const files = sourceFiles(root);
  const body = files
    .map((f) => f + createHash("md5").update(readFileSync(join(root, f))).digest("hex"))
    .join("|");
  // Настройки адресуются ИМЕНЕМ, а не развёрнутым путём — по той же
  // причине, по которой исходники адресуются путём относительно корня:
  // хеш обязан зависеть от того, что влияет на выпущенный код, а не
  // от того, где продукт лежит на диске. Иначе перенос каталога
  // обесценивал бы кэш всех сегментов, и два клона одного среза
  // по разным путям никогда не делили бы кэш.
  //
  // Корень настроек — параметр, как и версия компилятора: величина,
  // которую хеш подмешивает из окружения продукта, обязана быть
  // подставляемой, иначе её вклад нечем показать, кроме как правкой
  // рабочего дерева.
  const configs = CONFIG_FILES
    .map((f) => ({ f, p: resolve(configRoot, f) }))
    .filter(({ p }) => existsSync(p))
    .map(({ f, p }) => f + createHash("md5").update(readFileSync(p)).digest("hex"))
    .join("|");
  return createHash("md5").update(`tsc:${version}|${configs}|${body}`).digest("hex");
}
