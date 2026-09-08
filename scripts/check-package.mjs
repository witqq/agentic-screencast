#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, isAbsolute, relative, resolve, sep } from "node:path";

const root = realpathSync(".");
const outputFlag = process.argv.indexOf("--output");
const output = resolve(root, outputFlag >= 0 ? (process.argv[outputFlag + 1] ?? "") : "agent_temp_files_local/package-candidate");
const outputRelative = relative(root, output);
if (!outputRelative || outputRelative === ".." || outputRelative.startsWith(`..${sep}`) || isAbsolute(outputRelative)) {
  throw new Error("package candidate output must be a child of the repository root");
}

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const packedOutput = execFileSync(
  npm,
  ["pack", "--ignore-scripts", "--json", "--pack-destination", output],
  { cwd: root, encoding: "utf8", env: { ...process.env, npm_config_cache: resolve(root, "agent_temp_files_local/npm-cache") } },
);
const packed = JSON.parse(packedOutput);
if (!Array.isArray(packed) || packed.length !== 1) throw new Error("npm pack did not return one candidate");
const candidate = packed[0];
if (candidate?.name !== "agentic-screencast" || candidate?.version !== readManifest(root).version) {
  throw new Error("packed package identity does not match package.json");
}

const files = candidate.files.map(({ path, mode }) => ({ path, mode }));
const paths = files.map(({ path }) => path);
const required = [
  "package.json",
  "README.md",
  "README.ru.md",
  "LICENSE",
  "dist/agentic-screencast.js",
  "dist/record-ui/index.html",
  "dist/record-ui/index.js",
  "example/story.md",
];
for (const path of required) {
  if (!paths.includes(path)) throw new Error(`package candidate is missing ${path}`);
}

const forbidden = paths.filter((path) =>
  /(?:^|\/)(?:\.agentic-screencast|agent_temp_files_local|moira-ws)(?:\/|$)|^example\/(?:slides\/|\.generated-)|^dist\/tests\/|^dist\/slidecast\.js$|\.(?:mp4|wav)$|(?:^|\/)\.env(?:\.|$)/u.test(path),
);
if (forbidden.length > 0) throw new Error(`package candidate contains forbidden paths: ${forbidden.join(", ")}`);

const entry = files.find(({ path }) => path === "dist/agentic-screencast.js");
if (entry?.mode !== 0o755) throw new Error("package CLI entry is not executable");

const tarball = resolve(output, candidate.filename);
const archivePaths = execFileSync("tar", ["-tzf", tarball], { encoding: "utf8" })
  .trim()
  .split("\n");
if (archivePaths.some((path) => path.includes("../") || path.startsWith("/") || !path.startsWith("package/"))) {
  throw new Error("package archive contains an unsafe path");
}

const consumer = mkdtempSync(resolve(tmpdir(), "agentic-screencast-consumer-"));
try {
  const consumerCache = resolve(consumer, "npm-cache");
  execFileSync(npm, ["install", "--no-package-lock", "--no-audit", "--no-fund", tarball], {
    cwd: consumer,
    stdio: "pipe",
    env: { ...process.env, npm_config_cache: consumerCache },
  });
  const binary = resolve(consumer, "node_modules/.bin/agentic-screencast");
  chmodSync(binary, 0o755);
  const version = execFileSync(binary, ["--version"], { cwd: consumer, encoding: "utf8" }).trim();
  if (version !== candidate.version) throw new Error(`installed CLI reports version ${version}`);
  const help = execFileSync(binary, ["--help"], { cwd: consumer, encoding: "utf8" });
  if (!help.includes("Build reproducible videos") || !help.includes("agentic-screencast build")) {
    throw new Error("installed CLI help is incomplete");
  }
  JSON.parse(execFileSync(binary, ["schema"], { cwd: consumer, encoding: "utf8" }));
  const source = resolve(consumer, "node_modules/agentic-screencast/example/story.md");
  const scenes = JSON.parse(execFileSync(binary, ["scenes", "--source", source], { cwd: consumer, encoding: "utf8" }));
  if (!Array.isArray(scenes) || scenes.length === 0) throw new Error("installed example has no scenes");
  const keys = JSON.parse(
    execFileSync(
      binary,
      ["build", "--source", source, "--voice-json", JSON.stringify({ engine: "stub", name: "silent", cps: 15 }), "--keys-only"],
      { cwd: consumer, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: resolve(consumer, "data") } },
    ),
  );
  if (!Array.isArray(keys.keys) || keys.keys.length !== scenes.length) {
    throw new Error("installed stub build did not report every example scene");
  }
} finally {
  rmSync(consumer, { recursive: true, force: true });
}

const bytes = readFileSync(tarball);
const evidence = {
  package: `${candidate.name}@${candidate.version}`,
  tarball: {
    path: tarball,
    filename: basename(tarball),
    bytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  },
  entries: paths.length,
  consumer: "installed CLI help/version/schema/scenes and stub-only build passed",
};
writeFileSync(resolve(output, "candidate-evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(evidence)}\n`);

function readManifest(directory) {
  return JSON.parse(readFileSync(resolve(directory, "package.json"), "utf8"));
}
