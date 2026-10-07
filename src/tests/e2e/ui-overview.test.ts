import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { renderScene } from "../../render.js";
import { overviewWindowPose } from "../../camera.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const page = `<!doctype html><html><body style="margin:0;width:640px;height:360px;background:#17212b;overflow:hidden">
<div style="position:absolute;left:10px;top:100px;width:100px;height:120px;background:red"></div>
<div id="detail" style="position:absolute;left:520px;top:100px;width:100px;height:120px;background:blue"></div>
</body></html>`;
const cues = [{ at: 2, move: 0.8, hold: 3, scale: 1.5, target: "#detail", ring: false, dim: 0 }];
const colored = (png: Buffer, channel: 0 | 2): number => {
  const rgb = execFileSync(ffmpeg, ["-nostdin", "-loglevel", "error", "-i", "pipe:0", "-vf", "format=rgb24", "-f", "rawvideo", "-"], { input: png });
  let count = 0;
  for (let i = 0; i < rgb.length; i += 3) if (rgb[i + channel]! > 160 && rgb[i + (channel === 0 ? 2 : 0)]! < 60) count++;
  return count;
};

test("portrait page establishes both screen edges, then enlarges its detail without reflow or seek history", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-ui-overview-"));
  writeFileSync(join(dir, "ui.html"), page);
  const scene = { page: "ui.html", __src: dir, duration: 6, overlay: { camera: cues }, __bareLayer: true,
    __layerPart: "scene" as const, effects: { fade: { in: 0, out: 0 }, cursor: { hidden: true } } };
  const frame = async (at: number, overview = true): Promise<Buffer> => (await renderScene(scene,
    { width: 640, height: 360, scale: 1, fps: 10, crop: { width: 202, overview }, at })).shots[0]!.buf;
  const early = await frame(0.5), middle = await frame(2.4), late = await frame(3.5);
  assert.ok(colored(early, 0) > 1000 && colored(early, 2) > 1000, "the whole interface shows landmarks at both edges");
  assert.ok(colored(late, 2) > colored(early, 2) * 5, "the detail grows after establishing its location");
  assert.ok(colored(late, 0) < 20, "the subsequent focus is a close view of the right-hand region");
  assert.notDeepEqual(middle, early, "the intervening frame is a moving composition");
  const legacy = await frame(0.5, false);
  assert.ok(colored(legacy, 0) < 20, "the witness distinguishes an immediate crop from the overview");
  const full = await renderScene(scene, { width: 640, height: 360, scale: 1, fps: 10, crop: { width: 202, overview: true } });
  assert.deepEqual(full.shots[5]!.buf, early, "a first-frame seek matches a continuous recording");
  assert.deepEqual(full.shots[35]!.buf, late, "the overview does not introduce render history");
});

test("recorded overview contains the viewport and reaches the old path continuously, with no focus staying wide", () => {
  const camera = [{ at: 2, move: 0.8, hold: 3, area: [0.8, 0.3, 0.1, 0.3] as [number, number, number, number], scale: 1.5 }];
  const share = 202 / 640;
  assert.deepEqual(overviewWindowPose(camera, 0.5, [], share, 6), { x: 0.5, y: 0.5, z: share });
  assert.deepEqual(overviewWindowPose([], 5, [], share, 6), { x: 0.5, y: 0.5, z: share });
  let previous = overviewWindowPose(camera, 0, [], share, 6), largest = 0;
  for (let i = 1; i <= 60; i++) {
    const pose = overviewWindowPose(camera, i / 10, [], share, 6);
    largest = Math.max(largest, Math.abs(pose.z - previous.z), Math.abs(pose.x - previous.x));
    previous = pose;
  }
  assert.ok(largest < 0.3, `continuous zoom and camera centre (${largest})`);
  assert.ok(previous.z > 1 && previous.x > 0.8, "the camera reaches the detail path");
});
