// Признаки дефектов лендинга, измеряемые на собранной странице.
//
// Каждый признак сначала НАХОДИТ элемент, о котором судит, и краснеет, если
// элемента нет: проверка, прошедшая по пустому месту, ничего не доказывает.
// Инвентарь дефектов и почему каждый признак такой — в рабочем пространстве
// задачи (decisions/landing-defects.md); здесь — только измерение.
//
// Функция `signals` исполняется в странице (page.evaluate) и возвращает
// список { id, ok, detail }.

/** Сколько тем поставляет инструмент: заявление страницы сверяется с кодом. */
export async function shippedThemes() {
  const { THEME_NAMES } = await import("../dist/theme.js");
  return THEME_NAMES;
}

export function signals({ themes, mobile }) {
  const out = [];
  const add = (id, ok, detail) => out.push({ id, ok: Boolean(ok), detail });
  const rect = (el) => el.getBoundingClientRect();
  const visible = (el) => { const r = rect(el); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
  const hero = document.querySelector("h1");
  const heroBox = hero?.closest("header, section, .hero, [class*='hero'], main > *") ?? hero?.parentElement;

  // D1. Заголовок и абзацы первого экрана выровнены одинаково.
  if (!hero) add("hero-alignment", false, "no h1");
  else {
    const paras = [...(heroBox?.querySelectorAll("p") ?? [])].filter((p) => visible(p) && p.textContent.trim().length > 20
      && rect(p).top < rect(hero).bottom + 700);
    const aligns = new Set([getComputedStyle(hero).textAlign.replace("start", "left"),
      ...paras.map((p) => getComputedStyle(p).textAlign.replace("start", "left"))]);
    add("hero-alignment", paras.length > 0 && aligns.size === 1, `h1 and ${paras.length} paragraphs: ${[...aligns].join(", ")}`);
  }

  // D2. Кнопки первого экрана стоят по той же оси, что и заголовок, а не прижаты к краю.
  const heroActions = [...document.querySelectorAll("a")].filter((a) => visible(a) && hero && rect(a).top > rect(hero).bottom
    && rect(a).top < rect(hero).bottom + 900 && /button|action|btn/i.test(a.className + " " + (a.parentElement?.className ?? "")));
  if (!hero || heroActions.length === 0) add("hero-actions-axis", false, "no actions under the heading");
  else {
    const l = Math.min(...heroActions.map((a) => rect(a).left)), r = Math.max(...heroActions.map((a) => rect(a).right));
    const h = rect(hero);
    const centred = getComputedStyle(hero).textAlign === "center";
    const off = centred ? Math.abs((l + r) / 2 - (h.left + h.right) / 2) : Math.abs(l - h.left);
    add("hero-actions-axis", off <= 24, `actions ${Math.round(l)}–${Math.round(r)} against heading ${Math.round(h.left)}–${Math.round(h.right)}: off by ${Math.round(off)}px`);
  }

  // D3. На странице видео продукта: не меньше трёх роликов с известной длительностью.
  const videos = [...document.querySelectorAll("video")];
  const known = videos.filter((v) => Number.isFinite(v.duration) && v.duration > 0);
  add("demo-videos", known.length >= 3, `${videos.length} video elements, ${known.length} with a known duration`);

  // D4. Кнопка копирования не закрывает код.
  const blocks = [...document.querySelectorAll("pre")].filter(visible);
  if (!blocks.length) add("copy-over-code", false, "no code block");
  else {
    const hits = [];
    for (const pre of blocks) {
      const button = pre.parentElement?.querySelector("button") ?? pre.querySelector("button");
      if (!button || !visible(button)) continue;
      const b = rect(button);
      const walk = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
      while (walk.nextNode()) {
        // Подпись самой кнопки — не код.
        if (button.contains(walk.currentNode)) continue;
        const range = document.createRange();
        range.selectNodeContents(walk.currentNode);
        for (const r of range.getClientRects()) {
          if (r.width > 0 && r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top) hits.push(walk.currentNode.textContent.trim().slice(0, 30));
        }
      }
    }
    add("copy-over-code", hits.length === 0, hits.length ? `covered: ${hits.slice(0, 3).join(" | ")}` : `${blocks.length} code blocks clear`);
  }

  // D5. Код выровнен по левому краю, а не по центру.
  const centredCode = blocks.filter((pre) => getComputedStyle(pre).textAlign === "center" || getComputedStyle(pre.querySelector("code") ?? pre).textAlign === "center");
  add("code-left-aligned", blocks.length > 0 && centredCode.length === 0, `${centredCode.length} of ${blocks.length} code blocks centred`);

  // D6. На телефоне команды установки видны целиком, без прокрутки внутри блока.
  if (mobile) {
    const start = document.querySelector("#start pre");
    add("start-code-fits-phone", start && start.scrollWidth <= start.clientWidth + 1,
      start ? `scrollWidth ${start.scrollWidth} vs ${start.clientWidth}` : "no #start code");
  }

  // D7. Раздел в две колонки не оставляет одну из них пустой.
  const sections = [...document.querySelectorAll("main section")].filter(visible);
  const lopsided = [];
  for (const s of sections) {
    // Колонки — прямые потомки раздела по разные стороны от его середины.
    const box = rect(s), mid = box.left + box.width / 2;
    const kids = [...s.children].filter((k) => visible(k) && rect(k).width < box.width * 0.6);
    const left = kids.filter((k) => rect(k).right <= mid + 8), right = kids.filter((k) => rect(k).left >= mid - 8);
    if (!left.length || !right.length) continue;
    const extent = (list) => Math.max(...list.map((k) => rect(k).bottom)) - box.top;
    const a = extent(left), b = extent(right);
    if (Math.min(a, b) < Math.max(a, b) * 0.45 && Math.max(a, b) - Math.min(a, b) > 300) lopsided.push(s.id || s.querySelector("h2")?.textContent?.slice(0, 30));
  }
  add("no-empty-column", !mobile ? lopsided.length === 0 : true, lopsided.length ? `half-empty: ${lopsided.join(", ")}` : `${sections.length} sections balanced`);

  // D8. В сетке карточек нет одинокой карточки в последнем ряду.
  const grids = [...document.querySelectorAll("main *")].filter((g) => {
    const cards = [...g.children].filter(visible);
    return cards.length >= 3 && getComputedStyle(g).display === "grid";
  });
  const orphans = [];
  for (const g of grids) {
    const cards = [...g.children].filter(visible);
    const rows = new Map();
    for (const c of cards) { const t = Math.round(rect(c).top); rows.set(t, (rows.get(t) ?? 0) + 1); }
    const counts = [...rows.values()];
    if (counts.length > 1 && counts[counts.length - 1] === 1 && counts[0] > 2) orphans.push(g.className.slice(0, 30));
  }
  add("no-orphan-card", grids.length > 0 && (mobile || orphans.length === 0), `${grids.length} grids, orphans: ${orphans.length}`);

  // D9. Заявления о составе совпадают с кодом: названо столько тем, сколько их есть.
  const text = document.body.innerText;
  const named = themes.filter((t) => new RegExp(`\\b${t}\\b`).test(text));
  const counted = /\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)\s+themes\b/i.exec(text);
  const words = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
  const claimed = counted ? (words[counted[1].toLowerCase()] ?? Number(counted[1])) : null;
  add("themes-claim-matches-code", named.length === themes.length && (claimed === null || claimed === themes.length),
    `themes named ${named.length} of ${themes.length}${claimed !== null ? `, claims ${claimed}` : ""}`);

  // D10. Кнопки одной группы одной высоты и стоят по одной линии.
  const groups = new Map();
  for (const a of [...document.querySelectorAll("main a")].filter(visible)) {
    const g = a.parentElement;
    if (!/action|button|btn/i.test(`${a.className} ${g?.className ?? ""}`)) continue;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(a);
  }
  const ragged = [];
  for (const [g, list] of groups) {
    if (list.length < 2) continue;
    const hs = list.map((a) => Math.round(rect(a).height));
    const tops = new Set(list.map((a) => Math.round(rect(a).top)));
    const lefts = new Set(list.map((a) => Math.round(rect(a).left)));
    // Группа, перенесённая на несколько строк, выровнена, если каждая строка
    // начинается у одного края; прежний дефект — лесенка по правому краю.
    const rowStarts = new Set([...tops].map((t) => Math.round(Math.min(...list.filter((a) => Math.round(rect(a).top) === t).map((a) => rect(a).left)))));
    const oneRow = tops.size === 1, oneColumn = lefts.size === 1 || rowStarts.size === 1;
    const inside = list.every((a) => a.scrollWidth <= a.clientWidth + 1);
    if (Math.max(...hs) - Math.min(...hs) > 2 || !(oneRow || oneColumn) || !inside) ragged.push(`${(g?.className ?? "").slice(0, 24)} h=${hs.join("/")} rows=${tops.size} cols=${lefts.size}`);
  }
  add("button-groups-aligned", groups.size > 0 && ragged.length === 0, ragged.length ? ragged.join("; ") : `${groups.size} groups aligned`);

  // D11. У каждой ссылки есть цель; на странице нет горизонтальной прокрутки.
  const dead = [...document.querySelectorAll("a")].filter((a) => !a.getAttribute("href") || a.getAttribute("href") === "#");
  add("links-have-targets", dead.length === 0, `${dead.length} links without a target`);
  add("no-horizontal-scroll", document.documentElement.scrollWidth <= innerWidth, `scrollWidth ${document.documentElement.scrollWidth} at ${innerWidth}`);
  return out;
}
