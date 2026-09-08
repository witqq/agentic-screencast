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
  focus?: StageFocus[];
  effects?: Record<string, StageEffectRange>;
}

interface StageApi {
  mount(scene: StageScene): void;
  renderAt(t: number): void;
  targetRect(): { left: number; top: number; width: number; height: number } | null;
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
  renderAt?: (t: number) => void;
}
