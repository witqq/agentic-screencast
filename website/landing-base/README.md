# Landing base

This folder holds the working material for the next version of the Agentic Screencast landing:
what the tool can do, what it knows, what the current landing gets wrong, and the plan for the new
one. The landing itself (`website/landing/`) is not changed here. The rework starts when the owner
gives the signal, after the report tool has gained its new landing knowledge (see `plan.md`,
"Waiting for agentic-report").

| File | What it answers |
|---|---|
| `features.md`, `features.ru.md` | Every feature of the tool: what it does, what switches it on, how to show it, whether the current landing shows it |
| `check-inventory.mjs` | Confirms that the inventory names every scene kind, field, command and lint rule; run `node website/landing-base/check-inventory.mjs` after `npm run build` |
| `knowledge.md`, `knowledge.ru.md` | What the knowledge base teaches the agent, with its numbers, and how to show it |
| `audit.md` | The status of every section, card and clip of the current landing, with the commit behind each finding (in Russian) |
| `plan.md` | The proposed structure of the new landing, the edits to the current one, the card texts in both languages, and the map from the overview film's chapters to landing sections |
| `clips.md` | The clips cut from the overview film: file, chapter, features, the landing section each one serves |
| `frictions.md` | What went wrong while making the overview film, and what was done about it |

The overview film itself — its scenario, pages and takes — lives in `website/overview/`; its
builds and cut clips are kept outside the repository, in `agent_temp_files_local/overview/`.

Keeping this folder current: when a feature lands, add its row to `features.md` and
`features.ru.md` and run `check-inventory.mjs`; when the landing changes, update `audit.md`.
