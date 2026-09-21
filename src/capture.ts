/**
 * Live Playwright capture. The locator action is the source of truth for both
 * the UI change and its visible cursor/click annotation in the same video.
 * No authored timeline or frame coordinates are involved.
 */
import { chromium, type BrowserContext, type BrowserContextOptions, type Locator,
  type Page } from "playwright";
import { mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { cardHold, parseOverlay, type OverlayCard } from "./overlay.js";
import { installCaptureOverlay } from "./capture-overlay.js";

export type CaptureCard = Omit<OverlayCard, "at" | "hold">;

export interface CaptureAction {
  /** Wait for a visible result instead of estimating how long the app needs. */
  until?: Locator;
}

export interface CapturePage {
  readonly page: Page;
  readonly output: string;
  click(target: Locator, options?: CaptureAction): Promise<void>;
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
  /** Place an explanation beside a real locator without authored coordinates. */
  withFocusCard(target: Locator, card: CaptureCard, action: () => Promise<void>): Promise<void>;
  /** Save the WebM. Does not close the caller's page or browser. */
  finish(): Promise<string>;
}

export interface CaptureOptions {
  output: string;
  /** Defaults to the page viewport. Playwright preserves its aspect ratio. */
  size?: { width: number; height: number };
}

export interface TakeOptions extends CaptureOptions {
  viewport?: { width: number; height: number };
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

function cardHtml(card: OverlayCard, viewport: { width: number; height: number },
  anchor?: { x: number; y: number; width: number; height: number }): string {
  let horizontal = card.position?.endsWith("left") ? "left:30px" : "right:30px";
  let vertical = card.position?.startsWith("top") ? "top:30px" : "bottom:30px";
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
  const hold = card.hold ?? cardHold(card);
  const enterPct = ((card.enter ?? 0.65) / hold * 100).toFixed(2);
  const leavePct = (100 - (card.exit ?? 0.45) / hold * 100).toFixed(2);
  const start = card.motion === "pop" ? "scale(.84)"
    : card.motion === "glide" ? "translateX(38px)" : "translateY(22px)";
  const total = Array.from(card.title + (card.body ?? "")).length;
  const typingTime = Math.min(3.2, total / 34);
  const glyphs = (value: string, offset: number): string => card.reveal === "type"
    ? Array.from(value).map((character, i) => `<span class="glyph" style="animation-delay:${((card.enter ?? 0.65) * 0.35 + (offset + i) / Math.max(1, total) * typingTime).toFixed(3)}s">${escapeHtml(character)}</span>`).join("")
    : escapeHtml(value);
  return `<style>@keyframes sc-card{0%{opacity:0;transform:${start}}`
    + `${enterPct}%{opacity:1;transform:none}${leavePct}%{opacity:1;transform:none}`
    + `100%{opacity:0;transform:translateY(-8px)}}`
    + `.glyph{opacity:0;animation:sc-glyph .01s linear forwards}`
    + `@keyframes sc-glyph{to{opacity:1}}</style>`
    + `<div style="position:fixed;${horizontal};${vertical};width:min(460px,42vw);`
    + "box-sizing:border-box;padding:20px 22px 21px;border-radius:18px;"
    + "background:linear-gradient(135deg,rgba(9,24,44,.96),rgba(13,33,54,.93));"
    + "border:1px solid rgba(110,211,226,.58);box-shadow:0 18px 48px rgba(4,12,25,.42);"
    + "color:#f6fbff;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;"
    + `pointer-events:none;z-index:2147483000;animation:sc-card ${hold}s linear both">`
    + `<div style="font-size:26px;line-height:1.17;font-weight:740;white-space:pre-wrap">${glyphs(card.title, 0)}</div>`
    + (card.body ? `<div style="margin-top:9px;font-size:17px;line-height:1.38;color:#cce1ee;white-space:pre-wrap">${glyphs(card.body, Array.from(card.title).length)}</div>` : "")
    + "</div>";
}

/** Attach to an existing page after login/setup. Native Playwright decorations
 * are generated from actual locator actions, including its auto-scroll. */
export async function capturePage(page: Page, options: CaptureOptions): Promise<CapturePage> {
  if (page.isClosed()) throw new Error("Cannot capture a closed page");
  const output = outputPath(options.output);
  const size = options.size ?? page.viewportSize();
  if (!size) throw new Error("Capture requires a fixed page viewport or explicit size");
  mkdirSync(dirname(output), { recursive: true });
  // Install before capture and again in every navigated document. The visual
  // click is painted on pointerdown, not Playwright's pre-action annotation.
  const initScript = await page.addInitScript(installCaptureOverlay);
  await page.evaluate(installCaptureOverlay);
  await page.screencast.start({ path: output, size });
  let finished = false;

  const moveTo = async (target: Locator, fraction = 0.5): Promise<void> => {
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (!box) throw new Error("Capture target has no visible bounding box");
    const viewport = page.viewportSize() ?? size;
    const x = Math.max(0, Math.min(viewport.width - 1, box.x + box.width * fraction));
    const y = Math.max(0, Math.min(viewport.height - 1, box.y + box.height / 2));
    const previous = await page.evaluate(() => {
      const w = window as unknown as { __agenticScreencastCapture_v1?: {
        position: { x: number; y: number } | null } };
      return w.__agenticScreencastCapture_v1?.position ?? null;
    });
    const from = previous ?? { x: viewport.width * 0.18, y: viewport.height * 0.22 };
    await page.mouse.move(from.x, from.y);
    const steps = Math.max(6, Math.min(18, Math.ceil(Math.hypot(x - from.x, y - from.y) / 48)));
    for (let i = 1; i <= steps; i++) {
      const p = i / steps;
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      await page.mouse.move(from.x + (x - from.x) * eased, from.y + (y - from.y) * eased);
      await page.waitForTimeout(23);
    }
  };

  const settle = async (options?: CaptureAction): Promise<void> => {
    if (options?.until) await options.until.waitFor({ state: "visible" });
    await page.waitForTimeout(afterActionMs);
  };
  const active = (): void => {
    if (finished) throw new Error("Capture already finished");
  };
  const withCard = async (card: CaptureCard, action: () => Promise<void>,
    anchor?: { x: number; y: number; width: number; height: number }): Promise<void> => {
    active();
    if (card.position === "near-focus" && !anchor)
      throw new Error("near-focus requires withFocusCard(target, card, action)");
    const checked = parseOverlay(JSON.stringify({ cards: [{ at: 0, ...card }] })).cards![0]!;
    const ms = Math.ceil(cardHold(checked) * 1000);
    const overlay = await page.screencast.showOverlay(
      cardHtml(checked, page.viewportSize() ?? size, anchor));
    const shownAt = Date.now();
    try {
      await action();
      const remaining = ms - (Date.now() - shownAt);
      if (remaining > 0) await page.waitForTimeout(remaining);
    } finally {
      await overlay.dispose();
    }
    await page.waitForTimeout(350);
  };

  return {
    page, output,
    async click(target, options) {
      active();
      await target.click({ trial: true });
      await moveTo(target);
      await target.click();
      await settle(options);
    },
    async range(target, fraction, options) {
      active();
      if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1)
        throw new Error("Range fraction must be between 0 and 1");
      if ((await target.getAttribute("type"))?.toLowerCase() !== "range")
        throw new Error("Capture range() requires input[type=range]");
      await target.click({ trial: true });
      await moveTo(target, fraction);
      const box = await target.boundingBox();
      if (!box) throw new Error("Capture range has no visible bounding box");
      await target.click({ position: { x: Math.max(2, Math.min(box.width - 2, box.width * fraction)),
        y: box.height / 2 } });
      await settle(options);
    },
    async hover(target, options) {
      active(); await moveTo(target); await target.hover(); await settle(options);
    },
    async type(target, value, options) {
      active();
      if ((await target.getAttribute("type"))?.toLowerCase() === "password")
        throw new Error("Do not record password entry; authenticate before capture starts");
      await target.click({ trial: true });
      await moveTo(target);
      await target.click();
      await target.fill("");
      await target.pressSequentially(value, { delay: 28 });
      await settle(options);
    },
    async press(target, key, options) { active(); await target.press(key); await settle(options); },
    async drag(from, to, options) {
      active(); await moveTo(from); await from.dragTo(to); await settle(options);
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
    async finish() {
      if (finished) return output;
      finished = true;
      await page.waitForTimeout(350);
      await initScript.dispose();
      await page.screencast.stop();
      if (statSync(output).size === 0) throw new Error(`Empty screencast: ${output}`);
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
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ ...options.contextOptions, viewport });
    try {
      const page = await context.newPage();
      if (options.prepare) await options.prepare(page, context);
      const capture = await capturePage(page, { output: options.output,
        size: options.size ?? viewport });
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
