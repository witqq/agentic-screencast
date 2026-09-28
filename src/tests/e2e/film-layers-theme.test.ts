// Слои ролика в теме своей сцены. Полоса хода, название части и кайма ведущего рисуются одним
// проходом поверх склейки; прежде — в теме шапки на всём ролике, и над сценой со своей темой
// висели плашка и полоса чужой. Теперь каждый отрезок ролика с одной темой получает слои в ней.
// И подсветка кода у каждой темы своя: прежде шесть тёмных тем делили одну палитру.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { rawOf } from "../support.js";
import { THEMES, THEME_NAMES } from "../../theme.js";

const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");
const W = 1280, H = 720;
type RGB = [number, number, number];
const hex = (h: string): RGB => { const v = Number.parseInt(h.slice(1, 7), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
const far = (a: RGB, b: RGB): number => Math.max(...a.map((x, i) => Math.abs(x - b[i]!)));

test("the progress bar and the part label wear the theme of the scene under them", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-layers-theme-"));
  writeFileSync(join(dir, "page.html"), `<!doctype html><body style="margin:0;background:#808080"></body>`);
  writeFileSync(join(dir, "story.md"), `# L
lang: ru
voice: {"engine":"stub","name":"silent","cps":15}
frame: {"width":${W},"height":${H},"fps":10,"scale":1}
theme: midnight
progress: {"position":"bottom","parts":true}

## a · page
part: Первая
page: page.html
duration: 3

## b · page
part: Вторая
theme: calm-paper
page: page.html
duration: 3
`);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "out.mp4"], { cwd: dir, encoding: "utf8",
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-600));
  const at = (t: number): (x: number, y: number) => RGB => {
    const raw = rawOf(execFileSync(ffmpeg, ["-loglevel", "error", "-i", join(dir, "out.mp4"), "-ss", String(t), "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"]));
    return (x, y) => { const i = (y * W + x) * 3; return [raw[i]!, raw[i + 1]!, raw[i + 2]!]; };
  };
  // Цвет плашки части — медиана всех её точек у левого нижнего угла (всё, что не серая страница):
  // фон плашки занимает большую часть её площади, текст — меньшую.
  const badge = (px: (x: number, y: number) => RGB): RGB => {
    const pts: RGB[] = [];
    for (let y = H - 60; y < H - 8; y++) for (let x = 20; x < 110; x++) { const p = px(x, y); if (far(p, [128, 128, 128]) > 24) pts.push(p); }
    assert.ok(pts.length > 200, `the part label is drawn (${pts.length} points)`);
    return [0, 1, 2].map((i) => pts.map((p) => p[i]!).sort((a, b) => a - b)[pts.length >> 1]!) as RGB;
  };
  for (const [t, name, other] of [[1.5, "midnight", "calm-paper"], [4.5, "calm-paper", "midnight"]] as const) {
    const px = at(t), theme = THEMES[name]!, foreign = THEMES[other]!;
    const bar = px(4, H - 2);
    assert.ok(far(bar, hex(theme["--sc-progress"]!)) < 40, `${t}s: the bar is ${name}'s --sc-progress (${bar})`);
    const card = (th: Record<string, string>): RGB => {
      const m = [...th["--sc-card-bg"]!.matchAll(/rgba?\((\d+),(\d+),(\d+)/g)].map((x) => [Number(x[1]), Number(x[2]), Number(x[3])]);
      return m[0]!.map((v, i) => Math.round((v + m[m.length - 1]![i]!) / 2)) as RGB;
    };
    const got = badge(px);
    assert.ok(far(got, card(theme)) < 24, `${t}s: the part label is ${name}'s card colour (${got} vs ${card(theme)})`);
    assert.ok(far(got, card(foreign)) > 60, `${t}s: and not ${other}'s (${card(foreign)})`);
  }
});

test("every theme highlights code in its own palette, readable on its code background", () => {
  const keys = ["--code-kw", "--code-str", "--code-num"];
  const seen = new Map<string, string>();
  const lum = (c: RGB): number => { const f = (v: number): number => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const contrast = (a: RGB, b: RGB): number => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };
  for (const name of THEME_NAMES) {
    const t = THEMES[name]!;
    const palette = keys.map((k) => t[k]).join(" ");
    // Нейтральные daylight и midnight — базовые палитры; остальные темы берут свои цвета.
    assert.ok(!seen.has(palette), `${name} shares its code palette with ${seen.get(palette)}`);
    seen.set(palette, name);
    for (const k of [...keys, "--code-fn", "--code-type", "--code-com", "--code-ink"]) {
      const c = contrast(hex(t[k]!), hex(t["--code-bg"]!));
      assert.ok(c >= 4.5, `${name} ${k} ${t[k]} reads on ${t["--code-bg"]} (contrast ${c.toFixed(2)})`);
    }
  }
});
