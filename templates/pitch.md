# Pitch: <company in one sentence>
lang: en
voice: {"engine":"stub","name":"silent","cps":15}
captions: {"style":"subtitle","look":"plate","everywhere":true}
flow: auto

## purpose · slides.hero
kicker: <Company>
title: <What the company does, in one ==declarative== sentence>
body: <Who it serves and the change it makes for them.>
image: pages/result.svg
text: blur
move: dolly
duration: 6

## problem · slides.compare
kicker: The problem today
title: <The customer's pain: ~~how it is~~ and what could be>
left: Today (bad) :: <how they cope now> | <what it costs them>
right: What could be (good) :: <the outcome they want>
at: b1 b1 b2

<Act one: the audience is the hero. Name their current reality and the conflict in one sentence.>

<Contrast: what could be instead. Keep "what is" and "what could be" alternating through the film.>

## solution · page
page: pages/live-shot.html
spotlight: .card b @ 1s
overlay: {"pointer":[{"at":0.4,"x":0.3,"y":0.8},{"at":2.6,"x":0.5,"y":0.62,"magnet":".card code","click":true}],"boops":[{"at":2.6,"target":".card code","kind":"pop"}]}
duration: 8

## why-now · slides.chain
kicker: Why now
title: <The shift that makes this possible now>
nodes: <trend one> | <trend two> | <our product> (acc)
at: b1 b1 b1

<One sentence per trend, ending on why the product fits this moment.>

## traction · slides.counter
kicker: Proof
title: <The one number that proves demand>
values: 100 :: <what it measures> | 25% :: <what it measures>
spark: 20 35 50 70 100 | 5 9 14 20 25
pace: calm
note: <where the numbers come from>, <month> <2026>

<Take the numbers from the source, never estimate them on screen.>

## ask · slides.outro
kicker: The ask
title: <One clear next step for the audience>
body: <What happens after they say yes.>
cta: <the action>
url: <where to reach you>
image: pages/result.svg
duration: 6
