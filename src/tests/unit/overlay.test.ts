import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { cardHold, overlayEnd, parseOverlay } from "../../overlay.js";
import { parseSource, toPitch } from "../../source.js";
import { sceneSchema } from "../../schema.js";
import { renderScene } from "../../render.js";
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { slideOf } from "../../provider/slides/from-scene.js";
import { buildSlide } from "../../provider/slides/page.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const ffprobe = require("@ffprobe-installer/ffprobe").path as string;
const here = dirname(fileURLToPath(import.meta.url));

test("overlay is a validated common scenario field and reaches the pitch", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-overlay-source-"));
  const file = join(dir, "story.md");
  writeFileSync(file, `# Test
voice: {"engine":"stub","name":"silent"}

## clip · video
file: clip.mp4
overlay: {"pointer":[{"at":0,"x":0.2,"y":0.3},{"at":1,"x":0.8,"y":0.6,"click":true}],"cards":[{"at":0.5,"title":"A readable card","body":"One idea at a time"}]}
`);
  const scene = toPitch(parseSource(file)).scenes[0]!;
  assert.equal(scene.overlay?.pointer?.[1]?.click, true);
  assert.ok((scene.overlay?.cards?.[0]?.hold ?? 0) >= cardHold(scene.overlay!.cards![0]!));
  const videoFields = sceneSchema().$defs.video as { properties: Record<string, unknown> };
  assert.ok(videoFields.properties.overlay);
});

test("overlay rejects invalid coordinates, timing, short cards and overlap", () => {
  assert.throws(() => parseOverlay('{"pointer":[{"at":0,"x":1.1,"y":0}]}'), /frame fraction/);
  assert.throws(() => parseOverlay('{"pointer":[{"at":1,"x":0,"y":0},{"at":1,"x":1,"y":1}]}'), /times must increase/);
  assert.throws(() => parseOverlay('{"cards":[{"at":0,"title":"Readable","hold":1}]}'), /needed to read/);
  assert.throws(() => parseOverlay('{"cards":[{"at":0,"title":"First"},{"at":1,"title":"Second"}]}'), /between cards/);
  assert.ok(overlayEnd(parseOverlay('{"cards":[{"at":2,"title":"A scene"}]}')) >= 6);
});

test("cinematic cards and camera moves validate readable time and frame bounds", () => {
  const overlay = parseOverlay(JSON.stringify({
    camera: [{ at: 0.7, hold: 2, area: [0.2, 0.2, 0.3, 0.3], scale: 1.7 }],
    cards: [{ at: 1, title: "What changed?", body: "This region now has a purpose.",
      position: "near-focus", reveal: "type", motion: "pop" }],
  }));
  assert.ok((overlay.cards?.[0]?.hold ?? 0) > cardHold({ title: "What changed?" }));
  assert.ok(overlayEnd(overlay) > 5);
  assert.throws(() => parseOverlay('{"camera":[{"at":0,"hold":1,"area":[0.8,0,0.4,0.2]}]}'), /outside the frame/);
  assert.throws(() => parseOverlay('{"camera":[{"at":0,"hold":1,"area":[0,0,0.2,0.2],"target":"#x"}]}'), /exactly one/);
  assert.throws(() => parseOverlay('{"camera":[{"at":0,"hold":1,"target":"#x"},{"at":1,"hold":1,"target":"#y"}]}'), /between moves/);
});

test("silent chapters have declared reading time and reveal text from scene time", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-chapter-"));
  const source = join(dir, "story.md");
  writeFileSync(source, `# An idea\n\n## opening · slides.chapter\n` +
    `kicker: First question\ntitle: What changes for the viewer?\n` +
    `body: A short sentence explains the point before the demonstration.\n` +
    `duration: 7\n`);
  const parsed = parseSource(source);
  const pitch = toPitch(parsed).scenes[0]!;
  assert.equal(pitch.duration, 7);
  const defs = sceneSchema().$defs as Record<string, { properties: Record<string, unknown> }>;
  assert.ok(defs["slides.chapter"]?.properties.duration);
  const pageFile = buildSlide(slideOf(parsed.scenes[0]!), dir, { frame: { width: 1280, height: 720 } });
  const stage = readFileSync(resolve(here, "../../browser/stage.js"), "utf8");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(pathToFileURL(pageFile).href);
    await page.addScriptTag({ content: stage });
    await page.evaluate((scene) => window.__stage.mount(scene), { ...pitch, duration: 7 });
    const read = async (at: number): Promise<string[]> => {
      await page.evaluate((t) => window.renderAt!(t), at);
      return page.locator("[data-type]").allTextContents();
    };
    const early = await read(1);
    const late = await read(5);
    assert.ok(early[0]!.length < late[0]!.length);
    assert.equal(late[0], "What changes for the viewer?");
    assert.equal(late[1], "A short sentence explains the point before the demonstration.");
  } finally { await browser.close(); }
});

