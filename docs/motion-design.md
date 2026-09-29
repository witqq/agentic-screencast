# Motion design: how a film's frame moves so it is not dull

This guide answers one question: how should things move in a film so that the viewer feels a living
product and not a slideshow? Its first half gives the principles that separate a lively frame from a
dull one — order, timing, curves, springs, transitions, rhythm — with the numbers practitioners use.
Its second half is a vocabulary of named effects (a logo marquee, a toast stack, an orbit of icons,
a chat that types) and how to get each one in Agentic Screencast today. It was researched on
2026-09-29 from design-system documentation, practitioners' articles and component libraries, not
from frame-by-frame breakdowns; bracketed numbers point to the sources at the end.

Most timing numbers below come from interface guidelines, where a person clicks and waits. A viewer
of a film clicks nothing, so durations may run longer — marketing and explainer animation "can be
longer" [1], and design systems keep extra-long tokens (700–1000 ms) for large transitions [2][3].
The shape of the curves, the order of entry and "the longer the path, the longer the move" carry over
to video unchanged. At 30 fps one frame is about 33 ms.

## What makes a film dull

A dull frame rarely lacks effects. It lacks order in time: everything arrives at once or with the
same step, every move uses the same curve, nothing on screen reacts to anything, and every cut is a
fade. Five things fix most of it, and each is a decision you take per scene:

1. **Order.** Bring the frame in from the most stable to the most important: frame and title first,
   then the body, then the thing the eye must rest on — last [4].
2. **Groups and waves.** Elements that belong together start together; groups are separated by a
   visible pause; inside a group items arrive in a wave 20–100 ms apart [4][1][5].
3. **The right curve for the move.** Entering decelerates, leaving accelerates, moving within the
   frame eases in and out; linear only for endless loops [6][7][8][9].
4. **Physics where objects are handled.** Cards that are placed, thrown or released move on a
   spring; the parts of an object land a frame or two apart; the object answers the event that
   touched it [8][10].
5. **A transition that states how two scenes relate.** A shared object carries across; steps of a
   process slide along one axis; a detail is entered by zooming into it; unrelated topics fade or cut
   [7][11][12].

The rest of the guide gives the numbers for each and says how to write them.

## Order and choreography

**From stable to important.** IBM Carbon's sequence: static shell, static body (titles, text,
images), dynamic content (data, results), the primary action, and animated content such as charts
last — "always finish a sequence with the important content" [4]. In a scene with a title, three
cards and a result number, the number comes last and the voice pauses on it.

**Stagger — the step inside a group.** Carbon measures a 20 ms stagger on table rows as
"significantly" reducing cognitive load and keeps a whole sequence within 500 ms [4]; Emil Kowalski
uses 30–80 ms and warns that longer delays feel slow [1]; Motion uses 0.04–0.05 s between words
[13][14]. At 30 fps the practical minimum is one frame (33 ms) and two frames (67 ms) is the middle
of the range. When a group is large, give the whole wave a budget (about 400–500 ms) instead of a
step, and let it spread from the centre or the edges rather than always left to right [13][5].

**Groups.** Things that move together read as one object; a different delay says they are separate
[15]. A pricing card's frame, price and button enter as one; three pricing cards enter a step apart.

**The leader moves first.** In a composite object the most important part starts and the rest follow
a frame or two later — "the initiator of the movement will be the most important element" [16].

**Follow-through.** Parts of an object move at different times: shift each following part by one or
two frames and let the tip overshoot a little before settling; one frame already turns "a stiff
board" into a living thing [10]. Keep it off tables and code, where the tone must be exact [6].

**One lead movement at a time.** Several simultaneous animations each lose their pull on attention
[11]. Everything else in the frame is either still or in a very slow background drift.

**How to write it here.** Items of a slide take their moments from `at:` — a list of beat anchors
(`b2`, `b2+0.3`, `b3.end`), seconds or percentages (`help slides`). Write moments so groups start
together (`b2 b2 b2+0.07`) and so the key item lands last. Without `at:` items arrive one per beat or
at an even step over the first 60 % of the speech. On a page you write, `data-at` gives each element
its moment and `window.renderAt(t)` draws from it (`help video`, `page`). `wave: center | edges |
random` hands the same moments to the items in another order — a wave from the middle, from both
edges, or scattered — and `stagger: 0.07` spaces them by a fixed step from the first item's moment
(`help slides`).

