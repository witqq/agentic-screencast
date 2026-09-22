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

## 16. A caption must say what is on screen right now

A caption is not a slogan. It names the thing the viewer is looking at this second, in the words the
product itself uses, so that the frame and the line confirm each other.

**Counter-example.** A round of captions read "the document does not change", "three tracks in one
beat", "the limit starts here" while the frame showed tiles, a roadmap and a load grid. The reviewer:
*"what meaning do your captions carry — zero, it's nonsense."* The fix is not better wording but a
different rule: write the caption from the frame, not from the plan.

## 17. Stop time inside the shot, do not cut to a still

A freeze is a device WITHIN a continuous shot: motion runs, time stops, the camera walks the frozen
frame with everything else dimmed, time resumes. Cutting the freeze into its own scene produces a
jump, detaches the card from the moment it explains, and leaves the rest of that scene standing
still because its material ran out.

**Counter-example.** Seven separate "freeze scenes" were cut into a film; measured, two of them had
whole seconds with identical frames, and the reviewer saw cards "off to the side that nobody looks
at". The tool now stops time inside a clip (`speed: [{"at":…, "hold":…}]`), moves the camera over
the video itself, dims everything outside the focus, and fades the bottom caption while the camera
leads — one text layer, tied to the moment.

## 18. Dimming is the point of a highlight

A neon rectangle over footage says nothing by itself; what directs the eye is the rest of the frame
going dark. If the tool draws only the ring, the shot reads as decoration.

**Counter-example.** *"Why is there no dimming and no time stops, as I asked?"* — the overlay drawn
over imported video had its dim deliberately disabled, and nobody noticed until the film was watched.

## 19. Screen recording has its own frame budget — measure it

Playwright's screencast of a canvas application caps at roughly 25 frames per second and collapses
under load: the same document that runs at 115 fps unrecorded delivered 8 fps while being recorded.
Measure the unique frames of a take (`mpdecimate`) before building: a take with 10 fps of real
motion will look like a slideshow no matter what the scenario says. For heavy shots, record the real
screen of a normal browser window instead of driving a headless one.

## 20. Technical traps of the assembly tools

These cost review rounds, and none of them announce themselves:

- `zoompan` with `d` set to a frame count stretches a poster into minutes: `d` is OUTPUT frames per input frame. For a push-in on a still, use `d=1` and an expression over `on`.
- In the bundled `ffmpeg`, `drawbox` evaluates its geometry expressions once while `drawtext` evaluates them per frame; an animated box lags behind its own text. Build a reveal from several boxes with time windows instead.
- Pass caption text with `textfile=`, not `text=`: colons and commas inside a sentence are read as the end of a filter argument.
- Screen recording starts before the application has drawn anything; trim the take to the first frame change or the film opens on an empty canvas.
- A translucent fill can be painted over the shape's own label and hide it: use a fully opaque or fully transparent fill for labelled shapes.
- A container group has no duration of its own; a duration passed to it is silently ignored and the beat looks instantaneous.
- A track whose value never changes (opacity 0 → 0) is not driven at all.
- A control can be outside the frame because the wheel scrolls the canvas rather than the panel; scroll it into view before clicking.

## 21. Film a live application in ONE unbroken take

A film assembled from several page loads betrays itself: between scenes the canvas blanks, the layout
reflows, and the viewer sees the tool instead of the product. Open the application once, then drive it
in place — move the camera, start the next block of animation, hold the frame. Cut the recording into
scenes afterwards.

This requires a control surface. A product that can only be steered by clicking its debug panel cannot be
filmed cleanly, because the panel is in frame. Ask the product for a thin debug bridge instead: list the
blocks, play one by name, stop, move the camera, fit a region into the frame.

**Counter-example.** *"Different scenes render the same browser scene, but the reloads are visible and it
looks bad."* — every showcase was a separate document chosen by a URL parameter, so each scene began with a
page load.

## 22. Time marks must come from the recording, not from the wall clock

When a script drives the page and writes down "scene two started at 12.3 s", that number is measured by the
script's own clock, which starts when the script decides — usually after the page has loaded. The video,
however, starts recording when the page is created. Cutting by the wrong zero shifts every scene, and the
film ends up describing one thing while showing another.

Take the zero from the moment the recording starts, or write a visible marker into the frame and find it in
the footage.

