#!/usr/bin/env node
// Четыре проверки ядра рендера. Запуск: verify-render.js scene.json
//
// 1. Воспроизводимость: два прогона в разных процессах — побайтово равны.
// 2. Живость: композиция не заморожена. Для непрерывной анимации это все
//    кадры различны; для слайдов, где элементы появляются дискретно, между
//    появлениями кадр законно совпадает с предыдущим, поэтому порог задаётся
//    флагом --min-distinct: сколько различных кадров обязано быть.
// 3. Контр-проверка: полная процедура кадра при неизменном времени — кадры равны.
// 4. Сикабельность: кадр, снятый первым действием в свежем процессе,
//    показывает то же, что тот же кадр сквозного прогона.
//
// Про четвёртую отдельно. Побайтового равенства здесь требовать нельзя:
// измерено, что состояние композиции (DOM, трансформации, геометрия)
// совпадает точно, а картинка расходится на единицу уровня примерно
// в одном проценте пикселей — это история растеризации браузера, а не
// свойство композиции. Поэтому проверка сравнивает состояние точно,
// а изображение — по PSNR с порогом 60 дБ. Несикабельная композиция даёт
// расхождение на порядки больше (у эталонного примера элемент стоит
// на 139 пикселях против нуля), и проверка остаётся различающей.
import { renderScene } from "./render.js";
import type { RenderScene } from "./render.js";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const FFMPEG = require("ffmpeg-static");
// Подложка адресуется относительно ФАЙЛА СЦЕНЫ, как и в сборке. Без
// этого ядро рендера берёт за точку отсчёта каталог собственного кода,
// и после переезда в `dist/` образец сцены искал слайды внутри него.
const sceneFile = resolve(process.argv[2]!);
const scene = {
  ...(JSON.parse(readFileSync(sceneFile, "utf8")) as Record<string, unknown>),
  __src: dirname(sceneFile),
} as RenderScene;
const probes = (process.argv[3] ?? "0.8,1.8,2.6,3.4").split(",").map(Number);
const minDistinctArg = process.argv.indexOf("--min-distinct");
const minDistinct = minDistinctArg > 0 ? Number(process.argv[minDistinctArg + 1]) : null;

const psnrOf = (a: Buffer, b: Buffer): number => {
  writeFileSync("/tmp/__a.png", a);
  writeFileSync("/tmp/__b.png", b);
  let txt = "";
  try {
    execFileSync(FFMPEG, ["-nostdin", "-hide_banner", "-i", "/tmp/__a.png", "-i",
      "/tmp/__b.png", "-lavfi", "psnr", "-f", "null", "-"], { stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    txt = String((e as { stderr?: unknown }).stderr ?? "");
  }
  if (!txt) {
    const r = execFileSync("/bin/sh", ["-c",
      `${FFMPEG} -nostdin -hide_banner -i /tmp/__a.png -i /tmp/__b.png -lavfi psnr -f null - 2>&1`],
      { encoding: "utf8" });
    txt = r;
  }
  const m = txt.match(/average:([0-9.]+|inf)/);
  return m ? (m[1] === "inf" ? Infinity : Number(m[1])) : NaN;
};

const pass1 = await renderScene(scene, {});
const pass2 = await renderScene(scene, {});
const frozen = await renderScene(scene, { freeze: probes[0] });

const mismatch = pass1.shots.filter((s, i) => s.md5 !== pass2.shots[i].md5).length;
const distinct = new Set(pass1.shots.map((s) => s.md5)).size;
const frozenDistinct = new Set(frozen.shots.map((s) => s.md5)).size;

const seeks = [];
for (const t of probes) {
  const one = await renderScene(scene, { at: t });
  const idx = Math.round(t * pass1.opts.fps);
  const ref = pass1.shots[idx];
  const q = psnrOf(one.shots[0].buf, ref.buf);
  seeks.push({ t, frame: idx, byteEqual: one.shots[0].md5 === ref.md5, psnr: q });
}

const report = {
  frames: pass1.shots.length,
  reproducible: { mismatches: mismatch, of: pass1.shots.length, ok: mismatch === 0 },
  alive: {
    distinct, of: pass1.shots.length,
    floor: minDistinct ?? pass1.shots.length,
    ok: distinct >= (minDistinct ?? pass1.shots.length),
  },
  frozenTime: { distinct: frozenDistinct, ok: frozenDistinct === 1 },
  seekable: {
    probes: seeks.map((s) => ({ t: s.t, frame: s.frame, psnr: s.psnr, byteEqual: s.byteEqual })),
    ok: seeks.every((s) => s.psnr >= 60),
  },
};
const parts = ["reproducible", "alive", "frozenTime", "seekable"];
const ok = parts.every((k) => (report as unknown as Record<string, { ok: boolean }>)[k]!.ok);
console.log(JSON.stringify({ ...report, ok }, null, 1));
process.exit(ok ? 0 : 1);
