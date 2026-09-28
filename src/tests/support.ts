import assert from "node:assert/strict";
import { execFileSync, type SpawnSyncReturns } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const FFMPEG = createRequire(import.meta.url)("ffmpeg-static") as string;

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

/**
 * Точки картинки (PNG) сырыми байтами формата `pix` — через файл, а не через стандартный ввод
 * `ffmpeg`. Синхронный запуск с вводом через канал изредка не закрывал канал: `ffmpeg` ждал
 * конца ввода, тест — конца `ffmpeg`, и прогон стоял до таймаута.
 */
export function rawOf(png: Buffer, pix = "rgb24", filter?: string): Buffer {
  const file = join(mkdtempSync(join(tmpdir(), "sc-raw-")), "in.png");
  writeFileSync(file, png);
  try {
    return execFileSync(FFMPEG, ["-nostdin", "-loglevel", "error", "-i", file, ...(filter ? ["-vf", filter] : []), "-f", "rawvideo", "-pix_fmt", pix, "-"], { maxBuffer: 256 * 1024 * 1024 });
  } finally { rmSync(dirname(file), { recursive: true, force: true }); }
}
