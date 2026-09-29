# Agentic Screencast reference

This is the reference of Agentic Screencast: the scenario grammar, the provider and voice-engine
contracts and the environment variables. [`README.ru.md`](../README.ru.md) is its Russian version.

[English README](../README.md) | [Russian version](../README.ru.md)

License: **GPL-3.0-or-later** (see `LICENSE`). It was chosen because
`ffmpeg-static` ships as a dependency and is distributed under GPL-3.0;
a weaker license would create a mismatch between the license file and what
the user actually receives on installation.

An agent studies a product, prototype, idea or piece of research, writes a scenario and
builds a video presentation for a person.
Agentic Screencast does the building: it creates slides, synthesises speech or takes
recordings, computes frames and joins them into an MP4. It suits explaining a product,
reviewing a feature, explaining an idea and a narrated presentation. The agent is responsible
for the facts, the text and checking the result; it receives the input schema and the build
reports in machine-readable form.

Ready pages are rendered at the assigned moments, and live Playwright actions
are recorded to WebM together with the cursor and the click response.
Unchanged build scenes are taken from the cache.

## Handing the job to an agent

It is enough to name the product or feature: the agent finds the available sources,
decides on the story and asks only about missing access or a significant choice.
You can start with the [skill](../skills/agentic-screencast/SKILL.md),
the [ready example](../example/agent-video.md) and the [agent entry point](../AGENTS.md).
Build a draft with the `stub` engine first:
it produces silence and does not call a paid service.

Work through the skill: it carries the path from a request to a checked film, the brief the
agent collects and the knowledge base it reads. Claude Code and Codex install skills themselves,
so simply ask the agent, for example: *"Install the Agentic Screencast skill from
skills/agentic-screencast in this repository and make a one-minute film about our export with it."*

The universal core lives in `src/`. The scenarios, snapshots, recordings and commands of a
particular film belong to the external consumer project; this repository does not store them.

## Recording real actions

The `agentic-screencast/capture` module records real actions in the browser:
`recordTake` opens a new Playwright page, `capturePage` records a page that is already
open. Methods, options and the recording scale are in `agentic-screencast help capture`.

```js
import { recordTake } from "agentic-screencast/capture";

await recordTake({
  output: "captures/run.webm",
  prepare: async (page) => { await page.goto("https://your-app.example/run"); },
}, async (take) => {
  await take.click(take.page.getByRole("tab", { name: "Graph" }));
  await take.withFocusCard(take.page.getByRole("slider"),
    { title: "Rewinding the history", body: "The screen shows another state of the run.",
      reveal: "type", motion: "glide" },
    async () => { await take.range(take.page.getByRole("slider"), 0.75); });
});
```

Put the finished WebM in the `file:` of a video scene and build the MP4 with the usual command.
The [runnable example](../example/live-capture.mjs) works without an external site.
Short help: `agentic-screencast help capture`.

Capture writes `<take>.marks.json` beside the WebM: named moments, rectangles
of marked elements and `cameraMoves`, the intervals of focus and unfocus motion
already painted into the take. A scenario addresses a moment or element as `@name`;
`lint` accounts for camera motion when looking for an unexplained screen change.

## Environment variables

| Variable | What it sets | Default |
|---|---|---|
| `AGENTIC_SCREENCAST_HOME` | data directory: sound and frame cache, voice recordings, default output | `./.agentic-screencast` |
| `FFMPEG` | path to ffmpeg, if the one shipped as a dependency does not suit you | from `node_modules` |
| `CLOUD_KEY` | Yandex SpeechKit key; read from the environment or from `.env` | — |
| `AGENTIC_SCREENCAST_LANG` | the language in which the tool talks to the person | from `LANG`, otherwise `en` |
| `LANG` | system language; used if `AGENTIC_SCREENCAST_LANG` is not set | — |
| `AGENTIC_SCREENCAST_FILM_LANG` | the scenario variant in another language; the command's `--lang ru` sets it | language of the scenario header |
| `AGENTIC_SCREENCAST_FILM_FORMAT` | the build format of a horizontal scenario with reframing; the command's `--format vertical` sets it | format of the scenario header |
| `AGENTIC_SCREENCAST_BARE` | `1` — build without the layer over the material (highlights, captions, cards): this way the check compares the framing of the material itself | the layer is drawn |
| `AGENTIC_SCREENCAST_JOBS` | how many scenes are drawn at once; each by its own browser from the first frame to the last, but under shared load the Chromium rasteriser may round a pixel differently (PSNR no lower than 56 dB against a one-at-a-time build), so a byte-exact rebuild uses `1`; the report field `timing` shows where the time went | a third of the cores, no more than four |
| `AGENTIC_SCREENCAST_DEBUG` | `1` — a build failure is printed with the Node stack; without it, as one line `build failed: …` that names the scene and the reason | one line |
| `AGENTIC_SCREENCAST_EMOJI_SET` | directory of an emoji image set instead of the shipped `assets/emoji` (Noto Emoji); an empty directory makes the build fail on the first emoji | the package's `assets/emoji` |

