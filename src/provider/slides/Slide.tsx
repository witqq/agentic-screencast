// Слайд как набор компонентов. Прежде разметка собиралась склейкой строк,
// и вёрстку не было видно глазами прямо в коде: колонки разной высоты
// и узел цепочки, уехавший на вторую строку, ловились только по снимкам.
//
// Компоненты ничего не знают о времени: момент появления кладётся
// в атрибут, а двигает элементы скрипт страницы (`RUNTIME`). Так слайд
// остаётся чистой функцией времени, и его можно снять с середины.
import type { JSX, ReactNode } from "react";
import type { Column, Slide } from "../../source.js";
import { deviceLayout, deviceMarkup, type Box } from "../../device.js";
import { MARK, ROTATE, plainTitle } from "./markup.js";

/**
 * Момент появления элемента номер i — ЯКОРЬ, а не секунда.
 *
 * Умолчание: элемент появляется на своём такте речи. Первый — на первом,
 * второй — на втором. Это то, чего от слайда ждут: он собирается вслед
 * за тем, что говорят, и тянется вместе с записью, какой бы длины она
 * ни вышла. Секунды такого не давали: реплика длиннее — элемент
 * появился в начале и полсцены ждал; короче — не успел проступить.
 *
 * Названные моменты берутся как есть, в любой форме якоря. Недостающие
 * ПРОДОЛЖАЮТ ряд, а не считаются по номеру: прежнее правило давало
 * шестому элементу момент раньше пятого, и цепочка собиралась не по
 * порядку — дефект невидимый, потому что устоявшийся кадр при нём верен.
 */
export function at(s: Slide, i: number, n?: number): string {
  const list = s.at ?? [];
  if (i < list.length) return String(list[i]!);
  // Без названных моментов — ровный ход: пункт k из n выходит на своём такте, если тактов
  // хватает, иначе с равным шагом по речи (разрешает страница, она знает такты).
  if (!list.length) return n ? `i${i}/${n}` : `b${i + 1}`;
  // Ряд продолжается от последнего названного: у якоря на такт — следующим
  // тактом, у прочих — полусекундным шагом, как и прежде.
  const last = String(list[list.length - 1]!);
  const step = i - list.length + 1;
  const beat = /^b(\d+)$/i.exec(last.trim());
  if (beat) return `b${Number(beat[1]) + step}`;
  const secs = /^([\d.]+)\s*s?$/i.exec(last.trim());
  if (secs) return String(Number(secs[1]) + step * 0.5);
  return `${last}+${(step * 0.5).toFixed(1)}`;
}

/**
 * Окраска колонки. Прежде левая всегда красилась «плохой», правая
 * «хорошей» — по положению, а не по смыслу. В сцене про то, что помощник
 * отвечает «готово, всё работает», зелёным оказывался ровно провал,
 * а в сцене про навык — перечень того, чего он не может. Зритель читает
 * зелёный как одобрение, и оно доставалось тому, что ролик критикует.
 *
 * Сторона теперь задаётся данными: `tone: bad|good|plain`. Умолчание
 * прежнее, поэтому чужие наборы данных не меняются.
 */
export function tone(col: Column | undefined, dflt: NonNullable<Column["tone"]>): string {
  const t = col?.tone ?? dflt;
  return ["bad", "good", "plain"].includes(t) ? t : dflt;
}

/**
 * Как элемент входит в кадр. Прежде все элементы всех слайдов появлялись
 * одинаково — проступали и приподнимались на восемнадцать точек, — и ролик
 * из десятка слайдов выглядел как пролистанная презентация. Теперь вход
 * говорит о смысле: сравниваемые колонки въезжают с двух сторон, узлы
 * цепочки выпрыгивают, цитата проявляется шторкой, заголовок встаёт по словам.
 * Как именно двигать, решает скрипт страницы; разметка только называет вход.
 */
export const ENTERS = ["rise", "word", "left", "right", "pop", "wipe", "track", "line", "tilt", "zoom", "fade",
  "spin", "fly", "swing", "jolt", "flip3d", "tilt3d", "mask", "bounce", "fan"] as const;
export type Enter = (typeof ENTERS)[number];

/**
 * Вход пункта: названный сценой (`enter`) или умолчание вида. Список входов через пробел
 * (`enter: pop flip rise`) раздаётся пунктам по порядку и идёт по кругу.
 */
const enterOf = (s: Slide, dflt: Enter, i = 0): Enter => {
  const list = s.enter?.split(/\s+/).filter(Boolean);
  return (list?.length ? list[i % list.length] : undefined) as Enter | undefined ?? dflt;
};

/**
 * Заголовок с разметкой (`markup.ts`): у смены слова все варианты стоят в одной ячейке, поэтому
 * строка не перекладывается, пока слово меняется; пометка слова лежит поверх него и раскладку не трогает.
 */
export function rich(text: string): ReactNode {
  const r = ROTATE.exec(text), m = MARK.exec(text);
  if (!r && !m) return text;
  if (r && (!m || r.index < m.index)) {
    const words = r[1]!.split("|").map((w) => w.trim());
    return <>{text.slice(0, r.index)}<span className="rot">{words.map((w, i) => <span className="rot-w" key={i}>{w}</span>)}</span>{rich(text.slice(r.index + r[0].length))}</>;
  }
  const [word, kind] = m![1] ? [m![1], "hl"] : m![2] ? [m![2], "ci"] : [m![3]!, "st"];
  return <>{text.slice(0, m!.index)}<span className={`mk mk-${kind}`}>{word}{kind === "ci"
    ? <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
      <path pathLength={1} d="M10 24 C8 8 88 2 95 18 C101 34 22 42 7 28 C0 20 18 8 42 6" /></svg> : null}</span>
    {rich(text.slice(m!.index + m![0].length))}</>;
}

/**
 * Заголовок и текст слайда. Сцена с полем `text` собирает их фразой —
 * по словам или по буквам (`data-kinetic`), и тогда обёртка только проявляется,
 * чтобы движение не складывалось из двух.
 */
function Title({ s, t, cls, text }: { s: Slide; t: string; cls?: string; text?: string }): JSX.Element {
  const k = s.text?.title;
  // Буквы, залитые картинкой (`fill`): картинка — фон заголовка, обрезанный по буквам; её ведёт скрипт страницы.
  const fill = s.fill ? { className: cls ? `${cls} filled` : "filled", style: { backgroundImage: `url(${s.fill.src})` } } : { className: cls };
  return k
    ? <Reveal at={t} enter="fade"><h1 {...fill} data-kinetic={k} data-at={t}>{plainTitle(text ?? s.title ?? "")}</h1></Reveal>
    : <Reveal at={t} enter="rise"><h1 {...fill} {...(s.swap === "morph" ? { "data-swap": "morph" } : {})}>{rich(text ?? s.title ?? "")}</h1>
      {s.swap === "morph" ? <Goo /> : null}</Reveal>;
}

/**
 * Жидкая смена слова: размытые слова проходят через порог прозрачности и слипаются, как капли.
 * Фильтр действует, только пока слово меняется (скрипт страницы, `rotate`).
 */