## Timing and curves

**Enter decelerates, exit accelerates.** Use ease-out for what arrives, ease-in only for what leaves
for good, ease-in-out for a move within the frame [9][17]. Kowalski prefers ease-out for exits too in
interfaces, because ease-in starts slowly exactly when people look [18][1]; in a film, reserve
ease-in for a final exit nobody watches.

**Curves worth using** (`cubic-bezier(x1, y1, x2, y2)`):

| Purpose | Material 3 [7][19] | IBM Carbon productive / expressive [6] | Kowalski [1] |
|---|---|---|---|
| Move in frame | `0.2, 0, 0, 1` | `0.2, 0, 0.38, 0.9` / `0.4, 0.14, 0.3, 1` | `0.77, 0, 0.175, 1` |
| Enter | `0.05, 0.7, 0.1, 1` | `0, 0, 0.38, 0.9` / `0, 0, 0.3, 1` | `0.23, 1, 0.32, 1` |
| Exit | `0.3, 0, 0.8, 0.15` | `0.2, 0, 1, 0.9` / `0.4, 0.14, 1, 1` | — |

Built-in CSS curves are weak — Kowalski "almost never" uses them and Stripe declares its own set [18]
[20]. Carbon's split is a useful scale for a film: most scenes use the productive curve, the moments
that matter (the result, the final number) the expressive one [6].

**Asymmetry.** Good curves start fast and settle long; appearing takes longer than disappearing [9]
[21]. A result card flies in over 0.5 s on `0.05, 0.7, 0.1, 1` and leaves in 0.25 s on
`0.3, 0, 0.8, 0.15`.

**Duration follows size.** Carbon and Material both grow duration with distance and area [6][7]:

| Change | Duration |
|---|---|
| A small element: a toggle, a dot, a badge | 70–200 ms [6][3][9] |
| A card, a caption, a menu | 250–400 ms [6][3][9] |
| A large reveal, a panel, a dimmed background | 400–700 ms [6][2][3] |
| A transition between scenes in a film | 600–1000 ms [2][3] |

Below ~200 ms a change may go unnoticed — people need about 230 ms to perceive one [22]; above about
500 ms an interface move feels sluggish [9], though a film can afford the longer end for large moves.

**Springs.** A spring keeps position and velocity continuous and settles gradually — "there is no
point where the object abruptly stopped" [8]. Apple tunes springs by perceived duration and bounce:
bounce 0 is smooth and the safe default, about 0.15 adds a livelier tail, about 0.3 is visibly
springy, above ~0.4 use with care [8]. Material uses a damping ratio of 0.9 for position and 1 for
opacity and colour — opacity must never overshoot [7]. Remotion's default spring (damping 10,
stiffness 100) bounces; raise damping to remove it [23]. Springs suit objects that are placed,
thrown or released; bounce 0 for business screens; no overshoot on text that must be read on
landing.

**Do not scale from zero.** Start at 0.9–0.97 with opacity 0 [18][1]; grow a popover from the point
that opened it, a dialog from the centre [18].

**Hold.** After a key element lands, let the frame stand: about half a second after the words stop
before a caption goes [24], about 1.2 s after a click before a zoom returns [25].

**How to write it here.** The entrances of slide items (`enter:` — `rise`, `lift`, `pop`, `word`,
`tilt`, `drop`, `swing` and more, `help slides`) each carry their own curve and duration: `lift`,
`word`, `tilt` and `zoom` decelerate strongly, `pop` overshoots, `rise` and `fade` are the gentle
ones. Overlay cards take `motion: rise | pop | glide | fly` and `enter`/`exit` durations 0.2–2.5 s
(`help overlay`); the camera takes `style: gentle | snappy` or explicit `move` and `return`.
`ease:` on a slide replaces the curve of every entrance: `standard` (`0.2, 0, 0, 1`), `emphasized`
(`0.05, 0.7, 0.1, 1`), `expressive` (`0.16, 1, 0.3, 1`), `spring` (damped, barely overshooting) and
`bouncy` (visibly springy) — and with a named curve, larger elements take up to 40 % longer and small
ones 20 % less, as the duration table asks. `overlay.ease` names the same curves for a scene's
titles, lower thirds, callouts, stickers and toasts; their exits always accelerate. On
your own page use CSS `cubic-bezier` values from the table above and the spring numbers above — CSS
animations and Web Animations there run on the scene's clock.

