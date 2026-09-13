import { test } from "node:test";
import assert from "node:assert/strict";
import { assertBeatBoundary, childFailure } from "../support.js";

test("unequal beats use the measured boundary, not half the total", () => {
  assert.doesNotThrow(() => assertBeatBoundary(1.68, 1.68));
  assert.doesNotThrow(() => assertBeatBoundary(0.84, 0.84));
  assert.doesNotThrow(() => assertBeatBoundary(1.234, 1.2344));
  assert.throws(() => assertBeatBoundary((1.68 + 0.84) / 2, 1.68), /previous measured beat/);
  assert.throws(() => assertBeatBoundary(1.69, 1.68));
});

test("missing or invalid timing evidence cannot pass", () => {
  for (const value of [NaN, Infinity, -1]) {
    assert.throws(() => assertBeatBoundary(value, 1));
    assert.throws(() => assertBeatBoundary(1, value));
  }
});

test("long stdout does not hide the child's assertion on stderr", () => {
  const stdout = Array.from({ length: 80 }, (_, i) => `observation ${i}`).join("\n");
  const report = childFailure({ status: 1, signal: null, stdout,
    stderr: "measured boundary assertion failed\n" });
  assert.match(report, /stdout:\nobservation 40/);
  assert.match(report, /observation 79/);
  assert.match(report, /stderr:\nmeasured boundary assertion failed/);
  assert.doesNotMatch(report, /observation 0\n/);
});

test("process failure retains exit, signal and launch error without output", () => {
  const report = childFailure({ status: null, signal: "SIGTERM", stdout: "", stderr: "",
    error: new Error("spawn timed out") });
  assert.match(report, /exit=null, signal=SIGTERM/);
  assert.match(report, /spawn timed out/);
});
