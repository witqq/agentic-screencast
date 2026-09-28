# Frictions met while making the overview film

Every place where the skill, the help or the knowledge base did not lead the agent that wrote this
film, or where the tool misbehaved, with the command and what it printed. Written during steps 2–5
of the skill (evidence, story, material, scenario) on 2026-09-27.

## The tool misbehaved

1. **`pronounce: file.json` without quotes crashes lint with a Node stack.** The header value is
   passed to `JSON.parse`, so a bare name is a `SyntaxError` with a stack trace instead of a parse
   error with the line: `lint story.md` →
   `SyntaxError: Unexpected token 'p', "pronounce.ru.json" is not valid JSON at parseSource (dist/source.js:770)`.
   The reference shows `pronounce: "ru-latin"` with quotes, but nothing says the quotes are required,
   and every other header field takes a bare value.
2. **`record` cannot open while a scene of the scenario needs the take being recorded.** The
   recording page parses the whole film strictly, so the scene that shows the recording page itself
   (`c08-record`, `from: @start`) makes `record` exit: `SourceError: строка 1115: scene c08-record
   from: unknown mark @start; known: no .marks.json beside the clip`. It also generates every slide,
   so a missing image anywhere stops it (`scene c02-langs: image not found`). `shoot.mjs` works around
   it with a copy of the scenario without that scene, and placeholder images seeded before the first
   `frames` run.
3. **`frames` reuses a slide generated with an image that was replaced in the same run.** After
   `frames --scene c03-click --out assets/gen/lang.ru.png`, the sheet drawn next still showed the
   placeholder in `c02-langs` (the scene whose `after:` image was regenerated later in the loop). A
   second `frames` run showed the new image. Help says a replaced picture rebuilds the scene; in one
   process it did not, or the order was the cause — not isolated further.
4. **`lint`'s `still-scene` reads only the page file.** A page whose animation lives in a linked
   script (`<script src="kit.js">` defining `window.renderAt`) is called still:
   `c12-lint still-scene the page stands still for 13.4s` until the page itself contained
   `data-type=`. The film's pages carry an inline `@keyframes` so the check sees them.
5. **`lint --format vertical` does not change `overloaded-line`.** The rule uses 84 characters a
   line (`src/lint.ts`, `LINE = 84`) in every format, while film craft 35 says a vertical line holds
   about a quarter of a landscape one; the vertical lint of this film is clean with beats of up to
   ~165 characters. The build cuts subtitles into two-line pieces, so this is a gap in the estimate,
   not a broken film.
6. **Mixed languages in one run.** With `AGENTIC_SCREENCAST_LANG=ru` the build prints Russian
   progress but English warnings: `[3/4] report: рисую 98 кадров…` next to
   `scene report: text of #activity is 18.4 px in the frame…`; `lint` findings are English in both
   languages, while a parse error is Russian.
7. **The build report loses a still's mark name.** A still written as `@done :: …` is reported as
   `"moment": "@5.936"` (the resolved clip second), so the report no longer says which mark it was.
8. **`help web` says VP9 sits between AV1 and H.264; on this film it was the largest.** `web
   demo.ru.mp4`: AV1 3.08 MB, H.264 4.54 MB, VP9 5.21 MB (quality high, 17.8 s, 1920×1080).
9. **The tool changed under the film.** During this work another session changed `src/theme.ts`
   (uncommitted, 91 lines), rebuilt `dist/` (for a moment `dist/agentic-screencast.js` did not exist:
   `Cannot find module …/dist/agentic-screencast.js`) and added film-craft rules 58–66 and
   `docs/visual-design.md`. After that every take recorded in `midnight` failed `take-theme`:
   `the take captures/board.ru.webm was recorded in midnight, the scene wears midnight; record it
   again with theme: "midnight"` — the message names the same theme twice, because it compares a hash
   of the tokens. The takes were re-recorded; a later rework of the themes broke them again (33 `take-theme`
   findings in every variant), and a second re-recording cleared them. `shoot.mjs` now records in
   the theme the header names, so once the header's theme is final one run of it clears the rule.

## The skill, help or knowledge base did not lead

