# Film craft: rules and the mistakes that produced them

This is the knowledge base behind [the skill](../skills/agentic-screencast/SKILL.md). Every rule here was paid for: it is followed by the counter-example that made it necessary, taken from real review rounds on a product demo. Read it before writing a scenario — the rules are short, the counter-examples are what make them stick.

## 1. The genre: a short film, not a screen recording

A feature film about a product is watched without sound, without a presenter, and without accompanying notes. It has a theme, a beginning, a middle and an end, and afterwards the viewer knows what appeared and why it matters.

**Counter-example.** The first cut was a pile of inserts — "here is a showcase, here is another showcase" — with drawn before/after cards in between. The reviewer's verdict: *"the process and the through-line are not clear"* and *"I never asked for intermediate slides with cards and the rest."* Only one drawn slide belongs in such a film: the opening poster. Everything else is live product footage with explanations over it.

## 2. The subject comes from the source, never from imagination

Before writing a single line of narration, read what the work actually did: the commits, the ticket, the diff, the product itself. State the subject in the words of that evidence.

**Counter-example.** The scenario claimed *"the animation no longer lives in the demo code — now it lives in the document"*, a before/after story invented out of nothing. The branch had in fact added animation playback to a product that had none at all. The reviewer: *"where does that phrase come from? do you even understand what the task was?"* A whole cut had to be discarded.

## 3. Story shape: missing → appeared → can do → holds → controlled → where to get it

Parts follow in a meaningful order, each one ending with a return to the overview so the next can start clean.

**Counter-example.** Shots were ordered by how convenient they were to record, so capability demos, an admin panel and a diagnostic report alternated with no logic. The viewer could not tell whether the film was still describing the same thing.

## 4. Narration is one continuous text, cut afterwards

Write the whole narration first, in whole sentences that pick each other up by pronoun, conjunction or repeated key word. Only then split it across shots.

**Counter-example.** Captions were composed shot by shot and came out as labels: "Trajectory", "Entry", "Loop closed". The reviewer: *"you stuffed it with telegraphic lines and an incomprehensible narrative."* The fix was not better labels but a written through-text of twenty-one sentences.

## 5. One text layer at a time

A bottom caption lives on overview and motion shots; a card lives only on a held frame with a highlight. They never appear together, and never more than two lines are on screen. Reading time is roughly fifteen characters per second plus a second to take the line in.

**Counter-example.** A shot carried a bottom caption and a side card at once: *"there are cards and subtitles at the bottom — it is not clear what to read."*

## 6. A caption must not cover what it describes

Place the text away from the evidence, and check the composed frame, not the plan.

**Counter-example.** A debug window sat on top of the very animation the shot was about: *"and the debug window covers the animations?"* Tooling windows are moved to the edge of the frame before the take.

## 7. The camera has a small, constant vocabulary

Overview, push-in, freeze, highlight with dimming, slow motion, pull-out. The push-in answers "where to look" right after an event; the freeze gives time to read a state that has just formed; the highlight dims everything else; slow motion is used where movement outruns the eye; the pull-out closes a part.

Zoom and pan inside the product where possible, so the frame shows a live editor rather than a cropped recording.

**Counter-example.** The first cut was assembled from static pieces: the camera never moved and no state was ever emphasised. The request that followed described the missing rhythm exactly: *"the frame freezes, the camera starts moving around it with zoom, focusing attention and lighting up regions, and then returns to the overview — with slow-motion tricks and so on."*

## 8. Freezing alone is not a rhythm

A film that only ever freezes becomes a slideshow of stills. Retiming (`speed`) is the second device, and it belongs in the scenario, not in a hand-run `ffmpeg` command outside it.

**Counter-example.** *"Freezing, for example, is not enough — I want slow-motion tricks too."*

## 9. Nothing in frame stands still

Slides carry an ambient layer of their own; elements keep breathing after they appear; held cards breathe too. All of it is a pure function of scene time, so frames remain reproducible.

**Counter-example.** *"Generating boring static slides is a bad option; all diagrams, slides and static things must be alive, must capture the viewer's attention and carry them through the whole film — it is a video, not a dull presentation."* Measured, the quiet parts of a slide were nearly identical frame to frame (PSNR 56–62 dB between frames 0.4 s apart); with an ambient layer the same points measure 16–34 dB.

