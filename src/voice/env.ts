// Ключ доступа берётся из окружения, а если его там нет — из `.env`.
// В данные голоса он не кладётся: объект голоса целиком уходит в ключ
// кэша и в печатаемый отчёт сборки, то есть утёк бы в файлы.
//
// Поиск идёт ВВЕРХ от текущего каталога и от каталога продукта, а не
// фиксированными прыжками: прежние «../..» были посчитаны от старого
// места инструмента и после переезда указывали мимо корня проекта,
// причём наружу от него. Проявлялось только при настоящем синтезе:
// пока звук брался из кэша, ключ не запрашивался вовсе.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { msg } from "../msg.js";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Все `.env`, которые имеет смысл просмотреть, от ближнего к дальнему. */
function candidates(): string[] {
  const seen: string[] = [];
  for (const start of [process.cwd(), HERE]) {
    let d = resolve(start);
    for (;;) {
      const p = resolve(d, ".env");
      if (!seen.includes(p)) seen.push(p);
      const parent = dirname(d);
      if (parent === d) break;
      d = parent;
    }
  }
  return seen;
}

/** Значение переменной из окружения либо из `.env`; undefined, если не задана. */
export function envValue(name: string): string | undefined {
  const fromEnv = process.env[name];
  if (fromEnv) return fromEnv;
  for (const p of candidates()) {
    if (!existsSync(p)) continue;
    for (const raw of readFileSync(p, "utf8").split("\n")) {
      const line = raw.trim();
      if (line.startsWith("#") || !line.startsWith(`${name}=`)) continue;
      return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
  return undefined;
}

/** Обязательный ключ: отсутствие переменной возвращает внятный отказ. */
export function envKey(name: string): string {
  const value = envValue(name);
  if (value !== undefined) return value;
  throw new Error(msg("voice.noKey", { name }));
}
