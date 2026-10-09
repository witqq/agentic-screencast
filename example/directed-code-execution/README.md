# Real code, directed attention and prepared speech

This example shows two actual Agentic Report methods on illustrative inputs. It combines grouped
input/result regions, a short method beside a diagram, a broad long-method row, code annotations,
local focus, call/data relations and a transient return trace. The Russian speech dictionary keeps
original names in visible code and captions. The two stages in one source use different beat counts.

Copy this directory into a consumer workspace with coordinated local Report and Screencast builds:

```sh
node prepare.mjs
agentic-screencast script story.md --speech --json
agentic-screencast frames story.md --scene address --at b2+1 --out address.png
agentic-screencast frames story.md --scene source-lines --at b3+1.7 --out source-lines.png
```

The helper extracts complete current functions and runs the actual functions for their results.
It writes only the consumer's `report.md`; an existing editable report is kept unless `--refresh`
is supplied. It does not modify the installed Report example. The normal `report` provider rebuilds
that source. `frames` estimates timing; the final film binds cues to measured audio. No synthesis
or film is needed to examine these sources and stills.

For a portrait reading variant, use the same `frames` command with `--format vertical`; adapt the
amount of code per shot to the viewing size. A layout is an alternative for its subject, not a
universal film structure. To make a film when authorized, build `story.md` with the chosen voice;
the packaged default stub remains free and silent.
