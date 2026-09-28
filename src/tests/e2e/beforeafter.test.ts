// «Было/стало» в одном кадре: левее разделителя — первый снимок, правее — второй, и
// разделитель едет. Снимки — ровные цвета, поэтому принадлежность пикселя видна прямо.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { chromium, type Page } from "playwright";
import { rawOf } from "../support.js";
import { generateFrom } from "../../generate.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const here = dirname(fileURLToPath(import.meta.url));
const CLOCK = readFileSync(resolve(here, "..", "..", "browser", "clock.js"), "utf8");
const STAGE = readFileSync(resolve(here, "..", "..", "browser", "stage.js"), "utf8");
const W = 1920, H = 1080;

test("before sits left of the divider, after right of it, and the divider travels", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-ba-"));
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "color=c=0xd02020:s=1600x1000", "-frames:v", "1", join(dir, "before.png")]);
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "color=c=0x2040d0:s=1600x1000", "-frames:v", "1", join(dir, "after.png")]);
  writeFileSync(join(dir, "story.md"), `# BA
lang: en
voice: {"engine":"stub","name":"silent","cps":15}

## ba · slides.beforeafter
title: Before and after
image: before.png
after: after.png
labels: Before | After
duration: 6
`);
  const g = generateFrom(join(dir, "story.md"));
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    await ctx.addInitScript({ content: CLOCK });
    await ctx.addInitScript({ content: STAGE });
    const p: Page = await ctx.newPage();
    await p.goto(pathToFileURL(g.pages.ba!).href);
    // Сцена монтируется так же, как в сборке: с умолчаниями своего вида из данных сборки.
    const scene = (JSON.parse(readFileSync(g.pitchFile, "utf8")) as { scenes: Array<{ id: string; effects?: unknown }> }).scenes.find((x) => x.id === "ba")!;
    await p.evaluate((fx) => window.__stage.mount({ duration: 6, beats: 0, effects: fx } as never), scene.effects);
    const row = async (t: number): Promise<{ divider: number; left: number; right: number; wrongLeft: number; wrongRight: number }> => {
      await p.evaluate((tt) => window.__clock.seek(tt), t);
      const box = await p.evaluate(() => { const r = document.querySelector(".ba-frame")!.getBoundingClientRect(); return { l: r.left, r: r.right, y: r.top + r.height * 0.75 }; });
      const f = rawOf(await p.screenshot());
      const y = Math.round(box.y);
      const red = (x: number): boolean => { const i = (y * W + x) * 3; return f[i]! > 150 && f[i + 2]! < 90; };
      const blue = (x: number): boolean => { const i = (y * W + x) * 3; return f[i + 2]! > 150 && f[i]! < 90; };
      // Разделитель — граница красного и синего; вокруг неё полоса линии, остальное обязано быть своим.
      let divider = -1;
      for (let x = Math.ceil(box.l) + 4; x < box.r - 4; x++) if (red(x - 1) && !red(x)) { divider = x; break; }
      let left = 0, right = 0, wrongLeft = 0, wrongRight = 0;
      for (let x = Math.ceil(box.l) + 4; x < box.r - 4; x++) {
        if (Math.abs(x - divider) < 32) continue;
        if (x < divider) { if (red(x)) left++; else wrongLeft++; } else { if (blue(x)) right++; else wrongRight++; }
      }
      return { divider: divider - box.l, left, right, wrongLeft, wrongRight };
    };
    const a = await row(1.5), b = await row(3.5);
    for (const [t, r] of [[1.5, a], [3.5, b]] as const) {
      assert.ok(r.divider > 0, `a divider is found at ${t}s`);
      assert.ok(r.left > 50 && r.right > 50 && r.wrongLeft === 0 && r.wrongRight === 0,
        `at ${t}s left is all before and right all after: ${JSON.stringify(r)}`);
    }
    assert.ok(a.divider - b.divider > 100, `the divider travels left (${a.divider.toFixed(0)} → ${b.divider.toFixed(0)})`);
  } finally { await browser.close(); }
});

test("a screenshot comes apart into panels, and the near panel moves further than the far one", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-px-"));
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=s=1600x1000", "-frames:v", "1", join(dir, "shot.png")]);
  writeFileSync(join(dir, "story.md"), `# PX
lang: en
voice: {"engine":"stub","name":"silent","cps":15}

## px · slides.parallax
title: In depth
image: shot.png
panels: 0.1 0.2 0.4 0.3 @ 1 | 0.5 0.6 0.4 0.3 @ 0.1
duration: 8
`);
  const g = generateFrom(join(dir, "story.md"));
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    await ctx.addInitScript({ content: CLOCK });
    await ctx.addInitScript({ content: STAGE });
    const p: Page = await ctx.newPage();
    await p.goto(pathToFileURL(g.pages.px!).href);
    const scene = (JSON.parse(readFileSync(g.pitchFile, "utf8")) as { scenes: Array<{ id: string; effects?: unknown }> }).scenes.find((x) => x.id === "px")!;
    await p.evaluate((fx) => window.__stage.mount({ duration: 8, beats: 0, effects: fx } as never), scene.effects);
    const centres = async (t: number): Promise<Array<[number, number]>> => {
      await p.evaluate((tt) => window.__clock.seek(tt), t);
      return p.evaluate(() => [...document.querySelectorAll(".px-panel")].map((e) => {
        const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2] as [number, number];
      }));
    };
    const a = await centres(2.5), b = await centres(5.5);
    const move = (i: number): number => Math.hypot(b[i]![0] - a[i]![0], b[i]![1] - a[i]![1]);
    assert.ok(move(0) > 1.5 * move(1) && move(0) > 10, `the near panel moves ${move(0).toFixed(1)} px, the far one ${move(1).toFixed(1)} px`);
    // Панель показывает свою часть снимка: снимок и панели — один и тот же файл.
    const bg = await p.evaluate(() => [...document.querySelectorAll(".px-panel")].map((e) => getComputedStyle(e).backgroundImage.slice(0, 40)));
    assert.ok(bg.every((x) => x.startsWith('url("data:image/png')), "each panel is cut from the screenshot");
  } finally { await browser.close(); }
  writeFileSync(join(dir, "story.md"), readFileSync(join(dir, "story.md"), "utf8").replace("0.5 0.6 0.4 0.3 @ 0.1", "0.8 0.6 0.4 0.3 @ 0.1"));
  assert.throws(() => generateFrom(join(dir, "story.md")), /panels\[2\]: the panel lies outside the picture/);
});
