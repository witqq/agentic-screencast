# Film craft: rules and the mistakes that produced them

This document answers one question: which directing rules must a watchable film keep, and why. Every rule here was paid for: it is followed by the counter-example that made it necessary, taken from real review rounds. Read it before writing a scenario — the rules are short, the counter-examples are what make them stick. What each field and command does, with its numbers, is in `agentic-screencast help <topic>`; story shapes per genre are in [the scenario playbook](scenario-playbook.md); the path from a request to a film is in [the skill](../skills/agentic-screencast/SKILL.md).

## 1. The genre: a short film, not a screen recording

A feature film about a product is watched without sound, without a presenter, and without accompanying notes. It has a theme, a beginning, a middle and an end, and afterwards the viewer knows what appeared and why it matters.

**Counter-example.** The first cut was a pile of inserts — "here is a showcase, here is another showcase" — with drawn before/after cards in between. The reviewer's verdict: *"the process and the through-line are not clear"* and *"I never asked for intermediate slides with cards and the rest."* Only one drawn slide belongs in such a film: the opening poster. Everything else is live product footage with explanations over it. The rule is about a film of a working product; a pitch, an explainer of an idea or a trailer is made of drawn material by nature, and its playbook section says how.

## 2. The subject comes from the source, never from imagination

Before writing a single line of narration, read what the work actually did: the commits, the ticket, the diff, the product itself. State the subject in the words of that evidence.

Never pass a mockup off as a real run: a prototype, a drawn interface or an untested result is labelled as such in the frame itself.

**Counter-example.** The scenario claimed *"the animation no longer lives in the demo code — now it lives in the document"*, a before/after story invented out of nothing. The branch had in fact added animation playback to a product that had none at all. The reviewer: *"where does that phrase come from? do you even understand what the task was?"* A whole cut had to be discarded.

## 3. Parts follow a meaningful order, each returning to the overview

Parts follow in a meaningful order, each one ending with a return to the overview so the next can start clean. The order for a film about a branch's result — missing, appeared, can do, holds, controlled, where to get it — is in [the playbook](scenario-playbook.md), section "A branch result or a new feature".

**Counter-example.** Shots were ordered by how convenient they were to record, so capability demos, an admin panel and a diagnostic report alternated with no logic. The viewer could not tell whether the film was still describing the same thing.

## 4. Narration is one continuous text, cut afterwards

Write the whole narration first, in whole sentences that pick each other up by pronoun, conjunction or repeated key word. Only then split it across shots.

**Counter-example.** Captions were composed shot by shot and came out as labels: "Trajectory", "Entry", "Loop closed". The reviewer: *"you stuffed it with telegraphic lines and an incomprehensible narrative."* The fix was not better labels but a written through-text of twenty-one sentences.

## 5. One text layer at a time

A bottom caption plate lives on overview and motion shots; a card lives only on a held frame with a highlight. They never appear together, and never more than two lines are on screen. Subtitles are different: they are the speech for viewers without sound and stay on, so a card must not be laid over them (rule 34). Reading time on a landscape screen is roughly fifteen characters per second plus a second to take the line in; a phone reads slower — see [the vertical-video guide](vertical-video.md), "Architecture and real interfaces on a phone".

**Counter-example.** A shot carried a bottom caption and a side card at once: *"there are cards and subtitles at the bottom — it is not clear what to read."*

## 6. A caption must not cover what it describes

Place the text away from the evidence, and check the composed frame, not the plan.
For a flat but important control, name it as the scene target and use
`captions: auto`; the placement then protects that target before it compares
image detail. Open the final frame in every format, since the subject can move
inside a portrait crop.

**Counter-example.** A debug window sat on top of the very animation the shot was about: *"and the debug window covers the animations?"* Tooling windows are moved to the edge of the frame before the take.

## 7. The camera has a small, constant vocabulary

