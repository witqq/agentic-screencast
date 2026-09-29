// Готовый ролик: вердикт кадра, съёмка чужого приложения, расписание, кадр и оформление, видео в ролике.
// Проверки этого класса выполняются по порядку при импорте модуля; итог печатает suite.ts.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { FFMPEG as FFMPEG_BIN, FFPROBE as FFPROBE_BIN } from "../../voice/audio.js";
import { HERE, run, check, ENTRY, EXAMPLE } from "./common.js";

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
    if (!/два экрана с одним id|two screens share the id/.test(d.stderr || d.stdout)) {
      return `отказ не называет причину: ${(d.stderr || d.stdout).trim().slice(-160)}`;
    }
    if (existsSync(join(dir, "dup-out"))) return "при негодной настройке уже создан каталог подложек";
    return true;

  } finally {
    server.kill("SIGTERM");
  }
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
      // Берутся обёртки колонок, а не все элементы подряд: у шапки их
      // несколько (черта, надзаголовок, заголовок), и счёт по номеру
      // зависел бы от устройства шапки, а не от якорей.
      const got = await p.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>(".cols > .el")].map((e) => Number(e.dataset.at)));
      await ctx.close();
      return got;
    };
    // Такты 2 + 2 против 4 + 4: второй такт начинается вдвое дальше.
    const short = await resolved([0, 2], 4.5);
    const long = await resolved([0, 4], 8.5);
    await browser.close();
    if (short.length < 2 || long.length < 2) return `колонок на странице: ${short.length}`;
    // Левая колонка — на втором такте, правая — на 1,2 секунде.
    const [leftShort, rightShort] = short as [number, number];
    const [leftLong, rightLong] = long as [number, number];
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
      `theme: {"preset":"midnight","--bg":"#ffffff","--ink":"#101010","--body":"#202020"}`, "",
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
    // Полдела: взяли тему midnight, сменили фон и цвет текста, а тёмная подложка карточек осталась от неё.
    const half = story("half.md",
      '{"preset":"midnight","--bg":"#faf5ec","--ink":"#2b1d12","--body":"#3a2a1b","--line":"#d8c9b4"}');
    const bad = run("node", [ENTRY, "check", "--source", half], { cwd: dir, timeout: 300_000 });
    if (bad.status === 0) return "текст на чужой подложке признан читаемым";
    const said = JSON.parse(bad.stdout) as { failed: Array<{ contrast?: number }> };
    if (!said.failed.length || !(said.failed[0]!.contrast! < 3)) {
      return `сцена забракована не по контрасту: ${JSON.stringify(said.failed[0])}`;
    }

    // Все цвета слайда заменены — та же правка, но карточки тоже светлые.
    const full = story("full.md",
      '{"preset":"midnight","--bg":"#faf5ec","--glow":"#f0e6d2","--ink":"#2b1d12","--body":"#3a2a1b",'
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
