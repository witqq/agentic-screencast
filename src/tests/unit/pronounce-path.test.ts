// Путь к правилам чтения пишут и без кавычек. Прежде `pronounce: rules.json` падал в lint стеком Node
// (JSON.parse), хотя это обычная строка пути.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseSource } from "../../source.js";

test("pronounce takes a bare path as well as a quoted one", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-pron-"));
  for (const v of ["rules.json", '"rules.json"']) {
    writeFileSync(join(dir, "story.md"), `# T\nvoice: {"engine":"stub","name":"silent"}\npronounce: ${v}\n\n## a · slides.hero\ntitle: Hi\nduration: 2\n`);
    assert.equal(parseSource(join(dir, "story.md")).pronounce, "rules.json");
  }
});
