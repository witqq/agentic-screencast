#!/usr/bin/env node
import { lstat, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(".");
const name = process.argv[2];
if (!name || !["dist", "site"].includes(name)) {
  throw new Error("clean.mjs accepts only the generated dist or site directory");
}

const target = resolve(root, name);
try {
  const stat = await lstat(target);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(`refusing to replace a non-directory generated target: ${target}`);
  }
  await rm(target, { recursive: true });
} catch (error) {
  if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
}
