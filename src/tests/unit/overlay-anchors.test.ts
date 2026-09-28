// Моменты накладки называются якорями тактов, как у фокуса: `"at":"b2+0.5"`. Секунды, записанные
// по черновому голосу, устаревали при смене голоса или темпа, и марка или карточка приходили не
// к тем словам. Сборка переводит якорь по измеренной речи, разбор и `lint` — по оценке.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseOverlay } from "../../overlay.js";
import { parseSource, toPitch } from "../../source.js";

const FFMPEG = createRequire(import.meta.url)("ffmpeg-static") as string;
const ENTRY = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "agentic-screencast.js");

const story = (dir: string, cps: number, overlay: string): string => {
  const f = join(dir, `s${cps}.md`);
  writeFileSync(join(dir, "p.html"), `<!doctype html><body style="margin:0;background:#123"><div id="t" style="margin:300px;width:400px;height:200px;background:#eee"></div></body>`);
  writeFileSync(f, `# A\nvoice: {"engine":"stub","name":"silent","cps":${cps}}\n\n## a · page\npage: p.html\noverlay: ${overlay}\n\n`
    + "The first beat says a few words about the screen.\n\nThe second beat names the box.\n");
  return f;
};

/** Доля светлых точек кадра в момент t: наезд на светлый блок её увеличивает. */
const bright = (film: string, t: number): number => {
  const raw = execFileSync(FFMPEG, ["-nostdin", "-v", "error", "-ss", t.toFixed(2), "-i", film, "-frames:v", "1",
    "-vf", "scale=160:90,format=gray", "-f", "rawvideo", "-"]);
  return [...raw].filter((v) => v > 200).length / raw.length;
};

test("an overlay moment named by a beat lands at that beat's start plus the offset, and moves with the pace", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-ovanchor-"));
  const overlay = '{"camera":[{"at":"b2+0.5","hold":1.2,"target":"#t","scale":1.5}]}';
  const film = (cps: number): string => {
    const out = join(dir, `f${cps}.mp4`);
    const r = spawnSync("node", [ENTRY, "build", story(dir, cps, overlay), "--out", out],
      { cwd: dir, encoding: "utf8", env: { ...process.env, AGENTIC_SCREENCAST_HOME: join(dir, ".home") } });
    assert.equal(r.status, 0, r.stderr.slice(-600));
    assert.ok(toPitch(parseSource(join(dir, `s${cps}.md`))).scenes[0]!.overlayRaw, "the scene keeps its anchored overlay for the build");
    return out;
  };
  // Первый такт — 49 знаков: при 20 зн/с второй начинается на 2,45 с, наезд доезжает к 3,85 с и
  // держится до 5,05 с; при 10 зн/с второй такт — на 4,9 с, наезд стоит с 6,3 до 7,5 с.
  const fast = film(20), slow = film(10);
  const rest = bright(fast, 1);
  assert.ok(bright(fast, 4.3) > rest * 1.6, `at 20 cps the push-in holds at 4.3s (${bright(fast, 4.3)} vs ${rest})`);
  assert.ok(bright(slow, 4.3) < rest * 1.2, `at 10 cps nothing has moved at 4.3s (${bright(slow, 4.3)} vs ${rest})`);
  assert.ok(bright(slow, 6.8) > rest * 1.6, `at 10 cps the push-in holds at 6.8s (${bright(slow, 6.8)} vs ${rest})`);
});

test("parsing resolves a beat anchor by the estimate, refuses a word for a moment and a beat past the scene's last", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-ovanchor-p-"));
  const p = toPitch(parseSource(story(dir, 15, '{"titles":[{"at":"b2.end-1","text":"End"}]}')));
  const t = p.scenes[0]!.overlay!.titles![0]!.at;
  assert.ok(t > 3 && t < 5, `b2.end-1 by the estimate: ${t}`);
  assert.throws(() => parseOverlay('{"titles":[{"at":"soon","text":"X"}]}', () => 0), /neither seconds nor a beat anchor/);
  assert.throws(() => parseOverlay('{"titles":[{"at":"b2","text":"X"}]}'), /resolves where the scene's beats are known/);
  assert.throws(() => parseSource(story(dir, 16, '{"titles":[{"at":"b5","text":"X"}]}')), /b5/);
});