## Transitions

Choose the transition by what connects the two scenes [7][11]:

| The scenes | The transition | Here |
|---|---|---|
| Share an object (a number, a title, a card) | the object carries across on an arc, blurred in flight | `transition: {"kind":"morph","element":".huge"}` |
| Are steps of one process | a slide along one axis | `push 0.6 left` (or `right`, `up`, `down`) |
| Go from an overview to a detail | a zoom into the detail | `{"kind":"zoom","element":".feat:nth-child(2)"}` or `"at":"0.7 0.3"` |
| Are unrelated topics | a fade through, or a hard cut | a scene's own fade, or `cut` |
| Land on a beat, change the act | a hard cut or a dip | `cut`, `dip 0.6 black` |

A hard cut is "the most basic and possibly the most useful" transition [12]; a film whose every seam
is an effect tires the viewer (film craft 52). A whip pan hides a cut in motion blur and belongs to
fast, vertical and music-led films [26]. A match cut rhymes a shape in the same place in both shots
and needs a reason [27]. A mask transition should come from an object of the frame — a button
opening into a screen — not be a decorative shutter [15]. Two near-identical states cross-fade better
with a 2 px blur during the fade [18].

**A continuous film, not a row of clips.** Separate clips fade out and in at every seam: the frame
goes dark, the background dies, and each scene starts from nothing. A film that flows keeps the
camera travelling: the next scene pushes the last one out along one axis, a new part whips along the
same axis, the camera flies into a chapter card, and a shared object carries across. Keep the axis
through a sequence — changing direction reads as a new camera — and let a scene's own motion
continue into the seam: a slide whose camera is still drifting or pushing when the transition starts
hands its motion to the next one. *In the tool:* `flow: auto` in the header gives every seam without
its own transition such a connected one (push inside a part, whip at a new part, zoom into a chapter
or the outro, a hard cut into a trailer card or title card; up instead of left in a tall frame); name
`morph` yourself where two scenes share an object, and `cut` where a beat must land hard
(`help transitions`).

## Kinetic type

**Split and stagger.** Cut the line into letters for one to three words, into words for a phrase,
into lines for a paragraph; words rise from 120 % below with about 40 ms between them [14].
**Reveal a line from a mask:** each line rises inside its own clipped box — the cleanest way to bring
in a title [28]. **Scramble** decodes a short technical title, a **typewriter** types a prompt, a
**rolling label** swaps a status [14]. **Numbers** animate as values, not characters [14].
**Read time rules the screen:** at most 17–20 characters a second, from the moment the text stops,
never less than about 5/6 s per event [24].

**How to write it here.** `text:` on a slide sets a kinetic style for the title and body: `rise`,
`spin`, `fly`, `slide`, `zoom`, `bounce`, `shuffle`, `drop`, `wave`, `scramble`, `split`, `flip`,
`blur`, `swirl` (`help text`). Overlay titles take `style: rise | slam | type | split` or any of the
same styles; cards take `reveal`. `slides.counter` and `slides.number` roll their numbers; karaoke
captions light each word as it is spoken. `enter: mask` raises each item from under its own lower
edge — the line mask — and a title rotates a word with `{a|b|c}`.

## Depth and camera

**Parallax** separates foreground and background by speed [29]; keep it slow and small — parallax is
the motion people with vestibular disorders name most often as a trigger [30][31]. **A slow drift**
of 2–5 % over a scene keeps a still frame alive; every camera move should reveal something new and
nothing should start or stop abruptly [32]. **Push in on an action** and hold about 1.2 s; 2× is the
useful zoom for a 1440p source [25]. **Zoom in** reads as "deeper into detail", out as "back to the
overview" [11]. Large zooms and orbits should stay slow and keep a still reference in the frame [33]
[30].

**Camera moves that give energy.** A **dolly** pushes in hard with a speed ramp — slow start, rush,
soft landing — and says "look closer". A **pan** travels sideways across a wide subject. An **orbit
in 3D** tilts the whole frame and swings round it, the most "produced" of the moves; use it once or
twice a film. A **hand-held** camera trembles with layered noise that never repeats and makes a calm
frame feel present and urgent. A **shake** is a single jolt on an impact, with a hit sound on the same
frame. Real 3D reads only when it is continuous: the tool keeps a 3D element 3D on every frame, and
stack cards, feature cards, bento cells and `flip3d`/`tilt3d` entrances stand in perspective
throughout.

