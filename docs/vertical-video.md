# Vertical short video: Reels, Shorts, TikTok, VK Clips

This document answers: what a phone and the short-form platforms require of a film — safe zones,
sizes, pace, legibility — with sources. How the tool builds a vertical film (fields, the reframing of
a landscape scenario, the checks) is in `agentic-screencast help vertical`. A condensed, sourced guide
for building 9:16 films with Agentic Screencast. Every rule carries a
reference to the numbered sources at the end; where a platform publishes no official number, the
spread of third-party measurements is given instead of a single invented value.

## One master for every platform

A single file of **1080×1920, 9:16, 30 fps, H.264 High, AAC 48 kHz, moov atom at the start (fast
start), up to 3 minutes** satisfies Instagram Reels, YouTube Shorts, TikTok and VK Clips without
re-encoding per platform [1][5][6][7][8]. Use 60 fps only for fast motion [8].

| | Reels | Shorts | TikTok | VK Clips |
|---|---|---|---|---|
| Frame | 9:16, 1080×1920 [34] (ads 1440×2560 [1]) | square or vertical [6] | 9:16, from 540×960 [3] | 9:16, 1080×1920 [8] |
| Max length | 3 min for Reels [24] | 3 min [6] | 10 min via the posting API [5] | 3 min [8] |
| fps | constant [1] | as recorded [7] | 23–60 [5] | up to 60 [8] |

Music in Shorts: most tracks may be used for up to 90 s of a Short, but some tracks are limited to
60 s or 30 s [6]. Since 24 September 2026, Shorts longer than one minute with a Content ID claim
are no longer blocked automatically [6].

Platform details beyond the master:

- **Reels.** The limit was raised from 90 s to 3 minutes on 19 January 2025; longer uploads still
  publish but are not recommended as Reels [24]. Organic Reels accept 24–60 fps with 30 fps as the
  norm, and 4K uploads are recompressed to 1080p anyway [34]. The Reels ad spec asks for AAC audio
  of at least 128 kbps in stereo, a constant frame rate and progressive scan; ads may run from 0 s
  to 15 minutes, with files up to 4 GB [1].
- **YouTube Shorts.** YouTube recommends MP4 without edit lists, progressive H.264 High Profile,
  2 consecutive B-frames, a closed GOP of half the frame rate, CABAC, variable bitrate and 4:2:0
  chroma; audio AAC-LC or Opus at 48 kHz; upload at the frame rate you recorded (24, 25, 30, 48,
  50 or 60) [7].
- **TikTok.** Auction In-Feed ads run up to 10 minutes in MP4, MOV, MPEG, 3GP or AVI, with files up
  to 500 MB and a bitrate of at least 516 kbps [3]. Reservation In-Feed ads run 5–60 s (9–15 s
  recommended), with a bitrate of at least 2500 kbps and files up to 500 MB [4]. The posting API
  accepts MP4 (recommended), WebM and MOV; H.264 (recommended), H.265, VP8 and VP9; frame sides of
  360–4096 px; files up to 4 GB; a given user may be limited to 3, 5 or 10 minutes rather than the
  full 10 [5]. The often-quoted 60-minute limit comes from a May 2024 test for a limited set of
  users and markets [26]; the safe limit for automated posting is 10 minutes [5].
- **VK Clips.** A clip runs from 3 s to 3 minutes, with files up to 1 GB [8]. Use 30 fps for
  talking videos and 60 fps for dynamic ones, and do not upload with watermarks from other
  networks [32].

## Safe zones on a 1080×1920 frame

The platform draws the handle, caption, music title, the like/comment/share column and a CTA over
the video. Everything that must be read goes inside the safe zone.

- **Meta (Reels)** is the only platform with official numbers: 14% top, 35% bottom, 6% left and
  right — 269 / 672 / 65 / 65 px, leaving about 950×979 px [1][2]. In March 2026 Meta unified the
  Stories and Reels zones of Facebook and Instagram into one percentage scheme; Stories keep a
  smaller bottom margin of 20% (384 px) [2]. The spec is written for ads, but the overlay on
  organic Reels is the same, so it applies there too [2]. Older guides still quote
  108/320/60/120 [12].
- **TikTok** publishes downloadable templates, not numbers, and says the zone shrinks with a longer
  caption [3][4]. Third-party measurements: top 130–170, bottom 250–484, right 60–180 px
  [10][11][12][30][31].