The name of the key variable (`CLOUD_KEY`) is overridden by data: `key_env` in the voice.
Snapshot capture has no variables of its own at all: the names are given by the consumer's
settings as strings of the form `${NAME}`. An external voice engine may have as many
variables of its own as it likes — it declares them itself;
the tool does not know about them.

## Condition for frame reproducibility

Byte-for-byte identical frames are guaranteed **on a pinned browser
version**: the path to the Chromium binary is part of the build key. Updating
playwright legitimately changes the keys of all scenes: the reproducibility
conditions have changed. The versions are pinned both by the manifest and by the lock file
(`package-lock.json`), so the installation is reproducible; a divergence
is possible only on a deliberate playwright update.

## Installation

A user of the tool needs only the global installation from npm (`npm install
--global agentic-screencast`, then `npx playwright install chromium`) —
as described in [README.md](../README.md). This section is for working from
source: developing the tool or running a checkout without installation.

Node.js 20+ is required. There is no Python on the working path: synthesis is done by the
voice engine, and the shipped engines run on Node. Chromium is installed by a separate
Playwright command; on Linux it may need system packages.

The source is TypeScript in `src/`; what runs is the build in `dist/`. You do not need to
build by hand: the build is hooked to `prepare`, that is, it runs on
`npm install` in the package directory and on installation from a git URL.

```bash
# 1. Node dependencies and the browser; the build runs by itself
npm install                                # installs dependencies and builds dist/
npx playwright install chromium            # ~180 MB

# 2. tell the tool where to keep the cache and output
export AGENTIC_SCREENCAST_HOME="$PWD/.agentic-screencast"

# 3. put the agentic-screencast command on PATH for agents and shells
npm link
```

Without `npm link` a checkout has no `agentic-screencast` command, and an agent following the
skill will not find it; `node dist/agentic-screencast.js` runs the same CLI.

Local free synthesis (Silero) and the intelligibility gate live
separately — they depend on torch, and that is an environment of about 600 MB.
Only those who need them should install them: `external/README.md`.

## Running

Three ways, all equivalent:

```bash
node /path/to/agentic-screencast/dist/agentic-screencast.js build --source story.md
npx agentic-screencast build --source story.md
agentic-screencast build --source story.md
```

The build sets the execute permission on the built entry point, so a
symbolic link needs no manual finishing. The data directory
is resolved from the CURRENT working directory, so a call from your own project
writes nothing into the tool's directory.

```bash
npx agentic-screencast build --source story.md --out pitch.mp4
```

One command: it generates the slides from the scenario, synthesises the lines, renders
the scenes and joins the video. A repeated run takes unchanged scenes from the cache.

The `--out` path is resolved from the current directory; without it the file goes
into the data directory (`$AGENTIC_SCREENCAST_HOME/pitch.mp4`). Build progress goes to the
error stream line by line — scene after scene — and the report goes to standard output
as a single JSON.

The same report is written beside the MP4 as `<film>.report.json`. Its `audit.expected`
has the frame timeline and explicit `part:` names; `audit.measured` has the decoded
video frame count, final video and audio stream durations, stream presence and
WebVTT chapter cues. `audit.issues` names any drift, missing stream or chapter
mismatch with measured values; the same findings appear in `warnings` and on
the error stream. An empty issues list means these encoded properties match
within one video frame and AAC packet padding, not that the film has been
watched or its captions judged. A film with no parts has no chapter file;
rebuilding one without parts removes an older file at that output path.

**While you are tuning a scene, build it alone:**

```bash
npx agentic-screencast build --source story.md --only e1 --out try.mp4
```

A full film of a couple of dozen scenes takes minutes to build, one scene takes seconds,
and the segment is exactly the same one that will go into the finished file.

Preview a frame without synthesising speech with `frames`:

```bash
npx agentic-screencast frames --source story.md --scene e1 --out e1.png
npx agentic-screencast frames --source story.md --except e1 --out sheet.png
```

`--scene` generates only the selected scene; `--except` makes a sheet of the
others, even if the omitted scene's material does not exist yet. The flags
cannot be combined. Beat timing is estimated here. A video preview includes
its subtitles and overlay when the scene has speech or an `overlay`. The sheet
reports a large flat empty band on a drawn scene; an intentionally sparse
trailer card is exempt.

## How the input is organised

There is one input — the **scenario file**. Slides and build scenes are generated from it,
next to it, and are edited only through it. This is so because otherwise the description
of one scene lives in two places, and an edit to a line stops reaching
the frame.

A scene is a block: a heading with an identifier and a kind, several
"key: value" fields, then speech as ordinary paragraphs without quotes. It can
be prepared by an agent or a person, and the engine receives the text to voice.

**A scene's speech is divided into beats: one paragraph is one beat.** A beat has its own
recording, its own length and its own cache key; the scene duration is the sum of the beats
plus a tail. Re-recording one beat does not touch its neighbours. A line starting with `~`
sets the spoken variant of its beat: the ordinary text stays on screen and in front of the
reader, while synthesis and recording addressing get the variant.

