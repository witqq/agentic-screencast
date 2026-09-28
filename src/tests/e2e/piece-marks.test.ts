// Кусок дубля до отметки, а не «отметка плюс секунды»: при пересъёмке секунды устаревают, и план
// о шагах доезжал до следующей страницы. lint называет кусок, который переходит через отметку,
// не названную самой сценой: там начинается следующий план.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { lint } from "../../lint.js";

const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;

test("lint names a piece of a take that runs past a mark the scene does not name", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-piece-"));
  execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=1920x1080:duration=10:rate=25", "-pix_fmt", "yuv420p", join(dir, "take.mp4")]);
  writeFileSync(join(dir, "take.mp4.marks.json"), JSON.stringify({ version: 1, trimmed: 0, marks: { steps: 1, saved: 3, next: 6 }, clicks: [] }));
  const scene = (id: string, fields: string): string => `## ${id} · video\nfile: take.mp4\n${fields}\n\nThe steps are on screen.\n`;
  writeFileSync(join(dir, "story.md"), `# P\nlang: en\nvoice: {"engine":"stub","name":"silent","cps":15}\n\n`
    + scene("over", "from: @steps\nto: @steps+7") + "\n"
    + scene("exact", "from: @steps\nto: @next") + "\n"
    + scene("named", "from: @steps\nto: @next\nspotlight: [{\"area\":[0.1,0.1,0.3,0.3],\"at\":\"@saved\"}]") + "\n"
    + scene("checked", "from: @steps\nto: @next\nstills: @saved :: the intermediate state is visible") + "\n"
    + scene("checkedBlock", "from: @steps\nto: @next\nstills: |\n  - @saved :: the intermediate state is visible\n  - 50%") + "\n"
    + scene("mentioned", "from: @steps\nto: @next\nstills: 50% :: check @saved in the caption") + "\n"
    + scene("inside", "from: @steps\nto: @steps+1.5"));
  const found = lint(join(dir, "story.md")).filter((f) => f.rule === "piece-crosses-mark");
  assert.deepEqual(found.map((f) => f.scene), ["over", "exact", "named", "mentioned"], JSON.stringify(found));
  assert.match(found[0]!.message, /runs past @saved \(3s\)/);
});
