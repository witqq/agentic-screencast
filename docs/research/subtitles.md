# Burned-in subtitles: what reads best and what looks current (research, 2026-09-25)

Scope: burned-in (open) subtitles for explanatory product videos (16:9) and social shorts (9:16). Today we draw a
bold sans line on a rounded semi-opaque plate (dark plate at about 90% with white text in dark themes, white plate with dark
text in light themes), with an optional karaoke mode that highlights the current word.

Evidence labels used below:
- **[G]** means a guideline or standard from a broadcaster, streamer, regulator or W3C.
- **[R]** means peer-reviewed or academic research.
- **[P]** means practitioner or expert opinion, such as an accessibility consultant or a subtitling house.
- **[M]** means vendor marketing or a creator-tool blog. These show current practice, not evidence.
- **[C]** means my own calculation from WCAG formulas.

Access note: the BBC guidelines page (bbc.co.uk) timed out from this machine. BBC figures therefore come from a
verbatim copy of v1.2.3 (June 2024) and a second summary. Both sources are cited where they are used.

## Bottom line

1. **Our plate approach is the evidence-backed default, so keep it.** Guidelines and research both favour a background box
   (a solid or translucent plate) over bare text. An outline is the second-best option and a drop shadow alone is the
   weakest. The main change needed is size, especially in vertical video, and not the treatment.
2. **The 90% plate is on the strong side, which is fine.** Contrast falls below WCAG 4.5:1 only when the plate drops under
   about 60% opacity over white footage. Deaf and hard-of-hearing (DHH) users mostly keep a default opacity of 0.8, and
   those who change it make it more opaque. Values between 75% and 90% are safe.
3. **For shorts, the modern look is stroke text without a box.** That means heavy sans type, a thick dark stroke plus a
   shadow, one to three words or one short line at a time, and an accent colour on the keyword or the current word. Its
   attention benefit comes from vendor claims. Research on synchronised highlighting reports "useful but distracting"
   results. Ship it as a style option, not as the default for explanatory videos.
4. **Our vertical subtitles are too small.** Our text is 3 units of `min(W,H)/56`, which is about 58 px at 1080 px width.
   That is 5.4% of frame height in 16:9 and only 3.0% in 9:16. BBC authoring guidance asks for a line height of 8% of
   height in 16:9, which is 86 px at 1080p. In 9:16 it asks for 4.5% of height, which is also 86 px on a 1920 px
   frame. Social creator captions are larger still.

---

## 1. Box vs outline vs shadow vs plain text

**Guidelines**
- DCMP Captioning Key **[G]**: "white characters… medium weight, sans serif, have a drop or rim shadow… The use of a
  translucent box is preferred so that the text will be clearer, especially on light backgrounds." DCMP states that its
  key matches the FCC's 2014 caption quality mandates.
  https://dcmp.org/learn/597-captioning-key---text · https://dcmp.org/captioningkey/print
- BBC **[G]** requires every speaker colour to sit on a black background: "All of the above colours must appear on a
  black background to ensure maximum legibility." The background is drawn per line (a `tts:backgroundColor` span) with no
  gap between lines (`itts:fillLineGap`). This is the same as our per-line plate.
  https://broadcastwriter.com/2024/12/12/bbc-subtitle-style-guide-2024/ ·
  https://www.clevercast.com/bbc-subtitling-guidelines/
- Netflix **[G]** specifies white text in a proportional sans font (Arial as a placeholder), 42 characters per line and
  two lines. The player renders subtitles, so the guide does not set an edge style.
  https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977-English-USA-Timed-Text-Style-Guide
- Player presets show which options are standard. YouTube offers edge styles None, Drop shadow, Raised, Depressed and
  Outline, and its reset default is a 75% opaque background.
  https://support.google.com/youtube/answer/100078 · https://freelancerinsights.com/how-to-change-subtitle-font-size-and-color-on-youtube/
  Apple ships four presets: Transparent Background, Large Text, Classic (white on black) and Outline Text (large white
  text with a black outline). iOS 26.4 exposes these presets in the player.
  https://support.apple.com/guide/iphone/display-subtitles-and-captions-iph3e2e23d1/ios ·
  https://9to5mac.com/2026/02/18/iphone-subtitle-design-customize-apple-tv/
