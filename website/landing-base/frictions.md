# Frictions of the overview film and what was done about them

This list answers where the skill, the help or the tool failed while the overview film
(`website/overview/`) was made on 2026-09-27, and what became of each case: fixed in a commit with a
test, a proposal for later work, or not a bug with the reason. The scenario writer's own notes, with
more detail on each case, are in `website/overview/frictions.md` (numbers 1–29 below match them).

## Fixed, with a test

| # | Friction | Fix |
|---|---|---|
| A | A blurred push-in over a clip with a card was written at six times the film's frame rate, and the concat stretched those scenes; in the landscape films the picture fell behind the voice by up to four minutes. | `0b6afc6`: the segment is encoded at the film's rate; `video-motion-blur.test` counts the frames. |
| B | Two builds sharing one cache (two languages or two formats at once) wrote each other's segment list and working files: one film came out cut to the other's length, the other failed on a half-written video. | `0b6afc6` (segments land by rename) and `a3f947e` (working files named by the process, removed on exit); `parallel-builds.test`. |
| C | Chapter slides, hero and title cards opened parts of their own even in a film that names its parts with `part:`: the chapters and the progress bar listed the trailer title and ten "Тема" entries. | `0b6afc6`: explicit `part:` fields are the only parts; `parts.test`. |
| 1 | `pronounce: rules.json` without quotes crashed `lint` with a Node stack. | This commit: a bare path is read as a string; `pronounce-path.test`. |
| 10 | SpeechKit's English voice needs `"lang":"en-US"` and nothing said so. | This commit: `help voice` says it. |
| 16 | The capture `mark` is async but the help's example called it without `await`. | This commit: the example awaits it. |
| 23–25 | Numbered feature cards, two-colour brand themes, pages not told about theme tokens. | `4d01d1b`, `4b925dc`, `2ec7bb5`, `82e4b15` (the look rework). |
| 17 | A chapter slide's body lay under the subtitles in a vertical cut with the default zone. | Not a tool change: the brief sets `zone: plain` for a film watched outside a feed, as the skill's brief table says. |
| 18, 27 | A landscape page remained under the 48 px phone reading floor when cropped and panned. | `pageVertical` selects a native portrait HTML page for a vertical build. The overview's terminal, checklist and timing diagram use it in both languages; focused builds report text at or above 48 px, and the final stills show the content clear of subtitles. |
| 20, 21 | Eight steps pushed the heading out; a four-node chain wrapped. | Dense steps use two landscape columns and a portrait sequence; four short chain nodes share one landscape row. The rendered-layout test and opened frames cover both formats. |
| 29 | `beforeafter` and `parallax` reported overflow from an entering image that fitted after settling. | Layout fit measures settled geometry. A rendered test accepts the contained stage and still reports a deliberately oversized one. |

## Proposals

| # | Friction | Proposal |
|---|---|---|
| 2 | `record` refuses to open while a scene needs the very take being recorded. | Let `record` skip scenes whose material is missing, naming them. |
| 3 | `frames` reuses a slide generated with an image replaced in the same run. | Key generated slides by the content of their images. |
| 4 | `lint`'s `still-scene` reads only the page file, not scripts it links. | Follow local `<script src>` of the page. |
| 5 | `overloaded-line` ignores `--format vertical`. | Use the vertical subtitle width (about 2 × 32 characters) in a vertical lint. |
| 6 | Russian and English mixed in one run's output. | Route every message through the message table. |
| 7 | The build report loses a still's mark name. | Keep `@mark` in the report's `stills[].moment`. |
| 8 | `help web` says VP9 sits between AV1 and H.264; on this film it was the largest. | Say it depends on the material, or measure and name the smallest. |
| 11 | Measuring the final voice's pace costs money. | Ship a table of measured paces for the built-in voices (filipp 12, john 16 characters a second, measured here). |
| 12, 14 | `help text` names the callout's subject loosely; `piece-crosses-mark` is satisfied by any mention of the mark. | Name the fields exactly; match the mark only in `to` / `stills`. |
| 13 | Forbidden combinations (`autoZoom` or `slow` with `speed`) are found one error at a time. | One lint rule listing every forbidden pair. |
| 19 | `frames` shows no subtitles over video scenes. | Draw the subtitle layer over video frames too. |
| 26 | A live camera move and a scrim count as a navigation for `scene-jump`. | Ignore jumps inside the take's recorded camera moves. |
| 28 | `frames` names a trailer card's own layout as an empty band. | Skip `trailer` kinds in the `empty` check. |
| D | The skill led a film into capture before its content was agreed, and its checks were heavy. | Done in `0b6afc6`: the content is agreed before any take, one light check per step, a nine-box checklist, a reviewer only on request. |
| E | Telegram's Bot API does not take a twenty-minute film in one message. | Send long films in parts by chapter (done here). |
| F | The final's true peak is −0.7 dBFS after AAC, above the −1 dBTP target. | Normalise to −1.5 dBTP before the AAC encode. |

## Not a bug

| # | Case | Why |
|---|---|---|
| 9, 15 | The tool and the knowledge changed while the film was being made. | The owner asked for the look rework before the film; the takes were shot again after it. |
| 22 | The report page fills the frame to its bottom, so subtitles cover it. | Film craft 53: the scenario moves the subtitles (`captions: top` / `auto`). |
