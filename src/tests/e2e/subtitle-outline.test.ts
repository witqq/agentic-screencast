// Контур без плашки остаётся опубликованным умолчанием. Явная плотная плашка помогает
// на пёстром интерфейсе и не меняет оформление существующего сценария.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { THEMES, THEME_NAMES } from "../../theme.js";
import { parseCaptions } from "../../source.js";

const here = dirname(fileURLToPath(import.meta.url));
const CLOCK = readFileSync(resolve(here, "..", "..", "browser", "clock.js"), "utf8");
const STAGE = readFileSync(resolve(here, "..", "..", "browser", "stage.js"), "utf8");
const ENTRY = resolve(here, "..", "..", "agentic-screencast.js");
const FFMPEG = createRequire(import.meta.url)("ffmpeg-static") as string;
type RGB = [number, number, number];
const hex = (h: string): RGB => { const v = Number.parseInt(h.slice(1, 7), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
const lum = (c: RGB): number => { const f = (v: number): number => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const contrast = (a: RGB, b: RGB): number => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

test("every theme's outline subtitles read: text and the karaoke word against the outline", () => {
  for (const name of THEME_NAMES) {
    const t = THEMES[name]!;
    const ink = hex(t["--sc-sub-outline-ink"]!), line = hex(t["--sc-sub-outline"]!), acc = hex(t["--sc-sub-accent"]!);
    assert.ok(contrast(ink, line) >= 4.5, `${name}: text on its outline (${contrast(ink, line).toFixed(1)})`);
    assert.ok(contrast(acc, line) >= 4.5, `${name}: the karaoke word on the outline (${contrast(acc, line).toFixed(1)})`);
  }
  assert.equal(parseCaptions('{"look":"plate"}').look, "plate");
  assert.throws(() => parseCaptions('{"look":"box"}'), /captions\.look/);
});

test("subtitles keep the outline default; explicit plate keeps the theme's font and two-line fit", async () => {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const probe = async (w: number, h: number, name: string, look?: "plate"): Promise<{ bg: string; shadow: string; size: number; family: string; lines: number }> => {
      const p = await browser.newPage({ viewport: { width: w, height: h } });
      await p.addInitScript({ content: CLOCK }); await p.addInitScript({ content: STAGE });
      await p.goto("about:blank");
      await p.evaluate((s) => window.__stage.mount(s as never), { duration: 6, beats: 1, theme: THEMES[name], starts: [0], spoken: 5,
        captionStyle: "subtitle", captionEverywhere: true, beatTexts: ["Каждая правка закрыта тестом, который падал на прежнем коде, и это видно в кадре"], effects: {},
        ...(h > w ? { safe: { top: 170, bottom: 484, left: 65, right: 180 }, subMax: 30 } : {}), ...(look ? { captionLook: look } : {}) });
      const m = await p.evaluate(() => { window.__clock.seek(1); const e = document.querySelector("#__sub") as HTMLElement; const cs = getComputedStyle(e);
        const line = e.querySelector(".__line") as HTMLElement;
        return { bg: getComputedStyle(line).backgroundColor, shadow: cs.textShadow, size: parseFloat(cs.fontSize), family: cs.fontFamily.split(",")[0]!.replace(/["']/g, "").trim(),
          lines: Math.round(e.getBoundingClientRect().height / parseFloat(cs.lineHeight)) }; });
      await p.close();
      return m;
    };
    for (const name of THEME_NAMES) {
      const m = await probe(1920, 1080, name);
      assert.equal(m.bg, "rgba(0, 0, 0, 0)", `${name}: no plate behind the outline subtitles`);
      const offsets = [...m.shadow.matchAll(/rgb\(0, 0, 0\) (-?[\d.]+)px (-?[\d.]+)px 0px/g)].map((x) => Math.hypot(Number(x[1]), Number(x[2])));
      assert.ok(offsets.length >= 12 && Math.min(...offsets) >= 0.08 * m.size * 0.99, `${name}: a black outline of at least 8% of the size (${Math.min(...offsets).toFixed(1)} px at ${m.size.toFixed(0)} px)`);
      assert.equal(m.family, THEMES[name]!["--sub-font"]!.split(",")[0]!.replace(/["']/g, "").trim(), `${name}: subtitles in the theme's subtitle font`);
      assert.ok(m.size >= 62, `${name}: the subtitle is 62 px or more at 1080 (${m.size.toFixed(0)})`);
      assert.ok(m.lines <= 2, `${name}: a piece stays within two lines (${m.lines})`);
      const plate = await probe(1920, 1080, name, "plate");
      assert.notEqual(plate.bg, "rgba(0, 0, 0, 0)", `${name}: explicit plate draws its backing`);
      assert.ok(plate.lines <= 2, `${name}: the explicit plate stays within two lines (${plate.lines})`);
    }
    const v = await probe(1080, 1920, "midnight");
    assert.ok(v.size >= 64 && v.lines <= 2, `vertical: ${v.size.toFixed(0)} px in ${v.lines} lines`);
  } finally { await browser.close(); }
});

test("the public build keeps outline without look and gives explicit plate a dense encoded backing", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-caption-look-"));
  writeFileSync(join(dir, "page.html"), `<!doctype html><body style="margin:0;height:100vh;background:repeating-linear-gradient(45deg,#cf4e83 0 18px,#1d5d9d 18px 36px,#e8ae52 36px 54px)"></body>`);
  const darkPixels = (file: string): number => {
    const raw = execFileSync(FFMPEG, ["-nostdin", "-loglevel", "error", "-ss", "1.5", "-i", file,
      "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
    let dark = 0;
    for (let y = 25; y < 60; y++) for (let x = 110; x < 530; x++) {
      const k = (y * 640 + x) * 3;
      if (raw[k]! + raw[k + 1]! + raw[k + 2]! < 150) dark++;
    }
    return dark;
  };
  const build = (look?: "plate"): number => {
    const name = look ?? "default";
    writeFileSync(join(dir, `${name}.md`), `# Caption\nframe: {"width":640,"height":360,"fps":8}\ntheme: synthwave\nvoice: {"engine":"stub","name":"silent","cps":15}\ncaptions: {"style":"subtitle","everywhere":true,"position":"top"${look ? ',"look":"plate"' : ""}}\n\n## page · page\npage: page.html\nduration: 3\n\nSave the result using this control.\n`);
    const result = spawnSync(process.execPath, [ENTRY, "build", `${name}.md`, "--out", `${name}.mp4`], { cwd: dir, encoding: "utf8",
      env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
    assert.equal(result.status, 0, result.stderr.slice(-600));
    const report = JSON.parse(result.stdout) as { audit: { issues: unknown[] }; warnings: unknown[] };
    assert.equal(report.audit.issues.length, 0);
    assert.equal(report.warnings.length, 0);
    return darkPixels(join(dir, `${name}.mp4`));
  };
  const outline = build(), plate = build("plate");
  assert.ok(plate > outline + 3000, `explicit plate covers the busy background beneath the subtitle (${outline} → ${plate} dark pixels)`);
});
