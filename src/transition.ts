// Переходы между сценами: настоящий монтажный переход между движущимися
// кадрами двух сцен, а не затемнение в чёрный на стыке.
//
// Переход длиной d перекрывает сцены: следующая начинается на d раньше, чем
// кончилась предыдущая, и в эти d секунд кадр — смесь последних кадров первой
// и первых кадров второй. Смешивает шейдер WebGL в отдельном экземпляре Chromium,
// который сборка запускает для переходов: готовые кадры обеих сцен уходят в него
// текстурами, результат снимается как обычный снимок. Время перехода задаётся
// номером кадра, поэтому переход — чистая функция и кэшируется по содержимому
// обеих сцен. Переход «на стыке» (`joint`, засветка) сцены не перекрывает: свет
// идёт поверх последних кадров первой и первых кадров второй, и ролик не короче.
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
import { retiredAs } from "./retired.js";

const require = createRequire(import.meta.url);
const FFMPEG = require("ffmpeg-static") as string;

/**
 * Вид перехода: шейдер, запасной xfade и одна строка для справки. `joint` — переход на стыке без
 * перекрытия: шейдер получает в обеих текстурах один и тот же кадр — сначала последние кадры
 * первой сцены, затем первые кадры второй.
 */
interface Kind { about: string; glsl: string; xfade: string; geometric: boolean; joint?: boolean }

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
// Прямоугольник предмета первой сцены у маски (mask): левый верх и размер в долях кадра.
uniform vec4 AREA;
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
  melt: {
    about: "the first scene melts and runs down in uneven drips, uncovering the next one",
    xfade: "wipedown", geometric: true,
    glsl: `float wave(float x) {
      float i = floor(x), f = fract(x);
      return mix(rand(vec2(i, 4.0)), rand(vec2(i + 1.0, 4.0)), f * f * (3.0 - 2.0 * f));
    }
    void main() {
      float x = uv.x * ratio;
      float n = wave(x * 9.0) * 0.65 + wave(x * 23.0) * 0.35;
      float drop = pow(progress, 1.6) * (1.0 + 1.1 * n) * 1.2;
      vec2 pa = vec2(uv.x, uv.y - drop);
      float edge = exp(-pow(pa.y / 0.012, 2.0)) * sin(progress * PI);
      vec4 c = pa.y >= 0.0 ? A(pa) : B(uv);
      color = c + vec4(SEAM * edge, 0.0);
    }`,
  },
  leak: {
    about: "a warm light leak sweeps across the cut; the scenes do not overlap, so the film keeps its length",
    xfade: "fade", geometric: false, joint: true,
    glsl: `void main() {
      vec4 base = A(uv);
      float g = exp(-pow((progress - 0.5) / 0.26, 2.0));
      vec2 c = vec2(mix(-0.25, 1.25, progress), 0.3);
      vec2 q = (uv - c) * vec2(ratio, 1.0);
      vec2 r = q + vec2(0.45, -0.35);
      float leak = exp(-dot(q, q) * 2.2) + 0.6 * exp(-dot(r, r) * 5.0);
      vec3 light = (FLASH * leak * 0.8 + IRIS * 0.15) * g;
      color = vec4(base.rgb + light * (1.0 - base.rgb), base.a);
    }`,
  },
  clock: {
    about: "a clock hand sweeps round from twelve and uncovers the next scene behind it",
    xfade: "radial", geometric: true,
    glsl: `void main() {
      vec2 q = (uv - 0.5) * vec2(ratio, 1.0);
      float a = atan(q.x, -q.y);
      a = a < 0.0 ? a + 2.0 * PI : a;
      float s = smoothstep(0.0, 1.0, progress) * 2.0 * PI;
      float e = smoothstep(s - 0.015, s + 0.015, a);
      float hand = exp(-pow((a - s) * length(q) / 0.006, 2.0)) * sin(progress * PI);
      color = mix(B(uv), A(uv), e) + vec4(SEAM * hand, 0.0);
    }`,
  },
  curl: {
    about: "the page curls from its bottom-right corner and turns over, the next scene lies beneath",
    xfade: "diagtl", geometric: true,
    glsl: `void main() {
      vec2 n = normalize(vec2(ratio, 1.0));
      vec2 q = uv * vec2(ratio, 1.0);
      float span = length(vec2(ratio, 1.0));
      float d = dot(q, n);
      float R = 0.09;
      float fold = mix(span + 0.05, -R * PI - 0.05, smoothstep(0.0, 1.0, progress));
      float x = d - fold;
      vec4 c = B(uv);
      // Лицо листа под изгибом и плоское до изгиба; изнанка — поверх, в тени.
      if (x < 0.0) c = A(uv);
      if (x >= 0.0 && x < R) {
        float th = asin(x / R);
        vec2 o = (q - n * (d - (fold + th * R))) / vec2(ratio, 1.0);
        if (inside(o)) c = shade(A(o), 0.35 * x / R);
      }
      float back = x < R ? (x >= 0.0 ? fold + (PI - asin(x / R)) * R : fold + PI * R - x) : -1.0;
      if (back > 0.0) {
        vec2 o = (q - n * (d - back)) / vec2(ratio, 1.0);
        if (inside(o) && dot(o * vec2(ratio, 1.0), n) <= span) c = mix(shade(A(o), 0.5), FILL, 0.35);
      }
      color = c;
    }`,
  },
  tiles: {
    about: "the next scene assembles tile by tile: each tile flips over in its own turn",
    xfade: "pixelize", geometric: true,
    glsl: `void main() {
      vec2 grid = vec2(floor(9.0 * ratio + 0.5), 9.0);
      vec2 cell = floor(uv * grid), l = fract(uv * grid);
      float t0 = rand(cell) * 0.55;
      float p = clamp((progress - t0) / 0.45, 0.0, 1.0);
      float w = abs(cos(p * PI));
      float y = (l.y - 0.5) / max(0.0001, w) + 0.5;
      vec2 s = (cell + vec2(l.x, y)) / grid;
      vec4 c = y < 0.0 || y > 1.0 ? FILL : shade(p < 0.5 ? A(s) : B(s), 1.0 - w);
      color = c;
    }`,
  },
  blur: {
    about: "a dissolve through soft focus: the first scene blurs out and the next one sharpens into place",
    xfade: "fade", geometric: false,
    glsl: `vec4 soft(sampler2D t, vec2 p, float r) {
      vec4 acc = texture(t, p);
      for (int i = 0; i < 24; i++) {
        float a = float(i) * 2.39996, k = sqrt((float(i) + 0.5) / 24.0);
        acc += texture(t, p + vec2(cos(a), sin(a)) * k * r / vec2(ratio, 1.0));
      }
      return acc / 25.0;
    }
    void main() {
      float r = sin(progress * PI) * 0.035;
      color = mix(soft(from, uv, r), soft(to, uv, r), smoothstep(0.25, 0.75, progress));
    }`,
  },
  mask: {
    about: "an element of the first scene (element) opens like a window and the next scene grows out of it to fill the frame; without an element a glowing circle opens from a point (at, the centre by default)",
    xfade: "circleopen", geometric: true,
    glsl: `void main() {
      // Без предмета (ширина области 0) — круг с горящим кольцом из точки AREA.xy.
      if (AREA.z <= 0.0) {
        vec2 q0 = (uv - AREA.xy) * vec2(ratio, 1.0);
        float far = length(max(AREA.xy, 1.0 - AREA.xy) * vec2(ratio, 1.0));
        float r0 = smoothstep(0.0, 1.0, progress) * far * 1.02;
        float d0 = length(q0);
        float e0 = smoothstep(r0 - 0.008, r0 + 0.008, d0);
        float ring = exp(-pow((d0 - r0) / 0.012, 2.0)) * sin(progress * PI);
        vec4 c0 = mix(B(uv), A(uv), e0) + vec4(IRIS * ring, 0.0);
        color = c0;
        return;
      }
      float p = smoothstep(0.0, 1.0, progress);
      float g = p * p;
      vec4 r = mix(AREA, vec4(-0.02, -0.02, 1.04, 1.04), g);
      vec2 c = r.xy + r.zw * 0.5;
      vec2 h = r.zw * 0.5 * vec2(ratio, 1.0);
      float rad = min(h.x, h.y) * 0.35 * (1.0 - g);
      vec2 q = abs((uv - c) * vec2(ratio, 1.0)) - h + rad;
      float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rad;
      float e = smoothstep(-0.0025, 0.0025, d);
      vec2 ac = AREA.xy + AREA.zw * 0.5;
      vec2 pa = ac + (uv - ac) / (1.0 + 0.2 * p);
      float seam = exp(-pow(d / 0.004, 2.0)) * sin(progress * PI);
      color = mix(B(uv), shade(A(pa), p), e) + vec4(SEAM * seam, 0.0);
    }`,
  },
  dots: {
    about: "the next scene appears through a grid of dots that grow from nothing and merge into the whole frame",
    xfade: "dissolve", geometric: true,
    glsl: `void main() {
      vec2 grid = vec2(floor(34.0 * ratio + 0.5), 34.0);
      vec2 cell = floor(uv * grid), l = fract(uv * grid) - 0.5;
      float t0 = rand(cell) * 0.45 + length(uv - 0.5) * 0.3;
      float r = clamp((progress - t0) / 0.4, 0.0, 1.0) * 0.75;
      float e = smoothstep(r, r - 0.06, length(l));
      color = mix(A(uv), B(uv), e);
    }`,
  },
  pixelate: {
    about: "the first scene breaks into ever larger pixels, the next one comes back into focus out of them",
    xfade: "pixelize", geometric: false,
    glsl: `void main() {
      float s = sin(progress * PI);
      float cells = max(2.0, floor(mix(260.0, 14.0, s * s)));
      vec2 grid = vec2(floor(cells * ratio + 0.5), cells);
      vec2 p = (floor(uv * grid) + 0.5) / grid;
      vec4 c = progress < 0.5 ? A(p) : B(p);
      color = c;
    }`,
  },
};

