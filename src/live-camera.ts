// Наезд браузером вместо наезда по видео. Наезд сценария над живым дублем сборка исполняет не
// растяжением готовых точек, а пересъёмкой: запускает скрипт, записавший дубль, и браузер сам
// приближает страницу в нужные моменты — текст остаётся чётким на любом увеличении, а движение
// плавным. Сценарий для этого не меняется: те же `camera` и `spotlight` над той же сценой.
//
// Моменты наездов переводятся в отметки дубля: «через 0,4 с после `@saved`», а не «на 3,1 с
// записи», потому что повторный прогон скрипта идёт в своём темпе. Пересъёмка ложится рядом с
// дублем (`<дубль>.<сцена>.cam.webm`) с отпечатком плана в своём `.marks.json`; неизменный план
// дубль не переснимает. Не вышло переснять — сцена остаётся с наездом по видео и предупреждением.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { pushScale } from "./camera.js";
import type { LiveCameraPlan } from "./capture.js";
import { marksOf, type Trim } from "./marks.js";
import type { SceneOverlay } from "./overlay.js";

export interface LiveCameraScene {
  id: string;
  page: string;
  trim?: Trim;
  overlay?: SceneOverlay;
  speed?: unknown[];
  freezeAt?: number;
  device?: unknown;
  fit?: unknown;
}

export type LiveCameraResult =
  | { baked: false }
  | { baked: true; page: string; trim?: Trim; recorded: boolean }
  | { baked: false; failed: string };

/**
 * Можно ли исполнить камеру сцены браузером: каждое движение названо областью и не следует за
 * курсором, время клипа не переиграно и не остановлено, клип не в рамке, не кадрируется и не
 * обрезается `cover`, а дубль знает скрипт, который его записал.
 */
function eligible(s: LiveCameraScene, reframed: boolean): boolean {
  const cues = s.overlay?.camera ?? [];
  return cues.length > 0 && !reframed && !s.speed?.length && s.freezeAt === undefined && !s.device
    && (s.fit === undefined || s.fit === "contain")
    && cues.every((c) => c.area && !c.follow && !c.target && !c.pan);
}

/** Время прежнего дубля → время пересъёмки по общим отметкам, кусочно-линейно. */
export function mapTime(old: Record<string, number>, fresh: Record<string, number>): (t: number) => number {
  const pairs = [[0, 0] as [number, number], ...Object.keys(old).filter((k) => fresh[k] !== undefined)
    .map((k) => [old[k]!, fresh[k]!] as [number, number])].sort((a, b) => a[0] - b[0]);
  return (t) => {
    let i = 0;
    while (i + 1 < pairs.length && pairs[i + 1]![0] <= t) i++;
    const [a0, a1] = pairs[i]!, next = pairs[i + 1];
    if (!next || next[0] === a0) return Math.max(0, a1 + (t - a0));
    return a1 + (t - a0) * (next[1] - a1) / (next[0] - a0);
  };
}

export function liveCamera(s: LiveCameraScene, dir: string, reframed: boolean): LiveCameraResult {
  if (process.env.AGENTIC_SCREENCAST_NO_LIVE_CAMERA === "1" || !eligible(s, reframed)) return { baked: false };
  const take = resolve(dir, s.page);
  const marks = marksOf(take);
  if (!marks?.script || !existsSync(take)) return { baked: false };
  const from = s.trim?.from ?? 0;
  const named = Object.entries(marks.marks).sort((a, b) => a[1] - b[1]);
  const cues: LiveCameraPlan["cues"] = s.overlay!.camera!.map((c) => {
    const t = from + c.at;
    const mark = named.filter(([, at]) => at <= t + 1e-6).at(-1);
    const area = c.area!;
    return { anchor: mark ? `@${mark[0]}` : "@start", offset: Math.round((t - (mark?.[1] ?? 0)) * 1000) / 1000,
      area, scale: pushScale(c, area[2], area[3]), move: c.move ?? 0.9, hold: c.hold, back: c.return ?? 0.9,
      keep: Boolean(c.keep), dim: (c.dim ?? 1) > 0 };
  });
  const output = `${take}.${s.id}.cam.webm`;
  const hash = createHash("md5").update(JSON.stringify({ cues, take: readFileSync(`${take}.marks.json`, "utf8") })).digest("hex");
  const plan: LiveCameraPlan = { source: take, output, hash, trimmed: marks.trimmed, cues };
  let recorded = false;
  if (marksOf(output)?.cameraPlan !== hash || !existsSync(output)) {
    const run = spawnSync(process.execPath, [marks.script.path, ...marks.script.args], {
      cwd: marks.script.cwd, env: { ...process.env, AGENTIC_SCREENCAST_TAKE_CAMERA: JSON.stringify(plan) },
      stdio: ["ignore", process.stderr, process.stderr] });
    if (run.status !== 0 || marksOf(output)?.cameraPlan !== hash)
      return { baked: false, failed: run.error?.message
        ?? (run.status === 0 ? `${marks.script.path} did not record ${s.page}` : `${marks.script.path}: exit ${run.status ?? run.signal}`) };
    recorded = true;
  }
  const fresh = marksOf(output)!;
  const map = mapTime(marks.marks, fresh.marks);
  const trim = s.trim ? { from: map(s.trim.from), ...(s.trim.to !== undefined ? { to: map(s.trim.to) } : {}) } : undefined;
  return { baked: true, page: relative(dir, output), ...(trim ? { trim } : {}), recorded };
}
