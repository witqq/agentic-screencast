// Переходы между сценами: настоящий монтажный переход между движущимися
// кадрами двух сцен, а не затемнение в чёрный на стыке.
//
// Переход длиной d перекрывает сцены: следующая начинается на d раньше, чем
// кончилась предыдущая, и в эти d секунд кадр — смесь последних кадров первой
// и первых кадров второй. Смешивает шейдер WebGL в том же браузере, что рисует
// сцены: кадры обеих сцен уходят в него текстурами, результат снимается как
// обычный снимок. Время перехода задаётся номером кадра, поэтому переход —
// чистая функция и кэшируется по содержимому обеих сцен.
//
// Если браузер не дал WebGL (машина без программного рендера), работает
// запасной путь — переходы ffmpeg xfade. Отчёт сборки называет, каким путём
// сделан каждый переход: пометка «webgl» ставится только тогда, когда кадры
// действительно получены из контекста WebGL.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { resolveTheme, type ThemeVars } from "./theme.js";
import { msg } from "./msg.js";

const require = createRequire(import.meta.url);
const FFMPEG = require("ffmpeg-static") as string;

/** Вид перехода: шейдер, запасной xfade и одна строка для справки. */
interface Kind { about: string; glsl: string; xfade: string; geometric: boolean }

// Общие для всех видов функции шейдера: A — кадр уходящей сцены, B — входящей.
const PRELUDE = `#version 300 es
precision highp float;
uniform sampler2D from; uniform sampler2D to;
uniform float progress; uniform float ratio;
// Цвета перехода — из темы входящей сцены: свет шва, кольца и вспышки, заливка просветов и тень граней.
uniform vec3 SEAM; uniform vec3 IRIS; uniform vec3 FLASH; uniform vec4 FILL; uniform float SHADE;
// Цвет провала (dip): названный сценарием или цвет затемнения темы входящей сцены.
uniform vec3 DIP;
// Направление толчка и хлёста: куда уезжает уходящая сцена (1,0) — влево, (0,1) — вверх.
uniform vec2 DIR;
// Точка, в которую влетает камера у пролёта (zoom): доли кадра, (0.5, 0.5) — центр.
uniform vec2 AT;
in vec2 uv; out vec4 color;
vec4 A(vec2 p) { return texture(from, p); }
vec4 B(vec2 p) { return texture(to, p); }
float rand(vec2 c) { return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }
bool inside(vec2 p) { return p.x >= 0.0 && p.x <= 1.0 && p.y >= 0.0 && p.y <= 1.0; }
// Тень грани темнит только цвет: множитель на весь vec4 снимал бы и прозрачность, и холст с
// предумноженной альфой отдавал бы грань светлее, а не темнее.
vec4 shade(vec4 c, float k) { return vec4(c.rgb * (1.0 - SHADE * k), c.a); }
const float PI = 3.14159265;
`;

