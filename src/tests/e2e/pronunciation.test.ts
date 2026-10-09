import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { parseSource } from "../../source.js";
import { speechPlan } from "../../speech-plan.js";
import { voiceKey } from "../../voice/index.js";
import { anchorSeconds } from "../../spotlight.js";
import { cuesOf, srtOf } from "../../film.js";
import { PRODUCT_ROOT } from "../../self-hash.js";

test("prepared preview equals actual stub synthesis; dictionary edits preserve unaffected beat keys and measured anchors", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-pronunciation-"));
  const file = join(dir, "story.md");
  const voice = { engine: "stub", name: "silent", cps: 15 };
  const rules = { say: { CanvasStage: "канвас стейдж", advance: "эдванс" } };
  const write = (): void => writeFileSync(file, `# Речь
lang: ru
voice: ${JSON.stringify(voice)}
pronounce: ${JSON.stringify(rules)}
frame: {"width":640,"height":360,"fps":10}

## methods · slides.chapter
title: CanvasStage
body: advance → getSlideRenderId
speechAt: 0.7

CanvasStage вызывает advance.

getSlideRenderId возвращает идентификатор.
~ Метод возвращает идентификатор отрисовки.
`);
  interface Keys { keys: Array<{ beats: Array<{ key: string; speech: string; spoken: number; starts: number }> }> }
  const build = (): Keys => {
    const result = spawnSync(process.execPath, [join(PRODUCT_ROOT, "dist/agentic-screencast.js"),
      "build", "--source", file, "--keys-only", "--out", join(dir, "never-made.mp4")],
      { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, "cache") } });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout) as Keys;
  };
  try {
    write();
    const source = parseSource(file);
    const plan = speechPlan(source).scenes[0]!.beats;
    const first = build().keys[0]!.beats;
    assert.deepEqual(first.map((b) => b.speech), plan.map((b) => b.speech));
    first.forEach((b, i) => assert.equal(b.key, voiceKey(plan[i]!.speech, voice, "")));
    assert.equal(first[0]!.starts, 0.7);
    assert.ok(Math.abs(first[1]!.starts - first[0]!.starts - first[0]!.spoken) < 0.002);
    const starts = first.map((b) => b.starts), ends = first.map((b) => b.starts + b.spoken);
    const cues = cuesOf([{ duration: ends[1]! + 1, starts,
      beats: source.scenes[0]!.beats.map((b, i) => ({ text: b.text, spoken: first[i]!.spoken })) }]);
    assert.deepEqual(cues.map((c) => c.text), source.scenes[0]!.beats.map((b) => b.text));
    assert.equal(cues[1]!.start, first[1]!.starts);
    const srt = srtOf(cues);
    assert.match(srt, /CanvasStage вызывает advance/);
    assert.match(srt, /getSlideRenderId/);
    assert.doesNotMatch(srt, /канвас стейдж/);
    assert.equal(anchorSeconds("b2", starts, ends[1]!, ends), first[1]!.starts);
    assert.equal(anchorSeconds("b2.end", starts, ends[1]! + 1, ends), ends[1]);
    rules.say.advance = "метод продвижения";
    write();
    const changed = build().keys[0]!.beats;
    assert.notEqual(changed[0]!.key, first[0]!.key);
    assert.equal(changed[1]!.key, first[1]!.key);
    assert.ok(changed[1]!.starts > first[1]!.starts);
    Object.assign(rules.say, { unused: "не используется" });
    write();
    assert.deepEqual(build().keys[0]!.beats.map((b) => b.key), changed.map((b) => b.key));
    assert.match(parseSource(file).scenes[0]!.caption, /CanvasStage вызывает advance/);
    assert.match(parseSource(file).scenes[0]!.caption, /getSlideRenderId/);
    assert.equal(existsSync(join(dir, "never-made.mp4")), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
