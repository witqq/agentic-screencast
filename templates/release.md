# What's new: <release name>
lang: en
voice: {"engine":"stub","name":"silent","cps":15}
flow: auto

## promise · slides.hero
kicker: New in <product>
title: <The user's new capability, not the internal feature name>
body: <Who it is for and what changes for them.>
image: pages/result.svg
text: fly
move: dolly
duration: 5

## whats-new · slides.compare
kicker: In this release
title: <What changed: ~~the old way~~ ==the new way==>
left: Before :: <what the user had to do> | <what it cost>
right: Now (good) :: <what the user does now> | <what it saves>
at: b1 b2

<What the user had to do before, in one sentence.>

<What they do now, and what it saves them.>

## before · page
page: pages/live-shot.html
duration: 5

<The input: what the user had to do before, visible on screen.>

## after · page
page: pages/live-shot.html
spotlight: .card b @ 3.5s
overlay: {"pointer":[{"at":0.4,"x":0.3,"y":0.8},{"at":1.8,"x":0.5,"y":0.62,"click":true}],"boops":[{"at":1.8,"target":".card code","kind":"pop"}],"toasts":[{"at":2.3,"icon":"✨","title":"<What the new capability did>","hold":2.4}]}
duration: 7

<The proof: the same task now, with the result visible. Take any number from the recording.>

## where · slides.outro
kicker: Try it
title: <Where to find it>
body: <One action to take now, and where the help lives.>
cta: <the action>
url: <where the help lives>
image: pages/result.svg
duration: 5
