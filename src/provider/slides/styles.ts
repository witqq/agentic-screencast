// Оформление слайдов. Отдельным файлом от компонентов: это единственная
// часть, которую правят, когда «поехала вёрстка», и держать её рядом
// с разметкой значит каждый раз листать одно ради другого.
export const CSS = `
:root{--bg:#0b0e14;--ink:#f2f5fb;--body:#c7cfdd;--mut:#8b97ad;--line:#2a3446;
--acc:#7aa2ff;--acc2:#4fd1c5;--bad:#ff8a9b;--good:#7ee0a7;
--sans:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
--mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace}
*{box-sizing:border-box;margin:0;padding:0}
/* Живой фон. Слайд, у которого движение кончается вместе с появлением
   элементов, дальше стоит в кадре неподвижной картинкой — а ролик
   смотрят как видео, а не как presentation. Поэтому у КАЖДОГО слайда
   есть три постоянных слоя: дышащее пятно света, медленно плывущая
   сетка и редкий блик. Все три — чистые функции времени сцены, их ведёт
   функция времени страницы, а не CSS-анимация: иначе кадр зависел бы
   от того, когда его сняли. */
.amb{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.amb span{position:absolute;display:block}
.amb-glow{width:1100px;height:1100px;left:52%;top:-42%;border-radius:50%;
  background:radial-gradient(circle,color-mix(in srgb,var(--acc) 26%,transparent) 0%,transparent 62%)}
.amb-grid{inset:-10%;background-image:
  linear-gradient(color-mix(in srgb,var(--line) 62%,transparent) 1px,transparent 1px),
  linear-gradient(90deg,color-mix(in srgb,var(--line) 62%,transparent) 1px,transparent 1px);
  background-size:96px 96px;opacity:.5;
  mask-image:radial-gradient(circle at 60% 40%,black 10%,transparent 78%)}
.amb-sheen{top:-25%;bottom:-25%;width:260px;left:-320px;transform:skewX(-18deg);
  background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--acc2) 13%,transparent),transparent)}
body>*{position:relative;z-index:1}
body>.amb{z-index:0}
/* Слайд рисуется в сетке шириной 1280, а в кадр ролика попадает целиком
   за счёт увеличения корня документа. Так все кегли и отступы остаются
   теми числами, которыми они задумывались и которые меряет признак кадра,
   и при смене размера кадра их не нужно пересчитывать по одному.
   Само увеличение и высота сетки подставляются по кадру РОЛИКА: прежде
   здесь стояли 1,5 и 720, то есть страница была свёрстана под один
   размер кадра навсегда. Кадр уже — вёрстка вылезала за край, шире —
   прижималась к левому верхнему углу, оставляя полкадра чернотой. */
html{zoom:var(--sc-zoom,1.5)}
body{width:var(--sc-grid-w,1280px);height:var(--sc-grid-h,720px);overflow:hidden;background:
radial-gradient(1100px 620px at 78% -12%,var(--glow,#16203a) 0%,transparent 60%),var(--bg);
color:var(--body);font:400 24px/1.45 var(--sans);display:flex;flex-direction:column;
justify-content:center;padding:52px 72px 64px}
/* Единая сетка: шапка сцены всегда одной высоты, поэтому заголовки
   не пляшут от слайда к слайду, а содержимое начинается на одной линии. */
.head{min-height:150px;display:flex;flex-direction:column;justify-content:flex-end;
padding-bottom:8px;border-bottom:1px solid var(--line);margin-bottom:28px}
.head h1{margin-bottom:0}
/* Нижняя черта того же цвета, что и акцент: кадр перестаёт быть
   «текстом в пустоте» и получает низ. */
.rule{margin-top:auto;height:3px;border-radius:2px;
background:linear-gradient(90deg,var(--acc),var(--acc2) 60%,transparent)}
/* Заголовки набираются шрифтом темы: у бумажной темы это антиква, у
   остальных — тот же гротеск, что и текст. Своего шрифта у слайда нет. */
h1{color:var(--ink);font-size:48px;line-height:1.1;letter-spacing:-.02em;margin-bottom:26px;
font-weight:700;font-family:var(--display,var(--sans))}
.kicker{color:var(--acc2);font-size:28px;font-weight:700;letter-spacing:.16em;
text-transform:uppercase;margin-bottom:14px}
.el{opacity:0;transform:translateY(18px)}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:34px;align-items:stretch}
/* Колонки — одной высоты. Прежде обёртка появления была grid-элементом,
   а карточка внутри тянулась по своему тексту, и две колонки кончались
   на разной высоте: выравнивание ломалось на каждом слайде сравнения. */
.cols>.el{display:flex}
.col{background:var(--card,#121826);border:1px solid var(--line);border-radius:20px;padding:30px 32px;
flex:1;min-height:320px;display:flex;flex-direction:column}
.col h2{color:var(--ink);font-size:30px;margin-bottom:16px;font-weight:600}
.col.bad h2{color:var(--bad)} .col.good h2{color:var(--good)}
.col.plain h2{color:var(--ink)}
.col p{font-size:29px;color:var(--body)}
.col ul{list-style:none;margin-top:10px} .col li{font-size:28px;padding:7px 0 7px 26px;position:relative}
.col li:before{content:"→";position:absolute;left:0;color:var(--mut)}
/* Узлы делят ширину строки поровну: раньше каждый был по своему тексту,
   и цепочка выглядела рваной, а перенос начинал строку стрелкой в пустоту. */
.chain{display:flex;flex-wrap:wrap;gap:18px 14px;margin-top:4px;align-items:stretch}
/* Растягивается ОБЁРТКА ПОЯВЛЕНИЯ: именно она — элемент строки, а не пара
   «стрелка плюс узел» внутри неё. Пока правило висело на внутреннем узле,
   ширины оставались по тексту и цепочка выглядела рваной. */
.chain>.el{flex:1 1 300px;display:flex;min-width:0}
.pairwrap{flex:1;display:flex;align-items:center;gap:14px;min-width:0}
.node{background:var(--node,#141c2c);border:1px solid var(--node-line,#34405a);border-radius:16px;padding:20px 22px;
color:var(--ink);font-size:28px;font-weight:600;flex:1;text-align:center;min-width:0;
min-height:132px;display:flex;align-items:center;justify-content:center}
.node.acc{border-color:var(--acc);color:var(--acc)}
.node.bad{border-color:var(--bad-line,#5d3745);color:var(--bad)}
.arrow{color:var(--mut);font-size:30px}
.back{margin-top:32px;color:var(--mut);font-size:29px;display:flex;align-items:center;gap:12px}
.back b{color:var(--acc2)}
.disclaimer{margin-top:10px;font-size:28px;color:var(--mut)}
.huge{font-size:190px;line-height:.95;font-weight:800;color:var(--acc);letter-spacing:-.04em}
.huge-sub{font-size:32px;color:var(--ink);margin-top:12px;font-weight:600}
.tags{display:flex;gap:14px;margin-top:30px;flex-wrap:wrap}
.tag{background:var(--node,#141c2c);border:1px solid var(--line);border-radius:999px;padding:12px 22px;
font-size:28px;color:var(--body)}
.foot{position:absolute;left:72px;bottom:40px;color:var(--mut);font-size:20px}
.quote{background:var(--card,#111826);border:1px solid var(--line);border-radius:18px;
padding:18px 24px;margin-bottom:14px}
.qlabel{display:block;color:var(--acc2);font-size:28px;font-weight:700;margin-bottom:10px}
.quote pre{font:400 30px/1.4 var(--mono);color:var(--ink);white-space:pre-wrap}
.pair{display:flex;gap:40px;align-items:flex-end}
.pair .huge{font-size:150px}
/* Заставка главы целиком собрана из переменных темы. Прежде её фон,
   сетка, орбиты и блик были записаны готовыми цветами, и светлая тема
   давала тёмный кадр с тёмным же заголовком: оформление слайда жило
   отдельно от темы ролика. */
.chapter{position:absolute;inset:0;overflow:hidden;background:
  radial-gradient(circle at 72% 45%,color-mix(in srgb,var(--acc) 24%,transparent),transparent 37%),
  linear-gradient(125deg,var(--bg) 5%,color-mix(in srgb,var(--glow) 78%,var(--bg)) 57%,var(--bg) 100%);
  color:var(--ink)}
.chapter::before{content:"";position:absolute;inset:0;opacity:.32;background-image:
  linear-gradient(color-mix(in srgb,var(--line) 70%,transparent) 1px,transparent 1px),
  linear-gradient(90deg,color-mix(in srgb,var(--line) 70%,transparent) 1px,transparent 1px);
  background-size:72px 72px;mask-image:linear-gradient(90deg,transparent 8%,black 75%)}
.chapter-orbit{position:absolute;width:680px;height:680px;right:-110px;top:20px;opacity:.82}
.chapter-orbit span{position:absolute;inset:0;border-radius:50%;
  border:1px solid color-mix(in srgb,var(--acc2) 30%,transparent)}
.chapter-orbit span:nth-child(2){inset:80px;border-color:color-mix(in srgb,var(--acc) 34%,transparent)}
.chapter-orbit span:nth-child(3){inset:170px;border-color:color-mix(in srgb,var(--acc2) 52%,transparent);
  box-shadow:0 0 50px color-mix(in srgb,var(--acc2) 16%,transparent)}
.chapter-sweep{position:absolute;inset:-80px auto -80px -230px;width:180px;transform:skewX(-22deg);
  background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--acc2) 14%,transparent),transparent)}
.chapter-copy{position:absolute;left:92px;top:146px;width:min(970px,79%);z-index:1}
.chapter-kicker{font-size:25px;letter-spacing:.18em;text-transform:uppercase;color:var(--acc2);font-weight:750}
.chapter-title{font-size:76px;line-height:1.07;letter-spacing:-.045em;min-height:170px;
  font-family:var(--display,var(--sans));
  margin:30px 0 15px;max-width:970px;text-wrap:balance}
.chapter-body{font-size:32px;line-height:1.33;color:var(--body);max-width:850px;min-height:100px;text-wrap:balance}
.chapter-line{position:absolute;left:92px;right:92px;bottom:76px;height:4px;border-radius:3px;
  background:linear-gradient(90deg,var(--acc2),var(--acc),transparent);transform-origin:left center}
`;

