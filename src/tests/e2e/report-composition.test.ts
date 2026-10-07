import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { REPORT_COMPOSITION_BRIDGE } from "../../report-composition.js";
const HERE=dirname(fileURLToPath(import.meta.url));
test("report cues bind to measured speech, remount cleanly, reject absent beats and leave ordinary pages alone",async()=>{
 const browser=await chromium.launch();
 try {
  const page=await browser.newPage();
  await page.addInitScript({content:readFileSync(resolve(HERE,"../../browser/clock.js"),"utf8")});
  await page.addInitScript({content:readFileSync(resolve(HERE,"../../browser/stage.js"),"utf8")+"\n"+REPORT_COMPOSITION_BRIDGE});
  await page.goto('about:blank');
  const result=await page.evaluate(()=>{
   const host=window as unknown as {__stage:{mount(s:unknown):void};__reportComposition?:{anchors():string[];bind(f:(a:string)=>number):void}};
   host.__stage.mount({duration:20,starts:[0,7,13],beats:3});
   const times:number[][]=[];
   host.__reportComposition={anchors:()=>['b2','b3.end','b2+0.2'],bind:f=>times.push(['b2','b3.end','b2+0.2'].map(f))};
   host.__stage.mount({duration:20,spoken:18,starts:[0,7,13],beats:3});
   host.__stage.mount({duration:16,spoken:14,starts:[0,4,9],beats:3});
   let error='';try{host.__stage.mount({duration:4,starts:[0],beats:1});}catch(e){error=String(e);}
   return {times,error};
  });
  assert.deepEqual(result.times,[[7,18,7.2],[4,14,4.2]]);
  assert.match(result.error,/speech beat this scene does not have/u);
 } finally {await browser.close();}
});

test("a selected composition frames its whole stage and excludes surrounding report prose", async () => {
 const browser=await chromium.launch();
 try {
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.addInitScript({content:readFileSync(resolve(HERE,"../../browser/clock.js"),"utf8")});
  await page.addInitScript({content:readFileSync(resolve(HERE,"../../browser/stage.js"),"utf8")+"\n"+REPORT_COMPOSITION_BRIDGE});
  await page.goto('about:blank');
  const result=await page.evaluate(()=>{
   document.body.innerHTML='<h1 id="chrome" style="height:1600px">Page introduction</h1><section id="picture" data-semantic="composition" style="width:1000px;height:450px;margin:30px"><div style="height:100%">All named objects</div></section><p>Source links and attribution</p>';
   const host=window as unknown as {__stage:{mount(s:unknown):void;renderAt(t:number):void};__reportComposition:{anchors():string[];bind(f:(a:string)=>number):void}};
   host.__reportComposition={anchors:()=>[],bind:()=>{}};
   host.__stage.mount({target:'#picture',duration:8,effects:{zoom:{scale:1}}});host.__stage.renderAt(0);
   const node=document.querySelector('#picture')!;const r=node.getBoundingClientRect();
   const parent=node.closest<HTMLElement>('#__zoom') ?? node.parentElement!;
   const child=node.querySelector<HTMLElement>('div')!;
   child.style.transform='translateX(150px)';host.__stage.renderAt(2);
   const moved=child.getBoundingClientRect();
   host.__stage.renderAt(0);const restored=node.getBoundingClientRect();
   return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,clip:getComputedStyle(parent).clipPath,movedRight:moved.right,restoredTop:restored.top,restoredBottom:restored.bottom};
  });
  assert.ok(result.left>=0 && result.right<=1280 && result.top>=0 && result.bottom<650);
  assert.ok(result.width>1100);assert.notEqual(result.clip,'none');
  assert.ok(result.movedRight<=1280, 'a moving object remains inside the shot');
  assert.ok(result.restoredTop>=0 && result.restoredBottom<650, 'a later composition stays fully in frame after scrolling and backward seeking');
 } finally {await browser.close();}
});
