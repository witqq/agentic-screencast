#!/usr/bin/env node
// Rebuild only the eight silent examples selected in website/landing-base/clips.md.
// Output clips/posters are content-addressed in ignored agent_temp_files_local/;
// the manifest and compact frames from the independently built source draft are
// the small versioned provenance. `--refs-only` repairs refs from existing drafts
// without re-rendering eight clips.
// Run after `npm run build` and the overview's shoot/material scripts.
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static");
const ffprobe = require("@ffprobe-installer/ffprobe").path;
const overview = dirname(fileURLToPath(import.meta.url));
const root = resolve(overview, "../..");
const cli = resolve(root, "dist/agentic-screencast.js");
const story = resolve(overview, "story.md");
const cache = resolve(root, "agent_temp_files_local/landing-media-cache");
const work = resolve(root, "agent_temp_files_local/landing-media-work");
const references = resolve(root, "website/landing/media/fingerprints");
const manifestFile = resolve(root, "website/landing/media-manifest.json");
const release = "https://github.com/witqq/agentic-screencast/releases/download/landing-media-20260928";
const selections = [
  { slot: "showcase", scene: "c00-cold", format: "landscape" },
  { slot: "live", scene: "c03-auto", format: "landscape" },
  { slot: "focus", scene: "c04-chain", format: "landscape" },
  { slot: "reel", scene: "c11-phone", format: "vertical" },
];
const forbidden = new Set(["c14-landing", "c00-file", "c01-brief", "c12-stills", "c13-credits", "c14-bookend"]);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const refsOnly = process.argv.includes("--refs-only");
if (process.argv.slice(2).some((arg) => arg !== "--refs-only")) throw new Error("usage: build-landing-media.mjs [--refs-only]");

