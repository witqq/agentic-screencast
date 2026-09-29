/** Audit the encoded film and its chapter track, after every build pass has finished. */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { msg } from "./msg.js";

const FFPROBE = (createRequire(import.meta.url)("@ffprobe-installer/ffprobe") as { path: string }).path;

export interface AuditChapter { name: string; start: number; end: number }
export interface AuditStream {
  codec: string;
  duration?: number;
  /** Frames decoded by ffprobe from the finished video stream. */
  frames?: number;
  /** Packets read from the encoded MP4, not the container's advertised frame count. */
  packets?: number;
  fps?: number;
  sampleRate?: number;
}
export interface AuditIssue {
  code: string;
  details: Record<string, string | number>;
}
export interface FilmAudit {
  expected: { frames: number; duration: number; fps: number; audio: boolean; partNames?: string[] };
  measured: { containerDuration?: number; video?: AuditStream; audio?: AuditStream;
    videoStreams: number; audioStreams: number; chapters: AuditChapter[] };
  issues: AuditIssue[];
}

interface ProbeStream {
  codec_type?: string; codec_name?: string; duration?: string; duration_ts?: string;
  time_base?: string; nb_read_frames?: string; nb_read_packets?: string; avg_frame_rate?: string; sample_rate?: string;
}
interface ProbeResult { format?: { duration?: string }; streams?: ProbeStream[] }

const finite = (value: string | undefined): number | undefined => {
  const n = Number(value);
  return value !== undefined && Number.isFinite(n) ? n : undefined;
};
const ratio = (raw: string | undefined): number | undefined => {
  const [a, b] = (raw ?? "").split("/").map(Number);
  return a !== undefined && b !== undefined && Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? a / b : undefined;
};
const streamOf = (s: ProbeStream): AuditStream => {
  const duration = finite(s.duration) ?? ((finite(s.duration_ts) !== undefined && ratio(s.time_base) !== undefined)
    ? finite(s.duration_ts)! * ratio(s.time_base)! : undefined);
  return { codec: s.codec_name ?? "unknown", ...(duration !== undefined ? { duration } : {}),
    ...(finite(s.nb_read_frames) !== undefined ? { frames: finite(s.nb_read_frames) } : {}),
    ...(finite(s.nb_read_packets) !== undefined ? { packets: finite(s.nb_read_packets) } : {}),
    ...(ratio(s.avg_frame_rate) !== undefined ? { fps: ratio(s.avg_frame_rate) } : {}),
    ...(finite(s.sample_rate) !== undefined ? { sampleRate: finite(s.sample_rate) } : {}) };
};

const stamp = (raw: string): number | undefined => {
  const m = /^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/u.exec(raw);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000 : undefined;
};

/** Read the exact WebVTT emitted beside a film; malformed cues fail as a group. */
export function readChapterTrack(file: string): AuditChapter[] {
  const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n").trim();
  const blocks = text.split(/\n\s*\n/u);
  if (blocks.shift()?.trim() !== "WEBVTT") throw new Error(msg("audit.vttHeader"));
  return blocks.map((block, i) => {
    const lines = block.split("\n");
    if (/^\d+$/u.test(lines[0]?.trim() ?? "")) lines.shift();
    const m = /^(\S+) --> (\S+)$/u.exec(lines.shift()?.trim() ?? "");
    const start = stamp(m?.[1] ?? ""), end = stamp(m?.[2] ?? "");
    const name = lines.join("\n").trim();
    if (start === undefined || end === undefined || end <= start || !name) throw new Error(msg("audit.vttCue", { index: i + 1 }));
    return { name, start, end };
  });
}

/**
 * The caller supplies timeline frames and authored part names independently of the report. A missing
 * `expectedPartNames` means the scenario had no explicit `part:` fields, so generated chapter names
 * are checked against the report alone. For `--only`, pass names from the selected scene(s).
 */
