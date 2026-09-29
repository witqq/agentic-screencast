# Visual design: a film that does not look generated

This document answers: how a film should look so that the viewer does not read it as "made by a
machine, seen before" — which visual clichés to avoid and what to do instead, the numeric norms of
type and colour, and what distinguishes a considered frame from an average one. How to set a theme,
its fonts and a film look is in `agentic-screencast help themes`; where free pictures and fonts come
from is in [the visual-assets guide](visual-assets.md). The knowledge comes from the design research
behind agentic-report, the sibling tool that builds pages, compiled on 2026-09-27 and translated here
from pages to film; bracketed numbers point to the sources at the end. Where a norm was measured on web
pages and not yet on films, it says so.

## Why a film looks generated

**Averaging.** A generator left without constraints produces the median of its examples: "the AI
isn't designing, it's averaging" [1]. That is why so many generated interfaces are violet — the
author of Tailwind apologised in August 2025 for making `bg-indigo-500` the colour of every button in
Tailwind UI [2]. A cliché is a picture that stopped being anyone's choice; the viewer reads it as
"I've seen this", and trust drops [1]. Often the problem is not the font or the colour but the missing
decision: an unchosen default says nobody decided [1].

**Defaults of a framework or a kit.** The Tailwind palette (indigo, violet, slate, stock chart
colours), the look of a component kit (a neutral palette, one grotesque, 0.5rem corners, thin-bordered
cards) and the "AI-startup look" (beams, a spotlight behind the cursor, aurora, glowing cards) became
signatures of generated work [1][3].

**Fashionable aesthetics.** In 2026 two fashions are already clichés: "techno-futurism" (dark theme,
neon, shaders, bento grids) and "editorial" (cream paper, a serif, terracotta, mascots) [1]. The shader
mesh gradient is the heir of the indigo gradient; dithering and ASCII art are the next synonyms [1].

**The tool's own defaults.** Whatever a film gets without a decision — its theme, its live background,
its transition, its film look — is what every film made with the tool shares. A default that follows
a fashion makes every film average at once. The shipped defaults are therefore quiet, and every loud
choice is the author's decision for a reason.

**Bans do not create quality.** Four landing prototypes passed every ban and the "cover the logo" test
and were still called "clumsy, not premium" by their owner [3]. A list of clichés only cuts away the
template; quality needs a positive standard — material, depth, composition and considered motion.
Film craft 48 records the same lesson for films.

**The self-check threshold.** Four or more of the signs below in one film: it is an average film, not
a distinctive one [1]. `agentic-screencast lint` counts the signs a scenario shows in its `cliches`
field, and `agentic-screencast frames` names an ordinary drawn frame with an empty third in `empty`
(trailer cards are intentionally sparse); the rest only the frames show.

## Catalogue of clichés and their cure

Each line: the cliché, why it fails, the cure. **A synonym is not a cure**: swapping a cliché for the
neighbouring fashionable device looks like a fix and leaves the cliché in place — a teal gradient
instead of a violet one, numbered cards instead of icon cards. The only cure is a decision taken from
the subject [3].

### Colour

- **A violet-to-blue gradient behind a centred title.** The signature of a generated page. Cure: one
  accent taken from the subject on an even surface [1][3].
- **A framework palette** (indigo-500, violet, slate, GitHub's code colours). Cure: a named accent and
  your own neutrals; check an "indigo" by its OKLCH hue, not by its code — a renamed copy is still the
  same colour [2][3].
- **Several accents.** A frame with three bright colours has no accent. Cure: one accent family; the
  second colour is a quiet neutral for kickers and secondary labels [3]. In the tool this means a
  theme's plates, card edges and lower-third bars are one colour, not a gradient of two.
- **Neon on night, magenta and cyan on violet, a synthwave grid, stardust.** A genre poster: right for
  a game, music or a parody trailer, wrong as the face of a product [1][3].
- **Glassmorphism, glows, floating blobs, neon outlines, bloom spheres.** Decoration instead of content.
  Cure: real material on a quiet surface [1].
- **Gold gradients, gold on black, white marble "for eternity".** The first sign of kitsch; metal and
  stone read only as a photograph or a render with light, large and as a fragment [1].
- **A signal colour on everything.** Cure: the signal colour belongs to one status, "accepted" stays
  neutral; a status is also told by shape or word, never by colour alone [3].

### Type

- **One grotesque nobody chose.** Cure: a pair of faces chosen for the subject; the theme names them [1].
- **A heavy, tight display on every title.** At −0.06em words fuse ("Apageworthhanding"). Cure: the
  display face only on the film's title and chapter titles, tracking not tighter than −0.03em
  (−0.025em in Cyrillic), weight not heavier than 720 in Cyrillic [3].
- **Capitals on every heading; a spaced-out capital kicker over every slide.** Cure: capitals only on
  the film's title or a trailer card of one to three words; kickers in sentence case [3].
- **Title Case and emoji in headings.** Cure: sentence case, no emoji in a title [3].
- **Fashionable faces without Cyrillic, "Greek" display faces** (Trajan-like capitals, Σ for E). Cure:
  a face with full Cyrillic, checked by the method of `docs/research/fonts.md` [1].

### Composition

- **Hero, three icon cards, a call to action.** The starter order with new names. Cure: the order of
  the film's argument (the playbook's genre shape) [3].
