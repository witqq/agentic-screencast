# Scenario skeletons by genre

Each file is a buildable scenario for one kind of film, shaped by the
[scenario playbook](../docs/scenario-playbook.md): pitch, product demo, trailer, explainer and
release, plus `reel.md` — a vertical 9:16 short (hook, value, proof, call to action) shaped by the
[vertical video guide](../docs/vertical-video.md). `agentic-screencast new <genre> [--format
vertical|square]` copies a skeleton, its `pages/` and the film's `checklist.md` next to your
material; replace every `<placeholder>`, swap each `page: pages/live-shot.html` scene for a
`video` scene recorded with `agentic-screencast/capture`, and replace `pages/result.svg` with a frame
of the product's real result: every skeleton opens on it and ends over it (film craft 64, 65), and
kickers are written in sentence case. Every skeleton already moves — a camera move on its slides, a
connected flow between scenes, a pointer or a mark on its pages — and passes `lint`; which recipe
of [the motion-design guide](../docs/motion-design.md) each genre follows is in the playbook's
**Motion** paragraph for it.

```bash
agentic-screencast build --source product-demo.md --out draft.mp4 \
  --voice-json '{"engine":"stub","name":"silent","cps":15}'
```

The skeletons use the free `stub` voice, so a draft costs nothing.

## Which skeleton for which film

The table says where each skeleton's shape comes from; the reasons are in the guide's section for
the genre.

| Skeleton | Recommendation in the guide | Where it is in the skeleton |
|---|---|---|
| `pitch` | a chapter per act, "is / could be" contrast, one proving number with its source and date, one clear ask; confident, calm motion | `flow: auto`; `slides.hero` over the result with `move: dolly` and `text: blur` (remove the phrase style to show the title's marked word instead); `slides.compare` with the old way struck out; a pointer that presses a control on the `solution` page; `slides.counter` with `spark:`, `pace: calm` and `note`; `slides.outro` with `cta` over the result |
| `product-demo` | the problem over a real frame, the win first, "so what?" said over the shot, a next step over the result; the product's action carries the motion | `flow: auto`; `slides.hero` with `image` and `move: dolly`; `win` page with `spotlight` and a glint; `how` page with a pointer that presses (`magnet`, `click`) and a toast of what the press did; `captions`; `slides.outro` with `cta` and `image` |
| `trailer` | cold open on the product, cards that slam in between shots, hard cuts toward the climax, a dip before one end title | `cold-open` page with a slow film push-in, `slides.card` + page pairs, a card with the product in its letters (`fill`), `transition: cut` and `dip`, a snappy film push-in, `look: trailer`, `slides.titlecard`; add authored `flash`, `shake` or `rgb` only with a sound accent |
| `explainer` | the question over the result, names first, the misconception refuted, steps, focus that moves with the narration | `flow: auto`; `slides.hero` with `image` and `move: dolly`; `slides.chain` (a pulse runs along it); `slides.compare` with `(bad)` and the belief struck out; `slides.steps` with `move: push`; `spotlight` with two stops and a hand-drawn underline; `captions` |
| `release` | the capability as a promise, what changed, before and after, where to find it | `flow: auto`; `slides.hero` over the result with `move: dolly`; `slides.compare` of before and now with the old way struck out and the new one marked (not a grid of emoji cards); `before`/`after` pages, the `after` press answered by a boop and a toast; `slides.outro` with `url` over the result |
| `reel` | hook in the first seconds, 9:16 safe zone, captions always on, push-ins on the detail | `flow: auto` (seams go up, like a feed); `slides.hero` of 2.5 s over the result with `move: push`; `slides.steps` at `pace: brisk`; `format: vertical`, karaoke `captions` with `srt`, `spotlight` |

Music is recommended for the trailer and the reel, but the tool ships no audio: add a bed with
`music:` once you have downloaded one through the [sound guide](../docs/sound.md).