- WCAG **[G]** requires 4.5:1 contrast for text (1.4.3, Level AA). The W3C has not settled whether this applies to text in
  video. Working-group members disagree, but they agree that the author fully controls burned-in captions and that
  "white caption text on transparent grey background" falls far below 4.5:1 over bright footage.
  https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html ·
  https://lists.w3.org/Archives/Public/w3c-wai-gl/2017JanMar/0692.html · https://github.com/w3c/wcag/issues/1939

**Research**
- I found **no controlled study that directly compares box, outline and shadow**. Studies of subtitle reading hold the
  style fixed, for example white text with a black outline on a transparent background.
  https://pmc.ncbi.nlm.nih.gov/articles/PMC10723748/
- Kushalnagar, Vogler et al. (arXiv, September 2026) let DHH viewers customise captions in a player **[R]**. "Most
  participants used the default black background with a white font… 10% used a yellow font on a black background." Also,
  "72% used the default opacity of 0.8, with nearly all others using higher values."
  https://arxiv.org/html/2609.11408
- In DHH focus groups on live-TV captions, participants preferred strong text/background contrast pairs, such as black on
  white or the reverse **[R]**. https://link.springer.com/chapter/10.1007/978-3-030-78095-1_15

**Practitioners**
- Ian Hamilton, a games accessibility consultant **[P]**, sets "a prominent black stroke" as the minimum and says "drop
  shadow by itself is not recommended" because half of each letter then has no separation from the background. His default
  is a stroke plus a semi-transparent box. https://ian-hamilton.com/how-to-do-subtitles-well-basics-and-good-practices/
- Matinée, a subtitling house **[P]**, says the text-width black box is the style it recommends most, especially for
  fast-paced or changing footage. It also offers outline plus shadow for simple cases.
  https://matinee.co.uk/blog/style-options-for-burnt-in-subtitles/
- JBI Localization **[P]** notes that CJK and other complex scripts do not outline well, so a box is standard for them.
  This matters because we also subtitle Cyrillic, and a box is script-agnostic.
  https://jbilocalization.com/3-times-when-subtitles-background-boxes-are-great-for-localization/
- BlitzCut **[M]** ranks the options box > outline > shadow and recommends a 70–80% black box and a 3–4 px stroke.
  https://blitzcutai.com/blog/caption-background-vs-outline-vs-shadow

**Numbers.** Worst case is a black plate over pure-white footage, with the plate colour computed from alpha **[C]**:

| Plate alpha | White text contrast | Yellow #FFD400 text contrast |
|---|---|---|
| 50% | 3.9:1 (fails AA) | 2.8:1 |
| 60% | 5.7:1 | 4.1:1 |
| 70% | 8.5:1 | 6.0:1 |
| 75% (YouTube default) | 10.4:1 | 7.3:1 |
| 80% (DHH default) | 12.6:1 | 8.9:1 |
| 90% (ours) | 17.6:1 | 12.5:1 |

A white plate over black footage gives #111 text 11.8:1 at 80% alpha and 15.1:1 at 90% alpha. Pure yellow against white
is 1.07:1, so yellow text is unusable without a box or stroke.

**Stroke and shadow sizes.** No guideline gives pixel values. The de facto convention comes from the ASS/libass format,
which ffmpeg and most fansub tools use. The common default style is Arial 20 with Outline 2 and Shadow 2 at a script height
of 288. Scaled to 1080p, that is roughly a **75 px font with a 7.5 px outline and a 7.5 px shadow**. In other words, the
outline is about 10% of the font size **[P, convention]**.
https://github.com/nattofriends/python-ass · https://subtitleedit.github.io/subtitleedit/reference/assa.html
Creator presets use strokes of 8–12% of the font size, often with a heavy blurred shadow. Submagic's Premiere
recipe uses shadow opacity 100% and blur 70% **[M]**. https://www.submagic.co/blog/how-to-make-alex-hormozi-captions

**Conclusion.** A box is the only treatment that guarantees contrast on any frame, which is why guidelines prefer it. A stroke
of at least 8% of the font size plus a shadow is acceptable, and it looks more current. A shadow alone or plain text
should only be used over footage we control and know to be dark.

