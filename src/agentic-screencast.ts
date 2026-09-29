#!/usr/bin/env node
// Agentic Screencast — сборщик видео из сценария и воспроизводимых сцен.
// Единая точка входа. Правка сценария не требует правки кода.
//
// Вход один — файл сценария; слайды и сцены порождаются из него.
//
//   agentic-screencast build  [--source story.md] [--out video.mp4] [--only <сцена>]
//   agentic-screencast slides [--source story.md]     — только собрать слайды
//   agentic-screencast check  [--source story.md]     — признак кадра по готовым кадрам
//   agentic-screencast order  [--source story.md]     — порядок появления элементов
//   agentic-screencast script [--source story.md]     — печатает читаемый сценарий
//   agentic-screencast scenes [--source story.md]     — сцены источника как JSON
//   agentic-screencast verify [--scene scene.json]    — четыре проверки ядра рендера
//   agentic-screencast voices [--voice-json '{…}']    — голоса движка
//   agentic-screencast voice-check [<программа>]      — движок голоса против договора
//   agentic-screencast provider-check <программа>     — поставщик материала против договора
//   agentic-screencast schema                         — описание входного формата
//   agentic-screencast record [--source story.md]     — интерфейс записи озвучки
//   agentic-screencast snapshot screens.json out-dir  — снимки интерфейса в подложки
//   agentic-screencast paths                          — куда смотрит при этом окружении
//
// Флаги --pitch и --deck принимают готовые данные в обход сценария. Они для
// чужих наборов данных; для своего ролика источник один, иначе описание
// разъедется на две редакции — ради устранения чего вход и сведён к одной.
//
// Пути к тяжёлому (окружение синтеза, модель голоса, кэш, вывод) задаются
// переменными окружения, поэтому инструмент запускается в изоляции:
//   AGENTIC_SCREENCAST_HOME — каталог кэша и вывода (по умолчанию ./.agentic-screencast)
//
// Голос порождает движок — обычная программа, названная данными голоса.
// Свои переменные окружения объявляет он сам; инструмент о них не знает.
import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { parseSource, toScript, SLIDES_DIR } from "./source.js";
import { generate as generateSlides } from "./generate.js";
import type { Source } from "./source.js";
import { engineFor } from "./voice/index.js";
import { builtinPaths } from "./voice/builtin.js";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { msg, useLang } from "./msg.js";
import { KINDS as TRANSITIONS } from "./transition.js";
import { KINETIC } from "./overlay.js";
import { brandTheme, dominantColors, parseHex } from "./brand.js";
import { parseFormat } from "./format.js";
import { THEME_GROUPS } from "./theme.js";
import { craft, TOPICS } from "./craft.js";
import { handover } from "./handover.js";

/** Токены группы строками по ширине справки. */
const wrapTokens = (keys: readonly string[]): string => {
  const out: string[] = []; let row = "   ";
  for (const k of keys) { if (row.length + k.length + 1 > 78) { out.push(row); row = "   "; } row += ` ${k}`; }
  return [...out, row].join("\n");
};

