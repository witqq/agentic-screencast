import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSpeed, speedDuration, speedFilter } from "../../speed.js";

test("a well formed span is accepted as written", () => {
  const spans = parseSpeed('[{"from":2,"to":4,"rate":0.5}]');
  assert.deepEqual(spans, [{ from: 2, to: 4, rate: 0.5 }]);
});

test("unreadable, empty, overlapping and pointless spans are rejected", () => {
  assert.throws(() => parseSpeed("[]"), /non-empty/);
  assert.throws(() => parseSpeed('[{"from":2,"to":1,"rate":0.5}]'), /later than from/);
  assert.throws(() => parseSpeed('[{"from":0,"to":2,"rate":9}]'), /0\.2–4/);
  assert.throws(() => parseSpeed('[{"from":0,"to":2,"rate":1}]'), /changes nothing/);
  assert.throws(() => parseSpeed('[{"from":0,"to":3,"rate":0.5},{"from":2,"to":4,"rate":2}]'),
    /must not overlap/);
  assert.throws(() => parseSpeed('[{"from":0,"to":2,"rate":0.5,"ease":"in"}]'), /unknown property/);
});

test("half speed doubles the named stretch and leaves the rest alone", () => {
  const spans = parseSpeed('[{"from":2,"to":4,"rate":0.5}]');
  assert.equal(speedDuration(spans, 8), 10);
  const filter = speedFilter(spans, 8);
  // Куски идут по порядку: обычный, переигранный, обычный — и склеиваются.
  assert.match(filter!, /trim=start=0:end=2/);
  assert.match(filter!, /trim=start=2:end=4,setpts=\(PTS-STARTPTS\)\/0\.5/);
  assert.match(filter!, /trim=start=4:end=8/);
  assert.match(filter!, /concat=n=3:v=1:a=0\[v\]/);
});

test("a span past the end of the clip is refused, not silently clipped", () => {
  assert.throws(() => speedFilter(parseSpeed('[{"from":100,"to":120,"rate":0.5}]'), 8),
    /past the 8\.00s clip/);
});
