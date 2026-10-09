# Directed explanations

These three films combine Report compositions with existing Screencast effects. The values and code are teaching examples, not a recording of a live product. Report owns the editable layout; each film owns its narration and effects.

From a copy of this directory, with Screencast installed, use Node 24.18 or newer and install Report:

```sh
npm install --save-dev agentic-report@0.21.0
node prepare.mjs
agentic-screencast build first-edit.md --out first-edit.mp4
agentic-screencast build theme-color.md --out theme-color.mp4
agentic-screencast build change-event.md --out change-event.mp4
```

`prepare.mjs` copies the three packaged Report examples into `reports/` only when absent, preserving your edits, then builds preview assets. The first film uses a WebGL perspective opening and a zoom into its mechanism. The second uses kinetic type, a dolly and an axial push into two color paths. The third uses a chain entrance in depth and a camera focus before the queue transfer. All use the free silent stub; captions carry the narration. Choose a configured voice for the final narrated film.

Inside each report scene, b1–b4 use the measured speech timeline. Changing a voice or narration length changes these moments automatically. Copy preserves the source; transfer leaves the source value empty; replace edits the destination. Keep object titles stable so the viewer continues to recognize each owner.
