import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { buildAtlas } from "../../atlas.js";

test("atlas playback controls stay in the viewport while the scene camera focuses", async () => {
 const dir=mkdtempSync(join(tmpdir(),"sc-atlas-player-"));
 const browser=await chromium.launch();
 try {
  buildAtlas(dir);
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.goto(pathToFileURL(join(dir,"previews/overlay-camera.html")).href);
  await page.evaluate(()=>document.fonts.ready);
  await page.locator("#atlas-play").click();
  await page.locator("#atlas-time").fill("2");
  const rect=await page.locator("#atlas-player").boundingBox();
  assert.ok(rect && rect.x>=0 && rect.y>=0 && rect.x+rect.width<=1280 && rect.y+rect.height<=720,JSON.stringify(rect));
  await page.locator("#atlas-play").click();
  assert.equal(await page.locator("#atlas-play").textContent(),"Pause");
 } finally {await browser.close();rmSync(dir,{recursive:true,force:true});}
});
