// Именованные темы оформления: один выбор вместо двух десятков переменных.
//
// Почему это живёт в продукте, а не в сценарии. Оформление ролика — это
// согласованный набор: фон, гамма текста, форма карточек, подписи, заставка,
// слой композиции. Набранный по одной переменной вручную, он расходится
// сам с собой — подпись из одной палитры, выноска из другой, — и кадр
// выглядит неряшливо, сколько бы времени на него ни потратили. Тема
// называется одним словом и задаёт весь набор сразу.
//
// Тема — это ПЕРЕМЕННЫЕ, а не правила: их толкует тот, кто рисует, —
// страница слайдов и слой композиции. Поэтому добавление темы не трогает
// ни разметку, ни рендер.

/** Переменные оформления: имя без ведущих дефисов допускается. */
export type ThemeVars = Record<string, string>;

/**
 * Договор темы: какие переменные она обязана задать.
 *
 * Список нужен не для красоты: тема, забывшая переменную, молча отдаёт
 * кадр с чужим цветом из умолчания правил, и заметно это только глазами
 * на готовом ролике. Проверка сверяет каждую тему с этим списком.
 */
export const THEME_KEYS = [
  // страница слайдов
  "--bg", "--glow", "--ink", "--body", "--mut", "--line",
  "--card", "--node", "--node-line", "--acc", "--acc2", "--bad", "--good",
  "--sans", "--mono", "--display",
  // слой композиции поверх любого материала
  "--sc-spot", "--sc-dim", "--sc-accent-soft", "--sc-fade",
  "--sc-cap-bg", "--sc-cap-line", "--sc-cap-ink", "--sc-cap-bar",
  "--sc-card-bg", "--sc-card-line", "--sc-card-ink", "--sc-card-body",
  "--sc-card-accent", "--sc-card-radius", "--sc-card-shadow",
] as const;

/**
 * Ночная тема — то, как инструмент выглядел до появления выбора.
 * Остальные темы задаются как отличия от неё, поэтому новая переменная
 * в договоре не требует правки каждой темы по отдельности.
 */
const MIDNIGHT: ThemeVars = {
  "--bg": "#0b0e14",
  "--glow": "#16203a",
  "--ink": "#f2f5fb",
  "--body": "#c7cfdd",
  "--mut": "#8b97ad",
  "--line": "#2a3446",
  "--card": "#121826",
  "--node": "#141c2c",
  "--node-line": "#34405a",
  "--acc": "#7aa2ff",
  "--acc2": "#4fd1c5",
  "--bad": "#ff8a9b",
  "--good": "#7ee0a7",
  "--sans": 'system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
  "--mono": 'ui-monospace,"SF Mono",Menlo,Consolas,monospace',
  "--display": 'system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
  "--sc-spot": "rgba(122,162,255,.95)",
  "--sc-dim": "rgba(6,9,15,.55)",
  "--sc-accent-soft": "rgba(122,162,255,.5)",
  "--sc-fade": "#0d1017",
  "--sc-cap-bg": "linear-gradient(180deg,rgba(27,36,52,.97),rgba(18,24,34,.97))",
  "--sc-cap-line": "#3a4a6b",
  "--sc-cap-ink": "#eaeef7",
  "--sc-cap-bar": "linear-gradient(90deg,#7aa2ff,#4fd1c5)",
  "--sc-card-bg": "linear-gradient(135deg,rgba(9,24,44,.96),rgba(13,33,54,.93))",
  "--sc-card-line": "rgba(110,211,226,.58)",
  "--sc-card-ink": "#f6fbff",
  "--sc-card-body": "#cce1ee",
  "--sc-card-accent": "linear-gradient(90deg,#58d9de,#85a8ff)",
  "--sc-card-radius": "18px",
  "--sc-card-shadow": "0 18px 48px rgba(4,12,25,.42),inset 0 1px rgba(255,255,255,.08)",
};

/**
 * Спокойная бумажная тема: тёплый светлый фон, тёмная типографика,
 * один глиняный акцент. Годится там, где ролик смотрят как документ,
 * а не как трейлер: объяснение, разбор, внутренняя демонстрация.
 */
const CALM_PAPER: ThemeVars = {
  ...MIDNIGHT,
  "--bg": "#f4f1ea",
  "--glow": "#e8e2d5",
  "--ink": "#1b1a17",
  "--body": "#3c3a34",
  "--mut": "#7c7767",
  "--line": "#ded7c8",
  "--card": "#fbf9f4",
  "--node": "#ffffff",
  "--node-line": "#ddd5c4",
  "--acc": "#c2643f",
  "--acc2": "#4b7a6a",
  "--bad": "#a8452f",
  "--good": "#3f7a57",
  "--display": 'ui-serif,Georgia,"Iowan Old Style","Times New Roman",serif',
  "--sc-spot": "rgba(194,100,63,.95)",
  "--sc-dim": "rgba(28,24,18,.42)",
  "--sc-accent-soft": "rgba(194,100,63,.42)",
  "--sc-fade": "#f4f1ea",
  "--sc-cap-bg": "linear-gradient(180deg,rgba(251,249,244,.98),rgba(244,241,234,.98))",
  "--sc-cap-line": "#ded7c8",
  "--sc-cap-ink": "#1b1a17",
  "--sc-cap-bar": "linear-gradient(90deg,#c2643f,#4b7a6a)",
  "--sc-card-bg": "linear-gradient(135deg,rgba(255,253,248,.98),rgba(246,242,233,.97))",
  "--sc-card-line": "rgba(194,100,63,.42)",
  "--sc-card-ink": "#1b1a17",
  "--sc-card-body": "#4a473f",
  "--sc-card-accent": "linear-gradient(90deg,#c2643f,#d99b6c)",
  "--sc-card-radius": "14px",
  "--sc-card-shadow": "0 16px 40px rgba(60,48,32,.16)",
};

