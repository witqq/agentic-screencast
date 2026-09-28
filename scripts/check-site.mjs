#!/usr/bin/env node
// Браузерная проверка собранного лендинга: признаки дефектов прежнего сайта,
// раскладка на четырёх ширинах, обе локализации и заявления страницы.
//
// Запускается после `npm run site:build` (скрипт `site:check`) под Node из
// `.nvmrc`; модули продукта берутся из `dist/`, который собирает `npm ci`.
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

import { chromium } from "playwright";
import { measure } from "./site-measure.mjs";
import { checkSiteStatic, loadLandingMediaManifest, publishedMediaPath } from "./check-site-static.mjs";

const root = resolve(".");
const site = resolve(root, "site");
const { release, videoBytes } = await checkSiteStatic(root);
const landingMedia = await loadLandingMediaManifest(root);

// Словарь продукта — из самого продукта, а не вторым списком здесь.
const { THEME_NAMES } = await import("../dist/theme.js");
const { KINETIC } = await import("../dist/overlay.js");
const { KINDS: TRANSITIONS } = await import("../dist/transition.js");
const { allKinds } = await import("../dist/schema.js");
const { COMMON, FILM_FIELDS } = await import("../dist/source.js");
const { FORMAT_NAMES } = await import("../dist/format.js");
const cli = await readFile(resolve(root, "dist/agentic-screencast.js"), "utf8");
const commands = new Set([...cli.matchAll(/case "([a-z-]+)":/gu)].map((m) => m[1]));
const kinds = allKinds();
const fields = new Set([...COMMON, ...FILM_FIELDS, ...kinds.flatMap((k) => k.spec.fields)]);
const slideKinds = kinds.filter((k) => k.provider === "slides").length;
const engines = new Set(["stub", "say", "piper", "recorded", "speechkit"]);
const words = {
  en: { 8: "Eight", 9: "Nine", 11: "Eleven", 12: "Twelve", 14: "Fourteen", 18: "Eighteen", 20: "Twenty" },
  ru: { 8: "Восемь", 9: "Девять", 11: "Одиннадцать", 12: "Двенадцать", 14: "Четырнадцать", 18: "Восемнадцать", 20: "Двадцать" },
};
const said = (lang, n) => words[lang][n] ?? String(n);