function Goo(): JSX.Element {
  return (
    <svg className="goo-defs" width="0" height="0" aria-hidden="true">
      <filter id="sc-goo"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 22 -9" /></filter>
    </svg>
  );
}
function Body({ s, t, cls }: { s: Slide; t: string; cls: string }): JSX.Element {
  const k = s.text?.body;
  return k
    ? <Reveal at={t} enter="fade"><p className={cls} data-kinetic={k} data-at={t}>{s.body}</p></Reveal>
    : <Reveal at={t} enter="rise"><p className={cls}>{s.body}</p></Reveal>;
}

/** Обёртка появления: несёт якорь момента, в который элемент проступает, и способ входа. */
function Reveal({ at: t, enter, delay, className, children }: {
  at: string; enter?: Enter; delay?: number; className?: string; children: ReactNode;
}): JSX.Element {
  return <div className={className ? `el ${className}` : "el"} data-at={t} data-enter={enter ?? "rise"}
    {...(delay ? { "data-delay": delay.toFixed(2) } : {})}>{children}</div>;
}

/**
 * Надзаголовки по умолчанию — на языке ролика. Прежде они были записаны
 * по-русски, и английский ролик открывался словами «Следующая глава».
 * Ролик без объявленного языка говорит на том, на котором написаны сцены.
 */
const WORDS = {
  ru: { chapter: "Следующая глава", compare: "сравнение", chain: "как это устроено", quote: "настоящий ответ движка", number: "цифра",
    thinking: "Думаю…" },
  en: { chapter: "Next chapter", compare: "comparison", chain: "how it works", quote: "the real answer", number: "the number",
    thinking: "Thinking…" },
};
type Words = typeof WORDS.en;
export function wordsFor(lang: string | undefined, s: Slide): Words {
  const ru = lang ? /^ru\b/i.test(lang) : /[а-яё]/i.test(JSON.stringify(s));
  return ru ? WORDS.ru : WORDS.en;
}

/** Сетка страницы: ширина и высота в её собственных точках. */
export interface Grid {
  w: number; h: number;
  /** увеличение сетки до кадра */
  zoom?: number;
  /** отступы страницы в точках сетки: не меньше безопасной зоны формата */
  pad?: { t: number; r: number; b: number; l: number };
  /** отступы пришли от формата с безопасной зоной */
  safe?: boolean;
  /** кадр без зоны, но с субтитрами на слайдах: низ слайда уступает им место */
  under?: boolean;
}
interface Props { s: Slide; w: Words; grid: Grid }

function Head({ s, kicker, title }: { s: Slide; kicker: string; title?: string }): JSX.Element {
  // Черта под шапкой прочерчивается слева направо, надзаголовок сходится
  // из разрядки, заголовок встаёт из размытия следом.
  return (
    <Reveal at="0" enter="line" className="head">
      <Reveal at="0" enter="track"><p className="kicker">{kicker}</p></Reveal>
      <Title s={s} t="0" text={title} />
    </Reveal>
  );
}

function Note({ at: t, text }: { at: string; text?: string }): JSX.Element | null {
  if (!text) return null;
  return <Reveal at={t} enter="rise"><p className="back">{text}</p></Reveal>;
}

function ColumnCard({ col, dflt }: { col: Column; dflt: NonNullable<Column["tone"]> }): JSX.Element {
  return (
    <div className={`col ${tone(col, dflt)}`}>
      <h2>{col.title}</h2>
      {col.text ? <p>{col.text}</p> : null}
      {col.items ? <ul>{col.items.map((i) => <li key={i}>{i}</li>)}</ul> : null}
    </div>
  );
}

/**
 * Число, которое докручивается, как счётчик: «$1,200+» → префикс, разряды,
 * суффикс. Не число, два числа сразу или голый год — `null`: год, набегающий
 * от нуля, выглядит нелепо, а «24/7» не одно число.
 */
export function numberParts(v: string): { pre: string; digits: string; post: string; to: number; dec: number; intLen: number } | null {
  const m = /^([^\d]*?)(\d{1,3}(?:[ ,\u00a0\u202f]\d{3})+|\d+)(?:([.,])(\d+))?(.*)$/.exec(v.trim());
  if (!m) return null;
  const pre = m[1]!, int = m[2]!, sep = m[3], frac = m[4], post = m[5]!;
  if (/\d/.test(post) || /\d/.test(pre)) return null;
  if (!pre && !post && !frac && /^\d{4}$/.test(int) && Number(int) >= 1800 && Number(int) < 2200) return null;
  const to = Number(int.replace(/\D/g, "") + (frac ?? ""));
  if (!Number.isSafeInteger(to)) return null;
  return { pre, digits: int + (sep && frac ? sep + frac : ""), post, to, dec: frac?.length ?? 0, intLen: int.length };
}

/**
 * Разряды счётчика. Каждая цифра — окно высотой в строку, за которым едет
 * лента «0…9»: лента нарисована оформлением, а не текстом, поэтому в тексте
 * страницы остаётся только префикс и суффикс, и ширина числа не меняется,
 * пока оно крутится.
 */
function Count({ v, at: t, delay }: { v: string; at: string; delay?: number }): JSX.Element {
  const parts = numberParts(v)!;
  const chars = Array.from(parts.digits);
  let k = chars.filter((c) => /\d/.test(c)).length;
  const cells = chars.map((c, i) => {
    if (/\d/.test(c)) { k -= 1; return <span className="dg" data-k={k} key={i}><span className="dg-s" /></span>; }
    // Разделитель разрядов виден вместе с цифрой слева от него, запятая дроби — всегда.
    return <span className="dg-sep" data-k={i === parts.intLen ? -1 : k} key={i}>{c}</span>;
  });
  return (
    <>{parts.pre}<span className="count" data-at={t} data-to={parts.to} data-dec={parts.dec} {...(delay ? { "data-delay": delay.toFixed(2) } : {})}>{cells}</span>{parts.post}</>
  );
}

/** A narrative beat, not a list of static feature labels. */
function Chapter({ s, w }: Props): JSX.Element {
  return (
    <section className="chapter">
      <div className="chapter-orbit" aria-hidden="true"><span /><span /><span /></div>
      <div className="chapter-sweep" aria-hidden="true" />
      {/* Блок текста заставки въезжает слева, пока проступает кадр: прежде
          движение заставки держалось на наборе, а под затемнением входа
          его почти не было видно. */}
      <div className="el chapter-copy" data-at="0" data-enter="left">
        <Reveal at="0.15s" enter="track"><p className="chapter-kicker">{s.kicker ?? w.chapter}</p></Reveal>
        {s.text?.title
          ? <h1 className="el chapter-title" data-enter="fade" data-kinetic={s.text.title} data-at="0.7s">{s.title}</h1>
          : <h1 className="el chapter-title" data-type="title" data-at="0.7s">{s.title}</h1>}
        {s.text?.body
          ? <p className="el chapter-body" data-enter="fade" data-kinetic={s.text.body} data-at="2.4s">{s.body}</p>
          : <p className="el chapter-body" data-type="body" data-at="2.4s">{s.body}</p>}
      </div>
      <div className="chapter-line" aria-hidden="true" />
    </section>
  );
}

/** Сравнение в две колонки: слева «без», справа «с». */
function Compare({ s, w }: Props): JSX.Element {
  const n = s.note ? 3 : 2;
  return (
    <>
      <Head s={s} kicker={s.kicker ?? w.compare} title={s.title} />
      <div className="cols">
        <Reveal at={at(s, 0, n)} enter={enterOf(s, "left", 0)}><ColumnCard col={s.left!} dflt="bad" /></Reveal>
        <Reveal at={at(s, 1, n)} enter={enterOf(s, "right", 1)}><ColumnCard col={s.right!} dflt="good" /></Reveal>
      </div>
      <Note at={at(s, 2, n)} text={s.note} />
    </>
  );
}

