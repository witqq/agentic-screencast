---
name: agentic-screencast
description: Make an explanatory or attention-holding MP4 about a product, branch result, prototype, idea, or finding from real footage, saved pages, living chapters and a declarative scenario; use when an agent must ask what the film should be, plan, capture, build, and verify a video.
---

# Agentic Screencast

Make the viewer understand a claim, not merely see a sequence of screens. The film takes its subject from evidence, has a beginning, a middle and an end, and holds attention from the first second to the last. A product demo may need live UI; an idea or prototype may be better served by a saved page, chapter, diagram, or supplied clip. Do not imply a mockup is a real run.

Read [the film-craft knowledge base](../../docs/film-craft.md) before writing a scenario: it collects these rules together with the mistakes that produced them.

## Ask first, then build

The look, the length and the voice of a film are the owner's decisions, not defaults to pick quietly. Before the first take, ask for everything the request and the repository do not already answer, and offer the options:

- **theme** — `midnight`, `calm-paper`, `synthwave`, `noir`, or their own variables (`agentic-screencast help themes`);
- **length** — a tight trailer of about a minute, or a full walkthrough of several;
- **narration** — silent, synthesized (which engine and voice), or read by a person (`help voice`);
- **language and pace** — they set reading time and pronunciation rules;
- **depth** — an overview of the result, or a shot per capability including control surfaces and behaviour under load.

Ask as one structured question with choices, not as free-form prose, and record the answers next to the scenario. A film built on assumed answers gets re-shot, not corrected.

## Subject and story

- Take the subject from the source: the commits of the branch, the ticket, the diff, the running product. Never invent a "before" state; if the film claims something used to be different, that must be visible in the history.
- Structure: what was missing → what appeared → what it can do → how much it holds under load → how it is controlled → where to get it. Each part ends by returning to the overview.
- Write the narration as ONE continuous text in whole sentences, then cut it into shots. Each sentence picks up the previous one; telegraphic labels are not narration.
- One text layer at a time: a bottom caption during motion, a card only on a held frame — never both at once, and never more than two lines on screen.
- Cover the inventory. List the capabilities from the code first, then give every line either a shot number or a written reason for its absence: control panels, per-item playback, error reports and load behaviour included.

## Nothing in frame stands still

A static slide, diagram or card turns the film back into a dull presentation. Slides carry an ambient layer of their own — breathing glow, drifting grid, travelling sheen — elements keep a faint float after they appear, and cards breathe while held. All of it is a pure function of scene time, so frames stay reproducible. If the product's own animation is small, make it bigger before shooting: a gesture that does not read on screen is not evidence.

## What the tool gives you

- **Scenes** come from providers: `slides.*` (`chapter`, `compare`, `chain`, `number`, `quote`), `page` (a saved or self-contained HTML page), `video` (a finished clip). A project can add its own provider as a command (`provider-check`).
- **Live capture**: `recordTake` / `capturePage` drive a real browser — `take.click/hover/type/press/drag/range` on Playwright locators, `{ until: locator }` for asynchronous results, `withFocusCard(locator, card, action)` for an explanation beside the real action (`help capture`).
- **Camera and annotation** for page and video scenes: `overlay.camera` (`area` or CSS `target`, `scale`, `move/hold/return`) with a dimming highlight, `overlay.cards` (`position`, `reveal`, `motion`, `enter/exit/hold`), decorative `overlay.pointer`, and `freezeAt` to hold a genuine frame (`help overlay`).
- **Retiming**: `speed: [{"from":…,"to":…,"rate":…}]` slows or speeds a stretch of a clip; the scene grows by exactly what that stretch gains.
- **Themes**: one named look for slides, captions and cards at once (`help themes`).
- **Narration modes**: `stub` silence, `speechkit`, `say`, `piper`, `recorded` human takes, or an external engine; `agentic-screencast record` opens the reading interface (`help voice`).
- **Checks**: `scenes`, `order`, `script`, `schema`, `check` (frame criterion; a finished clip is reported as outside its scope), `verify`, `voices`, `paths`.

## Capture and assemble

Read `agentic-screencast help video`, `help capture`, `help overlay`, `help themes`, `help voice`; use [the runnable capture example](../../example/live-capture.mjs), [the multi-scene scenario](../../example/kinetic-video.md), or [the saved-page idea example](../../example/idea-video.md). The scenario file is the single authored assembly source.

- Authenticate before recording and never record passwords or private data.
- Zoom and pan inside the product itself where possible, so the frame shows a live editor rather than a cropped recording.
- Keep debug and tooling windows off the subject: move them to the edge of the frame before the take.
- `overlay.pointer` is a graphic on existing footage; it does not click anything. For real actions use live capture.
- Draft with the free `stub` voice unless narration was requested.

## Review before handoff

Build one changed scene with `--only`, then the whole film, and verify by measurement rather than impression: duration and frame size; motion present in every shot (two frames 0.4 s apart differ); the caption changes inside a shot; every card appears and leaves; nothing overlaps in key frames; claimed numbers match the recording; no secret leaks. Watch the result at normal speed as well. Fix what you find, rebuild the affected scenes, then show the owner the file itself — a scenario is not the deliverable. Publish or send only to an authorized destination.
