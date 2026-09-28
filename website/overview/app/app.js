// Flow — the sample board the overview film records. One script for both languages and all views;
// the wrapper page sets window.FLOW = { lang, view } before loading it.
const FLOW = Object.assign({ lang: "en", view: "board" }, window.FLOW || {});
const T = {
  en: {
    sample: "Sample app", sprint: "Sprint 12 · 3 people", board: "Board", report: "Report",
    commands: "Commands", placeholder: "Add a task and press Enter", assignee: "Assignee", nobody: "nobody",
    people: [["AN", "Anna"], ["BO", "Boris"], ["CH", "Chen"]], estimate: "Estimate", hours: "h", add: "Add",
    todo: "To do", doing: "In progress", done: "Done", doneBtn: "Done", moved: "Moved to Done",
    cards: { todo: [["Write release notes", "AN", 3], ["Check the onboarding flow", "CH", 5], ["Review the pricing page", "BO", 2],
        ["Update the FAQ", "AN", 2], ["Prepare the customer demo", "CH", 6], ["Sort the support feedback", "CH", 4]],
      doing: [["Fix the invoice export", "BO", 8], ["Rewrite the welcome email", "AN", 3], ["Set up backups", "CH", 5],
        ["Move the calendar", "BO", 4], ["Translate the settings", "AN", 6], ["Clean up the logs", "BO", 2]],
      done: [["Ship the dark theme", "AN", 5], ["Speed up search", "CH", 8], ["Set up alerts", "BO", 3],
        ["Fix email sign-in", "AN", 3], ["Compress the images", "BO", 2], ["Add a dark logo", "CH", 1]] },
    palette: "Type a command", actions: ["Open report", "New task", "Filter by assignee", "Export sprint"],
    kpis: [["Tasks done", "18", "+4 this week"], ["Velocity", "42 h", "+18% vs last sprint"], ["Cycle time", "2.4 days", "−0.6 days"], ["Open incidents", "1", "overdue", "warn"]],
    chart: "Tasks closed by day", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    activity: "Recent activity", cols: ["Task", "Who", "Change", "When", "Note"],
    rows: [["Fix the invoice export", "Boris", "moved to In progress", "2 h ago", "blocked by the payments API", "late"],
      ["Ship the dark theme", "Anna", "moved to Done", "5 h ago", "released to all users"],
      ["Check the onboarding flow", "Chen", "estimate 5 h", "yesterday", "needs the new copy"],
      ["Review the pricing page", "Boris", "created", "yesterday", "from the sales call"],
      ["Write release notes", "Anna", "estimate 3 h", "yesterday", "due on Friday"],
      ["Ship the dark theme", "Chen", "review passed", "2 days ago", "two small fixes"],
      ["Fix the invoice export", "Boris", "created", "3 days ago", "a customer report"]],
    velocity: "Velocity", velocityNote: "+18% vs last sprint", live: "live",
  },
  ru: {
    sample: "Пример приложения", sprint: "Спринт 12 · 3 человека", board: "Доска", report: "Отчёт",
    commands: "Команды", placeholder: "Добавьте задачу и нажмите Enter", assignee: "Исполнитель", nobody: "никто",
    people: [["АН", "Анна"], ["БО", "Борис"], ["ЧЭ", "Чэнь"]], estimate: "Оценка", hours: "ч", add: "Добавить",
    todo: "К работе", doing: "В работе", done: "Готово", doneBtn: "Готово", moved: "Перенесено в «Готово»",
    cards: { todo: [["Написать заметки к релизу", "АН", 3], ["Проверить онбординг", "ЧЭ", 5], ["Сверить страницу цен", "БО", 2],
        ["Обновить раздел вопросов", "АН", 2], ["Подготовить демо для клиента", "ЧЭ", 6], ["Разобрать отзывы поддержки", "ЧЭ", 4]],
      doing: [["Починить выгрузку счетов", "БО", 8], ["Переписать приветственное письмо", "АН", 3], ["Настроить резервные копии", "ЧЭ", 5],
        ["Перенести календарь", "БО", 4], ["Перевести настройки", "АН", 6], ["Почистить логи", "БО", 2]],
      done: [["Выпустить тёмную тему", "АН", 5], ["Ускорить поиск", "ЧЭ", 8], ["Настроить оповещения", "БО", 3],
        ["Починить вход по почте", "АН", 3], ["Сжать картинки", "БО", 2], ["Добавить тёмный логотип", "ЧЭ", 1]] },
    palette: "Введите команду", actions: ["Открыть отчёт", "Новая задача", "Фильтр по исполнителю", "Выгрузить спринт"],
    kpis: [["Задач сделано", "18", "+4 за неделю"], ["Скорость", "42 ч", "+18% к прошлому спринту"], ["Время цикла", "2,4 дня", "−0,6 дня"], ["Открытых инцидентов", "1", "просрочен", "warn"]],
    chart: "Задачи, закрытые по дням", days: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
    activity: "Последние изменения", cols: ["Задача", "Кто", "Изменение", "Когда", "Заметка"],
    rows: [["Починить выгрузку счетов", "Борис", "перенесена в «В работе»", "2 ч назад", "ждёт API платежей", "late"],
      ["Выпустить тёмную тему", "Анна", "перенесена в «Готово»", "5 ч назад", "выпущена для всех"],
      ["Проверить онбординг", "Чэнь", "оценка 5 ч", "вчера", "нужны новые тексты"],
      ["Сверить страницу цен", "Борис", "создана", "вчера", "после звонка с продажами"],
      ["Написать заметки к релизу", "Анна", "оценка 3 ч", "вчера", "к пятнице"],
      ["Выпустить тёмную тему", "Чэнь", "ревью пройдено", "2 дня назад", "две мелкие правки"],
      ["Починить выгрузку счетов", "Борис", "создана", "3 дня назад", "жалоба клиента"]],
    velocity: "Скорость", velocityNote: "+18% к прошлому спринту", live: "в эфире",
  },
}[FLOW.lang];
document.documentElement.lang = FLOW.lang;
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
const card = ([title, who, h]) =>
  `<div class="card"><div><div class="t">${esc(title)}</div><div class="m"><span class="av">${esc(who)}</span>${h} ${T.hours}</div></div><button>${T.doneBtn}</button></div>`;
