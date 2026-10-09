// Run from a new film directory; --report selects the installed package or a built checkout.
import { mkdir, copyFile, writeFile, readFile, symlink } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const arg=process.argv.indexOf('--report');
if(arg<0||!process.argv[arg+1])throw new Error('Use node prepare.mjs --report <Agentic Report checkout or installed package root>.');
const root=resolve(process.argv[arg+1]);
const source=resolve(root,'examples/directed-change-event/architecture-walkthrough.md');
const own=dirname(fileURLToPath(import.meta.url));
await mkdir('reports',{recursive:true});await mkdir('node_modules',{recursive:true});
await copyFile(source,'reports/architecture-walkthrough.md');
// Existing dependencies remain under their owner's control.
try{await symlink(root,resolve('node_modules/agentic-report'));}catch(e){if(e.code!=='EEXIST')throw e;}
try{await copyFile(resolve(own,'story.md'),'story.md',1);}catch(e){if(e.code!=='EEXIST')throw e;}
await copyFile(resolve(own,'SOURCE-MAP.md'),'SOURCE-MAP.md');
const {compositionFrame}=await import(pathToFileURL(resolve(root,'dist/node/composition.js')).href);
const cues=[{at:'1',action:'copy',target:'layout',to:'shape',duration:1},{at:'3',action:'replace',target:'shape',value:'Shadow 12 px',duration:.6}];
const at=t=>compositionFrame(['layout','shape'],cues,t);
const later=at(4),earlier=at(0),flight=at(1.5),arrived=at(2);
const snapshot=frame=>({objects:Object.fromEntries(frame.objects),connections:frame.connections,travels:frame.travels});
const evidence={input:{ids:['layout','shape'],cues},flight:snapshot(flight),arrived:snapshot(arrived),later:snapshot(later),earlier:snapshot(earlier),sameMap:later.objects===earlier.objects,sharedContentAfterCopy:arrived.objects.get('layout').content===arrived.objects.get('shape').content,sourceSha256:createHash('sha256').update(await readFile(source)).digest('hex')};
await writeFile('execution.json',JSON.stringify(evidence,null,2));
const {buildReport}=await import(pathToFileURL(resolve(root,'dist/node/index.js')).href);
await buildReport({input:resolve('reports/architecture-walkthrough.md'),output:resolve('architecture.html')});
console.log('Prepared story.md, architecture.html, SOURCE-MAP.md and real execution.json. Default voice is a free silent draft; select an authorized voice for the measured final.');
