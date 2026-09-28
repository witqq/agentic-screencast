// Прогон признаков дефектов на собранной странице: node scripts/site-measure.mjs <index.html> [en|ru]
// Печатает результат для 1440 и 390 точек; код выхода 1 — есть красные признаки.
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { signals, shippedThemes } from "./site-signals.mjs";

export async function measure(page, { mobile }) {
  // Длительность ролика известна, когда браузер прочёл его заголовок: ролики
  // стоят ниже первого экрана и грузятся, когда до них докручивают.
  for (const v of await page.locator("video").all()) {
    await v.scrollIntoViewIfNeeded();
    await v.evaluate((el) => new Promise((done) => {
      if (Number.isFinite(el.duration) && el.duration > 0) return done();
      el.preload = "metadata";
      el.addEventListener("loadedmetadata", () => done(), { once: true });
      el.load?.();
      setTimeout(done, 4000);
    }));
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  return page.evaluate(signals, { themes: await shippedThemes(), mobile });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = resolve(process.argv[2] ?? "site/index.html");
  const lang = process.argv[3];
  const browser = await chromium.launch();
  let red = 0;
  try {
    for (const [w, h, mobile] of [[1440, 1000, false], [390, 844, true]]) {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(pathToFileURL(file).href, { waitUntil: "load" });
      if (lang) await page.locator("[data-language-select]").selectOption(lang).catch(() => {});
      for (const s of await measure(page, { mobile })) {
        if (!s.ok) red++;
        console.log(`${w}\t${s.ok ? "green" : "RED  "}\t${s.id}\t${s.detail}`);
      }
      await page.close();
    }
  } finally { await browser.close(); }
  process.exit(red ? 1 : 0);
}
