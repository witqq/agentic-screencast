# Agentic Screencast

**English** | [Русский](README.ru.md)

Agentic Screencast is a video-building CLI for AI agents. An agent turns product knowledge into a scenario, builds a video presentation, checks the result and hands the viewer an MP4. Use it for product explainers, feature walkthroughs and narrated presentations.

The agent owns research, writing and review. The CLI turns declared scenes into web pages, generates speech or uses recordings, derives timing from audio, renders frames in Chromium and joins them into an MP4. Structured schemas and JSON build reports let the agent inspect inputs and results without operating a video editor.

It does not record a live screen. Every frame is rendered from declared data at an explicit point in time, so unchanged scenes can be cached and rebuilt independently.

## Give the task to an agent

Start with the [agent entry point](AGENTS.md) and the [complete small scenario](example/agent-video.md). Tell the agent which product and source revision to explain, who will watch, the intended language and approximate duration. It should build a free silent draft before requesting paid narration.

For a guided process, use the public **Agentic Screencast Video** workflow in Moira: `admin/agentic-screencast-video`. It covers facts, scenario, materials, draft, narration, review and repair. Moira supplies the steps; the agent runs the CLI in its own workspace. See the [Moira integration guide](docs/moira.md) for setup, launch, review modes and permissions. The CLI also works without Moira.

## Install

You need Node.js 20 or newer. Install the package and the pinned Chromium browser:

```sh
npm install --global agentic-screencast
npx playwright install chromium
```

On Linux, Chromium may also require operating-system packages. Playwright can install them with `npx playwright install --with-deps chromium` when you have the required system permissions.

## Build a video

The scenario is the only authored input. Generated slides and build data live beside it and are replaced on the next build.

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

Built-in material providers cover comparison, chain, number and quote slides, saved pages, and existing video clips. External providers can add scene kinds through a language-independent JSON subprocess contract.

Inspect the machine-readable contract and parsed scenes before a paid or lengthy build:

```sh
agentic-screencast schema
agentic-screencast scenes --source story.md
agentic-screencast script --source story.md
```

The complete scenario grammar, provider contract, visual checks, snapshot configuration, cache rules, and speech settings are documented in the [Russian reference](README.ru.md).

## Record narration

The `recorded` engine addresses each take by beat text. The recording UI binds only to loopback and stores normalized 48 kHz mono WAV files in the configured data directory.

```sh
agentic-screencast record --source story.md
```

By default, cache, recordings, and output live in `.agentic-screencast/` under the current working directory. Set `AGENTIC_SCREENCAST_HOME` to choose another location.

## Verify the result

```sh
agentic-screencast check --source story.md
agentic-screencast order --source story.md
agentic-screencast verify
agentic-screencast voice-check
agentic-screencast provider-check 'python3 /path/provider.py'
```

`check` evaluates the settled frame using thresholds declared by its material provider. `order` verifies reveal timing. `verify` checks deterministic rendering, animation, frozen time, and seeking against real Chromium frames.

These source checks use estimated beat timing; inspect the finished MP4 for actual audio/visual agreement. See the [Moira guide](docs/moira.md) for coverage and path limitations before automating acceptance.

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