/**
 * Появление элементов — чистая функция времени сцены. Скрипт уходит
 * в страницу текстом: он исполняется в браузере, а не в узле, и ничего
 * из инструмента не импортирует.
 */
export const RUNTIME = `
// Появление элементов — чистая функция времени сцены.
window.renderAt = (t) => {
  const els = [...document.querySelectorAll(".el")];
  els.forEach((el, i) => {
    const at = Number(el.dataset.at || 0);
    const p = Math.max(0, Math.min(1, (t - at) / 0.45));
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    el.style.opacity = String(e.toFixed(3));
    // Появившийся элемент продолжает еле заметно дышать: амплитуда
    // в полторы точки не читается как движение элемента, но не даёт
    // кадру застыть. Фаза сдвинута по номеру, иначе всё качается разом.
    const float = Math.sin(t * 0.8 + i * 0.7) * 1.5 * e;
    el.style.transform = "translateY(" + ((1 - e) * 18 + float).toFixed(2) + "px)";
  });
  // Фоновые слои: пятно света дышит, сетка плывёт, блик проходит кадр
  // раз в двенадцать секунд. Периоды разные и несоизмеримые, поэтому
  // рисунок не повторяется на глаз.
  const glow = document.querySelector('.amb-glow');
  if (glow) {
    const k = 1 + Math.sin(t * 0.33) * 0.06;
    glow.style.transform = 'translate(-50%,0) translate(' + (Math.sin(t * 0.21) * 46).toFixed(1)
      + 'px,' + (Math.cos(t * 0.17) * 34).toFixed(1) + 'px) scale(' + k.toFixed(4) + ')';
    glow.style.opacity = (0.72 + Math.sin(t * 0.41) * 0.12).toFixed(3);
  }
  const grid = document.querySelector('.amb-grid');
  if (grid) grid.style.backgroundPosition = (t * 5.5).toFixed(2) + 'px ' + (t * -3.2).toFixed(2) + 'px';
  const sheen = document.querySelector('.amb-sheen');
  if (sheen) {
    const cycle = (t % 12) / 12;
    sheen.style.transform = 'translateX(' + Math.round(cycle * 2400) + 'px) skewX(-18deg)';
  }
  document.querySelectorAll('[data-type]').forEach((el) => {
    if (el.dataset.full === undefined) el.dataset.full = el.textContent || '';
    const full = Array.from(el.dataset.full);
    const from = Number(el.dataset.at) || 0;
    const speed = el.dataset.type === 'title' ? 22 : 34;
    const count = Math.max(0, Math.min(full.length, Math.floor((t - from) * speed)));
    el.textContent = full.slice(0, count).join('');
  });
  const orbit = document.querySelector('.chapter-orbit');
  if (orbit) orbit.style.transform = 'rotate(' + (t * 3).toFixed(2) + 'deg) translateY(' + Math.round(Math.sin(t * .55) * 12) + 'px)';
  // Блик заставки идёт ПО КРУГУ, а не один раз: пройдя кадр за четыре
  // секунды, он прежде замирал, и дальше заставка держалась на одном
  // медленном повороте орбит.
  const sweep = document.querySelector('.chapter-sweep');
  if (sweep) sweep.style.transform = 'translateX(' + Math.round(((t % 9) / 9) * 1900) + 'px) skewX(-22deg)';
  const line = document.querySelector('.chapter-line');
  if (line) line.style.transform = 'scaleX(' + Math.max(0, Math.min(1, (t - .3) / 2)).toFixed(3) + ')';
};
window.renderAt(0);
`;
