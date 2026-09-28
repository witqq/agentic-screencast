// `captions: auto`: сборка ставит субтитры туда, где в кадре сцены меньше деталей. Экран, у
// которого внизу строки интерфейса, а верх пуст, получает субтитры сверху; наоборот — снизу.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bandDensity, chooseBand } from "../../capband.js";

const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

test("the band with the least detail wins, and the bottom keeps its place unless another is clearly emptier", () => {
  const w = 10, h = 30, zone = { top: 0, bottom: 0 };
  const busyBottom = Buffer.alloc(w * h, 20);
  for (let y = 22; y < 30; y++) for (let x = 0; x < w; x++) busyBottom[y * w + x] = (x + y) % 2 ? 250 : 10;
  assert.equal(chooseBand(bandDensity([busyBottom], w, h, zone, h, 0.25)), "top");
  assert.equal(chooseBand(bandDensity([Buffer.alloc(w * h, 20)], w, h, zone, h, 0.25)), "bottom", "a flat frame keeps the default");
});

test("captions: auto puts a scene's subtitles away from its busy part and the report names the choice", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-auto-"));
  const rows = (n: number): string => Array.from({ length: n }, (_, i) => `<div style="font:28px sans-serif;border-bottom:2px solid #aaa;padding:6px">Row ${i} · status · 12:0${i % 10} · owner</div>`).join("");
  writeFileSync(join(dir, "low.html"), `<!doctype html><body style="margin:0;background:#fff;height:100vh;display:flex;flex-direction:column;justify-content:flex-end">${rows(30)}</body>`);
  writeFileSync(join(dir, "high.html"), `<!doctype html><body style="margin:0;background:#fff;height:100vh">${rows(30)}</body>`);
  writeFileSync(join(dir, "story.md"), `# A\nformat: vertical\nzone: plain\ncaptions: {"style":"karaoke","everywhere":true,"position":"auto"}\nvoice: {"engine":"stub","name":"silent","cps":15}\n\n## low · page\npage: low.html\n\nThe list fills the lower part of the screen.\n\n## high · page\npage: high.html\n\nThe list fills the upper part of the screen.\n`);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "film.mp4"], { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-600));
  const report = JSON.parse(r.stdout) as { captionPlaces?: Array<{ scene: string; position: string }> };
  assert.deepEqual(report.captionPlaces, [{ scene: "low", position: "top" }, { scene: "high", position: "bottom" }]);
});
