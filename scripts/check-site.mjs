#!/usr/bin/env node
import { mkdir, readFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright";

const root = resolve(".");
const site = resolve(root, "site");
const release = JSON.parse(await readFile(resolve(site, "release.json"), "utf8"));
const manifest = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
if (
  release.contractVersion !== 1 ||
  release.package?.name !== manifest.name ||
  release.package?.version !== manifest.version ||
  !/^[0-9a-f]{40}$/u.test(release.sourceRevision) ||
  !Array.isArray(release.files) ||
  release.files.length !== 2
) {
  throw new Error("site release identity is incomplete");
}
for (const expected of release.files) {
  const bytes = await readFile(resolve(site, expected.path));
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (bytes.byteLength !== expected.bytes || sha256 !== expected.sha256) {
    throw new Error(`site release identity does not match ${expected.path}`);
  }
}

const captureRoot = resolve(root, "agent_temp_files_local/site-check");
await rm(captureRoot, { recursive: true, force: true });
await mkdir(captureRoot, { recursive: true });

const browser = await chromium.launch();
try {
  const profiles = [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
    { name: "narrow", width: 304, height: 844 },
    { name: "wide", width: 2560, height: 1440 },
  ];
  const url = pathToFileURL(resolve(site, "index.html")).href;
  for (const profile of profiles) {
    const page = await browser.newPage({ viewport: { width: profile.width, height: profile.height } });
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(url, { waitUntil: "load" });
    await page.locator("h1").waitFor({ state: "visible" });
    for (const lang of ["en", "ru"]) {
      await page.locator("[data-language-select]").selectOption(lang);
      const state = await page.evaluate(() => ({
        h1: document.querySelectorAll("h1").length,
        main: document.querySelectorAll("main").length,
        overflow: document.documentElement.scrollWidth > innerWidth,
        emptyInteractive: [...document.querySelectorAll("a,button")].filter((element) => {
          const label = element.textContent?.trim() || element.getAttribute("aria-label")?.trim();
          return !label;
        }).length,
        pendingMotion: document.querySelectorAll("[data-reveal-pending], [data-reveal-motion]").length,
        brokenHeadingWords: (() => {
          const words = [];
          const walk = document.createTreeWalker(document.querySelector("h1"), NodeFilter.SHOW_TEXT);
          while (walk.nextNode()) {
            for (const match of walk.currentNode.textContent.matchAll(/[\p{L}\p{N}]+/gu)) {
              const range = document.createRange();
              range.setStart(walk.currentNode, match.index);
              range.setEnd(walk.currentNode, match.index + match[0].length);
              if (range.getClientRects().length > 1) words.push(match[0]);
            }
          }
          return words;
        })(),
      }));
      if (state.h1 !== 1 || state.main !== 1 || state.overflow || state.emptyInteractive || state.pendingMotion || state.brokenHeadingWords.length || errors.length) {
        throw new Error(`landing ${profile.name}/${lang} failed: ${JSON.stringify({ state, errors })}`);
      }
      const repository = page.locator('a[href="https://github.com/witqq/agentic-screencast"]');
      if ((await repository.count()) === 0) throw new Error("landing has no repository link");
      await page.screenshot({ path: resolve(captureRoot, `${profile.name}-${lang}.png`), fullPage: true });
    }
    await page.close();
  }

  const locale = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await locale.goto(url, { waitUntil: "load" });
  const language = locale.getByRole("combobox", { name: "Language" });
  if ((await language.count()) !== 1) throw new Error("landing language selector is missing");
  await language.selectOption("ru");
  const heading = (await locale.locator("h1").innerText()).trim();
  if (heading !== "Видео для людей. Инструмент для агентов.") throw new Error("Russian agent-first landing is not reachable");
  for (const lang of ["en", "ru"]) {
    await locale.locator("[data-language-select]").selectOption(lang);
    if (!(await locale.locator("#moira").innerText()).includes("admin/agentic-screencast-video")) {
      throw new Error(`Moira integration identity is missing in ${lang}`);
    }
    const guide = `https://github.com/witqq/agentic-screencast/blob/main/docs/moira${lang === "ru" ? ".ru" : ""}.md`;
    if ((await locale.locator(`a[href="${guide}"]`).count()) === 0) throw new Error(`Missing ${lang} integration guide`);
    if (!(await locale.locator("#start pre").innerText()).includes("--out draft.mp4")) throw new Error("First build does not produce an MP4");
  }
  await locale.close();
} finally {
  await browser.close();
}

process.stdout.write("Landing passed desktop, mobile, narrow, wide, reduced-motion, localization and basic accessibility checks.\n");
