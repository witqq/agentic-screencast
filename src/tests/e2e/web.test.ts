// Выпуск ролика для веба: каждый формат — настоящий файл своего кодека, того же
// размера и длины, похожий на исходник, а MP4 начинает играть до конца загрузки.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { encodeForWeb, topAtoms } from "../../web.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const ffprobe = require("@ffprobe-installer/ffprobe").path as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

function clip(): string {
  const dir = mkdtempSync(join(tmpdir(), "sc-web-"));
  const file = join(dir, "film.mp4");
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=size=640x360:rate=30:duration=3",
    "-f", "lavfi", "-i", "sine=frequency=440:duration=3", "-c:v", "libx264", "-crf", "14", "-c:a", "aac", "-shortest", file]);
  return file;
}
const streams = (file: string): string[] => execFileSync(ffprobe, ["-v", "error", "-show_entries", "stream=codec_type",
  "-of", "csv=p=0", file], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n");

test("a film leaves as AV1, VP9 and H.264 with a poster and a <video> that prefers the lightest", () => {
  const film = clip();
  const r = encodeForWeb(film, { out: join(film, "..", "web") });
  const got = Object.fromEntries(r.outputs.map((o) => [o.format, o]));
  for (const skip of r.skipped) assert.equal(skip.format, "av1", "only AV1 may be missing, and only for want of an encoder");
  assert.ok(got.vp9 && got.h264, "VP9 and H.264 are always written");
  for (const o of r.outputs) {
    assert.equal(o.codec, { av1: "av1", vp9: "vp9", h264: "h264" }[o.format]);
    assert.deepEqual([o.width, o.height], [640, 360]);
    assert.ok(Math.abs(o.duration - 3) < 0.1, `${o.format} lasts ${o.duration}`);
    assert.ok(o.ssim > 0.97, `${o.format} looks like the film (SSIM ${o.ssim})`);
    assert.ok(streams(o.file).includes("audio"), `${o.format} keeps the sound`);
    if (o.file.endsWith(".mp4")) {
      const atoms = topAtoms(o.file);
      assert.ok(atoms.indexOf("moov") < atoms.indexOf("mdat"), `${o.format}: index before data (${atoms.join(" ")})`);
    }
  }
  if (got.av1) assert.ok(got.av1.bytes < got.h264!.bytes, `AV1 ${got.av1.bytes} is lighter than H.264 ${got.h264!.bytes}`);
  // Фрагмент перечисляет источники по порядку предпочтения; запасной H.264 — последним.
  const html = readFileSync(r.html, "utf8");
  const order = [...html.matchAll(/<source src="([^"]+)"/gu)].map((m) => m[1]);
  assert.deepEqual(order, r.outputs.map((o) => basename(o.file)).sort((a, b) =>
    ["av1", "vp9", "h264"].indexOf(a.split(".").at(-2)!) - ["av1", "vp9", "h264"].indexOf(b.split(".").at(-2)!)));
  assert.equal(order.at(-1), "film.h264.mp4");
  assert.match(html, /type='video\/mp4; codecs="avc1\.64[0-9a-f]{4}, mp4a\.40\.2"'/u);
  for (const p of r.posters) assert.ok(existsSync(p), p);
});

test("a muted, narrower web copy drops the sound and scales down, never up", () => {
  const film = clip();
  const r = encodeForWeb(film, { out: join(film, "..", "web"), formats: ["vp9", "h264"], width: 320, mute: true, quality: "small" });
  for (const o of r.outputs) {
    assert.deepEqual([o.width, o.height], [320, 180]);
    assert.ok(!streams(o.file).includes("audio"), `${o.format} is silent`);
    assert.ok(!o.type.includes("opus") && !o.type.includes("mp4a"), o.type);
  }
  assert.match(readFileSync(r.html, "utf8"), /muted loop/u);
  const wide = encodeForWeb(film, { out: join(film, "..", "wide"), formats: ["h264"], width: 1920, poster: 1.5 });
  assert.equal(wide.outputs[0]!.width, 640, "a wider request keeps the film's own width");
  // Постер — кадр ролика в названный момент, в JPEG и WebP.
  const at = join(film, "..", "at.png");
  execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-ss", "1.5", "-i", film, "-frames:v", "1", at]);
  const early = join(film, "..", "early.png");
  execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-ss", "0.2", "-i", film, "-frames:v", "1", early]);
  const ssim = (a: string, b: string): number => Number(/All:([0-9.]+)/u.exec(spawnSync(ffmpeg,
    ["-hide_banner", "-i", a, "-i", b, "-lavfi", "[0:v][1:v]ssim", "-f", "null", "-"], { encoding: "utf8" }).stderr)![1]);
  assert.deepEqual(wide.posters.map((p) => p.split(".").at(-1)), ["jpg", "webp"]);
  for (const p of wide.posters) {
    assert.ok(ssim(p, at) >= 0.95, `${basename(p)} is the frame at 1.5 s (SSIM ${ssim(p, at)})`);
    assert.ok(ssim(p, at) > ssim(p, early), `${basename(p)} is not an earlier frame`);
  }
});

test("a web copy carries the film's chapters and a thumbnail track that covers the whole film", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-web-ch-"));
  writeFileSync(join(dir, "story.md"), `# Parts
lang: en
voice: {"engine":"stub","name":"silent","cps":15}
frame: {"width":640,"height":360,"fps":10,"scale":1}

## one · slides.chapter
kicker: FIRST
title: The first part
body: Opening words.
duration: 4

## two · slides.chapter
kicker: SECOND
title: The second part
body: Closing words.
background: waves
duration: 4
`);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "film.mp4"], { cwd: dir, encoding: "utf8",
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-400));
  const report = JSON.parse(r.stdout) as { chapters: Array<{ name: string; start: number; end: number }>; chaptersFile: string; duration: number };
  const w = encodeForWeb(join(dir, "film.mp4"), { out: join(dir, "web"), formats: ["h264"], thumbs: 1 });
  assert.equal((JSON.parse(readFileSync(w.manifest, "utf8")) as { chapters?: string }).chapters, basename(w.chapters!),
    "the manifest names the chapter track");
  // Главы: реплики начинаются в моменты глав из отчёта сборки.
  const vtt = readFileSync(w.chapters!, "utf8");
  const stamp = (s: string): number => { const [h, m, x] = s.split(":"); return Number(h) * 3600 + Number(m) * 60 + Number(x); };
  const cues = [...vtt.matchAll(/(\d\d:\d\d:\d\d\.\d{3}) --> (\d\d:\d\d:\d\d\.\d{3})\n(.+)/gu)].map((m) => ({ start: stamp(m[1]!), name: m[3]! }));
  assert.deepEqual(cues.map((c) => c.name), report.chapters.map((c) => c.name));
  cues.forEach((c, i) => assert.ok(Math.abs(c.start - report.chapters[i]!.start) < 0.002, `chapter ${c.name} starts where the build put it`));
  // Миниатюры: реплики идут встык от нуля до конца ролика.
  const thumbs = [...readFileSync(w.thumbnails!.vtt, "utf8").matchAll(/(\S+) --> (\S+)\n\S+#xywh=(\d+),(\d+),(\d+),(\d+)/gu)]
    .map((m) => ({ from: stamp(m[1]!), to: stamp(m[2]!), x: Number(m[3]), y: Number(m[4]), w: Number(m[5]), h: Number(m[6]) }));
  assert.equal(thumbs[0]!.from, 0);
  for (let i = 1; i < thumbs.length; i++) assert.equal(thumbs[i]!.from, thumbs[i - 1]!.to, "no gap between thumbnails");
  assert.ok(Math.abs(thumbs.at(-1)!.to - report.duration) < 0.05, "the last thumbnail reaches the end");
  // Клетка спрайта похожа на кадр в начале своей реплики больше, чем на кадр чужой.
  const cell = (k: number): string => {
    const t = thumbs[k]!, out = join(dir, `cell${k}.png`);
    execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-i", w.thumbnails!.sprite, "-vf", `crop=${t.w}:${t.h}:${t.x}:${t.y}`, out]);
    return out;
  };
  const frameAt = (t: number, k: number): string => {
    const out = join(dir, `frame${k}.png`);
    execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-ss", String(t), "-i", join(dir, "film.mp4"), "-frames:v", "1",
      "-vf", `scale=${thumbs[0]!.w}:${thumbs[0]!.h}`, out]);
    return out;
  };
  const ssim = (a: string, b: string): number => Number(/All:([0-9.]+)/u.exec(spawnSync(ffmpeg,
    ["-hide_banner", "-i", a, "-i", b, "-lavfi", "[0:v][1:v]ssim", "-f", "null", "-"], { encoding: "utf8" }).stderr)![1]);
  const first = 1, other = thumbs.length - 2;
  const own = ssim(cell(first), frameAt(thumbs[first]!.from, first));
  const foreign = ssim(cell(first), frameAt(thumbs[other]!.from, other));
  assert.ok(own > foreign, `a cell shows its own moment (${own} vs ${foreign})`);
  const html = readFileSync(w.html, "utf8");
  assert.match(html, /<track kind="chapters" src="film\.chapters\.vtt"/u);
  assert.match(html, /<track kind="metadata" src="film\.thumbs\.vtt"/u);
});