Overview, push-in, freeze, highlight with dimming, slow motion, pull-out. The push-in answers "where to look" right after an event; the freeze gives time to read a state that has just formed; the highlight dims everything else; slow motion is used where movement outruns the eye; the pull-out closes a part.

Zoom and pan inside the product where possible, so the frame shows a live editor rather than a cropped recording.

**Counter-example.** The first cut was assembled from static pieces: the camera never moved and no state was ever emphasised. The request that followed described the missing rhythm exactly: *"the frame freezes, the camera starts moving around it with zoom, focusing attention and lighting up regions, and then returns to the overview — with slow-motion tricks and so on."*

## 8. Freezing alone is not a rhythm

A film that only ever freezes becomes a slideshow of stills. Retiming (`speed`) is the second device, and it belongs in the scenario, not in a hand-run `ffmpeg` command outside it.

**Counter-example.** *"Freezing, for example, is not enough — I want slow-motion tricks too."*

## 9. Nothing in frame stands still

Every frame of the film moves, slides and diagrams included: a still frame is where attention leaves. The tool's slides already carry an ambient layer (`help slides`); a page you write needs its own motion, and a still clip needs a camera move or faster playback.

**Counter-example.** *"Generating boring static slides is a bad option; all diagrams, slides and static things must be alive, must capture the viewer's attention and carry them through the whole film — it is a video, not a dull presentation."* Measured, the quiet parts of a slide were nearly identical frame to frame (PSNR 56–62 dB between frames 0.4 s apart); with an ambient layer the same points measure 16–34 dB.

## 10. The look is a named theme, not a pile of hand-set variables

One word in the header styles slides, captions and cards together. Hand-tuning a variable here and there produces a film whose parts disagree.

**Counter-example.** *"The style of all the static elements you draw is very crude and sloppy — this is a big problem."* Captions came from one palette and cards from another, and a light theme still drew a dark chapter background with dark text on it, because the chapter's colours were written into the rules instead of coming from the theme.

## 11. Cover the inventory, not the convenient parts

List the capabilities from the code first. Then give every line either a shot number or a written reason for its absence. Control surfaces, per-item playback, error reports and behaviour under load are part of the inventory.

**Counter-example.** *"Some functionality and some kinds of animation are not told or shown at all."* An inventory compiled afterwards revealed twelve effect presets, per-selection playback, single-behaviour playback, queue editing and the "not played" report — none of which had appeared in the film.

## 12. Show what it holds under load

A film about a capability must say how much of it the product survives. Use a load document, keep the product's own frame counter visible in that shot, and take the numbers from the recording. Every number on screen names its unit, and a figure that changes names its date — "as of <date>"; a number the recording does not show is not put on screen.

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
at". Stopping time inside a clip and moving the camera over it are `speed` holds and `overlay.camera`
(`agentic-screencast help overlay`).

## 18. Dimming is the point of a highlight

A neon rectangle over footage says nothing by itself; what directs the eye is the rest of the frame
going dark. If the tool draws only the ring, the shot reads as decoration.

**Counter-example.** *"Why is there no dimming and no time stops, as I asked?"* — the overlay drawn
over imported video had its dim deliberately disabled, and nobody noticed until the film was watched.

## 19. Screen recording has its own frame budget — measure it

Playwright's screencast of a canvas application caps at roughly 25 frames per second and collapses
under load: the same document that runs at 115 fps unrecorded delivered 8 fps while being recorded.
Measure the unique frames of a take (`mpdecimate`, with the bundled `ffmpeg` that
`agentic-screencast paths` names) before building: a take with 10 fps of real motion will look like a
slideshow no matter what the scenario says. Accept a take with at least about 60 unique frames in any
five seconds of motion (12 a second); below that, find the cause as below.

