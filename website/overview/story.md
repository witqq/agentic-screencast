# Agentic Screencast — обзор
title.en: Agentic Screencast — an overview
lang: ru
voice: {"engine":"stub","name":"silent","cps":12}
voice.en: {"engine":"stub","name":"silent","cps":16}
pronounce: "pronounce.ru.json"
pronounce.en: "pronounce.en.json"
theme: neutral
captions: {"style":"karaoke","everywhere":true,"srt":true}
progress: {"position":"bottom","parts":true}
music: {"file":"audio/film-bed.mp3","level":-24,"fadeIn":1,"fadeOut":3}
motionBlur: true
zone: plain

## c00-cold · video
part: Начало
part.en: Opening
file: captures/board.ru.webm
file.en: captures/board.webm
from: @start
to: @keys
stills: 25% :: живой наезд на поле, клавиша Enter видна | @added :: новая задача появилась в «К работе» | @done :: карточка «Настоящий клик» рядом с кнопкой, не поверх неё | @typed :: задача набрана | @zoomout :: живой наезд возвращается к общему плану

Этот ролик снял агент. Курсор, клик, наезд на поле и карточка рядом с кнопкой — настоящая запись работающего приложения, а не монтаж.

А собрал его инструмент Agentic Screencast по одному текстовому файлу.

[en]
An agent made this film. The cursor, the click, the push-in on the field and the card beside the button are a real recording of a running app, not an edit.

The Agentic Screencast tool built it from one text file.

## c00-file · page
page: pages/split.ru.html
page.en: pages/split.html
focus: #code @ b1 | #frame @ b2
stills: b1+1 :: строки сценария читаются, кадр справа целиком | b2+1 :: кадр справа в фокусе

Слева — та самая сцена из этого файла: вид, дубль, куски по отметкам и речь обычными абзацами.

Справа — кадр, который из неё получился. Монтажной ленты нет: правите текст — меняется фильм.

[en]
On the left is that very scene of this file: its kind, the take, the pieces cut at marks and the narration as plain paragraphs.

On the right is the frame it produced. There is no editing timeline: change the text and the film changes.

## c00-promise · slides.hero
kicker: Agentic Screencast
kicker.en: Agentic Screencast
title: Ваш агент снимает ролик о продукте
title.en: Your agent films your product
body: Изучает продукт, пишет сценарий, собирает MP4 и проверяет его по кадрам.
body.en: It studies the product, writes a scenario, builds the MP4 and checks it frame by frame.
text: rise
stills: b1.end :: заголовок и текст целиком, субтитр не наезжает на текст

Агент изучает продукт, пишет сценарий, собирает MP4 и проверяет его по кадрам, прежде чем отдать вам.

[en]
The agent studies the product, writes a scenario, builds the MP4 and checks it frame by frame before handing it to you.

## c00-map · slides.features
kicker: Что дальше
kicker.en: What follows
title: Всё, что умеет инструмент, и всё, что знает агент
title.en: Everything the tool does, everything the agent knows
items: Живой продукт :: настоящие клики | Камера :: знает, куда смотреть | Звук и голос :: музыка уступает словам | Телефон :: вертикаль одной строкой | Проверки :: до и после сборки | Знания :: правила режиссуры
items.en: A live product :: real clicks | The camera :: knows where to look | Sound and voice :: music gives way to words | Phones :: vertical in one line | Checks :: before and after the build | Knowledge :: directing rules
stills: b2.end :: все шесть карточек видны и не срезаны

Дальше по главам: живой продукт, камера, слайды, текст, звук, голос, трейлер, облик и телефон.

А потом проверки и знания, на которых агент снимает, и то, как отдать готовый ролик.

[en]
Chapter by chapter: the live product, the camera, slides, text, sound, voice, a trailer, the look and phones.

Then the checks and the knowledge the agent films with, and how to hand the finished film over.

## c01-open · slides.chapter
part: Путь
part.en: The path
kicker: Путь
kicker.en: The path
title: От просьбы до проверенного ролика
title.en: From a request to a checked film
body: Скилл ведёт агента по шагам, и каждый шаг кончается проверкой.
body.en: The skill leads the agent step by step, and every step ends with a check.
transition: {"kind":"push","duration":0.7,"sound":"audio/sfx/whoosh.ogg","snap":"music"}

Всё начинается с просьбы: «Сними ролик о нашем экспорте», и дальше скилл ведёт агента по шагам.

[en]
It starts with a request, "Make a film about our export", and from there the skill leads the agent step by step.

## c01-brief · page
page: pages/brief.ru.html
page.en: pages/brief.html
focus: #call1 @ b1 | #call2 @ b2 | #call3 @ b3
stills: b1+1.5 :: первый заход вопросов в фокусе, рекомендованный вариант первым | b3+1.5 :: третий заход читается

Сначала бриф. Жанр, формат, длину, голос, звук и облик решает владелец.

Агент выводит из просьбы и репозитория всё, что может, а остальное спрашивает — не больше чем в три захода.

Рекомендованный вариант стоит первым, и каждый ответ ложится в brief.md с источником.

[en]
First, the brief. The genre, the frame, the length, the voice, the sound and the look belong to the owner.

The agent infers what the request and the repository answer, and asks the rest in three rounds at most.

The recommended option comes first, and every answer goes into brief.md with its source.

## c01-steps · slides.steps
kicker: Шаги 1–4
kicker.en: Steps 1–4
title: Каждый шаг оставляет файл и проверку
title.en: Every step leaves a file and a check
items: Бриф :: brief.md | Доказательства :: таблица возможностей | История :: сплошной текст речи | Материал :: дубли, страницы и звук
items.en: Brief :: brief.md | Evidence :: the capability table | Story :: one continuous narration | Material :: takes, pages and sound
stills: b1.end :: четыре шага и заголовок видны, субтитр ниже последнего пункта

Всего шагов восемь: бриф, таблица возможностей продукта, история и материал…

[en]
There are eight steps: the brief, the product's capability table, the story and the material…

## c01-steps2 · slides.steps
kicker: Шаги 5–8
kicker.en: Steps 5–8
title: Следующий — только после проверки
title.en: The next one only after the check
items: Сценарий | Черновик | Финал | Передача
items.en: Scenario | Draft | Final | Handoff
stills: b1.end :: четыре шага и заголовок видны, субтитр ниже последнего пункта

…затем сценарий, черновик, финал и передача.

После истории агент показывает вам, что будет в кадре, и снимает только после согласия; каждый шаг кончается одной проверкой.

[en]
…then the scenario, the draft, the final and the handoff.

After the story the agent shows you what will be on screen and films only once you agree; every step ends with one check.

## c01-new · page
spotlight: [{"target":".term pre","at":"b1+0.3","pan":true,"ring":false,"dim":0}]
page: pages/term-new.ru.html
page.en: pages/term-new.html
stills: b1.end :: команда и её вывод целиком

Как только ясен жанр, одна команда кладёт рядом заготовку сценария под этот жанр, её страницы и чеклист.

[en]
As soon as the genre is settled, one command puts a skeleton scenario for that genre next to the brief, with its pages and a checklist.

## c01-checklist · page
spotlight: [{"target":".list","at":"b1+0.3","pan":true,"ring":false,"dim":0},{"target":".list","at":"b2+0.3","pan":true,"ring":false,"dim":0}]
page: pages/checklist.ru.html
page.en: pages/checklist.html
stills: b1+1 :: строки чеклиста читаются | b2.end-0.5 :: пункты закрыты свидетельствами, внизу счётчик открытых пунктов

Чеклист короткий: по пункту на шаг, а под ними — меню приёмов и правила режиссуры для сверки.

Пункт закрывается только свидетельством — файлом, кадром или числом, — и ролик отдаётся, когда открытых пунктов ноль.

[en]
The checklist is short: a box per step, and below them the menu of techniques and the directing rules to consult.

A box closes only with evidence, a file, a frame or a number, and the film is handed over when no box is left open.

## c01-draft · slides.compare
kicker: Черновик и финал
kicker.en: Draft and final
title: Монтаж проверяют бесплатно
title.en: The edit is checked for free
left: Черновик (plain) :: голос stub — тишина нужной длины | без сети и без счёта
left.en: Draft (plain) :: the stub voice, silence of the right length | no network, no bill
right: Финал (good) :: выбранный голос | те же длины сцен
right.en: Final (good) :: the chosen voice | the same scene lengths
stills: b1.end :: обе колонки видны целиком

Все черновики собираются на бесплатном немом голосе: это тишина той длины, какую займёт речь.

Темп заглушки выставлен по замеренному финальному голосу, поэтому монтаж черновика совпадает с финалом.

[en]
Every draft is built on a free silent voice: silence as long as the speech will take.

The stub's pace is set from the measured final voice, so the draft's edit matches the final.

## c02-open · slides.chapter
part: Сценарий
part.en: The scenario
kicker: Сценарий
kicker.en: The scenario
title: Один файл, такты и якоря
title.en: One file, beats and anchors
body: Сценарий — единственный вход. Всё остальное сборка порождает рядом с ним.
body.en: The scenario is the only input. The build generates everything else next to it.
transition: {"kind":"push","duration":0.7,"sound":"audio/sfx/whoosh.ogg","snap":"music"}

Сценарий — единственный вход сборки: слайды и страницы сцен она порождает рядом с ним и перезаписывает при следующем запуске.

[en]
The scenario is the build's only input: it generates the slides and the scene pages next to it and overwrites them on the next run.

## c02-pipeline · slides.chain
kicker: Сборка
kicker.en: The build
title: Четыре звена, одно направление
title.en: Four links, one direction
nodes: Сценарий | Голос | Кадры | MP4 (acc)
nodes.en: Scenario | Voice | Frames | MP4 (acc)
at: b1 b1 b2 b3 b4
stills: b4+0.5 :: все четыре звена и стрелки видны

Всё начинается со сценария.

Каждый абзац речи — отдельный такт: сначала он озвучивается, и его длина задаёт длину сцены.

Потом Chromium рисует каждый кадр на времени сцены.

И ffmpeg склеивает кадры и звук в один MP4.

[en]
Everything starts with the scenario.

Every paragraph of narration is a beat: it is voiced first, and its length sets the scene's length.

Then Chromium draws each frame at the scene's time.

And ffmpeg joins the frames and the sound into one MP4.

## c02-scene · slides.code
kicker: Сцена
kicker.en: A scene
title: Вид, поля и речь абзацами
title.en: A kind, fields and prose
name: story.md
code: |
  ## c03-click · video
  file: captures/board.ru.webm
  from: @added
  to: @done
  stills: @done :: карточка рядом с кнопкой

  Курсор едет по дуге и становится рукой.

  Клик рисуется по настоящему нажатию.
