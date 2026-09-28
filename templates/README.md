# Scenario skeletons by genre

Each file is a buildable scenario for one kind of film, shaped by the
[scenario playbook](../docs/scenario-playbook.md): pitch, product demo, trailer, explainer and
release, plus `reel.md` — a vertical 9:16 short (hook, value, proof, call to action) shaped by the
[vertical video guide](../docs/vertical-video.md). `agentic-screencast new <genre> [--format
vertical|square]` copies a skeleton, its `pages/` and the film's `checklist.md` next to your
material; replace every `<placeholder>`, swap each `page: pages/live-shot.html` scene for a
`video` scene recorded with `agentic-screencast/capture`, and replace `pages/result.svg` with a frame
of the product's real result: every skeleton opens on it and ends over it (film craft 64, 65), and
kickers are written in sentence case.

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
| `pitch` | a chapter per act, "is / could be" contrast, one proving number with its source and date, one clear ask | `slides.hero` over the result, `slides.compare`, `slides.counter` with `note`, `slides.outro` with `cta` over the result |
| `product-demo` | the problem over a real frame, the win first, "so what?" said over the shot, a next step over the result | `slides.hero` with `image`, `win` page with `spotlight`, `captions` in the header, `slides.outro` with `cta` and `image` |
| `trailer` | cold open on the product, cards that slam in between shots, hard cuts toward the climax, a dip before one end title | `cold-open` page, `slides.card` + page pairs with `flash`/`shake`, `transition: cut` and `dip`, a snappy film push-in, `look: trailer`, `slides.titlecard` |
| `explainer` | the question over the result, names first, the misconception refuted, steps, focus that moves with the narration | `slides.hero` with `image`, `slides.chain`, `slides.compare` with `(bad)`, `slides.steps`, `spotlight` with two stops, `captions` |
| `release` | the capability as a promise, what changed, before and after, where to find it | `slides.hero` over the result, `slides.compare` of before and now (not a grid of emoji cards), `before`/`after` pages with `spotlight`, `slides.outro` with `url` over the result |
| `reel` | hook in the first seconds, 9:16 safe zone, captions always on, push-ins on the detail | `slides.hero` of 2.5 s over the result, `format: vertical`, karaoke `captions` with `srt`, `spotlight`, one `transition` kind |

Music is recommended for the trailer and the reel, but the tool ships no audio: add a bed with
`music:` once you have downloaded one through the [sound guide](../docs/sound.md).
