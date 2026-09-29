// Слой композиции читает атрибуты страницы (`data-type`, `data-kinetic`, `data-at`) только у
// страницы, отданной ему меткой `<html data-sc-page>`. У чужой вёрстки те же имена значат своё, и
// без метки слой её текст не набирает и не собирает.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const BODY = `<h1 id="t" data-type="title" data-at="0.2s">A heading typed in place</h1>`;

async function shownAt(html: string, t: number): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), "sc-mark-"));
  const page = join(dir, "p.html");
  writeFileSync(page, html);
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
    for (const f of ["clock.js", "stage.js"]) await ctx.addInitScript({ content: readFileSync(resolve(HERE, "..", "..", "browser", f), "utf8") });
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(page).href, { waitUntil: "load" });
    await p.evaluate((s) => (window as unknown as { __stage: { mount(x: unknown): void } }).__stage.mount(s),
      { id: "p", page, duration: 6, beats: 1, starts: [0], caption: "" });
    await p.evaluate((tt) => (window as unknown as { __clock: { seek(t: number): void } }).__clock.seek(tt), t);
    return await p.evaluate(() => (document.getElementById("t") as HTMLElement).innerText.trim());
  } finally { await browser.close(); }
}

test("the layer types a marked page's data-type and leaves an unmarked page's text whole", async () => {
  const full = "A heading typed in place";
  const marked = await shownAt(`<!doctype html><html data-sc-page><body>${BODY}</body></html>`, 0.5);
  assert.ok(marked.length < full.length, `a marked page is typed: «${marked}» at 0.5 s`);
  assert.equal(await shownAt(`<!doctype html><html><body>${BODY}</body></html>`, 0.5), full, "an unmarked page is not the layer's to type");
});
