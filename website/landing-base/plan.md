# Content map for the Agentic Screencast landing

This map answers what the English and Russian landing pages say, what evidence each section uses,
and which small silent excerpts of the overview source become moving examples. The pages live in
`website/landing/`; `clips.md` fixes the selected source scenes and current temporary media slots.

## The landing's argument

The first promise is "your agent makes the product film". Four short clips prove distinct visible
outcomes: an opening on a real app, recorded actions, directed attention and a phone-sized take.
The second argument explains how the agent decides what to film and checks the result: 65 directing
rules, genre practice from 79 sources, a phone guide from 64 and a checklist that keeps an
unevidenced step open. Other sections use text tied to the scenario, product commands or those
guides; they do not require more clips.

## Section map

Every row of `features.md` belongs to one of the thirteen groups; the table says in which section
each group lives. The final column distinguishes the four selected video slots from sections whose
proof is text, source or a documented check. A section need not repeat an entire overview chapter.

| # | Section | What it proves | Groups of `features.md` | Landing proof |
|---|---|---|---|---|
| 1 | First screen: one scenario becomes the film | the promise on a real app | 1 | Silent `c00-cold` excerpt, slot `showcase` |
| 2 | A real product, clicked for real | live capture with a living cursor | 3 | Silent `c03-auto` excerpt, slot `live` |
| 3 | The camera knows where to look | spotlight, pan, loupe, marks, time inside the shot | 4 | Silent `c04-chain` excerpt, slot `focus` |
| 4 | Slides that never stand still | twenty kinds, kinetic text, live backgrounds | 2 | Four distinct feature examples in text |
| 5 | Words stay readable | subtitles that move off the subject, titles, callouts, stickers | 5 | Caption placement contract in text |
| 6 | Cuts, sound and a voice | transitions, ducking, music by parts and chosen voices | 6, 7, 8 | Three-step account of the sound path |
| 7 | A trailer, too | trailer cards, a title card, hard cuts and dips, hits | 2 (card, titlecard), 4 (flash, shake), 6 (cut, dip) | Link to the overview scenario |
| 8 | A look that belongs to the film | themes, type, brand colours and the visual-design guide | 9 | Named themes and source guide |
| 9 | Made for a phone | vertical reflow, safe zones, legibility checks | 10 | Silent `c11-phone` excerpt, slot `reel` |
| 10 | Checked before you watch | lint, frames, stills, the build report | 11 | Three concrete checks in text |
| 11 | The agent knows the craft | the brief, the skill's path, the knowledge base, the checklist | 13 and `knowledge.md` | Links to the four primary guides/checklist |
| 12 | Ready to ship | web package, GIF, chapters, subtitles, languages | 12, 1 (translations) | Output contract in text |
| 13 | Your agent's first film | the request, a skeleton, a free draft | 13 (skeletons) | Install and first-draft commands |
| 14 | Boundaries | what the tool does not promise, where credentials belong | — | Two disclosures |

## Copy source for the sections

The paired English and Russian copy below is the content source for the corresponding sections.
The page may express it as prose, steps or one focused card group according to the evidence; it
need not turn every topic into the same card. Product claims stay checkable against the CLI.

**1. One text file becomes the film.**
en: Give your agent the product and the point. It writes one scenario — scenes, fields and the
narration as prose — and one command renders, voices and assembles the MP4. Change a sentence and
only that beat is rebuilt.
ru: Дайте агенту продукт и мысль. Он пишет один сценарий — сцены, поля и речь прозой, — и одна
команда рисует, озвучивает и собирает MP4. Поменяли фразу — пересобирается только её такт.

**2. A real product, clicked for real.**
en: The agent drives your running app through Playwright while it records. The cursor travels on a
curve and takes the shape of what is under it, a click lands on the real press, and the camera
follows the actions — a field and the typing in it become one smooth push-in.
ru: Агент ведёт работающее приложение через Playwright и записывает. Курсор едет по дуге и
принимает форму того, что под ним, клик рисуется по настоящему нажатию, а камера идёт за действиями
— поле и набор в нём становятся одним плавным наездом.

**3. The camera knows where to look.**
en: One line — `spotlight: #total @ b2` — pushes in when the narration names the subject, dims the
rest and travels to the next one. A wide row is read along its length on a phone, a loupe holds a
detail, marks draw themselves by hand, and time can stop inside the shot.
ru: Одна строка — `spotlight: #total @ b2` — наезжает, когда речь называет предмет, гасит остальное
и едет к следующему. Широкую строку камера прочитает вдоль на телефоне, лупа удержит деталь, метки
нарисуются от руки, а время может остановиться внутри кадра.

**4. Slides that never stand still.**
en: Twenty kinds — steps, timeline, chart from a CSV, code that types itself, before and after, a
screen in perspective — on live backgrounds, with fourteen ways to assemble a phrase. Every frame
is a function of time, so a rebuilt frame is the same frame.
ru: Двадцать видов — шаги, линия времени, график из CSV, набираемый код, до и после, экран в
перспективе — на живых фонах, с четырнадцатью способами собрать фразу. Каждый кадр — функция
времени, поэтому пересобранный кадр совпадает с прежним.

