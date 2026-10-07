# Sound: music, accents and narration together

Agentic Screencast ships no music and no sound effects. A film names the files it wants; the tool
only mixes them with the narration — it ducks the music under every beat of speech, keeps accents
from covering words, and normalises the result. This guide says where to find free music and
sounds, how to choose them for a genre and a pace, how to check the licence, and how to wire them
into a scenario. Bracketed numbers point to the sources at the end. This
is not legal advice: for a commercial release, show the owner the credits file.

## How the tool mixes

The fields — `music` in the header and on a scene, `sfx`, `transition.sound` and `snap`,
`speechAt`, `loudness` — and what the build does with them are described once, in
`agentic-screencast help sound` and `help transitions`. Two numbers there come from broadcast
practice: music sits 18–25 dB under the voice and louder in the pauses, and a film for the web is
normalised to −14 LUFS with a −1 dBTP ceiling [77] — the build does it for every film with sound,
narration alone included. Check the result by listening, and by
`audio.music`, `audio.sfx[].underSpeech` and `audio.loudness` in the build report.
The build measures the finished AAC after encoding; `audio.encoded.truePeak` is
its decoded peak in dBTP and `audio.encoded.corrected` says whether an audio-only
correction was needed. A peak that remains above −1 dBTP fails the build.
`audio.loudness.measured` is the achieved final AAC level, which can fall below
the target when peak correction takes priority; silence or audio too short for
an integrated reading gives `null`. With `audio: false`, the MP4 has no audio
stream or encoded sound measurement. The sections
below cover what the help does not: where the files come from, how to choose them and how to
credit them.

## Where to find music

| Source | Licence | Credit | Commercial | Notes |
|---|---|---|---|---|
| Incompetech (Kevin MacLeod) | CC BY 4.0 [54] | **required**, exact template [53] | yes | direct MP3 download |
| Pixabay Music | Pixabay Content License [8] | no | yes | not in the API [9]; keep the track page URL in case of a Content ID claim |
| Free Music Archive | CC per track [52] | per track | per track | ND and NC tracks cannot go into a product film |
| ccMixter | CC per track [55] | yes | per track | search at https://dig.ccmixter.org by style, BPM and instrument |
| Mixkit | Mixkit Free License [60] | no | yes, with limits [61] | the Restricted License is personal non-commercial only [60]; no registration of tracks in Content ID |
| YouTube Audio Library | own or CC BY [48] | per track | **only safe on YouTube** | off-YouTube use is unstated [48]; use CC BY tracks elsewhere |
| Uppbeat free plan | own [56] | a code per video | **no brand or advertising use** [57][58] | not for company product films |

Some rows need more than a table cell:

- **YouTube Audio Library.** A CC track must be credited in the video description; a track under
  the standard Audio Library licence needs no credit. Tracks are downloaded only through YouTube
  Studio, with no programmatic access, and Creator Music licences explicitly do not carry over to
  other platforms [48][49].
- **Mixkit.** The Free License covers commercial YouTube, social and online-advertising use
  without credit [60]. Reviews add that its music may not go on CD or DVD, into video games or TV
  and radio broadcasts, and may not be registered in Content ID or passed off as your own [61].
- **Uppbeat free plan.** About three downloads a month; each gives a one-time credit code for the
  description of one specific video, and without it claims may follow. It covers personal channels,
  one per platform (YouTube, TikTok, Instagram) [56][57].

Credit template for Incompetech, verbatim [53]:

```
"Title" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/
```

Replace Title with the real track name, and put the credit where an interested viewer can find it
without effort [53].

## Where to find sound effects

| Source | Licence | Credit | Notes |
|---|---|---|---|
| Kenney.nl sound packs (Interface Sounds, Impact Sounds) | CC0 [83] | no | a zip of OGG files — clicks, switches, whooshy maximise/minimise, confirmations |
| Freesound | CC0, CC BY or CC BY-NC per sound [62] | CC BY needs it | filter `license:"Creative Commons 0"`; API needs a token [63] |
| Pixabay Sound Effects | Pixabay Content License [8] | no | UI and transition categories |
| Mixkit SFX | Mixkit Free License [59][60] | no | |
| Zapsplat free | Standard License [65] | **required** ("ZapSplat") | MP3 only and a download limit on the free plan; no redistribution or new sound libraries; premium drops the credit [65][66] |
| Sonniss GDC Game Audio Bundle | royalty-free, no credit [67] | no | 7+ GB of WAV; unlimited projects; no redistribution, no selling the sounds as they come, no AI training; keep a copy of the licence of the day [67] |

Freesound needs more than a table cell:

