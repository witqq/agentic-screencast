# Film checklist

`agentic-screencast new` puts this file next to the scenario. It is short on purpose: one box per
step, each closed once with its evidence (a file, a frame, a number) or `n/a:` and why. The film is
handed over when `grep -c "\- \[ \]" checklist.md` prints 0. Below the boxes are the menu of
techniques and the film-craft rules — lists to consult, not boxes to fill.

## 1. Brief — `brief.md`

- [ ] Every dimension of the brief has an answer and its source (owner, inferred from …, default); the
      audience is named.

## 2. Evidence

- [ ] The capability table (or, for a film without a product, the material table with licences): every
      line has a scene or a reason to leave it out; the strongest result gets the strongest shot.

## 3. Story and the owner's agreement

- [ ] The narration is one continuous text, read aloud: the claim in the first seconds, one next step
      at the end; film craft and the playbook's genre section read.
- [ ] The owner agreed the outline — chapters, what each scene shows, which interfaces — before any
      capture or build (evidence: their answer).

## 4. Material

- [ ] Takes recorded with `recordTake` in their scene's theme, each with its `.marks.json` and its
      frame budget; downloaded files credited.

## 5. Scenario

- [ ] `agentic-screencast lint story.md` (and `--lang`) is clean; each sign in its `cliches` is a
      decision you can name; scenes with a moment that must be right have `stills:`.

## 6. Draft

- [ ] Built on `stub` at the chosen `cps`; inspect `frames` for readable video subtitles and the
      rhythm of sparse trailer cards; the report has no `overflow`, `cut` or unexplained warning;
      the stills match their notes; the owner has seen the draft and their remarks are fixed.

## 7. Final

- [ ] Built with the chosen voice, music and look (variants in parallel); its stills and report checked
      once; loudness within 1 LU of its target.

## 8. Handoff

- [ ] The MP4 (and `web` output for a page) is with the owner, with the credits the licences ask for and
      the decisions taken without the owner named.

## Techniques — the menu, pick what serves the film

- Spotlight: push-in, dim, circle, blur, desaturate, card, slow or stop, a film push-in without a frame (`ring: false`, `dim`) — `spotlight`, `help overlay`
- Camera moves by hand, their pace (`style`), motion blur — `overlay.camera`, `motionBlur`, `help overlay`
- Retiming a clip: slow motion (drawn frames, a speed ramp), stopped time — `speed` with `interpolate`, `ramp`, `hold`, `help overlay`
- Trimming a take or a downloaded clip into several scenes — video `from` / `to` with `@marks`, `agentic-screencast sheet` to pick the pieces, `help capture`
- A clip of another shape filling the frame — video `fit: cover [x y]`, `agentic-screencast schema video`
- Freezing a real frame — `freezeAt`, `help overlay`
- Loupe over a detail — `overlay.loupe`, `help text`
- Hand-drawn marks, glints, bursts; on a take aimed at a recorded element (`"area":"@name"`) — `overlay.marks`, `glints`, `bursts`, `help text`
- Impacts: a flash of light, a camera shake — `flash`, `shake`, `help overlay`
- Cards (corner, near the focus, flying in) — `overlay.cards`, spotlight `card`, `help overlay`
- Titles, lower thirds, callouts, stickers (emoji, image, GIF, badge) — `overlay.titles`, `lower`, `callouts`, `stickers`, `help text`
- Kinetic text on slides and titles — `text:`, `style`, `reveal`, `help slides`
- Slide kinds: chapter, compare, chain, number, quote, hero, steps, features, timeline, counter, chart, beforeafter, parallax, perspective, code, photo, shot, outro, card, titlecard — `slides.<kind>`, `agentic-screencast schema <kind>`
- Item entrances, content placement by height, camera drift, live backgrounds — `enter`, `align`, `move`, `background`, `help slides`
- Live capture: clicks (and their effect), typing, keys, ranges, drags, cards, focus during the take, clicks through a layer — `recordTake`, `take.*`, `help capture`
- Zoom to actions and follow the cursor, device frame — `autoZoom` with `follow` (`help capture`), `device` (`help slides`)
- Saved pages and interface snapshots — `page`, `agentic-screencast snapshot`, `help video`
- Transitions: WebGL kinds, shared-element morph, hard cut, dip into a colour, a scene's own fades — `transition`, `fade`, `help transitions`
- Captions: bottom plate, subtitles or karaoke, outline or plate look, size, `.srt`, at the top or in the middle where the lower frame carries the subject — `captions` (header and scene), `help text`
- Progress bar with parts, presenter in a circle — `progress`, `pip`, `help text`
- Theme with its fonts, a scene in another theme, brand theme, film look — `theme`, `theme --from`, `look`, `help themes`
- Music, a track per part or a music stop, accents (a hit before the voice: `speechAt`), loudness, a film without sound — `music` (header and scene), `sfx`, `loudness`, `audio: false`, `help sound`
- Voice agreed with the owner (or settled by the request): an engine built into the tool, the owner's own voice, or silent; drafts on `stub`; a system voice (`say`) only with the owner's explicit permission — `voice`, `agentic-screencast record`, `help voice`, skill section Voice
- Vertical and square films: the feed's margins or even ones by where the film is watched; an architecture or an interface on a phone read at 48 px or more (`legibility` in the build report, `pan` along a wide subject) — `format`, `zone`, `--format`, `help vertical`, `docs/vertical-video.md`
- Several languages — `.ru` fields, `[ru]` blocks, `--lang`, `help vertical`
- Control frames — `stills`, `help vertical`
- Web page output, a GIF for a README or chat — `agentic-screencast web` (`--gif`), `help web`

## Film-craft rules — consult; the ones this film leans on are named in `brief.md`

<!-- film-craft rules -->
