// Отчёт ключей называет движок у каждого такта, и у такта со сдвигом высоты (`pitch`) тоже: прежде
// у сдвинутой записи не было пометки, и отчёт говорил «неизвестно» о синтезированной речи.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

test("keys-only names the engine of every beat, a pitch-shifted one included, fresh or from the cache", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-voiced-"));
  writeFileSync(join(dir, "story.md"), `# V\nvoice: {"engine":"stub","name":"silent","cps":15,"pitch":-2}\n\n## a · slides.chapter\ntitle: A\nbody: B\n\nOne beat.\n\nAnother beat.\n`);
  const keys = (): Array<{ beats: Array<{ voiced: string }> }> => {
    const r = spawnSync("node", [ENTRY, "build", "story.md", "--keys-only"], { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
    assert.equal(r.status, 0, r.stderr.slice(-300));
    return (JSON.parse(r.stdout) as { keys: Array<{ beats: Array<{ voiced: string }> }> }).keys;
  };
  for (const run of [keys(), keys()]) {
    assert.deepEqual(run.flatMap((s) => s.beats.map((b) => b.voiced)), ["stub", "stub"]);
  }
});
