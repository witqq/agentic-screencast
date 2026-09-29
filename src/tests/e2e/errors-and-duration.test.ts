// Сценарий со `speed` за пределами куска ловит lint, а сборка отказывает одной строкой без стека;
// у немой видеосцены названная длительность режет клип.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { lint } from "../../lint.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

function dirWithClip(): string {
  const dir = mkdtempSync(join(tmpdir(), "sc-err-"));
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=size=160x90:rate=10:duration=8", "-pix_fmt", "yuv420p", join(dir, "c.mp4")]);
  return dir;
}
const story = (scene: string): string => `# E\nvoice: {"engine":"stub","name":"silent","cps":15}\nframe: {"width":160,"height":90,"fps":10,"scale":1}\n\n${scene}`;

test("lint names a speed that runs past the piece a scene shows, and the build refuses it in one line", () => {
  const dir = dirWithClip();
  // Кусок — секунды 5–7,5 исходника (2,5 с), а speed записан секундами исходника.
  writeFileSync(join(dir, "story.md"), story(`## fight · video\nfile: c.mp4\nfrom: 5\nto: 7.5\nspeed: [{"from":5.5,"to":6.4,"rate":0.5}]\n`));
  const f = lint(join(dir, "story.md")).filter((x) => x.id === "speed-range");
  assert.equal(f.length, 1, "lint finds the speed past the piece");
  assert.equal(f[0]!.scene, "fight");
  assert.match(f[0]!.message, /2\.50s long.*count from the start of the piece.*write 1\.40s/);
  const r = spawnSync("node", [ENTRY, "build", "--source", "story.md", "--out", "f.mp4"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /build failed: scene fight: speed: step ends at 6\.4s, past the 2\.50s clip; speed seconds count from the start of the piece/);
  assert.doesNotMatch(r.stderr, /\n\s+at /, "no Node stack");
  // Кусок в пределах: находки нет.
  writeFileSync(join(dir, "story.md"), story(`## fight · video\nfile: c.mp4\nfrom: 5\nto: 7.5\nspeed: [{"from":0.5,"to":1.4,"rate":0.5}]\n`));
  assert.equal(lint(join(dir, "story.md")).filter((x) => x.id === "speed-range").length, 0);
  // Перелёт на 4 мс за конец куска: подсказка — конец куска числом, а не «write 0.00s».
  writeFileSync(join(dir, "story.md"), story(`## fight · video\nfile: c.mp4\nfrom: 5\nto: 7.5\nspeed: [{"from":1,"to":2.504,"rate":0.5}]\n`));
  const over = lint(join(dir, "story.md")).filter((x) => x.id === "speed-range");
  assert.equal(over.length, 1);
  assert.match(over[0]!.message, /end the speed at 2\.50s at the latest, or lengthen the piece \(to\)/);
  assert.doesNotMatch(over[0]!.message, /write 0\.00s/);
});

test("a silent video scene lasts its named duration, cutting a longer clip", () => {
  const dir = dirWithClip();
  writeFileSync(join(dir, "story.md"), story(`## fight · video\nfile: c.mp4\nfrom: 1\nto: 4\nduration: 2.2\n`));
  const r = spawnSync("node", [ENTRY, "build", "--source", "story.md", "--out", "f.mp4"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr);
  const rep = JSON.parse(r.stdout) as { duration: number };
  assert.ok(Math.abs(rep.duration - 2.2) < 0.06, `the scene lasts 2.2 s, not the 3 s piece (${rep.duration})`);
});
