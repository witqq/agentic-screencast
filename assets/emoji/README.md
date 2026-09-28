# Bundled emoji

A curated subset of [Noto Emoji](https://github.com/googlefonts/noto-emoji) 2D SVG images,
licensed under the Apache License 2.0 (see `LICENSE` in this directory; Copyright 2013 Google,
Inc.). Files keep their upstream names: `emoji_u<code points in lower case joined by _>.svg`,
with every `FE0F` removed.

Agentic Screencast draws every emoji in a film as an image from this set, so a frame looks the
same on macOS and on a Linux CI machine without a colour emoji font. A film can add more Noto
images with the `emoji` header field (`emoji: {"dir":"emoji"}`) — see `docs/visual-assets.md`.
