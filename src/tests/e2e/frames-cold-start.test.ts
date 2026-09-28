import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

test("a sheet can make the real image used by one of its later scenes on a clean run", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-sheet-cold-start-"));
  writeFileSync(join(dir, "story.md"), `# Sheet
voice: {"engine":"stub","name":"silent"}
frame: {"width":640,"height":360,"fps":10}

## first · slides.chapter
title: The first frame
body: An actual frame from this scenario.
duration: 2

## later · slides.photo
image: top.png
duration: 2
`);
  const run = (...args: string[]) => spawnSync("node", [ENTRY, "frames", "--source", "story.md", ...args],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });

  assert.equal(existsSync(join(dir, "top.png")), false, "the dependent image is initially absent");
  const first = run("--except", "later", "--out", "first-sheet.png");
  assert.equal(first.status, 0, first.stderr.slice(-500));
  assert.deepEqual((JSON.parse(first.stdout) as { frames: Array<{ scene: string }> }).frames.map((f) => f.scene), ["first"]);

  const actualSheet = readFileSync(join(dir, "first-sheet.png"));
  writeFileSync(join(dir, "top.png"), actualSheet);
  const final = run("--out", "final-sheet.png");
  assert.equal(final.status, 0, final.stderr.slice(-500));
  assert.deepEqual((JSON.parse(final.stdout) as { frames: Array<{ scene: string }> }).frames.map((f) => f.scene), ["first", "later"]);
  assert.ok(existsSync(join(dir, "final-sheet-frames", "later.png")), "the formerly unavailable scene has a real frame");
  assert.ok(readFileSync(join(dir, "slides", "later.html"), "utf8").includes(actualSheet.toString("base64")),
    "the generated slide embeds this run's first sheet, rather than an old image");
});
