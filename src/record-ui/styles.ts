// Оформление страницы записи. Строкой, а не файлом стилей: страница
// одна, и лишний запрос за файлом ради двух десятков правил не окупается.
export const styles = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #0b0f14; color: #e8eef6;
         font: 16px/1.6 -apple-system, "Segoe UI", system-ui, sans-serif; }
  .wrap { max-width: 880px; margin: 0 auto; padding: 40px 24px 72px; }
  h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: .2px; }
  .sub { color: #93a4b8; margin: 0 0 24px; font-size: 14px; }
  code { font-family: ui-monospace, SFMono-Regular, monospace; font-size: 13px; color: #cbd5e1; }

  nav { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; }
  .chip { font: inherit; font-size: 13px; padding: 5px 11px; border-radius: 999px;
          border: 1px solid #1e293b; background: #111823; color: #93a4b8; cursor: pointer; }
  .chip.done { color: #4ade80; border-color: #14532d; }
  .chip.here { background: #3b82f6; border-color: #3b82f6; color: #fff; }

  figure { margin: 0 0 18px; }
  figure img { width: 100%; border-radius: 12px; border: 1px solid #1e293b;
               background: #0f172a; display: block; }
  figcaption { color: #93a4b8; font-size: 13px; margin-top: 8px; }

  blockquote { margin: 0 0 14px; padding: 16px 18px; border-radius: 12px;
               background: #111823; border: 1px solid #1e293b; font-size: 18px; line-height: 1.55; }
  .pace { color: #cbd5e1; margin: 0 0 18px; font-size: 14px; }
  .pace b { color: #e8eef6; }

  /* Такты сцены: каждый со своей репликой, своим ориентиром и своими
     кнопками. Записываемый выделен — иначе на длинной сцене не видно,
     куда сейчас уходит голос. */
  .beats { list-style: none; margin: 0; padding: 0; }
  .beat { border-left: 3px solid #1e293b; padding-left: 14px; margin-bottom: 22px; }
  .beat.done { border-left-color: #14532d; }
  .beat.live { border-left-color: #ef4444; }

  .row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .row.nav { margin-top: 28px; }
  .row.preview { margin-bottom: 14px; }
  .row.preview .build { background: #0f766e; border-color: #0f766e; color: #fff; }
  .preview-video { width: 100%; border-radius: 12px; border: 1px solid #1e293b;
                   background: #000; display: block; margin-bottom: 18px; }
  .row.mics { margin-bottom: 14px; }
  .row.mics label { color: #93a4b8; font-size: 14px; }
  .row.mics select { background: #0f1621; color: #e8eef6; border: 1px solid #25303f;
    border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 14px; max-width: 420px; }
  .row.mics select:disabled { opacity: .5; }
  .row.mics .grant { background: #1d4ed8; border-color: #1d4ed8; }
  button { font: inherit; padding: 11px 18px; border-radius: 10px; border: 1px solid #1e293b;
           background: #111823; color: #e8eef6; cursor: pointer; }
  button:disabled { opacity: .45; cursor: default; }
  .rec { background: #3b82f6; border-color: #3b82f6; color: #fff; }
  .stop { background: #ef4444; border-color: #ef4444; color: #fff; }
  .drop { color: #f87171; }
  audio { height: 36px; }

  .error { margin-top: 16px; padding: 12px 14px; border-radius: 10px;
           background: #2a1215; border: 1px solid #7f1d1d; color: #fecaca; font-size: 14px; }

  @media (max-width: 600px) { .wrap { padding: 24px 14px 56px; } blockquote { font-size: 16px; } }
`;
