// Виртуальные часы страницы. Внедряются ДО загрузки документа, поэтому
// композиция и любые её библиотеки видят только управляемое время.
// Никакого реального времени в кадре: `performance.now`, `Date.now`
// и `requestAnimationFrame` подменены.
(() => {
  let now = 0;                 // виртуальное время, мс
  const rafQueue: Array<{ id: number; cb: FrameRequestCallback }> = [];
  let rafId = 0;

  const realPerfNow = performance.now.bind(performance);
  performance.now = () => now;
  const RealDate = Date;
  // Подмена глобального Date намеренно обходит систему типов: класс-наследник
  // не подходит под сигнатуру DateConstructor, у которой есть ещё и вызов
  // без new, возвращающий строку. Нам нужна именно подмена, а не совместимый
  // конструктор.
  (globalThis as unknown as { Date: unknown }).Date = class extends RealDate {
    constructor(...a: unknown[]) {
      super(...((a.length ? a : [now]) as []));
    }
    static override now(): number {
      return now;
    }
  };

  window.requestAnimationFrame = (cb: FrameRequestCallback): number => {
    rafQueue.push({ id: ++rafId, cb });
    return rafId;
  };
  window.cancelAnimationFrame = (id: number): void => {
    const i = rafQueue.findIndex((x) => x.id === id);
    if (i >= 0) rafQueue.splice(i, 1);
  };

  // Прогон отложенных колбэков: столько раз, сколько их накопилось на этот
  // момент. Композиция обязана быть сикабельной, поэтому одного прохода
  // достаточно — накопления между кадрами в ней нет.
  function flushRaf(t: number): void {
    const batch = rafQueue.splice(0, rafQueue.length);
    for (const { cb } of batch) {
      try {
        cb(t);
      } catch {
        /* колбэк композиции не должен ронять рендер */
      }
    }
  }

  // Собрать все корни, где могут жить анимации: документ и каждый shadowRoot.
  type AnimRoot = Document | ShadowRoot;
  function roots(node: Node = document, acc: AnimRoot[] = [document]): AnimRoot[] {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT);
    let el: Node | null = walker.currentNode;
    while (el) {
      const shadow = (el as Element).shadowRoot;
      if (shadow) {
        acc.push(shadow);
        roots(shadow, acc);
      }
      el = walker.nextNode();
    }
    return acc;
  }

  window.__clock = {
    /** Выставить время кадра и привести всю страницу в состояние этого момента. */
    seek(tSeconds: number): void {
      now = tSeconds * 1000;

      // 1. Web Animations во всех корнях, включая shadow DOM.
      for (const r of roots()) {
        for (const a of r.getAnimations ? r.getAnimations() : []) {
          try {
            a.pause();
            a.currentTime = now;
          } catch {
            /* анимация могла завершиться */
          }
        }
      }

      // 2. SVG SMIL — своя шкала времени, в секундах.
      for (const svg of document.querySelectorAll("svg")) {
        try {
          svg.pauseAnimations();
          svg.setCurrentTime(tSeconds);
        } catch {
          /* не все svg поддерживают SMIL */
        }
      }

      // 3. Композиция, если она объявила себя функцией времени.
      if (typeof window.renderAt === "function") window.renderAt(tSeconds);

      // 4. Отложенные колбэки анимации.
      flushRaf(now);
    },
    now: () => now,
    realNow: realPerfNow,
  };
})();
