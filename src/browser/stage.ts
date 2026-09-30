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
  /* Всё, что рисует слой, берётся из темы: цвета, шрифты, тени, радиусы, отступы и толщины.
     Своих значений у правил нет — тема полна всегда (ролик без темы носит ночную), и правило,
     которое тема не описала, не проходит проверку договора. */
  #__st{position:fixed;inset:0;z-index:2147483000;pointer-events:none}
  #__cur{position:fixed;left:0;top:0;width:var(--sc-cursor-size);height:var(--sc-cursor-size);filter:var(--sc-cursor-shadow);transform-origin:0 0}
  /* Прожектор за указателем: кадр гаснет цветом затемнения темы, светлый круг идёт за курсором. */
  #__torch{position:fixed;inset:0;pointer-events:none;opacity:0}
  #__cur path{fill:var(--sc-cursor-fill);stroke:var(--sc-cursor-line);stroke-width:var(--sc-cursor-line-width);stroke-linejoin:round}
  #__rip{position:fixed;border-radius:50%;background:var(--sc-accent-soft);transform:translate(-50%,-50%)}
  #__spot{position:fixed;border-radius:var(--sc-spot-radius);box-shadow:var(--sc-spot-shadow)}
  /* Подпись и карточки размечены в единицах кадра (--u — сотая его ширины):
     в пикселях, подобранных под кадр 1280, они выходили мелкими в 1920. Край элементов,
     привязанных к кадру, стоит на одном шаге (--sc-edge) от края безопасной зоны. */
  #__st{--cap-size:calc(var(--u)*1.37);--sub-size:calc(var(--u)*3.33*var(--sc-sub-scale,1))}
  #__cap{position:fixed;left:50%;bottom:calc(var(--sb) + var(--sc-edge));width:calc(var(--u)*82);
    padding:var(--sc-pad-y) var(--sc-pad-x);border-radius:var(--sc-radius);
    background:var(--sc-cap-bg);border:var(--sc-hairline) solid var(--sc-cap-line);color:var(--sc-cap-ink);
    font:500 var(--cap-size)/1.42 var(--sans);box-shadow:var(--sc-cap-shadow)}
  #__capbar{position:absolute;left:0;bottom:0;height:var(--sc-cap-bar-size);
    background:var(--sc-cap-bar);border-bottom-left-radius:var(--sc-radius);border-bottom-right-radius:var(--sc-radius)}
  #__fade{position:fixed;inset:0;background:var(--sc-fade)}
  #__veil{position:fixed;inset:0;opacity:0}
  #__cards{position:fixed;inset:0;pointer-events:none}
  .__card{position:absolute;width:calc(var(--u)*34);box-sizing:border-box;
    padding:var(--sc-pad-y) var(--sc-pad-x);color:var(--sc-card-ink);background:var(--sc-card-bg);
    border:var(--sc-hairline) solid var(--sc-card-line);border-radius:var(--sc-card-radius);
    box-shadow:var(--sc-card-shadow);font-family:var(--sans)}
  .__card::before{content:"";position:absolute;left:var(--sc-pad-x);top:0;width:calc(var(--u)*5.2);height:calc(var(--u)*.24);
    background:var(--sc-card-accent);border-radius:var(--sc-sub-radius)}
  .__card[data-pos^="top"]{top:var(--upper-top,calc(var(--st) + var(--sc-edge)))}
  .__card[data-pos^="bottom"]{bottom:var(--lower-bottom)}
  .__card[data-pos$="left"]{left:calc(var(--sl) + var(--sc-edge))}
  .__card[data-pos$="right"]{right:calc(var(--sr) + var(--sc-edge))}
  .__card[data-pos="center"]{width:calc(var(--u)*56);text-align:center}
  .__card[data-pos="near-focus"]{width:calc(var(--u)*30)}
  .__card-title{font-size:calc(var(--u)*2.03);line-height:1.17;font-weight:var(--display-weight,680);letter-spacing:max(-.025em,calc(-.02em + var(--display-tracking,0em)));font-family:var(--display)}
  .__card-body{margin-top:calc(var(--u)*.78);font-size:calc(var(--u)*1.33);line-height:1.42;color:var(--sc-card-body);font-weight:470}
  /* Набор: каретка нарисована поверх последнего знака и раскладку не трогает. */
  /* Набираемый текст — побуквенные узлы, а Chromium строит лигатуры и через их границы: у
     моноширинного шрифта «--» — один знак, и когда видимость букв менялась, один дефис пары
     оставался ненарисованным (« -format» в набранной команде). Набор — буквальный текст. */
  .__g{font-variant-ligatures:none;font-feature-settings:"liga" 0,"calt" 0}
  .__g.__caret{position:relative}
  .__g.__caret::after{content:"";position:absolute;right:-.06em;top:.1em;bottom:.08em;width:.07em;
    border-radius:var(--radius-pill);background:var(--sc-card-accent-solid)}
  .__emoji{height:1.05em;width:auto;vertical-align:-.16em;display:inline-block}
  /* Примитивы размечены в единицах кадра (--u — сотая ширины кадра), а не в
     пикселях: кадр бывает 1280, 1920 и 1080 в ширину, а титр обязан занимать
     одну и ту же долю кадра. */
  #__prims{position:fixed;inset:0;pointer-events:none}
  /* Под крупным титром кадр гаснет: заявление поверх живого интерфейса
     иначе тонет в его подписях. У светлой темы подложка светлая, а титр тёмный. */
  #__scrim{position:absolute;inset:0;opacity:0;background:var(--sc-scrim)}
  #__arrows{position:fixed;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
  [data-off-layer]{display:none!important}
  .__title{position:absolute;left:50%;width:calc(var(--u)*86);text-align:center;text-wrap:balance;
    font-family:var(--display);font-weight:var(--display-weight,680);text-transform:var(--display-case,none);font-size:calc(var(--u)*5.6);line-height:1.04;letter-spacing:max(-.025em,calc(-.02em + var(--display-tracking,0em)));
    color:var(--sc-title-ink);text-shadow:var(--sc-title-shadow)}
  .__title[data-pos="center"]{top:50%}
  /* Титр сверху стоит на шаг ниже верхнего края зоны, титр снизу — там же, где нижний титр:
     на шаг выше края зоны или полосы субтитров. Двигаются они от этого края, а не от середины. */
  .__title[data-pos="top"]{top:var(--upper-top,calc(var(--st) + var(--sc-edge)))}
  .__title[data-pos="bottom"]{top:auto;bottom:var(--lower-bottom)}
  .__title .__w{display:inline-block;white-space:pre}
  .__lower{position:absolute;bottom:var(--lower-bottom);display:flex;flex-direction:column;gap:calc(var(--u)*.35);
    padding:var(--sc-pad-y) var(--sc-pad-x);background:var(--sc-card-bg);border-radius:var(--sc-radius);
    box-shadow:var(--sc-card-shadow);overflow:hidden;font-family:var(--sans);max-width:calc(var(--u)*46)}
  .__lower[data-side="left"]{left:calc(var(--sl) + var(--sc-edge))}
  .__lower[data-side="right"]{right:calc(var(--sr) + var(--sc-edge));text-align:right}
  .__lower::before{content:"";position:absolute;left:0;top:0;bottom:0;width:calc(var(--u)*.45);
    background:var(--sc-lower-bar);transform:scaleY(var(--bar,1));transform-origin:top}
  .__lower-title{font-size:calc(var(--u)*2.15);font-weight:var(--display-weight,680);letter-spacing:max(-.025em,calc(-.02em + var(--display-tracking,0em)));text-transform:var(--display-case,none);color:var(--sc-card-ink);font-family:var(--display)}
  .__lower-sub{font-size:calc(var(--u)*1.25);color:var(--sc-card-body);font-weight:500}
  .__callout{position:absolute;max-width:calc(var(--u)*24);padding:var(--sc-pad-y) var(--sc-pad-x);
    border-radius:var(--sc-radius);font:650 calc(var(--u)*1.35)/1.25 var(--sans);
    color:var(--sc-card-ink);background:var(--sc-card-bg);
    border:var(--sc-hairline) solid var(--sc-card-line);box-shadow:var(--sc-card-shadow)}
  .__arrow{fill:none;stroke:var(--sc-spot);stroke-linecap:round}
  .__arrowhead{fill:var(--sc-spot)}
  .__sticker{position:absolute;display:grid;place-items:center;transform-origin:50% 60%}
  .__sticker img{width:100%;height:100%;object-fit:contain;filter:var(--sc-sticker-shadow)}
  .__badge{padding:var(--sc-badge-pad-y) var(--sc-badge-pad-x);border-radius:var(--radius-pill);white-space:nowrap;
    font:700 calc(var(--u)*1.12)/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;
    color:var(--sc-badge-ink);background:var(--sc-badge-bg);box-shadow:var(--sc-badge-shadow)}
  /* Субтитры: речь такта кусками не длиннее двух строк; в караоке сказанное
     ярче, текущее слово подсвечено, ещё не сказанное приглушено. Подложка строки
     отступает от текста по горизонтали на тот же шаг, что и у карточки; по вертикали
     её держит высота строки, иначе подложки соседних строк легли бы друг на друга. */
  #__sub{position:fixed;left:50%;bottom:calc(var(--sb) + var(--sc-edge));transform:translateX(-50%);width:calc(var(--u)*80);
    text-align:center;text-wrap:balance;font:var(--sub-weight) var(--sub-size)/1.3 var(--sub-font);
    color:var(--sc-sub-ink);letter-spacing:-.005em}
  /* Место субтитров и подписи: сверху — на шаг от верха зоны, посередине — серединой зоны. */
  #__st[data-cappos="top"] #__sub,#__st[data-cappos="top"] #__cap{top:calc(var(--st) + var(--sc-edge));bottom:auto}
  #__st[data-cappos="middle"] #__sub,#__st[data-cappos="middle"] #__cap{top:calc(var(--st) + var(--sh) / 2);bottom:auto;translate:0 -50%}
  #__sub .__line{display:inline;padding:var(--sc-sub-pad-y) var(--sc-pad-x);border-radius:var(--sc-sub-radius);
    background:var(--sc-sub-bg);box-decoration-break:clone;-webkit-box-decoration-break:clone}
  /* Слово — отдельный блок (караоке подсвечивает его целиком); слово длиннее строки (путь, имя
     переменной) переносится внутри себя, а не уходит за край кадра. */
  #__sub .__word{display:inline-block;white-space:pre-wrap;overflow-wrap:anywhere;max-width:100%;border-radius:var(--sc-sub-radius)}
  /* Пометки от руки, блик и всплески — предметная половина слоя. */
  .__mark{fill:none;stroke:var(--sc-mark);stroke-linecap:round;stroke-linejoin:round}
  .__glint{position:absolute;overflow:hidden;pointer-events:none;mix-blend-mode:var(--sc-glint-blend);border-radius:var(--sc-card-radius)}
  .__ping{position:absolute;width:0;height:0;pointer-events:none}
  .__ping i{position:absolute;left:0;top:0;border-radius:50%;border:var(--sc-spot-width) solid var(--sc-ripple-ring);transform:translate(-50%,-50%)}
  .__ping b{position:absolute;left:0;top:0;width:calc(var(--u)*0.9);height:calc(var(--u)*0.9);border-radius:50%;background:var(--sc-ripple-ring);transform:translate(-50%,-50%)}
  #__toasts{position:absolute;right:var(--sc-edge);top:var(--sc-edge);width:calc(var(--u)*30);pointer-events:none}
  .__toast{position:absolute;right:0;top:0;width:100%;display:flex;gap:calc(var(--u)*0.8);align-items:flex-start;box-sizing:border-box;
    padding:var(--sc-pad-y) var(--sc-pad-x);border-radius:var(--sc-card-radius);background:var(--sc-card-bg);border:var(--sc-hairline) solid var(--sc-card-line);
    box-shadow:var(--sc-card-shadow);color:var(--sc-card-body);font:500 calc(var(--u)*1.25)/1.35 var(--sans)}
  .__toast .__ti{font-size:calc(var(--u)*2);line-height:1}
  .__toast b{display:block;color:var(--sc-card-ink);font-weight:700;font-size:calc(var(--u)*1.4);margin-bottom:calc(var(--u)*0.15)}
  .__glint i{position:absolute;top:-20%;bottom:-20%;width:45%;transform:skewX(-18deg);background:var(--sc-glint)}
  #__bursts{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
  /* «ИИ думает»: по строке и полосам скелетона бежит блик — светлая середина градиента втрое шире
     предмета. С предметом скелетон лежит на нём, без предмета — карточкой посередине кадра. */
  .__think{position:absolute;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;gap:calc(var(--u)*.8);
    padding:var(--sc-pad-y) var(--sc-pad-x);border-radius:var(--sc-card-radius);background:var(--sc-card-bg);
    border:var(--sc-hairline) solid var(--sc-card-line);box-shadow:var(--sc-card-shadow);overflow:hidden}
  .__think[data-free]{width:calc(var(--u)*30)}
  .__think em{font:600 calc(var(--u)*1.5)/1.3 var(--sans);font-style:normal;color:transparent;-webkit-background-clip:text;background-clip:text;
    background-image:linear-gradient(90deg,var(--sc-card-body) 35%,var(--sc-card-ink) 50%,var(--sc-card-body) 65%);background-size:300% 100%}
  .__think i{display:block;height:calc(var(--u)*1);border-radius:var(--radius-pill);background-size:300% 100%;
    background-image:linear-gradient(90deg,color-mix(in srgb,var(--sc-card-body) 20%,transparent) 35%,color-mix(in srgb,var(--sc-card-body) 50%,transparent) 50%,color-mix(in srgb,var(--sc-card-body) 20%,transparent) 65%)}
  .__think i:last-child{width:62%}
  /* Субтитры контуром (умолчание, captions.look: outline): белый текст с чёрной обводкой в 0,08
     кегля и мягкой тенью, без плашки — читается и на светлом, и на тёмном кадре, как у плеера с
     «Outline Text». Обводка — кольцо теней: -webkit-text-stroke в Chromium ложится поверх буквы и
     съедает её. Шрифт и насыщенность — подобранные темой для субтитров (--sub-font, --sub-weight).
     Плотная плашка — явный выбор captions.look: plate для пёстрого интерфейса. */
  #__sub[data-look="outline"]{color:var(--sc-sub-outline-ink);text-shadow:var(--sc-sub-outline-shadow);letter-spacing:.02em}
  #__sub[data-look="outline"] .__line{background:none;padding-left:0;padding-right:0}
  #__sub[data-look="outline"][data-style="karaoke"] .__word.__now{color:var(--sc-sub-accent);background:none;box-shadow:none}
  /* Непроизнесённые слова приглушены прозрачностью темы: светлой плашке нужно меньше приглушения,
     чтобы слово держало 4,5:1 (правило 62: слово загорается цветом, а не пропадает). */
  #__sub[data-style="karaoke"] .__word{opacity:var(--sc-karaoke-rest)}
  #__sub[data-style="karaoke"] .__word.__said{opacity:1}
  #__sub[data-style="karaoke"] .__word.__now{opacity:1;color:var(--sc-karaoke-ink);
    background:var(--sc-karaoke-bg);box-shadow:var(--sc-karaoke-halo)}
  /* — кадр с безопасной зоной (вертикаль, квадрат) —
     Площадка кладёт поверх кадра своё: имя, подпись, кнопки справа и внизу.
     Всё, что читают, лежит внутри прямоугольника зоны (--sl, --st, --sw, --sh),
     а кегли — телефонные: подпись и субтитры 50–60 точек, титр около ста. */
  #__st[data-format]{--cap-size:calc(var(--u)*2.5);--sub-size:calc(var(--u)*3.5*var(--sc-sub-scale,1))}
  #__st[data-format] #__cap{left:50%;width:calc(var(--cw) - var(--sc-edge) * 2)}
  /* Блок субтитров — полоса зоны без шага от края. Поля плашки (--sc-pad-x) лежат ВНУТРИ строки
     (box-decoration-break: clone), поэтому тексту плашки остаётся полоса без двух полей — ровно
     то, на что считает строку subtitleMax (film.ts). Сужать сам блок ещё и на поля значило вычесть
     их дважды: двухстрочный кусок у плашки ломался на три строки. */
  #__st[data-format] #__sub{left:50%;width:calc(var(--cw) - var(--sc-edge) * 2)}
  #__st[data-format] .__card{width:min(calc(var(--u)*34),calc(var(--sw) - var(--sc-edge) * 2))}
  #__st[data-format="portrait"] .__card{width:calc(var(--sw) - var(--sc-edge) * 2)}
  #__st[data-format] .__card[data-pos="center"],#__st[data-format] .__card[data-pos="near-focus"]{width:calc(var(--cw) - var(--sc-edge) * 2)}
  #__st[data-format] .__card-title{font-size:calc(var(--u)*2.6)}
  #__st[data-format] .__card-body{font-size:calc(var(--u)*2)}
  #__st[data-format] .__title{left:50%;width:var(--cw);font-size:calc(var(--u)*5.2)}
  #__st[data-format] .__title[data-pos="center"]{top:calc(var(--st) + var(--sh) / 2)}
  #__st[data-format] .__lower{max-width:calc(var(--sw) - var(--sc-edge) * 2)}
  #__st[data-format] .__lower-title{font-size:calc(var(--u)*2.6)}
  #__st[data-format] .__lower-sub{font-size:calc(var(--u)*1.8)}
  #__st[data-format] .__callout{font-size:calc(var(--u)*2);max-width:calc(var(--sw) * .8)}
  #__st[data-format] .__badge{font-size:calc(var(--u)*1.6)}
  #__st[data-format] .__think[data-free]{width:calc(var(--sw) - var(--sc-edge) * 2)}
  #__st[data-format] .__think em{font-size:calc(var(--u)*2.2)}
  `;
  const CURSOR = `<svg id="__cur" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 2 L4 20 L9 15.5 L12 22 L15 20.5 L12 14.2 L19 14 Z"/></svg>`;
  // Токены темы, которые читает код: строка как есть и число (доля кадра, толщина, размер).
  const tokenText = (k: string): string => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
  const token = (k: string): number => Number.parseFloat(tokenText(k));

  interface Rect { left: number; top: number; width: number; height: number }
  interface Els {
    zoom: HTMLElement; layer: HTMLElement; spot: HTMLElement; cap: HTMLElement;
    capText: HTMLElement; capBar: HTMLElement; cur: HTMLElement; rip: HTMLElement;
    fade: HTMLElement; cards: HTMLElement; veil: HTMLElement; torch: HTMLElement;
  }

  let scene: StageScene | null = null;
  let el = {} as Els;

  /**
   * Момент времени задаётся ЯКОРЕМ, а не только секундой.
   *
   *   b2       начало второго такта речи
   *   b2.end   конец его речи: начало третьего, у последнего такта — конец речи сцены
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
    const endOf = (i: number): number => (i + 1 < starts.length ? starts[i + 1]! : Math.min(dur, s.spoken ?? dur));
    return (a, dflt = 0) => {
      if (a === undefined || a === null) return dflt;
      if (typeof a === "number") return a;
      const text = String(a).trim();
      if (!text) return dflt;
      // Пункт k из n без названного момента. Хватает тактов — пункт выходит на своём такте;
      // не хватает — пункты идут ровным шагом по речи. Прежде им давались якоря b2…bn, и лишние
      // прижимались к последнему такту: первый пункт выходил отдельно, остальные разом.
      const slot = /^i(\d+)\/(\d+)$/.exec(text);
      if (slot) {
        const k = Number(slot[1]), n = Number(slot[2]);
        if (n <= starts.length) return k === 0 ? startOf(0) + 0.5 : startOf(k);
        // Ровный шаг по первым 60 % речи: весь список стоит в кадре, пока речь договаривается,
        // а вход последнего пункта не приходится на конец сцены. Шаг не короче 0,35 с.
        const end = Math.max(1, Math.min(s.spoken ?? dur, dur));
        return n > 1 ? 0.5 + k * Math.max(0.35, (end * 0.6 - 0.5) / (n - 1)) : 0.5;
      }
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

  // — набор текста без смены раскладки —
  //
  // Прежде набор срезал текст элемента до уже набранных знаков, и браузер
  // раскладывал обрубок заново: сбалансированный заголовок переносил строки
  // иначе, центрированная карточка ездила, блок рос на каждом слове. Теперь
  // текст один раз раскладывается целиком, по графеме на узел, а ещё не
  // набранные графемы скрываются `visibility: hidden` — они занимают своё место,
  // и первый знак стоит там же, где будет стоять в полном тексте.
  const glyphCache = new WeakMap<HTMLElement, HTMLElement[]>();
  const graphemes = (text: string): string[] => {
    const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) =>
      { segment(t: string): Iterable<{ segment: string }> } }).Segmenter;
    return Seg ? Array.from(new Seg(undefined, { granularity: "grapheme" }).segment(text), (s) => s.segment)
      : Array.from(text);
  };
  /** Графемы элемента отдельными узлами; разбивка делается один раз и кэшируется. */
  function glyphsOf(el: HTMLElement): HTMLElement[] {
    const known = glyphCache.get(el);
    if (known) return known;
    // Текст берётся вместе с эмодзи, уже заменёнными картинками: их знак —
    // в `alt`, иначе при разбивке эмодзи пропало бы из набора.
    let text = "";
    for (const n of Array.from(el.childNodes)) {
      text += n instanceof HTMLImageElement && n.classList.contains("__emoji") ? n.alt : n.textContent ?? "";
    }
    el.textContent = "";
    const list = graphemes(text).map((ch) => {
      const span = document.createElement("span");
      span.className = "__g";
      const picture = emojiImage(ch);
      if (picture) span.appendChild(picture);
      else span.textContent = ch;
      el.appendChild(span);
      return span;
    });
    glyphCache.set(el, list);
    return list;
  }
  /** Сколько графем у элемента — для расчёта хода набора. */
  const glyphCount = (el: HTMLElement): number => glyphsOf(el).length;
  /** Сколько секунд в конце сцены набранный текст стоит целиком. */
  const TYPE_HOLD = 0.6;
  /**
   * Неровный темп руки: момент, когда встаёт каждая графема, в «знаках» ровного набора. Знаки
   * идут с разбросом от половины до полутора средних, после пробела рука медлит, после запятой —
   * вдвое, после точки — втрое. Итог нормирован на число знаков: набор кончается тогда же, когда
   * кончился бы ровный, меняется только ритм внутри. Разброс — функция номера знака: одинаков в
   * каждом прогоне.
   */
  const rhythmCache = new WeakMap<HTMLElement, number[]>();
  function rhythm(el: HTMLElement): number[] {
    const known = rhythmCache.get(el);
    if (known) return known;
    const list = glyphsOf(el);
    let acc = 0;
    const raw = list.map((_, i) => {
      const prev = i ? list[i - 1]!.textContent ?? "" : "";
      let w = 0.5 + hash(i, 9);
      if (/[.!?…]/.test(prev)) w *= 3; else if (/[,;:—]/.test(prev)) w *= 2; else if (/\s/.test(prev)) w *= 1.4;
      acc += w;
      return acc;
    });
    const times = raw.map((v) => (v * list.length) / (acc || 1));
    rhythmCache.set(el, times);
    return times;
  }
  /**
   * Показать графемы, чей момент в неровном ритме наступил к `count` знакам ровного набора,
   * остальные скрыть на своих местах. Пока набор идёт, за последним знаком стоит каретка: она
   * нарисована поверх и раскладку не трогает.
   */
  function typeTo(el: HTMLElement, count: number): void {
    const list = glyphsOf(el);
    const times = rhythm(el);
    let shown = 0;
    while (shown < list.length && times[shown]! <= count + 1e-9) shown++;
    list.forEach((g, i) => {
      g.style.visibility = i < shown ? "" : "hidden";
      g.classList.toggle("__caret", shown < list.length && i === shown - 1);
    });
  }
  // Эмодзи рисуется картинкой из поставляемого набора, а не шрифтом машины:
  // иначе одна и та же сцена даёт Apple Color Emoji на одной машине и пустой
  // квадрат на другой. Набор кладёт в сцену сборка — только нужные знаки.
  function emojiImage(ch: string): HTMLImageElement | null {
    const src = scene?.emoji?.[ch];
    if (!src) return null;
    const img = document.createElement("img");
    img.className = "__emoji";
    img.alt = ch;
    img.src = src;
    img.setAttribute("data-emoji-set", "noto");
    return img;
  }
  /** Текст с эмодзи-картинками: для примитивов, которые не набираются. */
  function setRichText(el: HTMLElement, text: string): void {
    el.textContent = "";
    for (const ch of graphemes(text)) {
      const picture = emojiImage(ch);
      el.appendChild(picture ?? document.createTextNode(ch));
    }
  }

  // — безопасная зона —
  //
  // Прямоугольник, внутри которого лежит всё, что читают. Без формата это кадр
  // с прежними полями; с форматом — зона площадки, пересчитанная в точки слоя.
  function safeRect(lz: number): { l: number; t: number; r: number; b: number } {
    const W = innerWidth / lz, H = innerHeight / lz;
    const z = scene?.safe;
    if (!z) return { l: W * 0.02, t: H * 0.03, r: W * 0.98, b: H * 0.97 };
    return { l: z.left / lz, t: z.top / lz, r: W - z.right / lz, b: H - z.bottom / lz };
  }
  /**
   * Единица и поля слоя под формат. У высокого кадра единица — не сотая ширины
   * (так подпись в кадре шириной 1080 выходила в пятнадцать точек), а
   * пятьдесят шестая меньшей стороны: те же девятнадцать точек, что у
   * горизонтали, а кегли поверх неё задают правила формата.
   */
  function applySafe(node: HTMLElement, s: StageScene | null, lz: number): void {
    const W = innerWidth / lz, H = innerHeight / lz;
    // Зона задаётся всегда: элементы, привязанные к кадру, стоят на одном шаге темы от её края
    // и в горизонтали (зона — прежние поля кадра), и в формате площадки.
    if (s?.safe) {
      node.dataset.format = H > W * 1.2 ? "portrait" : "square";
      node.style.setProperty("--u", `${(Math.min(W, H) / 56).toFixed(3)}px`);
    }
    const r = safeRect(lz);
    node.style.setProperty("--sl", `${r.l.toFixed(1)}px`);
    node.style.setProperty("--sr", `${(W - r.r).toFixed(1)}px`);
    node.style.setProperty("--st", `${r.t.toFixed(1)}px`);
    node.style.setProperty("--sb", `${(H - r.b).toFixed(1)}px`);
    node.style.setProperty("--sw", `${(r.r - r.l).toFixed(1)}px`);
    node.style.setProperty("--sh", `${(r.b - r.t).toFixed(1)}px`);
    // Что стоит посередине — субтитры, подпись, титр, карточка в центре, — стоит посередине
    // КАДРА: зритель меряет середину по краям экрана, а не по невидимой зоне. Зона площадки
    // несимметрична (справа столбец кнопок), поэтому ширина такого блока — симметричная
    // полоса вокруг середины кадра, целиком лежащая в зоне.
    const half = Math.max(0, Math.min(W / 2 - r.l, r.r - W / 2));
    node.style.setProperty("--cw", `${(half * 2).toFixed(1)}px`);
  }

  // — кинетический текст —
  //
  // Фраза собирается по словам или по буквам: слова всплывают, вкручиваются,
  // влетают с разных сторон, буквы падают, сходятся, проявляются из шума.
  // Каждая единица — отдельный узел на СВОЁМ месте в окончательной раскладке:
  // двигается только трансформацией, поэтому строки не перекладываются и
  // устоявшийся кадр совпадает с текстом без анимации. Всё — на плоскости:
  // элемент, побывавший трёхмерным, Chromium растрирует потом иначе, и кадр
  // с середины переставал совпадать с кадром сквозного прогона.
  //
  // Имена стилей и их смысл — в описании накладки (`overlay.ts`, KINETIC).
  const LETTER_STYLES = ["drop", "wave", "split", "flip", "blur", "swirl", "flap", "arc"];
  // Остальные стили — по словам: rise, spin, fly, slide, zoom, bounce, glitch, beat.
  /** Стили, у которых и собранная фраза остаётся единицами: дуга стоит изогнутой, сбой и доля повторяются. */
  const LASTING = ["arc", "glitch", "beat", "aurora", "sparkle"];
  /** Частицы фразы `swarm`: куда каждая летит (точки букв) и холст, на котором они рисуются. */
  const swarms = new WeakMap<HTMLElement, { cv: HTMLCanvasElement; pts: number[] | null; pad: [number, number] }>();
  const NOISE = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=?@";
  /** Детерминированный шум по номеру: одно и то же у каждого прогона. */
  const hash = (i: number, k = 0): number => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  let pageKinetic: HTMLElement[] = [];
  let own = false;
  const kineticUnits = new WeakMap<HTMLElement, { units: HTMLElement[]; style: string; letters: boolean;
    plain: Node[]; split: Node[]; showing: "plain" | "split" }>();

  /** Разбить узел на единицы кинетики. Разбивка делается один раз. */
  function kineticMount(node: HTMLElement, style: string): void {
    if (kineticUnits.has(node)) return;
    let text = "";
    for (const n of Array.from(node.childNodes)) {
      text += n instanceof HTMLImageElement && n.classList.contains("__emoji") ? n.alt : n.textContent ?? "";
    }
    const letters = LETTER_STYLES.includes(style);
    // Исходный текст сохраняется: собравшаяся фраза снова показывает его целиком.
    // Буквы отдельными узлами теряют кернинг пар, и без возврата устоявшаяся
    // строка стояла бы чуть шире обычной.
    const plain = Array.from(node.childNodes);
    node.textContent = "";
    const units: HTMLElement[] = [];
    for (const part of text.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { node.appendChild(document.createTextNode(" ")); continue; }
      // Слово не рвётся: буквы лежат внутри неразрывного узла слова.
      const word = document.createElement("span");
      word.className = "__kw";
      word.style.cssText = "display:inline-block;white-space:nowrap";
      if (letters) {
        for (const ch of graphemes(part)) {
          const u = document.createElement("span");
          u.className = "__ku";
          u.style.display = "inline-block";
          const picture = emojiImage(ch);
          if (picture) u.appendChild(picture); else u.textContent = ch;
          if (style === "flap" && !picture) {
            // Шум рисуется поверх настоящей буквы, а сама буква держит место.
            u.style.position = "relative";
            const noise = document.createElement("b");
            noise.className = "__kn";
            noise.style.cssText = "position:absolute;left:0;right:0;top:0;text-align:center;font-weight:inherit";
            u.appendChild(noise);
          }
          word.appendChild(u);
          units.push(u);
        }
      } else {
        setRichText(word, part);
        units.push(word);
      }
      node.appendChild(word);
    }
    // Искры и холст частиц — часть собираемой фразы: они живут среди единиц и уходят вместе с ними.
    if (style === "sparkle" || style === "swarm") {
      if (getComputedStyle(node).position === "static") node.style.position = "relative";
    }
    if (style === "sparkle") {
      for (let i = 0; i < 8; i++) {
        const spark = document.createElement("i");
        spark.className = "__spk";
        spark.textContent = "✦";
        spark.style.cssText = `position:absolute;left:${(hash(i, 21) * 100).toFixed(1)}%;top:${(-25 + hash(i, 22) * 130).toFixed(1)}%;`
          + `font-size:${(0.25 + hash(i, 23) * 0.25).toFixed(2)}em;color:var(--acc2,currentColor);pointer-events:none;font-style:normal`;
        node.appendChild(spark);
      }
    }
    if (style === "swarm") {
      const cv = document.createElement("canvas");
      cv.className = "__swarm";
      cv.style.cssText = "position:absolute;pointer-events:none";
      node.appendChild(cv);
      swarms.set(node, { cv, pts: null, pad: [0, 0] });
    }
    node.dataset.kinetic = style;
    kineticUnits.set(node, { units, style, letters, plain, split: Array.from(node.childNodes), showing: "split" });
  }

  /** Состояние фразы в момент t: вход начинается в `at`. Возвращает долю готовности всей фразы. */
  function kineticAt(node: HTMLElement, t: number, at: number): number {
    const k = kineticUnits.get(node);
    if (!k) return 1;
    const n = k.units.length;
    // Фраза собирается не дольше секунды с небольшим, сколько бы в ней ни было единиц.
    const step = Math.min(k.letters ? 0.03 : 0.08, 1.1 / Math.max(1, n));
    const dur = k.style === "flap" ? 0.95 : k.style === "beat" ? 0.3 : k.letters ? 0.55 : 0.7;
    const em = parseFloat(getComputedStyle(node).fontSize) || 16;
    // Слова «beat» выходят на доли музыки, пришедшие со сценой (секунды сцены); без музыки — ровно
    // по 120 ударов в минуту от начала фразы.
    const beats = k.style === "beat" ? (scene?.musicBeats ?? []).filter((b) => b >= at - 0.02) : [];
    const beatOf = (j: number): number => beats[j] ?? (beats.length ? beats[beats.length - 1]! + (j - beats.length + 1) * 0.5 : at + j * 0.5);
    const startOf = (i: number): number => (k.style === "beat" ? beatOf(i) : at + i * step);
    // Дуга: у каждой строки своя середина; буква стоит на окружности радиусом в ширину фразы.
    const arc = k.style === "arc" ? arcPlaces(node, k.units) : null;
    if (k.style === "swarm") return swarmAt(node, k.units, t, at, k);
    let done = 1;
    k.units.forEach((u, i) => {
      const p = clamp((t - startOf(i)) / dur);
      done = Math.min(done, p);
      const e = 1 - Math.pow(1 - p, 3);
      const style = k.style;
      let tf = "", blur = 0, o = clamp(p * 3);
      switch (style) {
        case "rise": tf = `translateY(${((1 - e) * 0.7).toFixed(3)}em)`; blur = (1 - e) * 8; break;
        case "spin": tf = `rotate(${((1 - e) * -200).toFixed(2)}deg) scale(${(0.2 + 0.8 * e).toFixed(4)})`; break;
        case "fly": {
          const a = hash(i, 1) * Math.PI * 2, d = (1 - e) * (3 + hash(i, 2) * 3);
          tf = `translate(${(Math.cos(a) * d).toFixed(3)}em,${(Math.sin(a) * d).toFixed(3)}em) rotate(${((1 - e) * (hash(i, 4) - 0.5) * 160).toFixed(2)}deg) scale(${(0.5 + 0.5 * e).toFixed(4)})`;
          break;
        }
        case "slide": tf = `translateX(${((1 - e) * -1.8).toFixed(3)}em) skewX(${((1 - e) * -14).toFixed(2)}deg)`; o = clamp(p * 2); break;
        case "zoom": tf = `scale(${(1 + (1 - e) * 2.4).toFixed(4)})`; blur = (1 - e) * 12; o = clamp(p * 2); break;
        case "bounce": tf = `scale(${spring(p).toFixed(4)})`; break;
        case "drop": {
          // Падение с отскоком: буква приземляется, подпрыгивает и садится.
          const b = p < 0.6 ? Math.pow(p / 0.6, 2) : 1 - Math.sin(((p - 0.6) / 0.4) * Math.PI) * 0.12 * (1 - p);
          tf = `translateY(${((1 - b) * -1.4).toFixed(3)}em)`;
          break;
        }
        case "wave": tf = `translateY(${(-Math.sin(p * Math.PI) * 0.45).toFixed(3)}em) scale(${(0.6 + 0.4 * e).toFixed(4)})`; break;
        case "split": {
          const side = i < n / 2 ? -1 : 1;
          tf = `translateX(${(side * (1 - e) * 2.5).toFixed(3)}em)`;
          blur = (1 - e) * 5;
          break;
        }
        case "flip": tf = `scaleY(${Math.sin(e * Math.PI / 2).toFixed(4)})`; o = p > 0 ? 1 : 0; break;
        case "blur": blur = (1 - e) * 16; o = e; break;
        case "flap": {
          // Табло: знак перещёлкивается 14 раз в секунду, каждая смена — лист, сжимающийся по высоте.
          const noise = u.querySelector<HTMLElement>(".__kn");
          const settled = p >= 1, tick = (t - startOf(i)) * 14;
          if (noise) noise.textContent = settled ? "" : NOISE[Math.floor(hash(i, Math.floor(tick)) * NOISE.length)]!;
          // Букву прячет цвет заливки, а не цвет: знак табло наследует цвет буквы и остаётся виден.
          u.style.setProperty("-webkit-text-fill-color", settled || !noise ? "" : "transparent");
          if (noise) noise.style.setProperty("-webkit-text-fill-color", "currentColor");
          const q = tick - Math.floor(tick);
          tf = settled ? "" : `scaleY(${(0.3 + 0.7 * Math.abs(Math.cos(q * Math.PI))).toFixed(3)})`;
          o = p > 0 ? 1 : 0;
          break;
        }
        case "arc": {
          const [ang, lift] = arc![i]!;
          tf = `translateY(${(lift + (1 - e) * 0.5).toFixed(3)}em) rotate(${ang.toFixed(3)}rad)`;
          o = e;
          break;
        }
        case "glitch": {
          // Сбой: слово дёргается вбок и расслаивается на два цвета темы на входе и в коротких
          // повторах каждые 2,6 с после сборки.
          const since = t - startOf(i), again = since > dur && ((since - dur) % 2.6) > 2.45;
          const shake = p < 1 ? 1 - p : again ? 0.6 : 0, tick = Math.floor(t * 24);
          const dx = (hash(i, tick) - 0.5) * 0.5 * shake;
          tf = shake ? `translateX(${dx.toFixed(3)}em) skewX(${((hash(i, tick + 7) - 0.5) * 20 * shake).toFixed(2)}deg)` : "";
          u.style.textShadow = shake ? `${(0.06 * shake).toFixed(3)}em 0 var(--acc), ${(-0.06 * shake).toFixed(3)}em 0 var(--acc2)` : "";
          o = p > 0 ? (p < 1 && hash(i, tick + 3) < 0.2 ? 0.35 : 1) : 0;
          break;
        }
        case "beat": {
          // Удар: слово влетает крупным и оседает за 0,3 с; дальше вся фраза вздрагивает на каждой доле.
          const since = t - startOf(i);
          const last = beats.filter((b) => b <= t).pop();
          const after = last !== undefined && last > startOf(n - 1) ? t - last : Infinity;
          tf = `scale(${(1 + 0.28 * Math.exp(-10 * Math.max(0, since)) + 0.05 * Math.exp(-12 * after)).toFixed(4)})`;
          o = since >= 0 ? 1 : 0;
          break;
        }
        case "aurora": {
          // Живой градиент: одна полоса двух акцентов темы вдвое шире фразы течёт по всем словам сразу.
          tf = `translateY(${((1 - e) * 0.5).toFixed(3)}em)`;
          blur = (1 - e) * 6;
          const base = u.offsetParent === node ? 0 : node.offsetLeft, w = Math.max(1, node.offsetWidth);
          // Светлая полоса текста темы между акцентами: градиент читается и там, где акценты близки.
          u.style.backgroundImage = "linear-gradient(100deg,var(--acc) 0%,var(--acc2) 20%,var(--ink) 28%,var(--acc2) 36%,var(--acc) 50%,var(--acc2) 70%,var(--ink) 78%,var(--acc2) 86%,var(--acc) 100%)";
          u.style.backgroundSize = `${(w * 2).toFixed(0)}px 100%`;
          u.style.backgroundPosition = `${(-(u.offsetLeft - base) - ((t * 70) % (w * 2))).toFixed(1)}px 0`;
          u.style.setProperty("-webkit-background-clip", "text");
          u.style.setProperty("-webkit-text-fill-color", "transparent");
          break;
        }
        case "sparkle": tf = `translateY(${((1 - e) * 0.5).toFixed(3)}em)`; blur = (1 - e) * 6; break;
        case "swirl": {
          const a = (1 - e) * 4 + i * 0.6, r = (1 - e) * 1.6;
          tf = `translate(${(Math.cos(a) * r).toFixed(3)}em,${(Math.sin(a) * r).toFixed(3)}em) rotate(${((1 - e) * 300).toFixed(2)}deg)`;
          break;
        }
        default: break;
      }
      u.style.opacity = o.toFixed(3);
      u.style.transform = p >= 1 && !LASTING.includes(style) ? "none" : tf || "none";
      let smeared = "";
      if (FAST_TRAVEL.includes(style) && p > 0 && p < 1) {
        const pp = clamp((t - SMEAR_DT - startOf(i)) / dur), [x1, y1] = travelOf(style, i, n, p), [x0, y0] = travelOf(style, i, n, pp);
        smeared = smearFilter(u, (x1 - x0) * em, (y1 - y0) * em);
      }
      u.style.filter = [blur > 0.05 && p < 1 ? `blur(${blur.toFixed(2)}px)` : "", smeared].filter(Boolean).join(" ") || "none";
      if (style === "flip" || style === "drop") u.style.transformOrigin = "50% 100%";
      // Слово в долю растёт вправо, от уже стоящих слов, а не на них.
      if (style === "beat") u.style.transformOrigin = "0 80%";
    });
    // Искры вспыхивают по очереди, каждая раз в 1,6 с, с поворотом — пока фраза стоит.
    if (k.style === "sparkle") {
      node.querySelectorAll<HTMLElement>(".__spk").forEach((sp, i) => {
        const q = (((t - at) / 1.6 + hash(i, 24)) % 1 + 1) % 1, on = t >= at + 0.3 ? Math.sin(q * Math.PI) : 0;
        sp.style.opacity = (on * on).toFixed(3);
        sp.style.transform = `scale(${(0.3 + 0.9 * on).toFixed(3)}) rotate(${(q * 180).toFixed(1)}deg)`;
      });
    }
    // Показ зависит только от t: собрано — исходный текст, иначе — единицы. Дуга, сбой и доля
    // остаются единицами и собранными: их вид после сборки — не исходная строка.
    const want = done >= 1 && !LASTING.includes(k.style) ? "plain" : "split";
    if (k.showing !== want) {
      node.replaceChildren(...(want === "plain" ? k.plain : k.split));
      k.showing = want;
    }
    return done;
  }

  /**
   * Рой: точки букв фразы (буквы нарисованы на скрытом холсте её шрифтом на своих местах, берётся
   * каждая третья точка) слетаются из разброса вокруг фразы за 1,6 с, каждая со своей задержкой;
   * к концу полёта проступает настоящий текст, и холст гаснет. Разброс и задержки — функция номера
   * точки: кадр с середины совпадает с кадром сквозного прогона.
   */
  function swarmAt(node: HTMLElement, units: HTMLElement[], t: number, at: number,
    k: { units: HTMLElement[]; plain: Node[]; split: Node[]; showing: "plain" | "split" }): number {
    const sw = swarms.get(node)!;
    const W = node.offsetWidth, H = node.offsetHeight;
    if (!sw.pts) {
      const cs = getComputedStyle(node), pad: [number, number] = [W * 0.5, H * 1.2];
      sw.pad = pad;
      sw.cv.width = Math.max(2, Math.round(W + pad[0] * 2)); sw.cv.height = Math.max(2, Math.round(H + pad[1] * 2));
      sw.cv.style.left = `${-pad[0]}px`; sw.cv.style.top = `${-pad[1]}px`;
      sw.cv.style.width = `${sw.cv.width}px`; sw.cv.style.height = `${sw.cv.height}px`;
      const probe = document.createElement("canvas");
      probe.width = sw.cv.width; probe.height = sw.cv.height;
      const g = probe.getContext("2d")!;
      g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      g.textBaseline = "top";
      g.fillStyle = cs.color;
      const base = units[0]?.offsetParent === node ? [0, 0] : [node.offsetLeft, node.offsetTop];
      for (const u of units) g.fillText(u.textContent ?? "", u.offsetLeft - base[0]! + pad[0], u.offsetTop - base[1]! + pad[1]);
      const img = g.getImageData(0, 0, probe.width, probe.height).data, pts: number[] = [];
      const step = Math.max(2, Math.round(parseFloat(cs.fontSize) / 22));
      for (let y = 0; y < probe.height; y += step) for (let x = 0; x < probe.width; x += step) if (img[(y * probe.width + x) * 4 + 3]! > 128) pts.push(x, y);
      sw.pts = pts;
    }
    const pts = sw.pts, n = pts.length / 2, P = clamp((t - at) / 1.6);
    const ctx = sw.cv.getContext("2d")!;
    ctx.clearRect(0, 0, sw.cv.width, sw.cv.height);
    const show = P < 1;
    sw.cv.style.display = show ? "" : "none";
    if (show && t >= at) {
      ctx.fillStyle = getComputedStyle(node).color;
      const r = Math.max(1, parseFloat(getComputedStyle(node).fontSize) / 40);
      for (let i = 0; i < n; i++) {
        const d = hash(i, 31) * 0.35, q = clamp((P - d) / (1 - d) * 1.1), e = 1 - Math.pow(1 - Math.min(1, q), 3);
        const a = hash(i, 32) * Math.PI * 2, far = (0.5 + hash(i, 33)) * Math.max(W, H) * 0.6;
        const sx = pts[i * 2]! + Math.cos(a) * far, sy = pts[i * 2 + 1]! + Math.sin(a) * far * 0.6;
        ctx.globalAlpha = Math.min(1, 0.25 + q) * (1 - smoothIn(P, 0.82, 1));
        ctx.fillRect(sx + (pts[i * 2]! - sx) * e - r / 2, sy + (pts[i * 2 + 1]! - sy) * e - r / 2, r, r);
      }
      ctx.globalAlpha = 1;
    }
    const textOn = smoothIn(P, 0.78, 1);
    for (const u of units) { u.style.opacity = textOn.toFixed(3); u.style.transform = "none"; u.style.filter = "none"; }
    const want = P >= 1 ? "plain" : "split";
    if (k.showing !== want) { node.replaceChildren(...(want === "plain" ? k.plain : k.split)); k.showing = want; }
    return P;
  }
  /** Плавный вход доли `p` в промежутке [a, b]: 0 до a, 1 после b. */
  const smoothIn = (p: number, a: number, b: number): number => { const x = clamp((p - a) / (b - a)); return x * x * (3 - 2 * x); };

  /**
   * Места букв на дуге: угол поворота и подъём (в em) по смещению буквы от середины её строки.
   * Строки узнаются по верхнему краю букв; меряется раскладка без трансформаций (`offsetLeft`),
   * поэтому места одинаковы на любом кадре.
   */
  function arcPlaces(node: HTMLElement, units: HTMLElement[]): Array<[number, number]> {
    const em = parseFloat(getComputedStyle(node).fontSize) || 16;
    // `offsetLeft` буквы уже отсчитан от ближайшего размещённого предка, как и у соседних букв:
    // строка — буквы с одним верхним краем (с точностью до четверти кегля).
    const pos = units.map((u) => ({ x: u.offsetLeft + u.offsetWidth / 2, y: Math.round(u.offsetTop / (em / 4)) }));
    const lines = new Map<number, number[]>();
    pos.forEach((p) => { const l = lines.get(p.y) ?? []; l.push(p.x); lines.set(p.y, l); });
    // Радиус — ширина самой длинной строки: дуга одинаково мягкая у короткой и длинной фразы.
    const radius = Math.max(em * 6, ...[...lines.values()].map((xs) => Math.max(...xs) - Math.min(...xs)));
    // Каждая следующая строка опускается на наибольший подъём предыдущих: изогнутые края верхней
    // строки иначе ложатся на середину нижней.
    const sag = (xs: number[]): number => { const h = (Math.max(...xs) - Math.min(...xs)) / 2; return (radius - Math.sqrt(Math.max(0, radius * radius - h * h))) / em; };
    const order = [...lines.keys()].sort((a, b) => a - b), below = new Map<number, number>();
    order.reduce((acc, y) => { below.set(y, acc); return acc + sag(lines.get(y)!); }, 0);
    return pos.map((p) => {
      const xs = lines.get(p.y)!, mid = (Math.min(...xs) + Math.max(...xs)) / 2, dx = p.x - mid;
      const a = Math.asin(Math.max(-0.9, Math.min(0.9, dx / radius)));
      return [a, (radius - Math.sqrt(Math.max(0, radius * radius - dx * dx))) / em + below.get(p.y)!];
    });
  }

  // — размытие движения на слое —
  //
  // Быстрое движение смазано вдоль своей скорости, как кадр с выдержкой в половину кадра при 25
  // кадрах в секунду: сдвиг за 1/60 с до этого момента даёт скорость, половина её пути за 1/50 с —
  // сила направленного гауссова размытия SVG. У каждого элемента свой фильтр; всё — функция t.
  const SMEAR_DT = 1 / 60;
  let smearDefs: SVGSVGElement | null = null;
  const smearIds = new WeakMap<Element, string>();
  let smearCount = 0;
  /** Фильтр смаза для сдвига `dx`, `dy` (точки за SMEAR_DT) или пустая строка, если движение медленное. */
  function smearFilter(node: Element, dx: number, dy: number): string {
    const sx = Math.min(40, (Math.abs(dx) / SMEAR_DT) * (1 / 50) / 2), sy = Math.min(40, (Math.abs(dy) / SMEAR_DT) * (1 / 50) / 2);
    if (Math.max(sx, sy) <= 0.6) return "";
    if (!smearDefs) {
      smearDefs = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      smearDefs.setAttribute("width", "0"); smearDefs.setAttribute("height", "0");
      smearDefs.style.position = "absolute";
      document.documentElement.appendChild(smearDefs);
    }
    let id = smearIds.get(node);
    if (!id) {
      id = `__smear-${smearCount++}`;
      smearIds.set(node, id);
      const f = document.createElementNS("http://www.w3.org/2000/svg", "filter");
      f.id = id;
      for (const [k, v] of [["x", "-40%"], ["y", "-40%"], ["width", "180%"], ["height", "180%"]]) f.setAttribute(k!, v!);
      f.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur"));
      smearDefs.appendChild(f);
    }
    smearDefs.querySelector(`#${id} feGaussianBlur`)!.setAttribute("stdDeviation", `${sx.toFixed(2)} ${sy.toFixed(2)}`);
    return `url(#${id})`;
  }
  /** Путь единицы фразы в em у стилей с быстрым переносом — для смаза: сдвиг, а не вид. */
  const FAST_TRAVEL = ["fly", "slide", "split", "swirl", "spin"];
  function travelOf(style: string, i: number, n: number, p: number): [number, number] {
    const e = 1 - Math.pow(1 - p, 3), k = 1 - e;
    if (style === "fly") { const a = hash(i, 1) * Math.PI * 2, d = k * (3 + hash(i, 2) * 3); return [Math.cos(a) * d, Math.sin(a) * d]; }
    if (style === "slide") return [k * -1.8, 0];
    if (style === "split") return [(i < n / 2 ? -1 : 1) * k * 2.5, 0];
    if (style === "swirl") { const a = k * 4 + i * 0.6, r = k * 1.6; return [Math.cos(a) * r, Math.sin(a) * r]; }
    // Вращение: край слова в полутора em от центра проходит дугу поворота.
    return [(k * -200 * Math.PI / 180) * 1.5, 0];
  }

  // — вспомогательные чистые функции —
  const clamp = (v: number, a = 0, b = 1): number => Math.max(a, Math.min(b, v));
  const ease = (p: number): number => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
  /** доля прохождения интервала [from, to] в момент t */
  const phase = (t: number, from: number, to: number): number => (to <= from ? (t >= to ? 1 : 0) : clamp((t - from) / (to - from)));

  function mount(s: StageScene): void {
    // Новая сцена — новые шрифт, ширина и тексты субтитров: прежние мерки к ней не относятся.
    subBox = null;
    fitCache.clear();
    pageBoxCache = null;
    scene = s;
    at = timing(s);
    if (s.subScale) document.documentElement.style.setProperty("--sc-sub-scale", String(s.subScale));
    // Моменты появления элементов страницы записаны якорями, а разбирает
    // их эта библиотека: страница остаётся чистой функцией времени
    // и о тактах речи ничего не знает. Разрешаются они ОДИН РАЗ, здесь,
    // и дальше в разметке лежат обычные секунды.
    // Атрибуты страницы (`data-at`, `data-type`, `data-kinetic`) слой читает только на странице,
    // явно отданной ему меткой `data-sc-page` на корне: у чужой вёрстки те же имена значат своё
    // (у agentic-report `data-type="body"` — роль блока), и без метки слой её не трогает.
    own = document.documentElement.hasAttribute("data-sc-page");
    for (const node of own ? document.querySelectorAll<HTMLElement>("[data-at]") : []) {
      node.dataset.at = String(at(node.dataset.at, 0));
    }
    // Шрифты темы из поставляемого набора: правила @font-face с вшитыми файлами приходят со сценой.
    if (s.__fontCss) {
      const faces = document.createElement("style");
      faces.id = "__fonts";
      faces.textContent = s.__fontCss;
      document.head.appendChild(faces);
    }
    const style = document.createElement("style");
    // Тема ролика — пары «переменная — значение». Слой композиции их
    // не толкует: он только кладёт их в корень документа, а какие имена
    // осмысленны, знают его собственные правила и страница.
    const theme = Object.entries(s.theme ?? window.__scThemeDefault ?? {})
      .map(([k, v]) => `${k.startsWith("--") ? k : `--${k}`}:${v}`).join(";");
    // Тема кладётся и в корень (её читает страница слайда), и на сам слой: токены формы слоя
    // заданы в единицах кадра (var(--u)), а --u живёт на слое. Переменная со ссылкой на другую
    // разрешается там, где объявлена, и в корне, где --u нет, токен формы был бы пуст.
    // Тень пятна объявлена и на самом пятне: тогда её рамка и затемнение разрешаются там, где
    // фокус сцены переопределяет цвет рамки и силу затемнения (ring, dim), а не в корне.
    const spotShadow = (s.theme ?? window.__scThemeDefault ?? {})["--sc-spot-shadow"];
    style.textContent = (theme ? `:root{${theme}}\n#__st{${theme}}\n` : "")
      + (spotShadow ? `#__spot{--sc-spot-shadow:${spotShadow}}\n` : "") + CSS;
    document.head.appendChild(style);
    // На слайдах эмодзи из текста страницы тоже рисуются картинками набора.
    // Чужие страницы (снимки приложений) не трогаются: их вёрстка — предмет съёмки.
    if (s.emoji && document.body?.hasAttribute("data-slidecast-elements")) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
      for (const node of nodes) {
        const text = node.textContent ?? "";
        // Набираемые элементы разбиваются на графемы сами и эмодзи ставят там же.
        if (node.parentElement?.closest("[data-type]")) continue;
        if (!graphemes(text).some((g) => s.emoji![g])) continue;
        const frag = document.createDocumentFragment();
        for (const g of graphemes(text)) {
          const picture = emojiImage(g);
          frag.appendChild(picture ?? document.createTextNode(g));
        }
        node.replaceWith(frag);
      }
    }

    pageKinetic = own ? [...document.querySelectorAll<HTMLElement>("[data-kinetic]")].filter((n) => n.dataset.kinetic) : [];
    for (const node of pageKinetic) kineticMount(node, node.dataset.kinetic!);

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
    // Тело НЕ выносится на композитор. Вынесенный слой Chromium растрирует
    // один раз в масштабе 1 и при наезде растягивает готовый растр: кадр
    // мылится, а изредка композитор решает перерастрировать слой в новом
    // масштабе, и тот же кадр выходит другим — замер: два из двадцати
    // одинаковых рендеров отличались от остальных. Невынесенное тело
    // рисуется сразу в итоговом масштабе: вдвое резче по лапласиану, и все
    // двенадцать повторов совпали побайтно.
    zoom.style.willChange = "auto";
    zoom.style.backfaceVisibility = "visible";
    // Трансформация делает тело отсчётом для абсолютных потомков вместо кадра. У страницы, где всё
    // содержимое вынесено из потока (`position:absolute; inset:0`), тело нулевой высоты, и такое
    // содержимое схлопывалось — кадр выходил пустым. Тело чужой страницы тянется хотя бы на кадр за
    // вычетом полей. Слайды инструмента свёрстаны под слой и меряют высоту тела, вписывая себя в
    // кадр; их тело не трогается.
    if (!zoom.hasAttribute("data-slidecast-elements")) {
      const bs = getComputedStyle(zoom);
      const px = (...k: string[]): number => k.reduce((a, n) => a + (parseFloat(bs.getPropertyValue(n)) || 0), 0);
      const edge = px("margin-top", "margin-bottom") + (bs.boxSizing === "border-box" ? 0 : px("padding-top", "padding-bottom", "border-top-width", "border-bottom-width"));
      zoom.style.minHeight = `calc(100vh - ${edge}px)`;
    }
    // Камера считает увеличение от угла кадра, а `transform-origin` отсчитывается от угла тела. Тело
    // стоит не в углу, когда у него поля или когда поле первого потомка схлопнулось сквозь него
    // (`margin-top` у заголовка): наезд уезжал мимо цели на поле × (увеличение − 1), и рамка
    // подсветки вставала не на предмет. Начало увеличения ставится в угол кадра.
    const b0 = zoom.getBoundingClientRect();
    zoom.style.transformOrigin = `${(-b0.left).toFixed(2)}px ${(-b0.top).toFixed(2)}px`;

    const layer = document.createElement("div");
    layer.id = "__st";
    layer.innerHTML = `<div id="__veil"></div><div id="__spot"></div><div id="__cap"><span id="__captext"></span>
      <div id="__capbar"></div></div><div id="__torch"></div><div id="__cards"></div><div id="__rip"></div>${CURSOR}<div id="__fade"></div>`;
    // Накладка живёт ВНЕ увеличиваемого узла: `position: fixed` внутри
    // трансформированного предка отсчитывается от него, а не от кадра,
    // и подсветка с затемнением поехали бы вместе со страницей.
    document.documentElement.appendChild(layer);
    // Единица кадра нужна уже здесь: высота карточек меряется при монтировании.
    const lz0 = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    layer.style.setProperty("--u", `${(innerWidth / lz0 / 100).toFixed(3)}px`);
    applySafe(layer, s, lz0);

    const pick = (sel: string): HTMLElement => layer.querySelector(sel) as HTMLElement;
    el = {
      zoom, layer, spot: pick("#__spot"), cap: pick("#__cap"),
      capText: pick("#__captext"), capBar: pick("#__capbar"),
      cur: pick("#__cur"), rip: pick("#__rip"), fade: pick("#__fade"), cards: pick("#__cards"), veil: pick("#__veil"),
      torch: pick("#__torch"),
    };
    for (const card of s.overlay?.cards ?? []) {
      const node = document.createElement("div");
      node.className = "__card";
      node.dataset.pos = card.position ?? "bottom-left";
      const title = document.createElement("div");
      title.className = "__card-title";
      setRichText(title, card.title);
      node.appendChild(title);
      if (card.body) {
        const body = document.createElement("div");
        body.className = "__card-body";
        setRichText(body, card.body);
        node.appendChild(body);
      }
      el.cards.appendChild(node);
      node.style.minHeight = `${Math.ceil(node.getBoundingClientRect().height)}px`;
    }
    // Рамка устройства вокруг клипа: клип сборка уже поставила в экран рамки, а корпус,
    // строку адреса и фон вокруг рисует этот слой. Рамка — часть картинки, а не показа:
    // она лежит под подсветкой и едет вместе с кадром при наезде.
    if (s.__device && (s.__layerPart ?? "both") !== "screen") {
      const css = document.createElement("style");
      css.textContent = s.__device.css;
      document.head.appendChild(css);
      const dev = document.createElement("div");
      dev.id = "__dev";
      dev.style.cssText = "position:fixed;inset:0";
      dev.innerHTML = s.__device.html;
      layer.insertBefore(dev, layer.firstChild);
    }
    // Предметная половина слоя на странице (кадрирование в другой формат): карточки,
    // подпись и затемнение перехода рисует экранная половина и сборка поверх окна.
    // Без слоя: проверка сравнивает сам материал в окне, без подсветки и курсора.
    if (s.__bareLayer) for (const n of [el.spot, el.veil, el.cur, el.rip, el.torch]) n.style.visibility = "hidden";
    if (!s.__overlayOnly && s.__layerPart === "scene") {
      el.cards.style.display = "none";
      el.cap.style.display = "none";
      el.fade.style.display = "none";
    }
    if (s.__overlayOnly) {
      // Слой поверх готового клипа рисует всё, что относится к ПОКАЗУ, а не к странице:
      // подсказку, карточки, курсор — и ПОДСВЕТКУ С ЗАТЕНЕНИЕМ, когда сцена просит камеру.
      // Затенение здесь и есть главное: оно гасит остальной кадр и заставляет смотреть туда,
      // куда показывает карточка. Без него рамка висит поверх клипа и ничего не говорит.
      //
      // Слой при этом делится НАДВОЕ. Кадровая часть (подсветка с затенением) ложится под
      // наезд и едет вместе с картинкой; экранная (карточка, подсказка, курсор) рисуется
      // поверх наезда и остаётся того же размера — иначе текст карточки увеличивался бы
      // вместе с кадром и переставал помещаться. Какую часть рисовать, говорит сборка.
      const part = s.__layerPart ?? "both";
      if (part === "screen" || !s.overlay?.camera?.length) el.spot.style.display = "none";
      if (part === "scene") {
        el.cards.style.display = "none";
        el.cap.style.display = "none";
        el.cur.style.display = "none";
        el.rip.style.display = "none";
        el.torch.style.display = "none";
      }
      el.fade.style.display = "none";
      if (!s.caption) el.cap.style.display = "none";
    }
    el.capText.textContent = s.caption ?? "";
    mountPrimitives(s);
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

  // — примитивы: титры, нижние титры, выноски, стикеры, субтитры —
  interface Prims {
    root: HTMLElement; arrows: SVGSVGElement; sub: HTMLElement;
    /** субтитры рисует другая половина слоя: здесь их нет вовсе */
    subOff: boolean;
    titles: HTMLElement[]; lower: HTMLElement[];
    callouts: Array<{ box: HTMLElement; path: SVGPathElement; head: SVGPathElement }>;
    stickers: Array<{ box: HTMLElement; img: HTMLImageElement | null }>;
    marks: Array<{ segs: SVGPathElement[]; head: SVGPathElement[] }>;
    glints: HTMLElement[];
    bursts: HTMLCanvasElement | null;
    pings: HTMLElement[];
    toasts: HTMLElement[];
    thinking: HTMLElement[];
    /** предметы скелетонов и их видимость до монтирования: под скелетоном ответ скрыт */
    covered: Array<{ node: HTMLElement; visibility: string } | null>;
  }
  let prims: Prims | null = null;
  /** есть ли у сцены субтитры или плашка подписи: под них отведена полоса внизу кадра */
  let banded = false;
  const SVGNS = "http://www.w3.org/2000/svg";
  /** отрезков в штрихе пометки и в каждом крыле наконечника стрелки */
  const MARK_SEGS = 64, HEAD_SEGS = 8;

  function mountPrimitives(s: StageScene): void {
    const o = s.overlay ?? {};
    const root = document.createElement("div");
    root.id = "__prims";
    const scrim = document.createElement("div");
    scrim.id = "__scrim";
    root.appendChild(scrim);
    // Низ кадра делят нижний титр, титр снизу и субтитры (или плашка подписи). Привязанное к
    // низу стоит на шаг выше края зоны; при субтитрах — ещё и над полосой, отведённой под две их
    // строки, с тем же шагом: та же мера, что у карточки, считается от той же зоны.
    const subs = (s.captionStyle ?? "bar") !== "bar" && (s.beatTexts ?? []).length > 0, bar = (s.captionStyle ?? "bar") === "bar" && Boolean(s.caption);
    const band = subs ? "calc(var(--sub-size) * 2.6 + var(--sc-edge))"
      : bar ? "calc(var(--cap-size) * 2.84 + var(--sc-pad-y) * 2 + var(--sc-cap-bar-size) + var(--sc-edge))" : "0px";
    // Линия ставится на корень слоя: по ней стоят и титры с нижним титром (примитивы), и
    // карточки снизу (свой контейнер) — никто из них не ложится на строку речи.
    // Субтитры сверху занимают верх зоны: полосу оставляют им привязанные к верху карточки и
    // титры, а низ свободен. Посередине они стоят над содержимым и не оттесняют никого.
    const pos = s.captionPos ?? "bottom";
    el.layer.dataset.cappos = pos;
    el.layer.style.setProperty("--lower-bottom", `calc(var(--sb) + var(--sc-edge) + ${pos === "bottom" ? band : "0px"})`);
    el.layer.style.setProperty("--upper-top", `calc(var(--st) + var(--sc-edge) + ${pos === "top" ? band : "0px"})`);
    banded = (subs || bar) && pos === "bottom";
    const arrows = document.createElementNS(SVGNS, "svg") as SVGSVGElement;
    arrows.id = "__arrows";
    root.appendChild(arrows);
    const sub = document.createElement("div");
    sub.id = "__sub";
    sub.dataset.style = s.captionStyle ?? "bar";
    sub.dataset.look = s.captionLook ?? "outline";
    // Слой примитивов идёт ПОД затемнением перехода, но над карточками.
    el.layer.insertBefore(root, el.fade);
    el.layer.insertBefore(sub, el.fade);
    const titles = (o.titles ?? []).map((item) => {
      const node = document.createElement("div");
      node.className = "__title";
      node.dataset.pos = item.position ?? "center";
      if (item.style && !["rise", "slam", "type", "split"].includes(item.style)) {
        setRichText(node, item.text);
        kineticMount(node, item.style);
      } else if (item.style === "split") {
        for (const [i, word] of item.text.split(/(\s+)/).entries()) {
          const w = document.createElement("span");
          w.className = "__w";
          w.dataset.i = String(i);
          setRichText(w, word);
          node.appendChild(w);
        }
      } else setRichText(node, item.text);
      root.appendChild(node);
      return node;
    });
    const lower = (o.lower ?? []).map((item) => {
      const node = document.createElement("div");
      node.className = "__lower";
      node.dataset.side = item.side ?? "left";
      const title = document.createElement("div");
      title.className = "__lower-title";
      setRichText(title, item.title);
      if (item.reveal) kineticMount(title, item.reveal);
      node.appendChild(title);
      if (item.subtitle) {
        const subtitle = document.createElement("div");
        subtitle.className = "__lower-sub";
        setRichText(subtitle, item.subtitle);
        node.appendChild(subtitle);
      }
      root.appendChild(node);
      return node;
    });
    const callouts = (o.callouts ?? []).map((item) => {
      const box = document.createElement("div");
      box.className = "__callout";
      setRichText(box, item.text);
      root.appendChild(box);
      const path = document.createElementNS(SVGNS, "path") as SVGPathElement;
      path.setAttribute("class", "__arrow");
      const head = document.createElementNS(SVGNS, "path") as SVGPathElement;
      head.setAttribute("class", "__arrowhead");
      arrows.appendChild(path);
      arrows.appendChild(head);
      return { box, path, head };
    });
    const stickers = (o.stickers ?? []).map((item, index) => {
      const media = s.__stickers?.[index] ?? {};
      const box = document.createElement("div");
      box.className = "__sticker";
      let img: HTMLImageElement | null = null;
      if (item.text) {
        const badge = document.createElement("div");
        badge.className = "__badge";
        setRichText(badge, item.text);
        box.appendChild(badge);
      } else {
        img = document.createElement("img");
        const src = item.emoji ? scene?.emoji?.[item.emoji] : media.src ?? media.frames?.[0];
        if (!src) throw new Error(`sc-stage:stickerImage:${item.emoji ?? item.image ?? "?"}`);
        img.src = src;
        if (item.emoji) img.setAttribute("data-emoji-set", "noto");
        box.appendChild(img);
      }
      root.appendChild(box);
      return { box, img };
    });
    // Штрих от руки — цепочка коротких отрезков своей толщины: одна линия SVG толщину вдоль пути
    // не меняет, а у пера она растёт к середине и сходит на нет к концам.
    // Отрезки штриха собраны в группу: снаружи пометка — одна вещь со своим прямоугольником.
    const strokes = (n: number, part: string, color?: string): SVGPathElement[] => {
      const g = document.createElementNS(SVGNS, "g");
      g.setAttribute("class", part);
      arrows.appendChild(g);
      return Array.from({ length: n }, () => {
        const seg = document.createElementNS(SVGNS, "path") as SVGPathElement;
        seg.setAttribute("class", "__mark");
        if (color) seg.style.stroke = color;
        g.appendChild(seg);
        return seg;
      });
    };
    const marks = (o.marks ?? []).map((item) => ({ segs: strokes(MARK_SEGS, "__mark-body", item.color),
      head: item.kind === "arrow" ? strokes(HEAD_SEGS * 2, "__mark-head", item.color) : [] }));
    const glints = (o.glints ?? []).map(() => {
      const box = document.createElement("div");
      box.className = "__glint";
      box.appendChild(document.createElement("i"));
      root.appendChild(box);
      return box;
    });
    let bursts: HTMLCanvasElement | null = null;
    if (o.bursts?.length) {
      bursts = document.createElement("canvas");
      bursts.id = "__bursts";
      root.appendChild(bursts);
    }
    const pings = (o.pings ?? []).map(() => {
      const box = document.createElement("div");
      box.className = "__ping";
      box.innerHTML = "<i></i><i></i><b></b>";
      root.appendChild(box);
      return box;
    });
    let toasts: HTMLElement[] = [];
    if (o.toasts?.length) {
      const holder = document.createElement("div");
      holder.id = "__toasts";
      root.appendChild(holder);
      toasts = o.toasts.map((item) => {
        const box = document.createElement("div");
        box.className = "__toast";
        if (item.icon) { const ic = document.createElement("span"); ic.className = "__ti"; ic.textContent = item.icon; box.appendChild(ic); }
        const text = document.createElement("div");
        const b = document.createElement("b"); b.textContent = item.title; text.appendChild(b);
        if (item.body) text.appendChild(document.createTextNode(item.body));
        box.appendChild(text);
        holder.appendChild(box);
        return box;
      });
    }
    const thinking = (o.thinking ?? []).map((item) => {
      const box = document.createElement("div");
      box.className = "__think";
      if (!item.target && !item.area) box.dataset.free = "";
      const line = document.createElement("em");
      setRichText(line, item.text ?? "Thinking…");
      box.appendChild(line);
      for (let k = 0; k < (item.lines ?? 3); k++) box.appendChild(document.createElement("i"));
      root.appendChild(box);
      return box;
    });
    const covered = (o.thinking ?? []).map((item) => {
      const node = item.target ? document.querySelector<HTMLElement>(item.target) : null;
      return node ? { node, visibility: node.style.visibility } : null;
    });
    prims = { root, arrows, sub, titles, lower, callouts, stickers, marks, glints, bursts, pings, toasts, thinking, covered,
      subOff: (s.__layerPart ?? "both") === "scene" };
    // Какая половина слоя рисуется поверх видео: предметные примитивы (выноски,
    // стикеры) едут вместе с картинкой под наездом, экранные — поверх него.
    const part = s.__layerPart ?? "both";
    // Скелетон без предмета стоит посередине экрана, как карточка; с предметом — едет вместе с ним.
    const free = thinking.filter((b) => b.dataset.free !== undefined), held = thinking.filter((b) => b.dataset.free === undefined);
    // Чужая половина помечается, а не прячется стилем: кадр каждый раз заново показывает примитив по
    // его времени, и спрятанное стилем вернулось бы в оба слоя — под наездом вышло бы два титра.
    const off = (n: Element): void => { (n as HTMLElement).dataset.offLayer = ""; };
    if (part === "scene") { for (const n of [...titles, ...lower, sub]) off(n); }
    if (part === "scene") for (const n of free) n.style.visibility = "hidden";
    if (part === "screen" && s.__videoCamera) {
      off(arrows);
      for (const c of callouts) off(c.box);
      for (const st of stickers) off(st.box);
      for (const g of glints) off(g);
      if (bursts) off(bursts);
      for (const g of pings) off(g);
      for (const g of held) g.style.visibility = "hidden";
    }
    // Уведомления — экранный слой: на видео с наездом они стоят поверх, постоянного размера.
    if (part === "scene" && s.__videoCamera) for (const g of toasts) off(g);
  }

  /** Прямоугольник предмета примитива на экране слоя в момент кадра. */
  function anchorRect(a: StageAnchor, lz: number): Rect {
    if (a.target) {
      const node = document.querySelector(a.target);
      if (!node) throw new Error(`sc-stage:primitiveTarget:${a.target}`);
      const r = node.getBoundingClientRect();
      return { left: r.left / lz, top: r.top / lz, width: r.width / lz, height: r.height / lz };
    }
    const box = a.area ?? [a.point![0], a.point![1], 0, 0];
    const raw = { left: box[0] * innerWidth, top: box[1] * innerHeight,
      width: box[2] * innerWidth, height: box[3] * innerHeight };
    // Над видео наезд делает сборка, и предметная половина слоя увеличивается
    // вместе с картинкой; на странице наезд уже в трансформации тела.
    const k = scene?.__videoCamera ? 1 : zoomState.k;
    const tx = scene?.__videoCamera ? 0 : zoomState.tx;
    const ty = scene?.__videoCamera ? 0 : zoomState.ty;
    return { left: (raw.left * k + tx) / lz, top: (raw.top * k + ty) / lz,
      width: (raw.width * k) / lz, height: (raw.height * k) / lz };
  }

  /** Вход, удержание, выход: доля появления и доля ухода примитива. */
  function life(t: number, at: number, hold: number, enter = 0.5, exit = 0.4): { on: boolean; enter: number; leave: number } {
    const end = at + hold;
    // Вход тормозит (сильный ease-out: быстро пришёл — долго сел), уход разгоняется (ease-in):
    // одна симметричная кривая на то и другое делала накладку ватной (docs/motion-design.md).
    // Кривую входа сцена может назвать (`overlay.ease`): те же кривые, что у входов слайда.
    const named = scene?.overlay?.ease ? OVERLAY_EASE[scene.overlay.ease] : undefined;
    return { on: t >= at && t < end, enter: (named ?? outQuart)(phase(t, at, at + enter)), leave: inCubic(phase(t, end - exit, end)) };
  }
  const bezier = (x1: number, y1: number, x2: number, y2: number) => (p: number): number => {
    let u = p;
    for (let k = 0; k < 8; k++) {
      const x = 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u * u * x2 + u ** 3 - p;
      const dx = 3 * (1 - u) ** 2 * x1 + 6 * (1 - u) * u * (x2 - x1) + 3 * u * u * (1 - x2);
      if (Math.abs(dx) < 1e-6) break;
      u = Math.min(1, Math.max(0, u - x / dx));
    }
    return 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u * u * y2 + u ** 3;
  };
  const OVERLAY_EASE: Record<string, (p: number) => number> = {
    standard: bezier(0.2, 0, 0, 1), emphasized: bezier(0.05, 0.7, 0.1, 1), expressive: bezier(0.16, 1, 0.3, 1),
    spring: (p) => (p >= 1 ? 1 : 1 - Math.exp(-6 * p) * Math.cos(10 * p)),
    bouncy: (p) => (p >= 1 ? 1 : 1 - Math.exp(-4.5 * p) * Math.cos(14 * p)),
  };
  const outQuart = (p: number): number => 1 - Math.pow(1 - p, 4);
  const inCubic = (p: number): number => p * p * p;
  /** Пружина: быстрое движение с одним перелётом, чистая функция доли. */
  const spring = (p: number): number => (p >= 1 ? 1 : 1 - Math.exp(-6 * p) * Math.cos(9 * p));

  function renderPrimitives(t: number, lz: number): void {
    if (!prims || !scene) return;
    const o = scene.overlay ?? {};
    const frameW = innerWidth / lz, frameH = innerHeight / lz;
    el.layer.style.setProperty("--u", `${(frameW / 100).toFixed(3)}px`);
    applySafe(el.layer, scene, lz);
    const zoneBox = safeRect(lz);
    let scrim = 0;
    (o.titles ?? []).forEach((item, i) => {
      const node = prims!.titles[i]!;
      const l = life(t, item.at, item.hold ?? 3, item.style === "slam" ? 0.35 : 0.6, 0.45);
      node.style.display = l.on ? "" : "none";
      if (!l.on) return;
      const out = 1 - l.leave;
      // Титр в центре — заявление, и кадр под ним гаснет целиком; титр сверху
      // или снизу — подпись к кадру, и кадр под ним лишь приглушается.
      const depth = (item.position ?? "center") === "center" ? 1 : 0.45;
      scrim = Math.max(scrim, ease(phase(t, item.at, item.at + 0.35)) * out * depth);
      // Титр в центре стоит серединой; сверху и снизу — краем, отстоящим от зоны на шаг.
      const base = (item.position ?? "center") === "center" ? "translate(-50%,-50%)" : "translate(-50%,0)";
      if (item.style === "slam") {
        const k = 1 + (1 - spring(phase(t, item.at, item.at + 0.7))) * 0.9;
        node.style.opacity = String(Math.min(l.enter * 3, 1) * out);
        node.style.transform = `${base} scale(${(k - l.leave * 0.06).toFixed(4)})`;
        node.style.letterSpacing = `${(-0.035 + (1 - l.enter) * 0.12).toFixed(4)}em`;
      } else if (item.style === "type") {
        node.style.opacity = String(out);
        node.style.transform = `${base} translateY(${(-l.leave * 18).toFixed(2)}px)`;
        typeTo(node, (t - item.at) * 22);
      } else if (item.style === "split") {
        node.style.opacity = String(out);
        node.style.transform = `${base} translateY(${(-l.leave * 18).toFixed(2)}px)`;
        node.querySelectorAll<HTMLElement>(".__w").forEach((w) => {
          const p = ease(phase(t, item.at + Number(w.dataset.i) * 0.06, item.at + Number(w.dataset.i) * 0.06 + 0.45));
          w.style.opacity = String(p);
          w.style.transform = `translateY(${((1 - p) * 0.6).toFixed(3)}em)`;
          w.style.filter = `blur(${((1 - p) * 6).toFixed(2)}px)`;
        });
      } else if (item.style && item.style !== "rise") {
        // Фраза собирается своим способом; титр целиком только уходит.
        node.style.opacity = String(out);
        node.style.transform = `${base} translateY(${(-l.leave * 18).toFixed(2)}px)`;
        kineticAt(node, t, item.at);
      } else {
        node.style.opacity = String(l.enter * out);
        node.style.transform = `${base} translateY(${((1 - l.enter) * 40 - l.leave * 18).toFixed(2)}px)`;
        node.style.filter = `blur(${((1 - l.enter) * 8).toFixed(2)}px)`;
      }
    });
    const scrimNode = prims.root.querySelector<HTMLElement>("#__scrim");
    if (scrimNode) {
      scrimNode.style.opacity = scrim.toFixed(3);
      // Размытие под титром: интерфейс уходит в фон, но остаётся узнаваемым.
      // Над готовым видео слой прозрачен, и размывать ему нечего — там работает
      // только затемнение.
      scrimNode.style.backdropFilter = scrim > 0 ? `blur(${(scrim * frameW * token("--sc-scrim-blur")).toFixed(2)}px)` : "";
    }
    (o.lower ?? []).forEach((item, i) => {
      const node = prims!.lower[i]!;
      const l = life(t, item.at, item.hold ?? 4, 0.7, 0.45);
      node.style.display = l.on ? "" : "none";
      if (!l.on) return;
      const dir = item.side === "right" ? 1 : -1;
      node.style.opacity = String(Math.min(1, l.enter * 1.6) * (1 - l.leave));
      const shift = (q: typeof l): number => dir * (1 - q.enter) * 60 + dir * q.leave * 30;
      node.style.transform = `translateX(${shift(l).toFixed(2)}px)`;
      node.style.filter = smearFilter(node, shift(l) - shift(life(t - SMEAR_DT, item.at, item.hold ?? 4, 0.7, 0.45)), 0) || "none";
      node.style.setProperty("--bar", ease(phase(t, item.at, item.at + 0.45)).toFixed(3));
      const subtitle = node.querySelector<HTMLElement>(".__lower-sub");
      if (subtitle) subtitle.style.opacity = String(ease(phase(t, item.at + 0.3, item.at + 0.8)));
      if (item.reveal) kineticAt(node.querySelector<HTMLElement>(".__lower-title")!, t, item.at + 0.15);
    });
    (o.callouts ?? []).forEach((item, i) => {
      const { box, path, head } = prims!.callouts[i]!;
      const l = life(t, item.at, item.hold ?? 3, 0.5, 0.4);
      const visible = l.on ? "" : "none";
      box.style.display = visible;
      path.style.display = visible;
      head.style.display = visible;
      if (!l.on) return;
      const r = anchorRect(item, lz);
      const w = box.offsetWidth, h = box.offsetHeight;
      const gap = frameW * 0.035;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let side = item.side ?? "auto";
      if (side === "auto") {
        const room = { right: frameW - (r.left + r.width), left: r.left, bottom: frameH - (r.top + r.height), top: r.top };
        side = (Object.entries(room).sort((a, b) => b[1] - a[1])[0]![0]) as typeof side;
      }
      let left = side === "right" ? r.left + r.width + gap : side === "left" ? r.left - gap - w : cx - w / 2;
      let top = side === "bottom" ? r.top + r.height + gap : side === "top" ? r.top - gap - h : cy - h / 2;
      left = Math.max(zoneBox.l, Math.min(zoneBox.r - w, left));
      top = Math.max(zoneBox.t, Math.min(zoneBox.b - h, top));
      box.style.left = `${left.toFixed(1)}px`;
      box.style.top = `${top.toFixed(1)}px`;
      box.style.opacity = String(l.enter * (1 - l.leave));
      box.style.transform = `translateY(${((1 - l.enter) * 12).toFixed(2)}px)`;
      // Надпись выноски набирается, пока рисуется стрелка, — на своих местах.
      typeTo(box, (t - item.at - 0.15) * 40);
      // Начало стрелки — край надписи, обращённый к предмету; конец — точка
      // ВНУТРИ предмета, у ближайшего к надписи края: стрелка указывает на
      // предмет, а не в его окрестность.
      const sx = side === "right" ? left : side === "left" ? left + w : left + w / 2;
      const sy = side === "bottom" ? top : side === "top" ? top + h : top + h / 2;
      const inset = (size: number): number => Math.min(size / 2, frameW * 0.008);
      const ex = Math.max(r.left + inset(r.width), Math.min(r.left + r.width - inset(r.width), sx));
      const ey = Math.max(r.top + inset(r.height), Math.min(r.top + r.height - inset(r.height), sy));
      const bend = side === "left" || side === "right" ? [ (sx + ex) / 2, sy ] : [ sx, (sy + ey) / 2 ];
      path.setAttribute("d", `M${sx.toFixed(1)},${sy.toFixed(1)} Q${bend[0]!.toFixed(1)},${bend[1]!.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`);
      path.setAttribute("stroke-width", (frameW * token("--sc-arrow-width")).toFixed(2));
      path.dataset.end = `${(ex * lz).toFixed(1)},${(ey * lz).toFixed(1)}`;
      const length = Math.hypot(ex - sx, ey - sy) * 1.2 + 1;
      const drawn = ease(phase(t, item.at + 0.15, item.at + 0.65));
      path.style.strokeDasharray = `${length.toFixed(1)}`;
      path.style.strokeDashoffset = `${((1 - drawn) * length).toFixed(1)}`;
      path.style.opacity = String(1 - l.leave);
      const ang = Math.atan2(ey - bend[1]!, ex - bend[0]!);
      const hs = frameW * token("--sc-arrow-head");
      const p1 = [ex - hs * Math.cos(ang - 0.45), ey - hs * Math.sin(ang - 0.45)];
      const p2 = [ex - hs * Math.cos(ang + 0.45), ey - hs * Math.sin(ang + 0.45)];
      head.setAttribute("d", `M${ex.toFixed(1)},${ey.toFixed(1)} L${p1[0]!.toFixed(1)},${p1[1]!.toFixed(1)} L${p2[0]!.toFixed(1)},${p2[1]!.toFixed(1)} Z`);
      head.style.opacity = String(drawn >= 0.98 ? 1 - l.leave : 0);
    });
    (o.stickers ?? []).forEach((item, i) => {
      const { box, img } = prims!.stickers[i]!;
      const l = life(t, item.at, item.hold ?? 2.5, 0.55, 0.35);
      box.style.display = l.on ? "" : "none";
      if (!l.on) return;
      const r = anchorRect(item, lz);
      const size = (item.size ?? 96) * (frameW / 1920);
      if (!item.text) { box.style.width = `${size.toFixed(1)}px`; box.style.height = `${size.toFixed(1)}px`; }
      // Стикер садится на правый верхний угол предмета, у точки — на неё саму.
      const x = item.point ? r.left : r.left + r.width - size * 0.3;
      const y = item.point ? r.top : r.top - size * 0.35;
      // Стикер у края предмета не выходит за безопасную зону: под кнопками
      // площадки его не увидят.
      const bw = item.text ? box.offsetWidth : size, bh = item.text ? box.offsetHeight : size;
      const sx = Math.max(zoneBox.l, Math.min(zoneBox.r - bw, x - bw / 2));
      const sy = Math.max(zoneBox.t, Math.min(zoneBox.b - bh, y - bh / 2));
      box.style.left = `${sx.toFixed(1)}px`;
      box.style.top = `${sy.toFixed(1)}px`;
      const since = t - item.at;
      const pop = item.motion === "float" ? l.enter : spring(phase(t, item.at, item.at + 0.8));
      const bob = item.motion === "float" ? Math.sin(since * 2.2) * size * 0.06 : Math.sin(since * 1.6) * size * 0.02;
      const wobble = item.motion === "spin" ? Math.sin(since * 3.1) * 9 : 0;
      box.style.opacity = String(Math.min(1, l.enter * 2) * (1 - l.leave));
      box.style.transform = `translateY(${bob.toFixed(2)}px) rotate(${((item.rotate ?? 0) + wobble).toFixed(2)}deg) scale(${(pop * (1 - l.leave * 0.4)).toFixed(4)})`;
      // Анимированная картинка идёт по времени сцены: кадр выбирается по t, а не
      // по таймеру браузера, поэтому кадр ролика воспроизводим с любого места.
      const media = scene!.__stickers?.[i];
      if (img && media?.frames && media.frames.length > 1) {
        const n = Math.floor(since * (media.fps ?? 12)) % media.frames.length;
        const src = media.frames[Math.max(0, n)]!;
        if (img.getAttribute("src") !== src) img.src = src;
      }
    });
    renderMarks(t, lz, frameW, frameH);
    renderGlints(t, lz);
    renderBursts(t, lz, frameW, frameH);
    renderPings(t, lz);
    renderToasts(t);
    renderThinking(t, lz);
    renderBoops(t);
    renderSubtitles(t);
  }

  /** Детерминированный шум −1…1 по двум числам: зерно пометки. */
  const wobble = (a: number, b: number): number => {
    const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return (v - Math.floor(v)) * 2 - 1;
  };
  /**
   * Плавное отклонение руки вдоль штриха, −1…1: сумма трёх медленных волн с фазами от зерна
   * пометки. Шум в каждой точке отдельно давал ломаную «пилу»; волна даёт живую, но гладкую линию.
   */
  const drift = (seed: number, u: number): number =>
    (Math.sin(2 * Math.PI * (u * 1.3 + wobble(seed, 1))) * 0.55 + Math.sin(2 * Math.PI * (u * 2.7 + wobble(seed, 2))) * 0.3
      + Math.sin(2 * Math.PI * (u * 4.1 + wobble(seed, 3))) * 0.15);
  /** Толщина пера в доле базовой: тонко на входе и выходе, полнее к середине. */
  const pressure = (seed: number, u: number): number =>
    (0.38 + 0.62 * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u))), 0.55)) * (1 + 0.08 * drift(seed + 5, u));

  /**
   * Нарисовать штрих отрезками: точки пути, доля прорисовки `p` и толщина по месту. Видимы
   * отрезки до `p`, последний — частью: штрих растёт от начала к концу, как у руки.
   */
  function drawStroke(segs: SVGPathElement[], pts: Array<[number, number]>, p: number, width: number, seed: number, opacity: number): void {
    const n = segs.length;
    segs.forEach((seg, k) => {
      const u0 = k / n, u1 = (k + 1) / n;
      if (p <= u0) { seg.style.display = "none"; return; }
      const f = Math.min(1, (p - u0) / (u1 - u0));
      const at = (u: number): [number, number] => {
        const x = u * (pts.length - 1), a = Math.floor(x), b = Math.min(pts.length - 1, a + 1), w = x - a;
        return [pts[a]![0] + (pts[b]![0] - pts[a]![0]) * w, pts[a]![1] + (pts[b]![1] - pts[a]![1]) * w];
      };
      const [ax, ay] = at(u0), [bx, by] = at(u0 + (u1 - u0) * f);
      seg.style.display = "";
      seg.setAttribute("d", `M${ax.toFixed(2)},${ay.toFixed(2)} L${bx.toFixed(2)},${by.toFixed(2)}`);
      seg.setAttribute("stroke-width", (width * pressure(seed, (u0 + u1) / 2)).toFixed(2));
      seg.style.opacity = String(opacity);
    });
  }

  /**
   * Пометки от руки: круг, стрелка, подчёркивание. Путь — гладкая кривая по прямоугольнику
   * предмета на этом кадре, с медленным отклонением руки и нажимом пера, который меняется вдоль
   * штриха. Круг — чуть больше оборота по раскрывающейся спирали: конец проходит снаружи начала,
   * а не замыкается на него. Всё — функция номера пометки и времени сцены: одинаково в любом прогоне.
   */
  function renderMarks(t: number, lz: number, frameW: number, frameH: number): void {
    (scene!.overlay?.marks ?? []).forEach((item, i) => {
      const { segs, head } = prims!.marks[i]!;
      const l = life(t, item.at, item.hold ?? 2.5, 0.05, 0.4);
      if (!l.on) { for (const seg of [...segs, ...head]) seg.style.display = "none"; return; }
      const r = anchorRect(item, lz);
      const draw = item.draw ?? 0.8;
      const pad = frameW * 0.012;
      const jit = frameW * token("--sc-mark-wobble");
      const seed = i * 7 + 3;
      const pts: Array<[number, number]> = [];
      const N = 96;
      if (item.kind === "circle") {
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const rx = r.width / 2 + pad * 1.4, ry = r.height / 2 + pad * 1.4;
        const start = -2.25 + 0.2 * wobble(seed, 4), sweep = Math.PI * 2 * (1.08 + 0.03 * wobble(seed, 5));
        const tilt = 0.05 * wobble(seed, 6);
        for (let k = 0; k <= N; k++) {
          const u = k / N, a = start + sweep * u;
          // Спираль раскрывается к концу: второй проход идёт снаружи первого, круг не замыкается.
          const grow = 1 + 0.07 * u + 0.022 * drift(seed, u);
          const ex = Math.cos(a) * rx * grow, ey = Math.sin(a) * ry * grow;
          pts.push([cx + ex * Math.cos(tilt) - ey * Math.sin(tilt), cy + ex * Math.sin(tilt) + ey * Math.cos(tilt)]);
        }
      } else if (item.kind === "underline") {
        // Лёгкая дуга: чуть провисает к середине и поднимается к концу, как у быстрой руки.
        const y = r.top + r.height + pad * 0.7;
        const x0 = r.left - pad * 0.5, x1 = r.left + r.width + pad * 0.7;
        const sag = Math.min(r.width * 0.035, pad * 1.2), rise = pad * 0.6 * (0.6 + 0.4 * wobble(seed, 7));
        for (let k = 0; k <= N; k++) {
          const u = k / N;
          pts.push([x0 + (x1 - x0) * u, y + Math.sin(Math.PI * u) * sag - rise * u * u + drift(seed, u) * jit * 0.35]);
        }
      } else {
        // Стрелка: от точки `from` к ближнему краю предмета, дугой. Без `from` она идёт со стороны,
        // где есть место, — от центра кадра к предмету, на пятую часть ширины кадра.
        const cx0 = r.left + r.width / 2, cy0 = r.top + r.height / 2;
        const dx = frameW / 2 - cx0, dy = frameH / 2 - cy0, dl = Math.hypot(dx, dy) || 1;
        const reach = Math.max(r.width, r.height) / 2 + frameW * 0.2;
        const sx = item.from ? item.from[0] * frameW : Math.max(frameW * 0.04, Math.min(frameW * 0.96, cx0 + (dx / dl) * reach));
        const sy = item.from ? item.from[1] * frameH : Math.max(frameH * 0.06, Math.min(frameH * 0.94, cy0 + (dy / dl) * reach));
        const ex = Math.max(r.left + pad * 0.4, Math.min(r.left + r.width - pad * 0.4, sx));
        const ey = Math.max(r.top + pad * 0.4, Math.min(r.top + r.height - pad * 0.4, sy));
        const bend = 0.16 + 0.05 * wobble(seed, 8);
        const mx = (sx + ex) / 2 + (ey - sy) * bend, my = (sy + ey) / 2 - (ex - sx) * bend;
        const len = Math.hypot(ex - sx, ey - sy) || 1, nx = -(ey - sy) / len, ny = (ex - sx) / len;
        for (let k = 0; k <= N; k++) {
          const u = k / N, off = drift(seed, u) * jit * 0.4 * Math.sin(Math.PI * u);
          pts.push([(1 - u) * (1 - u) * sx + 2 * (1 - u) * u * mx + u * u * ex + nx * off,
            (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * my + u * u * ey + ny * off]);
        }
      }
      const width = frameW * token("--sc-mark-width") * 1.25;
      // Древко стрелки занимает четыре пятых времени, наконечник — последнюю пятую.
      const shaft = head.length ? draw * 0.8 : draw;
      const p = ease(phase(t, item.at, item.at + shaft));
      drawStroke(segs, pts, p, width, seed, 1 - l.leave);
      if (head.length) {
        // Наконечник — два коротких изогнутых штриха от острия, разной длины и под чуть разными
        // углами: так его ставит рука, а не линейка.
        const [ex, ey] = pts[pts.length - 1]!, [px, py] = pts[pts.length - 6]!;
        const ang = Math.atan2(ey - py, ex - px), hs = frameW * token("--sc-mark-head");
        const hp = ease(phase(t, item.at + shaft, item.at + draw));
        [[-0.48 + 0.05 * wobble(seed, 9), 1], [0.52 + 0.05 * wobble(seed, 10), 0.86]].forEach(([da, k], side) => {
          const a = ang + Math.PI + da!, curl = side ? -0.18 : 0.18, hp2: Array<[number, number]> = [];
          for (let q = 0; q <= 8; q++) {
            const u = q / 8, aa = a + curl * u;
            hp2.push([ex + Math.cos(aa) * hs * k! * u, ey + Math.sin(aa) * hs * k! * u]);
          }
          drawStroke(head.slice(side * HEAD_SEGS, (side + 1) * HEAD_SEGS), hp2, hp, width * 0.9, seed + side + 11, hp > 0 ? 1 - l.leave : 0);
        });
      }
    });
  }

  /** Блик: полоса света один раз проходит по прямоугольнику предмета слева направо. */
  function renderGlints(t: number, lz: number): void {
    (scene!.overlay?.glints ?? []).forEach((item, i) => {
      const box = prims!.glints[i]!;
      const hold = item.hold ?? 1.1;
      const on = t >= item.at && t < item.at + hold;
      box.style.display = on ? "" : "none";
      if (!on) return;
      const r = anchorRect(item, lz);
      box.style.left = `${r.left.toFixed(1)}px`;
      box.style.top = `${r.top.toFixed(1)}px`;
      box.style.width = `${r.width.toFixed(1)}px`;
      box.style.height = `${r.height.toFixed(1)}px`;
      const p = ease(phase(t, item.at, item.at + hold));
      (box.firstElementChild as HTMLElement).style.left = `${(-70 + p * 190).toFixed(2)}%`;
    });
  }

  /** Пинг: два кольца расходятся из центра предмета и гаснут, точка в центре стоит, пока идёт пинг. */
  function renderPings(t: number, lz: number): void {
    (scene!.overlay?.pings ?? []).forEach((item, i) => {
      const box = prims!.pings[i]!;
      const hold = item.hold ?? 2;
      const on = t >= item.at && t < item.at + hold;
      box.style.display = on ? "" : "none";
      if (!on) return;
      const r = anchorRect(item, lz);
      box.style.left = `${(r.left + r.width / 2).toFixed(1)}px`;
      box.style.top = `${(r.top + r.height / 2).toFixed(1)}px`;
      const u = parseFloat(getComputedStyle(document.getElementById("__st") ?? prims!.root).getPropertyValue("--u")) || 10;
      [...box.querySelectorAll("i")].forEach((ring, k) => {
        // Кольцо растёт до двух с половиной диаметров точки и гаснет за секунду; второе — на полцикла позже.
        const q = (((t - item.at) - k * 0.5) % 1 + 1) % 1;
        const d = u * 0.9 * (1 + 2.6 * (1 - Math.pow(1 - q, 3)));
        (ring as HTMLElement).style.width = `${d.toFixed(1)}px`;
        (ring as HTMLElement).style.height = `${d.toFixed(1)}px`;
        (ring as HTMLElement).style.opacity = (t - item.at < k * 0.5 ? 0 : (1 - q) * 0.9).toFixed(3);
      });
      const fade = Math.min(1, (t - item.at) / 0.2, (item.at + hold - t) / 0.3);
      box.style.opacity = fade.toFixed(3);
    });
  }

  /**
   * Уведомления стопкой: новое въезжает справа за 0,4 с, прежние уходят вниз и назад — каждое
   * следующее на 5 % меньше; видно три, как у тостов Sonner. Отжившее уходит вправо.
   */
  function renderToasts(t: number): void {
    const list = scene!.overlay?.toasts ?? [];
    if (!list.length) return;
    const u = parseFloat(getComputedStyle(document.getElementById("__st") ?? prims!.root).getPropertyValue("--u")) || 10;
    list.forEach((item, i) => {
      const box = prims!.toasts[i]!;
      const end = item.at + (item.hold ?? 4);
      if (t < item.at || t >= end + 0.4) { box.style.display = "none"; return; }
      box.style.display = "";
      // Глубина — сколько более новых уже пришло; дробная, пока новое въезжает.
      let depth = 0;
      for (let j = i + 1; j < list.length; j++) if (t >= list[j]!.at) depth += spring(Math.min(1, (t - list[j]!.at) / 0.5));
      const enter = 1 - Math.pow(1 - Math.min(1, (t - item.at) / 0.4), 3);
      const leave = t >= end ? Math.pow(Math.min(1, (t - end) / 0.4), 2) : 0;
      const x = (1 - enter) * u * 28 + leave * u * 28;
      const y = depth * u * 1.4;
      const tp = t - SMEAR_DT, ep = 1 - Math.pow(1 - clamp((tp - item.at) / 0.4), 3), lp = tp >= end ? Math.pow(clamp((tp - end) / 0.4), 2) : 0;
      box.style.filter = smearFilter(box, x - ((1 - ep) * u * 28 + lp * u * 28), 0) || "none";
      box.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${(1 - 0.05 * depth).toFixed(4)})`;
      box.style.transformOrigin = "50% 0";
      box.style.opacity = (Math.min(1, enter * 1.6) * (1 - leave) * Math.max(0, Math.min(1, 3 - depth))).toFixed(3);
      box.style.zIndex = String(10 + i);
    });
  }

  /** Блик по строке: светлая середина градиента проходит предмет слева направо за 1,1 с. */
  const shimmerAt = (t: number): string => `${((1 - (((t / 1.1) % 1) + 1) % 1) * 100).toFixed(2)}%`;

  /**
   * «ИИ думает»: строка с бликом и полосы скелетона. С предметом скелетон ложится ровно на него
   * и сходит, открывая ответ; без предмета стоит карточкой посередине кадра, в безопасной зоне.
   */
  function renderThinking(t: number, lz: number): void {
    (scene!.overlay?.thinking ?? []).forEach((item, i) => {
      const box = prims!.thinking[i]!;
      const l = life(t, item.at, item.hold, 0.3, 0.35);
      box.style.display = l.on ? "" : "none";
      // Ответа нет до скелетона и под ним, пока тот стоит целиком; он проступает, пока скелетон
      // сходит. Видный до прихода скелетона ответ читался задом наперёд: есть — скрылся — появился.
      const cover = prims!.covered[i];
      // До первого скелетона на этой цели, а не до каждого: иначе между двумя скелетонами ответ пропадал.
      const first = Math.min(...(scene!.overlay?.thinking ?? []).filter((x) => x.target && x.target === item.target).map((x) => x.at));
      if (cover) cover.node.style.visibility = t < first || (l.on && l.enter >= 1 && l.leave <= 0) ? "hidden" : cover.visibility;
      if (!l.on) return;
      if (item.target || item.area) {
        const r = anchorRect(item, lz);
        box.style.left = `${r.left.toFixed(1)}px`;
        box.style.top = `${r.top.toFixed(1)}px`;
        box.style.width = `${r.width.toFixed(1)}px`;
        box.style.height = `${r.height.toFixed(1)}px`;
      } else {
        const zone = safeRect(lz), w = box.offsetWidth, h = box.offsetHeight;
        const frameW = innerWidth / lz, frameH = innerHeight / lz;
        box.style.left = `${Math.max(zone.l, Math.min(zone.r - w, (frameW - w) / 2)).toFixed(1)}px`;
        box.style.top = `${Math.max(zone.t, Math.min(zone.b - h, (frameH - h) / 2)).toFixed(1)}px`;
      }
      box.style.opacity = (Math.min(1, l.enter * 1.5) * (1 - l.leave)).toFixed(3);
      [...box.children].forEach((c, k) => { (c as HTMLElement).style.backgroundPosition = `${shimmerAt(t - item.at - k * 0.12)} 0`; });
    });
  }

  /**
   * «Буп»: предмет на странице вздрагивает и пружиной возвращается. Пишется в отдельные свойства
   * `scale`, `rotate`, `translate`: они складываются с трансформацией, которой страница двигает
   * предмет сама, а не затирают её.
   */
  function renderBoops(t: number): void {
    for (const item of scene!.overlay?.boops ?? []) {
      const node = document.querySelector<HTMLElement>(item.target);
      if (!node) throw new Error(`sc-stage:primitiveTarget:${item.target}`);
      const p = (t - item.at) / (item.kind === "pulse" ? item.hold ?? 3 : 0.7);
      if (p < 0 || p >= 1) { if (p >= 1 || p < -0.05) { node.style.scale = ""; node.style.rotate = ""; node.style.translate = ""; node.style.filter = ""; } continue; }
      // Пульс: предмет дышит циклами по 1,2 с и на вдохе светлеет и насыщается; края пульса гаснут.
      if (item.kind === "pulse") {
        const edge = Math.min(1, p * 8, (1 - p) * 8);
        const breath = Math.pow(Math.sin(((t - item.at) / 1.2) * Math.PI), 2) * edge;
        node.style.scale = (1 + 0.05 * breath).toFixed(4);
        node.style.filter = breath > 0.01 ? `brightness(${(1 + 0.14 * breath).toFixed(4)}) saturate(${(1 + 0.25 * breath).toFixed(4)})` : "";
        continue;
      }
      const wave = Math.exp(-5 * p) * Math.sin(p * Math.PI * 5);
      if (item.kind === "pop") node.style.scale = (1 + 0.14 * wave).toFixed(4);
      else if (item.kind === "shake") node.style.translate = `${(wave * 14).toFixed(2)}px 0`;
      else if (item.kind === "nod") node.style.rotate = `${(wave * 9).toFixed(2)}deg`;
      else node.style.scale = `${(1 + 0.12 * wave).toFixed(4)} ${(1 - 0.12 * wave).toFixed(4)}`;
    }
  }

  /** Генератор с зерном: одно зерно — одна раскладка частиц в каждом прогоне. */
  const seeded = (seed: number): (() => number) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let x = Math.imul(a ^ (a >>> 15), 1 | a);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  };

  /**
   * Конфетти и искры: каждая частица — функция времени от момента всплеска, зерна и
   * своего номера (скорость, направление, вращение, цвет). Кадр с середины совпадает
   * с кадром полного прогона. Конфетти — цветные прямоугольники, которые летят вверх,
   * кружатся и падают под тяжестью; искры — светлые штрихи, разлетающиеся во все
   * стороны с сопротивлением воздуха и гаснущие за секунду.
   */
  function renderBursts(t: number, lz: number, frameW: number, frameH: number): void {
    const cv = prims!.bursts;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const W = Math.round(frameW * dpr), H = Math.round(frameH * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const ctx = cv.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const palette = tokenText("--sc-confetti").split(",").map((c) => c.trim());
    const spark = tokenText("--sc-spark"), spark2 = tokenText("--sc-spark-2");
    (scene!.overlay?.bursts ?? []).forEach((item, bi) => {
      const hold = item.hold ?? 2.2, tau = t - item.at;
      if (tau < 0 || tau >= hold) return;
      const r = anchorRect(item, lz);
      const ox = r.left + r.width / 2, oy = r.top + r.height / 2;
      const rnd = seeded((item.seed ?? 7) * 7919 + bi * 104729);
      const fade = 1 - phase(tau, hold - 0.45, hold);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (item.kind === "confetti") {
        const n = item.count ?? 70;
        for (let k = 0; k < n; k++) {
          const ang = -Math.PI * (0.08 + 0.84 * rnd()), speed = frameH * (0.55 + 0.75 * rnd());
          const spin = (rnd() - 0.5) * 14, size = frameW * (0.005 + 0.006 * rnd()), color = palette[Math.floor(rnd() * palette.length)]!;
          const delay = rnd() * 0.08;
          const u = Math.max(0, tau - delay);
          // Сопротивление гасит разлёт, тяжесть тянет вниз.
          const drag = (1 - Math.exp(-2.2 * u)) / 2.2;
          const x = ox + Math.cos(ang) * speed * drag + Math.sin(u * 3 + k) * frameW * 0.004;
          const y = oy + Math.sin(ang) * speed * drag + 0.5 * frameH * 1.1 * u * u;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(spin * u + k);
          ctx.scale(1, Math.cos(u * 6 + k));
          ctx.globalAlpha = fade * (u > 0 ? 1 : 0);
          ctx.fillStyle = color;
          ctx.fillRect(-size, -size * 0.5, size * 2, size);
          ctx.restore();
        }
      } else {
        const n = item.count ?? 28;
        ctx.lineCap = "round";
        for (let k = 0; k < n; k++) {
          const ang = Math.PI * 2 * (k / n + rnd() * 0.3), speed = frameH * (0.5 + 0.7 * rnd());
          const life1 = 0.6 + 0.5 * rnd();
          if (tau > life1) continue;
          const drag = (1 - Math.exp(-4 * tau)) / 4;
          const d = speed * drag, v = speed * Math.exp(-4 * tau);
          const x = ox + Math.cos(ang) * d, y = oy + Math.sin(ang) * d;
          const len = Math.max(frameW * 0.004, v * 0.05);
          ctx.globalAlpha = (1 - tau / life1) * fade;
          // Искры — тёплый свет одного цвета: так они отличимы от разноцветного конфетти.
          ctx.strokeStyle = k % 3 ? spark : spark2;
          ctx.lineWidth = frameW * token("--sc-spark-width");
          ctx.beginPath();
          ctx.moveTo(x - Math.cos(ang) * len, y - Math.sin(ang) * len);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      }
    });
    ctx.globalAlpha = 1;
  }

  /**
   * Куски такта не длиннее двух строк субтитра, ровные и разрезанные по смыслу — та же
   * нарезка, что у `chunks` в film.ts (код повторён: страница не импортирует модули сборки).
   * Кусок, который этим шрифтом всё же занял бы три строки, кадр делит дальше
   * (`screenChunks`); SRT такого куска не делит — строки в файле переносит проигрыватель.
   */
  function chunksOf(text: string, max = 84): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const cut = (limit: number): string[] => {
      const out: string[] = [];
      let cur = "";
      for (const w of words) {
        if (cur && (cur + " " + w).length > limit) { out.push(cur); cur = w; }
        else cur = cur ? `${cur} ${w}` : w;
      }
      if (cur) out.push(cur);
      return out;
    };
    const greedy = cut(max);
    if (greedy.length < 2) return greedy;
    return byMeaning(words, greedy.length, max) ?? evenCut(words, greedy.length, max, cut) ?? greedy;
  }
  function evenCut(words: string[], k: number, max: number, cut: (limit: number) => string[]): string[] | null {
    for (let limit = Math.ceil(words.join(" ").length / k); limit < max; limit++) {
      const even = cut(limit);
      if (even.length === k) return even;
    }
    return null;
  }

  /** Слова, после которых кусок не кончается и перед которыми начинается новая часть фразы. */
  const CONJ = new Set("и а но или либо что чтобы когда если потому поэтому где куда откуда как пока хотя зато однако который которая которое которые которым которой которых and but or so because when if that which while where who whose though although".split(" "));
  const PREP = new Set("в во на с со к ко по из от до за для о об обо у при про без через под над перед между после вокруг около the a an to from in on at for with of by into through over under about after before between".split(" "));

  /** Цена разреза между словами `a` и `b`: чем осмысленнее граница, тем дешевле. */
  function breakCost(a: string, b: string): number {
    const bare = (w: string): string => w.toLowerCase().replace(/^[«"'([]+|[»"')\].,;:!?…]+$/gu, "");
    const tail = bare(a), head = bare(b);
    if (/[.!?…]["»)]*$/u.test(a)) return 0;
    if (/[,;:]["»)]*$/u.test(a) || /^[—–-]$/u.test(b) || /^[—–]$/u.test(a)) return 1;
    if (CONJ.has(tail) || PREP.has(tail)) return 12;
    if (CONJ.has(head)) return 2;
    if (PREP.has(head)) return 3;
    return 5;
  }

  /**
   * Лучшая по смыслу нарезка на `k` кусков: каждый не длиннее `max` и в коридоре от двух третей
   * до четырёх третей средней длины. Нет такой — `null`, и режется по длине.
   */
  function byMeaning(words: string[], k: number, max: number): string[] | null {
    const n = words.length;
    const mean = words.join(" ").length / k;
    const lo = Math.floor(mean * 2 / 3), hi = Math.min(max, Math.ceil(mean * 4 / 3));
    const pre = [0];
    for (const w of words) pre.push(pre[pre.length - 1]! + w.length);
    const len = (i: number, j: number): number => pre[j]! - pre[i]! + (j - i - 1);
    // best[c][j] — цена первых j слов, разрезанных на c кусков; from — где начался последний.
    const best: number[][] = Array.from({ length: k + 1 }, () => Array(n + 1).fill(Infinity));
    const from: number[][] = Array.from({ length: k + 1 }, () => Array(n + 1).fill(-1));
    best[0]![0] = 0;
    for (let c = 1; c <= k; c++) {
      for (let j = 1; j <= n; j++) {
        for (let i = c - 1; i < j; i++) {
          if (best[c - 1]![i] === Infinity) continue;
          const l = len(i, j);
          if (l > hi) continue;
          if (l < lo) break;
          const cost = best[c - 1]![i]! + (j < n ? breakCost(words[j - 1]!, words[j]!) : 0) + 4 * ((l - mean) / mean) ** 2;
          if (cost < best[c]![j]!) { best[c]![j] = cost; from[c]![j] = i; }
        }
      }
    }
    if (best[k]![n] === Infinity) return null;
    const out: string[] = [];
    for (let c = k, j = n; c > 0; c--) { const i = from[c]![j]!; out.unshift(words.slice(i, j).join(" ")); j = i; }
    return out;
  }

  /**
   * Сколько строк займёт кусок в блоке субтитров: слова раскладываются по ширине блока тем же
   * шрифтом, что у субтитров. Подложка строки отступает от текста на `--sc-pad-x` с каждой
   * стороны на каждой строке, поэтому место под текст — ширина блока без двух отступов.
   */
  let measure: CanvasRenderingContext2D | null = null;
  /** Длины штрихов прорисовываемых фигур: замер один раз на фигуру. */
  const drawLength = new WeakMap<SVGGeometryElement, number>();
  /** Исходные формы путей с `data-morph`: морф считается от них, а не от прошлого кадра. */
  const morphFrom = new WeakMap<SVGPathElement, string>();
  const fitCache = new Map<string, number>();
  /** Шрифт и ширина блока субтитров сцены: меряются один раз после монтирования. */
  let subBox: { font: string; spacing: string; room: number } | null = null;
  function linesOf(text: string, sub: HTMLElement): number {
    const hit = fitCache.get(text);
    if (hit !== undefined) return hit;
    // Ширина и отступ — из стилей, а не из отрисовки: они не зависят ни от увеличения документа,
    // ни от того, что показывал блок на прошлом кадре, и нарезка одинакова на любом кадре.
    if (!subBox) {
      const cs = getComputedStyle(sub);
      const probe = document.createElement("span");
      probe.style.cssText = "position:absolute;visibility:hidden;padding-left:var(--sc-pad-x)";
      sub.appendChild(probe);
      const pad = parseFloat(getComputedStyle(probe).paddingLeft) || 0;
      probe.remove();
      subBox = { font: cs.font, spacing: cs.letterSpacing, room: parseFloat(cs.width) - pad * 2 };
    }
    const { font, spacing, room } = subBox;
    measure ??= document.createElement("canvas").getContext("2d");
    if (!measure || room <= 0) return 1;
    measure.font = font;
    // Межбуквенный интервал субтитров canvas сам не знает: его задаёт стиль блока.
    measure.letterSpacing = spacing === "normal" ? "0px" : spacing;
    // Слово в кадре — отдельный блок, и пробел живёт внутри него (`white-space: pre`): последнее
    // слово строки несёт свой пробел в её ширину. Счёт «слова плюс пробелы между ними» был уже
    // настоящей строки на пробел, и кусок, который он клал в две строки, в кадре ложился в три.
    let lines = 1, width = 0;
    const words = text.split(" ");
    words.forEach((w, i) => {
      const ww = measure!.measureText(i < words.length - 1 ? `${w} ` : w).width;
      if (width && width + ww > room) { lines++; width = ww; } else width += ww;
      // Слово шире строки (путь, имя переменной) переносится внутри себя и занимает строки само.
      if (width > room) { lines += Math.ceil(width / room) - 1; width %= room; }
    });
    fitCache.set(text, lines);
    return lines;
  }
  /**
   * Куски такта, каждый — не больше двух строк на экране. Сначала — нарезка по числу знаков, как у
   * SRT; кусок, который этим шрифтом и в этой ширине всё же занимает три строки (длинные слова,
   * широкий алфавит), делится дальше ровными частями.
   */
  function screenChunks(text: string, max: number, sub: HTMLElement): string[] {
    const out: string[] = [];
    for (const c of chunksOf(text, max)) {
      let parts = [c];
      for (let limit = c.length - 1; parts.some((p) => linesOf(p, sub) > 2) && limit >= 8; limit--) parts = chunksOf(c, limit);
      out.push(...parts);
    }
    return out;
  }
  let subKey = "";
  // Сколько строк занял самый длинный кусок субтитра: мерится по отрисованным словам, а не по
  // оценке знаков — шрифт темы и формат кадра решают перенос сами.
  let captionMost = { lines: 0, text: "" };
  /**
   * Субтитры и караоке. Окно такта — от его начала до начала следующего (у
   * последнего — до конца речи): это ИЗМЕРЕННЫЕ по звуку границы, поэтому
   * подсветка сдвигается вместе с голосом и темпом. Внутри такта время делится
   * между кусками и словами пропорционально длине слов — распознавания речи нет,
   * это оценка.
   */
  /** Насколько видна карточка, лёгшая поверх элемента: 0 — ни одной, 1 — непрозрачная. */
  function cardOver(node: HTMLElement): number {
    const r = node.getBoundingClientRect();
    let over = 0;
    for (const card of el.cards.children as HTMLCollectionOf<HTMLElement>) {
      if (card.style.display === "none") continue;
      const c = card.getBoundingClientRect();
      if (c.right <= r.left || c.left >= r.right || c.bottom <= r.top || c.top >= r.bottom) continue;
      over = Math.max(over, Number(card.style.opacity || 1));
    }
    return over;
  }

  function renderSubtitles(t: number): void {
    if (!prims || !scene) return;
    const sub = prims.sub;
    // В предметной половине слоя (она увеличивается вместе с видео) субтитров
    // нет: иначе они выходили бы дважды — увеличенными и обычными.
    if (prims.subOff) { sub.style.display = "none"; return; }
    const style = scene.captionStyle ?? "bar";
    const texts = scene.beatTexts ?? [];
    const shown = style !== "bar" && texts.length > 0
      && (scene.captionEverywhere || at((scene.effects?.caption ?? { from: 1.4 }).from, 0) < scene.duration)
      && t >= (scene.captionEverywhere ? 0 : at((scene.effects?.caption ?? { from: 1.4 }).from, 0));
    if (!shown) { sub.style.display = "none"; return; }
    const starts = scene.starts ?? texts.map((_, i) => (i * scene!.duration) / texts.length);
    const spoken = scene.spoken ?? scene.duration;
    let beat = -1;
    for (let i = 0; i < starts.length; i++) if (t >= starts[i]!) beat = i;
    const end = beat >= 0 ? (beat + 1 < starts.length ? starts[beat + 1]! : spoken) : 0;
    if (beat < 0 || t >= end + 0.25 || !texts[beat]) { sub.style.display = "none"; return; }
    const from = starts[beat]!;
    sub.style.display = "";
    const chunks = screenChunks(texts[beat]!, scene.subMax ?? 84, sub);
    const weights = chunks.map((c) => c.length + 1);
    const total = weights.reduce((a, b) => a + b, 0);
    let acc = from, ci = 0;
    for (; ci < chunks.length; ci++) {
      const span = ((end - from) * weights[ci]!) / total;
      if (t < acc + span || ci === chunks.length - 1) break;
      acc += span;
    }
    const chunkEnd = acc + ((end - from) * weights[ci]!) / total;
    // Ключ куска — вместе с его текстом: нарезка пересчитывается на каждом кадре по настоящей
    // раскладке, и когда она меняется (догрузился шрифт темы), кусок с тем же номером получает
    // другой текст. По одному номеру в кадре оставался прежний кусок — и ложился в три строки.
    const key = `${beat}:${ci}:${chunks[ci]}`;
    if (key !== subKey) {
      subKey = key;
      sub.textContent = "";
      const line = document.createElement("span");
      line.className = "__line";
      chunks[ci]!.split(" ").forEach((word, wi, all) => {
        const w = document.createElement("span");
        w.className = "__word";
        w.dataset.i = String(wi);
        setRichText(w, word + (wi < all.length - 1 ? " " : ""));
        line.appendChild(w);
      });
      sub.appendChild(line);
    }
    sub.style.display = "";
    {
      // Строки считаются по прямоугольникам текста, а не слов: слово-блок, перенесённое внутри себя,
      // даёт один прямоугольник, а строк — несколько.
      const tops = new Set([...sub.querySelectorAll<HTMLElement>(".__word")].flatMap((w) => {
        const r = document.createRange();
        r.selectNodeContents(w);
        return [...r.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top));
      }));
      if (tops.size > captionMost.lines) captionMost = { lines: tops.size, text: chunks[ci]! };
    }
    // Субтитры — речь для тех, кто смотрит без звука, поэтому фокус камеры их не гасит:
    // иначе пропадала бы ровно та реплика, которую фокус показывает. Уступают они только
    // карточке, которая легла поверх них, и ровно настолько, насколько она видна.
    sub.style.opacity = String((1 - cardOver(sub)) * (1 - phase(t, end, end + 0.25)));
    if (style === "karaoke") {
      const words = [...sub.querySelectorAll<HTMLElement>(".__word")];
      const wWeights = words.map((w) => (w.textContent ?? "").trim().length + 1);
      const wTotal = wWeights.reduce((a, b) => a + b, 0);
      let wAcc = acc;
      words.forEach((w, i) => {
        const span = ((chunkEnd - acc) * wWeights[i]!) / wTotal;
        w.classList.toggle("__said", t >= wAcc + span);
        w.classList.toggle("__now", t >= wAcc && t < wAcc + span);
        wAcc += span;
      });
    }
  }

  // — действия на странице —
  //
  // Нажатие в ролике не запускает скрипт страницы: страница — снимок или слайд, и её скрипт либо
  // не работает, либо зависит от часов. Действие накладки само ставит состояние, которое дало бы
  // нажатие: флажок, выбранную вкладку, открытое меню, класс, новый порядок детей. Состояние в
  // момент t выводится из исходного: всё тронутое возвращается к исходному, и действия, чей момент
  // наступил, применяются заново по порядку — кадр с середины совпадает с кадром сквозного прогона.
  interface Touched { attrs: Map<string, string | null>; classes: Map<string, boolean>; checked?: boolean; open?: boolean; children?: ChildNode[] }
  const touched = new Map<Element, Touched>();
  const touch = (node: Element): Touched => {
    let rec = touched.get(node);
    if (!rec) { rec = { attrs: new Map(), classes: new Map() }; touched.set(node, rec); }
    return rec;
  };
  function setAttr(node: Element, name: string, value: string | null): void {
    const rec = touch(node);
    if (!rec.attrs.has(name)) rec.attrs.set(name, node.getAttribute(name));
    if (value === null) node.removeAttribute(name); else node.setAttribute(name, value);
  }
  function setClass(node: Element, name: string, on: boolean): void {
    const rec = touch(node);
    if (!rec.classes.has(name)) rec.classes.set(name, node.classList.contains(name));
    node.classList.toggle(name, on);
  }
  function setChecked(node: HTMLInputElement, on: boolean): void {
    const rec = touch(node);
    rec.checked ??= node.checked;
    node.checked = on;
  }
  function restoreActions(): void {
    for (const [node, rec] of touched) {
      if (rec.children) node.replaceChildren(...rec.children);
      for (const [name, v] of rec.attrs) { if (v === null) node.removeAttribute(name); else node.setAttribute(name, v); }
      for (const [name, on] of rec.classes) node.classList.toggle(name, on);
      if (rec.checked !== undefined) (node as HTMLInputElement).checked = rec.checked;
      if (rec.open !== undefined) (node as HTMLDetailsElement).open = rec.open;
    }
  }
  /** Панель, которой управляет вкладка или кнопка меню: `aria-controls`. */
  const panelOf = (node: Element): Element | null => {
    const id = node.getAttribute("aria-controls");
    return id ? document.getElementById(id) : null;
  };
  function applyAction(a: StageAction): void {
    const node = document.querySelector(a.target);
    if (!node) throw new Error(`sc-stage:primitiveTarget:${a.target}`);
    if (a.kind === "toggle") {
      if (node instanceof HTMLInputElement && (node.type === "checkbox" || node.type === "radio")) {
        // Радиокнопка гасит соседок по группе сама: их прежнее состояние тоже запоминается.
        if (node.type === "radio" && node.name) {
          for (const r of document.querySelectorAll<HTMLInputElement>(`input[type=radio][name="${window.CSS.escape(node.name)}"]`)) setChecked(r, r.checked);
        }
        setChecked(node, node.type === "radio" ? true : !node.checked);
      } else {
        const attr = node.hasAttribute("aria-pressed") ? "aria-pressed" : "aria-checked";
        setAttr(node, attr, node.getAttribute(attr) === "true" ? "false" : "true");
      }
      if (a.class) setClass(node, a.class, !node.classList.contains(a.class));
    } else if (a.kind === "tab") {
      // Соседки вкладки — дети того же родителя с той же ролью (или тем же тегом, если роли нет).
      const role = node.getAttribute("role");
      const tabs = node.parentElement ? [...node.parentElement.children]
        .filter((c) => (role ? c.getAttribute("role") === role : c.tagName === node.tagName)) : [node];
      for (const tab of tabs) {
        const on = tab === node;
        setAttr(tab, "aria-selected", String(on));
        setClass(tab, a.class ?? "active", on);
        const panel = panelOf(tab);
        if (panel) setAttr(panel, "hidden", on ? null : "");
      }
    } else if (a.kind === "open" || a.kind === "close") {
      const on = a.kind === "open";
      if (node instanceof HTMLDetailsElement) {
        const rec = touch(node);
        rec.open ??= node.open;
        node.open = on;
      } else setAttr(node, "aria-expanded", String(on));
      const panel = panelOf(node);
      if (panel) setAttr(panel, "hidden", on ? null : "");
      setClass(node, a.class ?? "open", on);
    } else if (a.kind === "class") {
      setClass(node, a.class!, !node.classList.contains(a.class!));
    } else {
      // Новый порядок — относительно того, в каком дети стоят к этому действию; неназванные — следом.
      const rec = touch(node);
      rec.children ??= [...node.childNodes];
      const cur = [...node.children];
      const next = a.order!.map((k) => cur[k - 1]).filter((c): c is Element => Boolean(c));
      node.append(...next, ...cur.filter((c) => !next.includes(c)));
    }
  }
  /** Сколько длится переезд предметов на новые места после действия. */
  const GLIDE = 0.6;
  let actionsKey = "";
  const glided = new Set<HTMLElement | SVGElement>();
  /** Предметы, которые после действия переезжают плавно: `glide`, у `reorder` — дети цели. */
  function glidersOf(a: StageAction): Array<HTMLElement | SVGElement> {
    if (a.glide) return [...document.querySelectorAll<HTMLElement | SVGElement>(a.glide)];
    if (a.kind === "reorder") return [...(document.querySelector(a.target)?.children ?? [])] as Array<HTMLElement | SVGElement>;
    return [];
  }
  /**
   * Состояние страницы в момент t. Перемена раскладки не прыгает (FLIP): предмет меряется на
   * старом месте (действия до этого) и на новом (с ним), ставится на новое и смещается назад на
   * разницу, которая гаснет пружиной за 0,6 с. Замер повторяется на каждом кадре переезда —
   * без памяти о прошлых кадрах.
   */
  function renderActions(t: number): void {
    const list = [...(scene?.overlay?.actions ?? [])].sort((a, b) => a.at - b.at);
    if (!list.length) return;
    const done = list.filter((a) => t >= a.at).length;
    const moving = list.map((a, i) => ({ a, i })).filter(({ a }) => t >= a.at && t < a.at + GLIDE);
    if (String(done) === actionsKey && !moving.length && !glided.size) return;
    actionsKey = String(done);
    for (const n of glided) n.style.translate = "";
    glided.clear();
    const shift = new Map<HTMLElement | SVGElement, [number, number]>();
    for (const { a, i } of moving) {
      const nodes = glidersOf(a);
      if (!nodes.length) continue;
      const place = (): DOMRect[] => nodes.map((n) => n.getBoundingClientRect());
      restoreActions();
      list.slice(0, i).forEach(applyAction);
      const before = place();
      applyAction(a);
      const after = place();
      const left = 1 - spring(phase(t, a.at, a.at + GLIDE));
      nodes.forEach((n, k) => {
        // Сдвиг пишется в точках самого предмета: экранная разница делится на его увеличение
        // (наезд, увеличение страницы и слайда).
        const w = (n as HTMLElement).offsetWidth;
        const scale = w > 0 && after[k]!.width > 0 ? after[k]!.width / w : 1;
        const [dx, dy] = shift.get(n) ?? [0, 0];
        shift.set(n, [dx + ((before[k]!.left - after[k]!.left) * left) / scale, dy + ((before[k]!.top - after[k]!.top) * left) / scale]);
      });
    }
    restoreActions();
    list.slice(0, done).forEach(applyAction);
    for (const [n, [dx, dy]] of shift) {
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) continue;
      n.style.translate = `${dx.toFixed(2)}px ${dy.toFixed(2)}px`;
      glided.add(n);
    }
  }

  /** Плавный старт и плавная остановка без рывка ускорения: кривая киносъёмочного крана. */
  const smoother = (p: number): number => p * p * p * (p * (p * 6 - 15) + 10);
  /**
   * Цель по селектору. `el3` — третий появляющийся элемент слайда: так к нему
   * обращаются без знания разметки.
   */
  function findTarget(sel: string): Element | null {
    const nth = /^el(\d+)$/.exec(sel.trim());
    if (nth) return document.querySelectorAll(".el")[Number(nth[1]) - 1] ?? null;
    return document.querySelector(sel);
  }
  interface CamPose { k: number; cx: number; cy: number; power: number; rect: Rect | null; cue: StageCamera | null }
  const overview = (): CamPose => ({ k: 1, cx: innerWidth / 2, cy: innerHeight / 2, power: 0, rect: null, cue: null });
  function cuePose(c: StageCamera): CamPose {
    let rect: Rect;
    if (c.target) {
      const node = findTarget(c.target);
      if (!node) throw new Error(`sc-stage:cameraTarget:${c.target}`);
      rect = contentRect(node);
    } else {
      rect = { left: c.area![0] * innerWidth, top: c.area![1] * innerHeight,
        width: c.area![2] * innerWidth, height: c.area![3] * innerHeight };
    }
    // Увеличение по умолчанию — 1,65, но не больше того, при котором цель целиком в кадре на
    // 0,9 его стороны (`pushScale` в camera.ts); названное сценарием остаётся как есть.
    // Проход по широкой цели (`pan`) цель целиком не вписывает: он приближает её по высоте — до
    // трети кадра, не больше трёх крат, — чтобы текст читался, и ведёт окно вдоль неё.
    // В сборке в другом формате видно окно, а не весь кадр: наезд вписывает цель в ширину окна
    // и может дойти до трёх крат — иначе подпись узкой цели оставалась бы мелкой на телефоне.
    const view = scene?.__cropWidth ?? innerWidth, most = scene?.__cropWidth ? 3 : 1.65;
    const k = c.scale ?? (c.pan ? Math.max(1, Math.min(3, 0.3 * innerHeight / Math.max(1, rect.height)))
      : Math.max(1, Math.min(most, 0.9 * view / Math.max(1, rect.width), 0.9 * innerHeight / Math.max(1, rect.height))));
    const span = panSpan(c, k, rect);
    return { k, cx: span ? span[0] : rect.left + rect.width / 2, cy: rect.top + rect.height / 2, power: 1, rect, cue: c };
  }
  /**
   * Проход по цели шире видимого (`pan`): от её левого края к правому. Видно окно кадрирования
   * (сборка в другом формате) или весь кадр, делённые на увеличение; поле — 4 % окна с каждой
   * стороны. Цель, которая помещается, проходить не нужно — тогда null.
   */
  function panSpan(c: StageCamera, k: number, rect: Rect): [number, number] | null {
    if (!c.pan) return null;
    const half = ((scene?.__cropWidth ?? innerWidth) / k / 2) * 0.92;
    // Проходится то, что в цели написано, а не её коробка: строка таблицы во всю ширину кончается
    // текстом последней ячейки, и окно не должно доезжать до пустого края.
    let left = rect.left, right = rect.left + rect.width;
    const node = c.target ? findTarget(c.target) : null;
    if (node) {
      // Края — по самим строкам текста: у ячейки таблицы коробка шире её слов.
      const box = node.getBoundingClientRect();
      let lo = Infinity, hi = -Infinity;
      const walk = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        if (!n.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        const r = range.getBoundingClientRect();
        if (r.width > 0) { lo = Math.min(lo, r.left); hi = Math.max(hi, r.right); }
      }
      if (box.width > 0 && hi > lo) {
        const f = rect.width / box.width;
        left = rect.left + Math.max(0, lo - box.left) * f;
        right = rect.left + Math.min(box.width, hi - box.left) * f;
      }
    }
    const from = left + half, to = right - half;
    return to > from + 1 ? [from, to] : null;
  }
  /** Середина окна на удержании цели с проходом: едет от начала цели к её концу. */
  function panX(c: StageCamera, pose: CamPose, t: number): number {
    const span = pose.rect ? panSpan(c, pose.k, pose.rect) : null;
    if (!span) return pose.cx;
    const move = c.move ?? 0.9;
    return span[0] + (span[1] - span[0]) * smoother(phase(t, c.at + move, c.at + move + c.hold));
  }
  function blend(a: CamPose, b: CamPose, p: number): CamPose {
    const ra = a.rect ?? b.rect, rb = b.rect ?? a.rect;
    const lerp = (x: number, y: number): number => x + (y - x) * p;
    return {
      // Масштаб — по геометрической середине: равные доли пути дают равные
      // ощущения приближения, а не рывок в начале.
      k: a.k * Math.pow(b.k / a.k, p), cx: lerp(a.cx, b.cx), cy: lerp(a.cy, b.cy), power: lerp(a.power, b.power),
      rect: ra && rb ? { left: lerp(ra.left, rb.left), top: lerp(ra.top, rb.top),
        width: lerp(ra.width, rb.width), height: lerp(ra.height, rb.height) } : null,
      cue: p < 0.5 ? a.cue ?? b.cue : b.cue ?? a.cue,
    };
  }
  /**
   * Середина окна кадрирования по горизонтали в точках кадра — для сборки в другом
   * формате (`build --format vertical`), которая вырезает из горизонтального кадра
   * окно у цели фокуса. Окно ведёт цель, а не центр: до первого фокуса оно ждёт у
   * первой цели, на наезде плавно переезжает от прежнего места к новой цели, на
   * удержании и возврате идёт за ней по экрану, а после возврата остаётся у неё.
   */
  let focusPoint = 0;
  function focusAt(t: number, k: number, tx: number): number {
    const cues = [...(scene?.overlay?.camera ?? [])].sort((a, b) => a.at - b.at);
    const screen = (x: number): number => x * k + tx;
    if (!cues.length) {
      const base = targetRectRaw();
      return scene?.target ? screen(base.left + base.width / 2) : innerWidth / 2;
    }
    let prev = cuePose(cues[0]!).cx;
    for (const c of cues) {
      const move = c.move ?? 0.9, back = c.return ?? 0.9;
      if (t < c.at) return prev;
      const pose = cuePose(c), x = pose.cx;
      if (t < c.at + move) return prev + (screen(x) - prev) * smoother(phase(t, c.at, c.at + move));
      const plateau = c.at + move + c.hold;
      if (t < plateau) return screen(panX(c, pose, t));
      const end = panX(c, pose, plateau);
      if (!c.keep && t < plateau + back) return screen(end);
      prev = c.keep ? screen(end) : end;
    }
    return prev;
  }

  /** Поза камеры в момент t: наезд, удержание с еле заметным ходом, проезд, возврат. */
  function cameraAt(t: number): CamPose & { active: boolean; travelling: boolean } {
    const cues = [...(scene?.overlay?.camera ?? [])].sort((a, b) => a.at - b.at);
    let pose = overview();
    for (const c of cues) {
      const move = c.move ?? 0.9, back = c.return ?? 0.9;
      if (t < c.at) break;
      const target = cuePose(c);
      if (t < c.at + move) {
        const from = pose;
        return { ...blend(from, target, smoother(phase(t, c.at, c.at + move))), active: true, travelling: from.power > 0 };
      }
      const plateau = c.at + move + c.hold;
      // Наезд НЕ ЗАМИРАЕТ на удержании: камера продолжает еле заметно идти вперёд,
      // иначе замороженный кадр с дочитанной карточкой становится слайдом.
      // Подсветка без наезда (`scale: 1`) не дрейфует: кадр должен стоять.
      const drift = c.scale === 1 ? 0 : 0.035;
      if (t < plateau) return { ...target, cx: panX(c, target, t), k: target.k * (1 + drift * ((t - c.at - move) / c.hold)), active: true, travelling: false };
      pose = { ...target, cx: panX(c, target, plateau), k: target.k * (1 + drift) };
      if (c.keep) continue;
      if (t < plateau + back) return { ...blend(pose, overview(), smoother(phase(t, plateau, plateau + back))), active: true, travelling: false };
      pose = overview();
    }
    return { ...pose, active: pose.power > 0, travelling: false };
  }

  function renderAt(t: number): void {
    if (!scene) return;
    const fx = scene.effects ?? {};
    const dur = scene.duration;
    // 0. Действия на странице — до всех замеров: они меняют раскладку, которую меряют камера и слой.
    renderActions(t);

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
    if (scene.overlay?.camera?.length) window.scrollTo(0, 0);
    if (target && !scene.overlay?.camera?.length && needScroll(target)) {
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
    const z = scene.overlay?.camera?.length
      ? { from: 0, to: 0, scale: 1 } : fx.zoom ?? { from: 0, to: 0, scale: 1 };
    const zFrom = at(z.from, 0);
    const zTo = at(z.to, 0);
    let zp = ease(phase(t, zFrom, zTo));
    let k = 1 + ((z.scale ?? 1) - 1) * zp;
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
      const zr = pageBox();
      const fit = (v: number, edge: number, size: number, frame: number): number => {
        const lo = frame - (edge + size) * k;   // правый (нижний) край не заходит внутрь кадра
        const hi = -edge * k;                   // левый (верхний) край не отходит от нуля
        // Страница уже кадра — центрируем её, ограничивать нечего.
        return lo > hi ? (frame - size * k) / 2 - edge * k : Math.max(lo, Math.min(hi, v));
      };
      tx = fit(tx, zr.left, zr.width, innerWidth);
      ty = fit(ty, zr.top, zr.height, innerHeight);
    }
    // Камера — путь по ключевым точкам: общий план → цель → (следующая цель, если
    // движение осталось в приближении) → общий план. Состояние в момент t
    // вычисляется только из t, поэтому кадр с середины совпадает с кадром
    // полного прогона.
    const cam = cameraAt(t);
    const cameraRect: Rect | null = cam.rect;
    const cameraPower = cam.power;
    const cue = cam.cue;
    if (cam.active && cameraRect && !scene.__videoCamera) {
      zp = 1;
      k = cam.k;
      tx = k === 1 ? 0 : innerWidth / 2 - cam.cx * k;
      ty = k === 1 ? 0 : innerHeight / 2 - cam.cy * k;
      const zr = pageBox();
      const clampPan = (v: number, edge: number, size: number, frame: number): number => {
        const lo = frame - (edge + size) * k;
        const hi = -edge * k;
        return lo > hi ? (frame - size * k) / 2 - edge * k : Math.max(lo, Math.min(hi, v));
      };
      tx = clampPan(tx, zr.left, zr.width, innerWidth);
      ty = clampPan(ty, zr.top, zr.height, innerHeight);
    }
    // Остановленный кадр в другом формате: камера ведёт окно и подсветку, но не приближает.
    if (scene.__noZoom) { k = 1; tx = 0; ty = 0; zp = 1; }
    zoomState = { k, tx: tx * zp, ty: ty * zp };
    // Смещение посчитано в точках экрана, а сдвиг ставится внутри документа, увеличенного `zoom` на
    // корне (слайд вписан в кадр так): без деления сдвиг вырос бы в это число раз, кадр уехал бы
    // мимо цели, а подсветка, поставленная по точкам экрана, легла бы рядом с ней.
    const rootZoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    el.zoom.style.transform =
      `translate(${(tx * zp / rootZoom).toFixed(2)}px, ${(ty * zp / rootZoom).toFixed(2)}px) scale(${k.toFixed(4)})`;
    focusPoint = focusAt(t, zoomState.k, zoomState.tx);

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
    if (cue?.target) spotEl = findTarget(cue.target);
    if (Array.isArray(scene.focus) && scene.focus.length) {
      const passed = scene.focus.filter((f) => t >= at(f.at, 0));
      const cur = passed.length ? passed[passed.length - 1]! : scene.focus[0]!;
      spotEl = document.querySelector(cur.sel) ?? target;
    }
    // Пока камера едет между целями, пятно тоже едет — по промежуточному
    // прямоугольнику пути, а не прыжком к новой цели.
    // У цели-селектора рамка обходит то, что цель показывает (её содержимое со значками), а не
    // одну её коробку: иначе рамка шла сквозь значок, вынесенный за угол.
    const live = cameraRect && (cue?.area || cam.travelling || cue?.target)
      ? (scene.__videoCamera
        // Наезд над видео делает сборка, а слой остаётся в координатах кадра: подсветка
        // обязана лечь ровно на область, которую сборка и увеличит.
        ? { left: cameraRect.left, top: cameraRect.top,
            width: cameraRect.width, height: cameraRect.height }
        : { left: cameraRect.left * k + zoomState.tx, top: cameraRect.top * k + zoomState.ty,
            width: cameraRect.width * k, height: cameraRect.height * k })
      : spotEl ? spotEl.getBoundingClientRect()
        : { left: base.left * k + zoomState.tx, top: base.top * k + zoomState.ty,
            width: base.width * k, height: base.height * k };
    const sp = fx.spot ?? { from: "55%" };
    const spOn = scene.overlay?.camera?.length ? cameraPower * 0.9
      : t >= at(sp.from, 0) ? 1 : 0;
    const pad = 10;
    el.spot.style.opacity = String(spOn);
    const R = Math.round;
    // Круг описан вокруг прямоугольника цели с полем: диаметр — его диагональ, поэтому углы
    // цели внутри светлого круга. Круг по большей стороне был вписан и срезал углы.
    let box = { left: live.left / lz - pad, top: live.top / lz - pad,
      width: live.width / lz + pad * 2, height: live.height / lz + pad * 2 };
    if (cue?.shape === "circle") {
      const d = Math.hypot(box.width, box.height);
      box = { left: box.left + box.width / 2 - d / 2, top: box.top + box.height / 2 - d / 2, width: d, height: d };
    }
    el.spot.style.borderRadius = cue?.shape === "circle" ? "50%" : "";
    // Кинонаезд: без рамки вокруг цели и с затемнением слабее темы (или без него). Токены темы
    // переопределяются на самом пятне, поэтому тень пятна (--sc-spot-shadow) рисует ту же форму.
    el.spot.style.setProperty("--sc-spot", cue?.ring === false ? "transparent" : "");
    const themeDim = getComputedStyle(document.documentElement).getPropertyValue("--sc-dim").trim();
    el.spot.style.setProperty("--sc-dim", cue?.dim !== undefined && themeDim
      ? `color-mix(in srgb, ${themeDim} ${(cue.dim * 100).toFixed(1)}%, transparent)` : "");
    el.spot.style.left = `${R(box.left)}px`;
    el.spot.style.top = `${R(box.top)}px`;
    el.spot.style.width = `${R(box.width)}px`;
    el.spot.style.height = `${R(box.height)}px`;
    // Размытие и обесцвечивание всего вне фокуса: пелена во весь кадр с
    // отверстием по пятну. Над готовым видео слой прозрачен и размывать ему
    // нечего — там фокус держится одним затемнением.
    const veilOn = !scene.__overlayOnly && cue && (cue.blur || cue.desaturate) ? cameraPower : 0;
    el.veil.style.opacity = veilOn.toFixed(3);
    if (veilOn > 0) {
      const W = innerWidth / lz, H = innerHeight / lz;
      el.veil.style.backdropFilter = [cue!.blur ? `blur(${(cue!.blur * veilOn).toFixed(2)}px)` : "",
        cue!.desaturate ? `grayscale(${veilOn.toFixed(3)})` : ""].filter(Boolean).join(" ");
      const r = cue!.shape === "circle" ? box.width / 2 : Number.parseFloat(getComputedStyle(el.spot).borderTopLeftRadius) || 0;
      const x = box.left, y = box.top, w = box.width, h = box.height;
      el.veil.style.clipPath = `path(evenodd, "M0 0 H${W} V${H} H0 Z M${x + r} ${y} H${x + w - r} A${r} ${r} 0 0 1 ${x + w} ${y + r} `
        + `V${y + h - r} A${r} ${r} 0 0 1 ${x + w - r} ${y + h} H${x + r} A${r} ${r} 0 0 1 ${x} ${y + h - r} V${y + r} `
        + `A${r} ${r} 0 0 1 ${x + r} ${y} Z")`;
    }

    // 4. Курсор: путь от стартовой точки к цели за [from, to], затем стоит.
    const c = fx.cursor ?? { from: 0, to: "40%", start: [0.33, 0.61] };
    const points = scene.overlay?.pointer;
    if (points?.length) {
      const nextIndex = points.findIndex((p) => p.at >= t);
      const hi = nextIndex < 0 ? points.length - 1 : nextIndex;
      const lo = Math.max(0, hi - 1);
      const a = points[lo]!, b = points[hi]!;
      const p = hi === lo ? 1 : ease(phase(t, a.at, b.at));
      // Рука ведёт мышь дугой, а не по линейке: путь — квадратичная кривая с вершиной, отнесённой
      // вбок на восьмую часть длины перехода; сторона дуги чередуется от точки к точке.
      const ax = a.x * innerWidth, ay = a.y * innerHeight, bx = b.x * innerWidth, by = b.y * innerHeight;
      const side = hi % 2 ? 1 : -1;
      const cx = (ax + bx) / 2 - (by - ay) * 0.125 * side, cy = (ay + by) / 2 + (bx - ax) * 0.125 * side;
      const px = (1 - p) * (1 - p) * ax + 2 * (1 - p) * p * cx + p * p * bx;
      const py = (1 - p) * (1 - p) * ay + 2 * (1 - p) * p * cy + p * p * by;
      el.cur.style.display = t < points[0]!.at ? "none" : "";
      // Магнит: предмет тянется к подлетающему указателю — на четверть расстояния, когда тот ближе
      // восьмой части ширины кадра, — и возвращается, когда указатель ушёл.
      for (const point of points) {
        if (!point.magnet) continue;
        const node = document.querySelector<HTMLElement>(point.magnet);
        if (!node) throw new Error(`sc-stage:primitiveTarget:${point.magnet}`);
        // Место предмета меряется без прошлого притяжения: кадр не зависит от предыдущего.
        node.style.translate = "";
        const r = node.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const reach = innerWidth / 8, d = Math.hypot(px - cx, py - cy);
        const pull = t < points[0]!.at ? 0 : Math.max(0, 1 - d / reach);
        const k = pull * pull * (3 - 2 * pull) * 0.25;
        node.style.translate = k > 0.001 ? `${((px - cx) * k).toFixed(2)}px ${((py - cy) * k).toFixed(2)}px` : "";
      }
      // Перетаскивание: предмет, взятый в точке с `drag`, идёт за указателем до следующей точки и
      // лежит там, где его отпустили. Сдвиг — сумма законченных переносов и текущего; пока предмет
      // в руке, он чуть приподнят, а курсор нажат.
      const carried = new Map<string, { dx: number; dy: number; lift: number }>();
      points.forEach((point, i) => {
        if (!point.drag) return;
        const next = points[i + 1]!;
        const rec = carried.get(point.drag) ?? { dx: 0, dy: 0, lift: 0 };
        if (t >= next.at) { rec.dx += (next.x - point.x) * innerWidth; rec.dy += (next.y - point.y) * innerHeight; }
        else if (t >= point.at) {
          rec.dx += px - point.x * innerWidth;
          rec.dy += py - point.y * innerHeight;
          rec.lift = Math.min(1, (t - point.at) / 0.15, (next.at - t) / 0.15);
        }
        carried.set(point.drag, rec);
      });
      let press = 0;
      for (const [sel, rec] of carried) {
        const node = document.querySelector<HTMLElement>(sel);
        if (!node) throw new Error(`sc-stage:primitiveTarget:${sel}`);
        // Сдвиг пишется в точках предмета: путь указателя в точках слоя переводится в экранные
        // (увеличение документа) и делится на увеличение предмета (наезд, вписывание слайда).
        node.style.scale = "";
        const lzd = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
        const w = node.offsetWidth, r = node.getBoundingClientRect();
        const scale = w > 0 && r.width > 0 ? r.width / w : 1;
        node.style.translate = rec.dx || rec.dy ? `${((rec.dx * lzd) / scale).toFixed(2)}px ${((rec.dy * lzd) / scale).toFixed(2)}px` : "";
        node.style.scale = rec.lift > 0 ? (1 + 0.04 * rec.lift).toFixed(4) : "";
        node.style.zIndex = rec.lift > 0 ? "10" : "";
        press = Math.max(press, rec.lift);
      }
      el.cur.style.transform = `translate(${Math.round(px)}px, ${Math.round(py)}px)${press > 0 ? ` scale(${(1 - 0.12 * press).toFixed(3)})` : ""}`;
      // Прожектор: светлый круг вокруг острия курсора, кадр вокруг гаснет цветом затемнения темы.
      let lit = 0, size = 0.22;
      for (const torch of scene.overlay?.torch ?? []) {
        if (t < torch.at || t >= torch.at + torch.hold) continue;
        lit = Math.min(1, (t - torch.at) / 0.35, (torch.at + torch.hold - t) / 0.35);
        size = torch.size ?? 0.22;
      }
      el.torch.style.opacity = lit.toFixed(3);
      if (lit > 0) {
        const radius = (size * innerWidth) / 2;
        el.torch.style.background = `radial-gradient(circle at ${px.toFixed(1)}px ${py.toFixed(1)}px, transparent ${(radius * 0.55).toFixed(1)}px, var(--sc-dim) ${radius.toFixed(1)}px)`;
      }
      const clicked = [...points].reverse().find((point) => point.click && t >= point.at && t < point.at + 0.65);
      if (clicked) {
        const rp = phase(t, clicked.at, clicked.at + 0.65);
        const size = innerWidth * token("--sc-ripple-size") * (0.22 + rp);
        el.rip.style.display = "";
        el.rip.style.opacity = String(0.9 * (1 - rp));
        el.rip.style.left = `${Math.round(clicked.x * innerWidth)}px`;
        el.rip.style.top = `${Math.round(clicked.y * innerHeight)}px`;
        el.rip.style.width = `${Math.round(size)}px`;
        el.rip.style.height = `${Math.round(size)}px`;
      } else {
        el.rip.style.display = "none";
      }
    } else {
      // Слайду курсор не нужен: он ничего не показывает и лезет в кадр.
      el.cur.style.display = c.hidden || scene.__overlayOnly ? "none" : "";
      el.rip.style.display = c.hidden || scene.__overlayOnly ? "none" : "";
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
      const rSize = innerWidth * token("--sc-ripple-size") * (0.22 + rp);
      el.rip.style.opacity = String(rp > 0 && rp < 1 ? 0.9 * (1 - rp) : 0);
      el.rip.style.left = `${Math.round(dstX)}px`;
      el.rip.style.top = `${Math.round(dstY)}px`;
      el.rip.style.width = `${Math.round(rSize)}px`;
      el.rip.style.height = `${Math.round(rSize)}px`;
    }

    // Timed cards are derived solely from scene time; random seek is safe.
    (scene.overlay?.cards ?? []).forEach((card, i) => {
      const node = el.cards.children[i] as HTMLElement;
      const end = card.at + (card.hold ?? 4);
      // Видимость назначается ДО измерений: у скрытой карточки ширина и высота равны нулю, и
      // расчёт места по ним уводил карточку за правый край — в кадре оставался обрезанный
      // заголовок. Дефект виден только на карточке, которую ставят по месту (центр и рядом
      // с фокусом): у углов место задаёт разметка.
      node.style.display = t < card.at || t >= end ? "none" : "";
      const enter = ease(phase(t, card.at, card.at + (card.enter ?? 0.65)));
      const leave = ease(phase(t, end - (card.exit ?? 0.45), end));
      node.style.opacity = String(Math.max(0, Math.min(enter, 1 - leave)));
      // Появившаяся карточка продолжает еле заметно дышать: без этого она
      // висит в кадре неподвижным прямоугольником, пока под ней идёт
      // живая запись, и читается как наклейка, а не как часть ролика.
      const life = Math.sin(t * 0.8 + i * 0.9) * 1.3 * enter * (1 - leave);
      if (card.motion === "fly") {
        // Влёт объектом: карточка приходит из-за края кадра, перелетает место и возвращается на него.
        // Перелёт берётся от остатка пути, поэтому он сам собой гаснет к концу входа и не дёргает карточку.
        const edge = card.from ?? "bottom";
        const overshoot = Math.sin(enter * Math.PI) * 26;
        const travel = (1 - enter) * 620 + leave * 520;
        const sign = edge === "left" || edge === "top" ? -1 : 1;
        const along = sign * travel - sign * overshoot * (1 - leave);
        const drift = life;
        const [dx, dy] = edge === "left" || edge === "right" ? [along, drift] : [drift, along];
        const tilt = (1 - enter) * sign * 4 + leave * sign * 6;
        node.style.transform = `translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px) rotate(${tilt.toFixed(2)}deg)`
          + ` scale(${(0.94 + 0.06 * enter).toFixed(3)})`;
        // Смаз по пути влёта и вылета: тот же путь на 1/60 с раньше.
        const tp = t - SMEAR_DT, ep = ease(phase(tp, card.at, card.at + (card.enter ?? 0.65))), lp = ease(phase(tp, end - (card.exit ?? 0.45), end));
        const alongPrev = sign * ((1 - ep) * 620 + lp * 520) - sign * Math.sin(ep * Math.PI) * 26 * (1 - lp);
        const d = along - alongPrev;
        node.style.filter = smearFilter(node, edge === "left" || edge === "right" ? d : 0, edge === "left" || edge === "right" ? 0 : d) || "none";
      } else if (card.motion === "pop") {
        node.style.transform = `scale(${(0.84 + 0.16 * enter - leave * 0.04).toFixed(3)})`
          + ` translateY(${life.toFixed(2)}px)`;
      } else if (card.motion === "glide") {
        node.style.transform = `translate(${((1 - enter) * 38 + leave * 12).toFixed(2)}px,`
          + `${life.toFixed(2)}px)`;
      } else {
        node.style.transform = `translateY(${((1 - enter) * 22 - leave * 8 + life).toFixed(2)}px)`;
      }
      if (card.position === "center" || card.position === "near-focus") {
        const frameW = innerWidth / lz, frameH = innerHeight / lz;
        const w = node.offsetWidth, h = node.offsetHeight;
        let left = (frameW - w) / 2, top = (frameH - h) / 2;
        if (card.position === "near-focus" && cameraPower > 0 && cameraRect) {
          const focus = { left: live.left / lz, top: live.top / lz,
            right: (live.left + live.width) / lz, bottom: (live.top + live.height) / lz };
          const gap = 24;
          if (focus.right + gap + w <= frameW - 28) left = focus.right + gap;
          else if (focus.left - gap - w >= 28) left = focus.left - gap - w;
          else left = Math.max(28, Math.min(frameW - w - 28, focus.left));
          top = focus.bottom + gap + h <= frameH - 28 ? focus.bottom + gap
            : Math.max(28, focus.top - gap - h);
        }
        // Последнее слово — за кадром: карточка целиком внутри него, чем бы ни кончился подбор
        // места. Обрезанная карточка не читается вовсе, а место у неё всегда есть — кадр больше.
        const zone = safeRect(lz);
        left = Math.max(zone.l, Math.min(zone.r - w, left));
        top = Math.max(zone.t, Math.min(zone.b - h, top));
        node.style.left = `${Math.round(left)}px`;
        node.style.top = `${Math.round(top)}px`;
      }
      const title = node.querySelector<HTMLElement>(".__card-title");
      const body = node.querySelector<HTMLElement>(".__card-body");
      if (card.reveal && card.reveal !== "type" && card.reveal !== "fade" && title) {
        // Заголовок карточки собирается фразой, тело проступает следом.
        const start = card.at + (card.enter ?? 0.65) * 0.35;
        kineticMount(title, card.reveal);
        const done = kineticAt(title, t, start);
        if (body) body.style.opacity = String(ease(phase(t, start + 0.6, start + 1.1)) * (done > 0 ? 1 : 0));
      } else if (card.reveal === "type") {
        const titleLen = title ? glyphCount(title) : 0;
        const bodyLen = body ? glyphCount(body) : 0;
        const duration = Math.min(3.2, (titleLen + bodyLen) / 34);
        const typed = Math.floor(phase(t, card.at + (card.enter ?? 0.65) * 0.35,
          card.at + (card.enter ?? 0.65) * 0.35 + duration) * (titleLen + bodyLen));
        if (title) typeTo(title, typed);
        if (body) typeTo(body, typed - titleLen);
      }
    });

    // Набираемые элементы страницы: `data-type` объявляет сама страница (так
    // делают заставки глав), момент начала — её же `data-at`, уже переведённый
    // в секунды при монтировании. Скорость — знаков в секунду: заголовок
    // набирается медленнее тела, чтобы его успели прочитать.
    // Набор обязан кончиться до конца сцены: длинный текст в короткой сцене набирается быстрее,
    // а не обрывается на середине (последние 0,6 с текст стоит целиком). Прежде подзаголовок
    // заставки в пятисекундной сцене уходил в переход недописанным.
    // Одна клавиатура: следующий набираемый узел того же рода (следующая команда терминала) — тоже
    // срок, и узел может попросить стоять целиком дольше (`data-type-hold`): команде нужно время
    // поработать и показать вывод до следующей.
    const typedNodes = own ? [...document.querySelectorAll<HTMLElement>("[data-type]")] : [];
    for (const node of typedNodes) {
      const from = Number(node.dataset.at) || 0;
      const base = Number(node.dataset.typeSpeed) || (node.dataset.type === "title" ? 22 : 34);
      const next = Math.min(...typedNodes.filter((n) => n.dataset.type === node.dataset.type && (Number(n.dataset.at) || 0) > from)
        .map((n) => Number(n.dataset.at) || 0), scene ? scene.duration : Infinity);
      const room = next - (Number(node.dataset.typeHold) || TYPE_HOLD) - from;
      const speed = room > 0.2 ? Math.max(base, glyphCount(node) / room) : Infinity;
      typeTo(node, (t - from) * speed);
    }
    // Прорисовка линий страницы: `data-draw` на фигуре SVG (или на SVG с фигурами) рисует её
    // штрих за названные секунды (без числа — 1,2 с) от её `data-at`, как пером.
    for (const node of own ? document.querySelectorAll<Element>("[data-draw]") : []) {
      const from = Number((node as HTMLElement).dataset.at) || 0;
      const len = Number((node as HTMLElement).dataset.draw) || 1.2;
      const p = ease(phase(t, from, from + len));
      const shapes = node instanceof SVGGeometryElement ? [node]
        : [...node.querySelectorAll<SVGGeometryElement>("path,line,polyline,polygon,circle,ellipse,rect")];
      for (const shape of shapes) {
        let total = drawLength.get(shape);
        if (total === undefined) { total = shape.getTotalLength(); drawLength.set(shape, total); }
        shape.style.strokeDasharray = `${total} ${total}`;
        shape.style.strokeDashoffset = String(total * (1 - p));
      }
    }
    // Бегущий луч: `data-beam` на фигуре SVG — по ней от её `data-at` бежит светящийся отрезок в
    // восьмую часть длины, круг за названные секунды (без числа — 2 с): поток данных по связи.
    for (const node of own ? document.querySelectorAll<Element>("[data-beam]") : []) {
      const from = Number((node as HTMLElement).dataset.at) || 0;
      const period = Number((node as HTMLElement).dataset.beam) || 2;
      const shapes = node instanceof SVGGeometryElement ? [node]
        : [...node.querySelectorAll<SVGGeometryElement>("path,line,polyline,polygon,circle,ellipse,rect")];
      for (const shape of shapes) {
        let total = drawLength.get(shape);
        if (total === undefined) { total = shape.getTotalLength(); drawLength.set(shape, total); }
        const dash = total / 8, u = t < from ? 0 : (((t - from) / period) % 1);
        shape.style.strokeDasharray = `${dash} ${total}`;
        shape.style.strokeDashoffset = String(dash - u * (total + dash));
        shape.style.opacity = t < from ? "0" : "";
        // Луч светится: отрезок ярче и насыщеннее самой линии, иначе тёмный цвет связи его прячет.
        shape.style.filter = t < from ? "" : "brightness(1.8) saturate(1.3)";
      }
    }
    // Морф формы: `data-morph` на пути SVG — форма, в которую путь перетекает от своего `data-at`
    // за 0,9 с. Числа обеих форм сводятся попарно; у форм с разным числом точек форма сменяется
    // на полпути — рисуйте обе с одинаковым числом точек.
    for (const node of own ? document.querySelectorAll<SVGPathElement>("path[data-morph]") : []) {
      let from = morphFrom.get(node);
      if (from === undefined) { from = node.getAttribute("d") ?? ""; morphFrom.set(node, from); }
      const to = node.dataset.morph ?? "";
      const p = ease(phase(t, Number(node.dataset.at) || 0, (Number(node.dataset.at) || 0) + 0.9));
      const num = /-?\d*\.?\d+(?:e-?\d+)?/gi;
      const a = from.match(num) ?? [], b = to.match(num) ?? [];
      if (a.length === b.length && from.replace(num, "#") === to.replace(num, "#")) {
        let k = 0;
        node.setAttribute("d", from.replace(num, () => { const v = Number(a[k]) + (Number(b[k]) - Number(a[k])) * p; k++; return v.toFixed(3); }));
      } else node.setAttribute("d", p < 0.5 ? from : to);
    }
    // Кинетические фразы страницы: `data-kinetic="fly"` объявляет сама страница —
    // слайд или своя вёрстка автора, — момент начала — её `data-at`.
    for (const node of pageKinetic) kineticAt(node, t, Number(node.dataset.at) || 0);

    // 6. Подсказка: появление и полоса хода реплики.
    // Сцена без речи подсказки не получает вовсе: пустая строка нарисовала бы в кадре пустую
    // плашку с полосой хода — то же место, тот же вес, и ничего не сказано.
    const cap = fx.caption ?? { from: 1.4 };
    // Субтитры «везде» включают подпись и там, где поставщик её прятал (слайды).
    const capFrom = scene.captionEverywhere ? Math.min(at(cap.from, 0), 0.3) : at(cap.from, 0);
    const barStyle = (scene.captionStyle ?? "bar") === "bar";
    // Пока камера ведёт зрителя, нижняя строка УХОДИТ: в кадре остаётся один текстовый слой —
    // карточка у подсвеченного места. Иначе зритель читает две вещи сразу и не смотрит ни на одну.
    const ap = scene.caption && barStyle ? phase(t, capFrom, capFrom + 0.42) * (1 - cameraPower) : 0;
    el.cap.style.opacity = String(ap);
    el.cap.style.transform = `translate(-50%, ${Math.round((1 - ap) * 14)}px)`;
    const barP = phase(t, capFrom, dur);
    el.capBar.style.width = `${(Math.round(barP * 1000) / 10).toFixed(1)}%`;

    renderPrimitives(t, lz);

    // 7. Переход: затемнение на входе и выходе сцены.
    const tr = fx.fade ?? { from: 0, in: 0.35, out: 0.35 };
    const fadeIn = 1 - phase(t, 0, tr.in ?? 0.35);
    const fadeOut = phase(t, dur - (tr.out ?? 0.35), dur);
    el.fade.style.opacity = String(Math.max(fadeIn, fadeOut).toFixed(3));
  }

  /** Прямоугольник любого элемента БЕЗ учёта зума: снимаем трансформацию на время замера. */
  /**
   * Края страницы, по которым ограничивается смещение камеры: тело документа вместе со всеми его
   * потомками (абсолютно расставленные блоки в размер тела не входят) и не меньше кадра. Одного тела
   * мало: у страницы, чьи блоки расставлены абсолютно, тело высотой в одну шапку, и ограничение
   * принимало её за всю страницу — ставило эту полоску в середину кадра и уводило цель фокуса вниз,
   * под субтитры. Слой композиции в счёт не идёт (он вне тела): его карточки и линза на краю кадра
   * меняли бы края страницы от кадра к кадру. Меряется один раз после монтирования.
   */
  let pageBoxCache: Rect | null = null;
  function pageBox(): Rect {
    if (pageBoxCache) return pageBoxCache;
    const prev = el.zoom.style.transform;
    el.zoom.style.transform = "none";
    let l = 0, t = 0, r = innerWidth, b = innerHeight;
    for (const n of [el.zoom, ...el.zoom.querySelectorAll("*")]) {
      const q = n.getBoundingClientRect();
      if (q.width === 0 && q.height === 0) continue;
      l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom);
    }
    el.zoom.style.transform = prev;
    pageBoxCache = { left: l, top: t, width: r - l, height: b - t };
    return pageBoxCache;
  }
  function rawRect(node: Element | null): Rect {
    const prev = el.zoom.style.transform;
    el.zoom.style.transform = "none";
    const r = node ? node.getBoundingClientRect() : null;
    const out = r ? { left: r.left, top: r.top, width: r.width, height: r.height }
      : { left: 0, top: 0, width: 100, height: 100 };
    el.zoom.style.transform = prev;
    return out;
  }

  /**
   * Прямоугольник того, что цель показывает, а не только её коробки: значок, вынесенный за угол
   * карточки, и строка, вылезшая за её край, — часть предмета. По одной коробке наезд вписывал
   * в кадр карточку без значка, значок резался краем кадра, а рамка проходила сквозь него.
   * Цель, которая сама обрезает содержимое (`overflow` не `visible`), — это и есть её коробка.
   */
  function contentRect(node: Element): Rect {
    const prev = el.zoom.style.transform;
    el.zoom.style.transform = "none";
    const box = node.getBoundingClientRect();
    let x0 = box.left, y0 = box.top, x1 = box.right, y1 = box.bottom;
    const clips = (e: Element): boolean => { const o = getComputedStyle(e).overflow; return o !== "visible" && o !== ""; };
    if (!clips(node)) {
      for (const d of node.querySelectorAll("*")) {
        const cs = getComputedStyle(d);
        if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) continue;
        // Потомок, обрезанный промежуточным предком, виден только в пределах этого предка.
        let clipper: Element | null = null;
        for (let a = d.parentElement; a && a !== node; a = a.parentElement) if (clips(a)) { clipper = a; break; }
        const r = d.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        const c = clipper ? clipper.getBoundingClientRect() : null;
        const l = c ? Math.max(r.left, c.left) : r.left, t = c ? Math.max(r.top, c.top) : r.top;
        const rr = c ? Math.min(r.right, c.right) : r.right, b = c ? Math.min(r.bottom, c.bottom) : r.bottom;
        if (rr <= l || b <= t) continue;
        x0 = Math.min(x0, l); y0 = Math.min(y0, t); x1 = Math.max(x1, rr); y1 = Math.max(y1, b);
      }
    }
    el.zoom.style.transform = prev;
    return { left: x0, top: y0, width: x1 - x0, height: y1 - y0 };
  }

  /** Прямоугольник цели БЕЗ учёта зума. */
  function targetRectRaw(): Rect {
    return rawRect(scene?.target ? document.querySelector(scene.target) : null);
  }

  // Сцена отдаётся наружу, чтобы проверка кадра могла взять цель зума
  // из данных, а не угадывать её селектором.
  /**
   * Камера в этот момент едет (наезд, проезд, возврат), а не стоит: только
   * такие кадры получают размытие движения — на удержании кадр резкий.
   */
  function moving(t: number): boolean {
    return (scene?.overlay?.camera ?? []).some((c) => {
      const move = c.move ?? 0.9, back = c.return ?? 0.9, end = c.at + move + c.hold;
      return (t > c.at && t < c.at + move) || (!c.keep && t > end && t < end + back);
    });
  }

  /** Прямоугольник предмета в точках кадра на этом кадре — для лупы, которую рисует сборка. */
  /**
   * Кегль самого мелкого текста в цели, в точках экрана: вычисленный размер шрифта, умноженный на
   * то, во сколько раз элемент сейчас увеличен (наезд камеры, увеличение страницы, трансформации).
   * Сборка умножает его ещё на плотность снимка и сравнивает с порогом читаемости. Текст, которого
   * не видно (прозрачный, скрытый), не считается; цели без текста — null.
   */
  function fontPx(sel: string): number | null {
    const node = findTarget(sel);
    if (!node) return null;
    let least = Infinity;
    const walk = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const host = n.parentElement;
      if (!host || !n.textContent?.trim()) continue;
      const cs = getComputedStyle(host);
      if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
      const box = host.getBoundingClientRect();
      const w = host.offsetWidth;
      const scale = w > 0 && box.width > 0 ? box.width / w : 1;
      least = Math.min(least, parseFloat(cs.fontSize) * scale);
    }
    return Number.isFinite(least) ? least : null;
  }

  /**
   * Строки страницы мельче `min` точек кадра: текст, который на телефоне не прочесть. Меряется
   * вся страница, а не цель фокуса: надзаголовок или код слайда в вертикальном кадре выходили
   * мельче порога, а отчёт молчал — он мерил только то, на что наезжает камера. Строка — ближайший
   * не строчный предок куска текста, как в `cutText`.
   */
  /**
   * Текст страницы, заходящий за безопасную зону ленты: под кнопки и подпись площадки. Меряется
   * по кадру как есть, с наездом камеры (прямоугольник элемента — после трансформации). Элемент
   * целиком за кадром не в счёт: его и так не видно.
   */
  function outsideSafe(safe: { top: number; bottom: number; left: number; right: number }): Array<{ text: string; side: string }> {
    const body = document.body;
    if (!body) return [];
    // Прямоугольники Chromium и innerWidth — уже в точках кадра, с увеличением `zoom` на корне.
    const W = innerWidth, H = innerHeight, slack = 4;
    const found = new Map<Element, string>();
    const walk = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const host = n.parentElement;
      if (!host || !n.textContent?.trim() || found.has(host)) continue;
      const cs = getComputedStyle(host);
      if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r0 of range.getClientRects()) {
        const r = r0;
        if (r.right <= 0 || r.left >= W || r.bottom <= 0 || r.top >= H || r0.width <= 0) continue;
        const side = r.left < safe.left - slack ? "left" : r.right > W - safe.right + slack ? "right"
          : r.top < safe.top - slack ? "top" : r.bottom > H - safe.bottom + slack ? "bottom" : "";
        if (side) { found.set(host, side); break; }
      }
    }
    return [...found].map(([e, side]) => ({ text: (e.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 60), side }));
  }

  /**
   * Текст, который видно в кадре сейчас: страница и слой (субтитры, подпись, карточки, титры).
   * Элемент прозрачный, скрытый или за краем кадра не в счёт. Сборка сверяет с ним цитаты из
   * заметок контрольных кадров.
   */
  function visibleText(): string {
    const lz = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    const shown = (e: Element | null): boolean => {
      for (let x = e; x && x !== document.documentElement; x = x.parentElement) {
        const cs = getComputedStyle(x);
        if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.05) return false;
      }
      return true;
    };
    const parts: string[] = [];
    const walk = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const text = n.textContent?.trim();
      const host = n.parentElement;
      if (!text || !host || host.closest("script,style,head") || !shown(host)) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      if ([...range.getClientRects()].some((r) => r.width > 0 && r.right * lz > 0 && r.left * lz < innerWidth * lz
        && r.bottom * lz > 0 && r.top * lz < innerHeight * lz)) parts.push(text);
    }
    return parts.join(" ");
  }

  function smallText(min: number): Array<{ text: string; px: number }> {
    const body = document.body;
    if (!body) return [];
    const found = new Map<Element, number>();
    const walk = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const host = n.parentElement;
      if (!host || !n.textContent?.trim()) continue;
      const cs = getComputedStyle(host);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      const box = host.getBoundingClientRect();
      if (box.width <= 0 || box.height <= 0 || box.bottom < 0 || box.top > innerHeight || box.right < 0 || box.left > innerWidth) continue;
      // Кегль вёрстки, а не мгновенный: увеличение — произведение `zoom` предков (сетка слайда и его
      // вписывание), без `transform`. Въезд элемента масштабом иначе давал на коротком такте ложную
      // мелочь. У текста SVG (подписи графика) к нему добавляется масштаб рисунка — высота на
      // экране к высоте в единицах рисунка, делённая на то же увеличение.
      let zoom = 1;
      for (let e: Element | null = host; e; e = e.parentElement) zoom *= parseFloat(getComputedStyle(e).zoom) || 1;
      let scale = zoom;
      if (host instanceof SVGGraphicsElement) {
        const bb = host.getBBox();
        const svgRoot = host.ownerSVGElement;
        const drawn = svgRoot?.getBoundingClientRect().height ?? 0, units = svgRoot?.viewBox.baseVal?.height || svgRoot?.height.baseVal.value || 0;
        if (bb.height > 0 && drawn > 0 && units > 0) scale = drawn / units;
      }
      const px = parseFloat(cs.fontSize) * scale;
      if (px >= min - 0.5) continue;
      let line: Element = host;
      while (line !== body && line.parentElement && getComputedStyle(line).display.startsWith("inline")) line = line.parentElement;
      found.set(line, Math.min(found.get(line) ?? Infinity, px));
    }
    const out = [...found].map(([l, px]) => ({ text: (l.textContent ?? "").replace(/\s+/g, " ").trim(), px: Number(px.toFixed(1)) }))
      .filter((x) => x.text);
    const seen = new Set<string>();
    return out.sort((a, b) => a.px - b.px).filter((x) => !seen.has(x.text) && seen.add(x.text))
      .map((x) => ({ ...x, text: x.text.length > 40 ? `${x.text.slice(0, 37)}…` : x.text }));
  }

  /**
   * Строки текста цели, которые кадр режет: их прямоугольник хоть частью вне видимого — кадра или,
   * в сборке в другом формате, окна кадрирования у цели фокуса. Сборка называет их в отчёте:
   * срезанная строка на экране не читается, а по сценарию этого не видно.
   */
  /**
   * Видна ли цель на экране сейчас: она есть, у неё есть размер, и ни она, ни её предки не скрыты.
   * Пункт слайда до своего момента стоит скрытым — фокус на нём шёл к пустому углу кадра.
   */
  function shown(sel: string): boolean {
    const node = findTarget(sel);
    if (!node) return false;
    const r = node.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    for (let x: Element | null = node; x && x !== document.documentElement; x = x.parentElement) {
      const cs = getComputedStyle(x);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.05) return false;
    }
    return true;
  }

  function cutText(sel: string): string[] {
    const node = findTarget(sel);
    if (!node) return [];
    const cw = scene?.__cropWidth;
    const x0 = cw ? focusPoint - cw / 2 : 0, x1 = cw ? focusPoint + cw / 2 : innerWidth;
    // Строка называется целиком: подсвеченный код и набор по буквам дробят её на куски текста в
    // отдельных вложенных элементах, и отчёт из кусков («l», «a», «n») не говорит, что пропало.
    // Кусок поднимается до ближайшего не строчного предка внутри цели — это и есть строка.
    const lineOf = (el: Element): Element => {
      let e = el;
      while (e !== node && e.parentElement && getComputedStyle(e).display.startsWith("inline")) e = e.parentElement;
      return e;
    };
    const lines: Element[] = [];
    const walk = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const text = n.textContent?.trim();
      const host = n.parentElement;
      if (!text || !host) continue;
      const cs = getComputedStyle(host);
      if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      // Прямоугольники — уже в точках кадра (увеличение `zoom` на корне в них учтено), как и края окна.
      const cut = [...range.getClientRects()].some((r) => r.width > 0 && (r.left < x0 - 0.5 || r.right > x1 + 0.5 || r.top < -0.5 || r.bottom > innerHeight + 0.5));
      const line = cut ? lineOf(host) : null;
      if (line && !lines.includes(line)) lines.push(line);
    }
    return lines.map((l) => (l.textContent ?? "").replace(/\s+/g, " ").trim()).filter(Boolean)
      .map((t) => (t.length > 60 ? `${t.slice(0, 57)}…` : t));
  }

  function rectOf(a: StageAnchor | { cue: string }): Rect {
    // Цель наезда меряется так, как её находит и меряет камера (`cuePose`): `el3` — третий
    // появляющийся элемент слайда, прямоугольник — без текущего увеличения страницы. Иначе у
    // цепочки фокусов вторая цель мерялась бы увеличенной первым наездом.
    if ("cue" in a) {
      const node = findTarget(a.cue);
      if (!node) throw new Error(`sc-stage:cameraTarget:${a.cue}`);
      return contentRect(node);
    }
    const lz = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    const r = anchorRect(a, lz);
    return { left: r.left * lz, top: r.top * lz, width: r.width * lz, height: r.height * lz };
  }

  /**
   * Верх полосы субтитров или плашки подписи — линия, над которой стоят нижний титр и титр снизу
   * (`--lower-bottom`). Сборка держит линзу лупы выше неё: лупа рисуется поверх готового кадра и
   * иначе закрыла бы строку речи.
   */
  function floor(): number {
    if (!prims || !banded) return innerHeight;
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;left:0;height:0;bottom:var(--lower-bottom)";
    el.layer.appendChild(probe);
    // Прямоугольник — уже в точках кадра: увеличение `zoom` на корне в нём учтено.
    const y = probe.getBoundingClientRect().top;
    probe.remove();
    return y;
  }

  return { mount, renderAt, targetRect, moving, focusX: () => focusPoint, rectOf, fontPx, cutText, smallText, floor,
    captionLines: () => captionMost, outsideSafe, visibleText, shown, get scene() { return scene; } };
})();