export const KINDS: Record<string, Kind> = {
  dissolve: {
    about: "the next scene grows through the first in soft blocks of noise",
    xfade: "dissolve", geometric: true,
    glsl: `void main() {
      float n = rand(floor(uv * vec2(ratio, 1.0) * 90.0));
      float e = smoothstep(n - 0.06, n + 0.06, progress * 1.12 - 0.06);
      color = mix(A(uv), B(uv), e);
    }`,
  },
  "zoom-blur": {
    about: "the first scene rushes into the lens with radial blur, the next one settles out of it",
    xfade: "zoomin", geometric: false,
    glsl: `vec4 blur(sampler2D t, vec2 p, float k) {
      vec4 acc = vec4(0.0); vec2 c = vec2(0.5);
      for (int i = 0; i < 16; i++) { float f = 1.0 - k * float(i) / 15.0 * 0.35; acc += texture(t, c + (p - c) * f); }
      return acc / 16.0;
    }
    void main() {
      float s = sin(progress * PI);
      vec2 pa = 0.5 + (uv - 0.5) / (1.0 + progress * 1.4);
      vec2 pb = 0.5 + (uv - 0.5) * (1.0 + (1.0 - progress) * 0.6);
      color = mix(blur(from, pa, s), blur(to, pb, s), smoothstep(0.35, 0.65, progress));
    }`,
  },
  whip: {
    about: "a whip pan: the frame streaks along its direction (left by default) and lands on the next scene",
    xfade: "slideleft", geometric: true,
    glsl: `void main() {
      float x = smoothstep(0.0, 1.0, progress);
      float s = sin(progress * PI);
      vec4 acc = vec4(0.0);
      for (int i = 0; i < 20; i++) {
        float o = x + (float(i) / 19.0 - 0.5) * 0.18 * s;
        vec2 p = uv + DIR * o;
        acc += dot(p - 0.5, DIR) + 0.5 < 1.0 ? A(p) : B(p - DIR);
      }
      color = acc / 20.0;
    }`,
  },
  zoom: {
    about: "the camera flies into a point of the first scene (at, or a named element) and lands in the next one",
    xfade: "zoomin", geometric: false,
    glsl: `vec4 rush(sampler2D t, vec2 c, vec2 p, float k) {
      vec4 acc = vec4(0.0);
      for (int i = 0; i < 12; i++) { float f = 1.0 - k * float(i) / 11.0 * 0.25; acc += texture(t, c + (p - c) * f); }
      return acc / 12.0;
    }
    void main() {
      float a = smoothstep(0.0, 0.62, progress);
      float sa = exp(a * a * log(14.0));
      vec2 pa = AT + (uv - AT) / sa;
      float b = smoothstep(0.38, 1.0, progress);
      float sb = 1.0 + 0.5 * (1.0 - b) * (1.0 - b);
      vec2 pb = 0.5 + (uv - 0.5) / sb;
      float m = smoothstep(0.42, 0.62, progress);
      float ka = a * (1.0 - a) * 4.0, kb = (1.0 - b) * 0.8;
      vec4 ca = rush(from, AT, pa, ka), cb = rush(to, vec2(0.5), pb, kb);
      color = mix(ca, cb, m);
    }`,
  },
  wipe: {
    about: "an angled soft-edged wipe with a light seam",
    xfade: "wipeleft", geometric: true,
    glsl: `void main() {
      float d = uv.x * 0.82 + (1.0 - uv.y) * 0.18;
      float p = progress * 1.2 - 0.1;
      float e = smoothstep(p - 0.03, p + 0.03, d);
      float seam = exp(-pow((d - p) / 0.02, 2.0)) * sin(progress * PI);
      color = mix(B(uv), A(uv), e) + vec4(SEAM * seam, 0.0);
    }`,
  },
  iris: {
    about: "the next scene opens from the centre in a glowing circle",
    xfade: "circleopen", geometric: true,
    glsl: `void main() {
      vec2 q = (uv - 0.5) * vec2(ratio, 1.0);
      float r = progress * length(vec2(ratio, 1.0)) * 0.55;
      float d = length(q);
      float e = smoothstep(r - 0.01, r + 0.01, d);
      float ring = exp(-pow((d - r) / 0.012, 2.0)) * sin(progress * PI);
      color = mix(B(uv), A(uv), e) + vec4(IRIS * ring, 0.0);
    }`,
  },
  cube: {
    about: "a 3D cube turns: the first scene swings away on one face, the next arrives on the other",
    xfade: "smoothleft", geometric: true,
    glsl: `void main() {
      float p = smoothstep(0.0, 1.0, progress);
      float wa = 1.0 - p;
      float lift = sin(p * PI) * 0.12;
      if (uv.x < wa) {
        float x = uv.x / wa;
        vec2 s = vec2(x, 0.5 + (uv.y - 0.5) / max(0.2, 1.0 - lift - x * 0.25 * p));
        color = inside(s) ? shade(A(s), p) : FILL;
      } else {
        float x = (uv.x - wa) / max(0.0001, p);
        vec2 s = vec2(x, 0.5 + (uv.y - 0.5) / max(0.2, 1.0 - lift - (1.0 - x) * 0.25 * (1.0 - p)));
        color = inside(s) ? shade(B(s), 1.0 - p) : FILL;
      }
    }`,
  },
  flip: {
    about: "the frame flips like a card around its vertical axis",
    xfade: "squeezeh", geometric: true,
    glsl: `void main() {
      float p = smoothstep(0.0, 1.0, progress);
      float a = p * PI;
      float w = abs(cos(a));
      float x = (uv.x - 0.5) / max(0.0001, w) + 0.5;
      float t = sin(a) * 0.18;
      vec2 s = vec2(x, 0.5 + (uv.y - 0.5) / (1.0 - t * abs(uv.x - 0.5) * 2.0));
      vec4 c = p < 0.5 ? A(s) : B(s);
      // Флип темнит грань слабее куба: 9/11 тени темы, как было до переноса тени в тему.
      color = inside(s) ? shade(c, (1.0 - w) * 9.0 / 11.0) : FILL;
    }`,
  },
  glitch: {
    about: "a digital glitch: colour channels split and slices jump before the cut",
    xfade: "pixelize", geometric: false,
    glsl: `void main() {
      float s = sin(progress * PI);
      float row = floor(uv.y * 28.0);
      float jump = (rand(vec2(row, floor(progress * 12.0))) - 0.5) * 0.25 * s * step(0.55, rand(vec2(row, 3.1)));
      vec2 p = vec2(uv.x + jump, uv.y);
      float split = 0.02 * s;
      bool toB = rand(vec2(row, 7.0)) < progress;
      vec4 r = toB ? B(p + vec2(split, 0.0)) : A(p + vec2(split, 0.0));
      vec4 g = toB ? B(p) : A(p);
      vec4 b = toB ? B(p - vec2(split, 0.0)) : A(p - vec2(split, 0.0));
      color = vec4(r.r, g.g, b.b, 1.0);
    }`,
  },
  flash: {
    about: "a warm flash of light burns out the first scene and reveals the next",
    // Запасной путь без WebGL — наплыв: свет вспышки ffmpeg дал бы только белым, а не цветом темы.
    xfade: "fade", geometric: false,
    glsl: `void main() {
      float glow = exp(-pow((progress - 0.5) / 0.16, 2.0));
      vec2 q = (uv - vec2(0.3, 0.35)) * vec2(ratio, 1.0);
      float leak = exp(-dot(q, q) * 3.0);
      vec4 base = mix(A(uv), B(uv), smoothstep(0.42, 0.58, progress));
      float light = glow * (0.55 + 0.6 * leak);
      color = base + vec4(FLASH * light, 0.0);
    }`,
  },
  ripple: {
    about: "a ripple spreads from the centre and carries the next scene in",
    xfade: "radial", geometric: false,
    glsl: `void main() {
      vec2 q = (uv - 0.5) * vec2(ratio, 1.0);
      float d = length(q);
      float s = sin(progress * PI);
      vec2 off = normalize(q + 1e-5) * sin(d * 60.0 - progress * 30.0) * 0.02 * s;
      vec2 p = uv + off / vec2(ratio, 1.0);
      float e = smoothstep(progress * 1.3 - 0.15, progress * 1.3, d);
      color = mix(B(p), A(p), e);
    }`,
  },
  dip: {
    about: "the first scene sinks into a colour (black by default, any with color), the next rises out of it",
    // Запасной путь без WebGL выбирает fadeblack или fadewhite по яркости цвета.
    xfade: "fadeblack", geometric: false,
    glsl: `void main() {
      vec4 c = vec4(DIP, 1.0);
      // Треть перехода кадр стоит в цвете целиком: провал читается как пауза, а не как наплыв.
      float sink = smoothstep(0.0, 0.34, progress);
      float rise = smoothstep(0.66, 1.0, progress);
      color = mix(mix(A(uv), c, sink), B(uv), rise);
    }`,
  },
  push: {
    about: "the next scene pushes the first one out along its direction (left by default), both slightly scaled with depth",
    xfade: "slideleft", geometric: true,
    glsl: `void main() {
      float p = smoothstep(0.0, 1.0, progress);
      float k = 1.0 - 0.08 * sin(progress * PI);
      vec2 c = 0.5 + (uv - 0.5) / k;
      vec2 pa = c + DIR * p;
      vec2 pb = c + DIR * (p - 1.0);
      // Толчок уводит сцену в тень слабее куба: 7/11 тени темы, как было до переноса тени в тему.
      if (dot(pa - 0.5, DIR) + 0.5 <= 1.0) color = inside(pa) ? shade(A(pa), p * 7.0 / 11.0) : FILL;
      else color = inside(pb) ? B(pb) : FILL;
    }`,
  },
};

