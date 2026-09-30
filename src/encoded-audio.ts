// Final-film audio is judged after AAC encoding: a safe PCM peak can rise in the codec.
import { spawnSync } from "node:child_process";
import { mkdtempSync, renameSync, rmSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { FFMPEG } from "./voice/audio.js";
import { msg } from "./msg.js";

export interface EncodedAudioLevel {
  /** True peak of the decoded AAC in the finished MP4, dBTP. */
  truePeak: number | null;
  /** Integrated loudness of that same decoded stream, LUFS. */
  integrated: number | null;
  /** Whether the audio stream had to be encoded again to meet the ceiling. */
  corrected: boolean;
}

const MAX_TRUE_PEAK = -1;
// loudnorm's input_tp prints hundredths. One extra hundredth keeps a rounded
// reading from accepting a stream fractionally above the requested limit.
const METER_CEILING = MAX_TRUE_PEAK - 0.01;
const MAX_ATTEMPTS = 3;

export class EncodedPeakError extends Error {
  readonly code = "ENCODED_PEAK_EXCEEDED";
  constructor(readonly measured: number | null, readonly limit = MAX_TRUE_PEAK) {
    super("ENCODED_PEAK_EXCEEDED");
  }
}

function ffmpeg(args: string[]): string {
  const result = spawnSync(FFMPEG, ["-nostdin", "-hide_banner", ...args],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.error || result.status !== 0)
    throw new Error(msg("audio.ffmpegFailed", { why: result.error?.message ?? result.stderr.trim().slice(-500) }));
  return result.stderr;
}

/** Measure the first audio stream after decoding the actual MP4's AAC frames. */
function measure(file: string): Omit<EncodedAudioLevel, "corrected"> {
  // input_* describes the decoded source stream; output_* describes the
  // measurement filter's normalised output and must not be reported as film sound.
  const output = ffmpeg(["-i", file, "-map", "0:a:0", "-vn", "-af",
    "loudnorm=I=-14:TP=-1:LRA=11:print_format=json", "-f", "null", "-"]);
  const first = output.lastIndexOf("{"), last = output.lastIndexOf("}");
  if (first < 0 || last <= first) throw new Error(msg("audio.unreadable", { file }));
  const data = JSON.parse(output.slice(first, last + 1)) as { input_i?: string; input_tp?: string };
  const integrated = data.input_i === "-inf" ? null : Number(data.input_i);
  const truePeak = data.input_tp === "-inf" ? null : Number(data.input_tp);
  if ((integrated !== null && !Number.isFinite(integrated)) || (truePeak !== null && !Number.isFinite(truePeak)))
    throw new Error(msg("audio.invalid", { file }));
  return { integrated, truePeak };
}

/**
 * Keep the finished film only when its decoded AAC has a true peak below -1 dBTP.
 * On overshoot, retry from the original file with more attenuation; the video and
 * every other stream are copied, and the original remains intact until a measured
 * replacement is ready. A silent AAC stream needs no correction.
 */
export function ensureEncodedPeak(file: string, bitrate: string): EncodedAudioLevel {
  const initial = measure(file);
  if (initial.truePeak === null || initial.truePeak <= METER_CEILING) return { ...initial, corrected: false };

  const dir = mkdtempSync(join(dirname(file), `.${basename(file)}-audio-`));
  const candidate = join(dir, "candidate.mp4");
  let gain = 0;
  let last = initial;
  try {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      // A little headroom covers the codec's nonlinear overshoot. Each retry
      // starts from the original AAC, so failed candidates do not accumulate losses.
      gain += Math.max(0.3, last.truePeak! - METER_CEILING + 0.3);
      ffmpeg(["-y", "-loglevel", "error", "-i", file, "-map", "0", "-map_metadata", "0", "-map_chapters", "0",
        "-c", "copy", "-c:a:0", "aac", "-b:a:0", bitrate, "-filter:a:0", `volume=-${gain.toFixed(3)}dB`,
        "-movflags", "+faststart", candidate]);
      last = measure(candidate);
      if (last.truePeak !== null && last.truePeak <= METER_CEILING) {
        renameSync(candidate, file);
        return { ...last, corrected: true };
      }
    }
    throw new EncodedPeakError(last.truePeak);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
