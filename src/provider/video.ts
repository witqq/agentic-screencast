// Поставщик готового видео: материал сцены — видеофайл.
//
// Ядро о нём знает ровно то же, что о странице: чем сцена нарисована,
// решает поставщик. Разница только в том, что кадры не рисуются, а берутся
// из файла; сборка этим и занимается.
import type { KindSpec, Provider } from "./types.js";

const clip: KindSpec = {
  about: "готовый видеофайл вместо нарисованной страницы",
  fields: ["file", "at"],
  required: [["file"]],
  fileField: "file",
  video: true,
  silentOk: true,
  // Видеофайл не двигают и не подсвечивают: он уже смонтирован.
  // Остаётся только переход на входе и выходе сцены.
  effects: { fade: { in: 0.3, out: 0.3 } },
};

export const videoProvider: Provider = {
  name: "video",
  kinds: () => ({ video: clip }),
};
