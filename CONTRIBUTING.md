# Contributing to Agentic Screencast

**English** | [Русский](CONTRIBUTING.ru.md)

Search existing issues before proposing a change. Report vulnerabilities privately through the process in [SECURITY.md](SECURITY.md).

## Development setup

Use Node.js 20 or newer and install the pinned dependency graph:

```sh
npm ci
npx playwright install chromium
npm test
```

Keep a scenario file as the only authored source for its generated slides and build data. Do not edit generated `slides/`, `.generated-*.json`, `dist/`, `site/`, cache, recording, or video files as source.

## Changes

- Work on a dedicated branch and keep one logical change together with its tests and documentation.
- Reuse the provider, voice, schema, message, and build primitives before adding a parallel mechanism.
- Add a check that distinguishes the requested state from a plausible incorrect state.
- Use the `stub` voice for automated checks. Network speech synthesis costs money and does not belong in CI.
- Keep credentials in the environment. Never add real accounts, tokens, recordings, captured authenticated pages, personal paths, or diagnostic logs.
- The rules of `docs/film-craft.md` are referred to by number across the skill, the knowledge base, the help and the checklist. Adding or moving a rule renumbers them: the test `craft-refs` then lists the numbers it froze; update every reference to a moved rule, then its list.
- Use imperative commit subjects with a `feat:`, `fix:`, `docs:`, `test:`, `build:`, or `chore:` prefix.

Run the complete local gate before opening a pull request:

```sh
npm test
npm run pack:check
npm run site:check
```

`site:check` recognises each landing clip's language by reference frames in `website/landing/media/fingerprints/`, computed from the clips themselves; it first confirms them with `npm run landing:fingerprints`. After replacing a clip, rewrite them with `node scripts/landing-fingerprints.mjs --write` and commit the frames with the clip.

Describe the commands and observed results in the pull request. A maintainer performs release, npm publication, and deployment by following [docs/RELEASING.md](docs/RELEASING.md).

## Traps of the assembly tools

These cost review rounds, and none of them announce themselves:

- `zoompan` with `d` set to a frame count stretches a poster into minutes: `d` is OUTPUT frames per input frame. For a push-in on a still, use `d=1` and an expression over `on`.
- In the bundled `ffmpeg`, `drawbox` evaluates its geometry expressions once while `drawtext` evaluates them per frame; an animated box lags behind its own text. Build a reveal from several boxes with time windows instead.
- Pass caption text with `textfile=`, not `text=`: colons and commas inside a sentence are read as the end of a filter argument.
- Screen recording starts before the application has drawn anything; trim the take to the first frame change or the film opens on an empty canvas.
- A translucent fill can be painted over the shape's own label and hide it: use a fully opaque or fully transparent fill for labelled shapes.
- A container group has no duration of its own; a duration passed to it is silently ignored and the beat looks instantaneous.
- A track whose value never changes (opacity 0 → 0) is not driven at all.
- A control can be outside the frame because the wheel scrolls the canvas rather than the panel; scroll it into view before clicking.
- In a shader, `vec4 * k` darkens the alpha too; on a premultiplied canvas the result comes out lighter, not darker. Shade the colour only: `vec4(c.rgb * k, c.a)`.
- A PNG piped into `ffmpeg` through stdin from a synchronous call can deadlock — the child waits for the end of input, the caller for the child. Decode from a file.
- Chromium's rasteriser remembers earlier frames: the same moment drawn on a fresh page can differ by a pixel along a moving edge from the same moment drawn after its predecessors. Draw a scene's frames on one page in order; splitting them between pages breaks byte-for-byte rebuilds.
