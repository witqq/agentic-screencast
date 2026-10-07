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

- [ ] Takes recorded with `recordTake` in their scene's theme and scheme, each with its `.marks.json` and its
      frame budget, by a script that still runs from its folder (the build re-runs it for a sharp
      push-in); downloaded files credited.

## 5. Scenario

- [ ] `agentic-screencast lint story.md` (and `--lang`, `--format` for each built format) is clean; each sign in its `cliches` is a
      decision you can name; scenes with a moment that must be right have `stills:`.
- [ ] Motion is decided per scene (docs/motion-design.md), starting from the composition recipe the
      playbook's Motion paragraph names for the genre: each scene's key element lands last, groups
      start together, one lead movement at a time, every transition states how its two scenes relate,
      and no long frame stands dead. Interface scenes establish the complete screen before details in every format; mechanisms use a visible change and a ready composition (docs/directed-scenes.md).

## 6. Draft

- [ ] Built on `stub` at the chosen `cps`; inspect `frames` for readable video subtitles and the
      rhythm of sparse trailer cards; the report's `warnings` are empty or each is explained (`caption-lines`, `safe-zone`, `empty-area`, `still-stretch`, `silent-action`, `still-in-fade`, `still-note` and the rest name their film-craft rule); each still opened and compared with its note;
      the stills match their notes; the owner has seen the draft and their remarks are fixed.

## 7. Final

- [ ] Built with the chosen voice, music and look (variants in parallel); its stills and report checked
      once; `audit.issues` empty or every finding resolved, chapters match the authored parts, and
      the MP4 watched for framing, captions and actual cursor/camera movement. Check that the named
      subject stays visible through each move and that narrated actions occur in the intended order
      relative to speech; write `n/a:` with a reason when a film has no such action. For report
      scenes, verify the camera's `target` against the rebuilt original page. With measurable
      sound, final AAC true peak is at most
      −1 dBTP and achieved loudness is read from `audio.loudness.measured` (peak correction can put it
      below the target); silence has a null peak and `audio: false` has no sound measurement.

## 8. Handoff

- [ ] `agentic-screencast handover` passed with a non-empty MP4 and its full-film report
      (not `build --only`), or each failing check is named to the owner; the MP4
      (and `web` output for a page) is with the owner, with the credits the licences ask for and the
      decisions taken without the owner named.

## Techniques — the menu, pick what serves the film

