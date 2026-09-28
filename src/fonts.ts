// Шрифты тем — из поставляемого набора, а не с машины.
//
// Прежде темы называли системные шрифты (system-ui, ui-serif, ui-monospace), и один и тот же ролик
// на macOS рисовался SF Pro, а на машине сборки без этих шрифтов — чем найдётся; шесть тем из восьми
// к тому же выглядели одинаково. Теперь у каждой темы свои шрифты заголовков, текста и кода из набора
// assets/fonts (OFL, латиница и кириллица), и страница получает их вшитыми, без сети — так же, как
// эмодзи из набора Noto.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Каталог набора: рядом с dist в пакете и в репозитории. */
export function fontDir(): string {
  return resolve(HERE, "..", "assets", "fonts");
}

/** Шрифт набора: имя семейства в CSS, основа имени файлов и диапазон насыщенности. */
export interface BundledFont {
  family: string;
  id: string;
  /** переменный шрифт: один файл на алфавит, любая насыщенность из диапазона */
  weights: [number, number];
  /** статический шрифт: отдельный файл на каждую насыщенность (`<id>-<алфавит>-<вес>.woff2`) */
  static?: number[];
  /** есть курсив (`<id>-italic-<алфавит>.woff2`) */
  italic?: boolean;
}

export const FONTS: BundledFont[] = [
  { family: "Geologica", id: "geologica", weights: [100, 900] },
  { family: "IBM Plex Sans", id: "ibm-plex-sans", weights: [100, 700] },
  { family: "JetBrains Mono", id: "jetbrains-mono", weights: [100, 800] },
  { family: "Playfair", id: "playfair", weights: [300, 900], italic: true },
  { family: "Literata", id: "literata", weights: [200, 900] },
  { family: "PT Mono", id: "pt-mono", weights: [400, 400] },
  { family: "Unbounded", id: "unbounded", weights: [200, 900] },
  { family: "Exo 2", id: "exo-2", weights: [100, 900] },
  { family: "Press Start 2P", id: "press-start-2p", weights: [400, 400] },
  { family: "Cormorant Garamond", id: "cormorant-garamond", weights: [300, 700] },
  { family: "Jost", id: "jost", weights: [100, 900] },
  { family: "Raleway", id: "raleway", weights: [100, 900] },
  { family: "Commissioner", id: "commissioner", weights: [100, 900] },
  { family: "Victor Mono", id: "victor-mono", weights: [100, 700] },
  { family: "Manrope", id: "manrope", weights: [200, 800] },
  { family: "Golos Text", id: "golos-text", weights: [400, 900] },
  { family: "Geist Mono", id: "geist-mono", weights: [100, 900] },
  { family: "Oswald", id: "oswald", weights: [200, 700] },
  { family: "Rubik", id: "rubik", weights: [300, 900] },
  { family: "Tektur", id: "tektur", weights: [400, 900] },
  { family: "Fira Sans", id: "fira-sans", weights: [400, 800], static: [400, 500, 600, 700, 800] },
  { family: "Martian Mono", id: "martian-mono", weights: [100, 800] },
  { family: "Forum", id: "forum", weights: [400, 400] },
  { family: "Onest", id: "onest", weights: [100, 900] },
];

/** Какие знаки берёт каждый файл: те же диапазоны, что у Fontsource, откуда набор взят. */
const RANGES: Record<string, string> = {
  latin: "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
  cyrillic: "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116",
};

/** Семейства набора, которые называет тема в `--display`, `--sans`, `--mono` (и где бы то ни было ещё). */
export function themeFamilies(theme: Record<string, string> | undefined): BundledFont[] {
  const text = Object.values(theme ?? {}).join(" ");
  return FONTS.filter((f) => new RegExp(`["']${f.family}["']`).test(text));
}

const cache = new Map<string, string>();
const dataUri = (file: string): string => {
  const hit = cache.get(file);
  if (hit) return hit;
  const uri = `data:font/woff2;base64,${readFileSync(file).toString("base64")}`;
  cache.set(file, uri);
  return uri;
};

/**
 * Правила @font-face для шрифтов темы, с файлами, вшитыми в правило: страница не ходит ни в сеть,
 * ни на диск (дубль живой съёмки идёт по адресу продукта, откуда файлы машины недоступны).
 */
export function fontFaceCss(theme: Record<string, string> | undefined): string {
  const out: string[] = [];
  for (const f of themeFamilies(theme)) {
    for (const sub of Object.keys(RANGES)) {
      const face = (file: string, weight: string, style = "normal"): void => {
        if (!existsSync(file)) throw new Error(`font file missing from the bundled set: ${file}`);
        out.push(`@font-face{font-family:"${f.family}";font-style:${style};font-weight:${weight};font-display:block;`
          + `src:url(${dataUri(file)}) format("woff2");unicode-range:${RANGES[sub]}}`);
      };
      if (f.static) for (const w of f.static) face(resolve(fontDir(), `${f.id}-${sub}-${w}.woff2`), String(w));
      else face(resolve(fontDir(), `${f.id}-${sub}.woff2`), `${f.weights[0]} ${f.weights[1]}`);
      if (f.italic) face(resolve(fontDir(), `${f.id}-italic-${sub}.woff2`), `${f.weights[0]} ${f.weights[1]}`, "italic");
    }
  }
  return out.join("\n");
}

/** Образцы, на которых страница загружает шрифты темы до первого кадра: латиница и кириллица. */
export const FONT_PROBE = "Aa Жж 0";

/**
 * Шрифты темы под своими именами (`sc <семейство>`) — для слоя живого дубля. Он рисуется поверх
 * страницы продукта, и правила @font-face приходится класть в её документ: под своими именами
 * они не подменяют шрифты самого продукта, даже если тот пользуется тем же семейством.
 */
export function aliasedFonts(theme: Record<string, string>): { theme: Record<string, string>; css: string } {
  const fams = themeFamilies(theme).map((f) => f.family);
  const rename = (text: string): string => fams.reduce((t, f) => t.split(`"${f}"`).join(`"sc ${f}"`).split(`'${f}'`).join(`'sc ${f}'`), text);
  return { theme: Object.fromEntries(Object.entries(theme).map(([k, v]) => [k, rename(v)])), css: rename(fontFaceCss(theme)) };
}
