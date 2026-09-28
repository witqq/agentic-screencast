// Run with Node.js 20+: node example/live-capture.mjs [captures/demo.webm]
// Replace the local fixture and locators with a real, authorized product page.
import { recordTake } from "agentic-screencast/capture";

const output = process.argv[2] ?? "captures/demo.webm";
await recordTake({ output, viewport: { width: 1280, height: 720 },
  prepare: async (page) => {
    await page.setContent(`<!doctype html><html><body style="font:20px system-ui;margin:72px;background:#f6f9fd">
      <h1>Project workflow</h1>
      <button id="graph" style="padding:14px 28px">Show graph</button>
      <label style="display:block;margin-top:24px">Search <input id="search" style="padding:12px"></label>
      <p id="result">The map is ready.</p>
      <script>document.querySelector('#graph').addEventListener('click', () => {
        document.querySelector('#result').textContent = 'The graph is ready.';
      });</script></body></html>`);
  } }, async (take) => {
  const graph = take.page.getByRole("button", { name: "Show graph" });
  // The camera pushes in on the button while the real click happens under it.
  await take.withFocus(graph, async () => {
    await take.withFocusCard(graph,
      { title: "The view changes here", body: "Now the exact route is visible.", reveal: "type", motion: "glide" },
      async () => take.click(graph, { until: take.page.getByText("The graph is ready.") }));
  }, { scale: 1.6, hold: 0.8 });
  // A named moment: the scenario can freeze or focus at @graph without guessing seconds.
  take.mark("graph");
  await take.type(take.page.getByLabel("Search"), "review");
  await take.press(take.page.getByLabel("Search"), "Enter");
  take.mark("searched");
  await take.card({ title: "Follow the actual action",
    body: "The cursor and click are recorded with the changing page.",
    reveal: "type", motion: "pop" });
});
console.log(output);
