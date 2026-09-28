// Вспышка и тряска: кадр на якоре вспышки светлеет почти до белого и через десять кадров прежний;
// тряска сдвигает кадр только в своём окне.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parseHits } from "../../effects.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

test("flash and shake read anchors or a JSON list and refuse the rest", () => {
  assert.deepEqual(parseHits("b2 | 1.5s", "flash"), [{ at: "b2" }, { at: "1.5s" }]);
  assert.deepEqual(parseHits('[{"at":"b1","length":0.5,"strength":2}]', "shake"), [{ at: "b1", length: 0.5, strength: 2 }]);
  assert.throws(() => parseHits("soon", "flash"), /unexpected moment/);
  assert.throws(() => parseHits('{"at":"b1","strength":2}', "flash"), /0.1…1/);
  assert.throws(() => parseHits('{"at":"b1","size":2}', "shake"), /unknown property/);
});

test("a flash whitens the frame at its anchor and is gone ten frames later; a shake moves the frame only inside its window", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-hits-"));
  // Страница с узором: сдвиг кадра меняет каждый пиксель сетки.
  writeFileSync(join(dir, "p.html"), `<html><body style="margin:0;background:#445;background-image:linear-gradient(90deg,#99a 2px,transparent 2px),linear-gradient(#99a 2px,transparent 2px);background-size:24px 24px"></body></html>`);
  const film = (extra: string): string => {
    writeFileSync(join(dir, "story.md"), `# H\nvoice: {"engine":"stub","name":"silent","cps":15}\nframe: {"width":320,"height":180,"fps":10,"scale":1}\n\n## one · page\npage: p.html\nduration: 3\nfade: none\n${extra}\n`);
    const out = join(dir, `f${extra ? "x" : "0"}.mp4`);
    const r = spawnSync("node", [ENTRY, "build", "--source", "story.md", "--out", out],
      { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
    assert.equal(r.status, 0, r.stderr);
    return out;
  };
  const plain = film(""), hit = film('flash: 0.5s\nshake: {"at":"2s","length":0.4,"strength":1.5}');
  const frame = (file: string, n: number): Buffer => execFileSync(ffmpeg, ["-loglevel", "error", "-i", file, "-vf", `select=eq(n\\,${n})`,
    "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-"]);
  const mean = (b: Buffer): number => b.reduce((a, v) => a + v, 0) / b.length;
  const diff = (a: Buffer, b: Buffer): number => { let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i]! - b[i]!); return d / a.length; };
  // Цвет вспышки — тёплый свет темы (--tr-flash), поэтому «почти белый» — это яркость вспышки, а не 255.
  assert.ok(mean(frame(hit, 5)) > 170 && mean(frame(hit, 5)) - mean(frame(plain, 5)) > 90,
    `the frame at the flash is nearly the flash's light (${mean(frame(hit, 5)).toFixed(0)} against ${mean(frame(plain, 5)).toFixed(0)})`);
  assert.ok(diff(frame(hit, 15), frame(plain, 15)) < 2, "ten frames later the frame is the plain one");
  for (const n of [20, 21, 22]) assert.ok(diff(frame(hit, n), frame(plain, n)) > 6, `frame ${n} inside the shake is moved (${diff(frame(hit, n), frame(plain, n)).toFixed(1)})`);
  for (const n of [12, 26, 28]) assert.ok(diff(frame(hit, n), frame(plain, n)) < 2, `frame ${n} outside the shake is not (${diff(frame(hit, n), frame(plain, n)).toFixed(1)})`);
});
