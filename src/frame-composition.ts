/** Geometry and layer ownership shared by final builds and cheap frame previews. */
import { parseOverlay, type SceneOverlay } from "./overlay.js";
import { markAutomaticCamera } from "./camera.js";
import { actionZoomCues, autoZoomCues, type AutoZoom, type TakeMarks } from "./marks.js";
import type { RenderOpts } from "./render.js";

export function screenOverlay(overlay: SceneOverlay | undefined): SceneOverlay | undefined {
  if (!overlay) return undefined;
  const { camera: _c, callouts: _l, stickers: _s, marks: _m, glints: _g, bursts: _b, boops: _o, actions: _a, ...rest } = overlay;
  const thinking = overlay.thinking?.filter(item => !item.target && !item.area);
  const kept = { ...rest,
    ...(overlay.pointer ? { pointer: overlay.pointer.map(({ drag: _d, magnet: _g2, ...point }) => point) } : {}),
    ...(overlay.thinking ? { thinking: thinking?.length ? thinking : undefined } : {}),
    ...(overlay.cards ? { cards: overlay.cards.map(card => card.position === "near-focus" ? { ...card, position: "top-left" as const } : card) } : {}) };
  return kept.cards?.length || kept.titles?.length || kept.lower?.length || kept.pointer?.length || kept.toasts?.length || kept.thinking?.length
    ? kept : undefined;
}

export function reframedPageOptions(output: RenderOpts, source: { width: number; height: number }): RenderOpts {
  return { ...output, width: source.width, height: source.height,
    scale: output.height / source.height * output.scale,
    crop: { width: output.width / output.height * source.height, overview: true } };
}

/** Automatic capture cues have one source of truth for builds and frame previews. */
export function takeOverlay(overlay: SceneOverlay | undefined, take: TakeMarks | undefined, autoZoom: AutoZoom | undefined,
  portraitShare = 1): SceneOverlay | undefined {
  if (!autoZoom) return overlay;
  const options = portraitShare < 1 && autoZoom.size === undefined
    ? { ...autoZoom, size: Math.min(0.36, portraitShare / 2) } : autoZoom;
  const clicks = take?.clicks ?? [];
  const cues = take?.actions?.length ? actionZoomCues(take.actions, clicks, options) : autoZoomCues(clicks, options);
  const ordered = [...(overlay?.camera ?? []).map(cue => ({ cue, automatic: false })),
    ...cues.map(cue => ({ cue, automatic: true }))].sort((a,b) => a.cue.at-b.cue.at);
  const checked = parseOverlay(JSON.stringify({ ...overlay, camera: ordered.map(({cue}) => cue) }));
  checked.camera?.forEach((cue,index) => { if (ordered[index]!.automatic) markAutomaticCamera(cue); });
  return checked;
}