The recorder is rarely the bottleneck; the page is. Measured on an Apple-silicon laptop with 3000
moving figures, 5 seconds, 1280×720: a headless take held the ceiling of 125 unique frames (25 per
second) whether the figures were DOM elements (page at 78 fps), a 2D canvas (43 fps) or WebGL
(65 fps). A visible Playwright window was worse, not better: Chrome throttles a window it considers
hidden, and even with the throttling switches off the DOM and canvas pages drew only 17–22 frames in
those 5 seconds (WebGL: the same 125). So count the page's own `requestAnimationFrame` calls during
the take next to the unique frames: if the page itself draws fewer than 25 per second while
recorded, the take cannot have more — lighten the shot (fewer figures moving at once, a smaller
viewport) or ask the product for a lighter render path. Recording the OS screen of a visible window
was not measured here.

Rule 20 — the technical traps of the assembly tools — concerns changing the renderer, not directing, and lives in [CONTRIBUTING.md](../CONTRIBUTING.md).

## 21. Film a live application in ONE unbroken take

A film assembled from several page loads betrays itself: between scenes the canvas blanks, the layout
reflows, and the viewer sees the tool instead of the product. Open the application once, then drive it
in place — move the camera, start the next block of animation, hold the frame. Cut the recording into
scenes afterwards.

This requires a control surface. A product that can only be steered by clicking its debug panel cannot be
filmed cleanly, because the panel is in frame. Ask the product for a thin debug bridge instead: list the
blocks, play one by name, stop, move the camera, fit a region into the frame. A worked example from a
board application:

```js
const steps = await page.evaluate(() => window.__showCapture.steps());
await page.evaluate(rect => window.__showCapture.frame(rect, { padding: 120, durationMs: 1400 }), area);
await page.evaluate(id => window.__showCapture.play(id), steps[2].id);
```

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

## 23. When debug chrome is to be hidden, hide it AFTER it exists, and verify it is gone

Whether the debug chrome stays is the owner's choice (rule 26). When it is to go, a style rule injected
before the panels mount matches nothing: inject it after the application has drawn, then read the page
text back and fail the shoot if the panel names are still there. Either way no panel may lie over the
figures under discussion (rule 6).

**Counter-example.** *"And the debug window covers the animations?"* — the rule was applied three seconds
after load, while the panels appeared later.

## 24. A card arrives as an object, not as a sticker

Fading a card in leaves it looking pasted onto the footage. Give it `motion: "fly"` with the edge it comes
from: it enters from beyond the frame, overshoots, settles, and leaves the same way. Keep the card beside
the highlighted region, never on top of it; one text layer at a time is rule 5.

**Counter-example.** *"The cards are not tied to the scene at all, they are drawn somewhere in the corners"*
and *"there are both cards and subtitles, it is not clear what to read"*.

## 25. A video scene with speech is cut to the speech, not to the clip

Give a `video` scene an explicit `duration` when the footage is longer than its narration. Without it the
scene ends when the sentence ends, and the animation the shot exists for is cut in half.

When a short action finishes before the line explaining it, choose its order
on the finished film. Typing can run with the words; a pointer move that needs
context can follow an introductory beat. For the latter, an initial `speed`
hold keeps the first clip frame until that beat ends, then releases the
recorded motion. Size the hold from the measured final voice and inspect both
the held frame and the action after it. A scene using `autoZoom` cannot also
use `speed`: put the introductory pause into its recorded take instead.

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

Rule 11 counts what the product can do; this one counts where it lives. A branch usually touches more than the surface the agent happened to open. Count them first: how many
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

`recordTake` already fails a take on a page error; a shooting script of your own subscribes to page errors
and throws. It costs one line and catches the class of defect that no frame comparison finds.

**Counter-example.** A showcase of nine kinds of animation played none of them for three whole builds: one
card was driven both by a step value and by a numeric fade on the same property, the show refused to compile
the conflict, and the frames looked like an intentional still.

## 30. The tool's demo assets are not product footage