code.en: |
  ## c03-click · video
  file: captures/board.webm
  from: @added
  to: @done
  stills: @done :: the card beside the button

  The cursor travels on a curve and turns into a hand.

  The click is drawn from the real press.
highlight: 1 3-5
stills: b2.end :: код целиком внутри окна

Сцена — это заголовок с видом, несколько полей и речь обычными абзацами.

Поля говорят, что показать и куда смотреть, а абзацы — что сказать.

[en]
A scene is a heading with a kind, a few fields and the narration as plain paragraphs.

The fields say what to show and where to look, the paragraphs what to say.

## c02-beats · page
spotlight: [{"target":".beats","at":"b1+0.3","pan":true,"ring":false,"dim":0},{"target":".beats","at":"b2+0.3","pan":true,"ring":false,"dim":0}]
page: pages/beats.ru.html
page.en: pages/beats.html
stills: b1.end :: три такта с ключами и длинами | b2.end-0.5 :: второй такт переписан, у него новый ключ, остальные из кэша

У каждого такта своя запись, своя длина и свой ключ кэша.

Перепишите одну фразу — заново озвучится только она, а сцены, где ничего не менялось, возьмутся из кэша.

[en]
Every beat has its own take, its own length and its own cache key.

Rewrite one sentence and only that beat is voiced again, while the scenes that did not change come from the cache.

## c02-spoken · slides.compare
kicker: Строка с тильдой
kicker.en: A line with a tilde
title: Пишется одно, звучит другое
title.en: Written one way, spoken another
left: На экране (plain) :: Сборка по API | в субтитрах тоже
left.en: On screen (plain) :: Build over an API | in the subtitles too
right: В голосе (good) :: Сборка по эй-пи-ай | правила чтения — данные ролика
right.en: In the voice (good) :: Build over an ay-pee-eye | reading rules are film data
stills: b1.end :: обе колонки видны

Строка с тильдой задаёт, как такт произнести, а на экране и в субтитрах остаётся написанное.

Общие правила чтения латиницы и сокращений лежат в шапке ролика.

[en]
A line with a tilde says how a beat is spoken, while the screen and the subtitles keep what is written.

Shared reading rules for Latin words and abbreviations sit in the film's header.

## c02-anchors · page
spotlight: [{"target":"svg","at":"b1+0.3","pan":true,"ring":false,"dim":0},{"target":"svg","at":"b2+0.3","pan":true,"ring":false,"dim":0}]
page: pages/anchors.ru.html
page.en: pages/anchors.html
stills: b1.end :: такты и якоря подписаны | b2.end-0.5 :: такты растянуты, метка уехала вместе со вторым тактом

Моменты в сценарии называются по речи: начало второго такта, полсекунды после него, конец его речи или доля сцены.

Смените голос или темп — такты растянутся, и подписи, наезды и звуки уедут вместе со своими словами; секунды, выставленные руками, так не умеют.

[en]
Moments in a scenario are named by the speech: the start of the second beat, half a second after it, the end of its speech, or a share of the scene.

Change the voice or the pace and the beats stretch, while cards, push-ins and sounds move with their words; seconds typed by hand cannot do that.

## c02-cache · page
spotlight: [{"target":".term pre","at":"b1+0.3","pan":true,"ring":false,"dim":0},{"target":".term pre","at":"b2+0.3","pan":true,"ring":false,"dim":0}]
page: pages/term-cache.ru.html
page.en: pages/term-cache.html
stills: b1.end :: сцены из кэша отмечены | b2.end-0.5 :: команда сборки одной сцены видна

Повторная сборка берёт неизменённые сцены из кэша.

А одну сцену можно собрать отдельно — ровно тем отрезком, каким она войдёт в фильм.

[en]
A rebuild takes the unchanged scenes from the cache.

And one scene can be built alone, exactly the segment it will have in the film.

## c02-langs · slides.beforeafter
image: assets/gen/lang.ru.png
after: assets/gen/lang.png
labels: Русский | English
labels.en: Русский | English
stills: 50% :: разделитель посередине, оба кадра одной сцены

Перевод живёт в том же файле: поле с суффиксом языка и блок речи с тем же числом тактов.

Один флаг собирает ролик на другом языке.

[en]
A translation lives in the same file: a field with a language suffix and a block of narration with the same number of beats.

One flag builds the film in the other language.

## c02-untranslated · page
spotlight: [{"target":".term pre","at":"b1+0.3","pan":true,"ring":false,"dim":0}]
page: pages/term-untranslated.ru.html
page.en: pages/term-untranslated.html
stills: b1.end :: находка untranslated называет поле

Проверка перевода называет каждое видимое поле, которое забыли перевести.

[en]
The translation check names every visible field left untranslated.

## c02-typo · page
spotlight: [{"target":".term pre","at":"b1+0.3","pan":true,"ring":false,"dim":0}]
page: pages/term-typo.ru.html
page.en: pages/term-typo.html
stills: b1.end :: сообщение с номером строки и подсказкой видно целиком

А опечатка в поле — не молча пропавший слайд, а ошибка с номером строки и подсказкой ближайшего имени.

[en]
And a typo in a field is not a slide that silently disappears, but an error with the line number and the nearest name suggested.

## c03-open · slides.chapter
part: Живая съёмка
part.en: Live capture
kicker: Живая съёмка
kicker.en: Live capture
title: Настоящий продукт, настоящие клики
title.en: A real product, clicked for real
body: Агент ведёт работающее приложение через Playwright и записывает.
body.en: The agent drives the running app through Playwright and records it.
transition: {"kind":"push","duration":0.7,"sound":"audio/sfx/whoosh.ogg","snap":"music"}

Агент открывает работающее приложение и ведёт его через Playwright, пока идёт запись; здесь это пример — доска задач, сделанная для съёмки.

[en]
The agent opens the running app and drives it through Playwright while it records; here it is a sample, a task board made for filming.

## c03-script · slides.code
kicker: Сценарий съёмки
kicker.en: The shooting script
title: Локаторы вместо координат
title.en: Locators instead of coordinates
name: shoot.mjs, выдержка
name.en: shoot.mjs, an excerpt
file: assets/take.ru.js
file.en: assets/take.js
highlight: 3-5 8
stills: b1.end :: код целиком внутри окна

Действия пишутся локаторами, как в тестах: набрать задачу, нажать Enter, кликнуть «Готово» — без секунд и без координат.

[en]
Actions are written with locators, as in tests: type the task, press Enter, click Done, with no seconds and no coordinates.

## c03-type · video
file: captures/board.ru.webm
file.en: captures/board.webm
from: @start
to: @added
speed: [{"from":1.2,"to":4.2,"rate":0.6,"ramp":0.3}]
stills: 50% :: живой наезд на поле, остальное затемнено | 90% :: клавиша Enter видна | @typed :: задача набрана | @zoomout :: наезд возвращается к общему плану

Пока набирается задача, живая страница сама наезжает на поле, а нажатые клавиши появляются на экране.

[en]
While the task is typed, the live page pushes in on the field by itself, and the pressed keys appear on screen.

## c03-click · video
duration: 6.1
file: captures/board.ru.webm
file.en: captures/board.webm
from: @added
to: @done
stills: 55% :: курсор-рука над кнопкой, карточка рядом, не поверх

Курсор едет по дуге и становится рукой над кнопкой, а клик рисуется по настоящему нажатию.

[en]
The cursor travels on a curve and turns into a hand over the button, and the click is drawn from the real press.

## c03-card · video
file: captures/board.ru.webm
file.en: captures/board.webm
from: @added+1.5
to: @keys
spotlight: {"area":"@done","at":"b1+4","until":"b1+6","scale":1.4,"ring":true}
stills: b1+1 :: карточка-пояснение рядом с кнопкой | b1+5 :: перенесённая карточка в «Готово» подсвечена целиком

Карточка с пояснением встаёт рядом с кнопкой, пока идёт действие, и уходит, когда оно закончилось.

[en]
A card with an explanation stands beside the button while the action runs, then leaves.

## c03-spot · video
duration: 3.5
file: captures/spot.ru.webm
file.en: captures/spot.webm
from: @start
to: @end
stills: @click+0.1 :: клик нарисован мягким пятном света

Клик можно показать мягким пятном света…

[en]
A click can show as a soft spot of light…

## c03-echo · video
duration: 3.5
file: captures/echo.ru.webm
file.en: captures/echo.webm
from: @start
to: @end
stills: @click+0.15 :: клик нарисован двойным эхом

…или двойным эхом: это одна настройка дубля.

[en]
…or as a double echo: one option of the take.

## c03-keys · video
duration: 6.2
file: captures/board.ru.webm
file.en: captures/board.webm
from: @keys
to: @end
stills: @palette :: клавиши ⌘ и K видны, палитра открыта | @report+1 :: отчёт открылся | @go :: Enter в палитре

Сочетание клавиш видно на экране, и палитра команд открывает отчёт.

[en]
The shortcut shows on screen, and the command palette opens the report.

## c03-auto · video
duration: 7.2
file: captures/auto.ru.webm
file.en: captures/auto.webm
from: @start
to: @drag
autoZoom: true
stills: 25% :: наезд на поле ввода при наборе | 70% :: наезд на ползунок или кнопку | @added :: новая карточка в «К работе»

Здесь камеру никто не ставил: она сама наезжает на записанные действия.

Близкие действия — один наезд.

[en]
Here nobody placed the camera: it pushes in on the recorded actions by itself.

Close actions share one push-in.

## c03-follow · video
file: captures/auto.ru.webm
file.en: captures/auto.webm
from: @drag
to: @end
autoZoom: {"follow":"cursor","scale":1.8}
stills: 40% :: увеличенное окно идёт за перетаскиваемой карточкой | @dragged :: карточка легла в «Готово» | @back :: карточка вернулась в «В работе»

При перетаскивании увеличенное окно идёт за курсором и плывёт следом, когда тот уходит к краю.

[en]
During a drag the zoomed window follows the cursor, gliding after it when it nears the edge.

## c03-marks · video
file: captures/board.ru.webm
file.en: captures/board.webm
from: @done-1.5
to: @keys
overlay: {"marks":[{"at":"@done+0.2","kind":"circle","area":"@done","hold":3}]}
stills: @done+1.2 :: круг обводит перенесённую карточку целиком

Каждый важный миг дубль называет по имени и запоминает прямоугольник элемента.

