// Оформление слайдов. Отдельным файлом от компонентов: это единственная
// часть, которую правят, когда «поехала вёрстка», и держать её рядом
// с разметкой значит каждый раз листать одно ради другого.
export const CSS = `
/* Палитру, шрифты, формы и шкалу отступов даёт тема (page.ts кладёт её в корень страницы);
   своих значений у правил нет, и слайд без темы носит ночную. */
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
radial-gradient(1100px 620px at 78% -12%,var(--glow) 0%,transparent 60%),var(--bg);
color:var(--body);font:400 24px/1.45 var(--sans);display:flex;flex-direction:column;
justify-content:center;padding:var(--pad-t) var(--pad-r) var(--pad-b) var(--pad-l)}
/* Единая сетка: шапка сцены всегда одной высоты, поэтому заголовки
   не пляшут от слайда к слайду, а содержимое начинается на одной линии. */
.head{min-height:150px;display:flex;flex-direction:column;justify-content:flex-end;
padding-bottom:var(--space-xs);margin-bottom:28px}
/* Черта под шапкой прочерчивается при появлении: её длину ведёт ход входа (--p). */
.head::after{content:"";position:absolute;left:0;right:0;bottom:0;height:var(--hairline);background:var(--line);
transform:scaleX(var(--p,1));transform-origin:left center}
.head h1{margin-bottom:0}
/* Нижняя черта того же цвета, что и акцент: кадр перестаёт быть
   «текстом в пустоте» и получает низ. */
.rule{margin-top:auto;height:var(--rule-size);border-radius:var(--rule-size);
background:linear-gradient(90deg,var(--acc) 60%,transparent)}
/* Заголовки набираются шрифтом заголовков темы с её насыщенностью, разрядкой и регистром
   (--display-weight, --display-tracking, --display-case): у noir это разреженные заглавные антиквы,
   у aurora — тонкий гротеск. Разрядка темы прибавляется к собственной разрядке заголовка. */
h1{color:var(--ink);font-size:48px;line-height:1.1;letter-spacing:max(-.025em,calc(-.02em + var(--display-tracking,0em)));margin-bottom:26px;
font-weight:var(--display-weight,700);text-transform:var(--display-case,none);font-family:var(--display,var(--sans))}
.kicker{color:var(--acc2);font-size:28px;font-weight:600;letter-spacing:var(--kicker-tracking);
text-transform:var(--kicker-case);margin-bottom:14px}
.el{opacity:0;transform:translateY(18px)}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:34px;align-items:stretch;perspective:1200px}
/* Колонки — одной высоты. Прежде обёртка появления была grid-элементом,
   а карточка внутри тянулась по своему тексту, и две колонки кончались
   на разной высоте: выравнивание ломалось на каждом слайде сравнения. */
.cols>.el{display:flex}
.col{background:var(--card);border:var(--hairline) solid var(--line);border-radius:var(--radius-lg);padding:var(--space-xl) var(--space-xl);
flex:1;min-height:320px;display:flex;flex-direction:column}
.col h2{color:var(--ink);font-size:30px;margin-bottom:16px;font-weight:600}
.col.bad h2{color:var(--bad)} .col.good h2{color:var(--good)}
.col.plain h2{color:var(--ink)}
.col p{font-size:29px;color:var(--body)}
.col ul{list-style:none;margin-top:10px} .col li{font-size:28px;padding:var(--space-xs) 0 var(--space-xs) var(--space-l);position:relative}
.col li:before{content:"→";position:absolute;left:0;color:var(--mut)}
/* Узлы делят ширину строки поровну: раньше каждый был по своему тексту,
   и цепочка выглядела рваной, а перенос начинал строку стрелкой в пустоту. */
.chain{display:flex;flex-wrap:wrap;gap:18px 14px;margin-top:4px;align-items:stretch}
/* Растягивается ОБЁРТКА ПОЯВЛЕНИЯ: именно она — элемент строки, а не пара
   «стрелка плюс узел» внутри неё. Пока правило висело на внутреннем узле,
   ширины оставались по тексту и цепочка выглядела рваной. */
.chain>.el{flex:1 1 300px;display:flex;min-width:0}
/* Четыре коротких узла помещаются в одну строку внутри обычного поля сетки (1136 точек). */
.chain[data-n="4"]>.el{flex-basis:calc((100% - 42px) / 4)}
.pairwrap{flex:1;display:flex;align-items:center;gap:14px;min-width:0}
.node{background:var(--node);border:var(--hairline) solid var(--node-line);border-radius:var(--radius-md);padding:var(--space-m) var(--space-l);
color:var(--ink);font-size:28px;font-weight:600;flex:1;text-align:center;min-width:0;
min-height:132px;display:flex;align-items:center;justify-content:center}
.node.acc{border-color:var(--acc);color:var(--acc)}
.node.bad{border-color:var(--bad-line);color:var(--bad)}
.arrow{color:var(--mut);font-size:30px;display:inline-block;transform:scaleX(var(--p,1));transform-origin:left center}
.back{margin-top:32px;color:var(--mut);font-size:29px;display:flex;align-items:center;gap:12px}
.back b{color:var(--acc2)}
.disclaimer{margin-top:10px;font-size:28px;color:var(--mut)}
.huge{font-size:190px;line-height:.95;font-weight:var(--display-weight);color:var(--acc);letter-spacing:max(-.025em,calc(-.02em + var(--display-tracking,0em)));
font-variant-numeric:tabular-nums;white-space:nowrap}
.huge-sub{font-size:32px;color:var(--ink);margin-top:12px;font-weight:600}
.tags{display:flex;gap:14px;margin-top:30px;flex-wrap:wrap}
.tag{background:var(--node);border:var(--hairline) solid var(--line);border-radius:var(--radius-pill);padding:var(--space-s) var(--space-l);
font-size:28px;color:var(--body)}
.foot{position:absolute;left:72px;bottom:40px;color:var(--mut);font-size:20px}
.quote{background:var(--card);border:var(--hairline) solid var(--line);border-radius:var(--radius-lg);
padding:var(--space-m) var(--space-l);margin-bottom:14px}
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
  border:var(--hairline) solid color-mix(in srgb,var(--acc2) 30%,transparent)}
.chapter-orbit span:nth-child(2){inset:80px;border-color:color-mix(in srgb,var(--acc) 34%,transparent)}
.chapter-orbit span:nth-child(3){inset:170px;border-color:color-mix(in srgb,var(--acc2) 52%,transparent);
  box-shadow:var(--orbit-glow)}
.chapter-sweep{position:absolute;inset:-80px auto -80px -230px;width:180px;transform:skewX(-22deg);
  background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--acc2) 14%,transparent),transparent)}
.chapter-copy{position:absolute;left:var(--pad-l);top:calc(var(--pad-t) + 94px);width:min(970px,79%);z-index:1}
/* Надзаголовок заставки не мельче слайдового текста: при двенадцати знаках
   и больше он попадает в замер кегля, и 25 точек роняли проверку кадра. */
.chapter-kicker{font-size:28px;letter-spacing:var(--kicker-tracking);text-transform:var(--kicker-case);color:var(--acc2);font-weight:600}
.chapter-title{font-size:76px;line-height:1.07;letter-spacing:max(-.025em,calc(-.02em + var(--display-tracking,0em)));min-height:170px;
  font-family:var(--display,var(--sans));font-weight:var(--display-weight,700);text-transform:var(--display-case,none);
  margin:30px 0 15px;max-width:970px;text-wrap:balance}
.chapter-body{font-size:32px;line-height:1.33;color:var(--body);max-width:850px;min-height:100px;text-wrap:balance}
.chapter-line{position:absolute;left:var(--pad-l);right:var(--pad-r);bottom:calc(var(--pad-b) + var(--space-s));height:var(--rule-size);border-radius:var(--rule-size);
  background:linear-gradient(90deg,var(--acc) 60%,transparent);transform-origin:left center}

/* Счётчик: разряд — окно в строку, за ним едет лента цифр. Лента нарисована
   оформлением, а не текстом, поэтому ширина числа не меняется, пока оно
   крутится, и в тексте страницы нет десятка лишних цифр на каждый разряд. */
/* Строка ленты выше кегля (1,2): очертание цифры выходит за строку высотой
   ровно в кегль, и окно срезало верх цифры, показывая низ соседней. Лишнее
   снимается отрицательными полями, и снаружи разряд занимает строку текста. */
.count{display:inline-flex;align-items:center;line-height:1;vertical-align:top}
.dg{display:inline-block;width:1ch;height:1.2em;margin:-.1em 0;overflow:hidden}
.dg-s{display:block}
.dg-s::before{content:"0\\A 1\\A 2\\A 3\\A 4\\A 5\\A 6\\A 7\\A 8\\A 9\\A 0";white-space:pre;display:block;line-height:1.2em;text-align:center}
.dg-sep{display:inline-block}

/* Живой фон на холсте: какой режим включён, решает скрипт страницы. */
.amb-cv{position:absolute;inset:0;width:100%;height:100%;display:none}

/* — виды во весь кадр — */
.k{position:absolute;inset:0;z-index:1;display:flex;perspective:1600px;overflow:hidden}
.k-in{position:relative;flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;
  padding:var(--pad-t) var(--pad-r) var(--pad-b) var(--pad-l);transform-origin:50% 50%}
.k~.rule{display:none}
.k-head{margin-bottom:34px}
.k-head h1{margin-bottom:0;font-size:54px}
.w{display:inline-block;transform-origin:50% 100%}
.hero-title,.outro-title{perspective:900px}

.k-hero .k-in{align-items:flex-start}
.hero-copy{max-width:1060px;position:relative}
.hero-copy .kicker{margin-bottom:6px}
.hero-title{font-size:96px;line-height:1.02;letter-spacing:max(-.025em,calc(-.02em + var(--display-tracking,0em)));margin:12px 0 28px;text-wrap:balance}
.hero-body{font-size:34px;line-height:1.36;color:var(--body);max-width:900px;text-wrap:balance}
.hero-img,.photo{position:absolute;inset:-3%;background-size:cover;background-position:center}
.hero-shade{position:absolute;inset:0;background:linear-gradient(90deg,
  color-mix(in srgb,var(--bg) 94%,transparent) 0%,color-mix(in srgb,var(--bg) 74%,transparent) 55%,
  color-mix(in srgb,var(--bg) 30%,transparent) 100%)}

.steps{list-style:none;position:relative;display:flex;flex-direction:column;gap:14px;perspective:1100px}
.steps[data-layout="two"]{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 24px}
.steps[data-layout="two"] .steps-rail{display:none}
.steps li{list-style:none}
.steps-rail{position:absolute;left:31px;top:36px;bottom:36px;width:var(--rail-size);border-radius:var(--rail-size);background:var(--line);overflow:hidden}
.steps-fill{position:absolute;left:0;top:0;width:100%;height:0;background:var(--acc)}
.step{display:flex;align-items:center;gap:26px;padding:var(--space-s) var(--space-xl) var(--space-s) 0;border-radius:var(--radius-lg)}
.step-n{flex:none;width:64px;height:64px;border-radius:50%;display:grid;place-items:center;position:relative;z-index:1;
  font:700 28px/1 var(--sans);color:var(--ink);background:var(--node);border:var(--ring-size) solid var(--node-line)}
.step h3{font-size:36px;line-height:1.15;color:var(--ink);font-weight:700;letter-spacing:-.01em}
.step p{font-size:28px;color:var(--body);margin-top:4px}
.step.done .step-n{border-color:var(--acc)}
.step.on{background:linear-gradient(90deg,color-mix(in srgb,var(--acc) 13%,transparent),transparent 85%)}
.step.on .step-n{background:var(--acc);border-color:var(--acc);color:var(--sc-badge-ink);box-shadow:var(--step-halo)}

.feats{display:grid;gap:22px;grid-template-columns:repeat(3,1fr)}
.feats[data-n="2"],.feats[data-n="4"]{grid-template-columns:repeat(2,1fr)}
.feat{position:relative;overflow:hidden;padding:var(--space-xl);border-radius:var(--radius-xl);
  background:var(--card);border:var(--hairline) solid var(--line);transform-origin:50% 100%}
.feat::before{content:"";position:absolute;left:0;top:0;height:var(--rule-size);width:calc(var(--p,1) * 100%);background:var(--acc)}
.feat-ic{display:grid;place-items:center;width:66px;height:66px;margin-bottom:18px;border-radius:var(--radius-lg);font-size:36px;
  background:color-mix(in srgb,var(--acc) 16%,var(--card))}
.feat h3{font-size:32px;line-height:1.15;color:var(--ink);font-weight:700;margin-bottom:8px;letter-spacing:-.01em}
.feat p{font-size:28px;line-height:1.35;color:var(--body)}

.tl{position:relative;margin-top:26px}
.tl-rail{position:absolute;left:0;right:0;top:90px;height:var(--rail-size);border-radius:var(--rail-size);background:var(--line);overflow:hidden}
.tl-fill{position:absolute;left:0;top:0;bottom:0;width:0;background:var(--acc)}
/* Голова хода: светящаяся точка на конце полосы, ведёт линию к следующей вехе. */
.tl-head{position:absolute;left:0;top:calc(90px + var(--rail-size) / 2);width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;
  background:var(--acc2);box-shadow:var(--dot-halo);opacity:0;pointer-events:none}
/* Буквы, залитые картинкой: картинка медленно плывёт внутри букв. */
.filled{background-size:140% auto;background-position:50% 50%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.goo-defs{position:absolute;width:0;height:0}
/* Стена снимков: плоскость наклонена к зрителю, колонки едут навстречу друг другу. */
.wall{position:absolute;inset:0;overflow:hidden;perspective:1600px}
.wall-plane{position:absolute;left:50%;top:50%;width:150%;height:210%;display:grid;grid-template-columns:repeat(4,1fr);gap:28px;
  transform:translate(-50%,-50%) rotateX(42deg) rotateZ(-24deg)}
.wall-col{display:flex;flex-direction:column;gap:28px}
.wall-col img{display:block;width:100%;border-radius:var(--radius-lg);box-shadow:var(--shadow-3)}
.wall-shade{position:absolute;inset:0;background:radial-gradient(ellipse 60% 55% at 50% 50%,color-mix(in srgb,var(--bg) 88%,transparent),color-mix(in srgb,var(--bg) 25%,transparent))}
.k-wall .k-in{align-items:center;text-align:center}
.wall-copy{position:relative;z-index:2}
.wall-title{font-size:88px}
/* Облако на сфере: пункты стоят по центру и разъезжаются по проекции сферы. */
.cloud{position:relative;flex:1;min-height:0;width:100%}
.cloud-pos{position:absolute;left:50%;top:50%;width:0;height:0;display:flex;align-items:center;justify-content:center}
.cloud-pos>.el{flex:none}
/* Терминал: окно кода, лента строк прокручивается вверх, когда не помещается. */
.term-win{align-self:stretch}
.term{height:520px;overflow:hidden;padding:var(--space-m) var(--space-l);font:400 26px/1.55 var(--mono);color:var(--code-ink)}
.term-feed{display:flex;flex-direction:column}
.term-ps{color:var(--acc)}
.term-spin{margin-left:12px;color:var(--mut)}
.term-out{color:var(--body);white-space:pre-wrap}
.term-out.ok{color:var(--good)}.term-out.bad{color:var(--bad)}
.tl-items{display:flex}
.tl-item{flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start;padding-right:var(--space-l)}
.tl-when{order:0;height:66px;display:flex;align-items:flex-end;font:var(--display-weight) 40px/1.05 var(--display,var(--sans));
  color:var(--acc);letter-spacing:-.02em}
.tl-dot{order:1;width:22px;height:22px;margin:15px 0 20px;border-radius:50%;background:var(--bg);
  border:var(--dot-ring) solid var(--acc);box-shadow:var(--dot-halo)}
.tl-item p{order:2;font-size:28px;line-height:1.35;color:var(--body)}

.ctrs{display:flex;gap:34px;flex-wrap:wrap}
/* Справа у подписи — место под кольцо доли (68 точек и поле), а не отступ темы. */
.ctr{--ring-room:84px;flex:1;min-width:250px;position:relative;padding:var(--space-2xl) var(--space-2xl) var(--space-xl);border-radius:var(--radius-xl);
  background:var(--card);border:var(--hairline) solid var(--line)}
/* Кегль числа — по тому, сколько карточек делят строку: четыре знака в
   узкой карточке иначе вылезали за её край. */
.ctr-v{font:var(--display-weight) 124px/1 var(--display,var(--sans));color:var(--acc);letter-spacing:max(-.025em,calc(-.02em + var(--display-tracking,0em)));
  font-variant-numeric:tabular-nums;white-space:nowrap}
.ctrs[data-n="2"] .ctr-v{font-size:112px}
.ctrs[data-n="3"] .ctr-v{font-size:84px}
.ctrs[data-n="4"] .ctr-v{font-size:64px}
.ctr-l{font-size:30px;line-height:1.25;color:var(--ink);margin-top:16px;font-weight:600;padding-right:var(--ring-room)}
.ring{position:absolute;right:24px;bottom:22px;width:68px;height:68px;transform:rotate(-90deg)}
.ring circle{fill:none;stroke-width:var(--ring-width)}
.ring-bg{stroke:var(--line)}
.ring-fg{stroke:var(--acc);stroke-linecap:round}

/* График: поле построения во всю ширину, подписи значений над столбцами и точками,
   подписи строк под осью. Подсвеченная строка — столбец акцентом темы, остальные рядом с ней
   приглушены, а её подписи — жирным цветом текста: мелкий текст цветом акцента на светлой теме
   не держит контраст 4,5:1. Акцент один, выделение — контраст, а не второй яркий цвет. */
.chart{align-self:stretch;display:flex;flex-direction:column;gap:14px;min-width:0;flex:0 1 auto;min-height:0}
/* Поле построения сжимается, если кадру тесно (подписи снизу, безопасная зона): иначе
   нижний ряд — подписи оси — уходил бы под субтитры. */
.chart-plot{position:relative;height:420px;flex:0 1 420px;min-height:160px;display:flex;align-items:flex-end;gap:18px;
  border-bottom:var(--chart-axis) solid var(--line);padding:0 var(--space-xs)}
.chart-col{flex:1;min-width:0;height:100%;display:flex;align-items:flex-end;position:relative}
.chart-bar{position:relative;width:100%;border-radius:var(--radius-sm) var(--radius-sm) 0 0;background:var(--acc);transform-origin:50% 100%}
.chart:has(.peak) .chart-col:not(.peak) .chart-bar{background:color-mix(in srgb,var(--acc) 30%,var(--line))}
.chart-col.peak .chart-bar{background:var(--acc)}
.chart-v{position:absolute;left:50%;bottom:100%;transform:translate(-50%,-10px);font:var(--display-weight) 30px/1 var(--display,var(--sans));
  color:var(--ink);white-space:nowrap;font-variant-numeric:tabular-nums}
.chart-col.peak .chart-v,.chart-dot.peak .chart-v{color:var(--ink)}
.chart-labels{display:flex;gap:18px;padding:0 var(--space-xs)}
.chart-labels .chart-l{flex:1;min-width:0;text-align:center;font-size:26px;line-height:1.2;color:var(--body);overflow-wrap:anywhere}
.chart-labels .chart-l.peak{color:var(--ink);font-weight:700}
.chart-line .chart-plot{display:block}
.race-plot{position:relative;flex:1 1 auto;min-height:320px}
.race-row{position:absolute;left:0;right:0;display:flex;align-items:center;gap:var(--space-m)}
.race-l{flex:0 0 22%;text-align:right;font-size:28px;color:var(--ink);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.race-track{position:relative;flex:1;height:78%;display:flex;align-items:center}
.race-bar{height:100%;border-radius:var(--radius-sm);background:color-mix(in srgb,var(--acc) 55%,var(--line));transform-origin:0 50%}
.race-row:first-of-type .race-bar{background:var(--acc)}
.race-v{margin-left:var(--space-s);font:var(--display-weight) 28px/1 var(--display,var(--sans));color:var(--ink);white-space:nowrap}
.race-period{position:absolute;right:0;bottom:0;font:var(--display-weight) 120px/1 var(--display,var(--sans));color:var(--line);letter-spacing:var(--display-tracking)}
.ctr-spark{display:block;width:100%;height:48px;margin-top:var(--space-s);overflow:visible}
.ctr-spark polyline{fill:none;stroke:var(--acc);stroke-width:var(--chart-line-width);stroke-linejoin:round;stroke-linecap:round;vector-effect:non-scaling-stroke}
.ctr-spark circle{fill:var(--acc)}
.chain{position:relative}
.beam{position:absolute;left:0;top:0;width:var(--space-l);height:var(--space-l);margin:calc(var(--space-l) / -2) 0 0 calc(var(--space-l) / -2);border-radius:50%;pointer-events:none;
  background:radial-gradient(circle,var(--acc) 0,color-mix(in srgb,var(--acc) 40%,transparent) 35%,transparent 70%);filter:blur(1px)}
.chart-line svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.chart-path{fill:none;stroke:var(--acc);stroke-width:var(--chart-line-width);stroke-linejoin:round;stroke-linecap:round}
.chart-dot{position:absolute;width:22px;height:22px;margin:0 0 -11px -11px;border-radius:50%;background:var(--bg);border:var(--chart-dot-ring) solid var(--acc)}
.chart-dot.peak{border-color:var(--acc);background:var(--acc)}
.chart-pv{transform:translate(-50%,-22px)}
.chart-pv.peak{color:var(--ink)}

/* «Было/стало»: рамка по пропорции снимков, разделитель с ручкой, подписи сторон. */
.ba{align-self:stretch;flex:1 1 0;min-height:0;display:flex;align-items:center;justify-content:center}
.ba-frame{position:relative;height:100%;max-width:100%;border-radius:var(--radius-lg);overflow:hidden;
  box-shadow:var(--shadow-3);border:var(--hairline) solid var(--line)}
.ba-frame img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.ba-line{position:absolute;top:0;bottom:0;width:var(--ba-line-width);margin-left:calc(var(--ba-line-width) / -2);background:var(--ba-line);box-shadow:var(--ba-line-shadow)}
.ba-knob{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:54px;height:54px;border-radius:50%;
  background:var(--ba-knob-bg);color:var(--ba-knob-ink);display:flex;align-items:center;justify-content:center;font:700 20px/1 var(--sans)}
.ba-l{position:absolute;top:16px;padding:var(--space-xs) var(--space-s);border-radius:var(--radius-pill);background:var(--ba-label-bg);color:var(--ba-label-ink);
  font:700 22px/1.2 var(--sans)}
.ba-l1{left:16px}.ba-l2{right:16px}

/* Экран в перспективе: холст во всё оставшееся поле; без WebGL — плоский снимок. */
.pv{align-self:stretch;flex:1 1 0;min-height:0;position:relative}
.pv-cv{position:absolute;inset:0;width:100%;height:100%}
.pv-src{position:absolute;left:50%;top:6%;height:70%;transform:translateX(-50%);border-radius:var(--radius-sm);
  box-shadow:var(--shadow-3);visibility:hidden}
.pv-body{font-size:30px;color:var(--body);margin:0 0 12px;max-width:900px}

/* Параллакс: снимок в глубине приглушён, панели висят над ним со своими тенями. */
.px{align-self:stretch;flex:1 1 0;min-height:0;display:flex;align-items:center;justify-content:center}
.px-frame{position:relative;height:100%;max-width:100%}
.px-base{position:absolute;inset:0;background-size:cover;border-radius:var(--radius-sm);filter:var(--px-dim)}
.lay{align-self:stretch;flex:1 1 0;min-height:0;display:flex;align-items:center;justify-content:center}
.lay-frame{position:relative;height:88%;max-width:88%;transform-style:preserve-3d}
.lay-base{position:absolute;inset:0;background-size:cover;border-radius:var(--radius-sm);filter:var(--px-dim)}
.lay-panel{position:absolute;border-radius:var(--radius-sm);background-repeat:no-repeat;outline:var(--hairline) solid var(--px-edge)}
.bento{display:grid;flex:1 1 0;min-height:0;gap:var(--space-m);grid-template-columns:repeat(4,1fr);grid-auto-rows:1fr;grid-auto-flow:dense;margin-top:var(--space-l)}
.bento-cell{position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;padding:var(--space-xl);
  border-radius:var(--radius-xl);background:var(--card);border:var(--hairline) solid var(--line);box-shadow:var(--shadow-3)}
.bento-cell.big{grid-column:span 2;grid-row:span 2}
.bento-cell.wide{grid-column:span 2}
.bento-cell h3{font-size:34px;line-height:1.15;color:var(--ink);font-weight:700;letter-spacing:-.01em}
.bento-cell.big h3{font-size:52px}
.bento-cell p{font-size:28px;line-height:1.35;color:var(--body);margin-top:var(--space-s)}
.px-panel{position:absolute;border-radius:var(--radius-sm);background-repeat:no-repeat;outline:var(--hairline) solid var(--px-edge)}

/* Код: окно редактора — его палитру даёт тема (у тёмных тем тёмная, у светлых светлая). */
.code-win{align-self:stretch;min-width:0;max-width:100%;flex-shrink:0;overflow:hidden;border-radius:var(--radius-lg);background:var(--code-bg);
  border:var(--hairline) solid var(--code-line);box-shadow:var(--shadow-3);transform-origin:50% 0}
.code-bar{height:46px;display:flex;align-items:center;gap:9px;padding:0 var(--space-m);background:var(--code-bar);
  border-bottom:var(--hairline) solid var(--code-line)}
.code-bar i{width:13px;height:13px;border-radius:50%;background:var(--sc-traffic-1)}
.code-bar i:nth-child(2){background:var(--sc-traffic-2)}.code-bar i:nth-child(3){background:var(--sc-traffic-3)}
.code-bar span{margin-left:14px;font:500 20px/1 var(--mono);color:var(--code-name)}
.code{font:400 24px/1.55 var(--mono);color:var(--code-ink);padding:var(--space-m) 0 var(--space-l);white-space:pre;overflow:hidden}
.code i{font-style:normal}
.code i.cur{box-shadow:var(--code-caret)}
.ln{display:block;padding-right:var(--space-xl)}
.ln .no{display:inline-block;width:60px;margin-right:26px;text-align:right;color:var(--code-gutter)}
.code.done .ln.hl{background:linear-gradient(90deg,color-mix(in srgb,var(--acc) 26%,transparent),transparent);
  box-shadow:var(--code-hl-shadow)}
.code.done.has-hl .ln:not(.hl) .src{opacity:.5}
.tk-kw{color:var(--code-kw)}.tk-str{color:var(--code-str)}.tk-num{color:var(--code-num)}.tk-fn{color:var(--code-fn)}
.tk-type{color:var(--code-type)}.tk-com{color:var(--code-com)}.tk-pun{color:var(--code-pun)}

.k-photo .k-in{justify-content:flex-end;padding-bottom:calc(var(--pad-b) + var(--space-xl))}
.photo-shade{position:absolute;inset:0;background:linear-gradient(0deg,
  color-mix(in srgb,var(--bg) 94%,transparent) 0%,color-mix(in srgb,var(--bg) 60%,transparent) 36%,transparent 68%)}
.photo-cap{max-width:1000px}
.photo-cap h1{font-size:64px;margin-bottom:12px}
.photo-body{font-size:30px;line-height:1.38;color:var(--body)}

.k-shot .k-in{padding:0}
.shot-dev{position:absolute;inset:0;transform-origin:50% 60%}
.shot-float{position:absolute;inset:0;transform-origin:70% 50%}
.shot-copy{position:absolute;left:var(--pad-l);top:0;bottom:0;width:35%;display:flex;flex-direction:column;justify-content:center;z-index:2}
.shot-copy h1{font-size:54px;margin-bottom:18px}
.shot-body{font-size:30px;line-height:1.4;color:var(--body)}
.shot-img{display:block;width:100%;height:auto}

.k-outro .k-in{align-items:center;text-align:center}
.outro-copy{position:relative;max-width:1060px;display:flex;flex-direction:column;align-items:center}
.outro-title{font-size:86px;line-height:1.04;letter-spacing:max(-.025em,calc(-.02em + var(--display-tracking,0em)));margin:14px 0 22px;text-wrap:balance}
.outro-body{font-size:32px;line-height:1.36;color:var(--body);max-width:880px;text-wrap:balance}
.outro-cta{margin-top:40px}
.outro-cta span{position:relative;overflow:hidden;display:inline-block;padding:var(--space-m) var(--space-3xl);border-radius:var(--radius-pill);
  font:650 30px/1 var(--sans);color:var(--sc-badge-ink);background-color:var(--acc);box-shadow:var(--cta-glow)}
.outro-cta span::after{content:"";position:absolute;top:0;bottom:0;width:45%;left:var(--sheen,-60%);
  background:linear-gradient(100deg,transparent,var(--cta-sheen),transparent)}
.outro-url{margin-top:26px;font:600 28px/1 var(--mono);color:var(--acc2);letter-spacing:.02em}
.k-outro.over .k-in{justify-content:flex-end;align-items:flex-start;text-align:left}
.k-outro.over .outro-copy{align-items:flex-start;max-width:900px;flex:none}
.k-outro.over .outro-title{font-size:60px;margin:6px 0 14px}
.k-outro.over .outro-cta{margin-top:24px}
.outro-shade{position:absolute;inset:0;background:linear-gradient(0deg,
  color-mix(in srgb,var(--bg) 94%,transparent) 0%,color-mix(in srgb,var(--bg) 78%,transparent) 32%,transparent 62%)}
.outro-orbit{position:absolute;left:50%;top:50%;width:980px;height:980px;margin:-490px 0 0 -490px;pointer-events:none}
.outro-orbit span{position:absolute;inset:0;border-radius:50%;border:var(--hairline) solid color-mix(in srgb,var(--acc) 26%,transparent)}
.outro-orbit span:nth-child(2){inset:150px;border-color:color-mix(in srgb,var(--acc2) 32%,transparent)}

/* Правила высокого кадра стоят последними: при равной точности селектора
   побеждает то, что ниже, и иначе базовые правила видов перебивали бы их. */
/* — высокий кадр: вёрстка в столбец —
   Сетка вертикального ролика узкая (720), и всё, что в горизонтали стоит в
   ряд, здесь встаёт друг под другом: колонки сравнения, узлы цепочки,
   величины, карточки возможностей, вехи таймлайна. */
/* Трейлерная карта и титул. Кегль подбирает скрипт страницы (fitCards) под ширину кадра; движение —
   удар, вспышка, дрожь, блик, искры — тоже он, по времени сцены. Цвета — только токены темы. */
.k-card,.k-tcard{align-items:center;justify-content:center;background:var(--bg)}
.card-smoke{position:absolute;inset:-10%;pointer-events:none;
  background:radial-gradient(ellipse 60% 40% at 50% 55%,color-mix(in srgb,var(--acc) 18%,transparent),transparent 70%),
  radial-gradient(ellipse 40% 30% at 30% 40%,color-mix(in srgb,var(--glow) 60%,transparent),transparent 70%),
  radial-gradient(ellipse 45% 30% at 72% 62%,color-mix(in srgb,var(--acc2) 14%,transparent),transparent 70%)}
.card-stage{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;text-align:center;will-change:transform}
.card-word{margin:0;font-family:var(--display);font-weight:var(--display-weight);text-transform:uppercase;
  letter-spacing:.04em;line-height:1;white-space:nowrap;font-size:120px;
  background:linear-gradient(100deg,transparent 40%,var(--pv-glint) 50%,transparent 60%),
  linear-gradient(180deg,var(--ink) 0%,color-mix(in srgb,var(--ink) 78%,var(--mut)) 34%,var(--mut) 50%,var(--ink) 64%,color-mix(in srgb,var(--mut) 55%,var(--ink)) 100%);
  background-size:220% 100%,100% 100%;background-repeat:no-repeat;background-position:160% 0,0 0;
  -webkit-background-clip:text;background-clip:text;color:transparent}
.card-kicker,.tc-kicker{margin:0 0 var(--space-m);font-family:var(--sans);font-size:30px;font-weight:600;
  letter-spacing:.5em;text-transform:uppercase;color:var(--acc);margin-left:.5em}
/* Строки при титуле держатся в 90 % ширины кадра: сцена к концу наезжает на 7 %, и строка во всю
   ширину уходила за оба края. */
.card-kicker,.tc-kicker,.tc-date{max-width:calc(var(--sc-grid-w,1280px) * .9)}
.card-flash{position:absolute;inset:0;z-index:3;background:var(--tr-flash);opacity:0;pointer-events:none}
.card-embers{position:absolute;inset:0;z-index:2;pointer-events:none}
.card-embers i{position:absolute;width:5px;height:5px;background:var(--sc-spark);opacity:0;
  box-shadow:0 0 var(--space-s) var(--sc-spark);clip-path:circle(50%)}
.tc-name{margin:0;font-family:var(--display);font-weight:var(--display-weight);text-transform:uppercase;
  letter-spacing:.16em;line-height:1.02;font-size:120px;
  background:linear-gradient(100deg,transparent 42%,var(--pv-glint) 50%,transparent 58%),
  linear-gradient(180deg,color-mix(in srgb,var(--acc) 30%,var(--ink)) 0%,var(--acc) 36%,color-mix(in srgb,var(--acc) 55%,var(--bg)) 52%,color-mix(in srgb,var(--acc) 70%,var(--ink)) 66%,color-mix(in srgb,var(--acc2) 60%,var(--acc)) 100%);
  background-size:240% 100%,100% 100%;background-repeat:no-repeat;background-position:170% 0,0 0;
  -webkit-background-clip:text;background-clip:text;color:transparent}
.tc-line{display:block;white-space:nowrap;margin-left:.16em}
.tc-date{margin:var(--space-l) 0 0;font-family:var(--sans);font-size:34px;font-weight:600;letter-spacing:.4em;
  text-transform:uppercase;color:var(--ink);margin-left:.4em}
.tc-flare{position:absolute;left:0;right:0;top:50%;height:3px;margin-top:-1px;z-index:2;pointer-events:none;opacity:0;
  background:linear-gradient(90deg,transparent,var(--pv-glint) 50%,transparent);
  box-shadow:0 0 var(--space-xl) var(--acc)}

/* Место содержимого по высоте (поле align). Классические виды — шапка, содержимое и черта внизу в
   одном столбце: пустое место отдают поля «auto» у первого элемента содержимого и у черты.
   Виды во весь кадр (.k) ставят содержимое своим столбцом .k-in. */
body[data-align="center"]>.head+.el{margin-top:auto}
body[data-align="bottom"]>.head+.el{margin-top:auto}
body[data-align="bottom"]>.rule{margin-top:var(--space-l)}
/* — настоящий 3D: кольцо карточек (трёхмерно на каждом кадре) и глобус на WebGL — */
.ring3{flex:1;min-height:0;position:relative;perspective:1400px;display:flex;align-items:center;justify-content:center}
.ring3-rot{position:relative;width:420px;height:300px;transform-style:preserve-3d}
.ring3-card{position:absolute;inset:0;padding:var(--space-xl);border-radius:var(--radius-xl);background:var(--card);border:var(--hairline) solid var(--line);
  backface-visibility:hidden;box-shadow:var(--shadow-3)}
.ring3-card h3{font-size:34px;line-height:1.15;color:var(--ink);font-weight:700;margin-bottom:8px}
.ring3-card p{font-size:26px;line-height:1.35;color:var(--body)}
.globe{flex:1;min-height:0;position:relative}
.globe-cv{position:absolute;inset:0;width:100%;height:100%}
.globe-l{position:absolute;left:0;top:0;padding:var(--space-xs) var(--space-s);border-radius:var(--radius-pill);background:var(--card);border:var(--hairline) solid var(--line);
  font:600 24px/1 var(--sans);color:var(--ink);white-space:nowrap;opacity:0}
/* — смена слова в строке — */
.rot{display:inline-grid;vertical-align:bottom;color:var(--acc)}
.rot-w{grid-area:1/1;white-space:nowrap}
/* Пометки слова в заголовке: маркер ложится полосой снизу вверх по слову слева направо, обводка
   прорисовывается пером, зачёркивание протягивается линией. Ход пометки — --mk от 0 до 1. */
.mk{position:relative;white-space:nowrap}
.mk-hl{background-image:linear-gradient(color-mix(in srgb,var(--acc) 42%,transparent),color-mix(in srgb,var(--acc) 42%,transparent));
  background-repeat:no-repeat;background-position:0 92%;background-size:calc(var(--mk,0) * 100%) 44%}
.mk-st::after{content:"";position:absolute;left:-.05em;right:-.05em;top:52%;height:.09em;background:var(--acc2);
  border-radius:var(--radius-pill);transform:scaleX(var(--mk,0));transform-origin:0 50%}
.mk-ci svg{position:absolute;left:-14%;top:-34%;width:128%;height:168%;overflow:visible;pointer-events:none}
.mk-ci path{fill:none;stroke:var(--acc2);stroke-width:var(--rule-size);stroke-linecap:round;
  stroke-dasharray:1;stroke-dashoffset:calc(1 - var(--mk,0))}
/* — живые виды: лента, стопка, орбита, чат — */
.chip{display:inline-flex;align-items:center;gap:14px;flex:none;padding:var(--space-m) var(--space-xl);border-radius:var(--radius-pill);
  background:var(--card);border:var(--hairline) solid var(--line);font:600 32px/1 var(--sans);color:var(--ink);white-space:nowrap}
.chip-ic{font-size:38px;line-height:1}
.mq{display:flex;flex-direction:column;gap:26px;margin:0 calc(var(--pad-l) * -1) 0 calc(var(--pad-l) * -1);
  -webkit-mask-image:linear-gradient(90deg,transparent,var(--bg) 12%,var(--bg) 88%,transparent);mask-image:linear-gradient(90deg,transparent,var(--bg) 12%,var(--bg) 88%,transparent)}
.mq-row{overflow:hidden}
.mq-track{display:flex;gap:26px;width:max-content;will-change:transform}
.stk{display:grid;align-self:center;width:min(100%,860px);margin-top:12px}
.stk-card{grid-area:1/1;padding:var(--space-2xl);border-radius:var(--radius-xl);background:var(--card);border:var(--hairline) solid var(--line);
  box-shadow:var(--shadow-3);transform-origin:50% 100%}
body[data-glow="border"] :is(.stk-card,.chip){position:relative}
body[data-glow="border"] :is(.feat,.stk-card,.chip,.bento-cell)::after{content:"";position:absolute;inset:0;border-radius:inherit;padding:var(--rule-size);pointer-events:none;
  background:conic-gradient(from var(--glow-a,0deg),transparent 0 62%,var(--acc) 80%,var(--acc2) 90%,transparent 100%);
  -webkit-mask:linear-gradient(var(--ink) 0 0) content-box,linear-gradient(var(--ink) 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
.stk-card h3{font-size:40px;line-height:1.15;color:var(--ink);font-weight:700;margin-bottom:10px;letter-spacing:-.01em}
.stk-card p{font-size:30px;line-height:1.38;color:var(--body)}
.k-orb .k-in{align-items:center}
.orb{position:relative;height:100%;max-height:100%;aspect-ratio:1;max-width:100%}
.orb-ring{position:absolute;left:50%;top:50%;border-radius:50%;border:var(--hairline) dashed var(--line);transform:translate(-50%,-50%)}
.orb-r1{width:60%;height:60%}.orb-r2{width:92%;height:92%}.orb-ring.off{display:none}
.orb-core{position:absolute;left:50%;top:50%;width:42%;transform:translate(-50%,-50%);text-align:center}
.orb-title{font-size:48px;line-height:1.08;margin:0}
.orb-pos{position:absolute;left:50%;top:50%;width:0;height:0;display:flex;align-items:center;justify-content:center}
.orb-pos>.el{flex:none}
.orb .chip{padding:var(--space-s) var(--space-l);font-size:26px}.orb .chip-ic{font-size:32px}
.chat{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;max-width:1100px;width:100%;align-self:center}
.chat-feed{display:flex;flex-direction:column;gap:18px}
.msg{display:flex;align-items:flex-end;justify-content:flex-start}
.msg.me{justify-content:flex-end}
.bubble{max-width:78%;padding:var(--space-m) var(--space-l);border-radius:var(--radius-xl) var(--radius-xl) var(--radius-xl) var(--radius-sm);background:var(--card);border:var(--hairline) solid var(--line);
  font-size:30px;line-height:1.38;color:var(--body);transform-origin:0 100%}
.msg.me .bubble{border-radius:var(--radius-xl) var(--radius-xl) var(--radius-sm) var(--radius-xl);background:var(--acc);border-color:var(--acc);color:var(--sc-badge-ink);transform-origin:100% 100%}
.msg-who{display:block;font:700 20px/1.2 var(--sans);letter-spacing:.04em;text-transform:uppercase;color:var(--mut);margin-bottom:6px}
/* «ИИ думает»: блик бежит по строке (градиент под текстом), по полосам скелетона — тот же блик. */
.msg-think{display:none;flex-direction:column;gap:12px;width:380px;padding:var(--space-m) var(--space-l);border-radius:var(--radius-xl) var(--radius-xl) var(--radius-xl) var(--radius-sm);background:var(--card);border:var(--hairline) solid var(--line)}
.msg-think em{font:600 22px/1.3 var(--sans);font-style:normal;color:transparent;-webkit-background-clip:text;background-clip:text;
  background-image:linear-gradient(90deg,var(--mut) 35%,var(--ink) 50%,var(--mut) 65%);background-size:300% 100%}
.msg-think i{display:block;height:14px;border-radius:var(--radius-pill);background-size:300% 100%;
  background-image:linear-gradient(90deg,color-mix(in srgb,var(--mut) 22%,transparent) 35%,color-mix(in srgb,var(--mut) 55%,transparent) 50%,color-mix(in srgb,var(--mut) 22%,transparent) 65%)}
.msg-think i:last-child{width:62%}
body[data-align="fill"]>.el:not(.head){margin-top:auto}
body[data-align="top"] .k-in{justify-content:flex-start}
body[data-align="center"] .k-in{justify-content:safe center}
body[data-align="bottom"] .k-in{justify-content:flex-end}
body[data-align="fill"] .k-in{justify-content:space-evenly}

@media (max-aspect-ratio:4/5){
  /* В высоком кадре содержимое по умолчанию стоит посередине между шапкой и чертой: сверху
     оно оставляло пустой треть кадра над субтитрами. */
  body:not([data-align])>.head+.el{margin-top:auto}
  .shot-copy{left:var(--pad-l);right:var(--pad-r);width:auto;bottom:auto;top:var(--pad-t);justify-content:flex-start}
  .shot-float{transform-origin:50% 60%}
  h1{font-size:52px}
  .kicker{font-size:28px}
  .cols{grid-template-columns:1fr;gap:22px}
  .col{min-height:0}
  .chain{flex-direction:column}
  .chain>.el{flex:0 0 auto}
  .chain[data-n="4"]>.el{flex:0 0 auto}
  .pairwrap{flex-direction:column;align-items:stretch;gap:6px}
  .pairwrap .arrow{align-self:center;transform:rotate(90deg) scaleX(var(--p,1))}
  .node{min-height:96px}
  .pair{flex-direction:column;align-items:flex-start;gap:34px}
  .huge,.pair .huge{font-size:136px}
  .hero-title{font-size:92px}
  .hero-body{font-size:36px}
  /* Содержимое выше зоны уходит вниз, а не за её верх: «safe» не даёт
     центрированию вытолкнуть заголовок под надпись площадки. */
  .k-in{justify-content:safe center}
  .steps[data-layout="two"]{display:flex;flex-direction:column}
  .steps[data-layout="two"] .steps-rail{display:block}
  .feats,.feats[data-n]{grid-template-columns:1fr 1fr;gap:16px}
  .feats[data-n="1"]{grid-template-columns:1fr}
  .feat{padding:var(--space-l)}
  .ctrs{flex-direction:column;gap:22px}
  .ctrs .ctr-v,.ctrs[data-n] .ctr-v{font-size:112px}
  .ctr{min-width:0}
  /* Таймлайн встаёт вертикально: линия слева, вехи под ней одна за другой. */
  .tl-rail{left:9px;right:auto;top:10px;bottom:10px;width:4px;height:auto}
  .tl-fill{left:0;right:0;top:0;bottom:auto;width:auto;height:0}
  .tl-head{top:0}
  .tl-items{flex-direction:column;gap:30px}
  .tl-item{display:grid;grid-template-columns:22px 1fr;column-gap:26px;padding-right:0;position:relative}
  .tl-dot{grid-row:1 / span 2;margin:10px 0 0}
  .tl-when{height:auto;grid-column:2}
  .tl-item p{grid-column:2}
  .chapter-copy{width:auto;right:var(--pad-r);top:calc(var(--pad-t) + 40px)}
  .chapter-title{font-size:84px;min-height:0;margin:34px 0 24px}
  .chapter-body{font-size:40px;line-height:1.35}
  .chapter-kicker{font-size:30px}
  .chapter-orbit{width:560px;height:560px;right:-220px;top:auto;bottom:calc(var(--pad-b) + 40px)}
  /* Финальная карточка вертикали — призыв на весь кадр: заголовок размером
     с зацепку (90–120 точек кадра по базе знаний), кнопка крупнее. */
  .outro-title{font-size:96px;margin:24px 0 36px}
  .outro-body{font-size:42px}
  /* Заголовок — вверху зоны, призыв — внизу, но не ниже строгой зоны площадок
     (y ≤ 1248 кадра 1080×1920, то есть на 125 точек сетки выше рабочей). */
  .k-outro .k-in{justify-content:stretch}
  /* Нижний запас — строгая зона площадок (125 точек сетки над рабочей), а не отступ темы. */
  .outro-copy{--strict-zone:125px;flex:1;justify-content:flex-start;padding:var(--space-2xl) 0 var(--strict-zone)}
  .outro-cta{margin-top:auto}
  .outro-cta span{font-size:36px;padding:var(--space-xl) var(--space-3xl);white-space:nowrap}
  .outro-url{margin-top:40px;font-size:24px;white-space:nowrap}
  .photo-cap h1{font-size:60px}
  /* Код в узком кадре переносится по пробелам, продолжение строки — с отступом номера. */
  .code{white-space:pre-wrap;overflow-wrap:anywhere}
  /* Висячий отступ продолжения строки — ширина номера с его полем (60 + 26), а не отступ темы. */
  .ln{--hang:86px;padding-left:var(--hang);text-indent:calc(var(--hang) * -1)}
}
`;