Fixtures carry a demo picture, a joke asset, a placeholder name. They are meant for developers looking at a
test document, and they read as sloppiness in a film meant for an audience. Build the film's document
without them, or replace them with something the product would really contain.

**Counter-example.** The pitch slide of a product film carried a joke meme photograph — the fixture's demo
asset, passed through into the deck.

## 31. After the build, check every caption against its frame

Rule 16 writes the caption from the frame; this rule checks it after the build. Write the narration from the footage, not from the plan. A sentence about "sectors of a chart turning into
place" over four rounded rectangles is not a rounding error: the viewer reads one thing and sees another,
and stops trusting the rest.

After the build, put the frame and its caption side by side for every scene. That is the only check that
catches a sentence which was true of an earlier take.

**Counter-example.** A caption promised a picture arriving from beyond the slide edge; the picture had been
removed from that document two builds earlier.

## 32. Everything drawn wears the theme — and so does a live take

A theme is a contract: every colour, font, shadow, radius, padding and thickness the tool draws is a
token of it, each theme stores every token, and a part of a film can wear its own theme. A live take
bakes its cursor, clicks, key caps and highlight into its pixels, so it is recorded in the theme of
the scene that will show it (`recordTake({ theme })`), and `lint` names a take recorded in another.

**Counter-example.** *"Half of the effects and interface elements and built-in blocks ignore the
theme's style."* A scanner over the drawing code found colours and sizes written in place, a
transition flashed in fixed colours between two themed scenes, and a brand theme kept the base blue
in its rings and progress bar.

## 33. An attention tool shows the whole subject

A loupe that crops its subject, a round spotlight inscribed in the subject's rectangle and a push-in
that pushes the subject past the frame edge all point at the wrong thing. Choose the subject and the
scale so the whole subject stays in view; how the tool fits a lens, a circle and a push-in, and how it
reports what it had to lower, is in `agentic-screencast help text` and `help overlay`.

**Counter-example.** *"Some loupes and other things clearly need parameters: even in the video you
can see that areas are highlighted and zoomed strangely, cropping or enlarging the wrong pieces."*
A loupe over a KPI card showed "day / 480 / last week" instead of "Orders today 12,480"; another cut
the top off the very bar the narration named.

## 34. Nothing covers the line of speech

A loupe, a card or a title low in the frame is drawn over the subtitles as easily as over anything
else. The bottom band belongs to speech: bottom-anchored text stands above it, and the loupe keeps
above it when it fits.

**Counter-example.** A loupe fixed to show a whole bar grew downwards and hid the middle of the
subtitle for four and a half seconds: "A loup… evening peak".

## 35. Two subtitle lines, measured in every language and format

"Two lines" is a promise about the screen, not about characters. A vertical line holds about a
quarter of a landscape one, and Cyrillic is wider than Latin: a chunk cut for landscape English ran
to three and four lines in the Russian vertical film and climbed onto the slide. Look at every
language and every format of the film.

## 36. Frame-anchored text shares one step

Cards, lower thirds, titles and subtitles stand one step of the theme from the safe zone's edge, and
every plate has the same inner padding. Mixed measures read as carelessness long before anyone can
say what is wrong.

**Counter-example.** *"Some elements show inconsistent padding and alignment."* A top title stood at
13% of the frame instead of one step from the zone; a right-hand lower third in a vertical build sat
65 points outside the zone because two rules each reset one of its sides.

## 37. Name the moments to check in the scenario

The author knows where a card must read, a loupe must sit over its subject, a subtitle must stay off
a slide. Write those moments into the scene (`stills: b2+0.3 :: the card is readable`); the build
writes them to files beside the film, and the review looks exactly there instead of at guessed
seconds.

## 38. A change of look rebuilds what the look is baked into

Screenshots of earlier films, a vertical cut inside a longer film, landing-page captures and live
takes carry the old look in their pixels; rebuilding the film does not touch them. Before a rebuild,
list every such input with where it came from and how it is remade, remake it, and check that its
file changed.