- **YouTube Shorts** publishes nothing; measurements: top ≈120, bottom 300–400 (≈400 with the
  description expanded), left ≈48, right 96–120 px [9][11]. Shorts ads and organic Shorts share
  the same zone [11]; Kreatli advises keeping text out of the bottom 10–15% of the frame [12].

Two conservative zones for one master, each margin the worst of all platforms on that side:

| Zone | Use for | Top | Bottom | Left | Right | Remaining rectangle |
|---|---|---|---|---|---|---|
| **Strict** | hook, CTA, the key UI element | 269 | 672 | 65 | 180 | x 65–900, y 269–1248 (835×979) |
| **Working** | captions and secondary text | 170 | 484 | 65 | 180 | x 65–900, y 170–1436 (835×1266) |

The bottom-right corner is covered on every platform, so both zones lean left [2][9][10][30].
Preview on the platform before publishing [2][3][4].

**These zones are for a feed only.** A vertical film sent in a messenger, shown to colleagues on a
phone or embedded in a page has no buttons over it, and the feed's zone only shrinks the text and
pushes the space for it to the left. Decide where the film will be watched before laying it out: in
a feed keep the working zone; outside one keep even margins at the sides and small ones at the top
and bottom (`zone: plain` in the tool, `help vertical`). Where the subtitles go when the lower part of
the frame carries the subject is film craft rule 53.

## Story shape of a short

**Hook in the first 1–3 seconds.** In TikTok's own study more than 63% of the highest-CTR videos
show the key message or product in the first three seconds [13]. That figure measures clicks, not
retention, and blogs often misquote it [13]. On-screen text in the first seven seconds of game ads
gave +43% conversion [14]. A third-party benchmark wants over 70% of viewers to pass second three
of a Short; below that the hook needs rework [23]. The official YouTube blog in 2026 calls the
hook-in-the-first-seconds rule common knowledge and adds that views are not the same as fans [27].
Hook types [15][29]:

- **show the result first** — the clean kitchen two seconds after the dirty one; concrete numbers
  ("retention from 20% to 65%") beat generic claims;
- **"you're doing it wrong"** — wrong and right side by side, helpful not superior;
- **POV** — "POV: you open the report on Friday evening", as specific as possible;
- **list** — "three mistakes": lists of three are finished more often, lists of five saved more;
- **tutorial** — start with the action, not an announcement: "If X isn't working for you — watch
  to the end";
- **text hook** — a line that flips meaning; **sound hook** — an intriguing spoken line;
- **visual hook** — an opening frame that sets status or a mystery at once;
- **eye contact** — 33% of top-VTR TikTok auction ads break the fourth wall [13].

**Structure: hook → value → proof → payoff/CTA.** For 21–34 s: hook 0–3 s, value 3–15 s,
demonstration 15–25 s, CTA in the last 5 s [14]. Open a question at the start and close it at the
end [15]. TikTok recommends a short, personal CTA and measured +152% for a text CTA in ads [14];
for organic Shorts, asking for likes at the end breaks momentum [15].

**Pace.** Several scenes beat one continuous shot: +38% conversion in e-commerce ads, five or more
scenes +171% in games [14]. Music faster than 120 BPM often lifts VTR on TikTok [13]. Text
overlays appear in 40% of the highest-VTR TikTok auction ads [13]. Videos shot vertically have on
average 25% higher 6-second view-through [13], and 9:16 ads gave +91% conversion [14]. On
Instagram the main Reels ranking signals are watch time, likes and sends (shares by direct
message); sends weigh slightly more for reach to non-followers, and watch time counts replays [25].

**Length by purpose.** Reach and teaser: 7–15 s [4][33]; feature demo or tutorial: 20–35 s
(21–34 s gave +280% ad conversion [14]); walkthrough: up to 60 s [23]; up to 3 minutes only when
every second adds something. End when the thought is complete, not at a target length [23].
Per platform: Shorts of 15–30 s most often keep retention above 80%, and Shorts under 30 s should
reach completion above 60% [23]; Reels do best at 7–15 s [33]; VK Clips at 7–30 s [32].

**Loop.** Shorts has no built-in loop; make the last frame lead back into the first, visually or
logically [27]. A looped video can push the average percentage viewed above 100% — a third-party
blog claim that YouTube has not confirmed [27] — and Reels watch time counts replays [25].

