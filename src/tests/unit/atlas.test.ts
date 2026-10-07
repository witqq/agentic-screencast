import { test } from "node:test";
import assert from "node:assert/strict";
import { atlasCatalog, atlasMarkdown } from "../../atlas.js";
import { allKinds, FIELD_FORMATS } from "../../schema.js";
import { parseOverlay } from "../../overlay.js";

test("atlas discovers every registered kind and exact overlay keys; unknown keys remain refused",()=>{
 const c=atlasCatalog();
 assert.equal(c.kinds.length,allKinds().length);
 assert.deepEqual(c.fields,FIELD_FORMATS);
 assert.ok(c.overlay.titles?.includes('style'));
 assert.ok(c.overlay.actions?.includes('order'));
 const valid={titles:[{at:1,text:'Result',style:'fade'}]};
 assert.throws(()=>parseOverlay(JSON.stringify(valid)),/expected/u);
 assert.doesNotThrow(()=>parseOverlay(JSON.stringify({titles:[{at:1,text:'Result',style:'rise'}]})));
 assert.throws(()=>parseOverlay(JSON.stringify({titles:[{at:1,text:'Result',invented:'fade'}]})),/invented/u);
 for(const kind of c.kinds)assert.ok(atlasMarkdown().includes('`'+kind.name+'`'));
 assert.ok(c.examples.includes('example/story.md'));
 assert.equal(c.templates.length,6);
});
