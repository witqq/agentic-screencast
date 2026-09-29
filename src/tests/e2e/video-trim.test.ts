// Кусок дубля: `from`/`to` видеосцены — секунды или отметки исходного клипа. Сцена длится столько,
// сколько кусок, отметки внутри него отсчитываются от его начала, а тема дубля остаётся видна lint.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { lint } from "../../lint.js";
import { THEMES, themeFingerprint } from "../../theme.js";

const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

test("from @a to @b plays that piece of the take; a spotlight and a still on @c land at c−a of the scene", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-trim-"));
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=s=320x180:r=10:d=10", "-c:v", "libx264", "-pix_fmt", "yuv420p", join(dir, "take.mp4")]);
  writeFileSync(join(dir, "take.mp4.marks.json"), JSON.stringify({ trimmed: 0, marks: { a: 2, c: 2.8, b: 6, late: 8 }, clicks: [], theme: themeFingerprint(THEMES.midnight!) }));
  const story = (theme: string): string => `# T
lang: en
voice: {"engine":"stub","name":"silent","cps":15}
frame: {"width":320,"height":180,"fps":10,"scale":1}
theme: ${theme}

## v · video
file: take.mp4
from: @a
to: @b
tail: 0
spotlight: [{"area":[0.1,0.1,0.4,0.4],"at":"@c"}]
stills: @c :: the focus arrives
`;
  writeFileSync(join(dir, "story.md"), story("midnight"));
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "out.mp4"], { cwd: dir, encoding: "utf8",
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-800));
  const report = JSON.parse(r.stdout) as { duration: number; scenes: Array<{ id: string; spotlights?: Array<{ at: number }> }>;
    stills?: Array<{ time: number }>; marks?: Array<{ mark: string; film: number }> };
  assert.ok(Math.abs(report.duration - 4) < 0.15, `the scene lasts b−a = 4 s (${report.duration})`);
  assert.equal(report.scenes.find((s) => s.id === "v")!.spotlights?.[0]!.at, 0.8, "the spotlight lands at c−a");
  assert.ok(Math.abs(report.stills![0]!.time - 0.8) < 0.11, `the still is taken at c−a (${report.stills![0]!.time})`);
  assert.deepEqual(report.marks?.map((m) => `${m.mark}=${m.film}`), ["@a=0", "@c=0.8", "@b=4"], "marks outside the piece drop out");
  // Тема дубля по-прежнему сверяется со сценой.
  writeFileSync(join(dir, "story.md"), story("noir"));
  assert.equal(lint(join(dir, "story.md")).filter((f) => f.id === "take-theme").length, 1);
});
