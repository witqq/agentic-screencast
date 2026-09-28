// Пометка по элементу из дубля: `"area":"@name"` берёт прямоугольник, записанный
// `take.mark(name, locator)`, и переводит его в доли кадра так, как клип ложится в кадр. Прежде
// координаты круга у кнопки на видео мерили вручную, и после fit: cover круг уезжал.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parseSource } from "../../source.js";
import { clipToFrame } from "../../fit.js";

const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

test("clipToFrame places a clip rectangle where contain and cover put it", () => {
  // Квадратный клип в кадре 16:9: contain — по центру с полями, cover — срезан сверху и снизу.
  assert.deepEqual(clipToFrame([0.25, 0.25, 0.5, 0.5], { width: 100, height: 100 }, { width: 160, height: 90 }, undefined),
    [0.3594, 0.25, 0.2813, 0.5]);
  assert.deepEqual(clipToFrame([0.25, 0.25, 0.5, 0.5], { width: 100, height: 100 }, { width: 160, height: 90 }, { mode: "cover", x: 0.5, y: 0.5 }),
    [0.25, 0.0556, 0.5, 0.8889]);
});

test("a circle mark aimed at a recorded element lands on it in the frame, under fit: cover", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-markname-"));
  // Квадратный «дубль» 1000×1000: тёмный фон и белый элемент 200×100 в точке (600, 700).
  execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=0x202030:s=1000x1000:d=4:r=25",
    "-vf", "drawbox=x=600:y=700:w=200:h=100:color=white:t=fill", "-pix_fmt", "yuv420p", join(dir, "take.mp4")]);
  writeFileSync(join(dir, "take.mp4.marks.json"), JSON.stringify({ version: 1, trimmed: 0, marks: { box: 0.5 }, clicks: [],
    size: { width: 1000, height: 1000 }, rects: { box: [0.6, 0.7, 0.2, 0.1] } }));
  const story = (area: string): string => {
    writeFileSync(join(dir, "story.md"), `# M\nvoice: {"engine":"stub","name":"silent","cps":15}\ntheme: midnight\n\n## v · video\nfile: take.mp4\nfit: cover 0.5 0.5\nduration: 3.5\noverlay: {"marks":[{"at":0.5,"kind":"circle","area":"${area}","draw":0.6}]}\n`);
    return join(dir, "story.md");
  };
  assert.throws(() => parseSource(story("@nope")), /area @nope needs the element recorded with take\.mark\("nope", locator\); recorded: box/);
  const src = parseSource(story("@box"));
  const area = JSON.parse(src.scenes[0]!.fields.overlay!).marks[0].area as number[];
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-500));
  // Кадр после прорисовки: белый элемент и бирюзовый штрих круга — их центры совпадают.
  const W = 480, H = 270;
  const px = execFileSync(ffmpeg, ["-loglevel", "error", "-ss", "2.5", "-i", join(dir, "f.mp4"), "-frames:v", "1", "-vf", `scale=${W}:${H}`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
  const box = { x0: W, y0: H, x1: 0, y1: 0 }, ring = { x0: W, y0: H, x1: 0, y1: 0 };
  const grow = (b: typeof box, x: number, y: number): void => { b.x0 = Math.min(b.x0, x); b.y0 = Math.min(b.y0, y); b.x1 = Math.max(b.x1, x); b.y1 = Math.max(b.y1, y); };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const [rr, g, b] = [px[(y * W + x) * 3]!, px[(y * W + x) * 3 + 1]!, px[(y * W + x) * 3 + 2]!];
    if (rr > 225 && g > 225 && b > 225) grow(box, x, y);
    if (g > 150 && b > 140 && rr < 140) grow(ring, x, y);
  }
  const c = (b: typeof box): [number, number] => [(b.x0 + b.x1) / 2 / W, (b.y0 + b.y1) / 2 / H];
  const [bx, by] = c(box), [rx, ry] = c(ring);
  assert.ok(Math.abs(bx - (area[0]! + area[2]! / 2)) < 0.02 && Math.abs(by - (area[1]! + area[3]! / 2)) < 0.03, `the element sits where the area says: ${bx},${by} vs ${area}`);
  assert.ok(Math.abs(rx - bx) < 0.03 && Math.abs(ry - by) < 0.05, `circle centre ${rx.toFixed(3)},${ry.toFixed(3)} vs element ${bx.toFixed(3)},${by.toFixed(3)}`);
});