/** Схема со связями: цепочка узлов и подпись про возвраты. */
function Chain({ s, w }: Props): JSX.Element {
  const nodes = s.nodes ?? [];
  const total = nodes.length + (s.back ? 1 : 0) + (s.note ? 1 : 0);
  return (
    <>
      <Head s={s} kicker={s.kicker ?? w.chain} title={s.title} />
      <div className="chain" data-n={nodes.length}>
        {nodes.map((n, i) => (
          <Reveal at={at(s, i, total)} enter={enterOf(s, "pop", i)} key={`${n.label}-${i}`}>
            <span className="pairwrap">
              {/* Стрелка идёт ПЕРЕД узлом: при переносе строка начинается
                  стрелкой, а не заканчивается указывающей в пустоту. */}
              {i > 0 ? <span className="arrow">→</span> : null}
              <span className={`node ${n.kind ?? ""}`}>{n.label}</span>
            </span>
          </Reveal>
        ))}
      </div>
      {s.back ? (
        <Reveal at={at(s, nodes.length, total)} enter="rise">
          <p className="back">↩ <b>{s.back}</b></p>
        </Reveal>
      ) : null}
      <Note at={at(s, nodes.length + (s.back ? 1 : 0), total)} text={s.note} />
    </>
  );
}

/** Дословная цитата настоящего ответа продукта — фрагментом. */
function Quote({ s, w }: Props): JSX.Element {
  const parts = s.parts ?? [];
  const n = parts.length + (s.note ? 1 : 0);
  return (
    <>
      <Head s={s} kicker={s.kicker ?? w.quote} title={s.title} />
      {parts.map((q, i) => (
        <Reveal at={at(s, i, n)} enter={enterOf(s, "wipe", i)} key={`${q.label}-${i}`}>
          <div className="quote">
            <span className="qlabel">{q.label}</span>
            <pre data-type="body" data-at={at(s, i, n)}>{q.text}</pre>
          </div>
        </Reveal>
      ))}
      {/* Приписку под цитатой пишет САМА сцена полем `note`. Прежде
          здесь стояла фраза про чужой продукт, вшитая безусловно:
          в ролике на любую другую тему она появлялась сама собой
          и выключить её было нечем. */}
      <Note at={at(s, parts.length, n)} text={s.note} />
    </>
  );
}

/** Величина: крутится до своего значения, если это одно число. */
function Value({ s, v, t }: { s: Slide; v: string; t: string }): JSX.Element {
  return s.count !== false && numberParts(v) ? <Count v={v} at={t} delay={0.1} /> : <>{v}</>;
}

/** Крупная величина с подписями. */
function Magnitude({ s, w }: Props): JSX.Element {
  const values = s.values ?? [];
  const n = values.length + (s.tags ? 1 : 0) + (s.note ? 1 : 0);
  return (
    <>
      <Head s={s} kicker={s.kicker ?? w.number} title={s.title} />
      <div className="pair">
        {values.map((v, i) => (
          <Reveal at={at(s, i, n)} enter={enterOf(s, "pop", i)} key={`${v.value}-${i}`}>
            <div>
              <div className="huge"><Value s={s} v={v.value} t={at(s, i, n)} /></div>
              <div className="huge-sub">{v.label}</div>
            </div>
          </Reveal>
        ))}
      </div>
      {s.tags ? (
        <Reveal at={at(s, values.length, n)}>
          <div className="tags">{s.tags.map((x) => <span className="tag" key={x}>{x}</span>)}</div>
        </Reveal>
      ) : null}
      <Note at={at(s, n - 1, n)} text={s.note} />
    </>
  );
}

// — виды, которые держат кадр в движении целиком —
//
// Каждый рисуется секцией во весь кадр поверх живого фона, а не потоком
// «шапка — содержимое — черта»: у них своя композиция, и кадр целиком
// медленно облетается камерой (`move`), чтобы не застывать и после того,
// как всё появилось.

/**
 * Момент пункта у видов во весь кадр. Первый пункт по умолчанию выходит
 * через полсекунды после заголовка, а не вместе с ним: иначе шапка и первый
 * пункт появлялись одним движением, и заголовок не успевали прочесть.
 */
const item = (s: Slide, i: number, n: number): string => at(s, i, n);

/** Моменты по умолчанию для вида с заданным порядком частей: секунды, если автор их не назвал. */
const moment = (s: Slide, i: number, dflt: string): string => s.at?.[i] !== undefined ? String(s.at[i]) : dflt;

/** Откуда цифры: приписка `note` под графиком и счётчиком встаёт вместе с последним значением. */
function Source({ s, t }: { s: Slide; t: string }): JSX.Element | null {
  return s.note ? <Reveal at={t} enter="rise"><p className="back k-src">{s.note}</p></Reveal> : null;
}

/**
 * Секция вида. Фон вида (картинка под заголовком, фото) лежит ВНЕ облетаемого
 * слоя: при облёте он смещается меньше переднего плана, и кадр получает
 * глубину — ближнее движется быстрее дальнего.
 */
function Stage({ s, cls, move, back, children }: {
  s: Slide; cls: string; move: NonNullable<Slide["move"]>; back?: ReactNode; children: ReactNode;
}): JSX.Element {
  return <section className={`k ${cls}`} data-move={s.move ?? move}>{back}<div className="k-in">{children}</div></section>;
}

function KHead({ s }: { s: Slide }): JSX.Element | null {
  if (!s.kicker && !s.title) return null;
  return (
    <header className="k-head">
      {s.kicker ? <Reveal at="0" enter="track"><p className="kicker">{s.kicker}</p></Reveal> : null}
      {s.title ? <Title s={s} t="0" /> : null}
    </header>
  );
}