test("a saved prototype page can be a silent timed scene", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-silent-page-"));
  const file = join(dir, "story.md");
  writeFileSync(file, `# Prototype\nvoice: {"engine":"stub","name":"silent"}\n\n` +
    `## concept · page\npage: prototype.html\nduration: 6\n`);
  const scene = toPitch(parseSource(file)).scenes[0]!;
  assert.equal(scene.duration, 6);
  assert.equal(scene.page, "prototype.html");
  writeFileSync(file, `# Prototype\n\n## concept · page\npage: prototype.html\n`);
  assert.throws(() => parseSource(file), /needs duration/);
});

test("camera, spotlight and typed card return to the same frame after backward seek", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-camera-seek-"));
  const file = join(dir, "page.html");
  writeFileSync(file, '<!doctype html><html><body style="margin:0;width:640px;height:360px;background:#e9f5ff">'
    + '<div id="focus" style="position:absolute;left:420px;top:120px;width:90px;height:80px;background:#2479ad"></div>'
    + '</body></html>');
  const stage = readFileSync(resolve(here, "../../browser/stage.js"), "utf8");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
    await page.goto(pathToFileURL(file).href);
    await page.addScriptTag({ content: stage });
    await page.evaluate((overlay) => window.__stage.mount({ duration: 8, target: "body", overlay,
      effects: { cursor: { hidden: true, from: 0 }, spot: { from: 9999 },
        caption: { from: 9999 }, fade: { in: 0, out: 0 } } }), parseOverlay(JSON.stringify({
      camera: [{ at: 0.5, hold: 2.5, target: "#focus", scale: 1.8, move: 0.7, return: 0.7 }],
      cards: [{ at: 1, title: "Here is the result", body: "The selected area stays visible.",
        position: "near-focus", reveal: "type", motion: "glide" }],
    })));
    const frame = async (at: number): Promise<{ hash: string; title: string; zoom: string; spot: string }> => {
      await page.evaluate((t) => window.renderAt!(t), at);
      const buf = await page.screenshot();
      const state = await page.evaluate(() => ({
        title: document.querySelector(".__card-title")?.textContent ?? "",
        zoom: document.body.style.transform,
        spot: (document.querySelector("#__spot") as HTMLElement).style.opacity,
      }));
      return { hash: createHash("md5").update(buf).digest("hex"), ...state };
    };
    const focus = await frame(2.2);
    const early = await frame(0.2);
    const again = await frame(2.2);
    assert.equal(focus.hash, again.hash);
    assert.notEqual(focus.hash, early.hash);
    assert.ok(focus.title.length > early.title.length);
    assert.match(focus.zoom, /scale\(1\.8\)/);
    assert.ok(Number(focus.spot) > 0.8);
  } finally { await browser.close(); }
});

test("transparent stage renders pointer and card reproducibly at an arbitrary seek", async () => {
  const scene = {
    page: "unused", duration: 5, __overlayOnly: true,
    effects: { cursor: { hidden: true, from: 0, to: 0 } },
    overlay: parseOverlay('{"pointer":[{"at":0,"x":0.1,"y":0.5},{"at":1,"x":0.8,"y":0.5,"click":true}],"cards":[{"at":0,"title":"Follow this path"}]}'),
  };
  const options = { width: 640, height: 360, fps: 15, scale: 1, at: 1.2 };
  const first = await renderScene(scene, options);
  const second = await renderScene(scene, options);
  const before = await renderScene(scene, { ...options, at: 0.2 });
  assert.equal(first.shots[0]!.md5, second.shots[0]!.md5);
  assert.notEqual(first.shots[0]!.md5, before.shots[0]!.md5);
  assert.equal(first.shots[0]!.buf.subarray(1, 4).toString(), "PNG");
});

test("the same annotation API also draws on a page scene", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-overlay-page-"));
  const page = join(dir, "page.html");
  writeFileSync(page, "<!doctype html><html><body style='background:#fafafa'>A real page</body></html>");
  const overlay = parseOverlay('{"pointer":[{"at":0,"x":0.1,"y":0.3},{"at":1,"x":0.7,"y":0.3,"click":true}],"cards":[{"at":0,"title":"One idea"}]}');
  const scene = { page, duration: 5, target: "body", overlay,
    effects: { zoom: { from: 0, to: 0, scale: 1 }, spot: { from: 999 },
      cursor: { hidden: true, from: 0, to: 0 }, caption: { from: 999 },
      fade: { in: 0, out: 0 } } };
  const at = { width: 640, height: 360, fps: 15, scale: 1, at: 1.2 };
  const annotated = await renderScene(scene, at);
  const bare = await renderScene({ ...scene, overlay: undefined }, at);
  assert.notEqual(annotated.shots[0]!.md5, bare.shots[0]!.md5);
});

