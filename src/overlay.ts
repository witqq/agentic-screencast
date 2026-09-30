/** Timed annotations shared by rendered pages and imported video clips. */
import { msg } from "./msg.js";
import { retiredAs } from "./retired.js";
export interface OverlayPoint {
  at: number;
  /** Position as a fraction of the final frame, not source-video pixels. */
  x: number;
  y: number;
  click?: boolean;
  /** предмет страницы, который тянется к указателю, пока тот рядом, — магнит перед нажатием */
  magnet?: string;
  /**
   * предмет страницы, который указатель берёт в этой точке и несёт до следующей: там предмет
   * остаётся лежать — перетаскивание карточки, файла, ползунка
   */
  drag?: string;
}

/**
 * Действие на странице в момент `at`: то, что делает нажатие, без скрипта самой страницы.
 *
 *   toggle   тумблер или флажок переключается (`checked`, `aria-checked`, `aria-pressed`)
 *   tab      вкладка выбирается, её соседки гаснут, панели по `aria-controls` меняются
 *   open     меню или раскрывашка открывается (`open`, `aria-expanded`, панель по `aria-controls`)
 *   close    то же, закрывается
 *   class    у предмета переключается названный класс — любая перемена, которую знает вёрстка
 *   reorder  дети предмета встают в новом порядке `order`
 *
 * Перемена раскладки после действия не прыгает: предметы `glide` (у `reorder` — дети предмета)
 * переезжают со старых мест на новые за 0,6 с — приём FLIP.
 */
export const ACTION_KINDS = ["toggle", "tab", "open", "close", "class", "reorder"] as const;
export interface OverlayAction {
  at: number;
  target: string;
  kind: (typeof ACTION_KINDS)[number];
  /** у `class` — какой класс переключить; у `tab` и `open` — класс выбранного (умолчание: active, open) */
  class?: string;
  /** у `reorder`: новый порядок детей, номера с единицы */
  order?: number[];
  /** CSS-селектор предметов, которые переезжают на новые места плавно */
  glide?: string;
}

/** Прожектор: всё темнеет, светлый круг идёт за указателем накладки. */
export interface OverlayTorch {
  at: number;
  hold: number;
  /** диаметр круга, доля ширины кадра */
  size?: number;
}

/**
 * «ИИ думает»: строка с бегущим по ней бликом и мерцающие полосы скелетона на месте будущего
 * ответа. С предметом (`target`, `area`) скелетон ложится поверх него и сходит, открывая ответ.
 */
export interface OverlayThinking extends OverlayAnchor {
  at: number;
  hold: number;
  /** строка, по которой бежит блик; умолчание — «Thinking…» */
  text?: string;
  /** сколько полос скелетона, 0–5; умолчание — 3 */
  lines?: number;
}

/**
 * Как собирается фраза: по словам или по буквам, у каждой единицы свой вход.
 *
 *   по словам:  rise — всплывают из размытия; spin — вкручиваются из точки;
 *               fly — влетают с разных сторон, крутясь; slide — выезжают слева
 *               с наклоном; zoom — оседают из крупного плана; bounce —
 *               выпрыгивают с пружиной;
 *               glitch — входят сбоем с расслоением цвета и сбоят снова каждые
 *               2,6 с; beat — слово за словом бьют в доли музыки, и фраза
 *               вздрагивает на каждой следующей доле; aurora — всплывают, и по
 *               буквам течёт живой градиент двух акцентов темы; sparkle —
 *               всплывают, вокруг фразы вспыхивают и гаснут искры; swarm —
 *               тысячи точек слетаются из хаоса в буквы, и фраза проступает
 *   по буквам:  drop — падают с отскоком; wave — пробегают волной;
 *               split — сходятся от краёв;
 *               flip — раскрываются снизу; blur — проступают из размытия;
 *               swirl — слетаются по спирали; flap — перещёлкиваются, как табло
 *               вокзала; arc — встают на дугу и так на ней и стоят
 *
 * Единицы стоят на своих местах в окончательной раскладке и двигаются
 * только трансформацией, поэтому строки не перекладываются.
 */
/**
 * Характер движения камеры одним словом: `gentle` — медленный наезд и неторопливый возврат для
 * спокойного объяснения, `snappy` — быстрый, как в трейлере или коротком ролике. Названные
 * `move`/`return` важнее пресета.
 */
export const CAMERA_STYLES: Record<string, { move: number; return: number }> = {
  gentle: { move: 1.3, return: 1.2 },
  snappy: { move: 0.45, return: 0.5 },
};

/** Resolve only a declared camera style, with the caller's authoring field in the error. */
export function cameraStyle(value: unknown, where: string): { move: number; return: number } | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !Object.hasOwn(CAMERA_STYLES, value))
    throw new Error(msg("overlay.options", { where, options: Object.keys(CAMERA_STYLES).join(" | ") }));
  return CAMERA_STYLES[value];
}

export const KINETIC = ["rise", "spin", "fly", "slide", "zoom", "bounce", "glitch", "beat", "aurora", "sparkle", "swarm",
  "drop", "wave", "split", "flip", "blur", "swirl", "flap", "arc"] as const;
export type Kinetic = (typeof KINETIC)[number];

export interface OverlayCard {
  at: number;
  title: string;
  body?: string;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center" | "near-focus";
  /** Reveal text gradually: typed, or the title assembled word by word or letter by letter. */
  reveal?: "fade" | "type" | Kinetic;
  /** Distinct entrance movement; all modes are functions of scene time. */
  motion?: "rise" | "pop" | "glide" | "fly";
  /**
   * Edge a flying card comes from and leaves to; only meaningful with motion "fly".
   *
   * A card that merely fades in reads as a sticker pasted over the footage, so a trailer wants the card to
   * arrive as an object: it enters from beyond the frame, overshoots, settles, and leaves the same way.
   */
  from?: "left" | "right" | "top" | "bottom";
  enter?: number;
  exit?: number;
  /** Seconds visible, including the entrance and exit. */
  hold?: number;
}

