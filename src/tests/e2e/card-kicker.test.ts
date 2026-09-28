// Длинный надзаголовок трейлерной карты или титула уходил за оба края кадра, и отчёт молчал:
// разреженные заглавные шли одной строкой шире кадра. Теперь строка ужимается до ширины кадра,
// а совсем длинная — переносится.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { buildSlide } from "../../provider/slides/page.js";
import { slideOf } from "../../provider/slides/from-scene.js";

test("a long kicker of a title card and a trailer card stays inside the frame", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-kicker-"));
  const film = { frame: { width: 1920, height: 1080 } };
  const long = "В кинотеатрах всей страны этой осенью и никогда больше";
  const files = [
    buildSlide(slideOf({ id: "t", kind: "titlecard", provider: "slides", beats: [], fields: { title: "Последний / паштет", kicker: long, body: long, duration: "4" } } as never), dir, film),
    buildSlide(slideOf({ id: "c", kind: "card", provider: "slides", beats: [], fields: { title: "Ноль пощады", kicker: long, duration: "3" } } as never), dir, film),
  ];
  const browser = await chromium.launch();
  try {
    const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
    for (const f of files) {
      await page.goto(pathToFileURL(f).href);
      await page.waitForTimeout(400);
      const boxes = await page.evaluate(() => [...document.querySelectorAll(".card-kicker,.tc-kicker,.tc-date")].map((e) => {
        const r = e.getBoundingClientRect(), range = document.createRange();
        range.selectNodeContents(e);
        const t = range.getBoundingClientRect();
        return { l: Math.min(r.left, t.left), r: Math.max(r.right, t.right) };
      }));
      assert.ok(boxes.length > 0);
      // Сцена к концу наезжает на 7 %: строка обязана стоять в 90 % ширины, чтобы и тогда не уйти за край.
      for (const b of boxes) assert.ok(b.r - b.l <= 1920 * 0.9 + 1 && b.l >= 1920 * 0.05 - 1, `${f}: the line ${b.l.toFixed(0)}–${b.r.toFixed(0)} keeps within 90% of the 1920 frame`);
    }
  } finally { await browser.close(); }
});