// Ролики каждого языка — свои и в полном качестве. Язык ролика определяется не по имени файла,
// а по опорным кадрам: в трёх моментах, где языки различаются сильнее всего, кадр ролика обязан
// быть ближе к опорному кадру языка страницы, чем к кадру другого языка, — на полпути от
// межъязыкового сходства к полному совпадению. Опорные кадры и моменты пишет вырезка роликов
// (`website/landing/media/fingerprints/`); перекодированный английский ролик в русской
// локализации эту проверку не проходит.
const require = createRequire(import.meta.url);
const FFMPEG = require("ffmpeg-static");
const FFPROBE = require("@ffprobe-installer/ffprobe").path;
const fingerprintDir = resolve(root, "website/landing/media/fingerprints");
const fingerprints = landingMedia ? null : JSON.parse(await readFile(resolve(fingerprintDir, "fingerprints.json"), "utf8"));
const scratch = await mkdtemp(resolve(tmpdir(), "site-check-"));
const probe = (file) => {
  const r = spawnSync(FFPROBE, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", file], { encoding: "utf8" });
  const j = JSON.parse(r.stdout || "{}");
  return { width: j.streams?.[0]?.width, height: j.streams?.[0]?.height, duration: Number(j.format?.duration) };
};
const ssimOf = (a, b) => Number(/All:([0-9.]+)/u.exec(spawnSync(FFMPEG, ["-i", a, "-i", b, "-lavfi", "ssim", "-f", "null", "-"], { encoding: "utf8" }).stderr)?.[1]);
let still = 0;
const grayFrame = (file, t, size) => {
  const out = resolve(scratch, `f${still++}.png`);
  spawnSync(FFMPEG, ["-loglevel", "error", "-y", "-ss", String(t), "-i", file, "-frames:v", "1", "-vf", `scale=${size},format=gray`, out]);
  return out;
};
async function checkClips(page, lang) {
  const other = lang === "en" ? "ru" : "en";
  const clips = await page.evaluate(() => [...document.querySelectorAll("main video")].filter((v) => v.checkVisibility())
    .map((v) => ({ src: v.querySelector("source")?.getAttribute("src") ?? "", caption: v.closest("figure")?.querySelector("figcaption")?.textContent ?? "" })));
  if (clips.length === 0) failures.push(`${lang}: the page shows no clips`);
  if (landingMedia) {
    const expected = landingMedia.assets.filter((asset) => asset.kind === "video" && asset.lang === lang);
    const paths = new Set(expected.map(publishedMediaPath));
    const shown = new Set();
    for (const { src, caption } of clips) {
      if (!paths.has(src) || shown.has(src)) { failures.push(`${lang}: undeclared or duplicate clip ${src}`); continue; }
      shown.add(src);
      const { width, height, duration } = probe(resolve(site, src));
      if (!(duration > 0)) failures.push(`${lang}: clip ${src} has no known duration`);
      const stated = /(\d{3,4})×(\d{3,4})/u.exec(caption);
      if (stated && (Number(stated[1]) !== width || Number(stated[2]) !== height)) failures.push(`${lang}: the caption of ${src} says ${stated[0]}, the file is ${width}×${height}`);
    }
    for (const path of paths) if (!shown.has(path)) failures.push(`${lang}: declared clip ${path} is not visible`);
    return clips.length;
  }
  for (const { src, caption } of clips) {
    const name = /^assets\/([a-z]+)\./u.exec(src)?.[1];
    const fp = name && fingerprints[name];
    if (!fp) { failures.push(`${lang}: clip ${src} has no reference frames`); continue; }
    const file = resolve(site, src);
    const { width, height, duration } = probe(file);
    if (!(duration > 0)) failures.push(`${lang}: clip ${src} has no known duration`);
    const [w, h] = fp.size === "180:320" ? [1080, 1920] : [1920, 1080];
    if (width !== w || height !== h) failures.push(`${lang}: clip ${src} is ${width}×${height}, full quality is ${w}×${h}`);
    const crf = Number(/crf=([0-9.]+)/u.exec((await readFile(file)).toString("latin1"))?.[1]);
    if (!(crf <= 18)) failures.push(`${lang}: clip ${src} is encoded at crf ${crf}, full quality is 18 or lower`);
    const stated = /(\d{3,4})×(\d{3,4})/u.exec(caption);
    if (stated && (Number(stated[1]) !== width || Number(stated[2]) !== height)) failures.push(`${lang}: the caption of ${src} says ${stated[0]}, the file is ${width}×${height}`);
    fp.moments.forEach(({ t, crossLanguageSsim }, i) => {
      const f = grayFrame(file, t, fp.size);
      const own = ssimOf(f, resolve(fingerprintDir, `${name}.${lang}.${i}.png`));
      const foreign = ssimOf(f, resolve(fingerprintDir, `${name}.${other}.${i}.png`));
      if (!(own - foreign >= (1 - crossLanguageSsim) / 2)) failures.push(`${lang}: clip ${src} at ${t}s is not the ${lang} film (SSIM ${own.toFixed(3)} to its own language, ${foreign.toFixed(3)} to ${other})`);
    });
  }
  return clips.length;
}
let clipsChecked = 0;

const captureRoot = resolve(root, "agent_temp_files_local/site-check");
await rm(captureRoot, { recursive: true, force: true });
await mkdir(captureRoot, { recursive: true });

const browser = await chromium.launch();
const failures = [];
try {
  const profiles = [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
    { name: "narrow", width: 304, height: 844 },
    { name: "wide", width: 2560, height: 1440 },
  ];
  const url = pathToFileURL(resolve(site, "index.html")).href;
  for (const profile of profiles) {
    for (const lang of ["en", "ru"]) {
      const page = await browser.newPage({ viewport: { width: profile.width, height: profile.height } });
      const errors = [];
      page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      page.on("pageerror", (error) => errors.push(error.message));
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(url, { waitUntil: "load" });
      await page.locator("h1").waitFor({ state: "visible" });
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
          const found = [];
          const walk = document.createTreeWalker(document.querySelector("h1"), NodeFilter.SHOW_TEXT);
          while (walk.nextNode()) {
            for (const match of walk.currentNode.textContent.matchAll(/[\p{L}\p{N}]+/gu)) {
              const range = document.createRange();
              range.setStart(walk.currentNode, match.index);
              range.setEnd(walk.currentNode, match.index + match[0].length);
              if (range.getClientRects().length > 1) found.push(match[0]);
            }
          }
          return found;
        })(),
      }));
      if (state.h1 !== 1 || state.main !== 1 || state.overflow || state.emptyInteractive || state.pendingMotion || state.brokenHeadingWords.length) {
        failures.push(`${profile.name}/${lang}: ${JSON.stringify(state)}`);
      }
      // Признаки дефектов прежнего сайта — на двух ширинах, которые называет план.
      if (profile.width === 1440 || profile.width === 390) {
        for (const s of await measure(page, { mobile: profile.width === 390 })) {
          if (!s.ok) failures.push(`${profile.name}/${lang}: ${s.id} — ${s.detail}`);
        }
      }
      if (errors.length) failures.push(`${profile.name}/${lang}: console errors ${errors.join(" | ")}`);
      await page.screenshot({ path: resolve(captureRoot, `${profile.name}-${lang}.png`), fullPage: true });
      await page.close();
    }
  }

  // Содержание: оба языка, путь к первому ролику и сверка заявлений с кодом.
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(url, { waitUntil: "load" });
  const language = page.getByRole("combobox", { name: "Language" });
  if ((await language.count()) !== 1) failures.push("landing language selector is missing");
  const headings = { en: "Your agent makes the product film.", ru: "Ролик о продукте снимает ваш агент." };
  for (const lang of ["en", "ru"]) {
    await page.locator("[data-language-select]").selectOption(lang);
    const heading = (await page.locator("h1").innerText()).trim();
    if (heading !== headings[lang]) failures.push(`${lang}: heading is «${heading}»`);
    if ((await page.locator('a[href="https://github.com/witqq/agentic-screencast"]').count()) === 0) failures.push(`${lang}: repository link is missing`);
    if (!(await page.locator("#start pre").innerText()).includes("--out draft.mp4")) failures.push(`${lang}: the first build does not produce an MP4`);
    clipsChecked += await checkClips(page, lang);

    const text = await page.locator("main").innerText();
    // Числа, которые называет страница, — числа продукта.
    for (const [n, what, re] of [
      [slideKinds, "slide kinds", lang === "en" ? /(\w+) slide kinds/u : /(\S+) видов слайдов/u],
      [KINETIC.length, "phrase styles", lang === "en" ? /(\w+) ways to assemble/u : /(\S+) способов собрать/u],
      [Object.keys(TRANSITIONS).length, "transitions", lang === "en" ? /(\w+) WebGL transitions/u : /(\S+) переходов WebGL/u],
      [THEME_NAMES.length, "themes", lang === "en" ? /(\w+) themes/u : /(\S+) тем[\s—,]/u],
    ]) {
      const m = re.exec(text);
      if (!m) failures.push(`${lang}: the page does not state the number of ${what}`);
      else if (m[1].toLowerCase() !== said(lang, n).toLowerCase()) failures.push(`${lang}: the page says «${m[1]}» ${what}, the product has ${n}`);
    }
    for (const t of THEME_NAMES) if (!new RegExp(`\\b${t}\\b`, "u").test(text)) failures.push(`${lang}: theme ${t} is not named`);
    // Каждая названная команда есть в CLI, каждое поле — в сценарии.
    for (const m of text.matchAll(/agentic-screencast ([a-z][a-z-]+)/gu)) {
      if (!commands.has(m[1])) failures.push(`${lang}: command «agentic-screencast ${m[1]}» does not exist`);
    }
    const codes = await page.locator("main :not(pre) > code").allInnerTexts();
    for (const raw of codes) {
      const code = raw.trim();
      // Скрытая копия страницы на другом языке отдаёт пустой текст.
      if (!code) continue;
      const pair = /^([a-zA-Z]+): (\S+)$/u.exec(code);
      if (pair) {
        if (!fields.has(pair[1])) failures.push(`${lang}: field «${pair[1]}» does not exist`);
        if (pair[1] === "format" && !FORMAT_NAMES.includes(pair[2])) failures.push(`${lang}: format «${pair[2]}» does not exist`);
        continue;
      }
      const cmd = /^(?:npx )?agentic-screencast (\S+)/u.exec(code);
      if (cmd) { if (!commands.has(cmd[1])) failures.push(`${lang}: command «${code}» does not exist`); continue; }
      if (fields.has(code) || commands.has(code) || engines.has(code) || code === ".env") continue;
      failures.push(`${lang}: «${code}» is neither a command, a field nor an engine of the product`);
    }
  }
  await page.close();
} finally {
  await browser.close();
  await rm(scratch, { recursive: true, force: true });
}

if (failures.length) throw new Error(`landing check failed:\n- ${failures.join("\n- ")}`);
process.stdout.write(`Landing passed: ${release.files.length} files, videos ${(videoBytes / 1048576).toFixed(1)} MB, ${clipsChecked} clips of their own language in full quality, defect signals, four widths, both languages and the claims against the product.\n`);
