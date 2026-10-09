# Scenario playbook: how to write a film for its purpose

This document answers: what story shape, length, hook and close fit the film's genre. It is a
condensed guide to the story shapes that work for each kind of film, taken from published practice
rather than invented, and translated into Agentic Screencast scenes. It complements
[film craft](film-craft.md), which explains directing rules and concrete counterexamples (one text
layer at a time, the camera vocabulary, stopping time inside the shot, measuring the result);
those are not repeated here. Vertical films for Reels, Shorts and TikTok have
[their own guide](vertical-video.md). Bracketed numbers point to the
sources at the end.

Read the sources with two caveats. Most length and pace numbers are measured on English, and no
source gave a Russian narration rate; Russian data exists only for subtitle reading speed [37].
Many sources are blogs of companies that sell video tools, so their statistics are not
peer-reviewed; the research sources are NN/g [13–15], Guo/edX [43], Mayer [40], Muller [41], the
illusion-of-understanding study [42] and Cutting [35]. Lines marked **In the tool** are our
translation of a rule into scenes, not a claim of the source.

The genre shapes below are researched alternatives, not a compulsory sequence. Choose the development from the material and the response you want: a result can precede its explanation, parallel outcomes can carry a comparison, and a recurring action can establish a motif. Combine genres when their purposes fit; preserve what the viewer understands through each change. [Directing](directing.md) develops this choice, and [combinations](combinations.md) coordinates the actions.

Every genre has a skeleton scenario in [`templates/`](../templates/) that builds with the free
`stub` voice. Copy one next to your material and replace the placeholders.

## Turn the explanation into visible actions

Use the [directed-scenes guide](directed-scenes.md) when the story explains a mechanism: it maps questions to ready Report compositions and gives worked films for the first edit of inherited values, palette-color resolution and delivery through a queue. Write the change as an action at a speech beat, then choose an existing effect that makes its relationship visible. A copied value should arrive at its new owner; a queued event should reach its consumer; a changed setting should produce a visible result. A succession of static boxes with spoken explanations leaves that work to the viewer.

Whenever a system interface appears, first show it whole, then focus and zoom into the part the narration names. Apply this in every format, including a portrait short, a screenshot or a presentation. Keep a recognisable location during the approach. Automatic portrait conversion of landscape pages and marked capture footage supplies the opening overview; a native portrait page needs an authored overview before its details. See the [buildable interface scene](../example/interface-overview/README.md).

## Rules every genre shares

- **The first seconds decide.** Every source asks for the main thing at once; the window ranges
  from 3 s [3] through 8 s [6], under 10 s [29], 10 s [8] and 15 s — the seconds that decide
  whether the rest of the script is needed at all [11] — to 20 s for the problem [1] and 30 s for
  the value [5][13]. Never open on a logo [7][27] or a long introduction [14]. The sources disagree
  on what fills the window — a demo "sets the situation" in its first ten seconds [8][9], a vertical
  short shows the result in one to three [the vertical-video guide](vertical-video.md), a page puts
  the product on its first screen ([the visual-design guide](visual-design.md)). The tool reconciles
  them: the product or its result is in view within three seconds, and a problem, when the genre opens
  on one, is set over a real frame of the product (film craft 64).
- **Shorter is finished more often.** 65% finish a business video under a minute, 20% one longer
  than 20 minutes [3]; most web video runs 1–2 minutes, because people browsing the web dislike
  watching passively for long [15]; learning video plateaus at about six
  minutes of watching whatever its length [43]. A longer film can still earn more total watch time
  from a more interested audience [2].
- **One idea per unit.** One slide, one idea [17]; a slide is understood in about three seconds —
  the glance test [21]; one demo, one scenario [8]; one release film, one launch [7]; a long
  process becomes a series [14][43].
- **Problem → solution → action** is a common product and persuasion shape, with the viewer as the hero and the product as the guide [1][8][9][19][22][23]. Keep it as one option alongside the researched pitch order, trailer acts, investigation, result-to-cause and parallel comparison. A short vertical film may use hook, value, proof and call ([the vertical-video guide](vertical-video.md)). For an interface operation, orientation, action, evidence and interpretation keep the behavior understandable; they need not be separate scenes or the order of the whole film. Every UI action
  shown needs a nearby explanation of what changed and why; a camera move cannot substitute for
  that explanation.
- **Benefit, not feature**: after each feature ask "so what?" and answer with the user's gain
  [5][10][26][44][45].
- **Understandable without sound** [4][14][29].
- **Conversational text, read aloud before recording** [1][12][40]: a table read finds the
  phrases that look fine on paper but sound awkward spoken [12].
- **Nothing extra**: extra words, pictures and sounds hurt understanding [40]; extra text is an
  "information distraction" [17]; busy editing and distracting music too [10].
- **Energy varies**: permanently high energy stops feeling high [24]; strong talks alternate
  "what is" and "what could be" [20].
- **Close on one clear next step** [1][4][5][7][8][9][19][27], written over the frame of the result the
  film promised rather than on a card with a button on an empty background (film craft 65).

**Narration rate.** 120–160 words per minute, typically 150 (2.5 words a second) for English
[11][46][47]; a one-minute film holds 140–150 words, and 240 wpm sounds rushed [46]. Professional
e-learning narrators read slow at 140, medium at 150 and fast at 160 wpm [47]; Synthesia's
120–150 wpm already includes pauses when it sizes a script [11]. Wistia caps a 1–2 minute
explainer at 250 words [1] — a ceiling on volume, not a pace.

**Text on screen.** Subtitle norms give the reading ceiling: Netflix English 20 characters a
second for adults and 17 for children [36]; Netflix Russian 17 for adults and 13 for children,
with 20 and 17 for subtitles for the deaf and hard of hearing [37]; two lines of at most 42
characters [36][37]; a subtitle lasts at least 20 frames (four fifths of a second) with 2 frames
between subtitles [38]. BBC live subtitles run at 160–180 words a minute (formerly 130–150),
which is about 15 characters a second by the rough English conversion "words a minute ≈
characters a second × 10" [39]. The 15 cps of film craft (rule 5) sits at the gentle end of this
range and holds on a landscape screen; on a phone read slower, about 13 characters a second
([the vertical-video guide](vertical-video.md), "Architecture and real interfaces on a phone").

