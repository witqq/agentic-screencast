// Имена эффектов, слитые с другими по смыслу: разбор отвергает их и называет замену. Каждое
// говорило зрителю то же, что его замена, и уступало ей по отделке (аудит эффектов, 30.09.2026).
export const RETIRED = {
  enter: { lift: "rise", unfold: "wipe", drop: "bounce", flip: "flip3d" },
  text: { scramble: "flap", shuffle: "fly" },
  background: { mesh: "aurora", spotlight: "lamp" },
  transition: { dissolve: "dots", "zoom-blur": "zoom", flash: "leak", ripple: "melt", iris: "mask" },
} as const satisfies Record<string, Record<string, string>>;

/** Замена слитого имени или undefined, если имя не из слитых. */
export const retiredAs = (kind: keyof typeof RETIRED, value: string): string | undefined =>
  Object.hasOwn(RETIRED[kind], value) ? (RETIRED[kind] as Record<string, string>)[value] : undefined;
