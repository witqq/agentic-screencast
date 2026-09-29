import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { lint } from "../../lint.js";
import { serve } from "../../record.js";
import { parseSource, toPitch } from "../../source.js";

const FFMPEG = createRequire(import.meta.url)("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

const pixel = (file: string, x: number, y: number): Buffer => execFileSync(FFMPEG,
  ["-nostdin", "-loglevel", "error", ...(file.endsWith(".mp4") ? ["-ss", "0.625"] : []), "-i", file, "-vf", `crop=2:2:${x}:${y}`,
    "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);

test("a translated portrait page reaches build, frames, lint and record while other pages retain cropping", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-portrait-page-"));
  const story = join(dir, "story.md");
  writeFileSync(story, `# Film
lang: ru
format: landscape
frame: {"width":640,"height":360,"fps":8}
voice: {"engine":"stub","name":"silent"}

## native · page
page: landscape.ru.html
page.en: landscape.en.html
pageVertical: portrait.ru.html
pageVertical.en: portrait.en.html
duration: 1.25

## fallback · page
page: landscape.ru.html
page.en: landscape.en.html
duration: 1.25

## long · page
page: landscape.ru.html
page.en: landscape.en.html
pageVertical: portrait.ru.html
pageVertical.en: portrait.en.html
duration: 6
`);
  const page = (colour: string, chip: string, moving: boolean): string => `<!doctype html><html><body style="margin:0;background:${colour}">
<div style="position:absolute;left:800px;top:700px;width:200px;height:200px;background:${chip}"></div>
${moving ? '<style>@keyframes drift{to{opacity:.5}} body::before{content:"";animation:drift 2s infinite}</style>' : ""}
</body></html>`;
  writeFileSync(join(dir, "landscape.ru.html"), page("#741d29", "#741d29", false));
  writeFileSync(join(dir, "landscape.en.html"), page("#741d29", "#741d29", false));
  writeFileSync(join(dir, "portrait.ru.html"), page("#286d6b", "#286d6b", true));
  writeFileSync(join(dir, "portrait.en.html"), page("#167843", "#2869e8", true));
  const vertical = toPitch(parseSource(story, { lang: "en", format: "vertical" }));
  assert.equal(vertical.scenes[0]!.page, "portrait.en.html");
  assert.equal(vertical.scenes[0]!.nativePortrait, true);
  assert.equal(vertical.scenes[1]!.page, "landscape.en.html");
  assert.equal(vertical.scenes[1]!.nativePortrait, undefined);
  const landscape = toPitch(parseSource(story, { lang: "en" }));
  assert.equal(landscape.scenes[0]!.page, "landscape.en.html");
  assert.equal(landscape.scenes[0]!.nativePortrait, undefined);
  const missing = join(dir, "missing.md");
  writeFileSync(missing, readFileSync(story, "utf8").replace("pageVertical.en: portrait.en.html", "pageVertical.en: absent.en.html"));

  const run = (...args: string[]) => spawnSync(process.execPath, [ENTRY, ...args], { cwd: dir, encoding: "utf8",
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  const missingBuild = run("build", "missing.md", "--lang", "en", "--format", "vertical", "--only", "native", "--out", "missing.mp4");
  assert.notEqual(missingBuild.status, 0);
  assert.match(missingBuild.stderr, /absent\.en\.html/, "the chosen portrait file is required; no landscape fallback");
  const missingFrame = run("frames", "missing.md", "--lang", "en", "--format", "vertical", "--scene", "native", "--out", "missing.png");
  assert.equal(missingFrame.status, 2);
  assert.match(missingFrame.stderr, /pageVertical.*absent\.en\.html/);
  const preview = run("frames", "story.md", "--lang", "en", "--format", "vertical", "--scene", "native", "--at", "50%", "--out", "preview.png");
  assert.equal(preview.status, 0, preview.stderr.slice(-500));
  const previewPixel = pixel(join(dir, "preview.png"), 900, 800);
  assert.ok(previewPixel[2]! > previewPixel[0]! + 50, `frames uses the portrait page: ${[...previewPixel]}`);

  const built = run("build", "story.md", "--lang", "en", "--format", "vertical", "--only", "native", "--out", "native.mp4");
  assert.equal(built.status, 0, built.stderr.slice(-600));
  const report = JSON.parse(built.stdout) as { scenes: Array<{ nativePortrait?: boolean; reframe?: boolean }> };
  assert.equal(report.scenes[0]!.nativePortrait, true);
  assert.equal(report.scenes[0]!.reframe, undefined);
  const filmPixel = pixel(join(dir, "native.mp4"), 900, 800);
  assert.ok(filmPixel[2]! > filmPixel[0]! + 50, `the finished film shows the portrait page's right edge: ${[...filmPixel]}`);

  const fallback = run("build", "story.md", "--lang", "en", "--format", "vertical", "--only", "fallback", "--out", "fallback.mp4");
  assert.equal(fallback.status, 0, fallback.stderr.slice(-600));
  assert.equal((JSON.parse(fallback.stdout) as { scenes: Array<{ reframe?: boolean }> }).scenes[0]!.reframe, true);

  const savedFormat = process.env.AGENTIC_SCREENCAST_FILM_FORMAT, savedLang = process.env.AGENTIC_SCREENCAST_FILM_LANG;
  process.env.AGENTIC_SCREENCAST_FILM_LANG = "en";
  try {
    process.env.AGENTIC_SCREENCAST_FILM_FORMAT = "landscape";
    assert.equal(lint(story).some((f) => f.scene === "long" && f.id === "still-scene"), true,
      "lint sees the static landscape page");
    process.env.AGENTIC_SCREENCAST_FILM_FORMAT = "vertical";
    const findings = lint(story);
    assert.equal(findings.some((f) => f.scene === "long" && f.id === "still-scene"), false,
      "lint reads the selected moving portrait page");
    const server = await serve({ source: story, voice: { engine: "recorded", dir: join(dir, "recordings") } });
    try {
      const response = await fetch(new URL("/api/picture/native", server.url));
      assert.equal(response.status, 200);
      const picture = join(dir, "record.png");
      writeFileSync(picture, Buffer.from(await response.arrayBuffer()));
      const colour = pixel(picture, 450, 400);
      assert.ok(colour[2]! > colour[0]! + 50, `recorder shows the portrait page: ${[...colour]}`);
    } finally { await server.close(); }
  } finally {
    if (savedFormat === undefined) delete process.env.AGENTIC_SCREENCAST_FILM_FORMAT;
    else process.env.AGENTIC_SCREENCAST_FILM_FORMAT = savedFormat;
    if (savedLang === undefined) delete process.env.AGENTIC_SCREENCAST_FILM_LANG;
    else process.env.AGENTIC_SCREENCAST_FILM_LANG = savedLang;
  }

  writeFileSync(join(dir, "portrait.en.html"), page("#167843", "#ed6928", true));
  const changed = run("build", "story.md", "--lang", "en", "--format", "vertical", "--only", "native", "--keys-only");
  assert.equal(changed.status, 0, changed.stderr.slice(-500));
  assert.equal((JSON.parse(changed.stdout) as { keys: Array<{ cached: boolean }> }).keys[0]!.cached, false,
    "changing the selected portrait file invalidates the scene cache");
});