/** A held camera move over a saved page or a frame frozen from a clip. */
export interface OverlayCamera {
  at: number;
  hold: number;
  /** CSS selector on a saved page; alternatives to area, never both. */
  target?: string;
  /** [left, top, width, height] as fractions of the unzoomed frame. */
  area?: [number, number, number, number];
  scale?: number;
  move?: number;
  return?: number;
  /**
   * Остаться в приближении и ехать сразу к следующей цели, не возвращаясь к
   * общему плану: так камера путешествует по большому полотну.
   */
  keep?: boolean;
  /** на видео с записанным путём курсора окно наезда следует за курсором на удержании */
  follow?: "cursor";
  /** форма выделения: скруглённый прямоугольник (умолчание) или круг */
  shape?: "rounded" | "circle";
  /** размыть всё вне фокуса, точек кадра; только над страницей и слайдом */
  blur?: number;
  /** обесцветить всё вне фокуса; только над страницей и слайдом */
  desaturate?: boolean;
  /** false — без цветной рамки вокруг цели: кинонаезд, а не подсказка интерфейса */
  ring?: boolean;
  /** доля затемнения вне фокуса от затемнения темы: 0 — не затемнять, 1 — как в теме */
  dim?: number;
  /** пройти вдоль цели шире кадра (строки таблицы, схемы) от начала к концу за удержание */
  pan?: boolean;
}

/**
 * Где на кадре стоит предмет примитива: CSS-селектор страницы, прямоугольник
 * или точка в долях кадра. Ровно одно из трёх.
 */
export interface OverlayAnchor {
  target?: string;
  area?: [number, number, number, number];
  point?: [number, number];
}

/** Крупный кинетический титр поверх кадра: заявление, а не пояснение. */
export interface OverlayTitle {
  at: number;
  text: string;
  /**
   * rise — всплывает целиком; slam — влетает крупно и оседает; type — набирается;
   * split — слова по очереди; любое имя из KINETIC — фраза собирается этим способом
   */
  style?: "rise" | "slam" | "type" | "split" | Kinetic;
  position?: "center" | "top" | "bottom";
  hold?: number;
}

/** Нижний титр: имя и роль, название места или продукта. */
export interface OverlayLower {
  at: number;
  title: string;
  subtitle?: string;
  side?: "left" | "right";
  /** как собирается имя: любое из KINETIC */
  reveal?: Kinetic;
  hold?: number;
}

/** Выноска: короткая надпись и стрелка, конец которой лежит на предмете. */
export interface OverlayCallout extends OverlayAnchor {
  at: number;
  text: string;
  /** сторона, с которой стоит надпись; умолчание — где больше места */
  side?: "auto" | "left" | "right" | "top" | "bottom";
  hold?: number;
}

/** Стикер у предмета: эмодзи, картинка (в том числе анимированная) или бейдж-надпись. */
export interface OverlaySticker extends OverlayAnchor {
  at: number;
  emoji?: string;
  image?: string;
  text?: string;
  /** сторона стикера в точках кадра */
  size?: number;
  motion?: "pop" | "float" | "spin";
  rotate?: number;
  hold?: number;
}

/**
 * Пометка от руки у предмета: обводка, стрелка или подчёркивание, прорисовываемые
 * штрихом за `draw` секунд — как маркер ведущего по экрану.
 */
export interface OverlayMark extends OverlayAnchor {
  at: number;
  kind: "circle" | "arrow" | "underline";
  /** откуда идёт стрелка, доли кадра; умолчание — сверху слева от предмета */
  from?: [number, number];
  /** сколько секунд рисуется штрих */
  draw?: number;
  /** цвет штриха `#rrggbb`; умолчание — второй акцент темы */
  color?: string;
  hold?: number;
}

/** Блик: полоса света проходит по предмету — заголовку, карточке, кнопке. */
export interface OverlayGlint extends OverlayAnchor {
  at: number;
  /** сколько секунд идёт полоса */
  hold?: number;
}

/** Отклик предмета на событие: он вздрагивает и пружиной возвращается — «буп». */
export interface OverlayBoop {
  at: number;
  /** CSS-селектор предмета на странице */
  target: string;
  kind: "pop" | "shake" | "jelly" | "nod" | "pulse";
  /** у пульса: сколько секунд предмет дышит */
  hold?: number;
}

/** Пинг: из точки расходятся кольца, как сигнал радара. */
export interface OverlayPing extends OverlayAnchor {
  at: number;
  hold?: number;
}

/** Уведомление: карточка въезжает в угол, прежние уходят назад стопкой. */
export interface OverlayToast {
  at: number;
  title: string;
  body?: string;
  icon?: string;
  hold?: number;
}

/** Всплеск в момент успеха: конфетти или искры из предмета; раскладку задаёт зерно. */
export interface OverlayBurst extends OverlayAnchor {
  at: number;
  kind: "confetti" | "sparks";
  seed?: number;
  count?: number;
  hold?: number;
}

/**
 * Лупа: круг поверх кадра, в котором деталь предмета увеличена в `scale` раз, а камера
 * стоит на месте. Круг стоит над самим предметом, диаметр — доля ширины кадра.
 */
/** Где стоит линза лупы: над предметом, рядом с ним или в названном углу кадра. */
export const LOUPE_PLACES = ["over", "beside", "top-left", "top-right", "bottom-left", "bottom-right"] as const;

export interface OverlayLoupe extends OverlayAnchor {
  at: number;
  scale?: number;
  size?: number;
  hold?: number;
  place?: typeof LOUPE_PLACES[number];
}

export interface SceneOverlay {
  /** кривая входа титров, плашек, выносок, наклеек и уведомлений сцены */
  ease?: (typeof OVERLAY_EASES)[number];
  pointer?: OverlayPoint[];
  cards?: OverlayCard[];
  camera?: OverlayCamera[];
  titles?: OverlayTitle[];
  lower?: OverlayLower[];
  callouts?: OverlayCallout[];
  stickers?: OverlaySticker[];
  marks?: OverlayMark[];
  glints?: OverlayGlint[];
  bursts?: OverlayBurst[];
  loupe?: OverlayLoupe[];
  boops?: OverlayBoop[];
  pings?: OverlayPing[];
  toasts?: OverlayToast[];
  actions?: OverlayAction[];
  torch?: OverlayTorch[];
  thinking?: OverlayThinking[];
}

