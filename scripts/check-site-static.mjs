#!/usr/bin/env node
// Быстрая проверка выпуска лендинга без браузера. Её же выполняет полный
// браузерный check-site перед измерением вёрстки и локализаций.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const mediaManifestPath = "website/landing/media-manifest.json";
const mediaName = /^media\/([a-z][a-z0-9-]*\.(?:en|ru)\.(?:landscape|vertical)\.(?:mp4|jpg))$/u;
const shaPattern = /^[0-9a-f]{64}$/u;
const require = createRequire(import.meta.url);
const ffprobe = require("@ffprobe-installer/ffprobe").path;

export async function loadLandingMediaManifest(root = resolve(".")) {
  let parsed;
  try { parsed = JSON.parse(await readFile(resolve(root, mediaManifestPath), "utf8")); }
  catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  if (parsed.version !== 1 || parsed.scenario?.path !== "website/overview/story.md" ||
      !shaPattern.test(parsed.scenario.sha256) || !Array.isArray(parsed.assets) || !parsed.assets.length) {
    throw new Error(`${mediaManifestPath}: invalid version, scenario, or assets`);
  }
  const scenario = await readFile(resolve(root, parsed.scenario.path));
  if (sha256(scenario) !== parsed.scenario.sha256) throw new Error(`${mediaManifestPath}: source scenario changed`);
  const sceneIds = new Set([...scenario.toString("utf8").matchAll(/^## ([a-z][a-z0-9-]*) · /gmu)].map((match) => match[1]));
  const seen = new Set();
  for (const asset of parsed.assets) {
    const match = mediaName.exec(asset.source ?? "");
    if (!match || seen.has(asset.source) || !shaPattern.test(asset.sha256) ||
        !Number.isSafeInteger(asset.bytes) || asset.bytes <= 0 ||
        !["video", "poster"].includes(asset.kind) ||
        asset.kind !== (asset.source.endsWith(".mp4") ? "video" : "poster") ||
        !Array.isArray(asset.sceneIds) || !asset.sceneIds.length ||
        asset.sceneIds.some((id) => !sceneIds.has(id)) ||
        !Array.isArray(asset.referenceFrames) ||
        (asset.kind === "video" && asset.referenceFrames.length < 3) ||
        (asset.kind === "poster" && asset.referenceFrames.length !== 0)) {
      throw new Error(`${mediaManifestPath}: invalid or duplicate asset ${asset.source}`);
    }
    const [slot, lang, format, extension] = match[1].split(".");
    if (asset.slot !== slot || asset.lang !== lang || asset.format !== format ||
        extension !== (asset.kind === "video" ? "mp4" : "jpg")) {
      throw new Error(`${mediaManifestPath}: mismatched asset identity ${asset.source}`);
    }
    if (asset.bytes > (asset.kind === "video" ? 40 : 5) * 1048576) {
      throw new Error(`${mediaManifestPath}: ${asset.source} exceeds its media size limit`);
    }
    let url;
    try { url = new URL(asset.url); }
    catch { throw new Error(`${mediaManifestPath}: ${asset.source} needs a fixed HTTPS asset URL`); }
    if (!url || url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
      throw new Error(`${mediaManifestPath}: ${asset.source} needs a fixed HTTPS asset URL`);
    }
    if (asset.kind === "video") {
      const times = new Set();
      for (const [index, frame] of asset.referenceFrames.entries()) {
        if (!Number.isFinite(frame.t) || frame.t < 0 || times.has(frame.t) ||
            frame.path !== `website/landing/media/fingerprints/${slot}.${lang}.${format}.${index}.png` ||
            !shaPattern.test(frame.sha256)) throw new Error(`${mediaManifestPath}: invalid reference for ${asset.source}`);
        times.add(frame.t);
        const bytes = await readFile(resolve(root, frame.path));
        if (sha256(bytes) !== frame.sha256) throw new Error(`${mediaManifestPath}: reference changed ${frame.path}`);
      }
    }
    seen.add(asset.source);
  }
  const paired = new Set(parsed.assets.map((a) => a.source.replace(/\.(?:mp4|jpg)$/u, "")));
  for (const stem of paired) {
    if (!seen.has(`${stem}.mp4`) || !seen.has(`${stem}.jpg`)) throw new Error(`${mediaManifestPath}: video and poster must be paired for ${stem}`);
  }
  for (const [lang, page] of [["en", "website/landing/report.md"], ["ru", "website/landing/report.ru.md"]]) {
    const markdown = await readFile(resolve(root, page), "utf8");
    const referenced = [...markdown.matchAll(/(?:src|poster)="(media\/[^"]+\.(?:mp4|jpg))"/gu)].map((match) => match[1]);
    const expected = parsed.assets.filter((asset) => asset.lang === lang).map((asset) => asset.source);
    if (referenced.length !== expected.length || new Set(referenced).size !== expected.length ||
        referenced.some((path) => !expected.includes(path))) {
      throw new Error(`${mediaManifestPath}: ${page} must reference exactly its ${lang} media`);
    }
  }
  return parsed;
}

export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
export const publishedMediaPath = (asset) => {
  const basename = asset.source.slice("media/".length).replace(/\.(mp4|jpg)$/u, `.${asset.sha256.slice(0, 12)}.$1`);
  return `assets/${basename}`;
};

function probeMedia(file, asset) {
  const result = spawnSync(ffprobe, ["-v", "error", "-show_entries", "stream=codec_name,codec_type,width,height,avg_frame_rate:format=format_name,duration", "-of", "json", file], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`invalid ${asset.kind} format for ${asset.source}: ${result.stderr.trim()}`);
  const info = JSON.parse(result.stdout);
  const video = info.streams?.find((stream) => stream.codec_type === "video");
  const [width, height] = asset.format === "vertical" ? [1080, 1920] : [1920, 1080];
  if (!video || video.width !== width || video.height !== height) {
    throw new Error(`${asset.source}: expected ${width}×${height} ${asset.format} media`);
  }
  if (asset.kind === "video" && asset.format === "vertical" && video.avg_frame_rate !== "30/1") {
    throw new Error(`${asset.source}: expected the vertical preset's 30 fps`);
  }
  if (asset.kind === "video" && (video.codec_name !== "h264" || !info.format?.format_name?.split(",").includes("mp4") ||
      !(Number(info.format.duration) > 0) || info.streams.some((stream) => stream.codec_type === "audio"))) {
    throw new Error(`${asset.source}: expected a silent H.264 MP4`);
  }
  if (asset.kind === "poster" && video.codec_name !== "mjpeg") throw new Error(`${asset.source}: expected a JPEG poster`);
}

export async function checkLandingMediaFile(file, asset) {
  const bytes = await readFile(file);
  if (bytes.length !== asset.bytes || sha256(bytes) !== asset.sha256) {
    throw new Error(`${asset.source}: bytes differ from the landing media manifest`);
  }
  probeMedia(file, asset);
}

export async function checkSiteStatic(root = resolve(".")) {
  const site = resolve(root, "site");
  const release = JSON.parse(await readFile(resolve(site, "release.json"), "utf8"));
  const manifest = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  const compiler = JSON.parse(await readFile(resolve(root, "node_modules/agentic-report/package.json"), "utf8"));
  const paths = (release.files ?? []).map((f) => f.path);
  if (
    release.contractVersion !== 1 ||
    release.package?.name !== manifest.name ||
    release.package?.version !== manifest.version ||
    release.builtWith?.name !== "agentic-report" ||
    release.builtWith?.version !== compiler.version ||
    !/^[0-9a-f]{40}$/u.test(release.sourceRevision) ||
    !["index.html", "robots.txt", "sitemap.xml"].every((path) => paths.includes(path))
  ) throw new Error("site release identity is incomplete");
  for (const expected of release.files) {
    const bytes = await readFile(resolve(site, expected.path));
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (bytes.byteLength !== expected.bytes || sha256 !== expected.sha256) {
      throw new Error(`site release identity does not match ${expected.path}`);
    }
  }

  const media = await loadLandingMediaManifest(root);
  if (media) {
    const expected = new Set(media.assets.map(publishedMediaPath));
    const actual = new Set(release.files.filter((file) => file.path.endsWith(".mp4") ||
      /^assets\/[a-z][a-z0-9-]*\.(?:en|ru)\.(?:landscape|vertical)\.[0-9a-f]{12}\.jpg$/u.test(file.path)).map((file) => file.path));
    if (expected.size !== actual.size || [...expected].some((path) => !actual.has(path))) {
      throw new Error("site media do not match the landing media manifest");
    }
    const html = await readFile(resolve(site, "index.html"), "utf8");
    for (const asset of media.assets) {
      const path = publishedMediaPath(asset);
      if (!html.includes(path)) throw new Error(`site does not reference ${path}`);
      await checkLandingMediaFile(resolve(site, path), asset);
    }
  }

  const videoCap = 40 * 1024 * 1024;
  const videos = release.files.filter((f) => /\.(mp4|webm|m4v)$/u.test(f.path));
  const videoBytes = videos.reduce((n, f) => n + f.bytes, 0);
  if (videos.length === 0) throw new Error("the landing has no videos");
  for (const f of videos) if (f.bytes > videoCap) throw new Error(`landing video ${f.path} weighs ${f.bytes} bytes, over the ${videoCap} cap`);

  const origin = "https://agentic-screencast.witqq.dev";
  const html = await readFile(resolve(site, "index.html"), "utf8");
  if (
    !html.includes(`<link rel="canonical" href="${origin}/"/>`) ||
    !html.includes(`<meta property="og:url" content="${origin}/"/>`)
  ) throw new Error("landing has no canonical public address");
  if (Buffer.byteLength(html) > 2_097_152) throw new Error("landing HTML exceeds what search crawlers read");
  if (!(await readFile(resolve(site, "robots.txt"), "utf8")).includes(`Sitemap: ${origin}/sitemap.xml\n`)) {
    throw new Error("robots.txt does not name the sitemap");
  }
  if (!(await readFile(resolve(site, "sitemap.xml"), "utf8")).includes(`<loc>${origin}/</loc>`)) {
    throw new Error("sitemap.xml does not list the landing");
  }
  return { release, videoBytes };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { release, videoBytes } = await checkSiteStatic();
  process.stdout.write(`Static landing passed: ${release.files.length} files, videos ${(videoBytes / 1048576).toFixed(1)} MB.\n`);
}
