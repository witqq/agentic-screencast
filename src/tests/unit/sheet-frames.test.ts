// Лист кадров сырого клипа и кадр видеосцены из её куска.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

function clip(): string {
  const dir = mkdtempSync(join(tmpdir(), "sc-sheet-"));
  // Каждая секунда клипа своего цвета: по кадру видно, из какой он секунды.
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "color=c=black:s=320x180:r=10:d=40", "-vf",
    "geq=r='mod(floor(T)*37\\,256)':g='mod(floor(T)*91\\,256)':b='mod(floor(T)*53\\,256)'", "-pix_fmt", "yuv420p", join(dir, "c.mp4")]);
  return dir;
}
const pixel = (png: string): number[] => [...execFileSync(ffmpeg, ["-loglevel", "error", "-i", png, "-vf", "scale=1:1:flags=area", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"])];
const colourAt = (sec: number): number[] => [(sec * 37) % 256, (sec * 91) % 256, (sec * 53) % 256];
const near = (a: number[], b: number[]): boolean => a.every((v, i) => Math.abs(v - b[i]!) < 12);

test("sheet lays out frames of a raw clip with the second of each", () => {
  const dir = clip();
  const r = spawnSync("node", [ENTRY, "sheet", "c.mp4", "--count", "6", "--from", "10", "--to", "22", "--out", "s.png"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const rep = JSON.parse(r.stdout) as { sheet: string; frames: Array<{ at: number; file: string }> };
  assert.equal(rep.frames.length, 6);
  assert.ok(rep.frames.every((f) => f.at > 10 && f.at < 22), `the frames lie in the piece (${rep.frames.map((f) => f.at).join(" ")})`);
  for (const f of rep.frames) assert.ok(near(pixel(f.file), colourAt(Math.floor(f.at))), `the frame at ${f.at}s is that second of the clip`);
  assert.ok(existsSync(rep.sheet) && readFileSync(rep.sheet).length > 5000, "the sheet is written");
  assert.notEqual(spawnSync("node", [ENTRY, "sheet", "nothing.mp4"], { cwd: dir, encoding: "utf8" }).status, 0, "a missing clip is refused");
});

test("frames shows a video scene's frame from its own piece and names the clip second", () => {
  const dir = clip();
  writeFileSync(join(dir, "story.md"), `# F\nvoice: {"engine":"stub","name":"silent","cps":15}\nframe: {"width":320,"height":180,"fps":10,"scale":1}\n\n## fight · video\nfile: c.mp4\nfrom: 31\nto: 34\n`);
  const r = spawnSync("node", [ENTRY, "frames", "--source", "story.md", "--at", "0.5", "--out", "f.png"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const rep = JSON.parse(r.stdout) as { frames: Array<{ scene: string; at: number; source: number; file: string }> };
  const f = rep.frames[0]!;
  assert.ok(f.source >= 31 && f.source <= 34, `the frame comes from the piece 31–34 s (clip ${f.source}s)`);
  assert.ok(Math.abs(f.at - 1.7) < 0.2, `half of the scene is half of its 3 s piece plus the tail (${f.at}s)`);
  assert.ok(near(pixel(f.file), colourAt(Math.floor(f.source))), "and the picture is that second of the clip");
});
