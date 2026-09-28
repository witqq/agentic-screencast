// Живой курсор дубля: форма по CSS-курсору элемента под ним (рука над кнопкой, текстовый курсор
// над полем), путь дугой, а не по линейке, и отклик клика по выбору дубля. Прежде курсор всегда
// был стрелкой и ехал прямой линией — так мышь не ведёт ни один человек.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recordTake, type TakeMarks } from "../../capture.js";

test("the take's cursor takes the element's shape, travels on a curve, and shows the chosen click", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-cursor-"));
  const seen: Record<string, string | null> = {};
  const out = await recordTake({ output: join(dir, "c.webm"), viewport: { width: 900, height: 600 }, trimStart: false, click: "echo",
    prepare: async (p) => { await p.setContent(`<body style="margin:0;font:18px sans-serif">
      <button id="b" style="position:absolute;left:600px;top:420px;width:140px;height:44px;cursor:pointer">Save</button>
      <input id="q" style="position:absolute;left:120px;top:120px;width:260px;height:34px"></body>`); } },
  async (take) => {
    const hostAttr = (name: string): Promise<string | null> => take.page.evaluate((n) =>
      document.querySelector("[data-agentic-screencast-capture]")?.getAttribute(n) ?? null, name);
    await take.hover(take.page.locator("#b"));
    seen.button = await hostAttr("data-cursor");
    await take.click(take.page.locator("#q"));
    seen.field = await hostAttr("data-cursor");
    seen.click = await hostAttr("data-click");
  });
  assert.equal(seen.button, "hand", "over a button with cursor:pointer the cursor is a hand");
  assert.equal(seen.field, "text", "over a text field it is a text cursor");
  assert.equal(seen.click, "echo", "the click shows the effect the take chose");
  // Путь от кнопки к полю — дуга: середина отстоит от прямой между концами.
  const m = JSON.parse(readFileSync(`${out}.marks.json`, "utf8")) as TakeMarks;
  const click = m.actions!.find((a) => a.kind === "click")!;
  const leg = m.path!.filter((p) => p.t >= click.t - 1e-6 && p.t <= click.end + 1e-6);
  const a = leg[0]!, b = leg[leg.length - 1]!, mid = leg[Math.floor(leg.length / 2)]!;
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const off = Math.abs((b.x - a.x) * (a.y - mid.y) - (a.x - mid.x) * (b.y - a.y)) / len;
  assert.ok(off > 0.01, `the cursor bows away from the straight line (${off.toFixed(3)} of the frame)`);
  await assert.rejects(recordTake({ output: join(dir, "x.webm"), click: "boom" as never }, async () => {}), /click: expected ripple \| spot \| echo/);
});