const HERE = dirname(fileURLToPath(import.meta.url));
const cmd = process.argv[2];
const rest = process.argv.slice(3);
// Язык варианта сценария: `--lang ru` у любой команды, читающей сценарий. Уходит
// окружением, чтобы его увидели и дочерние шаги (сборка, линтер, кадры).
{
  const i = rest.indexOf("--lang");
  if (i >= 0) {
    if (!rest[i + 1] || rest[i + 1]!.startsWith("-")) { console.error(msg("cli.langMissing")); process.exit(2); }
    process.env.AGENTIC_SCREENCAST_FILM_LANG = rest[i + 1];
    process.env.AGENTIC_SCREENCAST_LANG = rest[i + 1];
    useLang(rest[i + 1]);
    rest.splice(i, 2);
  }
  // Формат сборки: `build --format vertical` пересобирает слайды, берёт
  // pageVertical у страницы либо кадрирует её исходник и видеоклипы.
  const f = rest.indexOf("--format");
  if (f >= 0 && process.argv[2] !== "new") {
    if (!rest[f + 1] || rest[f + 1]!.startsWith("-")) { console.error(msg("cli.formatMissing")); process.exit(2); }
    process.env.AGENTIC_SCREENCAST_FILM_FORMAT = rest[f + 1];
    rest.splice(f, 2);
  }
}
const VERSION = String((JSON.parse(readFileSync(resolve(HERE, "..", "package.json"), "utf8")) as {
  version: string;
}).version);
const HELP = `Agentic Screencast ${VERSION}

Build reproducible videos from one declarative scenario.

Usage:
  agentic-screencast build [--source story.md] [--out video.mp4] [--only scene] [--keys-only] [--lang ru] [--format vertical]
  agentic-screencast record [--source story.md]
  agentic-screencast check|order|script|scenes [--source story.md]
  agentic-screencast schema [<kind> | film] [--source story.md]
  agentic-screencast snapshot <config.json> [output-directory]
  agentic-screencast verify [--scene scene.json]
  agentic-screencast lint [--source story.md]
  agentic-screencast new <genre> [--lang ru] [--format vertical|square] [--out story.md]
  agentic-screencast frames [--source story.md] [--at 0.8|80%|2.4s|b2+0.5] [--scene id | --except id] [--out sheet.png]
  agentic-screencast sheet <clip> [--count 12 | --every 2] [--from s --to s] [--out sheet.png]
  agentic-screencast theme --from logo.png [--base neutral] | --colors "#a,#b"
  agentic-screencast web <film.mp4> [--out web] [--formats av1,vp9,h264] [--width 1280] [--quality high|balanced|small] [--mute] [--thumbs 2] [--gif 2-8]
  agentic-screencast voices [--voice-json '{...}']
  agentic-screencast voice-check [command]
  agentic-screencast provider-check <command>
  agentic-screencast handover [story.md] [--film draft.mp4]
  agentic-screencast craft [<topic>] [--json]
  agentic-screencast paths
  agentic-screencast version
A command that reads a scenario also takes its path first: lint story.md.

handover is the gate before the film goes to the owner: lint of the scenario,
the film's report (built after the scenario's last edit, no audit issue, no
warning), its stills on disk and checklist.md without an open box. It prints
{verdict: "pass"|"fail", checks: [{name, passed, findings}]} and exits 1 on
fail; --film names the film, otherwise the newest report beside the scenario.

craft <topic> prints the 3–7 film-craft rules for the decision at hand — a scene
kind (slides, page, video, report, trailer), a technique (spotlight, speed,
captions, transitions, sound, vertical, capture, stills, theme, numbers…), a
genre (product-demo, explainer, pitch, reel, release) or a finding's id
(still-scene): each with its FC number, title and statement from
docs/film-craft.md. craft alone lists the topics.

Guides: agentic-screencast help video | help capture | help overlay
        agentic-screencast help slides | help vertical | help text
        agentic-screencast help transitions | help sound | help themes | help voice | help web
Use the stub voice for cost-free checks. See README.md for the scenario and extension contracts.`;
const VIDEO_HELP = `Scenes, the build and its checks: what each command does

This is the tool's reference. How to take the brief, which voice to use and
the path from a request to a film are in the skill
(skills/agentic-screencast/SKILL.md); the directing rules and the reasons for
them are in docs/film-craft.md; story shapes per genre in
docs/scenario-playbook.md.

Scene kinds come from providers: slides.<kind> (slides.chapter opens a
film or a part; help slides lists them all), page (a saved
or self-contained HTML page), report (a page agentic-report builds from its
Markdown source), video (a finished clip or a live take — help capture).
agentic-screencast schema <kind> prints a kind's fields.

  report  report: page.md — a report, presentation or landing written for
          agentic-report, rebuilt from its source for every scene, so the
          film shows the latest edit. Needs agentic-report in the project
          (npm i -D agentic-report) and the Node version it requires. The
          camera frames its blocks by id (#section-id) or
          [data-review-target=…]; target, mustRead, zoom, spotFrom and focus
          work as on a page. The page keeps its own motion: its data-type
          and data-at mean agentic-report's roles, not typing. The scene
          builds the page without its top bar and what opens from it
          (topbar, review, schemeToggle, themeSwitcher: false) unless the
          report names those keys itself.

  page    page: file.html; optional pageVertical: file.vertical.html replaces
          that page in a vertical build (pageVertical.en for an English film).
          A selected portrait file is required and also used by frames and
          the recorder preview. target: a CSS selector the camera and the frame
          check use; mustRead: a selector whose text the frame check must
          find readable;
          zoom: 1.2 enlarges the whole page for the scene; spotFrom: 2.5
          starts its spot of light at that second; focus: selector @ anchor
          | … moves the spot from subject to subject with the words while
          the frame stands. A page without narration needs duration. The page's own CSS animations, Web
          Animations and requestAnimationFrame loops run on the scene's
          clock — the build seeks them to every frame's time — so a page you
          write is the way to an effect the tool lacks, and lint does not
          call such a page still. The layer reads data-at, data-type and
          data-kinetic only on a page marked <html data-sc-page>; another
          tool's page keeps its own meaning of those names, and lint names an
          unmarked page that uses them (page-unmarked). To draw by the
          narration, define
          window.renderAt(t) in the page: the build calls it with the
          scene's second before every frame. data-at on any element names
          its moment in the anchors of the speech (b2, b2+0.3, b3.end); the
          layer turns it into seconds when the scene mounts, so renderAt
          reads plain numbers:
            <html data-sc-page> …
            <li data-at="b2">Voice</li><li data-at="b3+0.4">Frames</li>
            <script>window.renderAt = (t) => {
              for (const e of document.querySelectorAll("[data-at]"))
                e.style.opacity = Math.min(1, Math.max(0, (t - e.dataset.at) / 0.4));
            };</script>
          A new voice or pace moves every element with its words.
  video   file: clip; from/to cut a piece (seconds or @marks, and every
          clip second of the scene then counts from from); fit: contain
          (default: whole clip, bars of the theme's letterbox colour) or
          cover [x y] (fill the frame, keep the point x y of the clip, 0.5 0.5
          the centre); freezeAt holds one real frame; speed retimes (help
          overlay); duration on a silent clip cuts it or holds its last frame;
          device puts it in a browser or phone frame or a plain framed
          window (help slides).

Building:
  build --source story.md --out film.mp4   the whole film; scenes that did
      not change come from the cache (a page scene's key covers the page and
      the files it links by relative path: images, styles, scripts, fonts)
  build --source story.md --only scene-id  one scene, the same segment it has
      in the film (no transitions, no stills)
  build --keys-only                        voice every beat (a network engine
      charges for it) and print each beat's synthesis text, key and length,
      without drawing frames
  build --lang ru | --format vertical      a translation, a vertical cut of a
      landscape scenario (help vertical)
The build prints its report as JSON on stdout and writes the same report
beside the film as <film>.report.json: each scene's start and end, beats,
stills, marks, audio, audit, warnings and timing. audit compares decoded
video frames and final audio/video durations with the scene timeline, and
WebVTT chapter cues with the named parts. Its issues have stable codes and
measured values; each is also printed as a warning on stderr. A peak above
-1 dBTP after AAC correction fails the build.
A build failure prints one line, build failed: …, naming the scene;
AGENTIC_SCREENCAST_DEBUG=1 adds the stack. The header's frame (width,
height, fps, scale) and encode (crf, preset, pix, audio bitrate) set the
picture and its quality; changing either rebuilds every scene (schema film).

Checking:
  scenes --source story.md, script --source story.md
                     the parsed scenes as JSON; the narration as text
  schema             the machine-readable JSON Schema of a scene;
                     schema <kind> and schema film print fields readably
  lint               the director rules (help vertical lists them)
  frames, sheet      frames without a build (help vertical)
  check              the frame criterion on built pages: fits, readable
                     text, contrast, by the provider's thresholds (docs/reference.md,
                     "Checks"); a finished clip is outside its scope
  order              the order in which a page's elements appear, against
                     their declared moments (beats estimated from the text)
  verify             four checks of the render core on a scene JSON
  voices, voice-check the voices an engine offers; an external engine
                     against the contract (help voice)
  paths              where this installation reads and writes, and the
                     bundled ffmpeg and ffprobe
  version            the installed version of the tool
  snapshot           saves screens of an interface as self-contained pages
                     for page scenes (help vertical)
  provider-check     runs an external material provider against the
                     provider contract and names what it breaks

See: agentic-screencast help capture | help overlay
Examples: example/live-capture.mjs, example/kinetic-video.md and
example/idea-video.md (a self-contained prototype page).`;
const CAPTURE_HELP = `Record real browser actions without timing or frame coordinates

import { recordTake } from "agentic-screencast/capture";

await recordTake({
  output: "captures/run.webm",
  prepare: async (page, context) => {
    // Authenticate here, before the recording starts, if needed.
    await page.goto("https://your-app.example/run");
  },
}, async (take) => {
  await take.withFocusCard(take.page.getByRole("tab", { name: "Graph" }),
    { title: "The route is visible here", body: "This view reveals the links.",
      reveal: "type", motion: "glide" },
    async () => take.click(take.page.getByRole("tab", { name: "Graph" })));
  await take.type(take.page.getByLabel("Search"), "example");
});

take.click/hover/type/press/drag/range work on Playwright locators. They
auto-wait, scroll, move the visible cursor and pace the recording. The
cursor travels on a gentle curve, leans a little as it moves, and takes the
shape of the element under it — a hand over a link or a button with
cursor:pointer, a text cursor over a field, an open hand over what is
dragged. Long trips show intermediate pointer positions, typing enters
visible characters at a readable pace, and a drag's real pointer path is
saved with the take. A click is drawn by the actual pointerdown event, so
it cannot lead the UI: the cursor dips and bounces. The take's click option
chooses "ripple" (default), "spot" (a soft light) or "echo" (two ripples).
withFocusCard(locator, card, action) places the explanation next to the
control while the real action runs; no authored card coordinates are needed.
Cards can use reveal:"type" and motion:"rise"|"pop"|"glide".
Use { until: locator } when an action reveals an asynchronous result, and
take.waitFor(locator) to wait for one without an action. take.card(card)
shows a card over the live page for its reading time; take.withCard(card,
action) keeps it up while real actions run under it (position: corners or
center; near-focus needs withFocusCard).
take.range(rangeLocator, 0.75) means 75% of its own track, not screen pixels.
take.type refuses password fields: log in during prepare, outside capture.
A canvas or a map under a layer that intercepts the pointer (Playwright:
"element intercepts pointer events"): take.click(canvas, { force: true })
or take.clickAt(260, 150, { target: canvas }) moves the cursor there and
delivers the click to the canvas itself; take.clickAt(x, y) alone clicks
that viewport point with the real mouse. Cursor, ripple and the stored
click come out as for any other click.

The take has its own camera and marks:

  await take.withFocus(take.page.getByRole("button", { name: "Save" }),
    async () => take.click(take.page.getByRole("button", { name: "Save" })),
    { scale: 1.8, hold: 1.2 });
  await take.mark("saved");
  await take.press(take.page.getByLabel("Search"), "Meta+K");

focus/unfocus/withFocus push the live page in on a locator with a real
CSS transform while the take records, and dim everything around it; the
page keeps working under the zoom. mark("name") stores the moment from the
recording's zero in run.webm.marks.json (accurate to about a tenth of a
second — mark after the action has settled); a video scene then writes
freezeAt: @saved, speed [{"at":"@saved","hold":2}] or a spotlight at
"@saved" instead of guessing seconds. press shows the keys as key caps
(showKeys: false to hide). mark("total", locator) also stores that
element's rectangle, so a mark or a focus on the video can aim at it by
name. The marks file keeps what the edit needs without measuring: the
clicks, the cursor's path ("path"), every action with its kind, start, end
and element rectangle ("actions": click, type, press, drag, range, hover)
and the marks' rectangles ("rects"), all in frame fractions and seconds
from the recording's zero. "cameraMoves" records the start and end of
focus/unfocus motion already painted into the take, so lint does not mistake
that motion for navigation. autoZoom: true on the video scene pushes the
camera in at the actions, like Screen Studio: actions close in time and
place (a click on a field, the typing, the choice in the list it opened)
are one push-in on their common area with a margin, typing holds it until
the text is typed, and a far or later action gets its own push-in; close
push-ins travel to each other without the overview. {"hold":1.2,"size":0.36,
"scale":1.8} tune the hold after the last action, the smallest area and a
fixed magnification (without scale the subject is fitted); a whole-viewport
action without a nearby click adds no focus. Automatic moves dim around the
specific subject without drawing a full-screen focus ring. "follow":"cursor"
lets the zoomed window follow the recorded cursor after it reaches the
focused action — it stands while the cursor stays in its middle and glides
after it when it leaves.
"follow":"cursor" on a hand-authored overlay.camera move over a take
starts following after that move, even when the pointer is outside its named
area. A camera over a take is performed by the browser, not by stretching the
video: when every move of a video scene's overlay.camera, spotlight or
autoZoom names an area and none follows the cursor (no speed, freezeAt,
device, cover fit or vertical reframe on the scene), the build re-runs the
script that recorded the take (the marks file keeps its path, arguments and
folder) with the scene's camera, anchored to the take's marks, and uses
<take>.<scene>.cam.webm. Small text stays sharp at any push-in; an
unchanged camera never re-records, and a failed re-run falls back to the
video push-in with a live-camera warning. So keep the take script runnable
from its folder, and let it record its takes without side effects on each
run. AGENTIC_SCREENCAST_NO_LIVE_CAMERA=1 turns this off. A take recorded
before actions were stored pushes in at each click. In a vertical cut of a
landscape take, the crop also scales a small subject and follows that path;
inspect the finished phone frame to confirm the interface remains readable.
from: @opened and to: @saved (or seconds) on a video scene play only that
piece of the take, so one take serves several scenes; inside the scene
every clip second — marks, speed, freezeAt, stills — counts from the start
of the piece, and marks and clicks outside it drop out.
The blank frames a recording starts with are trimmed (trimStart: false to
keep them), and a page error during the take fails it with the message
instead of recording a frozen screen.

The output is WebM. Use it as file: captures/run.webm in a video scene;
then build the scenario to MP4. A runnable local example is packaged at
example/live-capture.mjs. capturePage(page, { output }) also attaches to an
existing Playwright page without owning its browser.

A take is recorded at the page's viewport size in CSS pixels. A phone
layout needs its small CSS width, so give recordTake a scale — device pixels
per CSS pixel: recordTake({ viewport: { width: 432, height: 768 }, scale: 2.5 })
records a sharp 1080×1920 video. A context's deviceScaleFactor alone does not
enlarge the video, and a larger size: in capturePage without it puts a small
picture in a corner; with your own browser, launch Chromium with
--force-device-scale-factor=<scale> and pass size: viewport × scale. lint
names a clip enlarged more than 1.25× to fill the frame (take-small). Record
a three-second probe first and look at one frame at full size before
scripting the whole take (film-craft rule 55).

recordTake({ output, viewport, theme: "noir", prepare }, run) records the
cursor, clicks, key caps and focus in that theme — use the theme of the scene
that will show the take, since they are baked into its pixels; the marks file
records it and lint names a take shown under another theme. withFocus and
focus take scale 1.2–3.`;
const OVERLAY_HELP = `Timed overlays and tutorial camera for page and video scenes

Add one JSON object on a single scenario line:

## demo · video
file: captures/real-run.mp4
overlay: {"pointer":[{"at":0.2,"x":0.2,"y":0.5},{"at":1.5,"x":0.7,"y":0.5,"click":true}],"cards":[{"at":0.4,"title":"Follow the real run","body":"One idea at a time.","position":"bottom-right"}]}

Every at is seconds of the scene or a moment of the narration, as in a
spotlight: "b2" (the second beat begins), "b2+0.5", "b2.end-1" (a second
before its speech ends), "40%" of the scene — {"at":"b2+0.5","text":"Box"}.
A beat anchor follows the words when the voice or its pace changes, where
seconds go stale; lint places it by an estimate, the build by the measured
speech. On a take, "@mark" names a moment of the recording.

Pointer points are ordered by at; x/y are fractions of the final
frame from 0 to 1. The pointer eases between points. click:true draws a
0.65-second ripple at that point; it does not click the underlying UI.
For real UI actions, use agentic-screencast help capture instead. A manual
pointer on imported footage is only a graphic annotation, not synchronized
interaction.

Cards support position: corners, center, or near-focus; reveal:"type" and
motion:"rise"|"pop"|"glide"|"fly". enter/exit are seconds; hold is optional and
its minimum grows with text and typing time. Leave 0.35 seconds between cards.
motion:"fly" with from:"left"|"right"|"top"|"bottom" brings the card in from
beyond that edge, overshoots, settles, and leaves the same way; from is
accepted only with fly.

For a held explanation, freezeAt selects a real frame of a video clip:

## detail · video
file: captures/real-run.mp4
freezeAt: 5
overlay: {"camera":[{"at":0.8,"move":1.1,"hold":3,"return":1.1,"area":[0.3,0.2,0.35,0.3],"scale":1.7}],"cards":[{"at":1.5,"title":"The result is here","body":"This changed because of the action.","position":"near-focus","reveal":"type"}]}

camera.area is [left, top, width, height] in 0–1 frame fractions. For a
saved page scene, camera.target can name a CSS selector instead. Camera
moves are time-derived, deterministic under seek, and must not overlap:
hold is at least 0.8 s, move and return 0.35–4 s, and 0.35 s lies between
one move's return and the next move (a spotlight compiles to moves too).
On a static page a slow camera move is what keeps the shot alive.
On a video scene the camera also moves over running footage without
freezeAt: the highlight and its dimming ride under the zoom, while cards
and the caption stay screen-sized above it, and the bottom caption plate
(captions style bar) fades while the camera leads; subtitles stay, and give
way only to a card laid over them. On a freezeAt scene the build refuses a camera area that
is nearly flat on the frozen frame, naming the scene and the measured
contrast.

Slow motion is a separate field of a video scene, because it retimes the
clip itself rather than drawing over it:

## landing · video
file: captures/real-run.mp4
speed: [{"from":4.2,"to":6.0,"rate":0.5}]

from/to are seconds of the clip the scene plays: of the whole source, or —
when the scene cuts a piece with its own from/to — counted from that piece's
start (a scene with from: 30 slows its 31st second with "from":1). rate is
playback speed: 0.5 is half speed, 2 is double. Spans are ordered, must not
overlap, must stay inside the piece (lint names one that does not:
speed-range), and rate is limited to 0.2–4 — beyond that a shot stops reading
as motion. The scene grows by exactly the time the stretch gains, and the
retimed clip is cached, so an unchanged scene is not re-encoded.

A slowed stretch repeats source frames: at rate 0.5 every frame shows twice
and motion steps. interpolate draws the missing frames — true or "motion"
estimates movement between source frames (slow to build, smooth), "blend"
cross-fades neighbours (quick, softer). ramp glides the rate from 1 to rate
over that many source seconds at the start and back at the end, so the
shot eases into slow motion instead of jumping into it (at most half the
span):
speed: [{"from":3.1,"to":4.6,"rate":0.3,"ramp":0.4,"interpolate":true}]

A step {"at":…,"hold":…} stops time inside the same shot: the source
second at is held for hold seconds (0.5–12) of the finished film, then the
clip goes on. Spans and holds share one ordered list:

speed: [{"from":1.0,"to":2.5,"rate":0.5},{"at":4.0,"hold":3}]

For narration before an action, hold the clip's first frame at 0 for the
measured introductory beat, then let the recorded action play. Leave the
clip at its normal speed when the spoken line and visible action should run
together. A changed voice or line needs the hold checked against the final
audio. autoZoom and speed cannot be combined on one video scene; record the
pause in the take when that scene also needs automatic camera following.

Why time stops inside the shot rather than in a scene of its own:
docs/film-craft.md, rule 17.

Spotlight: the whole move in one line. Instead of placing a camera move,
a card and a retiming by hand, name the subject and the beat:

## result · page
page: pages/app.html
spotlight: #result @ b2 | #chart @ b3

The camera eases in (a smootherstep curve, no jolt), everything else dims,
and it holds until the end of that beat or until the next spotlight — then
it travels straight to the next subject without going back to the overview,
which is how a camera crosses a wide canvas. Anchors are beats of the
narration, so a new voice or pace moves the focus with the words. The
object form adds options:

spotlight: [{"target":"#result","at":"b2","until":"b3","scale":1.8,
  "shape":"circle","blur":6,"desaturate":true,
  "card":{"title":"The route keeps its reason","body":"Shown beside the choice."}}]

A chain may mix the two forms — the short one for a plain focus, an object
for the one that needs options:
spotlight: #n1 @ b1 | {"target":"#n2","at":"b2","scale":1} | #n3 @ b3

On a video scene name an area and optionally slow or stop the clip while
the camera holds: {"area":[0.3,0.2,0.3,0.3],"at":"b2","slow":0.4} or
"slow":"stop". On a slide, el3 names the third element that appears. blur
and desaturate work on pages and slides; on video the rest only dims. A
card is placed beside the subject and lives inside the focus window; the
hold grows until it can be read. keep:true on a focus stays pushed in until
the next focus or the end of the scene instead of returning to the overview
— a slow push-in that lands and holds. "style":"gentle" (a slow move and
return for a calm explanation) or "snappy" (quick, for a trailer or a short)
sets the camera's pace in one word; a named move wins. overlay.camera takes
the same keep, shape, blur, desaturate, ring, dim and style fields for
hand-written moves.

A film push-in has no interface frame around its subject: "ring":false drops
the coloured frame, and "dim" sets how much of the theme's dimming falls
around the subject (0 none, 0.5 half, 1 the theme's; default 1); with keep:true
it lands and holds:
{"target":"#hero","at":"b1","ring":false,"dim":0,"scale":1.4,"keep":true}
"scale":1 is the opposite case — a highlight without a push-in: the frame
stays still at its full size, the rest dims and the ring stands around the
subject; the whole screen stays in view:
{"target":"#send","at":"b2","scale":1}
A subject wider than the frame — a table row, a line of a diagram, above all
in a vertical film — is read with "pan":true: the camera pushes in until its
text is legible (up to ×3 by the subject's height, or the scale you name)
and moves along it from its first word to its last during the hold:
{"target":"#failed-row","at":"b2","pan":true}

The push-in keeps its subject whole: the subject is what the element shows,
its overflowing children included (a badge over a card's corner), and the
ring goes around all of it. Without scale it is ×1.65, lowered so the
subject with its margin takes at most 0.9 of the frame; in a vertical
build of a landscape scenario it fits the subject into the window instead,
up to ×3, so a narrow subject's text reads on a phone. A named scale is
kept as written; if the subject does not fit at it, lint names an area and
the build report names a CSS target (the scene's "pushes"). A round
spotlight ("shape":"circle") is drawn around the subject's rectangle, so
its corners stay in the light.

motionBlur: true in the header blends 6 sub-frames on every frame where the
camera moves on a slide or a page (motionBlur: {"samples":8,"shutter":0.6} to
tune); held frames stay sharp and byte-identical. A push-in over a clip is
blurred the same way: the camera is computed on sub-frames of each frame of
the clip and they are blended, so the camera's motion blurs and a held
frame stays as sharp as without it.

A push-in over a live take recorded with recordTake is performed by the
browser on a re-recording of the take (help capture): text stays sharp at
any scale. Over any other clip the build moves a sub-pixel window across the
video: smooth, but small text in a strong push-in is softer, so record such
a clip large.

Hits on any scene — a slide, a page or a clip:
flash: b2 | 1.5s
shake: [{"at":"b2","length":0.4,"strength":1.5}]
flash lights the whole frame in the scene theme's flash colour (--tr-flash)
at its anchor and lets it die out over length (default 0.35 s, strength 0.85
of full light); shake jolts the frame in two directions and settles over
length (default 0.35 s; strength 1 moves it 1.5% of the frame width), zooming
in just enough that no edge shows. Anchors are the scene's: b2, b2.end+0.3,
40%, 1.5s. Both are drawn in one pass over the joined film, so they look the
same on a slide and on captured footage; the build report lists them under
hits. Put a sound on the same anchor (sfx) — a hit without one reads as a
glitch.`;
const TEXT_HELP = `Text on screen: subtitles, titles, lower thirds, callouts, stickers

Captions are a header field of the film:

captions: {"style":"karaoke","everywhere":true,"srt":true}

  bar       the plate at the bottom with the whole scene's line (default)
  subtitle  the current beat in pieces of at most two lines
  karaoke   the same, with the spoken word highlighted
Subtitles use white letters with a black outline and soft shadow by default,
without a plate. "look":"plate" uses the theme's dense --sc-sub-bg backing
to keep the text distinct over busy interfaces. The karaoke word takes the
theme's light accent. Both looks use the theme's subtitle
font. They are 64 px in a 1080p landscape frame and about 67 px in a
vertical one.
Subtitles show on video scenes; everywhere adds slides and pages, whose
text they would otherwise leave alone; srt writes film.srt beside the
MP4, each beat starting where its audio starts. Subtitles stay on while a
spotlight holds its subject — they are the words for viewers without sound —
and give way only to a card laid over them, for as long as it is visible.
"size": 1.25 makes subtitles 1.25 times larger (0.8 to 1.6): the frame and
the .srt cut each beat into shorter pieces so a piece still takes two lines,
and slides keep a band that tall free under their text.
"position": "top" puts the subtitles (or the bar) at the top of the safe zone
and "middle" in its middle; bottom is the default. A scene changes it for
itself with captions: top | middle | bottom | auto.
At the top, cards and titles set at the top stand below the subtitles and
slides keep the top band free; in the middle, nothing moves aside, so choose
it only over an empty part of the frame. "auto" lets the build choose per
scene: it avoids bands occupied by named targets and camera subjects,
including the visible band of a portrait crop, then compares image detail
in the remaining bands. A clip is sampled twice a second and a drawn scene
once in its middle. Bottom stays preferred unless another safe band is
clearly emptier; the build report lists each choice as captionPlaces.
frames draws such scenes at the bottom. lint names subtitles at the top
together with a progress bar at the top (captions-top-progress). Karaoke
timing is an estimate: a beat's measured duration is shared between words in
proportion to their length — there is no speech recognition — so a new
voice or pace moves the highlight with the audio.

Overlay primitives live in the same overlay object as cards and camera:

overlay: {"titles":[{"at":0.3,"text":"Built for speed","style":"slam"}],
  "lower":[{"at":3,"title":"Ada Lovelace","subtitle":"Engineer"}],
  "callouts":[{"at":7,"text":"The result lands here","target":"#result"}],
  "stickers":[{"at":7.4,"emoji":"🚀","target":"#result"},
              {"at":8,"text":"new","area":[0.6,0.2,0.2,0.1]},
              {"at":9,"image":"assets/party.gif","point":[0.8,0.3],"size":120}]}

titles.style: rise | slam | type | split, or any phrase style of help slides
(text:). On a title rise and split keep their title meaning — rise
lifts the whole title, split brings its words in one by one — while in text:
and a card's reveal they are the phrase styles. The frame dims and blurs under a
title so it reads over a busy interface. position: center | top | bottom.
lower: a name plate at the bottom left or right (side). callouts: a label
with an arrow whose end lies inside the subject (side: auto | left | right |
top | bottom picks where the label stands). Each callout must name exactly
one subject field: target is a CSS selector on a page; area is
[left,top,width,height] in frame fractions from 0 to 1; point is [x,y]
in frame fractions. A video callout uses area or point, since it has no
page element to select.
stickers: one of emoji, image (svg, png, jpg, webp; gif, webm or
animated png play frame by frame on scene time) or text (a badge);
motion: pop | float | spin. Every hold has a reading-time minimum, and the
text types in without moving a line.

Hand-drawn marks, glints and bursts ride with the subject under the camera:
  "marks":[{"at":2,"kind":"circle","target":"#total"},
           {"at":3,"kind":"arrow","target":"#save","from":[0.2,0.3]},
           {"at":4,"kind":"underline","target":"h1","draw":0.8,"color":"#ff5a1f"}]
    a pen stroke that draws itself along its path in draw seconds (an arrow's
    head only after its shaft): smooth, slightly uneven like a hand, thin at
    its ends and fuller in the middle; a circle goes a little past its start
    instead of closing on it. Without from an arrow comes in from the free side.
    On a video scene "area":"@total" aims a mark, a loupe, a camera move or a
    spotlight at the element the take recorded with take.mark("total",
    locator), placed as the clip lies in the frame (fit, device); moments
    inside overlay ("at":"@saved") are marks too
  "glints":[{"at":5,"target":".card"}] — a band of light crosses the subject once
  "boops":[{"at":"b2","target":"#send","kind":"pop"}] — the element on the page
    jolts and springs back: pop, shake, jelly or nod; ties a cause to its effect
  "pings":[{"at":1,"target":"#dot","hold":2}] — rings spread from the subject,
    like radar; also "area" or "point"
  "toasts":[{"at":1,"icon":"✅","title":"Build finished","body":"film.mp4 is
    ready","hold":4}] — notifications slide into the top-right corner; older
    ones step back and shrink, three stay visible
  "bursts":[{"at":6,"kind":"confetti","target":"#done","seed":3},
            {"at":6,"kind":"sparks","point":[0.5,0.4]}]
    confetti fly up, spin and fall; sparks streak out and fade within a
    second; the seed fixes the layout, so a rebuild gives the same frames
  "loupe":[{"at":2,"target":"#total","scale":2,"size":0.22,"hold":3,"place":"beside"}]
    a circle over the subject shows it magnified while the camera stands;
    on a clip name an area or a point; drawn in the pass that writes the
    scene, so the frame around the circle keeps its full quality. The whole
    subject stays inside the circle: the lens grows past size up to 0.6 of
    the frame's short side, then the magnification drops and the scene's
    "loupes" in the build report (or lint, for an area) names it. The lens
    never leaves the frame; place is over (default, on the subject), beside
    (next to it, not covering it) or a frame corner: top-left, top-right,
    bottom-left, bottom-right. A vertical build of a landscape scenario
    draws the loupe over its subject in the reframed window, placed by
    where the window stands at the loupe's moment — start a loupe after the
    camera has settled, as the lens does not follow a moving window

Emoji anywhere in the film are drawn as images from the bundled Noto set
(assets/emoji), so they look the same on every machine. For an emoji the set
lacks, the build draws a neutral circle and warns with the download link;
put its Noto SVG into a folder and name it in the header:
emoji: {"dir":"emoji"}.

Film-wide layers are drawn over the joined film:

progress: {"position":"bottom","parts":true}
pip: {"file":"presenter.mp4","corner":"bottom-right","size":0.2}

progress draws a bar of elapsed time and the current part's name; a part
starts at any scene with a part: field; a film that names no part: at all
starts one at each slides.chapter, hero or titlecard scene (named by its
kicker or title). "label" places that name: edge puts it beside the
bar at the frame's edge, off the picture; zone puts it at the safe zone's
edge, where a feed's own handle and buttons do not cover it. A vertical or
square film in a feed (zone: platform) defaults to zone, every other film to
edge. At the zone's edge the name takes its own band: subtitles, cards and a
slide's bottom stand above it. In a vertical frame the name is at least 36 px
on 1080, the floor for secondary text on a phone. pip puts a video of the presenter in a circle; its sound is not mixed
in. While the camera pushes in, the circle shrinks to two thirds in its
corner and comes back after the move, so it does not compete with the
detail.`;
// Виды переходов перечисляются из самого модуля переходов: список, записанный
// здесь руками, разошёлся бы с кодом при первом новом виде.
const TRANSITIONS_HELP = `Transitions: a real cut between moving frames of two scenes

## reveal · page
page: pages/app.html
transition: cube 0.8

A transition leads FROM the previous scene INTO this one. Write a kind, a
kind and seconds (0.2–2), or an object:
transition: {"kind":"whip","duration":0.6,"sound":"audio/whoosh.ogg","snap":"music"}

The scenes overlap by the transition's length: the next scene starts that
much earlier, so the film gets shorter by it. The outgoing scene keeps a
silent tail at least as long as the transition, so no word ends under the
next picture, and no fade to black is drawn on that edge. Frames are mixed
by a WebGL shader in the rendering browser; if WebGL is unavailable the
build falls back to ffmpeg xfade and says so in its report
(transitions[].renderer). The light of wipe, iris and flash, the shade of
turning faces and the fill between them come from the theme of the incoming
scene; ffmpeg cannot light in a theme colour, so without WebGL flash falls
back to a plain dissolve. sound plays an accent just before the cut; snap
"music" lengthens the outgoing scene so the cut lands on a music beat.

Kinds:
${Object.entries(TRANSITIONS).map(([name, k]) => `  ${name.padEnd(10)} ${k.about}`).join("\n")}

A shared element moves between two drawn scenes (slides or pages):
transition: {"kind":"morph","element":"#total","duration":1}
The element — present in both scenes under the same selector — travels in one
piece from its place in the first scene to its place in the second and
takes the second look halfway through, so different text layouts do not
double while the background dissolves under it. Exactly one visible match
is selected in each scene, even when a hidden view repeats its selector;
the build renders both scenes' frames with and without it to do so. Without
WebGL it becomes a plain dissolve, and the report says ffmpeg.
Any CSS selector works. On generated slides the number of slides.number is
.huge, a counter's value .ctr-v (.ctr:nth-child(2) .ctr-v for the second),
a title h1, a chart's bars .chart-bar, a code window .code-win.

A hard cut joins two scenes edge to edge, with no overlap and no fade on
either side of the seam — the cut of a trailer or of a beat that must land:
transition: cut
transition: {"kind":"cut","sound":"sfx/hit.wav","snap":"music"}
A dip sinks the picture into a colour and brings the next scene out of it,
holding the colour for a moment in the middle — the dip to black before a
title, or to white on an impact. The colour is the incoming theme's fade
colour unless named: transition: dip 0.6 white, or {"kind":"dip","color":"#ffd27a"}.

Without a transition every scene fades in and out through its own fades
(about 0.3 s). fade on a scene changes them: fade: none drops both, fade: 0.1
sets both, fade: {"in":0,"out":0.6} sets each. A cut drops the two fades at
its seam by itself.

dissolve breaks the frame into noise blocks and shreds text mid-cut. Which
kinds suit which film: docs/film-craft.md, rule 52. See also help sound.`;
const SOUND_HELP = `Sound: music, accents and narration mixed together

music: {"file":"audio/theme.mp3","level":-24,"duck":20,"fadeOut":3}
sfx: [{"at":"m16","file":"audio/impact.ogg"}]
loudness: -14

The tool ships no sound: the scenario names files, the build mixes them.
music plays under the whole film at level (dBFS in pauses, default -26) and
drops under every beat of speech to duck dB below THAT beat's measured level
(default 20), with smooth edges; a new voice or pace moves the dips with the
audio, and a silent stub draft is ducked as if a voice spoke. fadeIn,
fadeOut and from shape the bed; it loops to the end.

Music by parts: music on a scene changes the bed from that scene on.
music: {"file":"audio/act2.mp3","at":"b2","from":12,"fadeIn":0.5}
music: stop b1.end+0.2
A file starts a new bed at the scene's start or at its anchor (b2, b2.end —
the end of that beat's speech, as everywhere in a scenario —
1.5s, 40%) and crossfades it over fadeIn (default 0.5 s) with the one that
played; stop silences the music at that moment in fadeOut (default 0.05 s,
a hard stop — the trailer's music stop before a punchline). level, duck and
from work as in the header; a later scene's music or stop ends it, and the
last bed fades out at the end of the film. A film may have scene music and
no header music at all. The build report lists every bed as audio.music.spans.

Tempo: bpm and offset (the first beat) set the music's grid for m-anchors
and snap. Leave bpm out and the build finds both in the file, from the
second the music starts to play, and reports them as tempo in the build
report ("detected": true); it prefers a tempo near 120, so a track in eighths
is read at its beat rather than twice as fast; name bpm (and offset) when a
track has no steady beat or you want a half-time grid.

Accents: sfx in the header uses the film clock (seconds, or m16 = the 16th
beat at bpm from offset); sfx on a scene uses its anchors (b2, b2.end, 1.5s,
40%); transition.sound plays before a cut. Only the part of an accent that
lies under words gives way to them: a hit in a pause keeps its full level,
and its tail under the voice drops duck dB (default 12) below the words with
short edges. duck: 0 lets an accent ride over the words; duckAll: true lowers
the whole accent instead. from and length take a piece of the file (skip a
slow start, keep only the hit) and fadeOut closes the piece:
sfx: [{"at":"b1","file":"audio/boom.wav","from":0.4,"length":1.2,"fadeOut":0.3,"gain":3}]
speechAt: 0.8 on a scene starts its narration that many seconds into the
scene — a hit or a card first, the voice after it; the beats, subtitles and
the ducking of music and accents move with it.
Every film with sound — narration alone too — is normalised to -14 LUFS
unless loudness names another target. The build measures the finished AAC
and corrects audio-only if its decoded true peak exceeds -1 dBTP; if it
cannot meet that ceiling, the build fails. Peak correction can leave the
achieved loudness below the target. A silent track (the stub voice) is left
as it is.
audio: false in the header writes a film without a sound track: the
narration still sets every scene's length, but the MP4 carries only video.

The build report shows audio.music, audio.sfx[].underSpeech and
audio.loudness (target, input — the mix before normalising — and measured,
the finished AAC's integrated loudness, or null for silence or a stream too
short to measure). audio.encoded gives its final truePeak in dBTP and
corrected flag; audio: false has no audio measurement. Where to find free
music and sounds, how to choose them by genre and tempo, and how to credit
them: docs/sound.md.`;
const THEMES_HELP = `Named looks: one word in the header styles the whole film

# My film
theme: calm-paper

A theme sets the palette, the type pairing, backgrounds, card and caption
shapes for slides AND for the overlay drawn on captured footage, so the
film cannot end up with a caption from one palette and a card from another.
Shipped themes:

  neutral      the default look: grey paper, ink, one ochre accent, no live
               background — a film nobody styled wears no fashion
               Literata titles, Onest text and subtitles, Martian Mono code
  frost        stone and graphite, two colours and one material; colour is
               left to statuses and the lit karaoke word (steel)
               Onest titles, IBM Plex Sans text and subtitles, Geist Mono code
  midnight     night ink, one blue signal, steel for the kickers
               Geologica titles, IBM Plex Sans text and subtitles, JetBrains Mono
  calm-paper   warm paper and one clay accent — a long explanation read like
               a document, not a product film
               Playfair titles, Literata text, Golos Text subtitles, PT Mono code
  daylight     a bright product page, cobalt signal, petrol kickers
               Onest titles, Golos Text text and subtitles, Geist Mono code
  noir         near-black, cold grey text, one restrained amber accent
               Cormorant Garamond titles in spaced capitals, Jost text, PT Mono
  aurora       deep blue night, one mint signal, sand for the kickers; calm
               research — light Raleway titles, Commissioner text, Victor Mono
  ember        warm near-black, one orange signal, warm grey kickers; launches
               Oswald titles in capitals, Rubik text, JetBrains Mono code
  blueprint    drafting blue, cyan and signal yellow, a quiet drafting grid
               Tektur titles, Fira Sans text, Martian Mono code
  synthwave    genre: games and music only — violet night, neon magenta and
               cyan, capital kickers; Unbounded titles, Exo 2 text, JetBrains Mono
  terminal     a developer console: graphite, one green prompt, amber labels
               and marks, sharp corners; Martian Mono titles, JetBrains Mono
               text and code, Onest subtitles
  blockbuster  genre: a parody action trailer only — black, chrome titles in
               Roman capitals, gold and fire, sparks; Forum titles (in the
               spirit of Trajan, the poster font), Oswald text, Fira Sans
               subtitles, JetBrains Mono code

Every theme but blockbuster has a light and a dark scheme: scheme: light or
scheme: dark in the header picks it for every named theme of the film (a
scene can name its own with theme: {"preset":"noir","scheme":"dark"}, and a
live take with recordTake's theme: {"preset":…,"scheme":…}). Without it each
theme wears its default: neutral, frost, calm-paper and daylight are light,
the others dark; blockbuster is dark only, and scheme: light with it is a parse
error. The role colours of both schemes (background, surfaces, text, borders,
the accents, the statuses) come from one palette file shared with
agentic-report (assets/palettes/shared-palettes.json, docs/theme-tokens.md), so
a film and a report page in the same theme and scheme wear the same colours.

Every theme but the two genre ones has one accent: plates, card edges and the
lower-third bar are that one colour, and the second colour is a quiet one for
kickers and labels. The genre themes keep their two neon or metal colours on
purpose, for the film whose genre they are; blueprint (blue and signal yellow)
and terminal (green prompt, amber labels) are two-colour by design.

Which theme, background and film look suit a film, and which of them read as
generated clichés: docs/visual-design.md.

The fonts ship with the tool (assets/fonts: 24 open-licence families, Latin
and Cyrillic), so a film renders with the same letters on every machine and
without network. A theme names them in --display (titles), --sans (text and
cards), --mono (code) and --sub-font (subtitles, with --sub-weight): every
theme has its own subtitle face, a sans of medium or semibold weight with full
Cyrillic, chosen for its mood. --display-weight, --display-tracking (added to
each title's own spacing, and never tighter than -0.025em in total, so words do
not fuse) and --display-case (none | uppercase) shape the titles;
--kicker-case (none by default, uppercase in the genre themes) and
--kicker-tracking shape the small line over a title. To use another bundled family, name it in the header:
theme: {"preset":"midnight","--display":"'Unbounded', sans-serif"}.
The bundled families: Geologica, IBM Plex Sans, JetBrains Mono, Playfair,
Literata, PT Mono, Unbounded, Exo 2, Press Start 2P, Cormorant Garamond, Jost,
Raleway, Commissioner, Victor Mono, Manrope, Golos Text, Geist Mono, Oswald,
Rubik, Tektur, Fira Sans, Martian Mono, Forum, Onest. A font outside the set falls back to
whatever the machine has.

One part of a film can wear another theme: theme: on a scene takes the same
values as in the header and paints that scene's slides and its overlay
(subtitles, titles, cards); a page scene keeps its own HTML, and its :root
receives the theme's tokens, so a page you write can wear the film's look with
var(--bg), var(--ink), var(--acc), var(--sans) and the rest. A named theme
(theme: daylight) is taken whole; bare variables (theme: {"--acc":"#ff5a1f"})
go over the film's theme. The progress bar, the part label and the
presenter circle run across scenes and wear the theme of the scene under
them, so a light scene in a dark film gets a light label.

A theme also names the live background of slides (--bg-motion) and its
strength (--bg-intensity); a slide scene overrides it with background:
(help slides).

Brand colours: agentic-screencast theme --from logo.png [--base neutral]
reads the two dominant colours of a logo or screenshot (or --colors
"#ff5a1f,#1f6fff") and prints a theme line to paste into the header. The
first colour becomes the one accent, shifted in lightness until it reads on
the base background; the second is muted towards grey for kickers and labels,
and without one the base theme's quiet colour stays.

Film look: look: cinematic | vintage | soft | mono | trailer, or JSON
{"grade":"teal-orange","grain":0.3,"vignette":0.4,"bars":2.39}. It grades,
vignettes and grains the finished film in one pass; grain is seeded, so a
rebuild gives the same file. bars (letterbox) need a landscape frame: the
bars join the safe zone, so captions, cards and slide content sit between
them; a vertical or square film with bars is a parse error. Grain costs file size: film grain does not
compress, so grain 0.15 makes the file three to four times larger and
0.4 about seven; keep it low for the web or leave it out.

Point edits stay possible: theme: {"preset":"noir","--acc":"#7aa2ff"} keeps
the preset and replaces one variable. In the header a bare object without
"preset" is a whole theme of your own and must write every token below — a
missing one is a parse error that lists it; on a scene a bare object goes over
the film's theme. An unknown name is a parse error listing the available ones,
not a silent fallback. Colours that ffmpeg and the shaders read (progress bar,
rings, letterbox, confetti, sparks, transitions, screen glint) are written as
#rrggbb or #rrggbbaa. A film without a theme wears neutral.
Change --bg and change --card and --node with it: a dark preset's cards
stay dark, and a light background with untouched cards puts dark text on a
dark plate. check catches it by measuring text against its real backing,
but it is cheaper to know before the red check.

Every value the tool draws — colours, fonts, shadows, radii, padding, line
widths — comes from these tokens, so a theme is the whole look:

Every theme fills the same contract of variables, so a new scene kind or a
new overlay part never picks a stray colour from a rule default.`;
const SLIDES_HELP = `Slides that move: kinds, live backgrounds, camera drift, device frames

## open · slides.hero
kicker: Agentic Screencast
title: Films that explain themselves
body: One scenario file, real footage, honest checks.
duration: 5

Each kind is a scene header slides.<kind>. The classic five: chapter
(title, body), compare (left, right), chain (nodes, back), quote (parts) and
number (value or values, label, tags); schema <kind> shows how to write each.
Beyond them the full-frame kinds are:

  hero      headline rising word by word; body, optional image behind
  steps     items: Title :: text | …  — lit one by one with the narration
  features  items: 🚀 Title :: text | …  — two to six cards flipping in
  timeline  items: 2024 :: text | …  — a line that draws itself to each stop
  counter   values: 1,240 :: label | 98% :: label — odometer digits, % ring
  beforeafter  image: old.png, after: new.png, labels: Before | After,
            split: 0.8 0.2 — two states in one frame, before left of a
            divider that travels across, after right of it
  parallax  image: screen.png, panels: 0.1 0.2 0.4 0.3 @ 1 | 0.5 0.6 0.4 0.3 @ 0.3
            — panels cut from the screenshot hang at their depth (1 nearest)
            over the dimmed original; the near ones move more
  perspective  image: screen.png, body — the screenshot on a screen in
            perspective drawn with WebGL: the camera orbits, a glint crosses,
            a reflection lies below; the build report says renderer: webgl,
            and without WebGL the page shows the flat screenshot
  chart     data: sales.csv (label,value per line), type: bar | line,
            peak: max | a row number | a label — bars grow, a line draws
            itself left to right, the peak lights up; data.ru: for a translation
  code      code: a\\nb or file: snippet.ts, lines: 3-14, highlight: 5 7-8,
            cps: 40 (default: typing fits the scene), name: shown in the tab
  photo     image: pic.jpg, point: 0.6 0.4, push: 1 1.16 — slow push-in
  shot      image: screen.png, device: browser app.example.com | phone | frame —
            a screenshot in a frame floating in 3D; a tall one scrolls
  outro     title, body, cta, url — the closing card; with image, a short
            line over the frame of the result, which is how a film ends
            (film craft 65)
  card      title: Zero mercy — a trailer card: one to three words sized to
            span the frame, slamming in with a flash, a shake, a sheen over
            metal letters and rising sparks; kicker is a small line above.
            Pair it with transition: cut and a hit in sfx on the scene
  titlecard title: The last / pâté, kicker: This autumn, body: Coming soon —
            the film's title in spaced capitals of the theme's accent with a
            sheen, revealed from a blur, a flare across the frame; " / " breaks
            the title into lines

Living kinds keep moving while the voice speaks:
  marquee   items: 🟣 Linear | 🟢 Notion | …, rows: 2, speed: 110 — an endless
            strip of logos or short labels, the second row the other way;
            "many use it and the list goes on"
  stack     items: ⭐ Title :: text | … — a deck of cards; on each item's
            moment the top card flies off and the deck springs forward
  orbit     items: 🟣 Linear | … — icons circling the kicker and title in the
            middle, one orbit up to six, two beyond (the outer one reversed)
  chat      items: you :: question | Agent :: answer | … — bubbles pop in turn
            (you, user, me on the right), typing dots before each answer
  carousel  items: 🎬 Title :: text | … — cards standing in a real 3D ring that
            turns to each card on its moment
  globe     items: Berlin :: 52.5 13.4 | Tokyo :: 35.7 139.7 | … — a WebGL
            globe of dots; arcs fly from the first city to the others in
            turn and ping where they land, the city's name beside it
A title may rotate a word: title: Built for {teams|agents|you} — each word
holds 2.2 s, the next rises from below, and the line stops on the last.
When to use each: docs/motion-design.md, "Effect vocabulary".

Items appear one by one: each on its own beat when the speech has enough beats, otherwise at an even pace across the speech, unless at: names moments.
text: the phrase style of the headline and body — ${KINETIC.join(" | ")}
— assembles them word by word or letter by letter on the scene's time,
every unit already in its final place, so lines never re-wrap. Titles and a
card's reveal take the same styles (help text).
enter: how the items come in — rise | lift | word | left | right | pop | wipe |
flip | track | line | tilt | zoom | fade | spin | fly | drop | swing | unfold
(each kind has its own default).
A slide fits its content between the top of the frame, the subtitle band and
the part label, shrinking it down to 72%; what still does not fit is named
in the build report (the scene's "overflow", in grid points) and on stderr:
split such a slide into two scenes or shorten its items.
align: top | center | bottom | fill places the content by height: under
the head, in the middle between the head and the rule, just above the rule,
or spread over the whole height. A vertical or square frame centres by
default, so a short slide leaves no empty third above the subtitles.
move: drift | push | still sets the whole-frame camera (drift is a slow 3D
orbit with the background moving less than the foreground). count: off
keeps a number from rolling. background: grid | aurora | mesh | waves |
particles | bokeh | none overrides the theme's live background; WebGL
backgrounds fall back to grid and mark the page when WebGL is missing.
Every slide carries an ambient layer of its own — a breathing glow, a
drifting grid, a travelling sheen — items keep a faint float after they
appear, and held cards breathe; all of it is a function of scene time, so a
frame taken from the middle equals the same frame of a full build.

The classic kinds now enter with meaning: compared columns slide in from
their sides, chain nodes pop and arrows draw, quotes wipe in, numbers roll.

A captured clip gets the same frame: device: browser app.example.com on a
video scene puts the clip into the screen of a browser window (or phone);
device: frame sets it on the theme's background as a plain window with a
margin, round corners and a shadow. Camera areas of such a scene are
fractions of the clip, not the frame.

Images are embedded into the generated page, so replacing a picture under
the same name rebuilds the scene. See: help themes (backgrounds, brand
colours, film look), agentic-screencast schema (every field of every kind).`;
const WEB_HELP = `A finished film for a web page

agentic-screencast web film.mp4 --out web [--width 1280] [--quality balanced] [--mute]

The build writes H.264 at high quality — the format for review, which every
player opens. A page does better with AV1: in this product's measurements it
is about 40% lighter than H.264 at the same frame similarity. VP9's size
depends on the material and the chosen quality; it can be larger than H.264.
The web report gives each output's measured bytes. Not every browser plays
AV1 (older Safari), so web writes all
three and a <video> snippet whose <source> lines go in order of preference;
the browser takes the first it can play and H.264 stays last as the fallback.

  --formats   av1,vp9,h264 (default all three; AV1 is skipped, and said so,
              when this ffmpeg has no AV1 encoder)
  --width     scale down, never up; height follows the aspect
  --quality   high (default) | balanced | small — the same step gives the
              three codecs a comparable picture
  --mute      drop the sound: a muted autoplaying loop needs none. A film
              whose sound track is digital silence (a stub-voiced draft
              without music: peak at or under -80 dBFS) leaves without a
              track by itself, with audio: false and a muted loop snippet
  --poster    the second shown before playback (JPEG and WebP)
  --chapters  a WebVTT chapter file; by default film.chapters.vtt, which the
              build writes beside a film that has parts, joins as a track
  --thumbs    seconds between seek thumbnails (default: 1/60 of the film;
              0 for none): one sprite and a WebVTT track of #xywh cells that
              players show over the timeline
  --gif       a looping GIF for a README, a ticket or a chat where video does
              not play: the piece in seconds (--gif 2-8; bare --gif takes the
              first six), 12 frames a second, its own palette, --gif-width
              (default 640); the report gives its size in bytes

Each <source> type names the codecs read from the file's own headers — the
H.264 and AV1 profile and level, the AAC profile — so a small film does not
claim a level a browser may refuse.

Every output is checked, not trusted: codec, frame size and duration against
the film, frame similarity (SSIM) against the film at the same size, and for
MP4 the index at the start of the file so playback starts before the download
ends. The report is JSON on stdout.

Beside the files web writes film.web.json, a manifest for the page that shows
the film: size, duration, whether it has sound, the posters, the sources in
order of preference with their type and bytes, the chapter track and its
language, the thumbnails and the GIF — every path relative to the manifest, so
the folder moves as a whole. A page builder reads it instead of guessing file
names; agentic-report takes it as ::video{from="web/film.web.json"} (or the
folder). The language is --lang, otherwise the one the build wrote into
film.report.json.`;
const VERTICAL_HELP = `Vertical and square films, and the agent's helpers

# My short
format: vertical

One header line makes a 9:16 film at 1080×1920, 30 fps — the one master every
feed takes (format: square → 1080×1080, 30 fps; frame: still overrides size
and fps). The format carries the platforms'
safe zone — Reels, TikTok and Shorts draw their own buttons and caption over
the video — and everything readable is laid out inside it: slides reflow into
a portrait column, captions, subtitles, cards, titles, lower thirds,
callouts, stickers, the presenter circle and chapter labels sit in the zone
with phone-sized type. See docs/vertical-video.md for the numbers.

zone: says where the film is watched. platform (the default) keeps clear the
feed's buttons, 65 px on the left and 180 px on the right of a 1080 px frame;
plain is for a film watched outside a feed — in a messenger, on a page, by
colleagues on a phone — with even margins (65 px at the sides). Either way
subtitles, the caption, titles and a centred card stand in the middle of the
FRAME: under platform their width is the band around the centre that stays
inside the zone, so a line is shorter than under plain.

A landscape film made vertical without a rewrite:
  agentic-screencast build story.md --format vertical --out short.mp4
Slides are drawn anew in portrait. A page is rendered in its own landscape
frame at full density and cut by a 9:16 window that follows the spotlight
target unless the scene names pageVertical: pages/phone.html. That HTML is
drawn directly in the portrait viewport, without the landscape crop; a
missing selected file fails the build. A clip or frozen frame is cut by a
window that glides between focus areas and recorded clicks. With autoZoom,
a small named action grows inside that window; follow:"cursor" keeps that
subject visible until the pointer reaches it, then follows the pointer out
of the central zone. Captions, titles and cards are
laid out again inside the vertical safe zone; a card near focus moves to the
top. Letterbox bars from look are left out and the build report says so; a
clip in a device frame is re-laid in the portrait frame instead of cut.

Translations live in the same scenario: title.ru:, key.ru: fields
(kicker.ru:, overlay.ru:, voice.ru: in the header) and a [ru] narration block per scene with the same
number of beats, since anchors like b2 count beats. A page or a clip that
shows an interface needs its own translated file: page.ru: page.ru.html,
pageVertical.ru: page.vertical.ru.html, file.ru: take.ru.webm. --lang ru on build, lint, frames, script or scenes
picks the variant, each language generating into its own place; run lint
--lang ru before a build — it names every visible field left untranslated.

Helpers that save a full build:
  agentic-screencast new reel [--format vertical] [--out story.md]
      a genre skeleton (pitch, product-demo, trailer, explainer, release,
      reel) with its pages, ready to build on the free stub voice; with
      --format vertical or square the header also gets zone: platform (the
      brief decides where the film is watched) and the phone pace, cps 13
  agentic-screencast frames --source story.md [--at 0.8|80%|2.4s|b2+0.5] [--scene id | --except id]
      one frame per scene on a labelled sheet, or one still with --scene;
      --except omits one scene from the sheet. The two flags cannot be combined. Beats are
      estimated from the text, nothing is synthesised; the film-wide layers
      (progress bar, part label, presenter) are not drawn. A drawn scene
      whose frame has a flat empty band a third of its height or more is
      listed in "empty" (film craft 58). A video scene
      shows a frame of the piece it plays (from/to), labelled with the scene
      second and the source second it came from
  agentic-screencast sheet clip.mp4 [--count 12 | --every 2] [--from 5 --to 20]
      a contact sheet of a raw clip with the second of every frame, to pick
      the pieces (from/to) of downloaded or recorded material before writing
      the scenario; the JSON lists the frames and their seconds. On the
      finished film, sheet film.mp4 --every 1 is how an agent without a
      player watches it: a frame a second, read in order beside the .srt
  stills: b2+0.3 :: the card is readable | 80% | @done   (a scene field)
      control frames of the finished film: a moment named like the rest of
      the scenario — a beat (b2, b2+0.3, b2.end-0.5), a share of the scene
      (80%), seconds (1.5) or a take's mark (@done) — and after :: what to
      check there (a note cannot contain |). Text a note quotes in «…» or
      "…" must be visible in that frame — on the page, in the subtitles,
      cards or titles; the build reads the frame and names a still whose
      quote is missing (still-note). A video scene's own picture is not
      read, only the layer over it. bN.end is the end of that
      beat's speech; a share counts the whole scene, its outgoing transition
      included. every 1s (0.25–10 s) samples the scene at that step from its
      start, for what happens between named moments — a page change in the
      middle of a shot. The build writes them to
      <film>.stills/ (a whole-film build; --only leaves them) and lists them in
      its report ("stills": scene, moment, time, note, file); look at
      them right after the build instead of guessing seconds. Naming stills
      does not re-render a scene. The report also gives every take's marks
      in film time after speed ("marks": scene, mark, clip, film) and the
      paths of the subtitle and chapter files ("srt", "chaptersFile").
      The report on stdout is JSON: "out", "duration", "scenes" (per scene:
      "start" and "end" in the film, transitions' overlaps included,
      "nativePortrait" for a page selected through pageVertical,
      "legibility" — the smallest text of each focus's subject at the
      middle of its hold, in frame pixels, against the 48 px a phone reads
      on a 1080 frame (stderr names every subject under it),
      "cached", "frames", "overflow" of a slide that does not fit, the
      "spotlights", "pushes" and "loupes" as placed, "cut" — lines of a
      focus target the frame cuts, also named on stderr — "small" — lines of
      a built-in slide in a vertical frame under the 36 px floor for
      secondary text, also named on stderr — "renderer"), "beats"
      (each beat's start in the film), "stills", "marks", "srt",
      "chapters", "audio" (music and its spans, accents, final AAC loudness
      and true peak), "audit" (expected and encoded stream lengths, decoded
      frames, chapter cues and coded issues),
      "hits" (flashes and shakes), "transitions",
      "timing" (where the build spent its time), "segments" (each scene's
      cached clip and its checksum), "warnings" (findings per scene: a
      push-in that crops its subject (push-crop), a lowered loupe
      (loupe-scale), a subtitle that took three lines (caption-lines), page
      text past the feed's safe zone (safe-zone), an empty band a third of
      the frame (empty-area), small focus text (legibility), small page text
      in a vertical film (small), cut lines (cut), overflowing slides
      (overflow), a stretch standing still three seconds (still-stretch),
      flashing more than three times a second (flashing), clicks of a take
      after the speech ends (silent-action), a still in a scene's fade
      (still-in-fade), a feed film's dark first frame (loop-start); and the
      file's audit and muxer issues). Adjacent pieces of one take join edge
      to edge without a fade, and a feed film's first scene opens and its
      last scene ends without one, unless the scene names fade.
      A finding here and in lint is {rule, id, message, hint}: id names the
      check, rule the knowledge-base rule behind it (FC-58 is rule 58 of
      docs/film-craft.md, VA-5 step 5 of "Checking a licence and writing
      the credit" in docs/visual-assets.md — read it for why and how), hint
      what to change.
  agentic-screencast snapshot screens.json out-dir
      saves interface screens as self-contained pages to use as page scenes
      (the config names the URLs and states; see docs/reference.md).
  agentic-screencast lint story.md [--lang ru] [--format vertical|square]
      --format measures the scenario as that build would reframe it (run it
      for every format you build: a beat that fits a landscape subtitle can
      overflow a phone one). Director rules; each finding in the JSON
      it prints is {scene, index, rule, id, message, hint}, rule naming the
      film-craft rule (FC-N) behind it: a card
      while the caption runs (two-text-layers), a beat longer than two
      subtitle lines (overloaded-line), a page that stands still
      (still-scene), a page using the layer's attributes without the
      <html data-sc-page> mark (page-unmarked), a scene over 25 s
      (long-scene), a top title over an
      interface (title-over-interface), a transition on the first scene
      (first-transition), focuses whose camera moves collide, estimated
      from the beats (spotlight-collision), a focus held over a still clip
      for more than 2 s (still-hold), a typed field too fast to read for
      its duration (typing-too-fast), a take recorded in another theme
      (take-theme), a push-in that crops its area (push-crop), a loupe that
      must lower its magnification (loupe-scale), a speed that runs past
      the piece a video scene shows (speed-range: speed seconds count from
      the piece's from, not from the source), subtitles and the progress
      bar both at the top (captions-top-progress), a clip enlarged more
      than 1.25× to fill the frame (take-small), a piece of a take that
      runs past a mark the scene does not name — the next shot
      (piece-crosses-mark), a flat empty third of a clip's frame in more
      than 30% of its frames (empty-area), an abrupt screen change inside
      a take's piece where it has no mark (scene-jump), a number, counter or
      chart slide whose note names no source and date (number-source), a
      theme that dims unspoken karaoke words under 4.5:1 on the plate
      (karaoke-contrast), a music or sound file with no line in
      assets/CREDITS.md beside the scenario (uncredited), and with --lang the visible fields a translation
      left out (untranslated).
      Beside the findings the JSON counts the signs of a template film in
      "cliches" — they do not fail lint, since each can be a decision:
      flash or shake outside a trailer (hit-outside-trailer), film grain
      outside a trailer (grain), more than two bursts and glints
      (many-sparkles), more than two kinds of transition (transition-kinds),
      an aurora, mesh, bokeh or particles background (decorative-background),
      a browser frame with no real address (placeholder-address), a kicker
      in capitals (kicker-caps), emoji icons in features (emoji-icons), the
      same enter on every slide (same-entrance); four or more add a verdict
      that the film is average (docs/visual-design.md). A trailer — its
      cards, look: trailer or a genre theme — keeps impacts, grain and
      capitals without a sign

Long fields may span lines:
  code: |              items: |               overlay: {"cards":[
    line one             - One :: first         {"at":1,"title":"Saved"}
    line two             - Two :: second      ]}
A typo in a field or a header name gets "did you mean «title»?".`;
const VOICE_HELP = `Narration modes: synthesis, a recorded human, or silence

voice: {"engine":"speechkit","name":"kuznetsov","speed":1.2}

Shipped engines:

  stub       silence of the right length; free, for drafts and checks
  speechkit  Yandex SpeechKit; needs credentials in the environment; the voice
             data's lang defaults to ru-RU, so an English voice needs
             "lang":"en-US" or it reads the English text as Russian
  say        the macOS built-in synthesizer, offline; "name" is a macOS voice
             (say -v '?' lists them, e.g. Samantha for English; the default
             is Milena), speed is not applied. A system voice is used
             only with the owner's explicit permission (the skill, section
             Voice). It paces itself by its own commands inside a beat's spoken
             variant (~): [[rate 140]] sets words per minute, [[slnc 300]]
             inserts 300 ms of silence —
             ~ [[rate 130]] In a world [[slnc 400]] where pâté is served at seven
  piper      a local neural synthesizer, offline
  recorded   no synthesis: it finds the take a human recorded for the beat

Any other name is a command implementing the engine contract, so a project
can bring its own synthesizer without changing the tool.

A silent film is a legitimate mode, not a missing feature: leave the scenes
without prose, give each one duration, and the film carries its meaning in
captions and cards. agentic-screencast record opens the recording UI where
a person reads the beats one by one; recorded then picks those takes up.

Each paragraph of prose is one beat: it has its own take, its own length and
its own cache key, so rewriting one sentence re-renders one beat. A line
starting with ~ gives the spoken variant of that beat, while the screen keeps
the written one. Reading rules (pronounce) and lang belong to the film.

The stub's cps is the pace a draft assumes; a real voice has its own.
Measured SpeechKit pace at speed 1, in spoken characters per second:

  kuznetsov  about 10
  filipp     about 12
  john       about 16

These are starting estimates for the measured voices and material, not
promised durations for every text. Scenes timed on a wrong pace come out longer or shorter in the final,
and their timing has to be redone. Measure the pace first: voice one scene
with the final voice without drawing it —
  build --only <scene> --keys-only --voice-json '<the final voice>'
— and set the stub's cps to that scene's characters divided by the seconds
its beats report (spoken). That scene's takes are cached by text and voice,
so the final build does not pay for them again.

pitch in the voice data shifts every beat by that many semitones after
synthesis and keeps its length: voice: {"engine":"speechkit","name":"filipp",
"pitch":-3} gives a lower, heavier read. The take is cached without the
shift, so trying another pitch synthesises nothing and costs nothing.

Which voice a film gets is agreed with its owner — the rules are in the skill,
section Voice. voices lists what an engine offers; voice-check exercises an
external one.`;

