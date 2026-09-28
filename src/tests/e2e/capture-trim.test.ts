// Срез пустого начала дубля не добавляет заметных потерь: запись Playwright уже
// сжата, и второе поколение обязано остаться почти без потерь. Фикстура — с мелкими
// деталями (сетка, текст, шум): на ровной заливке плохие настройки тоже выглядели бы хорошо.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { trimBlankStart } from "../../capture.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;

const ssim = (a: string, b: string, cut: number): number => {
  const r = spawnSync(ffmpeg, ["-nostdin", "-hide_banner", "-i", a, "-ss", cut.toFixed(3), "-i", b,
    "-lavfi", "[0:v]setpts=PTS-STARTPTS[x];[1:v]setpts=PTS-STARTPTS[y];[x][y]ssim=shortest=1", "-f", "null", "-"], { encoding: "utf8" });
  return Number(/All:([0-9.]+)/u.exec(r.stderr)![1]);
};

test("trimming a take's blank start keeps the picture: SSIM against the same stretch stays at 0.99 or above", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-trim-"));
  const take = join(dir, "take.webm"), original = join(dir, "original.webm");
  // Секунда ровной заливки, затем три секунды мелкой детали: сетка, бегущий текст и шум.
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "color=c=0x101826:s=960x540:r=25:d=1",
    "-f", "lavfi", "-i", "testsrc2=s=960x540:r=25:d=3,noise=alls=12:allf=t:all_seed=7,drawgrid=w=12:h=12:t=1:c=white@0.25",
    "-filter_complex", "[0:v][1:v]concat=n=2:v=1[v]", "-map", "[v]",
    "-c:v", "libvpx", "-b:v", "4M", take]);
  copyFileSync(take, original);
  const cut = trimBlankStart(take);
  assert.ok(Math.abs(cut - 1) < 0.1, `the blank second is cut (${cut})`);
  const kept = ssim(take, original, cut);
  assert.ok(kept >= 0.99, `the trimmed take keeps the picture (SSIM ${kept})`);
  // Прежние настройки на той же фикстуре этого порога не держали.
  const old = join(dir, "old.webm");
  execFileSync(ffmpeg, ["-nostdin", "-y", "-loglevel", "error", "-ss", cut.toFixed(3), "-i", original,
    "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "30", "-deadline", "realtime", "-cpu-used", "8", "-an", old]);
  assert.ok(ssim(old, original, cut) < 0.99, `the former realtime crf 30 loses detail (SSIM ${ssim(old, original, cut)})`);
});
