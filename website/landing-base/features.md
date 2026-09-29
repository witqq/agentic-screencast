# Agentic Screencast — every feature and how to show it

This inventory lists every capability of Agentic Screencast. It answers three questions: what the
feature does, what switches it on, and how to show it on screen in a film or on the landing. The
list comes from the tool itself: `agentic-screencast help` and all its topics, `agentic-screencast
schema` (every scene kind and field), the list of commands and the capture API. The script
`check-inventory.mjs` next to this file confirms that every kind, command and field is named here.

The last column says whether the landing of 2026-09-26 (`website/landing/report.md`) shows the
feature:
- **yes** — shown in a clip or described;
- **stale** — shown with an older look or behaviour;
- **text** — mentioned in words only;
- **no** — absent.

Which chapter of the overview film (`website/overview/`) shows each feature, and which clip of it
becomes the landing example, is listed in `clips.md`.

## 1. One scenario file, one build

| Feature | Switched on by | How to show | Landing |
|---|---|---|---|
| One text file makes the whole film: header, scenes, narration as prose | `story.md`; `build` | The file scrolling beside the finished frame it produces (split screen) | yes |
| A beat per paragraph, each with its own take, length and cache key; rewriting one sentence re-renders one beat | prose paragraphs; `build --keys-only` | Edit one sentence, rebuild: the report shows one beat uncached | text |
| Spoken variant of a beat (`~` line): the screen keeps the written text | `~` line | The subtitle shows "API", the voice reads "эй-пи-ай" | no |
| Moments named by the speech (anchors): `b2`, `b2+0.4`, `b2.end`, `40%` — the picture follows the words when the voice changes | `at`, `spotlight`, `overlay` `at`, `stills`, `sfx`, `flash`, `shake`, `data-at` | The same scene built at two paces: cards and push-ins move with the words | no |
| Cache: an unchanged scene is not redrawn, a page's linked images count | automatic | The build log: "taken from the cache" on a rebuild | no |
| One scene alone, the same segment it has in the film | `build --only` | — (a working tool) | no |
| Build report: each scene's start and end, beats, stills, marks, audio, checks, timing; `audit` compares the encoded video and audio lengths and the chapter cues with what the build expected | `<film>.report.json` | The JSON beside the film, its warnings highlighted | no |
| Parse errors name the line and suggest the nearest name ("did you mean «title»?"); a build failure is one line | automatic | A typo in the terminal and the answer | no |
| Long fields over several lines (block, list, JSON) | `code: \|`, `items: \|` | — | no |
| A silent tail after a scene's speech | `tail` (header and scene) | — | no |
| Picture size, frame rate and encoding quality | `frame`, `encode` | — | no |
| Translations in the same file: `title.ru:`, a `[ru]` narration block, `page.ru:`, `file.ru:`, `voice.ru:` | `--lang ru` on build, lint, frames, script, scenes | The same shot in two languages side by side | yes |
| Untranslated visible fields are named | `lint --lang ru` (`untranslated`) | The lint JSON naming a field | text |
| The film's language and reading rules for synthesis | `lang`, `pronounce` | Latin words read correctly by a Russian voice | no |

## 2. Scene kinds

All slides are drawn on the scene's clock: any frame taken alone equals the same frame of the full
build.

