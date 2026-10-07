import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { actionZoomCues, autoZoomCues, trimMarks } from "../../marks.js";
import { cameraLegs, markAutomaticCamera, pushScale, windowPose } from "../../camera.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const BUILD = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "build.js");

test("automatic focus follows a specific subject and keeps a cut cursor path continuous", () => {
  const clicks = [{ t: 1.2, x: 0.8, y: 0.4 }];
  assert.deepEqual(actionZoomCues([{ kind: "click", t: 1, end: 1.4, rect: [0, 0, 1, 1] }], []).length, 0,
    "a viewport action without a specific click does not outline the entire scene");
  const area = actionZoomCues([{ kind: "click", t: 1, end: 1.4, rect: [0, 0, 1, 1] }], clicks)[0]!;
  assert.ok(area.area![2] < 0.5 && area.area![3] < 0.5,
    "the click within a broad locator becomes the subject");
  assert.equal(area.ring, false, "automatic camera motion does not draw a focus frame");
  assert.equal(area.scale, 1.65, "an automatic action carries its camera scale instead of borrowing the ring flag");
  const wide = actionZoomCues([{ kind: "click", t: 1, end: 1.2, rect: [0.1, 0.1, 0.55, 0.55] }], [])[0]!;
  assert.equal(wide.scale, pushScale({}, wide.area![2], wide.area![3]),
    "the explicit default scale still fits a wider action as the landscape camera did");
  const manual = [{ at: 0, move: 0.5, hold: 2, area: [0.1, 0.3, 0.1, 0.2] as [number, number, number, number] }];
  assert.equal(windowPose(manual, 1, [], 0.316).z, 1);
  assert.equal(windowPose([{ ...manual[0]!, ring: false }], 1, [], 0.316).z, 1,
    "hiding a manual focus border must not change its portrait crop");
  assert.equal(autoZoomCues(clicks, { follow: "cursor" })[0]!.follow, "cursor",
    "older click-only takes retain the requested cursor following");

  const trimmed = trimMarks({ trimmed: 0, marks: {}, clicks: [], path: [
    { t: 0, x: 0.1, y: 0.5 }, { t: 2, x: 0.9, y: 0.5 }, { t: 4, x: 0.9, y: 0.5 },
  ] }, { from: 1, to: 3 })!;
  assert.deepEqual(trimmed.path, [{ t: 0, x: 0.5, y: 0.5 }, { t: 1, x: 0.9, y: 0.5 }, { t: 2, x: 0.9, y: 0.5 }]);
  const cue = [{ at: 0, move: 0.3, hold: 3, area: [0.45, 0.4, 0.1, 0.2] as [number, number, number, number],
    follow: "cursor" as const, ring: false, scale: 1.65 }];
  const still = windowPose(cue, 2.5, [], 0.316), moving = windowPose(cue, 2.5, trimmed.path, 0.316);
  assert.ok(moving.x > still.x + 0.25, `portrait crop follows the path (${still.x} → ${moving.x})`);
  assert.ok(moving.z > 1.3, `a small subject grows within the portrait frame (×${moving.z})`);
});

test("authored follow starts immediately while generated focus waits for the cursor to reach its subject", () => {
  const manual = { at: 0, move: 0.5, hold: 3, area: [0.8, 0.4, 0.1, 0.2] as [number, number, number, number],
    scale: 1.65, ring: false, follow: "cursor" as const };
  const generated = markAutomaticCamera({ ...manual });
  const path = [{ t: 0, x: 0.1, y: 0.5 }, { t: 3.5, x: 0.1, y: 0.5 }];
  const manualX = windowPose([manual], 1.2, path, 0.316).x;
  const generatedX = windowPose([generated], 1.2, path, 0.316).x;
  assert.ok(manualX < 0.6 && generatedX > 0.8,
    `authored cue chases immediately (${manualX}); generated cue holds its unseen subject (${generatedX})`);
  assert.equal(windowPose([{ ...generated }], 1.2, path, 0.316).x, generatedX,
    "deviceFor's camera spread preserves automatic provenance");
  assert.equal(JSON.stringify(generated), JSON.stringify(manual),
    "internal provenance does not change the renderer's authored overlay grammar");
  const atHoldEnd = (cue: typeof manual): number => 0.5 + cameraLegs([cue], path)
    .filter((leg) => leg.t1 <= 3.5).reduce((x, leg) => x + leg.dx, 0);
  assert.ok(atHoldEnd(manual) < 0.6 && atHoldEnd(generated) > 0.8,
    "the horizontal camera has the same manual and generated behavior");
});

