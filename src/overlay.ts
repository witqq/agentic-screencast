/** Timed annotations shared by rendered pages and imported video clips. */
export interface OverlayPoint {
  at: number;
  /** Position as a fraction of the final frame, not source-video pixels. */
  x: number;
  y: number;
  click?: boolean;
}

export interface OverlayCard {
  at: number;
  title: string;
  body?: string;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center" | "near-focus";
  /** Reveal text gradually, instead of presenting a static label. */
  reveal?: "fade" | "type";
  /** Distinct entrance movement; all modes are functions of scene time. */
  motion?: "rise" | "pop" | "glide" | "fly";
  /**
   * Edge a flying card comes from and leaves to; only meaningful with motion "fly".
   *
   * A card that merely fades in reads as a sticker pasted over the footage, so a trailer wants the card to
   * arrive as an object: it enters from beyond the frame, overshoots, settles, and leaves the same way.
   */
  from?: "left" | "right" | "top" | "bottom";
  enter?: number;
  exit?: number;
  /** Seconds visible, including the entrance and exit. */
  hold?: number;
}

/** A held camera move over a saved page or a frame frozen from a clip. */
export interface OverlayCamera {
  at: number;
  hold: number;
  /** CSS selector on a saved page; alternatives to area, never both. */
  target?: string;
  /** [left, top, width, height] as fractions of the unzoomed frame. */
  area?: [number, number, number, number];
  scale?: number;
  move?: number;
  return?: number;
}

export interface SceneOverlay {
  pointer?: OverlayPoint[];
  cards?: OverlayCard[];
  camera?: OverlayCamera[];
}

export function cameraEnd(cue: OverlayCamera): number {
  return cue.at + (cue.move ?? 0.9) + cue.hold + (cue.return ?? 0.9);
}

export function cardHold(card: Pick<OverlayCard, "title" | "body" | "reveal" | "enter" | "exit">): number {
  // Reading time, not an arbitrary fixed slide duration. A two-line card
  // remains on screen long enough even when the source clip is shorter.
  const typing = card.reveal === "type" ? Math.min(3.2, (card.title.length + (card.body?.length ?? 0)) / 34) : 0;
  return Math.max(3.8, 1.5 + card.title.length / 15 + (card.body?.length ?? 0) / 18)
    + typing + Math.max(0, (card.enter ?? 0.65) - 0.65) + Math.max(0, (card.exit ?? 0.45) - 0.45);
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function keys(value: Record<string, unknown>, allowed: string[], where: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`${where}: unknown property «${key}»`);
  }
}