export const KIND_NAMES = Object.keys(KINDS);

/**
 * Переход общим элементом: предмет, который есть в обеих сценах (карточка, число,
 * кнопка), перетекает целиком со своего места в первой на своё место во второй, а фон
 * под ним сменяется наплывом. Отдельно от `KINDS`, потому что ему нужен не просто
 * кадр каждой сцены, а кадр без предмета и прямоугольник предмета в обеих.
 */
export const MORPH = "morph";

/**
 * Прямая склейка: следующая сцена встаёт встык, без перекрытия, без затемнения на стыке и без
 * кадров перехода. Отдельно от `KINDS`, потому что рисовать нечего: это отсутствие перехода,
 * которое, в отличие от сцены без поля `transition`, снимает и затемнения обеих сцен на стыке.
 */
export const CUT = "cut";

/** Переход, объявленный сценой: он ведёт ИЗ предыдущей сцены В эту. */
export interface Transition {
  kind: string;
  duration: number;
  /** звук-акцент на переходе: файл рядом со сценарием */
  sound?: string;
  /** начать переход на ближайшей доле музыки */
  snap?: "music";
  /** у перехода общим элементом: селектор предмета, который есть в обеих сценах */
  element?: string;
  /** у провала (dip): цвет, в который уходит кадр, `#rrggbb`, `black` или `white` */
  color?: string;
  /** у толчка и хлёста: куда уезжает уходящая сцена; без него — влево */
  direction?: Direction;
  /** у пролёта (zoom): точка первой сцены, в которую влетает камера, доли кадра `[x, y]` */
  at?: [number, number];
}