```markdown
# Film title
voice: {"engine":"speechkit","name":"kuznetsov","speed":1.2}

## s03 · slides.compare
kicker: what it is
title: Scene title
left: What it does :: gives one step at a time | does not let you go further
right: What it does not do :: does not solve the task
at: 0.7 2.2

The first beat: it is recorded and voiced separately.

The second beat of the same scene.
~ The second beat of the same scene, written the way it should be pronounced.

## s04 · slides.chapter
title: Next step
body: Show the result

Now move to the result.
```

**A scene's kind belongs to the material PROVIDER, not to the tool.**
In the scene heading the provider comes before the dot and its kind after it:
`## s03 · slides.compare`. A provider with a single kind is written without
a dot: `## s09 · page`.

The tool brings three providers with it:

| Kind | What for | Required fields |
|---|---|---|
| `slides.chapter` | animated introduction or a chapter of meaning | `title`, `body` |
| `slides.compare` | "without / with" comparison in two columns | `left`, `right` |
| `slides.chain` | diagram with arrows and a return-arrow caption | `nodes` |
| `slides.number` | a large quantity with a caption | `values` or `value` |
| `slides.quote` | a verbatim quote of someone else's answer | `parts` |
| `slides.hero` | opening statement: the title rises word by word, an image may serve as background | `title` |
| `slides.steps` | steps lighting up one by one following the speech | `items` |
| `slides.features` | a grid of two to six capabilities with icons | `items` |
| `slides.timeline` | milestones on a line that is drawn out to each one | `items` |
| `slides.counter` | numbers counting up like a counter, shares as a ring | `values` or `value` |
| `slides.beforeafter` | two states of an interface in one frame: "before" on the left, "after" on the right, the divider moves | `image` and `after` |
| `slides.perspective` | a snapshot on a screen in perspective (WebGL): camera fly-around, glare, reflection | `image` |
| `slides.parallax` | a snapshot splits into panels at different depths, nearer ones drift more | `image` and `panels` |
| `slides.chart` | a chart from a "label,value" CSV: bars grow, the line is drawn, the peak is highlighted | `data` |
| `slides.code` | code being typed with highlighting; from a scenario string or a file | `code` or `file` |
| `slides.photo` | an image with a slow push-in to a point and a caption | `image` |
| `slides.shot` | a screenshot in a browser or phone frame, floating in 3D | `image` |
| `slides.outro` | final card: title, line, call to action, address | `title` |
| `slides.card` | trailer card: one to three words filling the frame, flying in with a flash and shake | `title` |
| `slides.titlecard` | the film's name in widely spaced capitals with glare and bloom | `title` |
| `page` | a ready page: an interface snapshot or your own layout | `page` |
| `report` | a page agentic-report builds from its Markdown source for every scene; needs agentic-report in the project | `report` |
| `video` | a ready video file instead of a drawn page | `file` |

For `page`, `pageVertical` may name a separate HTML file laid out for a 9:16 frame.
It is selected when the film is vertical, including with `build --format vertical`;
otherwise `page` is used. Translate file choices with `page.en` and
`pageVertical.en` when the film has an English variant. Without `pageVertical`,
a landscape page keeps the usual moving crop in a vertical build. The selected
portrait page also appears in `frames` and the recording preview; a missing
selected file is an error, not a reason to use the landscape file.

The third column names only the required fields; the other allowed ones
are listed by `agentic-screencast schema`. For the chain that is `back` — the caption of the
return arrow; for the quantity, `label` and `tags`; for a screen scene, `zoom`,
`spotFrom` and `focus`. What each slide field does — entrances, frame motion,
live background, device frame — is described by `agentic-screencast help slides`;
the film look, brand colours and the theme of part of a film — by `agentic-screencast help themes`.

`items` entries are written like the columns: `Title :: explanation | …`; an emoji
at the start of an entry becomes its icon. If `at` has not named the moments, the entries
come out each on its own beat when there are enough beats, and otherwise at an even step
over the whole speech of the scene. Images and code are embedded into the generated page,
so replacing a file under the same name rebuilds the scene.
For a dense `slides.steps`, six to eight items use two columns in landscape and
a vertical sequence in portrait. Four short `slides.chain` nodes share one
landscape row and stack in portrait. Check the rendered frame for longer copy.

A video insert is fitted to the film's frame: it is scaled preserving
proportions, padded to the required size and converted to the film's
frame rate. Its speech is the same as any scene's, and the speech sets the length;
a scene **without speech** is legal for video, `slides.chapter` and `page`. For an ordinary
video the file sets the length; for a silent chapter and a saved page set
`duration` in seconds so that the text has time to appear and stay readable.
If shorter than the scene, the last frame is held; if longer, it is cut.
Annotations may extend a scene so the text can be read.

### Motion over real video

The common `overlay` field works for `video`, `page` and other scene kinds: camera,
highlight, cards, titles, marks and magnifier. The `speed` field of a video scene
slows down a stretch of the clip or stops time inside the same shot;
`freezeAt` holds one real frame of the clip. Their fields, defaults and
behaviour are described by `agentic-screencast help overlay` and `help text`;
the [working example](../example/kinetic-video.md) shows an intro, a clip and a
freeze frame in one scenario, and the [self-contained example](../example/idea-video.md) shows
a saved page with a push-in by CSS selector and the caption "illustration".

