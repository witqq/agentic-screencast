// Прерванная команда сборки не оставляет сирот: прежде SIGTERM команде убивал только её, а сборка
// с ffmpeg продолжала работать (25 минут в пересборке трейлера).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
/** Процессы, в командной строке которых есть каталог этой сборки. */
const alive = (dir: string): string[] => {
  try { return execFileSync("pgrep", ["-f", dir], { encoding: "utf8" }).trim().split("\n").filter(Boolean); } catch { return []; }
};

test("SIGTERM to a build command stops the build and its children", async () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "sc-interrupt-")));
  const scenes = Array.from({ length: 12 }, (_, i) => `## s${i} · slides.chapter\ntitle: Scene ${i}\nbody: A body line for scene ${i}\nduration: 4\n`).join("\n");
  writeFileSync(join(dir, "story.md"), `# I\nvoice: {"engine":"stub","name":"silent","cps":15}\n\n${scenes}`);
  const child = spawn("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") }, stdio: "ignore" });
  // Сборка успела начаться: её процесс с каталогом в командной строке жив.
  for (let i = 0; i < 40 && alive(dir).length < 1; i++) await sleep(250);
  assert.ok(alive(dir).length >= 1, "the build is running under the command");
  child.kill("SIGTERM");
  let left: string[] = [];
  for (let i = 0; i < 40; i++) { await sleep(250); left = alive(dir); if (!left.length) break; }
  assert.deepEqual(left, [], "no process of this build is left behind");
});
