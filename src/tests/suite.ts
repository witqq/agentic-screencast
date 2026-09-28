#!/usr/bin/env node
// Набор проверок продукта. Одна команда, один код возврата.
//
// Зелёное — все проверки прошли. Красное — хотя бы одна не прошла,
// и код возврата ненулевой: в чужих сценариях «нет такого провайдера»
// не должно быть неотличимо от успеха.
//
// Проверки разложены по классам в suite/*.ts; модули идут по порядку, потому что проверка команд
// README засчитывает строки, которые уже запустило ядро.
import { results } from "./suite/common.js";

await import("./suite/core.js");
await import("./suite/docs.js");
await import("./suite/package.js");
await import("./suite/voice.js");
await import("./suite/film.js");

const bad = results.filter((r) => !r[1]);
for (const [name, ok, why] of results) console.log(`${ok ? "  ok  " : "ПРОВАЛ"}  ${name}${why ? " — " + why : ""}`);
console.log(`\n${results.length - bad.length} из ${results.length} проверок зелены`);
process.exit(bad.length ? 1 : 0);