10. **SpeechKit's English voice needs `"lang":"en-US"` in the voice data**, and nothing says so. The
    engine sends `lang: voice.lang ?? "ru-RU"` (`src/voice/builtin.ts`), so
    `{"engine":"speechkit","name":"john"}` would synthesise English text as Russian. `help voice`
    and the reference never mention `lang` in the voice data. The final `voice.en` must be
    `{"engine":"speechkit","name":"john","lang":"en-US"}`.
11. **Measuring the final voice's pace costs money, and the brief forbade it.** The skill requires
    measuring the pace before the first draft; an agent told "stub only" has no way to do it. The
    only free evidence was the cache of another film (`cat-trailer-v2`, filipp at speed 0.85): about
    11 characters a second with pauses, so filipp at speed 1 is roughly 13. `help voice` gives a pace
    only for kuznetsov (10 cps). A table of measured paces of the shipped SpeechKit voices would
    settle a draft's length without a paid call.
12. **`help text` names the callout's subject loosely.** "the subject is a CSS target on a page, an
    area [x,y,w,h] or a point [x,y]" reads as if `target` took all three; `"target":[0.15,0.12]` is
    `overlay.callouts[0].target: expected a CSS selector` — the field names are `area` and `point`.
13. **Chains that cannot share a scene are discovered one at a time.** `spotlight` with `"slow"`
    and `speed`, and `autoZoom` with `speed`, are refused in one scene (`autoZoom follows the clip's
    own time and cannot share a scene with speed`). `help overlay` and `help capture` do not say it;
    lint finds the first one only, then the next run finds the next.