/** Время чтения короткой надписи: секунда на то, чтобы увидеть, плюс 15 знаков в секунду. */
export const readTime = (text: string, floor = 2.2): number => Math.max(floor, 1 + text.length / 15);

export function cameraEnd(cue: OverlayCamera): number {
  return cue.at + (cue.move ?? 0.9) + cue.hold + (cue.keep ? 0 : cue.return ?? 0.9);
}

export function cardHold(card: Pick<OverlayCard, "title" | "body" | "reveal" | "enter" | "exit">): number {
  // Reading time, not an arbitrary fixed slide duration. A two-line card
  // remains on screen long enough even when the source clip is shorter.
  // Набор идёт по знакам; собранная по словам фраза добавляет время своей сборки.
  const typing = card.reveal === "type" ? Math.min(3.2, (card.title.length + (card.body?.length ?? 0)) / 34)
    : card.reveal && card.reveal !== "fade" ? 1.1 : 0;
  return Math.max(3.8, 1.5 + card.title.length / 15 + (card.body?.length ?? 0) / 18)
    + typing + Math.max(0, (card.enter ?? 0.65) - 0.65) + Math.max(0, (card.exit ?? 0.45) - 0.45);
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function keys(value: Record<string, unknown>, allowed: string[], where: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(msg("source.unknownProperty", { field: where, key }));
  }
}

function time(value: unknown, where: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(msg("overlay.nonNegativeTime", { where }));
  }
  return value;
}

/**
 * Момент накладки, названный по речи: такт `b2`, конец его речи `b2.end`, смещение `b2+0.5`,
 * доля сцены `40%`. Секунды устаревают при смене голоса или темпа, якорь такта — нет.
 */
export const MOMENT = /^(?:b\d+(?:\.end)?(?:\s*[+-]\s*[\d.]+)?|[\d.]+\s*%)$/i;
let momentOf: ((anchor: string) => number) | undefined;

function momentAt(value: unknown, where: string): number {
  if (typeof value === "string") {
    if (!MOMENT.test(value.trim())) throw new Error(msg("overlay.badMoment", { where, value }));
    if (!momentOf) throw new Error(msg("overlay.unresolvedMoment", { where, value }));
    return Math.max(0, momentOf(value.trim()));
  }
  return time(value, where);
}

/**
 * Reject malformed or unreadably fast annotations before rendering. `moment` turns a beat anchor
 * of an `at` into seconds of the scene; without it only seconds are accepted.
 */
export function parseOverlay(json: string, moment?: (anchor: string) => number): SceneOverlay {
  momentOf = moment;
  try { return parseOverlayBody(json); } finally { momentOf = undefined; }
}

/** Кривые входа примитивов накладки (`overlay.ease`) — те же имена, что у входов слайда. */
export const OVERLAY_EASES = ["standard", "emphasized", "expressive", "spring", "bouncy"] as const;

