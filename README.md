# Agentic Screencast

**English** | [Русский](README.ru.md)

Agentic Screencast is a video-building CLI for AI agents. An agent turns a product, prototype, idea, or research finding into a scenario, builds a video presentation, checks the result and hands the viewer an MP4. Use it for walkthroughs, visual explanations and narrated presentations.

The agent owns research, writing and review. The CLI turns declared scenes into web pages, generates speech or uses recordings, derives timing from audio, renders frames in Chromium and joins them into an MP4. Structured schemas and JSON build reports let the agent inspect inputs and results without operating a video editor.

The Playwright capture API records real browser actions with a cursor and click ripple driven by the same input events as the application. The CLI then assembles those clips or renders saved pages from a declarative scenario. Unchanged scenes can be cached and rebuilt independently.

## Give the task to an agent

Start with the [Agentic Screencast skill](skills/agentic-screencast/SKILL.md), the [agent entry point](AGENTS.md), and a [small scenario](example/agent-video.md). A request naming a product or feature is enough to begin: the agent can inspect available sources and choose a storyline, then ask only for genuinely missing access or a consequential decision. It should build a free silent draft before requesting paid narration.

Work through the skill: it carries the path from a request to a checked film, the brief the agent must collect and the knowledge base it reads. Claude Code and Codex install skills themselves, so ask your agent for it, for example: *"Install the Agentic Screencast skill from skills/agentic-screencast in this repository and use it to make a one-minute film about our export feature."*

## Install

You need Node.js 20 or newer. Install the package and the pinned Chromium browser:

```sh
npm install --global agentic-screencast
npx playwright install chromium
```

On Linux, Chromium may also require operating-system packages. Playwright can install them with `npx playwright install --with-deps chromium` when you have the required system permissions.

## Capture real browser actions

Use the public `agentic-screencast/capture` module. `recordTake` owns a browser; `capturePage` attaches to an existing Playwright page. The `prepare` callback runs before recording, so authentication and private setup do not appear in the video. Actions operate on Playwright locators, which auto-wait and scroll. The cursor follows real pointer movement, and the click ripple starts on the actual `pointerdown` event. No timestamp or frame coordinate is authored.

```js
import { recordTake } from "agentic-screencast/capture";

await recordTake({
  output: "captures/run.webm",
  prepare: async (page) => { await page.goto("https://your-app.example/run"); },
}, async (take) => {
  await take.click(take.page.getByRole("tab", { name: "Graph" }));
  await take.type(take.page.getByLabel("Search"), "example");
  await take.withFocusCard(take.page.getByRole("tab", { name: "Graph" }),
    { title: "The graph answers a different question",
      body: "It exposes the exact links between steps.", reveal: "type" },
    async () => { await take.click(take.page.getByRole("tab", { name: "Graph" })); });
});
```

A take can also push in on an element, place an explanation card beside it while the real action runs, name a moment for the scenario to refer to, and wait for an asynchronous result without a guessed delay. `type` refuses password fields; perform credential entry in `prepare`. [The runnable local example](example/live-capture.mjs) shows the complete flow without a live service, and `agentic-screencast help capture` is the API guide. The output WebM is a normal `video` scene input.

## Build a video

The scenario is the assembly source. Generated slides and build data live beside it and are replaced on the next build; recorded clips are referenced from it.

```sh
agentic-screencast build --source story.md --out video.mp4
```

Use the free `stub` voice while editing. It produces silence with a deterministic duration and never calls a network service:

```sh
agentic-screencast build \
  --source story.md \
  --voice-json '{"engine":"stub","name":"silent","cps":15}' \
  --out draft.mp4
```

Copy a scenario into your video workspace first; the command does not invent `story.md`. `--keys-only` returns keys instead of an MP4, but still synthesizes missing audio. Keep the explicit stub voice for a free check.

Build one scene from the scenario below during iteration, with an explicit free voice:

```sh
agentic-screencast build --source story.md --only e1 --out e1.mp4 --voice-json '{"engine":"stub","name":"silent","cps":15}'
```

## Scenario format

Speech is ordinary prose. A paragraph is a beat with its own recording, duration, and cache key. Visual timing can follow beat anchors such as `b2`, so a new voice or speaking rate moves the picture with the audio.

