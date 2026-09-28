#!/usr/bin/env node
// Лист кадров сырого клипа: чтобы выбрать куски `from`/`to` из скачанного или снятого материала,
// не собирая ролик и не складывая мозаику руками.
//
// Кадры берёт ffmpeg, а лист с подписями времени собирает страница браузера: подписи рисовать
// фильтром drawtext нельзя — у поставляемого ffmpeg может не оказаться шрифтов (Fontconfig).
//
// Запуск: sheet.js <клип> [--count 12 | --every 2] [--from 5 --to 20] [--out sheet.png]
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { resolveTheme } from "./theme.js";

const require = createRequire(import.meta.url);
const FFMPEG = require("ffmpeg-static") as string;
const FFPROBE = require("@ffprobe-installer/ffprobe").path as string;

const args = process.argv.slice(2);
const arg = (k: string): string | undefined => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
const clip = args[0];
if (!clip || clip.startsWith("--")) {
  console.error("sheet.js <clip> [--count 12 | --every 2] [--from s --to s] [--out sheet.png]");
  process.exit(2);
}
const file = resolve(clip);
let length: number;
try {
  length = Number(execFileSync(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim());
} catch { console.error(`sheet: ${clip} is not a readable video`); process.exit(2); }
if (!(length > 0)) { console.error(`sheet: ${clip} has no duration`); process.exit(2); }
const from = Math.max(0, Number(arg("from") ?? 0)), to = Math.min(length, Number(arg("to") ?? length));
if (!(to > from)) { console.error(`sheet: --to must be later than --from, within the ${length.toFixed(2)}s clip`); process.exit(2); }
const every = arg("every") ? Number(arg("every")) : undefined;
const count = every ? Math.min(60, Math.max(1, Math.floor((to - from) / every) + 1)) : Math.min(60, Math.max(1, Number(arg("count") ?? 12)));
if (!Number.isFinite(count)) { console.error("sheet: --count and --every take numbers"); process.exit(2); }
// Моменты — середины равных долей куска (или шаг --every от его начала): крайний кадр клипа часто чёрный.
const times = Array.from({ length: count }, (_, k) => Number((every ? from + k * every : from + ((k + 0.5) / count) * (to - from)).toFixed(2)));
const out = resolve(arg("out") ?? `${basename(file).replace(/\.[^.]+$/u, "")}.sheet.png`);
if (!/\.png$/iu.test(out)) { console.error("--out: the sheet is a PNG file"); process.exit(2); }
const work = resolve(dirname(out), `.${basename(out)}.frames`);
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
const frames = times.map((t, k) => {
  const png = resolve(work, `${String(k).padStart(3, "0")}.png`);
  execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-ss", String(t), "-i", file, "-frames:v", "1", "-vf", "scale=480:-2", png]);
  return { at: t, file: png };
});
// Лист — в теме по умолчанию: фон, шрифт и текст из её токенов.
const vars = Object.entries(resolveTheme(undefined)).map(([k, v]) => `${k}:${v}`).join(";");
const cols = count <= 4 ? 2 : count <= 9 ? 3 : 4;
const html = `<!doctype html><html><head><style>:root{${vars}}</style></head><body style="margin:0;background:var(--bg);font:600 18px var(--sans);color:var(--ink)">
<p style="margin:0;padding:var(--space-s) var(--space-s) 0">${basename(file)} · ${length.toFixed(2)}s</p>
<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:var(--space-s);padding:var(--space-s);width:1560px">${frames.map((f) =>
  `<figure style="margin:0"><img src="${pathToFileURL(f.file).href}" style="width:100%;display:block;border-radius:var(--radius-sm)">`
  + `<figcaption style="padding:var(--space-xs) 0">${f.at.toFixed(2)}s</figcaption></figure>`).join("")}</div></body></html>`;
const page = resolve(work, "sheet.html");
writeFileSync(page, html);
const browser = await chromium.launch();
try {
  const p = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await p.goto(pathToFileURL(page).href, { waitUntil: "load" });
  await p.screenshot({ path: out, fullPage: true });
} finally { await browser.close(); }
console.log(JSON.stringify({ sheet: out, clip: file, duration: Number(length.toFixed(3)), frames: frames.map((f) => ({ at: f.at, file: f.file })) }, null, 1));
