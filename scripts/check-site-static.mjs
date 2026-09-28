#!/usr/bin/env node
// Быстрая проверка выпуска лендинга без браузера. Её же выполняет полный
// браузерный check-site перед измерением вёрстки и локализаций.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
