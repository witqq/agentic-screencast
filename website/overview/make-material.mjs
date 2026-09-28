// Makes the overview film's material that is not a live take: the sample film in demo/ and its
// builds, the real output of the tool's commands, the images the slides show, and the film's own
// pages in pages/ that present that output. Every terminal page shows real output of the command it
// names, captured here; absolute paths are shortened to the film's folder.
//
//   node website/overview/make-material.mjs          everything; the demo builds are reused if present
//   node website/overview/make-material.mjs --demo   rebuild the sample film and its web package too
//   node website/overview/make-material.mjs --pages  only the pages (after an edit of this script)
//   node website/overview/make-material.mjs --frames only the images made by `frames` (needs every page,
//                                                     the takes and the record-page take)
//
// Run shoot.mjs first: the demo and the frames read the takes in captures/.
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const CLI = join(ROOT, "dist", "agentic-screencast.js");
const FFMPEG = join(ROOT, "node_modules", "ffmpeg-static", "ffmpeg");
const GEN = join(HERE, "assets", "gen");
const OUT = join(HERE, "demo", "out");
const PAGES = join(HERE, "pages");
for (const d of [GEN, OUT, PAGES]) mkdirSync(d, { recursive: true });
const args = process.argv.slice(2);

// A command of the tool, run in the film's folder, in the language its output is shown in.
function tool(lang, argv, { cwd = HERE, ok = false } = {}) {
  const r = spawnSync(process.execPath, [CLI, ...argv], { cwd, encoding: "utf8", maxBuffer: 1e8,
    env: { ...process.env, AGENTIC_SCREENCAST_LANG: lang } });
  if (r.status !== 0 && !ok) throw new Error(`${argv.join(" ")}: ${r.stderr || r.stdout}`);
  return { out: r.stdout, err: r.stderr, status: r.status };
}
const short = (s) => s.split(`${HERE}/`).join("").split(HERE).join(".").split(`${ROOT}/`).join("");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const frame = (file, second, out) => execFileSync(FFMPEG, ["-v", "error", "-y", "-ss", String(second), "-i", file, "-frames:v", "1", out]);
const LANGS = [["ru", ".ru"], ["en", ""]];

// ---------------------------------------------------------------------------------------------
// The sample film: four scenes of the Flow board, built on the free stub voice, in both languages,
// with a film look, vertical, and as a web package with a GIF.
function demo() {
  for (const [L, s] of LANGS) {
    const lang = L === "en" ? ["--lang", "en"] : [];
    const build = (src, out, extra = []) => {
      const r = tool(L, ["build", src, ...lang, ...extra, "--out", out]);
      writeFileSync(join(HERE, `${out.replace(/\.mp4$/, "")}.stderr.txt`), r.err);
      return r;
    };
    build("demo/story.md", `demo/out/demo${s}.mp4`);
    // A rebuild with nothing changed: every scene comes from the cache.
    writeFileSync(join(OUT, `rebuild${s}.stderr.txt`), tool(L, ["build", "demo/story.md", ...lang, "--out", `demo/out/demo${s}.mp4`]).err);
    writeFileSync(join(OUT, `only${s}.stderr.txt`), tool(L, ["build", "demo/story.md", ...lang, "--only", "live", "--out", `demo/out/live${s}.mp4`]).err);
    build("demo/look.md", `demo/out/look${s}.mp4`);
    build("demo/story.md", `demo/out/vertical${s}.mp4`, ["--format", "vertical"]);
    const web = tool(L, ["web", `demo/out/demo${s}.mp4`, "--out", `demo/out/web${s}`, "--gif", "2-6"]);
    writeFileSync(join(OUT, `web${s}.json`), web.out);
  }
}

// The real output of short commands, in both languages, kept as text beside the demo builds.
function outputs() {
  const tmp = join(ROOT, "agent_temp_files_local", "overview-new", "my-film");
  for (const [L, s] of LANGS) {
    rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
    const made = tool(L, ["new", "product-demo"], { cwd: tmp }).out.split(dirname(tmp)).join("~");
    writeFileSync(join(OUT, `new${s}.txt`), made);
    writeFileSync(join(OUT, `typo${s}.txt`), tool(L, ["lint", "demo/typo.md"], { ok: true }).err.trim());
    writeFileSync(join(OUT, `untranslated${s}.json`), tool(L, ["lint", "demo/untranslated.md", "--lang", "en"], { ok: true }).out);
    writeFileSync(join(OUT, `voices${s}.json`), tool(L, ["voices", "--voice-json", '{"engine":"speechkit"}']).out);
    writeFileSync(join(OUT, `theme${s}.txt`), tool(L, ["theme", "--from", "assets/flow-logo.png"]).out);
    writeFileSync(join(OUT, `lint-bad${s}.json`), tool(L, ["lint", "demo/bad.md"], { ok: true }).out);
    writeFileSync(join(OUT, `lint-film${s}.json`), tool(L, ["lint", "story.md", ...(L === "en" ? ["--lang", "en"] : [])], { ok: true }).out);
  }
  rmSync(dirname(tmp), { recursive: true, force: true });
  // Beat keys of the sample scene, before and after one sentence is rewritten, and at a slower pace.
  const keys = (src, voice) => JSON.parse(tool("ru", ["build", src, "--keys-only",
    ...(voice ? ["--voice-json", voice] : [])]).out).keys;
  writeFileSync(join(OUT, "keys.json"), JSON.stringify({
    before: keys("demo/story.md"), after: keys("demo/edited.md"),
    slow: keys("demo/story.md", '{"engine":"stub","name":"silent","cps":10}'),
    slowEn: JSON.parse(tool("en", ["build", "demo/story.md", "--lang", "en", "--keys-only", "--voice-json", '{"engine":"stub","name":"silent","cps":10}']).out).keys,
    beforeEn: JSON.parse(tool("en", ["build", "demo/story.md", "--lang", "en", "--keys-only"]).out).keys,
    afterEn: JSON.parse(tool("en", ["build", "demo/edited.md", "--lang", "en", "--keys-only"]).out).keys,
  }, null, 1));
}

// Scenario variants the terminal pages run: a typo, a missing translation, one rewritten sentence,
// and the sample film with a film look.
function variants() {
  const story = readFileSync(join(HERE, "demo", "story.md"), "utf8");
  writeFileSync(join(HERE, "demo", "untranslated.md"), story.replace(/^cta\.en: .*\n/m, ""));
  writeFileSync(join(HERE, "demo", "edited.md"), story
    .replace("Камера наезжает на перенесённую карточку.", "Камера наезжает на карточку в колонке «Готово».")
    .replace("The camera pushes in on the card that moved.", "The camera pushes in on the card in the Done column."));
  writeFileSync(join(HERE, "demo", "look.md"), story.replace(/^(progress: .*)$/m, "$1\nlook: trailer"));
  writeFileSync(join(HERE, "demo", "typo.md"), story.replace(/^title: Доска задач за полминуты$/m, "titel: Доска задач за полминуты"));
}

