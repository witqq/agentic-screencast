// Мелочи, подсмотренные у Recordly (идеи, не код): GIF из ролика для мест, где видео не играет;
// характер движения камеры одним словом; ведущий в круге уменьшается, пока камера приближает кадр.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { encodeForWeb } from "../../web.js";
import { parseOverlay } from "../../overlay.js";
import { parseSpotlight } from "../../spotlight.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const ffprobe = require("@ffprobe-installer/ffprobe").path as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

test("web writes a looping GIF of a piece of the film at the asked width", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-gif-"));
  const film = join(dir, "film.mp4");
  execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=1280x720:duration=4:rate=25", "-pix_fmt", "yuv420p", film]);
  const r = encodeForWeb(film, { out: join(dir, "web"), formats: ["h264"], thumbs: 0, gif: { from: 0.5, to: 2.5, width: 320 } });
  assert.ok(r.gif && existsSync(r.gif.file) && r.gif.bytes > 0);
  const probe = execFileSync(ffprobe, ["-v", "error", "-show_entries", "stream=width,height:format=duration", "-of", "json", r.gif!.file], { encoding: "utf8" });
  const p = JSON.parse(probe) as { streams: Array<{ width: number; height: number }>; format: { duration: string } };
  assert.deepEqual([p.streams[0]!.width, p.streams[0]!.height], [320, 180]);
  assert.ok(Math.abs(Number(p.format.duration) - 2) < 0.2, `the GIF lasts the piece: ${p.format.duration}s`);
});

test("a camera style sets the move and the return unless they are named", () => {
  const cam = (extra: string): { move?: number; return?: number } => parseOverlay(`{"camera":[{"at":0,"hold":1,"area":[0.1,0.1,0.3,0.3]${extra}}]}`).camera![0]!;
  assert.deepEqual([cam(',"style":"snappy"').move, cam(',"style":"snappy"').return], [0.45, 0.5]);
  assert.deepEqual([cam(',"style":"gentle"').move, cam(',"style":"gentle"').return], [1.3, 1.2]);
  assert.equal(cam(',"style":"gentle","move":0.7').move, 0.7, "a named move wins over the style");
  assert.throws(() => cam(',"style":"wild"'), /style: expected gentle \| snappy/);
  assert.throws(() => parseSpotlight('[{"target":"#a","at":"b1","style":"wild"}]'), /style: expected gentle \| snappy/);
});

test("the presenter circle shrinks while the camera pushes in and returns to its size after", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-pip-"));
  execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=0x00ff00:s=320x320:d=6:r=25", "-pix_fmt", "yuv420p", join(dir, "me.mp4")]);
  writeFileSync(join(dir, "p.html"), `<!doctype html><body style="margin:0;background:#101826"><div id="t" style="position:absolute;left:300px;top:300px;width:400px;height:200px;background:#445"></div></body>`);
  writeFileSync(join(dir, "story.md"), `# P\nvoice: {"engine":"stub","name":"silent","cps":15}\npip: {"file":"me.mp4","corner":"bottom-right","size":0.2}\n\n## a · page\npage: p.html\nduration: 5\noverlay: {"camera":[{"at":1,"move":0.6,"hold":1.6,"target":"#t","return":0.6}]}\n`);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-400));
  const green = (t: number): number => {
    const raw = execFileSync(ffmpeg, ["-loglevel", "error", "-ss", String(t), "-i", join(dir, "f.mp4"), "-frames:v", "1", "-vf", "crop=600:600:1320:480", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 16 * 1024 * 1024 });
    let n = 0;
    for (let i = 0; i < raw.length; i += 3) if (raw[i + 1]! > 180 && raw[i]! < 90 && raw[i + 2]! < 90) n++;
    return n;
  };
  const before = green(0.5), during = green(2.4), after = green(4.6);
  assert.ok(during < before * 0.6, `the circle shrinks during the push-in: ${during} vs ${before} green points`);
  assert.ok(Math.abs(after - before) < before * 0.05, `and comes back after it: ${after} vs ${before}`);
});
