/**
 * Live Playwright capture. The locator action is the source of truth for both
 * the UI change and its visible cursor/click annotation in the same video.
 * No authored timeline or frame coordinates are involved.
 */
import { chromium, type BrowserContext, type BrowserContextOptions, type Locator,
  type Page } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { cardHold, parseOverlay, type OverlayCard } from "./overlay.js";
import { installCaptureOverlay } from "./capture-overlay.js";
import { aliasedFonts } from "./fonts.js";
import { resolveTheme, themeFingerprint, type ThemeInput, type ThemeVars } from "./theme.js";

const require = createRequire(import.meta.url);
const FFMPEG = require("ffmpeg-static") as string;

export type CaptureCard = Omit<OverlayCard, "at" | "hold">;

/** Наезд живой камеры на элемент во время записи. */
export interface FocusOptions {
  /** увеличение, 1.2–3; умолчание 1.7 */
  scale?: number;
  /** длительность наезда и возврата, секунды; умолчание 0.9 */
  move?: number;
  /** затемнить всё вокруг элемента; умолчание — да */
  dim?: boolean;
  /** сколько держать после действия, секунды; умолчание 1.2 */
  hold?: number;
}

/**
 * Отметки дубля: время от нуля записи, след кликов и обрезанное начало. Лежат
 * рядом с роликом (`<ролик>.marks.json`), и сценарий ссылается на отметку как
 * `@имя`, а видеосцена с `autoZoom` берёт отсюда клики.
 */
export interface TakeMarks {
  version: 1;
  /** сколько секунд пустого начала срезано; все времена уже без него */
  trimmed: number;
  marks: Record<string, number>;
  clicks: Array<{ t: number; x: number; y: number }>;
  size: { width: number; height: number };
  /** тема, которой нарисован слой дубля (курсор, клик, клавиши, карточка) */
  theme?: { id: string; name?: string };
  /** путь курсора: секунды от нуля записи и точка в долях кадра */
  path?: Array<{ t: number; x: number; y: number }>;
  /** действия дубля: вид, начало и конец, прямоугольник элемента в долях кадра */
  actions?: Array<{ kind: TakeActionKind; t: number; end: number; rect?: TakeRect }>;
  /** интервалы наезда и возврата камеры, уже впечённые в кадры дубля */
  cameraMoves?: Array<{ from: number; to: number }>;
  /** прямоугольники элементов у отметок, названных с локатором: `take.mark(name, locator)` */
  rects?: Record<string, TakeRect>;
}

/** Прямоугольник элемента в долях кадра: [слева, сверху, ширина, высота]. */
export type TakeRect = [number, number, number, number];
export type TakeActionKind = "click" | "type" | "press" | "drag" | "range" | "hover";

export interface CaptureAction {
  /** Wait for a visible result instead of estimating how long the app needs. */
  until?: Locator;
  /** press(): show the key caps for this key (overrides the take's showKeys). */
  showKeys?: boolean;
  /** click(): deliver the click to the target even when another layer lies over it
   * (Playwright would refuse: "element intercepts pointer events"). */
  force?: boolean;
}

