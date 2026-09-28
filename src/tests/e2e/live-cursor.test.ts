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

test("a long cursor trip and visible typing leave time to follow each action", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-cursor-pace-"));
  let typedMs = 0;
  const out = await recordTake({ output: join(dir, "paced.webm"), viewport: { width: 1200, height: 700 }, trimStart: false,
    prepare: async (p) => { await p.setContent(`<body style="margin:0;font:20px sans-serif">
      <button id="far" style="position:absolute;left:1010px;top:550px;width:140px;height:48px">Far target</button>
      <input id="q" style="position:absolute;left:110px;top:100px;width:300px;height:44px">
      <script>window.typedAt=[];q.addEventListener('input',()=>window.typedAt.push(performance.now()))</script></body>`); } },
  async (take) => {
    await take.hover(take.page.locator("#far"));
    await take.type(take.page.locator("#q"), "A readable thirty character phrase");
    typedMs = await take.page.evaluate(() => {
      const times = (window as unknown as { typedAt: number[] }).typedAt;
      return times.at(-1)! - times[1]!; // the first input event clears the field
    });
  });
  const marks = JSON.parse(readFileSync(`${out}.marks.json`, "utf8")) as TakeMarks;
  const hover = marks.actions!.find((a) => a.kind === "hover")!;
  const travel = marks.path!.filter((p) => p.t >= hover.t - 1e-6 && p.t <= hover.end + 1e-6);
  assert.ok(travel.length >= 35, `a long trip needs intermediate cursor positions, got ${travel.length}`);
  assert.ok(travel.at(-1)!.t - travel[0]!.t >= 0.9, "the long move is visible for at least 0.9 seconds");
  assert.ok(typedMs >= 1800, `letters must appear at a readable pace, got ${Math.round(typedMs)} ms`);
});

test("a drag records the cursor movement that the camera must follow", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-drag-cursor-"));
  const out = await recordTake({ output: join(dir, "drag.webm"), viewport: { width: 800, height: 450 }, trimStart: false,
    prepare: async (p) => { await p.setContent(`<body style="margin:0">
      <div id="from" draggable="true" style="position:absolute;left:70px;top:140px;width:70px;height:45px;background:#b44"></div>
      <div id="to" style="position:absolute;left:620px;top:230px;width:90px;height:60px;background:#46a"></div>
      </body>`); } },
  async (take) => { await take.drag(take.page.locator("#from"), take.page.locator("#to")); });
  const marks = JSON.parse(readFileSync(`${out}.marks.json`, "utf8")) as TakeMarks;
  const drag = marks.actions!.find((a) => a.kind === "drag")!;
  const path = marks.path!.filter((p) => p.t >= drag.t - 1e-6 && p.t <= drag.end + 1e-6);
  assert.ok(path.length >= 3, "the take records intermediate real pointer positions");
  assert.ok(path.at(-1)!.x > 0.75, `camera path must reach the drop target, got x=${path.at(-1)!.x}`);
});