## 10. The look is a named theme, not a pile of hand-set variables

One word in the header styles slides, captions and cards together. Hand-tuning a variable here and there produces a film whose parts disagree.

**Counter-example.** *"The style of all the static elements you draw is very crude and sloppy — this is a big problem."* Captions came from one palette and cards from another, and a light theme still drew a dark chapter background with dark text on it, because the chapter's colours were written into the rules instead of coming from the theme.

## 11. Cover the inventory, not the convenient parts

List the capabilities from the code first. Then give every line either a shot number or a written reason for its absence. Control surfaces, per-item playback, error reports and behaviour under load are part of the inventory.

**Counter-example.** *"Some functionality and some kinds of animation are not told or shown at all."* An inventory compiled afterwards revealed twelve effect presets, per-selection playback, single-behaviour playback, queue editing and the "not played" report — none of which had appeared in the film.

## 12. Show what it holds under load

A film about a capability must say how much of it the product survives. Use a load document, keep the product's own frame counter visible in that shot, and take the numbers from the recording.

**Counter-example.** *"What is still missing is a demonstration of performance under load."*

## 13. The animation being filmed must itself be worth filming

Movement is broad: displacements in hundreds of points, scale from a fraction to one, rotations in tens of degrees. Two frames half a second apart must differ visibly. Nothing overlaps, in rest or in motion or while breathing. Text does not turn upside down. Every declared behaviour is verified to actually play before the take.

**Counter-examples**, each a separate review round: *"half the animations don't work"*; *"why is the spring so weak"* (it settled in half a second with no overshoot); *"the shares presentation — you can't see anything moving at all"* (a slide's scene does not start by itself; the stand starts it); *"the slides look crooked, and so do the elements on them"* (endless 1.5° micro-rotations); *"is it intended that the cards on one slide are drawn upside down?"* (a 180° turn); *"the spring ends up on top of the line where another animation is"*; *"the chart columns run into the title"*; *"the circles in the ring overlap each other"*; *"orbits are a completely unreadable animation"* (small loops read as jitter).

## 14. Verify by measurement, not impression

Check the finished file: duration, frame size, presence or absence of an audio track; motion in every shot (two frames 0.4–0.5 s apart differ); the caption changes inside a shot (compare the caption strip at two moments); each card appears and leaves (compare its region before, during and after); no element overlaps another in key frames; claimed numbers match the recording.

**Counter-example.** A cut was handed over in which the spring did not move and one slide stood still; the reviewer found it, not the author. And then, plainly: *"enough scenarios — show me the finished video with all my remarks fixed."*

## 15. Ask before building

Theme, length, narration mode, language, pace and depth belong to the person who asked for the film. Offer the options as a structured choice instead of guessing.

**Counter-example.** *"Make sure the skill and the help describe all the product's functionality, including the different narration modes on request, and that before building the video the agent asks the user about the nuances and offers a choice among all possible options, if the user did not state them and they are not clear from the context."*

## 16. Technical traps of the assembly tools

These cost review rounds, and none of them announce themselves:

- `zoompan` with `d` set to a frame count stretches a poster into minutes: `d` is OUTPUT frames per input frame. For a push-in on a still, use `d=1` and an expression over `on`.
- In the bundled `ffmpeg`, `drawbox` evaluates its geometry expressions once while `drawtext` evaluates them per frame; an animated box lags behind its own text. Build a reveal from several boxes with time windows instead.
- Pass caption text with `textfile=`, not `text=`: colons and commas inside a sentence are read as the end of a filter argument.
- Screen recording starts before the application has drawn anything; trim the take to the first frame change or the film opens on an empty canvas.
- A translucent fill can be painted over the shape's own label and hide it: use a fully opaque or fully transparent fill for labelled shapes.
- A container group has no duration of its own; a duration passed to it is silently ignored and the beat looks instantaneous.
- A track whose value never changes (opacity 0 → 0) is not driven at all.
- A control can be outside the frame because the wheel scrolls the canvas rather than the panel; scroll it into view before clicking.