- **A row of identical cards "Fast / Safe / Simple".** Cure: one claim with its evidence, or a fact
  that makes each card different; numbered cards 01, 02, 03 are a synonym [3].
- **A title and two buttons without the product.** Cure: the product or its result on screen from the
  first seconds [3].
- **Everything symmetric on the grid.** Cure: one "decided" element per frame and an asymmetry that
  leads the eye to it [3].
- **Empty half of the frame; a filler under the content.** Cure: fill the frame with the subject, move
  the subtitles instead of padding (film craft 53) [3].
- **An infographic or a table as the main image of a metaphor.** Cure: the real screen, or a diagram
  built from the real data [3].

### Motion and effects

- **The same entrance on every block; letter-by-letter animation of every title; bounce.** Noise that
  hides the one entrance that matters. Cure: most text arrives quietly; kinetic text on one or two
  titles of the film, by lines or words, where the motion says something [1][3].
- **Numbers that count up everywhere; "10 000+".** Cure: one new number counts, the rest stand [3].
- **Chromatic aberration, a glowing monolith, bloom as a filter, "PLAY REEL".** Costume, not
  content [1].
- **Cube, whip and zoom-blur cuts, confetti at success, a film grain on everything.** Cure: a cut
  means a change of place or topic (film craft 52); success is shown by the result itself [3].
- **A constant pulse.** Cure: one constant motion, slow and quiet, that never crosses text [3].

### Backgrounds

- **Particles, a "plexus" graph, aurora, mesh, bokeh behind the title "for depth".** The AI-startup
  look [1]. Cure: an even surface or a faint grid; a WebGL background only where motion is the
  subject.
- **Grain over an empty gradient.** Cure: grain only over footage or a large fill beside real
  material [1].
- **A glowing blue brain, the Matrix, ones and zeros, robots.** The stock image of AI; no research lab
  draws a network as a glowing graph any more [1].

### Pictures and footage

- **An abstract generated picture as the main image; stock people at laptops.** Cure: the screen they
  would be looking at — a take, a snapshot, a diagram; at most one generated picture, with a reason [3].
- **A tilted dashboard, a screenshot floating in 3D inside an invented browser window.** Cure: the real
  interface flat and at its natural scale; a browser frame only with the real address, a mockup
  labelled as an illustration (film craft 2) [1][3].
- **An editor recording shrunk to a card.** Cure: crop, do not shrink [1].
- **One picture under different captions; a slogan instead of a caption.** Cure: a caption says what
  the frame shows [3].

### Words on screen

- **"The AI-powered X for modern Y"; a title that fits any product.** Cure: a title about the concrete
  mechanism; the "cover the logo" test — would the frame still belong to this product with the logo
  covered? [1][3]
- **Machine prose:** "not just X but Y", one-line punchlines, forced triads, dashes as glue, advertising
  words, bold as ornament; in Russian also `=`, `→`, `vs`, rhetorical questions and colon lead-ins.
  Cure: delete, replace with a fact, or say it plainly [3].

### Numbers

- **Invented numbers, testimonials, logos.** Cure: only numbers from the source; the unknown said in
  words (film craft 12, 56) [3].
- **A number without its unit and date; a snapshot shown as the current state.** Cure: every number on
  screen names its unit, and a figure that changes names its date — "as of <date>" [3].
