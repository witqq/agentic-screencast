// Объявления для слоя, живущего в браузере. Отдельным файлом, потому что
// сами `clock` и `stage` не имеют ни импортов, ни экспортов: их читают как
// текст и вливают в страницу до документа, а модульная обёртка это сломала бы.

/**
 * Момент задаётся ЯКОРЕМ: `b2`, `b2.end`, `b2+0.4`, `40%`, `1.2s`.
 * Число читается как секунды — так пишут короткие постоянные величины
 * вроде длительности затемнения.
 */
type StageWhen = number | string;

interface StageEffectRange {
  from: StageWhen;
  to?: StageWhen;
  scale?: number;
  hidden?: boolean;
  /** стартовая точка курсора: доли кадра, если оба числа не больше единицы */
  start?: [number, number];
  in?: number;
  out?: number;
}

interface StageFocus {
  sel: string;
  at?: StageWhen;
}

interface StageOverlayPoint { at: number; x: number; y: number; click?: boolean }
interface StageOverlayCard {
  at: number; title: string; body?: string;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center" | "near-focus";
  reveal?: string;
  motion?: "rise" | "pop" | "glide" | "fly";
  from?: "left" | "right" | "top" | "bottom";
  enter?: number; exit?: number; hold?: number;
}
interface StageCamera {
  at: number; hold: number; target?: string; area?: [number, number, number, number];
  scale?: number; move?: number; return?: number;
  keep?: boolean; shape?: "rounded" | "circle"; blur?: number; desaturate?: boolean; ring?: boolean; dim?: number; pan?: boolean;
}
interface StageAnchor { target?: string; area?: [number, number, number, number]; point?: [number, number] }
interface StageTitle { at: number; text: string; style?: string;
  position?: "center" | "top" | "bottom"; hold?: number }
interface StageLower { at: number; title: string; subtitle?: string; side?: "left" | "right"; reveal?: string; hold?: number }
interface StageCallout extends StageAnchor { at: number; text: string;
  side?: "auto" | "left" | "right" | "top" | "bottom"; hold?: number }
interface StageSticker extends StageAnchor { at: number; emoji?: string; image?: string; text?: string;
  size?: number; motion?: "pop" | "float" | "spin"; rotate?: number; hold?: number }
interface StageMark extends StageAnchor { at: number; kind: "circle" | "arrow" | "underline"; from?: [number, number];
  draw?: number; color?: string; hold?: number }
interface StageGlint extends StageAnchor { at: number; hold?: number }
interface StageBurst extends StageAnchor { at: number; kind: "confetti" | "sparks"; seed?: number; count?: number; hold?: number }
interface StageOverlay {
  pointer?: StageOverlayPoint[]; cards?: StageOverlayCard[]; camera?: StageCamera[];
  titles?: StageTitle[]; lower?: StageLower[]; callouts?: StageCallout[]; stickers?: StageSticker[];
  marks?: StageMark[]; glints?: StageGlint[]; bursts?: StageBurst[];
  boops?: StageBoop[]; pings?: StagePing[]; toasts?: StageToast[];
}
interface StageBoop { at: number; target: string; kind: "pop" | "shake" | "jelly" | "nod" }
interface StagePing extends StageAnchor { at: number; hold?: number }
interface StageToast { at: number; title: string; body?: string; icon?: string; hold?: number }

