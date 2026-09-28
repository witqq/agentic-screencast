// Инструменты живого дубля — по кадрам записанного ролика: наезд и подсветка,
// отметки от нуля записи, клавиши, курсор, обрезка пустого начала, отказ на
// ошибке страницы, сцена сценария с `@отметкой` и наезды к кликам.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { recordTake, type TakeMarks } from "../../capture.js";
import { autoZoomCues, resolveMarks } from "../../marks.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const ffprobe = require("@ffprobe-installer/ffprobe").path as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");
const W = 640, H = 360;

/** Страница, которая первую секунду пуста, как настоящее приложение до отрисовки. */
const PAGE = `<!doctype html><html><body style="margin:0;background:#fff;font:18px sans-serif">
<div id="app" style="display:none">
  <div id="target" style="position:absolute;left:80px;top:60px;width:120px;height:80px;background:#e33"></div>
  <button id="save" style="position:absolute;left:380px;top:70px;width:140px;height:60px;border:0;background:#2a6ad8"></button>
  <input id="field" style="position:absolute;left:380px;top:200px;width:160px;height:36px">
</div>
<script>
  setTimeout(() => { document.getElementById('app').style.display = 'block'; }, 1000);
  document.getElementById('save').addEventListener('click', (e) => { e.currentTarget.style.background = '#1db954'; });
</script></body></html>`;

