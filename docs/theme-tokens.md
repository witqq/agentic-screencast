# Theme tokens shared with agentic-report

This document answers how Agentic Screencast's theme tokens correspond to agentic-report's, so that a
film and a report page made for the same product can wear one look. Both tools keep every visual value
in a theme as named CSS variables and ship themes under the same names; this table maps the variables
that mean the same thing. Our full contract is `THEME_KEYS` in `src/theme.ts` (`help themes`);
agentic-report's is `THEME_TOKENS` in its `src/authoring/theme-tokens.ts` (`schema --scope theme` from
0.18). The table is a working agreement between the two products, checked against both sources on
2026-09-29.

## Themes

Ten themes share their names and intent: `neutral` (the default in both), `frost`, `midnight`,
`calm-paper`, `daylight`, `noir`, `aurora`, `ember`, `blueprint` and `synthwave`. Agentic Screencast also
ships `blockbuster` (a trailer's genre theme); agentic-report ships `terminal`. A film and a page that
name the same theme look like one product; a brand theme built from the same colours
(`agentic-screencast theme --colors …`, `agentic-report theme --colors …`) does the same for a brand.

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
| soft accent: a highlight wash | `--sc-accent-soft` | `--color-accent-soft` |
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
ornaments; if a film gains such a role, its pair is ready. A shared core, when both tools adopt one, is the
three tables above.

## Values of same-named themes

The names match; the values have not been aligned. Whether one side is the reference is the owner's
decision. If they are aligned, it is to one contrast threshold — agentic-report checks its text and
background pairs at build, Agentic Screencast checks its themes with the theme test and `check` — not by
copying one side's colours into the other. The values are in `src/theme.ts` here and in `BUILT_IN_THEMES`
of agentic-report's `src/authoring/themes.ts`, for its light and dark schemes separately.
