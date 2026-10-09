# Film craft: directing rules and counterexamples

This document answers one question: which directing rules must a watchable film keep, and why. Rules include concrete counterexamples that show the mistake and its consequence. Read the relevant rules before writing the scenario and use the examples to understand their scope. What each field and command does, with its numbers, is in `agentic-screencast help <topic>`; story shapes per genre are in [the scenario playbook](scenario-playbook.md); the path from a request to a film is in [the skill](../skills/agentic-screencast/SKILL.md).

## 1. The genre: a short film, not a screen recording

A feature film about a product is watched without sound, without a presenter, and without accompanying notes. It has a theme, a beginning, a middle and an end, and afterwards the viewer knows what appeared and why it matters.

**Counter-example.** A sequence of disconnected showcases and generic before/after cards hides the process and replaces the working product with drawn inserts. Show observable behavior in live footage; use a directed mechanism, code scene or comparison to explain what the footage cannot expose, then reconnect it to the visible result. A poster is one possible opening, not a restriction on other drawn scenes. This guidance applies to films of working products; a pitch, idea explainer or trailer may use drawn material throughout.

## 2. The subject comes from the source, never from imagination

Before writing a single line of narration, read what the work actually did: the commits, the ticket, the diff, the product itself. State the subject in the words of that evidence.

Never pass a mockup off as a real run: a prototype, a drawn interface or an untested result is labelled as such in the frame itself.

**Counter-example.** Inventing a before/after claim such as "animation moved from demo code into the document" when the evidence only shows newly added playback changes the subject of the film. Describe the capability the inspected code actually implements.

## 3. Parts follow a meaningful order and preserve context

Parts follow in a meaningful order. Close the current question and make the next relation legible: preserve a shared object, carry a result into the next scene, retain a landmark or return to an overview when location would otherwise be lost. Returning after every part is not mandatory. The order for a film about a branch's result — missing, appeared, can do, holds, controlled, where to get it — is in [the playbook](scenario-playbook.md), section "A branch result or a new feature".

**Counter-example.** Alternating capability demos, an admin panel and a diagnostic report by recording convenience obscures their relationship. Order them by the viewer's question and preserve a shared object or landmark.

## 4. Narration is one continuous text, cut afterwards

Write the whole narration first, in whole sentences that pick each other up by pronoun, conjunction or repeated key word. Only then split it across shots.

**Counter-example.** Isolated labels such as "Trajectory", "Entry" and "Loop closed" do not form an explanation. Write connected narration before assigning its sentences to shots.

## 5. One text layer at a time

A bottom caption plate lives on overview and motion shots; a card lives only on a held frame with a highlight. They never appear together, and never more than two lines are on screen. Subtitles are different: they are the speech for viewers without sound and stay on, so a card must not be laid over them (rule 34). Reading time on a landscape screen is roughly fifteen characters per second plus a second to take the line in; a phone reads slower — see [the vertical-video guide](vertical-video.md), "Architecture and real interfaces on a phone".

**Counter-example.** A bottom caption and a side explanation card demand competing reading. Choose the explanation layer for the moment and keep speech subtitles clear.

## 6. A caption must not cover what it describes

Place the text away from the evidence, and check the composed frame, not the plan.
For a flat but important control, name it as the scene target and use
`captions: auto`; the placement then protects that target before it compares
image detail. Open the final frame in every format, since the subject can move
inside a portrait crop.

**Counter-example.** A debug window over the animation hides the evidence. Move the window to a free region before recording and inspect the composed frame.

## 7. The camera explains where and how to look

Overview, push-in, freeze, highlight, slow motion and pull-out are a useful starting vocabulary. Also consider a dolly, orbit, pan, loupe or shared-object transition when it communicates the subject. Keep directions and visual identity coherent rather than restricting every film to the same moves. The push-in answers "where to look" right after an event; the freeze gives time to read a state that has just formed; a highlight isolates a subject with dimming or adds emphasis while keeping its relationships readable; slow motion is used where movement outruns the eye; the pull-out closes a part.

Zoom and pan inside the product where possible, so the frame shows a live editor rather than a cropped recording.

**Counter-example.** Static pieces with no emphasis make the viewer discover the subject unaided. Use a purposeful focus, camera move, freeze or slow motion where it reveals the relation, then settle for reading.

## 8. Freezing alone is not a rhythm

