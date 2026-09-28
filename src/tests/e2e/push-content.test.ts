// Наезд на цель, у которой содержимое выходит за её коробку (значок у угла карточки, как в
// пересъёмке #217), вписывал в кадр только коробку: значок резался краем кадра, а рамка шла сквозь
// него. Теперь масштаб и рамка считаются по тому, что цель показывает.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { parseOverlay } from "../../overlay.js";
import { THEMES } from "../../theme.js";

const here = dirname(fileURLToPath(import.meta.url));
const CLOCK = readFileSync(resolve(here, "..", "..", "browser", "clock.js"), "utf8");
const STAGE = readFileSync(resolve(here, "..", "..", "browser", "stage.js"), "utf8");
const W = 1280, H = 720;

test("a push-in keeps a target's overflowing badge inside the frame and inside the ring", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-pushcontent-"));
  const file = join(dir, "p.html");
  // Карточка в половину высоты кадра, значок вынесен вверх за её край на 90 точек.
  writeFileSync(file, `<!doctype html><body style="margin:0;background:#101826">
    <div id="card" style="position:absolute;left:500px;top:260px;width:280px;height:360px;background:#2b6;border-radius:12px">
      <span id="badge" style="position:absolute;right:-40px;top:-90px;width:120px;height:60px;background:#f5a"></span></div></body>`);
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    await ctx.addInitScript({ content: CLOCK });
    await ctx.addInitScript({ content: STAGE });
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(file).href);
    await p.evaluate((s) => window.__stage.mount(s as never), { duration: 6, beats: 1, theme: THEMES.midnight,
      overlay: parseOverlay('{"camera":[{"at":0.2,"hold":3,"target":"#card"}]}'), effects: { cursor: { hidden: true } } });
    await p.evaluate(() => window.__clock.seek(2));
    const m = await p.evaluate(() => {
      const b = document.querySelector("#badge")!.getBoundingClientRect();
      const s = document.querySelector("#__spot")!.getBoundingClientRect();
      return { badge: { l: b.left, t: b.top, r: b.right, b: b.bottom }, spot: { l: s.left, t: s.top, r: s.right, b: s.bottom } };
    });
    assert.ok(m.badge.t >= 0 && m.badge.r <= W && m.badge.l >= 0 && m.badge.b <= H, `the badge stays in the frame: ${JSON.stringify(m.badge)}`);
    assert.ok(m.spot.t <= m.badge.t && m.spot.r >= m.badge.r, `the ring goes around the badge: ring ${JSON.stringify(m.spot)}, badge ${JSON.stringify(m.badge)}`);
  } finally { await browser.close(); }
});
