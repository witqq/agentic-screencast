# Trailer: <product>
lang: en
look: trailer
voice: {"engine":"stub","name":"silent","cps":15}

## cold-open · page
page: pages/live-shot.html
spotlight: [{"target":".card b","at":"0.4s","ring":false,"dim":0,"scale":1.3,"keep":true,"style":"gentle"}]
duration: 3.5

## card-1 · slides.card
title: <TWO WORDS>
transition: cut
duration: 1.6

## show-1 · page
page: pages/live-shot.html
transition: cut
duration: 4

## card-2 · slides.card
title: <THREE MORE WORDS>
fill: pages/result.svg
transition: cut
duration: 1.6

## show-2 · page
page: pages/live-shot.html
transition: cut
duration: 4

## climax · page
page: pages/live-shot.html
transition: dip 0.4 white
spotlight: [{"target":".card b","at":"1s","style":"snappy","ring":false,"dim":0}]
duration: 5

## title · slides.titlecard
kicker: <COMING SOON>
title: <Product>
body: <Where to get it>
transition: dip 0.8 black
duration: 4

## button · page
page: pages/live-shot.html
transition: cut
duration: 2