/** Заголовок, встающий по словам: у каждого слова свой вход с задержкой. */
function Words({ s, text, t, cls }: { s: Slide; text: string; t: string; cls: string }): JSX.Element {
  // Названный способ сборки и смена слова заменяют встающие слова целиком.
  if (s.text?.title || s.fill || ROTATE.test(text) || MARK.test(text)) return <Title s={s} t={t} cls={cls} text={text} />;
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <h1 className={cls}>
      {words.map((word, i) => (
        <span key={i}>
          <span className="el w" data-at={t} data-enter="word" data-delay={(i * 0.085).toFixed(3)}>{word}</span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </h1>
  );
}

function Hero({ s }: Props): JSX.Element {
  const t = moment(s, 0, "0.35s");
  return (
    <Stage s={s} cls="k-hero" move="drift" back={s.image ? <>
      <div className="hero-img" data-kb="0.5 0.5 1.14 1" style={{ backgroundImage: `url(${s.image.src})` }} />
      <div className="hero-shade" /></> : null}>
      <div className="hero-copy">
        {s.kicker ? <Reveal at="0.1s" enter="track"><p className="kicker">{s.kicker}</p></Reveal> : null}
        <Words s={s} text={s.title ?? ""} t={t} cls="hero-title" />
        {s.body ? <Body s={s} t={moment(s, 1, (s.beats ?? 0) > 1 ? "b2" : "1.5s")} cls="hero-body" /> : null}
      </div>
    </Stage>
  );
}

function Steps({ s }: Props): JSX.Element {
  const items = s.items ?? [];
  return (
    <Stage s={s} cls="k-steps" move="drift">
      <KHead s={s} />
      <ol className="steps" data-n={items.length} data-layout={items.length >= 6 && items.length <= 8 ? "two" : "rail"}>
        <span className="steps-rail"><span className="steps-fill" /></span>
        {items.map((it, i) => (
          <li key={i}>
            <Reveal at={item(s, i, items.length)} enter={enterOf(s, "left", i)} className="step">
              <span className="step-n">{it.icon ?? i + 1}</span>
              <div><h3>{it.title}</h3>{it.text ? <p>{it.text}</p> : null}</div>
            </Reveal>
          </li>
        ))}
      </ol>
    </Stage>
  );
}

function Features({ s }: Props): JSX.Element {
  const items = s.items ?? [];
  return (
    <Stage s={s} cls="k-feat" move="drift">
      <KHead s={s} />
      <div className="feats" data-n={items.length}>
        {items.map((it, i) => (
          <Reveal at={item(s, i, items.length)} enter={enterOf(s, "flip3d", i)} className="feat" key={i}>
            {/* Без значка карточка без знака: номера 01, 02, 03 — синоним значков-эмодзи (docs/visual-design.md). */}
            {it.icon ? <span className="feat-ic">{it.icon}</span> : null}
            <h3>{it.title}</h3>
            {it.text ? <p>{it.text}</p> : null}
          </Reveal>
        ))}
      </div>
    </Stage>
  );
}

function Timeline({ s }: Props): JSX.Element {
  const items = s.items ?? [];
  return (
    <Stage s={s} cls="k-tl" move="drift">
      <KHead s={s} />
      <div className="tl" data-n={items.length}>
        <span className="tl-rail"><span className="tl-fill" /></span>
        <span className="tl-head" aria-hidden="true" />
        <div className="tl-items">
          {items.map((it, i) => (
            <Reveal at={item(s, i, items.length)} enter={enterOf(s, "pop", i)} className="tl-item" key={i}>
              <span className="tl-dot" />
              <b className="tl-when">{it.icon ? `${it.icon} ` : ""}{it.title}</b>
              {it.text ? <p>{it.text}</p> : null}
            </Reveal>
          ))}
        </div>
      </div>
    </Stage>
  );
}

/** Мини-график под числом: ломаная без осей рисуется слева направо, на конце вспыхивает точка. */
function Spark({ values }: { values: number[] }): JSX.Element {
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 100, 28 - ((v - lo) / span) * 24] as const);
  const [ex, ey] = pts.at(-1)!;
  return (
    <svg className="ctr-spark" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
      <polyline pathLength={1} points={pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ")} />
      <circle cx={ex.toFixed(2)} cy={ey.toFixed(2)} r="2.6" />
    </svg>
  );
}

function Counter({ s }: Props): JSX.Element {
  const values = s.values ?? [];
  const R = 46, C = 2 * Math.PI * R;
  return (
    <Stage s={s} cls="k-ctr" move="drift">
      <KHead s={s} />
      <div className="ctrs" data-n={values.length}>
        {values.map((v, i) => {
          const parts = numberParts(v.value);
          // Доля — кольцом: «98%» замыкает круг почти целиком.
          const share = parts && /%\s*$/.test(v.value) ? Math.min(1, parts.to / Math.pow(10, parts.dec) / 100) : null;
          return (
            <Reveal at={item(s, i, values.length)} enter={enterOf(s, "pop", i)} className="ctr" key={i}>
              {share !== null ? (
                <svg className="ring" viewBox="0 0 100 100" aria-hidden="true">
                  <circle className="ring-bg" cx="50" cy="50" r={R} />
                  <circle className="ring-fg" cx="50" cy="50" r={R} strokeDasharray={C.toFixed(2)} data-share={share.toFixed(4)} data-c={C.toFixed(2)} />
                </svg>
              ) : null}
              <div className="ctr-v"><Value s={s} v={v.value} t={item(s, i, values.length)} /></div>
              {v.label ? <div className="ctr-l">{v.label}</div> : null}
              {s.spark?.[i] ? <Spark values={s.spark[i]!} /> : null}
            </Reveal>
          );
        })}
      </div>
      <Source s={s} t={item(s, Math.max(0, values.length - 1), values.length)} />
    </Stage>
  );
}

/**
 * «Было/стало» в одном кадре. Оба снимка лежат друг на друге одного размера; второй
 * открыт правее разделителя. Разделитель ведёт скрипт страницы — от `split[0]` к
 * `split[1]` за середину сцены, — поэтому кадр остаётся функцией времени.
 */
function BeforeAfter({ s }: Props): JSX.Element {
  const [from, to] = s.split ?? [0.85, 0.15];
  const img = s.image!, after = s.after!;
  return (
    <Stage s={s} cls="k-ba" move="still">
      <KHead s={s} />
      <Reveal at={moment(s, 0, "0.2s")} enter="zoom" className="ba" >
        <div className="ba-frame" style={{ aspectRatio: `${img.width} / ${img.height}` }} data-from={from} data-to={to} data-at={moment(s, 1, "0.9s")}>
          <img className="ba-before" alt="" src={img.src} />
          <img className="ba-after" alt="" src={after.src} />
          <span className="ba-line"><span className="ba-knob">◂▸</span></span>
          {s.labels ? <><span className="ba-l ba-l1">{s.labels[0]}</span><span className="ba-l ba-l2">{s.labels[1]}</span></> : null}
        </div>
      </Reveal>
    </Stage>
  );
}

/**
 * Экран в перспективе. Снимок рисует WebGL на холсте: плоскость экрана под углом, камера
 * облетает её, по экрану проходит блик, под ним лежит отражение. Картинка берётся из
 * скрытого `<img>` — к моменту рендера она загружена вместе со страницей. Без WebGL
 * остаётся плоский снимок, и страница помечает это (`data-screen-renderer`).
 */
function Perspective({ s }: Props): JSX.Element {
  const img = s.image!;
  return (
    <Stage s={s} cls="k-pv" move="still">
      <KHead s={s} />
      {s.body ? <Body s={s} t={moment(s, 1, "0.6s")} cls="pv-body" /> : null}
      <Reveal at={moment(s, 0, "0.2s")} enter="fade" className="pv">
        <canvas className="pv-cv" data-ratio={(img.width / img.height).toFixed(5)} />
        <img className="pv-src" alt="" src={img.src} />
      </Reveal>
    </Stage>
  );
}

/**
 * Параллакс из снимка: снимок лежит в глубине, приглушённый, а его панели вырезаны и
 * висят над ним каждая на своей глубине. Облёт кадра двигает ближние панели сильнее
 * дальних — так плоский снимок получает объём. Смещения ведёт скрипт страницы.
 */
function Parallax({ s }: Props): JSX.Element {
  const img = s.image!;
  return (
    <Stage s={s} cls="k-px" move="still">
      <KHead s={s} />
      <Reveal at={moment(s, 0, "0.1s")} enter="zoom" className="px">
        <div className="px-frame" style={{ aspectRatio: `${img.width} / ${img.height}` }} data-at={moment(s, 1, "0.5s")}>
          <div className="px-base" style={{ backgroundImage: `url(${img.src})` }} />
          {(s.panels ?? []).map((p, i) => (
            <div className="px-panel" key={i} data-depth={p.depth}
              style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, width: `${p.w * 100}%`, height: `${p.h * 100}%`,
                backgroundImage: `url(${img.src})`, backgroundSize: `${100 / p.w}% ${100 / p.h}%`,
                backgroundPosition: `${p.w < 1 ? (p.x / (1 - p.w)) * 100 : 0}% ${p.h < 1 ? (p.y / (1 - p.h)) * 100 : 0}%` }} />
          ))}
        </div>
      </Reveal>
    </Stage>
  );
}

