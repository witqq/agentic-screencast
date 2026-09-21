import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { recordTake } from "../../capture.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const ffprobe = require("@ffprobe-installer/ffprobe").path as string;

test("live locator actions and visible click use the same browser event", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-capture-"));
  const html = join(dir, "page.html");
  const video = join(dir, "take.webm");
  writeFileSync(html, `<!doctype html><html><body style="margin:0;background:#fafafa;height:1300px">
    <button id="go" style="display:none;position:absolute;top:940px;left:230px;width:180px;height:58px;background:#e54b4b">Ready</button>
    <input id="entry" style="position:absolute;top:1040px;left:230px;width:190px;height:44px">
    <input id="scrub" type="range" min="0" max="100" value="0" style="position:absolute;top:1090px;left:230px;width:190px">
    <input id="secret" type="password" style="position:absolute;top:1110px;left:230px">
    <div id="drag" draggable="true" style="position:absolute;top:1160px;left:230px;width:60px;height:40px;background:#c66">Drag</div>
    <div id="drop" style="position:absolute;top:1160px;left:350px;width:80px;height:40px;background:#66c">Drop</div>
    <script>
      window.setTimeout(() => { document.querySelector('#go').style.display = 'block'; }, 250);
      document.querySelector('#go').addEventListener('click', e => {
        window.appClick = { x:e.clientX, y:e.clientY, at:performance.now() };
        e.currentTarget.textContent = 'Clicked';
        e.currentTarget.style.background = '#00d000';
        document.body.style.background = '#00d000';
      });
      document.querySelector('#entry').addEventListener('keydown', e => {
        if (e.key === 'Enter') window.enterPressed = true;
      });
      document.querySelector('#drop').addEventListener('dragover', e => e.preventDefault());
      document.querySelector('#drop').addEventListener('drop', e => {
        e.preventDefault(); e.currentTarget.textContent = 'Dropped';
      });
    </script></body></html>`);
  let observation: {
    app: { x: number; y: number; at: number };
    trace: Array<{ kind: string; x: number; y: number; at: number }>;
    value: string;
    range: number;
    enterPressed: boolean;
    dropped: boolean;
    scrollY: number;
    passwordRefused: boolean;
    missingRefused: boolean;
  } | undefined;

  await recordTake({ output: video, viewport: { width: 640, height: 360 },
    prepare: async (page) => { await page.goto(pathToFileURL(html).href); } }, async (capture) => {
    const page = capture.page;
    await capture.click(page.locator("#go"));
    await capture.type(page.locator("#entry"), "Hello");
    await capture.press(page.locator("#entry"), "Enter");
    await capture.withFocusCard(page.locator("#scrub"), { title: "A real click",
      body: "This control changes the value shown by the interface.",
      reveal: "type", motion: "glide" },
      async () => {
        await capture.range(page.locator("#scrub"), 0.75);
        await capture.drag(page.locator("#drag"), page.locator("#drop"));
      });
    const traceBeforeErrors = await page.evaluate(() => {
      const w = window as unknown as { __agenticScreencastCapture_v1: { trace: Array<{
        kind: string; x: number; y: number; at: number }> } };
      return w.__agenticScreencastCapture_v1.trace.length;
    });
    let passwordRefused = false, missingRefused = false;
    await assert.rejects(capture.card({ title: "Missing anchor", position: "near-focus" }),
      /withFocusCard/);
    try { await capture.type(page.locator("#secret"), "not-for-video"); }
    catch { passwordRefused = true; }
    page.setDefaultTimeout(250);
    try { await capture.click(page.locator("#missing")); }
    catch { missingRefused = true; }
    observation = await page.evaluate(({ passwordRefused, missingRefused }) => {
      const w = window as unknown as {
        appClick: { x: number; y: number; at: number };
        __agenticScreencastCapture_v1: { trace: Array<{
          kind: string; x: number; y: number; at: number }> };
      };
      return { app: w.appClick, trace: w.__agenticScreencastCapture_v1.trace,
        value: (document.querySelector("#entry") as HTMLInputElement).value,
        range: Number((document.querySelector("#scrub") as HTMLInputElement).value),
        enterPressed: Boolean((window as unknown as { enterPressed?: boolean }).enterPressed),
        dropped: document.querySelector("#drop")?.textContent === "Dropped",
        scrollY: window.scrollY, passwordRefused, missingRefused };
    }, { passwordRefused, missingRefused });
    assert.equal(observation.trace.length, traceBeforeErrors);
  });

  assert.ok(observation);
  assert.ok(observation.passwordRefused && observation.missingRefused);
  assert.equal(observation.value, "Hello");
  assert.ok(observation.range > 60 && observation.range < 90);
  assert.ok(observation.enterPressed && observation.dropped);
  assert.ok(observation.scrollY > 500);
  const down = observation.trace.find((event) => event.kind === "down")!;
  const click = observation.trace.find((event) => event.kind === "click")!;
  assert.equal(down.x, observation.app.x);
  assert.equal(down.y, observation.app.y);
  assert.equal(click.x, observation.app.x);
  assert.equal(click.y, observation.app.y);
  assert.ok(down.at <= observation.app.at);

  const duration = Number(execFileSync(ffprobe, ["-v", "error", "-show_entries",
    "format=duration", "-of", "default=nw=1:nk=1", video], { encoding: "utf8" }));
  assert.ok(duration > 5);
  // The crop contains the actual click point. One recorded frame must show
  // both the post-click green UI and the cyan ripple, not a pre-click cue.
  const cx = Math.max(0, Math.min(560, Math.round(down.x) - 40));
  const cy = Math.max(0, Math.min(280, Math.round(down.y) - 40));
  const pixels = execFileSync(ffmpeg, ["-v", "error", "-i", video,
    "-vf", `crop=80:80:${cx}:${cy},format=rgb24`, "-f", "rawvideo", "-"],
  { maxBuffer: 32 * 1024 * 1024 });
  const stride = 80 * 80 * 3;
  let synchronizedFrame = false;
  for (let frame = 0; frame + stride <= pixels.length; frame += stride) {
    let green = 0, cyan = 0;
    for (let i = frame; i < frame + stride; i += 3) {
      const r = pixels[i]!, g = pixels[i + 1]!, b = pixels[i + 2]!;
      if (r < 90 && g > 150 && b < 100) green++;
      if (r < 140 && g > 130 && b > 115) cyan++;
    }
    if (green > 300 && cyan > 8) { synchronizedFrame = true; break; }
  }
  assert.ok(synchronizedFrame, "No frame contains both the UI result and click ripple");
});