export interface CapturePage {
  readonly page: Page;
  readonly output: string;
  click(target: Locator, options?: CaptureAction): Promise<void>;
  /** Click a point of the viewport, in CSS pixels: the cursor travels there and clicks with the
   * real mouse. With `target`, the click is delivered to that element at the point even when a
   * layer lies over it — a canvas under a transparent overlay. */
  clickAt(x: number, y: number, options?: CaptureAction & { target?: Locator }): Promise<void>;
  /** Move a native range input to a semantic fraction of its track. */
  range(target: Locator, fraction: number, options?: CaptureAction): Promise<void>;
  hover(target: Locator, options?: CaptureAction): Promise<void>;
  /** Clear, focus, and enter visible keystrokes; password fields are refused. */
  type(target: Locator, value: string, options?: CaptureAction): Promise<void>;
  press(target: Locator, key: string, options?: CaptureAction): Promise<void>;
  drag(from: Locator, to: Locator, options?: CaptureAction): Promise<void>;
  waitFor(target: Locator): Promise<void>;
  /** A readable card over the live page; time is computed from its text. */
  card(card: CaptureCard): Promise<void>;
  /** Keep a card visible while real locator actions run under it. */
  withCard(card: CaptureCard, action: () => Promise<void>): Promise<void>;
  /** Push the live page in on a locator and dim everything around it, during the recording. */
  focus(target: Locator, options?: FocusOptions): Promise<void>;
  /** Return from a focus to the whole page. */
  unfocus(options?: { move?: number }): Promise<void>;
  /** Focus a locator, run real actions under the focus, hold, and return. */
  withFocus(target: Locator, action: () => Promise<void>, options?: FocusOptions): Promise<void>;
  /** Name this moment of the take; the scenario can cut, slow or focus at `@name`. With a locator
   * the take also records that element's rectangle, so marks and focuses can aim at `@name`
   * without measuring coordinates. */
  mark(name: string, target?: Locator): Promise<void>;
  /** Place an explanation beside a real locator without authored coordinates. */
  withFocusCard(target: Locator, card: CaptureCard, action: () => Promise<void>): Promise<void>;
  /** Save the WebM. Does not close the caller's page or browser. */
  finish(): Promise<string>;
}

export interface CaptureOptions {
  output: string;
  /** Defaults to the page viewport. Playwright preserves its aspect ratio. */
  size?: { width: number; height: number };
  /** Cut the blank frames the recording starts with (default true). */
  trimStart?: boolean;
  /** Show the keys that press() sends as key caps on screen (default true). */
  showKeys?: boolean;
  /** Theme of the take's own layer — cursor, click, key caps, cards: a theme name or
   * `{ preset, ...variables }`, as in the scenario header (default neutral). Record the
   * take in the theme of the scene that shows it; lint names a take recorded in another. */
  theme?: ThemeInput;
  /** How a click shows: a ripple (default), a soft spot of light, or an echo of two ripples. */
  click?: "ripple" | "spot" | "echo";
}

export interface TakeOptions extends CaptureOptions {
  viewport?: { width: number; height: number };
  /** Device pixels per CSS pixel of the recorded video (1–4, default 1). A phone layout needs its
   * small CSS width, and the screencast is sized in CSS pixels: scale 2.5 at a 432×768 viewport
   * records a sharp 1080×1920 video instead of a 432×768 one. */
  scale?: number;
  contextOptions?: Omit<BrowserContextOptions, "viewport" | "recordVideo">;
  /** Authentication and setup run before the recording starts. */
  prepare?: (page: Page, context: BrowserContext) => Promise<void>;
}

const afterActionMs = 720;

function outputPath(path: string): string {
  if (!path.toLowerCase().endsWith(".webm"))
    throw new Error("Playwright screencast output must end in .webm");
  return resolve(path);
}

