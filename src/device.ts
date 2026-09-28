// Рамка устройства вокруг снимка или клипа: окно браузера или телефон.
//
// Одна раскладка на всех, кто рамку рисует. Готовый клип ставит в экран
// рамки сборка (ffmpeg масштабирует его в прямоугольник экрана), а саму рамку
// рисует слой композиции поверх; снимок экрана ставит в тот же прямоугольник
// страница слайда. Посчитай они прямоугольник каждый по-своему — клип уехал
// бы из-под рамки на несколько пикселей, и это видно на первом же кадре.
//
// Раскладка не знает единиц: ей дают коробку, в которую рамку вписать, и
// соотношение сторон содержимого, а отвечает она прямоугольниками в тех же
// единицах. Сборка считает в пикселях кадра, слайд — в пикселях своей сетки.
import { msg } from "./msg.js";

export type DeviceKind = "browser" | "phone" | "frame";

/** Рамка так, как её пишут в сценарии: `browser`, `browser app.example.com`, `phone` или JSON. */
export interface Device {
  kind: DeviceKind;
  /** адрес в строке браузера; у телефона не рисуется */
  url?: string;
}

export interface Box { x: number; y: number; w: number; h: number }

export interface DeviceLayout {
  device: Device;
  /** экран: сюда ложится содержимое */
  screen: Box;
  /** рамка целиком, вместе со строкой адреса или корпусом */
  outer: Box;
  /** скругление экрана */
  radius: number;
  /** высота строки адреса у браузера, толщина корпуса у телефона */
  chrome: number;
}

export const DEVICE_KINDS: DeviceKind[] = ["browser", "phone", "frame"];
const KINDS = DEVICE_KINDS;

export function parseDevice(raw: string): Device {
  const text = raw.trim();
  if (text.startsWith("{")) {
    let v: unknown;
    try { v = JSON.parse(text); } catch { throw new Error(msg("device.form")); }
    if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error(msg("device.form"));
    const r = v as Record<string, unknown>;
    for (const k of Object.keys(r)) if (!["kind", "url"].includes(k)) throw new Error(msg("source.unknownProperty", { field: "device", key: k }));
    if (!KINDS.includes(r.kind as DeviceKind)) throw new Error(msg("device.kind", { kinds: KINDS.join(" | ") }));
    if (r.url !== undefined && typeof r.url !== "string") throw new Error(msg("device.url"));
    return { kind: r.kind as DeviceKind, ...(r.url ? { url: String(r.url) } : {}) };
  }
  const [kind, ...rest] = text.split(/\s+/);
  if (!KINDS.includes(kind as DeviceKind)) throw new Error(msg("device.unknown", { kinds: KINDS.join(" | "), kind }));
  const url = rest.join(" ").trim();
  return { kind: kind as DeviceKind, ...(url ? { url } : {}) };
}

/** Чётное целое: ffmpeg масштабирует в 4:2:0 только в чётные размеры. */
const even = (v: number): number => Math.max(2, Math.round(v / 2) * 2);

/**
 * Вписать рамку в коробку. `aspect` — ширина к высоте содержимого; без него
 * берётся обычный экран устройства: 16:10 у браузера, 9:19,5 у телефона.
 */
export function deviceLayout(device: Device, box: Box, aspect?: number): DeviceLayout {
  if (device.kind === "frame") {
    // Стильная рамка: содержимое на фоне темы с полями, скруглением и тенью, без корпуса и строки
    // адреса — окно само по себе. Поле — двенадцатая часть меньшей стороны коробки.
    const a = aspect ?? 16 / 10;
    const pad = Math.min(box.w, box.h) / 12;
    let w = box.w - pad * 2, h = w / a;
    if (h > box.h - pad * 2) { h = box.h - pad * 2; w = h * a; }
    w = even(w); h = even(h);
    const x = even(box.x + (box.w - w) / 2), y = even(box.y + (box.h - h) / 2);
    return { device, screen: { x, y, w, h }, outer: { x, y, w, h }, radius: Math.round(Math.min(w, h) * 0.03), chrome: 0 };
  }
  if (device.kind === "browser") {
    const a = aspect ?? 16 / 10;
    // Строка адреса крупнее, чем у настоящего окна: в кадре её читают с экрана
    // ролика, а не с монитора в полуметре.
    // Не ниже 40 точек: в узкой сетке вертикали доля от коробки давала адрес
    // мельче порога читаемости.
    const bar = Math.max(40, Math.min(box.w, box.h) * 0.066);
    let w = box.w, h = w / a;
    if (h + bar > box.h) { h = box.h - bar; w = h * a; }
    w = even(w); h = even(h);
    const chrome = even(bar);
    const x = even(box.x + (box.w - w) / 2);
    const y = even(box.y + (box.h - h - chrome) / 2 + chrome);
    return { device, screen: { x, y, w, h }, outer: { x, y: y - chrome, w, h: h + chrome },
      radius: Math.round(Math.min(w, h) * 0.018), chrome };
  }
  const a = aspect ?? 9 / 19.5;
  // Корпус толщиной в двадцать пятую ширины экрана с каждой стороны, и
  // вписывается экран вместе с ним: снаружи рамка шире экрана на 0,08 его ширины.
  let w = box.w / 1.08;
  if (w / a + w * 0.08 > box.h) w = box.h / (1 / a + 0.08);
  w = even(w);
  const h = even(w / a);
  const chrome = even(Math.max(6, w * 0.04));
  const x = even(box.x + (box.w - w) / 2);
  const y = even(box.y + (box.h - h) / 2);
  return { device, screen: { x, y, w, h }, outer: { x: x - chrome, y: y - chrome, w: w + chrome * 2, h: h + chrome * 2 },
    radius: Math.round(w * 0.11), chrome };
}

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const px = (v: number): string => `${Math.round(v * 100) / 100}px`;

