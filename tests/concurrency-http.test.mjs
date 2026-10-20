import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,readFile,mkdir,rm,copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
test('ordinary research, comparison, model changes and live probes share one generation gate',async t=>{
 const directory=await mkdtemp(path.join(tmpdir(),'rt-gate-')),root=fileURLToPath(new URL('..',import.meta.url));
 const fileUrl=file=>pathToFileURL(path.join(root,file)).href;
 await writeFile(path.join(directory,'mock-providers.mjs'),`export {redact,classifyProviderError} from '${fileUrl('lib/providers.mjs')}';
export const definitions=[{id:'codex'},{id:'claude'}];
export async function inspectProviders(){return definitions.map(d=>({...d,name:d.id,binary:'/fixture/'+d.id,version:'fixture',model:'fixture',ready:true,installed:true,auth:'subscription'}))}
export async function diagnoseProvider(){throw new Error('unused')}
export async function callProvider(p,prompt,{signal}){return new Promise((resolve,reject)=>{const abort=()=>reject(new Error('Discussion paused'));if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true})})}`);
 let server=await readFile(path.join(root,'server.mjs'),'utf8');server=server.replaceAll("'./lib/providers.mjs'","'./mock-providers.mjs'").replace(/'\.\/(lib\/[^']+)'/g,(_,file)=>JSON.stringify(fileUrl(file)));
 await writeFile(path.join(directory,'server.mjs'),server);await mkdir(path.join(directory,'data'));await copyFile(path.join(root,'data/research-brief.json'),path.join(directory,'data/research-brief.json'));
 const port=35000+Math.floor(Math.random()*10000),base=`http://127.0.0.1:${port}`;
 const child=spawn(process.execPath,[path.join(directory,'server.mjs')],{env:{...process.env,ROUNDTABLE_PORT:String(port),ROUNDTABLE_DATA_DIR:path.join(directory,'sessions'),ROUNDTABLE_RUNTIME_DIR:path.join(directory,'runtime')},stdio:['ignore','pipe','pipe']});let log='';child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);
 t.after(async()=>{child.kill();await Promise.race([new Promise(r=>child.once('exit',r)),sleep(1000)]);if(child.exitCode===null)child.kill('SIGKILL');await rm(directory,{force:true,recursive:true})});
 let bootstrap;for(let i=0;i<80;i++){try{const r=await fetch(base+'/api/bootstrap');if(r.ok){bootstrap=await r.json();break}}catch{}await sleep(40)}assert.ok(bootstrap,log);
 const req=async(url,body,method=body===undefined?'GET':'POST')=>{const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json','X-Roundtable-Token':bootstrap.token},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()}};
 const session=(await req('/api/sessions',{question:'Fixture question',answerLang:'en',participants:['codex','claude'],chair:'codex',depth:'overview'})).data;
 const suite=(await req('/api/evaluation-suite')).data;
 const comparison=(await req('/api/evaluations',{caseId:suite.cases[0].id,participants:['codex','claude'],chair:'codex',depth:'overview'})).data;
 assert.equal((await req('/api/evaluations/'+comparison.id+'/run',{})).status,202);
 assert.equal((await req('/api/sessions/'+session.id+'/run',{})).status,400);
 assert.equal((await req('/api/settings',{models:{codex:'other'}},'PUT')).status,400);
 assert.equal((await req('/api/providers/codex/probe',{})).status,400);
 assert.equal((await req('/api/evaluations/'+comparison.id+'/cancel',{})).data.status,'paused');
 assert.equal((await req('/api/sessions/'+session.id+'/run',{})).status,202);
 assert.equal((await req('/api/evaluations/'+comparison.id+'/run',{})).status,400);
 assert.equal((await req('/api/sessions/'+session.id+'/cancel',{})).data.status,'paused');
 assert.equal((await req('/api/settings',{models:{codex:'same'}},'PUT')).status,200);
});