function time(value: unknown, where: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${where}: at/hold must be a non-negative number of seconds`);
  }
  return value;
}

/** Reject malformed or unreadably fast annotations before rendering. */
export function parseOverlay(json: string): SceneOverlay {
  let value: unknown;
  try { value = JSON.parse(json); }
  catch { throw new Error("overlay: expected a JSON object"); }
  if (!object(value)) throw new Error("overlay: expected a JSON object");
  keys(value, ["pointer", "cards", "camera"], "overlay");
  const overlay: SceneOverlay = {};
  if (value.pointer !== undefined) {
    if (!Array.isArray(value.pointer)) throw new Error("overlay.pointer: expected an array");
    let last = -1;
    overlay.pointer = value.pointer.map((raw: unknown, i: number): OverlayPoint => {
      if (!object(raw)) throw new Error(`overlay.pointer[${i}]: expected an object`);
      keys(raw, ["at", "x", "y", "click"], `overlay.pointer[${i}]`);
      const at = time(raw.at, `overlay.pointer[${i}]`);
      if (at <= last) throw new Error("overlay.pointer: times must increase");
      last = at;
      for (const axis of ["x", "y"] as const) {
        if (typeof raw[axis] !== "number" || !Number.isFinite(raw[axis]) || raw[axis] < 0 || raw[axis] > 1)
          throw new Error(`overlay.pointer[${i}].${axis}: expected a frame fraction from 0 to 1`);
      }
      if (raw.click !== undefined && typeof raw.click !== "boolean")
        throw new Error(`overlay.pointer[${i}].click: expected a boolean`);
      return { at, x: raw.x as number, y: raw.y as number,
        ...(raw.click === undefined ? {} : { click: raw.click as boolean }) };
    });
  }
  if (value.cards !== undefined) {
    if (!Array.isArray(value.cards)) throw new Error("overlay.cards: expected an array");
    let previousEnd = -1;
    overlay.cards = value.cards.map((raw: unknown, i: number): OverlayCard => {
      if (!object(raw)) throw new Error(`overlay.cards[${i}]: expected an object`);
      keys(raw, ["at", "title", "body", "position", "hold", "reveal", "motion", "from", "enter", "exit"],
        `overlay.cards[${i}]`);
      const at = time(raw.at, `overlay.cards[${i}]`);
      if (typeof raw.title !== "string" || !raw.title.trim() || raw.title.length > 44)
        throw new Error(`overlay.cards[${i}].title: expected 1–44 characters`);
      if (raw.body !== undefined && (typeof raw.body !== "string" || raw.body.length > 100))
        throw new Error(`overlay.cards[${i}].body: expected at most 100 characters`);
      if (raw.position !== undefined && !["top-left", "top-right", "bottom-left", "bottom-right", "center", "near-focus"].includes(String(raw.position)))
        throw new Error(`overlay.cards[${i}].position: unknown position`);
      if (raw.reveal !== undefined && !["fade", "type"].includes(String(raw.reveal)))
        throw new Error(`overlay.cards[${i}].reveal: unknown reveal`);
      if (raw.motion !== undefined && !["rise", "pop", "glide", "fly"].includes(String(raw.motion)))
        throw new Error(`overlay.cards[${i}].motion: unknown motion`);
      if (raw.from !== undefined && !["left", "right", "top", "bottom"].includes(String(raw.from)))
        throw new Error(`overlay.cards[${i}].from: unknown edge`);
      if (raw.from !== undefined && raw.motion !== "fly")
        throw new Error(`overlay.cards[${i}].from: only motion "fly" flies in from an edge`);
      for (const part of ["enter", "exit"] as const) {
        if (raw[part] !== undefined && (typeof raw[part] !== "number" || !Number.isFinite(raw[part]) || raw[part] < 0.2 || raw[part] > 2.5))
          throw new Error(`overlay.cards[${i}].${part}: expected 0.2–2.5 seconds`);
      }
      const title = raw.title.trim();
      const body = typeof raw.body === "string" ? raw.body.trim() : undefined;
      const reveal = raw.reveal as OverlayCard["reveal"];
      const motion = raw.motion as OverlayCard["motion"];
      const from = raw.from as OverlayCard["from"];
      const enter = raw.enter as number | undefined;
      const exit = raw.exit as number | undefined;
      const minimum = cardHold({ title, body, reveal, enter, exit });
      const hold = raw.hold === undefined ? minimum : time(raw.hold, `overlay.cards[${i}]`);
      if (hold < minimum) throw new Error(`overlay.cards[${i}].hold: at least ${minimum.toFixed(2)}s needed to read the text`);
      if (at < previousEnd + 0.35) throw new Error("overlay.cards: leave 0.35s between cards");
      previousEnd = at + hold;
      return { at, title, ...(body ? { body } : {}),
        ...(raw.position ? { position: raw.position as OverlayCard["position"] } : {}),
        ...(reveal ? { reveal } : {}), ...(motion ? { motion } : {}), ...(from ? { from } : {}),
        ...(enter !== undefined ? { enter } : {}), ...(exit !== undefined ? { exit } : {}), hold };
    });
  }
  if (value.camera !== undefined) {
    if (!Array.isArray(value.camera)) throw new Error("overlay.camera: expected an array");
    let previousEnd = -1;
    overlay.camera = value.camera.map((raw: unknown, i: number): OverlayCamera => {
      if (!object(raw)) throw new Error(`overlay.camera[${i}]: expected an object`);
      keys(raw, ["at", "hold", "target", "area", "scale", "move", "return"], `overlay.camera[${i}]`);
      const at = time(raw.at, `overlay.camera[${i}]`);
      const hold = time(raw.hold, `overlay.camera[${i}]`);
      if (hold < 0.8) throw new Error(`overlay.camera[${i}].hold: at least 0.8 seconds`);
      if (raw.target !== undefined && (typeof raw.target !== "string" || !raw.target.trim()))
        throw new Error(`overlay.camera[${i}].target: expected a CSS selector`);
      if (raw.area !== undefined && !Array.isArray(raw.area))
        throw new Error(`overlay.camera[${i}].area: expected four frame fractions`);
      if ((typeof raw.target === "string" && raw.target.trim().length > 0) === Array.isArray(raw.area))
        throw new Error(`overlay.camera[${i}]: name exactly one target or area`);
      let area: OverlayCamera["area"];
      if (Array.isArray(raw.area)) {
        if (raw.area.length !== 4 || raw.area.some((v) => typeof v !== "number" || !Number.isFinite(v)))
          throw new Error(`overlay.camera[${i}].area: expected four frame fractions`);
        const [x, y, w, h] = raw.area as number[];
        if (x! < 0 || y! < 0 || w! <= 0 || h! <= 0 || x! + w! > 1 || y! + h! > 1)
          throw new Error(`overlay.camera[${i}].area: outside the frame`);
        area = [x!, y!, w!, h!];
      }
      const scale = raw.scale === undefined ? 1.65 : raw.scale;
      if (typeof scale !== "number" || !Number.isFinite(scale) || scale <= 1 || scale > 3)
        throw new Error(`overlay.camera[${i}].scale: expected >1 and <=3`);
      const move = raw.move === undefined ? 0.9 : time(raw.move, `overlay.camera[${i}].move`);
      const back = raw.return === undefined ? 0.9 : time(raw.return, `overlay.camera[${i}].return`);
      if (move < 0.35 || back < 0.35 || move > 4 || back > 4)
        throw new Error(`overlay.camera[${i}]: move/return must be 0.35–4 seconds`);
      const cue: OverlayCamera = { at, hold, scale, move, return: back,
        ...(area ? { area } : { target: (raw.target as string).trim() }) };
      if (at < previousEnd + 0.35) throw new Error("overlay.camera: leave 0.35s between moves");
      previousEnd = cameraEnd(cue);
      return cue;
    });
  }
  if (!overlay.pointer?.length && !overlay.cards?.length && !overlay.camera?.length)
    throw new Error("overlay: add a pointer, card, or camera move");
  return overlay;
}

/** How long the scene must run to show every annotation, including exit. */
export function overlayEnd(overlay: SceneOverlay): number {
  return Math.max(0, ...(overlay.pointer?.map((point) => point.at + (point.click ? 0.65 : 0)) ?? []),
    ...(overlay.cards?.map((card) => card.at + (card.hold ?? cardHold(card)) + 0.35) ?? []),
    ...(overlay.camera?.map(cameraEnd) ?? []));
}