```markdown
# Product tour
voice: {"engine":"recorded","name":"narrator"}

## e1 · slides.compare
kicker: Why it matters
title: One source for picture and sound
left: Separate timelines (bad) :: drift after every voice edit
right: One scenario (good) :: audio defines duration | visuals follow beats
at: b1 b1 b2

The first beat introduces the problem.

The second beat reveals the result.
```

Speech sets the length of a scene; slides, pages and recorded clips are the picture. What else a scenario can say, and where each field is described:

| To learn about | Read |
|---|---|
| Scene kinds, build flags and the commands that check a scenario | `agentic-screencast help video` |
| Real browser actions recorded with Playwright | `agentic-screencast help capture` |
| Camera, spotlight, cards, loupe, slowing and stopping time | `agentic-screencast help overlay` |
| Slide kinds, live backgrounds and device frames | `agentic-screencast help slides` |
| A vertical or square film, and legibility on a phone | `agentic-screencast help vertical` |
| Subtitles, titles, callouts, stickers, hand-drawn marks | `agentic-screencast help text` |
| Transitions between scenes | `agentic-screencast help transitions` |
| Music, sound accents and loudness | `agentic-screencast help sound` |
| Themes, fonts and colour grading | `agentic-screencast help themes`; which look a film should have and which clichés to avoid — [the visual-design guide](docs/visual-design.md) |
| Narration: engines, pace, pronunciation, your own voice | `agentic-screencast help voice` |
| A film for a web page | `agentic-screencast help web` |
| The machine-readable contract of every scene kind | `agentic-screencast schema` |
| The scenario grammar, provider and voice-engine contracts, environment variables | [the reference](docs/reference.md) (in Russian: [README.ru.md](README.ru.md)) |
| How to make a film worth watching, genre by genre | [the skill](skills/agentic-screencast/SKILL.md) and the documents it points to |

```sh
agentic-screencast help video
agentic-screencast help capture
agentic-screencast help overlay
agentic-screencast help slides
agentic-screencast help vertical
agentic-screencast help text
agentic-screencast help transitions
agentic-screencast help sound
agentic-screencast help themes
agentic-screencast help voice
```

Inspect the machine-readable contract and parsed scenes before a paid or lengthy build:

```sh
agentic-screencast schema
agentic-screencast scenes --source story.md
agentic-screencast script --source story.md
```

## Record narration

The `recorded` engine addresses each take by beat text. The recording UI binds only to loopback and stores normalized 48 kHz mono WAV files in the configured data directory.

```sh
agentic-screencast record --source story.md
```

By default, cache, recordings, and output live in `.agentic-screencast/` under the current working directory. Set `AGENTIC_SCREENCAST_HOME` to choose another location; the other environment variables are listed in the [Russian reference](README.ru.md).

## Verify the result

```sh
agentic-screencast check --source story.md
agentic-screencast order --source story.md
agentic-screencast verify
agentic-screencast voice-check
agentic-screencast provider-check 'python3 /path/provider.py'
```

`check` evaluates the settled frame using thresholds declared by its material provider; a finished `video` clip is reported as outside that frame criterion rather than failed. `order` verifies reveal timing. `verify` checks deterministic rendering, animation, frozen time, and seeking against real Chromium frames.

These source checks use estimated beat timing; inspect the finished MP4 for actual audio/visual agreement. Their coverage is partial: `check` does not inspect video clips, and `order` skips MHTML and video scenes, exiting with code 2 when nothing is applicable.

## Voice and secret boundary

Voice engines read credentials from the environment. Never put a key in `voice` or `--voice-json`: voice data is included in cache identity and build reports. The built-in SpeechKit engine reads `CLOUD_KEY`; `stub`, `recorded`, and supported local engines need no network key.

Changing text, voice data, a recorded take, rendering settings, page bytes, Chromium, ffmpeg, or product source invalidates the affected cache entries by design.

## Development

```sh
npm ci
npm test
npm run pack:check
```

`npm test` builds the CLI and recording UI, checks both TypeScript targets and lint, then runs unit and product-level Chromium/ffmpeg tests. `pack:check` builds the exact npm candidate, rejects generated or sensitive state, installs it into an isolated consumer, and exercises the public CLI.

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and the [release runbook](docs/RELEASING.md) before submitting changes or publishing a version.

## License

Agentic Screencast is licensed under [GPL-3.0-or-later](LICENSE). The GPL license matches the distributed `ffmpeg-static` dependency.
