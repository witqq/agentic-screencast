// Библиотека композиции: курсор, зум, подсветка, подсказка, переход.
// Каждый эффект — ЧИСТАЯ ФУНКЦИЯ ВРЕМЕНИ сцены: состояние в момент t
// вычисляется только из t и данных сцены. Накопление между кадрами
// запрещено — иначе сцену нельзя отрендерить с середины и нельзя
// пересобрать отдельно.
window.__stage = (() => {
  const CSS = `
  /* Отключаем всё, что анимируется само по реальному времени: плавную
     прокрутку и CSS-переходы подложки. Иначе кадр зависит от того, когда
     его сняли, и рендер перестаёт быть функцией времени. */
  html{scroll-behavior:auto !important}
  *,*::before,*::after{transition:none !important}
  #__st{position:fixed;inset:0;z-index:2147483000;pointer-events:none}
  /* Слой зума всегда вынесен на композитор: без этого Chromium решает
     о выносе по ходу дела, и растеризация одного и того же кадра отличается
     на единицу уровня — кадр перестаёт быть побайтово воспроизводимым. */
  #__zoom{transform-origin:0 0;will-change:transform;backface-visibility:hidden}
  #__cur{position:fixed;left:0;top:0;width:26px;height:26px;
    filter:drop-shadow(0 3px 6px rgba(0,0,0,.55))}
  #__rip{position:fixed;border-radius:50%;background:var(--sc-accent-soft,rgba(122,162,255,.5));
    transform:translate(-50%,-50%)}
  #__spot{position:fixed;border-radius:14px;
    box-shadow:0 0 0 3px var(--sc-spot,rgba(122,162,255,.95)),
      0 0 0 9999px var(--sc-dim,rgba(6,9,15,.55))}
  #__cap{position:fixed;left:50%;bottom:38px;width:min(1060px,88vw);
    padding:16px 22px;border-radius:16px;
    background:var(--sc-cap-bg,linear-gradient(180deg,rgba(27,36,52,.97),rgba(18,24,34,.97)));
    border:1px solid var(--sc-cap-line,#3a4a6b);color:var(--sc-cap-ink,#eaeef7);
    font:500 17.5px/1.42 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;
    box-shadow:0 22px 60px rgba(0,0,0,.65)}
  #__capbar{position:absolute;left:0;bottom:0;height:3px;
    background:linear-gradient(90deg,#7aa2ff,#4fd1c5);border-radius:0 0 16px 16px}
  #__fade{position:fixed;inset:0;background:var(--sc-fade,#0d1017)}
  `;
  const CURSOR = `<svg id="__cur" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 2 L4 20 L9 15.5 L12 22 L15 20.5 L12 14.2 L19 14 Z"
      fill="#f7f9ff" stroke="#0d1017" stroke-width="1.4" stroke-linejoin="round"/></svg>`;

  interface Rect { left: number; top: number; width: number; height: number }
  interface Els {
    zoom: HTMLElement; layer: HTMLElement; spot: HTMLElement; cap: HTMLElement;
    capText: HTMLElement; capBar: HTMLElement; cur: HTMLElement; rip: HTMLElement;
    fade: HTMLElement;
  }

  let scene: StageScene | null = null;
  let el = {} as Els;

  /**
   * Момент времени задаётся ЯКОРЕМ, а не только секундой.
   *
   *   b2       начало второго такта речи
   *   b2.end   его конец, он же начало третьего
   *   b2+0.4   через 0,4 с после начала второго такта
   *   b2-0.2   за 0,2 с до него
   *   40%      доля длительности сцены
   *   1.2s     секунды от начала сцены; голое число — тоже секунды
   *
   * Зачем это нужно. Длительность сцены выводится из речи, а речь пишется
   * человеком по частям, и её длины заранее не знает никто. Момент,
   * записанный секундой, при этом не тянется: реплика вышла длиннее —
   * элемент появился в начале и полсцены ждёт, вышла короче — сцена
   * кончилась раньше, чем он проступил. Якорь на такт тянется по
   * построению, потому что такт и есть кусок речи.
   *
   * Начала тактов приходят из сборки, где они измерены по звуку. Когда
   * их нет — так бывает у проверок, которые смотрят страницу без сборки, —
   * такты считаются равными: это оценка, и она годится там, где предмет
   * проверки не длительность, а порядок или устоявшийся кадр.
   */
  function timing(s: StageScene): (a: number | string | undefined, dflt?: number) => number {
    const dur = s.duration;
    const n = Math.max(1, s.beats ?? (s.starts ? s.starts.length : 1));
    const starts = s.starts && s.starts.length ? s.starts : [...Array(n).keys()].map((i) => (i * dur) / n);
    const startOf = (i: number): number => starts[Math.min(Math.max(i, 0), starts.length - 1)]!;
    const endOf = (i: number): number => (i + 1 < starts.length ? starts[i + 1]! : dur);
    return (a, dflt = 0) => {
      if (a === undefined || a === null) return dflt;
      if (typeof a === "number") return a;
      const text = String(a).trim();
      if (!text) return dflt;
      const beat = /^b(\d+)(\.end)?(?:\s*([+-])\s*([\d.]+))?$/i.exec(text);
      if (beat) {
        const i = Number(beat[1]) - 1;
        const base = beat[2] ? endOf(i) : startOf(i);
        const shift = beat[4] ? Number(beat[4]) * (beat[3] === "-" ? -1 : 1) : 0;
        return base + shift;
      }
      const share = /^([\d.]+)\s*%$/.exec(text);
      if (share) return (Number(share[1]) / 100) * dur;
      const secs = /^([\d.]+)\s*s?$/i.exec(text);
      if (secs) return Number(secs[1]);
      return dflt;
    };
  }

  /** Разрешение якорей текущей сцены; ставится при монтировании. */
  let at: ReturnType<typeof timing> = () => 0;

  // — вспомогательные чистые функции —
  const clamp = (v: number, a = 0, b = 1): number => Math.max(a, Math.min(b, v));
  const ease = (p: number): number => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
  /** доля прохождения интервала [from, to] в момент t */
  const phase = (t: number, from: number, to: number): number => (to <= from ? (t >= to ? 1 : 0) : clamp((t - from) / (to - from)));

  function mount(s: StageScene): void {
    scene = s;
    at = timing(s);
    // Моменты появления элементов страницы записаны якорями, а разбирает
    // их эта библиотека: страница остаётся чистой функцией времени
    // и о тактах речи ничего не знает. Разрешаются они ОДИН РАЗ, здесь,
    // и дальше в разметке лежат обычные секунды.
    for (const node of document.querySelectorAll<HTMLElement>("[data-at]")) {
      node.dataset.at = String(at(node.dataset.at, 0));
    }
    const style = document.createElement("style");
    // Тема ролика — пары «переменная — значение». Слой композиции их
    // не толкует: он только кладёт их в корень документа, а какие имена
    // осмысленны, знают его собственные правила и страница.
    const theme = Object.entries(s.theme ?? {})
      .map(([k, v]) => `${k.startsWith("--") ? k : `--${k}`}:${v}`).join(";");
    style.textContent = (theme ? `:root{${theme}}\n` : "") + CSS;
    document.head.appendChild(style);

    // Увеличивается САМО ТЕЛО документа, а не обёртка над его содержимым.
    // Прежде содержимое переносилось внутрь добавленного блока, и это
    // рвало вёрстку, привязанную к телу: у страницы артефакта рамка
    // с отчётом растягивалась по высоте тела, а внутри чужого блока
    // растягиваться стало не по чему — в кадре осталась полоска в четверть
    // экрана. Тело переживает трансформацию без потери своей роли в разметке.
    const zoom = document.body;
    // Помечаем атрибутом, а не идентификатором: у чужой страницы тело может
    // уже иметь идентификатор, на который завязаны её собственные стили.
    zoom.setAttribute("data-stage-zoom", "");
    zoom.style.transformOrigin = "0 0";
    zoom.style.willChange = "transform";
    zoom.style.backfaceVisibility = "hidden";

    const layer = document.createElement("div");
    layer.id = "__st";
    layer.innerHTML = `<div id="__spot"></div><div id="__cap"><span id="__captext"></span>
      <div id="__capbar"></div></div><div id="__rip"></div>${CURSOR}<div id="__fade"></div>`;
    // Накладка живёт ВНЕ увеличиваемого узла: `position: fixed` внутри
    // трансформированного предка отсчитывается от него, а не от кадра,
    // и подсветка с затемнением поехали бы вместе со страницей.
    document.documentElement.appendChild(layer);

    const pick = (sel: string): HTMLElement => layer.querySelector(sel) as HTMLElement;
    el = {
      zoom, layer, spot: pick("#__spot"), cap: pick("#__cap"),
      capText: pick("#__captext"), capBar: pick("#__capbar"),
      cur: pick("#__cur"), rip: pick("#__rip"), fade: pick("#__fade"),
    };
    el.capText.textContent = s.caption ?? "";
    // Подложка могла объявить свою функцию времени (так делают слайды).
    // Не затираем её, а вызываем вместе со своей: иначе элементы слайда
    // никогда не появятся — они ждут именно её.
    const pageRenderAt = typeof window.renderAt === "function" ? window.renderAt : null;
    window.renderAt = (t: number): void => {
      if (pageRenderAt) pageRenderAt(t);
      renderAt(t);
    };
    renderAt(0);
  }

  /** Прямоугольник цели в координатах НЕзумленной страницы. */
  function targetRect(): Rect | null {
    const t = scene?.target ? document.querySelector(scene.target) : null;
    if (!t) return null;
    const r = t.getBoundingClientRect();
    const z = currentZoomState();
    // отменяем текущую трансформацию, чтобы получить исходные координаты
    return {
      left: (r.left - z.tx) / z.k, top: (r.top - z.ty) / z.k,
      width: r.width / z.k, height: r.height / z.k,
    };
  }
  let zoomState: { k: number; tx: number; ty: number } = { k: 1, tx: 0, ty: 0 };
  const currentZoomState = () => zoomState;

  function renderAt(t: number): void {
    if (!scene) return;
    const fx = scene.effects ?? {};
    const dur = scene.duration;

    // 1. Прокрутка к цели — мгновенно, до всех измерений.
    // Прокрутка идемпотентна и выполняется на каждом кадре: она не должна
    // зависеть от того, рендерим мы сцену целиком или один кадр из середины.
    const target = scene.target ? document.querySelector(scene.target) : null;
    // Прокручиваем, ТОЛЬКО если цель не помещается в кадр целиком. Иначе
    // прокрутка всё равно что-то двигает: у графа процесса она уводила
    // полотно внутрь себя, и вместо разложенной схемы в кадре оставались
    // три узла с длинными прямыми связями. Цель уже видна — двигать нечего.
    const needScroll = (node: Element): boolean => {
      const r = node.getBoundingClientRect();
      return r.top < 0 || r.left < 0 || r.bottom > innerHeight || r.right > innerWidth;
    };
    if (target && needScroll(target)) {
      const prev = el.zoom.style.transform;
      el.zoom.style.transform = "none";
      target.scrollIntoView({ block: "center", behavior: "instant" });
      // Прижимаем прокрутку к целой точке: дробная позиция даёт субпиксельное
      // сглаживание, из-за которого кадр перестаёт быть побайтово одинаковым.
      window.scrollTo(Math.round(window.scrollX), Math.round(window.scrollY));
      el.zoom.style.transform = prev;
    }
    const base = targetRectRaw();

    // 2. Зум: k(t) и смещение считаются от абсолютного времени.
    // Границы — якоря: «5%» и «35%» тянутся вместе с длительностью,
    // «b2» привяжет движение к куску речи. В секундах движение
    // не масштабируется: 0,1→0,75 означало, что всё оно укладывается
    // в две трети секунды и в сцене на двадцать восемь секунд выглядит
    // рывком в начале, после чего кадр стоит двадцать семь секунд.
    const z = fx.zoom ?? { from: 0, to: 0, scale: 1 };
    const zFrom = at(z.from, 0);
    const zTo = at(z.to, 0);
    const zp = ease(phase(t, zFrom, zTo));
    const k = 1 + ((z.scale ?? 1) - 1) * zp;
    const cx = base.left + base.width / 2, cy = base.top + base.height / 2;
    // При масштабе 1 панорамирования нет: иначе слайд во весь кадр
    // уезжает вверх на разницу между центром экрана и 0.42 высоты.
    let tx = k === 1 ? 0 : innerWidth / 2 - cx * k;
    let ty = k === 1 ? 0 : innerHeight * 0.42 - cy * k;
    // Смещение ограничивается краями самой страницы. Без этого требование
    // «цель в середине кадра» уводило страницу так, что её угол оказывался
    // внутри кадра, а остальное занимал фон за документом: в сцене про
    // документацию страница стояла в правом нижнем углу, и зритель видел
    // подсвеченный угол экрана вместо страницы. Цель, лежащую у края
    // страницы, в середину кадра поставить нельзя — и не нужно.
    if (k !== 1) {
      const zr = rawRect(el.zoom);
      const fit = (v: number, edge: number, size: number, frame: number): number => {
        const lo = frame - (edge + size) * k;   // правый (нижний) край не заходит внутрь кадра
        const hi = -edge * k;                   // левый (верхний) край не отходит от нуля
        // Страница уже кадра — центрируем её, ограничивать нечего.
        return lo > hi ? (frame - size * k) / 2 - edge * k : Math.max(lo, Math.min(hi, v));
      };
      tx = fit(tx, zr.left, zr.width, innerWidth);
      ty = fit(ty, zr.top, zr.height, innerHeight);
    }
    zoomState = { k, tx: tx * zp, ty: ty * zp };
    el.zoom.style.transform =
      `translate(${(tx * zp).toFixed(2)}px, ${(ty * zp).toFixed(2)}px) scale(${k.toFixed(4)})`;

    // 3. Подсветка ставится по ФАКТИЧЕСКОМУ положению цели на экране,
    // а не по пересчёту исходных координат через масштаб и смещение.
    // Пересчёт верен, только пока между слоем композиции и страницей нет
    // ничего ещё; у снимка интерфейса есть — он снят с увеличением
    // страницы, чтобы подписи в 10 пикселей читались, — и подсветка
    // вставала мимо цели на десятки пикселей. Живой прямоугольник
    // учитывает всё сразу и остаётся чистой функцией времени: он зависит
    // только от трансформации, вычисленной выше по t.
    // Единица измерения слоя. Снимок интерфейса снят с увеличением
    // страницы (`zoom` на корне документа), чтобы подписи в 10 пикселей
    // читались в кадре; слой композиции живёт в том же документе, поэтому
    // заданные ему пиксели тоже умножаются на это число.
    const lz = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    // Подсвечивается либо цель сцены, либо текущая область подвижного
    // фокуса: та, чей момент уже наступил. Кадр от этого не двигается —
    // приближение считается по цели, — а пятно идёт за голосом.
    let spotEl: Element | null = target;
    if (Array.isArray(scene.focus) && scene.focus.length) {
      const passed = scene.focus.filter((f) => t >= at(f.at, 0));
      const cur = passed.length ? passed[passed.length - 1]! : scene.focus[0]!;
      spotEl = document.querySelector(cur.sel) ?? target;
    }
    const live = spotEl ? spotEl.getBoundingClientRect()
      : { left: base.left * k + zoomState.tx, top: base.top * k + zoomState.ty,
          width: base.width * k, height: base.height * k };
    const sp = fx.spot ?? { from: "55%" };
    const spOn = t >= at(sp.from, 0) ? 1 : 0;
    const pad = 10;
    el.spot.style.opacity = String(spOn);
    const R = Math.round;
    el.spot.style.left = `${R(live.left / lz - pad)}px`;
    el.spot.style.top = `${R(live.top / lz - pad)}px`;
    el.spot.style.width = `${R(live.width / lz + pad * 2)}px`;
    el.spot.style.height = `${R(live.height / lz + pad * 2)}px`;

    // 4. Курсор: путь от стартовой точки к цели за [from, to], затем стоит.
    const c = fx.cursor ?? { from: 0, to: "40%", start: [0.33, 0.61] };
    // Слайду курсор не нужен: он ничего не показывает и лезет в кадр.
    el.cur.style.display = c.hidden ? "none" : "";
    el.rip.style.display = c.hidden ? "none" : "";
    // Стартовая точка курсора — ДОЛИ КАДРА, а не пиксели: числа [640, 660]
    // были посчитаны для кадра 1280×720 и после перехода на 1920×1080
    // указывали в левую верхнюю четверть. Доли переживают смену кадра.
    const cs = c.start ?? [0.33, 0.61];
    const cStart: [number, number] = cs[0]! <= 1 && cs[1]! <= 1
      ? [cs[0]! * innerWidth, cs[1]! * innerHeight] : [cs[0]!, cs[1]!];
    const cTo = at(c.to, 0);
    const cp = ease(phase(t, at(c.from, 0), cTo));
    const dstX = base.left * k + zoomState.tx + Math.min(120, (base.width * k) / 2);
    const dstY = base.top * k + zoomState.ty + 26;
    const curX = cStart[0] + (dstX - cStart[0]) * cp;
    const curY = cStart[1] + (dstY - cStart[1]) * cp;
    el.cur.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;

    // 5. Клик: волна за 0,6 с после прибытия курсора.
    const rp = phase(t, cTo, cTo + 0.6);
    const rSize = 16 + rp * 60;
    el.rip.style.opacity = String(rp > 0 && rp < 1 ? 0.9 * (1 - rp) : 0);
    el.rip.style.left = `${Math.round(dstX)}px`;
    el.rip.style.top = `${Math.round(dstY)}px`;
    el.rip.style.width = `${Math.round(rSize)}px`;
    el.rip.style.height = `${Math.round(rSize)}px`;

    // 6. Подсказка: появление и полоса хода реплики.
    const cap = fx.caption ?? { from: 1.4 };
    const capFrom = at(cap.from, 0);
    const ap = phase(t, capFrom, capFrom + 0.42);
    el.cap.style.opacity = String(ap);
    el.cap.style.transform = `translate(-50%, ${Math.round((1 - ap) * 14)}px)`;
    const barP = phase(t, capFrom, dur);
    el.capBar.style.width = `${(Math.round(barP * 1000) / 10).toFixed(1)}%`;

    // 7. Переход: затемнение на входе и выходе сцены.
    const tr = fx.fade ?? { from: 0, in: 0.35, out: 0.35 };
    const fadeIn = 1 - phase(t, 0, tr.in ?? 0.35);
    const fadeOut = phase(t, dur - (tr.out ?? 0.35), dur);
    el.fade.style.opacity = String(Math.max(fadeIn, fadeOut).toFixed(3));
  }

  /** Прямоугольник любого элемента БЕЗ учёта зума: снимаем трансформацию на время замера. */
  function rawRect(node: Element | null): Rect {
    const prev = el.zoom.style.transform;
    el.zoom.style.transform = "none";
    const r = node ? node.getBoundingClientRect() : null;
    const out = r ? { left: r.left, top: r.top, width: r.width, height: r.height }
      : { left: 0, top: 0, width: 100, height: 100 };
    el.zoom.style.transform = prev;
    return out;
  }

  /** Прямоугольник цели БЕЗ учёта зума. */
  function targetRectRaw(): Rect {
    return rawRect(scene?.target ? document.querySelector(scene.target) : null);
  }

  // Сцена отдаётся наружу, чтобы проверка кадра могла взять цель зума
  // из данных, а не угадывать её селектором.
  return { mount, renderAt, targetRect, get scene() { return scene; } };
})();