Поэтому сценарий режет дубль от отметки до отметки и обводит карточку по её имени, без единой координаты.

[en]
The take names every important moment and remembers the element's rectangle.

So the scenario cuts the take from mark to mark and circles the card by its name, without a single coordinate.

## c03-sum · slides.steps
kicker: Одна запись — много сцен
kicker.en: One take, many scenes
title: Что даёт живая съёмка
title.en: What live capture gives
items: Локаторы :: ни секунд, ни координат | Живой курсор :: форма по элементу | Отметки :: сцены режутся по именам | Камера :: наезжает по действиям
items.en: Locators :: no seconds, no coordinates | A living cursor :: shaped by the element | Marks :: scenes cut by name | The camera :: pushes in at the actions
stills: b2.end :: все четыре пункта видны

Одна запись служит многим сценам, пустое начало записи срезается само, а ошибка на странице проваливает дубль, а не прячется в застывшем кадре.

Для телефона дубль пишется в ширину телефона и с множителем плотности, чтобы вышел резким.

[en]
One take serves many scenes, the blank start of a recording is trimmed by itself, and an error on the page fails the take instead of hiding in a frozen frame.

For a phone, the take is recorded at a phone's width with a density scale, so it comes out sharp.

## c04-open · slides.chapter
part: Внимание
part.en: Attention
kicker: Внимание
kicker.en: Attention
title: Камера знает, куда смотреть
title.en: The camera knows where to look
body: Одна строка называет предмет и такт.
body.en: One line names the subject and the beat.
transition: {"kind":"push","duration":0.7,"sound":"audio/sfx/whoosh.ogg","snap":"music"}

На загруженном экране взгляду нужен проводник, и камера ведёт его туда, о чём говорит речь.

[en]
A busy screen needs a guide for the eye, and the camera leads it to whatever the narration names.

## c04-chain · page
captions: bottom
page: app/report.ru.html
page.en: app/report.html
spotlight: [{"target":"#kpi-1","at":"b1","card":{"title":"+18% к прошлому спринту"}},{"target":"#bar-3","at":"b2","shape":"circle","desaturate":true,"blur":5,"scale":1.3},{"target":"#row-0","at":"b3","scale":1.5}]
spotlight.en: [{"target":"#kpi-1","at":"b1","card":{"title":"+18% vs last sprint"}},{"target":"#bar-3","at":"b2","shape":"circle","desaturate":true,"blur":5,"scale":1.3},{"target":"#row-0","at":"b3","scale":1.5}]
stills: b1+1.5 :: наезд на скорость, карточка рядом с числом | b2+1.5 :: круг вокруг пика целиком, остальное без цвета | b3+1.2 :: просроченная строка в кадре целиком

Одна строка сценария наезжает на предмет, когда речь его называет: скорость выросла на восемнадцать процентов.

Дальше пик четверга: остальное гаснет и теряет цвет, а камера переезжает, не возвращаясь к общему плану.

Третья остановка той же строки — просроченная задача.

[en]
One line of the scenario pushes in on a subject when the narration names it: the team's velocity is up eighteen percent.

Next, Thursday's peak: the rest dims and loses its colour, and the camera travels without going back to the overview.

The third stop of the same line is the overdue task.

## c04-pan · page
captions: auto
page: app/report.ru.html
page.en: app/report.html
spotlight: {"target":"#row-0","at":"b1","pan":true,"scale":1.5}
stills: b1+1 :: строка крупно, читается начало | b1.end-0.5 :: камера дошла до конца строки

Широкую строку камера читает вдоль: приближается, пока текст не станет читаемым, и едет от первого слова к последнему.

[en]
The camera reads a wide row along its length: it pushes in until the text is legible and travels from the first word to the last.

## c04-highlight · page
captions: auto
page: app/report.ru.html
page.en: app/report.html
spotlight: {"target":"#kpi-3","at":"b1+0.5","scale":1}
stills: b1+2 :: весь экран на месте, подсвечена только карточка инцидентов

А подсветка без наезда оставляет весь экран на месте и гасит всё, кроме одного числа.

[en]
A highlight without a push-in keeps the whole screen in place and dims everything but one number.

## c04-loupe · page
captions: auto
page: app/report.ru.html
page.en: app/report.html
overlay: {"loupe":[{"at":"b1+0.5","target":"#kpi-0","scale":2,"size":0.24,"hold":4,"place":"beside"}]}
stills: b1+2 :: лупа рядом с карточкой, в ней карточка целиком, лупа не на субтитрах

Лупа держит деталь крупно, пока камера стоит на общем плане.

[en]
A loupe holds a detail large while the camera stays on the whole.

## c04-marks · page
captions: auto
page: app/report.ru.html
page.en: app/report.html
overlay: {"marks":[{"at":"b1+0.3","kind":"circle","target":"#kpi-1","hold":6},{"at":"b1+1.6","kind":"arrow","target":"#row-0","hold":5},{"at":"b1+2.9","kind":"underline","target":"#chart h4","hold":4}],"glints":[{"at":"b2+0.2","target":"#kpi-0"}],"bursts":[{"at":"b2+0.8","kind":"confetti","target":"#kpi-0","seed":3}]}
sfx: [{"at":"b2+0.8","file":"audio/sfx/success.ogg","gain":-4}]
stills: b1.end :: круг, стрелка и подчёркивание на своих предметах | b2+1.3 :: блик и конфетти

Метки рисуются от руки, пером с нажимом: круг, стрелка, подчёркивание.

А хорошую новость отмечают блик и конфетти.

[en]
Marks draw themselves by hand, with a pen's pressure: a circle, an arrow, an underline.

And good news gets a glint and confetti.

## c04-time · video
file: captures/board.ru.webm
file.en: captures/board.webm
from: @added+2.5
to: @done+1
speed: [{"from":2,"to":3.4,"rate":0.35,"ramp":0.4,"interpolate":true}]
stills: 45% :: замедленный клик, кадры плавные, без рывков

Время можно растянуть внутри кадра: запись плавно входит в замедление, а недостающие кадры дорисовываются.

[en]
Time can stretch inside the shot: the recording eases into slow motion, and the missing frames are drawn in.

## c04-stop · video
file: captures/board.ru.webm
file.en: captures/board.webm
from: @done-1
to: @keys
spotlight: {"area":"@done","at":"b1+0.6","slow":"stop","scale":1.5,"card":{"title":"Время остановлено","body":"Отметка @done записана во время дубля"}}
spotlight.en: {"area":"@done","at":"b1+0.6","slow":"stop","scale":1.5,"card":{"title":"Time stopped","body":"The @done mark was set during the take"}}
stills: b1+2 :: карточка в «Готово» крупно, пояснение рядом, не поверх

А можно остановить: на отметке «готово» время стоит, пока камера держит карточку и её можно прочитать.

[en]
Or stop it: at the "done" mark time stands still while the camera holds the card long enough to read it.

## c04-freeze · video
file: captures/board.ru.webm
file.en: captures/board.webm
from: @report
to: @end
freezeAt: 3
overlay: {"camera":[{"at":"b1+0.3","area":[0.02,0.08,0.5,0.2],"move":1,"hold":2.2,"return":0.9,"style":"gentle"},{"at":"b1+4.8","area":[0.02,0.26,0.38,0.7],"move":1,"hold":2.2,"return":0.9,"style":"gentle"}]}
stills: b1+1.8 :: камера на карточках показателей | b1+5.8 :: камера на графике, кадр стоит

Плотный экран можно разобрать на одном настоящем кадре: время стоит, а камера по очереди обходит показатели и график.

[en]
A dense screen can be explained on one real frame: time stands still while the camera walks the numbers and then the chart.

## c04-frame · video
duration: 3.5
file: captures/echo.ru.webm
file.en: captures/echo.webm
from: @start
to: @end
device: frame
stills: 50% :: запись в простом окне на фоне темы | @click :: клик двойным эхом

Запись можно поставить в простое окно на фоне темы, когда рамка вокруг интерфейса помогает.

[en]
A take can sit in a plain window on the theme's background, when a frame around the interface helps.

## c05-open · slides.chapter
part: Слайды
part.en: Slides
kicker: Слайды
kicker.en: Slides
title: Слайды, которые не стоят на месте
title.en: Slides that never stand still
body: Двадцать видов, живые фоны и фразы, которые собираются на глазах.
body.en: Twenty kinds, live backgrounds and phrases that assemble before your eyes.
text: scramble
transition: {"kind":"push","duration":0.7,"sound":"audio/sfx/whoosh.ogg","snap":"music"}
stills: b1.end :: заголовок собран, фон движется

Слайды здесь тоже живые: на каждом дышит фон, пункты входят вместе с речью, а заголовок собирается на глазах.

[en]
Slides are alive too: every one has a breathing background, items enter with the narration, and the title assembles before your eyes.

## c05-count · slides.counter
kicker: В наборе
kicker.en: In the kit
title: Слайды в цифрах
title.en: Slides in numbers
values: 20 :: видов слайдов | 14 :: стилей фразы | 18 :: способов входа | 6 :: живых фонов
note: help slides, версия 1.2.0, 27 сентября 2026
note.en: help slides, version 1.2.0, September 27, 2026
values.en: 20 :: slide kinds | 14 :: phrase styles | 18 :: entrances | 6 :: live backgrounds
stills: b1.end :: все четыре числа докручены

Двадцать видов слайдов, четырнадцать стилей фразы, восемнадцать способов входа и шесть живых фонов.

[en]
Twenty slide kinds, fourteen phrase styles, eighteen entrances and six live backgrounds.

## c05-kinds · slides.features
kicker: Виды
kicker.en: Kinds
title: Для каждого вида доказательства
title.en: A kind for every kind of evidence
items: 📋 Шаги :: загораются с речью | 📈 График :: из файла CSV | ⌨️ Код :: печатается сам | 🔀 До и после :: разделитель едет | 🖥️ Перспектива :: экран на WebGL | 🧱 Параллакс :: снимок на слоях
items.en: 📋 Steps :: light up with the words | 📈 Chart :: from a CSV file | ⌨️ Code :: types itself | 🔀 Before and after :: a travelling divider | 🖥️ Perspective :: a screen in WebGL | 🧱 Parallax :: a screenshot in layers
enter: flip
stills: b1.end :: шесть карточек видны, эмодзи нарисованы

Шаги, график из CSV, код, который печатает себя, до и после, экран в перспективе и снимок, разложенный на слои.

[en]
Steps, a chart from a CSV, code that types itself, before and after, a screen in perspective and a screenshot laid out in layers.

