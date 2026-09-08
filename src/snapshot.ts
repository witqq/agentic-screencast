#!/usr/bin/env node
// Снимок страницы работающего приложения в самодостаточную подложку.
//
//   snapshot.js screens.json out-dir
//
// Зачем именно так. Интерфейс, который рисуется на клиенте, «сохранить
// страницей» бесполезно: при открытии из файла скрипт выполнится заново,
// запросы уйдут в никуда и в кадре окажется пустой экран. Снимок берётся
// отладочным протоколом Chromium в формате MHTML: там сохраняется
// РАЗМЕТКА, какой она была на экране после загрузки данных, а скрипты
// документа при открытии не исполняются.
//
// Следствие, важное для рендера: слой композиции нельзя внедрять тегом
// <script> — он молча не сработает. В render.js он внедряется до
// документа (addInitScript), и это же проверяется кадром.
//
// ЧТО ЭТА ПОДКОМАНДА ЗНАЕТ О ПРИЛОЖЕНИИ: ничего. Как войти, какие куки
// поставить, чего дождаться, что нажать и подвинуть — всё приходит
// настройкой. Инструмент общего назначения, знающий адрес входа, имя
// куки или классы вёрстки одного приложения, работает только с ним,
// и это уже случалось: здесь были зашиты адрес входа одной библиотеки,
// имена её кук, кука согласия одного продукта и классы одного фреймворка
// полотна.
//
// Кому эта подкоманда не нужна вовсе — снимает сам: договор подложки
// объявлен в README, и любой файл, отвечающий ему, годится сцене
// `kind: "screen"` без участия инструмента.
//
// Учётные данные берутся из окружения (или из `.env` проекта) по имени,
// которое называет настройка, и в файлы снимка не попадают: в MHTML
// пишется разметка, а не куки.
import { chromium, type BrowserContext, type Page } from "playwright";
import { writeFileSync, mkdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

function env(name: string): string {
  if (process.env[name]) return process.env[name];
  // Поиск идёт ВВЕРХ от текущего каталога и от каталога инструмента,
  // а не фиксированными прыжками: прежние "../.." были посчитаны от старого
  // места инструмента и после переезда указывали мимо корня проекта, причём
  // наружу от него. Тот же дефект уже чинился в драйвере синтеза.
  const seen: string[] = [];
  for (const start of [process.cwd(), HERE]) {
    let d = resolve(start);
    for (;;) {
      const p = resolve(d, ".env");
      if (!seen.includes(p)) seen.push(p);
      const parent = dirname(d);
      if (parent === d) break;
      d = parent;
    }
  }
  for (const p of seen) {
    if (!existsSync(p)) continue;
    const body = readFileSync(p, "utf8").split("\n");
    const line = body.find((l) => l.startsWith(`${name}=`) && !l.startsWith("#"));
    if (line) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  }
  throw new Error(`нет переменной ${name}: положите её в окружение или в .env проекта`);
}

/**
 * Подстановка значений окружения в настройку: `"${APP_USER}"` внутри
 * любой строки. Так учётные данные называются настройкой потребителя,
 * а не именами, зашитыми в инструмент, и в файл настройки не попадают.
 */
const fill = (v: unknown): unknown => {
  if (typeof v === "string") return v.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, n: string) => env(n));
  if (Array.isArray(v)) return v.map(fill);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, fill(x)]));
  }
  return v;
};

interface SignIn {
  /** адрес запроса входа: относительный к `base` или полный */
  url: string;
  method?: string;
  headers?: Record<string, string>;
  /** тело запроса; отправляется как JSON */
  json?: Record<string, unknown>;
  /** какие куки из ответа перенести в браузер; без списка — все */
  cookies?: string[];
}

interface Cookie { name: string; value: string; url?: string }

interface Drag {
  /** что привести в середину кадра */
  to: string;
  /** что тащить: полотно, холст, прокручиваемая область */
  surface?: string;
  /** за что хвататься нельзя: элементы, которые тащатся сами */
  avoid?: string[];
}

interface Prep {
  click?: string; times?: number; pause?: number;
  drag?: Drag;
  zoom?: number;
  inject?: { css?: string; js?: string; pause?: number };
  wait?: number;
}

interface Screen {
  id: string; path: string; await: string;
  prep?: Prep[]; settle?: number;
}

interface Config {
  base?: string; width?: number; height?: number;
  signIn?: SignIn;
  cookies?: Cookie[];
  screens: Screen[];
}

