# Brief: the Agentic Screencast overview film

| Dimension | Answer | Source |
|---|---|---|
| Genre and purpose | A product walkthrough of Agentic Screencast itself: everything the tool can do and everything it knows, told as one film whose chapters stand on their own. Each chapter becomes an example clip on the landing (`website/landing-base/plan.md`). Skeleton: `product-demo`. | owner ("единый большой обзорный ролик … составные части станут примерами для лендоса") |
| Frame and where it is watched | Two builds: landscape 16:9 (`format: landscape`) and vertical 9:16 with even margins (`zone: plain`), because the clips play on a landing page and in messengers, not in a feed. Subtitles at the bottom; `captions: top` or `auto` on scenes where the lower frame carries the subject. | owner (two formats), inferred from the landing use (zone) |
| Length | No limit: completeness first. Each chapter runs as long as its features need, one idea per scene. Estimated on the stub at 15 characters a second: 18.6 min in Russian, 19.7 min in English, 134 scenes. | owner |
| Depth | A shot per capability: every row of `website/landing-base/features.md` gets a scene or a written reason (the capability table below). | owner ("со всеми нашими фичами, знаниями") |
| Narration | Planned final (team lead's decision): `voice: {"engine":"speechkit","name":"filipp"}` and `voice.en: {"engine":"speechkit","name":"john","lang":"en-US"}` — the English voice needs `"lang":"en-US"`, or the engine synthesises it as Russian (`src/voice/builtin.ts`; frictions 10). Drafts on `stub` at the measured pace: filipp reads 12.1 and 11.9 characters a second on c02-anchors and c01-steps2 (`build --only <scene> --keys-only --voice-json`), so the Russian stub runs at `cps: 12`; john reads 15.9 and 15.9, so the English stub runs at `cps: 16`. Reading rules: `pronounce.ru.json`, `pronounce.en.json`. | owner (voices), team lead (voice data, stub pace) |
| Sound | Music bed "Inspired" (Incompetech, CC BY 4.0) under the film; "Exciting Trailer" as the trailer chapter's own bed with a music stop before the title; "Discovery Hit" on the title card; Kenney CC0 accents: a whoosh on every push between chapters, hits on the trailer cards, one confirmation on the confetti. Credits in `assets/CREDITS.md` and on the credits card. | owner (music + accents) |
| Captions | Karaoke subtitles on every scene (`everywhere`) with an `.srt`; the text chapter shows `top` and `auto`. | inferred from the playbook (films are watched muted) |
| Language and pace | Russian original with an English translation in the same scenario (`--lang en`); normal pace. | owner (ru and en) |
| Theme and look | `neutral`, the tool's default, for the film (grey paper, ink, one ochre accent); the trailer chapter in the genre theme `blockbuster`; the look chapter names the default and shows the other ten themes, a brand theme from a logo (`theme --from`, base neutral, one accent) and a film look (on the sample film, not on this one: film craft 63). The sample app is light and quiet so it agrees with the film's theme (film craft 43). | owner (neutral, via the team lead) |
| Transitions | Quiet fades inside chapters; one kind between chapters (`push` with a whoosh, cut on the music beat); the transitions chapter shows all twelve WebGL kinds, a morph, `cut` and `dip`; the trailer uses `cut` and `dip`. | inferred from film craft 52 |
| Material | Live takes of a sample board app built for this film (`app/`, "Пример приложения" / "Sample app" in its header, film craft 2), recorded by `shoot.mjs`; the tool's real surfaces made by `make-material.mjs`: terminal output of real commands, the build report, the frames sheet, the stills, the recording page, the web package and the landing. Diagrams are pages of our own drawn on the narration's anchors. | inferred from the repository |
| Scenario structure | The playbook's product demo: the result first (a live take in the first second), then one path from a request to a checked film, then the capabilities chapter by chapter, then one next step over the result. | inferred from the playbook, "Product demo", and film craft 64–65 |
| Audience | Developers and teams who use coding agents; the landing's visitors. External audience: the clips are shown in the landing's own player. | inferred from the landing |

## The strongest result

An agent turns one text file into a finished, checked film of a real product — and the film follows
directing rules instead of the agent's taste. It gets the opening (`c00-cold`, a live take; then
`c00-file`, the scene's lines beside the frame they made) and the closing shot (`c14-bookend`, the same
split with the next step over it).

## Chapters

Every chapter opens with `part:` on a scene that stands alone, and ends on a scene that closes its
topic, so each can be cut out as a landing clip. Between chapters: `push`.

