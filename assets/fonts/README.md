# Bundled fonts

The fonts the themes use, so a film renders with the same letters on every machine. Files are the
Latin and Cyrillic `woff2` subsets published by [Fontsource](https://fontsource.org) from Google Fonts —
variable fonts as one file per alphabet (`<id>-latin.woff2`, `<id>-cyrillic.woff2`), static ones as a
file per weight (`fira-sans-<alphabet>-<weight>.woff2`), Playfair also in italic. Every font is under
the SIL Open Font License 1.1: commercial use, embedding and rendering into video are allowed; the
font files may not be sold by themselves. Each font's licence text is beside it as
`<id>.LICENSE.txt`.

`src/fonts.ts` lists them and turns the ones a theme names in `--display`, `--sans`, `--mono` and `--sub-font` into
`@font-face` rules with the files embedded, so pages load them without network or disk access.

| Family | Id | Licence | Source and licence text |
|---|---|---|---|
| Geologica | `geologica` | OFL-1.1 | https://fontsource.org/fonts/geologica · `geologica.LICENSE.txt` |
| IBM Plex Sans | `ibm-plex-sans` | OFL-1.1 | https://fontsource.org/fonts/ibm-plex-sans · `ibm-plex-sans.LICENSE.txt` |
| JetBrains Mono | `jetbrains-mono` | OFL-1.1 | https://fontsource.org/fonts/jetbrains-mono · `jetbrains-mono.LICENSE.txt` |
| Playfair | `playfair` | OFL-1.1 | https://fontsource.org/fonts/playfair · `playfair.LICENSE.txt` |
| Literata | `literata` | OFL-1.1 | https://fontsource.org/fonts/literata · `literata.LICENSE.txt` |
| PT Mono | `pt-mono` | OFL-1.1 | https://fontsource.org/fonts/pt-mono · `pt-mono.LICENSE.txt` |
| Unbounded | `unbounded` | OFL-1.1 | https://fontsource.org/fonts/unbounded · `unbounded.LICENSE.txt` |
| Exo 2 | `exo-2` | OFL-1.1 | https://fontsource.org/fonts/exo-2 · `exo-2.LICENSE.txt` |
| Press Start 2P | `press-start-2p` | OFL-1.1 | https://fontsource.org/fonts/press-start-2p · `press-start-2p.LICENSE.txt` |
| Cormorant Garamond | `cormorant-garamond` | OFL-1.1 | https://fontsource.org/fonts/cormorant-garamond · `cormorant-garamond.LICENSE.txt` |
| Jost | `jost` | OFL-1.1 | https://fontsource.org/fonts/jost · `jost.LICENSE.txt` |
| Raleway | `raleway` | OFL-1.1 | https://fontsource.org/fonts/raleway · `raleway.LICENSE.txt` |
| Commissioner | `commissioner` | OFL-1.1 | https://fontsource.org/fonts/commissioner · `commissioner.LICENSE.txt` |
| Victor Mono | `victor-mono` | OFL-1.1 | https://fontsource.org/fonts/victor-mono · `victor-mono.LICENSE.txt` |
| Manrope | `manrope` | OFL-1.1 | https://fontsource.org/fonts/manrope · `manrope.LICENSE.txt` |
| Golos Text | `golos-text` | OFL-1.1 | https://fontsource.org/fonts/golos-text · `golos-text.LICENSE.txt` |
| Geist Mono | `geist-mono` | OFL-1.1 | https://fontsource.org/fonts/geist-mono · `geist-mono.LICENSE.txt` |
| Oswald | `oswald` | OFL-1.1 | https://fontsource.org/fonts/oswald · `oswald.LICENSE.txt` |
| Rubik | `rubik` | OFL-1.1 | https://fontsource.org/fonts/rubik · `rubik.LICENSE.txt` |
| Tektur | `tektur` | OFL-1.1 | https://fontsource.org/fonts/tektur · `tektur.LICENSE.txt` |
| Fira Sans | `fira-sans` | OFL-1.1 | https://fontsource.org/fonts/fira-sans · `fira-sans.LICENSE.txt` |
| Martian Mono | `martian-mono` | OFL-1.1 | https://fontsource.org/fonts/martian-mono · `martian-mono.LICENSE.txt` |
| Forum | `forum` | OFL-1.1 | https://fontsource.org/fonts/forum · `forum.LICENSE.txt` |
| Onest | `onest` | OFL-1.1 | https://fontsource.org/fonts/onest · `onest.LICENSE.txt` |