/** Куда уезжает уходящая сцена у толчка и хлёста. */
export const DIRECTIONS = ["left", "right", "up", "down"] as const;
export type Direction = (typeof DIRECTIONS)[number];
/** Виды, у которых есть направление. */
export const DIRECTED = ["push", "whip"];
/** Пролёт камеры в точку или предмет первой сцены. */
export const ZOOM = "zoom";
/** Вектор направления в координатах кадра (y вниз): так его читает шейдер. */
export const dirVector = (d: Direction | undefined): [number, number] =>
  d === "right" ? [-1, 0] : d === "up" ? [0, 1] : d === "down" ? [0, -1] : [1, 0];

/**
 * Разбор поля `transition`: `cube`, `cube 0.8`, `dip 0.6 white`, `cut` или объект
 * `{"kind":"cube","duration":0.8,"sound":"sfx/whoosh.wav","snap":"music"}`.
 */
export function parseTransition(raw: string): Transition {
  const text = raw.trim();
  let value: Record<string, unknown>;
  if (text.startsWith("{")) {
    try { value = JSON.parse(text) as Record<string, unknown>; }
    catch { throw new Error(msg("transition.form")); }
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(msg("transition.form"));
  } else {
    const [kind, dur, third] = text.split(/\s+/);
    value = { kind, ...(dur !== undefined ? { duration: Number(dur) } : {}),
      ...(third !== undefined ? DIRECTED.includes(kind!) ? { direction: third } : { color: third } : {}) };
  }
  for (const k of Object.keys(value)) if (!["kind", "duration", "sound", "snap", "element", "color", "direction", "at"].includes(k))
    throw new Error(msg("source.unknownProperty", { field: "transition", key: k }));
  const kind = String(value.kind ?? "");
  if (!KINDS[kind] && kind !== MORPH && kind !== CUT)
    throw new Error(msg("transition.unknownKind", { kind, available: [...KIND_NAMES, MORPH, CUT].join(", ") }));
  if (value.color !== undefined && kind !== "dip") throw new Error(msg("transition.dipColor"));
  const color = value.color === undefined ? undefined : dipColour(String(value.color));
  if (kind === CUT) {
    if (value.duration !== undefined) throw new Error(msg("transition.cutDuration"));
    return { kind, duration: 0, ...(typeof value.sound === "string" && value.sound.trim() ? { sound: value.sound.trim() } : {}),
      ...(value.snap === "music" ? { snap: "music" as const } : {}) };
  }
  if (kind === MORPH && (typeof value.element !== "string" || !value.element.trim()))
    throw new Error(msg("transition.morphElement"));
  if (kind !== MORPH && kind !== ZOOM && value.element !== undefined) throw new Error(msg("transition.onlyMorphElement"));
  if (value.direction !== undefined && (!DIRECTED.includes(kind) || !DIRECTIONS.includes(value.direction as Direction)))
    throw new Error(msg("transition.direction", { direction: String(value.direction), available: DIRECTIONS.join(", ") }));
  let at: [number, number] | undefined;
  if (value.at !== undefined) {
    const nums = (Array.isArray(value.at) ? value.at : String(value.at).trim().split(/\s+/)).map(Number);
    if (kind !== ZOOM || nums.length !== 2 || nums.some((v) => !Number.isFinite(v) || v < 0 || v > 1))
      throw new Error(msg("transition.at"));
    at = [nums[0]!, nums[1]!];
  }
  const duration = value.duration === undefined ? 0.8 : Number(value.duration);
  if (!Number.isFinite(duration) || duration < 0.2 || duration > 2)
    throw new Error(msg("transition.duration"));
  if (value.sound !== undefined && (typeof value.sound !== "string" || !value.sound.trim()))
    throw new Error(msg("transition.sound"));
  if (value.snap !== undefined && value.snap !== "music") throw new Error(msg("transition.snap"));
  return { kind, duration, ...(value.sound ? { sound: String(value.sound).trim() } : {}),
    ...(value.snap ? { snap: "music" as const } : {}),
    ...(kind === MORPH || (kind === ZOOM && typeof value.element === "string" && value.element.trim()) ? { element: String(value.element).trim() } : {}),
    ...(color ? { color } : {}), ...(value.direction ? { direction: value.direction as Direction } : {}), ...(at ? { at } : {}) };
}

