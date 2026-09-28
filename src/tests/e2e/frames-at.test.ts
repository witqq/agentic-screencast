// `frames --at 90%` читалось как не-число и молча давало чёрный кадр за концом сцены.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

test("frames --at takes a share as 0.9 or 90% alike, and refuses what is neither", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-frames-at-"));
  writeFileSync(join(dir, "story.md"), `# F\nvoice: {"engine":"stub","name":"silent","cps":15}\n\n## a · slides.chapter\ntitle: A\nbody: B\n\nOne short beat of speech.\n`);
  const run = (at: string, out: string): number | null => spawnSync("node", [ENTRY, "frames", "--source", "story.md", "--at", at, "--out", out],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } }).status;
  assert.equal(run("90%", "p.png"), 0);
  assert.equal(run("0.9", "f.png"), 0);
  assert.ok(readFileSync(join(dir, "p.png")).equals(readFileSync(join(dir, "f.png"))), "90% and 0.9 draw the same frame");
  const bad = spawnSync("node", [ENTRY, "frames", "--source", "story.md", "--at", "abc"], { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /--at abc: expected a share of the scene \(0\.8 or 80%\), seconds \(2\.4s\) or a moment of the speech/);
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
  writeFileSync(join(dir, "story.md"), `# F\nvoice: {"engine":"stub","name":"silent","cps":15}\n\n## a · slides.shot\nimage: missing.png\n\nOne beat.\n`);
  const miss = spawnSync("node", [ENTRY, "frames", "--source", "story.md"], { cwd: dir, encoding: "utf8", env });
  assert.notEqual(miss.status, 0);
  assert.match(miss.stderr, /image not found: missing\.png/);
  assert.doesNotMatch(miss.stderr, /^\s+at /m, `no stack trace: ${miss.stderr}`);
});