| # | Chapter (part) | Scenes | ru, s | en, s | Landing section (`plan.md`) |
|---|---|---|---|---|---|
| 0 | Начало / Opening | 4 | 48 | 54 | 1 Hero |
| 1 | Путь / The path | 7 | 88 | 95 | 11 The agent knows the craft |
| 2 | Сценарий / The scenario | 10 | 108 | 120 | 1, 12 (languages) |
| 3 | Живая съёмка / Live capture | 12 | 97 | 101 | 2 A real product |
| 4 | Внимание / Attention | 10 | 91 | 94 | 3 The camera |
| 5 | Слайды / Slides | 7 | 59 | 63 | 4 Slides |
| 6 | Текст / Text | 6 | 53 | 60 | 5 Words on screen |
| 7 | Склейки и звук / Cuts and sound | 19 | 106 | 108 | 6 Cuts, sound |
| 8 | Голос / Voice | 6 | 75 | 79 | 6 … and a voice |
| 9 | Трейлер / A trailer | 10 | 34 | 36 | 7 A trailer, too |
| 10 | Облик / The look | 15 | 89 | 95 | 8 A look |
| 11 | Телефон / Phones | 5 | 55 | 56 | 9 Made for a phone |
| 12 | Проверки / Checks | 6 | 68 | 75 | 10 Checked before you watch |
| 13 | Знания / Knowledge | 7 | 77 | 76 | 11 The agent knows the craft |
| 14 | Выпуск / Delivery | 10 | 71 | 71 | 12 Ready to ship, 13 First film |

Lengths are the stub's estimate at 15 characters a second, before transitions overlap; the final
voice changes them.

## Capability table

Every row of `website/landing-base/features.md`, in its order, with the scene that shows it or the
reason it is left out. Scene ids are the headings of `story.md`.

### 1. One scenario file, one build

| Feature | Scene | Note |
|---|---|---|
| One text file makes the whole film | c00-file, c14-bookend, c02-scene | the scene's own lines beside its frame |
| A beat per paragraph, own take, length, key | c02-beats, c02-pipeline | real keys from `build --keys-only` of the sample film, before and after one sentence is rewritten |
| Spoken variant (`~`) | c02-spoken; used in c07-loud, c08-voices, c11-open, c14-web | |
| Anchors that follow the voice | c02-anchors | the sample scene at 15 and 10 cps, from `--keys-only` |
| Cache | c02-cache | real rebuild output, "взята из кэша" |
| One scene alone (`--only`) | c02-cache | |
| Build report | c12-report | the vertical sample film's report with `legibility` and `cut` |
| Parse errors suggest the nearest name | c02-typo | real `lint` output of a typo |
| Long fields over several lines | c02-scene (`code: \|`) | shown by use, not narrated: a working detail |
| A silent tail (`tail`) | left out | a timing detail with no visible effect of its own |
| Picture size, frame rate, encoding (`frame`, `encode`) | left out | the defaults serve the film; changing them shows nothing a viewer can see |
| Translations in the same file | c02-langs (+ the whole film is bilingual) | the same scene's frame in both languages |
| Untranslated fields are named | c02-untranslated | real `lint --lang en` output |
| `lang`, `pronounce` | c02-spoken (narrated); the film's header uses both | |

### 2. Scene kinds

