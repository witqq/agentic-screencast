# Landing clips cut from the overview film

This manifest answers which clip of the overview film (`website/overview/`) illustrates which landing section of
`plan.md` and which feature groups of `features.md`. Each clip is one chapter of the final film, cut at its chapter
boundary from `out/final.<lang>.<format>.chapters.vtt`, re-encoded (H.264, CRF 22) with a poster frame at 1.5 s.
The clips are not in the repository: they live in `agent_temp_files_local/overview-clips/` until the landing rework
embeds them (`<chapter>.<lang>.<format>.mp4` and `.jpg`), and are cut again with `python3 out/landing-clips.py
ru.landscape ru.vertical en.landscape en.vertical` from `website/overview/` after a new final build.

| Clip | Chapter (ru) | Landing section (`plan.md`) | Feature groups | ru 16:9 | en 16:9 | ru 9:16 | en 9:16 |
|---|---|---|---|---|---|---|---|
| `opening` | Начало | 1 Hero | 1 | 58 s | 53 s | 58 s | 53 s |
| `path` | Путь | 11 The agent knows the craft | 13 | 93 s | 84 s | 93 s | 84 s |
| `scenario` | Сценарий | 1 Hero, 12 Ready to ship | 1 | 129 s | 118 s | 129 s | 118 s |
| `live` | Живая съёмка | 2 A real product | 3 | 109 s | 98 s | 110 s | 98 s |
| `attention` | Внимание | 3 The camera knows where to look | 4 | 96 s | 88 s | 96 s | 88 s |
| `slides` | Слайды | 4 Slides that never stand still | 2 | 67 s | 63 s | 67 s | 62 s |
| `text` | Текст | 5 Words on screen | 5 | 62 s | 55 s | 62 s | 54 s |
| `cuts-sound` | Склейки и звук | 6 Cuts, sound and a voice | 6, 7 | 107 s | 96 s | 107 s | 96 s |
| `voice` | Голос | 6 Cuts, sound and a voice | 8 | 88 s | 78 s | 88 s | 78 s |
| `trailer` | Трейлер | 7 A trailer, too | 2, 4, 6 | 37 s | 33 s | 36 s | 34 s |
| `look` | Облик | 8 A look, not a pile of colours | 9 | 100 s | 90 s | 100 s | 91 s |
| `phone` | Телефон | 9 Made for a phone | 10 | 63 s | 54 s | 62 s | 54 s |
| `checks` | Проверки | 10 Checked before you watch | 11 | 80 s | 72 s | 80 s | 72 s |
| `knowledge` | Знания | 11 The agent knows the craft | 13, knowledge.md | 89 s | 73 s | 89 s | 74 s |
| `delivery` | Выпуск | 12 Ready to ship, 13 Your agent's first film | 12, 13 | 86 s | 76 s | 86 s | 76 s |

Scenes not suited for the vertical clips (landscape pages cut at the sides) are listed in `website/overview/brief.md`,
section "The vertical cut"; prefer the landscape clip for those sections.
