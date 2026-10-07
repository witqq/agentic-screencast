import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { slidesProvider } from '../../provider/slides/index.js';
import { PRODUCT_ROOT } from '../../self-hash.js';

test('slide effects wait for measured anchors before calculating chain geometry', async () => {
 const dir=mkdtempSync(join(tmpdir(),'sc-anchor-init-'));
 const file=slidesProvider.page!({id:'chain',provider:'slides',kind:'chain',caption:'',beats:[],fields:{title:'A causal route',nodes:'Source | Queue | Result',at:'b1 b2 b3'}},dir,{dir,lang:'en',frame:{width:1280,height:720,fps:30,scale:1}});
 const browser=await chromium.launch();
 try {
  const page=await browser.newPage({viewport:{width:1280,height:720}}), errors:string[]=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript({content:readFileSync(join(PRODUCT_ROOT,'dist/browser/clock.js'),'utf8')});
  await page.addInitScript({content:readFileSync(join(PRODUCT_ROOT,'dist/browser/stage.js'),'utf8')});
  await page.goto(pathToFileURL(file).href);
  assert.deepEqual(errors,[], 'an unbound bN must not produce NaN path indices during initial render');
  const result=await page.evaluate(()=>{
   const host=window as unknown as {__stage:{mount(s:unknown):void};__clock:{seek(t:number):void}};
   host.__stage.mount({duration:7,starts:[0,3,5],beats:3,effects:{zoom:{scale:1},spot:{from:9999},caption:{from:9999}}});
   host.__clock.seek(6.2);
   const beam=document.querySelector<HTMLElement>('.beam')!;
   const visible=getComputedStyle(beam).opacity;
   const transform=beam.style.transform;
   host.__clock.seek(0);
   return {visible,transform,restored:getComputedStyle(beam).opacity};
  });
  assert.ok(Number(result.visible)>0);
  assert.match(result.transform,/translate\(/u);
  assert.ok(!result.transform.includes('NaN'));
  assert.equal(result.restored,'0');assert.deepEqual(errors,[]);
 } finally {await browser.close();}
});