// Отсутствие файла настройки — внятная ошибка, а не дамп внутренностей
// чтения файла: по дампу не видно ни причины, ни того, что чинить.
const cfgPath = process.argv[2];
if (!cfgPath || !existsSync(cfgPath)) {
  console.error(
    `файл настройки съёмки не найден: ${cfgPath ?? "(не назван)"}\n` +
    "agentic-screencast snapshot <файл-настройки.json> [каталог-подложек]");
  process.exit(2);
}
const cfg = fill(JSON.parse(readFileSync(cfgPath, "utf8"))) as Config;
const outDir = process.argv[3] ?? resolve(dirname(cfgPath), "screens");
const base = cfg.base ?? "http://localhost:8080";

// Имя файла подложки берётся из `id` сцены, поэтому два экрана с одним
// `id` — молчаливая потеря: второй снимок затрёт первый, а отчёт покажет
// оба как снятые. Настройку, собранную склейкой двух прежних, это ловит
// сразу — и до того, как поднят браузер и выполнен вход.
const seenIds = new Set<string>();
for (const screen of cfg.screens) {
  if (seenIds.has(screen.id)) {
    console.error(`два экрана с одним id: ${screen.id} — второй снимок затёр бы первый`);
    process.exit(2);
  }
  seenIds.add(screen.id);
}

// 1. Вход, если приложение его требует. Запрос описан настройкой целиком:
// адрес, метод, заголовки, тело. Публичные страницы входа не требуют —
// тогда `signIn` просто не объявлен, и снимок берётся как у гостя,
// то есть ровно так, как страницу увидит посторонний.
const cookies: Cookie[] = [];
if (cfg.signIn) {
  const url = new URL(cfg.signIn.url, base).href;
  const res = await fetch(url, {
    method: cfg.signIn.method ?? "POST",
    headers: { "Content-Type": "application/json", ...cfg.signIn.headers },
    ...(cfg.signIn.json ? { body: JSON.stringify(cfg.signIn.json) } : {}),
  });
  if (!res.ok) throw new Error(`вход не прошёл: HTTP ${res.status} — снимать нечего`);
  // Куки берутся из ответа как есть: имя сессии — договор приложения,
  // а не инструмента. Настройка может назвать нужные поимённо; без списка
  // переносятся все, что пришли.
  const got = (res.headers.getSetCookie?.() ?? [])
    .map((c) => {
      const m = /^([^=]+)=([^;]*)/.exec(c.trim());
      return m ? { name: m[1]!, value: m[2]! } : null;
    })
    .filter((c): c is { name: string; value: string } => c !== null)
    .filter((c) => !cfg.signIn!.cookies || cfg.signIn!.cookies.includes(c.name));
  if (!got.length) {
    throw new Error(cfg.signIn.cookies
      ? `вход прошёл, но названных кук в ответе нет: ${cfg.signIn.cookies.join(", ")}`
      : "вход прошёл, но кук в ответе нет");
  }
  cookies.push(...got);
}
// 2. Куки, которые приложение ждёт помимо сессии: согласия, признаки
// режима, выбор языка. Инструмент о них не знает ничего, кроме имени
// и значения, названных настройкой.
cookies.push(...(cfg.cookies ?? []));

const browser = await chromium.launch();
// Окно съёмки равно кадру ролика. Разойдись они — и снимок пришлось бы
// либо растягивать, либо показывать кусок: при кадре 1920×1080 и съёмке
// в 1280 макет приложения раскладывался на 1280 пикселей ширины и в кадре
// оказывался с пустым полем в треть экрана.
const ctx: BrowserContext = await browser.newContext({
  viewport: { width: Number(cfg.width ?? 1920), height: Number(cfg.height ?? 1080) },
});
if (cookies.length) {
  await ctx.addCookies(cookies.map((c) => ({ name: c.name, value: c.value, url: c.url ?? base })));
}

/**
 * Привести названный элемент в середину кадра перетаскиванием поверхности.
 * Что тащить и за что хвататься нельзя — говорит настройка: у одного
 * приложения это полотно графа, у другого прокручиваемая область,
 * и знать их классы инструменту неоткуда.
 */
