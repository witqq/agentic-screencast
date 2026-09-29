// Ворота перед сдачей: чистый ролик проходит, открытый пункт чеклиста или сценарий, исправленный
// после сборки, — нет, и итог называет проверку, которая не прошла.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");
const rows = Array.from({ length: 12 }, (_, i) => `<p style="margin:10px 40px">Row ${i + 1} — revenue, costs and a note</p>`).join("");

test("handover passes a clean film and fails an open checklist box or a scenario edited after the build", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-handover-"));
  writeFileSync(join(dir, "p.html"), `<!doctype html><html><body style="margin:0;background:#f4f4f4;font:28px sans-serif">
<style>@keyframes s{from{transform:translateX(0)}to{transform:translateX(60px)}} div{animation:s 4s linear infinite}</style><div>${rows}</div></body></html>`);
  writeFileSync(join(dir, "story.md"), `# H\nlang: en\nvoice: {"engine":"stub","name":"silent","cps":15}\nframe: {"width":640,"height":360,"fps":10,"scale":1}\n\n`
    + `## p · page\npage: p.html\nstills: 50%\n\nThe page shows the quarter row by row.\n`);
  writeFileSync(join(dir, "checklist.md"), "- [x] brief\n- [x] story\n");
  const env = { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") };
  const b = spawnSync("node", [ENTRY, "build", "story.md", "--out", "draft.mp4"], { cwd: dir, encoding: "utf8", env });
  assert.equal(b.status, 0, b.stderr.slice(-400));
  const gate = (): { status: number | null; verdict: string; failed: string[] } => {
    const r = spawnSync("node", [ENTRY, "handover", "story.md", "--film", "draft.mp4"], { cwd: dir, encoding: "utf8", env });
    const out = JSON.parse(r.stdout) as { verdict: string; checks: Array<{ name: string; passed: boolean; findings: unknown[] }> };
    return { status: r.status, verdict: out.verdict, failed: out.checks.filter((c) => !c.passed).map((c) => c.name) };
  };
  const clean = gate();
  assert.deepEqual([clean.status, clean.verdict, clean.failed], [0, "pass", []]);

  writeFileSync(join(dir, "checklist.md"), "- [x] brief\n- [ ] story\n");
  assert.deepEqual(gate().failed, ["checklist"]);
  writeFileSync(join(dir, "checklist.md"), "- [x] brief\n- [x] story\n");

  // Сценарий правлен после сборки: ролик показывает прежнюю редакцию.
  const later = new Date(Date.now() + 60_000);
  writeFileSync(join(dir, "story.md"), readFileSync(join(dir, "story.md"), "utf8"));
  utimesSync(join(dir, "story.md"), later, later);
  const stale = gate();
  assert.deepEqual([stale.status, stale.verdict, stale.failed], [1, "fail", ["build"]]);
});
