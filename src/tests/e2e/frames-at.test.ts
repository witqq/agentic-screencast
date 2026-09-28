// `frames --at 90%` читалось как не-число и молча давало чёрный кадр за концом сцены.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");
const FFMPEG = createRequire(import.meta.url)("ffmpeg-static") as string;

test("frames --at takes a share as 0.9 or 90% alike, and refuses what is neither", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-frames-at-"));
  writeFileSync(join(dir, "story.md"), `# F\nlang: en\nvoice: {"engine":"stub","name":"silent","cps":15}\n\n## a · slides.chapter\ntitle: A\nbody: B\n\nOne short beat of speech.\n`);
  const run = (at: string, out: string): number | null => spawnSync("node", [ENTRY, "frames", "--source", "story.md", "--at", at, "--out", out],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } }).status;
  assert.equal(run("90%", "p.png"), 0);
  assert.equal(run("0.9", "f.png"), 0);
  assert.ok(readFileSync(join(dir, "p.png")).equals(readFileSync(join(dir, "f.png"))), "90% and 0.9 draw the same frame");
  const bad = spawnSync("node", [ENTRY, "frames", "--source", "story.md", "--at", "abc"], { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /--at abc: expected a share of the scene \(0\.8 or 80%\), seconds \(2\.4s\) or a moment of the speech/);
  writeFileSync(join(dir, "story.md"), readFileSync(join(dir, "story.md"), "utf8").replace("lang: en", "lang: ru"));
  const russian = spawnSync("node", [ENTRY, "frames", "--source", "story.md", "--at", "abc"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(russian.status, 2);
  assert.match(russian.stderr, /--at abc: укажите долю сцены/);
});

test("frames --at takes a moment of the speech: b2+0.5 is the estimated second beat plus half a second", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-frames-beat-"));
  // Такты по 30 знаков при 15 зн/с — по 2 с: b2+0.5 = 2,5 с.
  writeFileSync(join(dir, "story.md"), `# F\nvoice: {"engine":"stub","name":"silent","cps":15}\n\n## a · slides.chapter\ntitle: A\nbody: B\n\n`
    + "The first beat, thirty chars.\n\nThe second beat, thirty char.\n");
  const r = spawnSync("node", [ENTRY, "frames", "--source", "story.md", "--at", "b2+0.5", "--scene", "a", "--out", "b.png"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-400));
  const at = (JSON.parse(r.stdout) as { frames: Array<{ at: number }> }).frames[0]!.at;
  assert.ok(Math.abs(at - 2.5) < 0.1, `b2+0.5 lands at 2.5s, got ${at}`);
});

test("frames --help prints the command's help instead of drawing, and a missing slide image is one line, not a stack", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-frames-help-"));
  const env = { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") };
  const help = spawnSync("node", [ENTRY, "frames", "--help"], { cwd: dir, encoding: "utf8", env });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /agentic-screencast frames .*--at/);
  assert.match(help.stdout, /More: agentic-screencast help/);
  writeFileSync(join(dir, "story.md"), `# F\nlang: en\nvoice: {"engine":"stub","name":"silent","cps":15}\n\n## a · slides.shot\nimage: missing.png\n\nOne beat.\n`);
  const miss = spawnSync("node", [ENTRY, "frames", "--source", "story.md"], { cwd: dir, encoding: "utf8", env });
  assert.notEqual(miss.status, 0);
  assert.match(miss.stderr, /image not found: missing\.png/);
  assert.doesNotMatch(miss.stderr, /^\s+at /m, `no stack trace: ${miss.stderr}`);
});

