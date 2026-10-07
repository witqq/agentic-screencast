# Directed explanation
lang: en
theme: blueprint
scheme: light
voice: {"engine":"stub","name":"silent","cps":25}
frame: {"width":1280,"height":720,"fps":15,"scale":1}
captions: {"style":"subtitle","everywhere":true,"size":0.8}
flow: auto
tail: 0.8

## view · slides.perspective
title: Keep the glow. Change the shadow.
image: assets/first-edit.png
text: blur
pace: calm
fade: none
duration: 3

## edit · report
report: reports/first-edit/report.md
target: [data-composition-id="first-edit"]
mustRead: [data-composition-object="shape"]
zoom: 1
spotFrom: 999s
fade: none
transition: zoom 0.6
stills: b3+0.8 :: Shape holds the edited value

The shape starts with effects inherited from the layout.

The first edit copies the complete list to the shape.

Only the shadow changes. The glow remains in that list.

The layout keeps its original value. The shape now owns its edit.
