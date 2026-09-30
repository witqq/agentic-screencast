// Вау-эффекты: новые поля разбираются, рисуются и доходят до готового ролика — действия на странице,
// «ИИ думает», прожектор и перенос указателем, стена, облако и терминал, фраза из роя точек,
// буквы с картинкой, засветка без укорачивания ролика, маска из предмета и расслоение цвета;
// ошибочные поля отвергаются с названием поля, а lint называет два главных движения сразу и резкий наезд.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");
const W = 480, H = 270, FPS = 10;
const HEAD = `lang: en\nvoice: {"engine":"stub","name":"silent","cps":15}\nframe: {"width":${W},"height":${H},"fps":${FPS},"scale":1}\n`;

test("the new kinds, overlay fields, transitions and hits build into a film of the computed length", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-wow-"));
  for (const k of [1, 2, 3]) {
    execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=size=320x200:rate=1", "-frames:v", "1",
      "-vf", `hue=h=${k * 90}`, join(dir, `s${k}.png`)]);
  }
  writeFileSync(join(dir, "ui.html"), `<!doctype html><html data-sc-page><body style="margin:0;font:20px sans-serif">
<label><input id="sw" type="checkbox"> Auto-save</label>
<div role="tablist"><span role="tab" id="t1" class="active" aria-controls="p1">One</span><span role="tab" id="t2" aria-controls="p2">Two</span></div>
<div id="p1">Panel one</div><div id="p2" hidden>Panel two</div>
<ul id="list"><li>A</li><li>B</li><li>C</li></ul><div id="card" style="width:80px;height:40px;background:#fc6">Drag</div>
<div id="answer" style="width:200px;height:60px">The answer</div></body></html>`);
  const overlay = JSON.stringify({
    pointer: [{ at: 0.3, x: 0.2, y: 0.2 }, { at: 1, x: 0.1, y: 0.1, click: true, magnet: "#sw" },
      { at: 1.5, x: 0.2, y: 0.8, drag: "#card" }, { at: 2.4, x: 0.5, y: 0.8 }],
    actions: [{ at: 1, target: "#sw", kind: "toggle" }, { at: 1.6, target: "#t2", kind: "tab" },
      { at: 2, target: "#list", kind: "reorder", order: [3, 1, 2] }],
    torch: [{ at: 2.5, hold: 1 }],
    thinking: [{ at: 0.2, hold: 1.2, target: "#answer" }, { at: 3.6, hold: 0.8, text: "Thinking…" }],
    boops: [{ at: 1, target: "#sw", kind: "pulse", hold: 1 }],
  });
  writeFileSync(join(dir, "story.md"), `# Wow\n${HEAD}\n`
    + `## ui · page\npage: ui.html\noverlay: ${overlay}\nduration: 4.6\n\n`
    + `## wall · slides.wall\ntitle: Every screen\nimages: s1.png | s2.png | s3.png\ntransition: leak 0.6\nduration: 2.4\n\n`
    + `## cloud · slides.cloud\ntitle: Everything connects\nitems: Linear | Notion | GitHub | Slack | Figma\ntransition: {"kind":"mask","at":"0.5 0.5","duration":0.6}\nduration: 2.4\n\n`
    + `## term · slides.shell\ntitle: It runs\nitems: $ npm test :: ✔ 3 passed | ✔ ready\ntransition: curl 0.6\nduration: 2.4\n\n`
    + `## hero · slides.hero\ntitle: Born from ==dots==\ntext: swarm\npace: snap\nrgb: 1s\nduration: 2.4\n\n`
    + `## fill · slides.hero\ntitle: DEEP\nfill: s2.png\nswap: morph\nduration: 2\n`);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8",
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-800));
  const rep = JSON.parse(r.stdout) as { duration: number; scenes: Array<{ id: string; frames: number }>;
    transitions: Array<{ kind: string; renderer: string }>; hits?: { rgb?: number[] } };
  assert.deepEqual(rep.transitions.map((t) => t.kind), ["leak", "mask", "curl"]);
  assert.ok(rep.transitions.every((t) => t.renderer === "webgl"), JSON.stringify(rep.transitions));
  // Засветка лежит на стыке и ролик не укорачивает; маска и перелистывание перекрывают сцены на свою длину.
  const want = (rep.scenes.reduce((n, s) => n + s.frames, 0) - 2 * 0.6 * FPS) / FPS;
  assert.ok(Math.abs(rep.duration - want) < 0.15, `length ${rep.duration} vs computed ${want}`);
  assert.equal(rep.hits?.rgb?.length, 1, "the rgb hit reaches the film pass");
});

test("a malformed new field is refused with its name, and lint names two lead movements and a harsh push", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-wow-bad-"));
  writeFileSync(join(dir, "p.html"), "<!doctype html><html data-sc-page><body><div id=\"a\">A</div></body></html>");
  const lint = (scene: string): string => {
    writeFileSync(join(dir, "story.md"), `# Bad\n${HEAD}\n${scene}`);
    const r = spawnSync("node", [ENTRY, "lint", "story.md"], { cwd: dir, encoding: "utf8" });
    return r.stdout + r.stderr;
  };
  assert.match(lint(`## a · page\npage: p.html\nduration: 3\noverlay: {"pointer":[{"at":0,"x":0.1,"y":0.1,"drag":"#a"}]}\n`), /pointer\[0\]\.drag/u);
  assert.match(lint(`## a · page\npage: p.html\nduration: 3\noverlay: {"torch":[{"at":1,"hold":1}]}\n`), /overlay\.torch/u);
  assert.match(lint(`## a · page\npage: p.html\nduration: 3\noverlay: {"actions":[{"at":1,"target":"#a","kind":"reorder","order":[1,1]}]}\n`), /actions\[0\]\.order/u);
  assert.match(lint(`## a · slides.hero\ntitle: T\nswap: melt\nduration: 3\n`), /swap/u);
  const motion = lint(`## a · slides.features\ntitle: F\nitems: One :: a | Two :: b\nmove: orbit3d\n`
    + `overlay: {"camera":[{"at":0.5,"hold":1,"target":"el2","scale":2.4,"move":0.4}]}\nduration: 4\n\nTwo features.\n`);
  assert.match(motion, /"motion-stack"/u);
  assert.match(motion, /"harsh-push"/u);
});