## 2. Text colour

- White is the default everywhere: Netflix, DCMP and BBC's first colour **[G]**. Yellow is the traditional alternative.
  BBC's speaker order is white #FFFFFF, yellow #FFFF00, cyan #00FFFF, then green #00FF00, all on black, and the BBC cuts
  line length when colour is used. https://broadcastwriter.com/2024/12/12/bbc-subtitle-style-guide-2024/
  In the DHH study, 10% of users picked yellow **[R]**. https://arxiv.org/html/2609.11408
- I found **no controlled study showing that yellow is more legible than white**. Advice to use yellow on bright,
  changing footage comes from vendors **[M]**, such as https://www.checksub.com/blog/the-best-subtitle-colors. A 2025
  review of eye-tracking studies finds yellow the most *salient* colour. Salience is about attention, not about reading
  speed. https://onlinelibrary.wiley.com/doi/10.1111/joss.70044
- **When colour helps.** Colour can identify speakers, which is BBC and ISO 20071-23 practice. It was found useful in
  multilingual and VR subtitle studies **[R]**.
  https://www.tandfonline.com/doi/full/10.1080/0907676X.2023.2268122 · https://ian-hamilton.com/how-to-do-subtitles-well-basics-and-good-practices/
  Colour can also mark a single keyword. This is social-video practice, and the only data behind it is vendor data **[M]**.
- **When colour hurts.** Colour hurts when it carries meaning a viewer must decode, such as an unexplained palette. It
  hurts when it lowers contrast, for example brand blue on a dark plate or pastel on a light one. It hurts when it
  varies intensity: text opacity used for emotion made captions harder to read in CHI 2024 "Caption Royale" **[R]**.
  It also hurts when styling distorts letterforms: baseline shifts and letter spacing for prosody were rated least
  legible in CHI 2023 **[R]**. https://dl.acm.org/doi/10.1145/3613904.3642258 ·
  https://dl.acm.org/doi/fullHtml/10.1145/3544548.3581511
- **Rule for us.** The base text is white or near-black. An accent colour is used only for one word per cue, and it must
  reach at least 4.5:1 against the plate or stroke colour. Never use the accent for whole lines.

## 3. Emphasis and karaoke in shorts

