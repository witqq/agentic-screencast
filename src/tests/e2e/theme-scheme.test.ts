// Схема темы — поле шапки `scheme: light|dark`: одна тема, два набора из общего файла палитр.
// Ролик в тёмной схеме светлой по умолчанию темы носит её тёмный фон; сцена с названной темой носит
// схему ролика; дубль, снятый в другой схеме, lint называет со схемой; незнакомая схема и схема,
// которой у темы нет, — ошибка разбора с перечнем.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parseSource, toPitch } from "../../source.js";
import { lint } from "../../lint.js";
import { SHARED_PALETTES, THEME_SCHEMES, themeFingerprint } from "../../theme.js";

const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");
const HEAD = `lang: en\nvoice: {"engine":"stub","name":"silent","cps":15}\nframe: {"width":640,"height":360,"fps":10,"scale":1}\n`;

const story = (body: string): string => {
  const dir = mkdtempSync(join(tmpdir(), "sc-scheme-"));
  writeFileSync(join(dir, "story.md"), `# Scheme\n${body}`);
  return join(dir, "story.md");
};
const hex = (h: string): [number, number, number] => { const n = Number.parseInt(h.slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };

test("scheme: dark dresses a light-by-default theme in its dark set from the shared palette file", () => {
  const corner = (scheme: string): [number, number, number] => {
    const file = story(`${HEAD}theme: neutral\n${scheme}\n## a · slides.chapter\ntitle: One\nbody: the first part\nduration: 1.5\nfade: none\n`);
    const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dirname(file), encoding: "utf8",
      env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dirname(file), ".home") } });
    assert.equal(r.status, 0, r.stderr.slice(-400));
    const px = execFileSync(ffmpeg, ["-loglevel", "error", "-ss", "0.8", "-i", join(dirname(file), "f.mp4"), "-frames:v", "1",
      "-vf", "crop=8:8:4:4,scale=1:1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
    return [px[0]!, px[1]!, px[2]!];
  };
  const near = (a: number[], b: number[]): boolean => a.every((v, i) => Math.abs(v - b[i]!) <= 8);
  const dark = corner("scheme: dark\n"), light = corner("");
  assert.ok(near(dark, hex(SHARED_PALETTES.neutral!.dark.bg)), `dark scheme corner ${dark} is neutral's dark bg`);
  assert.ok(near(light, hex(SHARED_PALETTES.neutral!.light.bg)), `default corner ${light} is neutral's light bg`);
});

test("a named scene theme wears the film's scheme unless it names its own", () => {
  const src = parseSource(story(`${HEAD}theme: neutral\nscheme: light\n\n## a · slides.chapter\ntheme: noir\ntitle: A\nbody: b\nduration: 1\n\n`
    + `## b · slides.chapter\ntheme: {"preset":"noir","scheme":"dark"}\ntitle: B\nbody: b\nduration: 1\n`));
  const pitch = toPitch(src);
  assert.equal(src.theme!["--bg"], SHARED_PALETTES.neutral!.light.bg);
  assert.equal(pitch.scenes[0]!.theme!["--bg"], SHARED_PALETTES.noir!.light.bg, "noir in a light film is noir light");
  assert.equal(pitch.scenes[1]!.theme!["--bg"], SHARED_PALETTES.noir!.dark.bg, "a scene's own scheme wins");
});

test("an unknown scheme and a scheme a theme lacks are parse errors that list what there is", () => {
  assert.throws(() => parseSource(story(`${HEAD}scheme: dusk\n\n## a · slides.chapter\ntitle: A\nbody: b\nduration: 1\n`)),
    /unknown scheme «dusk»; available: light, dark/u);
  assert.throws(() => parseSource(story(`${HEAD}theme: blockbuster\nscheme: light\n\n## a · slides.chapter\ntitle: A\nbody: b\nduration: 1\n`)),
    /theme «blockbuster» has no light scheme; it has: dark/u);
});

test("lint names a take recorded in another scheme of the same theme, with the scheme in the hint", () => {
  const file = story(`${HEAD}theme: neutral\n\n## v · video\nfile: take.mp4\nduration: 3\n`);
  const dir = dirname(file);
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "color=c=gray:s=320x180:r=10:d=3", "-c:v", "libx264", "-pix_fmt", "yuv420p", join(dir, "take.mp4")]);
  const marks = join(dir, "take.mp4.marks.json");
  writeFileSync(marks, JSON.stringify({ marks: {}, clicks: [], theme: themeFingerprint(THEME_SCHEMES.neutral!.dark!) }));
  const found = lint(file).filter((f) => f.id === "take-theme").map((f) => f.message).join("\n");
  assert.match(found, /recorded in neutral \(dark\), the scene wears neutral; record it again with theme: "neutral"/u);
  writeFileSync(marks, JSON.stringify({ marks: {}, clicks: [], theme: themeFingerprint(THEME_SCHEMES.neutral!.light!) }));
  assert.deepEqual(lint(file).filter((f) => f.id === "take-theme"), []);
});
