import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
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
  assert.match(capture, /cameraMoves.*start and end of\s+focus\/unfocus motion/s);
  // Режиссёрское правило живёт в сборнике сценариев, а не в справке: справка описывает инструмент.
  assert.match(readFileSync(resolve(here, "../../../docs/scenario-playbook.md"), "utf8"), /Every UI action\s+shown needs a nearby explanation/);
  assert.match(video, /slides.chapter/);
  assert.match(overlay, /click:true/);
  assert.match(overlay, /0.35 seconds/);
  assert.match(overlay, /freezeAt/);
  assert.equal(parseSource(resolve(here, "../../../example/kinetic-video.md")).scenes.length, 4);
  assert.equal(parseSource(resolve(here, "../../../example/idea-video.md")).scenes.length, 3);
});

test("web, callout and voice help state measured limits and exact authoring fields", () => {
  const web = execFileSync(process.execPath, [cli, "help", "web"], { encoding: "utf8" });
  const text = execFileSync(process.execPath, [cli, "help", "text"], { encoding: "utf8" });
  const voice = execFileSync(process.execPath, [cli, "help", "voice"], { encoding: "utf8" });
  assert.match(web, /VP9's size\s+depends on the material/);
  assert.match(web, /larger than H\.264/);
  assert.match(web, /measured bytes/);
  assert.match(text, /target is a CSS selector on a page; area is\s+\[left,top,width,height\]/);
  assert.match(text, /point is \[x,y\]/);
  assert.match(text, /video callout uses area or point/);
  assert.match(voice, /filipp\s+about 12/);
  assert.match(voice, /john\s+about 16/);
});

test("frames help offers an exclusive scene filter or exclusion", () => {
  const full = execFileSync(process.execPath, [cli, "help"], { encoding: "utf8" });
  const vertical = execFileSync(process.execPath, [cli, "help", "vertical"], { encoding: "utf8" });
  const command = execFileSync(process.execPath, [cli, "frames", "--help"], { encoding: "utf8" });
  for (const output of [full, vertical, command]) assert.match(output, /\[--scene id \| --except id\]/);
  assert.match(vertical, /--except omits one scene from the sheet/);
  assert.match(vertical, /two flags cannot be combined/);
});
