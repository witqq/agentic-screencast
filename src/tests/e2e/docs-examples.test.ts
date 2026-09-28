// Сценарии из баз знаний собираются тем инструментом, который они описывают.
//
// Пример в руководстве, который не разбирается, учит агента неверному полю;
// пример, который не собирается, — неверному пути. Каждый сценарный блок
// руководств по вертикали, визуальным ресурсам и звуку вынимается из текста,
// файлы, которые он называет, заменяются заглушками того же вида, и блок
// собирается на голосе `stub`. Блок без голоса — фрагмент: его только
// разбирают. Сеть и платный синтез здесь невозможны: голос обязан быть `stub`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parseSource } from "../../source.js";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static") as string;
const ffprobe = require("@ffprobe-installer/ffprobe").path as string;
const DIST = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENTRY = resolve(DIST, "agentic-screencast.js");
const DOCS = resolve(DIST, "..", "docs");

/** Сценарные блоки руководства: ```markdown, начинающиеся заголовком ролика. */
function scenarios(doc: string): string[] {
  const text = readFileSync(resolve(DOCS, doc), "utf8");
  return [...text.matchAll(/```markdown\n([\s\S]*?)```/gu)].map((m) => m[1]!).filter((b) => b.startsWith("# "));
}

/** Заглушка файла по расширению: звук, картинка, анимация или страница. */
function stub(dir: string, name: string): void {
  const path = resolve(dir, name);
  mkdirSync(dirname(path), { recursive: true });
  const ext = extname(name).toLowerCase();
  const run = (args: string[]): void => { execFileSync(ffmpeg, ["-loglevel", "error", "-y", ...args, path]); };
  if ([".mp3", ".ogg", ".wav"].includes(ext)) run(["-f", "lavfi", "-i", "sine=frequency=440:duration=6"]);
  else if ([".jpg", ".jpeg", ".png"].includes(ext)) run(["-f", "lavfi", "-i", "testsrc=size=1600x1000:duration=1", "-frames:v", "1"]);
  else if (ext === ".gif") run(["-f", "lavfi", "-i", "testsrc=size=120x120:duration=1:rate=5"]);
  else if (ext === ".html") writeFileSync(path, "<!doctype html><html><body style=\"margin:0;min-height:100vh;background:#123;color:#fff;font:40px sans-serif\"><h1>App</h1></body></html>");
  else throw new Error(`no stub for ${name}`);
}

function prepare(block: string): string {
  const dir = mkdtempSync(join(tmpdir(), "sc-docs-"));
  const names = new Set<string>();
  for (const m of block.matchAll(/"(?:file|sound|image)":"([^"]+)"/gu)) names.add(m[1]!);
  for (const m of block.matchAll(/^(?:image|page|file): (\S+)$/gmu)) names.add(m[1]!);
  for (const n of names) stub(dir, n);
  for (const m of block.matchAll(/"dir":"([^"]+)"/gu)) mkdirSync(resolve(dir, m[1]!), { recursive: true });
  writeFileSync(join(dir, "story.md"), block);
  return dir;
}

for (const doc of ["vertical-video.md", "visual-assets.md", "sound.md"]) {
  test(`every scenario in docs/${doc} parses, and a complete one builds`, () => {
    const blocks = scenarios(doc);
    assert.ok(blocks.length > 0, `docs/${doc} has a scenario example`);
    for (const block of blocks) {
      const dir = prepare(block);
      const src = parseSource(join(dir, "story.md"));
      if (!src.voice) continue;
      assert.equal(src.voice.engine, "stub", "a documentation example never pays for synthesis");
      const r = spawnSync("node", [ENTRY, "build", "--source", "story.md", "--out", "f.mp4"],
        { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
      assert.equal(r.status, 0, `${doc}: ${r.stderr.slice(-400)}`);
      const size = execFileSync(ffprobe, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
        "-of", "csv=p=0:s=x", join(dir, "f.mp4")], { encoding: "utf8" }).trim();
      if (src.format === "vertical") assert.equal(size, "1080x1920", "the vertical example builds as a vertical film");
    }
  });
}
