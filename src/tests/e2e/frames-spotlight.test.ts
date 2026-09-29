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
  // сцены в сравнение не годится: там идёт затемнение входа.
  const plain = (200 * 120) / (960 * 540), during = shot("90%", "during.png");
  assert.ok(during > plain * 1.6, `the red box grows under the spotlight (${plain.toFixed(3)} of the frame → ${during.toFixed(3)})`);
});
