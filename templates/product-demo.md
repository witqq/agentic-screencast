# Demo: <product> solves <problem>
lang: en
voice: {"engine":"stub","name":"silent","cps":15}
captions: {"style":"subtitle","look":"plate"}
flow: auto

## situation · slides.hero
kicker: The situation
title: <The problem the viewer recognises, named over a real frame of the product>
body: <Who faces it and when.>
image: pages/result.svg
move: dolly
duration: 5

## win · page
page: pages/live-shot.html
spotlight: .card b @ 1s
overlay: {"glints":[{"at":3.5,"target":".card b"}]}
duration: 8

<The win first: open on the finished result so a viewer who leaves early still understands the value.>

## how · page
page: pages/live-shot.html
spotlight: .card b @ 5s
overlay: {"pointer":[{"at":0.5,"x":0.25,"y":0.8},{"at":2.2,"x":0.5,"y":0.62,"magnet":".card code","click":true}],"toasts":[{"at":2.7,"icon":"✅","title":"<What the click did>","hold":2.5}]}
duration: 10

<One scenario end to end. Show the input that led to the result, not only the result.>

<After each action answer "so what?" with the user's gain, never the feature name.>

## benefit · slides.compare
kicker: So what
title: <The benefit in the ==user's== words>
left: Before (bad) :: <step it took before> | <time it cost>
right: With <product> (good) :: <what the user does now>
at: b1 b1

<Say the gain once, plainly.>

## next · slides.outro
kicker: Next step
title: <One concrete action that follows from what was seen>
body: <Where to go and what they will get there.>
cta: <the action>
url: <product address>
image: pages/result.svg
duration: 5
