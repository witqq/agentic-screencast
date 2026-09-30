/** Browser-side overlay installed on every page document during live capture.
 * Pointer motion and the click ripple are driven by real DOM input events.
 *
 * The same overlay carries the take's camera and highlight: `focus` pushes
 * the live page in on an element with a real CSS transform while the take is
 * recording, a spot dims everything around the element and follows it through
 * the move, and `key` shows the keys the take presses. All of it runs on the
 * page's own clock, because a live take is recorded in real time. */
export function installCaptureOverlay(arg: { theme?: Record<string, string>; fontCss?: string; click?: "ripple" | "spot" | "echo" } = {}): void {
  const theme = arg.theme ?? {};
  const clickEffect = arg.click ?? "ripple";
  // Шрифты темы — в документ страницы: внутри теневого корня @font-face не действует.
  if (arg.fontCss && !document.getElementById("__agentic-screencast-fonts")) {
    const faces = document.createElement("style");
    faces.id = "__agentic-screencast-fonts";
    faces.textContent = arg.fontCss;
    (document.head ?? document.documentElement)?.appendChild(faces);
  }
  // addInitScript runs in child frames too. Relay their real pointer events
  // through each parent so one cursor is painted in the page viewport.
  const isTop = window.top === window;
  type TraceEvent = { kind: "down" | "click"; x: number; y: number; at: number };
  type MoveEvent = { x: number; y: number; at: number };
  type CaptureState = {
    position: { x: number; y: number } | null; trace: TraceEvent[]; moves: MoveEvent[];
    focus?: (el: Element, opts: { scale: number; ms: number; dim: boolean }) => void;
    focusArea?: (area: [number, number, number, number], opts: { scale: number; ms: number; dim: boolean }) => void;
    unfocus?: (ms: number) => void;
    key?: (label: string) => void;
  };
  type PointerMessage = { source: "agentic-screencast-capture-v1";
    kind: "move" | "down" | "click"; x: number; y: number };
  const key = "__agenticScreencastCapture_v1";
  const w = window as unknown as Window & Record<string, CaptureState>;
  if (w[key]) return;
  const state: CaptureState = { position: null, trace: [], moves: [] };
  w[key] = state;

  let cursor: HTMLElement | null = null;
  let host: HTMLElement | null = null;
  // Форма курсора — по CSS-курсору элемента под ним, как у настоящей системы: рука над ссылкой и
  // кнопкой, текстовый курсор над полем, ладонь над тем, что тащат. Остриё (горячая точка) у
  // каждой формы своё, в долях рисунка 24×24: курсор ставится остриём ровно в точку указателя.
  const SHAPES: Record<string, { d: string; hx: number; hy: number; tilt: boolean }> = {
    arrow: { d: "M4 2 L4 20 L9 15.5 L12 22 L15 20.5 L12 14.2 L19 14 Z", hx: 4, hy: 2, tilt: true },
    hand: { d: "M9 3.2 C9 2.2 11 2.2 11 3.2 L11 11 L11.6 11 L11.6 9.4 C11.6 8.5 13.5 8.5 13.5 9.4 L13.5 11.2 L14.1 11.2 L14.1 10.1 C14.1 9.2 16 9.2 16 10.1 L16 11.6 L16.6 11.6 L16.6 11 C16.6 10.1 18.5 10.1 18.5 11 L18.5 16.5 C18.5 19.8 16.4 22 13.4 22 L12.2 22 C10.3 22 9 21.2 7.9 19.6 L5.2 15.6 C4.6 14.7 5.8 13.6 6.7 14.3 L9 16.3 Z", hx: 10, hy: 2.6, tilt: true },
    text: { d: "M8.5 3 L11 3 C11.6 3 12 3.4 12 4 C12 3.4 12.4 3 13 3 L15.5 3 L15.5 4.6 L13.4 4.6 L13.4 19.4 L15.5 19.4 L15.5 21 L13 21 C12.4 21 12 20.6 12 20 C12 20.6 11.6 21 11 21 L8.5 21 L8.5 19.4 L10.6 19.4 L10.6 4.6 L8.5 4.6 Z", hx: 12, hy: 12, tilt: false },
    grab: { d: "M7.2 9 C7.2 7.8 9.2 7.8 9.2 9 L9.2 7.4 C9.2 6.2 11.2 6.2 11.2 7.4 L11.2 7 C11.2 5.8 13.2 5.8 13.2 7 L13.2 7.6 C13.2 6.4 15.2 6.4 15.2 7.6 L15.2 9.4 C15.2 8.4 17.2 8.4 17.2 9.6 L17.2 15.2 C17.2 18.6 15 20.8 12 20.8 L11.2 20.8 C9 20.8 7.8 19.8 6.8 18.2 L5.2 15.4 C4.6 14.4 5.8 13.4 6.8 14.2 L7.2 14.6 Z", hx: 12, hy: 12, tilt: false },
  };
  const shapeOf = (x: number, y: number): string => {
    const el = document.elementFromPoint(x, y);
    const css = el ? getComputedStyle(el).cursor : "auto";
    if (css === "pointer") return "hand";
    if (css === "text" || css === "vertical-text") return "text";
    if (css === "grab" || css === "grabbing" || css === "move") return "grab";
    if (css === "auto" && el && (el as HTMLElement).isContentEditable) return "text";
    if (css === "auto" && el && ["INPUT", "TEXTAREA"].includes(el.tagName) && !["button", "submit", "checkbox", "radio", "range", "reset"].includes((el as HTMLInputElement).type)) return "text";
    return "arrow";
  };
  let shape = "arrow", tilt = 0, lastX: number | null = null;
  const setShape = (name: string): void => {
    if (!cursor || name === shape) return;
    shape = name;
    const sh = SHAPES[name]!;
    cursor.querySelector("path")?.setAttribute("d", sh.d);
    cursor.style.left = `calc(var(--sc-cursor-size) * ${-sh.hx} / 24)`;
    cursor.style.top = `calc(var(--sc-cursor-size) * ${-sh.hy} / 24)`;
    cursor.style.transformOrigin = `calc(var(--sc-cursor-size) * ${sh.hx} / 24) calc(var(--sc-cursor-size) * ${sh.hy} / 24)`;
    host?.setAttribute("data-cursor", name);
  };
  let effects: HTMLElement | null = null;
  let spot: HTMLElement | null = null;
  let keys: HTMLElement | null = null;
  const mount = (): void => {
    if (!isTop || !document.documentElement || cursor) return;
    host = document.createElement("div");
    host.setAttribute("data-agentic-screencast-capture", "");
    host.setAttribute("data-cursor", "arrow");
    host.setAttribute("aria-hidden", "true");
    host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none";
    const shadow = host!.attachShadow({ mode: "closed" });
    // Тема дубля кладётся переменными на хозяина теневого корня: курсор, клик, подсветка и
    // клавиши рисуются ею, как слой композиции рисует свою сцену. Единица --u — сотая ширины,
    // но не меньше сотой от 1280: дубль показывает страницу в её собственном размере, и курсор
    // в узком окне не сжимается, как не сжимается курсор системы.
    const vars = Object.entries(theme).map(([k, v]) => `${k}:${v}`).join(";");
    shadow.innerHTML = `<style>
      :host{pointer-events:none;${vars};--u:${(Math.max(window.innerWidth, 1280) / 100).toFixed(3)}px}
      #cursor{position:absolute;left:calc(var(--sc-cursor-size) * -4 / 24);top:calc(var(--sc-cursor-size) * -2 / 24);
        width:var(--sc-cursor-size);height:var(--sc-cursor-size);display:none;
        filter:var(--sc-cursor-shadow);pointer-events:none;transform-origin:4px 3px}
      /* Остриё стрелки лежит в рисунке в точке (4, 2) из 24: сдвиг ставит его ровно в точку
         указателя, и волна клика расходится от острия, а не из-под середины стрелки. */
      #cursor path{fill:var(--sc-cursor-fill);stroke:var(--sc-cursor-line);stroke-width:var(--sc-cursor-line-width);stroke-linejoin:round}
      /* Нажатие сжимает рисунок стрелки к её острию, а не сам курсор: свойство scale на курсоре
         умножало и его translate, и на каждом клике стрелка отпрыгивала к левому верхнему углу. */
      #cursor path{transform-box:view-box;transform-origin:4px 2px}
      /* Нажатие — короткий отскок к острию и обратно, с лёгким перелётом. */
      #cursor.press path{animation:tap .32s cubic-bezier(.3,.7,.4,1)}
      @keyframes tap{0%{scale:1}35%{scale:.8}70%{scale:1.07}100%{scale:1}}
      .spotfx{position:absolute;width:64px;height:64px;border-radius:50%;background:var(--sc-ripple-ring);
        translate:-50% -50%;animation:spotfx .55s ease-out forwards}
      @keyframes spotfx{from{opacity:.55;scale:.3}to{opacity:0;scale:1.3}}
      #effects{position:absolute;inset:0;pointer-events:none}
      .ripple{position:absolute;width:22px;height:22px;border:var(--sc-spot-width) solid var(--sc-ripple-ring);
        border-radius:50%;box-shadow:var(--sc-ripple-shadow);
        translate:-50% -50%;animation:pulse .7s cubic-bezier(.2,.7,.3,1) forwards}
      .dot{position:absolute;width:10px;height:10px;border-radius:50%;background:var(--sc-ripple-ring);
        translate:-50% -50%;animation:dot .45s ease-out forwards}
      @keyframes pulse{from{opacity:1;scale:.45}to{opacity:0;scale:4.4}}
      @keyframes dot{from{opacity:1;scale:1.4}to{opacity:0;scale:.6}}
      #spot{position:absolute;left:0;top:0;width:0;height:0;border-radius:var(--sc-spot-radius);opacity:0;
        box-shadow:var(--sc-spot-shadow);transition:opacity .35s ease}
      #keys{position:absolute;left:50%;bottom:7%;translate:-50% 0;display:flex;gap:10px;opacity:0;
        transition:opacity .2s ease}
      #keys kbd{min-width:46px;padding:var(--sc-keys-pad);border-radius:var(--sc-keys-radius);text-align:center;
        font:700 var(--sc-keys-size)/1 var(--sans);color:var(--sc-keys-ink);
        background:var(--sc-keys-bg);border:var(--sc-hairline) solid var(--sc-keys-line);box-shadow:var(--sc-keys-shadow)}
    </style><div id="spot"></div><div id="effects"></div><div id="keys"></div><svg id="cursor" viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"><path d="M4 2 L4 20 L9 15.5 L12 22 L15 20.5 L12 14.2 L19 14 Z"/></svg>`;
    document.documentElement.appendChild(host!);
    cursor = shadow.querySelector<HTMLElement>("#cursor");
    effects = shadow.querySelector<HTMLElement>("#effects");
    spot = shadow.querySelector<HTMLElement>("#spot");
    keys = shadow.querySelector<HTMLElement>("#keys");
    if (state.position && cursor) {
      cursor.style.display = "block";
      cursor.style.transform = `translate(${state.position.x}px,${state.position.y}px)`;
    }
  };

  const move = (x: number, y: number): void => {
    state.position = { x, y };
    mount();
    if (cursor) {
      setShape(shapeOf(x, y));
      // Наклон в движении: стрелка и рука чуть клонятся по ходу и выпрямляются на месте.
      const dx = lastX === null ? 0 : x - lastX;
      lastX = x;
      tilt = SHAPES[shape]!.tilt ? Math.max(-10, Math.min(10, tilt * 0.6 + dx * 0.35)) : 0;
      cursor.style.display = "block";
      cursor.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px) rotate(${tilt.toFixed(1)}deg)`;
    }
  };
  const dispatch = (kind: PointerMessage["kind"], x: number, y: number): void => {
    if (!isTop) {
      const message: PointerMessage = { source: "agentic-screencast-capture-v1", kind, x, y };
      window.parent.postMessage(message, "*");
      return;
    }
    if (kind === "move") {
      move(x, y);
      // The filmed cursor follows real DOM events, including Playwright dragTo. Keep that same
      // path for follow-camera rather than only the points scripted by moveToPoint.
      state.moves.push({ x, y, at: performance.now() });
      if (state.moves.length > 30000) state.moves.shift();
      return;
    }
    if (kind === "click") {
      state.trace.push({ kind, x, y, at: performance.now() });
      if (state.trace.length > 1000) state.trace.shift();
      return;
    }
    move(x, y);
    state.trace.push({ kind, x, y, at: performance.now() });
    if (state.trace.length > 1000) state.trace.shift();
    if (cursor) {
      cursor.classList.add("press");
      window.setTimeout(() => cursor?.classList.remove("press"), 160);
    }
    if (!effects) return;
    // Отклик клика — по выбору дубля: волна (умолчание), мягкая подсветка точки или эхо из двух волн.
    const parts: Array<[string, number]> = clickEffect === "spot" ? [["spotfx", 0]]
      : clickEffect === "echo" ? [["ripple", 0], ["ripple", 140], ["dot", 0]] : [["ripple", 0], ["dot", 0]];
    host?.setAttribute("data-click", clickEffect);
    for (const [cls, delay] of parts) {
      const node = document.createElement("div");
      node.className = cls;
      node.style.left = `${x}px`;
      node.style.top = `${y}px`;
      node.style.animationDelay = `${delay}ms`;
      effects.appendChild(node);
      window.setTimeout(() => node.remove(), 900 + delay);
    }
  };
  document.addEventListener("pointermove", (event) =>
    dispatch("move", event.clientX, event.clientY), true);
  document.addEventListener("pointerdown", (event) =>
    dispatch("down", event.clientX, event.clientY), true);
  document.addEventListener("click", (event) =>
    dispatch("click", event.clientX, event.clientY), true);
  window.addEventListener("message", (event: MessageEvent<PointerMessage>) => {
    const data = event.data;
    if (!data || data.source !== "agentic-screencast-capture-v1"
      || !["move", "down", "click"].includes(data.kind)
      || !Number.isFinite(data.x) || !Number.isFinite(data.y)) return;
    const child = Array.from(document.querySelectorAll("iframe,frame"))
      .find((element) => (element as HTMLIFrameElement | HTMLFrameElement).contentWindow === event.source);
    if (!child) return;
    const rect = child.getBoundingClientRect();
    const element = child as HTMLIFrameElement | HTMLFrameElement;
    const x = rect.left + (element.clientLeft + data.x) * rect.width / Math.max(1, element.offsetWidth);
    const y = rect.top + (element.clientTop + data.y) * rect.height / Math.max(1, element.offsetHeight);
    dispatch(data.kind, x, y);
  });

  // — камера и подсветка живого дубля —
  //
  // Наезд делает настоящая трансформация тела страницы с переходом CSS: дубль
  // записывается в реальном времени, и страница продолжает жить под наездом —
  // клики, ввод и анимации приложения идут как обычно. Подсветка ходит за
  // элементом каждый кадр, поэтому держится на нём и во время движения.
  let followed: Element | null = null;
  let follow = 0;
  const trackSpot = (): void => {
    if (!spot || !followed) return;
    const r = followed.getBoundingClientRect();
    const pad = 10;
    spot.style.transform = `translate(${Math.round(r.left - pad)}px,${Math.round(r.top - pad)}px)`;
    spot.style.width = `${Math.round(r.width + pad * 2)}px`;
    spot.style.height = `${Math.round(r.height + pad * 2)}px`;
    follow = window.requestAnimationFrame(trackSpot);
  };
  const ease = "cubic-bezier(.65,0,.35,1)";
  state.focus = (el, opts) => {
    mount();
    const body = document.body;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const W = Math.max(document.documentElement.scrollWidth, vw), H = Math.max(document.documentElement.scrollHeight, vh);
    // Координаты документа: тело увеличивается от своего левого верхнего угла.
    const cx = r.left + r.width / 2 + window.scrollX, cy = r.top + r.height / 2 + window.scrollY;
    const k = opts.scale;
    const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
    const tx = clamp(window.scrollX + vw / 2 - cx * k, window.scrollX + vw - W * k, window.scrollX);
    const ty = clamp(window.scrollY + vh / 2 - cy * k, window.scrollY + vh - H * k, window.scrollY);
    body.style.transformOrigin = "0 0";
    body.style.transition = `transform ${opts.ms}ms ${ease}`;
    body.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${k})`;
    followed = el;
    window.cancelAnimationFrame(follow);
    trackSpot();
    if (spot) spot.style.opacity = opts.dim ? "1" : "0";
  };
  // Наезд на область кадра, а не на элемент: так сборка исполняет камеру сценария при пересъёмке
  // дубля. Область — доли окна; подсветка переезжает туда, где область окажется после наезда.
  state.focusArea = (area, opts) => {
    mount();
    const body = document.body;
    const vw = window.innerWidth, vh = window.innerHeight;
    const W = Math.max(document.documentElement.scrollWidth, vw), H = Math.max(document.documentElement.scrollHeight, vh);
    const r = { left: area[0] * vw, top: area[1] * vh, width: area[2] * vw, height: area[3] * vh };
    const cx = r.left + r.width / 2 + window.scrollX, cy = r.top + r.height / 2 + window.scrollY;
    const k = opts.scale;
    const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
    const tx = clamp(window.scrollX + vw / 2 - cx * k, window.scrollX + vw - W * k, window.scrollX);
    const ty = clamp(window.scrollY + vh / 2 - cy * k, window.scrollY + vh - H * k, window.scrollY);
    body.style.transformOrigin = "0 0";
    body.style.transition = `transform ${opts.ms}ms ${ease}`;
    body.style.transform = `translate(${tx.toFixed(2)}px,${ty.toFixed(2)}px) scale(${k})`;
    window.cancelAnimationFrame(follow);
    followed = null;
    if (spot) {
      const pad = 10;
      const x = (r.left + window.scrollX) * k + tx - window.scrollX, y = (r.top + window.scrollY) * k + ty - window.scrollY;
      spot.style.transition = `transform ${opts.ms}ms ${ease}, width ${opts.ms}ms ${ease}, height ${opts.ms}ms ${ease}, opacity 200ms`;
      spot.style.transform = `translate(${Math.round(x - pad)}px,${Math.round(y - pad)}px)`;
      spot.style.width = `${Math.round(r.width * k + pad * 2)}px`;
      spot.style.height = `${Math.round(r.height * k + pad * 2)}px`;
      spot.style.opacity = opts.dim ? "1" : "0";
    }
  };
  state.unfocus = (ms) => {
    const body = document.body;
    body.style.transition = `transform ${ms}ms ${ease}`;
    body.style.transform = "";
    if (spot) spot.style.opacity = "0";
    window.setTimeout(() => { window.cancelAnimationFrame(follow); followed = null; body.style.transition = ""; }, ms + 50);
  };
  let keyTimer = 0;
  state.key = (label) => {
    mount();
    if (!keys) return;
    keys.textContent = "";
    for (const part of label.split("+")) {
      const k = document.createElement("kbd");
      k.textContent = part;
      keys.appendChild(k);
    }
    keys.style.opacity = "1";
    window.clearTimeout(keyTimer);
    keyTimer = window.setTimeout(() => { if (keys) keys.style.opacity = "0"; }, 1300);
  };

  if (document.documentElement) mount();
  else document.addEventListener("DOMContentLoaded", mount, { once: true });
}
