// Проверки по готовому ролику, которых не видно в сценарии: неподвижный отрезок сцены, мигание,
// действие дубля без речи, контрольный кадр на затухании, тёмный первый кадр ленты. Каждая —
// предупреждение отчёта с правилом базы; каждая проверена на плохом и на хорошем случае.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");
const HEAD = `# A\nlang: en\nvoice: {"engine":"stub","name":"silent","cps":15}\nframe: {"width":320,"height":180,"fps":10,"scale":1}\n\n`;

function build(dir: string, story: string): { warnings: Array<{ scene: string; id: string; rule: string }>; out: string } {
  writeFileSync(join(dir, "story.md"), story);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8",
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-400));
  return { warnings: (JSON.parse(r.stdout) as { warnings: Array<{ scene: string; id: string; rule: string }> }).warnings, out: join(dir, "f.mp4") };
}
const ids = (w: Array<{ scene: string; id: string; rule: string }>, id: string): string[] => w.filter((x) => x.id === id).map((x) => `${x.scene}:${x.rule}`);

test("a stretch that stands still three seconds is named; a moving page is not", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-stretch-"));
  writeFileSync(join(dir, "still.html"), `<!doctype html><html><body style="margin:0;background:#fff;font:30px sans-serif"><p>Still text</p></body></html>`);
  writeFileSync(join(dir, "moving.html"), `<!doctype html><html><body style="margin:0;background:#fff;font:30px sans-serif">
<style>@keyframes s{from{transform:translateX(0)}to{transform:translateX(200px)}} p{animation:s 5s linear infinite}</style><p>Moving text</p></body></html>`);
  const { warnings } = build(dir, `${HEAD}## still · page\npage: still.html\nduration: 5\n\n## moving · page\npage: moving.html\nduration: 5\n`);
  assert.deepEqual(ids(warnings, "still-stretch"), ["still:FC-9"]);
});

test("a frame flashing more than three times a second is named; a slow blink is not", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-flash-"));
  const page = (period: number): string => `<!doctype html><html><body style="margin:0">
<style>@keyframes f{0%,49%{background:#000}50%,100%{background:#fff}} body{height:100vh;animation:f ${period}s steps(1) infinite}</style></body></html>`;
  writeFileSync(join(dir, "fast.html"), page(0.2));
  writeFileSync(join(dir, "slow.html"), page(2));
  const { warnings } = build(dir, `${HEAD}## fast · page\npage: fast.html\nduration: 3\n\n## slow · page\npage: slow.html\nduration: 3\n`);
  assert.deepEqual(ids(warnings, "flashing"), ["fast:FC-66"]);
});

test("clicks of a take after the speech ends are named as action without words", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-silent-"));
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=s=320x180:r=10:d=5", "-c:v", "libx264", "-pix_fmt", "yuv420p", join(dir, "late.mp4")]);
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=s=320x180:r=10:d=5", "-c:v", "libx264", "-pix_fmt", "yuv420p", join(dir, "early.mp4")]);
  writeFileSync(join(dir, "late.mp4.marks.json"), JSON.stringify({ marks: {}, clicks: [{ t: 4, x: 0.5, y: 0.5 }] }));
  writeFileSync(join(dir, "early.mp4.marks.json"), JSON.stringify({ marks: {}, clicks: [{ t: 0.4, x: 0.5, y: 0.5 }] }));
  const { warnings } = build(dir, `${HEAD}## late · video\nfile: late.mp4\nduration: 5\n\nClick.\n\n## early · video\nfile: early.mp4\nduration: 5\n\nClick.\n`);
  assert.deepEqual(ids(warnings, "silent-action"), ["late:FC-25"]);
});

test("a still in a scene's fade is named; one inside the scene is not", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-stillfade-"));
  writeFileSync(join(dir, "p.html"), `<!doctype html><html><body style="margin:0;background:#fff"><h1>Page</h1></body></html>`);
  const { warnings } = build(dir, `${HEAD}## p · page\npage: p.html\nduration: 3\nstills: 0.05 | 50%\n`);
  assert.equal(ids(warnings, "still-in-fade").length, 1);
});

test("a feed film opens on its first scene without a fade from black; an authored dark start is named", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-loop-"));
  writeFileSync(join(dir, "p.html"), `<!doctype html><html><body style="margin:0;background:#fff"><h1 style="font:80px sans-serif">Product</h1></body></html>`);
  const feed = `# L\nlang: en\ntheme: midnight\nformat: vertical\nzone: platform\nframe: {"fps":10}\nvoice: {"engine":"stub","name":"silent","cps":15}\n\n## a · page\npage: p.html\nduration: 2\n`;
  const first = (file: string): number => {
    const raw = execFileSync(ffmpeg, ["-loglevel", "error", "-i", file, "-frames:v", "1", "-vf", "scale=32:18,format=gray", "-f", "rawvideo", "-"]);
    return raw.reduce((a, v) => a + v, 0) / raw.length;
  };
  const plain = build(dir, feed);
  assert.ok(first(plain.out) > 200, `the first frame shows the page (${first(plain.out).toFixed(0)})`);
  assert.deepEqual(ids(plain.warnings, "loop-start"), []);
  const dark = build(dir, feed + "fade: 0.5\n");
  assert.deepEqual(ids(dark.warnings, "loop-start"), ["a:FC-64"]);
});