**In the tool.** A beat of narration is one paragraph; at 150 wpm a 25-word beat lasts about ten
seconds. Use `agentic-screencast script` to count words before paying for speech.

**Motion.** Each genre below closes with the motion it wants: which recipe of [the motion-design
guide](motion-design.md) ("Composition recipes") fits its scenes, which transitions, how much energy
and what to leave out. Three principles carry across genres: one understandable focus with coordinated leading and supporting actions (film craft 66;
`motion-stack` calls attention to overlapping camera/reading effects, not every valid combination), a push-in no faster than the viewer can follow
(`harsh-push`), and a change of pace across the film — a fast run, a calm scene, then the hit —
rather than one tempo from start to end (`pace` on slides, the length of the scenes, the music).

## A branch result or a new feature

**Purpose.** Show colleagues or the owner what a piece of work added to a product: a branch, a
feature, a release candidate. The evidence is the product itself — its code, its commits, its
running build — and the film is judged by whether it shows everything the work did
([film craft](film-craft.md), rules 2, 11, 27, 40).

**Shape.** What was missing → what appeared → what it can do → how much it holds under load → how it
is controlled → where to get it. Each part closes its question; return to the overview when location would otherwise be lost, or preserve a shared object so the next starts
clean (film craft 3). The capability table decides what must appear, not the order (film craft 41);
the strongest result gets the strongest shot (40); behaviour under load is shown with the product's
own numbers (12); control surfaces are part of the film when the owner says so (26).

**In the tool.** Live takes of the running product (`recordTake`), one take per chapter (film craft
21, 28); `spotlight` for each part the narration names; a closing `slides.outro` with where to get
it. Skeleton: [`templates/product-demo.md`](../templates/product-demo.md) adapted to the six parts.

**Motion.** The product moves, the film around it stays quiet: `flow: auto` with a push along one
axis inside a part and a zoom into each new part; recipe 3 (a setting that changes the product) for
the control surfaces, recipe 4 (the number that proves it) for behaviour under load. No
decorative background and no hits: the evidence is the spectacle.

## A film without a product

**Purpose.** A parody, a teaser for an idea, a story told with other people's footage — a film whose
material is found, not captured. The evidence step becomes the material table of the skill's step 2.

