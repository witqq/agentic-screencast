// Ролик без звуковой дорожки (`audio: false`) и эмодзи вне набора. Прежде у ролика всегда была
// дорожка — тишина, если речи нет, — а эмодзи, которого нет в наборе, роняло сборку посреди
// работы. Теперь дорожки нет вовсе, а незнакомое эмодзи заменяется кружком с предупреждением.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { bundledEmojiDir, emojiImage, emojiMap } from "../../emoji.js";

const ffprobe = createRequire(import.meta.url)("@ffprobe-installer/ffprobe").path as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

test("▶️ and 👁️ come from the bundled set, and an emoji outside it stands in as a circle with a warning", () => {
  const svg = (name: string): string => `data:image/svg+xml;base64,${readFileSync(join(bundledEmojiDir(), name)).toString("base64")}`;
  assert.equal(emojiImage("▶️"), svg("emoji_u25b6.svg"));
  assert.equal(emojiImage("👁️"), svg("emoji_u1f441.svg"));
  assert.throws(() => emojiImage("🦩"), /not in the bundled set/, "without a fallback the old refusal stands");
  const warned: string[] = [];
  const map = emojiMap(["a flamingo 🦩"], [], (g) => warned.push(g));
  assert.equal(map["🦩"], svg("fallback.svg"));
  assert.deepEqual(warned, ["🦩"]);
});

test("a film with audio: false has no audio stream, and an unknown emoji warns instead of failing the build", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-silent-"));
  writeFileSync(join(dir, "story.md"), `# Silent
lang: en
voice: {"engine":"stub","name":"silent","cps":15}
frame: {"width":320,"height":180,"fps":10,"scale":1}
audio: false

## one · slides.chapter
title: Play ▶️ and look 👁️ 🦩
body: No sound track at all
duration: 2
`);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "out.mp4"], { cwd: dir, encoding: "utf8",
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-600));
  assert.match(r.stderr, /warning: emoji 🦩 .* a neutral circle stands in for it/);
  const streams = execFileSync(ffprobe, ["-v", "error", "-show_entries", "stream=codec_type", "-of", "csv=p=0", join(dir, "out.mp4")], { encoding: "utf8" }).trim().split("\n");
  assert.deepEqual(streams, ["video"], "the film carries only a video stream");
});
