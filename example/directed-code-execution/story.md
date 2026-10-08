# Адрес значения и строки исходника
lang: ru
voice: {"engine":"stub","name":"silent","cps":15}
pronounce: {"say":{"compositionAddress":"композишн адрес","compositionLineLabel":"композишн лайн лейбл","local":"локал","value":"вэлью"}}
theme: midnight
scheme: dark
captions: {"style":"subtitle","everywhere":true,"srt":true}

## address · report
report: report.md
target: [data-composition-id="address"]
zoom: 1
spotFrom: 999s
captions: top
fade: none
spotlight: [{"target":"[data-composition-id=address] [data-composition-object=code] pre .line:nth-child(2)","at":"b2","until":"b2.end-0.8","scale":3,"move":1.2,"pan":true,"ring":false,"dim":0}]
stills: b2+1 :: метод и пояснение | b3+1.7 :: результат

Группа слева показывает вход и результат. Справа находится настоящий метод compositionAddress из исходника инструмента.

Метод проверяет наличие слота. Если слот задан, он соединяет имя владельца local и имя значения value через двоеточие.

В результате получается local:value. Световой проход связывает метод с его результатом, затем внимание переходит к значению.
~ В результате получается локал, двоеточие, вэлью. Световой проход связывает метод с его результатом, затем внимание переходит к значению.

## source-lines · report
report: report.md
target: [data-composition-id="source-lines"]
zoom: 1
spotFrom: 999s
captions: top
transition: push 0.5 up
spotlight: [{"target":"[data-composition-id=source-lines] [data-composition-object=code] pre .line:nth-child(8)","at":"b2","until":"b2.end-0.8","scale":3,"move":1.2,"pan":true,"ring":false,"dim":0}]
stills: b2+1 :: операция пересчёта | b3+1.7 :: строки исходника

Для длинного метода нужна другая компоновка. Вход и результат находятся в одной группе, а настоящий compositionLineLabel занимает широкую строку ниже.

Во время чтения операции смотрим на код. Метод прибавляет номер начала фрагмента и вычитает единицу из каждого относительного номера строки.

Теперь смотрим на результат. Относительные строки два, три, четыре и семь при начале фрагмента сорок один дают строки сорок два, сорок три, сорок четыре и сорок семь.

Пояснение указывает реальные строки исходника. Код сохраняет точные имена, а голос произносит подготовленный русский вариант.