**Shape.** The genre's own shape — a trailer's acts, an explainer's four beats — told with found
material; for the comic trailer, [the action trailer and its parody](#the-action-trailer-and-its-parody).
The strongest piece of material gets the strongest shot, as in any film.

**In the tool.** Clips come through [the visual-assets guide](visual-assets.md) ("Video clips"), sounds
through [the sound guide](sound.md); `agentic-screencast sheet` lays out a downloaded clip to choose
its pieces, `from`/`to` cut them, `fit: cover` fills the frame with a clip of another shape.

**Motion.** Borrowed from the genre it tells: a parody trailer takes the trailer's motion below in
full seriousness, an idea teaser the explainer's calm one. Found clips carry their own motion, so the
tool's devices are fewer: a push-in on the detail that makes the joke, `speed` for the dramatic
beat, a hard `cut` on the music.

## Business presentation and pitch

**Purpose.** Convince the person who decides and leave a few ideas in memory: YC picks 5–7 key
ideas with each company because an audience keeps only a few [17]; Kawasaki limits a deck to ten
slides because people take in about ten concepts at once [18].

**Length.** Live: 10 slides, at most 20 minutes, type no smaller than 30 points, because small
type only serves to cram in more text [18]; Demo Day: 5–7 slides [17]. No source sets a norm for
a recorded video pitch; the nearest are 30–60 s sales videos and 15–60 s promos [3] and promos
under a minute [2]. Aiming a recorded pitch at the lower end of that range is our inference, not
a norm.

**Structure.** Three frames that fit together:

1. *Content order — the Sequoia template* [16]: company purpose in one declarative sentence;
   problem (the pain of the customer, or of the customer's customer, and how they cope today);
   solution (the value proposition, where the product physically sits, and use cases); why now
   (the historical evolution of the category and the recent trends that make the solution
   possible); market size (the customer profile, TAM, SAM and SOM); competition (competitors and
   your advantages); product (the line-up and the roadmap); business model (revenue model,
   pricing, average account size or lifetime value, sales and distribution); team (founders,
   board, advisors); financials (P&L and cash flow; the balance sheet, cap table and deal terms
   are marked optional).
2. *Drama — Nancy Duarte's three acts* [19]: act one introduces the hero (the audience), the
   setting and the conflict; act two is "all about contrast" — data, stories, obstacles; act three
   shows the solution and ends with a clear call to action. Inside it the **sparkline**
   alternates "what is" and "what could be" many times, not once at the end; without contrast
   information "may be accurate but rarely persuades" [20].
3. *Role of the narrator — StoryBrand* [22]: the customer is the hero with a problem, the brand is
   the guide who gives a plan and calls to action; stakes are what the hero loses and gains.

Related advertising frames: AIDA — attention, interest, desire, action, in Lewis's 1910 wording
"attract attention, maintain interest, arouse desire, get action" [23]; PAS — name the problem,
agitate it by explaining why it hurts, offer the solution [10].

**Hook.** The first sentence is the company's purpose [16]; the first act shows the audience's
current reality and conflict [19].

**Text.** Large, bold, simple type with high contrast, text near the top [17]; make the meaning
explicit — a label on the growth chart works as a crib right on the slide [17]; remove
information distractions [17]. Test each slide on a stranger: if they cannot name its idea at
once, the slide has failed [17].

**Close.** The solution and a call to action that is easy to take [19]; the sparkline ends higher
than it began [20].

**Mistakes.** Unreadable, complex, subtle slides [17]; a dry stream of data or unbroken optimism
without contrast [19][20]; the company as the hero [22]; several ideas on one slide [17][21].

**In the tool.** A Sequoia section or a Duarte act is a chapter (`slides.chapter`); the glance
test sets the minimum time a card or silent slide stays up — about three seconds; the sparkline is
a rhythm of `slides.compare` "is / could be" beats between live evidence.
Skeleton: [`templates/pitch.md`](../templates/pitch.md).

**Motion.** Confident and calm: recipe 1 for the purpose (a `dolly` push-in, the key word marked),
recipe 4 for traction (`spark:` under the counter, `pace: calm`), a `morph` where a number carries
into its detail, `flow: auto` for the rest. The contrast of "what is" and "what could be" is the
energy; a strike-through of the old way (`~~…~~`) and a marker on the new one say it in the title.
This calm staging leaves out hits and uses recipe 5 for the market or ecosystem. Other staging can use impacts or several living kinds when they develop the material and preserve reading; the genre name sets no quota.

## Product demo, walkthrough, SaaS explainer

**Purpose.** Help a prospect decide whether to buy [9]; depth follows the funnel — benefit shorts
at the top, overview in the middle, feature detail at the bottom [4].

**Length depends on where it plays:** 60–90 s, with engagement dropping after two minutes [5];
ideally 2 minutes, at most 5 [4]; demo 2–5 minutes, explainer 60–90 s [3]; intro demo 2–3 minutes,
full walkthrough 15–30 [9]; social feed 15–30 s, home page 60–90 s, product page 90 s–3 min, sales
3–5 min, onboarding 2–4 min or a series [8]; under a minute averages 52% engagement [2].

**Structure.**
1. *A problem the viewer recognises* — the first ten seconds set the situation, and the product
   enters as the resolution, not as the subject [8][9].
2. *The win first* — reach the core value within 30 seconds so that a viewer who leaves early
   still understands it; Arcade's example opens on a filled dashboard with a project finished on
   time [5].
3. *One scenario end to end*, not a feature tour; two decisive scenarios make two demos [8]. Where the
   product catches a mistake, "attempt → refusal → fix → acceptance" is stronger than the green path,
   with the refusal's exact text on screen ([the visual-design guide](visual-design.md), "Signs of
   quality").
4. *Benefit, not feature* — the "so what?" test [5].
5. *A call to action that follows from what was seen* [5] — usually to contact sales or to move
   on to deeper material [4].

**Hook.** "On average you have a few seconds" [4]; 47% of a video's value is in the first three
seconds (Facebook data quoted by Vidyard) [3]; the window ranges from 3 to 30 s [3][5][8].

**Shots.** Avoid needless motion [4]; the real, current interface, never stock footage or an old
version [6][7]; show the input that led to a result, not only the result [7].

**Text.** Conversational, short sentences [5]; no jargon or abbreviations [4][9]; subtitles for
accessibility [4]; a script, rehearsed to fit the time [4].

**Close.** A concrete next step [5][8][9].

**Mistakes.** Features the viewer cannot relate to; a slow start [5]; opening with the company's
history; showing everything; no call to action [8][9]; jargon, skipping the editing that would
tighten the pace, and unhandled objections [9].

**In the tool.** "One scenario end to end" is film craft's one unbroken take; "the win in 30
seconds" means the first live `video` scene shows the product's result, not an empty screen; the
"so what?" answer is the caption over the shot, the feature name is not.
Skeleton: [`templates/product-demo.md`](../templates/product-demo.md).

**Motion.** The scenario's own action carries it: recipe 3 (pointer, press, the page answering, a
toast, then a push-in on the consequence) or a live take with `autoZoom`; recipe 2 when the product
answers with AI; recipe 6 for a developer product. `flow: auto` keeps the demo one stream; a `zoom`
transition into the detail says "look closer". Keep the frame still under text the viewer must read
("avoid needless motion" [4]).

## Trailer and teaser (film and game craft applied to a product)

**Purpose.** Make a viewer who owes you nothing want more; they may leave any second. Steam warns
you may have under ten seconds and a muted viewer [29].

**Length.** Aim for 90 s for games and 150 s for Hollywood-style trailers; "make game trailers 90
seconds or less"; the word trailer promises a pace hard to hold beyond three minutes [25]. Lieu's
scale of what a length promises: 0–30 s is a snack, 30–90 s an aperitif, 90–180 s a main course,
and anything longer a feast [25]. A
first rough cut runs 60–90 s [27]; promos and teasers stay under a minute [2][3]. Steam builds a
six-second micro-trailer from six one-second pieces of your first video [29], so any second of
the film must show the product on its own. A trailer-music template allots act one 15–30 s, act
two 20–60 s, act three 30–60 s and a 5 s end card [33] — a reference for music, not a norm.

**Structure.**
- *Cold open* — a gripping, funny or dramatic moment understood almost without context; then
  introduction, escalation (the antagonist or the main problem appears) and climax where "the
  music swells and the most exciting shots come one after another" [24]; Lieu calls this a
  three-act structure with an opening act added in front [24]. PremiumBeat's three acts:
  characters and world; complications; their escalation [30]; the music follows the same arc of
  setting, build and peak [34].
- *Button* — "a final joke, a striking gesture or a strong line after the main title, just before
  the end"; optional [32].
- *Tell, Show, Repeat* — the simplest product shape: shots that set the genre, a title naming one
  pillar of the product, shots proving the title, repeat, end on a montage of the best [26].
- *Energy curve* — start strong, drop, then build to the climax: "if a trailer is high energy all
  the time, nothing in it feels high energy" [24].

**Hook.** Which 1–5 shots show the genre and its twist [27]; grab the viewer as early as possible
in the age of autoplay [28]; the first video should be mostly gameplay with the interface visible
[29]; studio logos at most a second each, after the cold open [27].

**Rhythm.** The editing rhythm is the trailer's most important ingredient, and its overall rhythm
and tone should be felt before the edit begins [30]. Act three uses
fast cuts and big hits on cuts [33]. Move to the next block only after the current one has said
its piece; such transitions act as chapter boundaries [31]. Between action blocks place accents —
a joke, a close-up, one strong line; every on-screen text gets a sound hit; everything is cut to
the music, and changing the music means re-cutting [31]. Cut to black on the last striking shot
before the title [24]. For scale: the average shot in recent popular films lasts about four
seconds, against about eleven in the early sound era; Cutting finds such films divide into
roughly four equal parts — setup, complication, development and climax — with the shortest shots
in the climax [35].

**Text.** Feature titles like "throw the ball to beat the opponent" fit a thousand games; titles
about goals and meaning are stronger [26]; titles that state what is happening take load off the
edit [26]. For the cover image Steam advises no text and a frame that shows unique content [29].

**Close.** One call-to-action title, not two or three — viewers leave after the title [27]; an
optional button after it [32].

**Mistakes.** Permanent high energy [24]; generic feature titles [26]; several end titles [27];
longer than three minutes [25]; a logo first [27]; a film that does not read without sound [29].

Not confirmed: "the rule of three" and "hook — build — button" did not appear as named trailer
rules in the checked sources; only their parts did — cold open [24], build [24][34], button [32].
Listing things in threes appears only in secondary analyses of Apple keynotes, so it is not
adopted as a rule of trailer editing. As a comedy device the three is confirmed — see the action
trailer's parody below [77].

**In the tool.** "Gameplay first" means a live capture of the interface as the first scene, not a
title slide; Tell-Show-Repeat is a pair of a short `slides.chapter` title and a `video` shot; the
energy curve is `speed` slow motion and holds in the middle and short cuts at the climax; the
short cuts are `transition: cut`, which joins shots edge to edge without the fades a plain scene
has; the cut to black before the title is `transition: dip` (to white for an impact); the
button is a short scene after the end card.
Skeleton: [`templates/trailer.md`](../templates/trailer.md).

**Motion.** Recipe 7: hits (`flash`, `shake`, `rgb`) on the music's beats with a sound on each, the
energy curve in the pace — `pace: snap` and short scenes in the climax, a held shot or slow motion
before it — hard cuts inside an act and one other transition kind (`dip`, `leak`) between acts.
`slides.wall`, `warp` and a card with the product in its letters (`fill`) are the trailer's own
spectacle. A wall can instead show breadth, warp can express speed, and fill can tie a claim to its evidence in another genre; choose by the material and intended response.

**Without music.** Recipe 7's hits need a sound — a flash or a shake without one reads as a glitch —
so find a free track first: [the sound guide](sound.md) lists the sources whose licences allow it.
A trailer that must stay silent keeps its rhythm in the cut and the type: hard `cut`s on the
narration's stresses, scenes of two to three seconds in the climax, a kinetic title on the claim,
the product in every card — and no hits (`lint` names hits with nothing to sound them, `silent-hits`).
`slides.card` slams in with a flash of its own, so a silent trailer sets its words on
`slides.hero` with a kinetic title instead. The button card holds longer, since no sting ends it.

### The action trailer and its parody

A film trailer in the Hollywood action manner, and the comic trailer that borrows it — a grand
voice and hits on every card about something trivial. Sources are primarily
practice write-ups by trailer editors and composers, and "(via snippet)" marks a claim taken from
search results because the page itself did not open.

**Lengths.** A theatrical trailer may run at most 2:30 under the MPA rule, with one exception a
year per distributor; in 2014 cinema owners asked for two minutes [48]. Across trailers for more
than 20,000 films of 2000–2016 the mean is 114 s [49]; a teaser runs about 20–30 s [50], a TV spot
30–60 s [48]. A 60–90 s film sits between a teaser and a TV spot: act one gets 15–20 s, act two
20–30 s, the climax 15–20 s, and 5–8 s go to the title, the button and the date — our scaling of
two-minute schemes [33][53].

**Micro-teaser.** A trailer can open with a 5–10 s preview of itself — the
wildest shot, a hit, the title — so the viewer does not scroll on [48][51].

**Loud only after quiet.** The music stop is "perhaps the most useful trick of a trailer editor":
the music stops to land a line, a punchline or a stunning shot — on a natural beat of the music,
with a visual accent, sweetened by a hit or a cymbal when the stop is abrupt, and not too often, or
the film turns choppy [52]. A stop-down separates the acts [33]; about two seconds of near silence
before the last hit make the final shot land twice as hard [53]; the title lands on the loudest
moment of the track after a deliberate beat of silence [54].

**Hits.** The biggest hits are kept for the title, the openings, the turns and the button: "one
well-placed hit is strong, four are a parody" [55]. A hit goes a frame or two before the cut; a
braaam a semitone off the music's key sounds amateur however clean the edit [55]; the hits of act
two come closer towards its end [56]. The
sound vocabulary and where to find each sound: [the sound guide](sound.md).

**Shots.** Hold shots in act one (2–4 s each), shorten them act by act and cut hardest on the hits
[53]; the climax is a montage of the strongest images, a hit on every cut [53][33].

**Cards.** Trailer cards are date, copy (story), pedigree (famous names), title, billing block and
rating cards [32]. One phrase split across cards between shots — "This summer" / "get ready" /
"to rumble!" — carries what a voice would need longer for (via snippet) [57]; a card holds three or
four words for under a second, in a type that matches the film's tone [54]. Trajan, Roman capitals
drawn from the Trajan column, became the movie-poster type [58]; chrome letters with a travelling
glint were the trailer look of the 1990s and 2000s (commercial sources, via snippet) [59].

**Black and white.** A dip to black says "this thought is finished", a straight cut asks the viewer
to link two shots; too many dips look amateur (via snippet) [60]. A white flash comes in over one or
two frames and dies out over eight to twelve, usually under a muted blast (via snippet) [61].

**The action vocabulary.** Slow motion for drama, and a speed ramp from slow to normal or back [62];
the low-angle hero shot that circles the hero (via snippet) [63]; the hero walking away from an
explosion without looking back (via snippet) [64]; ever closer and ever quicker close-ups of the
eyes before the clash, released by the shot (via snippet) [65]; the gear-up montage — a flurry of
close-ups with push-ins, whip pans and white flashes, ending on a wide of the hero ready [66]; a
split screen around a ticking clock (via snippet) [67]; a shaking camera on two or three hits of the
climax, not everywhere — even a fraction of a second has to show something (via snippet) [68].

**The voice.** "In a world…" establishes a grand narrative tone and can make a comic trailer read as parody [69][48]. Music, sound and lines from the film can carry the story without a narrator. A brief opening such as "This summer" can lead into a call for the viewer to do what the heroes do (via snippet) [70].

**The comic trailer.** Bathos — the high style applied to a trivial subject — is its engine [71];
the mock-heroic swells heroic qualities over a trifle [72]. The delivery must be serious: a wink
kills the contrast. A recut trailer changes a film's genre by sound, voice-over and a rating card
alone [73]. Honest Trailers add a joke cast list, an "honest" title and one more joke after it (via
snippet) [74]. The Gilligan cut shows a character doing the opposite of what they just vowed [75];
a record scratch with a freeze frame and "Yep, that's me" starts the story over (via snippet) [76].
The comic three: two items set a pattern, the third breaks it, told fast [77]. Reaction shots
often get the laugh (via snippet) [78]. Humour added only in the edit is the riskiest kind, and one
hit can make a trailer read as a comedy, a blockbuster or a horror (via snippet) [79].

**The ending.** Cut to black on the last strong shot → the title on the loudest hit after a beat of
silence → the button, a last joke with the music stopped → one date card [32][53][54]. A teaser only
announces that the film is coming [50], so "coming soon" stands in for a date.

**In the tool.** The micro-teaser is the first scene with a `flash` and a hit in `sfx`; the music
stop is `music: stop` on a scene's anchor; a stop-down is that stop with a short hold of the
picture; the split phrase is a row of short `slides.card` scenes joined by `transition: cut`, each
with a hit; the title is a `slides.titlecard` entered by `transition: dip`; white flashes and shakes
on the climax's hits are `flash` and `shake`; slow motion with a ramp and drawn frames is `speed`
with `ramp` and `interpolate`; a hit before the voice is `speechAt`; `theme: blockbuster` gives the
chrome capitals and the fire. `agentic-screencast help overlay`, `help transitions` and `help sound`
name the fields.

## Explaining an idea or a concept

**Purpose.** The viewer understands the mechanism and can retell it — the genre with research
behind it.

**Length.** 1–2 minutes; under 30 s feels like a TV ad, over two minutes loses the audience;
under 250 words [1]; 60–90 s [3]; up to two minutes [10]. An overview of a process (not a
step-by-step lesson) should be as short as possible, under 30 s is a good target [13]. Learning
video: across 6.9 million edX sessions median watching plateaus at six minutes whatever the
length, and viewers spend about three minutes on videos longer than twelve [43].

**Structure.**
- *Wistia's four beats* [1]: about the first 20 s — who the customer is and the problem; the
  solution in one sentence; by about 30 s — how it works, step by step; a clear call to action.
- *PAS* — problem, agitation, solution [10]; TechSmith's attention, agitation, activity, action
  [12].
- *Through the misconception.* In Muller's experiment (364 students, Newton's laws) a video that
  names and refutes the common misconceptions, and a student–tutor dialogue, gave the largest
  gains over a smooth exposition — effect sizes 0.79 and 0.83 [41]. The opposite danger: a video
  containing misconceptions produced the same confidence as a correct one but more wrong
  beliefs — the illusion of understanding [42].
