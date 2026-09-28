// Сцены рисуются по нескольку сразу, но каждая — своим браузером от первого кадра до последнего,
// как при сборке по одной. Под общей нагрузкой растеризатор Chromium изредка округляет точку
// иначе, поэтому сегменты сравниваются по картинке: у каждого SSIM не ниже 0,995 против сборки по
// одной, в разных кэшах; порядок отчёта — порядок сценария.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

test("scenes drawn several at a time give the same segments as scenes drawn one by one", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-jobs-"));
  writeFileSync(join(dir, "page.html"), `<!doctype html><body style="margin:0;background:#203040"><div id="t" style="position:absolute;left:260px;top:120px;width:120px;height:60px;background:#607090"></div></body>`);
  writeFileSync(join(dir, "story.md"), `# Jobs
lang: en
voice: {"engine":"stub","name":"silent","cps":15}
frame: {"width":640,"height":360,"fps":10,"scale":1}
captions: {"style":"karaoke","everywhere":true}

## a · slides.steps
title: Steps
items: One :: first | Two :: second | Three :: third

Every step lights up in turn.

## b · slides.counter
title: Counter
values: 1,240 :: films | 98% :: cached
transition: cube 0.6

The numbers count up.

## c · page
page: page.html
overlay: {"cards":[{"at":0.5,"title":"Saved","hold":4}],"marks":[{"at":0.4,"kind":"circle","target":"#t"}]}

A card and a mark on a page.

## d · slides.hero
title: The end
transition: dissolve 0.5

The last scene closes the film.
`);
  const build = (jobs: number): { segments: Array<{ id: string; md5: string; seg: string }>; timing: { jobs: number; scenes: number } } => {
    const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", `film-${jobs}.mp4`], { cwd: dir, encoding: "utf8",
      env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, `.home-${jobs}`), AGENTIC_SCREENCAST_JOBS: String(jobs) } });
    assert.equal(r.status, 0, r.stderr.slice(-600));
    return JSON.parse(r.stdout) as { segments: Array<{ id: string; md5: string; seg: string }>; timing: { jobs: number; scenes: number } };
  };
  const one = build(1), three = build(3);
  assert.equal(one.timing.jobs, 1);
  assert.equal(three.timing.jobs, 3);
  assert.deepEqual(three.segments.map((s) => s.id), ["a", "b", "c", "d"], "the report keeps the scenario's order");
  three.segments.forEach((s, i) => {
    if (s.md5 === one.segments[i]!.md5) return;
    const said = spawnSync(ffmpeg, ["-hide_banner", "-i", one.segments[i]!.seg, "-i", s.seg, "-lavfi", "[0:v][1:v]ssim", "-f", "null", "-"], { encoding: "utf8" }).stderr;
    const ssim = Number(/All:([\d.]+)/.exec(said)?.[1]);
    assert.ok(ssim >= 0.995, `${s.id}: the segment drawn alongside others looks the same (SSIM ${ssim})`);
  });
  process.stderr.write(`scenes one by one ${one.timing.scenes}s, three at a time ${three.timing.scenes}s\n`);
});
