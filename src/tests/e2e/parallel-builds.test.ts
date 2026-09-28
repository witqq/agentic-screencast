// Две сборки с общим кэшем одновременно — два языка или два формата одного сценария. Прежде список
// сегментов и рабочие файлы склейки лежали в кэше под общими именами, и сборки писали их друг
// другу: один ролик выходил обрезанным до чужой длины, другой падал на недописанном видео.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");
const probe = createRequire(import.meta.url)("@ffprobe-installer/ffprobe").path as string;

test("two builds sharing a cache at once each get their own whole film", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-parallel-"));
  const scene = (i: number): string => `## s${i} · slides.hero\ntitle: Scene ${i}\nduration: 1\n`;
  writeFileSync(join(dir, "story.md"), `# P\nvoice: {"engine":"stub","name":"silent","cps":15}\nframe: {"width":640,"height":360,"fps":10,"scale":1}\n\n${[1, 2, 3, 4].map(scene).join("\n")}`);
  const build = (out: string, extra: string[]): Promise<number> => new Promise((ok) => {
    spawn("node", [ENTRY, "build", "story.md", "--out", out, ...extra], { cwd: dir, stdio: "ignore",
      env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } }).on("exit", (c) => ok(c ?? 1));
  });
  const codes = await Promise.all([build("wide.mp4", []), build("tall.mp4", ["--format", "vertical"])]);
  assert.deepEqual(codes, [0, 0]);
  for (const f of ["wide.mp4", "tall.mp4"]) {
    const d = Number(execFileSync(probe, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", join(dir, f)], { encoding: "utf8" }));
    assert.ok(Math.abs(d - 4) < 0.3, `${f} lasts ${d} s, the whole four-second film`);
  }
});