/** Цвет провала: `black`, `white` или `#rgb` / `#rrggbb` — в виде `#rrggbb`. */
function dipColour(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (v === "black") return "#000000";
  if (v === "white") return "#ffffff";
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(v);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  throw new Error(msg("transition.color", { color: raw }));
}

/** Кадры клипа [from, to) как PNG: ровно по номерам кадров, без округления времени. */
export function framesOf(clip: string, from: number, count: number, dir: string): string[] {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-i", clip,
    "-vf", `select='between(n\\,${from}\\,${from + count - 1})'`, "-vsync", "0",
    resolve(dir, "%05d.png")]);
  const files = readdirSync(dir).filter((f) => f.endsWith(".png")).sort().map((f) => resolve(dir, f));
  if (files.length !== count) throw new Error(`transition: expected ${count} frames of ${clip}, got ${files.length}`);
  return files;
}

/** Путь, которым получены кадры перехода. */
export type Renderer = "webgl" | "ffmpeg";

/**
 * Кадры перехода. `a` — последние кадры уходящей сцены, `b` — первые кадры
 * входящей, поровну. Кадр k получает прогресс (k + 0.5) / n: переход не
 * начинается с чистого A и не кончается чистым B — их показывают соседние
 * части ролика, и повторять их было бы стоп-кадром.
 */
export async function renderTransition(opts: {
  kind: string; a: string[]; b: string[]; width: number; height: number; out: string;
  engine?: Renderer;
  /** тема входящей сцены: её цвета у света, просветов и тени граней */
  theme?: ThemeVars;
  /** цвет провала; без него — цвет затемнения темы (`--sc-fade`) */
  color?: string;
  direction?: Direction;
  at?: [number, number];
}): Promise<{ frames: string[]; renderer: Renderer }> {
  const n = opts.a.length;
  if (n !== opts.b.length || n < 2) throw new Error("transition: both scenes must give the same number of frames");
  mkdirSync(opts.out, { recursive: true });
  const engine = opts.engine ?? "webgl";
  if (engine === "webgl") {
    const got = await webgl(opts, n);
    if (got) return { frames: got, renderer: "webgl" };
  }
  return { frames: xfade(opts, n), renderer: "ffmpeg" };
}

/** `#rrggbb[aa]` → доли 0…1: так цвет темы уходит в шейдер. */
const rgbOf = (hex: string): number[] => {
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex.trim());
  if (!m) throw new Error(msg("transition.colour", { value: hex }));
  const v = Number.parseInt(m[1]!, 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255, m[2] ? Number.parseInt(m[2], 16) / 255 : 1];
};

/** Цвет провала: названный переходом или цвет затемнения темы входящей сцены. */
const dipOf = (opts: { color?: string; theme?: ThemeVars }): string =>
  opts.color ?? (opts.theme ?? resolveTheme(undefined))["--sc-fade"]!;

