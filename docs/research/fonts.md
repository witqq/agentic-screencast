# Fonts for the eight themes of agentic-screencast

Research date: 2026-09-25. Scope: typography for rendered slides, titles, cards and burned-in subtitles in Russian and English films, rendered by Chromium. Every font must be free for commercial use, embeddable offline, and cover Cyrillic.

## How the Cyrillic and licence claims were verified

Every Cyrillic claim below was checked against two machine-readable sources, not against marketing pages:

1. **Google Fonts catalogue metadata**, `https://fonts.google.com/metadata/fonts` (downloaded 2026-09-25, 2.7 MB JSON). For each family it lists `subsets` (for example `cyrillic`, `cyrillic-ext`) and variable `axes`.
2. **Fontsource API**, `https://api.fontsource.org/v1/fonts/<id>` (for example [golos-text](https://api.fontsource.org/v1/fonts/golos-text)). It lists `subsets`, `license`, `weights` and `variable`, and gives CDN URLs for the per-subset `woff2` files that the `@fontsource/*` npm packages ship.

For every recommended font I also downloaded the Cyrillic `woff2` file and measured the Cyrillic lowercase `х` and capital `Н` with fontTools. The resulting "x/cap" ratio and the x-height as a fraction of the em size show how large the lowercase reads at a given pixel size. This matters for body and subtitle text.

"**Verified**" in this report means both sources listed the `cyrillic` subset and the Cyrillic file downloaded and contained the glyphs. All recommended fonts are **OFL-1.1** (SIL Open Font License) according to the Fontsource API. OFL allows commercial use, bundling and embedding, including in rendered video. The only restriction is that you may not sell the font files by themselves. Human-readable pages are at `https://fonts.google.com/specimen/<Name>` and `https://fontsource.org/fonts/<id>`. Their "Language support" and "Subsets" blocks show the same data.

**Candidates rejected because they have no Cyrillic** (verified absent in both sources): Bebas Neue (latin, latin-ext only), Fraunces (latin, latin-ext, vietnamese), Space Grotesk (latin, latin-ext, vietnamese), Orbitron (latin only). Also absent in the Google Fonts metadata: Bricolage Grotesque, Syne, Sora, Instrument Serif/Sans, DM Serif Display, Bodoni Moda, Anton, League Gothic, Barlow Condensed, Archivo, Saira, Chakra Petch, Share Tech Mono, Space Mono, DM Mono, Atkinson Hyperlegible (all variants), Lexend, Newsreader, Courier Prime and Special Elite. Many of these are trendy in 2026 roundups, so a theme that "looks like 2026" in Latin script would lose its look in Russian. Watch this trap when a new font gets proposed. IBM Plex Sans Condensed lists only `cyrillic-ext` in the Google metadata, not `cyrillic`, so I am treating it as **unverified** and not recommending it.

## Trends in 2025–2026 that matter for video

- **Display and text split further apart.** The 2026 reports agree on pairing a statement display face with a highly legible sans for body text. Envato sums the year up as "bold serif revivals, experimental variable fonts, playful retro styles, and highly legible sans serifs used side by side" ([Envato](https://elements.envato.com/learn/font-trends), [FreeForFonts](https://www.freeforfonts.com/blog/top-font-trends-for-2026)). For us this means each theme needs a display face with real character. The workhorse grotesque belongs in cards and subtitles.
- **Serif revival.** Serifs are coming back as a signal of warmth, craft and trust, partly because AI-made "clean and modern" visuals now feel generic. Sensatype names AI brands such as Anthropic and Perplexity as examples ([Sensatype](https://sensatype.com/the-typography-trends-defining-branding-in-2026)). Fontspring describes film-inspired serifs with "cinematic rhythm in spacing, and italics that feel editorial" ([Fontspring](https://www.fontspring.com/trends)), and Envato highlights chunky and curvy 70s-style serifs. Italics are being used as a main voice rather than only for emphasis ([Kittl](https://www.kittl.com/blogs/top-font-trends-dsi/)).
- **Width extremes.** Fontfabric describes designers pushing both condensed faces ("intensity and focus") and extra-wide faces (energetic and recognizable) ([Fontfabric](https://www.fontfabric.com/blog/top-typography-trends-for-2026/)). For trailers this means condensed caps. For retro-futurist and tech openers it means wide faces.
- **Variable fonts as infrastructure.** "Variable fonts aren't optional anymore — they're infrastructure" ([IK Agency](https://www.ikagency.com/graphic-design-typography/typography-trends-2026/)). The point for motion is that the letterforms themselves can animate weight, width or slant instead of the word only moving ([The Type Founders](https://thetypefounders.com/world-of-type/typography-trends-in-2026/)). Several recommended fonts have useful axes: Geologica (`SHRP` sharpness, `slnt`), Tektur (`wdth` 75–100), Science Gothic (`wdth` 50–200, `CTRS` contrast), Commissioner (`FLAR` flare, `VOLM` volume), Playfair and Literata (`opsz` optical size), and Martian Mono (`wdth`). Chromium animates `font-variation-settings` and `font-weight` smoothly, so a title can "breathe" from 300 to 800 during an entrance.
- **Kinetic typography needs a purpose.** Motion should follow typographic logic. The reference points are title sequences in the tradition of Saul Bass ([Medium / Bootcamp](https://medium.com/design-bootcamp/typography-trends-2026-2027-when-letters-begin-to-breathe-8499fb6c5ef1)). For motion work, "fonts with clear shapes, flexible weights, and strong rhythm usually work better" ([IK Agency](https://www.ikagency.com/graphic-design-typography/typography-trends-2026/)). Kinetic type has become a standard tool ([Lounge Lizard](https://www.loungelizard.com/blog/font-trend/)).
- **Mono and pixel accents.** Pixel/bitmap faces are back as a trend ([Kittl](https://www.kittl.com/blogs/top-font-trends-dsi/)). Monospace works as a "technical voice" for labels, numbers and code. Few pixel faces have Cyrillic. Press Start 2P and Tiny5 are verified (both have `cyrillic` and `cyrillic-ext`). Pixelify Sans has `cyrillic` but no `cyrillic-ext`. Silkscreen, Jersey 10, Micro 5 and Doto have no Cyrillic.
- **Social shorts** favour a heavy display face for punchy captions, such as Montserrat SemiBold or Bebas Neue ([madegooddesigns](https://madegooddesigns.com/best-fonts-for-captions/)). Bebas Neue fails our Cyrillic requirement, so use Oswald or Sofia Sans Extra Condensed instead.

## Per-theme recommendations

Each theme gets a display face in a different genre, so the eight themes differ in letter shape and not only in colour. Grotesques are used only where the theme is literally "product UI" (daylight) or as a quiet text face.

### midnight: dark navy, tech

- **Display: [Geologica](https://fonts.google.com/specimen/Geologica)** ([Fontsource](https://fontsource.org/fonts/geologica)). OFL. Cyrillic: **verified** (cyrillic + cyrillic-ext). Weights 600–800. Geologica comes from a Cyrillic-first foundry and is a variable grotesque with a `SHRP` axis (0–100) that cuts the curves into sharp corners, plus a `CRSV` and a `slnt` axis. At SHRP around 60–100 it reads as engineered and nocturnal, not generic. The sharpness can also be animated on entrance.
- **Text: [IBM Plex Sans](https://fonts.google.com/specimen/IBM+Plex+Sans)** ([Fontsource](https://fontsource.org/fonts/ibm-plex-sans)). OFL. Cyrillic: **verified**. Weights 400/500, with 600 for card titles. Its engineered, slightly mechanical humanist forms suit tech content. Cyrillic x-height is 0.52 em (x/cap 0.74). It has a `wdth` 75–100 axis for dense cards.
- **Mono: [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)** ([Fontsource](https://fontsource.org/fonts/jetbrains-mono)). OFL. Cyrillic: **verified**. Weights 400/600. It is the largest-x-height code face in the set (0.55 em), so code stays readable at 28–32 px.

### calm-paper: warm paper, editorial

- **Display: [Playfair](https://fonts.google.com/specimen/Playfair)**. This is the 2023 variable Playfair 2.x, not the older Playfair Display ([Fontsource](https://fontsource.org/fonts/playfair)). OFL. Cyrillic: **verified** (cyrillic + cyrillic-ext; the old Playfair Display lacks cyrillic-ext). Weights 500–700, and use its italic for pull quotes. It has an `opsz` axis from 5 to 1200, so set `font-optical-sizing: auto` and big titles get the hairline high-contrast cut. This is the editorial, "serif revival" voice. Its x-height is small (0.415 em), so use it only at 64 px or larger.
- **Text: [Literata](https://fonts.google.com/specimen/Literata)** ([Fontsource](https://fontsource.org/fonts/literata)). OFL. Cyrillic: **verified**. Weights 400/500. Literata is a book serif designed for Google Play Books, with an `opsz` axis (7–72) and a generous x-height for a serif (0.51 em). It pairs as "high-contrast Didone-ish display plus sturdy reading serif", which is a classic magazine combination. If a sans is wanted for contrast instead, use Golos Text.
- **Mono: optional, [PT Mono](https://fonts.google.com/specimen/PT+Mono)** ([Fontsource](https://fontsource.org/fonts/pt-mono)). OFL. Cyrillic: **verified**. Weight 400 only. It is a quiet, Paratype-made companion for figures and references.

### synthwave: neon purple/pink, retro

- **Display: [Unbounded](https://fonts.google.com/specimen/Unbounded)** ([Fontsource](https://fontsource.org/fonts/unbounded)). OFL. Cyrillic: **verified**. Weights 800–900 for titles, 500 for kickers. It is an extra-wide, rounded display face made with Cyrillic first-class. This is the "wide" extreme of the 2026 trend, and under a neon glow it reads as 80s chrome. It has the largest x-height in the set (0.57 em), so even short Russian words carry.
- **Text: [Exo 2](https://fonts.google.com/specimen/Exo+2)** ([Fontsource](https://fontsource.org/fonts/exo-2)). OFL. Cyrillic: **verified**. Weights 400/500. It is a techno-geometric sans with sci-fi corners that keeps the retro-future feel in body copy without competing with Unbounded.
- **Accent: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P)** ([Fontsource](https://fontsource.org/fonts/press-start-2p)). OFL. Cyrillic: **verified**. Weight 400. Use it only for tiny labels such as "LEVEL 2" or scene counters, and never for sentences. It is an arcade pixel face. For a decorative one-off title, the Rubik family includes Rubik 80s Fade and Rubik Glitch, both with verified Cyrillic.

### noir: black and amber, cinematic

- **Display: [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond)** ([Fontsource](https://fontsource.org/fonts/cormorant-garamond)). OFL. Cyrillic: **verified**. Weights 600–700, set in capitals with letter-spacing of 0.08–0.15 em, or in light italic for moody lines. It gives the "film-inspired serif" look: a classic-cinema credit face. Its x-height is very small (0.386 em), so use it for display only, and at 72 px or larger.
- **Text: [Jost](https://fonts.google.com/specimen/Jost)** ([Fontsource](https://fontsource.org/fonts/jost)). OFL. Cyrillic: **verified** for `cyrillic` only, with no `cyrillic-ext`. That is enough for Russian but not for rarer Cyrillic languages. Weights 400/500. Jost is a Futura-style geometric sans, the typeface of 1930s–50s posters, and gives a period-correct partner to the serif. If a variable width axis is wanted, Science Gothic (below) is an alternative.
- **Mono: [PT Mono](https://fonts.google.com/specimen/PT+Mono)**. OFL. Cyrillic: **verified**. Use it for "case file" timestamps and evidence labels. None of the typewriter faces I checked has Cyrillic: Courier Prime, Special Elite and Cutive Mono are all Latin-only.

### aurora: dark teal/violet

- **Display: [Raleway](https://fonts.google.com/specimen/Raleway)** ([Fontsource](https://fontsource.org/fonts/raleway)). OFL. Cyrillic: **verified**. It is a variable font from 100 to 900. Use 200–300 for large, airy titles and 700–800 for a single emphasised word. It is an elegant, wide-set Didone-influenced sans with a distinctive "w" and old-style figures. The thin weights glow nicely over gradients. Animate `font-weight` from 200 to 600 for a "breathing" entrance.
- **Text: [Commissioner](https://fonts.google.com/specimen/Commissioner)** ([Fontsource](https://fontsource.org/fonts/commissioner)). OFL. Cyrillic: **verified**. Weights 400/500. It is a variable sans with a `FLAR` axis that adds flared, almost glyphic terminals. At FLAR 30–60 it feels softer and more organic than a grotesque, which suits the northern-lights mood. Its x-height is 0.50 em.
- **Mono: [Victor Mono](https://fonts.google.com/specimen/Victor+Mono)** ([Fontsource](https://fontsource.org/fonts/victor-mono)). OFL. Cyrillic: **verified**. Weights 400/500. Its cursive italic gives code a calligraphic accent. It has a large x-height (0.62 em), so it can be set smaller.

### daylight: light product UI, indigo

- **Display: [Manrope](https://fonts.google.com/specimen/Manrope)** ([Fontsource](https://fontsource.org/fonts/manrope)). OFL. Cyrillic: **verified**. Weights 700–800, with a tight tracking of −0.02 em. It is a semi-condensed geometric grotesque. This is the one theme where a clean modern sans is the correct character, because it mirrors product UI.
- **Text: [Golos Text](https://fonts.google.com/specimen/Golos+Text)** ([Fontsource](https://fontsource.org/fonts/golos-text)). OFL. Cyrillic: **verified**. Weights 400/500. Paratype designed it as a UI face, Cyrillic-first. It has an x/cap ratio of 0.76 and very clear Russian letter shapes. It also doubles as the subtitle default (see below). Onest is a close alternative, also Cyrillic-first and verified.
- **Mono: [Geist Mono](https://fonts.google.com/specimen/Geist+Mono)** ([Fontsource](https://fontsource.org/fonts/geist-mono)). OFL. Cyrillic: **verified**. Weights 400/500. It is Vercel's crisp product-UI mono, added to Google Fonts in 2024.

### ember: warm near-black and orange, trailers

- **Display: [Oswald](https://fonts.google.com/specimen/Oswald)** ([Fontsource](https://fontsource.org/fonts/oswald)). OFL. Cyrillic: **verified**. Weights 600–700, set in capitals with +0.02 em tracking. It is the working Cyrillic replacement for Bebas Neue and gives the classic condensed trailer title. It has a tall cap height (0.81 em), so it fills the frame.
  - Alternative with more range: **[Sofia Sans Extra Condensed](https://fontsource.org/fonts/sofia-sans-extra-condensed)**, weights 800–900. OFL. Cyrillic: **verified**. Its `wght` axis runs 1–1000.
  - Trend pick: **[Science Gothic](https://fonts.google.com/specimen/Science+Gothic)** ([Fontsource](https://fontsource.org/fonts/science-gothic)). OFL. Cyrillic: **verified**. It was added to Google Fonts on 2025-11-19 and has a `wdth` axis from 50 to 200 plus `CTRS` contrast. A title can slam from condensed to wide, which is ideal for kinetic trailer cards. It is new, so test its hinting at small sizes.
- **Text: [Rubik](https://fonts.google.com/specimen/Rubik)** ([Fontsource](https://fontsource.org/fonts/rubik)). OFL. Cyrillic: **verified**. Weights 400/500. Its slightly rounded corners give warmth against the hard condensed display, and it stays readable on dark, noisy backgrounds.
- **Mono: none.** Trailers should not carry code.

### blueprint: navy, cyan/yellow, technical

- **Display: [Tektur](https://fonts.google.com/specimen/Tektur)** ([Fontsource](https://fontsource.org/fonts/tektur)). OFL. Cyrillic: **verified**. Weights 600–800 and `wdth` 75–100. It is an angular, chamfered, engineering-drawing face and replaces Orbitron, which has no Cyrillic. The narrow width suits label callouts.
- **Text: [Fira Sans](https://fonts.google.com/specimen/Fira+Sans)** ([Fontsource](https://fontsource.org/fonts/fira-sans)). OFL. Cyrillic: **verified**. Weights 400/500. It was designed for small-screen legibility, with x/cap 0.77. For dense spec cards use **Fira Sans Condensed**, which is verified (cyrillic + cyrillic-ext).
- **Mono: [Martian Mono](https://fonts.google.com/specimen/Martian+Mono)** ([Fontsource](https://fontsource.org/fonts/martian-mono)). OFL. Cyrillic: **verified**. Weights 400/500 and `wdth` 75–112.5. It is a wide, technical mono made for dimensions, coordinates and figures, with an x-height of 0.61 em.

## Summary table

| Theme | Display (titles) | Text (body, cards) | Mono / accent | Cyrillic |
|---|---|---|---|---|
| midnight | Geologica 700–800, SHRP 60–100 | IBM Plex Sans 400/500 | JetBrains Mono 400/600 | all verified |
| calm-paper | Playfair (variable, opsz) 500–700 + italic | Literata 400/500 | PT Mono 400 (optional) | all verified |
| synthwave | Unbounded 800–900 | Exo 2 400/500 | Press Start 2P (labels only) | all verified |
| noir | Cormorant Garamond 600–700, spaced caps | Jost 400/500 | PT Mono 400 | verified (Jost: cyrillic only, no cyrillic-ext) |
| aurora | Raleway 200–300 (+700 accent) | Commissioner 400/500, FLAR 30–60 | Victor Mono 400 | all verified |
| daylight | Manrope 700–800 | Golos Text 400/500 | Geist Mono 400/500 | all verified |
| ember | Oswald 600–700 caps (alt: Sofia Sans Extra Condensed 900, Science Gothic) | Rubik 400/500 | none | all verified |
| blueprint | Tektur 600–800, wdth 75–100 | Fira Sans 400/500 (Condensed for dense) | Martian Mono 400/500 | all verified |
| subtitles (all themes) | none | Golos Text 500–600 (alt: Inter 600, Noto Sans 500–600) | none | all verified |

All fonts in the table are OFL-1.1 according to `api.fontsource.org`.

## Burned-in subtitles in Russian and English

Guidance agrees on medium or semibold sans faces with high x-height, open apertures and distinguishable I/l/1 and 0/O. Thin weights should be avoided, and so should serifs over fast or busy footage. Use white text with a 2–4 px dark outline or a translucent box, keep to no more than two lines, and keep lines to about 32–42 characters ([madegooddesigns](https://madegooddesigns.com/best-fonts-for-captions/), [OpusClip](https://www.opus.pro/blog/video-caption-design-placement), [Section 508](https://www.section508.gov/create/captions-transcripts/)). Netflix style guides use 42 characters per line and two lines for Cyrillic as well as Latin ([Netflix Russian guide](https://partnerhelp.netflixstudios.com/hc/en-us/articles/215346638-Russian-Timed-Text-Style-Guide); the 42 figure is from [SubLingo's summary](https://sublingo.cc/guides/subtitle-specs-by-language) and was not visible on the Netflix page itself). Full italic lines slow reading. Subtitles should keep the same font across all themes: the viewer's reading habit matters more than the theme's mood. Only the colour or box styling should follow the theme.

Recommendations, with measured Cyrillic metrics at weight 500:

1. **Golos Text, 500 (600 over bright footage).** Cyrillic x-height 0.530 em, x/cap 0.76, the highest ratio of the text faces measured. It is Cyrillic-first, so Russian lines look native, and it has no overly geometric round letters. Recommended default.
2. **Inter, 600.** x-height 0.546 em, the tallest of the neutral sans faces measured. It has an `opsz` axis (14–32), and its caption-oriented design is widely cited ([madegooddesigns](https://madegooddesigns.com/best-fonts-for-captions/)). Use it if an internationally neutral look is preferred.
3. **Noto Sans, 500–600.** x-height 0.539 em. It has a `wdth` axis from 62.5 to 100, so a long Russian line can be tightened to about 90% width instead of breaking into a third line. Its coverage is the safest in the set for rare characters in names.

For comparison, PT Sans measured 0.500 em and Source Sans 3 measured 0.489 em. They are readable but look smaller at the same pixel size.

Suggested subtitle size at 1080p: 44–52 px cap-to-descender. That is about 4–5% of the frame height, so two lines stay within the 1/12-of-screen guidance. Use a 3 px outline or a 60–70% black box. For vertical 1080×1920 video, use 52–60 px and at most about 28–32 characters per line.

## Pairing rules and hierarchy for 1080p

- **Two families per film, plus an optional mono.** The display face carries the theme's character and the text face carries reading. A third family is justified only for code or data, as a mono. Subtitles are a fixed, separate family shared across themes (Golos Text), and are not counted against the theme.
- **Contrast on one axis, harmony on another.** Pair faces that differ clearly in construction (serif against sans, wide against condensed, sharp against rounded) but share proportions or era. Examples: Playfair (Didone) with Literata (book serif), Oswald (condensed) with Rubik (soft, normal width), and Tektur (angular) with Fira Sans (humanist). Avoid two similar grotesques together, such as Manrope with Inter, because they look like an accident.
- **Weight contrast of at least 300 units** between the title and the body, for example 800 against 400, and a size ratio of about 2.5–4 times.
- **Suggested scale for 1920×1080** (in CSS px at 1× device scale):
  - Hero title: 120–180 px. Use a tracking of −0.01 to −0.03 em for sans faces, and +0.05 to +0.15 em for all-caps serif or condensed faces.
  - Scene or section title: 72–96 px.
  - Card heading: 44–56 px, text face at 600.
  - Body and bullets: 32–40 px, never below 28 px after compression. Line height 1.3–1.45. Keep lines to 45–60 characters.
  - Labels and captions: 24–28 px, text face at 500, or mono.
  - Faces with a small x-height (Cormorant Garamond at 0.39 em, Playfair at 0.42 em, Ysabeau at 0.42 em) must not be used below about 56 px.
- **Russian runs longer.** Cyrillic words are typically longer than their English counterparts, and condensed display faces (Oswald, Sofia Sans Extra Condensed, Tektur at wdth 75) absorb this better than wide ones. Unbounded needs shorter headlines or a smaller size in Russian, so test the longest headline in both languages.
- **Motion.** Prefer animating along variable axes (weight, width, Geologica's sharpness, Science Gothic's width) over scaling glyphs, which blurs them. Keep body text still while it is being read.

## Practical notes for Chromium rendering

- Bundle fonts through the `@fontsource/<id>` packages, or `@fontsource-variable/<id>` for variable fonts. They ship per-subset `woff2` files with `unicode-range` rules. Import both the latin and cyrillic subsets.
- Because of `unicode-range`, Chromium downloads the Cyrillic file only when a Cyrillic glyph first appears on the page. Before capturing each frame, wait for `document.fonts.ready`, or call `document.fonts.load('700 1em Geologica', 'Жж')` explicitly. Otherwise the first frames may render in the fallback font.
- Set `font-optical-sizing: auto` for Playfair, Literata and Inter, and set `font-synthesis: none` so that Chromium never fakes bold or italic for faces that have only one style (Press Start 2P, Yeseva One, PT Mono).
