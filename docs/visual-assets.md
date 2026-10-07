# Free visual assets: where to get them and how to stay within the licence

Agentic Screencast ships no photos, video clips, illustrations, icons or stickers; it bundles only
an emoji set and the themes' fonts (see "Emoji as images" and "Fonts"). The agent that builds a film
fetches the rest itself, records their licence, and places them beside the scenario so the render
never needs the network. This guide says where to look, what each source allows, and
how to wire a file into a scene. Music and sound effects have [their own guide](sound.md).
Bracketed numbers point to the sources at the end. This is not legal
advice: for a commercial release, show the owner the credits file and any doubtful item.

## Three questions before any file enters a scene

Answer them and write the answers into `assets/CREDITS.md` beside the scenario:

1. **What licence does this file carry?** The file's, not the site's: on Wikimedia Commons, Free
   Music Archive and Freesound it differs from file to file [10][52][62].
2. **Is attribution required, and where?** For Creative Commons use TASL — Title, Author, Source,
   Licence — see the last section [69].
3. **Is this use allowed?** Non-commercial (NC), no derivatives (ND), share-alike (SA), trademarks
   and recognisable people.

If any answer is "I don't know", the file is not used.

## Summary

| Source | Licence | Attribution | Commercial | Programmatic access |
|---|---|---|---|---|
| Unsplash | Unsplash License | not required (API use: required) | yes | API with key [1][2] |
| Pexels | Pexels License | not required (API: link to Pexels) | yes | API with key [4][6] |
| Pixabay | Pixabay Content License | not required | yes | API with key, images/video only [7][8][9] |
| Wikimedia Commons | per file | usually required | per file | API without key, images and video [10][11][83] |
| unDraw | unDraw License | not required | yes | **no automated download** [13] |
| Open Peeps, Humaaans | CC0 | no | yes | manual [14][15] |
| Hero Patterns | CC BY 4.0 | **required** | yes | copy SVG [17] |
| SVG Backgrounds (free) | own licence | **required** | yes | manual [18] |
| Lucide | ISC (+MIT part) | licence text if you redistribute files | yes | npm/CDN [19] |
| Heroicons, Tabler, Phosphor | MIT | same | yes | npm/CDN [20][21][22] |
| Material Symbols | Apache 2.0 | same | yes | npm/CDN [23] |
| Noto Emoji images | Apache 2.0 | same | yes | CDN [27] |
| Fluent Emoji (static and animated) | MIT | same | yes | CDN / Git LFS [31][32] |
| Twemoji graphics | CC BY 4.0 | **required** | yes | CDN [26] |
| Noto Animated Emoji | CC BY 4.0 | **required** | yes | CDN [28][29] |
| OpenMoji | CC BY-SA 4.0 | **required + share-alike** | yes | CDN [30] |
| GIPHY | rights stay with the original owners | — | **no without permission** | API with key [34][35] |
| Tenor | — | — | — | **API shut down 2026-06-30** [36][37] |
| LottieFiles free library | Lottie Simple License | not required | yes | manual [38][39] |
| Google Fonts | OFL / Apache / UFL | not required | yes | Fontsource CDN [43][47] |
| Fontshare | ITF FFL or OFL | not required | yes | download only, no redistribution [45] |

MIT, ISC and Apache ask for the licence text beside **redistributed files**. Apache 2.0 counts
"conversions to other media types" as object form [72], so the cheap safe practice is to name the
set and its licence in the film's end credits or description.

## Photos and backgrounds

- **Unsplash** — free, including commercial use, without permission or credit; credit is
  appreciated in the form "Photo by [Photographer] on Unsplash". Do not sell unaltered images or
  rebuild a competing service [1]. The API needs an access key, hotlinks the returned URLs, must
  ping the download endpoint and must credit the photographer and Unsplash; a demo key allows 50
  requests an hour, a production key 1000 [2]. Unsplash+ images are paid and excluded [3]. Image
  URLs accept `w`, `h`, `q`, `fm`, `crop`, `fit` and `dpr`, and the `ixid` parameter must be kept.
  For a 1920×1080 frame request `?w=1920&h=1080&fit=crop&q=80&fm=jpg`; for a slow push-in take
  extra width, e.g. `w=2880` [2].
