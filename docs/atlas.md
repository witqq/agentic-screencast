# Tools and examples atlas

Generated from the provider registries, accepted field lists and source examples. Run `agentic-screencast atlas --out ./atlas` for local moving previews; `atlas --json` returns the live machine-readable catalog. Development regeneration: `node dist/atlas.js --markdown > docs/atlas.md`. Do not edit the generated tables by hand.

Choose staging with [directing](directing.md) and [combinations](combinations.md), then use this atlas to inspect the implementation. For complete parameter semantics use the listed schema/help route. A technique list is not a recipe quota.

## Material kinds

| Kind | Purpose | Required material | API |
| --- | --- | --- | --- |
| `slides.chapter` | animated opening or chapter with a clear headline and one explanatory sentence | title, body | `schema slides.chapter` |
| `slides.compare` | a comparison in two columns: without and with, «Title (bad\|good\|plain) :: text \| item» | left, right | `schema slides.compare` |
| `slides.chain` | a chain of nodes joined by arrows, with a line about what goes back | nodes | `schema slides.chain` |
| `slides.number` | a large number with its label; several side by side, tags below | values or value | `schema slides.number` |
| `slides.quote` | a verbatim quote of a real answer, in parts «label :: text» | parts | `schema slides.quote` |
| `slides.hero` | opening statement: a headline that rises word by word over a live background, optional picture behind it; fill pours a picture into the letters of the headline | title | `schema slides.hero` |
| `slides.steps` | numbered steps that light up one by one with the narration: «Title :: text \| …» | items | `schema slides.steps` |
| `slides.features` | a grid of two to six capabilities with icons that flip in one by one: «🚀 Title :: text \| …» | items | `schema slides.features` |
| `slides.timeline` | milestones along a line that draws itself: «2024 :: text \| …» | items | `schema slides.timeline` |
| `slides.counter` | figures that roll up like an odometer, a ring for percentages: «1200+ :: label \| 98% :: label» | values or value | `schema slides.counter` |
| `slides.beforeafter` | two states of an interface in one frame: before on the left, after on the right, and a divider that travels across | image, after | `schema slides.beforeafter` |
| `slides.perspective` | a screenshot on a screen in perspective, drawn with WebGL: the camera orbits it, a glint crosses it, a reflection lies below | image | `schema slides.perspective` |
| `slides.parallax` | a screenshot that comes apart into panels at different depths: «x y w h @ depth \| …», the near ones move more | image, panels | `schema slides.parallax` |
| `slides.chart` | a bar or line chart drawn from a CSV «label,value» beside the scenario: bars grow, a line draws itself, the peak lights up; type: race runs a bar chart race over the periods of a CSV «name,2020,2021,…» | data | `schema slides.chart` |
| `slides.code` | code that types itself with syntax colours; from the scenario (code) or a file (file, lines), highlight lines | code or file | `schema slides.code` |
| `slides.photo` | a picture with a slow push-in towards a point (Ken Burns) and an optional caption | image | `schema slides.photo` |
| `slides.shot` | a screenshot inside a browser or phone frame that floats in 3D; a tall screenshot scrolls | image | `schema slides.shot` |
| `slides.marquee` | an endless strip of logos or short labels that runs sideways, one row or two in opposite directions: «🟣 Linear \| 🟢 Notion \| …» — "many use it and the list goes on" | items | `schema slides.marquee` |
| `slides.stack` | a deck of cards: the top one flies off on each beat and the deck springs forward: «Title :: text \| …» — one at a time, the rest waiting | items | `schema slides.stack` |
| `slides.orbit` | icons circling the product on one or two orbits around the centre (kicker and title in the middle): «🟣 Linear \| 🟢 Notion \| …» — integrations, an ecosystem | items | `schema slides.orbit` |
| `slides.chat` | a conversation that writes itself: bubbles pop in turn, before each answer the assistant shows «Thinking…» with a sheen running over it and skeleton bars: «you :: question \| bot :: answer \| …» | items | `schema slides.chat` |
| `slides.carousel` | cards standing in a real 3D ring that turns to bring the next card forward on each beat: «🚀 Title :: text \| …» — a whole set with no start or end | items | `schema slides.carousel` |
| `slides.globe` | a WebGL globe of dots that turns; from the first city arcs fly to the others in turn and ping where they land: «Berlin :: 52.5 13.4 \| Tokyo :: 35.7 139.7 \| …» (latitude longitude) | items | `schema slides.globe` |
| `slides.wall` | a wall of screenshots tilted in 3D, its columns sliding past each other with the title over it: «images: a.png \| b.png \| c.png \| …» — the product is big, there are many screens | images | `schema slides.wall` |
| `slides.cloud` | labels or icons on a turning sphere, near ones large and bright, far ones small and dim: «🟣 Linear \| 🟢 Notion \| …» — everything revolves around the product, in depth | items | `schema slides.cloud` |
| `slides.shell` | a terminal that works: commands type themselves after a prompt, a spinner turns, output appears line by line: «$ npm test :: ✔ 302 passed \| …» — a developer product doing real work | items | `schema slides.shell` |
| `slides.layers` | an exploded view of a screenshot: its panels («x y w h @ depth \| …») lift off in 3D, the camera tilts round the stack, and they settle back flat by the end | image, panels | `schema slides.layers` |
| `slides.bento` | a bento grid: cells of different sizes, the first one large and the last ones wide so the grid closes, each tilting in from depth: «🚀 Title :: text \| …» — what matters most gets the most room | items | `schema slides.bento` |
| `slides.card` | a trailer card: one to three words across the whole frame that slam in with a flash, a shake, a sheen over metal letters and rising sparks | title | `schema slides.card` |
| `slides.titlecard` | the film's title: spaced capitals in the theme's accent with a metal sheen, a line above (kicker), a date below (body), a flare across the frame; « / » breaks the title into lines | title | `schema slides.titlecard` |
| `slides.outro` | closing card: headline, one line, a call to action and an address; with image, a short line over the frame of the result | title | `schema slides.outro` |
| `page` | a finished page: a saved interface snapshot or any self-contained HTML, whose own animations run on the scene's clock | page | `schema page` |
| `video` | a finished video file instead of a drawn page: a live take, a screen recording or a supplied clip | file | `schema video` |
| `report` | a page built by agentic-report from Markdown; composition/object/cue actions bind bN anchors to measured narration, a composition target fits its whole stage with a caption lane, and other blocks use data-review-target or section id | report | `schema report` |

