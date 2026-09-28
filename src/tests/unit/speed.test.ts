import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSpeed, speedDuration, speedFilter } from "../../speed.js";

test("a well formed span is accepted as written", () => {
  const spans = parseSpeed('[{"from":2,"to":4,"rate":0.5}]');
  assert.deepEqual(spans, [{ from: 2, to: 4, rate: 0.5 }]);
});

test("unreadable, empty, overlapping and pointless spans are rejected", () => {
  assert.throws(() => parseSpeed("[]"), /non-empty/);
  assert.throws(() => parseSpeed('[{"from":2,"to":1,"rate":0.5}]'), /later than from/);
  assert.throws(() => parseSpeed('[{"from":0,"to":2,"rate":9}]'), /0\.2–4/);
  assert.throws(() => parseSpeed('[{"from":0,"to":2,"rate":1}]'), /changes nothing/);
  assert.throws(() => parseSpeed('[{"from":0,"to":3,"rate":0.5},{"from":2,"to":4,"rate":2}]'),
    /must not overlap/);
  assert.throws(() => parseSpeed('[{"from":0,"to":2,"rate":0.5,"ease":"in"}]'), /unknown property/);
});

test("half speed doubles the named stretch and leaves the rest alone", () => {
  const spans = parseSpeed('[{"from":2,"to":4,"rate":0.5}]');
  assert.equal(speedDuration(spans, 8), 10);
  const filter = speedFilter(spans, 8, 30);
  // Куски идут по порядку: обычный, переигранный, обычный — и склеиваются.
  assert.match(filter!, /trim=start=0:end=2/);
  assert.match(filter!, /trim=start=2:end=4,setpts=\(PTS-STARTPTS\)\/0\.5/);
  assert.match(filter!, /trim=start=4:end=8/);
  assert.match(filter!, /concat=n=3:v=1:a=0\[v\]/);
});

test("a span past the end of the clip is refused, not silently clipped", () => {
  assert.throws(() => speedFilter(parseSpeed('[{"from":100,"to":120,"rate":0.5}]'), 8, 30),
    /past the 8\.00s clip/);
});

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { spanOut } from "../../speed.js";

const ffmpeg = (createRequire(import.meta.url)("ffmpeg-static") as string);

/** Клип с движением: каждый кадр исходника отличается от соседнего. */
function movingClip(): string {
  const dir = mkdtempSync(join(tmpdir(), "sc-speed-"));
  const file = join(dir, "c.mp4");
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=size=160x90:rate=10:duration=2", "-pix_fmt", "yuv420p", file]);
  return file;
}
/** Переиграть клип фильтром сборки и вернуть число неповторяющихся кадров при 10 к/с. */
function uniqueFrames(clip: string, speed: string): number {
  const filter = speedFilter(parseSpeed(speed), 2, 10)!;
  const out = execFileSync(ffmpeg, ["-loglevel", "error", "-i", clip, "-filter_complex", `${filter};[v]fps=10,mpdecimate=hi=64*4:lo=64*2:frac=0.1[o]`,
    "-map", "[o]", "-f", "framemd5", "-"], { encoding: "utf8" });
  return out.split("\n").filter((l) => /^\d/.test(l)).length;
}

test("interpolation draws the frames a slowed stretch lacks instead of repeating them", () => {
  const clip = movingClip();
  const repeated = uniqueFrames(clip, '[{"from":0,"to":2,"rate":0.5}]');
  const drawn = uniqueFrames(clip, '[{"from":0,"to":2,"rate":0.5,"interpolate":true}]');
  const blended = uniqueFrames(clip, '[{"from":0,"to":2,"rate":0.5,"interpolate":"blend"}]');
  // Без дорисовки вдвое замедленные 20 кадров дают 40 кадров ролика, из них различных около 20.
  assert.ok(repeated <= 22, `without interpolation half the frames repeat (${repeated} unique)`);
  assert.ok(drawn >= 34, `with interpolation almost every frame is new (${drawn} unique)`);
  assert.ok(blended >= 34, `blend draws them too (${blended} unique)`);
  assert.deepEqual((parseSpeed('[{"from":0,"to":2,"rate":0.5,"interpolate":true}]')[0] as { interpolate?: string }).interpolate, "motion");
  assert.throws(() => parseSpeed('[{"from":0,"to":2,"rate":0.5,"interpolate":"optical"}]'), /motion.*blend/);
});

test("a ramp changes the speed gradually: the gaps between source frames grow step by step", () => {
  const span = parseSpeed('[{"from":0,"to":2,"rate":0.25,"ramp":0.8}]')[0]! as { from: number; to: number; rate: number; ramp: number };
  // Промежутки готового клипа между соседними кадрами исходника (через 0,1 с).
  const gaps = Array.from({ length: 20 }, (_, k) => spanOut(span, (k + 1) / 10) - spanOut(span, k / 10));
  for (let k = 1; k < 8; k++) assert.ok(gaps[k]! > gaps[k - 1]! + 1e-9, `the gap grows through the ramp-in (${gaps.map((g) => g.toFixed(3)).join(" ")})`);
  for (let k = 8; k < 12; k++) assert.ok(Math.abs(gaps[k]! - 0.4) < 1e-9, "the middle runs at the named rate");
  for (let k = 13; k < 20; k++) assert.ok(gaps[k]! < gaps[k - 1]! - 1e-9, "and shrinks through the ramp-out");
  assert.ok(gaps[0]! < 0.13, `the first gap is close to real speed (${gaps[0]!.toFixed(3)})`);
  assert.ok(Math.abs(speedDuration([span], 2) - spanOut(span, 2)) < 1e-9, "the clip is as long as the curve says");
  // Та же кривая в самом фильтре: метки времени готового клипа растут с тем же шагом.
  const clip = movingClip();
  const filter = speedFilter([span], 2, 10)!;
  const r = spawnSync(ffmpeg, ["-loglevel", "info", "-i", clip, "-filter_complex", `${filter};[v]showinfo[o]`, "-map", "[o]", "-f", "null", "-"],
    { encoding: "utf8" });
  const pts = [...r.stderr.matchAll(/pts_time:([\d.]+)/g)].map((m) => Number(m[1]));
  assert.equal(pts.length, 20, "every source frame passes through");
  pts.forEach((t, k) => assert.ok(Math.abs(t - spanOut(span, k / 10)) < 0.02, `frame ${k} lands at ${t}, the curve says ${spanOut(span, k / 10).toFixed(3)}`));
  assert.throws(() => parseSpeed('[{"from":0,"to":2,"rate":0.5,"ramp":1.5}]'), /at most half/);
});
