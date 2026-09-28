// Ролик только с голосом нормируется к цели площадок, как и ролик с музыкой: прежде без подложки
// и акцентов звук шёл как записан и выходил около −19 LUFS при цели −14 (docs/sound.md). Истинный
// пик готового файла — не выше −1 dBTP: кодирование в AAC поднимало его до −0,8.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

test("a voice-only film comes out at the -14 LUFS target with its true peak under -1 dBTP; a silent one builds as is", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-voice-lufs-"));
  // Движок, который вместо речи пишет тихий тон с перепадом громкости: смесь заметно тише цели.
  const engine = join(dir, "tone.mjs");
  writeFileSync(engine, `import { execFileSync } from "node:child_process";
const a = process.argv.slice(2), get = (k) => a[a.indexOf(k) + 1];
if (a[0] === "voices") { console.log("[]"); process.exit(0); }
if (a[0] === "probe") { console.log("{}"); process.exit(0); }
const text = get("--text"), out = get("--out"), d = Math.max(1, text.length / 15);
execFileSync(${JSON.stringify(ffmpeg)}, ["-loglevel", "error", "-y", "-f", "lavfi", "-i",
  "sine=frequency=220:duration=" + d + ",volume='0.05+0.1*abs(sin(t*3))':eval=frame", "-ar", "48000", "-ac", "1", out]);
console.log(JSON.stringify({ file: out, duration: d, engine: "tone", voice: {} }));
`);
  const build = (voice: string): { stdout: string; film: string } => {
    writeFileSync(join(dir, "story.md"), `# L\nvoice: ${voice}\n\n## a · slides.chapter\ntitle: A\nbody: B\n\nThe first beat of the narration runs for a while.\n\nThe second beat follows it.\n`);
    const r = spawnSync("node", [ENTRY, "build", "story.md", "--out", "f.mp4"], { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
    assert.equal(r.status, 0, r.stderr.slice(-600));
    return { stdout: r.stdout, film: join(dir, "f.mp4") };
  };
  const { stdout, film } = build(JSON.stringify({ engine: `${process.execPath} ${engine}`, name: "tone" }));
  const rep = JSON.parse(stdout) as { audio?: { loudness?: { target: number; measured: number; input: number } } };
  assert.equal(rep.audio?.loudness?.target, -14);
  assert.ok(rep.audio!.loudness!.input < -17, `the raw voice is quieter than the target: ${rep.audio!.loudness!.input}`);
  const probe = spawnSync(ffmpeg, ["-nostdin", "-hide_banner", "-i", film, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" });
  const summary = probe.stderr.slice(probe.stderr.lastIndexOf("Summary"));
  const integrated = Number(/I:\s+(-?[\d.]+) LUFS/.exec(summary)![1]);
  const peak = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(summary)![1]);
  assert.ok(Math.abs(integrated + 14) <= 1, `the finished film is ${integrated} LUFS`);
  assert.ok(peak <= -1, `the finished film's true peak is ${peak} dBTP`);
  const silent = JSON.parse(build(`{"engine":"stub","name":"silent","cps":15}`).stdout) as { audio?: { loudness?: unknown } };
  assert.equal(silent.audio?.loudness, undefined, "silence is left as it is");
});
