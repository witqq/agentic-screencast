// Пустая полоса в трети кадра и больше у нарисованной сцены — дефект правила 58. Лист кадров её
// называл, а сборка молчала, и агент, не открывший лист, отдавал такой кадр. Теперь сборка меряет
// готовый сегмент той же мерой и предупреждает.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

test("the build names a drawn scene with an empty band a third of the frame high, and not a full one", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-empty-"));
  writeFileSync(join(dir, "bad.html"), `<!doctype html><html><body style="margin:0;background:#f4f4f4;font:48px sans-serif"><h1 style="margin:40px">Only a heading</h1></body></html>`);
  const rows = Array.from({ length: 14 }, (_, i) => `<p style="margin:14px 40px">Row ${i + 1} — revenue, costs and a note about the quarter</p>`).join("");
  writeFileSync(join(dir, "good.html"), `<!doctype html><html><body style="margin:0;background:#f4f4f4;font:40px sans-serif">${rows}</body></html>`);
  writeFileSync(join(dir, "story.md"), `# F\nlang: en\nframe: {"width":960,"height":540,"fps":5}\nvoice: {"engine":"stub","name":"silent","cps":15}\n\n`
    + `## bad · page\npage: bad.html\n\nThe first page.\n\n## good · page\npage: good.html\n\nThe second page.\n`);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8",
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-400));
  const w = (JSON.parse(r.stdout) as { warnings: Array<{ scene: string; id: string; rule: string }> }).warnings.filter((x) => x.id === "empty-area");
  assert.deepEqual(w.map((x) => `${x.scene}:${x.rule}`), ["bad:FC-58"]);
});