A manual pointer `overlay.pointer` with `click:true` draws a ripple but does not press
the button in the source recording: record real actions with Playwright capture.
For a scene with `freezeAt` the build measures the brightness spread in every `area` region
on the frozen frame and fails if a region is almost empty: the failure names
the scene and the measured contrast.

The scene field `stills: @saved :: check the result` requests a control frame
at a named take mark. A beat (`b2+0.3`), scene share (`80%`) or step
(`every 1s`) also works. A full build writes frames to `<film>.stills/`
and reports each `scene`, `moment`, `time` in finished-film seconds, `note`
and `file`; `--only` does not extract them.

Field values are written as a short marked-up list. There are two separators,
and they mean their own thing in each field — here are all of them:

| Field | How to write | Example |
|---|---|---|
| `left`, `right` | `Title :: item \| item` — the column title and its content; a single value without `\|` becomes a paragraph. The mark `(bad)`, `(good)`, `(plain)` in the title sets the colouring | `What arrives (bad) :: "done" \| does not work` |
| `nodes` | chain nodes separated by `\|`; the mark `(acc)` or `(bad)` colours a node | `set it myself \| did it myself \| declared it myself (bad)` |
| `values` | `quantity :: caption` pairs separated by `\|` | `300 :: nodes \| 24 :: actions` |
| `parts` | `caption :: text` pairs separated by `\|`; the quote text goes as is | `answer :: step accepted` |
| `tags` | a plain list separated by `\|` | `what it is \| why \| how to start` |
| `back` | one line: the caption of the return arrow | `nobody holds the frame` |
| `note` | one line: a note below the content | `a rendering of the answer, not a capture` |

`at` gives the moments elements appear, as **anchors**:

| Anchor | What it means |
|---|---|
| `b2` | the start of the second beat of speech |
| `b2.end` | the end of its speech: the start of the third beat, and for the last beat the end of the scene's speech, without the tail and transition |
| `b2+0.4`, `b2-0.2` | 0.4 s after the start of the beat, 0.2 s before it |
| `40%` | a share of the scene duration |
| `1.2s` | seconds from the start of the scene; a bare number is also seconds |

Without `at`, elements appear **each on its own beat**: the first on the first,
the second on the second. A scene has more elements than fields: the header (kicker
with title) is also an element, and it is always first. `compare` has three
(the header and two columns), `chain` has the header, each node and the return caption,
`number` has the header, each quantity and the label row, `quote` has the header
and each part. An anchor pointing beyond the last beat is rejected by parsing,
which names the scene's number of beats. This is exactly what anchors exist for: the slide
assembles itself following the speech and stretches with a recording of any length.
A moment written in seconds cannot do this — it is fixed before the recording
and knows nothing about it: the line came out longer, and the element waits half the scene;
shorter, and the scene ended before it appeared.

The same anchors are accepted by `focus` of a screen scene (`selector @ anchor`),
`spotFrom`, `spotlight` and `at` of any element of the `overlay`
(`{"at":"b2+0.5",…}`; there also a share of the scene, `40%`). **An unknown field is a parse error,
not silence:** a typo in a name would otherwise quietly throw away the slide's content.
A missing required field is also a parse error, and it names the scene
kind and the field name.

For a `page` scene the fields `target` and `mustRead` are not needed by parsing, but without them
the frame criterion has nothing to check — see the section "An interface snapshot as a page".

The base duration is set by the speech — the sum of its beat lengths plus a tail,
rounded up to a whole frame. Annotations may extend the scene until
the end of the last card or click.

### Language and reading rules are film data

```markdown
lang: ru
pronounce: "ru-latin"
```

`lang` is the film's language: the recording page is labelled in it, the
generated pages are marked with it, and this build's failures speak it. If not named, it is taken
from `AGENTIC_SCREENCAST_LANG`, then from `LANG`, otherwise English. The tool by itself
does not know or choose the film's language.

`pronounce` holds reading rules: **the text for voicing is not the same as the text
on screen**. One engine reads Latin script itself, another silently skips it;
an abbreviation must be pronounced letter by letter, and a website address must not be pronounced
at all. These are properties of the language and the subject area, so they come as
data — the name of a shipped set, a path to your own file, or directly as an
object:

| Set | What for |
|---|---|
| `ru-latin` | Russian speech, the engine does not read Latin script: a dictionary of abbreviations plus letter-by-letter replacement of the rest |
| `ru-abbr` | Russian speech, the engine reads Latin script itself: only abbreviations are fixed, addresses are dropped |

Your own set is an object of four optional parts: `say` (replacements
of whole words), `translit` (letter-by-letter replacement), `drop` (what to throw out),
`cleanup` (tidying up after replacements), plus `order` (the order of steps)
and `caseSensitive`. Terms of your own domain are added here, not to the
tool.

The order of steps is not a detail: a dictionary applied before dropping
addresses manages to rewrite a piece inside a domain, and the address stops being
an address — instead of disappearing, it is pronounced half
rewritten.

**Changing the rules changes the synthesis string, and with it the cache key**: the rules
changed — the sound will be synthesised anew, for money with a network engine.

### Frame, quality and styling are film data