test("a click inside an iframe paints the parent-frame cursor and ripple", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-capture-frame-"));
  const video = join(dir, "frame.webm");
  let result: { trace: Array<{ kind: string; x: number; y: number }>;
    box: { x: number; y: number; width: number; height: number }; text: string } | undefined;
  await recordTake({ output: video, viewport: { width: 640, height: 360 },
    prepare: async (page) => {
      await page.setContent(`<body style="margin:0;background:white">
        <iframe id="child" style="position:absolute;left:100px;top:80px;width:300px;height:180px;border:5px solid #333"
          srcdoc="<button id='inside' style='margin:20px;width:120px;height:60px'>Ready</button>"></iframe>`);
      const button = page.frameLocator("#child").locator("#inside");
      await button.waitFor();
      await button.evaluate((element) => element.addEventListener("click", () => {
        element.textContent = "Clicked";
        (element as HTMLElement).style.background = "#00d000";
      }));
    } }, async (capture) => {
    const button = capture.page.frameLocator("#child").locator("#inside");
    const box = await button.boundingBox();
    assert.ok(box);
    await capture.click(button);
    result = { box, text: await button.textContent() ?? "",
      trace: await capture.page.evaluate(() => {
        const w = window as unknown as { __agenticScreencastCapture_v1: {
          trace: Array<{ kind: string; x: number; y: number }> } };
        return w.__agenticScreencastCapture_v1.trace;
      }) };
  });
  assert.ok(result);
  assert.equal(result.text, "Clicked");
  const down = result.trace.find((event) => event.kind === "down");
  const click = result.trace.find((event) => event.kind === "click");
  assert.ok(down && click, "Iframe events must reach the top recording overlay");
  for (const event of [down, click]) {
    assert.ok(event.x >= result.box.x && event.x <= result.box.x + result.box.width);
    assert.ok(event.y >= result.box.y && event.y <= result.box.y + result.box.height);
  }
});

test("a live explanation remains visible until a slow action ends", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-capture-card-"));
  const video = join(dir, "card.webm");
  await recordTake({ output: video, viewport: { width: 640, height: 360 },
    prepare: async (page) => { await page.setContent("<body style='background:white'></body>"); } },
  async (capture) => {
    await capture.withCard({ title: "Waiting" }, async () => {
      await capture.page.waitForTimeout(5000);
    });
  });
  const pixels = execFileSync(ffmpeg, ["-v", "error", "-ss", "4.5", "-i", video,
    "-vf", "crop=90:70:400:260,format=rgb24", "-frames:v", "1", "-f", "rawvideo", "-"],
  { maxBuffer: 1024 * 1024 });
  let dark = 0;
  for (let i = 0; i < pixels.length; i += 3)
    if (pixels[i]! < 70 && pixels[i + 1]! < 100 && pixels[i + 2]! < 130) dark++;
  assert.ok(dark > 3000, "Card faded before the slow action completed");
});