/** Значение флага; без умолчания может отсутствовать. */
function arg(k: string): string | undefined;
function arg(k: string, d: string): string;
function arg(k: string, d?: string): string | undefined {
  const i = rest.indexOf(`--${k}`);
  return i >= 0 ? rest[i + 1] : d;
}

/**
 * Путь к сценарию: `--source`, иначе первое позиционное слово, иначе `story.md`.
 * Позиционную форму пишут чаще, чем флаг (`lint story.md`), и молча подставленный
 * `story.md` на её месте проверял бы не тот файл.
 */
function sourceArg(): string {
  const positional = rest[0] !== undefined && !rest[0].startsWith("-") ? rest[0] : undefined;
  return arg("source") ?? positional ?? "story.md";
}

// Команда работает в своём процессе, а тот — в своей группе процессов: прерывание команды
// (Ctrl+C, SIGTERM) пересылается всей группе, и сборка уходит вместе со своими ffmpeg и
// браузерами. Прежде ждали синхронно, и прерванная команда оставляла сборку жить сиротой.
const run = (file: string, args: string[]): void => {
  const child = spawn("node", [resolve(HERE, file), ...args], { stdio: "inherit", detached: true });
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
    process.on(sig, () => { try { process.kill(-child.pid!, sig); } catch { /* группа уже закончилась */ } });
  }
  child.on("exit", (code, signal) => process.exit(code ?? (signal ? 128 + 15 : 1)));
};