- **Pexels** — own licence (no longer CC0), credit appreciated, not required; no selling unaltered
  copies, no endorsement by the people shown, no showing them in a bad or offensive light, no
  redistribution on other stock sites, no use as a trademark or name [4][5]. The API key is free;
  the default limit is 200 requests an hour and 20,000 a month, and API use needs a prominent link
  to Pexels and, where possible, the credit "Photo by [Name] on Pexels". Use `large2x` or
  `original` for Full HD [6].
- **Pixabay** — free to use and modify without credit; no "standalone" redistribution — a filter
  or crop still counts as standalone [7][8]. API key required; the limit is 100 requests per 60
  seconds, results must be cached for 24 hours and their source shown to the user; download files,
  do not hotlink. `largeImageURL` is 1280 px and `fullHDURL` 1920 px; the full-resolution
  `imageURL` needs approved full access. Video comes as `large` (usually 3840×2160) and `medium`
  (1920×1080) [9].
- **Wikimedia Commons** — licence per file on its description page [10]. The MediaWiki API needs
  no key; `Special:FilePath/<Name>?width=1920` redirects to the file [11]. To get the licence
  together with the file, ask for its metadata:
  `https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=File:<Name>&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1920&iiextmetadatafilter=LicenseShortName|LicenseUrl|Artist`.
  The answer holds `thumburl` and the licence fields; `Artist` comes as an HTML fragment, so strip
  its tags [11]. Scripts must send an informative User-Agent in the form
  `<client>/<version> (<contact>) <library>/<version>`, or they may be blocked [12]. CC BY-SA files
  make the film share-alike — see the last section.
- **People, brands and trademarks** are outside the photographer's licence: free stock carries no
  model or property release [1][4][7][82].

**In a film.** A photo goes into `slides.photo` or behind a headline in `slides.hero`, a product
screenshot into `slides.shot` (`agentic-screencast help slides`). Pictures are embedded into the
generated page, so replacing a file under the same name rebuilds the scene.

## Video clips

A film without a product of its own — a parody, a teaser, an idea told with other people's footage —
stands on video clips. The same three questions apply to every clip, and the licence is the
file's.

- **Wikimedia Commons** — video (WebM, Ogg) with a licence per file [10]. Search the file namespace
  with the CirrusSearch keyword `filetype:video` [84]:
  `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srnamespace=6&srsearch=filetype:video%20cat%20jump&srlimit=50`
  [83], then ask each title for its URL and licence with the same `imageinfo` query as for photos
  (`iiprop=url|extmetadata`, `iiextmetadatafilter=LicenseShortName|LicenseUrl|Artist`) [11]. Keep
  CC0, public-domain and CC BY files; a CC BY-SA clip makes the film share-alike. Send an
  informative User-Agent [12].
- **Pexels** — videos under the Pexels License, like its photos: credit appreciated, not required,
  no selling unaltered copies [4][5]; the API searches them at `https://api.pexels.com/videos/search`
  with the same free key, and each result lists files by width — take the 1920 one [6].
- **Pixabay** — videos under the Pixabay Content License [7][8]; the API endpoint is
  `https://pixabay.com/api/videos/`, and each hit offers `large` (usually 3840×2160) and `medium`
  (1920×1080) files — download them, do not hotlink [9].

Write the file's title, author, source URL and licence into the film's credits as you download it,
not afterwards — a clip without a known licence does not go into the film.

**In a film.** A clip is a `video` scene; `from`, `to` and `fit` are in `agentic-screencast help
video`. Lay the clip out with `agentic-screencast sheet clip.webm` before writing the scenario: the
sheet shows its frames with their seconds, so the pieces are chosen from what is really in the file.

## Illustrations and abstract backgrounds

- **unDraw** — any project, no credit, but **no automated downloading or scraping** [13]: a person
  downloads the SVG (the site recolours it) and puts it beside the scenario.
- **Open Peeps** and **Humaaans** — CC0 [14][15].
- **Hero Patterns** — CC BY 4.0, credit Steve Schoger [17].
- **SVG Backgrounds** — the free graphics may be used in personal and commercial projects only
  with a credit: name the graphics used, write "by SVGBackgrounds.com", link to the set and put
  the credit near the graphic. Use without credit needs a paid plan, and redistribution in
  templates or themes needs the Extended License [18].