function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function cardHtml(card: OverlayCard, viewport: { width: number; height: number }, theme: ThemeVars,
  anchor?: { x: number; y: number; width: number; height: number },
  phase: "enter" | "exit" = "enter"): string {
  let horizontal = card.position?.endsWith("left") ? "left:var(--sc-edge)" : "right:var(--sc-edge)";
  let vertical = card.position?.startsWith("top") ? "top:var(--sc-edge)" : "bottom:var(--sc-edge)";
  if (card.position === "center") {
    horizontal = "left:50%";
    vertical = "top:50%;translate:-50% -50%";
  }
  if (anchor) {
    const width = Math.min(460, viewport.width * 0.42);
    const height = card.body ? 150 : 100;
    const gap = 24;
    const rightFits = anchor.x + anchor.width + gap + width <= viewport.width - gap;
    const leftFits = anchor.x - width - gap >= gap;
    const left = rightFits ? anchor.x + anchor.width + gap
      : leftFits ? anchor.x - width - gap
        : Math.max(gap, Math.min(viewport.width - width - gap, anchor.x + anchor.width / 2 - width / 2));
    const top = rightFits || leftFits
      ? Math.max(gap, Math.min(viewport.height - height - gap,
        anchor.y + anchor.height / 2 - height / 2))
      : anchor.y - height - gap >= gap ? anchor.y - height - gap
        : Math.min(viewport.height - height - gap, anchor.y + anchor.height + gap);
    horizontal = `left:${Math.round(left)}px`;
    vertical = `top:${Math.round(top)}px`;
  }
  const enter = card.enter ?? 0.65;
  const exit = card.exit ?? 0.45;
  const start = card.motion === "pop" ? "scale(.84)"
    : card.motion === "glide" ? "translateX(38px)" : "translateY(22px)";
  const total = Array.from(card.title + (card.body ?? "")).length;
  const typingTime = Math.min(3.2, total / 34);
  const glyphs = (value: string, offset: number): string => phase === "enter" && card.reveal === "type"
    ? Array.from(value).map((character, i) => `<span class="glyph" style="animation-delay:${((card.enter ?? 0.65) * 0.35 + (offset + i) / Math.max(1, total) * typingTime).toFixed(3)}s">${escapeHtml(character)}</span>`).join("")
    : escapeHtml(value);
  return `<style>@keyframes sc-card-enter{from{opacity:0;transform:${start}}to{opacity:1;transform:none}}`
    + `@keyframes sc-card-exit{from{opacity:1;transform:none}to{opacity:0;transform:translateY(-8px)}}`
    + `.glyph{opacity:0;animation:sc-glyph .01s linear forwards}`
    + `@keyframes sc-glyph{to{opacity:1}}</style>`
    // Карточка дубля — та же карточка, что у слоя композиции: вся из переменных темы дубля.
    + `<div style="${Object.entries(theme).map(([k, v]) => `${k}:${v}`).join(";").replaceAll('"', "&quot;")};--u:${(Math.max(viewport.width, 1280) / 100).toFixed(3)}px;`
    + `position:fixed;${horizontal};${vertical};width:min(460px,42vw);`
    + "box-sizing:border-box;padding:var(--sc-pad-y) var(--sc-pad-x);border-radius:var(--sc-card-radius);"
    + "background:var(--sc-card-bg);border:var(--sc-hairline) solid var(--sc-card-line);box-shadow:var(--sc-card-shadow);"
    + "color:var(--sc-card-ink);font-family:var(--sans);"
    + `pointer-events:none;z-index:2147483000;animation:sc-card-${phase} ${phase === "enter" ? enter : exit}s ease-out both">`
    + `<div style="font-size:26px;line-height:1.17;font-weight:var(--display-weight,740);white-space:pre-wrap;font-family:var(--display)">${glyphs(card.title, 0)}</div>`
    + (card.body ? `<div style="margin-top:9px;font-size:17px;line-height:1.38;color:var(--sc-card-body);white-space:pre-wrap">${glyphs(card.body, Array.from(card.title).length)}</div>` : "")
    + "</div>";
}

/** Attach to an existing page after login/setup. Native Playwright decorations
 * are generated from actual locator actions, including its auto-scroll. */
