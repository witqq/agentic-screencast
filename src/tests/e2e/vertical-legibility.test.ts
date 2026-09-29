// Мелкий интерфейс в вертикали: сборка меряет кегль текста у цели каждого фокуса и называет мелкий,
// а проход вдоль широкой цели (pan) доводит окно до её последних слов крупным планом.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parseSpotlight } from "../../spotlight.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

// Широкая строка таблицы с мелким текстом: последнее слово — у правого края страницы.
const PAGE = `<html><body style="margin:0;width:1920px;height:1080px;background:#fff;font:12px sans-serif">
<table style="position:absolute;top:500px;left:40px;width:1840px;border-collapse:collapse"><tr id="row">
<td style="padding:6px">first</td><td style="padding:6px">middle</td><td style="padding:6px;text-align:right"><span id="last" style="background:#e00;color:#e00">LAST</span></td></tr></table></body></html>`;

function build(dir: string, spot: string): { report: { scenes: Array<{ legibility?: Array<{ target: string; px: number; min: number }> }>; warnings: Array<{ scene: string; rule: string; id: string; message: string; hint: string }> }; stderr: string; film: string } {
  writeFileSync(join(dir, "story.md"), `# V\nvoice: {"engine":"stub","name":"silent","cps":15}\nframe: {"width":1920,"height":1080,"fps":10,"scale":1}\n\n## one · page\npage: p.html\nduration: 6\nfade: none\nspotlight: ${spot}\n`);
  const r = spawnSync("node", [ENTRY, "build", "--source", "story.md", "--format", "vertical", "--out", "f.mp4"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr);
  return { report: JSON.parse(r.stdout), stderr: r.stderr, film: join(dir, "f.mp4") };
}

test("pan is read on a spotlight and refused when it is not a boolean", () => {
  assert.equal(parseSpotlight('{"target":"#row","at":"0.5","pan":true}')[0]!.pan, true);
  assert.throws(() => parseSpotlight('{"target":"#row","at":"0.5","pan":"yes"}'), /pan: expected true or false/);
});

test("a vertical build names small text at a focus, and a pan reads a wide row to its last word, large", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-legible-"));
  writeFileSync(join(dir, "p.html"), PAGE);
  // Обычный фокус вписывает широкую строку целиком: текст выходит мелким, и сборка это называет.
  const plain = build(dir, '{"target":"#row","at":"0.3","until":"5"}');
  const small = plain.report.scenes[0]!.legibility![0]!;
  assert.ok(small.px < small.min, `the whole row fitted into the window leaves its text small (${small.px} px < ${small.min})`);
  assert.match(plain.stderr, /text of #row is [\d.]+ px in the frame .* under the 48 px a phone reads/);
  // В отчёте то же предупреждение — находка общего формата с правилом базы и подсказкой.
  const w = plain.report.warnings.find((x) => x.id === "legibility")!;
  assert.equal(w.rule, "FC-58");
  assert.ok(w.hint.length > 10 && w.scene.length > 0, JSON.stringify(w));
  // Проход: крупно, без предупреждения, и в конце удержания в кадре — последнее слово строки.
  const pan = build(dir, '{"target":"#row","at":"0.3","until":"5","pan":true}');
  const big = pan.report.scenes[0]!.legibility![0]!;
  assert.ok(big.px >= big.min, `the pan pushes in until the text reads (${big.px} px)`);
  assert.doesNotMatch(pan.stderr, /under the 48 px/);
  const red = (t: number): number => {
    const raw = execFileSync(ffmpeg, ["-loglevel", "error", "-ss", String(t), "-i", pan.film, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 64 * 1024 * 1024 });
    let n = 0;
    for (let i = 0; i < raw.length; i += 3) if (raw[i]! > 180 && raw[i + 1]! < 80 && raw[i + 2]! < 80) n++;
    return n;
  };
  assert.equal(red(1.6), 0, "at the start of the pan the last word is not in the window");
  assert.ok(red(4.6) > 500, `at the end of the pan the last word is in the window, large (${red(4.6)} red points)`);
});

test("in a vertical build a push-in fits its subject into the window, so a box's label reads without a named scale", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-legible-box-"));
  writeFileSync(join(dir, "p.html"), `<html><body style="margin:0;width:1920px;height:1080px;background:#123;color:#fff;font:14px sans-serif">
<div id="box" style="position:absolute;left:800px;top:480px;width:230px;padding:14px;border:2px solid #69c">Parser: fields, providers</div></body></html>`);
  const r = build(dir, '{"target":"#box","at":"0.3","until":"5"}');
  const l = r.report.scenes[0]!.legibility![0]!;
  // 14 px × 1080/1080·(1920/1080) × (0.9 · 607 / 262) ≈ 52 px: вписано в окно, а не в широкий кадр (×1.65 давало 41 px).
  assert.ok(l.px >= l.min, `the box's label reads in the vertical frame (${l.px} px)`);
});