test("a real-take shaped path keeps each target visible while the cursor travels between them", () => {
  const share = (1080 / 1920) / (1920 / 1080);
  const actions = [
    { kind: "hover", t: 0.002, end: 1.148, rect: [0.842, 0.786, 0.117, 0.069] as [number, number, number, number] },
    { kind: "type", t: 1.89, end: 3.5, rect: [0.092, 0.143, 0.25, 0.063] as [number, number, number, number] },
  ];
  const path = [
    { t: 0.038, x: 0.18, y: 0.22 }, { t: 0.545, x: 0.506, y: 0.563 },
    { t: 1.108, x: 0.9, y: 0.82 }, { t: 1.912, x: 0.9, y: 0.82 },
    { t: 2.344, x: 0.67, y: 0.535 }, { t: 2.95, x: 0.217, y: 0.174 },
  ];
  const cues = actionZoomCues(actions, [], { follow: "cursor", size: share / 2 }).map((cue) => markAutomaticCamera(cue));
  const contains = (at: number, rect: [number, number, number, number]): boolean => {
    const pose = windowPose(cues, at, path, share), halfX = share / (2 * pose.z), halfY = 1 / (2 * pose.z);
    return rect[0] >= pose.x - halfX && rect[0] + rect[2] <= pose.x + halfX
      && rect[1] >= pose.y - halfY && rect[1] + rect[3] <= pose.y + halfY;
  };
  assert.ok(contains(0.9, actions[0]!.rect), "the far button is whole while the cursor approaches it");
  assert.ok(contains(2.2, actions[1]!.rect), "the input stays visible between the two actions");
  assert.ok(contains(2.9, actions[1]!.rect), "the input remains whole when typing begins");
});

test("encoded portrait frames enlarge a narrow action and follow its recorded cursor", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-portrait-auto-"));
  const clip = join(dir, "take.mp4");
  execFileSync(ffmpeg, ["-nostdin", "-y", "-loglevel", "error", "-f", "lavfi", "-i",
    "color=c=0x17212b:s=640x360:r=10:d=4", "-vf",
    "drawbox=x=30:y=100:w=130:h=170:color=red:t=fill,"
      + "drawbox=x=500:y=100:w=130:h=170:color=blue:t=fill,"
      + "drawbox=x=115:y=160:w=25:h=40:color=green:t=fill",
    "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", clip]);
  writeFileSync(`${clip}.marks.json`, JSON.stringify({ trimmed: 0, marks: {}, clicks: [],
    actions: [{ kind: "type", t: 0.6, end: 2.5, rect: [0.15, 0.4, 0.08, 0.2] }],
    path: [{ t: 0, x: 0.19, y: 0.5 }, { t: 2, x: 0.19, y: 0.5 },
      { t: 2.7, x: 0.86, y: 0.5 }, { t: 4, x: 0.86, y: 0.5 }] }));
  const make = (follow: boolean, bare = true): string => {
    const pitch = join(dir, follow ? "follow.json" : "fixed.json");
    const out = join(dir, !bare ? "layered.mp4" : follow ? "follow.mp4" : "fixed.mp4");
    writeFileSync(pitch, JSON.stringify({ audio: false, theme: "midnight",
      frame: { width: 180, height: 320, fps: 10, scale: 1 }, reframe: { width: 640, height: 360 },
      scenes: [{ id: "take", page: "take.mp4", video: true, duration: 4, beats: [], caption: "",
        autoZoom: { scale: 1.8, ...(follow ? { follow: "cursor" } : {}) },
        effects: { fade: { in: 0, out: 0 } } }] }));
    const result = spawnSync(process.execPath, [BUILD, "--pitch", pitch, "--out", out],
      { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, "work"), AGENTIC_SCREENCAST_BARE: bare ? "1" : "0" } });
    assert.equal(result.status, 0, result.stderr.slice(-800));
    return out;
  };
  const follow = make(true), fixed = make(false);
  const frame = (file: string, at: number): Buffer => execFileSync(ffmpeg, ["-nostdin", "-loglevel", "error", "-ss", String(at),
    "-i", file, "-frames:v", "1", "-vf", "format=rgb24", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
  const colored = (pixels: Buffer, kind: "red" | "blue" | "green"): number => {
    let count = 0;
    for (let i = 0; i < pixels.length; i += 3) {
      const [r, g, b] = [pixels[i]!, pixels[i + 1]!, pixels[i + 2]!];
      if (kind === "red" ? r > 150 && r > g * 1.8 && r > b * 1.8
        : kind === "blue" ? b > 120 && b > r * 1.8 && b > g * 1.8
          : g > 70 && g > r * 1.5 && g > b * 1.5) count++;
    }
    return count;
  };
  const layered = make(true, false);
  const overview = frame(follow, 0.4), early = frame(follow, 1.7), late = frame(follow, 3.3), fixedLate = frame(fixed, 3.3);
  assert.ok(colored(overview, "red") > 1000 && colored(overview, "blue") > 1000,
    "the opening frame establishes both sides of the recorded interface");
  assert.ok(colored(frame(layered, 0.4), "red") > 1000 && colored(frame(layered, 0.4), "blue") > 1000,
    "the annotation layer keeps the full screen visible during overview instead of prematurely dimming it");
  assert.ok(colored(overview, "green") < 1000, "the first frame is an overview rather than a premature close-up");
  assert.ok(colored(early, "green") > 2000, "the narrow action is visibly enlarged in the encoded portrait frame");
  assert.ok(colored(late, "blue") > 1200, "the blue destination stays visible after the cursor moves right");
  assert.ok(colored(late, "blue") > colored(fixedLate, "blue") * 4 + 600,
    "cursor following changes the encoded crop, rather than only camera metadata");
});
