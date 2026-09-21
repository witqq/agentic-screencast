---
name: agentic-screencast
description: Make an explanatory MP4 about a product, prototype, idea, or finding from real footage, saved pages, cinematic chapters and a declarative scenario; use when an agent must plan, capture, build, and verify a video.
---

# Agentic Screencast

Make the viewer understand a claim, not merely see a sequence of screens. Inspect the subject and available evidence, choose an audience and one central question, then write a short story before building. A product demo may need live UI; an idea or prototype may be better served by a saved page, chapter, diagram, or supplied clip. Do not imply a mockup is a real run. Ask only for an essential unavailable source, access, or consequential decision.

## Story before effects

- Open with a complete sentence explaining what the film is about and what the viewer will learn. For several ideas, use a short animated `slides.chapter` between sections; do not replace a story with a stack of static feature cards.
- For each screen action, name **what the agent does, what visibly changes, and why that matters**. If a viewer new to the subject cannot answer those three questions, rewrite or remove the shot. Make claims only from observed UI/data. Label an illustrative prototype or untested claim in the frame, not only in accompanying notes.
- Write natural, short sentences, not labels or telegraphic fragments. Keep one idea per card and place it near the relevant control or result. Let the tool compute reading time and leave a pause after a change before cutting away.
- Use an overview → deliberate focus → return to overview rhythm for dense material. A camera move attracts attention, but accompanying text must explain the event. Check that the card does not hide evidence.

## Capture and assemble

Read `agentic-screencast help video`, `help capture`, and `help overlay`; use [the runnable capture example](../../example/live-capture.mjs), [the multi-scene scenario](../../example/kinetic-video.md), or [the saved-page idea example](../../example/idea-video.md). The scenario file is the single authored assembly source.

- For real browser actions, authenticate before recording and use `recordTake` or `capturePage`. Give the tool locator actions (`click`, `type`, `range`, etc.) and `{ until: locator }` for asynchronous results. `withFocusCard(locator, card, action)` positions an explanation near the action without guessed frame coordinates. Never record passwords or private data.
- For a silent orientation or section break, use `slides.chapter` with `title`, one-sentence `body`, and readable `duration`. A self-contained HTML prototype is a `page` scene (`page: pages/prototype.html`); it too can be silent when given `duration`. For a tutorial stop-frame, a `video` scene can set `freezeAt` and `overlay.camera` to move into a genuine frame, highlight an `area`, hold, and return. On saved `page` material, camera cues may use a CSS `target`. Typed cards use `reveal: "type"`; `motion`, `enter`, and `exit` change their presentation.
- `overlay.pointer` is a decorative graphic on existing footage; it does not click the UI. Do not reconstruct a live click or claim synchronization from manually timed pointer points. Use a free silent `stub` voice for the first draft unless narration is requested or available.

## Review before handoff

Build one changed scene with `--only` and inspect its focus/card placement, then build the full MP4. Decode it fully and watch at normal speed; sample the opening, each action/result, camera return and transition. Check whether a new viewer understands the action, all text finishes revealing and remains readable, genuine events match the pointer, facts are supported, and no secret leaks. Fix observed problems and rebuild changed scenes. Report the output path and checks; publish or send only to an authorized destination.
