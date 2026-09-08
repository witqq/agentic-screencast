// Слайд как набор компонентов. Прежде разметка собиралась склейкой строк,
// и вёрстку не было видно глазами прямо в коде: колонки разной высоты
// и узел цепочки, уехавший на вторую строку, ловились только по снимкам.
//
// Компоненты ничего не знают о времени: момент появления кладётся
// в атрибут, а двигает элементы скрипт страницы (`RUNTIME`). Так слайд
// остаётся чистой функцией времени, и его можно снять с середины.
import type { JSX } from "react";
import type { Column, Slide } from "../../source.js";

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
export function at(s: Slide, i: number): string {
  const list = s.at ?? [];
  if (i < list.length) return String(list[i]!);
  if (!list.length) return `b${i + 1}`;
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

/** Обёртка появления: несёт якорь момента, в который элемент проступает. */
function Reveal({ at: t, children }: { at: string; children: React.ReactNode }): JSX.Element {
  return <div className="el" data-at={t}>{children}</div>;
}

function Head({ kicker, title }: { kicker: string; title?: string }): JSX.Element {
  return (
    <Reveal at="0">
      <div className="head">
        <p className="kicker">{kicker}</p>
        <h1>{title}</h1>
      </div>
    </Reveal>
  );
}

function Note({ at: t, text }: { at: string; text?: string }): JSX.Element | null {
  if (!text) return null;
  return <Reveal at={t}><p className="back">{text}</p></Reveal>;
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

/** Сравнение в две колонки: слева «без», справа «с». */
function Compare({ s }: { s: Slide }): JSX.Element {
  return (
    <>
      <Head kicker={s.kicker ?? "сравнение"} title={s.title} />
      <div className="cols">
        <Reveal at={at(s, 0)}><ColumnCard col={s.left!} dflt="bad" /></Reveal>
        <Reveal at={at(s, 1)}><ColumnCard col={s.right!} dflt="good" /></Reveal>
      </div>
      <Note at={at(s, 2)} text={s.note} />
    </>
  );
}

/** Схема со связями: цепочка узлов и подпись про возвраты. */
function Chain({ s }: { s: Slide }): JSX.Element {
  const nodes = s.nodes ?? [];
  return (
    <>
      <Head kicker={s.kicker ?? "как это устроено"} title={s.title} />
      <div className="chain">
        {nodes.map((n, i) => (
          <Reveal at={at(s, i)} key={`${n.label}-${i}`}>
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
        <Reveal at={at(s, nodes.length)}>
          <p className="back">↩ <b>{s.back}</b></p>
        </Reveal>
      ) : null}
      <Note at={at(s, nodes.length + 1)} text={s.note} />
    </>
  );
}

/** Дословная цитата настоящего ответа продукта — фрагментом. */
function Quote({ s }: { s: Slide }): JSX.Element {
  const parts = s.parts ?? [];
  return (
    <>
      <Head kicker={s.kicker ?? "настоящий ответ движка"} title={s.title} />
      {parts.map((q, i) => (
        <Reveal at={at(s, i)} key={`${q.label}-${i}`}>
          <div className="quote">
            <span className="qlabel">{q.label}</span>
            <pre>{q.text}</pre>
          </div>
        </Reveal>
      ))}
      {/* Приписку под цитатой пишет САМА сцена полем `note`. Прежде
          здесь стояла фраза про чужой продукт, вшитая безусловно:
          в ролике на любую другую тему она появлялась сама собой
          и выключить её было нечем. */}
      <Note at={at(s, parts.length)} text={s.note} />
    </>
  );
}

/** Крупная величина с подписями. */
function Magnitude({ s }: { s: Slide }): JSX.Element {
  const values = s.values ?? [];
  return (
    <>
      <Head kicker={s.kicker ?? "цифра"} title={s.title} />
      <div className="pair">
        {values.map((v, i) => (
          <Reveal at={at(s, i)} key={`${v.value}-${i}`}>
            <div>
              <div className="huge">{v.value}</div>
              <div className="huge-sub">{v.label}</div>
            </div>
          </Reveal>
        ))}
      </div>
      {s.tags ? (
        <Reveal at={at(s, values.length)}>
          <div className="tags">{s.tags.map((x) => <span className="tag" key={x}>{x}</span>)}</div>
        </Reveal>
      ) : null}
    </>
  );
}

const BODIES: Record<Slide["kind"], (p: { s: Slide }) => JSX.Element> = {
  compare: Compare,
  chain: Chain,
  quote: Quote,
  number: Magnitude,
};

/** Тело слайда по его виду. Незнакомый вид — ошибка, а не пустая страница. */
export function SlideBody({ s }: { s: Slide }): JSX.Element {
  const Body = BODIES[s.kind];
  if (!Body) throw new Error(`неизвестный вид слайда: ${s.kind}`);
  return <Body s={s} />;
}
