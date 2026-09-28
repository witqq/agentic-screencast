// Размытие движения у наезда по видео. Прежде `motionBlur` размывал только наезды над слайдом и
// страницей; наезд по клипу шёл ступеньками резких кадров. Теперь камера по клипу считается на
// подкадрах: кадр в середине наезда мягче, а кадр удержания — такой же резкий, как без размытия.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

/** Резкость кадра: средний модуль лапласиана по яркости уменьшенного кадра. */
function sharpness(file: string, t: number): number {
  const W = 480, H = 270;
  const g = execFileSync(ffmpeg, ["-loglevel", "error", "-ss", String(t), "-i", file, "-frames:v", "1", "-vf", `scale=${W}:${H},format=gray`, "-f", "rawvideo", "-"]);
  let sum = 0;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    sum += Math.abs(4 * g[i]! - g[i - 1]! - g[i + 1]! - g[i - W]! - g[i + W]!);
  }
  return sum / ((W - 2) * (H - 2));
}

test("motionBlur softens a push-in over a clip while it moves and leaves the hold sharp", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-vmb-"));
  // Неподвижная картинка с мелкой сеткой: вся разница резкости — от камеры, а не от клипа.
  execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=1280x720:duration=5:rate=25", "-vf", "trim=end_frame=1,loop=loop=150:size=1,setpts=N/25/TB", "-pix_fmt", "yuv420p", join(dir, "clip.mp4")]);
  const build = (header: string, out: string): string => {
    writeFileSync(join(dir, "story.md"), `# M\nvoice: {"engine":"stub","name":"silent","cps":15}\n${header}\n\n## v · video\nfile: clip.mp4\nduration: 4.5\noverlay: {"camera":[{"at":0.5,"move":1.2,"hold":1.5,"area":[0.1,0.1,0.35,0.35],"scale":2.2}]}\n\nThe camera pushes in on the corner of the clip.\n`);
    const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", out], { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
    assert.equal(r.status, 0, r.stderr.slice(-400));
    return join(dir, out);
  };
  const sharp = build("", "off.mp4"), soft = build("motionBlur: true", "on.mp4");
  const mid = 1.1, hold = 2.4;
  assert.ok(sharpness(soft, mid) < sharpness(sharp, mid) * 0.85, `mid push-in: ${sharpness(soft, mid).toFixed(2)} blurred vs ${sharpness(sharp, mid).toFixed(2)} sharp`);
  assert.ok(Math.abs(sharpness(soft, hold) - sharpness(sharp, hold)) < sharpness(sharp, hold) * 0.03, `hold stays sharp: ${sharpness(soft, hold).toFixed(2)} vs ${sharpness(sharp, hold).toFixed(2)}`);
});

test("a blurred push-in over a clip with a card keeps the film's frame rate, so picture and sound stay in step", () => {
  // Подкадры размытия идут в шесть раз чаще кадра; прежде кодер писал их все, если над клипом был
  // слой (карточка), и склейка на частоте ролика растягивала сцену вшестеро: картинка отставала от речи.
  const dir = mkdtempSync(join(tmpdir(), "sc-vmb-rate-"));
  execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30:duration=6", join(dir, "clip.mp4")]);
  writeFileSync(join(dir, "story.md"), `# M\nvoice: {"engine":"stub","name":"silent","cps":15}\nmotionBlur: true\n\n## v · video\nfile: clip.mp4\nduration: 5\noverlay: {"camera":[{"at":0.5,"hold":2,"area":[0.2,0.2,0.4,0.4],"scale":1.6}],"cards":[{"at":0.5,"title":"A card"}]}\n`);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-400));
  const probe = createRequire(import.meta.url)("@ffprobe-installer/ffprobe").path as string;
  const frames = Number(execFileSync(probe, ["-v", "error", "-select_streams", "v:0", "-count_frames", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", join(dir, "f.mp4")], { encoding: "utf8" }).trim());
  assert.ok(Math.abs(frames - 5 * 25) <= 2, `a 5 s scene at 25 fps has ${frames} frames, not ${5 * 25}`);
});