/**
 * График из данных. Столбцы стоят в полной высоте, а растит их скрипт страницы
 * (`scaleY` от основания), поэтому устоявшийся кадр — это вёрстка по данным, без
 * округлений анимации. Линия — ломаная в собственной системе координат; её
 * прорисовку слева направо ведёт тот же скрипт через длину штриха.
 */
function Chart({ s }: Props): JSX.Element {
  const c = s.chart!;
  const max = Math.max(...c.rows.map((r) => r.value)) || 1;
  const t = item(s, 0, 1);
  const cls = (i: number): string => (c.peak === i ? " peak" : "");
  if (c.type === "race" && c.race) {
    // Гонка баров: строки стоят абсолютно, место в ряду, длину и число каждого кадра считает скрипт
    // страницы по периодам из разметки; устоявшийся кадр — последний период.
    const r = c.race;
    return (
      <Stage s={s} cls="k-chart" move="drift">
        <KHead s={s} />
        <Reveal at={t} enter="fade" className="chart race" >
          <div className="race-plot" data-at={t} data-periods={JSON.stringify(r.periods)} data-n={r.rows.length}>
            {r.rows.map((row, i) => (
              <div className="race-row" key={i} data-values={row.values.join(" ")}>
                <span className="race-l">{row.label}</span>
                <span className="race-track"><span className="race-bar" /><b className="race-v">{row.values.at(-1)}</b></span>
              </div>
            ))}
            <span className="race-period">{r.periods.at(-1)}</span>
          </div>
        </Reveal>
        <Source s={s} t={t} />
      </Stage>
    );
  }
  if (c.type === "line") {
    const W = 1000, H = 420, n = c.rows.length;
    const pts = c.rows.map((r, i) => [((i + 0.5) / n) * W, H - (r.value / max) * H] as const);
    return (
      <Stage s={s} cls="k-chart" move="drift">
        <KHead s={s} />
        <Reveal at={t} enter="fade" className="chart chart-line" >
          <div className="chart-plot" data-n={n}>
            <svg aria-hidden="true">
              <polyline className="chart-path" data-at={t} data-pts={pts.map(([x, y]) => `${(x / W).toFixed(5)},${(y / H).toFixed(5)}`).join(" ")} />
            </svg>
            {c.rows.map((r, i) => {
              const pos = { left: `${(((i + 0.5) / n) * 100).toFixed(3)}%`, bottom: `${((r.value / max) * 100).toFixed(3)}%` };
              // Подпись — рядом с точкой, а не внутри: она стоит над точкой, на фоне слайда.
              return [
                <span className={`chart-dot${cls(i)}`} data-at={t} key={`d${i}`} style={pos} />,
                <b className={`chart-v chart-pv${cls(i)}`} key={`v${i}`} style={pos}>{r.shown}</b>,
              ];
            })}
          </div>
          <div className="chart-labels">{c.rows.map((r, i) => <span className={`chart-l${cls(i)}`} key={i}>{r.label}</span>)}</div>
        </Reveal>
        <Source s={s} t={t} />
      </Stage>
    );
  }
  return (
    <Stage s={s} cls="k-chart" move="drift">
      <KHead s={s} />
      <Reveal at={t} enter="fade" className="chart chart-bars">
        <div className="chart-plot" data-n={c.rows.length}>
          {c.rows.map((r, i) => (
            <div className={`chart-col${cls(i)}`} key={i}>
              <div className="chart-bar" data-at={t} data-delay={(i * 0.12).toFixed(2)} data-value={r.value}
                style={{ height: `${((r.value / max) * 100).toFixed(3)}%` }} />
              {/* Подпись — рядом со столбцом, а не внутри: она стоит над ним, на фоне слайда. */}
              <b className="chart-v" data-pct={((r.value / max) * 100).toFixed(3)}>{r.shown}</b>
            </div>
          ))}
        </div>
        <div className="chart-labels">{c.rows.map((r, i) => <span className={`chart-l${cls(i)}`} key={i}>{r.label}</span>)}</div>
      </Reveal>
      <Source s={s} t={t} />
    </Stage>
  );
}

/**
 * Код не переносится и не обрезается: кегль подбирается так, чтобы самая длинная строка
 * поместилась в окно по ширине, а все строки — по высоте (строка — 1,55 кегля; над окном
 * шапка слайда, у окна полоса в 46 точек и поля). Моноширинный знак шириной около 0,6 кегля;
 * ниже восемнадцати точек код с экрана уже не читают — тогда окно не сжимается, слайд
 * вписывается целиком (`fitContent`), а если и так не влезает, сборка называет переполнение.
 */
function codeSize(c: NonNullable<Slide["code"]>, grid: Grid): number {
  const longest = Math.max(1, ...c.lines.map((l) => l.html.split("<i>").length - 1));
  const pad = grid.pad ?? { t: 64, r: 84, b: 64, l: 84 };
  const room = grid.w - pad.l - pad.r - 60 - 26 - 30;
  const tall = grid.h - pad.t - pad.b - 150 - 34 - 46 - 18 - 24 - 12;
  const byTall = Math.floor(tall / (Math.max(1, c.lines.length) * 1.55));
  // В высоком кадре код переносится по пробелам (правила вертикали в оформлении), и длина строки
  // кегль не ограничивает. Нижняя граница — 36 точек кадра, граница читаемого на телефоне
  // (docs/vertical-video.md): по длине строки кегль падал до 23 точек сетки, 34 точек кадра.
  if (grid.h > grid.w * 1.2) return Math.max(Math.ceil(36 / (grid.zoom ?? 1)), Math.min(28, byTall));
  return Math.max(18, Math.min(26, Math.floor(room / (longest * 0.61)), byTall));
}

function Code({ s, grid }: Props): JSX.Element {
  const c = s.code!;
  return (
    <Stage s={s} cls="k-code" move="drift">
      <KHead s={s} />
      <Reveal at="0.1s" enter="tilt" className="code-win">
        <div className="code-bar"><i /><i /><i />{c.name ? <span>{c.name}</span> : null}</div>
        <pre className="code" data-at={moment(s, 0, "0.7s")} data-cps={c.speed || "auto"} style={{ fontSize: `${codeSize(c, grid)}px` }}>
          {c.lines.map((l) => (
            <span className={c.highlight.includes(l.no) ? "ln hl" : "ln"} key={l.no}>
              <span className="no">{l.no}</span><span className="src" dangerouslySetInnerHTML={{ __html: l.html }} />
            </span>
          ))}
        </pre>
      </Reveal>
    </Stage>
  );
}