// Images the slides show.
async function images() {
  for (const [, s] of LANGS) {
    // Film look: the same second of the sample film without and with `look: trailer`.
    frame(join(OUT, `demo${s}.mp4`), 9.7, join(GEN, `look-off${s}.png`));
    frame(join(OUT, `look${s}.mp4`), 9.7, join(GEN, `look-on${s}.png`));
    copyFileSync(join(OUT, `web${s}`, `demo${s}.gif`), join(GEN, `demo${s}.gif`));
    copyFileSync(join(OUT, `web${s}`, `demo${s}.poster.jpg`), join(GEN, `poster${s}.jpg`));
    tool("ru", ["sheet", `captures/board${s}.webm`, "--count", "12", "--out", `assets/gen/sheet${s}.png`]);
  }
  if (!existsSync(join(GEN, "landing-full.png"))) {
    const { chromium } = await import("playwright");
    const b = await chromium.launch();
    const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
    await p.goto("https://agentic-screencast.witqq.dev/", { waitUntil: "networkidle" });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: join(GEN, "landing.png") });
    await p.screenshot({ path: join(GEN, "landing-full.png"), fullPage: true });
    await b.close();
  }
}

// Images made by `frames` from this very scenario: they need every page, take and asset in place.
function frames() {
  // c12-frames shows the top of this sheet. The crop contains earlier scenes, so the final
  // sheet can use the newly cropped top without a cycle.
  const top = (s) => execFileSync(FFMPEG, ["-v", "error", "-y", "-i", join(GEN, `frames${s}.png`), "-vf", "crop=1600:900:0:0", join(GEN, `frames-top${s}.png`)]);
  // c02-langs embeds both language images. Finish both before either full sheet regenerates.
  for (const [L, s] of LANGS) {
    const lang = L === "en" ? ["--lang", "en"] : [];
    tool(L, ["frames", "story.md", ...lang, "--scene", "c00-cold", "--at", "60%", "--out", `assets/gen/split-frame${s}.png`]);
    tool(L, ["frames", "story.md", ...lang, "--scene", "c03-click", "--at", "55%", "--out", `assets/gen/lang${s}.png`]);
  }
  // The first sheet leaves out only c12-frames, whose own image does not exist yet. Its
  // earlier rows provide the real top crop. The second sheet includes every scene and embeds
  // that crop in c12-frames; its late position cannot change the cropped rows.
  for (const [L, s] of LANGS) {
    const lang = L === "en" ? ["--lang", "en"] : [];
    tool(L, ["frames", "story.md", ...lang, "--except", "c12-frames", "--out", `assets/gen/frames${s}.png`]);
    top(s);
  }
  for (const [L, s] of LANGS) {
    const lang = L === "en" ? ["--lang", "en"] : [];
    tool(L, ["frames", "story.md", ...lang, "--out", `assets/gen/frames${s}.png`]);
  }
}

// ---------------------------------------------------------------------------------------------
// Pages. Each is written in both languages; the Russian file ends in .ru.html.
const shell = (lang, title, body, css = "", js = "") => `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><title>${esc(title)}</title>
<link rel="stylesheet" href="kit.css">
<style>
/* The page's own motion runs on the scene's clock: the build seeks it to every frame. */
/* One quiet motion on the scene's clock: the grid of kit.css drifting. */
body::before{animation:drift 20s linear infinite}
${css}
</style></head><body>
${body}
<script src="kit.js"></script>${js ? `\n<script>\n${js}\n</script>` : ""}
</body></html>
`;
const write = (name, s, html) => writeFileSync(join(PAGES, `${name}${s}.html`), html);

// A terminal: commands typed on their beats, output lines appearing after them.
// steps: [{ cmd, at, lines: [text | {t, cls}], every }]
function terminal(steps, title) {
  const rows = [];
  for (const st of steps) {
    rows.push(`<span class="line"><span class="prompt">$ </span><span class="cmd" data-at="${st.at}" data-type="${esc(st.cmd)}" data-cps="40"></span></span>`);
    const typed = st.cmd.length / 40 + 0.4;
    st.lines.forEach((l, i) => {
      const line = typeof l === "string" ? { t: l } : l;
      rows.push(`<span class="line rv ${line.cls ?? ""}" data-at="${st.at}+${(typed + i * (st.every ?? 0.12)).toFixed(2)}">${esc(line.t) || " "}</span>`);
    });
  }
  const long = steps.some((st) => st.cmd.length > 70 || st.lines.some((l) => String(typeof l === "string" ? l : l.t).length > 100));
  const short = rows.length < 10 && !long ? " short" : "";
  return `<div class="term${short}"><div class="bar"><i></i><i></i><i></i><span>${esc(title)}</span></div><pre data-scroll>${rows.join("")}</pre></div>`;
}
const head = (kicker, title) => `<div class="head"><small>${esc(kicker)}</small><h1>${esc(title)}</h1></div>`;
const read = (f) => readFileSync(join(OUT, f), "utf8");

