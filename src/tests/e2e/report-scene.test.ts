// Сцена report: страницу собирает agentic-report из своего Markdown, а слой композиции не путает
// её атрибуты со своими. У agentic-report `data-type="body"` — роль блока; слой читает атрибуты
// только у страницы с меткой `data-sc-page`, и страница отчёта её не несёт.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
// Сначала реестр поставщиков: он и `source.ts` ссылаются друг на друга, как в самой команде.
import { BUILTIN } from "../../provider/index.js";

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

test("an older compiler is refused before it can silently ignore scene defaults", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-report-old-"));
  const compiler = join(dir, "node_modules", "agentic-report");
  mkdirSync(compiler, { recursive: true });
  writeFileSync(join(compiler, "package.json"), JSON.stringify({ version: "0.19.0", type: "module", exports: { ".": "./index.js" } }));
  writeFileSync(join(compiler, "index.js"), "throw new Error('The incompatible compiler must not run');\n");
  writeFileSync(join(dir, "report.md"), REPORT);
  assert.throws(() => reportProvider.page!({ id: "r", provider: "report", kind: "report", fields: { report: "report.md" } } as never,
    join(dir, "slides"), { dir } as never), /need agentic-report >=0\.20\.0; found 0\.19\.0/u);
});

test("report scene defaults accept plain Markdown and preserve author metadata", { skip: nodeOk ? false : "agentic-report needs Node 24.18+" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-report-defaults-"));
  const input = join(dir, "report.md");
  const scene = { id: "r", provider: "report", kind: "report", fields: { report: "report.md" } } as never;
  writeFileSync(input, "# A\n");
  let page = reportProvider.page!(scene, join(dir, "slides"), { dir } as never);
  assert.match(readFileSync(page, "utf8"), /data-topbar="none"/u);
  assert.equal(readFileSync(input, "utf8"), "# A\n");
  const authored = "---\ntopbar: true\n---\n# A\n";
  writeFileSync(input, authored);
  page = reportProvider.page!(scene, join(dir, "slides"), { dir } as never);
  assert.match(readFileSync(page, "utf8"), /<header class="topbar"/u, "frontmatter wins over scene defaults");
  assert.equal(readFileSync(input, "utf8"), authored);
  writeFileSync(input, "# A\n");
  writeFileSync(join(dir, "agentic-report.json"), JSON.stringify({ topbar: true }));
  page = reportProvider.page!(scene, join(dir, "slides"), { dir } as never);
  assert.match(readFileSync(page, "utf8"), /<header class="topbar"/u, "the project manifest also wins");
});

test("a report scene renders its sections whole, not typed by the stage", { skip: nodeOk ? false : "agentic-report needs Node 24.18+" }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-report-"));
  writeFileSync(join(dir, "report.md"), REPORT);
  const oldStaged = join(dir, ".report.scene.md");
  writeFileSync(oldStaged, "Author-owned file; do not overwrite.");
  const out = join(dir, "slides");
  const page = reportProvider.page!({ id: "r", provider: "report", kind: "report", fields: { report: "report.md" } } as never,
    out, { dir } as never);
  const html = readFileSync(page, "utf8");
  assert.equal(readFileSync(join(dir, "report.md"), "utf8"), REPORT);
  assert.equal(readFileSync(oldStaged, "utf8"), "Author-owned file; do not overwrite.");
  assert.deepEqual(readdirSync(dir).filter((name) => name.endsWith(".scene.md")), [".report.scene.md"],
    "compilation creates no substitute scene source");
  assert.doesNotMatch(html, /<html\b[^>]*data-sc-page/u, "the page is not handed to the layer");
  // Кадр отчёта — сама страница: без верхней панели и того, что из неё открывается.
  assert.match(html, /data-topbar="none"/u, "the page is built without its top bar");
  assert.doesNotMatch(html, /<header class="topbar"/u, "no top bar is drawn");
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    for (const f of ["clock.js", "stage.js"]) await ctx.addInitScript({ content: readFileSync(resolve(HERE, "..", "..", "browser", f), "utf8") });
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(page).href, { waitUntil: "load" });
    await p.evaluate((s) => (window as unknown as { __stage: { mount(x: unknown): void } }).__stage.mount(s),
      { id: "r", page, duration: 4, beats: 1, starts: [0], caption: "" });
    await p.evaluate(() => (window as unknown as { __clock: { seek(t: number): void } }).__clock.seek(0.2));
    assert.equal(await p.locator("header.topbar").count(), 0, "the frame has no top bar");
    const seen = await p.evaluate(() => ({ title: document.querySelector("#speed h2")?.textContent ?? null,
      body: document.querySelector("#speed")?.textContent ?? "" }));
    assert.equal(seen.title, "Speed", "the section keeps its heading");
    assert.match(seen.body, /after the cache moved next to the sources\./u, "the body stands whole at 0.2 s");
  } finally { await browser.close(); }
});

test("a failed report compilation leaves the author's source untouched", { skip: nodeOk ? false : "agentic-report needs Node 24.18+" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-report-fail-"));
  const invalid = "---\ncontractVersion: 0\ntitle: Invalid\n---\n# Invalid\n";
  writeFileSync(join(dir, "report.md"), invalid);
  assert.throws(() => reportProvider.page!({ id: "r", provider: "report", kind: "report", fields: { report: "report.md" } } as never,
    join(dir, "slides"), { dir } as never), /agentic-report could not build/u);
  assert.equal(readFileSync(join(dir, "report.md"), "utf8"), invalid);
  assert.deepEqual(readdirSync(dir).filter((name) => name.endsWith(".scene.md")), []);
});

test("report camera targets retain the authored report's identity across builds", { skip: nodeOk ? false : "agentic-report needs Node 24.18+" }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-report-targets-"));
  const input = join(dir, "report.md");
  const authored = `${REPORT}\n{{include: alias.md}}\n`;
  writeFileSync(input, authored);
  writeFileSync(join(dir, "actual.md"), "An included paragraph with a confined source alias.\n");
  symlinkSync("actual.md", join(dir, "alias.md"));
  const { buildReport } = await import("agentic-report");
  const original = join(dir, "original.html");
  await buildReport({ input, output: original, format: "single-file" });
  const targets = (html: string) => [...html.matchAll(/\bdata-review-target="([^"]+)"/gu)].map((match) => match[1]);
  const expected = targets(readFileSync(original, "utf8"));
  assert.ok(expected.length > 2, "the comparison includes implicit targets as well as the explicit section");
  const scene = { id: "r", provider: "report", kind: "report", fields: { report: "report.md" } } as never;
  for (let build = 0; build < 2; build++) {
    const page = reportProvider.page!(scene, join(dir, "slides"), { dir } as never);
    assert.deepEqual(targets(readFileSync(page, "utf8")), expected,
      "scene defaults preserve the original compiler's targets, not just repeatable substitute targets");
  }
  assert.equal(readFileSync(input, "utf8"), authored);
});
