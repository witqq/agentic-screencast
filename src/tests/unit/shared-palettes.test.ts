// Общий файл палитр agentic-report и agentic-screencast: у обоих продуктов одна копия файла, и
// каждая общая тема в каждой схеме повторяет его роли без расхождений. Файл меняется только по
// согласию обоих: новая сумма пишется здесь и у agentic-report в одном и том же изменении.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PRODUCT_ROOT } from "../../self-hash.js";
import { PALETTE_FILE, PALETTE_ROLES, SHARED_PALETTES, THEME_SCHEMES, paletteDrift } from "../../theme.js";

/** Сумма согласованной редакции файла, та же у agentic-report. */
const AGREED_SHA256 = "2bd98051d0ed727c3eec0ae887b35f99a6fbac3a27dbf746a7daa2b168da49ce";

test("the shared palette file is the agreed edition, and the build's copy is that file", () => {
  const sum = (file: string): string => createHash("sha256").update(readFileSync(file)).digest("hex");
  assert.equal(sum(resolve(PRODUCT_ROOT, "assets", "palettes", "shared-palettes.json")), AGREED_SHA256);
  assert.equal(sum(PALETTE_FILE), AGREED_SHA256);
});

test("every shared theme has both schemes and repeats the file's roles: 0 divergence", () => {
  assert.equal(Object.keys(SHARED_PALETTES).length, 11);
  assert.deepEqual(paletteDrift(), []);
});

test("the check is red on a planted divergence in a theme and in the file", () => {
  const schemes = structuredClone(THEME_SCHEMES);
  schemes.midnight!.light!["--acc"] = "#123456";
  assert.deepEqual(paletteDrift(schemes), [`midnight light accent (--acc): #123456 ≠ ${SHARED_PALETTES.midnight!.light.accent}`]);
  const palettes = structuredClone(SHARED_PALETTES);
  palettes.noir!.dark._film["sc-accent-soft"] = "rgba(0,0,0,0.42)";
  assert.equal(paletteDrift(THEME_SCHEMES, palettes).length, 1);
  const lacking = structuredClone(THEME_SCHEMES);
  delete lacking.terminal!.light;
  assert.deepEqual(paletteDrift(lacking), ["terminal light: no such scheme"]);
});

test("the roles compared are the colour rows of the token map both products keep", () => {
  const doc = readFileSync(resolve(PRODUCT_ROOT, "docs", "theme-tokens.md"), "utf8");
  for (const [, token] of PALETTE_ROLES) assert.match(doc, new RegExp(`\\| \`${token}\` \\|`, "u"), `docs/theme-tokens.md maps ${token}`);
});