## c05-chart · slides.chart
kicker: Данные
kicker.en: Data
title: Коммиты этого репозитория по дням
title.en: Commits to this repository by day
data: assets/commits.ru.csv
data.en: assets/commits.csv
peak: max
note: 21–26 сентября 2026, по git log
note.en: September 21–26, 2026, from git log
stills: b1.end :: столбцы выросли, пик подсвечен

График читает файл CSV — здесь это коммиты этого репозитория по дням: столбцы растут, пик загорается.

[en]
A chart reads a CSV file, here the commits to this repository by day: the bars grow and the peak lights up.

## c05-phrase · slides.hero
kicker: Стиль фразы
kicker.en: A phrase style
title: Фраза собирается по словам
title.en: A phrase assembles word by word
body: Каждая буква сразу стоит на своём месте.
body.en: Every letter is already in its final place.
text: split
stills: b1.end :: заголовок собран, строки не перескочили

Фраза собирается по словам или по буквам, и каждая буква сразу стоит на своём месте, поэтому строки не перескакивают.

[en]
A phrase assembles word by word or letter by letter, and every letter is already in its final place, so lines never re-wrap.

## c05-enter · slides.steps
kicker: Вход и движение
kicker.en: Entrances and motion
title: Пункт на такт
title.en: An item a beat
items: Вход :: у каждого вида свой | Камера :: медленно облетает слайд | Фон :: волны, сияние, частицы
items.en: Entrance :: each kind has its own | Camera :: slowly orbits the slide | Background :: waves, aurora, particles
enter: swing
move: drift
align: fill
background: waves
stills: b2.end :: три пункта видны, слайд слегка повёрнут облётом

Пункты входят по одному на свой такт.

А камера медленно облетает слайд, и фон под ним движется.

[en]
Items enter one by one, each on its own beat.

The camera slowly orbits the slide, and the background moves under it.

## c05-timeline · slides.timeline
kicker: Линия времени
kicker.en: A timeline
title: Выпуски инструмента
title.en: Releases of the tool
items: 1.0.0 :: 8 сентября | 1.0.2 :: 12 сентября | 1.1.0 :: 21 сентября | 1.2.0 :: 23 сентября
items.en: 1.0.0 :: September 8 | 1.0.2 :: September 12 | 1.1.0 :: September 21 | 1.2.0 :: September 23
stills: b2.end :: все четыре выпуска на линии

Линия времени дорисовывается до каждой остановки: здесь это выпуски инструмента.

Слайд вписывается сам, сжимаясь до семидесяти двух процентов, а что не влезло, называется в отчёте сборки.

[en]
A timeline draws itself to each stop: here, the releases of the tool.

A slide fits itself, shrinking down to seventy-two percent, and whatever does not fit is named in the build report.

## c06-open · slides.chapter
part: Текст
part.en: Text
kicker: Текст
kicker.en: Text
title: Слова на экране
title.en: Words on screen
body: Субтитры, титры, плашки, выноски и стикеры.
body.en: Subtitles, titles, lower thirds, callouts and stickers.
transition: {"kind":"push","duration":0.7,"sound":"audio/sfx/whoosh.ogg","snap":"music"}
stills: b1+2 :: караоке: звучащее слово подсвечено

Ролики часто смотрят без звука, поэтому речь идёт субтитрами: белые буквы с обводкой читаются на любом кадре, а караоке подсвечивает звучащее слово.

[en]
Films are often watched without sound, so the narration runs as subtitles: white letters with an outline read on any frame, and karaoke lights the word being spoken.

## c06-top · video
file: captures/board.ru.webm
file.en: captures/board.webm
from: @report
to: @end
captions: top
stills: b1+1 :: субтитры наверху, столбцы графика внизу открыты

Когда низ кадра занят, как здесь столбцами графика, субтитры уходят наверх.

[en]
When the lower part of the frame is busy, as here with the chart's bars, the subtitles move to the top.

## c06-auto · video
file: captures/auto.ru.webm
file.en: captures/auto.webm
from: @added-1
to: @back
captions: auto
stills: b1+1 :: субтитры в самой пустой полосе, не на карточках | @added :: карточка добавлена | @drag :: начало перетаскивания | @dragged :: карточка в «Готово»

А можно не выбирать самому: сборка посмотрит на кадры сцены и поставит субтитры в самую пустую полосу.

[en]
Or leave the choice to the build: it looks at the scene's frames and puts the subtitles in the emptiest band.

## c06-title · page
captions: auto
page: app/report.ru.html
page.en: app/report.html
overlay: {"titles":[{"at":"b1+0.3","text":"Скорость +18%","style":"slam","position":"center","hold":2.6}]}
overlay.en: {"titles":[{"at":"b1+0.3","text":"Velocity +18%","style":"slam","position":"center","hold":2.6}]}
stills: b1+1 :: титр в центре, интерфейс под ним приглушён

Титр врезается в кадр и приглушает интерфейс под собой, чтобы читаться поверх.

[en]
A title slams into the frame and dims the interface under it, so it reads on top.

## c06-labels · video
file: captures/auto.ru.webm
file.en: captures/auto.webm
from: @start
to: @drag
speed: [{"from":1,"to":3,"rate":0.6}]
overlay: {"lower":[{"at":"b1","title":"Flow","subtitle":"пример приложения для съёмки","hold":3.3}],"callouts":[{"at":"b1+3.6","text":"Сюда вводится задача","area":[0.02,0.1,0.27,0.047],"side":"bottom","hold":3}],"stickers":[{"at":"b2+0.3","image":"assets/party.gif","area":"@added","size":140,"hold":2.4},{"at":"b2+1","text":"новое","point":[0.36,0.66],"hold":2.6}]}
overlay.en: {"lower":[{"at":"b1","title":"Flow","subtitle":"a sample app made for filming","hold":3.3}],"callouts":[{"at":"b1+3.6","text":"The task is typed here","area":[0.02,0.1,0.27,0.047],"side":"bottom","hold":3}],"stickers":[{"at":"b2+0.3","image":"assets/party.gif","area":"@added","size":140,"hold":2.4},{"at":"b2+1","text":"new","point":[0.36,0.66],"hold":2.6}]}
stills: b1+1.5 :: плашка с именем внизу слева над субтитрами | b1+3 :: выноска указывает на поле | b2+1.2 :: стикеры на новой карточке | @added :: карточка добавлена

Плашка называет, что в кадре, а выноска указывает на поле.

Стикер — эмодзи, картинка, GIF или значок — садится на результат.

[en]
A lower third names what is in frame, and a callout points at the field.

A sticker, an emoji, a picture, a GIF or a badge, lands on the result.

## c06-more · slides.steps
kicker: Ещё
kicker.en: More
title: Настройки текста
title.en: Text settings
items: Размер :: субтитры крупнее, до 1,6 раза | Плашка :: плотный фон для доступности | SRT :: файл субтитров рядом с роликом | Прогресс :: полоса и имя главы
items.en: Size :: subtitles up to 1.6 times larger | Plate :: a dense backing for accessibility | SRT :: a subtitle file beside the film | Progress :: a bar and the chapter's name
stills: b2.end :: четыре пункта видны, полоса прогресса с именем главы внизу

Субтитры можно укрупнить или посадить на плотную плашку, а рядом с роликом ляжет файл SRT.

Полоса внизу — прогресс с названием главы; она идёт через весь этот фильм, а запись ведущего, если она есть, встанет в круг в углу.

[en]
Subtitles can be made larger or set on a dense plate, and an SRT file lands beside the film.

The bar at the bottom is the progress with the chapter's name, running through this whole film; a presenter's recording would sit in a circle in a corner.

## c07-open · slides.chapter
part: Склейки и звук
part.en: Cuts and sound
kicker: Склейки и звук
kicker.en: Cuts and sound
title: Переходы и музыка, которая уступает словам
title.en: Transitions, and music that gives way to words
body: Двенадцать переходов WebGL, морф, жёсткая склейка и затемнение.
body.en: Twelve WebGL transitions, a morph, a hard cut and a dip.
transition: {"kind":"push","duration":0.7,"sound":"audio/sfx/whoosh.ogg","snap":"music"}

Между сценами идут настоящие переходы на WebGL, между движущимися кадрами обеих сцен; вот все двенадцать.

[en]
Between scenes run real WebGL transitions, between the moving frames of both scenes; here are all twelve.

## c07-t01 · video
file: captures/auto.ru.webm
file.en: captures/auto.webm
from: @start
to: @start+2.4
transition: zoom-blur 0.7
overlay: {"stickers":[{"at":0.7,"text":"zoom-blur","point":[0.12,0.9],"hold":1.5}]}
overlay.en: {"stickers":[{"at":0.7,"text":"zoom-blur","point":[0.12,0.9],"hold":1.5}]}
duration: 2.4

## c07-t02 · video
file: captures/auto.ru.webm
file.en: captures/auto.webm
from: @start+2.4
to: @start+4.8
transition: whip 0.6
overlay: {"stickers":[{"at":0.6,"text":"whip","point":[0.12,0.9],"hold":1.5}]}
overlay.en: {"stickers":[{"at":0.6,"text":"whip","point":[0.12,0.9],"hold":1.5}]}
duration: 2.4

## c07-t03 · video
file: captures/auto.ru.webm
file.en: captures/auto.webm
from: @start+4.8
to: @added
transition: wipe 0.7
overlay: {"stickers":[{"at":0.7,"text":"wipe","point":[0.12,0.9],"hold":1.5}]}
overlay.en: {"stickers":[{"at":0.7,"text":"wipe","point":[0.12,0.9],"hold":1.5}]}
duration: 2.4

## c07-t04 · video
file: captures/auto.ru.webm
file.en: captures/auto.webm
from: @drag
to: @back
transition: iris 0.7
overlay: {"stickers":[{"at":0.7,"text":"iris","point":[0.12,0.9],"hold":1.5}]}
stills: @dragged :: карточка легла в «Готово»
overlay.en: {"stickers":[{"at":0.7,"text":"iris","point":[0.12,0.9],"hold":1.5}]}
duration: 2.4

## c07-t05 · video
file: captures/board.ru.webm
file.en: captures/board.webm
from: @start+1
to: @added
transition: cube 0.8
overlay: {"stickers":[{"at":0.8,"text":"cube","point":[0.12,0.9],"hold":1.5}]}
overlay.en: {"stickers":[{"at":0.8,"text":"cube","point":[0.12,0.9],"hold":1.5}]}
duration: 2.4
stills: @typed :: задача набрана | @zoomout :: возврат к общему плану