async function webgl(opts: { kind: string; a: string[]; b: string[]; width: number; height: number; out: string; theme?: ThemeVars; color?: string;
  direction?: Direction; at?: [number, number] },
  n: number): Promise<string[] | null> {
  const kind = KINDS[opts.kind]!;
  const theme = opts.theme ?? resolveTheme(undefined);
  const light = { SEAM: rgbOf(theme["--tr-seam"]!), IRIS: rgbOf(theme["--tr-iris"]!), FLASH: rgbOf(theme["--tr-flash"]!),
    FILL: rgbOf(theme["--tr-fill"]!), SHADE: Number(theme["--tr-shade"]), DIP: rgbOf(dipOf(opts)),
    DIR: dirVector(opts.direction), AT: opts.at ?? [0.5, 0.5] };
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: opts.width, height: opts.height }, deviceScaleFactor: 1 });
    // Холст снимается поверх страницы: полупрозрачная заливка просветов (`--tr-fill` с альфой)
    // ложится на фон темы, а не на белую страницу браузера.
    await page.setContent(`<html><body style="margin:0;background:${theme["--bg"]}"><canvas id="c" width="${opts.width}"
      height="${opts.height}" style="display:block"></canvas></body></html>`);
    const ok = await page.evaluate(({ frag, prelude, light }) => {
      const canvas = document.getElementById("c") as HTMLCanvasElement;
      const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true, antialias: false });
      if (!gl) return false;
      const compile = (type: number, src: string): WebGLShader | null => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
      };
      const vs = compile(gl.VERTEX_SHADER, `#version 300 es
        in vec2 pos; out vec2 uv;
        void main() { uv = vec2(pos.x * 0.5 + 0.5, 0.5 - pos.y * 0.5); gl_Position = vec4(pos, 0.0, 1.0); }`);
      const fs = compile(gl.FRAGMENT_SHADER, prelude + frag);
      if (!vs || !fs) return false;
      const prog = gl.createProgram()!;
      gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "pos");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const tex = (unit: number): WebGLTexture => {
        const t = gl.createTexture()!;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, t);
        for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
          [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]] as const) gl.texParameteri(gl.TEXTURE_2D, k, v);
        return t;
      };
      const w = window as unknown as Record<string, unknown>;
      w.__gl = { gl, prog, ta: tex(0), tb: tex(1) };
      gl.uniform1i(gl.getUniformLocation(prog, "from"), 0);
      gl.uniform1i(gl.getUniformLocation(prog, "to"), 1);
      gl.uniform1f(gl.getUniformLocation(prog, "ratio"), canvas.width / canvas.height);
      for (const k of ["SEAM", "IRIS", "FLASH", "DIP"] as const) gl.uniform3fv(gl.getUniformLocation(prog, k), light[k].slice(0, 3));
      gl.uniform4fv(gl.getUniformLocation(prog, "FILL"), light.FILL);
      gl.uniform1f(gl.getUniformLocation(prog, "SHADE"), light.SHADE);
      gl.uniform2fv(gl.getUniformLocation(prog, "DIR"), light.DIR);
      gl.uniform2fv(gl.getUniformLocation(prog, "AT"), light.AT);
      return gl.getError() === gl.NO_ERROR;
    }, { frag: kind.glsl, prelude: PRELUDE, light });
    if (!ok) return null;
    const frames: string[] = [];
    for (let k = 0; k < n; k++) {
      const a = `data:image/png;base64,${readFileSync(opts.a[k]!).toString("base64")}`;
      const b = `data:image/png;base64,${readFileSync(opts.b[k]!).toString("base64")}`;
      const drawn = await page.evaluate(async ({ a, b, p }) => {
        const { gl, prog, ta, tb } = (window as unknown as { __gl: { gl: WebGL2RenderingContext; prog: WebGLProgram;
          ta: WebGLTexture; tb: WebGLTexture } }).__gl;
        const load = async (src: string): Promise<ImageBitmap> =>
          createImageBitmap(await (await fetch(src)).blob(), { imageOrientation: "none", premultiplyAlpha: "none" });
        const [ia, ib] = await Promise.all([load(a), load(b)]);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, ta);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ia);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tb);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ib);
        gl.uniform1f(gl.getUniformLocation(prog, "progress"), p);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.finish();
        return gl.getError() === gl.NO_ERROR;
      }, { a, b, p: (k + 0.5) / n });
      if (!drawn) return null;
      const file = resolve(opts.out, `${String(k).padStart(5, "0")}.png`);
      writeFileSync(file, await page.locator("#c").screenshot());
      frames.push(file);
    }
    return frames;
  } finally {
    await browser.close();
  }
}

