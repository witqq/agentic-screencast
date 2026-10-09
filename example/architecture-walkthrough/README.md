# A real-code architecture walkthrough

Four scenes teach one mechanism: content copying, the time/state/DOM call chain, reconstruction after seeking backwards, and actions bound to measured speech. Ownership, pipeline, comparison and diagram/code staging develop concrete content with corresponding code-line emphasis. The dark midnight palette is shared by the material and the film. This is an alternative to a product walkthrough or a result-first investigation, not a fixed recipe for every architecture.

Use Node 24.18 or newer and Screencast's installed package or built checkout. From a new film directory:

```sh
npm install --save-dev agentic-report@0.21.0
node <screencast-root>/example/architecture-walkthrough/prepare.mjs --report ./node_modules/agentic-report
node <screencast-root>/dist/agentic-screencast.js build story.md --out draft.mp4
```

The helper does not replace an existing story or installed dependency. Report 0.21.0 or newer supplies the composition model, routing and companion source. `architecture.html` is also an ordinary built page. `execution.json` contains real function results; `SOURCE-MAP.md` locates the real callers, arguments, results, ownership and clock/resize boundaries.

The packaged story uses the free silent draft voice. For an authorized spoken final, set `voice` to the selected engine/name (for example an already configured SpeechKit voice) and build once with that voice. Credentials belong in the engine's environment, never in the scenario. The actual audio durations bind the Report's bN cues automatically.

For another subject, change the example and code together. A complete UI-first walkthrough, a result-first failure reconstruction and a shared-input/two-output comparison are other arrangements; a fixed right panel is not required. Use a camera, local marks or loupe when a reading shot benefits, and preserve the stable identity of the changing object.