- **Haikei** — generator with no stated licence for its output [16]: prefer your own.
- **Your own CSS/SVG** gradient, noise or pattern carries no external licence at all — the first
  choice for an abstract background. The built-in slide backgrounds already follow this rule.

## Icons

| Set | Licence | SVG URL |
|---|---|---|
| Lucide | ISC [19] | `https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/<name>.svg` |
| Heroicons | MIT [20] | `https://cdn.jsdelivr.net/npm/heroicons@2/24/outline/<name>.svg` |
| Tabler | MIT [21] | `https://cdn.jsdelivr.net/npm/@tabler/icons@latest/icons/outline/<name>.svg` |
| Phosphor | MIT [22] | `https://cdn.jsdelivr.net/npm/@phosphor-icons/core@latest/assets/<weight>/<name>-<weight>.svg` |
| Material Symbols | Apache 2.0 [23] | `https://cdn.jsdelivr.net/npm/@material-symbols/svg-400@latest/outlined/<name>.svg` |
| Iconify (any set) | per set [24] | `https://api.iconify.design/<prefix>/<name>.svg?color=%23RRGGBB&width=256` |

`https://api.iconify.design/collections?prefixes=lucide,tabler` returns each set's licence as an
SPDX id [25]. A set whose id is `CC-BY-4.0` or `CC-BY-SA-4.0` (for example `twemoji` or
`openmoji`) needs a credit line before it is used. Brand logos are trademarks whatever the SVG licence says.

## Emoji as images

A font emoji depends on the machine: macOS draws Apple Color Emoji, a Linux CI box often draws an
empty box ("tofu"). Draw emoji as images from a named set so the frame is the same everywhere.

- **Noto Emoji 2D — recommended default.** Images are Apache 2.0 [27]; no credit inside the film.
  SVG: `https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/2D/svg/emoji_u<cp>.svg` — code
  points in lower case joined by `_`, every `FE0F` removed (`emoji_u1f3f3_200d_1f308.svg`).
  PNG: `https://raw.githubusercontent.com/googlefonts/noto-emoji/main/2D/png/<32|72|128|512>/emoji_u<cp>.png`,
  and 3D PNG under `3D/png/<size>/`. The old `svg/` and `png/` paths now return 404; use `2D/` [27].
  The `2D/svg` folder carries its own Apache 2.0 licence, but `3D/png` has none and the root
  LICENSE holds OFL text, so the licence of the 3D images is less certain; prefer 2D [27].
- **Fluent Emoji** (Microsoft, MIT) — 3D, Color and Flat styles, files named by English name, not
  code point (`assets/<Name>/Color/<name>_color.svg`; the mapping is in each folder's
  `metadata.json`) [31]. **Fluent Emoji Animated** (MIT) is the only official animated set
  without mandatory credit; it lives in Git LFS, so `raw.githubusercontent.com` and jsDelivr return
  a 132-byte pointer with status 200 — fetch from `media.githubusercontent.com` and check the file
  signature, not the status code [32]. Third-party "Animated Fluent Emojis" repositories (for
  example Tarikul-Islam-Anik) repackage Emojipedia files marked "all rights reserved by
  Microsoft"; do not use them.
- **Twemoji** graphics are CC BY 4.0 — credit in every film [26]; pin the version
  (`jdecked/twemoji@17.0.3/assets/svg/<cp>.svg`, `FE0F` dropped outside ZWJ sequences).
- **Noto Animated Emoji** is CC BY 4.0 — credit required [28][29]:
  `https://fonts.gstatic.com/s/e/notoemoji/latest/<cp>/512.gif` (also `lottie.json`). Files come
  one at a time; the authors do not offer the set as a single download [28]. Google gives no
  official credit wording [33]; a safe end-card line is "Animated emoji: Noto Emoji by Google,
  CC BY 4.0".
- **OpenMoji** is CC BY-SA 4.0 — do not use by default: a film containing it may have to be
  released under the same licence [30][71].

## Stickers, GIFs and Lottie

- **GIPHY is not a source for films**: its terms forbid commercial use without permission, and the
  rights belong to the original owners [35].
- **Tenor**'s API was shut down on 2026-06-30 [36][37].
- **LottieFiles free library** — Lottie Simple License: commercial use without credit; paid
  marketplace files carry other terms, check each badge [38][39]. The licence must accompany any
  Lottie files you redistribute, and the files may not be gathered into a similar or competing
  service [38]. The platform's free and individual plans are non-commercial, but that applies to
  animations made with the platform's own tools, not to the free public library [40]. Lottie JSON renders in a page
  scene with lottie-web; ffmpeg cannot read it.
