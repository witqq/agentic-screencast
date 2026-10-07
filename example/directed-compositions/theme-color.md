# Directed explanation
lang: en
theme: midnight
scheme: dark
voice: {"engine":"stub","name":"silent","cps":25}
frame: {"width":1280,"height":720,"fps":15,"scale":1}
captions: {"style":"subtitle","everywhere":true,"size":0.8}
flow: auto
tail: 0.8

## question · slides.shot
title: A color is more than RGB.
image: assets/theme-color.png
text: rise
move: dolly
device: frame
duration: 3
fade: none

## colors · report
report: reports/theme-color/report.md
target: [data-composition-id="theme-color"]
mustRead: [data-composition-object="source"]
zoom: 1
spotFrom: 999s
fade: none
transition: push 0.6 left
stills: b4+0.7 :: Reading and editing have different color values

The recipe stores a reference to a palette color.

Drawing resolves that reference to the current RGB value.

Editing expands the recipe while preserving the palette reference.

These results serve different jobs. Keep both paths visible.