A film that only ever freezes becomes a slideshow of stills. Retiming (`speed`) is the second device, and it belongs in the scenario, not in a hand-run `ffmpeg` command outside it.

**Counter-example.** Repeated freezes with no change of pace turn action into a slideshow. Combine purposeful holds with retiming where slowing the actual movement helps perception.

## 9. Motion develops the explanation; holds give time to understand

A scene develops through visible actions, relations or discoveries. Use the existing slide, object and camera effects actively to make those changes tangible. After a change, keep the result still when the viewer needs to read, locate or compare it. A whole-interface opening is a purposeful hold. A static page beneath unrelated narration is the failure this lesson addresses; continuous ambient motion is not a substitute for explanation. The tool's slides provide an ambient layer (`help slides`), but a scene may also deliberately settle.

**Counter-example.** An unchanged slide beneath unrelated narration does not demonstrate a mechanism. Develop its relevant state or relation. Frame differences of 56–62 dB PSNR at a 0.4 s interval indicate nearly identical pixels; 16–34 dB with ambient movement indicates pixel change, but neither measurement proves understanding.

## 10. The look is a named theme, not a pile of hand-set variables

One word in the header styles slides, captions and cards together. Hand-tuning a variable here and there produces a film whose parts disagree.

**Counter-example.** Captions from one palette and cards from another make the film incoherent; hardcoded dark text on a dark chapter can also destroy contrast. Use the named theme's tokens for each role.

## 11. Cover the inventory, not the convenient parts

List the capabilities from the code first. Then give every line either a shot number or a written reason for its absence. Control surfaces, per-item playback, error reports and behaviour under load are part of the inventory.

**Counter-example.** Showing only convenient presets can omit per-selection playback, single-behaviour playback, queue editing or failure reports. Map the complete capability inventory to shots or explicit exclusions.

## 12. Show what it holds under load

A film about a capability must say how much of it the product survives. Use a load document, keep the product's own frame counter visible in that shot, and take the numbers from the recording. Every number on screen names its unit, and a figure that changes names its date — "as of <date>"; a number the recording does not show is not put on screen.

**Counter-example.** A capability film without a real load example provides no evidence of its capacity. Show the load and the product's measured frame counter with units and date.

## 13. The animation being filmed must itself be worth filming

Movement is broad: displacements in hundreds of points, scale from a fraction to one, rotations in tens of degrees. Two frames half a second apart must differ visibly. Nothing overlaps, in rest or in motion or while breathing. Text does not turn upside down. Every declared behaviour is verified to actually play before the take.

**Counter-example.** A spring that settles in 0.5 s without visible overshoot can look inert; a slide whose show is never started does not animate. Endless 1.5° rotations read as jitter, a 180° turn makes text upside down, and a weak orbit makes small loops unreadable. Overlapping springs, chart columns crossing a title and intersecting orbit items obscure their subjects. Confirm playback, separation and useful amplitude at the actual viewing size.

## 14. Verify by measurement, not impression

Check the finished file: duration, frame size, presence or absence of an audio track; the promised motion plays on its intended interval (compare two frames 0.4–0.5 s apart there); intentional orientation and reading holds keep a readable completed state; changing captions match their intended moments; each card appears, holds and leaves when the scenario asks it to; no element overlaps another in key frames; claimed numbers match the recording.

**Counter-example.** A promised spring that never moves or an unintentionally static slide can pass a scenario review. Inspect the finished file and the interval where the action should happen.

## 15. Ask before building

Theme, length, narration mode, language, pace and depth belong to the person who asked for the film. Offer the options as a structured choice instead of guessing.

**Counter-example.** Guessing narration mode, length, depth or look can produce the wrong film even when it renders correctly. Infer settled choices from the request and ask only about choices still open.

## 16. A caption must say what is on screen right now

A caption is not a slogan. It names the thing the viewer is looking at this second, in the words the
product itself uses, so that the frame and the line confirm each other.

**Counter-example.** Captions such as "the document does not change", "three tracks in one beat" or "the limit starts here" over unrelated tiles, a roadmap or a load grid have no visible referent. Write each caption from the actual frame.

## 17. Stop time inside the shot, do not cut to a still

A freeze is a device WITHIN a continuous shot: motion runs, time stops, the camera walks the frozen
frame with everything else dimmed, time resumes. Cutting the freeze into its own scene produces a
jump, detaches the card from the moment it explains, and leaves the rest of that scene standing
still because its material ran out.