**Counter-example.** A tour of all themes kept showing an old theme sheet, old takes and an old
vertical cut after the product itself had been restyled.

## 39. The sheet you look at must not hide what you look at

A contact sheet or a theme sheet is an instrument, not decoration: a label placed over a card's text
hides exactly what the sheet is meant to compare. Put labels where the frame is empty.

## 40. The strongest result gets the strongest shot

Find the single strongest result of the work and give it the film's most prominent, longest and
best-lit shot. Covering the inventory does not mean equal weight: a headline result that appears for
two seconds among eighteen clips has buried the film's point.

**Counter-example.** The analysis of a failed cut named its second cause plainly: the branch's
strongest result was barely shown, lost among synthetic showcases of equal length.

## 41. The inventory serves the story, not the other way round

The capability table decides what must appear, not the order or the rhythm. If the scenario reads as
one clip per table line joined by hard cuts, it is a catalogue: group the capabilities into story
beats and lead from one to the next.

**Counter-example.** A film of eighteen clips with hard cuts, its scenario subordinated to a coverage
checklist, was judged *"not a short dynamic trailer with a full story from start to end — just a set
of scenes."*

## 42. Stage the feature in content that looks like real use

Show the capability in documents that look like the boards and decks people really make — real-looking
content, real layouts — not in synthetic grids of identical shapes. An animation that reflects no real
use case reads as a tech test, not as a product.

**Counter-example.** *"The animations are ugly and do not reflect real use cases"*, and earlier:
*"where are the wow demos that look like real boards and presentations, so it is visible how it all
works in the context of real products?"*

## 43. The filmed material is designed too

The theme styles what the tool draws; the product material in frame needs the same care. Give it a
deliberate palette that agrees with itself and with the film's theme, a contemporary look, and varied
kinds of motion. Clashing colours or many identical animations read as crude, whatever the camera does.

**Counter-example.** *"Why are some colours not coordinated?"* and *"why are all the animations the
same?"* — a stress document played five hundred copies of one movement in unmatched colours.

## 44. Captions and cards speak in a trailer's voice

Write captions in engaging, natural language, the way a game trailer reveals its new features: vivid,
and still naming what is on screen (rule 16) — vivid, not advertising: no "not just X but Y", no slogans,
no forced triads ([the visual-design guide](visual-design.md), "Words on screen"). Vary the cards' form and entrance so they do not become
one repeated template.

**Counter-example.** *"The captions must be interesting and written in normal language, as if this
were a game trailer telling about new features."* The analysis of the cut found the text descriptive
rather than trailer-like and every card alike.

## 45. Vary the camera; one repeated move is a tic

The camera vocabulary of rule 7 is a set to choose from, not a routine. Mix devices from shot to shot —
push-in, pan across, slow motion, a freeze with a walk, a pull-out — and pick each for what the moment
needs.

**Counter-example.** Every shot of a failed cut used the same move → hold → return over a cropped flat
recording; the analysis named it as the third reason the film was not cinematic.

## 46. Keep the picture sharp: record big, encode once

A push-in crops the take, so record at a resolution high enough that the tightest crop is still sharp.
Do not pass a take through extra lossy encodes (webm → mp4 → film): every pass makes the picture
muddier. A push-in over a take recorded with `recordTake` is sharp by construction — the build re-runs
the take script and the browser zooms the live page — so keep that script runnable from its folder; a
push-in over any other clip stretches its pixels.

**Counter-example.** A cut assembled from Playwright webm takes, re-encoded before assembly and again by
the build, looked muddy in every push-in.

## 47. Every remark stays on a list until the frames show it fixed

Keep every remark from every review round in one checklist with its quote, and before handing over the
next cut check each line against the frames. A remark the tool cannot satisfy is not dropped: extend
the tool, or say so, before shooting — not in the middle of the shoot.

