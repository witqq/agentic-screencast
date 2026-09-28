// Каждый жанровый скелет, который кладёт `new <жанр>`, собирается на немом голосе. Прежде тест
// собирал только reel и trailer, а pitch, product-demo, release и explainer не собирал никто: скелет
// мог сломаться незаметно, и первый же агент упирался бы в ошибку разбора. Жанры берутся из
// templates/, поэтому новый скелет попадает сюда сам.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { clicheSigns } from "../../lint.js";

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENTRY = resolve(DIST, "agentic-screencast.js");
const TEMPLATES = resolve(DIST, "..", "templates");

test("every genre skeleton that new writes builds on the stub voice and carries no sign of a template", () => {
  const genres = readdirSync(TEMPLATES).filter((f) => f.endsWith(".md") && f !== "README.md" && f !== "checklist.md").map((f) => f.slice(0, -3));
  assert.ok(genres.length >= 6, `genres found: ${genres.join(", ")}`);
  const root = mkdtempSync(join(tmpdir(), "sc-skeletons-"));
  const failed: string[] = [];
  for (const genre of genres) {
    const dir = join(root, genre);
    mkdirSync(dir);
    const made = spawnSync("node", [ENTRY, "new", genre], { cwd: dir, encoding: "utf8" });
    if (made.status !== 0) { failed.push(`${genre}: new — ${made.stderr.trim()}`); continue; }
    // Скелет — образец облика: ни одного признака шаблона (docs/visual-design.md); трейлер держит
    // удары, зерно и заглавные законно — их lint у трейлера не считает.
    const signs = clicheSigns(join(dir, "story.md")).map((x) => x.rule);
    if (signs.length) failed.push(`${genre}: signs of a template — ${signs.join(", ")}`);
    // Пять кадров в секунду — ради времени проверки; всё остальное как у скелета.
    const story = join(dir, "story.md");
    writeFileSync(story, readFileSync(story, "utf8").replace(/^(voice: .*)$/mu, '$1\nframe: {"fps":5}'));
    const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8",
      env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(root, ".home") } });
    if (r.status !== 0 || !existsSync(join(dir, "f.mp4"))) failed.push(`${genre}: build — ${r.stderr.trim().split("\n").at(-1)}`);
  }
  assert.deepEqual(failed, []);
});