- **What creators do [M].** Heavy condensed sans type (Montserrat Black or ExtraBold, Anton, The Bold Font, Bebas Neue),
  usually ALL CAPS. Text has a thick black stroke, and one yellow keyword (about #FFD93D or #FFEE33, sometimes green
  #39FF14) is highlighted. One to three words appear at a time, with a scale, pop or bounce animation per word. The block
  sits in the lower-middle area and takes 10–15% of screen height.
  https://ascynd.io/en/blog/hormozi-captions · https://sendshort.ai/guides/hormozi-captions/ ·
  https://blitzcutai.com/blog/best-caption-style-tiktok · https://capcutguide.com/capcut-word-by-word-captions/
  The two main variants are a moving highlight inside a visible phrase, called karaoke, and single words popping in one at
  a time. https://capcutguide.com/capcut-word-by-word-captions/
- **Data on captions in general [survey/industry].** The Verizon Media and Publicis survey (n=5,616 US adults, April 2019)
  found that 69% watch with sound off in public. It also found that 80% say they are more likely to finish a video with
  captions, which is **not** the same as "80% more likely". Captions produced +8% ad recall on mobile.
  https://www.3playmedia.com/blog/verizon-media-and-publicis-media-find-viewers-want-captions/ ·
  https://www.forbes.com/sites/tjmccue/2019/07/31/verizon-media-says-69-percent-of-consumers-watching-video-with-sound-off/
  A Facebook internal ads study found +12% average view time with captions **[industry]**.
  https://www.3playmedia.com/blog/captions-increase-viewership-for-facebook-video-ads/
  None of these studies compares caption *styles*. Claims that karaoke or word-pop beats static captions on retention are
  vendor claims only **[M]**. https://rendercut.io/what-is-karaoke-caption-style
- **Research on synchronised highlighting [R].** "Useful but Distracting" (MUM 2024) tested keyword highlights and
  time-synchronised captions and found them helpful for noticing target words but distracting.
  https://dl.acm.org/doi/10.1145/3701571.3701574
  Karaoke reading-while-listening with children (Gerbier et al., 2015) was a small study.
  https://www.researchgate.net/publication/282601934_Using_Karaoke_to_enhance_reading_while_listening_impact_on_word_memorization_and_eye_movements
  A study of DHH students compared six highlighting strategies for real-time AR captions (n=24).
  https://arxiv.org/abs/2501.02233
- **The accessibility argument [P].** One-word-at-a-time captions remove look-ahead, meaning the perceptual span, and force
  the speaker's pace on the reader. Animation also splits attention and ignores reduced-motion preferences. A full phrase
  with a moving highlight is the less harmful variant.
  https://www.disabled-world.com/disability/accessibility/karaoke-captions.php
- **Line count in vertical video [R].** Li et al. (2026, n=211, webcam eye tracking, TikTok) found that two-line cues drew
  more attention (longer dwell, more revisits) than one-line cues, even with character count controlled. A lab study of
  landscape film found the opposite. For shorts, prefer one line.
  https://onlinelibrary.wiley.com/doi/10.1002/acp.70262 · https://benjamins.com/catalog/tcb.00058.zah

**Trade-offs for our karaoke mode.**
- Keep the whole cue visible and move the highlight. Do not reveal words one by one.
- Highlight by colour, or by a colour chip behind the word. Avoid scale changes of more than about 10% and any baseline
  shift, because both reflow the line. The CHI 2023 result applies here: distorting letterforms lowers legibility.
- Emoji add noise and do not help reading. Use them only in the "social" preset, at most one per cue.

## 4. Font, size, line length, position

- **Font [G/R].** Use a proportional sans-serif, mixed case, medium to bold weight. BBC recommends wide fonts (Reith Sans,
  Verdana, Tiresias) for authoring and system fonts for display. Netflix uses Arial as a placeholder; DCMP asks for medium
  weight sans. Research suggests that much of the legibility advantage of "subtitle fonts" such as Tiresias comes from a
  large x-height, that is, bigger letters at the same point size **[R]**.
  https://www.sciencedirect.com/science/article/pii/S0042698919301087
  All caps is standard for display captions in shorts **[M]**, but guidelines keep mixed case for reading **[G]**. All caps
  is acceptable only for one to three words at a time.
- **Size [G].** BBC sets the line height at 8% of video height for 16:9, 4:3 and 1:1, and at 4.5% of height for 9:16. At
  1080p, both work out to about 86 px of line height, or a font size of about 64–72 px.
  https://broadcastwriter.com/2024/12/12/bbc-subtitle-style-guide-2024/
  Ian Hamilton gives at least 46 px for HD games **[P]**. The ASS convention is about 75 px at 1080p **[P]**. Creator
  captions take 10–15% of height **[M]**. **Our 58 px (5.4% of 1080 and 3.0% of 1920) is below BBC in both formats.**
- **Line length and count [G].**
  - Netflix: 42 characters per line, two lines.
  - BBC broadcast: 37 characters per line, and fewer when colour is used.
  - BBC online width limits: 68% of width in 16:9, 90% in 1:1 and 9:16.
  - BBC line count: at most two lines in landscape and at most three in vertical.
  - DCMP: two lines preferred. Secondary summaries quote 32 characters per line, but I could not find that number on the
    DCMP pages I read. https://www.3playmedia.com/blog/dcmp-closed-captioning-standards/
  - Reading speed: BBC 160–180 wpm, Netflix up to 20 cps for adults, DCMP 130–160 wpm for educational content.
  - Our 84 characters per two lines (42 per line) equals Netflix. In 9:16 at 72 px, a 90%-wide line holds about 24
    characters.
- **Position and safe areas.**
  - BBC: stay within the central 90% vertically and 75% horizontally **[G]**.
  - DCMP: place captions at the bottom, but move them when they would cover faces, mouths or essential on-screen text
    **[G]**.
  - TikTok: the right about 120–180 px and the bottom about 300–400 px of a 1080×1920 frame are covered by UI. Reels
    covers about 500 px at the bottom. A cross-platform safe box is about 900×1160 px, centred **[M, measured by tool
    vendors]**. https://syllaby.io/blog/aspect-ratios-safe-zones-shorts-reels-tiktok/ ·
    https://creamate.ai/en/blog/tiktok-safe-zone-guide · https://houseofmarketers.com/guide-to-safe-zones-tiktok-facebook-instagram-stories-reels/
  - For 9:16, place the cue baseline at about 62–70% of frame height, which is above the caption and UI block and matches
    the creator "lower-middle" position.

## 5. Presets we could ship

All values are for a 1080 px short side. Scale linearly by `min(W,H)/1080`. "Stroke" means an outside or paint-order
stroke, not a centred one, so glyph counters stay open.

**A. "Broadcast plate" (default for explanatory 16:9; closest to what we have today).** It rests on BBC/DCMP guidance and
the DHH defaults.
- Font: Inter/Roboto/system sans, weight 600–700, mixed case.
- Size: 64 px in 16:9 (line height 86 px, 8% of height, per BBC). In 9:16 use 64–68 px, not 58 px.
- Colours: dark theme #FFFFFF on rgba(0,0,0,0.80–0.85). Light theme #111111 on rgba(255,255,255,0.90).
- Plate: per line, padding 0.25em vertical and 0.5em horizontal, radius 0.2em (about 12 px). Consecutive lines touch or
  have at most 4 px between them.
- No stroke. Optional shadow 0 2px 6px rgba(0,0,0,0.35) on the plate only.
- Limits: 42 characters per line, two lines, width at most 68% in 16:9 and 90% in 9:16.
- Karaoke: current word in the accent colour, which must reach at least 4.5:1 on the plate (for example #FFD400 on black,
  12.5:1; on the white plate use a dark accent such as #0B57D0). No scale change.

**B. "Clean outline" (modern, no box; for 16:9 over footage we control).** It rests on Apple Outline Text, the ASS
convention and Hamilton's stroke minimum.
- Font weight 700, 68 px, #FFFFFF.
- Stroke 6 px #000000 (about 9% of font size).
- Shadow 0 3px 8px rgba(0,0,0,0.6).
- Same limits as preset A.
- Add a fallback: when the frame region behind the text is light (mean luminance above about 0.6), switch automatically to
  preset A. This is the frame-contrast check we already test.

**C. "Social pop" (9:16 shorts, creator style).** Its basis is creator practice **[M]**, softened by research.
- Font: Montserrat or Inter ExtraBold (800), 84–96 px (8–9% of width), ALL CAPS allowed. Cue length 1–3 words or at most
  about 16 characters, one line, whole cue visible.
- Text #FFFFFF with an 8–9 px #000000 stroke and a 0 4px 0 rgba(0,0,0,0.9) hard shadow, plus an optional 12 px blur
  shadow at 50%.
- Current word or keyword: fill #FFD400 (or the theme accent at 4.5:1 or better against black). Alternatively use a chip:
  accent background, #000 text, padding 0.08em 0.25em, radius 0.18em.
- Pop: scale 1.0→1.08→1.0 over 120 ms on word entry. Disable it when reduced motion is requested.
- Position: centred, baseline at 62–68% of height, inside a centred 900×1160 safe box.
- Emoji: at most one per cue, off by default.

**D. "Accessible high-contrast" (option for accessibility-first delivery).** It rests on BBC and the DHH data.
- #FFFFFF (or #FFFF00 for a second speaker) on rgba(0,0,0,1.0), rectangular plate with radius 0 to 4 px.
- Weight 600, 72 px, mixed case, two lines at most.
- No animation. Speaker colours in BBC order (white, yellow, cyan, green).

## Open gaps in the evidence

- There are no published controlled comparisons of box, outline and shadow, or of stroke width. The numbers above are
  guidelines, conventions or vendor values.
- No independent A/B data shows that word-pop or karaoke captions improve retention compared with static captions. The
  only research (language learning, DHH real-time captions) reports benefit mixed with distraction.
- DCMP's "32 characters per line" appears only in secondary summaries.
- I could not re-read the BBC's current page directly. Please verify the 8% and 4.5% figures there before citing them
  externally.
