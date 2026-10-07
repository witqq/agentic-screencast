/** Opening overview uses scene time; actions and narration are never delayed. */
export function overviewPhase(time: number, duration: number, firstFocus?: number): number {
  if (firstFocus === undefined) return 0;
  const hold = Math.max(Math.min(1.2, duration * 0.2), firstFocus);
  const move = Math.min(0.9, duration * 0.2);
  const p = Math.max(0, Math.min(1, (time - hold) / Math.max(0.001, move)));
  return p * p * p * (p * (p * 6 - 15) + 10);
}

export const UI_OVERVIEW_BRIDGE = `window.__scOverviewPhase = ${overviewPhase.toString()};`;
