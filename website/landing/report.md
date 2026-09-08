---
contractVersion: 1
title: Agentic Screencast — reproducible narrated video from one scenario
description: Build deterministic product videos from declarative scenes, measured speech, and web pages.
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

# The video follows the voice. Every time.

**Write one scenario. Get measured speech, deterministic Chromium frames, reusable scene caches, and a finished MP4.**

Agentic Screencast renders declared web scenes at explicit moments in time. It never records a live desktop. Change one beat of narration and the affected timing, audio, and frames rebuild from the same source.

::::actions{placement="edge"}
::action[Build with the free stub]{href="#start" kind="primary" effect="magnetic"}
::action[See the pipeline]{href="#pipeline" kind="secondary"}
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

::::::section{title="From prose to MP4 through one observable pipeline" id="pipeline" nav="Pipeline" composition="split" surface="grid" transition="reveal" scene="progress"}
:::lead
The cache key records the inputs that can change a scene: text, voice data and fingerprint, page bytes, frame and encoding settings, neighboring transitions, product source, ffmpeg, and Chromium.
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
agentic-screencast build --source story.md --out product-tour.mp4
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
:::
::::::

::::::section{title="Start without a paid voice" id="start" nav="Start" composition="stage" surface="mesh" tone="contrast" align="center"}

```sh
npm install --global agentic-screencast
npx playwright install chromium

agentic-screencast build \
  --source story.md \
  --voice-json '{"engine":"stub","name":"silent","cps":15}' \
  --keys-only
```

::::actions{placement="bottom"}
::action[Read the guide]{href="https://github.com/witqq/agentic-screencast#readme" kind="primary" effect="magnetic"}
::action[View the source]{href="https://github.com/witqq/agentic-screencast" kind="secondary"}
::::
::::::

::::::section{title="An explicit local trust boundary" id="boundaries" nav="Boundaries" composition="stack" surface="grain"}

Included: scenario parsing, built-in and external material providers, built-in and external voice engines, recorded narration, deterministic Chromium rendering, ffmpeg assembly, caching, and executable contract checks.

Outside the promise: live screen recording, choosing a voice for the author, judging whether a script is persuasive, protecting against an intentionally untrusted provider or voice command, and publishing a video on the author's behalf.

:::disclosure{title="Where credentials belong" open="false"}
Voice and capture credentials come from environment variables or an ignored `.env`. Never put them in scenario voice data: that data participates in cache identity and build reports.
:::

Agentic Screencast is licensed under GPL-3.0-or-later because its runtime dependency includes GPL ffmpeg. The repository also records the exact dependency graph and third-party notices.
::::::
