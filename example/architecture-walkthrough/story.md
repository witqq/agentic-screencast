# Как слово превращается в изменение кадра
lang: ru
theme: midnight
scheme: dark
voice: {"engine":"stub","name":"silent","cps":19}
frame: {"width":1600,"height":900,"fps":24,"scale":1}
captions: {"style":"subtitle","look":"plate","everywhere":true,"srt":true,"size":0.85}
flow: auto
tail: 0.5

## copy · report
report: reports/architecture-walkthrough.md
target: [data-composition-id="copy-runtime"]
mustRead: [data-composition-object="shape"]
zoom: 1
spotFrom: 999s
fade: none
stills: b1+0.7 :: Копия движется | b3+1 :: Тень получателя изменилась, оригинал сохранён

Копия прибывает к получателю, а оригинал остаётся на месте. Это действие настоящего рантайма Report: функция compositionFrame вычисляет состояние момента.

После прибытия функция присваивает получателю content источника. Выделены именно строки этой операции. Содержимое берётся из исходного шаблона, а браузер клонирует его для получателя.

Теперь меняется только тень получателя. Его название сохраняется, поэтому видно, кто получил новый текст и чей оригинал остался прежним.

У transfer другая семантика: последняя выделенная строка опустошает источник. Значит, для уведомления в очереди нужен transfer, а для сохранения исходного шаблона нужен copy.

## layers · report
report: reports/architecture-walkthrough.md
target: [data-composition-id="runtime-layers"]
mustRead: [data-composition-object="view"]
zoom: 1
spotFrom: 999s
fade: none
transition: push 0.5 left
stills: b3+1 :: Возвращённый frame применяется к DOM и SVG

Посмотрим на вызовы. Часы страницы передают время подписанному timed. Тот вызывает render, а render передаёт секунды чистой функции compositionFrame.

Её четыре аргумента — имена объектов, список cues, время и функция разрешения якорей. Возвращается новый frame: Map состояний, связи и текущие полёты.

Браузерный слой применяет этот результат. content клонирует шаблон, replaceChildren меняет тело объекта. rect читает текущие размеры, а connectionRoute строит SVG между границами.

Здесь два владельца: функция владеет новым состоянием кадра; браузер — шаблонами и живыми элементами. Расчёт состояния не изменяет исходные cues и не обращается к DOM.

## seek · report
report: reports/architecture-walkthrough.md
target: [data-composition-id="reconstruct"]
mustRead: [data-composition-object="earlier"]
zoom: 1
spotFrom: 999s
fade: none
transition: zoom 0.5
stills: b3+1 :: Ранний frame восстановлен из исходника

На четвёртой секунде правка уже выполнена: content получателя содержит новый текст. Но что случится, если снять кадр нулевой секунды после него?

При новом вызове создаётся новая Map. Она начинает с ссылки на исходный шаблон каждого объекта. В цикле будущие cues пропускаются: время ещё не дошло до них.

Справа результат реального вызова для нулевой секунды: исходный content, без полётов. Это другой объект Map, а не позднее состояние, которое попытались исправить обратно.

Поэтому функцию изменения состояния ищем в src/composition.ts. Клонирование содержимого и рисование связей — в browser/features/composition.ts. Перемотка не требует обратной команды для каждой правки.

## speech · report
report: reports/architecture-walkthrough.md
target: [data-composition-id="speech-clock"]
mustRead: [data-composition-object="frame"]
zoom: 1
spotFrom: 999s
fade: none
transition: push 0.5 left
stills: b2+1 :: Связь появилась вместе со вторым абзацем | b3+1 :: Крепление обновлено после изменения высоты

Остаётся связать действие со словами. Screencast знает измеренное начало каждого абзаца. Мост installReportComposition переводит b2 во время второго абзаца.

Вот начался второй абзац — и рисуется вторая связь. Выделенный bind отдаёт Report функцию resolve: она возвращает рассчитанное время якоря. Это не трёхсекундный демонстрационный таймер.

А теперь тело объекта стало длиннее. Браузер снова измеряет rect, поэтому конец стрелки следует за новой границей. Изменение размера и событие resize используют тот же render, а не сохранённые старые координаты.

Для нового действия правьте композиционную модель; для нового рисунка — браузерный слой; для связи с речью — report-composition.ts в Screencast. Исходники и воспроизводимые значения приложены рядом с фильмом.
