// Ворота перед сдачей: одна команда отвечает, можно ли отдавать ролик владельцу. Она собирает то,
// что по отдельности уже умеет инструмент, — lint сценария, отчёт последней сборки, контрольные
// кадры и чеклист — и не пропускает сдачу, пока что-то из этого не закрыто. Формат итога общий с
// `handover` у agentic-report: {verdict, checks: [{name, passed, findings}]}.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { lint } from "./lint.js";
import { msg } from "./msg.js";
import { isAdvisory } from "./rules.js";

export interface HandoverCheck { name: string; passed: boolean; findings: unknown[] }
export interface Handover { verdict: "pass" | "fail"; film?: string; checks: HandoverCheck[]; advisories: unknown[] }

/** Отчёт сборки: названный роликом или самый свежий `*.report.json` рядом со сценарием. */
function reportOf(dir: string, film?: string): string | undefined {
  if (film) {
    const r = resolve(dir, film).replace(/\.[^./]+$/u, "") + ".report.json";
    return existsSync(r) ? r : undefined;
  }
  const all = readdirSync(dir).filter((f) => f.endsWith(".report.json")).map((f) => join(dir, f));
  return all.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
}

export function handover(storyFile: string, film?: string): Handover {
  const story = resolve(storyFile);
  const dir = dirname(story);
  const checks: HandoverCheck[] = [];
  const check = (name: string, findings: unknown[]): void => { checks.push({ name, passed: findings.length === 0, findings }); };

  const lintFindings = lint(story);
  const advisories: unknown[] = lintFindings.filter(isAdvisory);
  check("lint", lintFindings.filter((f) => !isAdvisory(f)));

  const reportFile = reportOf(dir, film);
  let filmFile: string | undefined;
  if (!reportFile) {
    check("build", [msg("handover.noReport", { dir })]);
  } else {
    const report = JSON.parse(readFileSync(reportFile, "utf8")) as { out?: string; only?: string; audit?: { issues?: unknown[] }; warnings?: unknown[];
      stills?: Array<{ file: string }> };
    filmFile = resolve(dir, film ?? report.out ?? reportFile.replace(/\.report\.json$/u, ".mp4"));
    const missing = !existsSync(filmFile) || !statSync(filmFile).isFile() || statSync(filmFile).size === 0
      ? [msg("handover.filmMissing", { file: filmFile })] : [];
    const partial = report.only ? [msg("handover.partial", { scene: report.only })] : [];
    // Ролик, собранный до последней правки сценария, показывает не то, что в сценарии.
    const stale = statSync(reportFile).mtimeMs < statSync(story).mtimeMs ? [msg("handover.stale", { report: reportFile })] : [];
    check("build", [...missing, ...partial, ...stale, ...(report.audit?.issues ?? [])]);
    advisories.push(...(report.warnings ?? []).filter(isAdvisory));
    check("warnings", (report.warnings ?? []).filter((f) => !isAdvisory(f)));
    check("stills", (report.stills ?? []).filter((s) => !existsSync(s.file)).map((s) => msg("handover.stillMissing", { file: s.file })));
  }

  const checklist = join(dir, "checklist.md");
  if (!existsSync(checklist)) check("checklist", [msg("handover.noChecklist", { file: checklist })]);
  else {
    const open = readFileSync(checklist, "utf8").split("\n").filter((l) => /^\s*- \[ \]/u.test(l)).map((l) => l.trim());
    check("checklist", open);
  }
  return { verdict: checks.every((c) => c.passed) ? "pass" : "fail", ...(filmFile ? { film: filmFile } : {}), checks, advisories };
}
