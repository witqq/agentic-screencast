// Слой композиции живёт в браузере, но вызывается из узла через
// `page.evaluate`. Объявления нужны обеим сторонам: в браузерной части
// они лежат в `src/browser/globals.d.ts`, здесь — их узловой двойник.
// Держать один файл на обе части нельзя: браузерная часть собирается
// отдельным проходом с библиотекой DOM и без типов узла.

interface Window {
  // Часы внедряются `addInitScript` во все кадры страницы, поэтому здесь
  // они обязательны. Осторожное `?.` в обходе вложенных кадров остаётся:
  // кадр может быть о чужом происхождении и до внедрения не дожить.
  __clock: { seek(t: number): void; now(): number; realNow(): number };
  __stage: {
    mount(scene: unknown): void;
    renderAt(t: number): void;
    targetRect(): { left: number; top: number; width: number; height: number } | null;
    readonly scene: { target?: string; mustRead?: string; duration?: number } | null;
  };
  renderAt?: (t: number) => void;
}