**Formats for product video.** A 30-second tutorial starts with the action, one step per scene;
before/after shows the result first, then the path to it; a "three reasons" list is easy to finish
[29]. A feature demo shows the key message in the first three seconds [13] and uses several scenes
rather than one shot [14].

## Text and captions

- Captions are mandatory: 69% of people watch without sound in public places, 25% in private
  (Verizon Media & Publicis, 2019); 80% are more likely to finish a video with captions, and 50%
  call captions important because they watch without sound [16]. A retelling of the same study
  reports 92% muted viewing on mobile [17]. The often-quoted "85% muted" has no traceable
  source [16].
- Sound is mandatory too: 88% of TikTok users call sound important and 73% say they would stop on
  an ad with sound (TikTok × Kantar, 2021) [18], and TikTok asks for sound in every creative [4].
  A short must work in both modes.
- Captions pay off: TikTok e-commerce ads with captions or on-screen text gave +80% conversion
  [14], and captions gave mobile viewers +8% ad recall [16].
- Size on 1080×1920: minimum readable 36 px, body 48–72 px, secondary 32–40 px [20]; Legibility.info
  gives 40–60 px as the Full HD minimum for body text and headings at least 50% larger [21]. For text a
  viewer must read — an interface label, a diagram box — take 48 px as the floor (see "Architecture and
  real interfaces on a phone" below). For
  Russian or English captions use 60–72 px (≈25 characters across 835 px), hooks 90–120 px, never
  more than two lines [19][20][21].
- Line length: the BBC limits a caption line to 37 characters and Netflix to 42; vertical examples
  run 33 characters without losing readability, and 9:16 guides advise about 25 at most [19].
- A caption lasts 1–6 s; edit it rather than transcribe verbatim, removing repeats and filler
  words [19]. Keep captions inside the working zone: the block's bottom edge no lower than
  y = 1436, CTA text no lower than y = 1248.
- In 9:16, captions sit somewhat higher than in landscape, because faces are in the upper half of
  a tall frame; on TikTok they usually sit higher than on Reels [3].
- Avoid white and transparent backgrounds on TikTok — its own UI is white [4]; give your text a
  plate or an outline [20].
- Word-by-word (karaoke) highlighting is widely recommended by caption tools but no public A/B test
  shows a retention gain; a 2024 study called it "useful but distracting" [28]. If you use it, sync
  it to words — uniform stretching across a phrase is noticed at once [28]. The tool times karaoke
  words by their length, not by recognising speech (`help text`): a synthesised voice at an even pace
  stays close; check a human read in the stills.

## Sound

- Loudness: only YouTube publishes normalisation (≈ −14 LUFS; louder uploads are turned down).
  Practical target for all platforms: −14 LUFS integrated, true peak −1 dBTP [28][35].
- Music under a voice sits 18–25 dB below it; ducking of 6–12 dB with a fast attack and slow
  release [35].
- A voice-over together with on-screen offer text gave +87% ad conversion on TikTok [14].
- According to TikTok, a recognisable brand sound lifts brand association 8 times more than
  slogans and logos do [18].
- TikTok advises following trends and producing videos for them quickly [13]; on the YouTube blog,
  creator Jordan Howlett advises also making your own thing, because such videos live longer [27].

## Showing a product interface in 9:16

Establish the complete application screen before any detail, in vertical films as in every other format. The overview gives the viewer a map; the later close-up makes its subject readable. A permanent crop loses location, while a permanent whole-screen view can make labels too small [22][36]. Use the [directed-scene recipes](directed-scenes.md#show-the-whole-interface-before-a-detail) to connect those two views.

- Record the complete relevant application viewport first, then reframe on its subject [22]. A narrow panel capture needs a whole-screen establishing view so its location is known.
- Zoom harder than in landscape — 1.25× to 5× on clicks and small details; two or three push-ins on
  the moments the narration names [22][36].
- One panel at a time; keep the subject near the centre — far corners are cut first [22][36].
- A push-in enlarges everything round its subject too: a page that fits the feed's safe zone at its
  own size spills out of it under a 1.5× push. Lay out a page you write so the pushed subject and its
  neighbours stay inside the zone at the push's scale; the build names text past the zone
  (`safe-zone`, `help vertical`).
- A large cursor and a visible click [22]; text overlays for context lost to the crop [14][22].
- Split screen for wrong/right, picture-in-picture for the presenter [22][29].
- Record at a resolution where labels stay sharp: zoom cannot rescue a blurred source; 720p+ gave
  +312% conversion in TikTok ads [14][36]. A take's video is as many pixels wide as its viewport
  is in CSS pixels, so a phone layout at 390 CSS px records a 390 px picture unless the take is
  given a scale (`help capture`); probe three seconds first (film craft 55).

## Architecture and real interfaces on a phone

A film for colleagues — a task, a design review, a presentation — that explains a system's
architecture or walks through its real interface, watched on a phone. The frame is 1080 px wide
and every pixel of it has to carry text large enough to read. The pixel
numbers convert points and visual angles for a 6.1-inch phone showing the film full screen at
about 36 cm (1 iOS point ≈ 2.75 px of the frame, 1° ≈ 104 px) — that conversion is ours, not the
sources'. In a messenger the film often plays inline, in a bubble narrower than the screen, which
shrinks every size below; aim above the minima.

**Text size.** Text the viewer must read needs a font of at least **48 px** in the 1080×1920
frame, and 56–72 px reads comfortably: the BBC authors vertical subtitles at a 4.5% line height —
86 px — which players may shrink to 0.6–0.8×, 52–69 px [37]; about 0.5° suits phones (via snippet)
[38], 52 px; legibility.info computes 40–60 px [39]; iOS body text of 17 pt is 47 px [40], Material's
16 sp body 42 px [41]. Nothing smaller than **30 px** (iOS minimum 11 pt, Material's smallest
label) [40][41], and only for text nobody needs to read. Headings 90–120 px [40][41].

**Text amount and time.** A block of on-screen text — a card, a label, a title — holds at most three
lines of about 30 characters, inside the central 972×1440 px (y 240–1680) [37][39]; subtitles keep to
two lines (above). Hold text at 160–180 words a minute [37], no faster than 20
characters a second [42], and on a phone better 13 — a 30-character line wants 2.3 s [39].

**A wide interface.** A desktop app's 13 px text reaches 48 px only when about 290 CSS px of its
width fill the frame (360 px at 16 px text) — a 1440 px window is shown a fifth at a time, and the
capture needs about 3.7 device pixels per CSS pixel, or the zoom is a blurred upscale [49]; our
arithmetic from the typography above. So:

1. When the interface is yours to render, lay it out for the phone instead of zooming it: a phone-
   width viewport (360–390 CSS px, text ≥ 16 px) reflows the app by itself.
2. In every case open with the whole window as a map, then go into detail: overview first, detail on demand [54]. Keep that location understandable during the move and after navigation to another screen.
3. Crop to the region being discussed after the overview and move between regions (Tella, Screen Studio, Camtasia practice) [49][61][62]. The whole-screen shot gives orientation; the close-up holds still while text is read.
4. A magnifier for one small detail while the context stays [62]; stacked strips of one wide UI when
   two parts must be seen together.
5. A device frame costs width — every pixel of bezel is lost text size; leave it off desktop UIs.

**An architecture diagram.** Build it piece by piece, each piece named in the narration at the
moment it appears: segmenting helps even when the video sets the pauses (retention d = 0.42,
transfer d = 0.35) [51]; highlighting the active part helps (retention g = 0.53, transfer g = 0.33)
[52]; narration timed with the picture (d = 1.30), labels inside the boxes rather than a legend
(0.79), cutting decoration (0.70) and naming the parts before the flow (0.46) (via snippet) [50].
Add at most about four new elements per step — working memory holds about four [56]; a readable
whole view holds roughly eight to ten boxes with 48 px labels (our geometry). Animate slowly,
schematically, in discrete steps, with arrows for order and direction [53]. Run the flow top to
bottom along the tall axis; a colour code needs a shape or a label beside it, lines and borders a
3:1 contrast and text 4.5:1 [57][58], and a 1–2 px line of a desktop diagram vanishes at phone
scale — draw arrows 6–8 px wide in the frame.

**Pace and shape.** State the point in the first three seconds [47]; name the components, then
3–6 built segments of 15–30 s, each ending on a pause over the finished part, then the whole flow
once — one to three minutes; engagement with instructional video peaks at about six minutes
whatever its length, and fast speech is followed when the picture carries the same content [45].

**In the tool.** The rules above map onto: the build's `legibility` report, which names every focus
whose text is under 48 px, and its `small` report, which names every line of a built-in slide under
the 36 px floor for secondary text (`help vertical`); a push-in (`spotlight`), `"pan": true` along a wide
subject and `overlay.loupe` for one detail (`help overlay`, `help text`); a diagram built on the
narration's beats as a `page` of your own — its elements carry `data-at` anchors and
`window.renderAt(t)` draws them, as `help video` shows under `page` — or a slide that enters its
items one by one (`help slides`); a spotlight per beat walking the flow, consecutive focuses travelling without a
return to the overview (`help overlay`). For one scenario shipped in landscape and portrait,
give a `page` scene both `page: pages/diagram.html` and
`pageVertical: pages/diagram.vertical.html`; add `.en` variants for translated pages.
The portrait page replaces the landscape page in a vertical build instead of being cropped.
Lay it out in frame pixels so the text the viewer must read reaches at least 48 px, then
inspect `frames --format vertical` and the final film: the report's size alone does not
prove that subtitles leave the page visible. A live take of your own product recorded at
a phone-width viewport reflows instead of being zoomed (`help capture`). For automatic landscape-to-portrait conversion, pages and capture takes first fit their complete source viewport into the frame, then smoothly enter the existing focus path; opening actions keep their recorded times. Captions remain at output size. An unmarked supplied clip keeps its previous crop behavior, so establish a UI clip explicitly with `contain` or `device`. See [automatic vertical overview](directed-scenes.md#automatic-vertical-overview) and the [buildable example](../example/interface-overview/README.md).

For
a landscape take used in a portrait film, `autoZoom: {"follow":"cursor"}`
uses its recorded actions and pointer path to scale a specific subject and
hold that subject until the pointer reaches it; the crop then follows the
pointer when it leaves the central region. A whole-viewport
action without a specific nearby click adds no automatic focus. Name a flat
important control as a target when using `captions: auto`, and inspect the
encoded phone frame to check that the caption remains clear of it.

A diagram built piece by piece, one part per beat of narration, read at a phone pace:

```markdown
# How a scenario becomes a film
format: vertical
voice: {"engine":"stub","name":"silent","cps":13}
captions: {"style":"karaoke","size":1.25}

## parts · slides.chain
kicker: The pipeline
title: Four parts, one direction
nodes: Scenario | Voice | Frames | MP4
at: b1 b1 b2 b3 b4

The scenario is the only input.

Every beat is voiced first, and its length sets the scene.

Chromium draws each frame at the scene's time.

ffmpeg joins the frames and the sound into one file.
```

## Doing it with Agentic Screencast

The tool side of everything above — `format: vertical` and its safe zone, a landscape scenario built
vertical with `build --format vertical`, the slides' portrait grid, the checks — is in
`agentic-screencast help vertical`; the size the subtitles are drawn at is in `help text`. The skeleton
of a vertical short is `agentic-screencast new reel` ([`templates/reel.md`](../templates/reel.md)).

## Sources

1. https://www.facebook.com/business/ads-guide/update/video/instagram-reels — Meta Reels ads spec: 9:16, 1440×2560, H.264/AAC, safe zone 14% / 35% / 6%.
2. https://frameextractor.video/blog/instagram-safe-zones/ — Meta percentages in pixels (269/672/65), unified Stories/Reels zones (March 2026), uneven bottom margin.
3. https://ads.tiktok.com/help/article/tiktok-auction-in-feed-ads?lang=en — TikTok auction In-Feed spec; safe zones only as templates.
4. https://ads.tiktok.com/help/article/tiktok-reservation-in-feed-ads-reach-frequency?lang=en — reservation In-Feed: 5–60 s, 9–15 s recommended, avoid white backgrounds, include sound.
5. https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide — TikTok posting API limits: codecs, 23–60 fps, up to 10 min.
6. https://support.google.com/youtube/answer/15424877?hl=en — Shorts up to 3 minutes; music up to 90 s.
7. https://support.google.com/youtube/answer/1722171?hl=en — YouTube encoding recommendations.
8. https://vk.ru/faq20115 — VK Clips: 9:16, 1080×1920, 3 s–3 min, 60 fps, 1 GB.
9. https://postplanify.com/tools/youtube-shorts-safe-zone-checker — Shorts measurement 120/300/48/96, ≈400 with description.
10. https://postplanify.com/tools/tiktok-safe-zone-checker — TikTok measurement ≈140/324/—/164.
11. https://adverthunt.com/tools/ad-safe-zone-checker/tiktok — TikTok In-Feed 150/440/60/60, TopView 170/480/60/60; Shorts right 120, bottom ≈350.
12. https://kreatli.com/guides/safe-zone-guide — older Reels numbers, TikTok ≈130/250/60.
13. https://ads.tiktok.com/business/library/Auction_Ads_Creative_Tips.pdf — TikTok creative tips: 63% first-3-s message, >120 BPM, 33% eye contact, 40% text overlays.
14. https://ads.tiktok.com/business/en-US/blog/creative-that-drives-conversions — TikTok: 21–34 s +280%, multiple scenes +38%/+171%, text CTA +152%, captions +80%, voice+text +87%.
15. https://www.socialmediaexaminer.com/youtube-shorts-hooks-and-curiosity-loops-that-explode-your-views/ — hook types, curiosity loops, no like-begging at the end.
16. https://www.3playmedia.com/blog/verizon-media-and-publicis-media-find-viewers-want-captions/ — Verizon Media & Publicis 2019: 69% / 25% muted, 80% finish with captions.
17. https://www.nexttv.com/news/mobile-videos-often-watched-without-audio-study-finds — same study, 92% muted on mobile.
18. https://ads.tiktok.com/business/en-US/blog/kantar-report-how-brands-are-making-noise-and-driving-impact-with-sound-on-tiktok — TikTok × Kantar: 88% call sound important.
19. https://www.nimdzi.com/subtitling-vertical-videos-guidelines-where-art-thou/ — vertical subtitling: 1–2 lines, 33–37 characters, 1–6 s, edit not transcribe.
20. https://www.rocketshiphq.com/text-overlays-video-ads-mobile/ — text sizes on 1080×1920: 36 px minimum, 48–72 body.
21. https://legibility.info/rules-for-text-in-videos — Full HD body 40–60 px, headings 50% larger.
22. https://recorded.app/en/blog/vertical-video-screen-recording/ — vertical screen recording: regions, reframing, aggressive zoom, large cursor.
23. https://www.opus.pro/blog/ideal-youtube-shorts-length-format-retention — Shorts 15–30 s, >70% past second 3.
24. https://www.medianama.com/2025/01/223-instagram-reels-3-minutes-us-tiktok-ban/ — Reels up to 3 minutes from 2025-01-19; longer uploads not promoted as Reels.
25. https://www.dataslayer.ai/blog/instagram-algorithm-2025-complete-guide-for-marketers — Reels ranking signals: watch time with replays, likes, sends.
26. https://techcrunch.com/2024/05/16/tiktok-upload-60-minute-videos — the May 2024 TikTok test of 60-minute uploads for a limited group.
27. https://blog.youtube/creator-and-artist-stories/five-tips-to-master-shorts/ and https://blog.youtube/creator-and-artist-stories/grow-youtube-channel-interactive-shorts/ — YouTube on hooks and trends; loops (the >100% claim is from a third-party blog).
28. https://dl.acm.org/doi/10.1145/3701571.3701574 — MUM 2024 "Useful but Distracting" on word-synced captions.
29. https://www.go-viral.app/blog/best-hooks-for-short-form-video/ and https://vidiq.com/blog/post/viral-video-hooks-youtube-shorts/ — hook formats: POV, before/after, lists, tutorials, "doing it wrong".
30. https://creamate.ai/en/blog/tiktok-safe-zone-guide — cautious TikTok zone 140/400/60/180.
31. https://www.xyla.ai/tools/social-media-sizes/ — TikTok ≈130/484/—/140.
32. https://vc.ru/social/2732510-trebovaniya-k-publikatsii-klipov-v-vkontakte — VK Clips: 30–60 fps, MP4, no foreign watermarks, best length 7–30 s.
33. https://blog.hootsuite.com/short-form-video/ — Reels 7–15 s.
34. https://www.hopperhq.com/blog/instagram-reel-size/ and https://influencermarketinghub.com/instagram-video-size/ — organic Reels 1080×1920, 24–60 fps, 30 fps standard, 4K recompressed to 1080p.
35. https://zellahq.com/blog/music-ducking-explained/ and https://apu.software/tiktok-instagram-reels-loudness/ — music 18–25 dB under voice, 6–12 dB ducking; −14/−16 LUFS, −1 dBTP.
36. https://demozoom.app/vertical-screen-recording and https://www.howdygo.com/blog/demo-recording-software — UI demos in 9:16: 1.25–5× zoom, one panel at a time.

37. BBC Subtitle Guidelines v1.2.3 (June 2024), copy at https://broadcastwriter.com/2024/12/12/bbc-subtitle-style-guide-2024/ — vertical subtitles at a 4.5% line height, 3 lines, 90% width, 160–180 wpm.
38. https://bbc.github.io/csun/how_big_should_subtitles_be/index.html — BBC R&D, ~0.5° for phones (via snippet).
39. https://legibility.info/rules-for-text-in-videos — 40–60 px body text on a phone, ≤30 characters, ≤3 lines, 13 characters a second.
40. https://developer.apple.com/design/human-interface-guidelines/typography — iOS 17 pt body, 11 pt minimum, 34 pt large title.
41. https://github.com/material-components/material-components-android/blob/master/docs/theming/Typography.md — Material 3 type scale.
42. https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977-English-USA-Timed-Text-Style-Guide — ≤20 characters a second, 5/6–7 s per event.
43. https://useyourloaf.com/blog/iphone-16-screen-sizes/ — iPhone 16: 393×852 pt, 460 ppi.
44. https://journals.lww.com/optvissci/fulltext/2011/07000/font_size_and_viewing_distance_of_handheld_smart.5.aspx — reading distance of phones, about 36 cm.
45. https://up.csail.mit.edu/other-pubs/las2014-pguo-engagement.pdf — Guo, Kim & Rubin 2014: engagement peaks at ~6 minutes; fast speech followed.
46. https://blog.youtube/news-and-events/tall-updates-coming-to-shorts/ — Shorts up to 3 minutes.
47. https://www.facebook.com/business/news/updated-features-for-video-ads — up to 47% of the value in the first 3 s (via snippet).
48. Vendor caption-size guides (non-authoritative, via snippet): https://blitzcutai.com/blog/best-caption-size-youtube-shorts-2026
49. https://www.tella.com/record/screen-recorder-instagram-reel-video and https://www.tella.com/help/editing/add-a-zoom — crop to the region, zoom to the detail, high zoom of a low-resolution capture looks soft.
50. https://onlinelibrary.wiley.com/doi/abs/10.1111/jcal.12197 — Mayer 2017, multimedia principles and effect sizes (via snippet).
51. https://maria-wirzberger.de/wp-content/uploads/2019/01/Rey2019_Article_AMeta-analysisOfTheSegmentingE.pdf — Rey et al. 2019, segmenting meta-analysis.
52. https://www.sciencedirect.com/science/article/abs/pii/S1747938X17300581 — Schneider et al. 2018, signaling meta-analysis (via snippet).
53. https://hci.stanford.edu/courses/cs448b/papers/Tversky_AnimationFacilitate_IJHCS02.pdf — Tversky, Morrison & Bétrancourt 2002, slow schematic animation, arrows.
54. https://hci.stanford.edu/courses/cs448b/papers/shneiderman96eyes.pdf — Shneiderman 1996, overview first, then detail (via snippet).
55. https://onlinelibrary.wiley.com/doi/10.1002/acp.70262 — Li et al. 2026, subtitles in vertical video (via snippet).
56. https://philpapers.org/rec/COWTMN — Cowan 2001, about four chunks in working memory (via snippet).
57. https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html and https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html — text contrast 4.5:1, colour backed by another cue.
58. https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html — graphics contrast 3:1.
59. https://www.nimdzi.com/subtitling-vertical-videos-guidelines-where-art-thou/ — vertical subtitle practice.
60. https://www.nngroup.com/articles/mobile-content/ — reading on phones (via snippet).
61. https://screen.studio/guide/auto-zoom — zoom to clicks (via snippet).
62. https://www.techsmith.com/learn/tutorials/camtasia/cursor-effects/ — Camtasia SmartFocus and Cursor Magnify (via snippet).
63. https://help.descript.com/hc/en-us/articles/12920160974477-Aspect-ratio-and-video-settings — 9:16 canvas and reframing (via snippet).
64. https://architecturediagram.ai/blog/system-design-interview-diagrams — top-to-bottom system diagrams (via snippet).

Source numbers identify the references supporting each claim.
