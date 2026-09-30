# What Agentic Screencast knows, and how to show it

The tool carries a knowledge base as well as code. An agent reads it before it writes a film, so the
film follows directing rules, genre practice and platform numbers instead of the agent's taste. This
file lists that knowledge document by document: what each one answers, its main claims with their
numbers, and how a landing or the overview film can show the claim. The numbers come from the named
documents; the bracketed source numbers are the document's own.

## The skill — the path from a request to a film

`skills/agentic-screencast/SKILL.md`

- **A path of eight steps**, each leaving an artifact and ending with one check: brief → evidence →
  story → material → scenario → draft → final → handoff. After the story the agent stops and agrees
  the content with the owner before any capture or build; the draft is shown to the owner, and a
  heavy independent review happens only when the owner asks.
- **The brief before the first take.** Genre, frame, length, depth, narration, sound, captions,
  language, look, transitions, material and structure all belong to the owner. The agent infers
  what the request answers and asks the rest in at most three structured questions.
- **Voice rules.** Drafts are always silent on `stub`. A system voice is never a default and needs
  the owner's explicit permission. The draft's pace starts from the measured estimates of the
  built-in voices in `help voice`; the agent measures a scene with the chosen voice only when it
  needs a closer estimate.
- **A technique table.** For each technique it says when to use it and when not.
- **Motion before the scenario's effects.** The agent reads the motion-design guide before choosing
  entrances, transitions and effects, and starts from the recipe named by the genre's Motion paragraph.
- **A short checklist.** `new` writes a checklist with one box per step, then the technique menu and
  the film-craft rules as lists to consult. The film is handed over only when `grep -c "\- \[ \]" checklist.md` prints 0.

*How to show:* the agent's three questions as buttons, then the checklist filling with evidence
beside the frames it proves.

## Film craft — 65 rules, each paid for by a failed film

`docs/film-craft.md`

Every rule is followed by the real counter-example that made it necessary, quoted from review
rounds. The rules are numbered 1–66; rule 20, about the build tools, lives in `CONTRIBUTING.md`. The
strongest ones for a landing:

- **A short film, not a screen recording** (1): a theme, a beginning, a middle and an end.
- **The subject comes from the source** (2): never a mockup passed off as a real run.
- **One text layer at a time** (5): about 15 characters a second on a landscape screen.
- **The camera's vocabulary** (7): overview, push-in, freeze, highlight with dimming, slow motion,
  pull-out; **stop time inside the shot** (17); **dimming is the point of a highlight** (18).
- **Nothing in frame stands still** (9). Measured: quiet parts of a slide were 56–62 dB PSNR apart
  in 0.4 s; with an ambient layer they are 16–34 dB.
- **The frame budget of a recording** (19). Accept a take with at least about 60 unique frames in
  any five seconds of motion. A canvas app that ran at 115 fps delivered 8 fps while recorded.
- **Everything drawn wears the theme, a live take too** (32).
- **The strongest result gets the strongest shot** (40); **the inventory serves the story** (41).
- **Subtitles** (51): readable first, about 8% of the frame height per line, two lines, at most
  one accent. The first subtitles were 41 px, under 4% of a 1080p frame.
- **Move the subtitles, never pad the content** (53).
- **Every factual clause is checked against its source** (56).
- **Review at the viewer's size and between the stills** (57).
- **The look, carried from pages to film** (58–66): one subject per frame, entrances that serve
  reading, a real interface kept flat, one accent in sound, a subtitle face chosen per theme, the
  film look as a trailer's tool, the product in the first three seconds, the ending over the result,
  one quiet constant motion.

*How to show:* a counter-example and its fix side by side, for example rule 53 (a grey filler vs
subtitles moved to the top) or rule 9 (a still slide vs a living one). A counter of "65 rules".

## The scenario playbook — story shapes per genre, from published practice

`docs/scenario-playbook.md` — 79 numbered sources, researched 2026-09-24 and 2026-09-26.

- **Shared rules.** The first seconds decide: the window runs from 3 s to 30 s across sources.
  65% finish a business video under a minute. One idea per unit. Problem → solution → action. Close
  on one next step.
- **Narration rate.** 120–160 words a minute, typically 150. Reading ceilings: Netflix English 20
  characters a second for adults, Russian 17; two lines of at most 42 characters.
