// Окно наезда следует за курсором (`follow: "cursor"`): курсор, ушедший за край приближенного окна,
// раньше пропадал из кадра до конца удержания. Теперь окно подтягивается, когда курсор выходит из
// середины окна, и стоит, пока он внутри неё.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cameraLegs } from "../../camera.js";
import { parseOverlay } from "../../overlay.js";
import { useLang } from "../../msg.js";

/** Центр окна в момент t: сумма пройденных долей отрезков. */
function centreAt(legs: ReturnType<typeof cameraLegs>, t: number): { x: number; y: number; z: number } {
  let x = 0.5, y = 0.5, z = 1;
  for (const l of legs) {
    const p = Math.min(1, Math.max(0, (t - l.t0) / Math.max(1e-3, l.t1 - l.t0)));
    const w = l.linear ? p : p * p * p * (p * (p * 6 - 15) + 10);
    x += l.dx * w; y += l.dy * w; z += l.dz * w;
  }
  return { x, y, z };
}

test("the push-in window follows a cursor that leaves its middle and stands while the cursor stays inside", () => {
  useLang("en");
  const cues = parseOverlay('{"camera":[{"at":0,"move":0.5,"hold":4,"area":[0.3,0.3,0.4,0.4],"scale":2,"follow":"cursor","return":0.5}]}').camera!;
  // Курсор 1–1.5 с стоит в середине окна, затем уходит к правому краю кадра.
  const path = [{ t: 0, x: 0.5, y: 0.5 }, { t: 1.5, x: 0.52, y: 0.5 }, { t: 2.5, x: 0.95, y: 0.55 }, { t: 4.5, x: 0.95, y: 0.55 }];
  const legs = cameraLegs(cues, path);
  const still = [centreAt(legs, 0.6), centreAt(legs, 1.4)];
  assert.ok(Math.abs(still[0]!.x - still[1]!.x) < 1e-6, "while the cursor stays in the middle the window stands");
  const end = centreAt(legs, 4.3);
  const half = 0.5 / end.z;
  assert.ok(end.x > 0.55, `the window moved toward the cursor (centre ${end.x.toFixed(3)})`);
  assert.ok(0.95 <= end.x + half && 0.95 >= end.x - half, `the cursor at 0.95 is inside the window ${(end.x - half).toFixed(3)}–${(end.x + half).toFixed(3)}`);
  assert.ok(end.x + half <= 1 + 1e-9, "the window does not leave the frame");
  assert.deepEqual(cameraLegs(cues, path), legs, "the same path gives the same moves");
  // Без follow путь курсора ничего не двигает.
  const plain = parseOverlay('{"camera":[{"at":0,"move":0.5,"hold":4,"area":[0.3,0.3,0.4,0.4],"scale":2,"return":0.5}]}').camera!;
  assert.ok(Math.abs(centreAt(cameraLegs(plain, path), 4.3).x - 0.5) < 1e-9);
  assert.throws(() => parseOverlay('{"camera":[{"at":0,"hold":1,"area":[0.3,0.3,0.4,0.4],"follow":"mouse"}]}'), /follow: expected "cursor"/);
});
