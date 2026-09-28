// Сцена-страница пересобирается, когда меняется то, что страница подгружает: картинка, стиль,
// шрифт. Ключ кэша прежде хешировал только сам HTML, и новая картинка рядом со страницей приходила
// в ролик старой — сцена «бралась из кэша».
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");
const FFMPEG = createRequire(import.meta.url)("ffmpeg-static") as string;

/** Одноцветная картинка 64×64. */
const png = (file: string, colour: string): void => {
  execFileSync(FFMPEG, ["-nostdin", "-v", "error", "-y", "-f", "lavfi", "-i", `color=c=${colour}:s=64x64`, "-frames:v", "1", file]);
};

/** Средний цвет середины кадра на первой секунде: [r, g, b]. */
const centre = (film: string): number[] => [...execFileSync(FFMPEG, ["-nostdin", "-v", "error", "-ss", "1", "-i", film,
  "-frames:v", "1", "-vf", "crop=200:200:(iw-200)/2:(ih-200)/2,scale=1:1:flags=area", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"])];

test("a page scene rebuilds when an image it loads changes, and stays cached when nothing it loads changed", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-pagecache-"));
  mkdirSync(join(dir, "pages", "img"), { recursive: true });
  png(join(dir, "pages", "img", "a.png"), "red");
  writeFileSync(join(dir, "pages", "p.html"), `<!doctype html><body style="margin:0;background:#000">
    <img src="img/a.png" style="display:block;width:100vw;height:100vh"></body>`);
  writeFileSync(join(dir, "story.md"), `# C\nvoice: {"engine":"stub","name":"silent","cps":15}\n\n## a · page\npage: pages/p.html\nduration: 2\n`);
  const build = (): { cached: boolean; rgb: number[] } => {
    const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
    assert.equal(r.status, 0, r.stderr.slice(-500));
    const scene = (JSON.parse(r.stdout) as { scenes: Array<{ cached: boolean }> }).scenes[0]!;
    return { cached: scene.cached, rgb: centre(join(dir, "f.mp4")) };
  };
  const first = build();
  assert.ok(first.rgb[0]! > 180 && first.rgb[2]! < 80, `red at first: ${first.rgb}`);
  assert.equal(build().cached, true, "an unchanged page comes from the cache");
  png(join(dir, "pages", "img", "a.png"), "blue");
  const after = build();
  assert.equal(after.cached, false, "a new image rebuilds the scene");
  assert.ok(after.rgb[2]! > 180 && after.rgb[0]! < 80, `blue after the swap: ${after.rgb}`);
});
