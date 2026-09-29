// Живые виды слайдов и эффекты накладки: разбираются из сценария, собираются в ролик и двигаются
// сами, пока идёт речь, — лента едет, глобус рисуется WebGL, уведомления приходят стопкой.
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
const W = 640, H = 360;

test("living kinds and overlay effects build and keep moving", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-living-"));
  writeFileSync(join(dir, "story.md"), `# Living\nlang: en\nvoice: {"engine":"stub","name":"silent","cps":15}\nframe: {"width":${W},"height":${H},"fps":10,"scale":1}\n\n`
    + `## mq · slides.marquee\ntitle: Works with\nitems: Linear | Notion | GitHub | Slack | Figma | Jira\nrows: 2\nduration: 3\nfade: none\n\n`
    + `## stk · slides.stack\nitems: One :: first | Two :: second | Three :: third\nduration: 3\n\n`
    + `## orb · slides.orbit\ntitle: Hub\nitems: A | B | C | D\nduration: 3\n\n`
    + `## ch · slides.chat\nitems: you :: Hi? | Agent :: Hello.\nduration: 3\n\n`
    + `## rg · slides.carousel\nitems: One :: a | Two :: b | Three :: c\nduration: 3\n\n`
    + `## gl · slides.globe\nitems: Berlin :: 52.5 13.4 | Tokyo :: 35.7 139.7\nduration: 3\n\n`
    + `## hero · slides.hero\ntitle: Built for {teams|you}\nduration: 3\n`
    + `overlay: {"toasts":[{"at":0.5,"title":"Done"}],"pings":[{"at":0.5,"point":[0.3,0.6]}],"boops":[{"at":1,"target":".hero-title"}]}\n`);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8",
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-600));
  const frame = (t: number): Buffer => execFileSync(ffmpeg, ["-loglevel", "error", "-ss", String(t), "-i", join(dir, "f.mp4"),
    "-frames:v", "1", "-vf", "format=gray", "-f", "rawvideo", "-"]);
  // Лента едет и после того, как всё появилось: два кадра одной сцены с разницей в секунду различаются.
  const a = frame(1.5), b = frame(2.5);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff += Math.abs(a[i]! - b[i]!);
  assert.ok(diff / a.length > 1, `the strip keeps moving (${(diff / a.length).toFixed(2)})`);
  // Слово в заголовке сменилось, уведомление пришло: сцена hero в конце отличается от начала.
  const h0 = frame(18.4), h1 = frame(20.6);
  let hd = 0;
  for (let i = 0; i < h0.length; i++) hd += Math.abs(h0[i]! - h1[i]!);
  assert.ok(hd / h0.length > 0.5, `the hero scene changes as its word rotates (${(hd / h0.length).toFixed(2)})`);
});

test("a globe item without latitude and longitude is a parse error", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-living-bad-"));
  writeFileSync(join(dir, "story.md"), `# Bad\nlang: en\nvoice: {"engine":"stub","name":"silent","cps":15}\n\n## gl · slides.globe\nitems: Berlin :: north | Tokyo :: 35 139\nduration: 2\n`);
  const r = spawnSync("node", [ENTRY, "lint", "story.md"], { cwd: dir, encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /latitude longitude/u);
});