- *Names first* — pre-training: complex material is learned better when the key terms are known
  beforehand [40].
- *In portions* — segmenting [40]; several short videos for a multi-step process [14], and links
  to timecodes so a viewer can jump straight to the step they need [14]; Guo's own conclusion is
  to cut lectures into small pieces [43].

**Hook.** Open with the viewer's problem [1]; win attention with the first line [12]; no long
introductions — the main complaint in NN/g studies [14]; attention drops within about 30 s and
viewers check the progress bar early [13].

**Rhythm.** Narration and its animation at the same time, not one after the other (temporal
contiguity); signals that show structure — arrows, highlights, section dividers (signalling) [40].

**Text.** Conversational beats formal (personalisation) [1][40]; second person, questions,
metaphors and analogies [10]; labels next to what they describe (spatial contiguity) [40]; no
extra words, pictures or sounds (coherence) [40].

*Sources disagree about on-screen text.* Mayer: graphics plus narration beat graphics, narration
and the same printed text (redundancy) [40]. NN/g: people often cannot turn sound on and value
text they can follow without audio [14]; Steam and Vidyard also demand sense without sound
[4][29]. Reconciled: redundancy applies to viewing with sound; for muted viewing text is needed,
but it should not repeat the narration word for word over a busy frame.

**Close.** A call to action pointing to where to learn more [1].

