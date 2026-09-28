#!/usr/bin/env node
// Опорные кадры клипов лендинга — из самих закоммиченных клипов.
//
// `site:check` узнаёт язык клипа по трём опорным кадрам: в моментах, где русский и английский
// клипы различаются сильнее всего, кадр страницы обязан быть ближе к кадру своего языка. Прежде
// эти кадры писал локальный скрипт вне репозитория, и пересчитать или сверить их на другой машине
// было нечем. Этот скрипт пересчитывает их из `website/landing/media/<клип>.<язык>.mp4`:
//
//   node scripts/landing-fingerprints.mjs          сверить клипы с зафиксированными опорными кадрами
//   node scripts/landing-fingerprints.mjs --write  переписать их после замены клипов
//
// Моменты — каждые 0,5 с клипа; берутся три с наименьшим сходством языков (SSIM кадров в оттенках
// серого 320×180 или 180×320), не ближе 1,5 с друг к другу.
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const FFMPEG = require("ffmpeg-static");
const FFPROBE = require("@ffprobe-installer/ffprobe").path;
const MEDIA = resolve(import.meta.dirname, "..", "website", "landing", "media");
const FP = join(MEDIA, "fingerprints");
const LANGS = ["en", "ru"];
const write = process.argv.includes("--write");

const run = (args) => {
  const r = spawnSync(FFMPEG, ["-nostdin", "-loglevel", "error", "-y", ...args], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(" ")}: ${r.stderr}`);
};
const ssim = (a, b) => Number(/All:([0-9.]+)/u.exec(spawnSync(FFMPEG, ["-i", a, "-i", b, "-lavfi", "[0:v][1:v]ssim", "-f", "null", "-"], { encoding: "utf8" }).stderr)?.[1]);
const probe = (file) => JSON.parse(spawnSync(FFPROBE, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", file], { encoding: "utf8" }).stdout);

const tmp = mkdtempSync(join(tmpdir(), "landing-fp-"));
const clips = readdirSync(MEDIA).filter((f) => f.endsWith(".en.mp4")).map((f) => f.slice(0, -".en.mp4".length)).sort();
const fingerprints = {};
const frames = [];
try {
  const kept = write ? null : JSON.parse(readFileSync(join(FP, "fingerprints.json"), "utf8"));
  const failures = [];
  if (kept && JSON.stringify(Object.keys(kept).sort()) !== JSON.stringify(clips)) {
    failures.push("fingerprints.json does not list exactly the current clips");
  }
  for (const name of clips) {
    const info = probe(join(MEDIA, `${name}.en.mp4`));
    const size = info.streams[0].height > info.streams[0].width ? "180:320" : "320:180";
    const len = Number(info.format.duration);
    let picked;
    if (write) {
      const diffs = [];
      for (let t = 0.5; t < len - 0.3; t += 0.5) {
        const f = LANGS.map((l) => {
          const p = join(tmp, `${name}-${l}-${t}.png`);
          run(["-ss", t.toFixed(2), "-i", join(MEDIA, `${name}.${l}.mp4`), "-frames:v", "1", "-vf", `scale=${size},format=gray`, p]);
          return p;
        });
        diffs.push({ t, s: ssim(f[0], f[1]) });
      }
      picked = [];
      for (const d of [...diffs].sort((a, b) => a.s - b.s)) if (picked.length < 3 && picked.every((p) => Math.abs(p.t - d.t) >= 1.5)) picked.push(d);
      picked.sort((a, b) => a.t - b.t);
      fingerprints[name] = { size, moments: picked.map((p) => ({ t: p.t, crossLanguageSsim: +p.s.toFixed(4) })) };
    } else {
      const ref = kept[name];
      const moments = ref?.moments;
      if (ref?.size !== size || !Array.isArray(moments) || moments.length !== 3 ||
        moments.some((m, i) => !Number.isFinite(m.t) || m.t < 0.5 || m.t >= len - 0.3 ||
          (i > 0 && m.t - moments[i - 1].t < 1.5) ||
          !Number.isFinite(m.crossLanguageSsim) || m.crossLanguageSsim < 0 || m.crossLanguageSsim > 1)) {
        failures.push(`${name}: invalid size or reference moments in fingerprints.json`);
        continue;
      }
      picked = moments;
    }
    picked.forEach((p, i) => { for (const l of LANGS) {
      const from = join(tmp, `${name}-${l}-${p.t}.png`);
      if (!write) run(["-ss", p.t.toFixed(2), "-i", join(MEDIA, `${name}.${l}.mp4`), "-frames:v", "1", "-vf", `scale=${size},format=gray`, from]);
      frames.push({ from, to: join(FP, `${name}.${l}.${i}.png`), name, lang: l, i });
    } });
  }
  const json = `${JSON.stringify(fingerprints, null, 2)}\n`;
  if (write) {
    writeFileSync(join(FP, "fingerprints.json"), json);
    for (const { from, to } of frames) copyFileSync(from, to);
    console.log(JSON.stringify({ written: frames.length, clips: clips.length }));
  } else {
    // Выбор трёх лучших моментов и последние цифры SSIM зависят от сборки FFmpeg.
    // Проверяем зафиксированные моменты: они должны по-прежнему показывать тот же клип.
    for (const { from, to } of frames) {
      const s = ssim(from, to);
      if (!(s >= 0.95)) failures.push(`${to}: SSIM ${s} to the frame computed from the clip`);
    }
    for (const name of clips) {
      const moments = kept[name]?.moments;
      if (!Array.isArray(moments) || moments.length !== 3) continue;
      moments.forEach(({ crossLanguageSsim }, i) => {
        const measured = ssim(join(FP, `${name}.en.${i}.png`), join(FP, `${name}.ru.${i}.png`));
        if (Math.abs(measured - crossLanguageSsim) > 0.02) failures.push(`${name}.${i}: cross-language score differs from the reference frames`);
      });
    }
    if (failures.length) {
      console.error(failures.join("\n"));
      console.error("the reference frames do not match the clips; after replacing clips run: node scripts/landing-fingerprints.mjs --write");
      process.exitCode = 1;
    } else console.log(JSON.stringify({ checked: frames.length, clips: clips.length, match: true }));
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