const col = (id, cls = "") =>
  `<div class="col ${cls}" id="${id}"><h3>${T[id]} <i>${T.cards[id].length}</i></h3>${T.cards[id].map(card).join("")}</div>`;
const bars = [3, 5, 4, 9, 6, 2, 1];
document.getElementById("app").innerHTML = `
<header><div class="logo"></div><b>Flow</b><span class="sample">${T.sample}</span><span class="sprint">${T.sprint}</span>
  <div class="tabs" role="tablist"><button id="tab-board" role="tab">${T.board}</button><button id="tab-report" role="tab">${T.report}</button></div>
  <span class="kbd"><span>⌘K</span>${T.commands}</span></header>
<main class="view" id="view-board">
  <div class="new"><input id="task" aria-label="${T.placeholder}" placeholder="${T.placeholder}">
    <div class="pick"><button id="assignee">${T.assignee}: <span id="who">${T.nobody}</span></button>
      <div class="menu" id="people">${T.people.map(([i, n]) => `<button data-i="${i}"><span class="av">${i}</span>${n}</button>`).join("")}</div></div>
    <label class="est">${T.estimate} <input id="estimate" type="range" min="1" max="16" value="3"><output id="est-out">3 ${T.hours}</output></label>
    <button class="add" id="add">${T.add}</button></div>
  <div class="cols">${col("todo")}${col("doing")}${col("done", "done")}</div>
</main>
<main class="view" id="view-report"><div class="report">
  <div class="kpis">${T.kpis.map(([l, v, n, w], i) => `<div class="kpi ${w || ""}" id="kpi-${i}"><small>${l}</small><b>${v}</b><em>${n}</em></div>`).join("")}</div>
  <div class="grid2">
    <div class="panel" id="chart"><h4><span class="live"></span>${T.chart}</h4><div class="bars">${bars.map((v, i) =>
      `<div class="bar ${v === 9 ? "hot" : ""}" id="bar-${i}"><b>${v}</b><i style="--h:${v * 9}%;animation-delay:${0.2 + i * 0.15}s"></i><span>${T.days[i]}</span></div>`).join("")}</div></div>
    <div class="panel" id="activity"><h4>${T.activity}</h4><table><tr>${T.cols.map((c) => `<th>${c}</th>`).join("")}</tr>${T.rows.map((r, i) =>
      `<tr id="row-${i}" class="${r[5] || ""}"><td>${esc(r[0])}</td><td>${r[1]}</td><td><span class="tag ${r[5] ? "bad" : ""}">${esc(r[2])}</span></td><td>${r[3]}</td><td>${esc(r[4])}</td></tr>`).join("")}</table></div>
  </div></div>
</main>
<main class="view" id="view-velocity"><div class="detail"><div class="kpi" id="kpi-1"><small>${T.velocity}</small><b>42 ${T.hours}</b><em>${T.velocityNote}</em>
  <svg viewBox="0 0 640 220"><path d="M10 190 L110 170 L210 176 L310 130 L410 118 L510 70 L630 30"/></svg></div></div></main>
<div class="toast" id="toast">${T.moved}</div>
<div class="palette" id="palette"><div class="box"><input id="cmd" placeholder="${T.palette}"><ul>${T.actions.map((a) => `<li>${a}</li>`).join("")}</ul></div></div>`;