## Effect families

| Family | Actual accepted names | API and combinations |
| --- | --- | --- |
| Entrances | `rise`, `word`, `left`, `right`, `pop`, `wipe`, `track`, `line`, `tilt`, `zoom`, `fade`, `spin`, `fly`, `swing`, `jolt`, `flip3d`, `tilt3d`, `mask`, `bounce`, `fan` | enter:; help slides — grouped reveal, then reading |
| Kinetic titles | `rise`, `spin`, `fly`, `slide`, `zoom`, `bounce`, `glitch`, `beat`, `aurora`, `sparkle`, `swarm`, `drop`, `wave`, `split`, `flip`, `blur`, `swirl`, `flap`, `arc` | text: or overlay.titles.style; help text — claim emphasis with a result |
| Backgrounds | `grid`, `aurora`, `waves`, `particles`, `bokeh`, `rays`, `lamp`, `meteors`, `flicker`, `beams`, `warp`, `vortex`, `none` | background:; help slides — subordinate atmosphere |
| Slide camera | `drift`, `push`, `still`, `dolly`, `pan`, `orbit3d`, `handheld` | move:; schema <kind> — supported fields differ by kind |
| Idle motion | `wiggle`, `float`, `jitter`, `pulse` | alive:; help slides — keep it subordinate during reading |
| Entrance curves | `standard`, `emphasized`, `expressive`, `spring`, `bouncy` | ease:; help slides — coordinate groups |
| Group order | `start`, `center`, `edges`, `random` | wave:; help slides — related objects arrive together |
| Transitions | `whip`, `zoom`, `wipe`, `cube`, `flip`, `glitch`, `dip`, `push`, `melt`, `leak`, `clock`, `curl`, `tiles`, `blur`, `mask`, `dots`, `pixelate`, `morph`, `cut` | transition:; help transitions — shared object, direction or deliberate change of topic |

## Overlay families

All overlays share scene time. Targets on pages follow material geometry; frame text is drawn at output size. A real capture is evidence; actions on a saved page are reconstruction. See `help overlay` for numeric limits, anchors and compatibility.

