// `craft <тема>` отдаёт правила базы для решения: номер, заголовок и формулировку из самого
// docs/film-craft.md. Каждая тема разрешается в существующие правила, находка — в своё правило,
// неизвестная тема — ошибка с перечнем тем.
import { test } from "node:test";
import assert from "node:assert/strict";
import { craft, TOPICS } from "../../craft.js";
import { RULES } from "../../rules.js";

test("every craft topic gives 3–7 film-craft rules with a title and a statement", () => {
  for (const topic of Object.keys(TOPICS)) {
    const rules = craft(topic);
    assert.ok(rules.length >= 3 && rules.length <= 7, `${topic}: ${rules.length}`);
    for (const r of rules) {
      assert.match(r.rule, /^FC-\d+$/u);
      assert.ok(r.title.length > 5 && r.text.length > 40, `${topic} ${r.rule}: ${r.title} / ${r.text.slice(0, 40)}`);
      assert.ok(!r.text.startsWith("**Counter-example"), `${topic} ${r.rule} takes the rule, not its counter-example`);
    }
  }
  for (const t of ["spotlight", "vertical", "trailer"]) assert.ok(craft(t).length >= 3, t);
});

test("a finding's id gives its own rule, and an unknown topic is an error naming the topics", () => {
  assert.deepEqual(craft("still-scene").map((r) => r.rule), [RULES["still-scene"]]);
  assert.throws(() => craft("nope"), /spotlight/u);
});
