---
contractVersion: 1
title: Agentic Screencast — your agent makes the product film
description: One scenario lets your agent film a real product, direct the viewer's attention and check the finished MP4 against documented rules.
language: en
localizations:
  ru: report.ru.md
scheme: light
layout: landing
progress: page
theme:
  extends: calm-paper
  accent: teal
  width: wide
  radius: sharp
---

# Your agent makes the product film.

**Give the agent a product and a point to make. It writes one scenario, records the working interface, builds the MP4 and checks the result against directing rules.**

::::actions{placement="inline"}
::action[Make your first film]{href="#start" kind="primary"}
::action[See the evidence]{href="#films" kind="secondary"}
::::

::video{src="media/showcase.en.landscape.mp4" poster="media/showcase.en.landscape.jpg" caption="The silent opening excerpt begins on a real recording of the sample app."}

::::::section{title="A real product, clicked for real" id="films" nav="Live product"}
:::lead
The agent drives a working browser app through Playwright. The recording keeps the real cursor path, clicks, typing and named moments that the scenario can reuse.
:::

::video{src="media/live.en.landscape.mp4" poster="media/live.en.landscape.jpg" caption="The sample task board responds to recorded typing and clicks while the camera follows the action."}

The cursor changes shape over a control, the camera follows recorded actions, and a named mark keeps the same result available to another scene. The example is a sample app made for filming, labelled as such in the recording.
::::::

::::::section{title="The camera knows where to look" id="attention" nav="Attention"}
:::lead
A line of the scenario names the subject when the narration reaches it. The camera moves from the whole screen to that element and can travel to the next without losing the interface around it.
:::

::video{src="media/focus.en.landscape.mp4" poster="media/focus.en.landscape.jpg" caption="The camera directs attention from a report metric to a chart peak and a task row."}

`spotlight` can dim everything else, read a wide row along its length, or leave the camera wide and highlight one number. A loupe, hand-drawn mark or held frame serves a different kind of detail; the film chooses the one the viewer needs.
::::::

::::::section{title="Slides that never stand still" id="slides" nav="Slides"}
:::lead
31 slide kinds give different evidence its own form; a slide is drawn at the scene's time, so a frame can be reproduced.
:::

::::cards
:::card{title="A sequence"}
Steps enter with their spoken beats; a timeline draws toward each stop.
:::
:::card{title="A measurement"}
A chart reads CSV data and highlights its peak; a counter lands on a sourced number.
:::
:::card{title="A mechanism or a change"}
Code types in place and a chain draws the hand-off from scenario to MP4; before-and-after images share one divider, and a saved page can respond to the scene clock.
:::
::::

19 ways to assemble a phrase are available when the phrase itself is the subject. The other words stay still long enough to read.
::::::

::::::section{title="Words stay readable" id="text" nav="Text"}
Karaoke subtitles follow speech. On a busy interface the author can choose a dense plate; when the lower band contains the subject, subtitles move to the top or the build finds a less occupied band. Titles, lower thirds and callouts are placed at the moment they explain, with the named control protected from overlap.

The examples on this page play silently; their captions carry the point without requiring a speaker. Full films can include narration and an SRT subtitle file.
::::::

::::::section{title="Cuts, sound and a voice" id="sound" nav="Sound"}
:::steps{title="The soundtrack follows the words"}

1. **Cut with purpose.** 17 WebGL transitions are available; a morph carries a visible element into the next scene, while a hard cut or dip serves a trailer.
2. **Give speech room.** In a voiced film, music ducks under each measured beat, can change by chapter and can stop before a title. The mix targets −14 LUFS, and the finished AAC is checked against a −1 dBTP true-peak ceiling.
3. **Choose the voice.** SpeechKit, a recorded voice or a local engine can narrate. The free `stub` gives a silent draft its planned timing without a network call.

:::
::::::

