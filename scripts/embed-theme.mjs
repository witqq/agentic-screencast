#!/usr/bin/env node
// Слой композиции (dist/browser/stage.js) исполняется в странице и ничего не импортирует. Тема,
// с которой он рисует, приходит со сценой; сцена без темы (прямой вызов слоя из проверки или
// теста) получает ночную тему — ту же, что носит ролик без темы. Её набор берётся из таблицы тем
// (dist/theme.js) при сборке, а не записывается второй копией в коде слоя.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dist = resolve(process.argv[2] ?? "dist");
const { resolveTheme } = await import(resolve(dist, "theme.js"));
const file = resolve(dist, "browser/stage.js");
const body = readFileSync(file, "utf8").replace(/^window\.__scThemeDefault = .*\n/u, "");
writeFileSync(file, `window.__scThemeDefault = ${JSON.stringify(resolveTheme(undefined))};\n${body}`);