/**
 * Разметка рамки. Экран — прозрачный прямоугольник: корпус и тень нарисованы
 * ВНЕШНИМИ тенями, которые под сам прямоугольник не заходят, поэтому клип под
 * слоем композиции виден сквозь него. `inner` кладётся внутрь экрана — так
 * слайд ставит туда снимок.
 *
 * `surround` закрывает всё вне рамки фоном темы: у клипа за рамкой иначе
 * виднелась бы чёрная подложка сборки.
 */
export function deviceMarkup(l: DeviceLayout, o: { inner?: string; surround?: { width: number; height: number } } = {}): string {
  const s = l.screen;
  const parts: string[] = [];
  if (o.surround) {
    const { width: W, height: H } = o.surround;
    const r = l.device.kind === "phone" ? l.radius + l.chrome : l.radius;
    const { x, y, w, h } = l.outer;
    const path = `M0 0 H${W} V${H} H0 Z M${x + r} ${y} H${x + w - r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h - r} `
      + `A${r} ${r} 0 0 1 ${x + w - r} ${y + h} H${x + r} A${r} ${r} 0 0 1 ${x} ${y + h - r} V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`;
    parts.push(`<div class="dv-sur" style="clip-path:path(evenodd,'${path}')"></div>`);
  }
  if (l.device.kind === "frame") {
    parts.push(`<div class="dv dv-frame" style="left:${px(s.x)};top:${px(s.y)};width:${px(s.w)};height:${px(s.h)};`
      + `border-radius:${px(l.radius)}">${o.inner ?? ""}</div>`);
  } else if (l.device.kind === "browser") {
    const bar = l.chrome;
    const dot = bar * 0.26;
    parts.push(`<div class="dv dv-browser" style="left:${px(s.x)};top:${px(s.y)};width:${px(s.w)};height:${px(s.h)};`
      + `border-bottom-left-radius:${px(l.radius)};border-bottom-right-radius:${px(l.radius)}">`
      + `<div class="dv-bar" style="height:${px(bar)};top:${px(-bar)};border-radius:${px(l.radius + 4)} ${px(l.radius + 4)} 0 0">`
      + [0, 1, 2].map((i) => `<i style="width:${px(dot)};height:${px(dot)};left:${px(bar * 0.45 + i * dot * 1.7)}"></i>`).join("")
      + (l.device.url ? `<span class="dv-url" style="height:${px(bar * 0.64)};font-size:${px(bar * 0.42)};`
        + `border-radius:${px(bar * 0.3)}"><b>⌂</b>${esc(l.device.url)}</span>` : "")
      + `</div>${o.inner ?? ""}</div>`);
  } else {
    const c = l.chrome;
    // Корпус — собственная кромка элемента цветом корпуса темы, обод — контур: экран стоит на
    // прежнем месте, а наружу растёт только корпус.
    parts.push(`<div class="dv dv-phone" style="left:${px(s.x - c)};top:${px(s.y - c)};width:${px(s.w)};height:${px(s.h)};`
      + `border-width:${px(c)};border-radius:${px(l.radius + c)};--r:${px(l.radius)}">${o.inner ?? ""}`
      + `<span class="dv-island" style="top:${px(c * 0.9)};height:${px(s.w * 0.075)};width:${px(s.w * 0.3)}"></span></div>`);
  }
  return parts.join("");
}

/**
 * Оформление рамки — из переменных темы, как и всё прочее: корпус из цвета
 * карточек, линия из цвета линий. Правила общие для слайда и слоя композиции.
 */
export const DEVICE_CSS = `
.dv{position:absolute;box-sizing:border-box;overflow:hidden}
.dv-browser{overflow:visible;box-shadow:var(--dv-browser-shadow)}
.dv-frame{box-shadow:var(--dv-browser-shadow)}
.dv-scr{position:absolute;inset:0;overflow:hidden;border-radius:inherit}
.dv-bar{position:absolute;left:-1px;right:-1px;box-sizing:border-box;
  background:linear-gradient(180deg,color-mix(in srgb,var(--card) 88%,var(--dv-bar-tint)),var(--card));
  border:var(--hairline) solid var(--line);border-bottom:none;display:flex;align-items:center;justify-content:center}
.dv-bar i{position:absolute;top:50%;translate:0 -50%;border-radius:50%}
.dv-bar i:nth-child(1){background:var(--sc-traffic-1)}.dv-bar i:nth-child(2){background:var(--sc-traffic-2)}
.dv-bar i:nth-child(3){background:var(--sc-traffic-3)}
.dv-url{display:flex;align-items:center;gap:.5em;padding:0 var(--dv-url-pad);min-width:38%;max-width:62%;box-sizing:border-box;
  justify-content:center;white-space:nowrap;overflow:hidden;color:var(--body);
  background:color-mix(in srgb,var(--bg) 70%,transparent);font-family:var(--sans)}
.dv-url b{color:var(--mut);font-weight:400}
.dv-phone{box-sizing:content-box;border-style:solid;border-color:var(--dv-bezel);
  outline:var(--dv-rim-width) solid var(--dv-rim);box-shadow:var(--dv-shadow)}
.dv-phone>.dv-scr{border-radius:var(--r)}
.dv-island{position:absolute;left:50%;translate:-50% 0;border-radius:var(--radius-pill);background:var(--dv-island);z-index:2}
.dv-sur{position:absolute;inset:0;background:
  radial-gradient(120% 90% at 70% 0%,color-mix(in srgb,var(--glow) 90%,transparent),transparent 60%),
  radial-gradient(80% 70% at 10% 100%,color-mix(in srgb,var(--acc) 14%,transparent),transparent 70%),var(--bg)}
`;
