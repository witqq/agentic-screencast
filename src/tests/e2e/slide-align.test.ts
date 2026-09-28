// Место содержимого слайда по высоте. В вертикали содержимое классических видов стояло сразу под
// шапкой, и между ним и субтитрами оставалась треть кадра пустоты (пересъёмка #217). Теперь по
// умолчанию оно посередине между шапкой и чертой, а поле align ставит его сверху, снизу или
// раскладывает на всю высоту.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { buildSlide } from "../../provider/slides/page.js";
import { slideOf } from "../../provider/slides/from-scene.js";
import { safeOf } from "../../format.js";

test("align places a vertical slide's content at the top, in the middle, at the bottom or across the height", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-align-"));
  const film = { frame: { width: 1080, height: 1920 }, safe: safeOf("vertical", undefined, "safe", "plain")! };
  const quote = (align?: string): string => buildSlide(slideOf({ id: `q${align ?? "d"}`, kind: "quote", provider: "slides", beats: [{ text: "One." }],
    fields: { title: "What the team said", parts: "lead :: We stopped chasing stale tickets | owner :: The board matches the code", ...(align ? { align } : {}) } } as never), dir, film);
  const browser = await chromium.launch();
  try {
    const page = await (await browser.newContext({ viewport: { width: 1080, height: 1920 } })).newPage();
    const measure = async (file: string): Promise<{ head: number; top: number; bottom: number; rule: number; gaps: number[] }> => {
      await page.goto(pathToFileURL(file).href);
      await page.waitForTimeout(300);
      return page.evaluate(() => {
        const els = [...document.querySelectorAll("body>.el:not(.head)")].map((e) => e.getBoundingClientRect());
        const head = document.querySelector(".head")!.getBoundingClientRect(), rule = document.querySelector(".rule")!.getBoundingClientRect();
        return { head: head.bottom, top: els[0]!.top, bottom: els[els.length - 1]!.bottom, rule: rule.top,
          gaps: els.slice(1).map((r, i) => r.top - els[i]!.bottom) };
      });
    };
    const top = await measure(quote("top")), mid = await measure(quote()), bottom = await measure(quote("bottom")), fill = await measure(quote("fill"));
    assert.ok(top.top - top.head < 80, `top: content right under the head (${(top.top - top.head).toFixed(0)} px)`);
    const above = mid.top - mid.head, below = mid.rule - mid.bottom;
    assert.ok(Math.abs(above - below) < 110 && above > 300, `default: centred between head and rule (${above.toFixed(0)} above, ${below.toFixed(0)} below)`);
    assert.ok(bottom.rule - bottom.bottom < 80, `bottom: content right above the rule (${(bottom.rule - bottom.bottom).toFixed(0)} px)`);
    assert.ok(fill.gaps[0]! > top.gaps[0]! + 100, `fill: the parts spread over the height (gap ${fill.gaps[0]!.toFixed(0)} vs ${top.gaps[0]!.toFixed(0)})`);
  } finally { await browser.close(); }
  assert.throws(() => slideOf({ id: "x", kind: "quote", provider: "slides", beats: [], fields: { title: "T", parts: "a :: b", align: "middle" } } as never), /align: expected top \| center \| bottom \| fill/);
});
