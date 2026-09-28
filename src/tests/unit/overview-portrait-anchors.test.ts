import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("portrait timing marks stay attached to the beats as speech stretches", () => {
  for (const [suffix, callout] of [["", "push-in @ b2"], [".ru", "наезд @ b2"]]) {
    const html = readFileSync(resolve(root, `website/overview/pages/anchors.vertical${suffix}.html`), "utf8");
    const tracks = [...html.matchAll(/<g class="rv" data-at="b[12]">([\s\S]*?)<\/g>/g)].map((m) => m[1]!);
    assert.equal(tracks.length, 2);
    const positions: number[] = [];
    for (const track of tracks) {
      const first = Number(track.match(/<rect x="0" y="[^"]+" width="([^"]+)" height="100" rx="16" class="first"/)?.[1]);
      const second = Number(track.match(/class="second"/) && track.match(/<rect x="[^"]+" y="[^"]+" width="([^"]+)" height="100" rx="16" class="second"/)?.[1]);
      const ticks = [...track.matchAll(/<line x1="([^"]+)" x2="[^"]+"[^>]+class="tick"\/>/g)].map((m) => Number(m[1]));
      assert.equal(ticks.length, 5, "each named moment has a positioned tick");
      const [start, share, beat2, afterBeat2, end] = ticks;
      assert.equal(start, 0);
      assert.equal(beat2, first, "b2 begins exactly where the first beat ends");
      assert.equal(end, first + second, "b2.end stays at the end of the second bar");
      assert.ok(start! < share! && share! < beat2! && beat2! < afterBeat2! && afterBeat2! < end!);
      assert.match(track, new RegExp(`<text x="${share}"[^>]*>40%<\\/text>`));
      assert.match(track, new RegExp(`<text x="${end}"[^>]*>b2\\.end<\\/text>`));
      const leader = Number(track.match(/<path d="M ([\d.]+) [^"]+" class="leader"/)?.[1]);
      const chip = track.match(/<rect x="([\d.]+)"[^>]+width="([\d.]+)"[^>]+class="chip"/);
      assert.equal(leader, beat2);
      assert.equal(Number(chip?.[1]) + Number(chip?.[2]) / 2, beat2, "camera cue points to b2");
      assert.ok(track.includes(callout));
      positions.push(beat2!);
    }
    assert.ok(positions[1]! > positions[0]! + 100, "slower speech moves b2 visibly to the right");
  }
});