| Family | Recognized keys (constraints in help) | API |
| --- | --- | --- |
| `pointer` | `at`, `x`, `y`, `click`, `magnet`, `drag` | `help overlay` |
| `cards` | `at`, `title`, `body`, `position`, `hold`, `reveal`, `motion`, `from`, `enter`, `exit` | `help overlay` |
| `camera` | `at`, `hold`, `target`, `area`, `scale`, `move`, `return`, `keep`, `shape`, `blur`, `desaturate`, `ring`, `dim`, `pan`, `follow`, `style` | `help overlay` |
| `titles` | `at`, `text`, `style`, `position`, `hold` | `help overlay` |
| `lower` | `at`, `title`, `subtitle`, `side`, `reveal`, `hold` | `help overlay` |
| `callouts` | `at`, `text`, `target`, `area`, `point`, `side`, `hold` | `help overlay` |
| `stickers` | `at`, `emoji`, `image`, `text`, `target`, `area`, `point`, `size`, `motion`, `rotate`, `hold` | `help overlay` |
| `marks` | `at`, `kind`, `target`, `area`, `point`, `from`, `draw`, `color`, `hold` | `help overlay` |
| `glints` | `at`, `target`, `area`, `hold` | `help overlay` |
| `bursts` | `at`, `kind`, `target`, `area`, `point`, `seed`, `count`, `hold` | `help overlay` |
| `loupe` | `at`, `target`, `area`, `point`, `scale`, `size`, `hold`, `place` | `help overlay` |
| `boops` | `at`, `target`, `kind`, `hold` | `help overlay` |
| `pings` | `at`, `target`, `area`, `point`, `hold` | `help overlay` |
| `toasts` | `at`, `title`, `body`, `icon`, `hold` | `help overlay` |
| `ease` | named curve | `help overlay` |
| `actions` | `at`, `target`, `kind`, `class`, `order`, `glide` | `help overlay` |
| `torch` | `at`, `hold`, `size` | `help overlay` |
| `thinking` | `at`, `hold`, `text`, `lines`, `target`, `area`, `point` | `help overlay` |

## Scene fields