## c07-t06 · video
file: captures/board.ru.webm
file.en: captures/board.webm
from: @added+3.5
to: @done
transition: flip 0.8
overlay: {"stickers":[{"at":0.8,"text":"flip","point":[0.12,0.9],"hold":1.5}]}
overlay.en: {"stickers":[{"at":0.8,"text":"flip","point":[0.12,0.9],"hold":1.5}]}
duration: 2.4

## c07-t07 · video
file: captures/board.ru.webm
file.en: captures/board.webm
from: @keys
to: @report
transition: {"kind":"glitch","duration":0.6,"sound":"audio/sfx/switch.ogg"}
overlay: {"stickers":[{"at":0.6,"text":"glitch","point":[0.12,0.9],"hold":1.5}]}
stills: @palette :: палитра открыта | @go :: Enter в палитре
overlay.en: {"stickers":[{"at":0.6,"text":"glitch","point":[0.12,0.9],"hold":1.5}]}
duration: 2.4

## c07-t08 · video
file: captures/board.ru.webm
file.en: captures/board.webm
from: @report
to: @end
transition: flash 0.7
overlay: {"stickers":[{"at":0.7,"text":"flash","point":[0.12,0.9],"hold":1.5}]}
overlay.en: {"stickers":[{"at":0.7,"text":"flash","point":[0.12,0.9],"hold":1.5}]}
duration: 2.4

## c07-t09 · video
file: captures/phone.ru.webm
file.en: captures/phone.webm
from: @start
to: @end
device: phone
transition: ripple 0.8
overlay: {"stickers":[{"at":0.8,"text":"ripple","point":[0.12,0.9],"hold":1.5}]}
stills: @done :: карточка ушла в «Готово» | @report :: отчёт на телефоне
overlay.en: {"stickers":[{"at":0.8,"text":"ripple","point":[0.12,0.9],"hold":1.5}]}
duration: 2.6

## c07-t10 · video
file: captures/spot.ru.webm
file.en: captures/spot.webm
from: @start
to: @end
transition: dissolve 0.8
overlay: {"stickers":[{"at":0.8,"text":"dissolve","point":[0.12,0.9],"hold":1.5}]}
stills: @click :: клик пятном
overlay.en: {"stickers":[{"at":0.8,"text":"dissolve","point":[0.12,0.9],"hold":1.5}]}
duration: 2.4

## c07-t11 · video
file: captures/echo.ru.webm
file.en: captures/echo.webm
from: @start
to: @end
transition: dip 0.7
overlay: {"stickers":[{"at":0.8,"text":"dip","point":[0.12,0.9],"hold":1.5}]}
stills: @click :: клик эхом
overlay.en: {"stickers":[{"at":0.8,"text":"dip","point":[0.12,0.9],"hold":1.5}]}
duration: 2.4

## c07-t12 · page
captions: auto
page: app/report.ru.html
page.en: app/report.html
transition: push 0.7
spotlight: #kpi-1 @ b1+0.8
stills: b1+1 :: наезд на число скорости перед морфом

Двенадцатый — push; а морф переносит в следующую сцену один элемент целиком: число скорости…

[en]
The twelfth is push; and a morph carries one element whole into the next scene: the velocity number…

## c07-morph · page
page: app/velocity.ru.html
page.en: app/velocity.html
transition: {"kind":"morph","element":"#kpi-1","duration":1}
stills: 15% :: карточка скорости в пути между сценами | b1.end :: страница скорости, линия нарисована

…летит на свою страницу и по дороге принимает её вид.

[en]
…flies to its own page and takes its look on the way.

## c07-cut · video
file: captures/board.ru.webm
file.en: captures/board.webm
from: @start
to: @added
transition: cut
stills: 5% :: склейка встык, без наплыва | @typed :: задача набрана | @zoomout :: возврат к общему плану

Жёсткая склейка стыкует сцены без наплыва — так режут трейлер…

[en]
A hard cut joins scenes edge to edge, with no fade, the way a trailer is cut…

## c07-dip · video
file: captures/auto.ru.webm
file.en: captures/auto.webm
from: @drag
to: @back
transition: dip 0.8
stills: 3% :: кадр ушёл в цвет перед сценой | @dragged :: карточка в «Готово»

…а затемнение уводит кадр в цвет и выводит из него следующую сцену.

[en]
…and a dip sinks the frame into a colour and brings the next scene out of it.

## c07-duck · page
spotlight: [{"target":".chart","at":"b1+0.3","pan":true,"ring":false,"dim":0},{"target":".chart","at":"b2+0.3","pan":true,"ring":false,"dim":0}]
page: pages/duck.ru.html
page.en: pages/duck.html
stills: b1.end :: под первым тактом музыка опущена | b2+1 :: в паузе музыка вернулась, под вторым снова опущена

Музыка под речью приседает: под каждым тактом она уходит на двадцать децибел ниже его измеренной громкости.

А в паузах возвращается, и если сменить голос, провалы переедут вместе со словами.

[en]
Music ducks under the speech: under every beat it drops twenty decibels below that beat's measured level.

It comes back in the pauses, and with a new voice the dips move with the words.

## c07-music · slides.steps
kicker: Музыка и акценты
kicker.en: Music and accents
title: Звук по частям
title.en: Sound by parts
items: Трек на часть :: смена со сцены | Обрыв :: тишина перед панчлайном | Темп :: сборка находит долю | Акцент :: удар в паузе звучит полностью
items.en: A track per part :: changes from a scene | A stop :: silence before a punchline | Tempo :: the build finds the beat | An accent :: a hit in a pause at full level
sfx: [{"at":"0.1s","file":"audio/sfx/hit-plate.ogg","gain":-2}]
speechAt: 0.7
stills: b2.end :: четыре пункта видны

Музыку можно сменить с любой сцены или оборвать перед панчлайном, а темп трека сборка находит сама, чтобы склейка встала в долю.

Удар в паузе звучит в полную силу, под словами уступает им, а голос может вступить после удара.

[en]
Music can change from any scene or stop before a punchline, and the build finds the track's tempo itself, so a cut lands on the beat.

A hit in a pause plays at full level, gives way under the words, and the voice can start after the hit.

## c07-loud · slides.number
kicker: Громкость
kicker.en: Loudness
value: −14 LUFS
value.en: −14 LUFS
note: help sound, 27 сентября 2026
note.en: help sound, September 27, 2026
label: у каждого ролика со звуком
label.en: for every film with sound
tags: пик ниже −1 dBTP | и когда звучит одна речь | немой черновик не трогается
tags.en: peak under −1 dBTP | narration alone too | a silent draft is left alone
count: off
stills: b1.end :: число и все три метки видны

В конце сборка выравнивает громкость любого ролика со звуком до минус четырнадцати LUFS с пиком ниже минус одного dBTP.
~ В конце сборка выравнивает громкость любого ролика со звуком до минус четырнадцати лафс с пиком ниже минус одного децибела.

А ролику, который играет на странице без звука, дорожка не нужна вовсе: это одна строка шапки.

[en]
At the end the build brings any film with sound to minus fourteen LUFS, with its peak under minus one dBTP.
~ At the end the build brings any film with sound to minus fourteen L-U-F-S, with its peak under minus one decibel true peak.

And a film that plays muted on a page needs no sound track at all: that is one header line.

## c08-open · slides.chapter
part: Голос
part.en: Voice
kicker: Голос
kicker.en: Voice
title: Синтез, ваш голос или тишина
title.en: Synthesis, your own voice, or silence
body: Будет ли ролик говорить и каким голосом, решает владелец.
body.en: Whether the film speaks, and in which voice, is the owner's call.
transition: {"kind":"push","duration":0.7,"sound":"audio/sfx/whoosh.ogg","snap":"music"}

Будет ли ролик говорить и каким голосом, решает владелец, а не агент.

[en]
Whether the film speaks, and in which voice, is the owner's call, not the agent's.

## c08-modes · slides.features
kicker: Голоса
kicker.en: Voices
title: Пять способов озвучить
title.en: Five ways to voice a film
items: SpeechKit :: синтез Яндекса | Ваш голос :: запись по тактам | Немой ролик :: смысл в субтитрах | Piper :: локально, без сети | Свой движок :: любая команда по договору
items.en: SpeechKit :: Yandex synthesis | Your voice :: recorded beat by beat | A silent film :: meaning in subtitles | Piper :: local, offline | Your engine :: any command by contract
stills: b2.end :: пять карточек видны

Готовые движки — SpeechKit и локальный Piper; можно записать себя, а можно оставить ролик немым.

Любой другой синтезатор подключается командой по открытому договору, и проверка договора называет каждое нарушение.

[en]
The shipped engines are SpeechKit and the local Piper; you can record yourself, or leave the film silent.

Any other synthesizer plugs in as a command by an open contract, and the contract check names every violation.

## c08-record · video
captions: top
file: captures/record.ru.webm
file.en: captures/record.webm
from: @start
to: @end
spotlight: {"area":[0.28,0.6,0.44,0.38],"at":"b2","scale":1.5,"style":"gentle","ring":false,"dim":0.5}
stills: 30% :: страница записи: кадр сцены и такты с кнопками | @beats :: курсор на второй кнопке записи | @turn :: клик «следующая» | @next :: следующая сцена открыта | b2+1.5 :: наезд на такты и кнопки записи

Чтобы озвучить ролик своим голосом, команда record открывает страницу: сцена, её кадр и речь по тактам, у каждого такта своя кнопка записи.

Перезапись одного такта не трогает соседние, а сборка возьмёт новую запись вместе с её длиной.

[en]
To voice a film yourself, the record command opens a page: the scene, its frame and the narration beat by beat, each beat with its own record button.

Re-recording one beat leaves its neighbours alone, and the build takes the new take with its new length.

## c08-voices · page
spotlight: [{"target":".term pre","at":"b1+0.3","pan":true,"ring":false,"dim":0}]
page: pages/term-voices.ru.html
page.en: pages/term-voices.html
stills: b1.end :: список голосов SpeechKit виден, filipp и john среди них

Список голосов движок отдаёт сам; этот ролик озвучен SpeechKit: по-русски голосом filipp, по-английски голосом john.
~ Список голосов движок отдаёт сам; этот ролик озвучен спичкитом: по-русски голосом Филипп, по-английски голосом Джон.

[en]
The engine lists its voices itself; this film is voiced by SpeechKit, with filipp in Russian and john in English.