export async function capturePage(page: Page, options: CaptureOptions): Promise<CapturePage> {
  const capOptions = options;
  if (page.isClosed()) throw new Error("Cannot capture a closed page");
  const output = outputPath(options.output);
  const size = options.size ?? page.viewportSize();
  if (!size) throw new Error("Capture requires a fixed page viewport or explicit size");
  mkdirSync(dirname(output), { recursive: true });
  // Install before capture and again in every navigated document. The visual
  // click is painted on pointerdown, not Playwright's pre-action annotation.
  // Тема слоя дубля: имя или набор, как в шапке сценария; без неё — ночная из таблицы тем.
  const theme = resolveTheme(options.theme);
  // Слой дубля рисуется шрифтами темы под своими именами (`aliasedFonts`), чтобы не трогать шрифты
  // продукта; отпечаток темы в файле отметок считается по самой теме.
  const fonts = aliasedFonts(theme);
  const layer = { theme: fonts.theme, fontCss: fonts.css, ...(options.click ? { click: options.click } : {}) };
  if (options.click && !["ripple", "spot", "echo"].includes(options.click)) throw new Error("click: expected ripple | spot | echo");
  const initScript = await page.addInitScript(installCaptureOverlay, layer);
  await page.evaluate(installCaptureOverlay, layer);
  // addInitScript covers future documents only; setup may already have loaded
  // embedded frames before capturePage is called.
  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    try { await frame.evaluate(installCaptureOverlay, layer); }
    catch (error) { if (!frame.isDetached()) throw error; }
  }
  // Ошибка страницы во время дубля — отказ съёмки, а не пауза в кадре: анимация,
  // которая не собралась, выглядит на видео как задуманная неподвижность.
  const pageErrors: string[] = [];
  const onError = (error: Error): void => { pageErrors.push(error.message); };
  page.on("pageerror", onError);
  await page.screencast.start({ path: output, size });
  // Ноль записи — момент, когда запись пошла; отметки и клики отсчитываются от
  // него, а не от часов сценария, которые начинают раньше или позже.
  const zero = Date.now();
  const pageZero = await page.evaluate(() => performance.now());
  const marks: Record<string, number> = {};
  // Что нужно монтажу без ручных замеров: путь курсора, действия с их элементами и прямоугольники
  // элементов у отметок. Время — часы съёмки от нуля записи, как у отметок.
  const path: Array<{ t: number; x: number; y: number }> = [];
  const actions: NonNullable<TakeMarks["actions"]> = [];
  const cameraMoves: NonNullable<TakeMarks["cameraMoves"]> = [];
  const rects: Record<string, TakeRect> = {};
  const pending: Array<Promise<void>> = [];
  const now = (): number => (Date.now() - zero) / 1000;
  // Прямоугольник того, что элемент показывает: его коробка вместе с видимыми потомками, которые
  // из неё выходят (значок у угла), — как у наезда слоя композиции (`contentRect` в browser/stage.ts).
  const rectOf = async (target: Locator): Promise<TakeRect | undefined> => {
    const box = await target.evaluate((node) => {
      const b = node.getBoundingClientRect();
      if (b.width < 1 && b.height < 1) return null;
      let x0 = b.left, y0 = b.top, x1 = b.right, y1 = b.bottom;
      if (getComputedStyle(node).overflow === "visible") {
        for (const d of node.querySelectorAll("*")) {
          const cs = getComputedStyle(d);
          if (cs.display === "none" || cs.visibility === "hidden") continue;
          const r = d.getBoundingClientRect();
          if (r.width < 1 || r.height < 1) continue;
          x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
        }
      }
      return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
    }).catch(() => null);
    const viewport = page.viewportSize() ?? size;
    if (!box) return undefined;
    return [box.x / viewport.width, box.y / viewport.height, box.width / viewport.width, box.height / viewport.height];
  };
  /** Действие дубля: вид, элемент (его прямоугольник до действия), начало и конец. */
  const act = async (kind: TakeActionKind, target: Locator | null, run: () => Promise<void>): Promise<void> => {
    const t = now();
    const rect = target ? await rectOf(target).catch(() => undefined) : undefined;
    await run();
    actions.push({ kind, t, end: now(), ...(rect ? { rect } : {}) });
  };
  let finished = false;

  const moveTo = async (target: Locator, fraction = 0.5): Promise<{ x: number; y: number }> => {
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (!box) throw new Error("Capture target has no visible bounding box");
    const viewport = page.viewportSize() ?? size;
    const x = Math.max(0, Math.min(viewport.width - 1, box.x + box.width * fraction));
    const y = Math.max(0, Math.min(viewport.height - 1, box.y + box.height / 2));
    await moveToPoint(x, y);
    return { x, y };
  };
  const moveToPoint = async (x: number, y: number): Promise<void> => {
    const viewport = page.viewportSize() ?? size;
    const previous = await page.evaluate(() => {
      const w = window as unknown as { __agenticScreencastCapture_v1?: {
        position: { x: number; y: number } | null } };
      return w.__agenticScreencastCapture_v1?.position ?? null;
    });
    const from = previous ?? { x: viewport.width * 0.18, y: viewport.height * 0.22 };
    await page.mouse.move(from.x, from.y);
    path.push({ t: now(), x: from.x / viewport.width, y: from.y / viewport.height });
    const dist = Math.hypot(x - from.x, y - from.y);
    const steps = Math.max(8, Math.min(24, Math.ceil(dist / 40)));
    // Рука ведёт мышь дугой, а не по линейке: точка изгиба сдвинута поперёк пути на восьмую его
    // длины, в сторону, которая чередуется от движения к движению.
    const bow = (path.length % 2 ? 1 : -1) * Math.min(90, dist * 0.12);
    const nx = dist ? -(y - from.y) / dist : 0, ny = dist ? (x - from.x) / dist : 0;
    const mx = (from.x + x) / 2 + nx * bow, my = (from.y + y) / 2 + ny * bow;
    for (let i = 1; i <= steps; i++) {
      const p = i / steps;
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const px = Math.max(0, Math.min(viewport.width - 1, (1 - e) * (1 - e) * from.x + 2 * (1 - e) * e * mx + e * e * x));
      const py = Math.max(0, Math.min(viewport.height - 1, (1 - e) * (1 - e) * from.y + 2 * (1 - e) * e * my + e * e * y));
      await page.mouse.move(px, py);
      path.push({ t: now(), x: px / viewport.width, y: py / viewport.height });
      await page.waitForTimeout(23);
    }
    // Настоящие pointermove браузер отдаёт странице к следующему кадру, а клик, доставленный
    // элементу, приходит сразу: без ожидания запоздавшие движения уводили курсор назад на
    // середину пути, и волна клика вставала в кадре отдельно от курсора.
    await page.waitForFunction(([tx, ty]) => {
      const p = (window as unknown as { __agenticScreencastCapture_v1?: { position: { x: number; y: number } | null } })
        .__agenticScreencastCapture_v1?.position;
      return Boolean(p && Math.abs(p.x - tx!) < 1.5 && Math.abs(p.y - ty!) < 1.5);
    }, [x, y], { timeout: 1000 }).catch(() => undefined);
  };
  // Клик сквозь перехватывающий слой: настоящая мышь попала бы в слой сверху, поэтому
  // последовательность событий доставляется самому элементу в той же точке. Слой дубля слушает
  // документ на погружении и рисует волну и след клика так же, как от мыши.
  const deliver = async (target: Locator, x: number, y: number): Promise<void> => {
    await target.evaluate((el, p) => {
      const base = { bubbles: true, cancelable: true, composed: true, clientX: p.x, clientY: p.y, button: 0, view: window };
      const pointer = { ...base, pointerId: 1, pointerType: "mouse", isPrimary: true };
      el.dispatchEvent(new PointerEvent("pointerdown", { ...pointer, buttons: 1 }));
      el.dispatchEvent(new MouseEvent("mousedown", { ...base, buttons: 1 }));
      el.dispatchEvent(new PointerEvent("pointerup", { ...pointer, buttons: 0 }));
      el.dispatchEvent(new MouseEvent("mouseup", { ...base, buttons: 0 }));
      el.dispatchEvent(new MouseEvent("click", { ...base, buttons: 0, detail: 1 }));
    }, { x, y });
  };

  // Готовность элемента без движения мыши. Пробный клик Playwright (`trial`) двигает настоящую
  // мышь к цели, и курсор дубля прыгал к ней раньше, чем начинал свой путь.
  const ready = async (target: Locator): Promise<void> => {
    await target.waitFor({ state: "visible" });
    await target.scrollIntoViewIfNeeded();
    if (!(await target.isEnabled())) throw new Error("Capture target is disabled");
  };
  const settle = async (options?: CaptureAction): Promise<void> => {
    if (options?.until) await options.until.waitFor({ state: "visible" });
    await page.waitForTimeout(afterActionMs);
  };
  const active = (): void => {
    if (finished) throw new Error("Capture already finished");
    if (pageErrors.length) throw new Error(`page error during the take: ${pageErrors[0]}`);
  };
  const overlayCall = async (fn: string, ...args: unknown[]): Promise<void> => {
    await page.evaluate(([name, rest]) => {
      const st = (window as unknown as Record<string, Record<string, (...a: unknown[]) => void>>).__agenticScreencastCapture_v1;
      st?.[name as string]?.(...(rest as unknown[]));
    }, [fn, args] as const);
  };
  const keyLabel = (key: string): string => key.split("+").map((k) => ({ Meta: "⌘", Control: "Ctrl", Shift: "⇧",
    Alt: "⌥", Enter: "Enter ⏎", Escape: "Esc", ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→",
    Backspace: "⌫", Tab: "Tab ⇥", " ": "Space" } as Record<string, string>)[k] ?? (k.length === 1 ? k.toUpperCase() : k)).join("+");
  const focus = async (target: Locator, options: FocusOptions = {}): Promise<void> => {
    active();
    const scale = options.scale ?? 1.7;
    if (!(scale >= 1.2 && scale <= 3)) throw new Error("focus scale must be 1.2–3");
    const ms = Math.round((options.move ?? 0.9) * 1000);
    await target.scrollIntoViewIfNeeded();
    const from = now();
    await target.evaluate((el, o) => {
      const st = (window as unknown as Record<string, { focus?: (e: Element, x: unknown) => void }>).__agenticScreencastCapture_v1;
      st?.focus?.(el, o);
    }, { scale, ms, dim: options.dim ?? true });
    await page.waitForTimeout(ms + 120);
    cameraMoves.push({ from, to: now() });
  };
  const unfocus = async (options: { move?: number } = {}): Promise<void> => {
    active();
    const ms = Math.round((options.move ?? 0.9) * 1000);
    const from = now();
    await overlayCall("unfocus", ms);
    await page.waitForTimeout(ms + 120);
    cameraMoves.push({ from, to: now() });
  };
  const withCard = async (card: CaptureCard, action: () => Promise<void>,
    anchor?: { x: number; y: number; width: number; height: number }): Promise<void> => {
    active();
    if (card.position === "near-focus" && !anchor)
      throw new Error("near-focus requires withFocusCard(target, card, action)");
    const checked = parseOverlay(JSON.stringify({ cards: [{ at: 0, ...card }] })).cards![0]!;
    const ms = Math.ceil(cardHold(checked) * 1000);
    const viewport = page.viewportSize() ?? size;
    const overlay = await page.screencast.showOverlay(cardHtml(checked, viewport, fonts.theme, anchor));
    const shownAt = Date.now();
    try {
      await action();
      const remaining = ms - (Date.now() - shownAt);
      if (remaining > 0) await page.waitForTimeout(remaining);
    } finally {
      let leaving: Awaited<ReturnType<typeof page.screencast.showOverlay>> | undefined;
      try { leaving = await page.screencast.showOverlay(cardHtml(checked, viewport, fonts.theme, anchor, "exit")); }
      finally { await overlay.dispose(); }
      if (leaving) {
        try { await page.waitForTimeout(Math.ceil((checked.exit ?? 0.45) * 1000)); }
        finally { await leaving.dispose(); }
      }
    }
  };

  return {
    page, output,
    async click(target, options) {
      active();
      if (options?.force) {
        await act("click", target, async () => { const at = await moveTo(target); await deliver(target, at.x, at.y); });
        await settle(options);
        return;
      }
      await ready(target);
      await act("click", target, async () => { await moveTo(target); await target.click(); });
      await settle(options);
    },
    async clickAt(x, y, options) {
      active();
      const viewport = page.viewportSize() ?? size;
      if (!(x >= 0 && y >= 0 && x < viewport.width && y < viewport.height))
        throw new Error(`clickAt(${x}, ${y}) is outside the ${viewport.width}×${viewport.height} viewport`);
      await act("click", options?.target ?? null, async () => {
        await moveToPoint(x, y);
        if (options?.target) await deliver(options.target, x, y);
        else await page.mouse.click(x, y);
      });
      await settle(options);
    },
    async range(target, fraction, options) {
      active();
      if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1)
        throw new Error("Range fraction must be between 0 and 1");
      if ((await target.getAttribute("type"))?.toLowerCase() !== "range")
        throw new Error("Capture range() requires input[type=range]");
      await ready(target);
      await act("range", target, async () => {
        await moveTo(target, fraction);
        const box = await target.boundingBox();
        if (!box) throw new Error("Capture range has no visible bounding box");
        await target.click({ position: { x: Math.max(2, Math.min(box.width - 2, box.width * fraction)),
          y: box.height / 2 } });
      });
      await settle(options);
    },
    async hover(target, options) {
      active(); await act("hover", target, async () => { await moveTo(target); await target.hover(); }); await settle(options);
    },
    async type(target, value, options) {
      active();
      if ((await target.getAttribute("type"))?.toLowerCase() === "password")
        throw new Error("Do not record password entry; authenticate before capture starts");
      await ready(target);
      await act("type", target, async () => {
        await moveTo(target);
        await target.click();
        await target.fill("");
        await target.pressSequentially(value, { delay: 28 });
      });
      await settle(options);
    },
    async press(target, key, options) {
      active();
      if (options?.showKeys ?? capOptions.showKeys ?? true) await overlayCall("key", keyLabel(key));
      await act("press", target, async () => { await target.press(key); });
      await settle(options);
    },
    async drag(from, to, options) {
      active(); await act("drag", from, async () => { await moveTo(from); await from.dragTo(to); }); await settle(options);
    },
    async waitFor(target) { active(); await target.waitFor({ state: "visible" }); await settle(); },
    async card(card) { await withCard(card, async () => {}); },
    withCard,
    async withFocusCard(target, card, action) {
      active();
      await target.scrollIntoViewIfNeeded();
      const box = await target.boundingBox();
      if (!box) throw new Error("Focus card target has no visible bounding box");
      await withCard({ ...card, position: "near-focus" }, action, box);
    },
    focus,
    unfocus,
    async withFocus(target, action, options = {}) {
      await focus(target, options);
      await action();
      active();
      await page.waitForTimeout(Math.round((options.hold ?? 1.2) * 1000));
      await unfocus({ move: options.move ?? 0.9 });
    },
    mark(name, target) {
      active();
      if (!/^[A-Za-z][\w-]*$/.test(name)) throw new Error(`mark name «${name}»: letters, digits, - and _`);
      marks[name] = (Date.now() - zero) / 1000;
      if (!target) return Promise.resolve();
      const done = rectOf(target).then((r) => {
        if (!r) throw new Error(`mark ${name}: the element has no visible bounding box`);
        rects[name] = r;
      });
      pending.push(done);
      return done;
    },
    async finish() {
      if (finished) return output;
      finished = true;
      await Promise.all(pending);
      await page.waitForTimeout(350);
      const trace = await page.evaluate(() => {
        const st = (window as unknown as { __agenticScreencastCapture_v1?: { trace: Array<{ kind: string; x: number; y: number; at: number }> } })
          .__agenticScreencastCapture_v1;
        return st?.trace ?? [];
      }).catch(() => []);
      await initScript.dispose();
      await page.screencast.stop();
      page.off("pageerror", onError);
      if (statSync(output).size === 0) throw new Error(`Empty screencast: ${output}`);
      const trimmed = capOptions.trimStart === false ? 0 : trimBlankStart(output);
      const viewport = page.viewportSize() ?? size;
      const round = (v: number): number => Math.round(v * 1000) / 1000;
      const file: TakeMarks = { version: 1, trimmed: round(trimmed),
        marks: Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, round(Math.max(0, v - trimmed))])),
        clicks: trace.filter((e) => e.kind === "down")
          .map((e) => ({ t: round(Math.max(0, (e.at - pageZero) / 1000 - trimmed)),
            x: round(e.x / viewport.width), y: round(e.y / viewport.height) })),
        size: viewport, theme: themeFingerprint(theme),
        path: path.map((p) => ({ t: round(Math.max(0, p.t - trimmed)), x: round(p.x), y: round(p.y) })),
        actions: actions.map((a) => ({ ...a, t: round(Math.max(0, a.t - trimmed)), end: round(Math.max(0, a.end - trimmed)),
          ...(a.rect ? { rect: a.rect.map(round) as TakeRect } : {}) })),
        cameraMoves: cameraMoves.map((move) => ({ from: round(Math.max(0, move.from - trimmed)),
          to: round(Math.max(0, move.to - trimmed)) })),
        ...(Object.keys(rects).length ? { rects: Object.fromEntries(Object.entries(rects).map(([k, v]) => [k, v.map(round) as TakeRect])) } : {}) };
      writeFileSync(`${output}.marks.json`, JSON.stringify(file, null, 1));
      if (pageErrors.length) throw new Error(`page error during the take: ${pageErrors[0]}`);
      return output;
    },
  };
}

