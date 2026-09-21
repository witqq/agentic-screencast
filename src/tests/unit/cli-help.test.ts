import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSource } from "../../source.js";

const here = dirname(fileURLToPath(import.meta.url));
const cli = resolve(here, "../../agentic-screencast.js");

test("video, capture and overlay help expose the working commands", () => {
  const video = execFileSync(process.execPath, [cli, "help", "video"], { encoding: "utf8" });
  const capture = execFileSync(process.execPath, [cli, "help", "capture"], { encoding: "utf8" });
  const overlay = execFileSync(process.execPath, [cli, "help", "overlay"], { encoding: "utf8" });
  assert.match(video, /scenes --source story.md/);
  assert.match(video, /build --source story.md --only scene-id/);
  assert.match(capture, /recordTake/);
  assert.match(capture, /actual pointerdown event/);
  assert.match(capture, /withFocusCard/);
  assert.match(video, /Every UI action shown needs a nearby explanation/);
  assert.match(video, /slides.chapter/);
  assert.match(overlay, /click:true/);
  assert.match(overlay, /0.35 seconds/);
  assert.match(overlay, /freezeAt/);
  assert.equal(parseSource(resolve(here, "../../../example/kinetic-video.md")).scenes.length, 4);
  assert.equal(parseSource(resolve(here, "../../../example/idea-video.md")).scenes.length, 3);
});