**Counter-example.** Seven separate freeze scenes detach explanations from the actions they interpret and can leave seconds of exhausted footage standing still. Use speed holds and overlay.camera within the continuous shot.

## 18. Choose isolation or additive emphasis for the evidence

A highlight over busy footage can isolate a subject by dimming competing detail. Keep the subject
and the evidence needed to understand it readable. In diagrams and code, an outline, halo or
brackets can add emphasis while related objects and labels stay visible; use
[directed-scene attention guidance](directed-scenes.md) to choose the treatment.

**Counter-example.** An arbitrary neon ring decorates unrelated footage; a dark mask over a diagram hides the relations being explained. Tie the emphasis to the narrated subject and preserve the context the viewer needs.

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

**Counter-example.** A URL-selected showcase loaded for each scene introduces reloads and blank frames. Open the application once and drive its showcases in place.

## 22. Time marks must come from the recording, not from the wall clock

When a script drives the page and writes down "scene two started at 12.3 s", that number is measured by the
script's own clock, which starts when the script decides — usually after the page has loaded. The video,
however, starts recording when the page is created. Cutting by the wrong zero shifts every scene, and the
film ends up describing one thing while showing another.

Take the zero from the moment the recording starts, or write a visible marker into the frame and find it in
the footage.

**Counter-example.** Cutting six seconds late because the script clock starts after loading puts a caption about tiles forming a ring over a roadmap. Align marks with the recording's actual zero.

## 23. When debug chrome is to be hidden, hide it AFTER it exists, and verify it is gone

Whether the debug chrome stays is the owner's choice (rule 26). When it is to go, a style rule injected
before the panels mount matches nothing: inject it after the application has drawn, then read the page
text back and fail the shoot if the panel names are still there. Either way no panel may lie over the
figures under discussion (rule 6).

**Counter-example.** A hide rule applied three seconds after load can still run before a debug panel mounts. Apply it after the panel exists and verify the panel no longer covers the subject.

## 24. A card arrives as an object, not as a sticker

Fading a card in leaves it looking pasted onto the footage. Give it `motion: "fly"` with the edge it comes
from: it enters from beyond the frame, overshoots, settles, and leaves the same way. Keep the card beside
the highlighted region, never on top of it; one text layer at a time is rule 5.

**Counter-example.** A card floating in an arbitrary corner has no relation to its subject, and competing cards and captions make reading ambiguous. Attach the card spatially to the held subject and use one explanation layer.

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

**Counter-example.** A thirteen-second action cut to seven seconds because its narration ends early loses the animation's result. Set sufficient scene duration and inspect the action through completion.

## 26. Requirements come from the owner, not from the agent's taste

An agent that writes down "debug panels must be hidden" and then tests its own film against that line has
invented a requirement and turned it into a defect report. The owner may want the opposite: a control panel
is a product surface, and a film that hides it hides the very thing the branch built.

Write down only what the owner said, and mark every line with where it came from. Before checking a film
against a requirement, look at the source: a requirement with no quote behind it is a guess, and guesses do
not earn a red mark.

**Counter-example.** Hiding a control panel without a requirement can remove a main product capability from the film. Follow the owner's actual requirements and keep the panel clear of the evidence.

## 27. Take stock of the products and the showcases before writing a scenario

Rule 11 counts what the product can do; this one counts where it lives. A branch usually touches more than the surface the agent happened to open. Count them first: how many
applications, how many prepared documents, how many kinds of the thing the film is about. Put the count in a
table with a planned shot or explicit exclusion for each row.

**Counter-example.** Covering eight showcases in one application while omitting the presentation application loses part of the subject. List all affected surfaces and map them to shots.

## 28. One chapter, one document

A chapter cannot be a single take if its scenes live in different documents: every scene change becomes a
page load. Ask the product for one document that holds all of them — a big board with areas, a deck whose
slides are the showcases — and drive it with camera moves and slide switches.

Building such a document is cheap when the showcases already export their shapes and their recorded scenes:
the gala document imports them whole, so a fix in a showcase reaches the film by itself.

**Counter-example.** Three showcase documents in one chapter require three reloads. Put the chapter's material in one document and navigate it in place.

## 29. Fail the shoot on a page error

An animation that fails to compile does not look broken on video. It looks like a deliberate pause: the
shapes simply stand still, and the caption over them still promises movement. The failure is in the console,
where nobody watching a film will ever see it.