const frame = (file: string, t: number): Buffer => execFileSync(ffmpeg, ["-loglevel", "error", "-ss", String(Math.max(0, t)), "-i", file,
  "-frames:v", "1", "-vf", `scale=${W}:${H}`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
const count = (f: Buffer, pred: (r: number, g: number, b: number) => boolean, box = [0, 0, W, H]): number => {
  let n = 0;
  for (let y = box[1]!; y < box[1]! + box[3]!; y++) for (let x = box[0]!; x < box[0]! + box[2]!; x++) {
    const i = (y * W + x) * 3;
    if (pred(f[i]!, f[i + 1]!, f[i + 2]!)) n++;
  }
  return n;
};
const red = (r: number, g: number, b: number): boolean => r > 180 && g < 90 && b < 90;
const green = (r: number, g: number, b: number): boolean => g > 140 && r < 90 && b < 130;
const duration = (file: string): number => Number(execFileSync(ffprobe, ["-v", "error", "-show_entries", "format=duration",
  "-of", "default=nw=1:nk=1", file], { encoding: "utf8" }));

async function shoot(dir: string, trimStart: boolean): Promise<{ file: string; marks: TakeMarks }> {
  const html = join(dir, "app.html");
  writeFileSync(html, PAGE);
  const file = join(dir, trimStart ? "take.webm" : "raw.webm");
  // Проверки ниже ищут светлый курсор и тёмную карточку ночной темы; умолчание — светлая neutral.
  await recordTake({ output: file, viewport: { width: W, height: H }, trimStart, theme: "midnight",
    prepare: async (page) => { await page.goto(pathToFileURL(html).href); } }, async (take) => {
    await take.waitFor(take.page.locator("#target"));
    take.mark("overview");
    await take.focus(take.page.locator("#target"), { scale: 2, move: 0.7 });
    take.mark("focused");
    await take.page.waitForTimeout(500);
    await take.unfocus({ move: 0.6 });
    await take.click(take.page.locator("#save"));
    take.mark("saved");
    await take.press(take.page.locator("#field"), "Meta+K");
    take.mark("keyed");
    await take.page.waitForTimeout(400);
  });
  return { file, marks: JSON.parse(readFileSync(`${file}.marks.json`, "utf8")) as TakeMarks };
}

test("marks resolve in scenario fields and clicks become camera moves", () => {
  const marks = { trimmed: 0, marks: { saved: 3.2 }, clicks: [] };
  assert.equal(resolveMarks("@saved", marks, "x"), "3.2");
  assert.equal(resolveMarks('[{"at":"@saved","hold":2}]', marks, "x"), '[{"at":3.2,"hold":2}]');
  assert.throws(() => resolveMarks("@nope", marks, "scene v freezeAt"), /unknown mark @nope; known: saved/);
  assert.equal(resolveMarks("@saved+0.5", marks, "x"), "3.7");
  assert.equal(resolveMarks('{"at":"@saved-0.2","card":{"title":"Marked @saved in the take"}}', marks, "x"),
    '{"at":3,"card":{"title":"Marked @saved in the take"}}', "prose mentioning a mark stays prose");
  // Целые секунды после дефиса читались как часть имени: `@done-3` падал «unknown mark @done-3».
  const named = { trimmed: 0, marks: { done: 5, "steps-end": 8 }, clicks: [] };
  assert.equal(resolveMarks("@done-3", named, "x"), "2");
  assert.equal(resolveMarks("@steps-end-1", named, "x"), "7");
  assert.equal(resolveMarks("@steps-end", named, "x"), "8");
  assert.equal(resolveMarks('{"at":"@done-3"}', named, "x"), '{"at":2}');
  assert.throws(() => resolveMarks("@gone-3", named, "x"), /unknown mark @gone-3/);
  const cues = autoZoomCues([{ t: 2, x: 0.5, y: 0.5 }, { t: 2.8, x: 0.8, y: 0.2 }, { t: 9, x: 0.1, y: 0.9 }]);
  assert.equal(cues.length, 3);
  assert.equal(cues[0]!.keep, true, "two close clicks are one travelling move");
  assert.ok(Math.abs(cues[2]!.at + 0.35 - 9) < 1e-9);
});

test("a live take pushes in, dims, marks, shows keys and the cursor, and trims its blank start", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-live-"));
  const { file, marks } = await shoot(dir, true);
  const raw = await shoot(dir, false);
  // Обрезка: первый кадр не пустой, дубль короче необрезанного.
  const first = frame(file, 0);
  assert.ok(count(first, (r, g, b) => r < 200 || g < 200 || b < 200) > 500, "the first frame has content");
  assert.ok(marks.trimmed > 0.5, `blank start trimmed: ${marks.trimmed}s`);
  assert.ok(duration(raw.file) - duration(file) > 0.5, `the trimmed take is shorter (${duration(raw.file)} → ${duration(file)})`);
  // Наезд: цель крупнее, чем на общем плане.
  // Отметка ставится вплотную перед наездом: кадр общего плана берём чуть раньше
  // неё — точность отметок около десятой доли секунды.
  const overview = frame(file, marks.marks.overview! - 0.3), focused = frame(file, marks.marks.focused!);
  assert.ok(count(focused, red) > count(overview, red) * 2.5, `the target grows (${count(overview, red)} → ${count(focused, red)})`);
  // Подсветка: белый фон вокруг гаснет, цель не темнеет.
  const light = (f: Buffer): number => count(f, (r, g, b) => r > 235 && g > 235 && b > 235);
  assert.ok(light(focused) < light(overview) * 0.3, `the page around dims (${light(overview)} → ${light(focused)} white px)`);
  // Отметка: кадр по отметке показывает результат клика, за секунду до неё — прежнее состояние.
  assert.ok(count(frame(file, marks.marks.saved! + 0.05), green) > 2000, "the frame at @saved shows the saved button");
  assert.equal(count(frame(file, marks.marks.saved! - 1.2), green), 0, "a second earlier it was not saved yet");
  // Клавиши: плашка внизу по центру есть после нажатия и нет до него.
  const caps = (f: Buffer): number => count(f, (r, g, b) => r < 60 && g < 70 && b < 90, [W * 0.3, H * 0.78, W * 0.4, H * 0.18].map(Math.round));
  assert.ok(caps(frame(file, marks.marks.keyed! - 0.1)) > 300, "key caps are on screen after the press");
  assert.equal(caps(frame(file, marks.marks.saved! - 1.2)), 0, "no key caps before any press");
  // Курсор: в точке клика по кнопке видна белая стрелка.
  const click = marks.clicks[0]!;
  const cx = Math.round(click.x * W), cy = Math.round(click.y * H);
  const around = frame(file, click.t + 0.3);
  // Курсор — 1,35 единицы слоя дубля, а единица не меньше сотой от 1280: в дубле шириной 640 — 17 точек.
  // Стрелка занимает десятую долю своего квадрата; на зелёной странице без курсора белых точек нет.
  const cur = Math.round(Math.max(W, 1280) * 0.0135);
  assert.ok(count(around, (r, g, b) => r > 235 && g > 235 && b > 235, [cx - 2, cy - 2, cur + 4, cur + 6]) > 8, "the cursor is drawn at the click point");
});

test("a take fails with a clear message when the page throws", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-live-err-"));
  await assert.rejects(recordTake({ output: join(dir, "bad.webm"), viewport: { width: W, height: H },
    prepare: async (page) => {
      await page.setContent(`<button id="b" style="width:200px;height:60px">Go</button>
        <script>document.getElementById('b').onclick = () => { throw new Error('animation failed to compile'); };</script>`);
    } }, async (take) => {
    await take.click(take.page.locator("#b"));
    await take.page.waitForTimeout(200);
    await take.click(take.page.locator("#b"));
  }), /page error during the take: animation failed to compile/);
});