- **Your own sticker** — an emoji image plus a shape — needs no licence at all.

**In a film.** A sticker takes a GIF, a WebM with transparency or an animated PNG directly and
plays it on scene time; an emoji the bundled Noto set lacks comes from a folder of your own
(`agentic-screencast help text`). Do not put a GIF into your own page scene instead: the browser
plays it on its own timer, and the film stops being reproducible frame by frame.

**Not supported, and the way around.** Animated WebP cannot be decoded by the bundled ffmpeg, and a
Lottie JSON is not an image: take the GIF variant of the same animation (Noto Animated Emoji offers
`512.gif`), or render the Lottie in a `page` scene with lottie-web. To keep a GIF as a clip of its
own instead, convert it:

```bash
# GIF or APNG → WebM VP9 with transparency (checked on the bundled ffmpeg 6.0)
ffmpeg -y -i in.gif -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 30 -auto-alt-ref 0 -row-mt 1 -an out.webm
# for an APNG (Fluent Emoji Animated) name the input format: -f apng -i in.png
# GIF → MP4 without transparency (H.264 needs even sizes)
ffmpeg -y -i in.gif -movflags +faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" out.mp4
```

`yuva420p` keeps the alpha channel and `-auto-alt-ref 0` stops VP9 from damaging it [41]. To read
the alpha back, decode with libvpx (`-c:v libvpx-vp9` before `-i`) [41]. Safari and iOS do not
decode VP9 with alpha, so a transparent WebM works in a page scene rendered by Chromium but not in
WebKit [42].

**Everything together** — a picture, a headline over a picture, a screenshot in a frame, an
animated sticker and an emoji from your own folder:

```markdown
# Assets example
voice: {"engine":"stub","name":"silent","cps":15}
emoji: {"dir":"emoji"}

## open · slides.hero
kicker: Night city
title: A picture behind the headline 🌟
image: assets/city.jpg
duration: 4

## place · slides.photo
image: assets/city.jpg
point: 0.6 0.4
push: 1 1.15
title: A slow push-in
duration: 4

## screen · slides.shot
image: assets/screen.png
device: browser app.example.com
title: The product in context
overlay: {"stickers":[{"at":1,"image":"assets/party.gif","point":[0.8,0.3]}]}
duration: 5
```

## Fonts

- **Bundled with the tool** — the themes' font families (`assets/fonts`, Latin and Cyrillic,
  OFL-1.1, listed in `assets/fonts/README.md`) are embedded into every rendered page, so no font
  needs to be installed and no network is used. A theme names them in `--display`, `--sans` and
  `--mono`; to use another bundled family, name it there (`agentic-screencast help themes`). Cyrillic coverage, licence conditions and font selection guidance,
  including the lack of Cyrillic in Bebas Neue, Space Grotesk, Orbitron and Fraunces, are in
  [the fonts research](research/fonts.md).
- **Google Fonts** — open licences (mostly OFL), commercial use on any surface; text rendered into
  an image is an image, not the font [43][44]. The OFL needs no credit in a film, but a modified
  font may not keep its Reserved Font Names, and the font may not be sold on its own [44][46].
- **Fontshare** — ITF Free Font License allows commercial use but forbids redistribution: download
  it, do not commit it [45][46].
- **Offline**: Fontsource serves open fonts as files —
  `https://cdn.jsdelivr.net/fontsource/fonts/<id>@latest/<subset>-<weight>-<style>.woff2`
  (add the `cyrillic` and `cyrillic-ext` subsets for Russian) [47]. `https://api.fontsource.org/v1/fonts/<id>`
  returns the font's licence (for Inter, `"license": "OFL-1.1"`) and its variants [47]. Put the file beside the scenario and load it with
  `@font-face { src: url(./fonts/inter-latin-400-normal.woff2) format("woff2"); }`; keep the OFL
  text beside redistributed font files.

## Checking a licence and writing the credit

1. Read the licence on the file's own page and keep the URL and date [67].
2. Creative Commons terms: **BY** — credit the author as requested, link the licence, note
   changes; the credit may be given "in any reasonable manner based on the medium" [70]. **SA** —
   adaptations stay under the same licence [71]. **ND** — no adaptations. **NC** — no advertising
   or product promotion [52].
