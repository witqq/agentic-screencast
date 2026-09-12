---
contractVersion: 1
title: Agentic Screencast — video presentations built by agents
description: Give an AI agent a product and a goal. It writes a scenario, builds a video with the CLI and checks the MP4. Use directly or through Moira.
language: en
localizations:
  ru: report.ru.md
theme: system
layout: landing
preset: studio
scrollProgress: true
tokens:
  accent: teal
  width: wide
  radius: round
---

# Video presentations, built by agents

**Give your agent the product, the audience and the point to explain. Get a video people can watch.**

Agentic Screencast is the agent's video-building CLI. The agent researches the product, writes a scenario and checks the result. The tool turns that scenario into slides, narration and an MP4. Use it for product explainers, feature walkthroughs and narrated presentations.

One text source. JSON schemas and build reports. Scene-by-scene iteration without operating a video editor.

::::actions{placement="edge"}
::action[Give it to your agent]{href="#start" kind="primary" effect="magnetic"}
::action[Use the Moira workflow]{href="#moira" kind="secondary"}
::action[Read the boundaries]{href="#boundaries" kind="quiet"}
::::

::::cards
:::card{title="One authored source"}
Slides and build data are generated from the scenario and replaced on the next run.
:::
:::card{title="Audio owns duration"}
Each paragraph is a measured beat. Visual anchors move with a new voice or speaking rate.
:::
:::card{title="Frames are reproducible"}
The renderer injects its own clock and tests repeatability, animation, frozen time, and seeking.
:::
::::

::::::section{title="How the agent's scenario becomes a video" id="pipeline" nav="Build" composition="split" surface="grid" transition="reveal" scene="progress"}
:::lead
The agent writes the scene content and speech in one file. The CLI measures the audio and makes the picture follow it. Unchanged scenes reuse the cache; changing a beat rebuilds the affected sound and frames.
:::

::::timeline{title="A scene build" description="Each stage leaves a result the next stage can verify."}
:::event{date="Parse" title="Read the scenario" kind="neutral"}
Reject unknown scene kinds, fields, required values, and timing anchors before rendering.
:::
:::event{date="Speak" title="Measure each beat" kind="accent"}
Generate silence, synthesize speech, or use a human recording normalized to 48 kHz mono WAV.
:::
:::event{date="Render" title="Seek the declared page" kind="success"}
Chromium receives an explicit clock. Saved application pages can render with network access blocked.
:::
:::event{date="Join" title="Produce the video" kind="warning"}
Encode scene segments with a fixed frame contract and join them with the measured audio.
:::
::::
::::::

::::::section{title="Use the material you already have" id="material" nav="Material" composition="mosaic" surface="mesh" transition="stagger"}

::::cards
:::card{title="Built-in slides"}
Comparison, chain, number, and quote scenes cover compact product explanations.
:::
:::card{title="Saved pages"}
Capture a client-rendered application as MHTML, then zoom and focus the exact element named by the scenario.
:::
:::card{title="Existing video"}
Place a clip in the timeline; the build fits it to the frame and speech duration.
:::
:::card{title="External providers"}
Add scene kinds in any language through a JSON subprocess contract and verify the provider with the shipped checker.
:::
::::

:::decision{title="The core does not own scene kinds"}
A material provider declares its fields, required values, effects, and frame-quality thresholds. The parser, schema, generator, and checker consume that one contract.
:::
::::::

::::::section{title="Record a human voice without changing the build" id="voice" nav="Voice" composition="stage" surface="glow" tone="accent"}
:::lead
The recording page runs on loopback because browsers allow microphone access there. Each take is addressed by beat text and stored outside the repository.
:::

```sh
agentic-screencast record --source story.md
agentic-screencast build --source story.md --out product-tour.mp4 --voice-json '{"engine":"recorded"}'
```

::::cards
:::card{title="Cost-free iteration"}
The `stub` engine creates deterministic silence and makes no network request.
:::
:::card{title="Recorded narration"}
Replacing one WAV changes its content fingerprint and invalidates the affected cache.
:::
:::card{title="External speech"}
Voice engines receive text and voice data through a documented subprocess contract; keys stay in the environment.
:::
::::
::::::