test("the web manifest names every file a page needs, relative to itself and in the order of preference", () => {
  const film = clip();
  const out = join(film, "..", "web");
  const r = encodeForWeb(film, { out, formats: ["h264", "vp9"], thumbs: 1, lang: "ru" });
  assert.equal(r.manifest, join(out, "film.web.json"));
  const m = JSON.parse(readFileSync(r.manifest, "utf8")) as { version: number; film: string; audio: boolean; lang: string;
    duration: number; width: number; height: number; poster: { jpg: string; webp: string };
    sources: Array<{ src: string; type: string; format: string; bytes: number }>; thumbnails: { sprite: string; vtt: string }; chapters?: string };
  assert.equal(m.version, 1);
  assert.equal(m.film, "film");
  assert.equal(m.lang, "ru");
  assert.equal(m.audio, true);
  assert.deepEqual([m.width, m.height], [640, 360]);
  assert.ok(Math.abs(m.duration - 3) < 0.1);
  // Порядок предпочтения, а не порядок заказа: VP9 раньше H.264, как в сниппете <video>.
  assert.deepEqual(m.sources.map((s) => s.format), ["vp9", "h264"]);
  for (const s of m.sources) {
    const o = r.outputs.find((x) => x.format === s.format)!;
    assert.equal(s.type, o.type);
    assert.equal(s.bytes, o.bytes);
    assert.equal(s.src, basename(s.src), "paths are relative to the manifest");
    assert.ok(existsSync(join(out, s.src)));
  }
  for (const p of [m.poster.jpg, m.poster.webp, m.thumbnails.sprite, m.thumbnails.vtt]) assert.ok(existsSync(join(out, p)), p);
  assert.equal(m.chapters, undefined, "a film without chapters names none");
});