const HOME = resolve(process.env.AGENTIC_SCREENCAST_HOME ?? resolve(process.cwd(), ".agentic-screencast"));

/** Источник → порождённые слайды и сцены. Ничего рукописного между ними. */
/** Разбор источника с внятной ошибкой: стек здесь не помогает никому. */
function readSource(path: string): Source {
  try { return parseSource(path); }
  catch (e) {
    const err = e as { sourceError?: boolean; code?: string; message?: string };
    if (err.sourceError || err.code === "ENOENT") {
      console.error(err.sourceError
        ? msg("source.error", { path, why: String(err.message) })
        : msg("source.notFound", { path }));
      process.exit(2);
    }
    throw e;
  }
}

/** Готовые данные в обход сценария: внятная ошибка вместо стека. */
function requireFile(path: string, what: "Slides" | "Scenes" | "Scene"): string {
  if (existsSync(path)) return path;
  // Подсказка называет источник только там, где подкоманда его принимает:
  // у `verify` входом служит сцена, и совет «--source» увёл бы читателя.
  const hint = ["build", "check", "script", "slides"].includes(cmd)
    ? msg("cli.hintSource", { cmd: String(cmd) })
    : msg("cli.hintScene", { cmd: String(cmd) });
  console.error(`${msg("cli.fileMissing", { what: msg(`cli.file${what}`), path })}\n${hint}`);
  process.exit(2);
}