function Photo({ s }: Props): JSX.Element {
  const [fx, fy] = s.focus ?? [0.5, 0.45];
  const [z0, z1] = s.zoom ?? [1, 1.16];
  const caption = s.kicker || s.title || s.body;
  return (
    <Stage s={s} cls="k-photo" move="still" back={<>
      <div className="photo" data-kb={`${fx} ${fy} ${z0} ${z1}`} style={{ backgroundImage: `url(${s.image!.src})` }} />
      {caption ? <div className="photo-shade" /> : null}</>}>
      {caption ? (
        <div className="photo-cap">
          {s.kicker ? <Reveal at={moment(s, 0, "0.6s")} enter="track"><p className="kicker">{s.kicker}</p></Reveal> : null}
          {s.title ? <Title s={s} t={moment(s, 0, "0.6s")} /> : null}
          {s.body ? <Body s={s} t={moment(s, 1, "1.4s")} cls="photo-body" /> : null}
        </div>
      ) : null}
    </Stage>
  );
}

/**
 * Снимок в рамке. Высокий снимок не ужимается в экран, а прокручивается в
 * нём, как пролистанная страница: ужатый, он превращался бы в полоску
 * нечитаемой мелочи.
 */
function Shot({ s, grid }: Props): JSX.Element {
  const img = s.image!;
  const device = s.device ?? { kind: "browser" as const };
  const a = img.width / img.height;
  const copy = Boolean(s.kicker || s.title || s.body);
  const tall = grid.h > grid.w;
  const p = grid.pad ?? { t: 56, r: 90, b: 56, l: 90 };
  // В высоком кадре текст стоит сверху, а рамка — под ним, внутри безопасной зоны.
  const top = p.t + (copy ? 300 : 0);
  const box: Box = tall ? { x: p.l, y: top, w: grid.w - p.l - p.r, h: grid.h - top - p.b }
    : !copy ? { x: Math.max(90, p.l), y: Math.max(60, p.t), w: grid.w - Math.max(90, p.l) - Math.max(90, p.r), h: grid.h - Math.max(60, p.t) - Math.max(60, p.b) }
    : { x: grid.w * 0.43, y: Math.max(56, p.t), w: grid.w * 0.57 - Math.max(56, p.r), h: grid.h - Math.max(56, p.t) - Math.max(56, p.b) };
  const aspect = device.kind === "frame" ? a : device.kind === "browser" ? (a >= 1.1 ? a : undefined) : (a >= 0.4 && a <= 0.75 ? a : undefined);
  const layout = deviceLayout(device, box, aspect);
  const shown = layout.screen.w / a;
  const scroll = Math.max(0, shown - layout.screen.h);
  const inner = `<div class="dv-scr"><img class="shot-img" alt="" src="${img.src}" data-scroll="${scroll.toFixed(1)}"></div>`;
  // Рамка идёт первой и в разметке, и во времени: проверка порядка требует,
  // чтобы моменты не убывали по ходу разметки.
  return (
    <Stage s={s} cls={`k-shot${copy ? " with-copy" : ""}`} move="drift">
      <Reveal at={moment(s, 0, "0.05s")} enter="tilt" className="shot-dev">
        <div className="shot-float" dangerouslySetInnerHTML={{ __html: deviceMarkup(layout, { inner }) }} />
      </Reveal>
      {copy ? (
        <div className="shot-copy">
          {s.kicker ? <Reveal at="0.3s" enter="track"><p className="kicker">{s.kicker}</p></Reveal> : null}
          {s.title ? <Title s={s} t="0.3s" /> : null}
          {s.body ? <Body s={s} t={moment(s, 1, (s.beats ?? 0) > 1 ? "b2" : "1.2s")} cls="shot-body" /> : null}
        </div>
      ) : null}
    </Stage>
  );
}

// Финал поверх результата (film craft 65): с картинкой (`image`) последний кадр — сам результат,
// а призыв — короткая строка у его нижнего края, без орбит и пустого фона.
function Outro({ s }: Props): JSX.Element {
  return (
    <Stage s={s} cls={s.image ? "k-outro over" : "k-outro"} move="push" back={s.image ? <>
      <div className="hero-img" data-kb="0.5 0.5 1.06 1" style={{ backgroundImage: `url(${s.image.src})` }} />
      <div className="outro-shade" /></> : null}>
      {s.image ? null : <div className="outro-orbit" aria-hidden="true"><span /><span /></div>}
      <div className="outro-copy">
        {s.kicker ? <Reveal at="0.1s" enter="track"><p className="kicker">{s.kicker}</p></Reveal> : null}
        <Words s={s} text={s.title ?? ""} t={moment(s, 0, "0.3s")} cls="outro-title" />
        {s.body ? <Body s={s} t={moment(s, 1, "1.3s")} cls="outro-body" /> : null}
        {s.cta ? <Reveal at={moment(s, 2, "1.9s")} enter="pop" className="outro-cta"><span>{s.cta}</span></Reveal> : null}
        {s.url ? <Reveal at={moment(s, 3, "2.3s")} enter="rise"><p className="outro-url">{s.url}</p></Reveal> : null}
      </div>
    </Stage>
  );
}

// — живые виды —
//
// Движение у них не только входное: лента едет, стопка листается, орбита вращается, чат пишет,
// пока идёт речь. Ведёт его скрипт страницы как функция времени сцены; разметка кладёт моменты и
// роли в атрибуты.

/** Знак пункта: значок, если он есть, и подпись. */
function Chip({ icon, title }: { icon?: string; title: string }): JSX.Element {
  return <span className="chip">{icon ? <span className="chip-ic">{icon}</span> : null}<span className="chip-t">{title}</span></span>;
}

/**
 * Бегущая лента: ряд повторён дважды, скрипт сдвигает его на свою ширину по кругу, края гаснут в
 * фон. Вторая строка — навстречу. Лента входит целиком на своём моменте.
 */
function Marquee({ s }: Props): JSX.Element {
  const items = s.items ?? [];
  const rows = s.rows ?? 1;
  const half = Math.ceil(items.length / rows);
  const lines = rows === 2 ? [items.slice(0, half), items.slice(half)] : [items];
  return (
    <Stage s={s} cls="k-mq" move="still">
      <KHead s={s} />
      <Reveal at={item(s, 0, 1)} enter="fade" className="mq">
        {lines.map((line, r) => (
          <div className="mq-row" key={r} data-dir={r % 2 ? -1 : 1} data-speed={s.speed ?? 110}>
            <div className="mq-track">
              {[0, 1, 2].map((k) => line.map((it, i) => <Chip key={`${k}-${i}`} icon={it.icon} title={it.title} />))}
            </div>
          </div>
        ))}
      </Reveal>
    </Stage>
  );
}

/**
 * Стопка карточек: верхняя улетает на момент следующей, колода подъезжает вперёд на пружине.
 * Моменты карточек лежат в `data-t`, а не в `data-at` входа: карточка видна с начала — в колоде.
 */
function Stack({ s }: Props): JSX.Element {
  const items = s.items ?? [];
  return (
    <Stage s={s} cls="k-stk" move="drift">
      <KHead s={s} />
      <Reveal at={item(s, 0, items.length)} enter="rise" className="stk">
        {items.map((it, i) => (
          <div className="stk-card" key={i} data-at={item(s, i, items.length)}>
            {it.icon ? <span className="feat-ic">{it.icon}</span> : null}
            <h3>{it.title}</h3>
            {it.text ? <p>{it.text}</p> : null}
          </div>
        ))}
      </Reveal>
    </Stage>
  );
}