| Field | Accepted authoring form |
| --- | --- |
| `title` | text |
| `kicker` | text over the title |
| `body` | text |
| `note` | a line under the slide (compare, chain, quote) or the source of its figures (number, counter, chart); other kinds refuse it |
| `cta` | button text |
| `url` | text |
| `items` | Title :: text \| Title :: text \| …  (features: 🚀 Title :: text) |
| `values` | 1,240 :: label \| 98% :: label |
| `value` | 300 · label |
| `tags` | a \| b \| c |
| `left` | Heading :: item \| item |
| `right` | Heading :: item \| item |
| `nodes` | A \| B (acc) \| C (bad) |
| `back` | text of the return arrow |
| `parts` | Label :: quoted text \| … |
| `at` | moments of the items in order: b2 b3+0.5 4.2s 60% |
| `image` | picture.png (beside the scenario) |
| `after` | picture.png — the «after» state |
| `labels` | Before \| After |
| `split` | 0.8 0.2 — divider from, to |
| `panels` | x y w h @ depth \| … (fractions; depth 1 nearest) |
| `point` | x y (fractions) |
| `push` | 1 1.16 — scale from, to |
| `device` | browser [url] \| phone \| frame |
| `data` | file.csv (label,value per line) |
| `type` | bar \| line \| race (a bar chart race over a CSV «name,period,period,…») |
| `peak` | max \| a row number \| a label |
| `code` | \| then the lines (or file:) |
| `file` | path (code: snippet.ts; video: take.webm) |
| `lines` | 3-14 |
| `highlight` | 5 7-8 |
| `cps` | characters per second, 5–400 (default: typing fits the scene) |
| `name` | tab name (code) or window title (shell) |
| `rows` | 1 \| 2 — rows of a marquee, the second one running the other way |
| `move` | drift \| push \| still \| dolly \| pan \| orbit3d \| handheld |
| `count` | on \| off |
| `background` | grid \| aurora \| waves \| particles \| bokeh \| rays \| lamp \| meteors \| flicker \| beams \| warp \| vortex \| none |
| `text` | kinetic style of the title [and the body]: fly flap … |
| `enter` | how items enter: rise \| left \| pop \| flip3d \| jolt \| tilt3d \| mask \| bounce \| … |
| `alive` | wiggle \| float \| jitter \| pulse — the items' motion after they enter |
| `glow` | border — a light runs round the cards' borders |
| `ease` | standard \| emphasized \| expressive \| spring \| bouncy — the curve of every entrance |
| `wave` | start \| center \| edges \| random — the order items come in |
| `stagger` | seconds between items, 0.03–1.5 |
| `pace` | calm \| brisk \| snap — the scene's tempo: entrances take 1.4×, 0.7× or 0.45× their time |
| `swap` | slide \| morph — how a {a\|b} word in the title changes: rises (default) or flows like a liquid |
| `fill` | picture.png — poured into the letters of the title, drifting inside them |
| `images` | a.png \| b.png \| c.png \| … — three or more screenshots for the wall |
| `map` | globe \| flat — a turning globe (default) or a flat map of dots with the same arcs |
| `spark` | 1 3 2 5 \| 4 3 5 — a small line under each counter value, one series per value |
| `label` | text |
| `report` | page.md — rebuilt by agentic-report; composition cues use measured bN narration anchors; a composition target fits the complete stage with room for captions (help composition) |
| `page` | pages/app.html |
| `pageVertical` | pages/app.vertical.html — replaces page in a vertical build (pageVertical.en for English) |
| `target` | CSS selector the scene frames |
| `mustRead` | CSS selector that must be readable |
| `focus` | CSS selector @ anchor \| … |
| `zoom` | scale, e.g. 1.2 |
| `spotFrom` | seconds when the spot starts |
| `freezeAt` | seconds or @mark |
| `speed` | [{"from":1,"to":2.5,"rate":0.5,"ramp":0.3,"interpolate":true},{"at":4,"hold":2}] — clip seconds or @marks  (help overlay); on slides.marquee, points a second, 20–600 |
| `autoZoom` | true \| {"scale":1.8,"hold":1.2,"size":0.36,"follow":"cursor"}; portrait conversion establishes the full capture before entering the focus path |
| `from` | clip second or @mark where the piece starts |
| `to` | clip second or @mark where the piece ends |
| `fit` | contain (default: the whole clip, bars of the theme's letterbox colour) or cover [x y]: fill the frame, keep the point x y (shares of the clip, 0.5 0.5 = centre) |
| `tail` | seconds after the speech |
| `overlay` | {"cards":[…],"camera":[…],"titles":[…],…}; at is seconds, b2+0.5, b3.end or 40%  (help overlay) |
| `duration` | seconds (a silent scene needs it) |
| `part` | name of the part the scene starts |
| `transition` | kind [seconds], cut, dip [seconds] [colour], push\|whip [seconds] [left\|right\|up\|down], or {"kind","duration","sound","snap","element","color","direction","at"} |
| `fade` | none, seconds, or {"in":…,"out":…}: the fades at the scene's edges (default about 0.3 s each) |
| `align` | top \| center \| bottom \| fill: where a slide's content stands by height (help slides) |
| `speechAt` | seconds from the scene's start where the narration begins (a hit first, the voice after it) |
| `captions` | bottom \| top \| middle \| auto: where this scene's subtitles stand, over captions.position  (help text) |
| `flash` | anchors «b2 \| 1.5s \| m16» or [{"at","length","strength"}]: the frame lights up in the theme's flash colour and dies out  (help overlay) |
| `shake` | anchors «b2 \| 1.5s \| m16» or [{"at","length","strength"}]: the frame jolts and settles  (help overlay) |
| `rgb` | anchors «b2 \| 1.5s \| m16» or [{"at","length","strength"}]: the colour channels split and come back together  (help overlay) |
| `music` | stop [anchor] or {"file","at","from","level","duck","fadeIn","fadeOut"}: a new bed or a music stop from this scene  (help sound) |
| `sfx` | [{"at":"b2","file":"click.wav","gain":-6,"from":0.2,"length":1,"fadeOut":0.2,"duck":12,"duckAll":false}]  (help sound) |
| `spotlight` | selector @ b2 [.. b2.end] \| … or JSON with area, card, slow, scale (1: no push-in), ring, dim  (help overlay) |
| `theme` | name or {"preset":name,"scheme":"light\|dark","--var":value} |
| `stills` | b2+0.3 :: what to check \| 80% \| @done |

## Film fields

| Field | Authoring form |
| --- | --- |
| `voice` | {"engine":"stub\|say\|recorded\|…","name":…,"cps":15} |
| `tail` | seconds after each scene's speech |
| `providers` | {"name":"./provider.js"} |
| `frame` | {"width":1920,"height":1080,"fps":30,"scale":1} |
| `encode` | {"crf":18,"preset":"medium","pix":"yuv420p","audio":"192k"} |
| `theme` | name or {"preset":name,"--var":value} |
| `scheme` | light \| dark — the scheme of every named theme in the film (default: each theme's own) |
| `pronounce` | ru-latin \| ru-abbr \| scenario-relative JSON file \| {"say":{"CanvasStage":"канвас стейдж"}}; schema pronounce describes rules, script --speech previews them |
| `lang` | ru \| en \| … |
| `captions` | {"style":"bar\|subtitle\|karaoke","everywhere":true,"srt":true,"size":1.25,"look":"outline\|plate","position":"bottom\|top\|middle\|auto"} |
| `pip` | {"file":"me.mp4","corner":…,"size":…,"from":…,"to":…} |
| `progress` | {"position":"top\|bottom","parts":true,"label":"edge\|zone"} |
| `music` | {"file":"bed.mp3","level":…,"duck":…,"bpm":…,"offset":…} |
| `sfx` | [{"at":"12.5s"\|"m16","file":"hit.wav"}] |
| `loudness` | LUFS target, -30…-8 |
| `audio` | false — the film without a sound track |
| `flow` | auto — every seam without its own transition gets a connected one (help transitions) |
| `motionBlur` | true \| {"samples":6,"shutter":0.5} |
| `format` | landscape \| vertical \| square |
| `zone` | platform (default: the feed's buttons kept clear, Reels, Shorts, TikTok) \| plain (watched outside a feed: even margins) |
| `look` | name or {"grade","grain","vignette","bars"} |
| `emoji` | {"dir":"emoji"} |

## Complete scenario and template index

These are buildable sources, not prescribed stories. The atlas previews use illustrative fixture material; replace it with inspected evidence in a real film. Report mechanisms need a compiler exposing composition/object/cue.

- [example/agent-video.md](../example/agent-video.md)
- [example/architecture-walkthrough/story.md](../example/architecture-walkthrough/story.md)
- [example/directed-code-execution/story.md](../example/directed-code-execution/story.md)
- [example/directed-compositions/change-event.md](../example/directed-compositions/change-event.md)
- [example/directed-compositions/first-edit.md](../example/directed-compositions/first-edit.md)
- [example/directed-compositions/theme-color.md](../example/directed-compositions/theme-color.md)
- [example/idea-video.md](../example/idea-video.md)
- [example/interface-overview/story.md](../example/interface-overview/story.md)
- [example/kinetic-video.md](../example/kinetic-video.md)
- [example/story.md](../example/story.md)
- [templates/explainer.md](../templates/explainer.md)
- [templates/pitch.md](../templates/pitch.md)
- [templates/product-demo.md](../templates/product-demo.md)
- [templates/reel.md](../templates/reel.md)
- [templates/release.md](../templates/release.md)
- [templates/trailer.md](../templates/trailer.md)

## Operation and capture routes

CLI commands from the actual dispatcher: `help`, `handover`, `atlas`, `craft`, `version`, `script`, `scenes`, `build`, `slides`, `order`, `check`, `verify`, `paths`, `voice-check`, `provider-check`, `record`, `snapshot`, `schema`, `new`, `web`, `lint`, `frames`, `sheet`, `theme`, `voices`.

Help topics: `help video`, `help capture`, `help overlay`, `help themes`, `help slides`, `help vertical`, `help text`, `help transitions`, `help sound`, `help voice`, `help web`, `help knowledge`, `help directing`, `help combinations`, `help atlas`, `help composition`.

Public functions from `agentic-screencast/capture`: `capturePage`, `recordTake`, `trimBlankStart`. Read `help capture` and the [recording contract](reference.md#recording-real-actions); [live-capture.mjs](../example/live-capture.mjs) is the executable capture example. A narrative voice recording and a product screen capture are different inputs.


## Preview and composition limits

The live atlas uses the same slide components and scene layer as rendering, with play, pause and seek. Previews are technique studies. They do not prove a real product works, demonstrate the final narration timing or approve a combination. Use the examples and their READMEs for real capture, Report, portrait framing and complete films.

Transitions need two scenes and some need a named shared element; the atlas provides buildable two-scene scenarios for every accepted kind, including cut and morph. Overlay actions need their target controls; loupe and camera need a meaningful target. Coordinate lead/support/ambient roles rather than disabling existing effects by genre.
