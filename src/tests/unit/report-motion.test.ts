import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { reportMotion } from "../../report-motion.js";
import { lint } from "../../lint.js";

test("report directing advice counts real selected cues, not code examples, empty stages or future actions", () => {
 const dir=mkdtempSync(join(tmpdir(),"sc-report-motion-")), file=join(dir,"report.md");
 const cue='::cue{at="b2" action="copy" target="source" to="result"}';
 const composition=(inside:string)=>`::::composition{id="edit"}\n${inside}\n::::`;
 const check=()=>reportMotion(file,'[data-composition-id="edit"]',8,[0,3],[3,7]);
 writeFileSync(file,composition(cue));assert.equal(check(),true);
 assert.equal(reportMotion(file,'#other',8,[0,3],[3,7]),false);
 writeFileSync(file,composition(cue.replace('b2','99')));assert.equal(check(),false);
 writeFileSync(file,composition(''));assert.equal(check(),false);
 writeFileSync(file,'```markdown\n'+composition(cue)+'\n```');assert.equal(check(),false);
 writeFileSync(file,'<!-- '+composition(cue)+' -->');assert.equal(check(),false);
 writeFileSync(file,'motion: none\n'+composition(cue));assert.equal(check(),false);
 writeFileSync(join(dir,'partial.md'),cue);
 writeFileSync(file,composition('{{include: partial.md}}'));assert.equal(check(),true);
 const story=join(dir,'story.md');
 writeFileSync(story,'# Directed\nlang: en\nvoice: {"engine":"stub","name":"silent"}\n\n## edit · report\nreport: report.md\ntarget: [data-composition-id="edit"]\nzoom: 1\nduration: 8\n\nOne beat.\n\nThe change happens.\n');
 assert.equal(lint(story).some(f=>f.id==='still-scene'),false);
 writeFileSync(file,composition(''));
 assert.equal(lint(story).some(f=>f.id==='still-scene'),true);
});