- **Credit.** The Freesound template is: "This video uses these sounds from freesound: "sound1" by
  user1 ( http://freesound.org/s/soundID/ ) licensed under CC BY 4.0". For a long list, link a
  separate credits page [62].
- **Content ID.** If YouTube Content ID wrongly claims a CC sound, dispute the claim with the
  sound's page URL and its upload date [62].
- **API.** A token is enough for the `previews` field (MP3 and OGG); `preview-hq-mp3` usually
  suffices for a film. Downloading the original file needs OAuth2 [63][64].

Search words: `whoosh`, `swoosh`, `swish` (a card flying in), `click`, `mouse click`,
`keyboard typing`, `ui tap`, `ui notification`, `pop`, `bubble pop` (an element appearing),
`riser`, `uplifter` (building to a reveal), `impact`, `hit`, `boom` (a title landing), `glitch`,
`transition`. On Freesound add the CC0 filter; on Pixabay and Mixkit browse the UI and Transition
categories.

### A trailer's sound vocabulary

An action trailer and its parody are cut to a small set of sounds. What each does, and the words
that find it in the sources above; where to put each in the film is in the trailer section of
[the scenario playbook](scenario-playbook.md).

| Sound | What it does | Search words |
|---|---|---|
| hit, impact | the payoff that lands a cut, a card or a title; its tail matters more than its attack [84] | `cinematic hit`, `trailer impact`, `boom`, `sub drop`, `metal hit` |
| braaam | a huge low brass blast; spend it once, on the title or the turn [85][86] | `braam`, `braaam`, `horn blast`, `cinematic brass` — or pitch an animal roar down for a parody |
| riser | builds height, loudness or density; must resolve into a hit or into silence [84] | `riser`, `uplifter`, `tension riser`, `swell` |
| whoosh | moves the eye from shot to shot; with a hit it is the run-up [84] | `whoosh`, `swoosh`, `swish`, `whip` |
| downer | the reverse of a riser: drops the energy [84] | `downer`, `power down`, `drop` |
| reverse | sounds before the thing it announces [84] | `reverse`, `reverse cymbal`, `reverse hit` |
| stinger | a short musical punctuation [84] | `stinger`, `sting` |
| ticking | a clock driving act two in even eighths or quarters [87] | `clock ticking`, `ticking tension` |
| record scratch | the comic stop: a scratch, a freeze frame, "yep, that's me" | `record scratch`, `vinyl scratch` |
| stutter, tape stop | a sound chopped in sixteenths; a tape slowing to a halt [88] | `stutter`, `glitch stutter`, `tape stop` |

Where they are: Mixkit's free sound effects list them by category — `cinematic`, `transition`,
`impact`, `whoosh` — under the Mixkit Free License, with no credit [59][60]; Pixabay Sound Effects
under the Pixabay Content License [8]; Freesound per sound, with the CC0 filter [62]; Sonniss GDC
bundles carry large cinematic and impact libraries under a royalty-free licence [67]. A trailer
bed with a build and a final hit can come from Incompetech, CC BY 4.0 with the credit template
above [53][54]. The tool ships none of these files: the film downloads its own and
credits them in `assets/CREDITS.md`. A downloaded effect with a slow start or a long tail is cut in
the scenario with `from`, `length` and `fadeOut` on the `sfx` entry, and `music: stop` on a scene
stops the bed at the hit.

## Choosing music for a genre and a pace

- There is no universal tempo. Corporate, SaaS and educational explainers sit best at 85–115 BPM;
  60–85 BPM gives the viewer time to think (finance, medicine, complex B2B); 115–140 BPM suits an
  energetic announcement [73]. Stock libraries label Slow 60–90, Medium 90–110, Upbeat 110–140 and
  Fast 140–160 BPM [79]. On TikTok tracks above 120 BPM tend to lift view-through rate
  (see [the vertical-video guide](vertical-video.md)).
- **Under a voice, only instrumental music**: lyrics compete with the narration [73].
- A trailer follows the music's arc — setting, build, peak [34 in the scenario playbook]; trailer
  composers keep to 4/4 or 12/8 [78].
- **Cutting to the beat.** Seconds per beat = 60 / BPM; at 120 BPM a beat is 0.5 s and a 4/4 bar
  2 s [74]. Frames per beat = FPS × 60 / BPM: at 30 fps and 120 BPM a beat is 15 frames and a 4/4
  bar 60 frames [74][75]. When the number is fractional (128 BPM at 24 fps gives 11.25), count
  each beat's position from the start of the track and round it [75]. A loop of 16 beats lasts
  60 / BPM × 16 seconds [76]. Calm rhythm: a cut per bar; tension: a cut per beat [74]. Compute each beat from the
  start of the track rather than adding a rounded step, or the cuts drift [75]; beware of
  half-time and double-time feel (70 BPM can feel like 140) [74]. In this tool `snap: "music"` and
  `m`-anchors do the arithmetic, and the build detects the tempo itself (`help sound`, "Tempo").
- Because a scene's length follows its speech, pick a track with even energy for a narrated film
  and align only the opening and the end; save beat-cut editing for silent trailers [cf. 75].

## Licence and credit, every time

The steps — the licence on the file's own page, BY/SA/ND/NC, the TASL credit, `assets/CREDITS.md` —
are the same for every file and live in [the visual-assets guide](visual-assets.md), "Checking a
licence and writing the credit". One point is specific to music: music synchronised to picture is
always an adaptation, so a CC BY-SA track makes the whole film CC BY-SA, and an ND track cannot be
put in a video at all [52][71].

## Download and connect: a worked example

```bash
mkdir -p audio
curl -L -o audio/impact-moderato.mp3 \
  "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Impact%20Moderato.mp3"
curl -L -o audio/kenney-interface-sounds.zip \
  "https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip"
unzip -o audio/kenney-interface-sounds.zip -d audio/kenney
```

```markdown
# Sound example
voice: {"engine":"stub","name":"silent","cps":15}
music: {"file":"audio/impact-moderato.mp3","fadeOut":2,"bpm":100}

## open · slides.chapter
title: Music under words
body: The bed drops under every beat and returns in the pauses.

The music dips while this sentence is spoken.

## next · slides.chapter
title: An accent on the cut
body: A whoosh leads into the next scene.
transition: {"kind":"whip","duration":0.6,"sound":"audio/kenney/Audio/maximize_006.ogg"}

The transition carries a short accent.
```

Credits for this example: "Impact Moderato" Kevin MacLeod (incompetech.com), CC BY 4.0; Interface
Sounds by Kenney (kenney.nl), CC0. The Kenney download link
contains a version stamp and may change — open the pack page [83] if it fails.

## Sources

8. Pixabay — Terms of Service / Content License. https://pixabay.com/service/terms/
9. Pixabay — API Documentation. https://pixabay.com/api/docs/
34. Rareform Audio — Trailer Music Structure. https://www.rareformaudio.com/blog/how-production-music-reveals-trailer-structure
48. YouTube Help — Use music and sound effects from the Audio Library. https://support.google.com/youtube/answer/3376882?hl=en
49. YouTube Help — Understand Creator Music usage details. https://support.google.com/youtube/answer/11611019?hl=en
52. Free Music Archive — License Guide. https://freemusicarchive.org/License_Guide
53. incompetech — Music FAQ. https://incompetech.com/music/royalty-free/faq.html
54. incompetech — Licenses. https://incompetech.com/music/royalty-free/licenses/
55. ccMixter. https://ccmixter.org/
56. Uppbeat — User Agreement. https://uppbeat.io/user-agreement
57. Uppbeat — How Uppbeat's music licenses work. https://uppbeat.io/blog/royalty-free-and-copyright-free-music/uppbeats-music-licenses
58. Uppbeat — Pricing. https://uppbeat.io/pricing
59. Mixkit — License. https://mixkit.co/license/
60. Mixkit — Official Information About Mixkit. https://mixkit.co/llm-info/
61. MixKit Review (2026). https://kripeshadwani.com/mixkit-review/
62. Freesound — Help / FAQ. https://freesound.org/help/faq/
63. Freesound API v2 — Resources. https://freesound.org/docs/api/resources_apiv2.html
64. Freesound API — Authentication. https://freesound.org/docs/api/authentication.html
65. ZapSplat — Standard License (via search snippets). https://www.zapsplat.com/license-type/standard-license/
66. ZapSplat — How to credit us. https://www.zapsplat.com/how-to-credit-us/
67. Sonniss — GDC Bundle License. https://sonniss.com/gdc-bundle-license/
69. Creative Commons — Recommended practices for attribution. https://wiki.creativecommons.org/wiki/Recommended_practices_for_attribution
71. Creative Commons — CC BY-SA 4.0 Legal Code. https://creativecommons.org/licenses/by-sa/4.0/legalcode.en
73. Bensound — Music for explainer videos. https://blog.bensound.com/creation-editing/music-for-explainer-videos/
74. ClipMusic — BPM for Video Editors. https://clipmusic.ai/blog/bpm-video-editing-guide
75. Tools for Film — BPM and Picture. https://www.toolsforfilm.com/blog/bpm-and-picture-editors-guide
76. Jan Baumann — How to use the BPM tempo to loop and extend music for videos. https://www.baumannmusic.com/2019/how-to-use-the-bpm-tempo-to-loop-and-extend-music-for-videos/
77. Pure Audio Insight — How Loud Should Background Music Be? https://pureaudioinsight.com/blogs/content-production/background-music-volume-how-loud-should-it-be
78. VI-CONTROL — Trailer Music time signatures? https://vi-control.net/community/threads/trailer-music-time-signatures.40508/
79. Envato Elements — Explainer video background music. https://elements.envato.com/audio/explainer+video+background+music
83. Kenney — Interface Sounds (CC0). https://kenney.nl/assets/interface-sounds
84. Duende Sounds — Trailer Sound Design Elements Explained. https://duendesounds.com/trailer-sound-design-elements/
85. Wikipedia — BRAAAM. https://en.wikipedia.org/wiki/BRAAAM
86. Richard Pryn — BRAAAMS: how to use the sound that everyone knows. https://richardpryn.com/braaams/
87. Richard Pryn — How to structure your trailer music. https://richardpryn.com/how-to-structure-trailer-music/
88. Wikipedia — Stutter edit. https://en.wikipedia.org/wiki/Stutter_edit

Source numbers share the reference index with the [visual-assets guide](visual-assets.md).
