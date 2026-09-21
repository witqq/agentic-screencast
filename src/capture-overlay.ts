/** Browser-side overlay installed on every page document during live capture.
 * Pointer motion and the click ripple are driven by real DOM input events. */
export function installCaptureOverlay(): void {
  // addInitScript also runs in child frames; the recording needs one cursor
  // in the page viewport, not a separate one inside every embedded frame.
  if (window.top !== window) return;
  type TraceEvent = { kind: "down" | "click"; x: number; y: number; at: number };
  type CaptureState = { position: { x: number; y: number } | null; trace: TraceEvent[] };
  const key = "__agenticScreencastCapture_v1";
  const w = window as unknown as Window & Record<string, CaptureState>;
  if (w[key]) return;
  const state: CaptureState = { position: null, trace: [] };
  w[key] = state;

  let cursor: HTMLElement | null = null;
  let effects: HTMLElement | null = null;
  const mount = (): void => {
    if (!document.documentElement || cursor) return;
    const host = document.createElement("div");
    host.setAttribute("data-agentic-screencast-capture", "");
    host.setAttribute("aria-hidden", "true");
    host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none";
    const shadow = host.attachShadow({ mode: "closed" });
    shadow.innerHTML = `<style>
      :host{pointer-events:none}
      #cursor{position:absolute;left:0;top:0;width:27px;height:27px;display:none;
        filter:drop-shadow(0 3px 5px rgba(0,0,0,.65));pointer-events:none}
      #effects{position:absolute;inset:0;pointer-events:none}
      .ripple{position:absolute;width:20px;height:20px;border:3px solid #20c6d0;
        border-radius:50%;box-shadow:0 0 0 6px rgba(32,198,208,.22);
        transform:translate(-50%,-50%);animation:pulse .65s ease-out forwards}
      @keyframes pulse{from{opacity:1;scale:.5}to{opacity:0;scale:4.1}}
    </style><div id="effects"></div><svg id="cursor" viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"><path d="M4 2 L4 20 L9 15.5 L12 22 L15 20.5 L12 14.2 L19 14 Z"
      fill="#f7f9ff" stroke="#0d1017" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
    document.documentElement.appendChild(host);
    cursor = shadow.querySelector<HTMLElement>("#cursor");
    effects = shadow.querySelector<HTMLElement>("#effects");
    if (state.position && cursor) {
      cursor.style.display = "block";
      cursor.style.transform = `translate(${state.position.x}px,${state.position.y}px)`;
    }
  };

  const move = (x: number, y: number): void => {
    state.position = { x, y };
    mount();
    if (cursor) {
      cursor.style.display = "block";
      cursor.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
    }
  };
  document.addEventListener("pointermove", (event) => move(event.clientX, event.clientY), true);
  document.addEventListener("pointerdown", (event) => {
    move(event.clientX, event.clientY);
    state.trace.push({ kind: "down", x: event.clientX, y: event.clientY, at: performance.now() });
    if (state.trace.length > 1000) state.trace.shift();
    if (!effects) return;
    const ripple = document.createElement("div");
    ripple.className = "ripple";
    ripple.style.left = `${event.clientX}px`;
    ripple.style.top = `${event.clientY}px`;
    effects.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 700);
  }, true);
  document.addEventListener("click", (event) => {
    state.trace.push({ kind: "click", x: event.clientX, y: event.clientY, at: performance.now() });
    if (state.trace.length > 1000) state.trace.shift();
  }, true);
  if (document.documentElement) mount();
  else document.addEventListener("DOMContentLoaded", mount, { once: true });
}