`recordTake` already fails a take on a page error; a shooting script of your own subscribes to page errors
and throws. It costs one line and catches the class of defect that no frame comparison finds.

**Counter-example.** Driving one property both by a step value and a numeric fade can prevent an animation from compiling. Static frames alone disguise this as a pause; fail the take on the page error and fix the conflict.

## 30. The tool's demo assets are not product footage

Fixtures carry a demo picture, a joke asset, a placeholder name. They are meant for developers looking at a
test document, and they read as sloppiness in a film meant for an audience. Build the film's document
without them, or replace them with something the product would really contain.

**Counter-example.** A fixture's joke photograph carried into a product pitch reads as careless product content. Replace fixture assets with appropriate material before capture.

## 31. After the build, check every caption against its frame

Rule 16 writes the caption from the frame; this rule checks it after the build. Write the narration from the footage, not from the plan. A sentence about "sectors of a chart turning into
place" over four rounded rectangles is not a rounding error: the viewer reads one thing and sees another,
and stops trusting the rest.

After the build, put the frame and its caption side by side for every scene. That is the only check that
catches a sentence which was true of an earlier take.

**Counter-example.** A caption about an image entering from beyond the slide edge is false if that image is absent from the current document. Compare each finished frame with its line.

## 32. Everything drawn wears the theme — and so does a live take

A theme is a contract: every colour, font, shadow, radius, padding and thickness the tool draws is a
token of it, each theme stores every token, and a part of a film can wear its own theme. A live take
bakes its cursor, clicks, key caps and highlight into its pixels, so it is recorded in the theme of
the scene that will show it (`recordTake({ theme })`), and `lint` names a take recorded in another.

**Counter-example.** Hardcoded colors and sizes leave rings, progress bars and transitions in the base style inside a brand theme. Use theme tokens throughout, including live takes.

## 33. An attention tool shows the whole subject

A loupe that crops its subject, a round spotlight inscribed in the subject's rectangle and a push-in
that pushes the subject past the frame edge all point at the wrong thing. Choose the subject and the
scale so the whole subject stays in view; how the tool fits a lens, a circle and a push-in, and how it
reports what it had to lower, is in `agentic-screencast help text` and `help overlay`.

**Counter-example.** A loupe that shows "day / 480 / last week" instead of "Orders today 12,480", or cuts the top off the named bar, omits its own evidence. Fit the complete target and use a push-in when the lens cannot hold it.

## 34. Nothing covers the line of speech

A loupe, a card or a title low in the frame is drawn over the subtitles as easily as over anything
else. The bottom band belongs to speech: bottom-anchored text stands above it, and the loupe keeps
above it when it fits.

**Counter-example.** A loupe growing into the subtitle band can hide speech for 4.5 s. Keep its final bounds above that band or choose another placement.

## 35. Two subtitle lines, measured in every language and format

"Two lines" is a promise about the screen, not about characters. A vertical line holds about a
quarter of a landscape one, and Cyrillic is wider than Latin: a chunk sized for landscape English can occupy
three or four lines in Russian portrait and overlap the slide. Look at every
language and every format of the film.

## 36. Frame-anchored text shares one step

Cards, lower thirds, titles and subtitles stand one step of the theme from the safe zone's edge, and
every plate has the same inner padding. Mixed measures read as carelessness long before anyone can
say what is wrong.

**Counter-example.** A top title at 13% of the frame and a lower third 65 px outside the portrait safe zone do not share a spacing system. Anchor each role to the same theme step and resolve both sides together.

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

**Counter-example.** A theme tour can display an obsolete theme sheet or a take with baked-in old colors even after the scenario is rebuilt. Regenerate the affected inputs in the chosen look.

## 39. The sheet you look at must not hide what you look at

A contact sheet or a theme sheet is an instrument, not decoration: a label placed over a card's text
hides exactly what the sheet is meant to compare. Put labels where the frame is empty.

## 40. The strongest result gets the strongest shot

Find the single strongest result of the work and give it the film's most prominent, longest and
best-lit shot. Covering the inventory does not mean equal weight: a headline result that appears for
two seconds among eighteen clips has buried the film's point.

**Counter-example.** A headline result shown for two seconds among eighteen equal-length synthetic clips loses its importance. Give that result more prominent framing and reading time.

## 41. The inventory serves the story, not the other way round