/**
 * Орбита: пункты кружат вокруг центра — надзаголовка и заголовка сцены. До шести — одна орбита,
 * больше — две, внешняя идёт навстречу и медленнее. Каждый пункт выпрыгивает на своём моменте.
 */
function Orbit({ s }: Props): JSX.Element {
  const items = s.items ?? [];
  const inner = items.length > 6 ? Math.ceil(items.length / 2) : items.length;
  return (
    <Stage s={s} cls="k-orb" move="still">
      <div className="orb">
        <span className="orb-ring orb-r1" /><span className={items.length > inner ? "orb-ring orb-r2" : "orb-ring orb-r2 off"} />
        <div className="orb-core">
          {s.kicker ? <Reveal at="0" enter="track"><p className="kicker">{s.kicker}</p></Reveal> : null}
          {s.title ? <Title s={s} t="0" cls="orb-title" /> : null}
        </div>
        {items.map((it, i) => {
          const ring = i < inner ? 1 : 2, k = ring === 1 ? i : i - inner, n = ring === 1 ? inner : items.length - inner;
          return (
            <div className="orb-pos" key={i} data-ring={ring} data-phase={(k / n).toFixed(4)}>
              <Reveal at={item(s, i, items.length)} enter="pop"><Chip icon={it.icon} title={it.title} /></Reveal>
            </div>
          );
        })}
      </div>
    </Stage>
  );
}

/**
 * Кольцо карточек в настоящем 3D: карточки стоят по кругу, кольцо поворачивается к пункту на его
 * моменте. Кольцо трёхмерно на каждом кадре — так его растр одинаков в любом прогоне (styles.ts).
 */
function Ring({ s }: Props): JSX.Element {
  const items = s.items ?? [];
  return (
    <Stage s={s} cls="k-ring" move="still">
      <KHead s={s} />
      <Reveal at={item(s, 0, items.length)} enter="fade" className="ring3">
        <div className="ring3-rot" data-n={items.length}>
          {items.map((it, i) => (
            <div className="ring3-card" key={i} data-at={item(s, i, items.length)}>
              {it.icon ? <span className="feat-ic">{it.icon}</span> : null}
              <h3>{it.title}</h3>
              {it.text ? <p>{it.text}</p> : null}
            </div>
          ))}
        </div>
      </Reveal>
    </Stage>
  );
}

/**
 * Глобус на WebGL: сфера из точек поворачивается, из первого города к остальным по очереди летят
 * дуги, в точке прихода расходится пинг и встаёт подпись. Рисует скрипт страницы (`globe`).
 */
function Globe({ s }: Props): JSX.Element {
  const items = s.items ?? [];
  return (
    <Stage s={s} cls="k-globe" move="still">
      <KHead s={s} />
      <div className="globe">
        <canvas className="globe-cv" data-map={s.map ?? "globe"} data-cities={JSON.stringify(items.map((it) => (it.text ?? "0 0").split(/\s+/).map(Number)))} />
        {items.map((it, i) => <span className="globe-l" key={i} data-at={i ? item(s, i - 1, items.length - 1) : "0"}>{it.title}</span>)}
      </div>
    </Stage>
  );
}

/**
 * Стена снимков: четыре колонки картинок на плоскости, наклонённой в 3D, соседние колонки едут
 * навстречу друг другу; заголовок стоит поверх под пеленой фона. Плоскость трёхмерна на каждом
 * кадре, колонки двигает скрипт страницы (`wall`).
 */
function Wall({ s }: Props): JSX.Element {
  const imgs = s.images ?? [];
  return (
    <Stage s={s} cls="k-wall" move="still" back={
      <div className="wall" aria-hidden="true">
        <div className="wall-plane">
          {[0, 1, 2, 3].map((c) => (
            <div className="wall-col" data-dir={c % 2 ? 1 : -1} key={c}>
              {[0, 1].map((k) => imgs.map((_, i) => <img key={`${k}-${i}`} alt="" src={imgs[(i + c * 2) % imgs.length]!.src} />))}
            </div>
          ))}
        </div>
        <div className="wall-shade" />
      </div>}>
      <div className="wall-copy">
        {s.kicker ? <Reveal at="0.2s" enter="track"><p className="kicker">{s.kicker}</p></Reveal> : null}
        {s.title ? <Title s={s} t={moment(s, 0, "0.4s")} cls="wall-title" /> : null}
      </div>
    </Stage>
  );
}

/**
 * Облако на сфере: пункты стоят на сфере Фибоначчи, сфера поворачивается; ближние пункты крупнее и
 * ярче дальних. Проекцию считает скрипт страницы (`cloud`); пункт выпрыгивает на своём моменте.
 */
function Cloud({ s }: Props): JSX.Element {
  const items = s.items ?? [];
  return (
    <Stage s={s} cls="k-cloud" move="still">
      <KHead s={s} />
      <div className="cloud" data-n={items.length}>
        {items.map((it, i) => (
          <div className="cloud-pos" key={i} data-i={i}>
            <Reveal at={item(s, i, items.length)} enter="pop"><Chip icon={it.icon} title={it.title} /></Reveal>
          </div>
        ))}
      </div>
    </Stage>
  );
}

/** Строка вывода терминала: успех, ошибка или обычная — по знаку в начале. */
const outKind = (line: string): string => (/^[✔✓]/u.test(line) ? "term-out ok" : /^[✘✗×]/u.test(line) ? "term-out bad" : "term-out");

/**
 * Терминал: команда после приглашения набирается неровным темпом руки, пока она «работает», крутится
 * спиннер, потом появляется вывод. Пункт «$ команда :: вывод» — команда с выводом, пункт без «$» —
 * строка вывода. Показ, спиннер и прокрутку ведёт скрипт страницы (`terminal`, вид `shell`).
 */
