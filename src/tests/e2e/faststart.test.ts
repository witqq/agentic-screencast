// Готовый ролик начинается с индекса MP4 (`moov` раньше `mdat`): плеер страницы показывает его до
// конца загрузки. Прежде так писал только выпуск `web`, а сам ролик сборки — нет (замер базы).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { topAtoms } from "../../web.js";

const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

test("the built film has its index before the media, with and without film layers", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-faststart-"));
  writeFileSync(join(dir, "p.html"), `<!doctype html><html><body style="margin:0;background:#fff"><h1>Page</h1></body></html>`);
  const head = `# F\nlang: en\nvoice: {"engine":"stub","name":"silent","cps":15}\nframe: {"width":320,"height":180,"fps":10,"scale":1}\n`;
  const scene = `\n## p · page\npage: p.html\n\nOne spoken beat.\n`;
  for (const [name, extra] of [["plain", ""], ["layered", `look: {"grain":0.1}\n`]] as const) {
    writeFileSync(join(dir, "story.md"), head + extra + scene);
    const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", `${name}.mp4`], { cwd: dir, encoding: "utf8",
      env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
    assert.equal(r.status, 0, r.stderr.slice(-400));
    const atoms = topAtoms(join(dir, `${name}.mp4`));
    assert.ok(atoms.indexOf("moov") >= 0 && atoms.indexOf("moov") < atoms.indexOf("mdat"), `${name}: ${atoms.join(" ")}`);
    const w = (JSON.parse(r.stdout) as { warnings: Array<{ id: string }> }).warnings;
    assert.deepEqual(w.filter((x) => x.id === "faststart"), []);
  }
});
