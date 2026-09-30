import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium, type Page } from "playwright";
import { CSS, RUNTIME } from "../../provider/slides/styles.js";
import { parseOverlay } from "../../overlay.js";
import { THEMES } from "../../theme.js";

const CLOCK = readFileSync(new URL("../../browser/clock.js", import.meta.url), "utf8");
const STAGE = readFileSync(new URL("../../browser/stage.js", import.meta.url), "utf8");
async function withPage(html: string, run: (page: Page) => Promise<void>): Promise<void> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
    await page.addInitScript({ content: CLOCK });
    await page.addInitScript({ content: STAGE });
    await page.goto("about:blank");
    await page.setContent(html);
    await run(page);
  } finally { await browser.close(); }
}
const seek = (page: Page, t: number): Promise<void> => page.evaluate((time) => window.__clock.seek(time), t);

test("choreography preserves speech anchors until mount and reorders measured times once", async () => {
  for (const anchored of [true, false]) for (const [wave, stagger, expected] of [
    ["center", "", [2, 0, 4]], ["edges", "", [0, 4, 2]], ["center", "0.2", [0.2, 0, 0.4]],
  ] as const) {
    const times = anchored ? ["b1", "b2", "b3"] : ["0", "2", "4"];
    await withPage(`<!doctype html><html data-sc-page><head><style>${CSS}</style></head>
      <body data-wave="${wave}" data-stagger="${stagger}"><main>
      ${times.map((at, i) => `<div class="el" data-at="${at}">Item ${i}</div>`).join("")}
      </main><script>${RUNTIME}</script></body></html>`, async (page) => {
      const starts = (): Promise<number[]> => page.locator("main>.el").evaluateAll((nodes) => nodes.map((node) => Number((node as HTMLElement).dataset.at)));
      if (anchored) assert.deepEqual(await page.locator("main>.el").evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).dataset.at)), times);
      await page.evaluate((theme) => window.__stage.mount({ duration: 6, beats: 3, starts: [0, 2, 4], theme }), THEMES.midnight);
      await seek(page, 0.6);
      assert.deepEqual(await starts(), expected, `${wave}/${stagger}: measured entrances`);
      if (!stagger) {
        const opacity = await page.locator("main>.el").evaluateAll((nodes) => nodes.map((node) => Number(getComputedStyle(node).opacity)));
        assert.ok(opacity[wave === "center" ? 1 : 0]! > 0, "the first item actually enters");
        assert.equal(opacity[wave === "center" ? 0 : 1], 0, "a later item waits for its assigned speech time");
      }
      await seek(page, 5);
      await seek(page, 0.6);
      assert.deepEqual(await starts(), expected, "seeking does not apply choreography again");
    });
  }
});

test("repeated skeletons decide visibility once per actual target, including selector aliases", async () => {
  await withPage('<div id="answer" class="answer">Answer</div><div id="other" style="visibility:hidden">Other</div>', async (page) => {
    const overlay = parseOverlay(JSON.stringify({ thinking: [
      { at: 1, hold: 1.5, target: "#answer" }, { at: 5, hold: 1, target: ".answer" },
      { at: 8, hold: 1, target: "#other" },
    ] }));
    await page.evaluate((scene) => window.__stage.mount(scene), { duration: 12, theme: THEMES.midnight, overlay });
    for (const [time, expected] of [[0.4, "hidden"], [1.8, "hidden"], [3.5, "visible"], [5.5, "hidden"], [7, "visible"], [1.8, "hidden"], [3.5, "visible"]] as const) {
      await seek(page, time);
      assert.equal(await page.locator("#answer").evaluate((node) => getComputedStyle(node).visibility), expected, `seek ${time}`);
    }
    await seek(page, 10);
    assert.equal(await page.locator("#other").evaluate((node) => getComputedStyle(node).visibility), "hidden", "original visibility is restored");
  });
});

test("future boops cannot clear an active cue and authored styles return on arbitrary seeks", async () => {
  await withPage('<div id="answer" class="answer" style="scale:1.02;rotate:2deg;translate:3px 0;filter:contrast(0.8)">Answer</div>', async (page) => {
    const overlay = parseOverlay(JSON.stringify({ boops: [
      { at: 1, target: "#answer", kind: "pulse", hold: 2 }, { at: 5, target: ".answer", kind: "pop" },
    ] }));
    await page.evaluate((scene) => window.__stage.mount(scene), { duration: 8, theme: THEMES.midnight, overlay });
    const styles = (): Promise<string[]> => page.locator("#answer").evaluate((node) => {
      const s = (node as HTMLElement).style; return [s.scale, s.rotate, s.translate, s.filter];
    });
    await seek(page, 1.6);
    const active = await styles();
    assert.ok(Number(active[0]) > 1.04, "the earlier pulse breathes despite a future cue on the same node");
    assert.match(active[3]!, /brightness/u);
    await seek(page, 5.2);
    assert.notEqual((await styles())[0], "1.02", "the later pop also acts");
    await seek(page, 7);
    assert.deepEqual(await styles(), ["1.02", "2deg", "3px", "contrast(0.8)"]);
    await seek(page, 1.6);
    assert.deepEqual(await styles(), active, "the active frame is independent of prior seeks");
    await seek(page, 0);
    assert.deepEqual(await styles(), ["1.02", "2deg", "3px", "contrast(0.8)"]);
  });
});
