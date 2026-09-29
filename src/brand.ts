// Тема из фирменных цветов: по картинке бренда или по названным цветам.
//
// У продукта, про который снимают ролик, почти всегда уже есть палитра —
// логотип, сайт, интерфейс. Ролик в чужих цветах выглядит как чужой, а
// подбирать два десятка переменных руками долго и неряшливо. Команда берёт
// за основу поставляемую тему и заменяет в ней акценты фирменными, а всё,
// что из акцентов выводится (подсветка, полоса подписи, кромка карточек),
// пересчитывает из них же.
//
// Цвет бренда не всегда читается на фоне темы: тёмно-синий логотип на ночной
// теме пропадёт. Поэтому акцент сдвигается по светлоте, пока контраст с фоном
// не станет достаточным для крупного текста, — тон при этом сохраняется.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { THEMES, type ThemeVars } from "./theme.js";
import { msg } from "./msg.js";

const require = createRequire(import.meta.url);
const FFMPEG = require("ffmpeg-static") as string;

type RGB = [number, number, number];

const hex = (c: RGB): string => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
export const parseHex = (s: string): RGB => {
  const m = /^#?([0-9a-f]{6})$/i.exec(s.trim());
  if (!m) throw new Error(msg("brand.colour", { value: s }));
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

function toHsl([r, g, b]: RGB): [number, number, number] {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number): RGB {
  const k = (n: number): number => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): number => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

/** Относительная яркость по WCAG — та же формула, что у проверки кадра. */
export function luminance([r, g, b]: RGB): number {
  const f = (c: number): number => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export const contrast = (a: RGB, b: RGB): number => {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/**
 * Два господствующих цвета картинки. Серые, почти белые и почти чёрные точки
 * не в счёт — это фон и текст, а не фирменный цвет. Тона собираются в
 * гистограмму по кругу с весом насыщенности; второй цвет берётся не ближе
 * сорока градусов к первому, иначе это оттенок того же цвета.
 */
export function dominantColors(image: string): RGB[] {
  if (!existsSync(image)) throw new Error(msg("brand.noImage", { path: image }));
  const raw = execFileSync(FFMPEG, ["-nostdin", "-loglevel", "error", "-i", image, "-vf", "scale=96:96:flags=area",
    "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 1 << 24 });
  const bins = Array.from({ length: 36 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
  for (let i = 0; i + 2 < raw.length; i += 3) {
    const c: RGB = [raw[i]!, raw[i + 1]!, raw[i + 2]!];
    const [h, s, l] = toHsl(c);
    if (s < 0.22 || l < 0.1 || l > 0.93) continue;
    const bin = bins[Math.floor(h / 10) % 36]!;
    const w = s * (1 - Math.abs(l - 0.5));
    bin.w += w; bin.r += c[0] * w; bin.g += c[1] * w; bin.b += c[2] * w;
  }
  // Соседние корзины складываются: цвет на границе двух корзин иначе делился пополам.
  const merged = bins.map((b, i) => {
    const p = bins[(i + 35) % 36]!, n = bins[(i + 1) % 36]!;
    return { i, w: b.w + (p.w + n.w) * 0.5, c: b };
  }).sort((a, b) => b.w - a.w);
  const out: RGB[] = [];
  const hues: number[] = [];
  for (const m of merged) {
    if (m.c.w <= 0 || out.length === 2) continue;
    const hue = m.i * 10 + 5;
    if (hues.some((h) => Math.min(Math.abs(h - hue), 360 - Math.abs(h - hue)) < 40)) continue;
    hues.push(hue);
    out.push([m.c.r / m.c.w, m.c.g / m.c.w, m.c.b / m.c.w]);
  }
  return out;
}

/** Сдвинуть цвет по светлоте, пока его контраст с фоном не достигнет порога. Тон остаётся. */
export function readableOn(c: RGB, bg: RGB, min = 4.5): RGB {
  const [h, s, l0] = toHsl(c);
  const up = luminance(bg) < 0.4;
  let l = l0, out = c;
  for (let k = 0; k < 60 && contrast(out, bg) < min; k++) {
    l = up ? Math.min(1, l + 0.015) : Math.max(0, l - 0.015);
    out = fromHsl(h, s, l);
  }
  return out;
}

const rgba = (c: RGB, a: number): string => `rgba(${c.map(Math.round).join(",")},${a})`;
const mixHex = (a: RGB, b: RGB, k: number): RGB => [a[0] * (1 - k) + b[0] * k, a[1] * (1 - k) + b[1] * k, a[2] * (1 - k) + b[2] * k];

/**
 * Перекрасить в теме всё, что выведено из её акцентов. Токен — кольцо лупы, полоса хода,
 * подложка значка, пометка, искры — хранит цвет акцента своим значением, а не ссылкой на
 * `--acc`, поэтому перечень таких токенов не пишется руками: он был бы неполон с первого
 * нового токена. Цвет акцента ищется в значении как `#rrggbb` и как тройка `rgb(r,g,b)`;
 * прозрачность и всё вокруг цвета остаются прежними.
 */
function recolour(theme: ThemeVars, swap: Array<[RGB, RGB]>): ThemeVars {
  const key = (c: RGB): string => c.join(",");
  const to = new Map(swap.map(([from, into]) => [key(from), into]));
  const hexes = swap.map(([from]) => hex(from).slice(1));
  const re = new RegExp(`#(${hexes.join("|")})|(rgba?\\(\\s*)(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)`, "gi");
  const out: ThemeVars = {};
  for (const [k, v] of Object.entries(theme)) {
    const next = v.replace(re, (m, h: string | undefined, head: string, r: string, g: string, b: string) => {
      const c = to.get(h ? key(parseHex(h)) : `${r},${g},${b}`);
      if (!c) return m;
      return h ? hex(c) : `${head}${c.map(Math.round).join(",")}`;
    });
    if (next !== v) out[k] = next;
  }
  return out;
}

/**
 * Тема в фирменных цветах поверх поставляемой. Возвращает ПРАВКИ к ней, а не всю тему:
 * основу (`preset`) и те токены, что хранят цвет её акцентов, — их столько, сколько в
 * основе таких токенов (у neutral около двадцати), остальное берётся из основы.
 */
export function brandTheme(colors: RGB[], base = "neutral"): ThemeVars & { preset: string } {
  const theme = THEMES[base];
  if (!theme) throw new Error(msg("brand.unknownBase", { base, available: Object.keys(THEMES).join(", ") }));
  if (!colors.length) throw new Error(msg("brand.grey"));
  const bg = parseHex(theme["--bg"]!);
  const acc = readableOn(colors[0]!, bg);
  // Акцент один (docs/visual-design.md): второй цвет темы — тихий, для надзаголовков и меток. Второй
  // фирменный цвет приглушается к серому, а без него берётся нейтральный цвет основы. Прежде
  // недостающий второй цвет досочинялся соседом по кругу, и тема получала два ярких акцента.
  const acc2 = colors[1]
    ? readableOn((() => { const [h, s, l] = toHsl(colors[1]!); return fromHsl(h, s * 0.25, l); })(), bg)
    : parseHex(theme["--acc2"]!);
  const glow = mixHex(bg, acc, luminance(bg) < 0.4 ? 0.16 : 0.1);
  // Всё, что тема хранит цветом своих акцентов, получает фирменные; ниже — токены, которые
  // выводятся из фирменных цветов по-своему (прозрачность).
  const derived = recolour(theme, [[parseHex(theme["--acc"]!), acc], [parseHex(theme["--acc2"]!), acc2], [parseHex(theme["--glow"]!), glow]]);
  return {
    preset: base,
    ...derived,
    "--acc": hex(acc),
    "--acc2": hex(acc2),
    "--glow": hex(glow),
    "--sc-spot": rgba(acc, 0.95),
    "--sc-accent-soft": rgba(acc, 0.42),
  };
}