- Spotlight: push-in, dim, circle, blur, desaturate, card, slow or stop, a film push-in without a frame (`ring: false`, `dim`) — `spotlight`, `help overlay`
- Camera moves by hand, their pace (`style`), motion blur — `overlay.camera`, `motionBlur`, `help overlay`
- Retiming a clip: slow motion (drawn frames, a speed ramp), stopped time — `speed` with `interpolate`, `ramp`, `hold`, `help overlay`
- Trimming a take or a downloaded clip into several scenes — video `from` / `to` with `@marks`, `agentic-screencast sheet` to pick the pieces, `help capture`
- A clip of another shape filling the frame — video `fit: cover [x y]`, `agentic-screencast schema video`
- Freezing a real frame — `freezeAt`, `help overlay`
- Loupe over a detail — `overlay.loupe`, `help text`
- Hand-drawn marks, glints, bursts; on a take aimed at a recorded element (`"area":"@name"`) — `overlay.marks`, `glints`, `bursts`, `help text`
- Impacts: a flash of light, a camera shake, the colour channels splitting — `flash`, `shake`, `rgb`, `help overlay`
- Cards (corner, near the focus, flying in) — `overlay.cards`, spotlight `card`, `help overlay`
- Titles, lower thirds, callouts, stickers (emoji, image, GIF, badge) — `overlay.titles`, `lower`, `callouts`, `stickers`, `help text`
- Kinetic text on slides and titles (glitch, beat, aurora, sparkle, swarm, split-flap, arc and more; fast styles smear along their path), a word marked, circled or struck out in a title, a liquid word swap, a picture in the letters — `text:`, `style`, `reveal`, `==word==`, `swap`, `fill`, `help slides`
- Slide kinds: chapter, compare, chain, number, quote, hero, steps, features, timeline, counter, chart, beforeafter, parallax, perspective, code, photo, shot, outro, card, titlecard, wall, cloud, shell — `slides.<kind>`, `agentic-screencast schema <kind>`
- Item entrances, content placement by height, camera drift, live backgrounds — `enter`, `align`, `move`, `background`, `help slides`
- Live capture: clicks (and their effect), typing, keys, ranges, drags, cards, focus during the take, clicks through a layer — `recordTake`, `take.*`, `help capture`
- Zoom to actions and follow the cursor, device frame — `autoZoom` with `follow` (`help capture`), `device` (`help slides`)
- Saved pages and interface snapshots — `page`, `agentic-screencast snapshot`, `help video`
- Reports rebuilt from original Markdown: ready diagram-code, pipeline, before-after, overview-detail and ownership compositions; reveal/focus/connect/copy/transfer/replace/compare/camera cues on measured speech — `report`, `target`, `help composition`, docs/directed-scenes.md
- Transitions: WebGL kinds, shared-element morph, hard cut, dip into a colour, push or whip with a direction, zoom into an element, a mask out of an element or a glowing circle from a point, a page curl, a light leak that keeps the length, a scene's own fades — `transition`, `fade`, `help transitions`
- A continuous film: every seam connected instead of fades — `flow: auto`, `help transitions`, docs/motion-design.md "A continuous film"
- Camera and life on slides: dolly, pan, 3D orbit, hand-held camera; living, jolting, bouncing, fanning and 3D entrances with motion blur; waves, stagger, curves and the scene's pace; a light on the border; hits on music beats — `move`, `alive`, `enter`, `wave`, `stagger`, `ease`, `pace`, `glow`, `flash`/`shake`/`rgb` with `m16`, `help slides`
- Captions: bottom plate, subtitles or karaoke, outline or plate look, size, `.srt`, at the top or in the middle where the lower frame carries the subject — `captions` (header and scene), `help text`
- Progress bar with parts, presenter in a circle — `progress`, `pip`, `help text`
- Living kinds and effects: strip, deck, orbit, icon cloud, chat, 3D ring, globe or flat map, working terminal, wall of screens, exploded view, bento grid, bar chart race, sparklines, a line drawing itself, a beam running along a link, rotating word, toasts, boops, pings — `slides.marquee`, `slides.stack`, `slides.orbit`, `slides.cloud`, `slides.chat`, `slides.carousel`, `slides.globe`, `slides.shell`, `slides.wall`, `slides.layers`, `slides.bento`, `type: race`, `spark`, `data-draw`, `data-beam`, `overlay.toasts`, `overlay.boops`, `overlay.pings`, `help slides`, docs/motion-design.md
- The page answering the pointer: a toggle, a tab, a menu, a reorder gliding into place, a drag, a magnet before the press, "AI is thinking" over the answer's place, a torch following the cursor — `overlay.actions`, pointer `magnet` and `drag`, `overlay.thinking`, `overlay.torch`, `help overlay`
- Composition recipes: the opening, an AI answer, a setting that changes the product, the proving number, an ecosystem, a developer tool, the trailer hook, what is new — docs/motion-design.md "Composition recipes"
- Theme with its fonts and its light or dark scheme, a scene in another theme, brand theme, film look — `theme`, `scheme`, `theme --from`, `look`, `help themes`
- Music, a track per part or a music stop, accents (a hit before the voice: `speechAt`), loudness, a film without sound — `music` (header and scene), `sfx`, `loudness`, `audio: false`, `help sound`
- Voice agreed with the owner (or settled by the request): an engine built into the tool, the owner's own voice, or silent; drafts on `stub`; a system voice (`say`) only with the owner's explicit permission — `voice`, `agentic-screencast record`, `help voice`, skill section Voice
- Whole interface first, then a detail with known location in every format; automatic portrait overview for pages and capture takes — `help composition`, example/interface-overview
- Vertical and square films: choose margins for where the film is watched; reflow a `page` with `pageVertical` or use `pan` along a wide subject, then inspect the final phone frame for key UI at 48 px or more and subtitles clear of it (`legibility` in the build report) — `format`, `zone`, `--format`, `help vertical`, `docs/vertical-video.md`
- Several languages — `.ru` fields, `[ru]` blocks, `--lang`, `help vertical`
- Control frames — `stills`, `help vertical`
- Web page output, a GIF for a README or chat — `agentic-screencast web` (`--gif`), `help web`

## Film-craft rules — consult; the ones this film leans on are named in `brief.md`

<!-- film-craft rules -->
