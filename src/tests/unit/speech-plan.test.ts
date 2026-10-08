import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { parseSource } from "../../source.js";
import { speechPlan } from "../../speech-plan.js";
import { PRODUCT_ROOT } from "../../self-hash.js";
import { pronunciationSchema } from "../../schema.js";
import { Ajv2020 } from "ajv/dist/2020.js";

const story = (voice: string, rules: string): string => `# Речь
lang: ru
voice: ${voice}
pronounce: ${rules}

## methods · slides.chapter
title: CanvasStage
body: advance → getSlideRenderId

CanvasStage вызывает advance.

getSlideRenderId возвращает идентификатор.
~ Метод возвращает идентификатор отрисовки.
`;
const voice = '{"engine":"never-invoke-this-engine","name":"check"}';
const rules = { say: { CanvasStage: "канвас стейдж", advance: "эдванс" } };

test("speech preview preserves source beats/captions and bypasses rules for explicit speech", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-speech-plan-"));
  try {
    writeFileSync(join(dir, "rules.json"), JSON.stringify(rules));
    const file = join(dir, "story.md");
    writeFileSync(file, story(voice, "rules.json"));
    const source = parseSource(file);
    const before = JSON.stringify(source);
    const plan = speechPlan(source).scenes[0]!;
    assert.deepEqual(plan.beats.map((b) => b.anchor), ["b1", "b2"]);
    assert.equal(plan.beats[0]!.speech, "канвас стейдж вызывает эдванс.");
    assert.equal(plan.beats[1]!.speech, "Метод возвращает идентификатор отрисовки.");
    assert.deepEqual(plan.beats.map((b) => b.preparation), ["rules", "explicit"]);
    assert.match(plan.beats[0]!.text, /CanvasStage вызывает advance/);
    assert.match(source.scenes[0]!.caption, /getSlideRenderId/);
    assert.equal(JSON.stringify(source), before);
    const overridden = speechPlan(source, { engine: "unused", rules: { say: { advance: "продвинуть" } } }).scenes[0]!;
    assert.equal(overridden.beats[0]!.speech, "CanvasStage вызывает продвинуть.");
    assert.equal(overridden.beats[1]!.speech, plan.beats[1]!.speech);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("CLI speech preview needs no engine and writes no paid cache", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-speech-cli-"));
  try {
    const file = join(dir, "story.md");
    writeFileSync(file, story(voice, JSON.stringify(rules)));
    const result = spawnSync(process.execPath, [join(PRODUCT_ROOT, "dist/agentic-screencast.js"),
      "script", file, "--speech", "--json"], { cwd: dir, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const plan = JSON.parse(result.stdout) as ReturnType<typeof speechPlan>;
    assert.equal(plan.scenes[0]!.beats[0]!.speech, "канвас стейдж вызывает эдванс.");
    const overridden = spawnSync(process.execPath, [join(PRODUCT_ROOT, "dist/agentic-screencast.js"),
      "script", file, "--speech", "--json", "--voice-json", JSON.stringify({ engine: "unused", rules: { say: { advance: "продвинуть" } } })],
      { cwd: dir, encoding: "utf8" });
    assert.equal(overridden.status, 0, overridden.stderr);
    assert.equal((JSON.parse(overridden.stdout) as ReturnType<typeof speechPlan>).scenes[0]!.beats[0]!.speech,
      "CanvasStage вызывает продвинуть.");
    assert.equal(existsSync(join(dir, ".agentic-screencast")), false);
    assert.equal(existsSync(join(dir, ".generated-pitch.json")), false);
    const original = spawnSync(process.execPath, [join(PRODUCT_ROOT, "dist/agentic-screencast.js"), "script", file], { cwd: dir, encoding: "utf8" });
    assert.match(original.stdout, /CanvasStage вызывает advance/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("pronunciation schema accepts dictionaries and regex pairs with comment metadata", () => {
  const accepts = new Ajv2020({ strict: false }).compile(pronunciationSchema());
  assert.ok(accepts({ ...rules, _: "domain choices", cleanup: [[" +", " "]], order: ["say", "cleanup"] }));
  assert.equal(accepts({ say: { advance: 7 } }), false);
  assert.equal(accepts({ translit: [["a"]] }), false);
});
