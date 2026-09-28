// Лист кадров вертикального ролика: кадры ложатся по четыре в ряд, рядами вниз, и лист кончается
// там, где кончаются кадры. Прежде шесть высоких кадров вставали одним рядом в четверть ширины, а
// под ними оставалась пустая половина листа — окно снимка было выше содержимого.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");
const FFPROBE = (createRequire(import.meta.url)("@ffprobe-installer/ffprobe") as { path: string }).path;

const sheetOf = (format: string): { width: number; height: number } => {
  const dir = mkdtempSync(join(tmpdir(), "sc-sheet-v-"));
  const scenes = Array.from({ length: 6 }, (_, i) => `## s${i + 1} · slides.chapter\ntitle: Part ${i + 1}\nbody: Body\n\nBeat ${i + 1}.\n`).join("\n");
  writeFileSync(join(dir, "story.md"), `# S\n${format}voice: {"engine":"stub","name":"silent","cps":15}\n\n${scenes}`);
  const r = spawnSync("node", [ENTRY, "frames", "--source", "story.md", "--out", "sheet.png"], { cwd: dir, encoding: "utf8",
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-400));
  const [width, height] = execFileSync(FFPROBE, ["-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", join(dir, "sheet.png")],
    { encoding: "utf8" }).trim().split("x").map(Number);
  return { width: width!, height: height! };
};

test("a vertical film's sheet lays six frames in two rows of up to four and ends where the frames end; a horizontal one stays in three columns", () => {
  const v = sheetOf("format: vertical\n");
  // Четыре в ряд: кадр шириной около 384 точек, высотой около 683; два ряда с подписями.
  assert.ok(v.height > 2 * 683 && v.height < 2 * 683 + 200, `two rows of tall frames, no empty band: ${v.width}×${v.height}`);
  const h = sheetOf("");
  // Три в ряд: кадр около 520×292, два ряда — лист ниже прежних 900 точек окна.
  assert.ok(h.height > 2 * 290 && h.height < 900, `two rows of wide frames, no empty band: ${h.width}×${h.height}`);
});
