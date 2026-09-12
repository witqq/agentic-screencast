# Build video presentations with an agent and Moira

[Русский](moira.ru.md)

Agentic Screencast is the agent's local video-building tool. The agent researches a
product, writes a scenario, runs the CLI, inspects its reports and watches the result.
The viewer receives an MP4. Moira supplies steps and remembers progress; it does not
host Chromium, synthesize speech or render the video on its server.

## Start the workflow

Connect production Moira MCP to an agent that can run commands, read local files and
inspect images. Running workflows requires a Moira account. Ask the agent:

> Find the public “Agentic Screencast Video” workflow in Moira and run it for this
> product: [source and revision]. Explain [goal] to [audience], in [language],
> about [duration] seconds. Use one local workspace and start with a free silent
> draft. Do not use paid speech or publish anything without permission.
> Use self-review and report its limitations. Do not launch child workflows.

The workflow identity is `admin/agentic-screencast-video`. Discover it through
Moira `list`, then use `start` with `action: "prepare"` and the returned identity.
Execute the returned start attempt with `action: "execute"`. Follow each directive;
submit its exact `processId`, `attemptId` and input schema through `step`.
Resume with `session`, `action: "current_step"` and the execution ID.
An interrupted response is not a reason to create another execution.

The [versioned definition](../workflows/production/flows/agentic-screencast-video.json)
adapts the existing product-video process: evidence-backed facts, story review,
materials, repair routes, narration checks and permission-scoped delivery.
The private source workflow is unchanged.

## Local setup

Keep the source revision, goal, audience, language, target duration and intended use
in `task-brief.md`. Use a separate video workspace outside the active product tree.
The workflow pins CLI 1.0.1. Node.js 20+, Chromium and the bundled ffmpeg tools are required:

```sh
npm install --save-exact agentic-screencast@1.0.1
npx --no-install playwright install chromium
npx --no-install agentic-screencast schema
npx --no-install agentic-screencast paths
```

For CLI 1.0.1, use agent-created paths containing only letters, digits, slash, dash,
underscore and dot. Its final mux command uses a shell: spaces and shell syntax
in paths are unsupported. Never pass untrusted path strings to the builder.

The agent authors `story.md`; scene pages and `.generated-pitch.json` are generated.
Copy the [complete small example](../example/agent-video.md) into the video workspace
as `story.md`, then run:

```sh
npx --no-install agentic-screencast scenes --source story.md
npx --no-install agentic-screencast build --source story.md \
  --voice-json '{"engine":"stub","name":"silent","cps":15}' --out draft.mp4
npx --no-install agentic-screencast check --source story.md
npx --no-install agentic-screencast order --source story.md
```

Stub produces silence. `--keys-only` does not produce an MP4 and **still synthesizes
missing audio**; it is not a safe dry run for a paid engine.

## Review and repair

The default is explicitly labelled self-review. Choose `review_mode: independent`
only when an authorized separate reviewer or human is available. Each review names
the SHA-256 of the inspected files. Keep those files unchanged until the matching
report arrives. Never invent reviewer capabilities or silently replace the mode.

Script changes invalidate later evidence. Material and narration defects return to
their own repair steps; a failed upload never triggers another video render.
`check` inspects settled web frames; `order` checks supported page elements using
estimated beat timing. Neither proves that final voice and picture agree.
`order` skips MHTML and video, exiting with code 2 if nothing is applicable;
`check` does not inspect video clips. Record this coverage honestly.
Decode the whole MP4, verify streams and duration, and inspect every scene.

## Narration and authority

- `synth`: inspect the engine first. Confirmed local synthesis needs no paid-service
  permission; a network or unknown-cost engine requires `allow_paid_synthesis: true`
  and an approved scope. Listen to a short sample first.
- `human`: the user records current beats through the loopback recording UI.
  Wait for real recordings, then build with `recorded`.
- `silent`: the user explicitly selects a final video without speech.
  Denied synthesis permission does not imply this choice.

Never put credentials in voice JSON, scenarios, Moira inputs or reports. Read them
only from authorized protected sources. Inspect captures for visible confidential
content before sharing: MHTML without cookies can still contain private data.

The output is the original MP4 with checksum, media metadata, source revision,
scenario, reusable materials and an honest review report. Keep the fact base,
build evidence and secret-free voice configuration in the video workspace.

`allow_commit` permits only a scoped local commit. `allow_external_delivery`
permits only the specifically requested destination and operation. Both default
to false. A public workflow does not authorize publishing a user's video.
Agentic Screencast also works directly through the CLI without Moira.
