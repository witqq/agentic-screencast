# Ideas for later

This file keeps work the project has decided to do later: what it is, why it waits, and what has to
happen before it returns. When an item is taken up, it leaves this file.

## Bring back the Moira workflow

**What was there.** A public Moira workflow, `admin/agentic-screencast-video`, led an agent through
facts, scenario, materials, a free draft, narration and review, and sent each defect back to the step
that could fix it. It lived in `workflows/production/flows/agentic-screencast-video.json` with a
guide in `docs/moira.md` and `docs/moira.ru.md`, a check (`npm run workflow:check`,
`scripts/check-workflow.mjs`) and a section on the landing. All of it was removed on 2026-09-27; the
last version is in git history, commit `e0f505d` (for example `git show
e0f505d:workflows/production/flows/agentic-screencast-video.json`).

**Why it was removed.** The workflow was pinned to CLI 1.0.1, but its steps told the agent to run
`agentic-screencast new`, `frames` and `lint`, which 1.0.1 does not have: the commit that added them
(`f17923d`) is not an ancestor of the `v1.0.1` tag. An agent following the workflow would stop at a
command that does not exist. `workflow:check` did not compare the commands named in the steps with
the pinned version, so nothing caught it.

**What to rework before it returns.**

1. Pin the workflow to a released CLI version that has every command its steps name, or name only
   the commands of the pinned version.
2. Teach the workflow check to read every `agentic-screencast <command>` in the steps and compare it
   with the commands of the pinned version, taken from that version's tag.
3. Bring the workflow's steps in line with the current skill: the brief, the checklist, the voice
   pace measured before the draft, the stills, the vertical checks.

**What to bring back with it.**

- a section on the landing (`website/landing/report.md` and `report.ru.md`) and its check in
  `scripts/check-site.mjs`;
- the integration guide (`docs/moira.md`, `docs/moira.ru.md`), the package files and the
  `workflow:check` script in CI and in `docs/RELEASING.md`;
- a line in the skill and in `AGENTS.md` saying when to take the workflow instead of the plain CLI.