/**
 * Синтвейв: густой фиолетовый фон, неоновые пурпур и бирюза.
 * Для роликов, которым нужен трейлерный тон, — но контраст текста
 * остаётся светлым на тёмном, а не неон на неоне: подпись обязана
 * читаться, а не светиться.
 */
const SYNTHWAVE: ThemeVars = {
  ...MIDNIGHT,
  "--bg": "#140b27",
  "--glow": "#3c1266",
  "--ink": "#fdf4ff",
  "--body": "#d9c8f0",
  "--mut": "#9b86c4",
  "--line": "#3e2a63",
  "--card": "#1d1036",
  "--node": "#241443",
  "--node-line": "#5a3597",
  "--acc": "#ff4fd8",
  "--acc2": "#37e0ff",
  "--bad": "#ff6b8a",
  "--good": "#6cf0c2",
  "--sc-spot": "rgba(255,79,216,.95)",
  "--sc-dim": "rgba(10,4,24,.6)",
  "--sc-accent-soft": "rgba(55,224,255,.5)",
  "--sc-fade": "#0a0418",
  "--sc-cap-bg": "linear-gradient(180deg,rgba(38,18,70,.96),rgba(22,10,44,.96))",
  "--sc-cap-line": "#6a3fb0",
  "--sc-cap-ink": "#fdf4ff",
  "--sc-cap-bar": "linear-gradient(90deg,#ff4fd8,#37e0ff)",
  "--sc-card-bg": "linear-gradient(135deg,rgba(44,16,82,.96),rgba(20,8,42,.94))",
  "--sc-card-line": "rgba(255,79,216,.6)",
  "--sc-card-ink": "#fdf4ff",
  "--sc-card-body": "#d6c2f2",
  "--sc-card-accent": "linear-gradient(90deg,#ff4fd8,#37e0ff)",
  "--sc-card-radius": "16px",
  "--sc-card-shadow": "0 20px 54px rgba(60,8,90,.55),inset 0 1px rgba(255,255,255,.1)",
};

/**
 * Деловой мрачный: почти чёрный фон, холодный серый текст, один
 * сдержанный янтарный акцент. Для показов, где важен предмет,
 * а не оформление.
 */
const NOIR: ThemeVars = {
  ...MIDNIGHT,
  "--bg": "#0a0a0b",
  "--glow": "#17181c",
  "--ink": "#f4f4f5",
  "--body": "#bcbcc2",
  "--mut": "#7c7c85",
  "--line": "#26272c",
  "--card": "#121316",
  "--node": "#141518",
  "--node-line": "#2e2f36",
  "--acc": "#e0a458",
  "--acc2": "#9fb2c8",
  "--bad": "#d4726a",
  "--good": "#8fb996",
  "--sc-spot": "rgba(224,164,88,.95)",
  "--sc-dim": "rgba(0,0,0,.62)",
  "--sc-accent-soft": "rgba(224,164,88,.4)",
  "--sc-fade": "#000000",
  "--sc-cap-bg": "linear-gradient(180deg,rgba(20,21,24,.97),rgba(11,11,13,.97))",
  "--sc-cap-line": "#33343a",
  "--sc-cap-ink": "#f4f4f5",
  "--sc-cap-bar": "linear-gradient(90deg,#e0a458,#9fb2c8)",
  "--sc-card-bg": "linear-gradient(135deg,rgba(23,24,28,.97),rgba(12,12,14,.95))",
  "--sc-card-line": "rgba(224,164,88,.45)",
  "--sc-card-ink": "#f4f4f5",
  "--sc-card-body": "#b6b6be",
  "--sc-card-accent": "linear-gradient(90deg,#e0a458,#6f7683)",
  "--sc-card-radius": "10px",
  "--sc-card-shadow": "0 18px 44px rgba(0,0,0,.6)",
};

/** Поставляемые темы: имя → полный набор переменных. */
export const THEMES: Record<string, ThemeVars> = {
  midnight: MIDNIGHT,
  "calm-paper": CALM_PAPER,
  synthwave: SYNTHWAVE,
  noir: NOIR,
};

export const THEME_NAMES: string[] = Object.keys(THEMES);

/**
 * Тема ролика в том виде, в каком её пишут в шапке источника: имя темы,
 * свой набор переменных или имя вместе с точечными правками.
 */
export type ThemeInput = string | (ThemeVars & { preset?: string });

export class ThemeError extends Error {}

/** Имя переменной приводится к виду `--имя`: в шапке пишут и так, и так. */
const dashed = (key: string): string => (key.startsWith("--") ? key : `--${key}`);

/**
 * Тема → плоский набор переменных.
 *
 * Имя темы разрешается в её набор, свои переменные кладутся ПОВЕРХ него:
 * точечная правка одного цвета не должна означать, что автор обязан
 * переписать всю тему руками.
 */
export function resolveTheme(input: ThemeInput | undefined): ThemeVars {
  if (input === undefined) return {};
  if (typeof input === "string") return preset(input);
  const { preset: name, ...own } = input;
  const base = name === undefined ? {} : preset(name);
  const vars: ThemeVars = { ...base };
  for (const [key, value] of Object.entries(own)) vars[dashed(key)] = value;
  return vars;
}

function preset(name: string): ThemeVars {
  const found = THEMES[name.trim()];
  if (!found) {
    throw new ThemeError(`unknown theme «${name}»; available: ${THEME_NAMES.join(", ")}`);
  }
  return { ...found };
}