export function auditFilm(input: { file: string; expectedFrames: number; fps: number; audio: boolean;
  chaptersFile?: string; expectedPartNames?: readonly string[]; reportedChapters: readonly AuditChapter[] }): FilmAudit {
  if (!Number.isInteger(input.expectedFrames) || input.expectedFrames < 1 || !Number.isFinite(input.fps) || input.fps <= 0)
    throw new TypeError("auditFilm needs positive expectedFrames and fps");
  const expected = { frames: input.expectedFrames, duration: input.expectedFrames / input.fps,
    fps: input.fps, audio: input.audio,
    ...(input.expectedPartNames ? { partNames: [...input.expectedPartNames] } : {}) };
  const issues: AuditIssue[] = [];
  const add = (code: string, details: AuditIssue["details"] = {}): void => { issues.push({ code, details }); };
  const measured: FilmAudit["measured"] = { videoStreams: 0, audioStreams: 0, chapters: [] };
  let probed: ProbeResult;
  try {
    probed = JSON.parse(execFileSync(FFPROBE, ["-v", "error", "-count_frames", "-count_packets", "-show_entries",
      "format=duration:stream=codec_type,codec_name,duration,duration_ts,time_base,nb_read_frames,nb_read_packets,avg_frame_rate,sample_rate",
      "-of", "json", input.file], { encoding: "utf8" })) as ProbeResult;
  } catch {
    add("media.probeFailed");
    return { expected, measured, issues };
  }
  measured.containerDuration = finite(probed.format?.duration);
  const videos = (probed.streams ?? []).filter((s) => s.codec_type === "video");
  const audios = (probed.streams ?? []).filter((s) => s.codec_type === "audio");
  measured.videoStreams = videos.length;
  measured.audioStreams = audios.length;
  if (videos[0]) measured.video = streamOf(videos[0]);
  if (audios[0]) measured.audio = streamOf(audios[0]);
  if (videos.length !== 1) add("video.streamCount", { actual: videos.length, expected: 1 });
  if (audios.length !== (input.audio ? 1 : 0)) add("audio.streamCount", { actual: audios.length, expected: input.audio ? 1 : 0 });
  const v = measured.video, a = measured.audio;
  const frameTolerance = 1 / input.fps + 0.02;
  if (v) {
    if (v.codec !== "h264") add("video.codec", { actual: v.codec, expected: "h264" });
    if (v.frames === undefined) add("video.frameCountUnknown");
    else if (Math.abs(v.frames - expected.frames) > 1) add("video.frameCount", { actual: v.frames, expected: expected.frames });
    if (v.packets === undefined) add("video.packetCountUnknown");
    else if (Math.abs(v.packets - expected.frames) > 1) add("video.packetCount", { actual: v.packets, expected: expected.frames });
    if (v.fps !== undefined && Math.abs(v.fps - input.fps) > 0.01) add("video.fps", { actual: v.fps, expected: input.fps });
    if (v.duration === undefined) add("video.durationUnknown");
    else if (Math.abs(v.duration - expected.duration) > frameTolerance)
      add("video.duration", { actual: v.duration, expected: expected.duration });
  }
  if (input.audio && a) {
    if (a.codec !== "aac") add("audio.codec", { actual: a.codec, expected: "aac" });
    if (a.duration === undefined) add("audio.durationUnknown");
    else if (v?.duration !== undefined) {
      // AAC packets carry 1024 samples; allow two packets of encoder padding plus one video frame.
      const tolerance = 2 * 1024 / (a.sampleRate ?? 48000) + 1 / input.fps;
      if (Math.abs(a.duration - v.duration) > tolerance)
        add("audio.duration", { actual: a.duration, video: v.duration, tolerance });
    }
  }
  if (measured.containerDuration === undefined) add("media.durationUnknown");
  else if (Math.abs(measured.containerDuration - expected.duration) > frameTolerance)
    add("media.duration", { actual: measured.containerDuration, expected: expected.duration });

  if (input.expectedPartNames) {
    if (input.reportedChapters.length !== input.expectedPartNames.length)
      add("chapters.reportCount", { actual: input.reportedChapters.length, expected: input.expectedPartNames.length });
    input.expectedPartNames.forEach((name, i) => {
      if (input.reportedChapters[i]?.name !== name)
        add("chapters.reportName", { index: i, actual: input.reportedChapters[i]?.name ?? "", expected: name });
    });
  }
  if (input.chaptersFile && existsSync(input.chaptersFile)) {
    try { measured.chapters = readChapterTrack(input.chaptersFile); }
    catch { add("chapters.malformed"); }
  } else if (input.reportedChapters.length || input.expectedPartNames?.length) add("chapters.fileMissing");
  if (input.chaptersFile && existsSync(input.chaptersFile) && !issues.some((i) => i.code === "chapters.malformed")) {
    const cues = measured.chapters, report = input.reportedChapters;
    if (cues.length !== report.length) add("chapters.cueCount", { actual: cues.length, expected: report.length });
    if (input.expectedPartNames && cues.length !== input.expectedPartNames.length)
      add("chapters.authoredCount", { actual: cues.length, expected: input.expectedPartNames.length });
    cues.forEach((cue, i) => {
      const r = report[i];
      if (r && cue.name !== r.name) add("chapters.cueName", { index: i, actual: cue.name, expected: r.name });
      if (input.expectedPartNames?.[i] !== undefined && cue.name !== input.expectedPartNames[i])
        add("chapters.authoredName", { index: i, actual: cue.name, expected: input.expectedPartNames[i]! });
      if (r && (Math.abs(cue.start - r.start) > 0.002 || Math.abs(cue.end - r.end) > 0.002))
        add("chapters.cueTiming", { index: i, start: cue.start, end: cue.end, reportedStart: r.start, reportedEnd: r.end });
    });
  }
  const lastReport = input.reportedChapters.at(-1), lastCue = measured.chapters.at(-1);
  if (v?.duration !== undefined && lastReport && Math.abs(lastReport.end - v.duration) > frameTolerance)
    add("chapters.reportEnd", { actual: lastReport.end, video: v.duration });
  if (v?.duration !== undefined && lastCue && Math.abs(lastCue.end - v.duration) > frameTolerance)
    add("chapters.cueEnd", { actual: lastCue.end, video: v.duration });
  return { expected, measured, issues };
}