test("a video frame preview includes the spoken subtitle rather than only the fitted clip", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-video-frame-caption-"));
  execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=#203040:s=640x360:r=10:d=3",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", join(dir, "take.mp4")]);
  writeFileSync(join(dir, "story.md"), `# Preview\nvoice: {"engine":"stub","name":"silent","cps":15}\nframe: {"width":640,"height":360,"fps":10}\ncaptions: {"style":"subtitle","everywhere":true}\n\n## v · video\nfile: take.mp4\n\nThe film places these spoken words over the captured screen.\n`);
  const preview = spawnSync("node", [ENTRY, "frames", "--source", "story.md", "--scene", "v", "--at", "1s", "--out", "preview.png"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(preview.status, 0, preview.stderr.slice(-500));
  execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-ss", "1", "-i", join(dir, "take.mp4"),
    "-frames:v", "1", join(dir, "bare.png")]);
  const rgb = (file: string): Buffer => execFileSync(FFMPEG,
    ["-nostdin", "-loglevel", "error", "-i", join(dir, file), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
  assert.notDeepEqual(rgb("preview.png"), rgb("bare.png"), "captioned preview must differ from the plain source frame");
});

test("a sparse trailer card is intentional and not reported as an empty frame", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-trailer-frame-"));
  writeFileSync(join(dir, "story.md"), `# Trailer\nvoice: {"engine":"stub","name":"silent"}\n\n## card · slides.card\ntitle: NOW\nduration: 2\n`);
  const preview = spawnSync("node", [ENTRY, "frames", "--source", "story.md", "--scene", "card", "--at", "1s", "--out", "card.png"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(preview.status, 0, preview.stderr.slice(-500));
  assert.equal((JSON.parse(preview.stdout) as { empty?: unknown[] }).empty, undefined);
});

test("a selected frame or sheet can render before a later scene's image exists", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-frame-source-order-"));
  writeFileSync(join(dir, "story.md"), `# Order\nvoice: {"engine":"stub","name":"silent"}\n\n## ready · slides.chapter\ntitle: Ready\nbody: The first frame\n\nA spoken beat.\n\n## later · slides.shot\nimage: not-made-yet.png\n\nAnother spoken beat.\n`);
  const run = (...args: string[]) => spawnSync("node", [ENTRY, "frames", "--source", "story.md", ...args],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  const selected = run("--scene", "ready", "--out", "ready.png");
  assert.equal(selected.status, 0, selected.stderr.slice(-500));
  const firstSheet = run("--except", "later", "--out", "first-sheet.png");
  assert.equal(firstSheet.status, 0, firstSheet.stderr.slice(-500));
  assert.deepEqual((JSON.parse(firstSheet.stdout) as { frames: Array<{ scene: string }> }).frames.map((f) => f.scene), ["ready"]);
  const full = run("--out", "full.png");
  assert.notEqual(full.status, 0, "the finished sheet still requires every scene's real material");
  assert.match(full.stderr, /not-made-yet\.png/);
});

test("a selected frame or excluded sheet ignores an absent marked take but validates its syntax", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-frame-marked-take-"));
  const story = `# Order\nlang: en\nvoice: {"engine":"stub","name":"silent"}\n\n## ready · slides.chapter\ntitle: Ready\nbody: The first frame\n\nA spoken beat.\n\n## later · video\nfile: not-recorded.webm\nfrom: @start\n\nAnother spoken beat.\n`;
  writeFileSync(join(dir, "story.md"), story);
  const run = (...args: string[]) => spawnSync("node", [ENTRY, "frames", "--source", "story.md", ...args],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  const selected = run("--scene", "ready", "--out", "ready.png");
  assert.equal(selected.status, 0, selected.stderr.slice(-500));
  const sheet = run("--except", "later", "--out", "sheet.png");
  assert.equal(sheet.status, 0, sheet.stderr.slice(-500));
  assert.deepEqual((JSON.parse(sheet.stdout) as { frames: Array<{ scene: string }> }).frames.map((f) => f.scene), ["ready"]);
  const malformed = story.replace("from: @start", "from: @start\noverlay: not-json");
  writeFileSync(join(dir, "story.md"), malformed);
  assert.match(run("--scene", "ready", "--out", "ready.png").stderr, /overlay/);
});