The capability table decides what must appear, not the order or the rhythm. If the scenario reads as
one clip per table line joined by hard cuts, it is a catalogue: group the capabilities into story
beats and lead from one to the next.

**Counter-example.** One hard-cut clip per capability-table row produces a catalogue, even with complete coverage. Group related capabilities into story beats and connect the changes.

## 42. Stage the feature in content that looks like real use

Show the capability in documents that look like the boards and decks people really make — real-looking
content, real layouts — not in synthetic grids of identical shapes. An animation that reflects no real
use case reads as a tech test, not as a product.

**Counter-example.** A grid of identical shapes with no realistic content demonstrates a renderer test, not a useful product scenario. Stage the feature in boards or presentations that resemble actual use.

## 43. The filmed material is designed too

The theme styles what the tool draws; the product material in frame needs the same care. Give it a
deliberate palette that agrees with itself and with the film's theme, a contemporary look, and varied
kinds of motion. Clashing colours or many identical animations read as crude, whatever the camera does.

**Counter-example.** Five hundred copies of one movement in unrelated colors make a stress document visually crude. Coordinate the palette and vary motion by its purpose.

## 44. Captions and cards speak in the film's chosen voice

Write captions in engaging, natural language appropriate to the film. A trailer may reveal features vividly; a mechanism explanation names its cause and consequence precisely. Keep the wording vivid while naming what is on screen (rule 16): no "not just X but Y", no slogans,
no forced triads ([the visual-design guide](visual-design.md), "Words on screen"). Vary the cards' form and entrance so they do not become
one repeated template.

**Counter-example.** Identical descriptive cards do not carry a trailer's energy or a mechanism's precision. Use the chosen voice, name visible facts and vary card form where the meaning changes.

## 45. Vary the camera; one repeated move is a tic

The camera vocabulary of rule 7 is a set to choose from, not a routine. Mix devices from shot to shot —
push-in, pan across, slow motion, a freeze with a walk, a pull-out — and pick each for what the moment
needs.

**Counter-example.** Repeating move → hold → return over the same cropped recording makes the camera mechanical. Choose each gesture for the moment rather than repeating one routine.

## 46. Keep the picture sharp: record big, encode once

A push-in crops the take, so record at a resolution high enough that the tightest crop is still sharp.
Do not pass a take through extra lossy encodes (webm → mp4 → film): every pass makes the picture
muddier. For a supported scene over a take recorded with `recordTake`, the build re-runs the take
script and the browser zooms the live page, keeping text sharp; keep that script runnable from its
folder. Check the scene conditions in `help capture` and the build's `live-camera` warnings: when
live recording is unavailable or fails, the push-in stretches the recorded pixels.

**Counter-example.** Encoding Playwright WebM to MP4 and then encoding it again in the film compounds loss and makes push-ins muddy. Keep the original take and encode the final film once.

## 47. Every remark stays on a list until the frames show it fixed

Keep every remark from every review round in one checklist with its quote, and before handing over the
next cut check each line against the frames. A remark the tool cannot satisfy is not dropped: extend
the tool, or say so, before shooting — not in the middle of the shoot.

**Counter-example.** Dropping earlier remarks from the current checklist lets the same defect survive into another cut. Keep each unresolved remark until a frame shows it fixed, and resolve tool limitations before shooting.

## 48. When cuts keep failing, rethink the concept

If successive cuts only fix defects and the owner still says it is not a film, stop patching: go back
to the story, the genre and the material. Frame-difference checks cannot tell a cinematic film from a
dull one; only watching it against the intended genre can.

**Counter-example.** Repairing local defects across six versions can leave the same weak concept while every mechanical check is green. Reconsider story, genre and material when the whole film still fails its purpose.

## 49. The quality bar depends on the audience

A home-made player page is fine for an internal introductory film; for an external audience plan a real
player, and write the audience into the brief so the choice is made up front. The voice is not a matter
of audience: it follows the skill's section Voice for every film.

**Counter-example.** An internal introductory player may be inadequate for an external audience. Choose the player for the stated audience; obtain the voice choice independently.

## 50. Camera moves need time — lint estimates it, the build measures it

A camera move needs time to arrive, hold and leave; `help overlay` gives the minimum hold and gap.
`lint` estimates the timing from the beats and the build measures the real one; confirm each move in the
stills.