/**
 * Источник → слайды и данные сборки. Само порождение живёт в отдельном
 * модуле: им пользуется и сервер интерфейса записи, и второй способ
 * породить слайды разошёлся бы с первым молча.
 */
function generate(sourcePath: string): { src: Source; pitchFile: string; slidesDir: string } {
  // Разбор идёт через `readSource`: он превращает ошибку сценария
  // во внятный отказ. Порождение — общее с сервером интерфейса записи.
  try {
    return generateSlides(readSource(sourcePath));
  } catch (e) {
    console.error(String((e as Error).message));
    process.exit(1);
  }
}

/**
 * `<команда> --help`: строки справки об этой команде — её вызов и абзац из темы, где она
 * описана. Прежде флаг уходил самой команде: `frames --help` собирал лист кадров по сценарию
 * по умолчанию и падал стеком.
 */
function commandHelp(name: string): string | null {
  const own = new RegExp(`^\\s+agentic-screencast (?:[\\w-]+\\|)*${name}(?:\\|[\\w-]+)*(?:\\s|$)`);
  const out: string[] = [];
  const topics: Array<[string, string]> = [["", HELP], ["video", VIDEO_HELP], ["capture", CAPTURE_HELP], ["overlay", OVERLAY_HELP],
    ["text", TEXT_HELP], ["transitions", TRANSITIONS_HELP], ["sound", SOUND_HELP], ["themes", THEMES_HELP], ["slides", SLIDES_HELP],
    ["web", WEB_HELP], ["vertical", VERTICAL_HELP], ["voice", VOICE_HELP]];
  const seen: string[] = [];
  for (const [topic, text] of topics) {
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (!own.test(lines[i]!)) continue;
      const block = [lines[i]!];
      while (i + 1 < lines.length && /^ {5,}\S/.test(lines[i + 1]!)) block.push(lines[++i]!);
      const joined = block.join("\n");
      if (!out.includes(joined)) out.push(joined);
      if (topic && !seen.includes(topic)) seen.push(topic);
    }
  }
  if (!out.length) return null;
  return `${out.join("\n")}${seen.length ? `\n\nMore: ${seen.map((t) => `agentic-screencast help ${t}`).join(", ")}` : ""}`;
}

