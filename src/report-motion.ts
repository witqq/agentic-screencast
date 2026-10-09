/** Cheap source inspection for directing advice; rendering remains the authority. */
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { anchorSeconds } from "./spotlight.js";

const ACTIONS = new Set(["reveal", "focus", "connect", "transfer", "copy", "replace", "compare", "camera"]);
function prose(text: string): string {
  let fence = "";
  return text.replace(/<!--[\s\S]*?-->/gu, "").split("\n").filter(line => {
    const mark = /^\s*(`{3,}|~{3,})/u.exec(line)?.[1];
    if (mark) {
      if (!fence) fence = mark;
      else if (mark[0] === fence[0] && mark.length >= fence.length) fence = "";
      return false;
    }
    return !fence;
  }).join("\n");
}
function source(file: string, root: string, seen = new Set<string>()): string {
  if (!existsSync(file)) return "";
  const real = realpathSync(file), rel = relative(root, real);
  if (rel === ".." || rel.startsWith(`..${sep}`) || seen.has(real)) return "";
  seen.add(real);
  return prose(readFileSync(real, "utf8")).replace(/\{\{include:\s*([^}\n]+)\}\}/gu, (_, name: string) =>
    source(resolve(dirname(real), name.trim()), root, new Set(seen)));
}
function attrs(text: string): Record<string, string> {
  return Object.fromEntries([...text.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s}]+))/gu)]
    .map(m => [m[1]!, m[2] ?? m[3] ?? m[4] ?? ""]));
}
/** Only cues in the selected composition and within this scene count as motion. */
export function reportMotion(file: string, target: string | undefined, duration: number, starts: number[], ends: number[]): boolean {
  if (!existsSync(file)) return false;
  const input = statSync(file).isDirectory() ? resolve(file, "report.md") : file;
  const text = source(input, realpathSync(dirname(input)));
  if (/^motion:\s*(?:none|['"]none['"])\s*$/mu.test(text)) return false;
  const selected = target?.match(/^#([\w-]+)$/u)?.[1]
    ?? target?.match(/^\[data-composition-id\s*=\s*["']?([\w-]+)["']?\]$/u)?.[1];
  if (target && !selected) return false;
  let fence = "", id = "";
  for (const line of text.split("\n")) {
    const composition = /^\s*(:{3,})composition\{([^}]*)\}/u.exec(line);
    if (composition) { fence = composition[1]!; id = attrs(composition[2]!).id ?? ""; continue; }
    if (line.trim() === fence) { fence = ""; id = ""; continue; }
    if (!fence || (selected && selected !== id)) continue;
    const cue = /^\s*::cue\{([^}]*)\}/u.exec(line);
    if (!cue) continue;
    const a = attrs(cue[1]!);
    if (!ACTIONS.has(a.action ?? "") || !a.target || !a.at) continue;
    try {
      const at = anchorSeconds(a.at, starts, duration, ends);
      if (at >= 0 && at < duration) return true;
    } catch { /* A malformed cue is the compiler's diagnostic, not evidence of motion. */ }
  }
  return false;
}
