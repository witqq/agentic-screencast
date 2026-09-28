# Landing base

This folder holds the content sources and selection map for the bilingual Agentic Screencast
landing in `website/landing/`. The page is authored as declarative Markdown and built with
agentic-report. Its four moving examples per language are selected in `clips.md`.

| File | What it answers |
|---|---|
| `features.md`, `features.ru.md` | Every feature of the tool, its control and a possible demonstration; their dated final column is an audit snapshot, not the current media selection |
| `check-inventory.mjs` | Confirms that the inventory names every scene kind, field, command and lint rule; run `node website/landing-base/check-inventory.mjs` after `npm run build` |
| `knowledge.md`, `knowledge.ru.md` | What the knowledge base teaches the agent, with its numbers, and how to show it |
| `audit.md` | The dated audit that informs the page copy and selection |
| `plan.md` | The current bilingual section map and product claims |
| `clips.md` | The four visible video slots per language and their exact source scenes |
| `frictions.md` | The overview-film findings behind product and knowledge claims |

The overview scenario, pages and capture scripts live in `website/overview/`. Large captures and
generated media stay outside Git; `clips.md` defines which short source excerpts the landing uses.

When a feature lands, update both feature inventories and run `check-inventory.mjs`. When page copy
or media selection changes, keep `plan.md`, `clips.md` and both landing reports in agreement.
