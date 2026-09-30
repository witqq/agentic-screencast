#!/usr/bin/env node
// Матрица переходов: каждый вид × входящая сцена (слайд, страница, видео) ×
// кадр (горизонталь, вертикаль, пресет `format: vertical` с его безопасной
// зоной и портретной сеткой слайда — в уменьшенном кадре ради времени). Каждая клетка — настоящая сборка ролика
// с этим переходом; проверяется, что ролик собран, каждый переход сделан
// шейдером и длина ролика равна расчётной (переход на стыке её не укорачивает).
//
// Отдельно от `npm test`: переходы всех видов во всех клетках собираются минуты, а
// модульные проверки каждого вида уже идут в обычном прогоне. Запуск —
// `npm run matrix:transitions`.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { isJoint, KIND_NAMES } from "../transition.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "agentic-screencast.js");
const FPS = 10, SCENE = 1.2, T = 0.5;

let failed = 0;
for (const [w, h, name, preset] of [[240, 136, "landscape", ""], [136, 240, "portrait", ""],
  [270, 480, "vertical-preset", "format: vertical\n"]] as const) {
  const dir = mkdtempSync(join(tmpdir(), `sc-matrix-${name}-`));
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", `testsrc2=size=${w}x${h}:rate=${FPS}:duration=3`, join(dir, "clip.mp4")]);
  writeFileSync(join(dir, "page.html"), "<html><body style='margin:0;background:#2a6;font:24px sans-serif'><h1>Page</h1></body></html>");
  const types = ["slide", "page", "video"] as const;
  const scene = (id: string, type: typeof types[number], kind?: string): string => {
    const tr = kind ? `transition: ${kind} ${T}\n` : "";
    if (type === "slide") return `## ${id} · slides.chapter\ntitle: ${id}\nbody: A scene of the matrix.\nduration: ${SCENE}\n${tr}`;
    if (type === "page") return `## ${id} · page\npage: page.html\nduration: ${SCENE}\n${tr}`;
    return `## ${id} · video\nfile: clip.mp4\nduration: ${SCENE}\n${tr}`;
  };
  const scenes = [scene("s0", "video")];
  const cells: string[] = [];
  for (const kind of KIND_NAMES) for (const type of types) {
    scenes.push(scene(`s${scenes.length}`, type, kind));
    cells.push(`${kind}→${type}`);
  }
  writeFileSync(join(dir, "story.md"), `# Matrix\nvoice: {"engine":"stub","name":"silent"}\n${preset}`
    + `frame: {"width":${w},"height":${h},"fps":${FPS},"scale":1}\n\n${scenes.join("\n")}`);
  const r = spawnSync("node", [ENTRY, "build", "--source", "story.md", "--out", "m.mp4"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  if (r.status !== 0) { console.log(`${name}: build failed — ${r.stderr.trim().split("\n").pop()}`); failed++; continue; }
  const rep = JSON.parse(r.stdout) as { duration: number; transitions: Array<{ kind: string; renderer: string }>;
    scenes: Array<{ frames: number }> };
  // Длина сцены — из отчёта: у немого клипа её задаёт сам клип, поле duration
  // для видео — нижняя граница. Ролик короче суммы сцен ровно на переходы.
  // Переход на стыке (засветка) сцены не перекрывает и ролик не укорачивает.
  const overlapping = cells.filter((c) => !isJoint(c.split("→")[0]!)).length;
  const want = (rep.scenes.reduce((n, s) => n + s.frames, 0) - overlapping * T * FPS) / FPS;
  const webgl = rep.transitions.filter((t) => t.renderer === "webgl").length;
  const ok = rep.transitions.length === cells.length && webgl === cells.length && Math.abs(rep.duration - want) < 0.15;
  if (!ok) failed++;
  console.log(`${name} ${w}x${h}: ${rep.transitions.length}/${cells.length} transitions, ${webgl} by WebGL, `
    + `length ${rep.duration.toFixed(2)} s vs computed ${want.toFixed(2)} s — ${ok ? "ok" : "FAILED"}`);
}
process.exit(failed ? 1 : 0);
