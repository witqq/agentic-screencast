# Film checklist

`agentic-screencast new` puts this file next to the scenario. It is short on purpose: one box per
step, each closed once with its evidence (a file, a frame, a number) or `n/a:` and why. The film is
handed over when `grep -c "\- \[ \]" checklist.md` prints 0. Below the boxes are the menu of
techniques and the film-craft rules — lists to consult, not boxes to fill.

## 1. Brief — `brief.md`

- [x] Every dimension of the brief has an answer and its source (owner, inferred from …, default); the
      audience is named. — brief.md, one row per dimension with its source.

## 2. Evidence

- [x] The capability table (or, for a film without a product, the material table with licences): every
      line has a scene or a reason to leave it out; the strongest result gets the strongest shot. — brief.md: every row of website/landing-base/features.md has a scene or a reason.

## 3. Story and the owner's agreement

- [x] The narration is one continuous text, read aloud: the claim in the first seconds, one next step
      at the end; film craft and the playbook's genre section read.
- [x] The owner agreed the outline — chapters, what each scene shows, which interfaces — before any
      capture or build (evidence: their answer). — story.md, 134 scenes in 15 parts, ru and en. — n/a: the owner set the brief (ru and en, SpeechKit filipp and john, music and accents, neutral) on 2026-09-27, but the outline itself was not sent for agreement: the rule came into the skill while this film was being built.

## 4. Material

- [x] Takes recorded with `recordTake` in their scene's theme, each with its `.marks.json` and its
      frame budget; downloaded files credited. — shoot.mjs, captures/*.webm with .marks.json, 13–21 unique frames a second in motion; credits in assets/CREDITS.md.

## 5. Scenario

- [x] `agentic-screencast lint story.md` (and `--lang`) is clean; each sign in its `cliches` is a
      decision you can name; scenes with a moment that must be right have `stills:`. — findings 0 in ru, en and both with --format vertical; cliches 2, named in brief.md.

## 6. Draft

- [x] Built on `stub` at the measured `cps`; the report has no `overflow`, `cut` or unexplained
      warning; the stills match their notes; the owner has seen the draft and their remarks are fixed. — drafts at cps 12 (ru) and 16 (en), measured on SpeechKit.

## 7. Final

- [x] Built with the chosen voice, music and look (variants in parallel); its stills and report checked
      once; loudness within 1 LU of its target. — out/final.{ru,en}.{landscape,vertical}.mp4, video length = audio length, 15 chapters, −14.03 LUFS.

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
- Vertical and square films: choose margins for where the film is watched; reflow a `page` with `pageVertical` or use `pan` along a wide subject, then inspect the final phone frame for key UI at 48 px or more and subtitles clear of it (`legibility` in the build report) — `format`, `zone`, `--format`, `help vertical`, `docs/vertical-video.md`
- Several languages — `.ru` fields, `[ru]` blocks, `--lang`, `help vertical`
- Control frames — `stills`, `help vertical`
- Web page output, a GIF for a README or chat — `agentic-screencast web` (`--gif`), `help web`

## Film-craft rules — consult; the ones this film leans on are named in `brief.md`

- 1. The genre: a short film, not a screen recording
- 2. The subject comes from the source, never from imagination
- 3. Parts follow a meaningful order, each returning to the overview
- 4. Narration is one continuous text, cut afterwards
- 5. One text layer at a time
- 6. A caption must not cover what it describes
- 7. The camera has a small, constant vocabulary
- 8. Freezing alone is not a rhythm
- 9. Nothing in frame stands still
- 10. The look is a named theme, not a pile of hand-set variables
- 11. Cover the inventory, not the convenient parts
- 12. Show what it holds under load
- 13. The animation being filmed must itself be worth filming
- 14. Verify by measurement, not impression
- 15. Ask before building
- 16. A caption must say what is on screen right now
- 17. Stop time inside the shot, do not cut to a still
- 18. Dimming is the point of a highlight
- 19. Screen recording has its own frame budget — measure it
- 21. Film a live application in ONE unbroken take
- 22. Time marks must come from the recording, not from the wall clock
- 23. When debug chrome is to be hidden, hide it AFTER it exists, and verify it is gone
- 24. A card arrives as an object, not as a sticker
- 25. A video scene with speech is cut to the speech, not to the clip
- 26. Requirements come from the owner, not from the agent's taste
- 27. Take stock of the products and the showcases before writing a scenario
- 28. One chapter, one document
- 29. Fail the shoot on a page error
- 30. The tool's demo assets are not product footage
- 31. After the build, check every caption against its frame
- 32. Everything drawn wears the theme — and so does a live take
- 33. An attention tool shows the whole subject
- 34. Nothing covers the line of speech
- 35. Two subtitle lines, measured in every language and format
- 36. Frame-anchored text shares one step
- 37. Name the moments to check in the scenario
- 38. A change of look rebuilds what the look is baked into
- 39. The sheet you look at must not hide what you look at
- 40. The strongest result gets the strongest shot
- 41. The inventory serves the story, not the other way round
- 42. Stage the feature in content that looks like real use
- 43. The filmed material is designed too
- 44. Captions and cards speak in a trailer's voice
- 45. Vary the camera; one repeated move is a tic
- 46. Keep the picture sharp: record big, encode once
- 47. Every remark stays on a list until the frames show it fixed
- 48. When cuts keep failing, rethink the concept
- 49. The quality bar depends on the audience
- 50. Camera moves need time — lint estimates it, the build measures it
- 51. Subtitles: readable first, big enough, one accent at most
- 52. Transitions: one or two kinds, chosen for the film
- 53. Move the subtitles, never pad the content
- 54. Cut a piece from mark to mark
- 55. A three-second probe take before the whole take
- 56. Every factual clause of the narration is checked against its source
- 57. Review at the size the viewer sees, and between the stills
- 58. One subject per frame, large, in every format
- 59. An entrance serves reading
- 60. A real interface stays flat; the camera goes from the whole to the detail
- 61. A sound accent follows the law of a colour accent
- 62. The subtitle face is chosen, and the word lights by colour only
- 63. The film look and the effects are the trailer's tools
- 64. The first three seconds show the product
- 65. The film ends on its result
- 66. Motion the viewer cannot stop is one and quiet