**Counter-example.** *"Why do you ignore half of my remarks and not improve the engine?"* — remarks from
earlier rounds had quietly fallen out of later cuts, and the tool was being extended while the takes
were already being shot.

## 48. When cuts keep failing, rethink the concept

If successive cuts only fix defects and the owner still says it is not a film, stop patching: go back
to the story, the genre and the material. Frame-difference checks cannot tell a cinematic film from a
dull one; only watching it against the intended genre can.

**Counter-example.** Six versions in twenty hours each repaired the defects of the last, the concept was
never revisited, and every measured check was green while the owner called the result unwatchable.

## 49. The quality bar depends on the audience

A home-made player page is fine for an internal introductory film; for an external audience plan a real
player, and write the audience into the brief so the choice is made up front. The voice is not a matter
of audience: it follows the skill's section Voice for every film.

**Counter-example.** A trial film made from the skill was judged good enough as an internal intro, but
not for outsiders: the voice and the player page were the first things to replace.

## 50. Camera moves need time — lint estimates it, the build measures it

A camera move needs time to arrive, hold and leave; `help overlay` gives the minimum hold and gap.
`lint` estimates the timing from the beats and the build measures the real one; confirm each move in the
stills.

**Counter-example.** A trial film's focus moves collided with an overlay, which only the build revealed.
The check had to be run on the finished frames, not on the scenario.

## 51. Subtitles: readable first, big enough, one accent at most

Subtitles are the words for everyone watching without sound, so they must read on any frame. The
default outline uses white letters with a dark edge and no plate. On a busy
interface choose the dense plate explicitly with `captions: {"look":"plate"}`;
it separates the line from coloured detail. A drop shadow alone or
coloured letters without backing fall apart on a light interface. Keep them large — about 8% of
the frame height per line in a landscape film, and larger in a vertical one (`help text` gives the sizes
the tool draws) — and within two lines. Colour carries at most one word per line: the karaoke word or a
keyword, in a colour that still reads against its backing. Sources and numbers:
[the subtitles research](research/subtitles.md).

**Counter-example.** The first subtitles were 41 px in a 1080p frame — under 4% of its height —
on a plate two-thirds transparent: over a light product page white text sat on grey below readable
contrast, and in vertical films the words were a third of the size the platforms' own captions use.

## 52. Transitions: one or two kinds, chosen for the film

The quiet default is no transition at all: scenes fade through their own fades. Use one or two kinds per
film and pick them for what the cut means — a change of place or topic (`cube`, `whip`, `push`), the same
thing carried to its detail (`morph`), a hard cut on the beat in a trailer (`cut`), a pause into black or
white before a title (`dip`). Keep `dots` and `pixelate` off text: they shred letters mid-cut.

**Counter-example.** A comic action trailer built before `cut` existed went through black between every
two shots of its first acts — each scene faded out and in — and read soft where a trailer lives on hard
cuts; the agent that made it named this the first thing the tool lacked.

## 53. Move the subtitles, never pad the content

The frame of a real screen is filled to its bottom with that screen. When the subtitles would cover
something the viewer needs, move the subtitles (`captions: top` on the scene, or a shorter line) or push
in on the subject — never add empty space under the page to clear a band for them. To raise a subject,
scroll through the product's real content or move the camera; a scroll that needs invented space below
the content is the sign that the subtitles are in the wrong place.

**Counter-example.** A vertical film of a chat product added a 60vh grey block under the page and
scrolled the panels up above the subtitle band. On the phone the lower third of most frames was an empty
grey area, the interface looked cut off, and the filler took more room than the product. The owner's
verdict: the filler must not exist — the whole frame is the phone's screen, the subtitles a narrow band
over its least important part.

## 54. Cut a piece from mark to mark

Name the start and the end of every shot in the take with `take.mark()`, the end before the next
navigation or scroll that changes the screen, and cut the scene with `from: @start` and `to: @end`.
Seconds counted by hand from a mark go stale the moment the take is recorded again.

