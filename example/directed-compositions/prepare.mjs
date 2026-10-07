// Copy editable examples once, then build their reusable preview assets.
import { mkdirSync, existsSync, cpSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
const entry = fileURLToPath(import.meta.resolve('agentic-report'));
const root = resolve(dirname(entry), '../..');
const { buildReport } = await import(pathToFileURL(entry).href);
mkdirSync('reports', {recursive:true}); mkdirSync('assets', {recursive:true});
for (const name of ['first-edit','theme-color','change-event']) {
 const original=resolve(root,'examples',`directed-${name}`), target=resolve('reports',name);
 if (!existsSync(original)) throw new Error('Use an Agentic Report build with directed-composition examples.');
 if (!existsSync(target)) cpSync(original,target,{recursive:true});
 await buildReport({input:resolve(target,'report.md'),output:resolve('assets',`${name}.html`)});
}
const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:1280,height:720},reducedMotion:'reduce'});
 for (const name of ['first-edit','theme-color','change-event']) {
  await page.goto(pathToFileURL(resolve(`assets/${name}.html`)).href);
  await page.evaluate(()=>document.fonts.ready);
  await page.locator(`[data-composition-id="${name}"]`).screenshot({path:resolve(`assets/${name}.png`)});
 }
} finally {await browser.close();}
