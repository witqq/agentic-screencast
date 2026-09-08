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

if (findings.length > 0) {
  process.stderr.write(
    `Public release blocked: sensitive historical capture paths remain reachable: ${findings
      .map(({ path, commits }) => `${path} (${commits} commit${commits === 1 ? "" : "s"})`)
      .join(", ")}. Follow docs/RELEASING.md; do not make the repository public.\n`,
  );
  process.exit(1);
}

process.stdout.write("Public-history gate passed: no forbidden capture path is reachable.\n");
