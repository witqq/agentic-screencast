# Video selection for the bilingual landing

This map names the smallest set of moving examples required by `website/landing/report.md` and its
Russian localization. Each selected slot has one Russian and one English clip. The page currently uses
older files at these paths as **temporary layout fixtures**; none is accepted as current media. The
integration step replaces them with excerpts of `website/overview/story.md` and posters from those exact
excerpts. Delivered page clips have no audio stream. There is no full overview-film or paid-voice
dependency.

| Visible slot and existing fixture | Page section | Authored source scene | Aspect ratio | Distinct proof |
|---|---|---|---|---|
| `showcase.{ru,en}` | First screen | `c00-cold` | 16:9 | The built film opens on a real recorded app. |
| `live.{ru,en}` | A real product | `c03-auto` | 16:9 | Recorded typing, clicks and automatic camera moves. |
| `focus.{ru,en}` | The camera knows where to look | `c04-chain` | 16:9 | A metric, chart peak and task row receive successive attention. |
| `reel.{ru,en}` | Made for a phone | `c11-phone` | 9:16 | A phone-sized take retains its reflowed interface. |

The four source scenes produce **eight short clips in all**, one of each slot per language. Captions
can carry their explanation while the delivered files remain silent. Other landing sections use
source-linked text, a code example, the film checklist or named product checks; they do not request a
video merely because the overview film has a chapter about them. Source scene identity, language,
aspect ratio and the poster belong to each slot's provenance and eventual immutable media manifest.
Independent compact reference frames must come from the selected source scene, so replacing a clip and
recomputing its own hash cannot make a wrong-language or wrong-chapter excerpt pass.

No selected slot contains `c14-landing`, the scene that photographs the landing and would create a
stale-media cycle. Portrait clips also exclude the five unsuitable landscape-page scenes from the
overview brief: `c00-file`, `c01-brief`, `c12-stills`, `c13-credits` and `c14-bookend`. The only selected
portrait scene, `c11-phone`, contains none of them. The remaining authored scenes stay in the overview
source but are not landing-media outputs.
