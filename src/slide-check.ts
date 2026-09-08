#!/usr/bin/env node
// Проверка признака слайда по кадру: объём текста, кегли, графический
// элемент, подложка. Значения снимаются с документа на остановленном
// кадре, поэтому проверка машинная, а не на глаз.
//
// Запуск: slide-check.js pitch.json [момент_в_долях_сцены]
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DEFAULTS } from "./render.js";
import { specOf } from "./source.js";

const HERE = dirname(fileURLToPath(import.meta.url));
// Размер кадра берётся У РОЛИКА, а умолчание — у рендера; здесь он
// не пишется ещё раз. Разойдись эти числа — и проверка мерила бы кадр,
// которого не существует: так и вышло при переходе на 1920×1080, когда
// проверка осталась в 1280×720 и объявила переполнением весь текст всех
// слайдов. Вертикальный ролик даёт ровно то же расхождение, если кадр
// брать из умолчания.
// Слой композиции читается из СОБРАННОГО каталога, а не из исходников:
// он уходит в браузер текстом, а браузер TypeScript не понимает. Пара
// файлов собирается отдельным проходом (`tsconfig.browser.json`) —
// у них нет ни импортов, ни экспортов, поэтому компилятор оставляет их
// обычными скриптами, без обёртки модуля.
const CLOCK = readFileSync(resolve(HERE, "browser", "clock.js"), "utf8");
const STAGE = readFileSync(resolve(HERE, "browser", "stage.js"), "utf8");
// Пороги приёмки объявляет ПОСТАВЩИК материала: слайд разрежен и его
// текст читают, экран плотен и от него нужно узнавание, а чужой материал
// вправе мерить себя своими числами. Проверка их не выдумывает и не
// помнит — она спрашивает у того, кто сцену нарисовал.
//
// Что каждое число значит, объяснено там же, где объявлено. Здесь
// остаётся только то, как они применяются:
//
//   mustRead   — обещанное репликой найдено, помещается ЦЕЛИКОМ и читаемо;
//   targetFits — цель не вылезает за кадр (ловит переувеличение);
//   rawMax     — цель без увеличения занимает меньше половины кадра,
//                иначе целью объявили бы весь макет и увеличивать нечего;
//   coverShare — страница закрывает собой кадр, а не уехала в угол;
//   targetMin  — у цели ненулевая площадь: вырожденная в точку цель
//                уводит весь кадр под затемнение.
//
// Порог, которого поставщик не назвал, не применяется вовсе: молчаливое
// умолчание вернуло бы числа в ядро под другим именем.
const NO_LIMITS: Record<string, number> = {};

const PITCH_FILE = resolve(process.argv[2] ?? resolve(HERE, "pitch.json"));
const SRC = dirname(PITCH_FILE);
const pitch = JSON.parse(readFileSync(PITCH_FILE, "utf8"));
const FRAME = {
  width: Number(pitch.frame?.width ?? DEFAULTS.width),
  height: Number(pitch.frame?.height ?? DEFAULTS.height),
};
const at = Number(process.argv[3] ?? 0.9);

