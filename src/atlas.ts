/** Discoverable catalog and moving previews built from the real product renderers. */
import { realpathSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { allKinds, FIELD_FORMATS, FILM_FORMATS, sceneSchema } from "./schema.js";
import { KINETIC, ACTION_KINDS, CAMERA_STYLES, OVERLAY_EASES, parseOverlay } from "./overlay.js";
import { ENTERS } from "./provider/slides/Slide.js";
import { BACKGROUNDS, slidesProvider } from "./provider/slides/index.js";
import { MOVES, ALIVE, EASES, WAVES } from "./provider/slides/from-scene.js";
import { KINDS as TRANSITIONS, MORPH, CUT } from "./transition.js";
import { resolveTheme } from "./theme.js";
import { fontFaceCss } from "./fonts.js";
import { PRODUCT_ROOT } from "./self-hash.js";
import type { RawScene } from "./source.js";

const esc = (s: string): string => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const json = (x: unknown): string => JSON.stringify(x).replaceAll('<','\\u003c');
function examples(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en')).flatMap(e=>{
    const file=join(root,e.name);
    return e.isDirectory() ? examples(file) : e.name.endsWith('.md') && /^# [^#]/mu.test(readFileSync(file,'utf8')) && /^## .+ · /mu.test(readFileSync(file,'utf8')) ? [relative(PRODUCT_ROOT,file).split('\\').join('/')] : [];
  });
}
function overlayCatalog(): Record<string, string[]> {
  // Use the same literal argument lists the parser enforces, not a parallel schema.
  const text=readFileSync(join(PRODUCT_ROOT,'src/overlay.ts'),'utf8');
  const fields=/keys\(value,\s*\[([\s\S]*?)\],\s*"overlay"\)/u.exec(text)?.[1];
  if (!fields) throw new Error('Overlay parser field list is unavailable.');
  const names=[...fields.matchAll(/"([\w-]+)"/gu)].map(m=>m[1]!);
  return Object.fromEntries(names.map(name=>{
    const direct=text.indexOf(`if (value.${name} !== undefined)`);
    const mapped=text.indexOf('const where = `overlay.'+name+'[');
    const start=direct>=0?direct:mapped;
    const rest=start<0?'':text.slice(start);
    const next=direct>=0?rest.slice(1).search(/\n  if \(value\./u):rest.slice(1).search(/const where =/u);
    const block=next<0?rest:rest.slice(0,next+1);
    const params=/keys\(raw,\s*\[([\s\S]*?)\]/u.exec(block)?.[1];
    if(name!=="ease"&&!params)throw new Error(`Overlay parameter list is unavailable: ${name}`);
    return [name,params?[...params.matchAll(/"([\w-]+)"/gu)].map(m=>m[1]!):[]];
  }));
}
export function atlasCatalog() {
  const cli=readFileSync(join(PRODUCT_ROOT,'src/agentic-screencast.ts'),'utf8');
  const capture=readFileSync(join(PRODUCT_ROOT,'src/capture.ts'),'utf8');
  return {
    commands:[...new Set([...cli.matchAll(/^\s*case "([a-z][\w-]+)":/gmu)].map(m=>m[1]!))],
    helpTopics:[...new Set([...cli.matchAll(/topic === "([\w-]+)"/gu)].map(m=>m[1]!))],
    capture:[...capture.matchAll(/^export (?:async )?function ([\w-]+)/gmu)].map(m=>m[1]!),
    kinds:allKinds().map(({provider,kind,spec})=>({name:kind===provider?provider:`${provider}.${kind}`,about:spec.about,fields:spec.fields,required:spec.required,silent:spec.silentOk??false,help:`schema ${kind===provider?provider:`${provider}.${kind}`}`})),
    entrances:ENTERS,kinetic:KINETIC,backgrounds:BACKGROUNDS,moves:MOVES,alive:ALIVE,easing:EASES,waves:WAVES,
    transitions:{...Object.fromEntries(Object.entries(TRANSITIONS).map(([name,k])=>[name,{about:k.about,joint:k.joint??false}])),[MORPH]:{about:'Carry one named shared object between scenes; requires element.',joint:false},[CUT]:{about:'Direct seam with no overlap or scene fades.',joint:true}},
    overlay:overlayCatalog(),actions:ACTION_KINDS,cameraStyles:CAMERA_STYLES,overlayEasing:OVERLAY_EASES,
    fields:FIELD_FORMATS,film:FILM_FORMATS,schema:sceneSchema(),examples:examples(join(PRODUCT_ROOT,'example')),templates:examples(join(PRODUCT_ROOT,'templates')),
  };
}
export function atlasMarkdown(): string {
  const c=atlasCatalog();
  const code=(s:string)=>'`'+s.replaceAll('|','\\|')+'`';
  const lines=['# Tools and examples atlas','', 'Generated from the provider registries, accepted field lists and source examples. Run `agentic-screencast atlas --out ./atlas` for local moving previews; `atlas --json` returns the live machine-readable catalog. Development regeneration: `node dist/atlas.js --markdown > docs/atlas.md`. Do not edit the generated tables by hand.','', 'Choose staging with [directing](directing.md) and [combinations](combinations.md), then use this atlas to inspect the implementation. For complete parameter semantics use the listed schema/help route. A technique list is not a recipe quota.','', '## Material kinds','', '| Kind | Purpose | Required material | API |','| --- | --- | --- | --- |'];
  for(const k of c.kinds) lines.push(`| ${code(k.name)} | ${k.about.replaceAll('|','\\|')} | ${k.required.map(g=>g.join(' or ')).join(', ')} | ${code(k.help)} |`);
  lines.push('','## Effect families','', '| Family | Actual accepted names | API and combinations |','| --- | --- | --- |');
  for(const [family,names,api] of [['Entrances',c.entrances,'enter:; help slides — grouped reveal, then reading'],['Kinetic titles',c.kinetic,'text: or overlay.titles.style; help text — claim emphasis with a result'],['Backgrounds',c.backgrounds,'background:; help slides — subordinate atmosphere'],['Slide camera',c.moves,'move:; schema <kind> — supported fields differ by kind'],['Idle motion',c.alive,'alive:; help slides — keep it subordinate during reading'],['Entrance curves',c.easing,'ease:; help slides — coordinate groups'],['Group order',c.waves,'wave:; help slides — related objects arrive together'],['Transitions',Object.keys(c.transitions),'transition:; help transitions — shared object, direction or deliberate change of topic']] as const) lines.push(`| ${family} | ${names.map(code).join(', ')} | ${api} |`);
  lines.push('','## Overlay families','', 'All overlays share scene time. Targets on pages follow material geometry; frame text is drawn at output size. A real capture is evidence; actions on a saved page are reconstruction. See `help overlay` for numeric limits, anchors and compatibility.','', '| Family | Recognized keys (constraints in help) | API |','| --- | --- | --- |');
  for(const [name,fields] of Object.entries(c.overlay)) lines.push(`| ${code(name)} | ${fields.map(code).join(', ')||'named curve'} | ${code('help overlay')} |`);
  lines.push('','## Scene fields','', '| Field | Accepted authoring form |','| --- | --- |');
  for(const [name,form] of Object.entries(c.fields)) lines.push(`| ${code(name)} | ${form.replaceAll('|','\\|')} |`);
  lines.push('','## Film fields','', '| Field | Authoring form |','| --- | --- |');
  for(const [name,form] of Object.entries(c.film)) lines.push(`| ${code(name)} | ${form.replaceAll('|','\\|')} |`);
  lines.push('','## Complete scenario and template index','', 'These are buildable sources, not prescribed stories. The atlas previews use illustrative fixture material; replace it with inspected evidence in a real film. Report mechanisms need a compiler exposing composition/object/cue.','');
  for(const file of [...c.examples,...c.templates]) lines.push(`- [${file}](../${file})`);
  lines.push('','## Operation and capture routes','',
    'CLI commands from the actual dispatcher: '+c.commands.map(code).join(', ')+'.',
    '', 'Help topics: '+c.helpTopics.map(t=>code('help '+t)).join(', ')+'.',
    '', 'Public functions from '+code('agentic-screencast/capture')+': '+c.capture.map(code).join(', ')+'. Read '+code('help capture')+' and the [recording contract](reference.md#recording-real-actions); [live-capture.mjs](../example/live-capture.mjs) is the executable capture example. A narrative voice recording and a product screen capture are different inputs.', '');
  lines.push('','## Preview and composition limits','', 'The live atlas uses the same slide components and scene layer as rendering, with play, pause and seek. Previews are technique studies. They do not prove a real product works, demonstrate the final narration timing or approve a combination. Use the examples and their READMEs for real capture, Report, portrait framing and complete films.','', 'Transitions need two scenes and some need a named shared element; the atlas provides buildable two-scene scenarios for every accepted kind, including cut and morph. Overlay actions need their target controls; loupe and camera need a meaningful target. Coordinate lead/support/ambient roles rather than disabling existing effects by genre.','');
  return lines.join('\n');
}

const FIXTURES: Record<string,Record<string,string>>={
 chapter:{body:'A clear relationship becomes visible'},compare:{left:'Before :: Shared value',right:'After :: Independent value'},chain:{nodes:'Input | Transform (acc) | Result',back:'A visible return'},number:{value:'120 · sample records',label:'Illustrative count'},quote:{parts:'Reviewer :: Show the cause and its result'},hero:{body:'The same material, a deliberate view',image:'screen.svg'},steps:{items:'Recognize :: The source | Follow :: The action | Read :: The result'},features:{items:'Source :: Stable identity | Action :: Visible change | Result :: A readable consequence'},timeline:{items:'Before :: Shared | Edit :: Independent | After :: Compared'},counter:{values:'120 :: sample records | 98% :: sample share',spark:'1 2 4 3 6 | 2 3 4 6 8'},beforeafter:{image:'screen.svg',after:'after.svg'},perspective:{image:'screen.svg',body:'Introduce depth, then settle to read'},parallax:{image:'screen.svg',panels:'0.05 0.1 0.25 0.7 @ 0.2 | 0.35 0.1 0.6 0.35 @ 0.8 | 0.35 0.5 0.6 0.3 @ 1'},chart:{data:'data.csv',type:'bar'},code:{code:'const local = copy(source);\nlocal.shadow = edited;\ncompare(source, local);',highlight:'2'},photo:{image:'screen.svg',body:'A result with a deliberate push'},shot:{image:'screen.svg',device:'frame',body:'Whole screen before its detail'},marquee:{items:'Input | Model | Event | Consumer | Result'},stack:{items:'Source :: Keep identity | Action :: Copy the value | Result :: Read the difference'},orbit:{items:'Input | Model | Queue | View'},chat:{items:'you :: What changed? | bot :: The edit created an independent value.'},carousel:{items:'Cause :: Shared value | Action :: First edit | Result :: Independent owner'},globe:{items:'Berlin :: 52.5 13.4 | Tokyo :: 35.7 139.7 | New York :: 40.7 -74'},wall:{images:'screen.svg | after.svg | screen.svg'},cloud:{items:'Model | Queue | View | Source | Result'},shell:{items:'$ build :: Built the page | $ check :: Checked the result'},layers:{image:'screen.svg',panels:'0.05 0.1 0.25 0.7 @ 0.2 | 0.35 0.1 0.6 0.35 @ 0.8 | 0.35 0.5 0.6 0.3 @ 1'},bento:{items:'Source :: Stable identity | Action :: Visible change | Result :: Readable evidence'},card:{title:'FIRST EDIT'},titlecard:{title:'A VISIBLE CHANGE',body:'Technique preview'},outro:{body:'Read the resulting state',cta:'Inspect the source',url:'Local preview',image:'after.svg'},
};
const OVERLAY_FIXTURES: Record<string,unknown>={pointer:[{at:0.4,x:.3,y:.4},{at:1.4,x:.7,y:.55,click:true}],cards:[{at:.4,title:'The result',body:'A readable consequence',hold:4.5,motion:'glide'}],camera:[{at:.4,target:'#result',hold:2,move:.8,return:.7}],titles:[{at:.4,text:'A visible change',style:'flap',hold:4.5}],lower:[{at:.4,title:'Result',subtitle:'Illustrative sample',hold:4.5}],callouts:[{at:.4,text:'Independent value',target:'#result',hold:4.5}],stickers:[{at:.4,text:'New',target:'#result',hold:4.5,motion:'pop'}],marks:[{at:.4,kind:'circle',target:'#result',hold:4.5}],glints:[{at:.4,target:'#result',hold:4.5}],bursts:[{at:.4,kind:'sparks',target:'#result',hold:4.5}],loupe:[{at:.4,target:'#result',hold:4.5}],boops:[{at:.4,kind:'jelly',target:'#result',hold:4.5}],pings:[{at:.4,target:'#result',hold:4.5}],toasts:[{at:.4,title:'Saved',body:'Independent value',hold:4.5}],actions:[{at:.4,kind:'toggle',target:'#switch',glide:'#switch'}],torch:[{at:.4,hold:4.5,size:.25}],thinking:[{at:.4,target:'#result',hold:4.5,text:'Resolving',lines:3}],ease:'expressive',
};
function raw(id:string,kind:string,fields:Record<string,string>):RawScene {return {id,provider:'slides',kind,fields,beats:[],caption:""};}
const SCREEN=(color:string)=>`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="${esc(resolveTheme('midnight')['--bg'])}"/><rect width="210" height="720" fill="${esc(resolveTheme('midnight')['--ink'])}"/><text x="32" y="80" fill="${esc(resolveTheme('midnight')['--card'])}" font-family="sans-serif" font-size="28">Workspace</text><text x="250" y="90" fill="${esc(resolveTheme('midnight')['--ink'])}" font-family="sans-serif" font-size="38">Illustrative operations</text><rect x="250" y="160" width="950" height="210" rx="12" fill="${esc(resolveTheme('midnight')['--card'])}"/><text x="290" y="220" fill="${esc(resolveTheme('midnight')['--ink'])}" font-family="sans-serif" font-size="28">A concrete result</text><rect x="290" y="260" width="760" height="64" rx="12" fill="${color}"/><rect x="250" y="410" width="450" height="230" rx="12" fill="${esc(resolveTheme('midnight')['--card'])}"/><rect x="750" y="410" width="450" height="230" rx="12" fill="${esc(resolveTheme('midnight')['--card'])}"/></svg>`;

export function buildAtlas(out:string) {
 const dir=resolve(out);
 if(existsSync(dir)&&readdirSync(dir).length)throw new Error('Atlas output must be absent or empty.');
 mkdirSync(dir,{recursive:true});
 const preview=join(dir,'previews');mkdirSync(preview);
 writeFileSync(join(dir,'screen.svg'),SCREEN(resolveTheme('midnight')['--acc']));writeFileSync(join(dir,'after.svg'),SCREEN(resolveTheme('midnight')['--acc2']));
 writeFileSync(join(dir,'data.csv'),'label,value\nBefore,42\nAfter,78\nResult,120\n');
 const theme=resolveTheme('midnight');writeFileSync(join(preview,'fonts.css'),fontFaceCss(theme));
 const entries:Array<{name:string;file:string;source:string;about:string}>=[];
 const clock=readFileSync(join(PRODUCT_ROOT,'dist/browser/clock.js'),'utf8'),stage=readFileSync(join(PRODUCT_ROOT,'dist/browser/stage.js'),'utf8');
 const animate=(file:string,scene:unknown)=>{
  let html=readFileSync(file,'utf8');
  const bootstrap=`<style>:root{--u:1vw;${Object.entries(theme).map(([k,v])=>k+':'+v).join(';')}}</style><script>window.__atlasRaf=requestAnimationFrame.bind(window);window.__atlasNow=performance.now.bind(performance);${clock}\n${stage}</script><link rel="stylesheet" href="fonts.css">`;
  html=html.replace('<head>','<head>'+bootstrap);
  const player=`<div id="atlas-player" style="position:fixed;z-index:99999;bottom:8px;left:16px;background:var(--card);color:var(--ink);padding:var(--sc-pad-y) var(--sc-pad-x);border-radius:var(--sc-card-radius);font-family:var(--sans);font-size:1rem"><button id="atlas-play">Pause</button> <input id="atlas-time" type="range" min="0" max="6" step="0.01" value="0" aria-label="Preview time"> <span>Illustrative technique preview</span></div><script>window.__stage.mount(${json(scene)});let running=true,start=window.__atlasNow(),time=0;const slider=document.querySelector('#atlas-time');document.querySelector('#atlas-play').onclick=()=>{running=!running;start=window.__atlasNow()-time*1000;document.querySelector('#atlas-play').textContent=running?'Pause':'Play'};slider.oninput=()=>{time=Number(slider.value);start=window.__atlasNow()-time*1000;window.__clock.seek(time)};function frame(now){if(running){time=((now-start)/1000)%6;slider.value=time;window.__clock.seek(time)}window.__atlasRaf(frame)}document.fonts.ready.then(()=>{window.__refit?.();window.__atlasRaf(frame)});</script>`;
  // The stage transforms body; player controls share the screen layer's untransformed parent.
  writeFileSync(file,html.replace('</body>',player.replace('<script>window.__stage.mount', '<script>document.documentElement.appendChild(document.querySelector("#atlas-player"));window.__stage.mount')+'</body>'));
 };
 const slide=(name:string,kind:string,fields:Record<string,string>,about:string)=>{
  const id=name.replaceAll(/[^\w-]/gu,'-');
  const data={title:'A visible change',background:'none',...fields};
  const file=slidesProvider.page!(raw(id,kind,data),preview,{dir,lang:'en',theme,frame:{width:1280,height:720,fps:30,scale:1}});
  animate(file,{duration:6,beats:3,starts:[.3,1.8,3.3],theme,effects:{zoom:{scale:1},cursor:{hidden:true},caption:{from:9999},spot:{from:9999},fade:{in:0,out:0}}});
  entries.push({name,file:'previews/'+id+'.html',source:`## preview · slides.${kind}\n`+Object.entries(data).map(([k,v])=>`${k}: ${v.includes('\n')?'|\n  '+v.replaceAll('\n','\n  '):v}`).join('\n')+'\nduration: 6\n',about});
 };
 const c=atlasCatalog();
 for(const k of c.kinds.filter(k=>k.name.startsWith('slides.'))){const kind=k.name.slice(7),fields=FIXTURES[kind];if(!fields)throw new Error(`Missing atlas fixture for ${kind}`);slide(k.name,kind,fields,k.about);}
 for(const [group,names,key,kind] of [['enter',ENTERS,'enter','features'],['kinetic',KINETIC,'text','hero'],['background',BACKGROUNDS,'background','hero'],['move',MOVES,'move','hero'],['alive',ALIVE,'alive','features'],['ease',EASES,'ease','features'],['wave',WAVES,'wave','features']] as const)for(const value of names)slide(`${group}.${value}`,kind,{...FIXTURES[kind],[key]:value},`${key}: ${value} — coordinate with the scene's focus`);
 const base='<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:calc(var(--u)*2.2);padding:var(--sc-pad-y) var(--sc-pad-x)}h1{font-size:48px}#result{background:var(--card);padding:var(--sc-pad-y) var(--sc-pad-x);margin-top:70px;width:650px;border:var(--sc-hairline) solid var(--acc);border-radius:var(--sc-card-radius)}button{font-family:var(--sans);font-size:calc(var(--u)*2.2);padding:var(--sc-pad-y) var(--sc-pad-x)}</style></head><body><h1>Whole workspace</h1><p>Illustrative saved interface</p><button id="switch" aria-pressed="false">Independent owner</button><div id="result">The result of the operation</div></body></html>';
 for(const name of Object.keys(c.overlay)){
  if(!(name in OVERLAY_FIXTURES))throw new Error(`Missing overlay fixture: ${name}`);
  const overlay={...(name==='torch'?{pointer:OVERLAY_FIXTURES.pointer}:name==='ease'?{cards:OVERLAY_FIXTURES.cards}:{}),[name]:OVERLAY_FIXTURES[name]};const normalized=parseOverlay(JSON.stringify(overlay));
  const id='overlay-'+name,file=join(preview,id+'.html');writeFileSync(file,base);
  animate(file,{duration:6,theme,overlay:normalized,effects:{zoom:{scale:1},caption:{from:9999},spot:{from:9999},fade:{in:0,out:0}}});
  entries.push({name:'overlay.'+name,file:'previews/'+id+'.html',source:'overlay: '+JSON.stringify(overlay),about:'Timed scene annotation; help overlay gives parameters and limits.'});
 }
 for(const kind of Object.keys(c.transitions)){
  const file='transition-'+kind+'.md';
  writeFileSync(join(dir,file),`# Transition study\nlang: en\nvoice: {"engine":"stub","name":"silent"}\naudio: false\nframe: {"width":640,"height":360,"fps":15,"scale":1}\n\n## before · slides.hero\ntitle: Shared object\nimage: screen.svg\nduration: 2\nfade: none\n\n## after · slides.hero\ntitle: Shared object\nimage: after.svg\nduration: 2\nfade: none\ntransition: ${kind==='morph'?'{"kind":"morph","element":".hero-title","duration":0.8}':kind==='cut'?'cut':kind+' 0.8'}\n`);
  entries.push({name:'transition.'+kind,file,source:`agentic-screencast build ${file} --out ${kind}.mp4`,about:c.transitions[kind as keyof typeof c.transitions]!.about});
 }
 writeFileSync(join(dir,'catalog.json'),JSON.stringify(c,null,2));
 const cards=entries.map(e=>`<article><h2>${esc(e.name)}</h2><p>${esc(e.about)}</p>${e.file.endsWith('.html')?`<a href="${esc(e.file)}" target="preview">Play preview</a> · `:''}<a href="${esc(e.file)}">Open source / preview</a><pre>${esc(e.source)}</pre></article>`).join('');
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Screencast tools atlas</title><style>:root{--u:1vw;${Object.entries(theme).map(([k,v])=>k+':'+v).join(';')}}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:1rem;line-height:1.5}main{max-width:1100px;margin:auto;padding:var(--sc-pad-y) var(--sc-pad-x)}h1{font-size:40px}article{background:var(--card);border:var(--sc-hairline) solid var(--line);border-radius:var(--sc-card-radius);padding:var(--sc-pad-y) var(--sc-pad-x);margin:20px 0}pre{overflow:auto;white-space:pre-wrap;font-family:var(--mono);font-size:0.9rem;line-height:1.5}a{color:var(--acc)}input{font:inherit;padding:var(--sc-pad-y) var(--sc-pad-x);width:100%}#screen{position:sticky;top:0;background:var(--card);height:480px;overflow:hidden}iframe{border:0;width:1280px;height:720px;transform-origin:top left}</style></head><body><main><h1>Screencast tools atlas</h1><p>Choose a technique to inspect its real motion. Fixtures are illustrative. Use the directing and combinations guides to stage the subject; these previews are not film templates.</p><div id="screen"><iframe title="Moving technique preview" name="preview" src="${entries[0]!.file}"></iframe></div><input id="search" placeholder="Find a kind, effect or field" aria-label="Search atlas">${cards}<h2>Every scenario and template</h2><pre>${esc([...c.examples,...c.templates].join('\n'))}</pre><a href="catalog.json">Complete live catalog and schema</a></main><script>function fit(){const s=document.querySelector('#screen');const k=s.clientWidth/1280;s.style.height=(720*k)+'px';s.querySelector('iframe').style.transform='scale('+k+')'}fit();window.addEventListener('resize',fit);document.querySelector('#search').oninput=e=>{const q=e.target.value.toLowerCase();for(const a of document.querySelectorAll('article'))a.hidden=!a.textContent.toLowerCase().includes(q)};</script></body></html>`;
 writeFileSync(join(dir,'index.html'),html);return {directory:dir,index:join(dir,'index.html'),previews:entries.filter(e=>e.file.endsWith('.html')).length,transitionStudies:Object.keys(c.transitions).length};
}

/** Optional native video previews: default atlas creation stays fast and silent. */
export function renderAtlasTransitions(out:string): void {
 const dir=resolve(out), c=atlasCatalog();
 let index=readFileSync(join(dir,'index.html'),'utf8');
 for(const kind of Object.keys(c.transitions)) {
  const scenario=join(dir,`transition-${kind}.md`), movie=`transition-${kind}.mp4`;
  execFileSync(process.execPath,[join(PRODUCT_ROOT,'dist/agentic-screencast.js'),'build',scenario,'--out',join(dir,movie)],{maxBuffer:16*1024*1024});
  const link=`<a href="transition-${kind}.md">Open source / preview</a>`;
  index=index.replace(link,`<video controls loop muted preload="none" style="width:100%" src="${movie}" aria-label="${kind} transition preview"></video>`+link);
  writeFileSync(join(dir,'index.html'),index);
  process.stderr.write(`Rendered transition ${kind}\n`);
 }
}

if(process.argv[1]&&realpathSync(resolve(process.argv[1]))===fileURLToPath(import.meta.url)){
 if(process.argv.includes('--markdown'))process.stdout.write(atlasMarkdown());
 else {const at=process.argv.indexOf('--out');if(at>=0){const out=process.argv[at+1];if(!out||out.startsWith('--'))throw new Error('--out requires a directory');const result=buildAtlas(out);if(process.argv.includes("--transitions"))renderAtlasTransitions(out);console.log(JSON.stringify(result,null,2));}else console.log(JSON.stringify(atlasCatalog(),null,2));}
}
