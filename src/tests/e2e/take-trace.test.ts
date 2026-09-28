// Дубль записывает то, что монтажу нужно без ручных замеров: путь курсора, действия с их
// элементами и прямоугольник элемента у отметки, названной с локатором. Прежде в файле отметок
// были только клики точками, и круг у кнопки на видео приходилось ставить по мерке на глаз.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recordTake, type TakeMarks } from "../../capture.js";
import { marksOf } from "../../marks.js";

test("a take records the cursor path, its actions with their elements, and a mark's element", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-trace-"));
  const out = await recordTake({ output: join(dir, "t.webm"), viewport: { width: 800, height: 600 }, trimStart: false,
    prepare: async (p) => { await p.setContent(`<body style="margin:0;font:20px sans-serif">
      <button id="go" style="position:absolute;left:100px;top:80px;width:160px;height:40px">Go</button>
      <input id="q" style="position:absolute;left:400px;top:300px;width:240px;height:36px">
      <div id="total" style="position:absolute;left:520px;top:460px;width:120px;height:60px;background:#dde">42</div></body>`); } },
  async (take) => {
    await take.click(take.page.locator("#go"));
    await take.type(take.page.locator("#q"), "hi");
    await take.mark("total", take.page.locator("#total"));
    take.mark("plain");
  });
  const m = JSON.parse(readFileSync(`${out}.marks.json`, "utf8")) as TakeMarks;
  assert.ok(m.path && m.path.length > 10, "the cursor path is recorded");
  for (let i = 1; i < m.path.length; i++) assert.ok(m.path[i]!.t >= m.path[i - 1]!.t, "path times grow");
  assert.deepEqual(m.actions!.map((a) => a.kind), ["click", "type"]);
  const near = (a: number[], b: number[]): boolean => a.every((v, i) => Math.abs(v - b[i]!) < 0.005);
  assert.ok(near(m.actions![0]!.rect!, [100 / 800, 80 / 600, 160 / 800, 40 / 600]), `click rect ${m.actions![0]!.rect}`);
  assert.ok(near(m.actions![1]!.rect!, [400 / 800, 300 / 600, 240 / 800, 36 / 600]), `type rect ${m.actions![1]!.rect}`);
  assert.ok(m.actions![1]!.end > m.actions![1]!.t, "typing takes time");
  assert.ok(near(m.rects!.total!, [520 / 800, 460 / 600, 120 / 800, 60 / 600]), `mark rect ${m.rects!.total}`);
  assert.ok(m.marks.plain !== undefined && !m.rects!.plain, "a mark without a locator has only its time");
  // Файл отметок старого вида — без пути, действий и прямоугольников — читается как прежде.
  const old = join(dir, "old.webm");
  (await import("node:fs")).writeFileSync(`${old}.marks.json`, JSON.stringify({ version: 1, trimmed: 0, marks: { a: 1 }, clicks: [] }));
  assert.deepEqual(marksOf(old)?.marks, { a: 1 });
});
