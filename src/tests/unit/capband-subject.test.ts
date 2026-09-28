import { test } from "node:test";
import assert from "node:assert/strict";
import { chooseBand, chooseBandAwayFrom } from "../../capband.js";

test("an important flat subject rules out its caption band without changing the ordinary pixel choice", () => {
  const detail = { top: 9, middle: 7, bottom: 0.1 };
  const frame = { width: 640, height: 360 }, zone = { top: 10, bottom: 10 };
  assert.equal(chooseBand(detail), "bottom", "edge density alone would cover the flat control");
  assert.equal(chooseBandAwayFrom(detail, [{ left: 200, top: 285, width: 240, height: 45 }], frame, zone, 0.2), "middle");
  assert.equal(chooseBandAwayFrom(detail, [], frame, zone, 0.2), "bottom");
});
