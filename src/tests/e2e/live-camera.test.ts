// Наезд над живым дублем исполняет браузер: сборка переснимает дубль его же скриптом, и мелкий
// текст в приближении остаётся чётким, а не растянутыми точками видео. Неизменный план дубль
// повторно не переснимает.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;
const here = dirname(fileURLToPath(import.meta.url));
const ENTRY = resolve(here, "..", "..", "agentic-screencast.js");
const CAPTURE = pathToFileURL(resolve(here, "..", "..", "capture.js")).href;
const W = 640, H = 360;

const PAGE = `<!doctype html><html><body style="margin:0;background:#fff;font:9px/11px sans-serif;color:#111">
<div style="position:absolute;left:40px;top:40px;width:200px">${"Small interface text that must stay readable. ".repeat(14)}</div>
</body></html>`;

// Скрипт дубля считает свои запуски: по счётчику видно, переснимала ли сборка дубль.
const SCRIPT = `import { recordTake } from ${JSON.stringify(CAPTURE)};
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
appendFileSync("runs.txt", "x");
await recordTake({ output: "take.webm", viewport: { width: ${W}, height: ${H} },
  prepare: async (page) => { await page.goto(pathToFileURL("app.html").href); } }, async (take) => {
  await take.page.waitForTimeout(300);
  take.mark("ready");
  await take.page.waitForTimeout(3000);
});
`;

/** Правый край тёмного текста в кадре: без наезда текст кончается около 215-й точки. */
function textRight(file: string, t: number): number {
  const raw = execFileSync(ffmpeg, ["-loglevel", "error", "-ss", String(t), "-i", file, "-frames:v", "1",
    "-vf", "format=gray", "-f", "rawvideo", "-"]);
  let right = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (raw[y * W + x]! < 80) right = Math.max(right, x);
  return right;
}

/** Резкость: сумма перепадов яркости между соседними точками в окне кадра. */
function sharpness(file: string, t: number): number {
  const raw = execFileSync(ffmpeg, ["-loglevel", "error", "-ss", String(t), "-i", file, "-frames:v", "1",
    "-vf", "format=gray", "-f", "rawvideo", "-"]);
  let sum = 0;
  for (let y = 60; y < H - 60; y++) for (let x = 60; x < W - 60; x++) sum += Math.abs(raw[y * W + x + 1]! - raw[y * W + x]!);
  return sum;
}

test("a push-in over a live take is performed by the browser and stays sharp", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-live-camera-"));
  writeFileSync(join(dir, "app.html"), PAGE);
  writeFileSync(join(dir, "take.mjs"), SCRIPT);
  // Дубль пишется так, как его пишет агент, — не из процесса теста.
  const { NODE_TEST_CONTEXT: _test, ...clean } = process.env;
  execFileSync(process.execPath, ["take.mjs"], { cwd: dir, stdio: "ignore", env: clean });
  writeFileSync(join(dir, "story.md"), `# S\nlang: en\nvoice: {"engine":"stub","name":"silent","cps":15}\nframe: {"width":${W},"height":${H},"fps":30,"scale":1}\n\n`
    + `## clip · video\nfile: take.webm\nduration: 3\nfade: none\n`
    + `overlay: {"camera":[{"at":0.4,"area":[0.06,0.1,0.34,0.4],"scale":2.4,"move":0.5,"hold":2}]}\n`);
  const build = (out: string, env: Record<string, string> = {}): string => {
    const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", out], { cwd: dir, encoding: "utf8",
      env: { ...clean, AGENTIC_SCREENCAST_HOME: join(dir, ".home"), ...env } });
    assert.equal(r.status, 0, r.stderr.slice(-600));
    return r.stderr;
  };
  const runs = (): number => readFileSync(join(dir, "runs.txt"), "utf8").length;

  const first = build("live.mp4");
  assert.equal(runs(), 2, "the build re-records the take once");
  assert.match(first, /re-recorded/u);
  const cam = join(dir, "take.webm.clip.cam.webm");
  assert.ok(existsSync(cam), "the re-recorded take lies next to the take");
  const marks = JSON.parse(readFileSync(`${cam}.marks.json`, "utf8")) as { cameraPlan?: string; cameraMoves?: unknown[] };
  assert.ok(marks.cameraPlan, "the re-recorded take names the camera plan it performed");
  assert.ok(marks.cameraMoves?.length, "the camera movement is recorded in the take");

  build("video.mp4", { AGENTIC_SCREENCAST_NO_LIVE_CAMERA: "1" });
  assert.ok(textRight(join(dir, "live.mp4"), 1.8) > 400, "the browser pushed in on the text");
  const live = sharpness(join(dir, "live.mp4"), 1.8), video = sharpness(join(dir, "video.mp4"), 1.8);
  assert.ok(live > video * 1.25, `browser push-in is sharper than the video push-in (${live} vs ${video})`);

  build("again.mp4");
  assert.equal(runs(), 2, "an unchanged camera plan does not re-record the take");
});