- **A counter ticking without live data.** Cure: a number counts once, to its real value [1].

## Clichés a film tool makes by itself

The same mechanisms produce film-specific clichés. Each is a field an agent reaches for by default:

- a night-blue theme with a blue-teal gradient as the face of every film;
- a two-colour gradient in every caption plate and card edge;
- a capital kicker in wide tracking over every slide;
- emoji icons in `slides.features`, a release built as a grid of emoji cards;
- a screenshot floating in 3D inside a browser frame with traffic-light buttons (`slides.shot`,
  `slides.perspective`, `device: browser`) with a placeholder address;
- a live background as "depth": aurora, mesh, bokeh, particles;
- a "cinematic" look in one line (`look: cinematic` — teal-orange grade, grain, vignette) on a product
  demo;
- creator-style subtitles: capitals, a yellow word, a pop on every word;
- `flash`, `shake`, hits and bursts outside a trailer;
- more than two kinds of transition in one film;
- the system voice, a logo as the opening, "In a world…", four braaams — already named in the skill
  and the playbook.

Chrome, glare, bloom and Trajan-like capitals are legitimate only in a parody trailer, and then on
purpose.

## Signs of quality

**Control, not a rare effect.** Premium is a hundred small decisions executed with discipline, not one
spectacular effect; "a calm, fast and clear" result reads as more premium than a busy one [1].

**The product as the demo.** The strongest reference pages replaced screenshots with the product acting
[1]; a scripted story of three or four beats beats a still; "attempt → refusal → fix → acceptance" is
stronger than the green path, with the refusal's exact text beside it [1][3]. A film has the advantage
here: the take is the product acting.

**Type as a signal.** Contrast, measured tracking, light weights large: a light display weight reads
as more expensive than a heavy one (Stripe sets its 44 px title at weight 300) [4]. The key thought is
bright, the explanation muted [4]. With an expressive serif, labels go in monospace [3].

**One accent and a material.** One brand accent — Raycast's red, Warp's blue, Inngest's orange; two or
three colours plus statuses [4]. Paper or bone, ink, one warm accent and one refusal signal; a dark
scheme is warm graphite, not night blue [3]. Material with light rather than glow; visible work; one
signature detail is character, four are a costume [3].

**Direction of motion.** Motion shows a change of meaning; one scene makes one claim [1]. The camera
goes from the whole to the detail (Igloo) [4]. An element enters from where it comes from, by a short
distance and a scale of 0.97 → 1, in about 0.7 s; a composed frame is complete about two seconds into
its beat [3].

**Real numbers.** Live, real figures persuade more than static ones; a line of source under a block of
data [1][3].

**The ending is a frame, not a button.** The film ends on its result with one short next step over it,
not on a card with a button on an empty background [3].

### Reference sites, measured

Measured on the live pages in September 2026 [4]. What to take is for films; what is a cliché there
applies to films as well.

| Site | Measure | What to take | What is a cliché there |
|---|---|---|---|
| Linear | Inter Variable 64 px, 510, −1.4 px; `rgb(8,9,10)` | restraint, "bright phrase + grey", a ~2 s entrance, figure captions | the "Linear look" itself |
| Vercel | Geist 64 px, −3.84 px; `rgb(250,250,250)` | one symbol, "for whom", a snippet | the logo wall, the footer map |
| Stripe | Söhne 44 px, weight 300 | a light weight, a live counter | the gradient WebGL ribbon |
| Temporal | Aeonik 68 px, 300; `rgb(20,20,20)` | a demo with Play: "runs → breaks → recovers" | the synthwave grid |
| Resend | Domaine 96 px, 400 on black | a serif on dark, a line-by-line log | the SDK switcher |
| Cursor | 26 px; `rgb(247,247,244)` | the interface over painting, the product at scale | the testimonial wall |
| Warp | matterMono 56 px | drawing language, a live diagram, a table of contents | — |
| Inngest | Whyte, Whyte Inktrap | story steps, outline text | stardust, capitals |
| Igloo Inc | `#b6bac5` / `#383e4e` | one metaphor, the camera from whole to detail | a preloader, aberration |

Closest to a product that is a process: Temporal, Warp, Inngest, n8n [4].

## Choosing the scheme