::::::section{title="A trailer, too" id="trailer" nav="Trailer"}
The same scenario language can make a short trailer: one-to-three-word cards, a flash on an impact, hard cuts and a pause before the title. The [overview scenario's trailer chapter](https://github.com/witqq/agentic-screencast/blob/main/website/overview/story.md) is a concrete example; the landing does not need another long video to explain it.
::::::

::::::section{title="A look that belongs to the film" id="look" nav="Look"}
Twelve themes style the slides and everything drawn over them: neutral, frost, midnight, calm-paper, daylight, noir, aurora, ember, blueprint, synthwave, terminal and blockbuster; every one but blockbuster has a light and a dark scheme with the same colours as agentic-report. The default neutral theme keeps the material in front. A logo can supply brand colours, and a trailer can use a different theme without restyling the whole film.

The [visual-design guide](https://github.com/witqq/agentic-screencast/blob/main/docs/visual-design.md) explains the type, colour and composition choices; the scenario linter counts signs of a template film before a build.
::::::

::::::section{title="Made for a phone" id="vertical" nav="Phone"}
:::lead
`format: vertical` makes a 1080×1920 film at 30 frames a second. The camera follows the relevant part of a wide capture; slides can reflow and a page can provide a separate portrait layout.
:::

::video{src="media/reel.en.vertical.mp4" poster="media/reel.en.vertical.jpg" caption="A silent 1080×1920 excerpt of a real phone-sized sample app take."}

The frame can reserve space for a feed's controls or use even margins in a messenger. The build reports text that falls below the phone reading floor and a focus that cuts off its subject.
::::::

::::::section{title="Checked before you watch" id="checks" nav="Checks"}
The checks are tied to the film's actual material:

1. A scenario linter names risks such as overlapping text, a static page or a cropped focus before rendering.
2. A labelled frame sheet and authored control moments make specific scenes inspectable.
3. The build report compares scene timing, encoded video and audio, chapter cues and measured sound; it names overflow, cut text and small portrait labels.

These checks give evidence. A person's judgment of whether a film communicates well remains a separate decision.
::::::

::::::section{title="The agent knows the craft" id="craft" nav="Craft"}
:::lead
The film is guided by documented decisions as well as rendering code. Before filming, the agent asks for what the request cannot settle, agrees the content, then follows eight steps with evidence on a checklist.
:::

- [65 directing rules](https://github.com/witqq/agentic-screencast/blob/main/docs/film-craft.md) record the failures that taught them, including when to move subtitles away from an interface.
- The [scenario playbook](https://github.com/witqq/agentic-screencast/blob/main/docs/scenario-playbook.md) draws genre shapes from 79 sources.
- The [phone guide](https://github.com/witqq/agentic-screencast/blob/main/docs/vertical-video.md) draws on 64 sources and names the space real interfaces need to read.
- The [film checklist](https://github.com/witqq/agentic-screencast/blob/main/templates/checklist.md) keeps a step open until its result has evidence.

The result is a film with an argued beginning, a readable middle and one next step, rather than a sequence of attractive screens.
::::::

::::::section{title="Ready to ship" id="delivery" nav="Delivery"}
A completed film can be packaged for a page as AV1, VP9 and H.264, with a poster, chapters and seek thumbnails. The same scenario can carry English and Russian wording; a web package, GIF, subtitles and chapter file give the result a place in a page, README or message. The agent still checks the files it hands over and credits any licensed sound or artwork.
::::::

::::::section{title="Your agent's first film" id="start" nav="Start"}
:::lead
Ask your agent to explain one product to one audience. Begin with a genre skeleton and a free silent draft; decide on the final voice with the owner before paid synthesis.
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

::::actions{placement="inline"}
::action[Read the guide]{href="https://github.com/witqq/agentic-screencast#readme" kind="primary"}
::action[View the source]{href="https://github.com/witqq/agentic-screencast" kind="secondary"}
::::
::::::

::::::section{title="Boundaries" id="boundaries" nav="Boundaries"}
:::disclosure{title="What the tool does not promise" open="false"}
It records browsers driven by Playwright, not arbitrary desktop applications. It does not choose a voice, decide whether a script persuades or publish a film on your behalf.
:::

:::disclosure{title="Where credentials belong" open="false"}
Voice and capture credentials come from environment variables or an ignored `.env`, never from scenario voice data that can enter cache identity and build reports.
:::

Agentic Screencast is licensed under GPL-3.0-or-later because its runtime dependency includes GPL ffmpeg. Music and effects are selected separately and credited with their source and licence.
::::::