## c08-pace · slides.code
kicker: Темп
kicker.en: The pace
title: Сначала замерить голос
title.en: Measure the voice first
name: terminal
code: |
  agentic-screencast build --only c00-cold --keys-only \
    --voice-json '{"engine":"speechkit","name":"filipp"}'

  voice: {"engine":"speechkit","name":"filipp","pitch":-3}
highlight: 1-2
stills: b2.end :: обе команды видны целиком

До первого черновика агент озвучивает одну сцену финальным голосом и выставляет немой заглушке тот же темп, чтобы длины сцен черновика совпали с финалом.

Высоту голоса можно сдвинуть на полутоны без нового синтеза и без новых денег.

[en]
Before the first draft the agent voices one scene with the final voice and gives the silent stub the same pace, so the draft's scene lengths match the final.

The voice's pitch can shift by semitones with no new synthesis and no new cost.

## c08-rule · slides.compare
kicker: Правило
kicker.en: The rule
title: Системный голос — только с разрешения
title.en: A system voice only with permission
left: Нельзя (bad) :: системный голос по умолчанию | «бесплатно» — не разрешение
left.en: Not allowed (bad) :: a system voice by default | "free" is not permission
right: Так (good) :: немой черновик на stub | голос решает владелец
right.en: Instead (good) :: a silent draft on stub | the owner picks the voice
stills: b1.end :: обе колонки видны

Системный голос операционной системы агент без явного разрешения не берёт: он звучит роботом с первой фразы.

Если владельца спросить нельзя, ролик собирается немым, а голос остаётся открытым вопросом.

[en]
The agent does not take the operating system's voice without explicit permission: it sounds robotic from the first sentence.

When the owner cannot be asked, the film is built silent, and the voice stays an open question.

## c09-open · slides.chapter
part: Трейлер
part.en: A trailer
theme: blockbuster
kicker: Тот же файл
kicker.en: The same file
title: Трейлер — тоже
title.en: A trailer, too
body: Слова со вспышкой и тряской, жёсткие склейки, затемнение перед названием.
body.en: Words that slam in with a flash and a shake, hard cuts, a dip before the title.
transition: {"kind":"push","duration":0.7,"sound":"audio/sfx/whoosh.ogg","snap":"music"}
stills: b1.end :: хромированный заголовок темы blockbuster

Тот же файл умеет и трейлер: слова врезаются со вспышкой и тряской, склейки жёсткие, а перед названием кадр уходит в темноту.

[en]
The same file makes a trailer too: words slam in with a flash and a shake, the cuts are hard, and the frame goes dark before the title.

## c09-cold · video
theme: blockbuster
file: captures/trailer.ru.webm
file.en: captures/trailer.webm
from: @start
to: @done
transition: dip 0.5 black
music: {"file":"audio/trailer-bed.mp3","level":-16,"fadeIn":0.1}
flash: 1.15s
sfx: [{"at":"1.1s","file":"audio/sfx/hit-punch.ogg","gain":2}]
duration: 3
stills: @dragged :: вспышка в момент, когда карточка ложится в «Готово»

## c09-card1 · slides.card
theme: blockbuster
kicker: ЭТОЙ ОСЕНЬЮ
kicker.en: THIS AUTUMN
title: ОДИН ФАЙЛ
title.en: ONE FILE
transition: cut
flash: 0.05s
shake: 0.05s
sfx: [{"at":"0.03s","file":"audio/sfx/hit-metal.ogg","gain":3}]
duration: 1.4
stills: 0.6s :: два слова на весь кадр, металл и искры

## c09-world · video
theme: blockbuster
file: captures/trailer.ru.webm
file.en: captures/trailer.webm
from: @done-0.4
to: @palette
speed: [{"from":0.2,"to":1.9,"rate":0.45,"ramp":0.3,"interpolate":true}]
transition: cut
speechAt: 0.3
stills: b1+1 :: замедленный клик, кадры плавные | @done :: карточка ушла в «Готово» | @keys :: нажаты ⌘K

В мире, где ролик о продукте монтируют неделю…

[en]
In a world where a product film takes a week to edit…

## c09-card2 · slides.card
theme: blockbuster
title: ОДНА КОМАНДА
title.en: ONE COMMAND
transition: cut
flash: 0.05s
shake: 0.05s
sfx: [{"at":"0.03s","file":"audio/sfx/hit-metal.ogg","gain":3}]
duration: 1.3

## c09-show · video
duration: 2.7
theme: blockbuster
file: captures/trailer.ru.webm
file.en: captures/trailer.webm
from: @palette-0.3
to: @report+0.4
transition: cut
speechAt: 0.2
stills: @palette :: клавиши и палитра в теме blockbuster | @report :: отчёт открылся | @go :: Enter в палитре

…агенту хватает одного файла.

[en]
…one file is enough for an agent.

## c09-card3 · slides.card
theme: blockbuster
title: ГОТОВЫЙ ФИЛЬМ
title.en: A FINISHED FILM
transition: cut
flash: 0.05s
shake: [{"at":"0.05s","length":0.5,"strength":1.4}]
sfx: [{"at":"0.03s","file":"audio/sfx/hit-punch.ogg","gain":3}]
duration: 1.4

## c09-climax · video
theme: blockbuster
file: captures/trailer.ru.webm
file.en: captures/trailer.webm
from: @report
to: @end
transition: cut
shake: 0.4s | 1.6s
sfx: [{"at":"0.35s","file":"audio/sfx/hit-plate.ogg","gain":2},{"at":"1.55s","file":"audio/sfx/hit-punch.ogg","gain":2}]
music: stop 2.4s
duration: 4
stills: 1.7s :: тряска на растущих столбцах | 3.4s :: тишина: кадр держится после обрыва музыки

## c09-title · slides.titlecard
theme: blockbuster
kicker: ЭТОЙ ОСЕНЬЮ
kicker.en: THIS AUTUMN
title: AGENTIC / SCREENCAST
title.en: AGENTIC / SCREENCAST
body: Уже в вашем агенте
body.en: Already in your agent
transition: dip 0.8 black
sfx: [{"at":"0.05s","file":"audio/sfx/discovery-hit.mp3","length":4,"fadeOut":1,"gain":-2}]
duration: 4.5
stills: 2.5s :: название в две строки, блик

## c09-button · slides.card
fade: {"in":0,"out":0.8}
theme: blockbuster
title: ЧЕРНОВИК БЕСПЛАТНО
title.en: DRAFTS ARE FREE
transition: cut
stills: b1.end :: две строки на весь кадр

И да: черновик — бесплатно.

[en]
And yes: the draft is free.

## c10-open · slides.chapter
part: Облик
part.en: The look
kicker: Облик
kicker.en: The look
title: Облик — одно слово в шапке
title.en: The look is one word in the header
body: Тема оформляет слайды, субтитры, карточки и даже курсор дубля.
body.en: A theme styles slides, subtitles, cards and even the take's cursor.
transition: {"kind":"push","duration":0.7,"sound":"audio/sfx/whoosh.ogg","snap":"music"}
music: {"file":"audio/film-bed.mp3","from":95,"fadeIn":1.5,"level":-24}

Облик ролика — одно слово в шапке: тема задаёт цвета, шрифты, фоны и формы сразу для слайдов и для всего, что рисуется поверх записи.

По умолчанию это neutral, в которой снят весь этот фильм: серая бумага, чернила и один акцент.

[en]
A film's look is one word in the header: the theme sets the colours, fonts, backgrounds and shapes for the slides and for everything drawn over a recording.

The default is neutral, the theme this whole film wears: grey paper, ink and one accent.

## c10-frost · slides.chapter
theme: frost
kicker: Тема
kicker.en: Theme
title: frost
title.en: frost
body: Onest и IBM Plex Sans
body.en: Onest and IBM Plex Sans
stills: b1.end :: тема frost, шрифт Onest

Одиннадцать тем, у каждой свои шрифты с кириллицей, включая шрифт субтитров: двадцать четыре семейства едут вместе с инструментом.

[en]
Eleven themes, each with its own fonts, Cyrillic included, and its own subtitle face: twenty-four families ship with the tool.

## c10-midnight · slides.chapter
theme: midnight
kicker: Тема
kicker.en: Theme
title: midnight
title.en: midnight
body: Geologica и IBM Plex Sans
body.en: Geologica and IBM Plex Sans
duration: 3.6

## c10-paper · slides.chapter
theme: calm-paper
kicker: Тема
kicker.en: Theme
title: calm-paper
title.en: calm-paper
body: Playfair и Literata
body.en: Playfair and Literata
duration: 3.8

## c10-daylight · slides.chapter
theme: daylight
kicker: Тема
kicker.en: Theme
title: daylight
title.en: daylight
body: Onest и Golos Text
body.en: Onest and Golos Text
duration: 3.6

## c10-noir · slides.chapter
theme: noir
kicker: Тема
kicker.en: Theme
title: noir
title.en: noir
body: Cormorant Garamond и Jost
body.en: Cormorant Garamond and Jost
duration: 3.6

## c10-aurora · slides.chapter
theme: aurora
kicker: Тема
kicker.en: Theme
title: aurora
title.en: aurora
body: Raleway и Commissioner
body.en: Raleway and Commissioner
duration: 3.6

## c10-ember · slides.chapter
theme: ember
kicker: Тема
kicker.en: Theme
title: ember
title.en: ember
body: Oswald и Rubik
body.en: Oswald and Rubik
duration: 3.6

## c10-blueprint · slides.chapter
theme: blueprint
kicker: Тема
kicker.en: Theme
title: blueprint
title.en: blueprint
body: Tektur и Fira Sans
body.en: Tektur and Fira Sans
duration: 3.6

## c10-synth · slides.chapter
theme: synthwave
kicker: Тема
kicker.en: Theme
title: synthwave
title.en: synthwave
body: жанровая: игры и музыка
body.en: genre: games and music
duration: 3.6

## c10-blockbuster · slides.chapter
theme: blockbuster
kicker: Тема
kicker.en: Theme
title: blockbuster
title.en: blockbuster
body: жанровая: пародийный трейлер
body.en: genre: a parody action trailer
duration: 3.6

## c10-take · video
theme: daylight
file: captures/daylight.ru.webm
file.en: captures/daylight.webm
from: @start
to: @end
stills: @click+0.1 :: курсор и клик в цветах daylight

И живой дубль носит тему своей сцены: курсор, клик и клавиши записываются в её цветах.

[en]
A live take wears its scene's theme too: the cursor, the click and the keys are recorded in its colours.

