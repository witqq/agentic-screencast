# Directed explanation
lang: en
theme: neutral
scheme: light
voice: {"engine":"stub","name":"silent","cps":25}
frame: {"width":1280,"height":720,"fps":15,"scale":1}
captions: {"style":"subtitle","everywhere":true,"size":0.8}
flow: auto
tail: 0.8

## route · slides.chain
title: A change travels to its consumer.
nodes: Model | Microtask | Consumer
at: 0s 0.3s 0.6s
enter: tilt3d
spotlight: {"target":".chain .el:nth-child(2) .node","at":"1s","scale":1.1,"ring":false,"dim":0,"move":0.7,"keep":true}
ease: emphasized
duration: 3
fade: none

A recorded change travels through the queue to its consumer.

## event · report
report: reports/change-event/report.md
target: [data-composition-id="change-event"]
mustRead: [data-composition-object="consumer"]
zoom: 1
spotFrom: 999s
fade: none
transition: push 0.6 left
stills: b4+0.8 :: The consumer receives the change after the queue boundary

The command records a new value on the shape.

The reaction schedules delivery after the model change.

The queued notification moves to the visual-change consumer.

Receiving this event does not by itself implement an effect renderer.
