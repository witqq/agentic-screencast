import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Page } from "playwright";
import { capturePage, type TakeMarks } from "../../capture.js";

test("take metadata keeps pointer events and recording time across navigation and repeated captures", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-capture-navigation-"));
  const browser = await chromium.launch();
  try {
    const first = join(dir, "first.html"), second = join(dir, "second.html");
    writeFileSync(first, `<body style="margin:0;background:#123456"><a id="next" href="second.html"
      style="visibility:hidden;position:absolute;left:40px;top:40px;width:120px;height:60px;background:white">Next document</a>
      <script>setTimeout(() => document.querySelector('#next').style.visibility = 'visible', 1500)</script></body>`);
    writeFileSync(second, `<body style="margin:0;background:#654321"><button id="second"
      style="position:absolute;left:420px;top:220px;width:120px;height:60px">Second document</button></body>`);
    const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
    // Model a remote browser whose wall clock differs from the recording process.
    await page.addInitScript(() => {
      Object.defineProperty(performance, "timeOrigin", { value: performance.timeOrigin + 3_600_000 });
    });
    for (const trimStart of [false, true]) {
      await page.goto(pathToFileURL(first).href);
      const output = join(dir, `navigation-${trimStart}.webm`);
      const take = await capturePage(page, { output, trimStart });
      await take.mark("first");
      await take.click(page.locator("#next"));
      assert.equal(page.url(), pathToFileURL(second).href);
      await take.mark("second");
      await take.click(page.locator("#second"));
      await take.mark("done");
      await take.finish();
      const marks = JSON.parse(readFileSync(`${output}.marks.json`, "utf8")) as TakeMarks;
      assert.ok(trimStart ? marks.trimmed > 0.3 : marks.trimmed === 0, "blank-start trimming is exercised");
      assert.equal(marks.clicks.length, 2, "both documents contribute their actual pointerdown");
      for (const [i, name, end, x, y] of [[0, "first", "second", 100, 70], [1, "second", "done", 480, 250]] as const) {
        const click = marks.clicks[i]!;
        assert.ok(click.t >= marks.marks[name]! - 0.01 && click.t <= marks.marks[end]! + 0.01,
          `document ${i}: click ${click.t}s is on the recording clock between its marks`);
        assert.ok(Math.abs(click.x - x / 640) < 0.002 && Math.abs(click.y - y / 360) < 0.002);
        assert.ok(marks.path!.some(p => Math.abs(p.x - x / 640) < 0.002 && Math.abs(p.y - y / 360) < 0.002
          && p.t >= marks.marks[name]! - 0.01 && p.t <= click.t + 0.01), "the filmed cursor path survives that document");
      }
      assert.ok(marks.clicks[1]!.t > marks.clicks[0]!.t + 0.5, "navigation does not reset the click clock");
      assert.ok(marks.path!.every((p, i, path) => p.t >= 0 && (!i || p.t > path[i - 1]!.t)), "path timestamps stay strictly ordered");
      // The caller keeps this page. A later take must detach the old collector and start fresh.
      const againOutput = join(dir, `again-${trimStart}.webm`);
      const again = await capturePage(page, { output: againOutput, trimStart: false });
      await again.mark("start");
      await again.click(page.locator("#second"));
      await again.mark("end");
      await again.finish();
      const fresh = JSON.parse(readFileSync(`${againOutput}.marks.json`, "utf8")) as TakeMarks;
      assert.equal(fresh.clicks.length, 1, "a fresh take does not inherit the previous document's history");
      assert.ok(fresh.clicks[0]!.t >= fresh.marks.start! && fresh.clicks[0]!.t <= fresh.marks.end!);
      assert.equal(await page.locator("#second").count(), 1, "finish leaves the caller's page usable");
    }
  } finally {
    await browser.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("capture setup and finish failures release collectors without stopping a caller's recording", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-capture-cleanup-"));
  const browser = await chromium.launch();
  try {
    const html = join(dir, "page.html");
    writeFileSync(html, '<body><button id="go">Ready</button></body>');
    const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
    await page.goto(pathToFileURL(html).href);
    const originalStart = page.screencast.start.bind(page.screencast);
    const originalStop = page.screencast.stop.bind(page.screencast);
    const originalEvaluate = page.evaluate.bind(page) as (...args: unknown[]) => Promise<unknown>;
    const errorListeners = (): number => (page as unknown as { listenerCount(name: string): number }).listenerCount("pageerror");
    const listeners = errorListeners();
    const clean = async (): Promise<void> => {
      const state = await page.evaluate(() => {
        const host = window as unknown as Record<string, unknown>;
        return { collector: Boolean((host.__agenticScreencastCapture_v1 as { takeTrace?: unknown } | undefined)?.takeTrace),
          bindings: Object.keys(host).filter(name => name.startsWith("__agenticScreencastTakeTrace_")) };
      });
      assert.deepEqual(state, { collector: false, bindings: [] });
      assert.equal(errorListeners(), listeners);
      await page.goto(pathToFileURL(html).href);
      assert.equal(await page.evaluate(() => Boolean((window as unknown as Record<string, unknown>).__agenticScreencastCapture_v1)), false,
        "disposed init scripts do not reinstall the collector on navigation");
    };

    // Rejecting start while another recorder exists must release only the new take's resources.
    await originalStart({ path: join(dir, "caller.webm"), size: { width: 320, height: 180 } });
    const startFailure = new Error("controlled start rejection");
    let stopCalls = 0;
    page.screencast.start = async () => { throw startFailure; };
    page.screencast.stop = async () => { stopCalls++; await originalStop(); };
    await assert.rejects(capturePage(page, { output: join(dir, "start.webm") }), error => error === startFailure);
    assert.equal(stopCalls, 0, "a failed start does not own the caller's recorder");
    await clean();
    await originalStop();
    page.screencast.start = originalStart;
    page.screencast.stop = originalStop;

    // Once start succeeds, even a failed browser clock sample must stop the owned recorder.
    const clockFailure = new Error("controlled clock rejection");
    page.evaluate = ((...args: unknown[]) => String(args[0]).includes("performance.timeOrigin + performance.now")
      ? Promise.reject(clockFailure) : originalEvaluate(...args)) as Page["evaluate"];
    await assert.rejects(capturePage(page, { output: join(dir, "clock.webm") }), error => error === clockFailure);
    page.evaluate = originalEvaluate as Page["evaluate"];
    await clean();

    const marked = await capturePage(page, { output: join(dir, "mark.webm"), trimStart: false });
    page.setDefaultTimeout(100);
    const markFailure = await marked.mark("missing", page.locator("#missing")).catch(error => error);
    assert.ok(markFailure instanceof Error);
    await assert.rejects(marked.finish(), error => error === markFailure);
    await clean();

    const stopped = await capturePage(page, { output: join(dir, "stop.webm"), trimStart: false });
    const stopFailure = new Error("controlled stop rejection");
    page.screencast.stop = async () => { await originalStop(); throw stopFailure; };
    await assert.rejects(stopped.finish(), error => error === stopFailure);
    page.screencast.stop = originalStop;
    await clean();
    const reusable = await capturePage(page, { output: join(dir, "reused.webm"), trimStart: false });
    await reusable.click(page.locator("#go"));
    await reusable.finish();
    await clean();
  } finally {
    await browser.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
