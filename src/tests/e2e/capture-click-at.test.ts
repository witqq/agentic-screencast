// Клик по точке и сквозь перехватывающий слой. Канвас под прозрачным слоем Playwright не
// кликает («element intercepts pointer events»); `clickAt(x, y, { target })` и `click(target,
// { force: true })` доставляют клик самому канвасу, а слой дубля рисует курсор и волну и пишет клик
// в файл отметок.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { recordTake } from "../../capture.js";
import { rawOf } from "../support.js";

const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;
const W = 640, H = 360;

function frame(video: string, t: number): (x: number, y: number) => number[] {
  const png = execFileSync(ffmpeg, ["-loglevel", "error", "-ss", t.toFixed(2), "-i", video, "-frames:v", "1", "-vf", `scale=${W}:${H}`, "-f", "image2pipe", "-vcodec", "png", "-"]);
  const raw = rawOf(png);
  return (x, y) => { const i = (Math.round(y) * W + Math.round(x)) * 3; return [raw[i]!, raw[i + 1]!, raw[i + 2]!]; };
}
/** Сколько точек квадрата вокруг (x, y) отличаются между двумя кадрами. */
function changed(a: (x: number, y: number) => number[], b: (x: number, y: number) => number[], x: number, y: number, r = 24): number {
  let n = 0;
  for (let j = y - r; j <= y + r; j += 2) for (let i = x - r; i <= x + r; i += 2) {
    const p = a(i, j), q = b(i, j);
    if (Math.abs(p[0]! - q[0]!) + Math.abs(p[1]! - q[1]!) + Math.abs(p[2]! - q[2]!) > 30) n++;
  }
  return n;
}

test("clickAt and a forced click reach a canvas under an overlay that intercepts the pointer, with cursor, ripple and a stored click", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-click-at-"));
  const html = join(dir, "page.html"), video = join(dir, "take.webm");
  writeFileSync(html, `<!doctype html><html><body style="margin:0;background:#20242c">
    <canvas id="board" width="400" height="220" style="position:absolute;left:120px;top:70px;background:#2d6cdf"></canvas>
    <div id="glass" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px"></div>
    <script>
      window.hits = [];
      document.querySelector('#board').addEventListener('click', e => window.hits.push([e.clientX, e.clientY]));
      document.querySelector('#glass').addEventListener('pointerdown', e => e.stopPropagation());
    </script></body></html>`);
  let hits: number[][] = [];
  let refused = false;
  await recordTake({ output: video, viewport: { width: W, height: H }, prepare: async (page) => { await page.goto(pathToFileURL(html).href); } }, async (take) => {
    const board = take.page.locator("#board");
    await take.page.waitForTimeout(400);
    try { await board.click({ timeout: 600 }); } catch { refused = true; }
    await take.clickAt(260, 150, { target: board });
    await take.page.waitForTimeout(1200);
    await take.click(board, { force: true });
    await take.page.waitForTimeout(1200);
    hits = await take.page.evaluate(() => (window as unknown as { hits: number[][] }).hits);
  });
  assert.ok(refused, "a plain Playwright click is refused: the overlay intercepts the pointer");
  assert.deepEqual(hits, [[260, 150], [320, 180]], "both clicks reach the canvas at their points");
  const marks = JSON.parse(readFileSync(`${video}.marks.json`, "utf8")) as { clicks: Array<{ t: number; x: number; y: number }> };
  assert.equal(marks.clicks.length, 2, "the take stores both clicks");
  assert.deepEqual([marks.clicks[0]!.x, marks.clicks[0]!.y], [260 / W, 150 / H].map((v) => Math.round(v * 1000) / 1000));
  // В кадре: волна клика вокруг точки сразу после нажатия и курсор, оставшийся там после неё.
  // Волна живёт около 0,4 с, а время клика в файле отметок точно до десятой доли секунды,
  // поэтому берётся самый заметный кадр рядом с кликом против кадра, где волна уже погасла.
  const t = marks.clicks[0]!.t;
  const before = frame(video, 0.1), after = frame(video, t + 1.0);
  const ripple = Math.max(...[-0.1, -0.05, 0, 0.05, 0.1, 0.15].map((dt) => changed(frame(video, t + dt), after, 260, 150, 40)));
  assert.ok(ripple > 200, `the ripple is drawn around the click (${ripple} changed points)`);
  assert.ok(changed(before, after, 262, 156, 10) > 5, "the cursor stands at the clicked point");
});
