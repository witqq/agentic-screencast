// Draws the film's own pages on the scene's clock. The build calls window.renderAt(t) before every
// frame with the scene's second; data-at on an element names its moment in the narration's anchors
// (b2, b2+0.4, b2.end), which the layer turns into seconds when the scene mounts.
//   data-at="…"                       the element eases in: --k goes 0 → 1 over 0.45 s, class "on"
//   data-type="text" data-cps="30"    the text types itself from its data-at
//   data-scroll                       a container that scrolls so its last shown line stays in view
// A page may define window.onRender(t, at) for its own drawing; at(el) reads an element's second.
(() => {
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const at = (el) => Number(el.dataset.at ?? 0);
  window.renderAt = (t) => {
    for (const el of document.querySelectorAll("[data-at]")) {
      const k = clamp((t - at(el)) / 0.45);
      el.style.setProperty("--k", k.toFixed(3));
      el.classList.toggle("on", t >= at(el));
    }
    for (const el of document.querySelectorAll("[data-type]")) {
      const n = Math.max(0, Math.floor((t - at(el)) * Number(el.dataset.cps ?? 30)));
      const full = el.dataset.type;
      el.textContent = full.slice(0, n);
      el.classList.toggle("typing", n > 0 && n < full.length);
    }
    for (const box of document.querySelectorAll("[data-scroll]")) {
      const shown = [...box.querySelectorAll("[data-at]")].filter((el) => t >= at(el));
      const last = shown[shown.length - 1];
      const over = last ? last.offsetTop + last.offsetHeight - box.clientHeight + 24 : 0;
      box.scrollTop = Math.max(0, over);
    }
    if (window.onRender) window.onRender(t, at);
  };
})();