const show = (view) => {
  for (const v of document.querySelectorAll(".view")) v.classList.toggle("on", v.id === `view-${view}`);
  $("#tab-board").classList.toggle("on", view === "board");
  $("#tab-report").classList.toggle("on", view !== "board");
};
show(FLOW.view);
$("#tab-board").onclick = () => show("board");
$("#tab-report").onclick = () => show("report");

const count = () => { for (const c of document.querySelectorAll(".col")) c.querySelector("h3 i").textContent = c.querySelectorAll(".card").length; };
let who = null;
const addTask = () => {
  const input = $("#task");
  if (!input.value.trim()) return;
  $("#todo").insertAdjacentHTML("beforeend", card([input.value.trim(), who || "—", $("#estimate").value]));
  input.value = "";
  count();
};
$("#task").addEventListener("keydown", (e) => { if (e.key === "Enter") addTask(); });
$("#add").onclick = addTask;
$("#assignee").onclick = () => $("#people").classList.toggle("open");
for (const b of document.querySelectorAll("#people button")) b.onclick = () => {
  who = b.dataset.i; $("#who").textContent = b.textContent.slice(b.dataset.i.length); $("#people").classList.remove("open");
};
$("#estimate").oninput = (e) => { $("#est-out").textContent = `${e.target.value} ${T.hours}`; };

const toast = () => { const t = $("#toast"); t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 1800); };
const moveTo = (c, target) => {
  c.style.animation = "none"; void c.offsetWidth; c.style.animation = "";
  target.appendChild(c); count();
  if (target.id === "done") toast();
};
document.addEventListener("click", (e) => {
  if (e.target.tagName === "BUTTON" && e.target.closest(".card")) moveTo(e.target.closest(".card"), $("#done"));
});

// Drag a card by the pointer: a ghost follows it and the column under the pointer takes it.
let drag = null;
document.addEventListener("pointerdown", (e) => {
  const c = e.target.closest(".card");
  if (!c || e.target.tagName === "BUTTON") return;
  e.preventDefault();
  const r = c.getBoundingClientRect();
  const ghost = c.cloneNode(true); ghost.classList.add("ghost");
  Object.assign(ghost.style, { width: `${r.width}px`, left: `${r.left}px`, top: `${r.top}px` });
  document.body.appendChild(ghost); c.classList.add("lifted");
  drag = { c, ghost, dx: e.clientX - r.left, dy: e.clientY - r.top };
});
const colAt = (x, y) => document.elementsFromPoint(x, y).find((el) => el.classList?.contains("col"));
document.addEventListener("pointermove", (e) => {
  if (!drag) return;
  drag.ghost.style.left = `${e.clientX - drag.dx}px`; drag.ghost.style.top = `${e.clientY - drag.dy}px`;
  for (const c of document.querySelectorAll(".col")) c.classList.toggle("hover", c === colAt(e.clientX, e.clientY));
});
document.addEventListener("pointerup", (e) => {
  if (!drag) return;
  const target = colAt(e.clientX, e.clientY);
  drag.ghost.remove(); drag.c.classList.remove("lifted");
  for (const c of document.querySelectorAll(".col")) c.classList.remove("hover");
  if (target && target !== drag.c.parentElement) moveTo(drag.c, target);
  drag = null;
});

// ⌘K opens the command palette; typing filters it, Enter runs the first match.
const palette = $("#palette"), cmd = $("#cmd");
const filter = () => {
  const q = cmd.value.trim().toLowerCase();
  let first = true;
  for (const li of palette.querySelectorAll("li")) {
    const hit = li.textContent.toLowerCase().includes(q);
    li.style.display = hit ? "" : "none";
    li.classList.toggle("sel", hit && first); if (hit) first = false;
  }
};
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); palette.classList.add("on"); cmd.value = ""; filter(); cmd.focus(); }
  else if (e.key === "Escape") palette.classList.remove("on");
});
cmd.addEventListener("input", filter);
cmd.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const sel = palette.querySelector("li.sel");
  palette.classList.remove("on");
  if (sel && sel.textContent === T.actions[0]) show("report");
});
