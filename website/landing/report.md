---
contractVersion: 1
title: Agentic Screencast — your agent makes the product film
description: Give an AI agent the product and the point. It writes a scenario, films the real interface with real clicks and hands you a finished MP4, rebuilt from one text file.
language: en
localizations:
  ru: report.ru.md
theme: dark
layout: mixed
preset: cinematic
scrollProgress: true
tokens:
  accent: teal
  width: wide
  radius: round
---

# Your agent makes the product film.

**Give an AI agent the product and the point. It writes the scenario, films the real interface with real clicks and hands you a finished MP4 — rebuilt from one text file.**

::::actions{placement="inline"}
::action[Give it to your agent]{href="#start" kind="primary" effect="magnetic"}
::action[Watch the films]{href="#films" kind="secondary"}
::::

::video{src="media/showcase.en.mp4" poster="media/showcase.en.jpg" caption="Made by the tool: slides that move, live backgrounds and phrases that assemble word by word."}

::::::section{title="What comes out" id="films" nav="Films"}
:::lead
Each clip was built by Agentic Screencast from a scenario file, with no video editor involved.
:::

::::cards
:::card{title="A real product, clicked for real"}
::video{src="media/live.en.mp4" poster="media/live.en.jpg" caption="The take pushes in while typing and holds the moment a card lands in Done."}
:::
:::card{title="Attention in one line"}
::video{src="media/focus.en.mp4" poster="media/focus.en.jpg" caption="The camera travels from number to chart and stops time at the peak."}
:::
:::card{title="Cuts and sound"}
::video{src="media/cuts.en.mp4" poster="media/cuts.en.jpg" caption="WebGL transitions between scenes; music ducks under the narration."}
:::
:::card{title="Text that types in place"}
::video{src="media/text.en.mp4" poster="media/text.en.jpg" caption="Every glyph lands where the finished line will hold it; titles, lower thirds and karaoke subtitles."}
:::
:::card{title="Charts from a CSV"}
::video{src="media/charts.en.mp4" poster="media/charts.en.jpg" caption="Bars grow one after another and the peak lights up; the Russian film reads its own CSV."}
:::
:::card{title="Effects that point the eye"}
::video{src="media/effects.en.mp4" poster="media/effects.en.jpg" caption="A circle, an arrow and an underline draw themselves, a glint and confetti mark success, a loupe holds the peak."}
:::
::::
::::::

::::::section{title="Vertical in one line" id="vertical" nav="Vertical"}
:::lead
`format: vertical` turns the same scenario into a 9:16 short: slides reflow into a column, and karaoke subtitles, cards and stickers stay inside the safe zone of Reels, TikTok and Shorts.
:::

::::cards
:::card{title="Built vertical"}
::video{src="media/reel.en.mp4" poster="media/reel.en.jpg" caption="A 1080×1920 short, shown as built."}
:::
:::card{title="Or cut from a landscape film"}
`agentic-screencast build story.md --format vertical` makes a landscape scenario vertical without a rewrite: slides are drawn anew in portrait, and pages and clips are cut by a 9:16 window that follows the spotlight and the clicks at full resolution.
:::
::::
::::::

::::::section{title="How a film gets made" id="how" nav="How"}
:::steps{title="Three moves"}

1. **Write one scenario.** Prose is the narration — each paragraph is a beat with its own take and length — and each scene names what is on screen.
2. **Film the real product.** The Playwright capture API clicks, types and pushes in on the live page while recording, and names moments the scenario can refer to.
3. **Build and check.** One command renders, voices and assembles the MP4; the tool checks every frame for readable text and shows a sheet of frames before a build.
:::

```markdown
# a scene of the film
## done · video
file: captures/board.webm
spotlight: {"area":[0.66,0.2,0.32,0.46],"at":"@done","slow":"stop","card":{"title":"Moved by a real click"}}

The card lands in Done — the camera holds it.
```
::::::

::::::section{title="What is in the kit" id="kit" nav="Kit"}
::::cards
:::card{title="Slides that move"}
Twenty slide kinds — hero, steps, features, timeline, counter, a chart from a CSV, before and after, parallax, a screen in perspective, code, photo, device shot, outro, a trailer card, a title card and the classic five — on live WebGL backgrounds, with fourteen ways to assemble a phrase.
:::
:::card{title="Attention on the real UI"}
`spotlight` pushes in and dims the rest in one line, `autoZoom` follows the recorded clicks, and `device` frames a clip in a browser or a phone.
:::
:::card{title="Cuts and sound"}
Twelve WebGL transitions between scenes and a morph that carries one element to its new place; cuts land on the music's beat, which the build finds by itself; music ducks under every beat of speech, and the mix is normalised to −14 LUFS.
:::
:::card{title="Effects that point the eye"}
Marks that draw themselves, a glint across a card, seeded confetti and sparks at the moment of success, and a loupe that magnifies a detail while the camera stands — each is one line of the scenario.
:::
:::card{title="Every language from one file"}
Translations sit beside the original lines; `agentic-screencast build --lang ru` builds the Russian film from the same montage, and `agentic-screencast lint --lang ru` names every visible line left untranslated.
:::
:::card{title="Ready for a web page"}
`agentic-screencast web` writes the film as AV1, VP9 and H.264 with a poster, chapters and seek thumbnails, checks every copy against the film, and prints the video tag for the page.
:::
:::card{title="Your voice, or none yet"}
Record the narration yourself with `agentic-screencast record`, synthesise it, or draft for free with the `stub` voice: silence of the right length, no network, no bill.
:::
:::card{title="A look, not a pile of colours"}
Eleven themes — neutral by default, frost, midnight, calm-paper, daylight, noir, aurora, ember, blueprint and the genre themes synthwave and blockbuster — a theme from your brand colours, any part of the film in its own theme with `theme` on a scene, and a film look with grade, vignette and grain.
:::
:::card{title="Checked before you watch"}
`frames` shows a frame of every scene without a build, `lint` catches two text layers at once, `check` and `verify` judge readability and reproducibility.
:::
::::
::::::

::::::section{title="Your agent's first film" id="start" nav="Start"}
:::lead
Ask the agent to explain a product to a named audience, in a chosen language and length. Start from a genre skeleton and a free silent draft.
:::

```sh
# install
npm i -D agentic-screencast
npx playwright install \
  chromium
# a skeleton and a draft
npx agentic-screencast \
  new product-demo
npx agentic-screencast \
  build --out draft.mp4
```

The skeleton uses the free `stub` voice, so the first draft costs nothing. Look at `npx agentic-screencast frames` before the build and at the MP4 after it.

::::actions{placement="inline"}
::action[Read the guide]{href="https://github.com/witqq/agentic-screencast#readme" kind="primary"}
::action[See a complete example]{href="https://github.com/witqq/agentic-screencast/blob/main/example/agent-video.md" kind="secondary"}
::action[View the source]{href="https://github.com/witqq/agentic-screencast" kind="secondary"}
::::
::::::

::::::section{title="Boundaries" id="boundaries" nav="Boundaries"}
:::disclosure{title="What the tool does not promise" open="false"}
It records browsers driven by Playwright, not the desktop or other applications. It does not choose a voice for you, judge whether a script persuades, or publish a film on your behalf.
:::

:::disclosure{title="Where credentials belong" open="false"}
Voice and capture credentials come from environment variables or an ignored `.env`, never from scenario voice data: that data takes part in cache identity and build reports.
:::

Agentic Screencast is licensed under GPL-3.0-or-later because its runtime dependency includes GPL ffmpeg. No music or sound effects ship with it; the sound guide says where to find free ones and how to credit them.
::::::
