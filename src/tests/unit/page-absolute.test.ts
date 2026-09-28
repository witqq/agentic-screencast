// Страница, всё содержимое которой вынесено из потока (`position:absolute; inset:0`), видна в
// кадре. Слой сцены трансформирует тело документа, а трансформированный предок становится
// отсчётом для абсолютных потомков: при теле нулевой высоты такое содержимое схлопывалось, и кадр
// выходил пустым, хотя в браузере страница выглядела как надо.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");
const FFMPEG = createRequire(import.meta.url)("ffmpeg-static") as string;

/** Средний цвет полосы кадра на первой секунде: [r, g, b]; `y` — доля высоты. */
const band = (film: string, y: number): number[] => [...execFileSync(FFMPEG, ["-nostdin", "-v", "error", "-ss", "1", "-i", film,
  "-frames:v", "1", "-vf", `crop=iw/2:ih/10:iw/4:ih*${y},scale=1:1:flags=area`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"])];

test("a page laid out wholly with absolute positioning fills the frame, horizontal and vertical", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-abs-"));
  writeFileSync(join(dir, "p.html"), `<!doctype html><body style="background:#000">
    <div style="position:absolute;inset:0;background:#d00"></div></body>`);
  for (const format of ["", "format: vertical\n"]) {
    writeFileSync(join(dir, "story.md"), `# A\n${format}voice: {"engine":"stub","name":"silent","cps":15}\n\n## a · page\npage: p.html\nduration: 2\n`);
    const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
    assert.equal(r.status, 0, r.stderr.slice(-500));
    for (const y of [0.1, 0.5, 0.85]) {
      const [red] = band(join(dir, "f.mp4"), y);
      assert.ok(red! > 150, `${format || "horizontal"}: the page is drawn at ${y * 100}% of the height (red ${red})`);
    }
  }
});

/** Центр светлых точек кадра в момент t, в точках кадра 1920×1080. */
const brightCentre = (film: string, t: number): { x: number; y: number } => {
  const raw = execFileSync(FFMPEG, ["-nostdin", "-v", "error", "-ss", String(t), "-i", film, "-frames:v", "1",
    "-vf", "scale=192:108,format=gray", "-f", "rawvideo", "-"]);
  let n = 0, sx = 0, sy = 0;
  raw.forEach((v, i) => { if (v > 200) { n++; sx += i % 192; sy += Math.floor(i / 192); } });
  return { x: (sx / n) * 10, y: (sy / n) * 10 };
};

test("a push-in lands on its target when the body does not start at the frame's corner", () => {
  // Поле первого потомка схлопывается сквозь тело: тело начинается на 300-й точке, а не в углу.
  const dir = mkdtempSync(join(tmpdir(), "sc-origin-"));
  writeFileSync(join(dir, "p.html"), `<!doctype html><body style="background:#123">
    <div id="t" style="margin:300px;width:400px;height:200px;background:#eee"></div></body>`);
  writeFileSync(join(dir, "story.md"), `# O\nvoice: {"engine":"stub","name":"silent","cps":15}\n\n## a · page\npage: p.html\nduration: 4\n`
    + `overlay: {"camera":[{"at":0.3,"hold":2.5,"target":"#t","scale":1.5}]}\n`);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-500));
  const c = brightCentre(join(dir, "f.mp4"), 2.5);
  // По высоте цель встаёт в середину кадра; по ширине камера не показывает поле левее страницы,
  // и цель стоит там, где её поставило увеличение от угла: (8 + 300 + 200) × 1,5 = 762.
  assert.ok(Math.abs(c.x - 762) < 25 && Math.abs(c.y - 540) < 25, `the target stands where the camera aimed: ${c.x.toFixed(0)}, ${c.y.toFixed(0)}`);
});
