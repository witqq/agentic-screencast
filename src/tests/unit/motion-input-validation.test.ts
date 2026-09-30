import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// Initialize the provider registry before the scene conversion's source dependency.
import "../../provider/index.js";
import { slideOf } from "../../provider/slides/from-scene.js";
import { parseOverlay } from "../../overlay.js";
import { compileSpotlights, parseSpotlight } from "../../spotlight.js";
import { useLang } from "../../msg.js";
import type { RawScene } from "../../source.js";

test("a race CSV requires one non-empty non-negative numeric value per period and keeps zero", () => {
  useLang("en");
  const dir = mkdtempSync(join(tmpdir(), "sc-race-input-"));
  const source = join(dir, "data.csv");
  const scene: RawScene = { id: "race", provider: "slides", kind: "chart",
    fields: { data: "data.csv", type: "race" }, beats: [], caption: "" };
  try {
    writeFileSync(source, "name,2020,2021\nA,0,10\nB,1_000,2\n");
    assert.deepEqual(slideOf(scene, dir).chart?.race?.rows,
      [{ label: "A", values: [0, 10] }, { label: "B", values: [1000, 2] }]);
    for (const row of ["A,10", "A,10,", "A,10,   ", "A,10,_", "A,10,2,3",
      "A,10,Infinity", "A,10,NaN", "A,10,-1", ",10,2"]) {
      writeFileSync(source, `name,2020,2021\n${row}\nB,2,3\n`);
      assert.throws(() => slideOf(scene, dir), /data row 2: expected a label and exactly 2 non-empty non-negative numbers, one per period/u, row);
    }
    useLang("ru");
    writeFileSync(source, "name,2020,2021\nA,10\nB,2,3\n");
    assert.throws(() => slideOf(scene, dir), /строка данных 2: ожидается подпись и ровно 2 непустых неотрицательных чисел/u);
    useLang("en");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("bar and line charts reject missing numeric data while keeping genuine zero", () => {
  useLang("en");
  const dir = mkdtempSync(join(tmpdir(), "sc-chart-input-"));
  try {
    for (const type of ["bar", "line"]) {
      const scene: RawScene = { id: "chart", provider: "slides", kind: "chart",
        fields: { data: "data.csv", type }, beats: [], caption: "" };
      writeFileSync(join(dir, "data.csv"), "label,value\nA,0\nB,2\n");
      assert.equal(slideOf(scene, dir).chart?.rows[0]?.value, 0);
      for (const row of ["A,", "A, _ ", ",2"]) {
        writeFileSync(join(dir, "data.csv"), `label,value\n${row}\nB,2\n`);
        assert.throws(() => slideOf(scene, dir), /data row 1/u, `${type}: ${row}`);
      }
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("layer panels reject malformed coordinates and depth instead of storing NaN", () => {
  useLang("en");
  for (const panels of ["0 0 .. 0.4 @ 0.5", "0 0 0.4 0.4 @ .."]) {
    const scene: RawScene = { id: "layers", provider: "slides", kind: "layers", fields: { panels }, beats: [], caption: "" };
    assert.throws(() => slideOf(scene), /panels\[1\]: expected/u, panels);
  }
});

test("camera styles reject inherited names through both parsers and direct spotlight compilation", () => {
  useLang("en");
  for (const style of ["constructor", "toString", "__proto__"]) {
    assert.throws(() => parseOverlay(JSON.stringify({ camera: [{ at: 0, hold: 1, target: "#a", style }] })),
      /overlay\.camera\[0\]\.style: expected gentle \| snappy/u, style);
    assert.throws(() => parseSpotlight(JSON.stringify({ target: "#a", at: 0, style })),
      /spotlight\[0\]\.style: expected gentle \| snappy/u, style);
    assert.throws(() => compileSpotlights([{ target: "#a", at: "0", style }],
      { starts: [0], ends: [3], duration: 3, video: false }),
    /spotlight\[0\]\.style: expected gentle \| snappy/u, style);
  }
  for (const [style, move, back] of [["gentle", 1.3, 1.2], ["snappy", 0.45, 0.5]] as const) {
    const overlay = parseOverlay(JSON.stringify({ camera: [{ at: 0, hold: 1, target: "#a", style }] }));
    assert.equal(overlay.camera?.[0]?.move, move);
    assert.equal(overlay.camera?.[0]?.return, back);
    const list = parseSpotlight(JSON.stringify({ target: "#a", at: 0, style }));
    const compiled = compileSpotlights(list, { starts: [0], ends: [3], duration: 3, video: false });
    assert.equal(compiled.camera[0]?.move, move);
    assert.equal(compiled.camera[0]?.return, back);
  }
});
