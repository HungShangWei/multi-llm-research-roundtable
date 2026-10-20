import {randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,readdir,rename,stat,unlink} from 'node:fs/promises';
import path from 'node:path';
import {initialPrompt,critiquePrompt,synthesisPrompt,verificationPrompt} from './protocol.mjs';
import {baseSteps,basisFor,stepComplete,buildVerificationPlan,analysisFor,sourceCheckCandidates} from './research.mjs';
import {sourceCheckIdentity,snapshotChecks,mergeReviews} from './review.mjs';
export class SessionStore{
 constructor(directory){this.directory=directory;this.trashDirectory=path.join(directory,'trash');this.cache=new Map();this.trashCache=new Map();this.writes=new Map();this.moves=new Set()}
 async init(){await mkdir(this.directory,{recursive:true});await mkdir(this.trashDirectory,{recursive:true});for(const f of await readdir(this.directory)){if(!/^[a-f0-9-]{36}\.json$/.test(f))continue;try{const s=JSON.parse(await readFile(path.join(this.directory,f),'utf8'));if(s.id+'.json'!==f)continue;this.cache.set(s.id,s);if(s.status==='running'){s.status='paused';s.error='The local service restarted. Completed responses were preserved.';await this.save(s)}}catch{}}for(const f of await readdir(this.trashDirectory)){if(!/^[a-f0-9-]{36}\.json$/.test(f))continue;try{const session=JSON.parse(await readFile(path.join(this.trashDirectory,f),'utf8'));if(session.id+'.json'!==f)continue;let deletedAt=null;try{deletedAt=JSON.parse(await readFile(path.join(this.trashDirectory,session.id+'.meta.json'),'utf8')).deletedAt||null}catch{}this.trashCache.set(session.id,{session,deletedAt})}catch{}}}
 async create(data,brief){const s={...data,id:randomUUID(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),status:'queued',messages:[],briefAsOf:data.useBrief?brief?.asOf:null,modelSnapshot:{},error:null};this.cache.set(s.id,s);try{await this.save(s);return s}catch(e){this.cache.delete(s.id);throw e}}
 serialize(id,operation){const task=(this.writes.get(id)||Promise.resolve()).catch(()=>{}).then(operation);this.writes.set(id,task);return task.finally(()=>{if(this.writes.get(id)===task)this.writes.delete(id)})}
 assertCurrent(s){if(!s||this.cache.get(s.id)!==s||this.moves.has(s.id))throw new Error('Session not found or no longer current')}
 async save(s){this.assertCurrent(s);s.updatedAt=new Date().toISOString();const snapshot=JSON.stringify(s,null,2),file=path.join(this.directory,s.id+'.json');await this.serialize(s.id,async()=>{const tmp=file+'.'+randomUUID()+'.tmp';await writeFile(tmp,snapshot,{mode:0o600});await rename(tmp,file)})}
 get(id){if(!/^[a-f0-9-]{36}$/.test(id)||!this.cache.has(id)||this.moves.has(id))throw new Error('Session not found');return this.cache.get(id)}
 summary(s){return {id:s.id,question:s.question,createdAt:s.createdAt,status:s.status,messageCount:s.messages.length,revision:s.revision||1,parentSessionId:s.parentSessionId||null,depth:s.depth||'legacy'}}
 list(){return [...this.cache.values()].filter(s=>!this.moves.has(s.id)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(s=>this.summary(s))}
 listTrash(){return [...this.trashCache.values()].filter(({session})=>!this.moves.has(session.id)).sort((a,b)=>(b.deletedAt||b.session.createdAt).localeCompare(a.deletedAt||a.session.createdAt)).map(({session,deletedAt})=>({...this.summary(session),deletedAt}))}
 async requireAbsent(file){try{await stat(file)}catch(e){if(e.code==='ENOENT')return;throw e}throw new Error('A session with this ID already exists at the destination')}
 async moveToTrash(id){const s=this.get(id);if(s.status==='running')throw new Error('Pause the active discussion before deleting it.');this.moves.add(id);try{return await this.serialize(id,async()=>{const source=path.join(this.directory,id+'.json'),destination=path.join(this.trashDirectory,id+'.json');await this.requireAbsent(destination);const session=JSON.parse(await readFile(source,'utf8'));if(session.id!==id)throw new Error('Session file identity does not match');await rename(source,destination);const deletedAt=new Date().toISOString();this.cache.delete(id);this.trashCache.set(id,{session,deletedAt});try{await writeFile(path.join(this.trashDirectory,id+'.meta.json'),JSON.stringify({deletedAt}),{mode:0o600})}catch{}return {deleted:true,id,recoverable:true}})}finally{this.moves.delete(id)}}
 async restore(id){if(!/^[a-f0-9-]{36}$/.test(id)||!this.trashCache.has(id)||this.moves.has(id))throw new Error('Deleted session not found');if(this.cache.has(id))throw new Error('A session with this ID already exists');this.moves.add(id);try{return await this.serialize(id,async()=>{const source=path.join(this.trashDirectory,id+'.json'),destination=path.join(this.directory,id+'.json');await this.requireAbsent(destination);const s=JSON.parse(await readFile(source,'utf8'));if(s.id!==id)throw new Error('Session file identity does not match');await rename(source,destination);this.cache.set(id,s);this.trashCache.delete(id);try{await unlink(path.join(this.trashDirectory,id+'.meta.json'))}catch{}return s})}finally{this.moves.delete(id)}}
}
export class Engine {
 constructor({store,brief,getProviders,runner,runtimeDir,sourceChecker}) {
  Object.assign(this,{store,brief,getProviders,runner,runtimeDir,sourceChecker});this.active=null;
 }
 async start(id,{synthesisOnly=false,chair,single=false}={}) {
  if(this.active)throw new Error('A discussion is already running. Pause it first.');
  const controller=new AbortController();let finish;
  const lock={id,controller,finished:new Promise(resolve=>finish=resolve)};this.active=lock;
  try {
   const s=this.store.get(id),all=await this.getProviders(),participants=s.participants.map(pid=>all.find(p=>p.id===pid));
   const resumingSynthesis=!synthesisOnly&&s.protocolVersion>=3&&s.mode==='synthesis'&&['paused','failed'].includes(s.status);
   if(resumingSynthesis){synthesisOnly=true;chair=s.chair}
   if(controller.signal.aborted)throw new Error('Discussion paused');
   this.store.assertCurrent(s);
   if(synthesisOnly){
    if(!s.messages.some(m=>m.stage!=='synthesis'))throw new Error('Import at least one response first.');
    if(!all.some(p=>p.id===chair))throw new Error('Unknown chair');s.chair=chair;
   }else if(participants.length<(single?1:2))throw new Error('Choose the required connected platforms.');
   const needed=synthesisOnly?[all.find(p=>p.id===chair)]:participants;
   if(needed.some(p=>!p?.ready))throw new Error('One or more platforms are not connected. Check platform settings.');
   for(const p of needed){
    if(!s.modelSnapshot[p.id])s.modelSnapshot[p.id]={model:p.model||'',binary:p.binary,version:p.version,reasoningEffort:p.reasoningEffort||null};
    else if(s.modelSnapshot[p.id].binary!==p.binary)throw new Error('The platform executable changed. Start a new session.');
   }
   if(synthesisOnly&&s.protocolVersion>=3&&!resumingSynthesis){
    s.pendingEvidenceReview=mergeReviews(s.pendingEvidenceReview||[],snapshotChecks(analysisFor(s).sources));
    const previous=s.messages.findLast(m=>m.stage==='synthesis'&&!m.stale);
    if(previous)s.previousSynthesisForReview={id:previous.id,text:previous.text.slice(0,30000)};
    for(const m of s.messages)if(m.stage==='synthesis'&&!m.manual)m.stale=true;
   }
   s.mode=synthesisOnly?'synthesis':single?'single':'roundtable';s.status='running';s.error=null;
   s.runStartedAt=new Date().toISOString();s.runFinishedAt=null;s.attempts=(s.attempts||0)+1;
   await this.store.save(s);
   this.task=this.execute(s,all,controller,s.mode).catch(async e=>{
    s.status=controller.signal.aborted?'paused':'failed';s.error=e.message;s.runFinishedAt=new Date().toISOString();try{await this.store.save(s)}catch{}
   }).finally(()=>{if(this.active===lock)this.active=null;finish()});
   return s;
  }catch(e){
   if(controller.signal.aborted){try{const s=this.store.get(id);s.status='paused';s.runFinishedAt=new Date().toISOString();s.error='Discussion paused';await this.store.save(s)}catch{}}
   if(this.active===lock)this.active=null;finish();throw e;
  }
 }
 async execute(s,all,controller,mode) {
  try {
   while(true){
    if(controller.signal.aborted)throw new Error('Discussion paused');
    let step=baseSteps(s,mode).find(step=>!stepComplete(s,step));
    if(!step)break;
    if(step.stage==='synthesis'&&s.protocolVersion>=2&&mode==='roundtable'&&s.verificationPlan===undefined){
     s.verificationPlan=buildVerificationPlan(s);await this.store.save(s);
     step=baseSteps(s,mode).find(step=>!stepComplete(s,step));
     if(!step)break;
    }
    const {stage,provider:id}=step,basis=basisFor(s,stage);
    let evidenceReview=[];
    if(stage==='synthesis'&&s.protocolVersion>=3){
     await this.retrieveSources(s,controller,{finalOnly:false});
     evidenceReview=mergeReviews(s.pendingEvidenceReview||[],snapshotChecks(analysisFor(s).sources));
    }
    const p={...all.find(p=>p.id===id),...s.modelSnapshot[id],id,reasoningEffort:s.modelSnapshot[id]?.reasoningEffort||null};
    s.currentStage=stage;s.currentProvider=p.name;s.currentStep=step.key;s.stepStartedAt=new Date().toISOString();
    await this.store.save(s);
    const prompt=stage==='independent'?initialPrompt(s,this.brief):stage==='critique'?critiquePrompt(s,this.brief,id):stage==='verification'?verificationPrompt(s,this.brief,step):synthesisPrompt(s,this.brief,evidenceReview);
    const result=await this.runner(p,prompt,{cwd:path.join(this.runtimeDir,s.id,id),signal:controller.signal,search:stage==='independent'||stage==='verification'});
    if(controller.signal.aborted)throw new Error('Discussion paused');
    for(const m of s.messages)if(m.stage===stage&&m.provider===id&&!m.manual&&(stage!=='verification'||m.stepKey===step.key))m.stale=true;
    s.messages.push({id:randomUUID(),provider:id,providerName:p.name,stage,stepKey:step.key,basis,
     model:result.model||null,modelProvenance:result.modelProvenance||'not reported',usageModels:result.usageModels||[],responseModels:result.responseModels||[],
     requestedModel:result.requestedModel||p.model||null,requestedReasoningEffort:result.requestedReasoningEffort||p.reasoningEffort||null,
     providerVersion:result.providerVersion||p.version,createdAt:new Date().toISOString(),text:result.text,usage:result.usage||null,searches:result.searches??null,manual:false,
     ...(stage==='synthesis'&&s.protocolVersion>=3?{evidenceReview}: {})});
    if(stage==='synthesis'&&s.protocolVersion>=3){delete s.pendingEvidenceReview;delete s.previousSynthesisForReview}
    await this.store.save(s);
   }
   if(s.protocolVersion>=3)await this.retrieveSources(s,controller,{finalOnly:true});
   // Bounded retrieval checks are separate from model judgements, and never run for legacy sessions.
   if(s.protocolVersion===2&&this.sourceChecker){
    const analysis=analysisFor(s),latest=s.messages.findLast(m=>!m.stale&&(m.stage==='synthesis'||mode==='single'));
    const sources=analysis.sources.filter(x=>x.messageId===latest?.id).slice(0,{overview:1,standard:3,deep:5}[s.depth]||3);
    for(const source of sources){
     if(s.sourceChecks?.[source.id])continue;
     if(controller.signal.aborted)throw new Error('Discussion paused');
     s.currentStage='source_check';s.currentProvider=null;s.currentStep=source.id;s.stepStartedAt=new Date().toISOString();
     await this.store.save(s);
     const checked=await this.sourceChecker(source,{signal:controller.signal});
     if(controller.signal.aborted)throw new Error('Discussion paused');
     s.sourceChecks??={};s.sourceChecks[source.id]=checked;await this.store.save(s);
    }
   }
   s.status='complete';s.currentStage=null;s.currentProvider=null;s.currentStep=null;s.completedAt=new Date().toISOString();s.runFinishedAt=s.completedAt;
   await this.store.save(s);
  }catch(e){
   s.status=controller.signal.aborted?'paused':'failed';s.error=e.message;s.currentStage=null;s.currentStep=null;s.runFinishedAt=new Date().toISOString();
   await this.store.save(s);
  }
 }
 async retrieveSources(s,controller,{finalOnly}) {
  if(!this.sourceChecker)return;
  const limit={overview:1,standard:3,deep:5}[s.depth]||3;
  const sources=sourceCheckCandidates(s,{limit,finalOnly});
  for(const source of sources){
   if(controller.signal.aborted)throw new Error('Discussion paused');
   if(s.sourceChecks?.[source.id])continue;
   // Reuse only the same URL, DOI, title and quotation; never transfer a different quote's match.
   const synthesisReview=s.messages.findLast(m=>m.stage==='synthesis'&&!m.stale&&!m.manual)?.evidenceReview||[];
   const reusable=mergeReviews(synthesisReview,s.pendingEvidenceReview||[],snapshotChecks(analysisFor(s).sources))
    .filter(r=>r.identity===sourceCheckIdentity(source))
    .sort((a,b)=>(Date.parse(a.check.checkedAt)||0)-(Date.parse(b.check.checkedAt)||0)).at(-1);
   if(reusable){s.sourceChecks??={};s.sourceChecks[source.id]=structuredClone(reusable.check);s.sourceCheckReuse??={};s.sourceCheckReuse[source.id]=reusable.sourceId;await this.store.save(s);continue}
   s.currentStage='source_check';s.sourceCheckPhase=finalOnly?'after_synthesis':'before_synthesis';s.currentProvider=null;s.currentStep=source.id;s.stepStartedAt=new Date().toISOString();
   await this.store.save(s);
   let checked;
   try{checked=await this.sourceChecker(source,{signal:controller.signal})}
   catch(e){if(controller.signal.aborted)throw e;checked={status:'unavailable',checkedAt:new Date().toISOString(),metadata:null,retrievedUrl:null,access:'unavailable',quoteMatch:null,note:'Source retrieval could not be completed. '+String(e.message||e).slice(0,300)}}
   if(controller.signal.aborted)throw new Error('Discussion paused');
   s.sourceChecks??={};s.sourceChecks[source.id]=checked;await this.store.save(s);
  }
  s.sourceCheckPhase=null;
 }
 moveToTrash(id){if(this.active?.id===id)throw new Error('Pause the active discussion before deleting it.');return this.store.moveToTrash(id)}
 async cancel(id){const lock=this.active;if(lock?.id!==id)throw new Error('This session is not running');lock.controller.abort();await lock.finished;return this.store.get(id)}
}