**5. Words on screen.**
en: Karaoke subtitles read on any footage and step out of the way — to the top, the middle, or the
emptiest band the build finds by itself. Titles, name plates, callouts and stickers arrive with the
words they belong to.
ru: Караоке-субтитры читаются на любом кадре и уступают место — наверх, в середину или в самую
пустую полосу, которую сборка находит сама. Титры, плашки, выноски и стикеры приходят вместе со
своими словами.

**6. Cuts, sound and a voice.**
en: Twelve WebGL transitions and a morph that carries one element into the next scene. Music ducks
under every beat of speech, changes by part and stops before a punchline; the film comes out at
−14 LUFS. Narration by SpeechKit, your own recorded voice, or a free silent draft.
ru: Двенадцать переходов WebGL и морф, переносящий элемент в следующую сцену. Музыка приседает под
каждым тактом речи, меняется по частям и обрывается перед панчлайном; ролик выходит на −14 LUFS.
Голос — SpeechKit, ваша собственная запись или бесплатный немой черновик.

**7. A trailer, too.**
en: Words that slam in with a flash and a shake, hard cuts, a dip to black before the title, a
title card revealed from a blur. The same file, another genre.
ru: Слова врезаются со вспышкой и тряской, жёсткие склейки, затемнение перед названием, титр,
проступающий из размытия. Тот же файл — другой жанр.

**8. A look, not a pile of colours.**
en: Eleven themes style slides and the overlay together, each with one accent, its own fonts in Latin
and Cyrillic and its own subtitle face; the default is a quiet `neutral`, not a fashion. A theme from
your logo, a chapter in another theme, a graded film look — and `lint` counts the signs of a
template film before you build.
ru: Одиннадцать тем оформляют слайды и слой вместе, у каждой один акцент, свои шрифты на латинице и
кириллице и свой шрифт субтитров; по умолчанию — тихая `neutral`, а не мода. Тема по вашему
логотипу, глава в другой теме, цветокоррекция всего ролика — и `lint` до сборки считает признаки
шаблонного ролика.

**9. Made for a phone.**
en: `format: vertical` makes a 1080×1920, 30 fps film that fits Reels, Shorts, TikTok and VK Clips,
with text kept out of the feed's buttons — or even margins when it is watched in a messenger. A
landscape film becomes vertical without a rewrite, and the build names any text a phone cannot
read.
ru: `format: vertical` делает ролик 1080×1920 в 30 кадров под Reels, Shorts, TikTok и VK Клипы, и
текст не попадает под кнопки ленты — или ровные поля, если ролик смотрят в мессенджере.
Горизонтальный ролик становится вертикальным без переписывания, а сборка называет текст, который на
телефоне не прочесть.

**10. Checked before you watch.**
en: Twenty director rules catch two texts at once, a still page or a clip enlarged past sharpness
before the build. A sheet shows every scene without a build, control frames land beside the film,
and the build report names a cut line, an overflowing slide or small text.
ru: Двадцать режиссёрских правил до сборки ловят два текста сразу, стоящую страницу или клип,
увеличенный дальше резкости. Лист показывает каждую сцену без сборки, контрольные кадры ложатся
рядом с роликом, а отчёт сборки называет обрезанную строку, переполненный слайд или мелкий текст.

**11. The agent knows the craft.**
en: Before the first take the agent asks what you cannot infer. It then agrees the content with
you before any take, and follows a path of eight steps, 65 directing rules each paid for by a failed film, genre practice with its sources and a
guide for phones — and a checklist that will not let it hand over a film with an open box.
ru: До первого дубля агент спрашивает то, чего не может вывести сам. Дальше согласует с вами
содержание до первого дубля и идёт по пути из восьми шагов, по 65 правилам режиссуры, каждое из которых оплачено неудачным роликом, по практике
жанров с источниками и по руководству для телефона — и по чеклисту, который не даст отдать ролик с
незакрытым пунктом.

**12. Ready to ship.**
en: AV1, VP9 and H.264 with a poster, chapters and seek thumbnails, a checked `<video>` tag, a GIF
for a README, subtitles and chapters beside the film — and the same film in another language from
the same file.
ru: AV1, VP9 и H.264 с постером, главами и миниатюрами перемотки, проверенный тег `<video>`, GIF для
README, субтитры и главы рядом с роликом — и тот же ролик на другом языке из того же файла.

**13. Your agent's first film.**
en: Ask your agent to install the skill from `skills/agentic-screencast` and make a film about your
product. It starts from a genre skeleton and a free silent draft.
ru: Попросите агента поставить скилл из `skills/agentic-screencast` и снять ролик о вашем продукте.
Он начнёт с жанровой заготовки и бесплатного немого черновика.

## Media and page design boundary

`clips.md` selects exactly four source scenes in each language. The current `showcase`, `live`,
`focus` and `reel` MP4/JPG pairs remain layout fixtures until the next integration unit replaces
them with silent, source-matched excerpts and posters. No selected excerpt includes the scene that
photographs the landing itself; the portrait selection also avoids all five wide-page scenes listed
in the overview brief. The page's written claims about voice and music describe what the product
can do, while the landing examples themselves play without sound.

The page uses the existing agentic-report Markdown vocabulary: a real example immediately after
the promise, sections in the order of the argument, one four-card comparison of slide roles,
steps for sound and checks, source links for the knowledge base and one first-film action. The
public Moira workflow remains outside the page while that workflow is deferred.
