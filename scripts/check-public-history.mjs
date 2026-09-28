#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const forbidden = ["pitch/screens"];
const findings = forbidden.flatMap((path) => {
  const commits = execFileSync("git", ["rev-list", "--all", "--", path], {
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean);
  return commits.length === 0 ? [] : [{ path, commits: commits.length }];
});

// Личные абсолютные пути в отслеживаемых файлах: они называют машину и человека, а читателю
// репозитория не открываются.
let personal = "";
try {
  personal = execFileSync("git", ["grep", "-nIE", "/(Users|home)/[A-Za-z][A-Za-z0-9._-]*/"], { encoding: "utf8" }).trim();
} catch (e) {
  if (e.status !== 1) throw e; // 1 — ничего не найдено
}
if (personal) {
  process.stderr.write(`Public release blocked: tracked files name a personal path:\n${personal}\n`);
  process.exit(1);
}

if (findings.length > 0) {
  process.stderr.write(
    `Public release blocked: sensitive historical capture paths remain reachable: ${findings
      .map(({ path, commits }) => `${path} (${commits} commit${commits === 1 ? "" : "s"})`)
      .join(", ")}. Follow docs/RELEASING.md; do not make the repository public.\n`,
  );
  process.exit(1);
}

process.stdout.write("Public-history gate passed: no forbidden capture path is reachable, and no tracked file names a personal path.\n");