3. Write the credit as TASL: Title, Author, Source, Licence, each linked where possible; mark
   changes ("cropped from original") [69].
4. In a film, name the author and title on screen and give the full data in the description [69][80].
5. Keep `assets/CREDITS.md` — file, source URL, author, licence, credit required, changes — and
   build the end card and description from it.

```
Photo: "Night city" — Jane Doe (unsplash.com/photos/abc), Unsplash License
Emoji: Noto Emoji (github.com/googlefonts/noto-emoji), Apache 2.0
Icons: Lucide (ISC), Tabler Icons (MIT)
```

## Sources

1. https://unsplash.com/license
2. https://unsplash.com/documentation
3. https://unsplash.com/plus/license (via search snippets)
4. https://www.pexels.com/license/ (via search snippets; page geo-blocked)
5. https://help.pexels.com/hc/en-us/articles/360042332714-What-are-the-rules-for-using-Pexels-photos-or-videos
6. https://www.pexels.com/api/documentation/
7. https://pixabay.com/service/license-summary/
8. https://pixabay.com/service/terms/
9. https://pixabay.com/api/docs/
10. https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia
11. https://www.mediawiki.org/wiki/API:Imageinfo
12. https://foundation.wikimedia.org/wiki/Policy:User-Agent_policy
13. https://undraw.co/license
14. https://www.openpeeps.com/
15. https://www.humaaans.com/
16. https://haikei.app/ and https://haikei.app/terms
17. https://heropatterns.com/
18. https://www.svgbackgrounds.com/license/ and https://www.svgbackgrounds.com/attribution/ (via search snippets)
19. https://lucide.dev/license
20. https://github.com/tailwindlabs/heroicons
21. https://github.com/tabler/tabler-icons
22. https://github.com/phosphor-icons/core
23. https://github.com/google/material-design-icons
24. https://iconify.design/docs/api/svg.html
25. https://api.iconify.design/collections
26. https://github.com/jdecked/twemoji
27. https://github.com/googlefonts/noto-emoji
28. https://googlefonts.github.io/noto-emoji-files/
29. https://developers.googleblog.com/updates-to-emoji-new-characters-new-animation-new-color-customization-and-more/
30. https://github.com/hfg-gmuend/openmoji
31. https://github.com/microsoft/fluentui-emoji
32. https://github.com/microsoft/fluentui-emoji-animated
33. https://github.com/google/fonts/issues/7011
34. https://developers.giphy.com/docs/api/
35. https://support.giphy.com/hc/en-us/articles/360020027752-GIPHY-User-Terms-of-Service
36. https://developers.google.com/tenor/guides/quickstart
37. https://9to5google.com/2026/06/30/google-tenor-api-gif-updates/
38. https://lottiefiles.com/page/license (via search snippets)
39. https://help.lottiefiles.com/hc/en-us/articles/45243303062681-Commercial-Use-Attribution
40. https://lottiefiles.com/page/terms-and-conditions
41. https://github.com/coolcornucopia/vp9-best-settings-for-converting-gif-animated-drawing-to-video
42. https://www.characteranimationai.com/blog/transparent-video-formats-explained
43. https://developers.google.com/fonts/faq
44. https://openfontlicense.org/
45. https://www.fontshare.com/licenses/itf-ffl (via search snippets)
46. https://www.fontshare.com/faq
47. https://fontsource.org/docs/getting-started/introduction
52. https://freemusicarchive.org/License_Guide
62. https://freesound.org/help/faq/
67. https://sonniss.com/gdc-bundle-license/
69. https://wiki.creativecommons.org/wiki/Recommended_practices_for_attribution
70. https://creativecommons.org/licenses/by/4.0/legalcode.en
71. https://creativecommons.org/licenses/by-sa/4.0/legalcode.en
72. https://www.apache.org/licenses/LICENSE-2.0
80. https://creativecommons.org/faq/
82. https://www.pixsy.com/image-licensing/unsplash-guide
83. https://www.mediawiki.org/wiki/API:Search
84. https://www.mediawiki.org/wiki/Help:CirrusSearch#Filetype

Source numbers identify the references supporting each claim; sound sources are listed in the sound guide.
