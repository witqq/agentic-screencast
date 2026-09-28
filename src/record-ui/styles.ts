// Оформление страницы записи. Строкой, а не файлом стилей: страница
// одна, и лишний запрос за файлом ради двух десятков правил не окупается.
// Цвета, шрифты, радиусы и отступы — токены темы записываемого ролика: сервер кладёт
// её в корень страницы, как слой композиции кладёт тему сцены.
export const styles = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.6 var(--sans); }
  .wrap { max-width: 880px; margin: 0 auto; padding: var(--space-3xl) var(--space-l) var(--space-3xl); }
  h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: .2px; font-family: var(--display); }
  .sub { color: var(--mut); margin: 0 0 24px; font-size: 14px; }
  code { font-family: var(--mono); font-size: 13px; color: var(--body); }

  .skipped { margin: 0 0 24px; padding: var(--space-m); border: var(--hairline) solid var(--line);
             border-radius: var(--radius-sm); background: var(--card); }
  .skipped h2 { margin: 0 0 8px; font: 600 16px var(--display); }
  .skipped ul { margin: 0; padding-left: var(--space-m); color: var(--body); font-size: 14px; }
  .skipped li + li { margin-top: 4px; }

  nav { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; }
  .chip { font: inherit; font-size: 13px; padding: var(--space-xs) var(--space-s); border-radius: var(--radius-pill);
          border: var(--hairline) solid var(--line); background: var(--card); color: var(--mut); cursor: pointer; }
  .chip.done { color: var(--good); border-color: color-mix(in srgb, var(--good) 45%, var(--card)); }
  .chip.here { background: var(--acc); border-color: var(--acc); color: var(--sc-badge-ink); }

  figure { margin: 0 0 18px; }
  figure img { width: 100%; border-radius: var(--radius-sm); border: var(--hairline) solid var(--line);
               background: var(--node); display: block; }
  figcaption { color: var(--mut); font-size: 13px; margin-top: 8px; }

  blockquote { margin: 0 0 14px; padding: var(--space-m); border-radius: var(--radius-sm);
               background: var(--card); border: var(--hairline) solid var(--line); font-size: 18px; line-height: 1.55; }
  .pace { color: var(--body); margin: 0 0 18px; font-size: 14px; }
  .pace b { color: var(--ink); }

  /* Такты сцены: каждый со своей репликой, своим ориентиром и своими
     кнопками. Записываемый выделен — иначе на длинной сцене не видно,
     куда сейчас уходит голос. */
  .beats { list-style: none; margin: 0; padding: 0; }
  .beat { border-left: var(--rule-size) solid var(--line); padding-left: var(--space-s); margin-bottom: 22px; }
  .beat.done { border-left-color: color-mix(in srgb, var(--good) 45%, var(--card)); }
  .beat.live { border-left-color: var(--bad); }

  .row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .row.nav { margin-top: 28px; }
  .row.preview { margin-bottom: 14px; }
  .row.preview .build { background: var(--acc2); border-color: var(--acc2); color: var(--sc-badge-ink); }
  .preview-video { width: 100%; border-radius: var(--radius-sm); border: var(--hairline) solid var(--line);
                   background: var(--sc-letterbox); display: block; margin-bottom: 18px; }
  .row.mics { margin-bottom: 14px; }
  .row.mics label { color: var(--mut); font-size: 14px; }
  .row.mics select { background: var(--node); color: var(--ink); border: var(--hairline) solid var(--node-line);
    border-radius: var(--radius-sm); padding: var(--space-xs) var(--space-s); font: inherit; font-size: 14px; max-width: 420px; }
  .row.mics select:disabled { opacity: .5; }
  .row.mics .grant { background: var(--acc); border-color: var(--acc); color: var(--sc-badge-ink); }
  button { font: inherit; padding: var(--space-s) var(--space-m); border-radius: var(--radius-sm); border: var(--hairline) solid var(--line);
           background: var(--card); color: var(--ink); cursor: pointer; }
  button:disabled { opacity: .45; cursor: default; }
  .rec { background: var(--acc); border-color: var(--acc); color: var(--sc-badge-ink); }
  .stop { background: var(--bad); border-color: var(--bad); color: var(--sc-badge-ink); }
  .drop { color: var(--bad); }
  audio { height: 36px; }

  .error { margin-top: 16px; padding: var(--space-s); border-radius: var(--radius-sm);
           background: color-mix(in srgb, var(--bad) 14%, var(--bg)); border: var(--hairline) solid color-mix(in srgb, var(--bad) 50%, var(--bg));
           color: var(--bad); font-size: 14px; }

  @media (max-width: 600px) { .wrap { padding: var(--space-l) var(--space-s) var(--space-3xl); } blockquote { font-size: 16px; } }
`;