14. **`piece-crosses-mark` is satisfied by any mention of the mark in the scene.** The rule looks for
    `@name` anywhere in the block (`src/lint.ts`), so naming an inner moment in a `stills:` note
    clears it. That is the intended use (a scene's own moments), but help says only "a piece of a take
    that runs past a mark the scene does not name"; how to name a mark the scene deliberately spans
    was learned from the code.
15. **Knowledge added in the middle of the work.** Film-craft rules 58–66 and the visual-design guide
    arrived after the story was written. They changed the film: emoji icons removed from three
    feature slides, the invented browser window (`device: browser` without an address) dropped, the
    film look named as a trailer's tool, numbers given a date, the ending moved to the result with the
    next step over it. The skill now reads the guide at step 5; a film already past that step when the
    guide lands has nothing that tells it to go back.
16. **The capture `mark` is async but the help writes it without `await`.** `take.mark("saved")` in
    `help capture`; with a locator the rectangle is measured asynchronously (`mark(name, target?):
    Promise<void>`), so `await` is needed for `"area":"@name"` to be recorded before the next action.

17. **A chapter slide's body lay under the subtitles in the vertical cut with the default zone.**
    `build story.md --format vertical --only c01-open` without a `zone` line: at 5 s the body
    "Скилл ведёт агента по шагам…" and the karaoke line share the same band. With `zone: plain` in
    the header the slide stands above the subtitles. The film now carries `zone: plain` (the brief's
    choice), but the platform zone looks broken for a landscape scenario cut vertically.
18. **A landscape page cannot be made legible in a vertical cut.** A page is rendered at 1920×1080
    and cut by a 9:16 window; a terminal page's lines are cut at both sides
    (`c01-new`: "the frame cuts text of .term … «$ agentic-screencast new product-demo»", 43 px under
    48). A spotlight with `keep` does not help, and there is no per-format page (`page.vertical:`)
    or a signal to the page that the build is vertical, so a responsive layout cannot switch. The
    vertical build of this film will show its terminal and diagram pages cropped; see the handoff.

## Where the film's own design had to go around the tool

19. **Frames of video scenes carry no subtitles in `frames`.** The sheet cannot show whether a
    subtitle covers a take; only the stills of a real build can (step 6).
20. **A slide with eight steps pushes its header out of the frame** (`slides.steps`, eight items):
    the kicker and title disappeared and the last items sat under the subtitles. `slides.timeline`
    with the same eight labels overlapped them into one line. Split into two slides of four.
21. **A four-node `slides.chain` wraps its last node onto a second row** at 1920×1080 with the labels
    Сценарий | Голос | Кадры | MP4. Left as the tool draws it.
22. **Report page scenes and subtitles.** The sample app's report fills the frame to its bottom, so
    bottom subtitles lie over the bars; those scenes use `captions: auto` (film craft 53). `frames`
    draws `auto` scenes at the bottom, so the placement is only visible in the build's stills.
23. **Resolved by the tool change of 2026-09-27 (commit 4d01d1b): features without icons no longer
    number their cards.** Was: **`slides.features` without emoji numbers its cards 01, 02, 03.** After the emoji were removed
    from three feature slides (the visual-design guide calls emoji icons a cliché), the tool drew
    numbered cards instead — the guide's own example of a synonym for the same cliché. There is no
    plain variant without a marker.
24. **Resolved by the tool change of 2026-09-27 (commits 4b925dc, 2ec7bb5): one-accent themes, a
    quiet second colour, `theme --from` without gradients, base neutral.** Was: **What the current themes force on the film** (checked on the frames of 2026-09-27; the themes
    are being reworked). The chapter slides of `midnight` draw a two-colour rule under the title,
    and their title is set in the theme's heavy display weight; `theme --from logo.png` writes
    two-colour gradients into `--sc-cap-bar` and `--sc-card-accent`, so the brand-theme scene
    (`c10-branded`) carries them; `slides.features` without emoji numbers its cards (23). The film's
    own pages no longer hard-code anything: every colour and font in `pages/kit.css` and
    `make-material.mjs` is a theme token (`--bg`, `--ink`, `--body`, `--mut`, `--acc`, `--acc2`,
    `--card`, `--line`, `--code-*`, `--sans`, `--mono`, `--display`, `--display-weight`), so a
    change of the header's theme restyles them. Kickers are written in sentence case in the
    scenario; the trailer's card and title card keep capitals.
25. **Resolved (commit 82e4b15): `help themes` now says pages receive the theme's tokens.** Was:
    **That a page scene receives the theme's tokens is not documented.** `help themes` says "a page
    scene keeps its own HTML"; the stage in fact writes the theme's variables into `:root` of every
    page (`src/browser/stage.ts`, `:root{…}`), which is what lets a page of one's own follow the
    theme. It was found in the code.
26. **A live camera move counts as a navigation.** On the light sample app, `scene-jump` named the
    zoom-out of `take.withFocus` (4.3 s into `c00-cold`) and the opening of the ⌘K palette as "a
    navigation inside the shot" — the dimming around the focus and the palette's scrim change the
    whole frame at once. The fix was to split `withFocus` into `focus` / `unfocus` with a mark
    before each (`@typed`, `@zoomout`, `@keys`, `@go`) and to name those marks in the scenes that span
    them. `withFocus` itself cannot be marked inside, so any take that uses it on a light page will
    meet the rule.
27. **A pan along a text page in the vertical cut still reads 42–43 px.** `spotlight` with
    `pan: true` on `.term pre` or a wide diagram makes the 9:16 window travel along the lines, but the
    build names the text as under the 48 px floor (`c02-anchors`: 42.7 px, `c01-checklist`: 41.6 px);
    a larger `scale` would cut the lines' height. The vertical section of `brief.md` lists the scenes
    kept out of vertical clips.
28. **`frames` names a trailer card's own layout as an empty band.** `c09-button` (`slides.card`,
    two words, blockbuster): "a flat empty band 31% of the frame high". A one-to-three-word card is
    by design mostly empty; the check does not know the genre.
29. **Every picture slide reports an overflow it cannot lose.** A bare `slides.beforeafter` with two
    1920×1080 images and nothing else (`/tmp/ba/s.md`: no kicker, no title, no captions) prints "the
    slide does not fit its area by 16 px of the grid even shrunk to 72%". In the film c02-langs,
    c10-look (beforeafter) and c12-sheet (parallax) report 15 px after their kicker and title were
    removed, with `captions: top`, `align: top`, `align: fill` and a shorter image tried. The
    picture frame is `height:100%` of the field (`.ba-frame`), so the check that now also measures
    width (commit e441229) seems to count the frame against the field. Needs a look in the tool; the
    scenario cannot fix it.