## c10-brand · page
spotlight: [{"target":".term pre","at":"b1+0.3","pan":true,"ring":false,"dim":0}]
page: pages/term-theme.ru.html
page.en: pages/term-theme.html
stills: b1.end :: логотип и строка темы видны

Тему можно снять с логотипа: команда найдёт два главных цвета и подгонит их яркость, чтобы они читались на фоне.

[en]
A theme can come from a logo: the command finds its two main colours and shifts their lightness until they read on the background.

## c10-branded · slides.chapter
theme: {"preset":"neutral","--glow":"#f1e1e3","--acc":"#ce2d56","--acc2":"#806788","--ba-line":"#ce2d56","--ba-knob-bg":"#ce2d56","--sc-spot":"rgba(206,45,86,0.95)","--sc-accent-soft":"rgba(206,45,86,0.42)","--sc-cap-bar":"#ce2d56","--sc-card-accent":"#ce2d56","--sc-card-accent-solid":"#ce2d56","--sc-lower-bar":"#ce2d56","--sc-karaoke-bg":"#ce2d56","--sc-badge-bg":"#ce2d56","--sc-mark":"#ce2d56","--sc-glint":"linear-gradient(90deg,transparent,rgba(206,45,86,0.14) 30%,rgba(206,45,86,0.38) 50%,rgba(206,45,86,0.14) 70%,transparent)","--sc-confetti":"#ce2d56,#806788,#3f7a4f,#b3402a,#16171a","--sc-spark":"#ce2d56","--sc-loupe-ring":"#ce2d56","--sc-ripple-ring":"#ce2d56","--sc-ripple":"rgba(206,45,86,0.22)","--sc-progress":"#ce2d56","--sc-pip-ring":"#ce2d56"}
kicker: Тема по логотипу
kicker.en: A theme from a logo
title: Цвета Flow
title.en: Flow's colours
body: Та же глава в цветах логотипа.
body.en: The same chapter in the logo's colours.
stills: b1.end :: акценты в цветах логотипа Flow

Вот та же глава в цветах логотипа Flow: малиновый акцент и тихий второй цвет вместо охры.

[en]
Here is the same chapter in the colours of the Flow logo: a crimson accent and a quiet second colour instead of ochre.

## c10-look · slides.beforeafter
image: assets/gen/look-off.ru.png
image.en: assets/gen/look-off.png
after: assets/gen/look-on.ru.png
after.en: assets/gen/look-on.png
labels: Без look | look: trailer
labels.en: No look | look: trailer
stills: 50% :: разделитель посередине, справа видны полосы и цветокоррекция

А look обрабатывает весь готовый ролик за один проход — цвет, виньетка, зерно и полосы; это инструмент трейлера, а демо продукта строят без него.

[en]
And look treats the whole finished film in one pass, colour, a vignette, grain and bars; it is a trailer's tool, and a product demo is built without it.

## c11-open · slides.chapter
part: Телефон
part.en: Phones
kicker: Телефон
kicker.en: Phones
title: Сделано для телефона
title.en: Made for a phone
body: format: vertical — и ролик 1080 × 1920, 30 кадров в секунду.
body.en: format: vertical, and the film is 1080 × 1920 at 30 frames a second.
transition: {"kind":"push","duration":0.7,"sound":"audio/sfx/whoosh.ogg","snap":"music"}

Одна строка шапки делает вертикальный ролик тысяча восемьдесят на тысяча девятьсот двадцать, тридцать кадров в секунду; такой берут Reels, Shorts, TikTok и VK Клипы.
~ Одна строка шапки делает вертикальный ролик тысяча восемьдесят на тысяча девятьсот двадцать, тридцать кадров в секунду; такой берут рилс, шортс, тикток и вэка клипы.

[en]
One header line makes a vertical film, ten eighty by nineteen twenty at thirty frames a second, the file Reels, Shorts, TikTok and VK Clips all take.

## c11-phone · video
file: captures/phone.ru.webm
file.en: captures/phone.webm
from: @start
to: @end
device: phone
stills: 50% :: телефон с резкой вёрсткой приложения во всю высоту | @done :: карточка ушла в «Готово» | @report :: отчёт на телефоне

Своё приложение лучше снимать в ширину телефона: вёрстка перестраивается сама, а запись с множителем плотности выходит резкой, во весь вертикальный кадр.

[en]
Your own app is best recorded at a phone's width: the layout reflows by itself, and a recording with a density scale comes out sharp, filling the vertical frame.

## c11-zones · page
focus: #platform @ b1 | #plain @ b2
page: pages/zones.ru.html
page.en: pages/zones.html
stills: b1.end :: зона ленты нарисована, кнопки справа и подпись внизу | b2.end-0.5 :: ровные поля plain

В ленте кнопки площадки закрывают правый край и низ, и всё читаемое уходит в безопасную зону.

А ролику для мессенджера или страницы достаются ровные поля: это одна настройка zone.

[en]
In a feed the platform's buttons cover the right edge and the bottom, so everything readable moves into the safe zone.

A film for a messenger or a page gets even margins instead: that is one zone setting.

## c11-reframe · page
spotlight: [{"target":".rf","at":"b1+0.3","pan":true,"ring":false,"dim":0}]
page: pages/reframe.ru.html
page.en: pages/reframe.html
stills: b1+2 :: окно 9:16 на горизонтальном кадре и вертикальный результат рядом

Горизонтальный сценарий становится вертикальным без переписывания: окно девять на шестнадцать идёт за фокусом и кликами, а слайды заново раскладываются в колонку.

[en]
A landscape scenario becomes vertical without a rewrite: a nine-by-sixteen window follows the focus and the clicks, and slides are laid out again as a column.

## c11-legible · page
spotlight: [{"target":".term pre","at":"b1+0.3","pan":true,"ring":false,"dim":0}]
page: pages/term-legibility.ru.html
page.en: pages/term-legibility.html
stills: b1.end :: строка про мелкий текст видна целиком

А сборка меряет текст каждого фокуса и называет поимённо всё, что на телефоне мельче сорока восьми пикселей.

[en]
And the build measures the text of every focus, and names everything a phone would show under forty-eight pixels.

## c12-open · slides.chapter
part: Проверки
part.en: Checks
kicker: Проверки
kicker.en: Checks
title: Проверено до того, как вы посмотрите
title.en: Checked before you watch
body: До сборки, во время неё и после.
body.en: Before the build, during it and after.
transition: {"kind":"push","duration":0.7,"sound":"audio/sfx/whoosh.ogg","snap":"music"}

Агент не отдаёт ролик на глаз: проверки идут до сборки, во время неё и после.

[en]
The agent does not hand over a film by eye: checks run before the build, during it and after.

## c12-lint · page
spotlight: [{"target":".term pre","at":"b1+0.3","pan":true,"scale":1,"ring":false,"dim":0},{"target":".term pre","at":"b2+0.3","pan":true,"scale":1,"ring":false,"dim":0},{"target":".term pre","at":"b3+0.3","pan":true,"scale":1,"ring":false,"dim":0}]
page: pages/term-lint.ru.html
page.en: pages/term-lint.html
stills: b2.end :: находки lint с именами правил | b3.end-0.3 :: пустой ответ для этого фильма

До сборки lint проверяет сценарий по двадцати правилам режиссуры и отдельно считает признаки шаблонного ролика.

Карточка поверх субтитров, стоящая страница, наезд, который обрежет предмет, дубль в чужой теме.

Для этого фильма ответ пустой.

[en]
Before the build, lint checks the scenario against twenty directing rules and counts the signs of a template film on the side.

A card over the subtitles, a page that stands still, a push-in that would crop its subject, a take in another theme.

For this film the answer is empty.

## c12-frames · slides.photo
image: assets/gen/frames-top.ru.png
image.en: assets/gen/frames-top.png
point: 0.3 0.35
push: 1 1.3
stills: b1.end :: лист кадров крупно, подписи сцен читаются

Команда frames рисует по кадру каждой сцены без сборки и без синтеза и называет кадр с пустой третью; это лист всего этого фильма.

[en]
The frames command draws a frame of every scene without a build and without synthesis, and names a frame with an empty third; this is the sheet of this whole film.

## c12-sheet · slides.parallax
image: assets/gen/sheet.ru.png
image.en: assets/gen/sheet.png
panels: 0.005 0 0.3 0.05 @ 0.6 | 0.25 0.05 0.25 0.28 @ 1 | 0.5 0.62 0.25 0.28 @ 0.8
stills: b1.end :: панели листа висят на своей глубине, секунды читаются

Лист сырого дубля показывает кадры с их секундами, чтобы куски выбирались из того, что действительно записано.

[en]
A raw take's sheet shows its frames with their seconds, so the pieces are chosen from what was really recorded.

## c12-stills · page
spotlight: [{"target":".grid","at":"b1+0.3","pan":true,"ring":false,"dim":0}]
page: pages/stills.ru.html
page.en: pages/stills.html
stills: b1.end :: контрольные кадры с заметками

Контрольные кадры агент называет в самом сценарии, с заметкой, что там проверить, и сборка кладёт их рядом с роликом.

[en]
The agent names control frames in the scenario itself, with a note of what to check there, and the build puts them beside the film.

## c12-report · page
spotlight: [{"target":".term pre","at":"b1+0.3","pan":true,"ring":false,"dim":0},{"target":".term pre","at":"b2+0.3","pan":true,"ring":false,"dim":0},{"target":".term pre","at":"b3+0.3","pan":true,"ring":false,"dim":0}]
page: pages/report-json.ru.html
page.en: pages/report-json.html
stills: b1.end :: отчёт по сценам виден | b2.end-0.5 :: предупреждения подсвечены

Отчёт сборки перечисляет каждую сцену: начало и конец, такты, наезды, лупы и места субтитров.

А всё, что пошло не так, — переполненный слайд, обрезанную строку, мелкий текст — он называет по имени сцены.

И последним агент смотрит ролик целиком: кадр в секунду рядом с субтитрами.

[en]
The build report lists every scene: its start and end, beats, push-ins, loupes and where the subtitles stood.

Whatever went wrong, an overflowing slide, a cut line, small text, it names by the scene.

And last of all the agent watches the whole film, a frame a second beside the subtitles.

## c13-open · slides.chapter
part: Знания
part.en: Knowledge
kicker: Знания
kicker.en: Knowledge
title: Агент знает ремесло
title.en: The agent knows the craft
body: База знаний, которую агент читает до первой строки сценария.
body.en: A knowledge base the agent reads before the first line of a scenario.
transition: {"kind":"push","duration":0.7,"sound":"audio/sfx/whoosh.ogg","snap":"music"}

