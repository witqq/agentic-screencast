# Demo: <product> solves <problem>
lang: en
voice: {"engine":"stub","name":"silent","cps":15}
captions: {"style":"subtitle","look":"plate"}

## situation · slides.hero
kicker: The situation
title: <The problem the viewer recognises, named over a real frame of the product>
body: <Who faces it and when.>
image: pages/result.svg
duration: 5

## win · page
page: pages/live-shot.html
spotlight: .card b @ 1s
transition: dissolve
duration: 8

<The win first: open on the finished result so a viewer who leaves early still understands the value.>

## how · page
page: pages/live-shot.html
transition: push
spotlight: .card b @ 1s | .card code @ 5s
duration: 10

<One scenario end to end. Show the input that led to the result, not only the result.>

<After each action answer "so what?" with the user's gain, never the feature name.>

## benefit · slides.compare
kicker: So what
title: <The benefit in the user's words>
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