- **Genres with shapes and lengths:**
  - pitch (Sequoia order, Duarte's sparkline, StoryBrand);
  - product demo (60–90 s, win within 30 s, one scenario end to end);
  - trailer (≤90 s, cold open → escalation → climax → title → button, Tell-Show-Repeat);
  - the action trailer and its parody (the music stop, hits, cards, bathos);
  - explainer (Wistia's four beats; a video that names and refutes misconceptions, and a
    student–tutor dialogue, gave effect sizes 0.79 and 0.83 over a smooth exposition);
  - release (a promise within 8 s, 45–90 s);
  - a branch result (missing → appeared → can do → holds → controlled → where to get it).
- **"In the tool" lines** translate each rule into scenes; every genre has a skeleton (`new`).
- **A Motion paragraph per genre** points to composition recipes in `docs/motion-design.md` and
  names the appropriate energy, transitions and effects to avoid.

*How to show:* the six genre skeletons as tiles, each opening its first frame; a trailer's music
stop heard before the title.

## Vertical video — what a phone and the feeds require

`docs/vertical-video.md` — 64 numbered sources, researched 2026-09-24 and 2026-09-26.

- **One master for every feed.** 1080×1920, 9:16, 30 fps, H.264 High, AAC 48 kHz, fast start, up
  to 3 minutes: Reels, Shorts, TikTok and VK Clips without re-encoding.
- **Safe zones.** Meta's official 14% / 35% / 6% (269 / 672 / 65 px). The tool's working zone
  takes the worst side of every platform: 170 / 484 / 65 / 180 px. These zones apply to a feed
  only; outside one, keep even margins.
- **Hook in 1–3 seconds.** In TikTok's study, more than 63% of the highest-CTR videos show the key
  message in the first three seconds. The structure is hook → value → proof → CTA.
- **Captions are mandatory.** 69% watch without sound in public places. Text sizes: 36 px
  minimum, 48–72 px body, 60–72 px captions.
- **An architecture or a real interface on a phone.**
  - Text a viewer must read is at least 48 px.
  - A 13 px desktop label reaches that only when about 290 CSS px fill the frame.
  - A diagram is built piece by piece with the narration: segmenting d = 0.42, signalling g = 0.53.
  - At most about four new elements per step, flow top to bottom.

*How to show:* the safe zone drawn over a frame; a diagram built box by box on a phone; the
"48 px" check naming a label that is too small.

## Visual assets — where free pictures come from, within their licence

`docs/visual-assets.md`

- Three questions before any file enters a scene: what licence, is credit required, is this use
  allowed. "I don't know" means the file is not used.
- A table of sources with licence, credit and API:
  - photos: Unsplash, Pexels, Pixabay, Wikimedia Commons;
  - illustrations: unDraw, Open Peeps, Hero Patterns;
  - icons: Lucide, Heroicons, Tabler, Phosphor, Material Symbols;
  - emoji: Noto, Fluent, Twemoji, OpenMoji;
  - Lottie and fonts.
- What not to use: GIPHY (no commercial use), the Tenor API (shut down on 2026-06-30), OpenMoji by
  default (share-alike).
- Credits as TASL in `assets/CREDITS.md`.

*How to show:* a credits card built from `CREDITS.md`; a picture entering `slides.photo` with its
licence line.

## Sound — music and effects, picked and credited

`docs/sound.md`

- Music sits 18–25 dB under the voice. A film for the web is normalised to −14 LUFS with a −1 dBTP
  ceiling, and the build does it for every film with sound.
- Sources:
  - music: Incompetech (CC BY 4.0, exact credit template), Pixabay Music, Free Music Archive,
    ccMixter, Mixkit, YouTube Audio Library, Uppbeat;
  - effects: Kenney (CC0), Freesound, Pixabay, Mixkit, Zapsplat, Sonniss GDC.
- A trailer's sound vocabulary: hit, braaam, riser, whoosh, downer, reverse, stinger, ticking,
  record scratch, stutter.
- Tempo by genre: explainers at 85–115 BPM, thinking at 60–85, announcements at 115–140. Only
  instrumental music under a voice. Cutting to the beat: 60 / BPM seconds a beat.

*How to show:* the music visibly dipping under words; a stop before the title.

## Visual design — a film that does not look generated

`docs/visual-design.md` — the design research behind agentic-report (2026-09-27), carried to film.

- **Why a film looks generated:** a generator averages; framework defaults (indigo-500, slate) and
  the 2026 fashions ("techno-futurism", "cream, serif and terracotta") read as "seen before". Bans
  alone do not make a film good — four landing prototypes passed every ban and were still called
  clumsy.
- **A catalogue of clichés with their cure** — colour, type, composition, motion, backgrounds,
  pictures, words, numbers; a synonym is not a cure.
- **Norms with numbers:** one accent, tracking not tighter than −0.03em (−0.025em in Cyrillic),
  display weight ≤ 720 in Cyrillic, WCAG AA 4.5:1 for body text, four or more signs — an average film.
- **In the tool:** twelve themes with `neutral` as the default, a numeric theme test, `lint`
  counting the signs of a template.

*How to show:* the same slide in the old night theme with a two-colour plate and capital kicker,
then in `neutral`; the lint count of a template scenario (eight signs) beside a considered one (zero).

## Motion design — order, timing and compositions

`docs/motion-design.md`

- **Order before decoration.** The stable frame arrives first, the important content last; related
  objects form groups and waves, and only one movement leads attention at a time.
- **Curves and physics.** Entrances decelerate, exits accelerate; springs suit handled objects,
  and larger or longer moves take more time. `wave`, `stagger`, `ease` and `pace` express these choices.
- **Transitions state a relation.** A shared object uses `morph`, a process follows one axis,
  a detail takes `zoom`, an element opens with `mask`; `flow: auto` connects unauthored seams.
- **An effect vocabulary with boundaries.** Living cards, streams, chat, maps, terminal output,
  kinetic type and light each say something; the guide distinguishes built-in fields from effects
  written on a page whose animations follow the scene clock.
- **Eight composition recipes**, with reasons and cases to leave them out: the product opening,
  an AI answer, a setting, the proving number, an ecosystem, a developer tool, a trailer and a release.
  Use the genre's Motion paragraph to choose the starting recipe.

*How to show:* one recipe's devices joining into a single scene, with each moment labelled by what
it tells the viewer; compare it with every effect arriving together.

## The film checklist — nothing skipped

`templates/checklist.md`

Ten boxes across the eight steps, each closed once with evidence (a file, a frame, a number) or `n/a`
with a reason; below them the menu of 32 techniques and the list of film-craft rules to consult.

*How to show:* a checklist scrolling, every box ticked with its evidence.
