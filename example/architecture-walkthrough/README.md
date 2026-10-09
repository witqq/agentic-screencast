# A real-code architecture walkthrough

Four scenes teach one mechanism: content copying, the time/state/DOM call chain, reconstruction after seeking backwards, and actions bound to measured speech. Ownership, pipeline, comparison and diagram/code staging develop concrete content with corresponding code-line emphasis. The dark midnight palette is shared by the material and the film. This is an alternative to a product walkthrough or a result-first investigation, not a fixed recipe for every architecture.

Use Node 24.20 or another version accepted by the coordinated Report build. Build both source checkouts first. From a new film directory:

```sh
node <screencast-root>/example/architecture-walkthrough/prepare.mjs --report <report-root>
node <screencast-root>/dist/agentic-screencast.js build story.md --out draft.mp4
```

The helper does not replace an existing story or installed dependency. Ensure its selected Report compiler contains the composition model, routing and this companion source; an older published 0.20.0 does not. `architecture.html` is also an ordinary built page. `execution.json` contains real function results; `SOURCE-MAP.md` locates the real callers, arguments, results, ownership and clock/resize boundaries.

The packaged story uses the free silent draft voice. For an authorized spoken final, set `voice` to the selected engine/name (for example an already configured SpeechKit voice) and build once with that voice. Credentials belong in the engine's environment, never in the scenario. The actual audio durations bind the Report's bN cues automatically.

For another subject, change the example and code together. A complete UI-first walkthrough, a result-first failure reconstruction and a shared-input/two-output comparison are other arrangements; a fixed right panel is not required. Use a camera, local marks or loupe when a reading shot benefits, and preserve the stable identity of the changing object.