```markdown
# Film title
frame: {"width":1080,"height":1920,"fps":30,"scale":1}
encode: {"crf":18,"preset":"veryfast","pix":"yuv420p","audio":"192k"}
theme: calm-paper
```

| Header | What it sets | Default |
|---|---|---|
| `frame` | frame width and height, frames per second, `scale` | 1920×1080, 25, 1 |
| `encode` | video quality and audio bitrate | crf 18, veryfast, yuv420p, 192k |
| `theme` | the name of a shipped theme or styling variables: they go to the page root and to the overlay | `neutral` |
| `format` | format preset: `landscape`, `vertical` (1080×1920, 30 frames, with the platforms' safe zone), `square` | — |
| `look` | film look: grade, vignette, grain, letterbox — by name or as JSON | — |

The list of themes with their fonts, the theme contract variables and the rules of partial
overrides (`theme: {"preset":"noir","--acc":"#7aa2ff"}`) are printed by `agentic-screencast
help themes`. An unknown theme name and an object without `preset` that lacks a
variable are parse errors that name what is available and what is missing.

**Vertical and square in one line.** The header `format: vertical` sets a
1080×1920 frame, 30 frames per second and the platforms' safe zone; `format: square` sets
1080×1080 and the same 30 frames; `frame` still overrides size and frame rate, and
the zone is recomputed for the frame.
A horizontal scenario is built vertically with the `--format vertical` flag
without rewriting. How the frame is laid out and what the build measures is in
`agentic-screencast help vertical`; how to make such a film readable on a
phone is in the [guide to vertical films](vertical-video.md).

The rest is described in the tool's help, in one place per topic:
scenario skeletons by genre (`new`), frames without building (`frames`), reference
frames `stills`, the directing rules `lint`, long fields over several lines and
translation from the same scenario (`.ru` fields, the `[ru]` speech block, `--lang ru`) —
`agentic-screencast help vertical`; hand-drawn marks, glints, bursts and the magnifier —
`help text` and `help overlay`; transitions and the `fade` field — `help transitions`;
a film for a web page — `help web`.

A vertical film, thirty frames per second, a light theme — all of this is the
scenario header, not an edit to the tool. The shipped slides are drawn
on a grid 1280 wide and stretched to ANY frame: font sizes and spacing
stay the same numbers, only the magnification changes.

`scale` is a pixel-density multiplier, like on a high-resolution
screen: the page is drawn at the same size but captured with more
pixels. It does NOT change the size of the finished file — that is set by `width`
and `height`; with `scale: 2` a 1920×1080 frame stays 1920×1080, it just
takes four times longer to draw. You rarely need to change it. A theme is "variable —
value" pairs; the tool puts them into `:root` without interpreting them itself.

Changing the frame or the quality invalidates the frame cache — by design:
what was built at the old size does not fit the new one.

Generated output is placed next to the source — the `slides/` directory and the
`.generated-pitch.json` file. Editing them by hand is pointless: the next run
overwrites them. Keep them out of version control, otherwise a second copy
of the scenario comes back by the same route it was removed by.

The `--deck` and `--pitch` flags accept ready data bypassing the scenario —
they are for other people's sets, not for your own film.

## The material provider contract

What a scene is drawn with is decided by the **provider**, not the tool. The core
does not know a single scene kind: it asks whoever the heading named
what kinds it has and what fields they have, and asks it to generate a
page. So a film can be built from anything — your own layout,
a diagram, someone else's framework, a ready video — without touching the tool.

A provider is an **ordinary program**; the implementation is written in any language,
without reading the source. It is declared in the film header:

```markdown
providers: {"my": "python3 /path/provider.py"}
```

### What a provider must support

Two subcommands. The answer is **JSON to standard output and nothing else**;
a refusal is a non-zero exit code and the reason in words on the error stream.

| Subcommand | Arguments | Answer |
|---|---|---|
| `kinds` | — | `{kind: {about, fields, required, effects?, check?, fileField?, video?, offline?, shown?, staging?}}` |
| `page` | `--scene-json`, `--out` | `{file}` — path to the generated page |

- **`fields`** — which fields a scene of this kind may have; **`required`** —
  "at least one of" groups. By them the core rejects a typo in a field name:
  without this the scene's content would quietly drop out.
- **`effects`** — schedule defaults for the kind: push-in, spot, transition.
  The choice stays with the provider, the core executes it; a scene may override with its own fields.
- **`check`** — frame acceptance thresholds: by them the check judges exactly this
  material. A slide is sparse and its text is read, a screen is dense and what it
  needs is recognition — their numbers differ and are not hard-coded in the tool.
- **`shown`** and **`staging`** — which fields the viewer reads in the frame and which
  control the showing. By `shown` the translation rule (`lint --lang ru`) names
  a field left untranslated; a kind that has not split its fields is not
  checked by this rule.
- **`fileField`** — the material is taken as a ready file named by this field,
  and there is nothing to generate. This is how `page` and `video` work.
- The page must be a **pure function of time**: the moments elements appear
  are written in `data-at` as anchors, and the compositing layer resolves them.
  The layer reads `data-at`, `data-type` and `data-kinetic` only on a page
  marked `<html data-sc-page>`; another tool's page keeps its own meaning of
  those names.
- The page declares **the number of its schedule elements** with the
  `data-slidecast-elements` attribute on the body. By it the order check tells
  "the page did not render completely" from "this is intended"; a page
  that is silent is checked only for being non-empty.
- The page declares **what counts as its content** with the
  `data-slidecast-content` attribute — a comma-separated list of selectors. The frame
  criterion requires at least one of the declared items to be in the frame;
  a page that is silent is not judged by this criterion at all. The check
  knows nobody's markup — otherwise a frame of someone else's material would be declared
  empty, however meaningful it is.

Conformance is checked by a program, not taken on trust:

```bash
npx agentic-screencast provider-check 'python3 /path/provider.py'
```

## Checks

**The build audits encoded streams and chapters, but does not judge the visual
frame.** Too much text, a line overflowing the edge and an unreadable
caption are the business of `check`, and you have to run it yourself.

```bash
npx agentic-screencast check --source story.md   # frame criterion: text, font sizes, graphics
npx agentic-screencast order --source story.md   # order in which elements appear
npx agentic-screencast verify                    # four checks of the render core
npx agentic-screencast script --source story.md  # readable scenario to the output stream
npx agentic-screencast schema                    # description of scene fields, JSON Schema
npx agentic-screencast scenes --source story.md  # the source's scenes as JSON
npm test                                     # the product's test suite
```

`schema` prints a machine-readable description of a scene, `scenes` prints the scenes
of the parsed scenario in the same form. Together they give another agent
a check before building: get the schema, get the scenes, run one through
the other with any JSON Schema validator (draft 2020-12). The schema is
generated from the same tables by which parsing rejects an unknown field
and requires a mandatory one — no second list is kept.

`check` measures right on the frame, and takes the thresholds and the content criterion
**from the provider and from the page itself**:
what counts as a good frame is known by whoever draws it. For the shipped
slides that is no more than 220 characters of visible text and a body font size
of no less than 28 pixels; beyond the thresholds the check requires that the frame contains
the content declared by the page, that no unsubstituted values remain,
that no line goes past the edge, that the page covers the frame,
and that the text is readable: the contrast ratio against its actual background is
no less than 4.5 for body text and three for title-sized text (48 pixels and more on a
1080 frame), as WCAG AA asks. Your own provider declares its own numbers in the `check` field,
and its material is judged by them, not by the slide ones. A ready video clip
is not judged by the frame criterion: `check` marks such a scene with a separate
`video` flag and explains that its quality is measured on the finished file.

`verify` checks the core: reproducibility (two runs in different processes
give identical frames), liveness (frames change), absence of real
time in the frame, and seekability (a frame from the middle of a scene matches
the end-to-end run).

`lint` warns about a top title over an interface, subtitles alongside a top
progress bar, typing too fast to read, a take piece crossing a mark not named
in `stills`, and an abrupt screen change outside marks and `cameraMoves`.
It places speech anchors by estimate; check the finished film after recording.

## The voice-engine contract

Producing sound is placed outside the tool's boundary. An engine is an **ordinary
program** that the tool runs; the tool knows nothing about its internals
and never branches on its name. So an implementation can be
written in any language without reading the tool's source.

The engine is named in the voice data. If the name matches a shipped one,
the shipped one runs; otherwise the name is treated as a command (a path or a name
in `PATH`), and it may be given together with what to run it with.

```bash
npx agentic-screencast voices --engine speechkit
npx agentic-screencast build --voice-json '{"engine":"speechkit","name":"kuznetsov","speed":1.2}'
npx agentic-screencast build --voice-json '{"engine":"/path/python /path/voice.py","name":"baya","rules":"silero"}'
npx agentic-screencast voice-check
```

### What an engine must support

Four subcommands. The answer is **JSON to standard output and nothing
else**; a refusal is a non-zero exit code and the reason in words on the error stream.

| Subcommand | Arguments | Answer |
|---|---|---|
| `voices` | — | list of voice names, `[]` if the engine does not enumerate them |
| `synth` | `--voice-json`, `--text`, `--out` | `{file, duration, engine, voice}` |
| `probe` | `--voice-json`, `--text` | `{fingerprint}` |
| `paths` | — | resources the engine resolves itself |

Requirements that must not be violated:

- **The sound is WAV 48 kHz mono.** The tool derives the scene duration from its
  length; a compressed format or another sample rate gives a wrong number, and the picture
  drifts apart from the sound.
- **The engine takes the access key from the environment.** It must not be put into
  the voice data: the whole voice object goes into the cache key and into the build report.
- **The fingerprint** (`probe`) is a string that changes if and only if
  the sound would change for the same text and voice data. Synthesis
  answers with an empty string: for it, the text and data determine the sound
  completely. A non-empty one is returned by an engine whose sound comes from outside —
  for example a voice recorded by a person: on re-recording it gives different sound
  for the same text and data, and without a fingerprint the build would return the old
  recording from the cache while looking successful.

The fingerprint is mixed into the cache key **only when it is non-empty**. So
the appearance of the subcommand did not invalidate a single line already synthesised.

Conformance to the contract is checked by a program, not taken on trust:
`agentic-screencast voice-check <command>` runs eight requirements against someone else's
engine and names each violation individually.

### Shipped engines

Which engines are shipped, what each one needs and how to choose a voice is printed by
`agentic-screencast help voice`; the engine's list of voices by `agentic-screencast
voices`. The system voice (`say`) goes into a film only with the explicit permission
of the owner — the "Voice" section of the skill.

### A film voiced with your own voice

The `recorded` engine implements the same contract as synthesis, so
the film is built with the same commands and the same cache:

```bash
npx agentic-screencast build --source story.md --voice-json '{"engine":"recorded","dir":"/path/to/recordings"}'
```

A recording is **addressed by the text of the beat**: the file name is the `md5` of the text plus
`.wav`. Hence a consequence you should know in advance: two beats
with word-for-word identical text get the same recording. For a film
scenario this is right — identical text should also sound identical.

If the required file is missing, the build fails and says which line
is missing, where to put it and under what name. There is no need to guess the addressing
rule. If the file is in place but unreadable or damaged, that is also a failure
with the file name and the reason in one line, not a crash in the middle of rendering.

The directory is set by the `dir` field in the voice data; without it
`$AGENTIC_SCREENCAST_HOME/recordings` is used. The recording format is brought to the one the
contract requires (WAV 48 kHz mono) by the engine itself, so you can put in whatever
the voice recorder produced.

Reading rules (`rules`) are incompatible with this engine, and it refuses to
work when they are set: rules rewrite the text for synthesis,
while a person reads the line itself aloud — the recording address would be computed from
what they did not pronounce.

**A re-recording reaches the finished file.** This engine's fingerprint is
a hash of the recording's content, so replacing the file changes the cache key, and the build
takes the new sound with the new scene duration. A fingerprint computed
from the file name or from the text would look like it works and would not give this:
the build would return the old recording while looking successful.

What voiced each scene is visible in the keys report — the `voiced` field:

```bash
npx agentic-screencast build --source story.md --keys-only
```

### Recording the voice-over with your voice

You do not have to put files into the directory by hand: the tool brings up
a page that shows the scene and its line.

```bash
npx agentic-screencast record --source story.md
```

The command prints an address of the form `http://127.0.0.1:<port>/` — open it
in the browser. For each scene it shows the picture the viewer will see
and its speech **by beats**: each has its own line to read aloud, its own length
guide and its own buttons. What was recorded can be replayed, re-recorded or deleted,
and re-recording one beat does not touch its neighbours. You can choose the input right there —
the list of microphones is next to the permission button; the browser shows device names
only after permission is granted, which is why it is asked for in advance.

The page opens even when a video take, its marks file or another scene's
material has not been created. Ready scenes can be recorded; a separate list
names the skipped scenes, missing files and required action. A normal build
still requires all material.

While recording is in progress you cannot switch to another scene — the scene labels
and navigation buttons are locked: the line being recorded is bound to the scene
selected when the button was pressed, and switching in the middle of reading would mean sound
in the wrong scene, on top of what was already recorded there.

**Build and watch.** The button above the list of beats builds the shown
scene and plays it right there, in a player: with the same core, the same
voice-over and the same schedule as the finished film — but a single scene,
so it takes seconds, not minutes. There is never paid synthesis: the sound
is taken from the recordings. The same build is `build --only` (the "Running" section).

When you are done, stop the interface with Ctrl+C: the server closes, temporary
images are removed, and the recordings remain in storage and survive
both the stop and closing the tab. After that the film is built with the usual
build command.

**Why a server and not a file on disk.** The browser grants the microphone only
in a secure context: `http://127.0.0.1` is one, `file://` is
not, and there `navigator.mediaDevices` is simply absent. The server listens
only on the loopback — the interface is not exposed to the outside.

**The length guide is an estimate, not a duration.** Only the sound gives the real
length: after recording, the guide is replaced by the measured duration,
and exactly that is what the build takes as the scene length.

The recordings directory is the same one the `recorded` engine reads from, and the file
address is computed by the same code. The browser produces a compressed stream, but
storage receives the contract's WAV 48 kHz mono: a person who looks into the directory will find
sound there, not a browser container.

Local free Silero synthesis ships as an **external implementation**
(`external/silero/`): it depends on torch, and that is an environment of about
600 MB, which only those who need it should pay for.

The rules for reading text for synthesis are declared in `src/speech.ts`: Silero
silently skips Latin script, so for it Latin is rewritten
in Cyrillic, while SpeechKit reads it itself. On screen the original spelling
remains in both cases.

They are selected by the name given in the voice data. For a shipped
engine that is its name; for a third-party implementation the name is a path to the program,
and no rules can be found by it, so the voice data may name them directly:

```json
{"engine": "/path/python /path/voice.py", "name": "baya", "rules": "silero"}
```

Changing the engine, voice or tempo invalidates both the sound and the frame cache —
by design: the scene duration is derived from the length of the line.

The draft `stub` voice's `cps` is only an estimate. For a closer draft,
voice one scene with the final voice using `build --only <scene> --keys-only
--voice-json '<voice>'`, divide its spoken-character count by its beats'
`spoken` seconds in the report, and use the result as `cps`. The sound is
cached for the final build.

### SpeechKit access key

The key is read **from the environment** (`CLOUD_KEY`), and if it is not there, from `.env`
in the project root.

Where to get it:

1. In the Yandex Cloud console, create a **service account** in the required folder.
2. Grant it the **`ai.speechkit-tts.user`** role (or higher).
3. Create an **API key** for this account — that is the `CLOUD_KEY`.
4. The folder identifier is **not needed**: with API-key authorisation the service
   uses the service account's folder (verified by a live call).

The `kuznetsov` voice is not listed in the documentation's voice table, but the API
accepts it. The full list was checked by live calls and lives in the shipped
engine.

## An interface snapshot as a page

```bash
npx agentic-screencast snapshot <settings-file.json> [pages-directory]
```

A page of a running application is saved via the Chromium debugging protocol
as MHTML and then used as an ordinary scene page. This is done
because the interface is rendered on the client: a page saved the usual way
would, when opened from a file, run its script again, the requests would go
nowhere, and the frame would show an empty screen.

**The page contract.** The tool needs one file per scene —
a self-contained page whose scripts **do not run** when it is opened
(MHTML satisfies this). Everything else is up to the consumer: capture
with the subcommand below, with your own Playwright script or with anything else. A file
that satisfies the contract fits a `page` scene without the tool's involvement. A consequence you should know: the tool
injects the compositing layer before the document (`addInitScript`), not with a `<script>` tag.

**The subcommand knows nothing about your application.** How to sign in, which cookies
to set, what to wait for, what to click and move — all comes from the settings:

```json
{
  "base": "http://localhost:8080",
  "width": 1920,
  "height": 1080,
  "signIn": {
    "url": "/api/auth/sign-in/email",
    "json": { "email": "${APP_USER}", "password": "${APP_PASS}" },
    "cookies": ["session_token"]
  },
  "cookies": [{ "name": "beta-accepted", "value": "true" }],
  "screens": [
    { "id": "board", "path": "/board", "await": "[data-testid=card]",
      "prep": [{ "zoom": 1.45, "pause": 600 }], "settle": 1500 }
  ]
}
```

| Field | What it sets |
|---|---|
| `signIn` | the whole sign-in request: `url` (absolute or relative to `base`), `method`, `headers`, `json`. Response cookies are carried over to the browser; `cookies` names the needed ones individually, without it all are taken |
| `cookies` | cookies the application expects besides the session: consents, modes, language |
| `screens[].id` | the page file name; it must be unique — settings with two identical ones are rejected, otherwise the second snapshot would overwrite the first |
| `screens[].await` | **a data selector**: waiting by time can catch a loading indicator, and the "frame is not empty" check would come out green on a spinner |
| `prep` | what to do in the live application before the snapshot: `click` (how many times — `times`), `zoom`, `drag`, `inject` (`css`, `js`), `wait` (pause in milliseconds) |
| `prep[].pause` | how long to wait after the action: after `click` 120 ms by default, after `zoom` 400; `inject` has its own pause, `inject.pause`, 300 by default |
| `screens[].settle` | pause before the snapshot itself, in milliseconds: time to finish drawing what cannot be expressed by the wait selector — such as a graph layout or an animation that finishes playing after the data appears |
| `drag` | bring the element `to` into the middle of the frame by dragging the `surface`; `avoid` lists what must not be grabbed — elements that are dragged themselves |

Public pages do not require sign-in — then `signIn` is simply not declared,
and the snapshot is taken as a guest, that is, exactly as an outsider
will see the page.

A string of the form `${NAME}` anywhere in the settings is substituted from the environment
or from the project's `.env`. This way credentials do not lie in the settings file
and do not get into the snapshot: MHTML stores markup, cookies are not written into it.

Magnification is done in the live interface (`prep`), not by stretching the
snapshot: the interface's service labels are 10–12 pixels, and in a
1920×1080 frame they could not be read otherwise.

A ready-page scene is marked with the `page` kind and declares `mustRead` —
the selector of what the line promises to show. The frame is accepted
when everything listed holds:

- `mustRead` is found, fits in the frame **completely** and is readable — font size
  no less than 16 screen pixels with all magnifications taken into account;
- the target does not overflow the frame (the share of the frame taken by the target is no more than 1.15);
- the page itself covers no less than 0.85 of the frame — otherwise it has
  slid corner-first into the frame, and the viewer sees a highlighted corner instead of
  the page;
- the target takes no less than 0.002 of the frame — a target degenerated into a point
  cannot be shown;
- if the magnification is greater than one, the target **without** magnification takes
  less than half of the frame: otherwise the whole layout would be declared the target
  and there would be nothing to zoom into. At scale one this rule does not apply —
  an honest "whole page" frame must not be forbidden by it.

There is no unconditional requirement "the target takes half of the frame": it
is contradictory for wide thin targets. A list row is four
percent of the frame, and a requirement to take half would force zooming it
so much that what was promised would be cut off by the edge.

## What the tool does not do

It does not decide for the author which story, meaning of an action, fact or voice to show:
live actions are recorded, but checking that the viewer understood them is the agent's job.