**How to write it here.** `move: drift | push | still | dolly | pan | orbit3d | handheld` on
full-frame slides (`help slides`); `shake` on a scene for a jolt (scene or music anchors);
`spotlight` and `overlay.camera` for push-ins with a hold, `pan` along a wide subject, `autoZoom` on
takes (`help overlay`, `help capture`); `slides.parallax` and `slides.perspective` for depth;
`motionBlur` in the header blurs camera moves.

## Rhythm and sound

Sound carries half or more of a film's emotional weight [34]. On music, put the visual hit 2–4
frames before the beat, never a frame after; frames per beat = 60 × fps ÷ BPM (15 frames at 30 fps
and 120 BPM) [35]. Snap into the hit pose rather than easing into it [35]. A whoosh under a camera
pass, a riser before a reveal, a click under every shown click — each once, not on every seam [36]
[37]. Change the pace: fast runs, then a pause, then the hit [38].

**How to write it here.** `transition.snap: "music"` places the middle of a transition two frames
before a beat (the pre-hit); `sfx`, `flash` and `shake` take music anchors (`m16`) as well as scene
anchors; `speechAt` lets a hit come before the voice (`help sound`, `help transitions`, `help
overlay`).

## A living frame

Keep something slow alive in every long frame, and keep it away from what is being read: slow
changes without a shift of position pull attention far less than sliding does, so they suit the
background [39]. A drifting gradient, a slow grid, a sheen that crosses a card once, a little grain.
**Secondary action** happens once, at the climax: a status dot blinks, a check mark trembles [16].

**How to write it here.** `background: grid | aurora | mesh | waves | particles | bokeh` on a slide
or `--bg-motion` in the theme (`help slides`, `help themes`) — note that the default `neutral` and
`frost` themes have no live background; `overlay.glints` for a sheen, `overlay.bursts` for confetti
and sparks, `look: {"grain": …}` for grain.

## Effect vocabulary

The effects below are the named devices that make product films feel alive. Each line says what the
effect tells the viewer, how it is built, and how to get it here. **In the tool** means a field
exists; **On a page** means you write it on a `page` scene of your own (`<html data-sc-page>`), where
CSS animations, Web Animations and `window.renderAt(t)` run on the scene's clock (`help video`,
`page`). Keep each effect to its meaning: the same device five times in a film is a tic (film craft
45).

### Living objects

- **Spring pop** — "here is something new". Scale from about 0.95 with opacity 0 to 1 on a spring;
  Magic UI's animated list uses stiffness 350, damping 40 [40]. *In the tool:* `enter: pop`, card
  `motion: "pop"`.
- **Boop** — an object that is already there jumps, twists or swells for an instant and springs back
  when something happens to it: a click, a new message, a changed number. It ties cause to effect
  [41][42]. *In the tool:* `overlay.boops` — `pop`, `shake`, `jelly` or `nod` on a selector at the
  event's moment.
- **Pulse and ping** — "active, listening, here". Tailwind's pulse fades to 0.5 over a 2 s cycle; its
  ping grows to 2× and fades within 1 s [43]. Keep below three flashes a second (film craft 66).
  *In the tool:* `overlay.pings` on a target, area or point; `click: true` on the pointer draws a ripple.
- **Float, wiggle, boil** — an idle motion keeps a held object alive: a slow float, a small rocking,
  or the hand-drawn "boiling line" that changes about twelve times a second. *In the tool:* items
  breathe by default; `alive: float | wiggle | jitter` on a slide gives them a visible life.
- **Jolt** — an object slams in with overshoot and a dying tremor: an impact, an alarm, "this
  broke". *In the tool:* `enter: jolt`; the whole frame trembles with the scene's `shake`.

### Carousels and streams

- **Logo marquee** — "many use it and the list goes on". Repeat the row, move it linearly and fade
  the edges; cycles in libraries run 20–80 s, which a 5–8 s scene must speed up [44][45][46]. *In the
  tool:* `slides.marquee` with `rows: 2` and `speed:`.
- **Card carousel** — "several options, one at a time"; step the row by one card per beat [47][48].
  *In the tool:* `slides.carousel` turns a real 3D ring to each card on its moment.