**Counter-example.** Pieces cut as "the mark plus four seconds" kept their numbers when a take was
re-recorded; the shot about the steps ran into the next page, and a caption about the steps stood for
3.5 seconds over the wrong screen. The same film's `scrollIntoView` scrolled past the diagram into the
next page inside one shot, which no single still caught.

## 55. A three-second probe take before the whole take

Before scripting a whole take, record three seconds with the same viewport, scale and theme, cut them
into a scene, and look at one frame at full size. The size of the recorded picture, the layout the
product chose at that width, and the fonts are all visible there, and all of them are expensive to
discover after a full take (`help capture` says how a take's pixels are sized).

**Counter-example.** A phone layout recorded at a 432×768 viewport with a device scale factor of 2.5
came out as a small picture in a corner of the 1080×1920 frame. It was found only after two full
recordings, and repaired with a hand-made browser launch around `capturePage`.

## 56. Every factual clause of the narration is checked against its source

Before the draft, hold each clause that states a fact — a count, an order, who did what — against the
frame, the transcript or the data it describes, and correct the words, not the viewer's memory. A test
role is named as one ("the test user"), and a translated request is marked as a translation, not quoted
as if it was said. A derived number is marked as derived, an unknown one is said in words, and a time
names its time zone.

**Counter-example.** A narration said "eight steps" where the eight counted the start and the end, and
"first it asked" where the question came in the same message as the proposal; a scripted test role was
called "the person", and a translated request was quoted as spoken. Each was a small untruth the owner
found in the finished film.

## 57. Review at the size the viewer sees, and between the stills

Watch a vertical film at the size of a phone screen, and look at a few frames at full size rather than
as thumbnails of a contact sheet. Stills catch named moments; to catch what happens between them, sample
every scene at about one frame a second (`stills: every 1s`).

**Counter-example.** A review of 180–360 px contact-sheet stills passed a film whose lower third was an
empty grey block — obvious on a phone, invisible on thumbnails — and single-moment stills missed a page
change in the middle of a shot.

## 58. One subject per frame, large, in every format

Every explanatory frame holds one main subject large enough to read at the viewer's size. An empty
band a third of the frame high is a defect in an ordinary slide, page or take. Trailer cards (`slides.card`,
`slides.titlecard`) deliberately hold one to three words in a sparse frame; judge their rhythm in the
trailer instead of treating that space as a filler. A frame that is only a centred title is otherwise
a title without the product: put the product, its result or the evidence beside the words. Check the
composition in every format the film ships in; a vertical build re-centres a slide by itself, but it
cannot add a subject that is not there. The catalogue of composition clichés — identical
cards, a grid symmetric everywhere, an infographic as the main image — is in
[the visual-design guide](visual-design.md).

**Counter-example.** Every genre skeleton the tool shipped except the trailer opened on a text slide with
no product in it, so every film started from one would open on a title and two lines of copy. The same
defect on pages — "a title and two pill buttons without the product" — was the first thing the owner
named in the four landing prototypes of the agentic-report research.

## 59. An entrance serves reading

An element arrives in about 0.7 s and a slide is complete about two seconds into its beat; then the frame
holds for reading — about 15 characters a second plus a second (rule 5), about 13 on a phone. Pick each
entrance for what it says: a column from its side, a step after the one before it. Kinetic text belongs
to one or two titles of the film, not to every heading. The 0.7 s and 2 s come from pages and are a
starting point for films; the frames decide.

**Counter-example.** An early landing draft faded up every block the same way and animated
the letters of every title; its review named the motion noise that hid the one entrance that mattered,
and the design rules of agentic-report now allow an entrance on one or two sections only.

## 60. A real interface stays flat; the camera goes from the whole to the detail

A real interface is shown flat and at its natural scale; an orbit, a tilt or a screenshot floating in 3D
is for a frame labelled as an illustration, at most once a film. The camera starts on the whole and
travels to the detail the narration names. A transition says what the cut means (rule 52); `glitch` is
chromatic aberration, a glowing circle `mask` from a point is decoration, `cube` and `zoom` belong to a
change of place.

**Counter-example.** The page research lists the tilted dashboard and the screenshot in an invented
browser window among the clearest signs of a generated page; the tool's `slides.perspective` and
`device: browser` produce exactly that frame when the address is a placeholder and nothing labels it.

## 61. A sound accent follows the law of a colour accent

One accent per moment that means something. A default nobody chose — a system voice, a stock bed under
everything, a hit on every card outside a trailer — tells the viewer that nobody chose. The mix rules are
in [the sound guide](sound.md); the voice rules are in the skill.

**Counter-example.** The trailer practice the playbook collects says it outright: "one well-placed hit is
strong, four are a parody"; busy editing and distracting music are among the things that hurt
understanding.

## 62. The subtitle face is chosen, and the word lights by colour only

Subtitles read at WCAG AA contrast, 4.5:1, measured on the final colour with its opacity, for the line and
for the lit word. The karaoke word changes colour only — no scale, no pop, no bounce. Capitals belong to
trailer cards of one to three words, not to subtitles. The face is the theme's own subtitle face
(`--sub-font`): a sans of medium or semibold weight with full Cyrillic, chosen for the theme's mood and
kept for the whole film.

**Counter-example.** Subtitles used to be set in the theme's text face, so a film in `calm-paper` got
serif subtitles in Literata — the face the subtitles research advises against over moving footage — and
the first subtitles were 41 px in a 1080p frame (rule 51).

## 63. The film look and the effects are the trailer's tools

A product demo, an explainer and a release are built without a film look; `teal-orange` regrades a real
interface into colours it does not have. Grain goes only over filmed footage. `flash` and `shake` are a
trailer's impacts with a hit on the same anchor; `overlay.bursts` marks one moment of success, not
confetti on every card. A clean digital frame looks raw in a trailer and honest in a demo.

**Counter-example.** Grain made as noise in every pixel did not compress: six seconds of slides weighed
53 MB instead of 1.6 MB and an eighty-second showcase 783 MB — the price of a look nobody needed on a
product film.

## 64. The first three seconds show the product

In the first three seconds the viewer sees the product or its result; a title, if there is one, names this
product's mechanism and passes the "cover the logo" test. Put `stills` at 0.5, 1.5 and 3 s and ask of
them: could this opening belong to another product? When the genre asks for a problem first, set the
problem over a real frame of the product (`slides.hero` with the screen as its `image`) or after a
one-second teaser of the result. The playbook records how the sources disagree on the length of the
opening window.

**Counter-example.** The skeletons of the product demo, the explainer, the pitch, the release and the
reel all opened on a text slide, so the first seconds of every film built from them belonged to any
product.

## 65. The film ends on its result

The last frame is the result the film promised, with one short next step over it — not a card with a
button on an empty background. A trailer ends on one title card; a short vertical film leads its last
frame back into its first.

**Counter-example.** The playbook lists "several end titles" among the mistakes of trailers, and the first
pass of a landing page ended on a box with two buttons, which its review replaced with a closing scene
of the product.

## 66. Motion the viewer cannot stop is one and quiet

A page lets its reader reduce motion; a film cannot. So the constant motion of a frame is one — a slow
background, never crossing text — and everything else moves to say something. Every drawn scene has a
readable final state; the karaoke word does not scale; a film for a page ships a poster the page shows to
a reader who asked for less motion (`web --poster`). Rule 9 still holds: a frame that stands still loses
the viewer, so the one motion stays.

**Counter-example.** Every slide carried a breathing glow, a drifting grid and a travelling sheen at once,
and a live aurora, particles or bokeh behind them in half the themes — three constant motions in one frame
where rule 9 asks for one.
