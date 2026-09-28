// Переход общим элементом: карточка, которая есть в обеих сценах, перетекает со своего
// места в первой на место во второй одним куском, а не двумя полупрозрачными копиями, как
// при наплыве. Карточка пурпурная — ни в одном фоне этого цвета нет, поэтому её точки
// на кадре находятся прямо.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parseTransition } from "../../transition.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");
const W = 1280, H = 720;
const A = { x: 120, y: 120, w: 260, h: 150 }, B = { x: 820, y: 460, w: 360, h: 190 };

const page = (bg: string, r: typeof A): string => `<!doctype html><html><body style="margin:0;background:${bg}">
<div id="card" style="position:absolute;left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;background:#ff00ff;border-radius:0"></div>
<p style="position:absolute;left:60px;bottom:40px;margin:0;font:28px system-ui;color:#cde">Scene background text</p></body></html>`;

test("a morph carries the shared element in one piece from its place in one scene to its place in the next", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-morph-"));
  writeFileSync(join(dir, "a.html"), page("#10243a", A));
  writeFileSync(join(dir, "b.html"), page("#123a24", B));
  writeFileSync(join(dir, "story.md"), `# M
lang: en
voice: {"engine":"stub","name":"silent","cps":15}
frame: {"width":${W},"height":${H},"fps":25,"scale":1}

## a · page
page: a.html
duration: 3

## b · page
page: b.html
duration: 3
transition: {"kind":"morph","element":"#card","duration":1}
`);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8",
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-500));
  const report = JSON.parse(r.stdout) as { transitions: Array<{ kind: string; renderer: string; at: number; duration: number }> };
  const tr = report.transitions[0]!;
  assert.equal(tr.kind, "morph");
  assert.equal(tr.renderer, "webgl");
  /** Пурпурные точки кадра в момент t: и яркие, и приглушённые подсветкой страницы в конце сцены A. */
  const magenta = (t: number): Array<[number, number]> => {
    const f = execFileSync(ffmpeg, ["-loglevel", "error", "-ss", t.toFixed(3), "-i", join(dir, "f.mp4"), "-frames:v", "1",
      "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 64 * 1024 * 1024 });
    const out: Array<[number, number]> = [];
    for (let i = 0; i < f.length; i += 3) if (f[i]! > 100 && f[i + 1]! < 60 && f[i + 2]! > 100) out.push([(i / 3) % W, Math.floor(i / 3 / W)]);
    return out;
  };
  const inside = (p: [number, number], r: typeof A): boolean => p[0] >= r.x && p[0] < r.x + r.w && p[1] >= r.y && p[1] < r.y + r.h;
  const centres: number[] = [];
  for (const share of [0.3, 0.5, 0.7]) {
    const pts = magenta(tr.at + tr.duration * share);
    const xs = pts.map(([x]) => x), ys = pts.map(([, y]) => y);
    const bw = Math.max(...xs) - Math.min(...xs) + 1, bh = Math.max(...ys) - Math.min(...ys) + 1;
    // Один сплошной прямоугольник: пурпурных точек почти столько же, сколько в их рамке.
    assert.ok(pts.length > 5000 && pts.length / (bw * bh) > 0.9, `at ${share} the element is one solid piece (${pts.length} of ${bw}×${bh})`);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    assert.ok(cx > A.x + A.w / 2 && cx < B.x + B.w / 2 && cy > A.y + A.h / 2 && cy < B.y + B.h / 2,
      `at ${share} it lies between its two places (${cx.toFixed(0)}, ${cy.toFixed(0)})`);
    centres.push(Math.hypot(cx - (A.x + A.w / 2), cy - (A.y + A.h / 2)));
    if (share === 0.5) {
      // В середине старое и новое место свободны: там фон без предмета, а не его полупрозрачная копия.
      const moving = (q: [number, number]): boolean => q[0] >= Math.min(...xs) && q[0] <= Math.max(...xs) && q[1] >= Math.min(...ys) && q[1] <= Math.max(...ys);
      assert.equal(pts.filter((q) => inside(q, A) && !moving(q)).length, 0, "no copy of the element stays at its old place");
      assert.equal(pts.filter((q) => inside(q, B) && !moving(q)).length, 0, "no copy of the element waits at its new place");
    }
  }
  assert.ok(centres[0]! < centres[1]! && centres[1]! < centres[2]!, `it moves steadily from the old place to the new (${centres.map((c) => c.toFixed(0)).join(" → ")})`);
});

test("a morph names its element, and other transitions do not take one", () => {
  assert.throws(() => parseTransition('{"kind":"morph"}'), /names the element shared by both scenes/);
  assert.throws(() => parseTransition('{"kind":"cube","element":"#a"}'), /only a morph moves an element/);
  assert.equal(parseTransition('{"kind":"morph","element":"#total"}').element, "#total");
});