**Counter-example.** Focus moves that collide with an overlay can appear valid at estimated narration times. Inspect their positions using the final measured speech.

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

**Counter-example.** 41 px subtitles in a 1080p frame occupy under 4% of its height; a two-thirds-transparent plate over a light UI gives white-on-grey text insufficient contrast. Use a readable final size and backing, especially in portrait.

## 52. Transitions express the relation between scenes

The quiet default is no transition at all: scenes fade through their own fades. Use one or two kinds in
a simple film as a starting grammar, then expand it when another relation needs a different transition. Pick them for what the cut means — a change of place or topic (`cube`, `whip`, `push`), the same
thing carried to its detail (`morph`), a hard cut on the beat in a trailer (`cut`), a pause into black or
white before a title (`dip`). Keep `dots` and `pixelate` off text: they shred letters mid-cut.

**Counter-example.** Fading through black at every seam softens an action trailer that needs hard cuts. Choose cut for a beat and reserve dip or fade for a meaningful boundary.

## 53. Move the subtitles, never pad the content

The frame of a real screen is filled to its bottom with that screen. When the subtitles would cover
something the viewer needs, move the subtitles (`captions: top` on the scene, or a shorter line) or push
in on the subject — never add empty space under the page to clear a band for them. To raise a subject,
scroll through the product's real content or move the camera; a scroll that needs invented space below
the content is the sign that the subtitles are in the wrong place.

**Counter-example.** A 60vh grey filler under a phone interface wastes the lower third and cuts the product off. Move the subtitles or reframe real content without inventing padding.

## 54. Cut a piece from mark to mark

Name the start and the end of every shot in the take with `take.mark()`, the end before the next
navigation or scroll that changes the screen, and cut the scene with `from: @start` and `to: @end`.
Seconds counted by hand from a mark go stale the moment the take is recorded again.

**Counter-example.** A slice defined as a mark plus four seconds becomes stale after re-recording and can leave a caption over the next screen for 3.5 s. Mark both boundaries and keep navigation outside the slice.

## 55. A three-second probe take before the whole take