if (cmd && !cmd.startsWith("-") && cmd !== "help" && (rest.includes("--help") || rest.includes("-h"))) {
  const text = commandHelp(cmd);
  if (text) { console.log(text); process.exit(0); }
}

switch (cmd) {
  case undefined:
  case "help":
  case "--help":
  case "-h": {
    const topic = cmd === "help" ? rest[0] : undefined;
    if (topic === "video") console.log(VIDEO_HELP);
    else if (topic === "capture") console.log(CAPTURE_HELP);
    else if (topic === "overlay") console.log(OVERLAY_HELP);
    else if (topic === "themes") console.log(`${THEMES_HELP}\n${THEME_GROUPS.map(([title, keys]) => `\n  ${title}:\n${wrapTokens(keys)}`).join("")}`);
    else if (topic === "slides") console.log(SLIDES_HELP);
    else if (topic === "vertical") console.log(VERTICAL_HELP);
    else if (topic === "text") console.log(TEXT_HELP);
    else if (topic === "transitions") console.log(TRANSITIONS_HELP);
    else if (topic === "sound") console.log(SOUND_HELP);
    else if (topic === "voice") console.log(VOICE_HELP);
    else if (topic === "web") console.log(WEB_HELP);
    else if (!topic) console.log(HELP);
    else { console.error(`${msg("cli.unknownTopic", { topic })}\n\n${HELP}`); process.exit(2); }
    break;
  }
  case "handover": {
    // Одни ворота перед сдачей: lint, отчёт последней сборки, контрольные кадры и чеклист.
    try {
      const result = handover(sourceArg(), arg("film"));
      console.log(JSON.stringify(result, null, 1));
      process.exit(result.verdict === "pass" ? 0 : 1);
    } catch (e) { console.error((e as Error).message); process.exit(2); }
    break;
  }
  case "craft": {
    // Правила базы по теме решения: текст — из docs/film-craft.md, здесь только выбор.
    const topic = rest.find((x) => !x.startsWith("-"));
    if (!topic) { console.log(msg("craft.topics", { topics: Object.keys(TOPICS).join(", ") })); break; }
    try {
      const rules = craft(topic);
      if (rest.includes("--json")) console.log(JSON.stringify({ topic, rules }, null, 1));
      else console.log(rules.map((r) => `${r.rule} · ${r.title}\n  ${r.text}`).join("\n\n"));
    } catch (e) { console.error((e as Error).message); process.exit(2); }
    break;
  }
  case "version":
  case "--version":
  case "-v": {
    console.log(VERSION);
    break;
  }
  case "script": {
    // Читаемый сценарий ПЕЧАТАЕТСЯ, а не хранится файлом: копия ушла бы
    // жить своей жизнью, ради устранения чего всё и делалось.
    console.log(toScript(readSource(sourceArg())));
    break;
  }
  case "scenes": {
    // Сцены источника машине — вход для проверки по `agentic-screencast schema`.
    // Без этой команды описание формата было бы нечем воспользоваться:
    // сценарий это текст, схема проверяет JSON, и подать ей на вход было
    // бы нечего. Печатается ровно то, что вернул разбор, без второй формы.
    console.log(JSON.stringify(readSource(sourceArg()).scenes, null, 1));
    break;
  }
  case "build": {
    // Источник — вход по умолчанию; готовые данные берутся, только если
    // о них попросили явно.
    const source = arg("pitch") || arg("deck") ? arg("source") : sourceArg();
    if (source) {
      const { src, pitchFile } = generate(source);
      const voiceJson = arg("voice-json") ?? JSON.stringify(src.voice ?? {});
      run("build.js", ["--pitch", pitchFile, "--out", arg("out", `${HOME}/pitch.mp4`),
        ...(voiceJson && voiceJson !== "{}" ? ["--voice-json", voiceJson] : []),
        ...(arg("only") ? ["--only", arg("only")!] : []),
        ...(rest.includes("--keys-only") ? ["--keys-only"] : [])]);
      break;
    }
    const deck = arg("deck");
    if (deck) {
      requireFile(deck, "Slides");
      const r = spawnSync("node", [resolve(HERE, "slides.js"), deck,
        resolve(dirname(deck), SLIDES_DIR)], { stdio: "inherit" });
      if (r.status) process.exit(r.status);
    }
    // Голос задаётся либо парой флагов, либо объектом целиком: у провайдера
    // могут быть свои параметры (темп у SpeechKit), и они не должны теряться.
    const voiceJson = arg("voice-json");
    run("build.js", ["--pitch", requireFile(arg("pitch", ""), "Scenes"),
      "--out", arg("out", `${HOME}/pitch.mp4`),
      ...(voiceJson ? ["--voice-json", voiceJson]
        : ["--voice", arg("voice", "kuznetsov"), "--engine", arg("engine", "speechkit")]),
      ...(rest.includes("--keys-only") ? ["--keys-only"] : [])]);
    break;
  }
  case "slides": {
    // Третий потребитель тоже ходит от источника: без этого слайды остались бы
    // единственным, что нельзя пересобрать из сценария одной командой.
    const source = arg("deck") ? undefined : sourceArg();
    if (source) { const { slidesDir } = generate(source); console.log(slidesDir); break; }
    const deck = requireFile(arg("deck") ?? "", "Slides");
    run("slides.js", [deck, arg("out", resolve(dirname(deck), SLIDES_DIR))]);
    break;
  }
  case "order": {
    // Порядок сборки кадра: признак кадра меряет устоявшееся состояние
    // и к этому дефекту слеп по устройству.
    const source = arg("pitch") ? undefined : sourceArg();
    const pitchFile = source ? generate(source).pitchFile
      : requireFile(arg("pitch") ?? "", "Scenes");
    run("order-check.js", [pitchFile]);
    break;
  }
  case "check": {
    const source = arg("pitch") ? undefined : sourceArg();
    const pitchFile = source ? generate(source).pitchFile
      : requireFile(arg("pitch") ?? "", "Scenes");
    run("slide-check.js", [pitchFile, arg("at", "0.95")]);
    break;
  }
  case "verify": {
    // Порядок важен: verify-render.js ждёт сцену, затем моменты, и только
    // потом флаги. Иначе флаг занимает позицию списка моментов и роняет разбор.
    // Образец сцены и каталог примера лежат в КОРНЕ продукта, а не рядом
    // с собранным кодом: они входят в поставку как данные, а не как модули.
    const scene = requireFile(arg("scene", resolve(HERE, "..", "scene.example.json")), "Scene");
    // Подложка сцены-образца порождаема, и в свежем клоне её ещё нет:
    // проверка ядра рендера падала сразу после клонирования, а в рабочем
    // дереве проходила на слайдах, оставшихся от прошлых запусков.
    // Порождаем молча — источник тут же, рядом.
    const page = resolve(HERE, "..", (JSON.parse(readFileSync(scene, "utf8")) as { page?: string }).page ?? "");
    const exampleSource = resolve(HERE, "..", "example/story.md");
    if (!existsSync(page) && existsSync(exampleSource)) generate(exampleSource);
    const probes = arg("probes", "0.8,1.8,2.6,3.4");
    const minD = arg("min-distinct", "20");
    run("verify-render.js", [scene, probes, "--min-distinct", minD]);
    break;
  }
  case "paths": {
    // Куда инструмент смотрит при нынешнем окружении. Печатает то, что
    // вычислено, а не пересчитывает: иначе в продукте появилось бы две
    // реализации разрешения пути и они разошлись бы молча.
    //
    // Сюда же попадают ресурсы, которые разрешают поставляемые движки
    // голоса. Спрашивать их важно: именно умолчание движка однажды и вело
    // за корень продукта, в каталог с внутренним именем чужого проекта.
    console.log(JSON.stringify({ home: HOME, cache: `${HOME}/cache`, ...builtinPaths() }, null, 1));
    break;
  }
  case "voice-check": {
    run("voice-check.js", rest);
    break;
  }
  case "provider-check": {
    // Договор о поставщике материала — внешний контракт, и утверждение
    // «моя программа ему соответствует» нечем подтвердить, кроме как
    // проверив её саму.
    run("provider-check.js", rest);
    break;
  }
  case "record": {
    // Интерфейс записи: страница поднимается своим сервером, потому что
    // микрофон браузер даёт только в защищённом контексте, а `file://`
    // туда не входит.
    // Запуск НЕ блокирующий, в отличие от прочих подкоманд: сервер живёт
    // до Ctrl+C, а при spawnSync родитель не может обработать сигнал —
    // он умирает первым и оставляет сервер сиротой, с занятым портом
    // и неубранным каталогом картинок. Сигнал передаётся серверу, и код
    // выхода — его.
    const server = spawn("node", [resolve(HERE, "record.js"), ...rest], { stdio: "inherit" });
    for (const signal of ["SIGINT", "SIGTERM"] as const) {
      process.on(signal, () => { server.kill(signal); });
    }
    server.on("exit", (code, signal) => process.exit(signal ? 0 : code ?? 0));
    break;
  }
  case "snapshot": {
    // Снятие страниц приложения в подложки. Отдельной командой, а не
    // отдельным файлом: у инструмента одна точка входа, и документировать
    // вторую значило бы обещать читателю два разных способа запуска.
    run("snapshot.js", rest);
    break;
  }
  case "schema": {
    // Машинно читаемое описание входного формата: чужой агент проверяет
    // свой сценарий до сборки, не читая разборщик.
    //
    // Сценарий здесь НЕОБЯЗАТЕЛЕН, но полезен: посторонние поставщики
    // объявлены в его шапке, и без него схема опишет только поставляемых.
    const source = arg("source");
    const declared = source ? JSON.stringify(readSource(source).providers ?? {}) : "{}";
    // `schema slides.steps` — короткая справка по виду; без вида — вся схема в JSON.
    const kind = rest.find((a, i) => !a.startsWith("--") && rest[i - 1] !== "--source");
    run("schema.js", [declared, ...(kind ? [kind] : [])]);
    break;
  }
  case "new": {
    // Заготовка сценария по жанру: копия скелета и его страниц рядом с материалом.
    const genre = rest[0];
    const dir = resolve(HERE, "..", "templates");
    const genres = readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "README.md" && f !== "checklist.md").map((f) => f.replace(/\.md$/, ""));
    if (!genre || !genres.includes(genre)) {
      console.error(msg("cli.newUsage", { genres: genres.join(", ") }));
      process.exit(2);
    }
    const out = resolve(arg("out", "story.md"));
    if (existsSync(out)) { console.error(msg("cli.exists", { path: out })); process.exit(2); }
    let text = readFileSync(resolve(dir, `${genre}.md`), "utf8");
    // Язык ролика — сразу в шапке: от него зависят надзаголовки слайдов, переносы и правила
    // чтения. Заготовки в угловых скобках — указания пишущему на любом языке; их заменяют текстом.
    // Общий разбор снял `--lang` в окружение варианта сценария; у `new` он значит язык заготовки.
    const lang = process.env.AGENTIC_SCREENCAST_FILM_LANG;
    if (lang !== undefined) {
      if (!/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/u.test(lang)) { console.error(msg("cli.langTag", { lang })); process.exit(2); }
      text = text.replace(/^lang: .*$/m, `lang: ${lang}`);
    }
    const format = arg("format");
    if (format) {
      try { parseFormat(format); } catch (e) { console.error((e as Error).message); process.exit(2); }
      text = /^format: .*$/m.test(text) ? text.replace(/^format: .*$/m, `format: ${format}`)
        : text.replace(/^(lang: .*)$/m, `$1\nformat: ${format}`);
      // Каше — приём широкого кадра: в высоком от него осталась бы узкая лента.
      if (format !== "landscape") text = text.replace(/^look: trailer$/m, "look: cinematic");
      // Ролик для телефона: где его смотрят (`zone`) — решение брифа, и строка стоит в шапке, чтобы
      // его приняли, а не унаследовали; речь для телефона плотнее не бывает — 13 знаков в секунду
      // (docs/vertical-video.md), и черновик меряет сцены этим темпом.
      if (format !== "landscape") {
        if (!/^zone: /m.test(text)) text = text.replace(/^(format: .*)$/m, "$1\nzone: platform");
        text = text.replace(/^(voice: \{"engine":"stub",[^\n]*"cps":)15\}$/m, "$113}");
      }
    }
    writeFileSync(out, text);
    const pages = resolve(dirname(out), "pages");
    mkdirSync(pages, { recursive: true });
    for (const f of readdirSync(resolve(dir, "pages"))) {
      if (!existsSync(resolve(pages, f))) copyFileSync(resolve(dir, "pages", f), resolve(pages, f));
    }
    // Чеклист ролика — рядом со сценарием: путь от брифа до передачи с обязательными артефактами,
    // решение по каждому приёму и правила базы знаний, взятые из её заголовков в момент заготовки,
    // чтобы список не расходился с базой.
    const checklist = resolve(dirname(out), "checklist.md");
    if (!existsSync(checklist)) {
      const craft = readFileSync(resolve(HERE, "..", "docs", "film-craft.md"), "utf8");
      const rules = [...craft.matchAll(/^## (\d+)\. (.+)$/gm)].map((m) => `- ${m[1]}. ${m[2]}`).join("\n");
      writeFileSync(checklist, readFileSync(resolve(dir, "checklist.md"), "utf8").replace("<!-- film-craft rules -->", rules));
    }
    console.log(JSON.stringify({ scenario: out, pages, checklist, next: `agentic-screencast frames --source ${basename(out)}` }, null, 1));
    break;
  }
  case "web": {
    // Готовый ролик — в форматах для страницы: AV1, VP9 и запасной H.264, постер и <video>.
    run("web.js", rest);
    break;
  }
  case "lint": {
    // Режиссёрские правила по сценарию: до сборки и без синтеза.
    run("lint.js", [sourceArg()]);
    break;
  }
  case "frames": {
    // Кадры без сборки: лист по одному кадру на сцену или один кадр сцены.
    run("frames.js", [sourceArg(), ...rest.filter((x, i) => x !== "--source" && rest[i - 1] !== "--source"
      && !(i === 0 && !x.startsWith("-")))]);
    break;
  }
  case "sheet": {
    // Лист кадров сырого клипа с таймкодами — выбрать куски from/to без сборки.
    run("sheet.js", rest);
    break;
  }
  case "theme": {
    // Тема в фирменных цветах: по картинке бренда или по названным цветам.
    // В стандартный вывод идёт JSON, строка для шапки — в него же и в поток
    // ошибок для человека.
    const from = arg("from"), colors = arg("colors");
    if (!from && !colors) {
      console.error(msg("cli.themeUsage"));
      process.exit(2);
    }
    try {
      const found = colors ? colors.split(/[\s,]+/).filter(Boolean).map(parseHex) : dominantColors(from!);
      const theme = brandTheme(found, arg("base", "neutral"));
      const header = `theme: ${JSON.stringify(theme)}`;
      process.stderr.write(`${header}\n`);
      console.log(JSON.stringify({ found: found.map((c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")),
        theme, header }, null, 1));
    } catch (e) {
      console.error(String((e as Error).message));
      process.exit(1);
    }
    break;
  }
  case "voices": {
    // Список голосов спрашивается у движка, названного данными голоса.
    // Поставляемый отвечает сам, посторонний — своей подкомандой.
    const voiceJson = arg("voice-json");
    const voice = voiceJson ? JSON.parse(voiceJson) : { engine: arg("engine", "speechkit") };
    try {
      console.log(JSON.stringify(await engineFor(voice).voices(), null, 1));
    } catch (e) {
      console.error(String((e as Error).message));
      process.exit(1);
    }
    break;
  }
  default:
    console.error(`${msg("cli.unknownCommand", { cmd: String(cmd) })}\n\n${HELP}`);
    process.exit(1);
}