export const KIND_NAMES = Object.keys(KINDS);

/** Переход на стыке без перекрытия сцен: ролик с ним не короче суммы сцен. */
export const isJoint = (kind: string): boolean => Object.hasOwn(KINDS, kind) && KINDS[kind]!.joint === true;

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
  /** у пролёта (zoom) и маски (mask): точка первой сцены, в которую влетает камера или из которой растёт окно, доли кадра `[x, y]` */
  at?: [number, number];
  /** у маски: прямоугольник предмета первой сцены `[x, y, w, h]` в долях кадра — его меряет сборка по `element` */
  area?: [number, number, number, number];
}

/** Куда уезжает уходящая сцена у толчка и хлёста. */
export const DIRECTIONS = ["left", "right", "up", "down"] as const;
export type Direction = (typeof DIRECTIONS)[number];
/** Виды, у которых есть направление. */
export const DIRECTED = ["push", "whip"];
/** Пролёт камеры в точку или предмет первой сцены. */
export const ZOOM = "zoom";
/** Окно из предмета первой сцены, через которое растёт вторая. */
export const MASK = "mask";
/** Виды, которым нужна точка или предмет первой сцены. */
export const AIMED = [ZOOM, MASK];
/** Маска без предмета: круг из точки (или середины) — нулевая ширина области говорит шейдеру рисовать круг. */
export const areaAround = (at: [number, number] | undefined): [number, number, number, number] => {
  const [x, y] = at ?? [0.5, 0.5];
  return [x, y, 0, 0];
};
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
  const use = retiredAs("transition", kind);
  if (use) throw new Error(msg("retired", { field: "transition", value: kind, use }));
  if (!Object.hasOwn(KINDS, kind) && kind !== MORPH && kind !== CUT)
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
  if (kind !== MORPH && !AIMED.includes(kind) && value.element !== undefined) throw new Error(msg("transition.onlyMorphElement"));
  if (value.direction !== undefined && (!DIRECTED.includes(kind) || !DIRECTIONS.includes(value.direction as Direction)))
    throw new Error(msg("transition.direction", { direction: String(value.direction), available: DIRECTIONS.join(", ") }));
  let at: [number, number] | undefined;
  if (value.at !== undefined) {
    const nums = (Array.isArray(value.at) ? value.at : String(value.at).trim().split(/\s+/)).map(Number);
    if (!AIMED.includes(kind) || nums.length !== 2 || nums.some((v) => !Number.isFinite(v) || v < 0 || v > 1))
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
    ...(kind === MORPH || (AIMED.includes(kind) && typeof value.element === "string" && value.element.trim()) ? { element: String(value.element).trim() } : {}),
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
  area?: [number, number, number, number];
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
  direction?: Direction; at?: [number, number]; area?: [number, number, number, number] },
  n: number): Promise<string[] | null> {
  const kind = KINDS[opts.kind]!;
  const theme = opts.theme ?? resolveTheme(undefined);
  const light = { SEAM: rgbOf(theme["--tr-seam"]!), IRIS: rgbOf(theme["--tr-iris"]!), FLASH: rgbOf(theme["--tr-flash"]!),
    FILL: rgbOf(theme["--tr-fill"]!), SHADE: Number(theme["--tr-shade"]), DIP: rgbOf(dipOf(opts)),
    DIR: dirVector(opts.direction), AT: opts.at ?? [0.5, 0.5], AREA: opts.area ?? areaAround(opts.at) };
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
      gl.uniform4fv(gl.getUniformLocation(prog, "AREA"), light.AREA);
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