- **Card stack** — "there are several, this one matters now". Each card behind is 10 px higher and
  6 % smaller; Sonner's toasts shrink 5 % per step [49][50]. *In the tool:* `slides.stack`, standing
  in 3D.
- **Scrolling a long screen** — "there is a lot here". *In the tool:* a tall `slides.shot` scrolls.

### Assembly and layout

- **Bento grid assembling** — "many capabilities, one whole"; cells of different sizes arrive in a
  wave by grid [5][51]. *In the tool:* `slides.bento` (a large first cell, the last ones wide so the grid closes; add `wave:
  center` for the wave), `slides.features` for equal cells.
- **Exploded view** — "what it is made of"; layers part along depth and come back [52]. *In the
  tool:* `slides.layers` lifts cut-out panels of a snapshot to their depths while the camera tilts
  and settles them back; `slides.parallax` hangs them at depths without the tilt.
- **Layout change** — the same objects rearranged keep their identity (list → grid, a card opening)
  [53][54]. *In the tool:* the `morph` transition carries one object between scenes.

### Data

- **Count-up and odometer**, **progress ring**, **growing chart** — *in the tool:* `slides.counter`,
  `slides.number`, `slides.chart`.
- **Bar chart race** — "who leads over time" [55]. *On a page.*
- **Sparkline** beside a number — "and it is growing". *On a page.*

### Lines and shapes

- **Line draw** — a path, a link, an order; animate `stroke-dashoffset` from the path's length to 0
  [56][57][58]. *In the tool:* timeline lines and `slides.chain` arrows draw themselves; overlay
  `marks` draw circles, arrows and underlines by hand. *On a page:* `data-draw` on any SVG shape draws
  its stroke from its `data-at`.
- **Animated beam** — pulses of light run along links from source to target: "data flows from here to
  there"; a 3 s cycle, curvature ±75 [59]. *On a page.*
- **Orbiting icons** — "everything turns around the product": integrations. Radius 160 px, a 20 s
  cycle, no more than two orbits [60]. *In the tool:* `slides.orbit`.
- **Icon morph** — a change of state of one object [61]. *On a page:* `data-morph` on an SVG path
  flows it into a second shape with the same commands and point count.
- **Globe with arcs** — "used worldwide"; arcs fly about 2.5 s and a ping marks the landing [62][63].
  *In the tool:* `slides.globe` (WebGL).

### Interface

- **Typing in a field** — a prompt or a query; about 100 ms a character, uneven rather than
  mechanical [14][64]. *In the tool:* card `reveal: "type"`, `slides.code`, `data-type` on your page.
- **Toast stack** — "the system is alive, events arrive": a new toast slides in over 400 ms, three
  visible, each one behind 5 % smaller, 14 px apart [50][65]. *In the tool:* `overlay.toasts`.
- **Chat bubbles** — the most recognisable frame of an AI product: bubbles pop in turn, typing dots
  before the answer [66][67]. *In the tool:* `slides.chat`.
- **"AI is thinking"** — a sheen across "Thinking…" or three jumping dots for one or two seconds
  before the answer [43][68][66]. *In the tool:* `slides.chat` shows typing dots before each answer.
- **Cursor as an actor** — it arrives on an arc, presses with a ripple, drags [4][25]. *In the tool:*
  `overlay.pointer` with `click` (moves on a slight arc) and the live take's cursor.
- **Toggles, tabs, menus** — the shortest way to show a setting; the thumb slides in about 300 ms
  [54]. *On a page.*
- **Code focus** — dim everything but the working lines [69]. *In the tool:* `slides.code` with
  `highlight:`.

### Devices

- **Device in 3D, turning** — "this is a real product in hand" [70]. *In the tool:* `slides.shot`
  with `device:`, `slides.perspective`, `device:` on a video scene.
- **Into the screen** — the camera enters the device's screen and the work begins [71]. *In the
  tool:* a `shot` scene followed by the recording, joined with `{"kind":"zoom","element":".shot-img"}`
  or a hard cut.

### Text

- **A word across the frame** — the claim on a hit. *In the tool:* `slides.card`.
- **Rotating word** — "Built for teams / agents / you": one word swaps every 2.5–3 s [72][73]. *In
  the tool:* `title: Built for {teams|agents|you}`.
