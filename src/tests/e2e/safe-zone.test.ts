// Текст своей страницы в вертикальном ролике для ленты не заходит под кнопки и подпись площадки:
// сборка меряет его по кадру как есть — с наездом камеры — и называет строки за безопасной зоной.
// В замере базы кнопка призыва тизера стояла за границей зоны, и об этом не сказал никто.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");
const page = (left: number): string => `<!doctype html><html><body style="margin:0;background:#fff;font:56px sans-serif">
<p style="position:absolute;left:120px;top:700px;margin:0">Centred line</p>
<button style="position:absolute;left:${left}px;top:900px;width:300px;font:48px sans-serif">Sign up</button></body></html>`;

test("a vertical feed film names page text that goes past the safe zone, and only that", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-safe-"));
  writeFileSync(join(dir, "bad.html"), page(760));
  writeFileSync(join(dir, "good.html"), page(300));
  writeFileSync(join(dir, "story.md"), `# F\nlang: en\nformat: vertical\nzone: platform\nframe: {"fps":5}\nvoice: {"engine":"stub","name":"silent","cps":15}\n\n`
    + `## bad · page\npage: bad.html\n\nThe first page.\n\n## good · page\npage: good.html\n\nThe second page.\n`);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8",
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-400));
  const w = (JSON.parse(r.stdout) as { warnings: Array<{ scene: string; id: string; rule: string; message: string }> }).warnings
    .filter((x) => x.id === "safe-zone");
  assert.deepEqual(w.map((x) => `${x.scene}:${x.rule}`), ["bad:FC-58"]);
  assert.match(w[0]!.message, /Sign up.*right/u);
});
