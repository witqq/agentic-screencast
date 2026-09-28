// Подсветка без наезда: `scale: 1` у фокуса (и у движения камеры) затемняет всё вокруг цели и
// ставит рамку, а кадр стоит в полный размер — без наезда, смещения и дрейфа на удержании.
// Нужна там, где весь экран должен остаться в кадре: настоящий экран телефона до самого низа.
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

test("a focus with scale 1 dims and rings its subject while the frame stays still", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-still-"));
  const file = join(dir, "p.html");
  writeFileSync(file, `<!doctype html><body style="margin:0;background:#445"><div id="ui" style="position:absolute;left:700px;top:500px;width:200px;height:80px;background:#9ab"></div></body>`);
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await ctx.addInitScript({ content: CLOCK });
    await ctx.addInitScript({ content: STAGE });
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(file).href);
    await p.evaluate((s) => window.__stage.mount(s as never), { duration: 8, beats: 1, theme: THEMES.midnight, starts: [0], spoken: [6],
      effects: {}, overlay: parseOverlay(JSON.stringify({ camera: [{ at: 0.5, hold: 4, target: "#ui", scale: 1 }] })) });
    const at = async (t: number): Promise<{ zoom: string; spot: { left: number; top: number; width: number; opacity: number }; ui: { left: number; top: number } }> => {
      await p.evaluate((x) => window.__clock.seek(x), t);
      return p.evaluate(() => {
        const spot = document.querySelector("#__spot") as HTMLElement;
        const r = spot.getBoundingClientRect(), u = document.querySelector("#ui")!.getBoundingClientRect();
        return { zoom: document.body.style.transform,
          spot: { left: r.left, top: r.top, width: r.width, opacity: Number(getComputedStyle(spot).opacity) }, ui: { left: u.left, top: u.top } };
      });
    };
    for (const t of [2, 4]) {
      const m = await at(t);
      assert.match(m.zoom, /^translate\(0px, 0px\) scale\(1\)$/, `at ${t}s the frame is not pushed in: ${m.zoom}`);
      assert.deepEqual(m.ui, { left: 700, top: 500 }, "the subject stays where the page put it");
      assert.ok(m.spot.opacity > 0.5 && Math.abs(m.spot.left - 700) < 30 && Math.abs(m.spot.top - 500) < 30 && m.spot.width < 300,
        `the highlight stands around the subject: ${JSON.stringify(m.spot)}`);
    }
  } finally { await browser.close(); }
});

test("camera and spotlight scale accepts 1 and still refuses values outside 1–3", () => {
  assert.equal(parseOverlay('{"camera":[{"at":1,"hold":2,"area":[0.1,0.1,0.3,0.3],"scale":1}]}').camera![0]!.scale, 1);
  assert.throws(() => parseOverlay('{"camera":[{"at":1,"hold":2,"area":[0.1,0.1,0.3,0.3],"scale":0.9}]}'), /scale: expected 1–3/);
  assert.throws(() => parseOverlay('{"camera":[{"at":1,"hold":2,"area":[0.1,0.1,0.3,0.3],"scale":3.5}]}'), /scale: expected 1–3/);
});