function run(binary, args, quiet = false) {
  if (quiet) {
    const result = spawnSync(binary, args, { cwd: root, encoding: "utf8" });
    if (result.status !== 0) throw new Error(`${binary} failed (${result.status}): ${result.stderr || result.stdout}`);
    return Promise.resolve(result.stdout);
  }
  return new Promise((accept, reject) => {
    const child = spawn(binary, args, { cwd: root, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? accept("") : reject(new Error(`${binary} exited with ${code}`)));
  });
}

function probe(file) {
  const result = spawnSync(ffprobe, ["-v", "error", "-show_entries", "stream=codec_name,codec_type,width,height:format=duration", "-of", "json", file], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`ffprobe ${file}: ${result.stderr}`);
  return JSON.parse(result.stdout);
}

function assertMedia(file, kind, format) {
  const info = probe(file);
  const stream = info.streams?.find((item) => item.codec_type === "video");
  const [width, height] = format === "vertical" ? [1080, 1920] : [1920, 1080];
  if (stream?.width !== width || stream?.height !== height) {
    throw new Error(`${file}: expected ${width}x${height}, found ${stream?.width}x${stream?.height}`);
  }
  if (kind === "video" && (stream.codec_name !== "h264" || info.streams.some((item) => item.codec_type === "audio") || !(Number(info.format?.duration) > 0))) {
    throw new Error(`${file}: expected silent H.264 MP4 with positive duration`);
  }
  if (kind === "poster" && stream.codec_name !== "mjpeg") throw new Error(`${file}: expected full-size JPEG poster`);
  return Number(info.format?.duration);
}

async function cached(file, extension) {
  const bytes = await readFile(file);
  const sha256 = hash(bytes);
  const target = resolve(cache, `${sha256}.${extension}`);
  try { await copyFile(file, target, constants.COPYFILE_EXCL); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
  if (hash(await readFile(target)) !== sha256) throw new Error(`${target}: cached bytes changed`);
  return { sha256, bytes: bytes.length };
}

const scenario = await readFile(story);
const scenarioHash = hash(scenario);
if (refsOnly) {
  const previous = JSON.parse(await readFile(manifestFile, "utf8"));
  if (previous.scenario?.sha256 !== scenarioHash) throw new Error("source changed since the previous landing media build");
}
const source = scenario.toString("utf8");
const map = await readFile(resolve(root, "website/landing-base/clips.md"), "utf8");
for (const { slot, scene, format } of selections) {
  const row = map.split("\n").find((line) => line.startsWith(`| \`${slot}.{ru,en}\` |`));
  const cells = row?.split("|").map((cell) => cell.trim());
  if (forbidden.has(scene) || !source.includes(`## ${scene} · `) ||
      cells?.[3] !== `\`${scene}\`` || cells?.[4] !== (format === "vertical" ? "9:16" : "16:9")) {
    throw new Error(`landing selection ${slot}/${scene}/${format} is not an approved source scene`);
  }
}
for (const lang of ["ru", "en"]) {
  const page = await readFile(resolve(root, `website/landing/report${lang === "ru" ? ".ru" : ""}.md`), "utf8");
  const visible = [...page.matchAll(/^::video\{src="media\/([a-z]+)\.(ru|en)\.(landscape|vertical)\.mp4"/gmu)];
  if (visible.length !== selections.length || visible.some((match, index) =>
    match[1] !== selections[index].slot || match[2] !== lang || match[3] !== selections[index].format)) {
    throw new Error(`${lang} landing video slots differ from the approved four`);
  }
}
await mkdir(cache, { recursive: true });
await mkdir(work, { recursive: true });
await mkdir(references, { recursive: true });

const assets = [];
for (const lang of ["ru", "en"]) for (const { slot, scene, format } of selections) {
  const stem = `${slot}.${lang}.${format}`;
  const draft = resolve(work, `${stem}.draft.mp4`);
  const silent = resolve(work, `${stem}.mp4`);
  const poster = resolve(work, `${stem}.jpg`);
  const voice = JSON.stringify({ engine: "stub", name: "silent", cps: lang === "ru" ? 12 : 16 });
  const variant = [...(lang === "en" ? ["--lang", "en"] : []), ...(format === "vertical" ? ["--format", "vertical"] : [])];
  if (!refsOnly) {
    process.stdout.write(`Building ${stem} from ${scene}\n`);
    await run(process.execPath, [cli, "build", story, ...variant, "--only", scene, "--voice-json", voice, "--out", draft]);
    await run(ffmpeg, ["-nostdin", "-v", "error", "-y", "-i", draft, "-map", "0:v:0", "-an", "-c:v", "copy", "-movflags", "+faststart", silent], true);
  }
  const duration = assertMedia(silent, "video", format);
  const draftInfo = probe(draft);
  const draftVideo = draftInfo.streams?.find((item) => item.codec_type === "video");
  if (draftVideo?.codec_name !== "h264" || draftVideo.width !== (format === "vertical" ? 1080 : 1920) ||
      draftVideo.height !== (format === "vertical" ? 1920 : 1080)) throw new Error(`${draft}: missing source-render video`);
  const video = await cached(silent, "mp4");
  if (!refsOnly) await run(ffmpeg, ["-nostdin", "-v", "error", "-y", "-ss", String(Math.min(1.5, duration * 0.4)), "-i", silent,
    "-frames:v", "1", "-q:v", "3", "-update", "1", poster], true);
  assertMedia(poster, "poster", format);
  const jpg = await cached(poster, "jpg");
  const referenceFrames = [];
  for (const [index, fraction] of [0.2, 0.5, 0.8].entries()) {
    const t = Number((duration * fraction).toFixed(3));
    const path = `website/landing/media/fingerprints/${stem}.${index}.png`;
    const compact = resolve(root, path);
    const size = format === "vertical" ? "180:320" : "320:180";
    await run(ffmpeg, ["-nostdin", "-v", "error", "-y", "-ss", String(t), "-i", draft, "-map", "0:v:0", "-an", "-vf",
      `scale=${size}:flags=lanczos,format=gray`, "-frames:v", "1", "-update", "1", compact], true);
    const candidate = resolve(work, `${stem}.candidate.${index}.png`);
    await run(ffmpeg, ["-nostdin", "-v", "error", "-y", "-ss", String(t), "-i", silent, "-map", "0:v:0", "-an", "-vf",
      `scale=${size}:flags=lanczos,format=gray`, "-frames:v", "1", "-update", "1", candidate], true);
    const comparison = spawnSync(ffmpeg, ["-i", candidate, "-i", compact, "-lavfi", "ssim", "-f", "null", "-"], { encoding: "utf8" });
    const similarity = Number(/All:([0-9.]+)/u.exec(comparison.stderr)?.[1]);
    if (comparison.status !== 0 || !(similarity >= 0.95)) throw new Error(`${stem} at ${t}s: source reference differs from delivered clip (SSIM ${similarity})`);
    referenceFrames.push({ t, path, sha256: hash(await readFile(compact)) });
  }
  for (const [kind, extension, data] of [["video", "mp4", video], ["poster", "jpg", jpg]]) {
    assets.push({ source: `media/${stem}.${extension}`, kind, slot, lang, format, sceneIds: [scene],
      url: `${release}/${stem}.${extension}`, sha256: data.sha256, bytes: data.bytes,
      referenceFrames: kind === "video" ? referenceFrames : [] });
  }
  process.stdout.write(`Ready ${stem}: ${duration.toFixed(3)}s, silent H.264, ${video.bytes} video bytes, ${jpg.bytes} poster bytes\n`);
}
if (hash(await readFile(story)) !== scenarioHash) throw new Error("overview source changed during landing media generation");
await writeFile(manifestFile, `${JSON.stringify({ version: 1, scenario: { path: "website/overview/story.md", sha256: scenarioHash }, assets }, null, 2)}\n`);
process.stdout.write(`Landing media manifest ready: ${assets.length} assets in ${manifestFile}\n`);
