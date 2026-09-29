// Фокусы проверяются до сборки. Столкновение двух движений камеры называет оба фокуса, их секунды
// и нужный зазор, и `lint` видит его по оценке тактов; удержание фокуса над неподвижным клипом
// дольше 2 с — находка с советом пройти отрезок быстрее.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { compileSpotlights, parseSpotlight } from "../../spotlight.js";
import { lint } from "../../lint.js";
import { useLang } from "../../msg.js";

const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;
const TWO = '[{"area":[0.1,0.1,0.3,0.3],"at":"b1","until":"b1.end"},{"area":[0.5,0.5,0.3,0.3],"at":"b2+0.5"}]';

test("a focus that returns too late for the next names both focuses, their seconds and the gap", () => {
  useLang("en");
  assert.throws(() => compileSpotlights(parseSpotlight(TWO), { starts: [0, 2], ends: [2, 5], duration: 5, video: true }),
    /spotlight\[0\] at 0\.00s holds until 2\.00s and is back at 2\.80s, but spotlight\[1\] starts at 2\.50s; the camera needs 0\.35s between moves — start the next focus at 3\.15s or later, or leave out until/);
});

function story(spotlight: string, beats: string[], lang = "en"): string {
  const dir = mkdtempSync(join(tmpdir(), "sc-spot-lint-"));
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "color=c=gray:s=320x180:r=10:d=10", "-c:v", "libx264", "-pix_fmt", "yuv420p", join(dir, "clip.mp4")]);
  const file = join(dir, "story.md");
  writeFileSync(file, `# S\nlang: ${lang}\nvoice: {"engine":"stub","name":"silent","cps":15}\n\n## v · video\nfile: clip.mp4\nspotlight: ${spotlight}\n\n${beats.join("\n\n")}\n`);
  return file;
}

test("lint finds a spotlight collision before the build, and a long focus over a still clip", () => {
  const collide = lint(story(TWO, ["The first focus holds to the end of this line.", "Then the second one."]))
    .filter((f) => f.id === "spotlight-collision");
  assert.equal(collide.length, 1);
  assert.match(collide[0]!.message, /spotlight\[0\] at .* spotlight\[1\] starts at .*0\.35s between moves/);
  const russian = lint(story(TWO, ["Первый фокус удерживается до конца реплики.", "Следом начинается второй."], "ru"))
    .filter((f) => f.id === "spotlight-collision");
  assert.equal(russian.length, 1);
  assert.match(russian[0]!.message, /между движениями камеры нужно 0,35 с/);
  const still = lint(story('[{"area":[0.1,0.1,0.3,0.3],"at":"b1"}]', ["A long line of narration that keeps the focus on a clip where nothing moves at all."]))
    .filter((f) => f.id === "still-hold");
  assert.equal(still.length, 1, "a still clip under a long hold is named");
  assert.match(still[0]!.message, /speed: \[\{"from":/);
  const slowed = lint(story('[{"area":[0.1,0.1,0.3,0.3],"at":"b1","slow":0.5}]', ["A long line of narration that keeps the focus on a clip where nothing moves at all."]))
    .filter((f) => f.id === "still-hold");
  assert.deepEqual(slowed, [], "a focus that retimes the clip on purpose is left alone");
});