- **Words from blur** — a thought being born; 0.2 s between words for a solemn line [74]. *In the
  tool:* `text: blur`.
- **Marker under a word, strike-through** — the key word, or "the old way"; drawn over about 800 ms
  [75]. *In the tool:* overlay `marks` (underline, circle, arrow) on a target. *On a page:* on a word
  of your title.
- **Scramble** — decoding, search [76]. *In the tool:* `text: scramble`.
- **Split-flap** — an update, a departure [77]. *In the tool:* `text: flip` is the nearest.

### Transitions

*In the tool:* `dissolve`, `zoom-blur`, `whip`, `zoom`, `wipe`, `iris`, `cube`, `flip`, `glitch`,
`flash`, `ripple`, `dip`, `push`, `morph`, `cut`, and `flow: auto` for a whole film
(`help transitions`). Choose by the table in "Transitions"
above. Libraries add liquid and pixel dissolves and light leaks laid over a cut [78][79]; none of
them states a relation between scenes, so keep them for a genre that wants them.

### Background and light

- **Drifting colour** — atmosphere without meaning [80][81]. *In the tool:* `aurora`, `mesh`.
- **Grid with running light** — "technical, precise" [82][67]. *In the tool:* `grid`.
- **Particles** — depth, data, AI [83]. *In the tool:* `particles`, `bokeh`, `overlay.bursts`.
- **Sheen across a card** — "new, premium", once after it lands [68]. *In the tool:*
  `overlay.glints`.
- **Light running along a border** — "this card is recommended": a short beam around the frame over a
  2–6 s cycle [84][85]. *In the tool:* `glow: border` on a slide (feature, stack and bento cards,
  chips; a four-second cycle).

## Too much, and safety

"Don't add motion for the sake of adding motion" [33]. For every movement name what it says — where
the object came from, what belongs to what, what changed, where to look; no answer means decoration,
which is allowed rarely [33][11]. A repeated effect grows annoying [39]; heavily stylised trends date
fast, so take one or two [86]. Large pans, zooms and parallax trigger vestibular symptoms: keep them
slow, small and rare, with a still reference in frame [33][30]. Nothing may flash more than three times
in any second [87] — the build names it (`flashing`).

## Sources

All sources were opened and checked on 2026-09-29.