**Mistakes.** Long explanations, busy editing with extra transitions, distracting music, features
instead of benefits [10]; a smooth exposition that never names the misconception [41][42]; a long
introduction [14].

**In the tool.** Name the terms on a `slides.chain` before the demonstration; state the
misconception on a `slides.compare` whose column is marked bad (`left: The belief (bad) :: …`) and refute it on the next beat; move the
focus with the narration so signalling and temporal contiguity come for free.
Skeleton: [`templates/explainer.md`](../templates/explainer.md).

**Motion.** Motion is signalling [40]: every move points at the part the narration names. A chain
whose pulse runs from node to node shows the mechanism flowing; the misconception struck out
(`~~…~~`) and the correct idea marked (`==…==`) in the titles; `spotlight` moving with the words;
`flow: auto` with pushes along one axis for the steps. A calm explanation often leaves out decorative backgrounds and hits: "busy editing with extra transitions" is a named mistake [10]. Atmosphere or an impact can serve another explanation when it gives the relevant change weight and preserves reading. The recipes: 6 when the
subject is a developer tool (its real command and output, then the lines the narration names), 4
for the number that proves a point, and 1 for an opening on the problem with the product's screen —
read its "Not when" for a screen that is mostly text.

## Release, changelog, "what's new"

**Purpose.** Existing users and observers need what changed, why it matters to them and what to
do now [7][44].