test("a scene cuts and focuses at a named mark, and autoZoom pushes in at the click", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-live-scene-"));
  const { marks } = await shoot(dir, true);
  writeFileSync(join(dir, "story.md"), `# L
voice: {"engine":"stub","name":"silent"}
theme: midnight
frame: {"width":${W},"height":${H},"fps":10,"scale":1}

## held · video
file: take.webm
freezeAt: @saved
duration: 3

## auto · video
file: take.webm
autoZoom: {"scale":2}
`);
  const r = spawnSync("node", [ENTRY, "build", "--source", "story.md", "--out", "f.mp4"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr);
  const rep = JSON.parse(r.stdout) as { scenes: Array<{ id: string; camera?: Array<{ at: number; area: number[] }> }> };
  // Замороженный кадр сцены по отметке — уже сохранённая кнопка.
  assert.ok(count(frame(join(dir, "f.mp4"), 1.5), green) > 1500, "the scene frozen at @saved shows the result");
  const cam = rep.scenes.find((s) => s.id === "auto")!.camera!;
  const click = marks.clicks[0]!;
  // Наезд по действиям дубля: клик входит в наезд своей группы — наезд уже идёт или держится в
  // момент клика, и точка клика внутри его области.
  const covers = (c: { at: number; area: number[]; hold?: number; move?: number }): boolean => c.at <= click.t + 0.05
    && c.at + (c.move ?? 0.5) + (c.hold ?? 1.2) >= click.t
    && click.x >= c.area[0]! && click.x <= c.area[0]! + c.area[2]! && click.y >= c.area[1]! && click.y <= c.area[1]! + c.area[3]!;
  assert.ok(cam.some(covers), `a push-in covers the click at ${click.t}s: ${JSON.stringify(cam)}`);
  // Через полсекунды после клика картинка увеличена вокруг кнопки.
  const start = 3; // первая сцена длится три секунды
  const zoomed = frame(join(dir, "f.mp4"), start + click.t + 0.5);
  const plain = frame(join(dir, "take.webm"), click.t + 0.5);
  const btn = (f: Buffer): number => count(f, (r, g, b) => (b > 180 && r < 80) || green(r, g, b));
  assert.ok(btn(zoomed) > btn(plain) * 2, `the button fills more of the frame (${btn(plain)} → ${btn(zoomed)})`);
});

test("autoZoom by actions: close actions are one push-in on their common area, typing holds it, a far action is its own", async () => {
  const { actionZoomCues } = await import("../../marks.js");
  const actions = [
    { kind: "click", t: 1, end: 1.3, rect: [0.1, 0.1, 0.1, 0.05] as [number, number, number, number] },
    { kind: "type", t: 1.5, end: 3.5, rect: [0.1, 0.18, 0.2, 0.05] as [number, number, number, number] },
    { kind: "click", t: 3.8, end: 4.0, rect: [0.1, 0.26, 0.15, 0.05] as [number, number, number, number] },
    { kind: "click", t: 9, end: 9.2, rect: [0.8, 0.8, 0.1, 0.05] as [number, number, number, number] },
  ];
  const cues = actionZoomCues(actions, []);
  assert.equal(cues.length, 2, "three close actions are one push-in, the far one another");
  const [x, y, w, h] = cues[0]!.area!;
  for (const a of actions.slice(0, 3)) {
    const [ax, ay, aw, ah] = a.rect;
    assert.ok(ax >= x && ay >= y && ax + aw <= x + w && ay + ah <= y + h, `the area ${cues[0]!.area} holds ${a.rect}`);
  }
  assert.ok(x < 0.1 && y < 0.1, "the area has a margin around the elements");
  assert.ok(cues[0]!.at + (cues[0]!.move ?? 0.5) + cues[0]!.hold >= 4, "the push-in holds until the typing and the last close click are done");
  assert.ok(Math.abs(cues[1]!.at - (9 - 0.35)) < 1e-9);
});
