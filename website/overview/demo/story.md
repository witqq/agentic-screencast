# Пример: доска Flow
title.en: Sample: the Flow board
lang: ru
voice: {"engine":"stub","name":"silent","cps":15}
voice.en: {"engine":"stub","name":"silent","cps":15}
captions: {"style":"karaoke","everywhere":true,"srt":true}
progress: {"position":"bottom","parts":true}

## open · slides.hero
part: Начало
part.en: Opening
kicker: Пример ролика
kicker.en: A sample film
title: Доска задач за полминуты
title.en: A task board in half a minute
body: Четыре сцены, собранные одной командой на немом черновике.
body.en: Four scenes built by one command on a silent draft.
stills: b1.end :: заголовок и текст целиком

Это пример ролика: четыре сцены, собранные одной командой.

[en]
This is a sample film: four scenes built by one command.

## live · video
part: Доска
part.en: The board
file: ../captures/board.ru.webm
file.en: ../captures/board.webm
from: @added
to: @keys
spotlight: {"area":"@done","at":"b2","scale":1.5}
stills: @done :: карточка легла в «Готово» | b2+1 :: наезд на перенесённую карточку

Задача набрана, и кнопка «Готово» переносит её в последнюю колонку.

Камера наезжает на перенесённую карточку.

[en]
The task is typed, and the Done button moves it to the last column.

The camera pushes in on the card that moved.

## report · page
part: Отчёт
part.en: The report
page: ../app/report.ru.html
page.en: ../app/report.html
spotlight: #activity @ b1
stills: b1+1.5 :: таблица изменений в фокусе

Отчёт показывает, что изменилось за спринт.

[en]
The report shows what changed during the sprint.

## end · slides.outro
title: Конец примера
title.en: The end of the sample
body: Собрано командой build на голосе stub.
body.en: Built by the build command on the stub voice.
cta: agentic-screencast build
cta.en: agentic-screencast build
stills: b1.end :: кнопка видна

Конец примера.

[en]
The end of the sample.
