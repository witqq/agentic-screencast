#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  lstat,
  mkdir,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { buildReport, generateSitemap } from "agentic-report";

// Публичный адрес лендинга: из него компилятор пишет canonical и OpenGraph, из canonical — sitemap.
const publicUrl = "https://agentic-screencast.witqq.dev/";

const root = await realpath(".");
const outputFlag = process.argv.indexOf("--output");
const output = resolve(root, outputFlag >= 0 ? (process.argv[outputFlag + 1] ?? "") : "site");
const outputRelative = relative(root, output);
if (!outputRelative || outputRelative === ".." || outputRelative.startsWith(`..${sep}`) || isAbsolute(outputRelative)) {
  throw new Error("site output must be a child of the repository root");
}

const status = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=normal"], {
  cwd: root,
  encoding: "utf8",
});
if (process.argv.includes("--require-clean") && status.trim() !== "") {
  throw new Error("deployment preparation requires a clean Git checkout");
}

const revisionFlag = process.argv.indexOf("--revision");
const revision = revisionFlag >= 0
  ? (process.argv[revisionFlag + 1] ?? "")
  : execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
if (!/^[0-9a-f]{40}$/u.test(revision)) throw new Error("site revision must be a full Git commit ID");

const manifest = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
if (manifest.name !== "agentic-screencast" || typeof manifest.version !== "string") {
  throw new Error("package.json does not expose the site release identity");
}

const staging = resolve(root, `.${outputRelative.replaceAll(sep, "-")}-stage-${randomBytes(8).toString("hex")}`);
const backup = resolve(root, `.${outputRelative.replaceAll(sep, "-")}-previous-${randomBytes(8).toString("hex")}`);
await mkdir(staging, { recursive: false });

try {
  await buildReport({
    input: resolve(root, "website/landing/report.md"),
    output: staging,
    format: "directory",
    url: publicUrl,
  });
  await generateSitemap({ directory: staging });
  const compiler = await installedPackage("agentic-report");
  const files = [];
  for (const path of await listFiles(staging)) {
    const bytes = await readFile(resolve(staging, ...path.split("/")));
    files.push({ path, bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") });
  }
  const release = {
    contractVersion: 1,
    package: { name: manifest.name, version: manifest.version },
    builtWith: { name: compiler.name, version: compiler.version },
    sourceRevision: revision,
    sourceDirty: status.trim() !== "",
    files,
  };
  await writeFile(resolve(staging, "release.json"), `${JSON.stringify(release, null, 2)}\n`, { flag: "wx" });

  let hadOutput = false;
  try {
    const current = await lstat(output);
    if (!current.isDirectory() || current.isSymbolicLink()) {
      throw new Error("generated site target must be a real directory");
    }
    await rename(output, backup);
    hadOutput = true;
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
  }

  try {
    await rename(staging, output);
    if (hadOutput) await rm(backup, { recursive: true });
  } catch (error) {
    if (hadOutput) await rename(backup, output);
    throw error;
  }

  process.stdout.write(`${JSON.stringify({ output, release })}\n`);
} catch (error) {
  await rm(staging, { recursive: true, force: true });
  throw error;
}

/** Все файлы опубликованного дерева в стабильном порядке, пути через `/`. */
async function listFiles(directory, prefix = "") {
  const paths = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => (left.name < right.name ? -1 : 1))) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) paths.push(...(await listFiles(resolve(directory, entry.name), path)));
    else paths.push(path);
  }
  return paths;
}

/** Манифест установленного пакета: версия компилятора, которым собран лендинг, пишется в release.json. */
async function installedPackage(name) {
  let directory = dirname(fileURLToPath(import.meta.resolve(name)));
  for (;;) {
    try {
      const candidate = JSON.parse(await readFile(resolve(directory, "package.json"), "utf8"));
      if (candidate.name === name) return candidate;
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
    }
    const parent = dirname(directory);
    if (parent === directory) throw new Error(`installed ${name} package manifest was not found`);
    directory = parent;
  }
}