| Kind | What it shows | How to show | Landing |
|---|---|---|---|
| `slides.chapter` | opens a film or a part: `kicker`, a typed `title`, `body`; `part` names the part | the start of every chapter of the overview | yes |
| `slides.hero` | a headline rising word by word, `body`, an optional `image` | the overview's opening | yes |
| `slides.steps` | items lit one by one with the narration | "three moves" of making a film | yes |
| `slides.features` | two to six cards flipping in, emoji | the kit in six cards | yes |
| `slides.timeline` | a line that draws itself to each stop | the road from a request to the MP4 | yes |
| `slides.counter` | odometer digits and a % ring (`values`) | 24 font families, 12 transitions, 20 slide kinds | yes |
| `slides.number` | a big `value`, `label`, `tags`; `count` off stops the roll | the −14 LUFS target | text |
| `slides.compare` | two columns (`left`, `right`) sliding in from their sides | an editor timeline vs a scenario file | text |
| `slides.chain` | `nodes` pop, arrows draw; `back` names the loop back | the build pipeline | text |
| `slides.quote` | quotes wiping in | a line from the knowledge base with its source | text |
| `slides.beforeafter` | two states (`image`, `after`) with a travelling divider, `labels`, `split` | a slide before/after `align` or old/new hand-drawn marks | yes |
| `slides.parallax` | `panels` cut from a screenshot at their depth | the frames sheet in depth | yes |
| `slides.perspective` | a screenshot on a WebGL screen: orbit, glint, reflection | the landing page on a screen | yes |
| `slides.chart` | bars grow or a line draws (`type`), the `peak` lights up; data from CSV, `data.ru` | films built per week from a CSV | yes |
| `slides.code` | code typed in place at `cps`, `lines` of a file, `highlight`, a tab `name`; wraps in a vertical frame | the scenario itself being typed | yes |
| `slides.photo` | a slow `push` to a `point` of a photo | a still of a finished film | text |
| `slides.shot` | a screenshot in a browser, phone or plain frame, floating in 3D; a tall one scrolls | the report page scrolling in a browser | text |
| `slides.outro` | the closing card: title, body, button (`cta`), URL | the call to action | yes |
| `slides.card` | a trailer card: one to three words slamming in, flash, shake, sparks | "ONE FILE" in the trailer chapter | text |
| `slides.titlecard` | the film's title in spaced capitals, from a blur, a flare | the overview's title | text |
| `page` | any HTML page: saved, generated, or your own with its animations on the scene clock; `target`, `mustRead`, `zoom`, `spotFrom`, `focus` | a diagram page drawn beat by beat | yes |
| `report` | a report, presentation or landing built by agentic-report from `report`, rebuilt for every scene; the camera frames its sections by id | the landing's own source filmed section by section | no |
| `page` drawing by the narration | `window.renderAt(t)` and `data-at` anchors | a diagram whose boxes appear as they are named | no |
| `video` | a finished clip or a live take: `from`/`to` piece, `fit` contain or cover, `freezeAt`, `duration` | a live take in several scenes | yes |
| Slide options on every kind | `text` (14 phrase styles), `enter` (18 entrances), `move` drift/push/still, `background`, `align`, `at`, `count`, `note` | one slide rebuilt in three styles | text |
| Slides fit themselves, down to 72%; what does not fit is reported (`overflow`) | automatic | the report line for a slide that is too long | no |
| Custom scene kinds from an external provider | `providers` in the header, `provider-check` | — (a developer's feature) | no |

## 3. Live capture of the real product

| Feature | Switched on by | How to show | Landing |
|---|---|---|---|
| A take driven by Playwright locators: click, hover, type, press, drag, range, clickAt | `recordTake`, `capturePage` (`agentic-screencast/capture`) | a real click in a real app | yes |
| A live cursor: curved travel, a lean while moving, the shape of the element under it (arrow, hand, text, grab), dips and bounces on a real pointerdown | automatic in a take | a close-up of the cursor reaching a button | stale |
| Click effect | `click: "ripple" \| "spot" \| "echo"` | three clicks, three effects | no |
| Key caps for keyboard shortcuts | `take.press` (`showKeys`) | ⌘K appearing on screen | text |
| Cards over the live page | `take.card`, `withCard`, `withFocusCard` (reveal, motion) | a card beside the control while the action runs | yes |
| Focus on the live page with a real CSS zoom | `focus`, `unfocus`, `withFocus` | the page keeps working under the zoom | yes |
| Marks: named moments and element rectangles | `take.mark(name[, locator])` → `@name` in the scenario | `freezeAt: @saved`, a mark aimed at `@total` | text |
| Recorded actions and cursor path | the marks file (`path`, `actions`, `rects`) | — (the base for autoZoom) | no |
| autoZoom by actions: close actions share one push-in, typing holds it | `autoZoom: true` or `{hold,size,scale}` | a form filled in with one smooth push-in | stale |
| The zoomed window follows the cursor | `autoZoom: {"follow":"cursor"}`, camera `follow` | a long drag followed by the window | no |
| A sharp phone-sized take | `recordTake({viewport, scale})`; lint `take-small` | a phone layout recorded at 1080×1920 | no |
| The take's theme matches the scene | `recordTake({theme})`; lint `take-theme` | — | no |
| Blank start trimmed, page errors fail the take | `trimStart`; automatic | — | no |
| Interface snapshots as self-contained pages | `agentic-screencast snapshot` | — | no |

## 4. Camera and attention

| Feature | Switched on by | How to show | Landing |
|---|---|---|---|
| Spotlight in one line: push-in, dimming, hold to the end of the beat, travel to the next subject | `spotlight: #a @ b2 \| #b @ b3` | the camera walking a diagram box by box | yes |
| Spotlight options: `until`, `scale`, `shape` circle, `blur`, `desaturate`, `card`, `ring`, `dim`, `keep`, `style` gentle/snappy, `pan`, `slow`/`stop` on video, `el3` on slides, mixed chain | spotlight JSON | the same subject in three looks | text |
| Reading a wide subject: `pan` pushes in until legible and reads along it | `"pan": true` | a long table row read on a phone | no |
| A highlight without a push-in | `"scale": 1` | the whole screen stays, one control lit | no |
| Hand-written camera moves over a page or a clip | `overlay.camera` (area/target, move, hold, return) | — | text |
| Time inside a shot: slow motion, ramps, interpolation, holds | `speed` (`rate`, `ramp`, `interpolate`, `{at,hold}`), `freezeAt` | a result held while the camera pushes in | yes |
| Motion blur on camera moves, holds stay sharp | `motionBlur` | a fast push-in frame, blurred vs sharp | no |
| Device frames for a clip or a screenshot | `device: browser <url> \| phone \| frame` | the same take in a browser, a phone and a plain window | text |
| Hits: a flash of light and a shake | `flash`, `shake` | a trailer card landing | no |
| Loupe: a magnified circle while the camera stands | `overlay.loupe` (`place`) | the peak of a chart magnified | yes |
| Hand-drawn marks: circle passing its start, arrow, underline — tapered pen strokes | `overlay.marks` | a circle drawn around a total | stale |
| Glints and bursts (confetti, sparks, seeded) | `overlay.glints`, `overlay.bursts` | success confetti | yes |
| Vertical reframing: a landscape page or clip cut by a 9:16 window that follows the focus and clicks; a page that cannot be cut names its own portrait layout | `--format vertical`, `pageVertical` | the landscape film and its vertical cut side by side | yes |

## 5. Text on screen

| Feature | Switched on by | How to show | Landing |
|---|---|---|---|
| Captions: bar, subtitle, karaoke with the spoken word lit | `captions: {"style":…}` | the karaoke word following the voice | yes |
| Subtitles everywhere, larger, on a plate, and an `.srt` file | `everywhere`, `size`, `look`, `srt` | — | text |
| Subtitle position: top, middle, bottom, or `auto` — the build picks the emptiest band from the frames | `captions.position`, scene `captions:` | the same scene with subtitles moved off the interface | no |
| Subtitles centred on the frame, even in a platform zone | automatic | — | no |
| Titles: rise, slam, type, split and every phrase style | `overlay.titles` | "Built for speed" slamming in | yes |
| Lower thirds, callouts with an arrow into the subject | `overlay.lower`, `overlay.callouts` | a name plate and a callout on a live take | yes |
| Stickers: emoji, images (GIF and animated PNG play on scene time), text badges | `overlay.stickers` | a rocket on a result | yes |
| Kinetic phrases: 14 styles, every glyph in its final place | slide `text:`, title style | one phrase in several styles | yes |
| Emoji drawn from the bundled Noto set | automatic; `emoji: {"dir":…}` | — | no |
| Progress bar with the part's name; the name reads on a phone (36 px) | `progress: {"parts":true,"label":…}` | the bar and the label across chapters | text |
| Presenter in a circle, shrinking during push-ins | `pip` | the owner's face in the corner | text |

## 6. Transitions

| Feature | Switched on by | How to show | Landing |
|---|---|---|---|
| 12 WebGL transitions between moving frames: dissolve, zoom-blur, whip, wipe, iris, cube, flip, glitch, flash, ripple, dip, push | `transition: <kind> <seconds>` | a montage of all twelve | yes |
| Morph: one element travels to its place in the next scene | `transition: {"kind":"morph","element":…}` | a number flying into a chart | text |
| Hard cut and dip to a colour | `transition: cut`, `dip 0.6 white` | a trailer's cuts | text |
| A scene's own fades | `fade` | — | no |
| A whoosh before the cut and a cut on the music beat | `transition.sound`, `snap: "music"` | cuts landing on the beat | text |

## 7. Sound

| Feature | Switched on by | How to show | Landing |
|---|---|---|---|
| Music ducks under every beat of speech by its measured level | `music` (`level`, `duck`, `fadeIn`, `fadeOut`, `from`) | a waveform: music dips under words | yes |
| A track per part and a music stop before a punchline | scene `music:`, `music: stop b1.end` | a stop-down before the title | no |
| The beat of the music is found by the build | automatic; `bpm`, `offset`, `m16` anchors | — | text |
| Accents that give way only under words | `sfx` (`gain`, `from`, `length`, `fadeOut`, `duck`, `duckAll`) | a hit in a pause at full level | no |
| Narration that starts after a hit | `speechAt` | — | no |
| Loudness: every film with sound at −14 LUFS, true peak under −1 dBTP | automatic; `loudness` | the report's `audio.loudness` | stale |
| A film without a sound track | `audio: false` | — | no |

## 8. Voice

| Feature | Switched on by | How to show | Landing |
|---|---|---|---|
| Free silent drafts of the right length | `engine: stub` | the draft and the final side by side | yes |
| Yandex SpeechKit synthesis | `engine: speechkit` | the engine's voice list and an optional voiced film | no |
| A person reads the beats in a browser UI | `record`, `engine: recorded` | the recording page | yes |
| Local synthesis offline (Piper) and the macOS voice with permission | `engine: piper`, `say` | — | no |
| Your own engine by a contract | any command; `voice-check`, `voices` | — | no |
| Pitch shift without re-synthesis | `voice.pitch` | a lower voice for a trailer | no |
| Measuring the final voice's pace before drafting | `build --only <scene> --keys-only --voice-json` | — | no |

## 9. Look

| Feature | Switched on by | How to show | Landing |
|---|---|---|---|
| Eleven themes styling slides and the overlay together: neutral (the default), frost, midnight, calm-paper, daylight, noir, aurora, ember, blueprint and the genre themes synthwave and blockbuster; one accent each, a quiet second colour | `theme:` | one slide in eleven themes | stale (names nine) |
| A subtitle face chosen per theme, kickers in sentence case, titles never tracked tighter than −0.025em | `--sub-font`, `--sub-weight`, `--kicker-case`, `--kicker-tracking` | the same subtitle in three themes | no |
| A theme from brand colours or a logo | `agentic-screencast theme --from logo.png` | a logo turning into a theme | text |
| A part of the film in another theme | scene `theme:` | a light chapter in a dark film | text |
| 24 bundled font families, Latin and Cyrillic | theme `--display`, `--sans`, `--mono`, `--sub-font` | — | no |
| Film look: grade, vignette, grain, letterbox bars | `look:` | the same frame graded | text |
| Live WebGL backgrounds: grid, aurora, mesh, waves, particles, bokeh; the shipped themes default to a quiet grid or none | theme, slide `background:` | — | yes |
| Every drawn value is a token: a theme is the whole look | the token contract | — | no |

## 10. Vertical and square

| Feature | Switched on by | How to show | Landing |
|---|---|---|---|
| One header line for a 9:16 or 1:1 film at 30 fps | `format: vertical \| square` | the vertical overview | yes |
| Platform safe zone or even margins outside a feed | `zone: platform \| plain` | the zone drawn over a frame | no |
| A landscape scenario made vertical without a rewrite | `build --format vertical` | the two cuts side by side | yes |
| Phone legibility: push-ins fit their subject, text of every focus measured against 48 px, slide lines against 36 px | automatic; report `legibility`, `small` | a label read on a phone | no |
| Phone-paced skeletons | `new <genre> --format vertical` | — | no |

## 11. Checks before and after the build

| Feature | Switched on by | How to show | Landing |
|---|---|---|---|
| Director rules: two-text-layers, overloaded-line, still-scene, long-scene, title-over-interface, first-transition, spotlight-collision, still-hold, page-unmarked, typing-too-fast, take-theme, push-crop, loupe-scale, speed-range, captions-top-progress, take-small, piece-crosses-mark, empty-area, scene-jump, number-source, karaoke-contrast, untranslated | `lint` | the lint JSON next to the fixed scene | text |
| Signs of a template film counted, not failed: hit-outside-trailer, grain, many-sparkles, transition-kinds, decorative-background, placeholder-address, kicker-caps, emoji-icons, same-entrance; four or more — the film is average | `lint` (`cliches`) | a template scenario scoring eight, a considered one zero | no |
| A drawn frame with an empty third is named | `frames` (`empty`) | — | no |
| A frame of every scene without a build, at any moment including a beat | `frames [--at b2+0.5]` | the labelled sheet | yes |
| A contact sheet of a raw clip or the finished film, a frame a second | `sheet` | picking a piece of a take | no |
| Control frames of the finished film with notes | `stills:` (`every 1s`) | the stills folder | no |
| Readability of built pages (body text 4.5:1, title-sized 3:1), element order, reproducibility of the render core | `check`, `order`, `verify` | — | text |
| Build report checks: `overflow`, `cut`, `legibility`, `small`, `pushes`, `loupes`, `captionPlaces`, caption-lines, safe-zone, empty-area, still-stretch, flashing, silent-action, still-in-fade, loop-start | automatic | the report naming a cut line | no |
| Commands print their help (`<command> --help`) | automatic | — | no |
| Scenario inspection | `scenes`, `script`, `schema`, `paths`, `version` | — | no |

## 12. Delivery

| Feature | Switched on by | How to show | Landing |
|---|---|---|---|
| A web package: AV1, VP9, H.264, poster, chapters, seek thumbnails, a checked `<video>` tag | `web` (`--formats`, `--width`, `--quality`, `--mute`, `--poster`, `--chapters`, `--thumbs`) | the file sizes of the three codecs | yes |
| A looping GIF for a README or a chat | `web --gif 2-8` | the GIF itself | no |
| Chapters (WebVTT) and subtitles (SRT) beside the film | automatic with parts; `captions.srt` | — | no |

## 13. The agent's path

| Feature | Switched on by | How to show | Landing |
|---|---|---|---|
| The skill: brief, voice rules, eight steps with a reading map, the owner's agreement before any take, a light single check per step | `skills/agentic-screencast/SKILL.md` | the agent asking three questions, then filming | text |
| A guide to a film that does not look generated: clichés and their cure, type and colour norms | `docs/visual-design.md` | a cliché frame beside its cure | no |
| Genre skeletons: pitch, product-demo, trailer, explainer, release, reel | `new <genre> [--lang] [--format]` | a skeleton built in one command | yes |
| A film checklist with evidence per item | `checklist.md` from `new` | the ticked checklist | no |
| A knowledge base: directing rules, genre playbook, vertical video, visual assets, sound — with sources | `docs/` | see `knowledge.md` | no |