**Counter-example.** A caption said "twenty-four tiles rearrange into a ring" over a shot of the roadmap:
the cut was six seconds late, exactly the time the document took to load.

## 23. Hide debug chrome AFTER it exists, and verify it is gone

A style rule injected before the panels mount matches nothing. Inject it after the application has drawn,
then read the page text back and fail the shoot if the panel names are still there. A film with a debug
window over the scene is not shippable, and discovering that after the build costs the whole take.

**Counter-example.** *"And the debug window covers the animations?"* — the rule was applied three seconds
after load, while the panels appeared later.

## 24. A card arrives as an object, not as a sticker

Fading a card in leaves it looking pasted onto the footage. Give it `motion: "fly"` with the edge it comes
from: it enters from beyond the frame, overshoots, settles, and leaves the same way. Keep the card beside
the highlighted region, never on top of it, and never show a card and a caption in the same shot.

**Counter-example.** *"The cards are not tied to the scene at all, they are drawn somewhere in the corners"*
and *"there are both cards and subtitles, it is not clear what to read"*.

## 25. A video scene with speech is cut to the speech, not to the clip

Give a `video` scene an explicit `duration` when the footage is longer than its narration. Without it the
scene ends when the sentence ends, and the animation the shot exists for is cut in half.

**Counter-example.** A thirteen-second load shot became seven seconds in the film, and the wave over the
tiles never finished.

## 26. Requirements come from the owner, not from the agent's taste

An agent that writes down "debug panels must be hidden" and then tests its own film against that line has
invented a requirement and turned it into a defect report. The owner may want the opposite: a control panel
is a product surface, and a film that hides it hides the very thing the branch built.

Write down only what the owner said, and mark every line with where it came from. Before checking a film
against a requirement, look at the source: a requirement with no quote behind it is a guess, and guesses do
not earn a red mark.

**Counter-example.** *"There was no requirement to remove debug windows from the frame."* Two rounds of the
film had been shot with the panels deliberately hidden, and the control panel — one of the branch's main
results — never appeared at all.

## 27. Take stock of the products and the showcases before writing a scenario

A branch usually touches more than the surface the agent happened to open. Count them first: how many
applications, how many prepared documents, how many kinds of the thing the film is about. Put the count in a
table with a column "was it in the previous film", and let the scenario answer for every row.

**Counter-example.** *"And where did the presentation demo go — you have lost half of the aspects."* The
first film covered eight showcases of one product and none of the other, because nobody had listed them.

## 28. One chapter, one document

A chapter cannot be a single take if its scenes live in different documents: every scene change becomes a
page load. Ask the product for one document that holds all of them — a big board with areas, a deck whose
slides are the showcases — and drive it with camera moves and slide switches.

Building such a document is cheap when the showcases already export their shapes and their recorded scenes:
the gala document imports them whole, so a fix in a showcase reaches the film by itself.

**Counter-example.** A scenario assigned three showcase documents to one chapter; shooting it honestly meant
three reloads, and the chapter had to be rebuilt around one document instead.

## 29. Fail the shoot on a page error

An animation that fails to compile does not look broken on video. It looks like a deliberate pause: the
shapes simply stand still, and the caption over them still promises movement. The failure is in the console,
where nobody watching a film will ever see it.

Subscribe to page errors in the shooting script and throw. It costs one line and catches the class of defect
that no frame comparison finds.

**Counter-example.** A showcase of nine kinds of animation played none of them for three whole builds: one
card was driven both by a step value and by a numeric fade on the same property, the show refused to compile
the conflict, and the frames looked like an intentional still.

## 30. The tool's demo assets are not product footage

Fixtures carry a demo picture, a joke asset, a placeholder name. They are meant for developers looking at a
test document, and they read as sloppiness in a film meant for an audience. Build the film's document
without them, or replace them with something the product would really contain.

**Counter-example.** The pitch slide of a product film carried a joke meme photograph — the fixture's demo
asset, passed through into the deck.

## 31. The caption must name what the frame actually shows

Write the narration from the footage, not from the plan. A sentence about "sectors of a chart turning into
place" over four rounded rectangles is not a rounding error: the viewer reads one thing and sees another,
and stops trusting the rest.

After the build, put the frame and its caption side by side for every scene. That is the only check that
catches a sentence which was true of an earlier take.

**Counter-example.** A caption promised a picture arriving from beyond the slide edge; the picture had been
removed from that document two builds earlier.
