# Combine actions into a readable scene

This guide explains how camera, objects, type, sound and narration can work together. It extends the [motion research](motion-design.md), whose sources and timing ranges remain there. It provides choices for staging, not a new checklist or scoring system.

## A focus is a relation, not an animation count

Choose what the eye should follow and what supports that reading. A leading action carries the current discovery. Supporting actions identify its cause, destination or result. Ambient motion carries atmosphere and should stay subordinate. Several movements can form one event: a connector draws, a value travels, code highlights and a destination responds. They compete when they ask the viewer to read unrelated facts, move in unrelated directions or change the very text currently being read.

Scale, contrast, position, duration and sound all allocate attention. A small highlight can support a larger transfer. A slow background can coexist with a foreground entrance. Two equally loud new titles over two moving diagrams demand two reading tasks; choose a leader, separate their times or stage a deliberate comparison with corresponding positions.

## Choose simultaneity or sequence from the cause

| Relationship | Coordination | Why it reads |
| --- | --- | --- |
| Different views of the same operation | Copy and highlight its code at `b2`; quiet camera follows the destination | The views confirm the same cause |
| Arrival causes a change | Transfer at `b2`, replace after its duration, then hold | The result does not precede its input |
| One cause produces two results | Connect both paths, change both results together, compare | Shared timing expresses a shared trigger |
| Two independent causes | Establish one, let it register, introduce the other | The viewer can attribute each consequence |
| A press produces UI response | Pointer arrives, click/action share the instant, toast follows | Movement shows a coherent interaction |
| A new view continues the same object | Preserve the object through `morph` or the camera path | Identity survives the cut |
| A claim needs a reading close-up | Settle the object first, then push or loupe, then read | Travel and reading do not compete |

A Report cue sequence is declarative. Same-anchor cues are evaluated in source order; “same time” does not mean dependent actions magically wait for one another. `copy` leaves its source, `transfer` empties it on arrival, and `replace` changes plain text. If replacement depends on arrival, offset it by the transfer duration or use a later measured speech anchor. See [directed scenes](directed-scenes.md#bind-the-picture-to-speech) for limits and grammar.

```markdown
::cue{at="b2" action="connect" target="layout" to="shape" duration="0.7"}
::cue{at="b2" action="copy" target="layout" to="shape" duration="0.8"}
::cue{at="b2" action="focus" target="code" lines="2" duration="0.6"}
::cue{at="b2+0.8" action="replace" target="shape" value="Local shadow"}
::cue{at="b3" action="compare" target="layout" to="shape"}
```

This arrangement emphasizes one causal event. An alternative is to draw and read the relation on `b1`, copy on `b2`, hold the copied value, edit on `b3`, and compare on `b4`. The second staging spends more time on each intermediate state. A third begins with the comparison and reconstructs its cause. These alternatives answer different audience needs; none is the mandatory recipe for every ownership scene.

## Coordinate camera and object space

Keep the source and destination recognizable during a transfer. A following camera can support travel when direction and identity remain continuous. A close-up that removes the source too early can make a copy look like a replacement. Keep both visible, retain an overview beside the detail or settle into the close-up after arrival.

A stage camera, a film camera and a perspective slide are different tools. Report's `camera` gives a restrained stage move; the film's `spotlight` or `overlay.camera` provides a reading close-up; `slides.perspective` introduces a screenshot in depth. Avoid stacking independent camera paths with contradictory destinations. Coordinated camera and object movement are allowed: reason about the final readable framing and what the eye follows.

Pipeline, before-after and ownership give code a full-width row, so a connector can carry a relation above while the operation remains readable below. Diagram-code suits short code beside its mechanism. At film scale, a very large diagram and many code lines may still need separate views; layout validity alone does not guarantee readable words.

## Coordinate speech, words and sound

The spoken line should refer to the visible entity or change. A code highlight can identify the operation as the line explains it; a result can land on a key word; a sound can mark the same causal boundary. Subtitles serve sound-off viewers, so do not cover the relevant control or add a competing paragraph beside them. A short object title, a selected code line and subtitles can coexist when their roles and reading order are clear.

Use the film's measured anchors for the final timing. A voice change alters the length of speech; a fixed offset describes action duration, not an assumed speech duration. When the text needs reading, let narration interpret rather than demand another simultaneous reading task. Music can carry a whole passage; accents mark particular moments. Expressive rhythm is a choice for launches, trailers or emphatic explanations, not a genre prohibition on other films.

## Give movement and rest different jobs

A fast reveal can create surprise, a gradual reveal can invite investigation, a shared-object transition can preserve continuity and a hold can make the result feel decisive. Vary pace across meaningful moments. Repetition can teach a recurrent mechanism or create a deliberate motif; change the staging when repetition no longer adds understanding. There is no universal two-use quota.

While reading, quiet the movements that change scale, position or line breaks of the text. A stable code panel may accompany a moving value that the viewer has already recognized. If the moving value itself must be read, settle it. The useful question is what the viewer is processing at that moment, not whether there is exactly one animation or zero still pixels.

## Choose combinations from the available vocabulary

For depth, consider `perspective`, `layers`, `parallax`, `carousel`, `orbit3d` and supported `tilt3d`/`flip3d` entrances. For continuity, consider `morph`, directional `push`, a following camera and stable Report identities. For emphasis, consider kinetic titles, `count`, diagram draw/pulse, line focus, marks, glints and a timed sound. For interaction, consider actual capture first, then illustrative pointer/actions/thinking/toasts when reconstruction is appropriate.

Use the existing effects actively and read each kind's supported fields. A motion vocabulary list describes what a technique can express; help/schema describes what the implementation accepts. Combining three suitable tools is useful when they make one relationship clear. Adding three unrelated decorative tools to avoid a still scene is not the same decision.