const browser = await chromium.launch();
const rows: Array<Record<string, unknown>> = [];
for (const s of pitch.scenes) {
  const ctx = await browser.newContext({ viewport: { ...FRAME } });
  await ctx.addInitScript({ content: CLOCK });
  // Композиция внедряется до документа по той же причине, что и в рендере:
  // в подложке-снимке MHTML тег <script> не исполняется.
  await ctx.addInitScript({ content: STAGE });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(resolve(SRC, s.page)).href, { waitUntil: "load" });
  // Число тактов передаётся счётом: измеренных начал у проверки нет,
  // и слой композиции считает такты равными. Для устоявшегося кадра этого
  // достаточно — предмет здесь не длительность, а то, что видно.
  await page.evaluate((sc) => window.__stage.mount(sc),
    { ...s, duration: s.duration ?? 6, beats: s.beats?.length ?? 1, theme: pitch.theme });
  await page.evaluate((t) => window.__clock.seek(t), (s.duration ?? 6) * at);

  const m = await page.evaluate(() => {
    const vis = (el: Element): boolean => {
      const st = getComputedStyle(el);
      if (st.visibility === "hidden" || st.display === "none") return false;
      if (Number(st.opacity) < 0.15) return false;
      const r = el.getBoundingClientRect();
      // Пересечение с кадром по ОБЕИМ осям. На слайдах это ничего
      // не меняет, а на увеличенном экране половина макета уходит
      // за боковые края, и подпись 12 px из невидимой панели иначе
      // покрасила бы сцену красным.
      return r.width > 0 && r.height > 0 &&
        r.top < innerHeight && r.bottom > 0 && r.left < innerWidth && r.right > 0;
    };
    /**
     * Отношение контраста текста к его подложке — по формуле WCAG.
     * Меряется по ФАКТИЧЕСКИМ цветам: цвет текста берётся у элемента,
     * цвет фона — у ближайшего предка, у которого он непрозрачен.
     * Дефект, который это ловит: тема поменяла фон, но не подложку
     * карточек, и тёмный текст лёг на тёмную карточку — читать нельзя,
     * а все прежние признаки зелены: текст короткий, кегль большой,
     * за край не вылезает, содержание на месте.
     */
    const rgb = (v: string): [number, number, number, number] => {
      const m = v.match(/[\d.]+/g);
      if (!m) return [0, 0, 0, 0];
      return [Number(m[0]), Number(m[1]), Number(m[2]), m[3] === undefined ? 1 : Number(m[3])];
    };
    const lum = ([r, g, b]: [number, number, number, number]): number => {
      const f = (c: number): number => {
        const x = c / 255;
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const backdropOf = (el: Element): [number, number, number, number] => {
      let node: Element | null = el;
      while (node) {
        const st = getComputedStyle(node);
        const c = rgb(st.backgroundColor);
        if (c[3] > 0.5) return c;
        node = node.parentElement;
      }
      // Ни у кого нет непрозрачного фона — считаем страницу белой:
      // так её и покажет браузер.
      return [255, 255, 255, 1];
    };
    const contrastOf = (el: Element): number => {
      const ink = lum(rgb(getComputedStyle(el).color));
      const back = lum(backdropOf(el));
      return (Math.max(ink, back) + 0.05) / (Math.min(ink, back) + 0.05);
    };
    let minContrast = 99;
    const unreadable: string[] = [];
    let chars = 0, minBody = 999, maxSize = 0;
    // Две беды, которые прежние меры пропускали, потому что не измеряли
    // ничего похожего: пустое поле, отрисованное словом `undefined`,
    // и текст, вылезший за кадр. Первое коротко и в лимит знаков влезает;
    // второе считается «видимым», раз хоть край попал в кадр.
    const placeholders = [];
    const overflow = [];
    for (const el of document.querySelectorAll("body *")) {
      if (el.id?.startsWith("__")) continue;
      const own = [...el.childNodes].filter((n) => n.nodeType === 3)
        .map((n) => (n.textContent ?? "").trim()).join(" ").trim();
      if (!own || !vis(el)) continue;
      chars += own.length;
      const size = parseFloat(getComputedStyle(el).fontSize);
      maxSize = Math.max(maxSize, size);
      if (own.length > 12) minBody = Math.min(minBody, size);
      if (/\b(undefined|null|NaN|\[object Object\])\b/.test(own)) placeholders.push(own.slice(0, 40));
      const contrast = contrastOf(el);
      if (contrast < minContrast) minContrast = contrast;
      if (contrast < 3) unreadable.push(`${own.slice(0, 28)} (${contrast.toFixed(2)})`);
      const r = el.getBoundingClientRect();
      if (r.top < -1 || r.left < -1 || r.bottom > innerHeight + 1 || r.right > innerWidth + 1) {
        overflow.push(`${own.slice(0, 28)} (${Math.round(r.left)},${Math.round(r.top)}–${Math.round(r.right)},${Math.round(r.bottom)})`);
      }
    }
    // Что на странице считается содержанием, говорит САМА страница
    // атрибутом `data-slidecast-content` — списком селекторов через
    // запятую. Прежде здесь стоял список классов пяти видов слайда
    // и, вдобавок, классы одного чужого приложения: кадр чужого
    // материала объявлялся негодным, сколь угодно осмысленный.
    //
    // Страница, которая о себе молчит, этим признаком не судится вовсе:
    // требовать объявления от чужой вёрстки нельзя. Отличить «молчит»
    // от «объявила и не отрисовала» обязательно, поэтому ответ
    // трёхзначный, а не «да/нет».
    const declared = document.body.dataset.slidecastContent ?? null;
    const graphic: Record<string, boolean> | null = declared === null ? null
      : Object.fromEntries(declared.split(",").map((sel) => sel.trim()).filter(Boolean)
          .map((sel) => [sel, !!document.querySelector(sel)]));
    // Геометрия увеличения: коэффициент слоя и прямоугольник цели.
    const zoomEl = document.querySelector("[data-stage-zoom]") ?? document.getElementById("__zoom");
    const k = zoomEl ? (new DOMMatrixReadOnly(getComputedStyle(zoomEl).transform)).a : 1;
    const frame = innerWidth * innerHeight;
    let targetShare = null, targetShareRaw = null, effBody = null, targetShareFull = null;
    const sel = window.__stage?.scene?.target;
    const tgt = sel ? document.querySelector(sel) : null;
    if (tgt) {
      const r = tgt.getBoundingClientRect();
      const w = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
      const h = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
      targetShare = (w * h) / frame;
      targetShareRaw = ((r.width / k) * (r.height / k)) / frame;

      // Читаемость меряется ВНУТРИ подсвеченной области: остальное
      // затемнено подсветкой, и зритель читает именно её.
      //
      // Масштаб берётся у самого элемента — отношение экранной ширины
      // к ширине разметки. Так учитываются оба увеличения сразу: слой
      // композиции и собственное масштабирование холста (граф процесса
      // рисуется трансформацией, и кегль в координатах документа
      // ничего не сказал бы о том, что видно зрителю).
      let mn = Infinity;
      for (const el of tgt.querySelectorAll("*")) {
        const own = [...el.childNodes].filter((n) => n.nodeType === 3)
          .map((n) => (n.textContent ?? "").trim()).join(" ").trim();
        if (own.length < 4) continue;                 // подписи узлов тоже текст
        const rr = el.getBoundingClientRect();
        if (rr.width <= 0 || rr.height <= 0) continue;
        if (rr.right < 0 || rr.left > innerWidth || rr.bottom < 0 || rr.top > innerHeight) continue;
        const scale = rr.width / Math.max(1, (el as HTMLElement).offsetWidth);
        mn = Math.min(mn, parseFloat(getComputedStyle(el).fontSize) * scale);
      }
      effBody = mn === Infinity ? null : mn;
      targetShareFull = (r.width * r.height) / frame;
    }

    // Покрывает ли страница кадр. Дефект, который это ловит: требование
    // поставить цель в середину уводило страницу углом внутрь кадра,
    // и остальное занимал фон за документом. Ни один прежний признак
    // его не видел — цель была на месте, читалась и в кадр помещалась.
    let cover: { left: number; top: number; right: number; bottom: number;
      gap?: number; share?: number } | null = null;
    if (zoomEl) {
      const r = zoomEl.getBoundingClientRect();
      cover = {
        left: Math.round(Math.max(0, r.left)), top: Math.round(Math.max(0, r.top)),
        right: Math.round(Math.max(0, innerWidth - r.right)),
        bottom: Math.round(Math.max(0, innerHeight - r.bottom)),
      };
      cover.gap = Math.max(cover.left, cover.top, cover.right, cover.bottom);
      // Мерой служит ДОЛЯ ПЛОЩАДИ кадра, закрытая страницей, а не ширина
      // полосы у края: страница, которая просто короче кадра на сотню
      // пикселей, и страница, уехавшая в угол, дают полосы одного рода,
      // но закрывают кадр на 88 и на 29 процентов.
      const w = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
      const h = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
      cover.share = (w * h) / (innerWidth * innerHeight);
    }

    // Обещанное репликой: помещается ли целиком в кадр и читаемо ли.
    let mustRead = null;
    const mrSel = window.__stage?.scene?.mustRead;
    if (mrSel) {
      const el = document.querySelector(mrSel);
      if (!el) mustRead = { found: false };
      else {
        const r = el.getBoundingClientRect();
        const scale = r.width / Math.max(1, (el as HTMLElement).offsetWidth);
        const size = parseFloat(getComputedStyle(el).fontSize) * scale;
        mustRead = {
          found: true,
          inFrame: r.left >= -1 && r.top >= -1 &&
                   r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
          size, text: ((el as HTMLElement).innerText || "").trim().slice(0, 40),
        };
      }
    }
    return { chars, minBody: minBody === 999 ? null : minBody, maxSize, graphic,
      placeholders, overflow,
      contrast: minContrast === 99 ? null : Number(minContrast.toFixed(2)), unreadable,
             zoom: k, targetShare, targetShareRaw, targetShareFull, effBody, mustRead, cover };
  });
  await ctx.close();

  const kinds = m.graphic === null ? [] : Object.entries(m.graphic).filter(([, v]) => v).map(([k]) => k);
  // Молчит страница — признак содержания не применяется; объявила —
  // хотя бы одно из объявленного обязано быть в кадре.
  const contentOk = m.graphic === null || kinds.length > 0;
  // Каким признаком судить кадр, говорит сам материал: у готовой страницы
  // порог читаемости обещанного, у нарисованной — объём текста и кегль.
  // Имени вида проверка не знает.
  const spec = specOf(s, pitch.providers ?? {});
  const L = spec.check ?? NO_LIMITS;
  const screenLike = L.mustReadSize !== undefined;
  if (screenLike) {
    // Кадр интерфейса: свои числа и свой отчёт. Признак слайда к нему
    // неприменим, но и послабления здесь нет — порогов три.
    const eff = m.effBody;
    const mr = m.mustRead;
    const mrOk = mr === null ? false
      : mr.found && mr.inFrame && mr.size >= L.mustReadSize!;
    rows.push({
      id: s.id, page: s.page, criterion: "screen", limits: L,
      zoom: Number(m.zoom.toFixed(2)),
      effBodyInfo: eff === null ? null : Number(eff.toFixed(1)),
      targetShare: m.targetShare === null ? null : Number(m.targetShare.toFixed(3)),
      targetShareFull: m.targetShareFull === null ? null : Number(m.targetShareFull.toFixed(3)),
      targetShareRaw: m.targetShareRaw === null ? null : Number(m.targetShareRaw.toFixed(3)),
      mustRead: mr === null ? null : { ...mr, size: mr.size ? Number(mr.size.toFixed(1)) : null },
      targetFits: m.targetShareFull !== null && m.targetShareFull <= L.targetShareFullMax!,
      coverGap: m.cover?.gap ?? null,
      coverShare: m.cover ? Number((m.cover.share ?? 0).toFixed(3)) : null,
      // Порог «увеличивать нечего» применяется только к сценам, которые
      // ВООБЩЕ увеличивают. Он заводился против того, чтобы целью объявили
      // весь макет и всё равно приблизили; при масштабе единица приближения
      // нет, и правило запрещало бы честный кадр «страница целиком» —
      // например артефакт, который и должен быть виден весь.
      ok: mrOk && (m.cover?.share ?? 1) >= L.coverShareMin! &&
          m.targetShareRaw !== null && m.targetShareRaw >= L.targetShareMin! &&
          (Number(m.zoom.toFixed(2)) <= 1
            || (m.targetShareRaw !== null && m.targetShareRaw < L.targetShareRawMax!)) &&
          m.targetShareFull !== null && m.targetShareFull <= L.targetShareFullMax!,
    });
  } else {
    rows.push({
      id: s.id, page: s.page, criterion: "slide", limits: L, chars: m.chars,
      contrast: m.contrast, unreadable: m.unreadable,
      minBody: m.minBody, maxSize: Math.round(m.maxSize), graphic: kinds,
      placeholders: m.placeholders, overflow: m.overflow,
      // Покрытие кадра проверяется и у нарисованной страницы, если
      // поставщик назвал порог. Прежде его мерили только у готовой:
      // страница, свёрстанная под другой кадр, прижималась к левому
      // верхнему углу и оставляла почти половину кадра чернотой —
      // переполнения при этом нет, и признак молчал.
      coverShare: m.cover ? Number((m.cover.share ?? 0).toFixed(3)) : null,
      ok: m.placeholders.length === 0 && m.overflow.length === 0 &&
        m.chars <= L.chars! && (m.minBody ?? 99) >= L.body! && contentOk &&
        (L.coverShareMin === undefined || (m.cover?.share ?? 0) >= L.coverShareMin) &&
        (L.contrastMin === undefined || (m.contrast ?? 99) >= L.contrastMin),
    });
  }
}
await browser.close();

const bad = rows.filter((r) => !r.ok);
// Разбивка по видам — чтобы подмена вида сцены была видна в отчёте,
// а не служила способом погасить красную сцену.
const byKind = (k: string): unknown[] => rows.filter((r) => r.criterion === k).map((r) => r.id);
console.log(JSON.stringify({
  // Пороги печатаются те, по которым судили: они пришли от поставщиков
  // и у разных сцен могут быть разными.
  limits: Object.fromEntries(rows.map((r) => [r.id as string, r.limits])),
  scenes: rows.length,
  byCriterion: { slide: byKind("slide"), screen: byKind("screen") },
  failed: bad.map((r) => ({ id: r.id, criterion: r.criterion, chars: r.chars,
    coverShare: r.coverShare, contrast: r.contrast, unreadable: r.unreadable,
    placeholders: r.placeholders, overflow: r.overflow,
    minBody: r.minBody, effBody: r.effBodyInfo, targetShare: r.targetShare,
    targetShareFull: r.targetShareFull, targetShareRaw: r.targetShareRaw,
    mustRead: r.mustRead, graphic: r.graphic })),
  rows,
}, null, 1));
process.exit(bad.length ? 1 : 0);
