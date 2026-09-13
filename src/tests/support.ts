import assert from "node:assert/strict";
import type { SpawnSyncReturns } from "node:child_process";

/** Build reports round measured beat times to milliseconds. */
export function assertBeatBoundary(start: number, previousEnd: number): void {
  assert.ok(Number.isFinite(start) && Number.isFinite(previousEnd)
    && start >= 0 && previousEnd >= 0 && Math.abs(start - previousEnd) <= 0.001,
  `beat starts at ${start}s; previous measured beat ends at ${previousEnd}s`);
}

/** Keep each output stream's evidence; stdout must not displace stderr. */
export function childFailure(result: Pick<SpawnSyncReturns<string>,
  "status" | "signal" | "error" | "stdout" | "stderr">): string {
  const sections = [`exit=${result.status}, signal=${result.signal ?? "none"}`];
  if (result.error) sections.push(`process error: ${result.error.message}`);
  for (const name of ["stdout", "stderr"] as const) {
    const lines = (result[name] ?? "").trim().split("\n").filter(Boolean);
    if (lines.length) sections.push(`${name}:\n${lines.slice(-40).join("\n")}`);
  }
  return sections.join("\n");
}