function Terminal({ s }: Props): JSX.Element {
  const items = s.items ?? [];
  return (
    <Stage s={s} cls="k-term" move="drift">
      <KHead s={s} />
      <Reveal at="0.1s" enter="tilt" className="code-win term-win">
        <div className="code-bar"><i /><i /><i /><span>{s.name ?? "shell"}</span></div>
        <div className="term">
          <div className="term-feed">
            {items.map((it, i) => {
              const t = item(s, i, items.length);
              const line = `${it.icon ? `${it.icon} ` : ""}${it.title}`;
              const cmd = /^\$\s*/u.test(line);
              return (
                <div className="term-block" key={i} data-at={t}>
                  {cmd
                    ? <div className="term-cmd"><span className="term-ps">$</span>{" "}
                      <span className="term-in" data-type="term" data-at={t} data-type-speed="24" data-type-hold="1.1">{line.replace(/^\$\s*/u, "")}</span>
                      <span className="term-spin" /></div>
                    : <div className={outKind(line)}>{line}</div>}
                  {it.text ? <div className={`${outKind(it.text)} term-late`}>{it.text}</div> : null}
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>
    </Stage>
  );
}

/** Кто говорит в чате: собеседник справа, ассистент слева. */
const USER = /^(you|user|me|human|я|вы|ты|пользователь|клиент)$/iu;

/**
 * Чат: реплики выпрыгивают по очереди от своего края; перед каждой репликой ассистента встаёт
 * «ИИ думает» — строка, по которой бежит блик, и мерцающие полосы скелетона на месте будущего
 * ответа. Когда реплики не помещаются, лента чата прокручивается вверх.
 */
function Chat({ s, w }: Props): JSX.Element {
  const items = s.items ?? [];
  return (
    <Stage s={s} cls="k-chat" move="drift">
      <KHead s={s} />
      <div className="chat">
        <div className="chat-feed">
          {items.map((it, i) => {
            const me = USER.test(it.title);
            const t = item(s, i, items.length);
            return (
              <div className={me ? "msg me" : "msg"} key={i}>
                {me ? null : <span className="msg-think" data-at={t}><em>{w.thinking}</em><i /><i /></span>}
                <Reveal at={t} enter="pop" className="bubble">
                  {me ? null : <b className="msg-who">{it.title}</b>}
                  <span>{it.text ?? it.title}</span>
                </Reveal>
              </div>
            );
          })}
        </div>
      </div>
    </Stage>
  );
}

/**
 * Искры карты: места, снос и задержки — из номера искры, а не из случая, поэтому кадр
 * повторим. Двигает их скрипт страницы по времени сцены.
 */
function Embers({ n, seed }: { n: number; seed: number }): JSX.Element {
  const r = (i: number, k: number): number => ((Math.sin((i + 1) * 127.1 + k * 311.7 + seed * 74.7) * 43758.5453) % 1 + 1) % 1;
  return (
    <div className="card-embers" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <i key={i} data-x={(r(i, 1) * 100).toFixed(1)} data-y={(62 + r(i, 2) * 32).toFixed(1)}
          data-dx={((r(i, 3) - 0.5) * 160).toFixed(0)} data-delay={(r(i, 4) * 1.2).toFixed(2)} />
      ))}
    </div>
  );
}

/**
 * Трейлерная карта: одно–три слова во всю ширину кадра. Слова влетают из увеличенного и
 * размытого, садятся с ударом; кадр вспыхивает и вздрагивает, по металлу букв проходит блик,
 * вверх летят искры. Всё движение — функция времени сцены (скрипт страницы, `cards`).
 */
function Card({ s }: Props): JSX.Element {
  return (
    <section className="k k-card" data-at={moment(s, 0, "0.1s")}>
      <div className="card-smoke" aria-hidden="true" />
      <div className="card-stage">
        {s.kicker ? <p className="card-kicker">{s.kicker}</p> : null}
        <div className="card-shake"><h1 className={s.fill ? "card-word filled" : "card-word"}
          style={s.fill ? { backgroundImage: `url(${s.fill.src})` } : undefined}>{s.title}</h1></div>
      </div>
      <Embers n={14} seed={1} />
      <div className="card-flash" aria-hidden="true" />
    </section>
  );
}

/**
 * Титул фильма: название разреженными прописными, цветом акцента темы с металлическим
 * переливом, проявляется из размытия; над ним строка (`kicker`), под ним дата (`body`), через
 * кадр проходит горизонтальный блик. Строки названия делит ` / `.
 */
function TitleCard({ s }: Props): JSX.Element {
  const lines = (s.title ?? "").split(/\s+\/\s+/);
  return (
    <section className="k k-tcard" data-at={moment(s, 0, "0.05s")}>
      <div className="card-smoke" aria-hidden="true" />
      <div className="card-stage">
        {s.kicker ? <p className="tc-kicker">{s.kicker}</p> : null}
        <h1 className="tc-name">{lines.map((l, i) => <span className="tc-line" key={i}>{l}</span>)}</h1>
        {s.body ? <p className="tc-date">{s.body}</p> : null}
      </div>
      <div className="tc-flare" aria-hidden="true" />
      <Embers n={20} seed={2} />
    </section>
  );
}

/**
 * Разобранный вид: снимок и его панели лежат стопкой слоёв. Камера наклоняется, слои расходятся
 * по глубине, каждый на свою (`@ глубина`), и к концу сцены собираются обратно в плоский снимок.
 * Рамка трёхмерна на каждом кадре — и плоская в начале, и разобранная в середине.
 */
function Layers({ s }: Props): JSX.Element {
  const img = s.image!;
  return (
    <Stage s={s} cls="k-lay" move="still">
      <KHead s={s} />
      <Reveal at={moment(s, 0, "0.1s")} enter="zoom" className="lay">
        <div className="lay-frame" style={{ aspectRatio: `${img.width} / ${img.height}` }} data-at={moment(s, 1, "0.6s")}>
          <div className="lay-base" style={{ backgroundImage: `url(${img.src})` }} />
          {(s.panels ?? []).map((p, i) => (
            <div className="lay-panel" key={i} data-depth={p.depth}
              style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, width: `${p.w * 100}%`, height: `${p.h * 100}%`,
                backgroundImage: `url(${img.src})`, backgroundSize: `${100 / p.w}% ${100 / p.h}%`,
                backgroundPosition: `${p.w < 1 ? (p.x / (1 - p.w)) * 100 : 0}% ${p.h < 1 ? (p.y / (1 - p.h)) * 100 : 0}%` }} />
          ))}
        </div>
      </Reveal>
    </Stage>
  );
}

/**
 * Бенто: ячейки разного размера в одной сетке — первая крупная, последние вытянуты по ширине. Разный размер
 * говорит, что главное, лучше одинаковых карточек фич.
 */
function Bento({ s }: Props): JSX.Element {
  const items = s.items ?? [];
  // Крупная первая ячейка занимает четыре клетки, остальные по одной; последние пункты вытягиваются
  // вдвое, пока сетка в четыре колонки не закроется без дыр.
  const wide = (4 - ((items.length + 3) % 4)) % 4;
  return (
    <Stage s={s} cls="k-bento" move="drift">
      <KHead s={s} />
      <div className="bento" data-n={items.length}>
        {items.map((it, i) => (
          <Reveal at={item(s, i, items.length)} enter={enterOf(s, "tilt3d", i)} className={`bento-cell${i === 0 ? " big" : i >= items.length - wide ? " wide" : ""}`} key={i}>
            {it.icon ? <span className="feat-ic">{it.icon}</span> : null}
            <h3>{it.title}</h3>
            {it.text ? <p>{it.text}</p> : null}
          </Reveal>
        ))}
      </div>
    </Stage>
  );
}

const BODIES: Record<string, (p: Props) => JSX.Element> = {
  chapter: Chapter,
  compare: Compare,
  chain: Chain,
  quote: Quote,
  number: Magnitude,
  hero: Hero,
  steps: Steps,
  features: Features,
  timeline: Timeline,
  counter: Counter,
  chart: Chart,
  beforeafter: BeforeAfter,
  parallax: Parallax,
  perspective: Perspective,
  code: Code,
  photo: Photo,
  shot: Shot,
  outro: Outro,
  card: Card,
  titlecard: TitleCard,
  marquee: Marquee,
  stack: Stack,
  orbit: Orbit,
  chat: Chat,
  wall: Wall,
  cloud: Cloud,
  shell: Terminal,
  carousel: Ring,
  globe: Globe,
  layers: Layers,
  bento: Bento,
};

/** Тело слайда по его виду. Незнакомый вид — ошибка, а не пустая страница. */
export function SlideBody({ s, lang, grid }: { s: Slide; lang?: string; grid?: Grid }): JSX.Element {
  const Body = BODIES[s.kind];
  if (!Body) throw new Error(`неизвестный вид слайда: ${s.kind}`);
  return <Body s={s} w={wordsFor(lang, s)} grid={grid ?? { w: 1280, h: 720 }} />;
}