**Length.** A main launch film 45–90 s, vertical cuts 15–30 s; beyond two minutes rewatching drops
[6]. For small changes video is often too much: "if a note needs three paragraphs, it probably
needs a 15-second GIF" [44]; a short clip shows the change faster [45].

**Selection.** Tier updates: big launches on every channel, targeted features in the product and
in email, fixes without announcement; announcing every update trains users to ignore you [45].
Do not glue unrelated releases into one film [7].

**Structure.** Each item answers what changed, why it matters and who it affects [44]; a launch
film answers what is new, for whom and what changes for them, what visible proof backs the
promise, and what to do after watching [7]. Phrase it as the user's capability, not an internal
name: not "New: batch operations for issues" but "Move, label or close several issues at once"
[44][45]. Patterns from launch breakdowns [7]: a focused interface tour with one promise (Notion
Calendar); a dense feature stream for experts who need no category explanation (Linear); a product
lead's talk tying several launches into one story (Figma Config); proof from general to specific —
behaviour and category first, technical detail later (Apple Vision Pro).

**Hook.** One clear value promise within eight seconds [6]; not a logo animation instead of the
announcement [7].

**Shots.** The real, current interface [6][7]; show the input, not only the result [7]; a fast
pace only for an audience that already knows the domain [7].

**Tone.** Arc's founder-led video updates showed that "a face and a voice create a connection a
text note lacks"; production can stay modest as long as the format does not bury the product
story [44].

**Close.** What to do after watching [7]; where to find the feature and its help [44].

**Mistakes.** A logo instead of the announcement; unrelated releases in one film; a result without
its input; an outdated interface; invented performance numbers; one cut for every platform; hidden
availability or compatibility limits [7]; announcing every trifle [45].

**In the tool.** "No invented metrics" [7] is film craft's rule to take numbers from the
recording; a release film is a promise chapter, one live shot per change with its before-state
and after-state visible, and an end card naming where to find it.
Skeleton: [`templates/release.md`](../templates/release.md).

**Motion.** Recipe 8: the old way struck out and the new capability marked, the new card glowing
(`glow: border`) in a stack or a bento, a `mask` from the "new" badge into the feature, the press
that shows it working (recipe 3). One launch, one energy: a dense stream of changes for experts may
run at `pace: brisk`; a single promise stays calm.

**A launch teaser.** "Teaser" names a trailer, "launch" a release; choose by the film's job. When it
must make people want the thing in under 45 seconds, take the trailer's shape — cold open,
escalation, title, button — with its cards and hits. When it must say what changed and where to get
it, take the release's. A mix is a trailer whose escalation shots are the release's changes, each
shown working, with narration that names what is new in the product's words. A "before" claim needs
the old version as its evidence: a commit message describes a change in the code, not what users
saw (film craft 2 and 56).

**A film about the effects themselves.** When the product is a visual tool and the film shows its
effects — a showreel, a release of motion features — each effect is the subject of its own shot, not
decoration. A study of one effect can name it on screen and show it large; a study of a combination can show several coordinated actions around one understandable event. Explain their relationship rather than forcing an animation count. Calm staging choices about transitions, living kinds and backgrounds are conditional choices throughout the playbook; `lint` still counts each as a cliché sign, so name in the handoff which counted signs are
the film's subject.

## Vertical short (reel)

A 15–35 second film for a feed — Reels, Shorts, TikTok — or for colleagues on a phone. Its hook
types, structure (hook → value → proof → payoff), length by purpose, pace and loop are in the
vertical-video guide, "Story shape of a short", and what a phone can read in its sections on safe
zones and text; read them in full. Skeleton: [`templates/reel.md`](../templates/reel.md); its
`pages/result.svg` stands in for the product's result — a portrait capture (1080×1920) fills the
frame. A landscape interface page first appears whole and then approaches its detail;
an ordinary unmarked landscape video keeps its existing crop, so keep its subject there.

