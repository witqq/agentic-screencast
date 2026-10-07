# Direct a scene around a visible change

A film's scene should have an arrangement that explains the subject, an action that happens with the spoken line, and a readable result. Choose those before selecting an effect. A string of nearly identical HTML pages with new captions does not show a mechanism. A camera rectangle alone cannot show ownership, a copied value, a queued event or a branch producing two results.

This guide covers interface orientation, Report compositions and their speech clock, worked scene recipes, existing effects, and automatic vertical conversion. Choose staging from [the viewer's understanding](directing.md) and [combination guidance](combinations.md); the worked examples offer alternatives to adapt. These are directing recommendations, not extra validation steps or per-film approval gates.

## Show the whole interface before a detail

Every system interface, in every format, first appears as its complete application screen. The viewer must be able to place the navigation, workspace and the panel being discussed before a spotlight, zoom, magnifier or crop draws attention to that panel. An isolated fragment is a poor opening because its location is unknowable. Establish a substantially different screen again after navigation.

The whole screen is a map; it does not need to make every small label readable. The following detail shot is where the viewer reads the control or result. Put that movement on the narration: the first paragraph names the workspace and the location of the subject, the next names the detail and carries the push-in. Keep a recognizable landmark during the travel, or use `overlay.loupe` when the whole screen should stay visible throughout.

| Material | Establishing view | Detail |
| --- | --- | --- |
| Live product take | Record the whole relevant application viewport from the start | `autoZoom`, marked `spotlight`, or the real capture camera |
| Saved `page` or `report` | Begin with the whole screen/section visible and `zoom: 1`; reserve the opening paragraph for orientation | A `spotlight` or `overlay.camera` cue at `b2` or later |
| Screenshot | `slides.shot`, a `device` frame, or a full picture in a Report object | A following camera move, loupe or detail composition |
| Native portrait application | Show its whole portrait viewport first | The same narrated detail sequence |
| Unmarked supplied recording | Default `fit: contain`, a device frame, or a separate full-view opening | Detail scenes cut from the same recording |

A viewport is the complete screen currently captured, not a whole long scrollable document. Crop private data before capture while retaining enough of the application layout for orientation. A supplied fragment needs an accompanying whole-screen image or recording.

## Use Report as a scene composition tool

A `report` scene rebuilds the original declarative Markdown with Agentic Report. Report owns responsive arrangement and named-object state; Screencast binds its cues to the measured narration clock. It is useful for explaining how an interface or subsystem works when a live take cannot expose the mechanism. Label pseudocode, invented values and diagrams as illustrative; use a real take to prove product behavior.

| Question | Report `composition.kind` | Typical visible action |
| --- | --- | --- |
| What changed in this model, and which code does it? | `diagram-code` | Copy inherited content, replace the local value, focus the corresponding code lines |
| Where does the input travel? | `pipeline` | Connect stages, then transfer the value along the route |
| What is different, or what two results come from one source? | `before-after` | Replace a result and compare the two objects |
| Where does this fragment belong? | `overview-detail` | Keep the full interface beside its explanation and focus the relevant object |
| Who owns the value before and after this step? | `ownership` | Copy into an independent owner, or transfer out of a temporary owner |

Inside `::::composition{id="..." title="..." kind="..."}`, write `:::object{id="..." title="..." role="..."}` with ordinary Markdown, an image, diagram or code fence. Roles are `visual`, `source`, `result`, `code` and `detail`. Then write leaf cues:

```markdown
::cue{at="b2" action="copy" target="source" to="local" duration="0.8"}
::cue{at="b2+0.8" action="focus" target="code" lines="1"}
::cue{at="b3" action="replace" target="local" value="Glow + new shadow"}
::cue{at="b4" action="compare" target="source" to="local"}
```

The eight actions are `reveal`, `focus`, `connect`, `copy`, `transfer`, `replace`, `compare` and `camera`. `copy` leaves the source intact; `transfer` empties it when the value arrives. `replace` changes the body to plain text while keeping its title; pre-author another object for a complex Markdown/code state. `connect` draws a labelled route; `focus` selects an object or code lines; `compare` emphasizes two objects together. `camera` is a restrained stage move. For an actual reading close-up, use the film's camera or loupe.

Object names are local to the composition; destination objects must be distinct and already authored. Movement defaults to 0.6 seconds, and a dependent replacement should follow arrival. Cues at the same anchor run in source order. A stage supports 1–16 objects and up to 64 cues. The Agentic Report skill's `references/directed-scenes.md` and its generated directive schema give the complete grammar.

### Bind the picture to speech

In a filmed Report, `b1`, `b2`, `b3.end` and offsets such as `b2+0.4` resolve to the scene's actual measured paragraph starts and speech ends. They are not guessed seconds. Changing voice or narration length changes these moments automatically. Report's standalone three-second beats are a preview convention, not final film timing. A missing paragraph anchor fails rather than silently using a different beat. Direct seeks reconstruct object state, including undoing a later replacement; static, reduced-motion and printed Reports show final object values.

A source scene needs no additional composition scheduling field:

```markdown
## edit · report
report: reports/first-edit/report.md
target: [data-composition-id="first-edit"]
mustRead: [data-composition-object="shape"]
zoom: 1
spotFrom: 999s

The shape first inherits both effects from its layout.

Before its first local edit, the inherited value is copied into the shape.

The edit replaces the shadow and keeps the glow.

The original and the local value now differ in one property.
```

`target` selects and frames the complete composition stage, excluding surrounding page introductions and source links while reserving a caption lane; use a specific composition id rather than generic `[data-composition]`, which other Report section layouts also use. `zoom: 1` preserves the authored arrangement, while `spotFrom: 999s` prevents the page provider's default whole-stage spotlight from competing with object cues. Every cue anchor must refer to a paragraph present in the scene narration. Add an explicit film camera cue only when it earns a separate close-up.

Use coordinated local Report and Screencast builds for these examples. The Report compiler must expose the `composition`, `object` and `cue` directives and Screencast must contain the composition clock bridge. A package version alone does not establish those capabilities. From a source checkout, use `node <checkout>/dist/agentic-screencast.js` and install/link that Report build in the film project; do not fetch the skill's older pinned Report release for new syntax.

## Worked directing recipes

### Inheritance and the first edit

Use `diagram-code`: the original owner and the local owner beside the operation. Show the relationship, copy the inherited value during the second paragraph, change one property during the third, then compare the owners. Focus the code line that performs each operation. Stable titles preserve identity while the body changes.

For the opening, a screenshot on `slides.perspective` introduces the subject with a real WebGL camera; a `zoom` transition leads into its mechanism. Read [first-edit.md](../example/directed-compositions/first-edit.md) and the source copied by its [prepare helper](../example/directed-compositions/prepare.mjs). The mechanism itself remains readable and planar so the copy and code changes carry the explanation.

### One semantic color, two results

Use `before-after` with the stored recipe above two results. Draw a connection to the resolved rendering color, replace that result, then connect to the expanded editable recipe and compare the outputs. This shows that the operations answer different questions without turning every paragraph into another identical diagram.

Use `slides.shot` to establish the source, one kinetic title to state the claim and a `move: dolly` before a directional `push` into the two paths. The complete film source is [theme-color.md](../example/directed-compositions/theme-color.md). Its color values are illustrative; replace them with inspected evidence when presenting a real system.

### A change crosses an event boundary

Use `ownership` for model, queue and consumer with code beside them. Replace the model value, connect and copy the notification into the queue, then transfer it to the consumer. Focus the relevant lines and end on the consumer. The queue empties on arrival, which distinguishes delivery from a second static box labelled with the same value.

A `slides.chain` with `enter: tilt3d` introduces the route, then a camera focus emphasizes the boundary and a `push` continues into the mechanism. See [change-event.md](../example/directed-compositions/change-event.md). Do not claim an event consumer implements rendering unless inspected code proves that.

### A full interface becomes a readable detail

Use the complete viewport first. The opening line names a landmark and the target's location; a camera cue at `b2` moves toward the target. Keep the target whole at the end, hold its reading shot and avoid placing subtitles over it. `captions: auto` can protect named flat controls; use an explicit top placement when the lower screen is the subject. A loupe is the better choice when the complete screen should stay in view.

The buildable [interface-overview example](../example/interface-overview/story.md) shows a whole fictional operations board, a continuous move, and the orders panel. Its [README](../example/interface-overview/README.md) gives the local command. It demonstrates composition, not real product evidence.

## Let existing effects do useful work

New Report actions complement the existing vocabulary. Actively choose from it while arranging a scene, rather than adding the same frame highlight everywhere.

| Scene purpose | Useful existing tools | How to compose them |
| --- | --- | --- |
| Introduce a system or screen | `slides.shot`, `slides.perspective`, `device`, `spotlight`, `overlay.loupe` | Whole screen, named landmark, then one detail |
| Explain depth or a hierarchy | `slides.layers`, `slides.wall`, `slides.perspective`, `enter: tilt3d|flip3d`, supported `move: orbit3d` | Establish the object, reveal its depth, settle where the labels can be read |
| Show a sequence or flow | `slides.chain`, `slides.steps`, `overlay.camera`, Report diagram draw/pulse and composition transfer | Name the stages before the value travels; move along the same axis |
| Show a before/after or numerical result | `slides.beforeafter`, `slides.counter`, `slides.chart`, `morph`, `overlay.glints` | Establish the baseline, make the change visible, hold the result |
| Show a saved interface responding | `overlay.actions`, pointer `drag`, `glide`, `boops`, `thinking`, `toasts` | Press, response, readable result; mark the scene as illustrative |
| State a short claim | Kinetic title styles, `transition: zoom|push|morph`, supported `move: dolly` | One clear entrance or camera idea, then a calm reading hold |

Read the kind's schema before choosing `move`: different kinds support different moves, and a chain does not accept every slide camera name. Report pointer tilt/depth effects need a pointer; they do not become a filmed 3D camera simply because a screenshot is taken. Large flashes, shakes and particle bursts belong to a genre and a specific moment, not every explainer frame. Use the [motion-design guide](motion-design.md) for curves and effect recipes and [visual-design](visual-design.md) for type, spacing, image treatment and theme choice.

Code objects in `pipeline`, `before-after` and `ownership` receive a complete row below the visual objects; use `diagram-code` for shorter code beside the mechanism. `focus` without `lines` leaves code lines at full opacity; an explicit line selection dims only other lines, and a later focus clears it. Connections use live object-boundary ports, rounded routes around visible objects and persistent arrowheads. Labels follow free route space; compact moving copies follow the same route between their owners. Attachments update during entrances, body replacement, fitting and camera movement. Keep owners separate and transfer short readable values rather than a full code listing.

Vary the composition when the viewer's question changes: a screen for orientation, a diagram beside code for a mechanism, a route for delivery, a comparison for the result. Keep a stable visual identity and a limited set of transitions. Effects should make these relations visible and give important moments weight; constant jitter beneath reading text works against that.

## Automatic vertical overview

When converting a landscape scenario with `build --format vertical`, a `page` scene keeps its original landscape viewport. The camera first scales that complete screen to fit the portrait frame, with centered space around it, then blends into the authored detail path. This avoids both relaying out the application's screen and opening on an unexplained crop. A native `pageVertical` replacement is still laid out as its own page and must establish its own whole screen.

The same overview applies to reframed capture takes identified by `.marks.json` or `autoZoom`. Opening actions continue at their recorded times; the conversion does not trim, freeze, repeat or postpone them. A capture without focus stays in its contained full view. A frozen video frame uses the page-camera path. Ordinary unmarked supplied video retains its existing crop behavior, so establish a UI recording explicitly with `contain`, `device`, or a full-view opening when it is not a capture take.

The opening hold is at least the smaller of 1.2 seconds and one fifth of the scene, and continues until the first focus cue when that is later. The transition takes up to 0.9 seconds, also bounded by one fifth of the scene. This camera path is a function of scene time. Use a deliberate opening paragraph and `b2` focus for a meaningful orientation, rather than putting the first action into a tiny crop at time zero. The automatic overview protects spatial context; it cannot invent a missing establishing screen or restore detail absent from a low-resolution source.

Captions, titles and cards render separately at output size, while interface highlights follow the material's camera. For a messenger or embedded film use `zone: plain`; a feed uses its platform zone. Whole-screen labels may be small during orientation, but the target must be readable in the following close-up. Check those two moments in the normal draft review; no extra round of validations is required.

## Preview the actual portrait window

`frames --format vertical` uses the final builder's original landscape viewport, opening overview and detail window for converted pages and captures. Native `pageVertical` sources keep their portrait layout. Preview timing uses estimated speech; final timing uses measured beats. Choose the camera with that actual window: an explicit `scale` is a multiplier, not a request to fit the whole target. Portrait conversion already enlarges the landscape height, so a small additional multiplier may suffice. Omit scale for the fitted target default, use `pan` for an intentionally wider reading area, or a loupe to retain context. For live capture, a broad text block may need a smaller explicit zoom or a `withFocusCard` without moving the camera.

Inspect the target and its readable state in the existing draft step; changing captions or camera merely to erase a pixel warning does not improve the composition.
