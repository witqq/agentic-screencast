# Theme tokens shared with agentic-report

This document answers how Agentic Screencast's theme tokens correspond to agentic-report's, so that a
film and a report page made for the same product can wear one look. Both tools keep every visual value
in a theme as named CSS variables and ship themes under the same names; this table maps the variables
that mean the same thing. Our full contract is `THEME_KEYS` in `src/theme.ts` (`help themes`);
agentic-report's is `THEME_TOKENS` in its `src/authoring/theme-tokens.ts` (`schema --scope theme` from
0.18). The table is a working agreement between the two products, checked against both sources on
2026-09-29.

## Themes

Eleven themes share their names and intent: `neutral` (the default in both), `frost`, `midnight`,
`calm-paper`, `daylight`, `noir`, `aurora`, `ember`, `blueprint`, `synthwave` and `terminal`, each with a
light and a dark scheme. Agentic Screencast also ships `blockbuster` (a trailer's genre theme, dark
only). A film and a page that name the same theme and scheme look like one product; a brand theme built
from the same colours (`agentic-screencast theme --colors …`, `agentic-report theme --colors …`) does
the same for a brand.

## Colour roles

| Role | Agentic Screencast | agentic-report |
|---|---|---|
| page background | `--bg` | `--color-bg` |
| surface: a card, a panel | `--card` | `--color-surface` |
| raised surface: above a card — our diagram node; their controls, popovers, chips, selected tiles | `--node` | `--color-surface-raised` |
| heading ink | `--ink` | `--color-heading` |
| body text | `--body` | `--color-text` |
| muted text | `--mut` | `--color-text-muted` |
| border | `--line` | `--color-border` |
| strong border: our node outline; their control frames, rules, quote and timeline bars | `--node-line` | `--color-border-strong` |
| the one accent | `--acc` | `--color-accent` |
| second accent | `--acc2` | `--color-accent-2` |
| soft accent: our click wave, translucent over any material; their opaque section background | `--sc-accent-soft` (from the file's `_film`) | `--color-accent-soft` |
| good / done | `--good` | `--status-done` |
| bad / returned | `--bad` | `--status-returned` |

## Type

| Role | Agentic Screencast | agentic-report |
|---|---|---|
| display face | `--display` | `--font-heading` |
| body face | `--sans` | `--font-body` |
| code face | `--mono` | `--font-mono`, `--font-code` |
| display weight | `--display-weight` | `--display-weight` |
| display tracking | `--display-tracking` | `--heading-tracking` |
| display case | `--display-case` | `--display-case` |

## Shape

| Role | Agentic Screencast | agentic-report |
|---|---|---|
| card radius | `--sc-card-radius` | `--radius-card` |
| control radius (a key cap, a button) | `--sc-keys-radius` | `--radius-control` |

## Without a counterpart

The film's own layer has no page equivalent: subtitles (`--sub-font`, `--sub-weight`, `--sc-sub-*`,
`--sc-karaoke-*`), the camera and spotlight (`--sc-spot*`, `--sc-dim`), the cursor, key caps, cards
drawn over a take, marks and effects, the progress bar and the live backgrounds (`--bg-motion`). The
page has no film equivalent for chart series (`--visual-1…6`), code highlighting (`--shiki-*`), the
review status (`--status-review`), a muted surface (`--color-surface-muted`), a strong accent
(`--color-accent-strong`), the focus ring (`--color-focus`), spacing, width, controls, elevation, motion and
ornaments; if a film gains such a role, its pair is ready. The colour roles are shared through the
palette file below; type and shape stay mapped by the tables, each product keeping its own values.

## Values of same-named themes

The colour of every role above, for all eleven shared themes in both schemes, lives in one file both
products keep byte for byte: `assets/palettes/shared-palettes.json` here, its copy in agentic-report.
The two soft accents differ on purpose, so the file gives the page's opaque `accent-soft` in the role
and our translucent click wave separately in `_film.sc-accent-soft`; `_pageExtra` carries colours only
the page has (chart series, code) and, where it gives code or marker colours, the film takes them too.
A unit test (`shared-palettes`) checks the file's agreed sha256 and that every theme and scheme repeats
its roles with 0 divergence; agentic-report runs the same check against its copy. The file changes only
by agreement of both, with the new sum written in both products at once.

The colours that are not roles — subtitles, cards, cursor, code, transitions — are Agentic
Screencast's own. A theme's default scheme keeps its hand-written set, recoloured onto the file's
roles; its other scheme is built from a theme of that scheme (`neutral` for light, `noir` for dark)
recoloured onto the theme's roles, with the theme's own fonts, shapes and stroke colours
(`THEME_SCHEMES` in `src/theme.ts`).