1. Emil Kowalski — review-animations/STANDARDS.md (GitHub) — https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md.
2. IBM Carbon — motion.json, duration and curve tokens, DTCG (GitHub) — https://github.com/carbon-design-system/carbon/blob/main/packages/motion/src/dtcg/motion.json.
3. Flutter API — Durations class — https://api.flutter.dev/flutter/material/Durations-class.html.
4. IBM Carbon Design System — Motion: Choreography — https://carbondesignsystem.com/elements/motion/choreography/ — updated 2026-09-23.
5. GSAP — Staggers — https://gsap.com/resources/getting-started/Staggers.
6. IBM Carbon Design System — Motion: Overview — https://carbondesignsystem.com/elements/motion/overview/ — updated September 2026.
7. Material Components for Android — Motion — https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md.
8. Apple — WWDC23, session 10158 "Animate with springs" — https://developer.apple.com/videos/play/wwdc2023/10158/ — 2023.
9. Nielsen Norman Group, Page Laubheimer — Executing UX Animations: Duration and Motion Characteristics — https://www.nngroup.com/articles/animation-duration/ — 09.02.2020.
10. School of Motion, Joey Korenman — Animation 101: Follow-Through in After Effects — https://schoolofmotion.com/blog/animation-tricks-follow-through-after-effects.
11. Nielsen Norman Group — The Role of Animation and Motion in UX — https://www.nngroup.com/articles/animation-purpose-ux/ — 12.01.2020.
12. School of Motion, Jacob Richardson — Six Essential Motion Design Transitions — https://schoolofmotion.com/blog/six-essential-motion-design-transitions-tutorial.
13. Motion (motion.dev) — stagger — https://motion.dev/docs/stagger.
14. Motion (motion.dev) — Text animation: split text, typewriter and scramble effects — https://motion.dev/docs/text-animation.
15. IXD@Pratt — Creating Usability with Motion: The UX in Motion Manifest — https://ixd.prattsi.org/2017/04/creating-usability-with-motion-the-ux-in-motion-manifest/ — April 2017.
16. Interaction Design Foundation — UI Animation: How to Apply Disney's 12 Principles of Animation to UI Design — https://ixdf.org/literature/article/ui-animation-how-to-apply-disney-s-12-principles-of-animation-to-ui-design.
17. Jitter Help Center — BM-03 Fix robotic animations with the right easing curve — https://help.jitter.video/en/articles/16072578-bm-03-fix-robotic-animations-with-the-right-easing-curve.
18. Emil Kowalski — 7 Practical Animation Tips — https://emilkowal.ski/ui/7-practical-animation-tips.
19. Flutter API — Easing class and constants emphasizedDecelerate, emphasizedAccelerate, legacy — https://api.flutter.dev/flutter/material/Easing-class.html.
20. Stripe, Benjamin De Cock — Connect: behind the front-end experience — https://stripe.com/blog/connect-front-end-experience — 19.06.2017.
21. MotionCircles — After Effects Graph Editor Tutorial: Custom Easing Curves — https://motioncircles.com/knowledge/after-effects-graph-editor-tutorial-custom-easing-curves/.
22. Val Head — How fast should your UI animations be? — https://www.valhead.com/2016/05/05/how-fast-should-your-ui-animations-be/ — 05.05.2016.
23. Remotion — spring() — https://www.remotion.dev/docs/spring.
24. Closed Caption Creator — Subtitle Reading Speed: CPS & WPM Limits Explained — https://www.closedcaptioncreator.com/blog/articles/subtitle-reading-speed.html — 10.08.2026.
25. Screenify Studio — How to Auto-Zoom in Screen Recordings — https://www.screenify.studio/blog/2026-04-10-auto-zoom-screen-recording — 10.04.2026.
26. Morphic — Whip pan transition — https://morphic.com/resources/videos/whip-pan-transition-videos — 2026.
27. Morphic — Match cut vs jump cut — https://morphic.com/resources/videos/match-cut-transition-videos — 2026.
28. GSAP — SplitText — https://gsap.com/docs/v3/Plugins/SplitText/.
29. Motion Design School — Parallax Effect in After Effects — https://motiondesign.school/blog/parallax-in-after-effects/.
30. Val Head, A List Apart — Designing Safer Web Animation For Motion Sensitivity — https://alistapart.com/article/designing-safer-web-animation-for-motion-sensitivity/ — September 2015.
31. W3C WAI — Understanding Success Criterion 2.3.3: Animation from Interactions — https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html.
32. RenderEdge Studio — What Is Apple Style 3D Animation? — https://renderedgestudio.com/what-is-apple-style-3d-animation/ — 2026.
33. Apple — Human Interface Guidelines: Motion — https://developer.apple.com/design/human-interface-guidelines/motion.
34. School of Motion — Making Giants Part 10: Sound Design for Animation — https://schoolofmotion.com/blog/making-giants-sound-design.
35. Animator Island — Animation Secret: Animating to Music — https://www.animatorisland.com/animating-to-music/.
36. Krotos Sound Magazine (Tommy Bradly, Esrever Audio) — Whoosh Sound Effects — https://sound.krotosaudio.com/whoosh-sound-effects/.
37. Morphic — Riser sound effect — https://morphic.com/resources/sounds/riser-sound-effect — 2026.
38. Todaymade — 25 Kinetic Typography Examples — https://www.todaymade.com/blog/kinetic-typography-examples.
39. Nielsen Norman Group — Animation for Attention and Comprehension — https://www.nngroup.com/articles/animation-usability/ — 21.09.2014.
40. Magic UI — Animated List — https://magicui.design/docs/components/animated-list.
41. Animate.css — https://animate.style/.
42. Dan Ebberts, MotionScript — Bounce and Overshoot — https://www.motionscript.com/articles/bounce-and-overshoot.html.
43. Tailwind CSS — Animation — https://tailwindcss.com/docs/animation.
44. Magic UI — Marquee — https://magicui.design/docs/components/marquee.
45. Magic UI — marquee.tsx source — https://raw.githubusercontent.com/magicuidesign/magicui/main/apps/www/registry/magicui/marquee.tsx.
46. Aceternity UI — Infinite Moving Cards — https://ui.aceternity.com/components/infinite-moving-cards.
47. GSAP — Helper function seamlessLoop — https://gsap.com/docs/v3/HelperFunctions/helpers/seamlessLoop.
48. Motion — Carousel — https://motion.dev/docs/react-carousel.
49. Aceternity UI — Card Stack — https://ui.aceternity.com/components/card-stack.
50. Emil Kowalski — Building a toast component — https://emilkowal.ski/ui/building-a-toast-component.
51. Aceternity UI — Bento Grid — https://ui.aceternity.com/components/bento-grid.
52. Arise3D — Exploded View Animation for Product Marketing & Sales — https://arise3d.com/exploded-view-animation-a-game-changer-in-marketing/.
53. GSAP — Flip plugin — https://gsap.com/docs/v3/Plugins/Flip/.
54. Motion — Layout animations — https://motion.dev/docs/react-layout-animations.
55. Flourish — Bar chart race — https://flourish.studio/visualisations/bar-chart-race/.
56. CSS-Tricks, Chris Coyier — How SVG Line Animation Works — https://css-tricks.com/svg-line-animation-works/ — 18.02.2014.
57. GSAP — DrawSVGPlugin — https://gsap.com/docs/v3/Plugins/DrawSVGPlugin/.
58. Remotion — evolvePath() — https://www.remotion.dev/docs/paths/evolve-path.
59. Magic UI — Animated Beam — https://magicui.design/docs/components/animated-beam.
60. Magic UI — Orbiting Circles — https://magicui.design/docs/components/orbiting-circles.
61. GSAP — MorphSVGPlugin — https://gsap.com/docs/v3/Plugins/MorphSVGPlugin/.
62. GitHub Blog, Tobias Ahlin — How we built the GitHub globe — https://github.blog/engineering/engineering-principles/how-we-built-the-github-globe/ — 2020-12-21, updated 2021-02-11.
63. Stripe Blog, Nick Jones — the Stripe globe — https://stripe.com/blog/globe — 2020-09-01.
64. Magic UI — Typing Animation — https://magicui.design/docs/components/typing-animation.
65. Sonner — Toaster API — https://sonner.emilkowal.ski/toaster.
66. Motion — Examples — https://motion.dev/examples.
67. Grafit — How to make a SaaS product demo video, 12 examples — https://www.grafit.agency/blog/saas-product-demo-video.
68. Magic UI — Animated Shiny Text — https://magicui.design/docs/components/animated-shiny-text.
69. Code Hike — documentation — https://codehike.org/docs.
70. Rotato — 3D mockup generator — https://rotato.app/.
71. Aceternity UI — MacBook Scroll — https://ui.aceternity.com/components/macbook-scroll.
72. Magic UI — Word Rotate — https://magicui.design/docs/components/word-rotate.
73. Aceternity UI — Flip Words — https://ui.aceternity.com/components/flip-words.
74. Aceternity UI — Text Generate Effect — https://ui.aceternity.com/components/text-generate-effect.
75. Rough Notation — https://roughnotation.com/ and README https://github.com/rough-stuff/rough-notation.
76. GSAP — ScrambleTextPlugin — https://gsap.com/docs/v3/Plugins/ScrambleTextPlugin/.
77. Wikipedia — Split-flap display — https://en.wikipedia.org/wiki/Split-flap_display.
78. gl-transitions — repository and catalogue — https://github.com/gl-transitions/gl-transitions and https://github.com/gl-transitions/gl-transitions/tree/master/transitions.
79. Remotion — Light Leaks — https://www.remotion.dev/docs/light-leaks.
80. Kevin Hufnagl — How To: Create the Stripe Website Gradient Effect — https://kevinhufnagl.com/how-to-stripe-website-gradient-effect/ — 2021; the noise technique in the open reconstruction https://github.com/exzenter/gradient-stripe/blob/main/README.md.
81. Aceternity UI — Aurora Background — https://ui.aceternity.com/components/aurora-background.
82. Magic UI — Retro Grid — https://magicui.design/docs/components/retro-grid.
83. Magic UI — Particles — https://magicui.design/docs/components/particles.
84. Magic UI — Border Beam — https://magicui.design/docs/components/border-beam.
85. Aceternity UI — Moving Border — https://ui.aceternity.com/components/moving-border.
86. CRITICA — Motion Graphics Trends 2026: What's New — https://www.criticatv.com/motion-graphics-trends-how-visual-storytelling-is-evolving-in-2026/ — April 2026.
87. W3C WAI — Understanding Success Criterion 2.3.1: Three Flashes or Below Threshold — https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html.