/** Прямоугольник в точках кадра. */
export interface Box { left: number; top: number; width: number; height: number }

/** Что нужно переходу общим элементом: кадры обеих сцен с предметом и без него и его места. */
export interface MorphInput { aBg: string; bBg: string; aFull: string; bFull: string; ra: Box; rb: Box }

/**
 * Кадры перехода общим элементом. Фон — наплыв кадра первой сцены без предмета в кадр
 * второй без предмета; предмет — один прямоугольник, который едет дугой и меняет размер от
 * своего места в первой сцене к месту во второй (smoothstep), смазанный на лету. Содержимое предмета
 * меняется на полпути: смешение двух разных раскладок текста даёт нечитаемые двойные
 * надписи. Старого и нового места в середине перехода предмет не занимает: там фон без него.
 */
export async function renderMorph(opts: MorphInput & { width: number; height: number; n: number; out: string }):
Promise<{ frames: string[]; renderer: Renderer }> {
  mkdirSync(opts.out, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: opts.width, height: opts.height }, deviceScaleFactor: 1 });
    await page.setContent(`<html><body style="margin:0"><canvas id="c" width="${opts.width}"
      height="${opts.height}" style="display:block"></canvas></body></html>`);
    const img = (f: string): string => `data:image/png;base64,${readFileSync(f).toString("base64")}`;
    const uv = (r: Box): [number, number, number, number] => [r.left / opts.width, r.top / opts.height, r.width / opts.width, r.height / opts.height];
    const ok = await page.evaluate(async ({ srcs, ra, rb }) => {
      const canvas = document.getElementById("c") as HTMLCanvasElement;
      const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true, antialias: false });
      if (!gl) return false;
      const compile = (type: number, src: string): WebGLShader | null => {
        const sh = gl.createShader(type)!; gl.shaderSource(sh, src); gl.compileShader(sh);
        return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
      };
      const vs = compile(gl.VERTEX_SHADER, `#version 300 es
        in vec2 pos; out vec2 uv; void main() { uv = vec2(pos.x * 0.5 + 0.5, 0.5 - pos.y * 0.5); gl_Position = vec4(pos, 0.0, 1.0); }`);
      const fs = compile(gl.FRAGMENT_SHADER, `#version 300 es
        precision highp float;
        uniform sampler2D abg; uniform sampler2D bbg; uniform sampler2D af; uniform sampler2D bf;
        uniform vec4 ra; uniform vec4 rb; uniform float progress;
        in vec2 uv; out vec4 color;
        // Предмет летит дугой, а не по прямой: середина пути отнесена вбок на шестую часть его длины,
        // как у брошенного предмета. На лету он смазан вдоль пути — двенадцать отсчётов назад по дуге.
        vec4 rectAt(float e) {
          vec4 r = mix(ra, rb, e);
          vec2 d = rb.xy - ra.xy;
          r.xy += vec2(-d.y, d.x) * sin(e * 3.14159265) / 6.0;
          return r;
        }
        vec4 item(vec4 r, vec2 p) {
          vec2 l = (p - r.xy) / r.zw;
          if (l.x < 0.0 || l.x > 1.0 || l.y < 0.0 || l.y > 1.0) return vec4(0.0);
          return progress < 0.5 ? texture(af, ra.xy + l * ra.zw) : texture(bf, rb.xy + l * rb.zw);
        }
        void main() {
          float e = smoothstep(0.0, 1.0, progress);
          vec4 bg = mix(texture(abg, uv), texture(bbg, uv), e);
          vec4 acc = vec4(0.0);
          float speed = 6.0 * progress * (1.0 - progress);
          for (int i = 0; i < 12; i++) {
            float k = e - float(i) / 11.0 * 0.06 * speed;
            vec4 c = item(rectAt(clamp(k, 0.0, 1.0)), uv);
            acc += vec4(c.rgb * c.a, c.a);
          }
          acc /= 12.0;
          color = vec4(acc.rgb + bg.rgb * (1.0 - acc.a), max(acc.a, bg.a));
        }`);
      if (!vs || !fs) return false;
      const prog = gl.createProgram()!;
      gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "pos");
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const names = ["abg", "bbg", "af", "bf"];
      for (let i = 0; i < 4; i++) {
        const bmp = await createImageBitmap(await (await fetch(srcs[i]!)).blob(), { imageOrientation: "none", premultiplyAlpha: "none" });
        const t = gl.createTexture()!;
        gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t);
        for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
          [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]] as const) gl.texParameteri(gl.TEXTURE_2D, k, v);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bmp);
        gl.uniform1i(gl.getUniformLocation(prog, names[i]!), i);
      }
      gl.uniform4fv(gl.getUniformLocation(prog, "ra"), ra);
      gl.uniform4fv(gl.getUniformLocation(prog, "rb"), rb);
      (window as unknown as { __m: unknown }).__m = { gl, prog };
      return gl.getError() === gl.NO_ERROR;
    }, { srcs: [img(opts.aBg), img(opts.bBg), img(opts.aFull), img(opts.bFull)], ra: uv(opts.ra), rb: uv(opts.rb) });
    if (!ok) return { frames: morphFallback(opts), renderer: "ffmpeg" };
    const frames: string[] = [];
    for (let k = 0; k < opts.n; k++) {
      const drawn = await page.evaluate((p) => {
        const { gl, prog } = (window as unknown as { __m: { gl: WebGL2RenderingContext; prog: WebGLProgram } }).__m;
        gl.uniform1f(gl.getUniformLocation(prog, "progress"), p);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.finish();
        return gl.getError() === gl.NO_ERROR;
      }, (k + 0.5) / opts.n);
      if (!drawn) return { frames: morphFallback(opts), renderer: "ffmpeg" };
      const file = resolve(opts.out, `${String(k).padStart(5, "0")}.png`);
      writeFileSync(file, await page.locator("#c").screenshot());
      frames.push(file);
    }
    return { frames, renderer: "webgl" };
  } finally {
    await browser.close();
  }
}

