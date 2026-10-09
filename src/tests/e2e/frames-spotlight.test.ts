// Лист кадров показывает наезд spotlight так же, как сборка: фокусы внимания становятся камерой по
// оценённым тактам. Прежде frames пропускал этот шаг, и предпросмотр сцены стоял без наезда.
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
const W = 480, H = 270;

const redShare = (png: string): number => {
  const raw = execFileSync(ffmpeg, ["-loglevel", "error", "-i", png, "-vf", `scale=${W}:${H}`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
  let n = 0;
  for (let i = 0; i < raw.length; i += 3) if (raw[i]! > 180 && raw[i + 1]! < 90 && raw[i + 2]! < 90) n++;
  return n / (W * H);
};

test("frames draws a spotlight's push-in the way the build does", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-frames-spot-"));
  writeFileSync(join(dir, "p.html"), `<!doctype html><html><body style="margin:0;background:#fff">
<div id="a" style="position:absolute;left:60px;top:60px;width:200px;height:120px;background:#e33"></div></body></html>`);
  writeFileSync(join(dir, "story.md"), `# F\nvoice: {"engine":"stub","name":"silent","cps":15}\nframe: {"width":960,"height":540,"fps":10,"scale":1}\n\n`
    + `## s · page\npage: p.html\nspotlight: #a @ b2\n\nFirst beat of the scene.\n\nSecond beat names the red box.\n`);
  const shot = (at: string, out: string): number => {
    const r = spawnSync("node", [ENTRY, "frames", "story.md", "--scene", "s", "--at", at, "--out", out], { cwd: dir, encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr.slice(-300));
    return redShare(join(dir, out));
  };
  // Без наезда блок 200×120 занимает свою долю кадра 960×540; под фокусом он заметно крупнее. Начало
  // сцены в сравнение не годится: там идёт затемнение входа. Момент внутри второго такта
  // проверяет удержание, а не последние 10% сцены, которые включают возврат камеры.
  const plain = (200 * 120) / (960 * 540), during = shot("b2+1.1", "during.png");
  assert.ok(during > plain * 1.6, `the red box grows under the spotlight (${plain.toFixed(3)} of the frame → ${during.toFixed(3)})`);
});

test("frames draws a video scene's camera push-in the way the build does", () => {
  // Наезд над видео делает сборка фильтром кадра; превью прежде показывало клип без наезда.
  const dir = mkdtempSync(join(tmpdir(), "sc-frames-vcam-"));
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "color=c=white:s=960x540:r=10:d=4", "-vf",
    "drawbox=x=60:y=60:w=200:h=120:color=0xee3333:t=fill", "-pix_fmt", "yuv420p", join(dir, "clip.mp4")]);
  writeFileSync(join(dir, "story.md"), `# F\nvoice: {"engine":"stub","name":"silent","cps":15}\nframe: {"width":960,"height":540,"fps":10,"scale":1}\n\n`
    + `## v · video\nfile: clip.mp4\nduration: 4\noverlay: {"camera":[{"at":0.3,"move":0.5,"hold":3,"area":[0.05,0.08,0.3,0.3],"scale":2,"keep":true}]}\n`);
  const r = spawnSync("node", [ENTRY, "frames", "story.md", "--scene", "v", "--at", "2.5s", "--out", "v.png"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr.slice(-300));
  const plain = (200 * 120) / (960 * 540), got = redShare(join(dir, "v.png"));
  assert.ok(got > plain * 2.5, `the red box grows under the video camera (${plain.toFixed(3)} of the frame → ${got.toFixed(3)})`);
});

test("frames draws a video scene inside its device frame, as the build does", () => {
  // Предпросмотр клипа в рамке показывал клип во весь кадр: где встанут субтитры, было видно только в сборке.
  const dir = mkdtempSync(join(tmpdir(), "sc-frames-dev-"));
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "color=c=0xee3333:s=540x960:r=10:d=3", "-pix_fmt", "yuv420p", join(dir, "clip.mp4")]);
  writeFileSync(join(dir, "story.md"), `# F\nvoice: {"engine":"stub","name":"silent","cps":15}\nframe: {"width":960,"height":540,"fps":10,"scale":1}\n\n`
    + `## v · video\nfile: clip.mp4\nduration: 3\ndevice: phone\n`);
  const r = spawnSync("node", [ENTRY, "frames", "story.md", "--scene", "v", "--at", "50%", "--out", "v.png"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr.slice(-300));
  const share = redShare(join(dir, "v.png"));
  assert.ok(share > 0.05 && share < 0.3, `the red clip fills only the phone's screen (${share.toFixed(3)} of the frame)`);
});