function pages() {
  const T = (ru, en) => ({ ru, en });
  for (const [L, s] of LANGS) {
    const t = (x) => x[L];

    // The opening's split screen: the lines of the first scene beside the frame they make.
    {
      const story = readFileSync(join(HERE, "story.md"), "utf8");
      const block = story.slice(story.indexOf("## c00-cold"), story.indexOf("## c00-file")).trimEnd().split("\n");
      const en = block.indexOf("[en]");
      const fields = block.slice(0, block.findIndex((x) => x.trim() === "")).filter((x) => !x.startsWith("stills:")
        && (L === "en" ? !/^(part|file):/.test(x) : !/\.en:/.test(x)));
      const prose = L === "en" ? block.slice(en + 1) : block.slice(fields.length, en);
      const lines = [...fields, "", ...prose.filter((x, i, a) => x.trim() || (i > 0 && a[i - 1].trim()))].slice(0, 16);
      const code = lines.map((x, i) => `<span class="ln rv" data-at="${(0.1 + i * 0.12).toFixed(2)}"><b>${i + 1}</b>${esc(x) || " "}</span>`).join("\n");
      write("split", s, shell(L, "story.md", `<div class="split">
<div class="panel code" id="code"><div class="tab mono">story.md</div><pre class="mono">${code}</pre></div>
<div class="arrow glow">→</div>
<div class="panel shot" id="frame"><div class="tab">${t(T("кадр ролика", "the film's frame"))}</div><img src="../assets/gen/split-frame${s}.png"></div>
</div>`, `.split{position:absolute;left:70px;right:70px;top:90px;bottom:250px;display:grid;grid-template-columns:44fr 3fr 53fr;align-items:center;gap:0}
.code{height:100%;overflow:hidden;padding:18px 22px}.code pre{margin:0;font-size:21px;line-height:1.55;white-space:pre-wrap;word-break:break-word;color:var(--body)}
.ln{display:block;padding-left:44px;text-indent:-44px}.ln b{display:inline-block;width:44px;text-indent:0;color:var(--mut);font-weight:400}
.tab{display:inline-block;margin-bottom:10px;padding:4px 14px;border-radius:10px;background:color-mix(in srgb,var(--acc) 14%,var(--card));color:var(--acc2);font-size:22px}
.arrow{font-size:80px;color:var(--acc);text-align:center}.shot{padding:16px}.shot img{display:block;width:100%;border-radius:12px}`));
    }

    // The brief: three rounds of structured questions, the recommended option first (the skill's table).
    {
      const rounds = t(T([
        ["Заход 1 · какой ролик", [["Жанр", ["демо продукта", "питч", "трейлер", "объяснение", "релиз", "короткое"]], ["Кадр", ["16:9", "9:16 в ленте", "9:16 вне ленты", "квадрат"]], ["Длина", ["≈ 1 минута", "≈ 30 с", "2–3 минуты", "полный обзор"]], ["Глубина", ["результат и зачем", "кадр на возможность"]]]],
        ["Заход 2 · как звучит", [["Голос", ["движок синтеза", "голос владельца", "немой"]], ["Звук", ["нет", "музыка", "музыка и акценты", "свои файлы"]], ["Субтитры", ["плашка", "субтитры", "караоке и .srt"]], ["Язык", ["язык просьбы", "медленнее", "другой язык"]]]],
        ["Заход 3 · как выглядит", [["Тема", ["готовая тема", "цвета бренда", "часть в другой", "плюс look"]], ["Переходы", ["наплывы", "WebGL", "морф"]], ["Материал", ["живая съёмка", "страницы", "ролики владельца", "слайды"]], ["Структура", ["заготовка жанра", "план владельца", "форма ветки"]]]],
      ], [
        ["Round 1 · what film", [["Genre", ["product demo", "pitch", "trailer", "explainer", "release", "short"]], ["Frame", ["16:9", "9:16 in a feed", "9:16 outside", "square"]], ["Length", ["≈ 1 minute", "≈ 30 s", "2–3 minutes", "full tour"]], ["Depth", ["the result and why", "a shot per capability"]]]],
        ["Round 2 · how it sounds", [["Voice", ["a synthesis engine", "the owner's voice", "silent"]], ["Sound", ["none", "music", "music and accents", "own files"]], ["Captions", ["a plate", "subtitles", "karaoke and .srt"]], ["Language", ["the request's", "slower", "another"]]]],
        ["Round 3 · how it looks", [["Theme", ["a shipped theme", "brand colours", "a part in another", "plus a look"]], ["Transitions", ["fades", "WebGL", "morph"]], ["Material", ["live capture", "pages", "owner's clips", "slides"]], ["Structure", ["genre skeleton", "owner's outline", "branch shape"]]]],
      ]));
      const ats = ["b1", "b2", "b3"];
      const cols = rounds.map(([name, dims], i) => `<div class="panel call" id="call${i + 1}"><h2 class="rv" data-at="${ats[i]}">${esc(name)}</h2>${dims.map(([d, opts], j) =>
        `<div class="dim rv" data-at="${ats[i]}+${(0.4 + j * 0.35).toFixed(2)}"><span>${esc(d)}</span><div>${opts.map((o, k) => `<i class="${k ? "" : "rec"}">${k ? "" : "★ "}${esc(o)}</i>`).join("")}</div></div>`).join("")}</div>`).join("");
      write("brief", s, shell(L, "brief", `<div class="wrap">${head(t(T("Бриф из скилла", "The skill's brief")), t(T("Спросить только то, чего не вывести", "Ask only what cannot be inferred")))}
<div class="calls">${cols}</div></div>`, `.calls{display:grid;grid-template-columns:repeat(3,1fr);gap:26px;flex:1}
.call{padding:22px 24px}.call h2{margin:0 0 14px;font:var(--display-weight) 30px var(--display);color:var(--acc2)}
.dim{margin:10px 0 14px}.dim span{display:block;color:var(--mut);font-size:22px}
.dim div{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}.dim i{font-style:normal;font-size:22px;padding:4px 12px;border-radius:999px;background:color-mix(in srgb,var(--acc) 14%,var(--card));color:var(--body)}
.dim i.rec{background:color-mix(in srgb,var(--acc) 22%,var(--card));color:var(--ink);border:2px solid var(--acc)}`));
    }

    // `new`: a genre skeleton in one command.
    {
      const made = read(`new${s}.txt`).trimEnd().split("\n");
      write("term-new", s, shell(L, "new", `<div class="wrap">${terminal([
        { cmd: "agentic-screencast new product-demo", at: "b1+0.2", lines: made },
        { cmd: "ls", at: `b1+${(2.2 + made.length * 0.12).toFixed(1)}`, lines: [{ t: "checklist.md  pages  story.md", cls: "hl" }] },
      ], "~/my-film")}</div>`));
    }

    // The rebuild from the cache and one scene alone.
    {
      const first = read(`demo${s}.stderr.txt`).trim().split("\n").filter((x) => /^\[\d/.test(x));
      const again = read(`rebuild${s}.stderr.txt`).trim().split("\n");
      const one = read(`only${s}.stderr.txt`).trim().split("\n");
      const cached = (x) => (/кэша|cache/.test(x) ? { t: short(x), cls: "hl" } : short(x));
      write("term-cache", s, shell(L, "cache", `<div class="wrap">${terminal([
        { cmd: "agentic-screencast build demo/story.md --out demo.mp4", at: "b1", lines: [...first.map(short), "…"], every: 0.1 },
        { cmd: "agentic-screencast build demo/story.md --out demo.mp4", at: "b1+2.4", lines: again.filter((x) => /^\[\d|готово|done/.test(x)).map(cached), every: 0.1 },
        { cmd: "agentic-screencast build demo/story.md --only live --out live.mp4", at: "b2", lines: one.map(cached) },
      ], "demo")}</div>`));
    }

    // The translation check naming an untranslated field.
    {
      const j = JSON.parse(read(`untranslated${s}.json`));
      const lines = JSON.stringify(j, null, 1).split("\n").map((x) => (/"rule"|"message"/.test(x) ? { t: x, cls: "hl" } : x));
      write("term-untranslated", s, shell(L, "lint --lang", `<div class="wrap">${terminal([
        { cmd: "agentic-screencast lint demo/untranslated.md --lang en", at: "b1", lines },
      ], "demo")}</div>`));
    }

    // A typo in a field name.
    {
      const err = short(read(`typo${s}.txt`));
      write("term-typo", s, shell(L, "typo", `<div class="wrap">${terminal([
        { cmd: "sed -n 12,15p demo/typo.md", at: "b1", lines: ["## open · slides.hero", "part: Начало", "kicker: Пример ролика", { t: "titel: Доска задач за полминуты", cls: "warn" }] },
        { cmd: "agentic-screencast lint demo/typo.md", at: "b1+2.2", lines: [{ t: err, cls: "hl" }] },
      ], "demo")}</div>`));
    }

    // The voices an engine lists.
    {
      const v = JSON.parse(read(`voices${s}.json`));
      const rows = [];
      for (let i = 0; i < v.length; i += 4) rows.push(v.slice(i, i + 4).map((x) => JSON.stringify(x)).join(", ") + (i + 4 < v.length ? "," : ""));
      const lines = ["[", ...rows.map((x) => ({ t: ` ${x}`, cls: /filipp|john/.test(x) ? "hl" : "" })), "]"];
      write("term-voices", s, shell(L, "voices", `<div class="wrap">${terminal([
        { cmd: `agentic-screencast voices --voice-json '{"engine":"speechkit"}'`, at: "b1", lines, every: 0.08 },
      ], "voices")}</div>`));
    }

    // A theme from a logo.
    {
      const j = JSON.parse(read(`theme${s}.txt`));
      const lines = ['{', ` "found": ${JSON.stringify(j.found)},`, ' "theme": {', ...["preset", "--glow", "--acc", "--acc2", "--sc-progress", "--sc-mark"].map((k) =>
        ({ t: `  "${k}": ${JSON.stringify(j.theme[k])},`, cls: /acc/.test(k) ? "hl" : "" })), "  …", " }", "}"];
      write("term-theme", s, shell(L, "theme", `<div class="wrap"><div class="row">
<div class="panel logo rv" data-at="b1"><img src="../assets/flow-logo.png"><span>flow-logo.png</span></div>
${terminal([{ cmd: "agentic-screencast theme --from flow-logo.png", at: "b1+0.6", lines }], "theme")}</div></div>`,
      `.row{display:grid;grid-template-columns:360px 1fr;gap:30px;flex:1;min-height:0}.row .term{height:100%}.logo{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px}
.logo img{width:260px}.logo span{color:var(--mut);font:24px var(--mono)}`));
    }

    // The phone checks of a vertical build.
    {
      const err = read(`vertical${s}.stderr.txt`).trim().split("\n");
      const lines = err.map((x) => (/scene report/.test(x) ? { t: short(x), cls: "warn" } : short(x)));
      write("term-legibility", s, shell(L, "vertical", `<div class="wrap">${terminal([
        { cmd: "agentic-screencast build demo/story.md --format vertical --out vertical.mp4", at: "b1", lines, every: 0.25 },
      ], "demo")}</div>`));
    }

    // lint: a flawed scenario, then this film.
    {
      const bad = JSON.parse(read(`lint-bad${s}.json`)).findings;
      const seen = new Set(), lines = [];
      for (const f of bad) {
        if (seen.has(f.rule)) continue;
        seen.add(f.rule);
        lines.push({ t: `${f.scene} · ${f.rule} — ${f.message.length > 70 ? f.message.slice(0, 68) + "…" : f.message}`, cls: "hl" });
      }
      let film;
      try { film = JSON.parse(read(`lint-film${s}.json`)); }
      catch { console.warn(`term-lint${s}: lint of story.md gave no JSON yet (run again once every take exists)`); film = null; }
      if (film) write("term-lint", s, shell(L, "lint", `<div class="wrap">${terminal([
        { cmd: "agentic-screencast lint demo/bad.md", at: "b1", lines, every: 0.3 },
        { cmd: "agentic-screencast lint story.md", at: "b3", lines: JSON.stringify(film, null, 1).split("\n").map((x) => ({ t: x, cls: "acc" })) },
      ], "overview")}</div>`, `.term pre{font-size:24px}`));
    }

    // web: three codecs, a poster, chapters, thumbnails and a GIF, each output checked.
    {
      const w = JSON.parse(read(`web${s}.json`));
      const mb = (b) => `${(b / 1e6).toFixed(1)} MB`;
      const lines = [...w.outputs.map((o) => ({ t: `${o.format.padEnd(5)} ${o.encoder.padEnd(11)} ${mb(o.bytes).padStart(7)}  ${o.width}×${o.height}  ${o.duration}s  ssim ${o.ssim}${o.faststart ? "  faststart" : ""}`, cls: "hl" })),
        `poster   ${w.posters.map((p) => p.split("/").pop()).join(", ")}`,
        `chapters ${w.chapters.split("/").pop()}`,
        `thumbs   ${w.thumbnails.count} × ${w.thumbnails.every}s  ${w.thumbnails.sprite.split("/").pop()}`,
        { t: `gif      ${w.gif.from}–${w.gif.to}s  ${w.gif.width}×${w.gif.height}  ${w.gif.fps} fps  ${mb(w.gif.bytes)}`, cls: "hl" },
        `html     ${w.html.split("/").pop()}`];
      write("term-web", s, shell(L, "web", `<div class="wrap">${terminal([
        { cmd: "agentic-screencast web demo.mp4 --out web --gif 2-6", at: "b1", lines, every: 0.3 },
      ], t(T("demo — выдержка из отчёта JSON", "demo — from the JSON report")))}</div>`));
    }

    // Beats: three beats with their keys, then one sentence rewritten.
    {
      const k = JSON.parse(read("keys.json"));
      const [before, after] = L === "en" ? [k.beforeEn, k.afterEn] : [k.before, k.after];
      const beats = (ks) => ks.filter((x) => x.id === "live" || x.id === "report").flatMap((x) => x.beats.map((b) => ({ ...b, scene: x.id, cached: x.cached })));
      const a = beats(before), b = beats(after);
      const row = (x, i, y) => `<div class="beat panel rv" data-at="b1+${(0.3 + i * 0.5).toFixed(1)}">
<div class="no">${esc(x.scene)} · b${x.scene === "live" ? i + 1 : 1}</div>
<div class="txt">${y && y.speech !== x.speech ? `<s class="old">${esc(x.speech)}</s><span class="new rv" data-at="b2+0.3">${esc(y.speech)}</span>` : esc(x.speech)}</div>
<div class="meta mono"><span>${x.spoken.toFixed(2)} ${t(T("с", "s"))}</span><span class="key">${x.key.slice(0, 8)}</span>${y && y.key !== x.key ? `<span class="key new rv" data-at="b2+0.6">→ ${y.key.slice(0, 8)}</span>` : ""}</div>
<div class="tag rv ${y && y.key !== x.key ? "redo" : "keep"}" data-at="b2+0.9">${y && y.key !== x.key ? t(T("озвучен заново", "voiced again")) : t(T("из кэша", "from the cache"))}</div></div>`;
      write("beats", s, shell(L, "beats", `<div class="wrap">${head(t(T("Такты", "Beats")), t(T("Абзац речи — такт со своим ключом", "A paragraph is a beat with its own key")))}
<div class="beats">${a.map((x, i) => row(x, i, b[i])).join("")}</div></div>`,
      `.beats{display:flex;flex-direction:column;gap:18px}.beat{display:grid;grid-template-columns:170px 1fr 330px 230px;align-items:center;gap:20px;padding:20px 26px}
.no{color:var(--acc2);font:600 24px var(--mono)}.txt{font-size:28px}.old{color:var(--mut)}.new{display:block;color:var(--ink)}
.meta{display:flex;flex-direction:column;gap:4px;font-size:24px;color:var(--mut)}.key{color:var(--body)}.key.new{color:var(--acc)}
.tag{justify-self:end;padding:6px 16px;border-radius:999px;font-size:24px}.tag.keep{background:color-mix(in srgb,var(--acc) 14%,var(--card));color:var(--acc2)}.tag.redo{background:color-mix(in srgb,var(--acc) 22%,var(--card));color:var(--ink)}`));
    }

    // Anchors: the same scene at two paces; the moments move with their words.
    {
      const k = JSON.parse(read("keys.json"));
      const fast = (L === "en" ? k.beforeEn : k.before).find((x) => x.id === "live");
      const slow = (L === "en" ? k.slowEn : k.slow).find((x) => x.id === "live");
      const px = 110, x0 = 250;
      const track = (sc, y, label, at) => {
        const [b1, b2] = sc.beats;
        const marks = [["b1", 0], ["40%", 0.4 * sc.duration], ["b2", b2.starts], ["b2+0.4", b2.starts + 0.4], ["b2.end", b2.starts + b2.spoken]];
        return `<g class="rv" data-at="${at}"><text x="0" y="${y + 38}" class="lbl">${esc(label)}</text>
<rect x="${x0}" y="${y}" width="${b1.spoken * px}" height="56" rx="12" class="b1"/><text x="${x0 + 16}" y="${y + 38}" class="bt">b1</text>
<rect x="${x0 + b2.starts * px}" y="${y}" width="${b2.spoken * px}" height="56" rx="12" class="b2"/><text x="${x0 + b2.starts * px + 16}" y="${y + 38}" class="bt">b2</text>
<rect x="${x0}" y="${y}" width="${sc.duration * px}" height="56" rx="12" class="sc"/>
${marks.map(([n, sec], i) => `<line x1="${x0 + sec * px}" x2="${x0 + sec * px}" y1="${y - 12}" y2="${y + 70}" class="tick"/><text x="${x0 + sec * px}" y="${y + (i % 2 ? 104 : -22)}" class="an">${n}</text>`).join("")}
<g transform="translate(${x0 + b2.starts * px},${y - 70})"><rect x="-4" y="0" width="200" height="44" rx="10" class="chip"/><text x="96" y="30" class="ct">${t(T("наезд @ b2", "push-in @ b2"))}</text></g></g>`;
      };
      write("anchors", s, shell(L, "anchors", `<div class="wrap">${head(t(T("Якоря", "Anchors")), t(T("Моменты называются по речи", "Moments are named by the speech")))}
<svg viewBox="0 0 1728 560" class="svg">${track(fast, 140, t(T("15 знаков/с", "15 chars/s")), "b1")}${track(slow, 400, t(T("10 знаков/с", "10 chars/s")), "b2")}</svg></div>`,
      `.svg{width:100%;flex:1}.lbl{fill:var(--mut);font:26px var(--sans)}.bt{fill:var(--bg);font:700 26px var(--mono)}
.b1{fill:var(--acc2)}.b2{fill:var(--acc)}.sc{fill:none;stroke:var(--line);stroke-width:3;stroke-dasharray:8 8}
.tick{stroke:var(--acc2);stroke-width:3}.an{fill:var(--acc2);font:24px var(--mono);text-anchor:middle}
.chip{fill:var(--card);stroke:var(--acc2);stroke-width:3}.ct{fill:var(--ink);font:24px var(--sans);text-anchor:middle}`));
    }

    // Music ducking under the speech, drawn from the scene's own beats.
    {
      const body = `<div class="wrap">${head(t(T("Музыка под речью · схема", "Music under speech · a diagram")), t(T("Уходит под каждый такт и возвращается в паузах", "Drops under every beat, returns in the pauses")))}
<div class="panel chart"><svg viewBox="0 0 1600 440" id="svg">
<text x="10" y="70" class="lbl">${t(T("речь", "speech"))}</text><text x="10" y="300" class="lbl">${t(T("музыка", "music"))}</text>
<g id="speech"></g><path id="music" class="music"/><line id="head" y1="20" y2="420" class="head"/>
<text x="1590" y="200" class="note2" text-anchor="end">${t(T("−24 дБ в паузе", "−24 dB in a pause"))}</text>
<text x="1590" y="400" class="note2" text-anchor="end">${t(T("на 20 дБ ниже такта", "20 dB under the beat"))}</text></svg></div>
<i data-at="b1"></i><i data-at="b1.end"></i><i data-at="b2"></i><i data-at="b2.end"></i></div>`;
      // A diagram of the rule, not a measurement: three spoken stretches with pauses between them,
      // drawn across the scene's own speech (from b1 to the end of b2).
      const js = `window.onRender = (t, at) => {
  const m = [...document.querySelectorAll("i[data-at]")].map(at);
  const end = m[3] + 0.8, X = (s) => 150 + (s / end) * 1420, k = end / 10;
  const beats = [[0.6, 3.1], [4.3, 6.6], [7.8, 9.4]].map(([a, b]) => [a * k, b * k]);
  document.getElementById("speech").innerHTML = beats.map(([a, b]) => '<rect x="' + X(a) + '" y="40" width="' + Math.max(0, X(Math.min(b, t)) - X(a)) + '" height="60" rx="10" class="sp"/>').join("");
  const level = (s) => { for (const [a, b] of beats) { if (s >= a - 0.3 && s <= b + 0.3) { const e = Math.min(1, (s - a + 0.3) / 0.3, (b + 0.3 - s) / 0.3); return 200 + e * 180; } } return 200; };
  let d = ""; for (let s = 0; s <= Math.min(t, end); s += end / 400) d += (d ? " L" : "M") + X(s).toFixed(1) + " " + level(s).toFixed(1);
  document.getElementById("music").setAttribute("d", d);
  const h = document.getElementById("head"); h.setAttribute("x1", X(Math.min(t, end))); h.setAttribute("x2", X(Math.min(t, end)));
};`;
      write("duck", s, shell(L, "duck", body, `.chart{flex:1;padding:20px}.chart svg{width:100%;height:100%}.lbl{fill:var(--mut);font:28px var(--sans)}
.sp{fill:var(--acc2)}.music{fill:none;stroke:var(--acc);stroke-width:8;stroke-linejoin:round}.head{stroke:var(--mut);stroke-width:3}
.note2{fill:var(--acc);font:26px var(--sans)}`, js));
    }

    // Safe zones of a vertical frame: in a feed and outside one (src/format.ts).
    {
      const k = 0.29, W = 1080 * k, H = 1920 * k;
      const phone = (id, at, name, z, feed) => `<div class="ph rv" data-at="${at}" id="${id}"><h2>${esc(name)}</h2><svg width="${W + 40}" height="${H + 40}" viewBox="-20 -20 ${W + 40} ${H + 40}">
<rect x="0" y="0" width="${W}" height="${H}" rx="26" class="scr"/>
${feed ? `<g class="ui">${[0, 1, 2, 3].map((i) => `<circle cx="${W - 32}" cy="${H - 330 + i * 64}" r="20"/>`).join("")}<rect x="18" y="${H - 120}" width="${W - 110}" height="16" rx="8"/><rect x="18" y="${H - 92}" width="${W - 170}" height="16" rx="8"/><rect x="18" y="${H - 58}" width="150" height="16" rx="8"/></g>` : ""}
<rect x="${z.left * k}" y="${z.top * k}" width="${W - (z.left + z.right) * k}" height="${H - (z.top + z.bottom) * k}" class="zone"/>
<text x="${W / 2}" y="${z.top * k - 8}" class="n">${z.top}</text><text x="${W / 2}" y="${H - z.bottom * k + 26}" class="n">${z.bottom}</text>
<text x="${z.left * k + 8}" y="${H / 2}" class="n" text-anchor="start">${z.left}</text><text x="${W - z.right * k - 8}" y="${H / 2}" class="n" text-anchor="end">${z.right}</text>
<text x="${(z.left * k + W - z.right * k) / 2}" y="${H - z.bottom * k - 40}" class="sub">${t(T("субтитры здесь", "subtitles here"))}</text></svg></div>`;
      write("zones", s, shell(L, "zones", `<div class="wrap wide">${head(t(T("1080 × 1920, поля в пикселях", "1080 × 1920, margins in pixels")), t(T("Зона зависит от того, где смотрят", "The zone follows where the film is watched")))}
<div class="phones">${phone("platform", "b1", "zone: platform", { top: 170, bottom: 484, left: 65, right: 180 }, true)}${phone("plain", "b2", "zone: plain", { top: 96, bottom: 128, left: 65, right: 65 }, false)}</div></div>`,
      `.wide{bottom:250px}.phones{display:flex;justify-content:center;gap:140px}.ph h2{margin:0 0 6px;text-align:center;font:600 30px var(--mono);color:var(--acc2)}
.scr{fill:var(--card);stroke:var(--line);stroke-width:4}.ui circle,.ui rect{fill:color-mix(in srgb,var(--mut) 40%,transparent)}.zone{fill:color-mix(in srgb,var(--acc) 10%,transparent);stroke:var(--acc);stroke-width:3;stroke-dasharray:10 8}
.n{fill:var(--acc2);font:22px var(--mono);text-anchor:middle}.sub{fill:var(--ink);font:600 22px var(--sans);text-anchor:middle}`));
    }

    // Reframing: the landscape frame, the 9:16 window over it and the vertical frame it gives.
    {
      write("reframe", s, shell(L, "reframe", `<div class="wrap">${head(t(T("--format vertical", "--format vertical")), t(T("Тот же сценарий, вертикальный кадр", "The same scenario, a vertical frame")))}
<div class="rf"><div class="land rv" data-at="b1"><img src="../demo/out/demo${s}.stills/03-live-b2p1.png"><div class="win" id="win"></div><span>${t(T("горизонтальный кадр", "the landscape frame"))}</span></div>
<div class="arrow glow">→</div><div class="vert rv" data-at="b1+1.2"><img src="../demo/out/vertical${s}.stills/03-live-b2p1.png"><span>${t(T("вертикальный", "vertical"))}</span></div></div></div>`,
      `.rf{flex:1;display:flex;align-items:center;justify-content:center;gap:36px}.land{position:relative;width:1000px}.land img{width:100%;border-radius:14px;display:block}
.win{position:absolute;top:0;height:100%;width:31.6%;border:5px solid var(--acc);border-radius:10px;box-shadow:0 0 0 2000px color-mix(in srgb,var(--bg) 60%,transparent)}
.land{overflow:hidden;border-radius:14px}.vert{height:600px}.vert img{height:560px;border-radius:14px;display:block}
.land span,.vert span{display:block;margin-top:8px;color:var(--mut);font-size:24px;text-align:center}.arrow{font-size:80px;color:var(--acc)}`,
      `window.onRender = (t, at) => { const a = at(document.querySelector(".land")); const k = Math.max(0, Math.min(1, (t - a - 0.8) / 2.4));
  const e = k * k * (3 - 2 * k); document.getElementById("win").style.left = (34 + e * 30).toFixed(2) + "%"; };`));
    }

    // Control frames named in the scenario, as the build wrote them.
    {
      const r = JSON.parse(readFileSync(join(OUT, `demo${s}.report.json`), "utf8"));
      const pick = r.stills.slice(0, 4);
      write("stills", s, shell(L, "stills", `<div class="wrap">${head(t(T("stills: момент :: что проверить", "stills: moment :: what to check")), t(T("Контрольные кадры рядом с роликом", "Control frames beside the film")))}
<div class="grid">${pick.map((x, i) => `<figure class="rv" data-at="b1+${(0.3 + i * 0.4).toFixed(1)}"><img src="../demo/out/demo${s}.stills/${x.file.split("/").pop()}"><figcaption><b class="mono">${esc(x.scene)} · ${esc(x.moment)}</b> ${esc(x.note)}</figcaption></figure>`).join("")}</div></div>`,
      `.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px 40px;align-items:start;width:840px;margin:-10px auto 0}figure{margin:0}figure img{width:100%;border-radius:12px;border:2px solid var(--line);display:block}
figcaption{margin-top:10px;font-size:23px;color:var(--body)}figcaption b{display:block;color:var(--acc2);font-weight:500}`));
    }

    // The build report of the vertical sample film, its warnings lit.
    {
      const r = JSON.parse(readFileSync(join(OUT, `vertical${s}.report.json`), "utf8"));
      const lines = ['"scenes": ['];
      for (const x of r.scenes) {
        lines.push(`  { "id": "${x.id}", "start": ${x.start}, "end": ${x.end}, "frames": ${x.frames}${x.reframe ? ', "reframe": true' : ""}${x.spotlights ? `, "spotlights": ${JSON.stringify(x.spotlights)}` : ""} }`);
        if (x.legibility) lines.push({ t: `    "legibility": ${JSON.stringify(x.legibility)}`, cls: "warn" });
        if (x.cut) lines.push({ t: `    "cut": [{ "target": "${x.cut[0].target}", "text": ${JSON.stringify(x.cut[0].text.slice(0, 2)).replace(/]$/, ", …]")} }]`, cls: "warn" });
      }
      lines.push("],", `"marks": ${JSON.stringify(r.marks.map((m) => `${m.mark} → ${m.film}s`))},`, `"stills": ${r.stills.length}, "srt": "${short(r.srt).split("/").pop()}", "duration": ${r.duration}`);
      write("report-json", s, shell(L, "report", `<div class="wrap">${terminal([
        { cmd: `cat vertical${s}.report.json`, at: "b1", lines: lines.map((x) => (typeof x === "string" ? { t: x } : x)), every: 0.2 },
      ], t(T("отчёт сборки — выдержка", "the build report — an excerpt")))}</div>`, `.term pre{font-size:24px}`));
    }

    // Subtitles and chapters beside the film.
    {
      const srt = read(`demo${s}.srt`).trim().split("\n").slice(0, 11);
      const vtt = read(`demo${s}.chapters.vtt`).trim().split("\n");
      const col = (name, ls, at) => `<div class="panel f rv" data-at="${at}"><div class="tab mono">${name}</div><pre class="mono">${ls.map(esc).join("\n")}</pre></div>`;
      write("files", s, shell(L, "files", `<div class="wrap">${head(t(T("Рядом с роликом", "Beside the film")), t(T("Субтитры и главы — файлами", "Subtitles and chapters as files")))}
<div class="files">${col(`demo${s}.srt`, srt, "b1")}${col(`demo${s}.chapters.vtt`, vtt, "b1+1.2")}</div></div>`,
      `.files{display:grid;grid-template-columns:1.25fr 1fr;gap:30px;flex:1}.f{overflow:hidden}.f pre{margin:10px 0 0;font-size:23px;line-height:1.45;color:var(--body);white-space:pre-wrap}
.tab{display:inline-block;padding:4px 14px;border-radius:10px;background:color-mix(in srgb,var(--acc) 14%,var(--card));color:var(--acc2);font-size:22px}`));
    }

    // Licences: the three questions and this film's credits.
    {
      const q = t(T(["Какая лицензия у этого файла — у файла, а не у сайта?", "Нужен ли кредит и где?", "Разрешено ли такое использование: NC, ND, SA, товарные знаки?"],
        ["What licence does this file carry — the file's, not the site's?", "Is credit required, and where?", "Is this use allowed: NC, ND, SA, trademarks?"]));
      const credits = readFileSync(join(HERE, "assets", "CREDITS.md"), "utf8").split("\n").filter((x) => /^\| (film-bed|trailer-bed|sfx\/|party)/.test(x))
        .map((x) => x.split("|").map((c) => c.trim())).map((c) => `${c[2]} · ${c[3].split(",")[0]} · ${c[4].split(",")[0]}`);
      write("credits", s, shell(L, "credits", `<div class="wrap">${head(t(T("Перед каждым скачанным файлом", "Before any downloaded file")), t(T("Не знаешь лицензию — не берёшь файл", "No known licence, no file")))}
<div class="two"><ol class="panel q">${q.map((x, i) => `<li class="rv" data-at="b1+${(0.3 + i * 1.4).toFixed(1)}">${esc(x)}</li>`).join("")}</ol>
<div class="panel c rv" data-at="b2"><div class="tab mono">assets/CREDITS.md</div>${credits.map((x) => `<p>${esc(x)}</p>`).join("")}</div></div></div>`,
      `.two{display:grid;grid-template-columns:1fr 1.15fr;gap:30px;flex:1}.q{margin:0;padding:28px 28px 28px 70px;font-size:30px}.q li{margin:0 0 22px}
.c p{margin:10px 0;font-size:21px;color:var(--body)}.tab{display:inline-block;padding:4px 14px;border-radius:10px;background:color-mix(in srgb,var(--acc) 14%,var(--card));color:var(--acc2);font-size:22px}`));
    }

    // The request to your agent, quoted from the README.
    {
      const ask = t(T("Поставь скилл Agentic Screencast из skills/agentic-screencast этого репозитория и сними по нему минутный ролик о нашем экспорте",
        "Install the Agentic Screencast skill from skills/agentic-screencast in this repository and use it to make a one-minute film about our export feature."));
      const next = t(T(["бриф", "заготовка жанра", "немой черновик", "проверенный MP4"], ["the brief", "a genre skeleton", "a silent draft", "a checked MP4"]));
      write("request", s, shell(L, "request", `<div class="wrap">${head(t(T("Пример просьбы из README", "An example request from the README")), t(T("Первый ролик начинается с одной фразы", "The first film starts with one sentence")))}
<div class="bubble panel pop" data-at="b1"><span class="who">${t(T("Вы → агенту", "You → your agent"))}</span><p data-at="b1+0.3" data-type="${esc(ask)}" data-cps="34"></p></div>
<div class="next">${next.map((x, i) => `<span class="rv" data-at="b2+${(0.2 + i * 0.6).toFixed(1)}">${esc(x)}</span>`).join('<b class="rv" data-at="b2">→</b>')}</div></div>`,
      `.bubble{max-width:1400px;border-radius:30px 30px 30px 8px;background:var(--card)}.who{color:var(--acc);font-size:24px}.bubble p{margin:10px 0 0;font-size:38px;line-height:1.35;color:var(--ink);min-height:3em}
.next{display:flex;align-items:center;gap:22px;font-size:32px}.next span{padding:10px 22px;border-radius:999px;background:color-mix(in srgb,var(--acc) 14%,var(--card));color:var(--body)}.next b{color:var(--acc)}`));
    }
  }
}

// The checklist page is made last, from the filled checklist of this film.
function checklistPage() {
  const lines = readFileSync(join(HERE, "checklist.md"), "utf8").split("\n");
  const open = lines.filter((x) => /^- \[ \]/.test(x)).length;
  const closed = lines.filter((x) => /^- \[x\]/.test(x));
  const pick = [...closed.slice(0, 4), ...closed.filter((x) => /Spotlight|Live capture|Transitions|Captions/.test(x)).slice(0, 4), ...closed.filter((x) => /^- \[x\] (1|19|40|53|56)\./.test(x))].slice(0, 10);
  for (const [L, s] of LANGS) {
    const t = (ru, en) => (L === "ru" ? ru : en);
    const rows = pick.map((x, i) => {
      const text = x.replace(/^- \[x\] /, "");
      return `<div class="item rv" data-at="${i < 5 ? "b1" : "b2"}+${(0.2 + (i % 5) * 0.45).toFixed(2)}"><span class="box"><i></i></span><span class="txt">${esc(text.length > 150 ? `${text.slice(0, 148)}…` : text)}</span></div>`;
    }).join("");
    write("checklist", s, shell(L, "checklist", `<div class="wrap">${head("checklist.md", t("Чеклист этого фильма", "This film's checklist"))}
<div class="panel list">${rows}</div>
<div class="count mono rv" data-at="b2.end-1.5"><span class="prompt">$</span> grep -c "\\- \\[ \\]" checklist.md → <b>${open}</b> <span class="mut">${t(`открыто сейчас: пункты, которые проверяются на кадрах собранного ролика`, `open now: the boxes checked on the frames of the built film`)}</span></div></div>`,
    `.list{flex:1;overflow:hidden;padding:18px 26px}.item{display:grid;grid-template-columns:48px 1fr;gap:14px;align-items:start;margin:8px 0;font-size:23px;line-height:1.35;color:var(--body)}
.box{width:34px;height:34px;border:3px solid var(--acc);border-radius:8px;display:grid;place-items:center;margin-top:2px}
.box i{width:16px;height:9px;border-left:4px solid var(--acc);border-bottom:4px solid var(--acc);transform:rotate(-45deg) scale(var(--k,0));margin-top:-4px}
.count{font-size:26px;color:var(--body)}.count b{color:var(--acc2);font-size:30px}.prompt{color:var(--acc)}`));
  }
}

// Portrait pages use the same real command output and checklist as their landscape originals.
// This pass can run from the checked-in pages before the demo takes have been recorded.
function portraitPages(onlyName, onlyLang) {
  const page = (name, s) => readFileSync(join(PAGES, `${name}${s}.html`), "utf8");
  const writePortrait = (name, s, html) => writeFileSync(join(PAGES, `${name}.vertical${s}.html`), html);
  const portraitCss = `.wrap{left:80px;right:80px;top:112px;bottom:360px;gap:32px}
.head small{font-size:34px}.head h1{font-size:58px}`;
  for (const [L, s] of LANGS) {
    if (onlyLang && onlyLang !== L) continue;
    const terminalPage = page("term-new", s);
    if (!onlyName || onlyName === "term-new") writePortrait("term-new", s, terminalPage.replace("</style>", `${portraitCss}
.term .bar{font-size:36px;padding:22px}.term pre,.term.short pre{font-size:49px;line-height:1.3;padding:28px;overflow-wrap:anywhere;white-space:pre-wrap}
</style>`));

    if (!onlyName || onlyName === "checklist") {
      const checks = readFileSync(join(HERE, "checklist.md"), "utf8");
      const portraitChecks = [
        { source: "Every dimension of the brief", ru: "У каждого решения в брифе есть источник", en: "Each brief decision has a source" },
        { source: "Built with the chosen voice", ru: "Финальный ролик и кадры проверены", en: "The final film and frames are checked" },
        { source: "`agentic-screencast lint story.md`", ru: "Сценарий проверен линтером", en: "The story passes the linter" },
      ];
      for (const item of portraitChecks) {
        if (!checks.split("\n").some((line) => line.startsWith(`- [x] ${item.source}`)))
          throw new Error(`checklist.md: closed item missing: ${item.source}`);
      }
      const rows = portraitChecks.map((item, i) => `<div class="item rv" data-at="b${i === 0 ? 1 : 2}+${i * 0.4 + 0.2}"><span class="box"><i></i></span><span class="txt">${esc(item[L])}</span></div>`).join("");
      const checklist = page("checklist", s).replace(/<div class="panel list">[\s\S]*?<\/div>\n<div class="count/, `<div class="panel list">${rows}</div>\n<div class="count`);
      if (!checklist.includes(rows)) throw new Error(`checklist${s}.html: list panel missing`);
      writePortrait("checklist", s, checklist.replace("</style>", `${portraitCss}
.wrap{bottom:480px}
.list{flex:none;padding:32px}.item{grid-template-columns:54px 1fr;gap:20px;margin:24px 0;font-size:50px;line-height:1.22}
.box{width:42px;height:42px}.count{font-size:38px}.count b{font-size:44px}
</style>`));
    }

    if (onlyName && onlyName !== "anchors") continue;
    // The two measured durations come from the same generated timing diagram, then reflow
    // into stacked, phone-sized tracks. The second track remains longer when the voice slows.
    const widths = [...page("anchors", s).matchAll(/<rect x="[^"]+" y="(?:140|400)" width="([^"]+)" height="56" rx="12" class="b[12]"\/>/g)]
      .map((m) => Number(m[1]));
    const sourceTicks = [...page("anchors", s).matchAll(/<line x1="([^"]+)" x2="[^"]+" y1="(?:128|388)" y2="(?:210|470)" class="tick"\/>/g)]
      .map((m) => Number(m[1]));
    const sourceOutline = [...page("anchors", s).matchAll(/<rect x="250" y="(?:140|400)" width="([^"]+)" height="56" rx="12" class="sc"\/>/g)]
      .map((m) => Number(m[1]));
    if (widths.length !== 4 || widths.some((w) => !Number.isFinite(w) || w <= 0))
      throw new Error(`anchors${s}.html: measured timing bars are missing`);
    if (sourceTicks.length !== 10 || sourceTicks.some((x) => !Number.isFinite(x)) || sourceOutline.length !== 2)
      throw new Error(`anchors${s}.html: positioned timing marks are missing`);
    const scale = 820 / (widths[2] + widths[3]);
    const track = (at, y, label, a, b, sourceMarks, outline) => {
      const first = Math.round(a * scale), second = Math.round(b * scale);
      const [start, share, beat2, afterBeat2, end] = sourceMarks.map((x) => Math.round((x - 250) * scale));
      const camera = L === "ru" ? "наезд @ b2" : "push-in @ b2";
      return `<g class="rv" data-at="${at}"><text x="0" y="${y}" class="label">${esc(label)}</text>
<rect x="0" y="${y + 35}" width="${first}" height="100" rx="16" class="first"/>
<rect x="${first}" y="${y + 35}" width="${second}" height="100" rx="16" class="second"/>
<text x="24" y="${y + 104}" class="beat">b1</text><text x="${first + 24}" y="${y + 104}" class="beat">b2</text>
<rect x="0" y="${y + 35}" width="${Math.round(outline * scale)}" height="100" rx="16" class="outline"/>
${[start, share, beat2, afterBeat2, end].map((x) => `<line x1="${x}" x2="${x}" y1="${y + 25}" y2="${y + 151}" class="tick"/>`).join("")}
<text x="${share}" y="${y + 220}" class="mark" text-anchor="middle">40%</text>
<text x="${afterBeat2 + 22}" y="${y + 293}" class="mark" text-anchor="start">b2+0.4</text>
<text x="${end}" y="${y + 220}" class="mark" text-anchor="end">b2.end</text>
<path d="M ${beat2} ${y + 152} V ${y + 316}" class="leader"/>
<rect x="${beat2 - 190}" y="${y + 316}" width="380" height="64" rx="16" class="chip"/>
<text x="${beat2}" y="${y + 361}" class="callout" text-anchor="middle">${camera}</text></g>`;
    };
    const title = L === "ru" ? "Моменты называются по речи" : "Moments follow the speech";
    const labelFast = L === "ru" ? "15 знаков/с" : "15 chars/s";
    const labelSlow = L === "ru" ? "10 знаков/с" : "10 chars/s";
    writePortrait("anchors", s, shell(L, "anchors", `<div class="wrap portrait">
${head(L === "ru" ? "Якоря" : "Anchors", title)}
<svg viewBox="0 0 900 1080" aria-label="${esc(title)}">${track("b1", 100, labelFast, widths[0], widths[1], sourceTicks.slice(0, 5), sourceOutline[0])}${track("b2", 550, labelSlow, widths[2], widths[3], sourceTicks.slice(5), sourceOutline[1])}</svg>
</div>`, `${portraitCss}
.portrait svg{width:100%;height:auto;max-height:1250px;flex:1;overflow:visible}
.label{font:600 56px var(--sans);fill:var(--ink)}.beat{font:700 54px var(--mono);fill:var(--bg)}
.mark{font:48px var(--mono);fill:var(--body)}.first{fill:var(--acc2)}.second{fill:var(--acc)}
.outline{fill:none;stroke:var(--line);stroke-width:5;stroke-dasharray:12 12}
.tick,.leader{stroke:var(--acc2);stroke-width:5}.leader{fill:none;stroke-dasharray:8 8}
.chip{fill:var(--card);stroke:var(--acc2);stroke-width:4}.callout{fill:var(--ink);font:600 48px var(--sans)}`));
  }
}

if (args.includes("--demo")) { variants(); demo(); }
if (args.length === 0) { variants(); outputs(); await images(); }
if (args.length === 0 || args.includes("--pages")) { pages(); if (existsSync(join(HERE, "checklist.md"))) checklistPage(); portraitPages(); }
if (args.includes("--portrait-pages")) portraitPages(args[args.indexOf("--portrait-pages") + 1], args[args.indexOf("--portrait-pages") + 2]);
if (args.includes("--frames")) frames();
console.log("material ready");
