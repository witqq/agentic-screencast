// `format: vertical` и `square` дают мастер площадок — 30 кадров в секунду (docs/vertical-video.md,
// «One master for every platform»). Прежде формат задавал только размер, и ролик выходил в 25
// кадров, расходясь с базой знаний; названный `frame` по-прежнему сильнее.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSource } from "../../source.js";

const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");
const FFPROBE = (createRequire(import.meta.url)("@ffprobe-installer/ffprobe") as { path: string }).path;

test("a vertical film is 30 fps by default, a named frame fps wins, and a horizontal film keeps 25", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-fps-"));
  const story = (header: string): string => {
    const f = join(dir, `s${Math.random().toString(36).slice(2)}.md`);
    writeFileSync(f, `# F\n${header}voice: {"engine":"stub","name":"silent","cps":15}\n\n## a · slides.chapter\ntitle: A\nbody: B\n\nOne beat.\n`);
    return f;
  };
  assert.equal(parseSource(story("format: vertical\n")).frame?.fps, 30);
  assert.equal(parseSource(story("format: square\n")).frame?.fps, 30);
  assert.equal(parseSource(story(`format: vertical\nframe: {"fps":24}\n`)).frame?.fps, 24);
  assert.equal(parseSource(story("")).frame?.fps, undefined, "a horizontal film keeps the build's default");
  const f = story("format: vertical\n");
  const r = spawnSync("node", [ENTRY, "build", f, "--out", join(dir, "v.mp4")], { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-400));
  const rate = execFileSync(FFPROBE, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", join(dir, "v.mp4")], { encoding: "utf8" }).trim();
  assert.equal(rate, "30/1");
});
