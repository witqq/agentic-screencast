// Поток и камера: ролик с `flow: auto` получает связанный переход на каждом стыке, а слайды с
// камерой, живыми элементами, 3D-входами и хореографией собираются и двигаются, пока стоит кадр.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { renderScene, type RenderScene } from "../../render.js";
import { generateFrom } from "../../generate.js";

const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");
const W = 480, H = 270;
const HEAD = `lang: en\nvoice: {"engine":"stub","name":"silent","cps":15}\nframe: {"width":${W},"height":${H},"fps":10,"scale":1}\n`;

test("flow: auto connects every seam, and the camera, living and 3D fields build and move", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-flow-"));
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", `testsrc2=s=${W}x${H}:d=1`, "-frames:v", "1", join(dir, "shot.png")]);
  writeFileSync(join(dir, "story.md"), `# Flow\n${HEAD}flow: auto\n\n`
    + `## open · slides.chapter\ntitle: One stream\nbody: Scenes flow into each other.\nduration: 3\n\n`
    + `## feats · slides.features\ntitle: Alive\nitems: A :: one | B :: two | C :: three\nalive: jitter\nglow: border\nwave: center\nstagger: 0.1\nease: spring\nenter: flip3d tilt3d jolt\nmove: handheld\nduration: 3\n\nThree ideas.\n\n`
    + `## deck · slides.stack\nitems: One :: first | Two :: second | Three :: third\nmove: orbit3d\nduration: 3\n\n`
    + `## grid · slides.bento\npart: Depth\nitems: Big :: main | Two :: b | Three :: c | Wide :: d | Five :: e\nmove: dolly\nduration: 3\n\n`
    + `## parts · slides.layers\nimage: shot.png\npanels: 0.1 0.1 0.4 0.3 @ 1 | 0.5 0.5 0.4 0.3 @ 0.5\nmove: pan\nduration: 4\n\n`
    + `## end · slides.outro\ntitle: Thanks\nduration: 3\n`);
  const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8",
    env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
  assert.equal(r.status, 0, r.stderr.slice(-800));
  const report = JSON.parse(r.stdout) as { transitions: Array<{ scene: string; kind: string; renderer: string; at: number }> };
  // Внутри части — толчок, на новой части — хлёст, в финал камера влетает.
  assert.deepEqual(report.transitions.map((t) => [t.scene, t.kind]),
    [["feats", "push"], ["deck", "push"], ["grid", "whip"], ["parts", "push"], ["end", "zoom"]]);
  assert.ok(report.transitions.every((t) => t.renderer === "webgl"), JSON.stringify(report.transitions));
  const frame = (t: number): Buffer => execFileSync(ffmpeg, ["-loglevel", "error", "-ss", t.toFixed(2), "-i", join(dir, "f.mp4"),
    "-frames:v", "1", "-vf", "format=gray", "-f", "rawvideo", "-"]);
  const change = (a: number, b: number): number => {
    const x = frame(a), y = frame(b);
    let d = 0;
    for (let i = 0; i < x.length; i++) d += Math.abs(x[i]! - y[i]!);
    return d / x.length;
  };
  // Камера живёт и после входов: у каждой сцены с движением камеры кадр меняется за полсекунды.
  for (const t of report.transitions.slice(0, 4)) {
    const mid = t.at + 1.6;
    assert.ok(change(mid, mid + 0.5) > 0.3, `${t.scene}: the frame keeps moving (${change(mid, mid + 0.5).toFixed(2)})`);
  }
});

test("the new slide fields refuse what they do not know", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-flow-bad-"));
  const lint = (scene: string): string => {
    writeFileSync(join(dir, "story.md"), `# Bad\n${HEAD}\n## s · slides.features\nitems: A :: a | B :: b\n${scene}\n\nSome words here.\n`);
    const r = spawnSync("node", [ENTRY, "lint", "story.md"], { cwd: dir, encoding: "utf8" });
    return r.status === 0 ? "" : r.stdout + r.stderr;
  };
  assert.match(lint("alive: dance"), /wiggle \| float \| jitter/u);
  assert.match(lint("move: fly"), /dolly/u);
  assert.match(lint("stagger: 9"), /0.03 to 1.5/u);
  assert.match(lint("enter: pop wobble"), /flip3d/u);
  // Якорь музыки разбирается; удар без звука lint называет находкой (выход 1), а не ошибкой разбора (2).
  writeFileSync(join(dir, "story.md"), `# Bad\n${HEAD}\n## s · slides.features\nitems: A :: a | B :: b\nflash: m16\n\nSome words here.\n`);
  assert.notEqual(spawnSync("node", [ENTRY, "lint", "story.md"], { cwd: dir, encoding: "utf8" }).status, 2, "a music anchor is a valid hit moment");
  writeFileSync(join(dir, "story.md"), `# Bad\n${HEAD}flow: always\n\n## s · slides.chapter\ntitle: A\nbody: B\nduration: 2\n`);
  const r = spawnSync("node", [ENTRY, "lint", "story.md"], { cwd: dir, encoding: "utf8" });
  assert.match(r.stdout + r.stderr, /only value is auto/u);
});

// Трёхмерное обязано рисоваться одинаково, с какого бы кадра ни начался рендер: кадр, снятый первым
// в свежей странице (стоп-кадр, лист кадров, сборка частями), равен тому же кадру сквозного прогона.
test("3D entrances, tilted groups, the exploded view and the 3D camera render the same frame cold", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-flow-cold-"));
  execFileSync(ffmpeg, ["-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=s=960x540:d=1", "-frames:v", "1", join(dir, "shot.png")]);
  writeFileSync(join(dir, "story.md"), `# Cold\nvoice: {"engine":"stub","name":"silent"}\nlang: en\nframe: {"width":960,"height":540}\n\n`
    + `## f · slides.features\ntitle: Tilt\nitems: One :: a | Two :: b | Three :: c\nenter: flip3d tilt3d spin\nmove: orbit3d\n\nBeat one.\n\nBeat two.\n\n`
    + `## s · slides.stack\nitems: One :: a | Two :: b | Three :: c\nmove: handheld\nduration: 3\n\n`
    + `## b · slides.bento\nitems: One :: a | Two :: b | Three :: c | Four :: d | Five :: e\nmove: dolly\nduration: 3\n\n`
    + `## l · slides.layers\nimage: shot.png\npanels: 0.1 0.1 0.4 0.3 @ 1 | 0.5 0.5 0.4 0.3 @ 0.5\nduration: 3\n`);
  const g = generateFrom(join(dir, "story.md"));
  const pitch = JSON.parse(readFileSync(g.pitchFile, "utf8")) as { scenes: RenderScene[]; theme?: unknown };
  for (const raw of pitch.scenes) {
    const s = { ...raw, duration: 3, __src: dir, beats: (raw.beats as unknown[]).length, theme: pitch.theme } as RenderScene;
    const all = await renderScene(s, { width: 960, height: 540, fps: 10 });
    for (const t of [1.2, 2.6]) {
      const one = await renderScene(s, { width: 960, height: 540, fps: 10, at: t });
      assert.equal(one.shots[0]!.md5, all.shots[Math.round(t * 10)]!.md5, `${String(raw.id)}: frame ${t}s is the same when rendered cold`);
    }
  }
});
