// Оформление слайдов. Отдельным файлом от компонентов: это единственная
// часть, которую правят, когда «поехала вёрстка», и держать её рядом
// с разметкой значит каждый раз листать одно ради другого.
export const CSS = `
:root{--bg:#0b0e14;--ink:#f2f5fb;--body:#c7cfdd;--mut:#8b97ad;--line:#2a3446;
--acc:#7aa2ff;--acc2:#4fd1c5;--bad:#ff8a9b;--good:#7ee0a7;
--sans:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
--mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace}
*{box-sizing:border-box;margin:0;padding:0}
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
h1{color:var(--ink);font-size:48px;line-height:1.1;letter-spacing:-.02em;margin-bottom:26px;
font-weight:700}
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
  els.forEach((el) => {
    const at = Number(el.dataset.at || 0);
    const p = Math.max(0, Math.min(1, (t - at) / 0.45));
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    el.style.opacity = String(e.toFixed(3));
    el.style.transform = "translateY(" + Math.round((1 - e) * 18) + "px)";
  });
};
window.renderAt(0);
`;