async function drag(page: Page, d: Drag): Promise<void> {
  const vp = page.viewportSize();
  if (!vp) return;
  // Захват начинается на ПУСТОМ месте поверхности, а не в середине кадра.
  // В середине обычно стоит то, что тащится само, — тогда двигался бы
  // элемент, а поверхность стояла бы на месте, и цель так и не приезжала
  // бы в кадр, причём молча: перетаскивание проходит успешно.
  const grabPoint = (): Promise<{ x: number; y: number } | null> => page.evaluate(
    ({ surface, avoid }) => {
      const pane = (surface ? document.querySelector(surface) : null) ?? document.body;
      const r = pane.getBoundingClientRect();
      for (let fy = 0.15; fy <= 0.9; fy += 0.15) {
        for (let fx = 0.15; fx <= 0.9; fx += 0.15) {
          const x = r.left + r.width * fx, y = r.top + r.height * fy;
          const el = document.elementFromPoint(x, y);
          if (el && !avoid.some((sel: string) => el.closest(sel))) return { x, y };
        }
      }
      return null;
    }, { surface: d.surface ?? null, avoid: d.avoid ?? [] });
  // Смещение переносится частями: за один раз указатель нельзя увести
  // дальше края кадра, а цель бывает и в двух экранах от середины.
  for (let pass = 0; pass < 8; pass++) {
    const box = await page.locator(d.to).first().boundingBox();
    const from = await grabPoint();
    if (!box || !from) break;
    const dx = vp.width / 2 - (box.x + box.width / 2);
    const dy = vp.height / 2 - (box.y + box.height / 2);
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) break;
    const lim = (v: number, max: number): number => Math.max(-max, Math.min(max, v));
    const sx = lim(dx, vp.width * 0.3), sy = lim(dy, vp.height * 0.3);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + sx, from.y + sy, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(180);
  }
}

mkdirSync(outDir, { recursive: true });
const report = [];
for (const s of cfg.screens) {
  const page = await ctx.newPage();
  await page.goto(new URL(s.path, base).href, { waitUntil: "networkidle" });
  // Ждём НАЗВАННЫЕ ДАННЫЕ, а не время: иначе снимок поймает индикатор
  // загрузки, а проверка «кадр не пустой» окажется зелёной на спиннере.
  await page.waitForSelector(s.await, { timeout: 30000, state: "visible" });
  // Подготовка кадра делается В ЖИВОМ приложении, а не увеличением снимка:
  // мелкие подписи интерфейса в кадре нечитаемы, а увеличенный снимок
  // теряет края. Нажимать надо те же кнопки, что нажал бы человек.
  for (const step of s.prep ?? []) {
    if (step.click) {
      for (let i = 0; i < (step.times ?? 1); i++) {
        await page.click(step.click);
        await page.waitForTimeout(step.pause ?? 120);
      }
    }
    if (step.drag) await drag(page, step.drag);
    if (step.zoom) {
      // Увеличение страницы, как кнопками браузера: вёрстка честно
      // перестраивается под меньшую ширину, а не растягивается снимком.
      await page.evaluate((z) => { document.documentElement.style.zoom = String(z); }, step.zoom);
      await page.waitForTimeout(step.pause ?? 400);
    }
    if (step.inject) {
      // Наложение на время съёмки: стили и скрипт применяются к ЖИВОЙ
      // странице перед снимком и в приложение не попадают. Правка
      // приложения ради кадра была бы подгонкой предмета под съёмку;
      // наложение честнее — оно меняет только снимок и названо в записи.
      if (step.inject.css) await page.addStyleTag({ content: step.inject.css });
      if (step.inject.js) {
        await page.evaluate((code) => {
          // Скрипт потребителя исполняется в его же странице: это и есть
          // смысл наложения. Правило заглушается директивой ТОГО линтера,
          // который в проекте есть, — чужая директива не действует вовсе
          // и лишь вводит читателя в заблуждение.
          // oxlint-disable-next-line no-new-func
          new Function(code)();
        }, step.inject.js);
      }
      await page.waitForTimeout(step.inject.pause ?? 300);
    }
    if (step.wait) await page.waitForTimeout(step.wait);
  }
  if (s.settle) await page.waitForTimeout(s.settle);
  const cdp = await ctx.newCDPSession(page);
  const { data } = await cdp.send("Page.captureSnapshot", { format: "mhtml" });
  const file = join(outDir, `${s.id}.mhtml`);
  writeFileSync(file, data);
  report.push({ id: s.id, path: s.path, awaited: s.await,
                bytes: statSync(file).size, file });
  await page.close();
}
await browser.close();
console.log(JSON.stringify({ base, screens: report }, null, 1));