::::::section{title="Check what a successful build cannot judge" id="verification" nav="Verification" composition="stack" surface="grid"}

| Check | Observation |
|---|---|
| `check` | Declared content is present, contained, readable, and above provider-owned thresholds. |
| `order` | Elements appear in the scenario order at their beat or time anchors. |
| `verify` | Repeated frames match, animation changes frames, frozen time stays frozen, and seeks reproduce the stream. |
| `voice-check` | A voice program returns valid JSON, failure codes, stable fingerprints, and 48 kHz mono WAV. |
| `provider-check` | A material program declares valid kinds and produces a real page or an explicit failure. |

:::callout{kind="info" title="Build and acceptance are separate"}
`build` returns the requested video. Run the visual and ordering checks when the project needs those acceptance guarantees.
They use estimated beat timing. Inspect the actual MP4 to verify synchronization with the final narration; video clips need direct inspection.
:::
::::::

::::::section{title="Let Moira guide the agent through the whole task" id="moira" nav="Moira" composition="split" surface="grid" transition="reveal"}
:::lead
The public Agentic Screencast Video workflow covers facts, scenario, materials, a free draft, narration and review. Findings return to the step that can fix them.
:::

Moira supplies instructions and tracks progress. Your agent runs the CLI locally and inspects the MP4. Self-review is explicit; independent review requires an available, authorized reviewer. Paid speech and external delivery each need permission.

::::actions{placement="inline"}
::action[Open the integration guide]{href="https://github.com/witqq/agentic-screencast/blob/main/docs/moira.md" kind="primary"}
::action[View the workflow definition]{href="https://github.com/witqq/agentic-screencast/blob/main/workflows/production/flows/agentic-screencast-video.json" kind="secondary"}
::::

In the connected Moira catalogue, ask the agent to find `admin/agentic-screencast-video`. A Moira account and an agent with local command/file access are required. The CLI also works without Moira.
::::::

::::::section{title="Your agent's first video" id="start" nav="Start" composition="stage" surface="mesh" tone="contrast" align="center"}

Ask the agent to explain a product to a named audience, in a chosen language and approximate duration. Start with a free silent draft. Copy the linked complete example into a separate video workspace as `story.md` before running these commands.

```sh
npm install --save-exact agentic-screencast@1.0.1
npx --no-install playwright install chromium

npx --no-install agentic-screencast build \
  --source story.md \
  --voice-json '{"engine":"stub","name":"silent","cps":15}' \
  --out draft.mp4
```

::::actions{placement="bottom"}
::action[Get the complete example]{href="https://github.com/witqq/agentic-screencast/blob/main/example/agent-video.md" kind="secondary"}
::action[Read the guide]{href="https://github.com/witqq/agentic-screencast#readme" kind="primary" effect="magnetic"}
::action[View the source]{href="https://github.com/witqq/agentic-screencast" kind="secondary"}
::::

The stub produces silence. `--keys-only` skips the MP4, but can still synthesize missing audio. Use the explicit stub voice for free checks. See the guide for supported paths and inspection limits in CLI 1.0.1.
::::::

::::::section{title="An explicit local trust boundary" id="boundaries" nav="Boundaries" composition="stack" surface="grain"}

Included: scenario parsing, built-in and external material providers, built-in and external voice engines, recorded narration, deterministic Chromium rendering, ffmpeg assembly, caching, and executable contract checks.

Outside the promise: live screen recording, choosing a voice for the author, judging whether a script is persuasive, protecting against an intentionally untrusted provider or voice command, and publishing a video on the author's behalf.

:::disclosure{title="Where credentials belong" open="false"}
Voice and capture credentials come from environment variables or an ignored `.env`. Never put them in scenario voice data: that data participates in cache identity and build reports.
:::

Agentic Screencast is licensed under GPL-3.0-or-later because its runtime dependency includes GPL ffmpeg. The repository also records the exact dependency graph and third-party notices.
::::::
