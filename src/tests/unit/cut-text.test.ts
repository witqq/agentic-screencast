// Наезд с названным увеличением, при котором кадр режет строки цели, — строки называются в отчёте
// сборки (поле сцены `cut`) и строкой в поток ошибок. Прежде отчёт говорил только «увеличение
// больше вмещающего»; какие слова пропали, агент узнавал по кадру, если смотрел.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

test("a push-in that cuts the target's lines names them whole in the build report; one that fits names nothing", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-cut-"));
  writeFileSync(join(dir, "p.html"), `<!doctype html><body style="margin:0;background:#101826;color:#eee;font:28px sans-serif">
    <div id="t" style="position:absolute;left:300px;top:400px;width:1300px">
      <p style="margin:0">The first line of the release notes runs across the whole card</p>
      <p style="margin:0">Second line</p>
      <p style="margin:0"><em>7</em> <b>l</b><b>a</b><b>n</b><b>g</b>: the highlighted setting of this story runs far right</p></div></body>`);
  const build = (scale: string): { cut?: Array<{ target: string; text: string[] }> } => {
    writeFileSync(join(dir, "story.md"), `# C\nvoice: {"engine":"stub","name":"silent","cps":15}\n\n## a · page\npage: p.html\nduration: 3\noverlay: {"camera":[{"at":0.2,"hold":2,"target":"#t"${scale}}]}\n`);
    const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
    assert.equal(r.status, 0, r.stderr.slice(-500));
    return (JSON.parse(r.stdout) as { scenes: Array<{ cut?: Array<{ target: string; text: string[] }> }> }).scenes[0]!;
  };
  const cut = build(',"scale":3').cut;
  assert.ok(cut?.[0]?.text.some((t) => t.startsWith("The first line")), `the cut line is named: ${JSON.stringify(cut)}`);
  // Строка, раздробленная на подсвеченные куски, называется целиком, а не буквами.
  assert.ok(cut![0]!.text.includes("7 lang: the highlighted setting of this story runs far right"), JSON.stringify(cut));
  assert.ok(cut![0]!.text.every((t) => t.length > 3), `no fragments: ${JSON.stringify(cut)}`);
  assert.equal(build("").cut, undefined, "a push-in that fits cuts nothing");
});