| Kind | Scene |
|---|---|
| `slides.chapter` | every chapter's first scene; c10 theme montage |
| `slides.hero` | c00-promise, c05-phrase |
| `slides.steps` | c01-steps, c01-steps2, c03-sum, c05-enter, c06-more, c07-music |
| `slides.features` | c00-map, c05-kinds (the one with emoji icons), c08-modes, c13-genres |
| `slides.timeline` | c05-timeline (the tool's releases, from `git tag`) |
| `slides.counter` | c05-count, c13-count |
| `slides.number` | c07-loud (`count: off`) |
| `slides.compare` | c01-draft, c02-spoken, c08-rule, c13-rule |
| `slides.chain` | c02-pipeline |
| `slides.quote` | c13-craft (counter-examples from film craft, marked as a translation) |
| `slides.beforeafter` | c02-langs, c10-look |
| `slides.parallax` | c12-sheet |
| `slides.perspective` | c14-poster (once in the film: film craft 60) |
| `slides.chart` | c05-chart (commits of this repository, `data.en`) |
| `slides.code` | c02-scene, c03-script, c08-pace |
| `slides.photo` | c12-frames |
| `slides.shot` | c14-landing (a tall page scrolling in a browser frame with the real address) |
| `slides.outro` | c14-credits (the credits card), c14-end (`image`: the film ends over the frame of its result, film craft 65) |
| `slides.card` | c09-card1, c09-card2, c09-card3, c09-button |
| `slides.titlecard` | c09-title |
| `page` | every terminal and diagram page; the sample app's report (c04-*) |
| `page` drawing by the narration | c02-anchors, c07-duck, c11-reframe, every terminal page (`data-at`, `renderAt`) |
| `video` | every take scene; `from`/`to` by marks throughout; `freezeAt` c04-freeze |
| Slide options (`text`, `enter`, `move`, `background`, `align`, `at`, `count`, `note`) | c05-open (`scramble`), c05-phrase (`split`), c05-enter (`swing`, `drift`, `fill`, `waves`), c05-timeline (`aurora`), c05-kinds (`flip`), c02-pipeline (`at`), c07-loud (`count`), c05-chart and c13-craft (`note`) |
| Slides fit themselves, `overflow` | c05-timeline (narrated) | the sample film has no overflowing slide to show |
| Custom scene kinds (`providers`, `provider-check`) | left out | a developer's contract with nothing to film; named in the reference |

### 3. Live capture

| Feature | Scene | Note |
|---|---|---|
| A take driven by locators: click, hover, type, press, drag, range | c03-script, c03-type, c03-click, c03-auto (click, type, menu, range, button), c03-follow (drag) | `shoot.mjs` |
| `clickAt`, `click({force})` | left out | the sample has no canvas under a layer; nothing to click through |
| A living cursor with shapes | c03-click (hand), c03-type (text cursor), c03-follow (grab) | |
| Click effects ripple, spot, echo | c03-click (ripple), c03-spot, c03-echo | |
| Key caps | c03-type (Enter), c03-keys (⌘K) | |
| Cards over the live page (`withFocusCard`) | c03-click, c03-card | `take.card` and `withCard` without a focus left out: `withFocusCard` shows the same card beside its control |
| Live focus (`withFocus`) | c03-type | |
| Marks, with rectangles | c03-marks (`"area":"@done"`), c03-card, c04-stop | |
| Recorded actions and cursor path | c03-auto (the base of autoZoom) | |
| autoZoom by actions | c03-auto | |
| The zoomed window follows the cursor | c03-follow | |
| A sharp phone-sized take | c11-phone (432×768 at scale 2.5 → 1080×1920) | |
| The take's theme matches the scene | c10-take (daylight take in a daylight scene); c09 (blockbuster takes) | |
| Blank start trimmed, page errors fail the take | c03-sum (narrated) | nothing visible to film |
| `snapshot` | left out | the sample app is rendered directly as a `page`; a snapshot of it would show the same frame |

### 4. Camera and attention

| Feature | Scene |
|---|---|
| Spotlight chain | c04-chain |
| Spotlight options: `card`, `shape` circle, `blur`, `desaturate`, `scale`, `until`, `ring`, `dim`, `style`, `slow: stop` | c04-chain, c03-card (`until`), c04-stop (`slow: stop`, card), c08-record (`ring: false`, `dim`, `gentle`) |
| `pan` | c04-pan |
| Highlight without push-in (`scale: 1`) | c04-highlight |
| Hand-written camera moves (`overlay.camera`) | c04-freeze |
| Time inside a shot: `speed` with `ramp`, `interpolate`; `freezeAt` | c04-time, c09-world; c04-freeze |
| Motion blur | header `motionBlur: true` (seen on every fast camera move; not narrated) |
| Device frames | c04-frame (`frame`), c11-phone (`phone`), c14-landing (browser with the real address) |
| Hits: `flash`, `shake` | c09-cold, c09-card1–3, c09-climax |
| Loupe | c04-loupe (`place: beside`) |
| Hand-drawn marks | c04-marks (circle, arrow, underline), c03-marks (on a take) |
| Glints and bursts | c04-marks (one moment of good news) |
| Vertical reframing | c11-reframe (real frames of the sample film in both formats) |

### 5. Text on screen

| Feature | Scene | Note |
|---|---|---|
| Captions: karaoke | every scene; c06-open narrates it | `bar` and `subtitle` left out: one caption style per film |
| `everywhere`, `size`, `look`, `srt` | header (`everywhere`, `srt`); c06-more (size, plate, SRT named) | a larger size or a plate would change the whole film's captions |
| Position top, middle, bottom, auto | c06-top (`top`), c06-auto and the report scenes (`auto`) | `middle` left out: no scene of this film has an empty middle |
| Subtitles centred, even in a platform zone | the vertical build (lead's step) | |
| Titles | c06-title (`slam`) | |
| Lower thirds, callouts | c06-labels | |
| Stickers: emoji, image, GIF, badge | c06-labels (animated Noto GIF, text badge), c07 montage badges | |
| Kinetic phrases | c05-phrase, c05-open | |
| Emoji from the bundled Noto set | c05-kinds | |
| Progress bar with parts | the whole film; c06-more narrates it | |
| Presenter circle (`pip`) | left out, named in c06-more | no presenter recording exists, and a stand-in face would be dishonest |

### 6. Transitions

| Feature | Scene |
|---|---|
| 12 WebGL transitions | c07-t01 … c07-t12 (zoom-blur, whip, wipe, iris, cube, flip, glitch, flash, ripple, dissolve, dip, push) |
| Morph | c07-morph (the velocity card into its own page) |
| Hard cut, dip to a colour | c07-cut, c07-dip; c09 (cut, dip to black) |
| A scene's own fades | every scene inside a chapter; c09-button (`fade`) |
| Whoosh before the cut, cut on the music beat | every push between chapters (`sound`, `snap: music`), c07-t07 |

### 7. Sound

| Feature | Scene | Note |
|---|---|---|
| Music ducks under speech | header music; c07-duck (a diagram of the rule, labelled "схема") | the stub draft is ducked as if a voice spoke |
| A track per part and a music stop | c09-cold (trailer bed), c09-climax (`music: stop`), c10-open (the film bed back from 95 s) | |
| Beat detection | chapter pushes with `snap: music`; c07-music narrates it | |
| Accents that give way under words | c07-music (a hit before the voice), c04-marks, c09 | |
| `speechAt` | c07-music, c09-world, c09-show | |
| Loudness −14 LUFS | c07-loud | |
| A film without a sound track (`audio: false`) | c07-loud (narrated) | this film has sound |

### 8. Voice

| Feature | Scene | Note |
|---|---|---|
| Free silent drafts | c01-draft | |
| SpeechKit | c08-modes, c08-voices (real `voices` output) | the film's final narration |
| Recording page, `recorded` | c08-record (a real take of `record` on this film) | nothing is recorded in the take |
| Piper, `say` with permission | c08-modes, c08-rule | |
| Own engine by a contract, `voice-check` | c08-modes (narrated) | `voice-check` needs an engine to check; nothing to film |
| `pitch` | c08-pace | |
| Measuring the pace | c08-pace | the command is shown, not run (paid synthesis) |

### 9. Look

| Feature | Scene |
|---|---|
| Eleven themes, neutral by default | c10-open (neutral named; the whole film wears it), c10-frost … c10-blockbuster (the other ten, the two genre themes labelled) |
| Theme from a logo | c10-brand (real `theme --from` output), c10-branded (the theme it printed) |
| A part in another theme | c09 (blockbuster), c10 montage, c10-take (daylight) |
| 24 font families, a subtitle face per theme | c10-frost (narrated), the font pair on every theme slide |
| Film look | c10-look (the sample film without and with `look: trailer`) |
| Live WebGL backgrounds | c05-enter (`background: waves`, the one scene where the background is the subject); the theme's own background elsewhere |
| Every value is a token | c10-open (narrated) |

### 10. Vertical and square

| Feature | Scene | Note |
|---|---|---|
| `format: vertical` | c11-open, c11-phone | the film itself is built vertical by the lead |
| `zone: platform \| plain` | c11-zones (numbers from `src/format.ts`) | |
| A landscape scenario made vertical | c11-reframe | |
| Phone legibility (`legibility`, `small`, `cut`) | c11-legible, c12-report | real warnings of the vertical sample film |
| Phone-paced skeletons (`new --format vertical`) | left out | named in the help; `new` itself is shown in c01-new |
| Square | left out | the brief asks for landscape and vertical only |

### 11. Checks

| Feature | Scene | Note |
|---|---|---|
| Director rules (`lint`) | c12-lint (seven rule ids on a flawed scenario, then this film clean) | |
| `frames` | c12-frames (the sheet of this film) | |
| `sheet` | c12-sheet (the board take) | |
| Stills | c12-stills (the sample film's control frames with their notes) | |
| `check`, `order`, `verify` | left out | internal checks of pages and the render core with no frame of their own |
| Build report checks | c12-report | |
| `--help`, `scenes`, `script`, `schema`, `paths`, `version` | left out | inspection commands for the agent, nothing a viewer needs |

### 12. Delivery

| Feature | Scene |
|---|---|
| Web package with checks | c14-web (real output), c14-poster |
| GIF | c14-gif (the GIF the command made) |
| Chapters (WebVTT) and SRT | c14-files (the sample film's files) |

### 13. The agent's path and the knowledge base

| Feature or document | Scene |
|---|---|
| The skill: brief, voice rules, steps | c01-open, c01-brief, c01-steps, c01-steps2, c08-rule |
| Genre skeletons (`new`) | c01-new, c13-genres |
| The checklist | c01-checklist (this film's checklist) |
| Film craft (65 rules) | c13-count, c13-craft, c13-rule |
| Scenario playbook (79 sources) | c13-count, c13-genres |
| Vertical-video guide (64 sources) | c13-count, c11-zones, c11-legible |
| Visual assets and sound guides | c13-credits |
| Visual-design guide | c13-look (the signs of a template and their cure, lint's count); c01-steps2 (the look-review step) |

The count of directing rules on screen (c13-count) is 65: film craft numbers its rules 1–66 and keeps
rule 20 in `CONTRIBUTING.md` (`grep -c "^## [0-9]" docs/film-craft.md` → 65, checked 2026-09-27).
The landing base still says 56 (`knowledge.md`, `plan.md`) and needs the same update.

## Narration

The narration was written as one continuous text chapter by chapter and cut into beats afterwards;
`story.md` holds it, and `agentic-screencast script --source story.md` (and `--lang en`) prints it as
one text. Every factual clause was checked against the code, the help or the output it shows
(film craft 56): the counts (20 kinds, 14 phrase styles, 18 entrances, 6 backgrounds, 12 transitions,
11 themes, 24 font families, 20 lint rules, nine skill steps, 65 film-craft rules, 79 and 64 sources) against `help` and the documents; the
zone margins against `src/format.ts`; the ducking and loudness against `help sound`; every terminal
line against the command that printed it (`make-material.mjs`).

## Decisions taken without the owner

- the chapter order and the sample board app for live capture (`app/`, labelled as a sample);
- `zone: plain` for the vertical build;
- `push` as the one transition between chapters;
- the music beds ("Inspired", "Exciting Trailer") and the Kenney accents;
- the film look is shown on the sample film, not on this film (film craft 63);
- `captions: auto` on the report-page scenes;
- the stub pace follows the measured voices: 12 cps in Russian, 16 in English;
- the sample app was restyled from a night palette to a light one when the film moved to `neutral`;
- the two signs `lint` still counts are decisions: `transition-kinds` (the transitions chapter shows
  all twelve kinds, by the brief; between chapters only `push`) and `emoji-icons` (`c05-kinds`, the
  scene that shows the emoji feature itself);
- `c09-button` keeps a sparse trailer-card frame under its two words; the trailer's cards are one
  to three words by genre, so judge their rhythm visually.

## The vertical cut

The landscape pages stay; for the vertical build every terminal page (`c01-new`, `c02-cache`,
`c02-untranslated`, `c02-typo`, `c08-voices`, `c10-brand`, `c11-legible`, `c12-lint`, `c12-report`,
`c14-web`) and every wide diagram (`c02-anchors`, `c07-duck`, `c02-beats`, `c01-checklist`,
`c12-stills`, `c14-files`, `c11-reframe`) carries a `spotlight` with `pan` along its text on every
beat, and `c11-zones`, `c13-credits` and `c14-ask` a `focus` per beat, so the 9:16 window reads the
text instead of cutting it (checked on single-scene vertical builds of `c01-new`, `c02-anchors` and
`c01-checklist`: the window travels along the lines; the build still reports text of 42–43 px against
the 48 px floor there). In landscape the pan stays near the whole page.

Not suited for vertical clips, because their point is two things side by side or a dense grid of small
text that a 9:16 window cannot hold: `c00-file` and `c14-bookend` (the scenario beside its frame),
`c01-brief` (three columns of options), `c13-credits` (the licence list is small text), `c12-stills`
(four stills side by side). The vertical landing clips of chapters 0, 1, 12, 13 and 14 should be cut
around them.
