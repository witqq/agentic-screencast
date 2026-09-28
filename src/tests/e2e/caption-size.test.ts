// Кегль субтитров задаётся шапкой `captions: {"size": 1.25}`: субтитры в кадре крупнее во столько
// же раз, реплика режется на куски покороче, чтобы кусок остался в две строки, а слайды оставляют
// под субтитрами полосу той же высоты.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chunks, subtitleMax } from "../../film.js";
import { gridOf } from "../../provider/slides/page.js";
import { parseCaptions } from "../../source.js";
import { THEMES } from "../../theme.js";

const here = dirname(fileURLToPath(import.meta.url));
const TEXT = "Раньше движок сам решал, что и когда играть, и помнил путь, которым пришёл в текущее состояние, а теперь это делает сервис.";

test("captions.size enlarges subtitles, shortens their pieces and widens the band slides leave free", async () => {
  assert.equal(parseCaptions('{"style":"subtitle","size":1.25}').size, 1.25);
  assert.throws(() => parseCaptions('{"size":3}'), /captions\.size/);
  const frame = { width: 1920, height: 1080 };
  const max = subtitleMax(frame, undefined, THEMES.midnight!, 1.25);
  assert.equal(max, Math.floor(84 / 1.25), "a piece holds 1.25 times fewer characters");
  // Полоса под субтитрами на слайдах вертикали (там она считается от кегля) растёт с ним.
  const safe = { top: 170, bottom: 484, left: 65, right: 180 };
  const film = { frame: { width: 1080, height: 1920 }, safe, captionsOnSlides: true };
  const plain = gridOf(film as never).pad?.b ?? 0, big = gridOf({ ...film, captionsSize: 1.25 } as never).pad?.b ?? 0;
  assert.ok(big > plain, `the band grows (${plain} → ${big})`);

  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const sizes: number[] = [];
    for (const subScale of [undefined, 1.25]) {
      const ctx = await browser.newContext({ viewport: frame });
      await ctx.addInitScript({ content: readFileSync(resolve(here, "..", "..", "browser", "clock.js"), "utf8") });
      await ctx.addInitScript({ content: readFileSync(resolve(here, "..", "..", "browser", "stage.js"), "utf8") });
      const p = await ctx.newPage();
      await p.goto("about:blank");
      const subMax = subScale ? max : 84;
      await p.evaluate((s) => window.__stage.mount(s as never), { duration: 9, beats: 1, theme: THEMES.midnight, starts: [0], spoken: 8,
        captionStyle: "subtitle", captionEverywhere: true, subMax, beatTexts: [TEXT], effects: {}, ...(subScale ? { subScale } : {}) });
      let most = 0;
      for (let t = 0.2; t < 8; t += 0.5) {
        const m = await p.evaluate((tt) => { window.__clock.seek(tt); const e = document.querySelector("#__sub") as HTMLElement;
          const cs = getComputedStyle(e);
          return { size: parseFloat(cs.fontSize), lines: cs.display === "none" ? 0 : Math.round(e.getBoundingClientRect().height / parseFloat(cs.lineHeight)) }; }, t);
        sizes.push(m.size);
        most = Math.max(most, m.lines);
      }
      assert.ok(most <= 2, `at size ${subScale ?? 1} a piece takes at most two lines (${most})`);
      await ctx.close();
    }
    const [one, big2] = [sizes[0]!, sizes[sizes.length - 1]!];
    assert.ok(Math.abs(big2 / one - 1.25) < 0.01, `the subtitle font is 1.25 times larger (${one} → ${big2})`);
  } finally { await browser.close(); }
  assert.ok(chunks(TEXT, max).every((c) => c.length <= max), "the .srt pieces fit the larger size");
});
