// `new` кладёт рядом со сценарием чеклист ролика: путь с артефактами, решение по каждому приёму и
// все правила базы знаний — взятые из её заголовков, чтобы список не расходился с базой.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const ENTRY = resolve(ROOT, "dist", "agentic-screencast.js");

test("new writes a film checklist with every film-craft rule and every technique row", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-new-checklist-"));
  const r = spawnSync("node", [ENTRY, "new", "explainer"], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(readdirSync(dir).sort(), ["checklist.md", "pages", "story.md"]);
  const list = readFileSync(join(dir, "checklist.md"), "utf8");
  const craft = [...readFileSync(resolve(ROOT, "docs", "film-craft.md"), "utf8").matchAll(/^## (\d+)\. (.+)$/gm)].map((m) => `- ${m[1]}. ${m[2]}`);
  assert.ok(craft.length >= 50, `the knowledge base has its rules (${craft.length})`);
  for (const rule of craft) assert.ok(list.includes(rule), `the checklist carries «${rule}»`);
  assert.ok(!list.includes("<!-- film-craft rules -->"), "the placeholder is filled");
  for (const step of ["Brief", "Evidence", "Story", "Material", "Scenario", "Draft", "Final", "Handoff"]) assert.match(list, new RegExp(`## \\d\\. ${step}`));
  // Коротко: не больше десяти квадратиков — приёмы и правила списком, не квадратиками.
  assert.ok((list.match(/^- \[ \]/gm) ?? []).length <= 10, "the checklist stays short");
  const techniques = list.slice(list.indexOf("## Techniques"), list.indexOf("## Film-craft rules"));
  assert.ok((techniques.match(/^- .+ — .+$/gm) ?? []).length >= 20, "the menu names every technique");
  const genres = spawnSync("node", [ENTRY, "new"], { encoding: "utf8" }).stderr;
  assert.ok(!/checklist/.test(genres), "the checklist is not offered as a genre");
});
