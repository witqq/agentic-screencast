# Establish the interface before its detail

This fictional operations screen demonstrates spatial orientation, not a recording of a real product. Copy this directory into a film project. With a local build of agentic-screencast, run:

```sh
node /path/to/agentic-screencast/dist/agentic-screencast.js build story.md --format vertical --out overview.mp4
```

Automatic vertical conversion retains the landscape viewport. It first fits that entire screen into the portrait frame, then smoothly approaches the orders panel at the second speech paragraph (`b2`). The interface remains at its original layout; captions are rendered at portrait size. The three named stills show the full screen, travel, and detail. Stub voice is silent and sets reproducible speech timings for this example.

For a horizontal film, the same opening paragraph establishes the whole screen before the camera cue. When filming a real system, capture its complete application viewport and introduce the location of the detail in that first paragraph. Keep the opening actions in the recording; an overview does not trim or pause the source.