/** Без WebGL переход общим элементом становится наплывом кадра первой сцены в кадр второй. */
function morphFallback(opts: MorphInput & { n: number; out: string }): string[] {
  execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error", "-loop", "1", "-i", opts.aFull, "-loop", "1", "-i", opts.bFull,
    "-filter_complex", `[0:v][1:v]blend=all_expr='A*(1-N/${opts.n})+B*(N/${opts.n})'[v]`, "-map", "[v]", "-frames:v", String(opts.n),
    resolve(opts.out, "%05d.png")]);
  return readdirSync(opts.out).filter((f) => f.endsWith(".png")).sort().map((f) => resolve(opts.out, f));
}

/** Запасной путь: тот же переход средствами ffmpeg xfade. */
function xfade(opts: { kind: string; a: string[]; b: string[]; out: string; theme?: ThemeVars; color?: string; direction?: Direction }, n: number): string[] {
  const kind = KINDS[opts.kind]!;
  // ffmpeg умеет провал только в чёрное или белое: берётся ближайшее по яркости.
  const [r, g, b] = rgbOf(dipOf(opts));
  const via = opts.kind === "dip" ? (0.2126 * r! + 0.7152 * g! + 0.0722 * b! > 0.5 ? "fadewhite" : "fadeblack")
    : DIRECTED.includes(opts.kind) && opts.direction ? `slide${opts.direction}` : kind.xfade;
  const dirA = resolve(opts.a[0]!, ".."), dirB = resolve(opts.b[0]!, "..");
  execFileSync(FFMPEG, ["-nostdin", "-y", "-loglevel", "error",
    "-framerate", "25", "-i", resolve(dirA, "%05d.png"), "-framerate", "25", "-i", resolve(dirB, "%05d.png"),
    "-filter_complex", `[0:v]format=rgb24[a];[1:v]format=rgb24[b];`
      + `[a][b]xfade=transition=${via}:duration=${((n - 0.001) / 25).toFixed(3)}:offset=0[v]`,
    "-map", "[v]", "-frames:v", String(n), resolve(opts.out, "%05d.png")]);
  return readdirSync(opts.out).filter((f) => f.endsWith(".png")).sort().map((f) => resolve(opts.out, f));
}