Инструмент — половина дела; вторая половина — база знаний, которую агент читает до того, как напишет первую строку сценария.

[en]
The tool is half of it; the other half is a knowledge base the agent reads before it writes the first line of a scenario.

## c13-count · slides.counter
kicker: База знаний
kicker.en: The knowledge base
title: Правила и источники
title.en: Rules and sources
values: 65 :: правил режиссуры | 79 :: источников о жанрах | 64 :: источника о телефоне
note: docs/film-craft.md, scenario-playbook.md, vertical-video.md, 27 сентября 2026
note.en: docs/film-craft.md, scenario-playbook.md, vertical-video.md, September 27, 2026
values.en: 65 :: directing rules | 79 :: sources on genres | 64 :: sources on phones
stills: b1.end :: три числа докручены

Шестьдесят пять правил режиссуры, практика жанров по семидесяти девяти источникам и руководство для телефона по шестидесяти четырём.

[en]
Sixty-five directing rules, genre practice from seventy-nine sources, and a guide for phones from sixty-four.

## c13-craft · slides.quote
kicker: Правила оплачены неудачами
kicker.en: Rules paid for by failures
title: Замечания, после которых появились правила
title.en: The remarks that made the rules
parts: Правило 9 :: «Скучные статичные слайды — плохой вариант: всё должно быть живым» | Правило 16 :: «Какой смысл несут ваши подписи — нулевой»
parts.en: Rule 9 :: "Generating boring static slides is a bad option; everything must be alive" | Rule 16 :: "What meaning do your captions carry — zero"
note: перевод из docs/film-craft.md
note.en: quoted from docs/film-craft.md
stills: b1.end :: обе цитаты и подпись о переводе видны

Каждое правило оплачено неудачным роликом: рядом с ним записано замечание, после которого оно появилось.

Отсюда живые слайды, подписи о том, что на экране сейчас, и субтитры не мельче восьми процентов высоты кадра.

[en]
Every rule was paid for by a failed film: the remark that produced it is written beside it.

That is where living slides come from, captions about what is on screen now, and subtitles no smaller than eight percent of the frame's height.

## c13-rule · slides.compare
kicker: Правило 53
kicker.en: Rule 53
title: Двигать субтитры, а не подкладывать пустоту
title.en: Move the subtitles, never pad the content
left: Было (bad) :: серый блок под страницей | интерфейс обрезан
left.en: Before (bad) :: a grey block under the page | the interface cut off
right: Правило (good) :: субтитры переезжают наверх | весь кадр — экран продукта
right.en: The rule (good) :: the subtitles move to the top | the whole frame is the product's screen
stills: b1.end :: обе колонки видны

Вот правило пятьдесят три: когда субтитры закрывают интерфейс, двигают субтитры, а не подкладывают под страницу пустое место.

[en]
Here is rule fifty-three: when the subtitles cover the interface, move the subtitles, never pad the page with empty space.

## c13-look · slides.compare
kicker: Руководство по облику
kicker.en: The visual-design guide
title: Признаки шаблона и их лечение
title.en: Signs of a template and their cure
left: Шаблон (bad) :: градиент из двух цветов | кикер капителью над каждым слайдом | живой фон «для глубины» | конец на кнопке
left.en: Template (bad) :: a two-colour gradient | a capital kicker over every slide | a live background "for depth" | an ending on a button
right: Решение (good) :: один акцент | кикер строчными | фон, только когда он предмет | конец на результате
right.en: Cure (good) :: one accent | a sentence-case kicker | a background only when it is the subject | an ending on the result
stills: b1.end :: обе колонки видны целиком

Отдельное руководство по облику перечисляет признаки ролика, который выглядит сгенерированным, и их лечение.

Lint считает эти признаки в сценарии, и если их четыре или больше, ролик средний.

[en]
A separate visual-design guide lists the signs of a film that looks generated, and their cure.

Lint counts these signs in the scenario; four or more, and the film is average.

## c13-genres · slides.features
kicker: Жанры
kicker.en: Genres
title: У каждого жанра своя форма
title.en: Every genre has its shape
items: Питч :: порядок Sequoia | Демо :: победа за 30 секунд | Трейлер :: до 90 секунд | Объяснение :: четыре такта Wistia | Релиз :: обещание за 8 секунд | Короткое :: крючок за 1–3 секунды
items.en: Pitch :: the Sequoia order | Demo :: the win within 30 seconds | Trailer :: up to 90 seconds | Explainer :: Wistia's four beats | Release :: a promise within 8 seconds | Short :: a hook in 1–3 seconds
stills: b1.end :: шесть жанров видны

Для каждого жанра — своя форма из опубликованной практики и готовая заготовка сценария.

[en]
Every genre has its shape from published practice, and a ready skeleton scenario.

## c13-credits · page
focus: .q @ b1 | .c @ b2
page: pages/credits.ru.html
page.en: pages/credits.html
stills: b1.end :: три вопроса видны | b2.end-0.5 :: кредиты этого фильма видны

Перед каждым скачанным файлом агент отвечает на три вопроса: какая лицензия, нужен ли кредит и разрешено ли такое использование; не знает ответа — файл не берёт.

Музыка и звуки этого фильма записаны в CREDITS.md рядом со сценарием.

[en]
Before any downloaded file, the agent answers three questions: which licence, is credit required, is this use allowed; without an answer the file is not used.

The music and sounds of this film are credited in CREDITS.md beside the scenario.

## c14-open · slides.chapter
part: Выпуск
part.en: Delivery
kicker: Выпуск
kicker.en: Delivery
title: Готово к публикации
title.en: Ready to ship
body: Страница, README, субтитры и главы — из одного ролика.
body.en: A page, a README, subtitles and chapters from one film.
transition: {"kind":"push","duration":0.7,"sound":"audio/sfx/whoosh.ogg","snap":"music"}

Готовый ролик нужно ещё отдать: на страницу, в README или в чат, с субтитрами и главами.

[en]
A finished film still has to be delivered: to a page, a README or a chat, with subtitles and chapters.

## c14-web · page
spotlight: [{"target":".term pre","at":"b1+0.3","pan":true,"ring":false,"dim":0},{"target":".term pre","at":"b2+0.3","pan":true,"ring":false,"dim":0}]
page: pages/term-web.ru.html
page.en: pages/term-web.html
stills: b2.end :: три кодека с размерами и проверкой

Одна команда выпускает для страницы AV1, VP9 и H.264 с постером, главами и миниатюрами перемотки.
~ Одна команда выпускает для страницы эй-ви-один, ви-пи-девять и аш-двести шестьдесят четыре с постером, главами и миниатюрами перемотки.

И проверяет каждый файл: кодек, размер кадра, длительность и сходство кадров с оригиналом.

[en]
One command makes AV1, VP9 and H.264 for a page, with a poster, chapters and seek thumbnails.

And it checks every file: codec, frame size, duration and frame similarity to the original.

## c14-gif · video
file: assets/gen/demo.ru.gif
file.en: assets/gen/demo.gif
device: frame
stills: 50% :: GIF в окне

А для README или чата — зацикленный GIF.

[en]
And for a README or a chat, a looping GIF.

## c14-poster · slides.perspective
image: assets/gen/poster.ru.jpg
image.en: assets/gen/poster.jpg
stills: b1.end :: постер на экране в перспективе

Постер — кадр, который страница покажет до нажатия на воспроизведение.

[en]
The poster is the frame a page shows before anyone presses play.

## c14-files · page
spotlight: [{"target":".files","at":"b1+0.3","pan":true,"ring":false,"dim":0}]
page: pages/files.ru.html
page.en: pages/files.html
stills: b1.end :: SRT и главы WebVTT читаются

Субтитры SRT и главы WebVTT сборка кладёт рядом с роликом сама.

[en]
The build puts SRT subtitles and WebVTT chapters beside the film by itself.

## c14-landing · slides.shot
kicker: Лендинг
kicker.en: The landing
title: Главы этого фильма станут примерами
title.en: This film's chapters become examples
image: assets/gen/landing-full.png
device: browser agentic-screencast.witqq.dev
stills: 30% :: лендинг в окне браузера | b1.end :: страница прокрутилась

Главы этого фильма станут примерами на лендинге инструмента.

[en]
This film's chapters will become the examples on the tool's landing page.

## c14-ask · page
focus: .bubble @ b1 | .next @ b2
page: pages/request.ru.html
page.en: pages/request.html
stills: b1.end :: текст просьбы читается целиком

Чтобы начать, попросите своего агента поставить скилл Agentic Screencast из репозитория и снять по нему минутный ролик о вашем продукте.

Он начнёт с брифа, заготовки жанра и бесплатного немого черновика.

[en]
To start, ask your agent to install the Agentic Screencast skill from the repository and use it to make a one-minute film about your product.

It starts with the brief, a genre skeleton and a free silent draft.

## c14-credits · slides.outro
kicker: Agentic Screencast
kicker.en: Agentic Screencast
title: Музыка и звуки
title.en: Music and sounds
body: Музыка: «Inspired», «Exciting Trailer», «Discovery Hit» — Kevin MacLeod (incompetech.com), CC BY 4.0 · Звуки: Kenney, CC0 · Анимированный эмодзи: Noto Emoji, Google, CC BY 4.0
body.en: Music: “Inspired”, “Exciting Trailer”, “Discovery Hit” — Kevin MacLeod (incompetech.com), CC BY 4.0 · Sounds: Kenney, CC0 · Animated emoji: Noto Emoji, Google, CC BY 4.0
stills: b1.end :: строка кредитов видна целиком

Музыка — Кевин Маклауд, звуки — Кенни; полный список лежит в CREDITS.md рядом со сценарием.

[en]
The music is by Kevin MacLeod and the sounds by Kenney; the full list is in CREDITS.md beside the scenario.

## c14-bookend · page
page: pages/split.ru.html
page.en: pages/split.html
focus: #frame @ b1
stills: b1+1 :: файл слева, кадр справа

Один текстовый файл — и проверенный фильм о вашем продукте.

[en]
One text file, and a checked film about your product.

## c14-end · slides.outro
image: assets/gen/split-frame.ru.png
image.en: assets/gen/split-frame.png
title: Снимите первый ролик
title.en: Make your first film
cta: npm i -g agentic-screencast
cta.en: npm i -g agentic-screencast
url: agentic-screencast.witqq.dev
stills: b1.end :: короткая строка и кнопка над кадром результата

Поставьте Agentic Screencast и попросите агента снять первый ролик.

[en]
Install Agentic Screencast and ask your agent to make its first film.