function parseOverlayBody(json: string): SceneOverlay {
  let value: unknown;
  try { value = JSON.parse(json); }
  catch { throw new Error(msg("source.jsonObject", { field: "overlay" })); }
  if (!object(value)) throw new Error(msg("source.jsonObject", { field: "overlay" }));
  keys(value, ["pointer", "cards", "camera", "titles", "lower", "callouts", "stickers", "marks", "glints", "bursts", "loupe",
    "boops", "pings", "toasts", "ease", "actions", "torch", "thinking"], "overlay");
  const overlay: SceneOverlay = {};
  if (value.ease !== undefined) {
    if (!(OVERLAY_EASES as readonly unknown[]).includes(value.ease))
      throw new Error(msg("overlay.ease", { options: OVERLAY_EASES.join(" | ") }));
    overlay.ease = value.ease as SceneOverlay["ease"];
  }
  if (value.pointer !== undefined) {
    if (!Array.isArray(value.pointer)) throw new Error(msg("overlay.array", { where: "overlay.pointer" }));
    let last = -1;
    overlay.pointer = value.pointer.map((raw: unknown, i: number): OverlayPoint => {
      if (!object(raw)) throw new Error(msg("overlay.object", { where: `overlay.pointer[${i}]` }));
      keys(raw, ["at", "x", "y", "click", "magnet", "drag"], `overlay.pointer[${i}]`);
      for (const key of ["magnet", "drag"] as const) {
        if (raw[key] !== undefined && (typeof raw[key] !== "string" || !raw[key].trim()))
          throw new Error(msg("overlay.cssSelector", { where: `overlay.pointer[${i}].${key}` }));
      }
      // Предмет несут до следующей точки: у последней нести некуда.
      if (raw.drag !== undefined && i === (value.pointer as unknown[]).length - 1)
        throw new Error(msg("overlay.dragEnd", { where: `overlay.pointer[${i}].drag` }));
      const at = momentAt(raw.at, `overlay.pointer[${i}]`);
      if (at <= last) throw new Error(msg("overlay.pointerOrder"));
      last = at;
      for (const axis of ["x", "y"] as const) {
        if (typeof raw[axis] !== "number" || !Number.isFinite(raw[axis]) || raw[axis] < 0 || raw[axis] > 1)
          throw new Error(msg("overlay.frameFraction", { where: `overlay.pointer[${i}].${axis}` }));
      }
      if (raw.click !== undefined && typeof raw.click !== "boolean")
        throw new Error(msg("overlay.boolean", { where: `overlay.pointer[${i}].click` }));
      return { at, x: raw.x as number, y: raw.y as number,
        ...(raw.click === undefined ? {} : { click: raw.click as boolean }),
        ...(typeof raw.magnet === "string" ? { magnet: raw.magnet.trim() } : {}),
        ...(typeof raw.drag === "string" ? { drag: raw.drag.trim() } : {}) };
    });
  }
  if (value.cards !== undefined) {
    if (!Array.isArray(value.cards)) throw new Error(msg("overlay.array", { where: "overlay.cards" }));
    let previousEnd = -1;
    overlay.cards = value.cards.map((raw: unknown, i: number): OverlayCard => {
      if (!object(raw)) throw new Error(msg("overlay.object", { where: `overlay.cards[${i}]` }));
      keys(raw, ["at", "title", "body", "position", "hold", "reveal", "motion", "from", "enter", "exit"],
        `overlay.cards[${i}]`);
      const at = momentAt(raw.at, `overlay.cards[${i}]`);
      if (typeof raw.title !== "string" || !raw.title.trim() || raw.title.length > 44)
        throw new Error(msg("overlay.textLength", { where: `overlay.cards[${i}].title`, max: 44 }));
      if (raw.body !== undefined && (typeof raw.body !== "string" || raw.body.length > 100))
        throw new Error(msg("overlay.bodyLength", { where: `overlay.cards[${i}].body` }));
      if (raw.position !== undefined && !["top-left", "top-right", "bottom-left", "bottom-right", "center", "near-focus"].includes(String(raw.position)))
        throw new Error(msg("overlay.unknownPosition", { where: `overlay.cards[${i}].position` }));
      const revealUse = typeof raw.reveal === "string" ? retiredAs("text", raw.reveal) : undefined;
      if (revealUse) throw new Error(msg("retired", { field: `overlay.cards[${i}].reveal`, value: String(raw.reveal), use: revealUse }));
      if (raw.reveal !== undefined && !["fade", "type", ...KINETIC].includes(String(raw.reveal)))
        throw new Error(msg("overlay.options", { where: `overlay.cards[${i}].reveal`, options: `fade | type | ${KINETIC.join(" | ")}` }));
      if (raw.motion !== undefined && !["rise", "pop", "glide", "fly"].includes(String(raw.motion)))
        throw new Error(msg("overlay.unknownMotion", { where: `overlay.cards[${i}].motion` }));
      if (raw.from !== undefined && !["left", "right", "top", "bottom"].includes(String(raw.from)))
        throw new Error(msg("overlay.unknownEdge", { where: `overlay.cards[${i}].from` }));
      if (raw.from !== undefined && raw.motion !== "fly")
        throw new Error(msg("overlay.flyEdge", { where: `overlay.cards[${i}].from` }));
      for (const part of ["enter", "exit"] as const) {
        if (raw[part] !== undefined && (typeof raw[part] !== "number" || !Number.isFinite(raw[part]) || raw[part] < 0.2 || raw[part] > 2.5))
          throw new Error(msg("overlay.enterExit", { where: `overlay.cards[${i}].${part}` }));
      }
      const title = raw.title.trim();
      const body = typeof raw.body === "string" ? raw.body.trim() : undefined;
      const reveal = raw.reveal as OverlayCard["reveal"];
      const motion = raw.motion as OverlayCard["motion"];
      const from = raw.from as OverlayCard["from"];
      const enter = raw.enter as number | undefined;
      const exit = raw.exit as number | undefined;
      const minimum = cardHold({ title, body, reveal, enter, exit });
      const hold = raw.hold === undefined ? minimum : time(raw.hold, `overlay.cards[${i}]`);
      if (hold < minimum) throw new Error(msg("overlay.readHold", { where: `overlay.cards[${i}].hold`, minimum: minimum.toFixed(2) }));
      if (at < previousEnd + 0.35) throw new Error(msg("overlay.cardGap"));
      previousEnd = at + hold;
      return { at, title, ...(body ? { body } : {}),
        ...(raw.position ? { position: raw.position as OverlayCard["position"] } : {}),
        ...(reveal ? { reveal } : {}), ...(motion ? { motion } : {}), ...(from ? { from } : {}),
        ...(enter !== undefined ? { enter } : {}), ...(exit !== undefined ? { exit } : {}), hold };
    });
  }
  if (value.camera !== undefined) {
    if (!Array.isArray(value.camera)) throw new Error(msg("overlay.array", { where: "overlay.camera" }));
    let previousEnd = -1;
    overlay.camera = value.camera.map((raw: unknown, i: number): OverlayCamera => {
      if (!object(raw)) throw new Error(msg("overlay.object", { where: `overlay.camera[${i}]` }));
      keys(raw, ["at", "hold", "target", "area", "scale", "move", "return", "keep", "shape", "blur", "desaturate", "ring", "dim", "pan", "follow", "style"],
        `overlay.camera[${i}]`);
      const at = momentAt(raw.at, `overlay.camera[${i}]`);
      const hold = time(raw.hold, `overlay.camera[${i}]`);
      if (hold < 0.8) throw new Error(msg("overlay.cameraHold", { where: `overlay.camera[${i}].hold` }));
      if (raw.target !== undefined && (typeof raw.target !== "string" || !raw.target.trim()))
        throw new Error(msg("overlay.cssSelector", { where: `overlay.camera[${i}].target` }));
      if (raw.area !== undefined && !Array.isArray(raw.area))
        throw new Error(msg("overlay.cameraArea", { where: `overlay.camera[${i}].area` }));
      if ((typeof raw.target === "string" && raw.target.trim().length > 0) === Array.isArray(raw.area))
        throw new Error(msg("overlay.oneTargetArea", { where: `overlay.camera[${i}]` }));
      let area: OverlayCamera["area"];
      if (Array.isArray(raw.area)) {
        if (raw.area.length !== 4 || raw.area.some((v) => typeof v !== "number" || !Number.isFinite(v)))
          throw new Error(msg("overlay.cameraArea", { where: `overlay.camera[${i}].area` }));
        const [x, y, w, h] = raw.area as number[];
        if (x! < 0 || y! < 0 || w! <= 0 || h! <= 0 || x! + w! > 1 || y! + h! > 1)
          throw new Error(msg("overlay.outsideFrame", { where: `overlay.camera[${i}].area` }));
        area = [x!, y!, w!, h!];
      }
      // Без названного увеличения его выбирает кадр: наезд по умолчанию, но не больше того, при
      // котором цель целиком в кадре (`pushScale`). Названное остаётся как есть.
      const scale = raw.scale;
      // Увеличение 1 — подсветка без наезда: кадр стоит, вокруг цели темнеет и встаёт рамка.
      if (scale !== undefined && (typeof scale !== "number" || !Number.isFinite(scale) || scale < 1 || scale > 3))
        throw new Error(msg("overlay.cameraScale", { where: `overlay.camera[${i}].scale` }));
      const style = cameraStyle(raw.style, `overlay.camera[${i}].style`);
      const move = raw.move === undefined ? style?.move ?? 0.9 : time(raw.move, `overlay.camera[${i}].move`);
      const back = raw.return === undefined ? style?.return ?? 0.9 : time(raw.return, `overlay.camera[${i}].return`);
      if (move < 0.35 || back < 0.35 || move > 4 || back > 4)
        throw new Error(msg("overlay.moveReturn", { where: `overlay.camera[${i}]` }));
      if (raw.keep !== undefined && typeof raw.keep !== "boolean")
        throw new Error(msg("overlay.trueFalse", { where: `overlay.camera[${i}].keep` }));
      if (raw.shape !== undefined && !["rounded", "circle"].includes(String(raw.shape)))
        throw new Error(msg("overlay.options", { where: `overlay.camera[${i}].shape`, options: "rounded | circle" }));
      if (raw.blur !== undefined && (typeof raw.blur !== "number" || raw.blur < 0 || raw.blur > 24))
        throw new Error(msg("overlay.blur", { where: `overlay.camera[${i}].blur` }));
      if (raw.desaturate !== undefined && typeof raw.desaturate !== "boolean")
        throw new Error(msg("overlay.trueFalse", { where: `overlay.camera[${i}].desaturate` }));
      if (raw.ring !== undefined && typeof raw.ring !== "boolean")
        throw new Error(msg("overlay.trueFalse", { where: `overlay.camera[${i}].ring` }));
      if (raw.dim !== undefined && (typeof raw.dim !== "number" || raw.dim < 0 || raw.dim > 1))
        throw new Error(msg("overlay.dim", { where: `overlay.camera[${i}].dim` }));
      if (raw.pan !== undefined && typeof raw.pan !== "boolean")
        throw new Error(msg("overlay.trueFalse", { where: `overlay.camera[${i}].pan` }));
      if (raw.follow !== undefined && raw.follow !== "cursor")
        throw new Error(msg("overlay.follow", { where: `overlay.camera[${i}].follow` }));
      const cue: OverlayCamera = { at, hold, ...(scale !== undefined ? { scale: scale as number } : {}), move, return: back,
        ...(area ? { area } : { target: (raw.target as string).trim() }),
        ...(raw.keep ? { keep: true } : {}), ...(raw.shape ? { shape: raw.shape as OverlayCamera["shape"] } : {}),
        ...(raw.blur ? { blur: raw.blur as number } : {}), ...(raw.desaturate ? { desaturate: true } : {}),
        ...(raw.ring === false ? { ring: false } : {}), ...(raw.dim !== undefined ? { dim: raw.dim as number } : {}),
        ...(raw.pan ? { pan: true } : {}), ...(raw.follow ? { follow: "cursor" as const } : {}) };
      // Движение, оставшееся в приближении, передаёт камеру следующему без
      // возврата: зазор между ними не нужен, нужно только не начать раньше конца удержания.
      const chained = i > 0 && (value.camera as Array<{ keep?: boolean }>)[i - 1]?.keep === true;
      if (chained ? at < previousEnd - 1e-6 : at < previousEnd + 0.35)
        throw new Error(chained ? msg("overlay.cameraChained", { at: at.toFixed(2), end: previousEnd.toFixed(2) })
          : msg("overlay.cameraBack", { at: at.toFixed(2), end: previousEnd.toFixed(2), start: (previousEnd + 0.35).toFixed(2) }));
      previousEnd = cameraEnd(cue);
      return cue;
    });
  }
  const list = (name: string): unknown[] | undefined => {
    const v = value[name];
    if (v === undefined) return undefined;
    if (!Array.isArray(v)) throw new Error(msg("overlay.array", { where: `overlay.${name}` }));
    return v;
  };
  const text = (raw: Record<string, unknown>, key: string, max: number, where: string, optional = false): string | undefined => {
    const v = raw[key];
    if (v === undefined && optional) return undefined;
    if (typeof v !== "string" || !v.trim() || v.length > max)
      throw new Error(msg("overlay.textLength", { where: `${where}.${key}`, max }));
    return v.trim();
  };
  const oneOf = <T extends string>(raw: Record<string, unknown>, key: string, allowed: readonly T[], where: string): T | undefined => {
    const v = raw[key];
    if (v === undefined) return undefined;
    const use = (key === "style" || key === "reveal") && typeof v === "string" ? retiredAs("text", v) : undefined;
    if (use) throw new Error(msg("retired", { field: `${where}.${key}`, value: String(v), use }));
    if (!allowed.includes(v as T)) throw new Error(msg("overlay.options", { where: `${where}.${key}`, options: allowed.join(" | ") }));
    return v as T;
  };
  const holdOf = (raw: Record<string, unknown>, minimum: number, where: string): number => {
    const hold = raw.hold === undefined ? minimum : time(raw.hold, where);
    if (hold < minimum) throw new Error(msg("overlay.readHold", { where: `${where}.hold`, minimum: minimum.toFixed(2) }));
    return hold;
  };
  const anchor = (raw: Record<string, unknown>, where: string, required: boolean): OverlayAnchor => {
    const named = ["target", "area", "point"].filter((k) => raw[k] !== undefined);
    if (named.length > 1) throw new Error(msg("overlay.oneAnchor", { where }));
    if (!named.length) {
      if (required) throw new Error(msg("overlay.anchorRequired", { where }));
      return {};
    }
    if (raw.target !== undefined) {
      if (typeof raw.target !== "string" || !raw.target.trim()) throw new Error(msg("overlay.cssSelector", { where: `${where}.target` }));
      return { target: raw.target.trim() };
    }
    const nums = (v: unknown, n: number, what: string): number[] => {
      if (!Array.isArray(v) || v.length !== n || v.some((x) => typeof x !== "number" || !Number.isFinite(x) || x < 0 || x > 1))
        throw new Error(msg("overlay.frameFractions", { where: `${where}.${what}`, count: n }));
      return v as number[];
    };
    if (raw.area !== undefined) {
      const [x, y, w, h] = nums(raw.area, 4, "area");
      if (w! <= 0 || h! <= 0 || x! + w! > 1 || y! + h! > 1) throw new Error(msg("overlay.outsideFrame", { where: `${where}.area` }));
      return { area: [x!, y!, w!, h!] };
    }
    const [x, y] = nums(raw.point, 2, "point");
    return { point: [x!, y!] };
  };
  const ordered = <T extends { at: number; hold?: number }>(items: T[], name: string): T[] => {
    let previousEnd = -1;
    for (const item of items) {
      if (item.at < previousEnd + 0.2) throw new Error(msg("overlay.itemGap", { where: `overlay.${name}` }));
      previousEnd = item.at + (item.hold ?? 0);
    }
    return items;
  };
  const titles = list("titles");
  if (titles) overlay.titles = ordered(titles.map((raw: unknown, i: number): OverlayTitle => {
    const where = `overlay.titles[${i}]`;
    if (!object(raw)) throw new Error(msg("overlay.object", { where }));
    keys(raw, ["at", "text", "style", "position", "hold"], where);
    const t = text(raw, "text", 60, where)!;
    const style = oneOf(raw, "style", ["slam", "type", "split", ...KINETIC] as const, where);
    const position = oneOf(raw, "position", ["center", "top", "bottom"] as const, where);
    return { at: momentAt(raw.at, where), text: t, ...(style ? { style } : {}), ...(position ? { position } : {}),
      hold: holdOf(raw, readTime(t) + (style === "type" ? Math.min(2.5, t.length / 22)
        : style && !["slam", "split", "rise"].includes(style) ? 1.1 : 0), where) };
  }), "titles");
  const lower = list("lower");
  if (lower) overlay.lower = ordered(lower.map((raw: unknown, i: number): OverlayLower => {
    const where = `overlay.lower[${i}]`;
    if (!object(raw)) throw new Error(msg("overlay.object", { where }));
    keys(raw, ["at", "title", "subtitle", "side", "reveal", "hold"], where);
    const title = text(raw, "title", 40, where)!;
    const subtitle = text(raw, "subtitle", 60, where, true);
    const side = oneOf(raw, "side", ["left", "right"] as const, where);
    const reveal = oneOf(raw, "reveal", KINETIC, where);
    return { at: momentAt(raw.at, where), title, ...(subtitle ? { subtitle } : {}), ...(side ? { side } : {}),
      ...(reveal ? { reveal } : {}),
      hold: holdOf(raw, readTime(title + (subtitle ?? ""), 3), where) };
  }), "lower");
  const callouts = list("callouts");
  if (callouts) overlay.callouts = ordered(callouts.map((raw: unknown, i: number): OverlayCallout => {
    const where = `overlay.callouts[${i}]`;
    if (!object(raw)) throw new Error(msg("overlay.object", { where }));
    keys(raw, ["at", "text", "target", "area", "point", "side", "hold"], where);
    const t = text(raw, "text", 60, where)!;
    const side = oneOf(raw, "side", ["auto", "left", "right", "top", "bottom"] as const, where);
    return { at: momentAt(raw.at, where), text: t, ...anchor(raw, where, true), ...(side ? { side } : {}),
      hold: holdOf(raw, readTime(t), where) };
  }), "callouts");
  const stickers = list("stickers");
  if (stickers) overlay.stickers = stickers.map((raw: unknown, i: number): OverlaySticker => {
    const where = `overlay.stickers[${i}]`;
    if (!object(raw)) throw new Error(msg("overlay.object", { where }));
    keys(raw, ["at", "emoji", "image", "text", "target", "area", "point", "size", "motion", "rotate", "hold"], where);
    const kinds = ["emoji", "image", "text"].filter((k) => raw[k] !== undefined);
    if (kinds.length !== 1) throw new Error(msg("overlay.oneStickerKind", { where }));
    const emoji = text(raw, "emoji", 16, where, true);
    const image = text(raw, "image", 400, where, true);
    const label = text(raw, "text", 24, where, true);
    const size = raw.size === undefined ? undefined : Number(raw.size);
    if (size !== undefined && (!Number.isFinite(size) || size < 24 || size > 480))
      throw new Error(msg("overlay.stickerSize", { where: `${where}.size` }));
    const rotate = raw.rotate === undefined ? undefined : Number(raw.rotate);
    if (rotate !== undefined && (!Number.isFinite(rotate) || Math.abs(rotate) > 45))
      throw new Error(msg("overlay.rotate", { where: `${where}.rotate` }));
    const motion = oneOf(raw, "motion", ["pop", "float", "spin"] as const, where);
    return { at: momentAt(raw.at, where), ...(emoji ? { emoji } : {}), ...(image ? { image } : {}),
      ...(label ? { text: label } : {}), ...anchor(raw, where, true),
      ...(size !== undefined ? { size } : {}), ...(motion ? { motion } : {}),
      ...(rotate !== undefined ? { rotate } : {}),
      hold: raw.hold === undefined ? 2.5 : time(raw.hold, where) };
  });
  const marks = list("marks");
  if (marks) overlay.marks = marks.map((raw: unknown, i: number): OverlayMark => {
    const where = `overlay.marks[${i}]`;
    if (!object(raw)) throw new Error(msg("overlay.object", { where }));
    keys(raw, ["at", "kind", "target", "area", "point", "from", "draw", "color", "hold"], where);
    const kind = oneOf(raw, "kind", ["circle", "arrow", "underline"] as const, where);
    if (!kind) throw new Error(msg("overlay.options", { where: `${where}.kind`, options: "circle | arrow | underline" }));
    let from: [number, number] | undefined;
    if (raw.from !== undefined) {
      if (kind !== "arrow") throw new Error(msg("overlay.arrowFrom", { where: `${where}.from` }));
      if (!Array.isArray(raw.from) || raw.from.length !== 2 || raw.from.some((x) => typeof x !== "number" || x < 0 || x > 1))
        throw new Error(msg("overlay.twoFrameFractions", { where: `${where}.from` }));
      from = [raw.from[0] as number, raw.from[1] as number];
    }
    const draw = raw.draw === undefined ? undefined : time(raw.draw, where);
    if (draw !== undefined && (draw < 0.2 || draw > 4)) throw new Error(msg("overlay.draw", { where: `${where}.draw` }));
    if (raw.color !== undefined && (typeof raw.color !== "string" || !/^#[0-9a-f]{6}$/i.test(raw.color)))
      throw new Error(msg("overlay.color", { where: `${where}.color` }));
    return { at: momentAt(raw.at, where), kind, ...anchor(raw, where, true), ...(from ? { from } : {}),
      ...(draw !== undefined ? { draw } : {}), ...(raw.color ? { color: raw.color as string } : {}),
      hold: raw.hold === undefined ? 2.5 : time(raw.hold, where) };
  });
  const glints = list("glints");
  if (glints) overlay.glints = glints.map((raw: unknown, i: number): OverlayGlint => {
    const where = `overlay.glints[${i}]`;
    if (!object(raw)) throw new Error(msg("overlay.object", { where }));
    keys(raw, ["at", "target", "area", "hold"], where);
    // Блик идёт по предмету или области: у точки нет ширины, и полосе нечего пересечь.
    return { at: momentAt(raw.at, where), ...anchor(raw, where, true), hold: raw.hold === undefined ? 1.1 : time(raw.hold, where) };
  });
  const boops = list("boops");
  if (boops) overlay.boops = boops.map((raw: unknown, i: number): OverlayBoop => {
    const where = `overlay.boops[${i}]`;
    if (!object(raw)) throw new Error(msg("overlay.object", { where }));
    keys(raw, ["at", "target", "kind", "hold"], where);
    if (typeof raw.target !== "string" || !raw.target.trim()) throw new Error(msg("overlay.cssSelector", { where: `${where}.target` }));
    const kind = oneOf(raw, "kind", ["pop", "shake", "jelly", "nod", "pulse"] as const, where) ?? "pop";
    return { at: momentAt(raw.at, where), target: raw.target.trim(), kind,
      ...(kind === "pulse" ? { hold: raw.hold === undefined ? 3 : time(raw.hold, where) } : {}) };
  });
  const pings = list("pings");
  if (pings) overlay.pings = pings.map((raw: unknown, i: number): OverlayPing => {
    const where = `overlay.pings[${i}]`;
    if (!object(raw)) throw new Error(msg("overlay.object", { where }));
    keys(raw, ["at", "target", "area", "point", "hold"], where);
    return { at: momentAt(raw.at, where), ...anchor(raw, where, true), hold: raw.hold === undefined ? 2 : time(raw.hold, where) };
  });
  const toasts = list("toasts");
  if (toasts) overlay.toasts = toasts.map((raw: unknown, i: number): OverlayToast => {
    const where = `overlay.toasts[${i}]`;
    if (!object(raw)) throw new Error(msg("overlay.object", { where }));
    keys(raw, ["at", "title", "body", "icon", "hold"], where);
    if (typeof raw.title !== "string" || !raw.title.trim()) throw new Error(msg("overlay.text", { where: `${where}.title` }));
    return { at: momentAt(raw.at, where), title: raw.title.trim(),
      ...(typeof raw.body === "string" && raw.body.trim() ? { body: raw.body.trim() } : {}),
      ...(typeof raw.icon === "string" && raw.icon.trim() ? { icon: raw.icon.trim() } : {}),
      ...(raw.hold !== undefined ? { hold: time(raw.hold, where) } : {}) };
  });
  const bursts = list("bursts");
  if (bursts) overlay.bursts = bursts.map((raw: unknown, i: number): OverlayBurst => {
    const where = `overlay.bursts[${i}]`;
    if (!object(raw)) throw new Error(msg("overlay.object", { where }));
    keys(raw, ["at", "kind", "target", "area", "point", "seed", "count", "hold"], where);
    const kind = oneOf(raw, "kind", ["confetti", "sparks"] as const, where);
    if (!kind) throw new Error(msg("overlay.options", { where: `${where}.kind`, options: "confetti | sparks" }));
    const seed = raw.seed === undefined ? undefined : Number(raw.seed);
    if (seed !== undefined && !Number.isInteger(seed)) throw new Error(msg("overlay.wholeNumber", { where: `${where}.seed` }));
    const count = raw.count === undefined ? undefined : Number(raw.count);
    if (count !== undefined && (!Number.isInteger(count) || count < 4 || count > 300)) throw new Error(msg("overlay.count", { where: `${where}.count` }));
    return { at: momentAt(raw.at, where), kind, ...anchor(raw, where, true), ...(seed !== undefined ? { seed } : {}),
      ...(count !== undefined ? { count } : {}), hold: raw.hold === undefined ? 2.2 : time(raw.hold, where) };
  });
  const loupe = list("loupe");
  if (loupe) overlay.loupe = ordered(loupe.map((raw: unknown, i: number): OverlayLoupe => {
    const where = `overlay.loupe[${i}]`;
    if (!object(raw)) throw new Error(msg("overlay.object", { where }));
    keys(raw, ["at", "target", "area", "point", "scale", "size", "hold", "place"], where);
    const place = oneOf(raw, "place", LOUPE_PLACES, where);
    const scale = raw.scale === undefined ? undefined : Number(raw.scale);
    if (scale !== undefined && !(scale >= 1.5 && scale <= 4)) throw new Error(msg("overlay.loupeScale", { where: `${where}.scale` }));
    const size = raw.size === undefined ? undefined : Number(raw.size);
    if (size !== undefined && !(size >= 0.08 && size <= 0.5)) throw new Error(msg("overlay.loupeSize", { where: `${where}.size` }));
    return { at: momentAt(raw.at, where), ...anchor(raw, where, true), ...(scale !== undefined ? { scale } : {}),
      ...(size !== undefined ? { size } : {}), ...(place ? { place } : {}), hold: raw.hold === undefined ? 2.5 : time(raw.hold, where) };
  }), "loupe");
  const actions = list("actions");
  if (actions) overlay.actions = actions.map((raw: unknown, i: number): OverlayAction => {
    const where = `overlay.actions[${i}]`;
    if (!object(raw)) throw new Error(msg("overlay.object", { where }));
    keys(raw, ["at", "target", "kind", "class", "order", "glide"], where);
    if (typeof raw.target !== "string" || !raw.target.trim()) throw new Error(msg("overlay.cssSelector", { where: `${where}.target` }));
    const kind = oneOf(raw, "kind", ACTION_KINDS, where);
    if (!kind) throw new Error(msg("overlay.options", { where: `${where}.kind`, options: ACTION_KINDS.join(" | ") }));
    if (raw.class !== undefined && (typeof raw.class !== "string" || !/^-?[_a-zA-Z][\w-]*$/.test(raw.class)))
      throw new Error(msg("overlay.className", { where: `${where}.class` }));
    if (kind === "class" && raw.class === undefined) throw new Error(msg("overlay.className", { where: `${where}.class` }));
    let order: number[] | undefined;
    if (raw.order !== undefined || kind === "reorder") {
      if (kind !== "reorder") throw new Error(msg("overlay.orderOnlyReorder", { where: `${where}.order` }));
      const o = raw.order;
      // Новый порядок — перестановка номеров 1…n: каждый ребёнок назван ровно один раз.
      if (!Array.isArray(o) || o.length < 2 || o.some((v) => !Number.isInteger(v) || v < 1 || v > o.length)
        || new Set(o).size !== o.length) throw new Error(msg("overlay.order", { where: `${where}.order` }));
      order = o as number[];
    }
    if (raw.glide !== undefined && (typeof raw.glide !== "string" || !raw.glide.trim()))
      throw new Error(msg("overlay.cssSelector", { where: `${where}.glide` }));
    return { at: momentAt(raw.at, where), target: raw.target.trim(), kind,
      ...(typeof raw.class === "string" ? { class: raw.class } : {}), ...(order ? { order } : {}),
      ...(typeof raw.glide === "string" ? { glide: raw.glide.trim() } : {}) };
  });
  const torch = list("torch");
  if (torch) overlay.torch = ordered(torch.map((raw: unknown, i: number): OverlayTorch => {
    const where = `overlay.torch[${i}]`;
    if (!object(raw)) throw new Error(msg("overlay.object", { where }));
    keys(raw, ["at", "hold", "size"], where);
    const size = raw.size === undefined ? undefined : Number(raw.size);
    if (size !== undefined && !(size >= 0.08 && size <= 0.6)) throw new Error(msg("overlay.torchSize", { where: `${where}.size` }));
    const hold = raw.hold === undefined ? 3 : time(raw.hold, where);
    if (hold < 0.8) throw new Error(msg("overlay.cameraHold", { where: `${where}.hold` }));
    return { at: momentAt(raw.at, where), hold, ...(size !== undefined ? { size } : {}) };
  }), "torch");
  // Прожектор идёт за указателем: без пути указателя свету некуда идти.
  if (overlay.torch?.length && !overlay.pointer?.length) throw new Error(msg("overlay.torchPointer"));
  const thinking = list("thinking");
  if (thinking) overlay.thinking = ordered(thinking.map((raw: unknown, i: number): OverlayThinking => {
    const where = `overlay.thinking[${i}]`;
    if (!object(raw)) throw new Error(msg("overlay.object", { where }));
    keys(raw, ["at", "hold", "text", "lines", "target", "area", "point"], where);
    if (raw.point !== undefined) throw new Error(msg("overlay.thinkingPoint", { where }));
    const t = text(raw, "text", 40, where, true);
    const lines = raw.lines === undefined ? undefined : Number(raw.lines);
    if (lines !== undefined && !(Number.isInteger(lines) && lines >= 0 && lines <= 5))
      throw new Error(msg("overlay.thinkingLines", { where: `${where}.lines` }));
    const hold = raw.hold === undefined ? 1.6 : time(raw.hold, where);
    if (hold < 0.6) throw new Error(msg("overlay.thinkingHold", { where: `${where}.hold` }));
    return { at: momentAt(raw.at, where), hold, ...anchor(raw, where, false), ...(t ? { text: t } : {}),
      ...(lines !== undefined ? { lines } : {}) };
  }), "thinking");
  if (!overlay.pointer?.length && !overlay.cards?.length && !overlay.camera?.length
    && !overlay.titles?.length && !overlay.lower?.length && !overlay.callouts?.length && !overlay.stickers?.length
    && !overlay.marks?.length && !overlay.glints?.length && !overlay.bursts?.length && !overlay.loupe?.length
    && !overlay.boops?.length && !overlay.pings?.length && !overlay.toasts?.length
    && !overlay.actions?.length && !overlay.thinking?.length)
    throw new Error(msg("overlay.empty"));
  return overlay;
}

/** How long the scene must run to show every annotation, including exit. */
export function overlayEnd(overlay: SceneOverlay): number {
  return Math.max(0, ...(overlay.pointer?.map((point) => point.at + (point.click ? 0.65 : 0)) ?? []),
    ...(overlay.cards?.map((card) => card.at + (card.hold ?? cardHold(card)) + 0.35) ?? []),
    ...(overlay.camera?.map(cameraEnd) ?? []),
    ...[...(overlay.titles ?? []), ...(overlay.lower ?? []), ...(overlay.callouts ?? []),
      ...(overlay.stickers ?? []), ...(overlay.marks ?? []), ...(overlay.glints ?? []),
      ...(overlay.bursts ?? []), ...(overlay.loupe ?? []), ...(overlay.pings ?? []),
      ...(overlay.torch ?? []), ...(overlay.thinking ?? [])].map((item) => item.at + (item.hold ?? 0) + 0.35),
    ...(overlay.actions ?? []).map((a) => a.at + 0.6),
    ...(overlay.boops ?? []).map((b) => b.at + (b.hold ?? 0.7)),
    ...(overlay.toasts ?? []).map((toast) => toast.at + (toast.hold ?? 4) + 0.4));
}
