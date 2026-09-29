// Сцена report: страницу собирает agentic-report из своего Markdown, а слой композиции не путает
// её атрибуты со своими. У agentic-report `data-type="body"` — роль блока; прежде слой принимал её
// за набор текста, заголовки разделов пропадали, а тело набиралось по буквам.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
// Сначала реестр поставщиков: он и `source.ts` ссылаются друг на друга, как в самой команде.
import { BUILTIN } from "../../provider/index.js";
import { sceneSource } from "../../provider/report.js";

const reportProvider = BUILTIN.report!;

const HERE = dirname(fileURLToPath(import.meta.url));
// agentic-report требует свою версию узла; на старшей строке тест идёт, на младшей — пропускается с причиной.
const [major, minor] = process.versions.node.split(".").map(Number) as [number, number];
const nodeOk = major > 24 || (major === 24 && minor >= 18);

const REPORT = `---
contractVersion: 1
title: Release
language: en
---

# Release in numbers

::::::section{title="Speed" id="speed"}
Builds are **38% faster** after the cache moved next to the sources.
::::::
`;

test("a report scene's source gains the scene keys without losing the author's own", () => {
  assert.match(sceneSource(REPORT), /^---\n[\s\S]*\nreview: false\n---\n/u);
  assert.equal(sceneSource("---\nreview: true\n---\n# A\n"), "---\nreview: true\n---\n# A\n", "an author's key wins");
  assert.equal(sceneSource("# A\n"), "---\nreview: false\n---\n# A\n");
});

test("a report scene renders its sections whole, not typed by the stage", { skip: nodeOk ? false : "agentic-report needs Node 24.18+" }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-report-"));
  writeFileSync(join(dir, "report.md"), REPORT);
  const out = join(dir, "slides");
  const page = reportProvider.page!({ id: "r", provider: "report", kind: "report", fields: { report: "report.md" } } as never,
    out, { dir } as never);
  assert.match(readFileSync(page, "utf8"), /<html data-sc-foreign/u, "the page is marked as another compiler's");
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    for (const f of ["clock.js", "stage.js"]) await ctx.addInitScript({ content: readFileSync(resolve(HERE, "..", "..", "browser", f), "utf8") });
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(page).href, { waitUntil: "load" });
    await p.evaluate((s) => (window as unknown as { __stage: { mount(x: unknown): void } }).__stage.mount(s),
      { id: "r", page, duration: 4, beats: 1, starts: [0], caption: "" });
    await p.evaluate(() => (window as unknown as { __clock: { seek(t: number): void } }).__clock.seek(0.2));
    const seen = await p.evaluate(() => ({ title: document.querySelector("#speed h2")?.textContent ?? null,
      body: document.querySelector("#speed")?.textContent ?? "" }));
    assert.equal(seen.title, "Speed", "the section keeps its heading");
    assert.match(seen.body, /after the cache moved next to the sources\./u, "the body stands whole at 0.2 s");
  } finally { await browser.close(); }
});
