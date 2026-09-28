# A scenario with directing mistakes
lang: en
voice: {"engine":"stub","name":"silent","cps":15}
captions: {"style":"bar","position":"top"}
progress: {"position":"top","parts":true}

## open · page
page: still.html
transition: cube 0.8

A page that never moves stands on screen for the whole of this sentence, and nothing in the frame changes while it is read.

## live · video
file: ../captures/board.webm
from: @added
to: @done
overlay: {"titles":[{"at":1,"text":"Our board","position":"top","hold":3}],"cards":[{"at":"b1+0.5","title":"A card","body":"over the running caption","position":"top-right"}]}

The task moves to Done while a card and a title compete with this caption.

## long · slides.chapter
title: One slide that talks too long
body: Everything at once.

This slide keeps talking far longer than anyone can look at a single frame, because the author put the whole explanation into one scene instead of splitting it across several, and every extra sentence makes the viewer wait for something to change. It goes on about the build, the voice, the pages and the checks, and it still has not stopped, and it keeps adding one more clause after another until the scene runs well past half a minute.