Before scripting a whole take, record three seconds with the same viewport, scale and theme, cut them
into a scene, and look at one frame at full size. The size of the recorded picture, the layout the
product chose at that width, and the fonts are all visible there, and all of them are expensive to
discover after a full take (`help capture` says how a take's pixels are sized).

**Counter-example.** A 432×768 CSS viewport recorded with device scale factor 2.5 can produce a small picture in a 1080×1920 output when recording scale is misconfigured. Verify viewport, output scale and font size on a short probe before the whole take.

## 56. Every factual clause of the narration is checked against its source

Before the draft, hold each clause that states a fact — a count, an order, who did what — against the
frame, the transcript or the data it describes, and correct the words, not the viewer's memory. A test
role is named as one ("the test user"), and a translated request is marked as a translation, not quoted
as if it was said. A derived number is marked as derived, an unknown one is said in words, and a time
names its time zone.

**Counter-example.** Calling start and end markers "eight steps", describing simultaneous proposals and questions as sequential, presenting a test role as a real person, or quoting a translation as the original misstates evidence. Preserve the source's counts, order and status.

## 57. Review at the size the viewer sees, and between the stills

Watch a vertical film at the size of a phone screen, and look at a few frames at full size rather than
as thumbnails of a contact sheet. Stills catch named moments; to catch what happens between them, sample
every scene at about one frame a second (`stills: every 1s`).

**Counter-example.** 180–360 px contact-sheet thumbnails can hide an empty grey lower third that is obvious on a phone, while single stills miss navigation between them. Inspect full-size frames and sample the interval.

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

**Counter-example.** A title and two lines of copy without the product make an opening interchangeable with another product's. Place the real product or result beside the claim.

## 59. An entrance serves reading

An element arrives in about 0.7 s and a slide is complete about two seconds into its beat; then the frame
holds for reading — about 15 characters a second plus a second (rule 5), about 13 on a phone. Pick each
entrance for what it says: a column from its side, a step after the one before it. Kinetic text emphasizes selected moments rather than becoming an automatic entrance on every heading. A deliberately typographic film may use it recurrently; preserve reading and vary its role. The 0.7 s and 2 s come from pages and are a
starting point for films; the frames decide.

**Counter-example.** Fading every block up and animating every title's letters hides the entrance that matters. Use quiet reading states and choose kinetic emphasis for relevant moments.

## 60. Establish the whole interface and preserve its truth

A system interface first appears as its complete captured viewport, in every output format, before focusing on a fragment. A real screenshot may be presented with perspective, orbit or a device frame when that staging introduces depth or the product; settle into a readable view for interaction and detail. Perspective changes presentation, not the provenance of the screenshot. Label invented or reconstructed UI as illustrative, and give real browser frames their real address. Do not impose a once-per-film quota. The camera starts on the whole and
travels to the detail the narration names. A transition says what the cut means (rule 52); `glitch` is
chromatic aberration, a glowing circle `mask` from a point is decoration, `cube` and `zoom` belong to a
change of place.

**Counter-example.** A tilted dashboard in browser chrome with a placeholder address misrepresents its provenance. Establish the real interface whole, use its real address, and label a reconstruction as illustrative.

## 61. A sound accent follows the law of a colour accent

One accent per moment that means something. A default nobody chose — a system voice, a stock bed under
everything, a hit on every card outside a trailer — tells the viewer that nobody chose. The mix rules are
in [the sound guide](sound.md); the voice rules are in the skill.

**Counter-example.** Four identical hits where one decisive accent would suffice sound like a parody. Let accents mark meaningful moments and preserve the narration.

## 62. The subtitle face is chosen, and the word lights by colour only

Subtitles read at WCAG AA contrast, 4.5:1, measured on the final colour with its opacity, for the line and
for the lit word. The karaoke word changes colour only — no scale, no pop, no bounce. Capitals belong to
trailer cards of one to three words, not to subtitles. The face is the theme's own subtitle face
(`--sub-font`): a sans of medium or semibold weight with full Cyrillic, chosen for the theme's mood and
kept for the whole film.

**Counter-example.** Using a theme's serif body face, such as Literata, for subtitles over moving footage impairs reading. Use the chosen subtitle sans face at readable size and light the keyword by color.

## 63. Choose film treatment for the subject and protect evidence

Choose treatment from the intended atmosphere, pace and material. Preserve colors in evidence whose meaning depends on color: `teal-orange` can regrade a real interface into colors it does not have. Grain may add texture to footage or drawn material when the texture earns its encoding cost. `flash` and `shake` give a chosen impact weight, typically with sound on the same anchor; they are strongest in trailers but are not reserved by genre name alone; `overlay.bursts` marks one moment of success, not
confetti on every card. A clean digital frame looks raw in a trailer and honest in a demo.

**Counter-example.** Per-pixel noise can make six seconds of slides weigh 53 MB instead of 1.6 MB and an eighty-second showcase weigh 783 MB. Choose texture for a purpose and inspect its encoding cost.

## 64. The first three seconds show the product

In the first three seconds the viewer sees the product or its result; a title, if there is one, names this
product's mechanism and passes the "cover the logo" test. Put `stills` at 0.5, 1.5 and 3 s and ask of
them: could this opening belong to another product? When the genre asks for a problem first, set the
problem over a real frame of the product (`slides.hero` with the screen as its `image`) or after a
one-second teaser of the result. The playbook records how the sources disagree on the length of the
opening window.

**Counter-example.** A product demo, explainer, pitch, release or reel opening only on a text slide shows no distinctive evidence. Put the product or its result in the opening frame.

## 65. The film ends on its result

The last frame is the result the film promised, with one short next step over it — not a card with a
button on an empty background. A trailer ends on one title card; a short vertical film leads its last
frame back into its first.

**Counter-example.** Several end titles or an empty box with two buttons weakens the close. End over the promised result with one next step, or one title card for a trailer.

## 66. Coordinate motion around an understandable focus

A page lets its reader reduce motion; a film cannot. Give a frame a clear hierarchy: a leading action, supporting movements and any subdued ambient layer. Several coordinated movements can describe one cause: a value travels, a connector draws, code highlights and the camera follows. Separate them when they introduce independent facts or prevent reading. Keep ambient motion out of text; omit it during a reading hold when appropriate. Every drawn scene has a
readable final state; the karaoke word does not scale; a film for a page ships a poster the page shows to
a reader who asked for less motion (`web --poster`). Rule 9 asks the scene to develop, while allowing a stable result and purposeful reading holds.

**Counter-example.** A breathing glow, drifting grid, travelling sheen and live particles behind the same slide create unrelated constant motion. Coordinate movement around the intended focus and quiet it for reading.
