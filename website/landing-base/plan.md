# The plan for the landing

This plan answers what the next landing should say and show, what the current one needs until then,
and how the overview film feeds it. The rework itself starts on the owner's signal (see "Waiting
for agentic-report"); nothing here changes `website/landing/`.

## The landing's argument

The current landing sells the tool: "your agent makes the product film". The next one keeps that
promise and adds the second half of the argument, which the landing does not make today: the agent
does not film by taste. It follows a knowledge base — 65 directing rules, each paid for by a failed
film, genre practice with 79 sources, a phone guide with 64 — and a checklist that will not let it
hand over a film with an open box. So the page has two proofs: what comes out (films), and why it
comes out right (knowledge and checks).

## Proposed structure

Every row of `features.md` belongs to one of the thirteen groups; the table says in which section
each group lives. The overview film's chapter that shows the section is named in the last column,
and its cut clip (`clips.md`) is the section's example.

| # | Section | What it proves | Groups of `features.md` | Overview chapter |
|---|---|---|---|---|
| 1 | Hero: one text file becomes the film | the promise in one frame | 1 | Opening |
| 2 | A real product, clicked for real | live capture with a living cursor | 3 | Live product |
| 3 | The camera knows where to look | spotlight, pan, loupe, marks, time inside the shot | 4 | Attention |
| 4 | Slides that never stand still | twenty kinds, kinetic text, live backgrounds | 2 | Slides |
| 5 | Words on screen | subtitles that move off the subject, titles, callouts, stickers | 5 | Text |
| 6 | Cuts, sound and a voice | transitions, ducking, music by parts, SpeechKit, your own voice | 6, 7, 8 | Cuts and sound |
| 7 | A trailer, too | trailer cards, a title card, hard cuts and dips, hits | 2 (card, titlecard), 4 (flash, shake), 6 (cut, dip) | Trailer |
| 8 | A look, not a pile of colours | eleven themes with one accent each, a subtitle face per theme, the visual-design guide, brand theme, a part in another theme, film look | 9 | Look |
| 9 | Made for a phone | vertical in one line, safe zones, legibility checks | 10 | Phone |
| 10 | Checked before you watch | lint, frames, stills, the build report | 11 | Checks |
| 11 | The agent knows the craft | the brief, the skill's path, the knowledge base, the checklist | 13 and `knowledge.md` | The agent's path |
| 12 | Ready to ship | web package, GIF, chapters, subtitles, languages | 12, 1 (translations) | Delivery |
| 13 | Your agent's first film | the request to the agent, a skeleton, a free draft | 13 (skeletons) | Outro |
| 14 | Boundaries | what the tool does not promise, where credentials belong | — | — |

## Card texts

One card per section, English then Russian. They state what the viewer gets, then the fields that
do it, so each claim can be checked against the code by `site:check`.

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

## Until the rework: edits to the current landing

From `audit.md`, the smallest set that keeps the current page honest:

1. Recut every clip from the overview film (`clips.md`); all 16 show the subtitles and fonts of
   before 2026-09-25 21:15, and `live`, `effects` and `reel` show the old cursor, marks and vertical.
2. "Cuts and sound": say that every film with sound is normalised, not only one with music.
3. "Vertical in one line": add the zone, the subtitle position and the phone checks.
4. "Attention on the real UI": add the living cursor and autoZoom by actions.
5. Rewrite the reference frames with `node scripts/landing-fingerprints.mjs --write` after the recut.

## Waiting for agentic-report

The report tool that builds this landing (`agentic-report`) is gaining new landing knowledge and
functions. The rework waits for them, and for the owner's signal. When it starts:

- read the new agentic-report landing guidance first, and record here what it changes in the
  structure above;
- keep the card texts and the chapter map as the content, and take layout, blocks and design from
  agentic-report;
- the Moira workflow section stays out until the workflow is reworked (`IDEAS.md`).