Every shipped theme but `blockbuster` comes in a light and a dark scheme (`scheme: light|dark` in the
header, `help themes`); the two share the theme's fonts, shapes and accent hue, and their colours are
the same ones agentic-report uses for a page in that theme and scheme.

**The material chooses, not the mood.** A film made of live takes wears the scheme the product was
recorded in: the take bakes its cursor, cards and spotlight in the recorded theme, and a light
interface under a dark overlay reads as two films. A film embedded in a report or a landing wears
that page's scheme, so the player does not light up or go dark in the middle of the page.

**Dark is not "premium".** A dark theme with neon is the techno-futurism cliché of 2026 [1]; a dark
scheme earns its place with dark material — a terminal, a night dashboard, footage shot in the dark —
and then it is warm graphite, not night blue [3]. Without such a reason, keep each theme's default.

**One scheme per film.** A scene in the other scheme is a cut in light that the viewer notices; give it
a reason — a terminal take in a light film, a quoted dark screen — and name the scheme on that scene
only (`theme: {"preset":"terminal","scheme":"dark"}`).

## Norms with numbers

"Web" marks a norm measured on pages; for a film it is the starting point, checked on the frames.

| What | Norm | Where it holds |
|---|---|---|
| Display tracking | not tighter than −0.03em; Cyrillic not tighter than −0.025em | web and film [3] |
| Capital tracking | positive, 0.03–0.08em | web and film [3] |
| Display weight | Latin 300–400 reads premium; Cyrillic not heavier than 600–720 | web and film [3][4] |
| Accents | one accent family; the second colour neutral | web and film [3] |
| Text contrast | WCAG AA 4.5:1 for body text, 3:1 for large text, on the final colour with its opacity [5] | web and film |
| Muted text | by colour, not by opacity; opacity not below 0.35 | web [3] |
| Element entrance | ~0.7 s, a line step ~70 ms; a composed frame at ~2 s | web, a starting point for film [3] |
| A scene transition | 1–1.5 s | web [4] |
| Motion origin | ≤ 16 px toward the source, scale 0.97 → 1 | web [3] |
| Constant motion | one and quiet; a page pauses it after 5 s (WCAG 2.2.2) [5] — a film cannot, so it must never cross text | web and film |
| Hand-drawn marks | ≤ 2 per frame | web and film [3] |
| Generated pictures | ≤ 1, with a reason | web and film [3] |
| Signs of a template | ≥ 4 — the result is average | web and film [1] |

## Before the final build: the look questions

Ask these of the draft's stills once; each needs an answer from the frames, not from memory. When the
owner asks for a heavy review, the same frames go to one reviewer who did not write the film, because
the author checks the frames against what they meant:

1. Could the first three seconds belong to another product?
2. How many signs from the catalogue above does the film carry, and is each one a decision?
3. What does the film do better than the median film of its genre?
4. What does the viewer learn from each motion?
5. Would the meaning change without the main scene?
6. Does the title pass the "cover the logo" test?
7. Is there an empty half of the frame in any format?
8. Is the main effect visible at normal speed and at phone size?
9. Does every number name its unit, its date and its source?
10. Is each replaced cliché cured, or only swapped for a synonym?

## Sources

1. Design research for agentic-report's landing, 2026-09-27: twelve groups, 329 notes on clichés,
   premium signs, motion, WebGL, media and themed presentation, with the quotes cited above (Adam
   Wathan on `bg-indigo-500`, the "averaging" essay, the 2026 aesthetics).
2. Adam Wathan (creator of Tailwind CSS), public apology for the indigo-500 default of Tailwind UI,
   August 2025.
3. agentic-report design guide, 2026-09-27: art direction, design rules (one accent, tight tracking,
   landing order, card sameness, surfaces, uniform entrances, real material, numbers with units), the
   themes reference, the first-pass lessons and 37 landing defect classes, and the
   audit of its themes.
4. Reference sites measured on their live pages in September 2026: linear.app, vercel.com, stripe.com,
   temporal.io, resend.com, cursor.com, raycast.com, warp.dev, anthropic.com, framer.com, clerk.com,
   inngest.com, n8n.io, igloo.inc, lusion.co.
5. W3C, Web Content Accessibility Guidelines 2.2: success criteria 1.4.3 "Contrast (Minimum)" and 2.2.2
   "Pause, Stop, Hide", https://www.w3.org/TR/WCAG22/.