/**
 * Появление элементов — чистая функция времени сцены. Скрипт уходит
 * в страницу текстом: он исполняется в браузере, а не в узле, и ничего
 * из инструмента не импортирует.
 */
/** Живые фоны слайдов: имена, которые принимают поле `background` и переменная темы `--bg-motion`. */
export const BACKGROUNDS = ["grid", "aurora", "mesh", "waves", "particles", "bokeh", "rays", "lamp", "meteors", "flicker", "beams", "warp",
  "vortex", "spotlight", "none"];

export const RUNTIME = `
(() => {
// Токены темы, которые читает скрипт страницы: числа (доли, толщины) и строки.
const token = (k) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(k));
const clamp = (v) => Math.max(0, Math.min(1, v));
const inOut = (p) => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
const out3 = (p) => 1 - Math.pow(1 - p, 3);
const out4 = (p) => 1 - Math.pow(1 - p, 4);
// Выход с перелётом: элемент чуть проскакивает свой размер и садится.
const back = (p) => 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);

// Поворот к зрителю из глубины, нарисованный на плоскости: сжатие по ширине
// и лёгкий перекос. Настоящий поворот в 3D здесь запрещён: Chromium выносит
// элемент с трёхмерной трансформацией на свой слой и после входа растрирует
// его иначе, чем элемент, который трёхмерным не был. Кадр, снятый первым
// в свежем процессе, переставал совпадать с тем же кадром сквозного прогона
// (замер: 37 дБ против порога 60). Правило: элемент либо трёхмерен на каждом
// кадре, либо ни на одном.
const turn = (e, side) => {
  const a = (1 - e) * 0.5;
  return ['translateX(' + ((1 - e) * 120 * side).toFixed(2) + 'px) scaleX(' + Math.cos(a).toFixed(4) + ') skewY(' + (Math.sin(a) * 7 * -side).toFixed(3) + 'deg)', (1 - e) * 7];
};

// Входы элементов. Прозрачность у всех проступает одинаково — по времени от
// момента элемента, а не по длине движения: иначе элемент с коротким входом
// становился видимым раньше предыдущего, и порядок чтения нарушался.
// Различается движение: откуда элемент приходит и как садится на место.
const ENTER = {
  rise: { d: 0.45, ease: inOut, move: (e) => ['translateY(' + ((1 - e) * 18).toFixed(2) + 'px)', 0] },
  lift: { d: 0.75, ease: out3, move: (e) => ['translateY(' + ((1 - e) * 38).toFixed(2) + 'px)', (1 - e) * 10] },
  word: { d: 0.8, ease: out4, move: (e) => ['translateY(' + ((1 - e) * 0.55).toFixed(3) + 'em) scaleY(' + Math.cos((1 - e) * 1.25).toFixed(4) + ')', (1 - e) * 9] },
  left: { d: 0.85, ease: out4, move: (e) => turn(e, -1) },
  right: { d: 0.85, ease: out4, move: (e) => turn(e, 1) },
  pop: { d: 0.7, ease: back, move: (e) => ['scale(' + (0.7 + 0.3 * e).toFixed(4) + ')', Math.max(0, 1 - e) * 7] },
  wipe: { d: 0.9, ease: out3, clip: (e) => 'inset(0 ' + ((1 - e) * 100).toFixed(2) + '% 0 0 round var(--radius-lg))',
    move: (e) => ['translateX(' + ((1 - e) * -36).toFixed(2) + 'px)', 0] },
  flip: { d: 0.9, ease: out3, move: (e) => ['translateY(' + ((1 - e) * 44).toFixed(2) + 'px) scaleY(' + Math.cos((1 - e) * 1.35).toFixed(4) + ')', (1 - e) * 5] },
  track: { d: 1.0, ease: out3, move: (e) => ['translateX(' + ((1 - e) * -22).toFixed(2) + 'px)', (1 - e) * 4], spacing: true },
  line: { d: 1.0, ease: out3, still: true, move: () => ['', 0] },
  tilt: { d: 1.2, ease: out4, move: (e) => ['translateY(' + ((1 - e) * 80).toFixed(2) + 'px) scale(' + (0.88 + 0.12 * e).toFixed(4) + ') scaleY(' + Math.cos((1 - e) * 0.5).toFixed(4) + ')', (1 - e) * 9] },
  zoom: { d: 1.3, ease: out3, move: (e) => ['scale(' + (1.16 - 0.16 * e).toFixed(4) + ')', (1 - e) * 14] },
  fade: { d: 0.6, ease: inOut, move: () => ['', 0] },
  // Вкручивается из точки.
  spin: { d: 0.9, ease: out4, move: (e) => ['rotate(' + ((1 - e) * -120).toFixed(2) + 'deg) scale(' + (0.4 + 0.6 * e).toFixed(4) + ')', (1 - e) * 6] },
  // Влетает издалека со своей стороны: направление задано номером элемента, а не случаем.
  fly: { d: 1.0, ease: out4, move: (e, i) => {
    const a = (Math.sin(i * 127.1) * 43758.5453 % 1 + 1) % 1 * Math.PI * 2;
    return ['translate(' + (Math.cos(a) * (1 - e) * 520).toFixed(2) + 'px,' + (Math.sin(a) * (1 - e) * 320).toFixed(2) + 'px) rotate(' + ((1 - e) * (i % 2 ? 24 : -24)).toFixed(2) + 'deg)', (1 - e) * 5];
  } },
  // Падает сверху и отскакивает.
  drop: { d: 0.9, ease: (p) => p < 0.62 ? Math.pow(p / 0.62, 2) : 1 - Math.sin((p - 0.62) / 0.38 * Math.PI) * 0.1 * (1 - p),
    move: (e) => ['translateY(' + ((1 - e) * -260).toFixed(2) + 'px)', 0] },
  // Качается на верхнем углу, как вывеска.
  swing: { d: 1.1, ease: out3, move: (e, i, p) => ['rotate(' + (Math.sin(p * Math.PI * 2.5) * 16 * (1 - p)).toFixed(2) + 'deg) translateY(' + ((1 - e) * 30).toFixed(2) + 'px)', 0], origin: '0 0' },
  // Разворачивается слева направо.
  unfold: { d: 0.8, ease: out3, move: (e) => ['scaleX(' + Math.max(0.001, e).toFixed(4) + ')', 0], origin: '0 50%' },
  // Врезается с перебором масштаба и гаснущей дрожью, как от удара.
  jolt: { d: 0.65, ease: out4, move: (e, i, p) => {
    const k = (1 - p) * (1 - p);
    return ['translate(' + (Math.sin(p * 46 + i) * k * 16).toFixed(2) + 'px,' + (Math.cos(p * 39 + i) * k * 9).toFixed(2) + 'px) scale('
      + (1.35 - 0.35 * e).toFixed(4) + ') rotate(' + (Math.sin(p * 31 + i) * k * 4).toFixed(3) + 'deg)', k * 6];
  } },
  // Настоящие 3D-входы. Перспектива стоит в трансформации на каждом кадре, и после входа тоже:
  // элемент трёхмерен всегда, поэтому растеризация не меняется посреди сцены.
  // Масштаба в них нет: слой с трёхмерной трансформацией, чей масштаб меняется, Chromium растрирует
  // с запасом от прошлых кадров, и кадр, снятый первым, разошёлся бы с тем же кадром подряд.
  flip3d: { d: 1.0, ease: out4, origin: '50% 100%', three: true,
    move: (e) => ['perspective(1400px) rotateX(' + ((1 - e) * -88).toFixed(2) + 'deg)', (1 - e) * 4] },
  tilt3d: { d: 1.1, ease: out4, three: true,
    move: (e) => ['perspective(1600px) rotateY(' + ((1 - e) * -38).toFixed(2) + 'deg) rotateX(' + ((1 - e) * 16).toFixed(2) + 'deg)', (1 - e) * 5] },
  // Падает и отскакивает по физике: после удара остаётся четверть высоты, потом шестнадцатая, потом
  // шестьдесят четвёртая — амплитуда и время отскока падают вместе, как у мяча.
  bounce: { d: 1.2, ease: (p) => p, move: (e, i, p) => ['translateY(' + (-240 * bounceY(p)).toFixed(2) + 'px)', 0] },
  // Веер: пункты группы выходят из стопки в центре, раскрываясь веером вокруг общей точки внизу.
  fan: { d: 1.0, ease: out4, origin: '50% 160%', move: (e, i, p, gi, gn) => {
    const mid = (gn - 1) / 2, k = 1 - e;
    return ['translateX(' + ((mid - gi) * 100 * k).toFixed(2) + '%) rotate(' + ((gi - mid) * 16 * Math.sin(Math.PI * Math.min(1, e * 1.2))).toFixed(3) + 'deg)', k * 3];
  } },
  // Строка выезжает снизу из-под своей маски: край маски — нижний край строки.
  mask: { d: 0.8, ease: out4, still: true, mask: true, move: () => ['', 0] },
};

const bounceY = (p) => {
  let u = p * 1.1;
  if (u < 0.4) return 1 - (u / 0.4) ** 2;
  u -= 0.4;
  for (const [h, len] of [[0.25, 0.4], [0.0625, 0.2], [0.0156, 0.1]]) {
    if (u < len) return h * 4 * (u / len) * (1 - u / len);
    u -= len;
  }
  return 0;
};

// Кривые входов по имени (\`ease\`): кубические Безье из систем движения и затухающие пружины.
const bez = (x1, y1, x2, y2) => (p) => {
  let u = p;
  for (let k = 0; k < 8; k++) {
    const x = 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u * u * x2 + u ** 3 - p;
    const dx = 3 * (1 - u) ** 2 * x1 + 6 * (1 - u) * u * (x2 - x1) + 3 * u * u * (1 - x2);
    if (Math.abs(dx) < 1e-6) break;
    u = clamp(u - x / dx);
  }
  return 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u * u * y2 + u ** 3;
};
const EASES = {
  standard: bez(0.2, 0, 0, 1),
  emphasized: bez(0.05, 0.7, 0.1, 1),
  expressive: bez(0.16, 1, 0.3, 1),
  spring: (p) => (p >= 1 ? 1 : 1 - Math.exp(-6 * p) * Math.cos(10 * p)),
  bouncy: (p) => (p >= 1 ? 1 : 1 - Math.exp(-4.5 * p) * Math.cos(14 * p)),
};
// Длина входа по размеру элемента: крупное движется дольше мелкого, как предмет с массой.
const sized = new WeakMap();
const sizeK = (el) => {
  if (!sized.has(el)) {
    const r = el.getBoundingClientRect();
    sized.set(el, Math.max(0.8, Math.min(1.4, 0.75 + 0.9 * Math.sqrt(r.width * r.height / (innerWidth * innerHeight)))));
  }
  return sized.get(el);
};

// Хореография (\`wave\`, \`stagger\`): моменты пунктов одной группы остаются теми, что назначила речь,
// но раздаются пунктам в другом порядке — из центра, с краёв, вразброс — или с заданным шагом.
let choreoDone = false;
function choreo() {
  if (choreoDone) return;
  choreoDone = true;
  const wave = document.body.dataset.wave, step = Number(document.body.dataset.stagger || 0);
  if (!wave && !step) return;
  const groups = new Map();
  for (const el of document.querySelectorAll('.el:not(.w)')) {
    if (!groups.has(el.parentElement)) groups.set(el.parentElement, []);
    groups.get(el.parentElement).push(el);
  }
  for (const list of groups.values()) {
    if (list.length < 3) continue;
    let times = list.map(start).sort((a, b) => a - b);
    if (step) times = times.map((_, k) => times[0] + k * step);
    const n = list.length, mid = (n - 1) / 2, idx = list.map((_, k) => k);
    const rank = wave === 'center' ? idx.map((k) => Math.abs(k - mid)) : wave === 'edges' ? idx.map((k) => -Math.abs(k - mid))
      : wave === 'random' ? idx.map((k) => ((Math.sin(k * 91.7 + n) * 43758.5453) % 1 + 1) % 1) : idx;
    idx.slice().sort((a, b) => rank[a] - rank[b] || a - b).forEach((k, j) => {
      list[k].dataset.at = String(times[j]);
      list[k].dataset.delay = '0';
    });
  }
}

// Жизнь элемента после входа (\`alive\`): покачивание, парение или дрожь «кипящей линии» —
// двенадцать смен в секунду, как у рисованной анимации. Без поля — еле заметное дыхание.
const hash = (a, b) => ((Math.sin(a * 12.9898 + b * 78.233) * 43758.5453) % 1 + 1) % 1 - 0.5;
function life(t, i, m) {
  const mode = document.body.dataset.alive;
  if (mode === 'pulse') return ' scale(' + (1 + 0.035 * Math.pow(Math.sin(t / 1.2 * Math.PI + i * 0.9), 2) * m).toFixed(4) + ')';
  if (mode === 'wiggle') return ' rotate(' + (Math.sin(t * 2.1 + i * 1.3) * 1.8 * m).toFixed(3) + 'deg) translateY(' + (Math.sin(t * 1.4 + i) * 3 * m).toFixed(2) + 'px)';
  if (mode === 'float') return ' translateY(' + (Math.sin(t * 0.9 + i * 0.8) * 9 * m).toFixed(2) + 'px) rotate(' + (Math.sin(t * 0.6 + i * 1.9) * 0.6 * m).toFixed(3) + 'deg)';
  if (mode === 'jitter') {
    const f = Math.floor(t * 12) + i * 17;
    return ' translate(' + (hash(f, 1) * 3 * m).toFixed(2) + 'px,' + (hash(f, 2) * 3 * m).toFixed(2) + 'px) rotate(' + (hash(f, 3) * 1.2 * m).toFixed(3) + 'deg)';
  }
  const float = Math.sin(t * 0.8 + i * 0.7) * 1.5 * m;
  return float ? ' translateY(' + float.toFixed(2) + 'px)' : '';
}
const OPACITY_IN = 0.4;
// Карточки, чьи части входят с запаздыванием.
const FOLLOW = ['feat', 'bento-cell', 'step', 'ctr', 'tl-item'];
const spacing = new WeakMap();
let els = null, counts = null, codes = null, kb = null, ambMode = null, ambInit = false;
const dur = () => (window.__stage && window.__stage.scene && window.__stage.scene.duration) || 10;
const start = (el) => Number(el.dataset.at || 0) + Number(el.dataset.delay || 0);

// Темп сцены (\`pace\`): входы спокойнее или резче — длина каждого входа умножается на число темпа.
const PACE = { calm: 1.4, brisk: 0.7, snap: 0.45 };

// Размытие движения на быстрых входах: смаз вдоль скорости элемента, как у кадра с выдержкой в половину
// кадра при 25 кадрах в секунду. Скорость — разница сдвигов входа в моменты t и t − 1/60 с, сдвиг
// читается из трансформации в точках; смаз рисует направленное гауссово размытие SVG — свой фильтр
// у каждого элемента.
const SHUTTER = 1 / 50, DT = 1 / 60;
const shiftOf = (tf) => {
  let x = 0, y = 0;
  for (const m of tf.matchAll(/translate(X|Y)?\\(([-\\d.]+)px(?:,\\s*([-\\d.]+)px)?\\)/g)) {
    if (m[1] === 'X') x += Number(m[2]); else if (m[1] === 'Y') y += Number(m[2]); else { x += Number(m[2]); y += Number(m[3] || 0); }
  }
  return [x, y];
};
let mbDefs = null;
const mbFilter = (i) => {
  if (!mbDefs) {
    mbDefs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    mbDefs.setAttribute('width', '0'); mbDefs.setAttribute('height', '0');
    mbDefs.style.position = 'absolute';
    document.body.appendChild(mbDefs);
  }
  let f = mbDefs.querySelector('#sc-mb-' + i);
  if (!f) {
    f = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    f.id = 'sc-mb-' + i;
    for (const [k, v] of [['x', '-30%'], ['y', '-30%'], ['width', '160%'], ['height', '160%']]) f.setAttribute(k, v);
    f.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur'));
    mbDefs.appendChild(f);
  }
  return f.firstChild;
};

function enter(t) {
  els = els || [...document.querySelectorAll('.el')];
  choreo();
  const named = EASES[document.body.dataset.ease];
  const pace = PACE[document.body.dataset.pace] || 1;
  els.forEach((el, i) => {
    const cfg = ENTER[el.dataset.enter] || ENTER.rise;
    const t0 = start(el);
    const d = (named ? cfg.d * sizeK(el) : cfg.d) * pace;
    const p = clamp((t - t0) / d);
    const e = (named || cfg.ease)(p);
    const o = cfg.still ? 1 : inOut(clamp((t - t0) / OPACITY_IN));
    el.style.opacity = o.toFixed(3);
    const group = el.parentElement ? [...el.parentElement.children].filter((c) => c.classList.contains('el')) : [el];
    const [tf, blur] = cfg.move(e, i, p, Math.max(0, group.indexOf(el)), group.length);
    let smear = '';
    if (!cfg.three && p > 0 && p < 1) {
      const pp = clamp((t - DT - t0) / d), [tp] = cfg.move((named || cfg.ease)(pp), i, pp, Math.max(0, group.indexOf(el)), group.length);
      const [x1, y1] = shiftOf(tf), [x0, y0] = shiftOf(tp);
      const sx = Math.abs(x1 - x0) / DT * SHUTTER / 2, sy = Math.abs(y1 - y0) / DT * SHUTTER / 2;
      if (Math.max(sx, sy) > 0.6) {
        mbFilter(i).setAttribute('stdDeviation', Math.min(40, sx).toFixed(2) + ' ' + Math.min(40, sy).toFixed(2));
        smear = 'url(#sc-mb-' + i + ')';
      }
    }
    // Запаздывание частей (follow-through): значок, заголовок и текст карточки догоняют её на кадр-два
    // друг за другом. У трёхмерных входов и маски части не двигаются: слой не перерисовывается на лету.
    if (!cfg.three && !cfg.mask && FOLLOW.some((c) => el.classList.contains(c))) {
      [...el.children].forEach((part, k) => {
        if (!k) return;
        const q = clamp((t - t0 - k * 0.06) / (cfg.d * 0.8));
        part.style.transform = q >= 1 ? '' : 'translateY(' + ((1 - out3(q)) * 16).toFixed(2) + 'px)';
      });
    }
    if (cfg.origin) el.style.transformOrigin = cfg.origin;
    // Появившийся элемент живёт: по умолчанию еле заметно дышит — полторы точки не читаются как
    // движение, но не дают кадру застыть; поле \`alive\` даёт ему заметную жизнь. Фаза — по номеру.
    const alive = cfg.still ? '' : life(t, i, Math.min(1, e));
    el.style.transform = (tf + alive).trim() || 'none';
    if (cfg.mask) {
      const inner = el.firstElementChild;
      el.style.clipPath = p >= 1 ? 'none' : 'inset(-0.2em -4% 0 -4%)';
      if (inner) inner.style.transform = p >= 1 ? 'none' : 'translateY(' + ((1 - e) * 115).toFixed(2) + '%)';
    }
    el.style.filter = [blur > 0.05 ? 'blur(' + blur.toFixed(2) + 'px)' : '', smear].filter(Boolean).join(' ') || 'none';
    if (cfg.clip) el.style.clipPath = p >= 1 ? 'none' : cfg.clip(e);
    if (cfg.spacing) {
      if (!spacing.has(el)) {
        const inner = el.firstElementChild || el;
        spacing.set(el, { node: inner, base: parseFloat(getComputedStyle(inner).letterSpacing) / parseFloat(getComputedStyle(inner).fontSize) || 0 });
      }
      const sp = spacing.get(el);
      sp.node.style.letterSpacing = (sp.base + (1 - e) * 0.5).toFixed(4) + 'em';
    }
    // Внутри трёхмерного входа содержимое не меняется: перерисованная на повороте часть слоя
    // осталась бы растрированной с масштабом поворота, и кадр подряд разошёлся бы с кадром с нуля.
    el.style.setProperty('--p', cfg.three ? '1' : Math.min(1, e).toFixed(4));
  });
}

// Счётчик: значение докручивается от нуля, как механический счётчик. Разряд
// поворачивается, только когда младший проходит девятку, — поэтому на
// последнем кадре все ленты стоят ровно на цифрах, а не между ними.
function count(t) {
  counts = counts || [...document.querySelectorAll('.count')];
  for (const c of counts) {
    const to = Number(c.dataset.to);
    const p = clamp((t - start(c)) / 1.7);
    const v = to * out3(p);
    // Разряды дроби и первый целый видны всегда: «0,5» не начинается с пустоты.
    const dec = Number(c.dataset.dec || 0);
    for (const d of c.querySelectorAll('.dg')) {
      const k = Number(d.dataset.k), unit = Math.pow(10, k);
      let off;
      if (k === 0) off = v % 10;
      else off = Math.floor(v / unit) % 10 + Math.max(0, (v % unit) - (unit - 1));
      d.firstElementChild.style.transform = 'translateY(' + (-off * 1.2).toFixed(4) + 'em)';
      d.style.opacity = k <= dec ? '1' : clamp(v - (unit - 1)).toFixed(3);
    }
    for (const s of c.querySelectorAll('.dg-sep')) {
      const k = Number(s.dataset.k);
      s.style.opacity = k < 0 || k <= dec ? '1' : clamp(v - (Math.pow(10, k) - 1)).toFixed(3);
    }
    const ring = c.closest('.ctr') && c.closest('.ctr').querySelector('.ring-fg');
    if (ring) ring.style.strokeDashoffset = (Number(ring.dataset.c) * (1 - Number(ring.dataset.share) * out3(p))).toFixed(3);
  }
}

// Код набирается по знаку; знаки стоят на своих местах с самого начала,
// скрытые, поэтому строка не перекладывается, пока её набирают.
function type(t) {
  codes = codes || [...document.querySelectorAll('pre.code')].map((pre) => ({ pre, chars: [...pre.querySelectorAll('.src i')],
    lines: [...pre.querySelectorAll('.ln')] }));
  for (const { pre, chars, lines } of codes) {
    // Скорость «auto»: набор укладывается в первые две трети сцены, сколько бы
    // знаков ни было, — не быстрее девяноста и не медленнее восемнадцати в секунду.
    const cps = pre.dataset.cps === 'auto'
      ? Math.max(18, Math.min(90, chars.length / Math.max(0.8, dur() * 0.68 - start(pre))))
      : Number(pre.dataset.cps) || 42;
    const n = Math.max(0, Math.floor((t - start(pre)) * cps));
    chars.forEach((ch, i) => {
      ch.style.visibility = i < n ? '' : 'hidden';
      ch.classList.toggle('cur', n < chars.length && i === n - 1);
    });
    pre.classList.toggle('done', n >= chars.length + cps * 0.4);
    pre.classList.toggle('has-hl', lines.some((l) => l.classList.contains('hl')));
  }
}

// Шаги и таймлайн: текущий пункт подсвечен, полоса хода доходит до него.
function progressLines(t) {
  for (const list of document.querySelectorAll('.steps')) {
    const steps = [...list.querySelectorAll('.step')];
    let active = -1;
    steps.forEach((s, i) => { if (t >= start(s)) active = i; });
    steps.forEach((s, i) => { s.classList.toggle('on', i === active); s.classList.toggle('done', i < active); });
    const rail = list.querySelector('.steps-rail'), fill = list.querySelector('.steps-fill');
    if (!rail || !fill) continue;
    // Полоса появляется вместе с первым шагом, а не висит пустой до него.
    rail.style.opacity = steps[0] ? steps[0].style.opacity : '1';
    const centre = (i) => i < 0 ? 0 : steps[i].offsetTop + steps[i].offsetHeight / 2 - rail.offsetTop;
    const e = active < 0 ? 0 : out3(clamp((t - start(steps[active])) / 0.8));
    const y = centre(active - 1) + (centre(active) - centre(active - 1)) * e;
    fill.style.height = Math.max(0, y).toFixed(1) + 'px';
  }
  for (const tl of document.querySelectorAll('.tl')) {
    const items = [...tl.querySelectorAll('.tl-item')];
    let active = -1;
    items.forEach((s, i) => { if (t >= start(s)) active = i; });
    const fill = tl.querySelector('.tl-fill');
    // В высоком кадре линия идёт сверху вниз, и полоса хода растёт в высоту.
    const down = getComputedStyle(tl.querySelector('.tl-items')).flexDirection === 'column';
    const centre = (i) => i < 0 ? 0 : down
      ? items[i].offsetTop + items[i].querySelector('.tl-dot').offsetTop + 11
      : items[i].offsetLeft + items[i].querySelector('.tl-dot').offsetLeft + 11;
    const e = active < 0 ? 0 : out3(clamp((t - start(items[active])) / 0.8));
    const reach = Math.max(0, centre(active - 1) + (centre(active) - centre(active - 1)) * e).toFixed(1) + 'px';
    if (fill) { if (down) fill.style.height = reach; else fill.style.width = reach; }
    // Голова хода стоит на конце полосы и пульсирует, пока линия идёт к следующей вехе.
    const head = tl.querySelector('.tl-head');
    if (head) {
      const at = parseFloat(reach), rail = tl.querySelector('.tl-rail');
      head.style.transform = down ? 'translate(' + (rail.offsetLeft + rail.offsetWidth / 2) + 'px,' + (rail.offsetTop + at) + 'px)'
        : 'translateX(' + at.toFixed(1) + 'px) scale(' + (1 + 0.25 * Math.sin(t * 6) * (e < 1 ? 1 : 0.3)).toFixed(3) + ')';
      head.style.opacity = active < 0 ? '0' : '1';
    }
  }
}

// График: столбцы растут от основания один за другим, линия прорисовывается слева
// направо, и точка с подписью появляется, когда линия до неё дошла. Устоявшийся кадр —
// вёрстка по данным: рост идёт трансформацией, высота столбца задана разметкой.
// Гонка баров: периоды проходят равными долями от момента графика до последней секунды сцены.
// Место в ряду между периодами плавно переходит от одной сортировки к другой.
function race(t) {
  for (const plot of document.querySelectorAll('.race-plot')) {
    const periods = JSON.parse(plot.dataset.periods), P = periods.length;
    const rows = [...plot.querySelectorAll('.race-row')].map((r) => ({ r, v: r.dataset.values.split(' ').map(Number) }));
    const t0 = start(plot) + 0.4, span = Math.max(1, dur() - t0 - 1.2);
    const pos = clamp((t - t0) / span) * (P - 1), k = Math.min(P - 2, Math.floor(pos)), f = inOut(pos - k);
    const rank = (i) => { const order = rows.map((x, j) => j).sort((a, b) => rows[b].v[i] - rows[a].v[i] || a - b); const out = []; order.forEach((j, n) => { out[j] = n; }); return out; };
    const ra = rank(k), rb = rank(k + 1);
    const shown = Math.min(rows.length, 8), rowH = plot.clientHeight / shown;
    const vals = rows.map((x) => x.v[k] + (x.v[k + 1] - x.v[k]) * f), max = Math.max(...vals) || 1;
    const fmt = new Intl.NumberFormat(document.documentElement.lang || 'en');
    const grow = out3(clamp((t - start(plot)) / 0.8));
    rows.forEach(({ r }, j) => {
      const place = ra[j] + (rb[j] - ra[j]) * f;
      r.style.top = (place * rowH).toFixed(2) + 'px';
      r.style.height = rowH.toFixed(2) + 'px';
      r.style.opacity = clamp(shown - place).toFixed(3);
      r.querySelector('.race-bar').style.width = (Math.max(0.2, vals[j] / max * 88) * grow).toFixed(3) + '%';
      r.querySelector('.race-v').textContent = fmt.format(Math.round(vals[j]));
    });
    plot.querySelector('.race-period').textContent = periods[Math.round(pos)];
  }
}

// Мини-график счётчика рисуется за 1,2 с после его появления; точка на конце вспыхивает.
function spark(t) {
  for (const svg of document.querySelectorAll('.ctr-spark')) {
    const e = inOut(clamp((t - start(svg.closest('.el')) - 0.5) / 1.2));
    const line = svg.querySelector('polyline'), dot = svg.querySelector('circle');
    line.style.strokeDasharray = '1';
    line.style.strokeDashoffset = (1 - e).toFixed(4);
    dot.style.opacity = e >= 1 ? '1' : '0';
    dot.setAttribute('r', (2.6 + 3 * Math.max(0, 1 - (t - start(svg.closest('.el')) - 1.7) / 0.5) * (e >= 1 ? 1 : 0)).toFixed(2));
  }
}

// Бегущий луч по цепочке: когда все узлы на месте, светящийся импульс идёт от узла к узлу по кругу —
// «данные текут отсюда туда». Места узлов берутся по вёрстке, без трансформаций входа.
function beams(t) {
  for (const chain of document.querySelectorAll('.chain')) {
    const nodes = [...chain.querySelectorAll('.node')];
    if (nodes.length < 2) continue;
    const ready = Math.max(...nodes.map((n) => start(n.closest('.el')))) + 0.8;
    let beam = chain.querySelector(':scope>.beam');
    if (!beam) { beam = document.createElement('span'); beam.className = 'beam'; chain.appendChild(beam); }
    if (t < ready) { beam.style.opacity = '0'; continue; }
    const at = (n) => { let x = n.offsetWidth / 2, y = n.offsetHeight / 2, e = n; while (e && e !== chain) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return [x, y]; };
    const pts = nodes.map(at), seg = 1.1, u = ((t - ready) / seg) % (pts.length - 1), k = Math.floor(u), f = inOut(u - k);
    const [ax, ay] = pts[k], [bx, by] = pts[k + 1];
    beam.style.opacity = Math.min(1, (t - ready) / 0.3).toFixed(3);
    beam.style.transform = 'translate(' + (ax + (bx - ax) * f).toFixed(2) + 'px,' + (ay + (by - ay) * f).toFixed(2) + 'px) scale(' + (0.8 + 0.6 * Math.sin(Math.PI * f)).toFixed(3) + ')';
  }
}

function chart(t) {
  for (const b of document.querySelectorAll('.chart-bar')) {
    const e = out3(clamp((t - start(b)) / 0.9));
    b.style.transform = 'scaleY(' + Math.max(0.0001, e).toFixed(4) + ')';
    const v = b.parentElement.querySelector('.chart-v');
    if (v) { v.style.opacity = clamp((t - start(b) - 0.55) / 0.35).toFixed(3); v.style.bottom = (Number(v.dataset.pct) * e).toFixed(3) + '%'; }
  }
  for (const path of document.querySelectorAll('.chart-path')) {
    // Ломаная кладётся в точки поля построения: в долях её вершины знает разметка, размер
    // поля — только страница, и он устанавливается не сразу (первый вызов идёт до
    // окончательной вёрстки). Поэтому путь пересчитывается, как только размер поля другой.
    const plot = path.closest('.chart-plot'), w = plot.clientWidth, h = plot.clientHeight;
    if (path.dataset.size !== w + 'x' + h) {
      path.dataset.size = w + 'x' + h;
      const svg = path.ownerSVGElement;
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      const pts = path.dataset.pts.split(' ').map((p) => p.split(',').map(Number)).map(([x, y]) => [x * w, y * h]);
      path.setAttribute('points', pts.map(([x, y]) => x.toFixed(2) + ',' + y.toFixed(2)).join(' '));
      const len = path.getTotalLength();
      let acc = 0;
      const at = pts.map((p, i) => { if (i) acc += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); return acc / len; });
      path.dataset.len = String(len);
      path.dataset.shares = at.map((v) => v.toFixed(5)).join(' ');
      path.style.strokeDasharray = len.toFixed(2);
    }
    const len = Number(path.dataset.len), shares = path.dataset.shares.split(' ').map(Number);
    const e = inOut(clamp((t - start(path)) / 1.6));
    path.style.strokeDashoffset = (len * (1 - e)).toFixed(2);
    const labels = [...plot.querySelectorAll('.chart-pv')];
    [...plot.querySelectorAll('.chart-dot')].forEach((d, i) => {
      // Точка загорается, когда линия до неё дошла; последняя — когда линия дорисована.
      const on = e >= 1 ? 1 : e > 0 && e >= shares[i] ? clamp((e - shares[i]) * 12 + 0.25) : 0;
      d.style.opacity = on.toFixed(3);
      d.style.transform = 'scale(' + (0.4 + 0.6 * back(on)).toFixed(4) + ')';
      if (labels[i]) labels[i].style.opacity = on.toFixed(3);
    });
  }
}

// «Было/стало»: разделитель едет от начального положения к конечному, второй снимок
// открыт правее него. Путь — плавный, за 60 % оставшейся сцены после момента начала.
function beforeAfter(t) {
  for (const f of document.querySelectorAll('.ba-frame')) {
    const from = Number(f.dataset.from), to = Number(f.dataset.to), t0 = start(f);
    const e = inOut(clamp((t - t0) / Math.max(0.8, (dur() - t0) * 0.6)));
    const x = from + (to - from) * e;
    f.querySelector('.ba-after').style.clipPath = 'inset(0 0 0 ' + (x * 100).toFixed(3) + '%)';
    f.querySelector('.ba-line').style.left = (x * 100).toFixed(3) + '%';
  }
}

// Параллакс: панели выходят из снимка (масштаб и тень растут по глубине) и плывут при
// облёте — смещение пропорционально глубине, ближние идут дальше и быстрее дальних.
function parallax(t) {
  for (const f of document.querySelectorAll('.px-frame')) {
    const lift = out3(clamp((t - start(f)) / 1.2));
    const ox = Math.sin(t * 0.42) * 26, oy = Math.cos(t * 0.31) * 14;
    const base = f.querySelector('.px-base');
    if (base) base.style.transform = 'translate(' + (-ox * 0.15).toFixed(2) + 'px,' + (-oy * 0.15).toFixed(2) + 'px)';
    for (const p of f.querySelectorAll('.px-panel')) {
      const d = Number(p.dataset.depth) * lift;
      p.style.transform = 'translate(' + (ox * (0.2 + 1.6 * d)).toFixed(2) + 'px,' + (oy * (0.2 + 1.6 * d)).toFixed(2) + 'px) scale(' + (1 + 0.08 * d).toFixed(4) + ')';
      // Тень панели темнеет с глубиной: доля цвета тени темы, а не свой чёрный.
      p.style.boxShadow = '0 ' + (6 + 30 * d).toFixed(1) + 'px ' + (14 + 50 * d).toFixed(1) + 'px color-mix(in srgb,var(--shadow-color) ' + ((0.25 + 0.35 * d) / 0.6 * 100).toFixed(1) + '%,transparent)';
    }
  }
}

// Разобранный вид: слои расходятся по глубине, пока камера наклонена, и сходятся к концу сцены.
function layers(t) {
  for (const f of document.querySelectorAll('.lay-frame')) {
    const a = out3(clamp((t - start(f)) / 1.4)) * (1 - inOut(clamp((t - (dur() - 1.8)) / 1.4)));
    const rz = -22 * a + Math.sin(t * 0.3) * 4 * a;
    // Наклонённая стопка растёт вверх по кадру: рамка уходит вниз и уменьшается, чтобы поднятые
    // слои не наезжали на заголовок.
    f.style.transform = 'perspective(2200px) translateY(' + (10 * a).toFixed(3) + '%) rotateX(' + (0.01 + 48 * a).toFixed(3) + 'deg) rotateZ(' + rz.toFixed(3) + 'deg)';
    [...f.querySelectorAll('.lay-panel')].forEach((p, i) => {
      const d = Number(p.dataset.depth);
      p.style.transform = 'translateZ(' + ((30 + 220 * d) * a + i * 0.5).toFixed(2) + 'px)';
      p.style.boxShadow = '0 ' + (4 + 40 * d * a).toFixed(1) + 'px ' + (10 + 60 * d * a).toFixed(1) + 'px color-mix(in srgb,var(--shadow-color) ' + (40 + 40 * d * a).toFixed(1) + '%,transparent)';
    });
  }
}

// Экран в перспективе на WebGL. Плоскость экрана и отражение под ней — два
// четырёхугольника с перспективной проекцией; угол облёта — функция времени, блик —
// полоса по экрану, отражение — зеркальный низ экрана, гаснущий книзу. Пометка
// \`data-screen-renderer="webgl"\` ставится только после настоящей отрисовки в
// контексте WebGL; без него страница рисует плоский снимок и помечает \`fallback\`.
const PV = new WeakMap();
function perspective(t) {
  for (const cv of document.querySelectorAll('.pv-cv')) {
    let st = PV.get(cv);
    const img = cv.parentElement.querySelector('.pv-src');
    if (!st) {
      st = { gl: null };
      PV.set(cv, st);
      const dpr = window.devicePixelRatio || 1;
      cv.width = Math.max(2, Math.round(cv.clientWidth * dpr));
      cv.height = Math.max(2, Math.round(cv.clientHeight * dpr));
      const gl = cv.getContext('webgl', { preserveDrawingBuffer: true, antialias: true, premultipliedAlpha: false, alpha: true });
      if (gl && img && img.complete && img.naturalWidth) {
        const sh = (type, src) => { const x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x); return x; };
        const prog = gl.createProgram();
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec3 p;attribute vec3 q;uniform mat4 M;varying vec3 v;'
          + 'void main(){v=q;gl_Position=M*vec4(p,1.0);}'));
        // Цвет и сила блика и яркость отражения — из темы (uniform L, LS, RB), а не числами в шейдере.
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, 'precision highp float;uniform sampler2D S;uniform float G;uniform vec3 L;uniform float LS,RB;varying vec3 v;'
          + 'void main(){vec4 c=texture2D(S,v.xy);float k=step(0.5,v.z);'
          + 'float g=k*exp(-pow(v.x*0.8+(1.0-v.y)*0.35-G,2.0)*40.0)*LS;'
          + 'float a=k>0.5?1.0:v.z*2.0;'
          + 'gl_FragColor=vec4(c.rgb*mix(RB,1.0,k)+L*g,c.a*a);}'));
        gl.linkProgram(prog);
        if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
          gl.useProgram(prog);
          const tex = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          const ratio = Number(cv.dataset.ratio) || 1.6, w = 2, h = 2 / ratio, gap = 0.04, rh = h * 0.45;
          const ra = token('--pv-reflection');
          // x, y, z; u, v, «экран» (1) или прозрачность отражения (0…0,5).
          const data = new Float32Array([
            -w / 2, h / 2, 0, 0, 0, 1, w / 2, h / 2, 0, 1, 0, 1, -w / 2, -h / 2, 0, 0, 1, 1, w / 2, -h / 2, 0, 1, 1, 1,
            -w / 2, -h / 2 - gap, 0, 0, 1, ra, w / 2, -h / 2 - gap, 0, 1, 1, ra,
            -w / 2, -h / 2 - gap - rh, 0, 0, 1 - rh / h, 0, w / 2, -h / 2 - gap - rh, 0, 1, 1 - rh / h, 0]);
          const buf = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, buf);
          gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
          const P = gl.getAttribLocation(prog, 'p'), Q = gl.getAttribLocation(prog, 'q');
          gl.enableVertexAttribArray(P); gl.vertexAttribPointer(P, 3, gl.FLOAT, false, 24, 0);
          gl.enableVertexAttribArray(Q); gl.vertexAttribPointer(Q, 3, gl.FLOAT, false, 24, 12);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          st = { gl, prog, M: gl.getUniformLocation(prog, 'M'), G: gl.getUniformLocation(prog, 'G'), h, w };
          gl.uniform3fv(gl.getUniformLocation(prog, 'L'), colorOf('--pv-glint'));
          gl.uniform1f(gl.getUniformLocation(prog, 'LS'), token('--pv-glint-strength'));
          gl.uniform1f(gl.getUniformLocation(prog, 'RB'), token('--pv-shade'));
          PV.set(cv, st);
        }
      }
      if (!st.gl) {
        if (img) img.style.visibility = 'visible';
        cv.style.display = 'none';
        document.body.dataset.screenRenderer = 'fallback';
      }
    }
    if (!st.gl) continue;
    const gl = st.gl;
    // Облёт: угол по вертикальной оси плавно ходит, наклон к зрителю — поменьше.
    const yaw = (-24 + Math.sin(t * 0.42) * 12) * Math.PI / 180, pitch = (10 + Math.cos(t * 0.31) * 4) * Math.PI / 180;
    const aspect = cv.width / cv.height, f = 1 / Math.tan((34 * Math.PI) / 360), n = 0.1, fa = 50;
    const P = [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (fa + n) / (n - fa), -1, 0, 0, (2 * fa * n) / (n - fa), 0];
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), dist = 2.55;
    // Модель: поворот по Y, затем по X, сдвиг вглубь и чуть вверх.
    const R = [cy, sp * sy, -cp * sy, 0, 0, cp, sp, 0, sy, -sp * cy, cp * cy, 0, 0, 0.25, -dist, 1];
    const mul = (a, b) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };
    const M = mul(P, R);
    gl.viewport(0, 0, cv.width, cv.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniformMatrix4fv(st.M, false, new Float32Array(M));
    gl.uniform1f(st.G, -0.6 + (((t * 0.22) % 1 + 1) % 1) * 2.4);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.drawArrays(gl.TRIANGLE_STRIP, 4, 4);
    // Углы экрана на холсте — для проверки формы; пометка — только после отрисовки без ошибки.
    const corner = (x, y) => { const v = [0, 1, 2, 3].map((r) => M[r] * x + M[4 + r] * y + M[12 + r]); return [((v[0] / v[3] + 1) / 2) * cv.clientWidth, ((1 - v[1] / v[3]) / 2) * cv.clientHeight]; };
    cv.dataset.corners = JSON.stringify([corner(-st.w / 2, st.h / 2), corner(st.w / 2, st.h / 2), corner(st.w / 2, -st.h / 2), corner(-st.w / 2, -st.h / 2)]);
    if (gl.getError() === gl.NO_ERROR && !gl.isContextLost()) document.body.dataset.screenRenderer = 'webgl';
  }
}

// Медленный наезд на картинку к точке фокуса за всю сцену.
function kenBurns(t) {
  kb = kb || [...document.querySelectorAll('[data-kb]')];
  const p = 0.5 - 0.5 * Math.cos(Math.PI * clamp(t / dur()));
  for (const n of kb) {
    const [fx, fy, z0, z1] = n.dataset.kb.split(' ').map(Number);
    n.style.transformOrigin = (fx * 100).toFixed(2) + '% ' + (fy * 100).toFixed(2) + '%';
    n.style.transform = 'scale(' + (z0 + (z1 - z0) * p).toFixed(5) + ')';
  }
  for (const img of document.querySelectorAll('.shot-img[data-scroll]')) {
    const s = Number(img.dataset.scroll);
    const q = inOut(clamp((t / dur() - 0.25) / 0.6));
    img.style.transform = s > 0 ? 'translateY(' + (-s * q).toFixed(2) + 'px)' : 'none';
  }
}

// Кадр целиком: облёт камеры (передний план смещается сильнее фона, отсюда
// глубина) или медленный наезд к концу сцены.
function move(t) {
  const amb = document.querySelector('.amb');
  // Классические виды (шапка, колонки, цепочка, цитата, число) стоят потоком без секции кадра: их
  // облёт — тот же сдвиг, но отдельным свойством \`translate\`, которое складывается со входом.
  if (!document.querySelector('.k')) {
    const tx = Math.sin(t * 0.13) * 7, ty = Math.cos(t * 0.19) * 5;
    for (const el of document.querySelectorAll('body>.el')) el.style.translate = tx.toFixed(2) + 'px ' + ty.toFixed(2) + 'px';
    if (amb) amb.style.transform = 'translate(' + (-tx * 0.5).toFixed(2) + 'px,' + (-ty * 0.5).toFixed(2) + 'px) scale(1.03)';
  }
  for (const sec of document.querySelectorAll('.k[data-move]')) {
    const kin = sec.querySelector('.k-in');
    const mode = sec.dataset.move;
    if (mode === 'drift') {
      // Облёт — на плоскости: сдвиг, едва заметный поворот и дыхание масштаба.
      // Глубину даёт фон, который смещается вдвое меньше переднего плана.
      const tx = Math.sin(t * 0.13) * 9, ty = Math.cos(t * 0.19) * 6;
      const rot = Math.sin(t * 0.11) * 0.35, sc = 1.01 + Math.sin(t * 0.23) * 0.008;
      kin.style.transform = 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px) rotate(' + rot.toFixed(4) + 'deg) scale(' + sc.toFixed(5) + ')';
      if (amb) amb.style.transform = 'translate(' + (-tx * 0.5).toFixed(2) + 'px,' + (-ty * 0.5).toFixed(2) + 'px) scale(1.03)';
      for (const back of sec.querySelectorAll(':scope>.hero-img')) back.style.translate = (-tx * 0.4).toFixed(2) + 'px ' + (-ty * 0.4).toFixed(2) + 'px';
    } else if (mode === 'push') {
      kin.style.transform = 'scale(' + (1 + 0.06 * inOut(clamp(t / dur()))).toFixed(5) + ')';
    } else if (mode === 'dolly') {
      // Наезд с рампой скорости: камера трогается медленно, разгоняется в середине и мягко встаёт.
      // Фон едет медленнее переднего плана — отсюда глубина.
      const p = clamp(t / dur()), e = p < 0.5 ? 16 * p ** 5 : 1 - (-2 * p + 2) ** 5 / 2;
      kin.style.transform = 'scale(' + (1 + 0.16 * e).toFixed(5) + ')';
      if (amb) amb.style.transform = 'scale(' + (1.03 + 0.05 * e).toFixed(5) + ')';
    } else if (mode === 'pan') {
      // Проводка: кадр едет вбок через всю сцену, фон — вдвое медленнее.
      const e = inOut(clamp(t / dur())), x = (0.5 - e) * innerWidth * 0.06;
      kin.style.transform = 'translateX(' + x.toFixed(2) + 'px) scale(1.02)';
      if (amb) amb.style.transform = 'translateX(' + (x * 0.5).toFixed(2) + 'px) scale(1.08)';
    } else if (mode === 'orbit3d') {
      // Облёт в объёме: кадр наклонён и медленно поворачивается вокруг вертикали. Трёхмерен на
      // каждом кадре — иначе растеризация Chromium меняется на стыке плоского и объёмного.
      const e = inOut(clamp(t / dur()));
      const ry = -9 + 18 * e + Math.sin(t * 0.7) * 1.2, rx = 5 + Math.cos(t * 0.45) * 2.5;
      kin.style.transform = 'rotateX(' + rx.toFixed(3) + 'deg) rotateY(' + ry.toFixed(3) + 'deg) scale(0.94)';
      if (amb) amb.style.transform = 'translateX(' + (-ry * innerWidth * 0.0012).toFixed(2) + 'px) scale(1.06)';
    } else if (mode === 'handheld') {
      // Ручная камера: сумма синусов несоизмеримых частот — дрожь без повтора, с редкими толчками.
      const u = u0 => Math.sin(t * u0) + Math.sin(t * u0 * 2.37 + 1.3) * 0.5 + Math.sin(t * u0 * 5.11 + 4.1) * 0.22;
      const k = innerHeight / 1080;
      const tx = u(1.7) * 5 * k, ty = u(2.3) * 4 * k, rot = u(1.1) * 0.35;
      kin.style.transform = 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px) rotate(' + rot.toFixed(4) + 'deg) scale(1.025)';
      if (amb) amb.style.transform = 'translate(' + (tx * 0.4).toFixed(2) + 'px,' + (ty * 0.4).toFixed(2) + 'px) scale(1.05)';
    } else kin.style.transform = 'none';
  }
  for (const f of document.querySelectorAll('.shot-float')) {
    const side = f.closest('.with-copy') && innerWidth > innerHeight ? -9 : 0;
    f.style.transform = 'rotateY(' + (side + Math.sin(t * 0.37) * 2.6).toFixed(3) + 'deg) rotateX(' + (3 + Math.cos(t * 0.29) * 1.6).toFixed(3) + 'deg)';
  }
  for (const cta of document.querySelectorAll('.outro-cta')) {
    const c = ((t - start(cta) - 0.6) % 3.4 + 3.4) % 3.4 / 3.4;
    cta.style.setProperty('--sheen', (-60 + c * 230).toFixed(1) + '%');
  }
  const orbit = document.querySelector('.outro-orbit');
  if (orbit) orbit.style.transform = 'rotate(' + (t * 4).toFixed(2) + 'deg) scale(' + (1 + Math.sin(t * 0.5) * 0.03).toFixed(4) + ')';
}

// — живые фоны —
//
// Фон называет сцена (\`background\`) или тема (\`--bg-motion\`). Слои тихой
// сетки — умолчание и запасной путь; остальные рисуются на холсте каждый
// кадр как функция времени: шейдер WebGL или двумерная графика. Цвета берутся
// у темы, поэтому фон в светлой теме светлый, а в неоновой — неоновый.
const GL_HEAD = 'precision highp float;uniform vec2 R;uniform float T;uniform vec3 BG,A,B,G;uniform float K;'
  + 'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}'
  + 'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h(i),h(i+vec2(1.0,0.0)),f.x),mix(h(i+vec2(0.0,1.0)),h(i+vec2(1.0,1.0)),f.x),f.y);}'
  + 'float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=0.5;}return v;}'
  + 'float soft(vec2 p){float v=0.0,a=0.55;for(int i=0;i<3;i++){v+=a*n(p);p=p*1.9+vec2(3.1,5.7);a*=0.45;}return v/0.9;}';
const SHADERS = {
  aurora: 'void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=vec2(uv.x*asp,uv.y);float t=T*0.07;'
    + 'vec3 col=mix(BG,G,smoothstep(0.0,1.0,uv.y)*0.85);'
    + 'for(int i=0;i<3;i++){float fi=float(i);'
    + 'float y=0.66-0.15*fi+0.08*sin(p.x*(1.1+0.35*fi)+t*(2.0+fi)+fi*1.7)+0.16*(soft(vec2(p.x*0.9+fi*3.1,t*0.8+fi))-0.5);'
    + 'float d=uv.y-y;float band=exp(-d*d*(70.0+fi*40.0));'
    + 'float rays=0.45+0.55*soft(vec2(p.x*2.4+fi*7.0,uv.y*0.9-t*1.6));'
    + 'float veil=smoothstep(0.3,0.0,-d)*exp(-max(d,0.0)*12.0);'
    + 'vec3 c=i==0?A:(i==1?B:mix(A,B,0.5));'
    + 'col=mix(col,c,clamp((band*0.85+veil*0.22)*rays*K,0.0,0.85));}'
    + 'gl_FragColor=vec4(col,1.0);}',
  mesh: 'void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=vec2(uv.x*asp,uv.y);float t=T*0.05;'
    + 'vec2 w=vec2(fbm(p*1.3+vec2(t,0.0)),fbm(p*1.3+vec2(4.1,t)));p+=(w-0.5)*0.35;vec3 col=BG;'
    + 'vec2 c1=vec2(asp*(0.25+0.15*sin(t*2.1)),0.3+0.2*cos(t*1.7));vec2 c2=vec2(asp*(0.75+0.12*cos(t*1.3)),0.65+0.18*sin(t*1.9));'
    + 'vec2 c3=vec2(asp*(0.55+0.2*sin(t*1.1+2.0)),0.15+0.12*cos(t*2.3));vec2 c4=vec2(asp*(0.1+0.1*cos(t*1.6+1.0)),0.85+0.1*sin(t*1.2));'
    + 'col=mix(col,A,exp(-dot(p-c1,p-c1)*5.0)*K);col=mix(col,B,exp(-dot(p-c2,p-c2)*4.0)*K);'
    + 'col=mix(col,G,clamp(exp(-dot(p-c3,p-c3)*6.0)*K*1.2,0.0,1.0));col=mix(col,mix(A,B,0.5),exp(-dot(p-c4,p-c4)*7.0)*K*0.8);'
    + 'gl_FragColor=vec4(col,1.0);}',
  waves: 'void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;float t=T*0.35;vec3 col=mix(BG,G,uv.y*0.8);'
    + 'for(int i=0;i<9;i++){float fi=float(i);'
    + 'float y=0.5+0.2*sin(uv.x*asp*(1.6+fi*0.18)+t*(0.6+fi*0.07)+fi*0.9)*(0.6+0.4*sin(t*0.3+fi))+(fi-4.0)*0.035;'
    + 'float d=abs(uv.y-y)*R.y;float line=exp(-d*d/2.0)*0.9+exp(-d/18.0)*0.12;'
    + 'col=mix(col,mix(A,B,fi/8.0),clamp(line*K,0.0,0.9));}'
    + 'gl_FragColor=vec4(col,1.0);}',
  // Лучи: веер света сверху, лучи медленно расходятся и гаснут книзу — торжественно и мягко.
  rays: 'void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=vec2((uv.x-0.5)*asp,1.1-uv.y);float a=atan(p.x,p.y);float t=T*0.12;'
    + 'float r=0.5+0.5*sin(a*13.0+t*1.3)*sin(a*7.0-t*0.8+1.3);r=r*r*r;'
    + 'float fall=exp(-length(p)*1.3)*smoothstep(1.3,0.2,abs(a));'
    + 'vec3 col=mix(BG,G,uv.y*0.6);col=mix(col,mix(A,B,0.5+0.5*sin(a*3.0+t)),clamp((r*0.9+0.2)*fall*K*1.4,0.0,0.85));'
    + 'gl_FragColor=vec4(col,1.0);}',
  // Лампа: над заголовком разгорается светящаяся черта, и из неё вниз раскрывается конус света —
  // за первые 1,6 с сцены, как включённая лампа. Черта стоит на четверти высоты кадра сверху.
  lamp: 'void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;float grow=smoothstep(0.0,1.6,T);vec2 p=vec2((uv.x-0.5)*asp,0.76-uv.y);'
    + 'float w=0.16+0.5*grow;vec3 col=mix(BG,G,0.3);'
    + 'float cone=p.y>0.0?smoothstep(w*(0.3+p.y*1.5),0.0,abs(p.x))*exp(-p.y*2.0):0.0;'
    + 'float bar=exp(-pow(p.y*R.y/2.5,2.0))*smoothstep(w,w*0.55,abs(p.x));'
    + 'float halo=exp(-dot(p,p)*8.0/(0.3+grow));'
    + 'col=mix(col,A,clamp((cone*0.8+halo*0.3)*K*(0.4+0.6*grow),0.0,0.9));col=mix(col,B,clamp(bar*grow,0.0,1.0));'
    + 'gl_FragColor=vec4(col,1.0);}',
  // Мерцающая сетка: квадраты загораются и гаснут каждый в своём ритме, редкие огоньки светят
  // вторым цветом; книзу сетка тускнеет.
  flicker: 'void main(){vec2 uv=gl_FragCoord.xy/R;float cs=R.y/34.0;vec2 c=floor(gl_FragCoord.xy/cs);vec2 f=fract(gl_FragCoord.xy/cs);'
    + 'float gap=step(0.16,f.x)*step(0.16,f.y);float ph=h(c)*6.2831;float sp=0.5+h(c+7.0)*2.2;'
    + 'float on=0.5+0.5*sin(T*sp+ph);on=on*on*on*on*on*on;float spark=step(0.985,h(c+vec2(3.0,1.0)))*(0.6+0.4*sin(T*3.0+ph));'
    + 'float fade=0.3+0.7*smoothstep(0.0,0.9,uv.y);'
    + 'vec3 col=mix(BG,G,0.3);col=mix(col,A,clamp((0.07+on*0.3)*gap*fade*K,0.0,1.0));col=mix(col,B,clamp(spark*gap*K*1.4,0.0,1.0));'
    + 'gl_FragColor=vec4(col,1.0);}',
  // Лучи по путям: несколько изогнутых линий через кадр, по каждой бежит светящийся отрезок — поток, ИИ.
  beams: 'void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec3 col=mix(BG,G,uv.y*0.5);'
    + 'for(int i=0;i<7;i++){float fi=float(i);'
    + 'float y=0.5+(fi-3.0)*0.07+0.22*sin(uv.x*asp*(1.1+fi*0.13)+fi*0.9)*(0.4+0.6*uv.x);'
    + 'float d=abs(uv.y-y)*R.y;float line=exp(-d*d/3.0);'
    + 'float head=fract(T*(0.09+h(vec2(fi,2.0))*0.08)+h(vec2(fi,5.0)));float dx=(uv.x-head)*asp;'
    + 'float pulse=exp(-dx*dx*90.0)*step(dx,0.0)+exp(-dx*dx*900.0);'
    + 'col=mix(col,mix(A,B,fi/6.0),clamp(line*(0.18+pulse*1.6)*K,0.0,0.95));}'
    + 'gl_FragColor=vec4(col,1.0);}',
  // Полёт сквозь пространство: звёзды летят из середины кадра и вытягиваются в штрихи у краёв.
  warp: 'void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=(uv-0.5)*vec2(asp,1.0);float r=length(p);float a=atan(p.y,p.x);'
    + 'vec3 col=mix(BG,G,exp(-r*2.5)*0.8);float sec=floor((a+3.1416)/6.2832*240.0);'
    + 'for(int k=0;k<3;k++){float fk=float(k);float z=fract(h(vec2(sec,fk))+T*(0.22+0.1*fk));float rs=z*z*1.3;'
    + 'float len=0.01+z*z*0.14;float along=step(rs-len,r)*step(r,rs);float mid=abs(fract((a+3.1416)/6.2832*240.0)-0.5);'
    + 'float star=along*smoothstep(0.5,0.1,mid)*z;col=mix(col,mix(B,A,fk/2.0),clamp(star*K*1.6,0.0,0.95));}'
    + 'gl_FragColor=vec4(col,1.0);}',
  // Вихрь: частицы идут по спиралям к середине кадра, притягивая взгляд — фон призыва.
  vortex: 'void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=(uv-0.5)*vec2(asp,1.0);float r=length(p)+0.001;float a=atan(p.y,p.x);'
    + 'float sw=a+2.2/(r+0.25)+T*0.35;vec2 q=vec2(cos(sw),sin(sw))*r;'
    + 'float n1=n(q*38.0+vec2(T*0.6,0.0));float dots=smoothstep(0.78,0.95,n1)*smoothstep(0.02,0.25,r)*exp(-r*1.2);'
    + 'float arms=0.5+0.5*sin(sw*3.0-log(r)*4.0);'
    + 'vec3 col=mix(BG,G,exp(-r*3.0)*0.7);col=mix(col,mix(A,B,arms),clamp((dots*1.4+arms*0.12*exp(-r*2.0))*K,0.0,0.95));'
    + 'gl_FragColor=vec4(col,1.0);}',
  // Прожектор: косой луч из верхнего левого угла проходит по кадру за первые 3 с и остаётся на заголовке.
  spotlight: 'void main(){vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 o=vec2(-0.15*asp,1.25);vec2 p=vec2(uv.x*asp,uv.y)-o;'
    + 'float sweep=mix(-1.25,-0.62,smoothstep(0.0,3.0,T))+0.03*sin(T*0.6);float a=atan(p.x,-p.y)+sweep;'
    + 'float cone=exp(-a*a*28.0)*smoothstep(2.4,0.2,length(p));float core=exp(-a*a*140.0)*0.5;'
    + 'vec3 col=mix(BG,G,0.25);col=mix(col,mix(A,B,0.3),clamp((cone*0.75+core)*K*1.3,0.0,0.9));'
    + 'gl_FragColor=vec4(col,1.0);}',
};
const MODES = ${JSON.stringify(BACKGROUNDS)};
let gl = null, prog = null, uni = null, ctx2d = null, colors = null;
function colorOf(name) {
  const probe = document.createElement('i');
  probe.style.color = 'var(' + name + ')';
  document.body.appendChild(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  const m = c.match(/[\\d.]+/g) || ['0', '0', '0'];
  const k = c.startsWith('color(') ? 1 : 255;
  return [Number(m[0]) / k, Number(m[1]) / k, Number(m[2]) / k];
}
function ambient(t) {
  const root = document.querySelector('.amb');
  if (!root) return;
  if (!ambInit) {
    ambInit = true;
    const named = (document.body.dataset.bg || getComputedStyle(document.documentElement).getPropertyValue('--bg-motion') || 'grid').trim();
    ambMode = MODES.includes(named) ? named : 'grid';
    const cv = root.querySelector('.amb-cv');
    if (ambMode !== 'grid' && ambMode !== 'none' && cv) {
      cv.width = Math.max(2, Math.round(innerWidth / 2));
      cv.height = Math.max(2, Math.round(innerHeight / 2));
      colors = { BG: colorOf('--bg'), A: colorOf('--acc'), B: colorOf('--acc2'), G: colorOf('--glow') };
      const kRaw = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bg-intensity'));
      colors.K = Number.isFinite(kRaw) ? kRaw : 0.6;
      if (SHADERS[ambMode]) {
        gl = cv.getContext('webgl', { preserveDrawingBuffer: true, antialias: false });
        if (gl) {
          const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
          prog = gl.createProgram();
          gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 q;void main(){gl_Position=vec4(q,0.0,1.0);}'));
          gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, GL_HEAD + SHADERS[ambMode]));
          gl.linkProgram(prog);
          if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) gl = null;
        }
        if (gl) {
          gl.useProgram(prog);
          const buf = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, buf);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
          const q = gl.getAttribLocation(prog, 'q');
          gl.enableVertexAttribArray(q);
          gl.vertexAttribPointer(q, 2, gl.FLOAT, false, 0, 0);
          uni = Object.fromEntries(['R', 'T', 'BG', 'A', 'B', 'G', 'K'].map((u) => [u, gl.getUniformLocation(prog, u)]));
          document.body.dataset.bgRenderer = 'webgl';
        } else {
          // Без WebGL фон не пропадает, а откатывается к тихой сетке, и страница
          // об этом говорит: кадр без живого фона не выдаётся за кадр с ним.
          ambMode = 'grid';
          document.body.dataset.bgRenderer = 'fallback';
        }
      } else {
        ctx2d = cv.getContext('2d');
        document.body.dataset.bgRenderer = '2d';
      }
      if (ambMode !== 'grid') cv.style.display = 'block';
    }
    const layers = ambMode === 'grid' ? ['.amb-glow', '.amb-grid', '.amb-sheen'] : ['particles', 'bokeh', 'meteors'].includes(ambMode) ? ['.amb-glow'] : [];
    for (const sel of ['.amb-glow', '.amb-grid', '.amb-sheen']) {
      const n = root.querySelector(sel);
      if (n) n.style.display = layers.includes(sel) ? '' : 'none';
    }
    document.body.dataset.bgMode = ambMode;
  }
  if (ambMode === 'grid') {
    // Пятно света дышит, сетка плывёт, блик проходит кадр раз в двенадцать
    // секунд. Периоды несоизмеримы, поэтому рисунок не повторяется на глаз.
    const glow = root.querySelector('.amb-glow');
    if (glow) {
      const k = 1 + Math.sin(t * 0.33) * 0.06;
      glow.style.transform = 'translate(-50%,0) translate(' + (Math.sin(t * 0.21) * 46).toFixed(1)
        + 'px,' + (Math.cos(t * 0.17) * 34).toFixed(1) + 'px) scale(' + k.toFixed(4) + ')';
      glow.style.opacity = (0.72 + Math.sin(t * 0.41) * 0.12).toFixed(3);
    }
    const grid = root.querySelector('.amb-grid');
    if (grid) grid.style.backgroundPosition = (t * 5.5).toFixed(2) + 'px ' + (t * -3.2).toFixed(2) + 'px';
    const sheen = root.querySelector('.amb-sheen');
    if (sheen) sheen.style.transform = 'translateX(' + Math.round(((t % 12) / 12) * 2400) + 'px) skewX(-18deg)';
    return;
  }
  if (gl) {
    const c = colors;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform2f(uni.R, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(uni.T, t);
    gl.uniform3fv(uni.BG, c.BG); gl.uniform3fv(uni.A, c.A); gl.uniform3fv(uni.B, c.B); gl.uniform3fv(uni.G, c.G);
    gl.uniform1f(uni.K, c.K);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return;
  }
  if (!ctx2d) return;
  const cv = ctx2d.canvas, W = cv.width, H = cv.height, c = colors;
  const rgba = (v, a) => 'rgba(' + Math.round(v[0] * 255) + ',' + Math.round(v[1] * 255) + ',' + Math.round(v[2] * 255) + ',' + a.toFixed(3) + ')';
  const rnd = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  ctx2d.clearRect(0, 0, W, H);
  if (ambMode === 'particles') {
    // Созвездие: точки плывут каждая своим курсом, близкие соединены линией.
    const N = 70, pts = [];
    for (let i = 0; i < N; i++) {
      const x = ((rnd(i, 1) * W + t * (rnd(i, 2) - 0.5) * 34) % W + W) % W;
      const y = ((rnd(i, 3) * H + t * (rnd(i, 4) - 0.5) * 26) % H + H) % H;
      pts.push([x, y, 1.2 + rnd(i, 5) * 2.2]);
    }
    const near = W * 0.13;
    ctx2d.lineWidth = 1;
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1], d = Math.sqrt(dx * dx + dy * dy);
      if (d >= near) continue;
      ctx2d.strokeStyle = rgba(c.A, (1 - d / near) * 0.42 * c.K);
      ctx2d.beginPath(); ctx2d.moveTo(pts[i][0], pts[i][1]); ctx2d.lineTo(pts[j][0], pts[j][1]); ctx2d.stroke();
    }
    // По части связей бегут импульсы — сеть передаёт данные.
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      if ((i * 7 + j) % 9) continue;
      const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1], d = Math.sqrt(dx * dx + dy * dy);
      if (d >= near) continue;
      const u = ((t * 0.5 + rnd(i, j)) % 1);
      ctx2d.fillStyle = rgba(c.A, (1 - d / near) * 0.95 * c.K + 0.05);
      ctx2d.beginPath(); ctx2d.arc(pts[i][0] - dx * u, pts[i][1] - dy * u, 2.2, 0, Math.PI * 2); ctx2d.fill();
    }
    for (const [x, y, r] of pts) {
      ctx2d.fillStyle = rgba(c.B, 0.85 * c.K + 0.1);
      ctx2d.beginPath(); ctx2d.arc(x, y, r, 0, Math.PI * 2); ctx2d.fill();
    }
  } else if (ambMode === 'meteors') {
    // Метеоры: неподвижные звёзды мерцают, светлые штрихи с хвостом падают наискосок — у каждого
    // свой период и старт, видно два-три сразу.
    for (let i = 0; i < 90; i++) {
      ctx2d.fillStyle = rgba(c.B, (0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * (0.8 + rnd(i, 6) * 2) + i))) * c.K);
      ctx2d.fillRect(rnd(i, 7) * W, rnd(i, 8) * H, 1.4, 1.4);
    }
    ctx2d.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const period = 2.6 + rnd(i, 1) * 3.4, u = (((t + rnd(i, 2) * period) % period) + period) % period / period;
      if (u > 0.4) continue;
      const k = u / 0.4, len = H * 1.1, x = rnd(i, 3) * W * 1.4 - k * len * 0.62, y = -H * 0.08 + k * len;
      const tail = H * (0.16 + rnd(i, 4) * 0.12);
      const g = ctx2d.createLinearGradient(x, y, x + tail * 0.62, y - tail);
      g.addColorStop(0, rgba(c.A, (1 - k) * 0.95 * c.K + 0.05));
      g.addColorStop(1, rgba(c.A, 0));
      ctx2d.strokeStyle = g;
      ctx2d.lineWidth = 1.6;
      ctx2d.beginPath(); ctx2d.moveTo(x, y); ctx2d.lineTo(x + tail * 0.62, y - tail); ctx2d.stroke();
      ctx2d.fillStyle = rgba(c.B, (1 - k) * c.K);
      ctx2d.beginPath(); ctx2d.arc(x, y, 1.8, 0, Math.PI * 2); ctx2d.fill();
    }
  } else if (ambMode === 'bokeh') {
    // Боке: крупные размытые пятна света медленно всплывают.
    for (let i = 0; i < 26; i++) {
      const r = H * (0.05 + rnd(i, 1) * 0.16);
      const x = rnd(i, 2) * W + Math.sin(t * 0.2 + i) * W * 0.02;
      const span = H + r * 2;
      const y = H + r - (((rnd(i, 3) * span + t * (6 + rnd(i, 4) * 14)) % span + span) % span);
      const col = [c.A, c.B, c.G][i % 3];
      const g = ctx2d.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(col, (0.16 + rnd(i, 5) * 0.2) * c.K));
      g.addColorStop(0.7, rgba(col, (0.08 + rnd(i, 5) * 0.08) * c.K));
      g.addColorStop(1, rgba(col, 0));
      ctx2d.fillStyle = g;
      ctx2d.beginPath(); ctx2d.arc(x, y, r, 0, Math.PI * 2); ctx2d.fill();
    }
  }
}

// Заставка главы: орбиты вращаются, блик идёт по кругу, черта прочерчивается.
function chapter(t) {
  const orbit = document.querySelector('.chapter-orbit');
  if (orbit) orbit.style.transform = 'rotate(' + (t * 3).toFixed(2) + 'deg) translateY(' + Math.round(Math.sin(t * .55) * 12) + 'px)';
  const sweep = document.querySelector('.chapter-sweep');
  if (sweep) sweep.style.transform = 'translateX(' + Math.round(((t % 9) / 9) * 1900) + 'px) skewX(-22deg)';
  const line = document.querySelector('.chapter-line');
  if (line) line.style.transform = 'scaleX(' + Math.max(0, Math.min(1, (t - .3) / 2)).toFixed(3) + ')';
}

// Трейлерная карта и титул. Кегль — по ширине кадра: слова карты занимают 88 % ширины сетки, но не
// выше 40 % её высоты; самая длинная строка титула — 80 % ширины, строка не выше 20 % высоты.
// Меряется по кеглю 100 до первого кадра и заново, когда придут шрифты темы.
function fitCards() {
  const gw = token('--sc-grid-w') || 1280, gh = token('--sc-grid-h') || 720;
  const fit = (el, share, tall) => {
    el.style.fontSize = '100px';
    const w = Math.max(1, el.scrollWidth);
    el.style.fontSize = Math.min(100 * gw * share / w, gh * tall).toFixed(1) + 'px';
  };
  document.querySelectorAll('.card-word').forEach((el) => fit(el, 0.88, 0.4));
  document.querySelectorAll('.tc-name').forEach((el) => {
    // Ширина строки меряется по самой длинной из строк названия.
    el.style.fontSize = '100px';
    const w = Math.max(1, ...[...el.querySelectorAll('.tc-line')].map((l) => l.scrollWidth));
    const lines = el.querySelectorAll('.tc-line').length || 1;
    el.style.fontSize = Math.min(100 * gw * 0.8 / w, gh * 0.2, gh * 0.5 / lines).toFixed(1) + 'px';
  });
  // Надзаголовок и дата — разреженные заглавные одной строкой: длинная строка уходила за оба края
  // кадра. Кегль уменьшается, пока строка не встанет в 90 % ширины; дальше 16 точек строка переносится.
  document.querySelectorAll('.card-kicker,.tc-kicker,.tc-date').forEach((el) => {
    el.style.fontSize = ''; el.style.whiteSpace = 'nowrap';
    const size = parseFloat(getComputedStyle(el).fontSize), w = el.scrollWidth;
    if (w > gw * 0.9) {
      const k = Math.max(16, size * gw * 0.9 / w);
      el.style.fontSize = k.toFixed(1) + 'px';
      if (el.scrollWidth > gw * 0.9) el.style.whiteSpace = 'normal';
    }
  });
}
fitCards();

// — живые виды —
// Пружина одной формулы: быстрое движение с одним перелётом (как у слоя композиции).
const spring = (p) => (p >= 1 ? 1 : 1 - Math.exp(-6 * p) * Math.cos(9 * p));

// Бегущая лента: ряд повторён трижды, сдвиг — ширина одного повтора по кругу, линейно (бесконечный
// цикл — единственное место линейного движения). Вторая строка идёт навстречу.
function marquee(t) {
  for (const row of document.querySelectorAll('.mq-row')) {
    const track = row.firstElementChild, cw = track.scrollWidth / 3;
    if (!cw) continue;
    const d = (t * Number(row.dataset.speed || 110)) % cw;
    const x = Number(row.dataset.dir) > 0 ? -d : -cw + d;
    track.style.transform = 'translateX(' + x.toFixed(2) + 'px)';
  }
}

// Стопка: карточка уходит влево-вверх, когда наступает момент следующей; колода подъезжает
// вперёд на пружине — глубина карточки уменьшается на единицу за каждую ушедшую.
function stack(t) {
  for (const stk of document.querySelectorAll('.stk')) {
    const cards = [...stk.querySelectorAll('.stk-card')], T = cards.map(start);
    cards.forEach((c, i) => {
      let depth = i;
      for (let j = 1; j <= i; j++) depth -= spring(clamp((t - T[j]) / 0.7));
      const leave = i + 1 < cards.length ? out3(clamp((t - T[i + 1]) / 0.55)) : 0;
      if (leave > 0) {
        c.style.transform = 'translate(' + (-leave * 560).toFixed(1) + 'px,' + (-leave * 40).toFixed(1) + 'px) rotate(' + (-leave * 12).toFixed(2) + 'deg)';
        c.style.opacity = (1 - leave).toFixed(3);
      } else {
        c.style.transform = 'translateY(' + (-depth * 22).toFixed(2) + 'px) scale(' + (1 - depth * 0.06).toFixed(4) + ')';
        c.style.opacity = clamp(3.5 - depth).toFixed(3);
      }
      c.style.zIndex = String(100 - i);
    });
    tilt(stk, t);
  }
}

// Наклон в объёме у стопки, сетки фич и бенто: слой наклонён к зрителю и медленно поворачивается на
// каждом кадре. Наклоняется контейнер, а не карточки: карточки со своими входами и масштабом
// рисуются в его слое плоско, и растеризация не зависит от того, какие кадры шли до этого.
function tilt(el, t) {
  const base = el.classList.contains('el') ? (el.style.transform === 'none' ? '' : el.style.transform) + ' ' : '';
  el.style.transform = base + 'perspective(1400px) rotateX(' + (6 + Math.sin(t * 0.5) * 2).toFixed(3) + 'deg) rotateY(' + (Math.sin(t * 0.4) * 6).toFixed(3) + 'deg)';
}
function depth(t) {
  for (const g of document.querySelectorAll('.feats,.bento')) tilt(g, t);
}

// Орбита: пункты кружат вокруг центра; внутренняя орбита — 16° в секунду, внешняя — навстречу, 10°.
function orbit(t) {
  for (const orb of document.querySelectorAll('.orb')) {
    const w = orb.clientWidth;
    for (const p of orb.querySelectorAll('.orb-pos')) {
      const outer = p.dataset.ring === '2', r = w * (outer ? 0.5 : 0.33);
      const a = Number(p.dataset.phase) * Math.PI * 2 - Math.PI / 2 + t * (outer ? -0.175 : 0.28);
      p.style.transform = 'translate(' + (Math.cos(a) * r).toFixed(2) + 'px,' + (Math.sin(a) * r).toFixed(2) + 'px)';
    }
  }
}

// Чат: реплика занимает место, когда о ней заговорили; перед репликой ассистента 1,2 с стоит
// «ИИ думает»: по строке и полосам скелетона бежит блик, круг за 1,1 с, у каждой полосы с отставанием.
// Новые реплики снизу, старые уходят вверх за край окна чата.
function chat(t) {
  for (const m of document.querySelectorAll('.msg')) {
    const b = m.querySelector('.bubble'), think = m.querySelector('.msg-think'), t0 = start(b);
    const typing = think && t >= t0 - 1.2 && t < t0;
    m.style.display = t >= t0 || typing ? '' : 'none';
    b.style.display = t >= t0 ? '' : 'none';
    if (think) {
      think.style.display = typing ? 'flex' : 'none';
      [...think.children].forEach((d, k) => { d.style.backgroundPosition = shimmer(t - k * 0.12) + ' 0'; });
    }
  }
}
// Блик по строке: градиент втрое шире предмета, его светлая середина проходит слева направо за 1,1 с.
function shimmer(t) {
  const p = ((t / 1.1) % 1 + 1) % 1;
  return ((1 - p) * 100).toFixed(2) + '%';
}

// Стена снимков: соседние колонки едут навстречу со скоростью 40 точек в секунду по кругу — колонка
// повторена дважды, сдвиг идёт на половину её высоты.
function wall(t) {
  for (const col of document.querySelectorAll('.wall-col')) {
    const h = col.scrollHeight / 2;
    if (!h) continue;
    const d = (t * 40) % h;
    col.style.transform = 'translateY(' + (Number(col.dataset.dir) > 0 ? -h + d : -d).toFixed(2) + 'px)';
  }
}

// Облако на сфере: пункты на сфере Фибоначчи, сфера поворачивается на 14° в секунду с наклоном;
// ближние крупнее и ярче, дальние — меньше и тусклее и уходят назад по порядку наложения.
function cloud(t) {
  for (const c of document.querySelectorAll('.cloud')) {
    const pos = [...c.querySelectorAll('.cloud-pos')], n = pos.length, R = Math.min(c.clientWidth, c.clientHeight) * 0.42;
    const yaw = t * 0.25, tilt = 0.35, cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(tilt), sx = Math.sin(tilt);
    pos.forEach((p, i) => {
      const y0 = 1 - (i + 0.5) / n * 2, r = Math.sqrt(1 - y0 * y0), a = i * 2.39996323;
      const x0 = Math.cos(a) * r, z0 = Math.sin(a) * r;
      const x = x0 * cy + z0 * sy, z1 = -x0 * sy + z0 * cy, y = y0 * cx - z1 * sx, z = y0 * sx + z1 * cx;
      const near = (z + 1) / 2;
      p.style.transform = 'translate(' + (x * R * 1.3).toFixed(1) + 'px,' + (-y * R).toFixed(1) + 'px) scale(' + (0.55 + 0.55 * near).toFixed(3) + ')';
      p.style.opacity = (0.3 + 0.7 * near).toFixed(3);
      p.style.zIndex = String(Math.round(near * 100));
    });
  }
}

// Терминал: блок встаёт на своём моменте; команду набирает слой (неровный темп руки), пока она
// «работает», крутится спиннер; вывод команды появляется через 0,6 с после набора. Лента прокручивается
// вверх, когда видимые строки не помещаются в окно.
const SPIN = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';
function terminal(t) {
  for (const term of document.querySelectorAll('.term')) {
    const feed = term.querySelector('.term-feed'), blocks = [...feed.children];
    blocks.forEach((b, i) => {
      const t0 = start(b), next = blocks[i + 1] ? start(blocks[i + 1]) : Infinity;
      b.style.display = t >= t0 ? '' : 'none';
      const inp = b.querySelector('.term-in'), spin = b.querySelector('.term-spin'), late = b.querySelector('.term-late');
      const typed = inp ? t0 + [...inp.textContent].length / 24 : t0;
      const done = Math.min(typed + 0.6, next - 0.05);
      if (spin) {
        const on = t >= typed && t < done;
        spin.textContent = on ? SPIN[Math.floor(t * 12) % SPIN.length] : '';
      }
      if (late) late.style.display = t >= (inp ? done : t0) ? '' : 'none';
    });
    feed.style.transform = 'translateY(' + (-Math.max(0, feed.scrollHeight - term.clientHeight + 24)).toFixed(1) + 'px)';
  }
}

// Буквы, залитые картинкой: картинка медленно плывёт и приближается внутри букв.
function fills(t) {
  for (const f of document.querySelectorAll('.filled')) {
    f.style.backgroundSize = (140 + t * 3).toFixed(2) + '% auto';
    f.style.backgroundPosition = (50 + Math.sin(t * 0.3) * 18).toFixed(2) + '% ' + (50 + Math.cos(t * 0.23) * 14).toFixed(2) + '%';
  }
}

// Пометки слова: встают по очереди через 0,7 с после появления заголовка, каждая за 0,55 с.
function marks(t) {
  for (const h of document.querySelectorAll('h1')) {
    const host = h.closest('.el');
    const t0 = host ? start(host) : 0;
    [...h.querySelectorAll('.mk')].forEach((m, k) => {
      m.style.setProperty('--mk', out3(clamp((t - t0 - 0.7 - k * 0.35) / 0.55)).toFixed(3));
    });
  }
}

// Смена слова: вариант держится 2,2 с, сменщик поднимается снизу за 0,45 с, прежний уходит вверх;
// на последнем варианте строка останавливается.
function rotate(t) {
  for (const r of document.querySelectorAll('.rot')) {
    const words = [...r.children], n = words.length, t0 = 1.0, period = 2.2;
    const k = Math.min(n - 1, Math.max(0, Math.floor((t - t0) / period)));
    const since = t - t0 - k * period;
    const e = k === 0 && t < t0 ? 1 : out3(clamp(since / 0.45));
    // Жидкая смена (\`swap: morph\`): слова не едут, а перетекают — уходящее расплывается, новое
    // собирается из размытия, порог прозрачности склеивает их, как капли.
    const morph = r.closest('[data-swap="morph"]');
    words.forEach((w, i) => {
      let y = 110, o = 0, b = 0;
      if (i === k) { y = (1 - e) * 110; o = e; b = (1 - e) * 10; }
      else if (i === k - 1 && e < 1) { y = -e * 110; o = 1 - e; b = e * 10; }
      w.style.transform = morph ? 'none' : 'translateY(' + y.toFixed(1) + '%)';
      w.style.opacity = o.toFixed(3);
      w.style.filter = morph && b > 0.05 ? 'blur(' + b.toFixed(2) + 'px)' : 'none';
    });
    if (morph) r.style.filter = e < 1 && k > 0 ? 'url(#sc-goo)' : 'none';
  }
}

// Кольцо карточек: N карточек на окружности (радиус — половина ширины карточки на тангенс π/N),
// кольцо поворачивается к карточке на её моменте, на пружине. Трёхмерно с первого кадра до последнего.
function ring(t) {
  for (const rot of document.querySelectorAll('.ring3-rot')) {
    const cards = [...rot.children], n = cards.length, w = rot.clientWidth || 420;
    const step = Math.min(360 / n, 38), tz = (w / 2) / Math.tan(step * Math.PI / 360) + 40;
    cards.forEach((c, i) => { c.style.transform = 'rotateY(' + (i * step).toFixed(3) + 'deg) translateZ(' + tz.toFixed(1) + 'px)'; });
    let turn = 0;
    for (let i = 1; i < n; i++) turn += spring(clamp((t - start(cards[i])) / 0.9));
    // Кольцо ещё и чуть плывёт, чтобы кадр жил на удержании.
    const drift = Math.sin(t * 0.5) * 3;
    rot.style.transform = 'translateZ(' + (-tz).toFixed(1) + 'px) rotateX(-6deg) rotateY(' + (-turn * step + drift).toFixed(3) + 'deg)';
  }
}

// Глобус: ~2400 точек по спирали Фибоначчи, вращение вокруг оси, наклон 20°; дуги по большому кругу
// с подъёмом над поверхностью, прорисовка 1,2 с; пинг в точке прихода; подписи — по проекции.
const GLB = new WeakMap();
function globe(t) {
  for (const cv of document.querySelectorAll('.globe-cv')) {
    let st = GLB.get(cv);
    if (!st) {
      const dpr = window.devicePixelRatio || 1;
      cv.width = Math.max(2, Math.round(cv.clientWidth * dpr)); cv.height = Math.max(2, Math.round(cv.clientHeight * dpr));
      const gl = cv.getContext('webgl', { preserveDrawingBuffer: true, antialias: true, premultipliedAlpha: false });
      st = { gl };
      if (gl) {
        const sh = (type, src) => { const x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x); return x; };
        const prog = gl.createProgram();
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec3 p;uniform mat3 R;uniform vec2 K;uniform float S;varying float f;'
          + 'void main(){vec3 q=R*p;f=q.z;gl_Position=vec4(q.x*K.x,q.y*K.y,-q.z*0.3,1.0);gl_PointSize=S;}'));
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, 'precision mediump float;uniform vec3 C;uniform float A,H;varying float f;'
          + 'void main(){vec2 c=gl_PointCoord-0.5;float d=length(c);if(d>0.5||(H>0.0&&d<0.5-H))discard;'
          + 'if(f<0.0)discard;gl_FragColor=vec4(C,A);}'));
        gl.linkProgram(prog); gl.useProgram(prog);
        // Плоская карта (\`map: flat\`): точки на сетке широт и долгот через 4°, дуги — те же дуги большого
        // круга, развёрнутые на плоскость и поднятые над ней; z = 1, чтобы шейдер их не отбрасывал.
        const flat = cv.dataset.map === 'flat';
        const plane = (p) => { const lat = Math.asin(Math.max(-1, Math.min(1, p[1] / (Math.hypot(p[0], p[1], p[2]) || 1)))), lon = Math.atan2(p[0], p[2]); return [lon / Math.PI, lat / Math.PI, 1]; };
        const dots = [];
        let N = 2400;
        if (flat) { N = 0; for (let la = -84; la <= 84; la += 4) for (let lo = -178; lo <= 178; lo += 4) { dots.push(lo / 180, la / 180, 1); N++; } }
        else for (let i = 0; i < N; i++) { const y = 1 - (i + 0.5) / N * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996323; dots.push(Math.cos(a) * r, y, Math.sin(a) * r); }
        const buf = (arr) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.DYNAMIC_DRAW); return b; };
        const xyz = (lat, lon) => { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)]; };
        const cities = JSON.parse(cv.dataset.cities).map(([la, lo]) => xyz(la, lo));
        const arcs = cities.slice(1).map((b) => {
          const a = cities[0], pts = [], dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])), om = Math.acos(dot) || 1e-4;
          for (let k = 0; k <= 160; k++) { const s = k / 160, s1 = Math.sin((1 - s) * om) / Math.sin(om), s2 = Math.sin(s * om) / Math.sin(om), lift = 1 + 0.22 * Math.sin(Math.PI * s) * om / 2;
            const q = [(a[0] * s1 + b[0] * s2) * lift, (a[1] * s1 + b[1] * s2) * lift, (a[2] * s1 + b[2] * s2) * lift];
            if (flat) { const f = plane(q); pts.push(f[0], f[1] + 0.12 * Math.sin(Math.PI * s) * om / Math.PI, 1); } else pts.push(q[0], q[1], q[2]); }
          return pts;
        });
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        const shown = flat ? cities.map(plane) : cities;
        st = { gl, prog, dots: buf(dots), N, arcs: arcs.map(buf), cities: shown, flat, city: buf(shown.flat()),
          P: gl.getAttribLocation(prog, 'p'), R: gl.getUniformLocation(prog, 'R'), K: gl.getUniformLocation(prog, 'K'), S: gl.getUniformLocation(prog, 'S'),
          C: gl.getUniformLocation(prog, 'C'), A: gl.getUniformLocation(prog, 'A'), H: gl.getUniformLocation(prog, 'H') };
      }
      GLB.set(cv, st);
    }
    const gl = st.gl;
    if (!gl) { document.body.dataset.screenRenderer = 'fallback'; continue; }
    const hub = st.cities[0], lon0 = Math.atan2(hub[0], hub[2]);
    const yaw = -lon0 + 0.5 - t * 0.12, tilt = 0.35;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(tilt), sx = Math.sin(tilt);
    // R = Rx(tilt) * Ry(yaw), по столбцам; плоская карта не вращается.
    const R = st.flat ? [1, 0, 0, 0, 1, 0, 0, 0, 1] : [cy, sx * sy, -cx * sy, 0, cx, sx, sy, -sx * cy, cx * cy];
    const rot = (p) => [R[0] * p[0] + R[3] * p[1] + R[6] * p[2], R[1] * p[0] + R[4] * p[1] + R[7] * p[2], R[2] * p[0] + R[5] * p[1] + R[8] * p[2]];
    const asp = cv.width / cv.height, k = 0.86;
    // Карта вдвое шире своей высоты: она вписывается в холст целиком, без растяжения.
    const kf = Math.min(0.95, 1.9 / asp), K = st.flat ? [kf, kf * asp] : asp > 1 ? [k / asp, k] : [k, k * asp];
    gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniformMatrix3fv(st.R, false, new Float32Array(R)); gl.uniform2fv(st.K, new Float32Array(K));
    const dpr = window.devicePixelRatio || 1;
    const draw = (b, count, mode, size, color, alpha, hollow) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(st.P); gl.vertexAttribPointer(st.P, 3, gl.FLOAT, false, 0, 0);
      gl.uniform1f(st.S, size * dpr); gl.uniform3fv(st.C, color); gl.uniform1f(st.A, alpha); gl.uniform1f(st.H, hollow || 0);
      gl.drawArrays(mode, 0, count);
    };
    draw(st.dots, st.N, gl.POINTS, 3.4, colorOf('--mut'), 0.85);
    const labels = [...cv.parentElement.querySelectorAll('.globe-l')];
    const t0s = labels.map(start);
    st.arcs.forEach((b, i) => {
      const e = inOut(clamp((t - t0s[i + 1]) / 1.2));
      if (e > 0) draw(b, Math.max(1, Math.round(161 * e)), gl.POINTS, 4.2, colorOf('--acc'), 0.95);
    });
    // Пинги: точка города и кольцо, которое расходится, когда дуга пришла (у первого — сразу).
    st.cities.forEach((c, i) => {
      const since = t - (i ? t0s[i] + 1.2 : t0s[0]);
      if (since < 0) return;
      const one = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, one); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(c), gl.DYNAMIC_DRAW);
      draw(one, 1, gl.POINTS, 12, colorOf('--acc'), 1);
      const q = (since % 1.4) / 1.4;
      draw(one, 1, gl.POINTS, 12 + 60 * out3(q), colorOf('--acc'), (1 - q) * 0.9, 0.08);
      gl.deleteBuffer(one);
    });
    labels.forEach((l, i) => {
      const p = rot(st.cities[i]), since = t - (i ? t0s[i] + 1.2 : t0s[0]);
      const x = (p[0] * K[0] + 1) / 2 * cv.clientWidth, y = (1 - p[1] * K[1]) / 2 * cv.clientHeight;
      l.style.transform = 'translate(' + (x + 14).toFixed(1) + 'px,' + (y - 44).toFixed(1) + 'px)';
      l.style.opacity = (p[2] > 0 ? clamp(since / 0.4) : 0).toFixed(3);
    });
    if (gl.getError() === gl.NO_ERROR) document.body.dataset.screenRenderer = 'webgl';
  }
}

// Кусочно-линейная кривая по точкам [доля, значение].
const curve = (pts, p) => {
  if (p <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (p <= pts[i][0]) { const [a, va] = pts[i - 1], [b, vb] = pts[i]; return va + (vb - va) * (p - a) / (b - a); }
  }
  return pts[pts.length - 1][1];
};
const SHAKE = [[0, 0, 0], [0.15, -14, 6], [0.3, 11, -8], [0.45, -8, 4], [0.6, 6, -3], [0.8, -2, 1], [1, 0, 0]];
function embers(root, t) {
  root.querySelectorAll('.card-embers i').forEach((e) => {
    const q = (t - Number(e.dataset.delay)) / 3;
    const op = q <= 0 || q >= 1 ? 0 : q < 0.15 ? q / 0.15 * 0.9 : 0.9 * (1 - (q - 0.15) / 0.85);
    e.style.left = e.dataset.x + '%'; e.style.top = e.dataset.y + '%';
    e.style.opacity = op.toFixed(3);
    e.style.transform = 'translate(' + (clamp(q) * Number(e.dataset.dx)).toFixed(1) + 'px,' + (-clamp(q) * 420).toFixed(1) + 'px)';
  });
}
function cards(t) {
  const card = document.querySelector('.k-card');
  if (card) {
    const t0 = Number(card.dataset.at || 0.1);
    const stage = card.querySelector('.card-stage'), word = card.querySelector('.card-word');
    const p = clamp((t - t0) / 0.3);
    const sc = curve([[0, 1.9], [0.55, 0.97], [0.75, 1.015], [1, 1]], p);
    word.style.opacity = curve([[0, 0], [0.55, 1], [1, 1]], p).toFixed(3);
    word.style.filter = 'blur(' + curve([[0, 18], [0.55, 0], [1, 0]], p).toFixed(2) + 'px)';
    const sweep = clamp((t - t0 - 0.25) / 1.1);
    word.style.backgroundPosition = (160 - 220 * sweep).toFixed(1) + '% 0,0 0';
    const k = clamp((t - t0 - 0.16) / 0.32);
    const sx = k > 0 && k < 1 ? curve(SHAKE.map((r) => [r[0], r[1]]), k) : 0, sy = k > 0 && k < 1 ? curve(SHAKE.map((r) => [r[0], r[2]]), k) : 0;
    card.querySelector('.card-shake').style.transform = 'translate(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px) scale(' + sc.toFixed(4) + ')';
    stage.style.transform = 'scale(' + (1 + 0.06 * clamp(t / dur())).toFixed(4) + ')';
    const f = (t - t0 - 0.12) / 0.34;
    card.querySelector('.card-flash').style.opacity = (f <= 0 || f >= 1 ? 0 : curve([[0, 0], [0.4, 0.75], [1, 0]], f)).toFixed(3);
    embers(card, t - t0);
  }
  const tc = document.querySelector('.k-tcard');
  if (tc) {
    const t0 = Number(tc.dataset.at || 0.05);
    const name = tc.querySelector('.tc-name'), stage = tc.querySelector('.card-stage');
    const r = out3(clamp((t - t0) / 1.1));
    name.style.opacity = r.toFixed(3);
    name.style.filter = 'blur(' + ((1 - r) * 22).toFixed(2) + 'px)';
    name.style.transform = 'scale(' + (1.12 - 0.12 * r).toFixed(4) + ')';
    name.style.backgroundPosition = (170 - 240 * inOut(clamp((t - t0 - 1.1) / 1.8))).toFixed(1) + '% 0,0 0';
    for (const [sel, from] of [['.tc-kicker', 0.2], ['.tc-date', 1.4]]) {
      const e = tc.querySelector(sel);
      if (e) e.style.opacity = out3(clamp((t - t0 - from) / 0.8)).toFixed(3);
    }
    const fl = clamp((t - t0 - 0.9) / 1.6), flare = tc.querySelector('.tc-flare');
    flare.style.opacity = (fl <= 0 ? 0 : curve([[0, 0], [0.25, 1], [1, 0]], fl)).toFixed(3);
    flare.style.transform = 'scaleX(' + curve([[0, 0.1], [0.25, 1], [1, 1.3]], fl).toFixed(3) + ')';
    stage.style.transform = 'scale(' + (1 + 0.07 * clamp(t / dur())).toFixed(4) + ')';
    embers(tc, t - t0);
  }
}

// Содержимое вписывается в поля один раз, до первого кадра. Четыре пункта в две строки с
// надзаголовком выше поля между краями: колонка по центру вылезала бы и вверх (надзаголовок за
// край кадра), и вниз (последний пункт под субтитрами). Колонка уменьшается целиком — и кегль, и
// промежутки, — но не мельче FIT_MIN: мельче текст с экрана не читается, и тогда страница
// записывает, на сколько точек сетки не хватило места (\`data-overflow\`), а сборка называет сцену.
// Меряется раскладка до въезда элементов, поэтому величина одинакова в каждом кадре.
const FIT_MIN = 0.72;
function fitContent() {
  const box = document.querySelector('.k-in') || document.body;
  const flow = [...box.children].filter((c) => {
    const cs = getComputedStyle(c);
    return cs.position !== 'absolute' && cs.position !== 'fixed' && cs.display !== 'none';
  });
  if (!flow.length) return;
  // Анимация входа меняет экранный прямоугольник, но не место в раскладке: полноразмерный
  // снимок начинается с scale(1.16), и измерение принимало этот временный наезд за overflow.
  // На время мерки выключаем трансформации столбца и его прямых детей; кадр их не теряет.
  const nodes = [box, ...flow], transforms = nodes.map((c) => c.style.transform);
  nodes.forEach((c) => { c.style.transform = 'none'; });
  const cs = getComputedStyle(box);
  // Переполнение — то, что колонка на деле вылезла за край поля сверху или снизу. Сравнивать
  // высоту содержимого с полем нельзя: у гибкого блока (плоскость графика) высота и есть поле.
  // По ширине — так же: слово заголовка, которое шире поля, не переносится и уводит колонку за
  // правый край поля, в безопасную зону формата, а облёт камеры — и за неё. Колонка уменьшается,
  // пока не встанет в поле и по ширине.
  const over = () => {
    const r = box.getBoundingClientRect(), k = r.height / (box.offsetHeight || 1);
    const top = r.top + parseFloat(cs.paddingTop) * k, bottom = r.bottom - parseFloat(cs.paddingBottom) * k;
    const left = r.left + parseFloat(cs.paddingLeft) * k, right = r.right - parseFloat(cs.paddingRight) * k;
    const rects = flow.map((c) => c.getBoundingClientRect());
    const first = Math.min(...rects.map((c) => c.top)), last = Math.max(...rects.map((c) => c.bottom));
    const west = Math.min(...rects.map((c) => c.left)), east = Math.max(...rects.map((c) => c.right));
    const px = Math.max(0, top - first) + Math.max(0, last - bottom), wide = Math.max(0, left - west) + Math.max(0, east - right);
    return { px: px + wide, share: Math.min((bottom - top) / (bottom - top + px), (right - left) / (right - left + wide)), room: bottom - top, k };
  };
  let z = 1;
  for (let i = 0; i < 4; i++) {
    const o = over();
    if (o.px <= 0.5) break;
    z = Math.max(FIT_MIN, z * o.share * 0.995);
    for (const c of flow) c.style.zoom = String(z);
    if (z === FIT_MIN) break;
  }
  document.body.dataset.fit = z.toFixed(3);
  const left = over();
  if (left.px > 0.5) document.body.dataset.overflow = String(Math.round(left.px / left.k));
  else delete document.body.dataset.overflow;
  nodes.forEach((c, i) => { c.style.transform = transforms[i]; });
}
fitContent();
// Шрифты темы приходят со слоем композиции уже после загрузки страницы: рендер, дождавшись их,
// меряет колонку заново — первая мерка была по запасному шрифту другой ширины.
window.__refit = () => {
  const box = document.querySelector('.k-in') || document.body;
  for (const c of box.children) c.style.zoom = '';
  fitContent();
  fitCards();
};

// Набор заголовка и тела (\`data-type\`) ведёт слой композиции: он раскладывает
// текст целиком и скрывает ненабранное на своих местах, поэтому переносы
// не прыгают.
// Свечение по рамке (\`glow: border\`): блик обходит рамку карточки за четыре секунды.
function glow(t) {
  if (document.body.dataset.glow !== 'border') return;
  document.body.style.setProperty('--glow-a', ((t * 90) % 360).toFixed(2) + 'deg');
}

window.renderAt = (t) => {
  enter(t);
  glow(t);
  count(t);
  type(t);
  progressLines(t);
  chart(t);
  beforeAfter(t);
  parallax(t);
  layers(t);
  race(t);
  spark(t);
  beams(t);
  depth(t);
  perspective(t);
  kenBurns(t);
  move(t);
  ambient(t);
  chapter(t);
  cards(t);
  rotate(t);
  marks(t);
  wall(t);
  cloud(t);
  terminal(t);
  fills(t);
  marquee(t);
  stack(t);
  orbit(t);
  chat(t);
  ring(t);
  globe(t);
};
window.renderAt(0);
})();
`;