interface StageScene {
  id?: string;
  page?: string;
  target?: string;
  mustRead?: string;
  caption?: string;
  duration: number;
  /** сколько тактов в речи сцены — для якорей вида `b2` */
  beats?: number;
  /** начала тактов в секундах, измеренные сборкой по звуку */
  starts?: number[];
  /** оформление ролика: пары «переменная — значение» */
  theme?: Record<string, string>;
  /** эмодзи сцены картинками из поставляемого набора: знак → data-URI */
  emoji?: Record<string, string>;
  /** стиль нижней подписи: плашка, субтитры или субтитры с подсветкой слова */
  captionStyle?: "bar" | "subtitle" | "karaoke";
  /** как рисуются субтитры: контуром без плашки (умолчание) или на плотной плашке */
  captionLook?: "outline" | "plate";
  /** где стоят субтитры и подпись: внизу (умолчание), вверху или посередине зоны */
  captionPos?: "bottom" | "top" | "middle";
  /** сколько знаков помещают две строки субтитров этого кадра (`subtitleMax` в film.ts) */
  subMax?: number;
  /** правила @font-face шрифтов темы с вшитыми файлами (src/fonts.ts) */
  __fontCss?: string;
  /** кегль субтитров относительно обычного (`captions.size`) */
  subScale?: number;
  /** показывать субтитры на всех сценах с речью, а не только там, где их включил поставщик */
  captionEverywhere?: boolean;
  /** тексты тактов речи по порядку — для субтитров */
  beatTexts?: string[];
  /** конец речи сцены в секундах — граница последнего такта */
  spoken?: number;
  /** картинки стикеров, подставленные сборкой, по порядку стикеров оверлея */
  __stickers?: Array<{ src?: string; frames?: string[]; fps?: number }>;
  focus?: StageFocus[];
  effects?: Record<string, StageEffectRange>;
  overlay?: StageOverlay;
  /** Render annotations over a transparent blank page for a video scene. */
  __overlayOnly?: boolean;
  /** Какую часть слоя рисовать: кадровую (подсветка), экранную (карточки) или обе. */
  __layerPart?: "scene" | "screen" | "both";
  /** без слоя: подсветка, пелена и курсор не рисуются (проверка кадрирования) */
  __bareLayer?: boolean;
  /** камера ведёт окно кадрирования и подсветку, но страницу не приближает */
  __noZoom?: boolean;
  /** ширина окна кадрирования в точках страницы (сборка в другом формате): столько видно при k = 1 */
  __cropWidth?: number;
  /** Наезд над видео делает сборка: слой остаётся в координатах кадра. */
  __videoCamera?: boolean;
  /** рамка устройства вокруг клипа: разметка и оформление приходят от сборки готовыми */
  __device?: { html: string; css: string };
  /** безопасная зона формата, отступы в точках кадра */
  safe?: { top: number; bottom: number; left: number; right: number };
}

interface StageApi {
  mount(scene: StageScene): void;
  renderAt(t: number): void;
  targetRect(): { left: number; top: number; width: number; height: number } | null;
  moving(t: number): boolean;
  /** середина окна кадрирования в точках кадра на последнем отрисованном моменте */
  focusX(): number;
  rectOf(a: StageAnchor | { cue: string }): { left: number; top: number; width: number; height: number };
  /** кегль самого мелкого видимого текста цели в точках экрана; null — цели нет или в ней нет текста */
  fontPx(sel: string): number | null;
  cutText(sel: string): string[];
  smallText(min: number): Array<{ text: string; px: number }>;
  /** самый длинный кусок субтитра в строках, как он лёг в кадре */
  captionLines(): { lines: number; text: string };
  /** текст страницы за безопасной зоной ленты в кадре как есть */
  outsideSafe(safe: { top: number; bottom: number; left: number; right: number }): Array<{ text: string; side: string }>;
  /** текст, видимый в кадре сейчас: страница и слой */
  visibleText(): string;
  /** верх полосы, отведённой субтитрам или плашке подписи, в точках кадра; без них — высота кадра */
  floor(): number;
  readonly scene: StageScene | null;
}

interface ClockApi {
  seek(tSeconds: number): void;
  now(): number;
  realNow(): number;
}

interface Window {
  __clock?: ClockApi;
  __stage: StageApi;
  /** Ночная тема из таблицы тем: сборка вписывает её в начало слоя для сцены, пришедшей без темы. */
  __scThemeDefault?: Record<string, string>;
  renderAt?: (t: number) => void;
}