test("direct render normalizes a card without hold to its reading time", async () => {
  const scene = { page: "unused", duration: 8, __overlayOnly: true,
    overlay: { cards: [{ at: 0, title: "A longer point that needs more time",
      body: "The entire explanation remains readable after four seconds." }] } };
  const opts = { width: 640, height: 360, fps: 10, scale: 1, at: 4.2 };
  const withCard = await renderScene(scene, opts);
  const withoutCard = await renderScene({ ...scene, overlay: undefined }, opts);
  assert.notEqual(withCard.shots[0]!.md5, withoutCard.shots[0]!.md5);
});

test("video build composites the same overlay and extends a short source clip", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-overlay-video-"));
  const clip = join(dir, "clip.mp4");
  const pitch = join(dir, "pitch.json");
  const out = join(dir, "out.mp4");
  execFileSync(ffmpeg, ["-nostdin", "-y", "-loglevel", "error", "-f", "lavfi",
    "-i", "color=c=#f7f7f7:s=640x360:r=10:d=1", "-an", "-c:v", "libx264", clip]);
  writeFileSync(pitch, JSON.stringify({
    frame: { width: 640, height: 360, fps: 10, scale: 1 },
    scenes: [{ id: "clip", page: "clip.mp4", video: true, beats: [], caption: "",
      overlay: { pointer: [{ at: 0, x: 0.1, y: 0.5 }, { at: 1, x: 0.7, y: 0.5, click: true }],
        cards: [{ at: 0, title: "Real footage" }] },
      effects: { fade: { in: 0.3, out: 0.3 } } }],
  }));
  execFileSync(process.execPath, [resolve(here, "../../build.js"), "--pitch", pitch, "--out", out],
    { env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, "work") } });
  const duration = Number(execFileSync(ffprobe, ["-v", "error", "-show_entries",
    "format=duration", "-of", "default=nw=1:nk=1", out], { encoding: "utf8" }));
  assert.ok(duration >= 4, `Expected a readable hold, got ${duration}s`);
  // White source footage must become a dark, readable card at this pixel.
  // A fade-only segment could change frame hashes without drawing any card.
  const cardPixel = execFileSync(ffmpeg, ["-v", "error", "-ss", "1.5", "-i", out,
    "-frames:v", "1", "-vf", "crop=1:1:50:300,format=rgb24", "-f", "rawvideo", "-"]);
  assert.ok(cardPixel[0]! < 80 && cardPixel[1]! < 80 && cardPixel[2]! < 110);
  const early = execFileSync(ffmpeg, ["-v", "error", "-ss", "1.0", "-i", out,
    "-frames:v", "1", "-f", "framemd5", "-"]);
  const late = execFileSync(ffmpeg, ["-v", "error", "-ss", "3.0", "-i", out,
    "-frames:v", "1", "-f", "framemd5", "-"]);
  assert.notDeepEqual(early, late);
});

test("a frozen real clip becomes a camera-guided still scene", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-frozen-video-"));
  const clip = join(dir, "clip.mp4");
  const pitch = join(dir, "pitch.json");
  const out = join(dir, "out.mp4");
  execFileSync(ffmpeg, ["-nostdin", "-y", "-loglevel", "error", "-f", "lavfi",
    "-i", "color=c=yellow:s=640x360:r=10:d=2", "-vf",
    "drawbox=x=270:y=130:w=100:h=100:c=blue:t=fill", "-an", "-c:v", "libx264", clip]);
  writeFileSync(pitch, JSON.stringify({
    frame: { width: 640, height: 360, fps: 10, scale: 1 },
    scenes: [{ id: "still", page: "clip.mp4", video: true, freezeAt: 0.5, duration: 5,
      beats: [], caption: "", overlay: {
        camera: [{ at: 0.5, hold: 2, area: [270 / 640, 130 / 360, 100 / 640, 100 / 360],
          scale: 1.8, move: 0.5, return: 0.5 }],
      }, effects: { fade: { in: 0, out: 0 }, cursor: { hidden: true } } }],
  }));
  execFileSync(process.execPath, [resolve(here, "../../build.js"), "--pitch", pitch, "--out", out],
    { env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, "work") } });
  const pixel = (at: number): Buffer => execFileSync(ffmpeg, ["-v", "error", "-ss", String(at),
    "-i", out, "-frames:v", "1", "-vf", "crop=1:1:240:180,format=rgb24", "-f", "rawvideo", "-"]);
  const overview = pixel(0.2);
  const focused = pixel(1.5);
  assert.ok(overview[0]! > 160 && overview[1]! > 160 && overview[2]! < 80,
    `expected yellow overview, got ${[...overview]}`);
  assert.ok(focused[2]! > focused[0]! * 1.8, `expected enlarged blue focus, got ${[...focused]}`);
});
