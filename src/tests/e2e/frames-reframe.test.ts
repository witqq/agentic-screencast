import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const ffmpeg = createRequire(import.meta.url)("ffmpeg-static") as string;
const entry = resolve(dirname(fileURLToPath(import.meta.url)), "../../agentic-screencast.js");
const bounds = (file: string, at?: number): number[] => {
  const rgb = execFileSync(ffmpeg, ["-nostdin", "-loglevel", "error", ...(at === undefined ? [] : ["-ss", String(at)]), "-i", file,
    "-frames:v", "1", "-vf", "scale=270:480,format=rgb24", "-f", "rawvideo", "-"], { maxBuffer: 1024 * 1024 });
  let left=270, top=480, right=-1, bottom=-1;
  for(let y=0;y<480;y++)for(let x=0;x<270;x++) {const i=(y*270+x)*3;if(rgb[i+2]!>160&&rgb[i]!<60&&rgb[i+1]!<100){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
  assert.ok(right>left&&bottom>top, "the named blue subject is visible");
  return [left,top,right,bottom];
};

test("landscape capture preview follows the recorded cursor like the encoded film", () => {
 const dir=mkdtempSync(join(tmpdir(),"sc-preview-follow-"));
 try {
  execFileSync(ffmpeg,["-nostdin","-y","-loglevel","error","-f","lavfi","-i","color=c=0x17212b:s=640x360:r=10:d=5","-vf","drawbox=x=520:y=100:w=100:h=120:color=blue:t=fill","-pix_fmt","yuv420p",join(dir,"clip.mp4")]);
  writeFileSync(join(dir,"clip.mp4.marks.json"),JSON.stringify({trimmed:0,marks:{},clicks:[{t:1,x:.3,y:.5}],path:[{t:0,x:.3,y:.5},{t:1.2,x:.3,y:.5},{t:3,x:.9,y:.5},{t:5,x:.9,y:.5}]}));
  writeFileSync(join(dir,"story.md"),`# F\nvoice: {"engine":"stub","name":"silent"}\nframe: {"width":640,"height":360,"fps":10}\naudio: false\n\n## v · video\nfile: clip.mp4\nduration: 5\nfade: none\nautoZoom: {"scale":3,"hold":4,"follow":"cursor"}\n`);
  const run=(...args:string[])=>{const r=spawnSync(process.execPath,[entry,...args],{cwd:dir,encoding:"utf8",env:{...process.env,AGENTIC_SCREENCAST_HOME:join(dir,"cache")}});assert.equal(r.status,0,r.stderr.slice(-1000));};
  run("build","story.md","--out","film.mp4");
  run("frames","story.md","--scene","v","--at","3.5s","--out","preview.png");
  const preview=bounds(join(dir,"preview.png")),final=bounds(join(dir,"film.mp4"),3.5);
  for(let k=0;k<4;k++)assert.ok(Math.abs(preview[k]!-final[k]!)<=3,`following preview ${preview} versus final ${final}`);
 } finally {rmSync(dir,{recursive:true,force:true});}
});

test("portrait frames and build retain the same landscape layout, overview and focused bounds",()=>{
 const dir=mkdtempSync(join(tmpdir(),"sc-preview-reframe-"));
 writeFileSync(join(dir,"page.html"),`<!doctype html><html><body style="margin:0;width:640px;height:360px;background:#17212b"><div style="position:absolute;left:10px;top:100px;width:100px;height:120px;background:red"></div><div id="detail" style="position:absolute;left:520px;top:100px;width:100px;height:120px;background:blue"></div></body></html>`);
 writeFileSync(join(dir,"story.md"),`# F\nvoice: {"engine":"stub","name":"silent"}\nframe: {"width":640,"height":360,"fps":8}\naudio: false\n\n## s · page\npage: page.html\nduration: 3\nzoom: 1\nspotFrom: 999s\nfade: none\noverlay: {"camera":[{"at":1.2,"target":"#detail","scale":1.5,"move":0.6,"hold":1.2,"keep":true,"ring":false,"dim":0}]}\n`);
 const run=(...args:string[])=>{const r=spawnSync(process.execPath,[entry,...args],{cwd:dir,encoding:"utf8",env:{...process.env,AGENTIC_SCREENCAST_HOME:join(dir,"cache")}});assert.equal(r.status,0,r.stderr.slice(-1000));return JSON.parse(r.stdout);};
 run("build","story.md","--format","vertical","--out","film.mp4");
 for(const at of [.5,2.5]) {
  const png=`preview-${at}.png`;run("frames","story.md","--format","vertical","--scene","s","--at",`${at}s`,"--out",png);
  const preview=bounds(join(dir,png)),final=bounds(join(dir,"film.mp4"),at);
  for(let k=0;k<4;k++)assert.ok(Math.abs(preview[k]!-final[k]!)<=3,`at ${at}s preview ${preview} versus final ${final}`);
 }
});

test("sheet every samples exclude the undecodable duration boundary",()=>{
 const dir=mkdtempSync(join(tmpdir(),"sc-sheet-boundary-"));
 execFileSync(ffmpeg,["-nostdin","-y","-loglevel","error","-f","lavfi","-i","color=c=blue:s=160x90:r=10:d=2","-pix_fmt","yuv420p",join(dir,"clip.mp4")]);
 const r=spawnSync(process.execPath,[entry,"sheet","clip.mp4","--every","1","--out","sheet.png"],{cwd:dir,encoding:"utf8"});assert.equal(r.status,0,r.stderr.slice(-500));
 const result=JSON.parse(r.stdout) as {frames:Array<{at:number;file:string}>};
 assert.deepEqual(result.frames.map(f=>f.at),[0,1],"duration is an exclusive end, not a frame");
 for(const frame of result.frames)assert.ok(existsSync(frame.file),"every advertised frame decodes");
});

test("portrait capture previews share automatic cues and overview with the final video",()=>{
 const dir=mkdtempSync(join(tmpdir(),"sc-video-preview-reframe-"));
 execFileSync(ffmpeg,["-nostdin","-y","-loglevel","error","-f","lavfi","-i","color=c=0x17212b:s=640x360:r=8:d=4","-vf","drawbox=x=10:y=100:w=100:h=120:color=red:t=fill,drawbox=x=520:y=100:w=100:h=120:color=blue:t=fill","-pix_fmt","yuv420p",join(dir,"clip.mp4")]);
 writeFileSync(join(dir,"clip.mp4.marks.json"),JSON.stringify({version:1,trimmed:0,size:{width:640,height:360},marks:{},clicks:[{t:1.5,x:.88,y:.45}],actions:[{kind:"click",t:1.5,end:1.6,rect:[.82,.3,.08,.12]}],path:[{t:0,x:.5,y:.5},{t:1.5,x:.88,y:.45}]}));
 writeFileSync(join(dir,"story.md"),`# F\nvoice: {"engine":"stub","name":"silent"}\nframe: {"width":640,"height":360,"fps":8}\naudio: false\n\n## v · video\nfile: clip.mp4\nduration: 4\nfade: none\nautoZoom: {"scale":1.8}\n`);
 const run=(...args:string[])=>{const r=spawnSync(process.execPath,[entry,...args],{cwd:dir,encoding:"utf8",env:{...process.env,AGENTIC_SCREENCAST_HOME:join(dir,"cache")}});assert.equal(r.status,0,r.stderr.slice(-1000));};
 run("build","story.md","--format","vertical","--out","film.mp4");
 for(const at of [.5,2.5]) {
  const png=`preview-${at}.png`;run("frames","story.md","--format","vertical","--scene","v","--at",`${at}s`,"--out",png);
  const preview=bounds(join(dir,png)),final=bounds(join(dir,"film.mp4"),at);
  for(let k=0;k<4;k++)assert.ok(Math.abs(preview[k]!-final[k]!)<=3,`at ${at}s capture preview ${preview} versus final ${final}`);
 }
});