**Motion.** The hook is recipe 1 in its vertical form: the result first, filling the frame, with the
claim as an overlay title — larger than the subtitles and not a copy of the narration. A result that
is mostly text (a report, a warning, a terminal) goes full frame as itself, with the claim as a title
above it, not as a picture behind a headline (recipe 1's "Not when"). The body takes
the recipe of its subject — 6 for a developer tool, 3 for an interface, 4 for a number — one idea
per scene, as short as its narration allows (one beat of two to four seconds; a scene that needs two
phone-paced beats runs five to seven), `flow: auto` pushing up between scenes, one camera move per
scene. With a track faster than 120 BPM the claim lands on its beat (recipe 7's `text: beat`, hits
with sound); without one, hard cuts on the narration's stresses. The last frame leads back into the
first. Leave out living kinds whose labels turn small at phone width (`cloud`, `marquee`) unless a
push-in holds them.

## Summary

| Genre | Length (range) | Hook window | Frame | Close |
|---|---|---|---|---|
| Pitch | live: 10 slides / ≤20 min [18]; 5–7 ideas [17]; video: nearest 30–60 s [3] | first sentence states the company [16] | Sequoia [16] + sparkline [20] + StoryBrand [22] | call to action [19][20] |
| Product demo | 60–90 s [5] … 2–5 min [3][4]; by placement [8] | 3–30 s [3][5][8] | problem → win → one scenario → benefit → CTA [5][8] | concrete next step [4][5] |
| Trailer | ≤90 s [25]; teaser <1 min [2]; 6 s micro [29] | <10 s, muted [29]; 1–5 shots [27] | cold open → intro → escalation → climax → title → button [24][32]; Tell-Show-Repeat [26] | one CTA title [27] |
| Explainer | <30 s overview [13] … 1–2 min, <250 words [1]; learning ≤6 min [43] | problem in ~20 s [1] | Wistia's four beats [1]; via misconception [41]; names first [40] | where to go next [1] |
| Release | 45–90 s, vertical 15–30 s [6]; a trifle: 15 s clip [44] | promise in 8 s [6] | what changed / why / who / what to do [7][44] | action and where to find it [7][44] |
| Vertical short | 7–15 s reach, 20–35 s demo (vertical-video guide) | the result in 1–3 s (vertical-video guide) | hook → value → proof → payoff (vertical-video guide) | where to get it; the last frame leads into the first |

## Sources

1. Wistia, "Explained: A Marketer's Guide to Explainer Videos", https://wistia.com/learn/marketing/explainer-videos
2. Wistia, "How to Choose the Right Marketing Video Length", https://wistia.com/blog/optimal-video-length
3. Vidyard, "How Long Should a Video Be?", https://www.vidyard.com/blog/video-length/
4. Vidyard, "How to Make Demo Videos that Win New Business", https://www.vidyard.com/blog/demo-videos/
5. Arcade, "How to Create a Professional SaaS Product Demo Video", https://www.arcade.software/post/create-saas-product-demo
6. Arcade, "Product Launch Video Examples", https://www.arcade.software/post/product-launch-video-examples
7. TapVid, "Product Launch Video Examples", https://tapvid.ai/blog/product-launch-video-examples
8. Vidico, "Best Product Demo Video Examples", https://vidico.com/news/best-product-demo-video-examples/
9. Atlassian / Loom, "Top Tips for Product Demonstration Videos", https://www.atlassian.com/blog/loom/product-demonstration
10. Synthesia, "How to Create an Explainer Video Script", https://www.synthesia.io/post/explainer-video-script
11. Synthesia, "How to Write a YouTube Script", https://www.synthesia.io/post/how-to-write-a-youtube-script
12. TechSmith, "How to Write a Script for a Video", https://www.techsmith.com/blog/how-to-write-script-for-video/
13. Nielsen Norman Group, "How to Film and Photograph for Usability", https://www.nngroup.com/articles/video-image-details/
14. Nielsen Norman Group, "Videos as Instructional Content", https://www.nngroup.com/articles/instructional-video-guidelines/
15. Nielsen Norman Group, "Powers of 10: Time Scales in User Experience", https://www.nngroup.com/articles/powers-of-10-time-scales-in-ux/
16. Sequoia Capital pitch deck template (copy hosted by UVic), https://www.uvic.ca/gustavson/_assets/docs/pitch-deck-template-web.pdf
17. Kevin Hale, Y Combinator, "How to Design a Better Pitch Deck", https://www.ycombinator.com/blog/how-to-design-a-better-pitch-deck
18. Guy Kawasaki, "The 10/20/30 Rule of PowerPoint", https://guykawasaki.com/the_102030_rule/ (via search snippets; page returned 403)
19. Duarte, "3-Act Structure for Good Business Communication", https://www.duarte.com/blog/business-communication-demands-3-act-story-structure/
20. Duarte, "Using Contrast to Craft Persuasive Presentations", https://www.duarte.com/blog/ultimate-guide-to-contrast/
21. Nancy Duarte, HBR, "Do Your Slides Pass the Glance Test?", https://hbr.org/2012/10/do-your-slides-pass-the-glance-test
22. Shortform, "Donald Miller: Building a StoryBrand", https://www.shortform.com/blog/donald-miller-building-a-storybrand/ (a secondary retelling of the book)
23. Wikipedia, "AIDA (marketing)", https://en.wikipedia.org/wiki/AIDA_(marketing)
24. Derek Lieu, "Basic Trailer Story Structure", https://www.derek-lieu.com/blog/2017/9/10/the-matrix-is-a-trailer-editors-dream
25. Derek Lieu, "Ideal Game Trailer Length and Labeling", https://www.derek-lieu.com/blog/2018/12/20/ideal-game-trailer-length-and-labeling
26. Derek Lieu, "Tell, Show, Repeat", https://www.derek-lieu.com/blog/2023/4/9/tell-show-repeat-the-2nd-easiest-game-trailer-to-make
27. Derek Lieu, "Step Two of Starting a Game Trailer Timeline", https://www.derek-lieu.com/blog/2023/2/19/step-two-of-starting-a-game-trailer-timeline
28. Derek Lieu, "How to Make a Trailer (Start Here)", https://www.derek-lieu.com/start-here
29. Valve, "Trailers (Steamworks Documentation)", https://partner.steamgames.com/doc/store/trailer
30. PremiumBeat, "The 3 Ingredients Every Great Movie Trailer Needs", https://www.premiumbeat.com/blog/3-ingredients-every-great-trailer-needs/
31. Jonny Elwyn, "Inside Professional Trailer Editing", https://jonnyelwyn.co.uk/film-and-video-editing/inside-professional-trailer-editing/
32. Film Editing Pro, "Hollywood Trailer Editing Basics", https://www.filmeditingpro.com/hollywood-trailer-editing-basics-top-visual-devices/
33. Richard Pryn, "How to Structure Your Trailer Music", https://richardpryn.com/how-to-structure-trailer-music/
34. Rareform Audio, "Trailer Music Structure", https://www.rareformaudio.com/blog/how-production-music-reveals-trailer-structure
35. James E. Cutting, "The evolution of pace in popular movies", Cognitive Research 2016, https://link.springer.com/article/10.1186/s41235-016-0029-0 (from the abstract and search results; the full text sits behind a redirect)
36. Netflix, "English (USA) Timed Text Style Guide", https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977-English-USA-Timed-Text-Style-Guide
37. Netflix, "Russian Timed Text Style Guide", https://partnerhelp.netflixstudios.com/hc/en-us/articles/215346638-Russian-Timed-Text-Style-Guide
38. Netflix, "Subtitle Timing Guidelines", https://partnerhelp.netflixstudios.com/hc/en-us/articles/360051554394-Timed-Text-Style-Guide-Subtitle-Timing-Guidelines
39. Closed Caption Creator, "Subtitle Reading Speed", https://www.closedcaptioncreator.com/blog/articles/subtitle-reading-speed.html (a secondary retelling of the BBC guidelines; the BBC site could not be fetched)
40. Devlin Peck, "Mayer's 12 Principles of Multimedia Learning", https://www.devlinpeck.com/content/mayers-principles-of-multimedia-learning
41. Muller et al., "Saying the wrong thing", J. Computer Assisted Learning 24(2), 2008, https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1365-2729.2007.00248.x (from the abstract in search results; the Wiley page returned 403)
42. "Misconceptions in Physics Explainer Videos and the Illusion of Understanding: an Experimental Study", https://pmc.ncbi.nlm.nih.gov/articles/PMC8932681/ (149 students)
43. Philip Guo, "Optimal Video Length for Student Engagement", edX 2013, https://blog.edx.org/optimal-video-length-student-engagement (copy: https://eddl.tru.ca/wp-content/uploads/2019/08/EDDL5101_W5_Guo_2013.pdf)
44. Appcues, "Release notes examples", https://www.appcues.com/blog/release-notes-examples
45. Userpilot, "How To Announce Product Updates", https://userpilot.com/blog/product-updates-guide/
46. Bread n Beyond, "How Many Words Do You Need for a 60-Second Video Script?", https://breadnbeyond.com/articles/how-many-words-does-a-60-seconds-explainer-video-needs/
47. Kim Handysides, "eLearning Narration Rate Guide", https://kimhandysidesvoiceover.com/elearning-rate-guide/
48. Wikipedia, "Trailer (promotion)", https://en.wikipedia.org/wiki/Trailer_(promotion)
49. Stephen Follows, "How long is the average movie trailer?", https://stephenfollows.com/p/long-average-movie-trailer
50. Wikipedia, "Teaser trailer", https://en.wikipedia.org/wiki/Teaser_trailer
51. The Verge, "Why movie trailers now begin with five-second ads for themselves", 2016-04-22, https://www.theverge.com/2016/4/22/11487410/movie-trailers-independence-day-jason-bourne (via snippet)
52. Film Editing Pro, "Crafting Key Trailer Moments Using The Music Stop", https://www.filmeditingpro.com/the-most-powerful-trailer-editing-technique-you-could-ever-learn/
53. Flashboards, "How to Make a Movie Trailer: Structure, Cuts & AI", https://flashboards.yaroflasher.com/learn/editing/movie-trailer/
54. Pexo, "How to Make a Movie Trailer: 6-Step Guide", https://pexo.ai/tutorial/how-to-make-a-movie-trailer
55. Duende Sounds, "Trailer Sound Design Elements Explained", https://duendesounds.com/trailer-sound-design-elements/
56. Richard Pryn, "Secret Invasion Trailer Music Breakdown", https://richardpryn.com/secret-invasion-trailer-music-breakdown/ (via snippet)
57. MovieMaker, "The Art of the Tease", https://www.moviemaker.com/art-of-the-tease-trailer/ (via snippet)
58. Wikipedia, "Trajan (typeface)", https://en.wikipedia.org/wiki/Trajan_(typeface); kottke.org, "Trajan is the movie font", https://kottke.org/07/12/trajan-is-the-movie-font (via snippet)
59. Motion Array, "Get the look: chrome graphics", https://motionarray.com/learn/creative-assets/metallic-graphic-assets/ (commercial, via snippet)
60. Derek Lieu, "The Dip to Black", https://www.derek-lieu.com/blog/2019/3/27/the-dip-to-black (via snippet)
61. indietalk, "White flash transition for trailers", https://indietalk.com/archive/index.php/t-34499.html; CineD, "Deploying the Frantic Energy of Flash Cuts", https://www.cined.com/the-edit-on-fire-deploying-the-frantic-energy-of-flash-cuts/ (via snippet)
62. Wikipedia, "Slow motion", https://en.wikipedia.org/wiki/Slow_motion
63. PremiumBeat, "How to Craft an Epic Tracking Shot Like Michael Bay", https://www.premiumbeat.com/blog/how-to-craft-an-epic-tracking-shot-like-michael-bay/ (via snippet)
64. TV Tropes, "Unflinching Walk", https://tvtropes.org/pmwiki/pmwiki.php/Main/UnflinchingWalk (via snippet)
65. PremiumBeat, "How to Shoot Close-Up Shots Like Sergio Leone", https://www.premiumbeat.com/blog/how-to-shoot-close-up-shots-like-sergio-leone/ (via snippet)
66. PremiumBeat, "The 3 Ingredients of a Thrilling Gear Up Montage", https://www.premiumbeat.com/blog/3-ingredients-to-a-thrilling-gear-up-montage/
67. Wiki 24, "Split screen", https://24.fandom.com/wiki/Split_screen (via snippet)
68. No Film School, "The Risky Camera Move in The Bourne Supremacy", https://nofilmschool.com/bourne-supremacy-shaky-cam (via snippet)
69. Wikipedia, "Don LaFontaine", https://en.wikipedia.org/wiki/Don_LaFontaine
70. TV Tropes, "In a World…", https://tvtropes.org/pmwiki/pmwiki.php/Main/InAWorld (via snippet)
71. Wikipedia, "Bathos", https://en.wikipedia.org/wiki/Bathos
72. Wikipedia, "Mock-heroic", https://en.wikipedia.org/wiki/Mock-heroic
73. Wikipedia, "Re-cut trailer", https://en.wikipedia.org/wiki/Re-cut_trailer
74. Honest Trailers Wikia, "Tropes", https://honest-trailers.fandom.com/wiki/Tropes (fan wiki, via snippet)
75. Wikipedia, "Smash cut", https://en.wikipedia.org/wiki/Smash_cut
76. Know Your Meme, "Record Scratch Freeze Frame / Yep, That's Me", https://knowyourmeme.com/memes/record-scratch-freeze-frame-yep-thats-me (via snippet)
77. Wikipedia, "Rule of three (writing)", section Comedy, https://en.wikipedia.org/wiki/Rule_of_three_(writing)
78. Austen Menges, "How A Pro Editor Cuts Comedy", https://www.austenmenges.com/blog/How-A-Pro-Video-Editor-Cuts-Comedy-Three-Rules (via snippet)
79. Derek Lieu, "The Risks and Rewards of Making a Funny Game Trailer", https://www.derek-lieu.com/blog/2020/5/4/the-risks-and-rewards-of-making-a-funny-game-trailer, and "Secrets to Trailer Sound Design", https://www.derek-lieu.com/blog/2022/1/17/secrets-to-trailer-sound-design (via snippet)