/** One-call browser ownership for agents that do not already have a page. */
export async function recordTake(
  options: TakeOptions,
  perform: (capture: CapturePage) => Promise<void>,
): Promise<string> {
  const viewport = options.viewport ?? { width: 1280, height: 720 };
  const scale = options.scale ?? 1;
  if (!(scale >= 1 && scale <= 4)) throw new Error("recordTake scale: expected 1–4 device pixels per CSS pixel");
  // Кадры записи Chromium отдаёт в CSS-пикселях: множитель контекста (deviceScaleFactor) делает
  // страницу чётче, но запись остаётся размером с viewport, а запрошенный больший размер кладёт
  // картинку в угол. Рисовать в пикселях устройства весь браузер заставляет только флаг запуска.
  const browser = await chromium.launch(scale === 1 ? {} : { args: [`--force-device-scale-factor=${scale}`] });
  try {
    const context = await browser.newContext({ ...options.contextOptions, viewport,
      ...(scale === 1 ? {} : { deviceScaleFactor: scale }) });
    try {
      const page = await context.newPage();
      if (options.prepare) await options.prepare(page, context);
      const capture = await capturePage(page, { output: options.output,
        size: options.size ?? { width: Math.round(viewport.width * scale), height: Math.round(viewport.height * scale) },
        ...(options.trimStart !== undefined ? { trimStart: options.trimStart } : {}),
        ...(options.showKeys !== undefined ? { showKeys: options.showKeys } : {}),
        ...(options.theme !== undefined ? { theme: options.theme } : {}),
        ...(options.click !== undefined ? { click: options.click } : {}) });
      try { await perform(capture); }
      finally { await capture.finish(); }
      return capture.output;
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

/**
 * Срезать пустое начало записи: запись идёт с момента создания страницы, и
 * первые кадры — ровная заливка, пока приложение ничего не нарисовало. Первый
 * кадр с содержанием — тот, где яркость перестаёт быть ровной. Возвращает,
 * сколько секунд срезано.
 */
export function trimBlankStart(file: string): number {
  const fps = 25;
  const raw = execFileSync(FFMPEG, ["-nostdin", "-loglevel", "error", "-t", "10", "-i", file,
    "-vf", `fps=${fps},scale=64:36,format=gray`, "-f", "rawvideo", "-"], { maxBuffer: 64 * 1024 * 1024 });
  const size = 64 * 36;
  let first = -1;
  for (let f = 0; f * size < raw.length; f++) {
    const px = raw.subarray(f * size, (f + 1) * size);
    let sum = 0, sq = 0;
    for (const v of px) { sum += v; sq += v * v; }
    const mean = sum / px.length;
    if (Math.sqrt(Math.max(0, sq / px.length - mean * mean)) > 3) { first = f; break; }
  }
  if (first <= 0) return 0;
  const cut = first / fps;
  const tmp = `${file}.trim.webm`;
  // Копия потока резала бы только по опорному кадру, а их в записи Playwright мало:
  // срез разошёлся бы с `cut`, от которого отсчитаны отметки. Поэтому перекодирование,
  // но почти без потерь: запись и так сжата, и второе поколение не должно быть заметно.
  execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-ss", cut.toFixed(3), "-i", file,
    "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "12", "-deadline", "good", "-cpu-used", "2", "-row-mt", "1", "-an", tmp]);
  renameSync(tmp, file);
  return cut;
}
