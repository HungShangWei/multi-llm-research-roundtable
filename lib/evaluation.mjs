import {randomInt, randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {mkdir, readFile, readdir, writeFile, rename} from 'node:fs/promises';
import path from 'node:path';
import {Engine, SessionStore} from './engine.mjs';
import {validateRequest} from './protocol.mjs';
import {analysisFor, baseSteps, depthPolicies, proseOnly} from './research.mjs';

const suite = JSON.parse(readFileSync(new URL('../data/evaluation-suite.json', import.meta.url), 'utf8'));
const validId = id => typeof id === 'string' && /^[a-f0-9-]{36}$/.test(id);
const clone = value => structuredClone(value);
const now = () => new Date().toISOString();
const criteria = ['citationSupport', 'omissions', 'usefulness'];
const emptyRating = () => ({citationSupport:null, omissions:null, usefulness:null, reason:'', ratedAt:null, ratedAfterReveal:false});
export function evaluationSuite() { return clone(suite); }

function callsFor(input) {
  const shape = {protocolVersion:3, participants:input.participants, chair:input.chair, depth:input.depth, mode:'roundtable'};
  const minimum = baseSteps(shape).length;
  const maximum = minimum + (depthPolicies[input.depth]?.verificationLimit || 0);
  const baseline=baseSteps({...shape,participants:[input.chair],mode:'single'}).length;
  return {baseline:{min:baseline,max:baseline}, roundtable:{min:minimum,max:maximum}, total:{min:minimum+baseline,max:maximum+baseline},
    scope:'Primary model calls for a fresh pair; retries and provider-internal auxiliary calls are additional. Source retrieval is separate.'};
}
function inputFor(input) {
  if (!input || typeof input !== 'object') throw new Error('Invalid evaluation request');
  const testCase = suite.cases.find(c => c.id === input.caseId);
  if (!testCase) throw new Error('Unknown evaluation case');
  if (!Array.isArray(input.participants) || input.participants.length < 2 || input.participants.length > 5 ||
      input.participants.some(p => typeof p !== 'string' || !/^[a-z][a-z0-9_-]{0,59}$/i.test(p)) || new Set(input.participants).size !== input.participants.length)
    throw new Error('Choose two to five distinct platforms for the evaluation');
  if (!input.participants.includes(input.chair)) throw new Error('The evaluation chair must be a selected platform');
  const answerLanguage = input.answerLanguage ?? 'zh';
  if (!['zh','en','auto'].includes(answerLanguage)) throw new Error('Unknown answer language');
  const evidenceSince = input.evidenceSince ?? '';
  if (typeof evidenceSince !== 'string' || (evidenceSince && (!/^\d{4}-\d{2}-\d{2}$/.test(evidenceSince) ||
      Number.isNaN(Date.parse(evidenceSince)) || new Date(evidenceSince).toISOString().slice(0,10) !== evidenceSince || evidenceSince > now().slice(0,10))))
    throw new Error('Evidence start date must be a valid date no later than today');
  const language = answerLanguage === 'en' ? 'en' : 'zh';
  const currentDate = now().slice(0,10);
  const request = validateRequest({question:testCase.question[language], topic:testCase.topic, answerLang:answerLanguage,
    participants:input.participants, chair:input.chair, depth:input.depth ?? 'standard', decision:testCase.decision[language],
    evidence:`Evaluation case version ${suite.version}. Comparison created on ${currentDate}. ${evidenceSince ? `Focus the evidence search on ${evidenceSince} through the actual retrieval date, while retaining older foundational evidence when needed and explaining why.` : 'Search current evidence through the actual retrieval date, retaining foundational studies when appropriate.'}`,
    attachments:[], useBrief:false}, input.participants);
  return {request, answerLanguage, evidenceSince, caseSnapshot:{id:testCase.id, title:clone(testCase.title), topic:testCase.topic,
    question:request.question, decision:clone(request.decision), focus:clone(testCase.focus), suiteVersion:suite.version, suiteAsOf:suite.asOf, currentDate}};
}

export class EvaluationStore {
  constructor(dataDir) { this.directory=path.join(dataDir,'evaluations'); this.cache=new Map(); this.writes=new Map(); }
  async init() {
    await mkdir(this.directory,{recursive:true,mode:0o700});
    for (const entry of await readdir(this.directory,{withFileTypes:true})) {
      if (!entry.isDirectory() || !validId(entry.name)) continue;
      try {
        const record=JSON.parse(await readFile(path.join(this.directory,entry.name,'evaluation.json'),'utf8'));
        if (record.id !== entry.name || record.schemaVersion !== 1) continue;
        this.cache.set(record.id,record);
        if (record.status === 'running') {
          record.status='paused'; record.error='The local service restarted. Completed responses were preserved.';
          for (const arm of Object.values(record.arms)) if (arm.status === 'running') {arm.status='paused';arm.measurementsIncomplete=true;}
          await this.save(record);
        }
      } catch { /* A damaged comparison must not prevent unrelated records opening. */ }
    }
    return this;
  }
  get(id) { if (!validId(id) || !this.cache.has(id)) throw new Error('Evaluation not found'); return this.cache.get(id); }
  sessionsDirectory(id) { this.get(id); return path.join(this.directory,id,'sessions'); }
  async save(record) {
    if (this.cache.get(record.id) !== record) throw new Error('Evaluation is no longer current');
    record.updatedAt=now();
    const snapshot=JSON.stringify(record,null,2), directory=path.join(this.directory,record.id);
    const previous=this.writes.get(record.id)||Promise.resolve();
    const pending=previous.catch(()=>{}).then(async()=>{
      await mkdir(directory,{recursive:true,mode:0o700});
      const destination=path.join(directory,'evaluation.json'),temporary=destination+'.'+randomUUID()+'.tmp';
      await writeFile(temporary,snapshot,{mode:0o600}); await rename(temporary,destination);
    });
    this.writes.set(record.id,pending);
    try { await pending; } finally { if(this.writes.get(record.id)===pending)this.writes.delete(record.id); }
    return record;
  }
  async create(input) {
    const normalized=inputFor(input), id=randomUUID();
    const methods=randomInt(2) ? ['baseline','roundtable'] : ['roundtable','baseline'];
    const record={schemaVersion:1,id,createdAt:now(),updatedAt:now(),status:'queued',error:null,
      fixture:input.fixture === true, fixtureNote:input.fixture === true ? 'Simulated test fixture; not real answer-quality evidence.' : null,
      ...normalized,participants:[...input.participants],chair:input.chair,depth:normalized.request.depth,
      mapping:{A:methods[0],B:methods[1]},runOrder:randomInt(2)?['A','B']:['B','A'],providerSnapshot:null,
      callEstimate:callsFor(normalized.request),revealedAt:null,
      arms:Object.fromEntries(['A','B'].map(side=>[side,{status:'queued',sessionId:null,answer:'',error:null,
        elapsedMs:0,providerCalls:0,retrievalCalls:0,attempts:0,reportedUsage:[],observedModels:[],measurementsIncomplete:false,metrics:null,rating:emptyRating(),ratingHistory:[]}]))};
    this.cache.set(id,record);
    try { await this.save(record); return record; } catch(e) { this.cache.delete(id); throw e; }
  }
  list() {
    return [...this.cache.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(record=>{
      const view=this.publicView(record);
      return {id:view.id,createdAt:view.createdAt,updatedAt:view.updatedAt,status:view.status,caseSnapshot:view.caseSnapshot,
        depth:view.depth,fixture:view.fixture,revealedAt:view.revealedAt,completedArms:Object.values(record.arms).filter(a=>a.status==='complete').length};
    });
  }
  publicView(input) {
    const record=typeof input==='string'?this.get(input):input;
    if (!record || this.cache.get(record.id)!==record) throw new Error('Evaluation not found');
    const revealed=!!record.revealedAt;
    const view={id:record.id,createdAt:record.createdAt,updatedAt:record.updatedAt,status:record.status,
      caseSnapshot:clone(record.caseSnapshot),depth:record.depth,answerLanguage:record.answerLanguage,evidenceSince:record.evidenceSince,
      fixture:record.fixture,fixtureNote:record.fixtureNote,callEstimate:clone(record.callEstimate),revealedAt:record.revealedAt,
      maskingNote:'Platform fields and per-answer cost metrics are hidden until reveal. Answer text may still disclose its origin; this is not a strict double-blind study.',
      qualityNote:'Retrieval and quote matching are mechanical observations. Human ratings are separate; no automatic quality winner is calculated.',
      arms:{}};
    for (const side of ['A','B']) {
      const arm=record.arms[side];
      view.arms[side]={status:arm.status,answer:arm.answer,rating:clone(arm.rating),ratingHistory:clone(arm.ratingHistory),
        metrics:revealed?clone(arm.metrics):null,error:arm.error ? (revealed?arm.error:'This answer did not finish. Completed work is saved; retry or reveal details.') : null};
      if (revealed) {view.arms[side].method=record.mapping[side];view.arms[side].observedModels=clone(arm.observedModels||[]);}
    }
    if (revealed) {
      view.mapping=clone(record.mapping); view.participants=[...record.participants];view.chair=record.chair;
      // Executable paths remain local internals even after reveal.
      view.modelSnapshot=Object.fromEntries(Object.entries(record.providerSnapshot||{}).map(([id,p])=>[id,
        {name:p.name,model:p.model||null,version:p.version||null,reasoningEffort:p.reasoningEffort||null}]));
      view.error=record.error;
    }
    return view;
  }
  async rate(id,input) {
    const record=this.get(id),side=input?.side;
    if (!['A','B'].includes(side)) throw new Error('Choose answer A or B');
    if (record.arms[side].status!=='complete') throw new Error('An answer must finish before it can be rated');
    const rating={};
    for(const key of criteria){const value=input[key]??null;if(value!==null&&(!Number.isInteger(value)||value<1||value>5))throw new Error('Ratings must be unknown or integers from 1 to 5');rating[key]=value;}
    if(typeof(input.reason??'')!=='string'||(input.reason||'').length>6000)throw new Error('Rating reason is too long');
    rating.reason=(input.reason||'').trim();
    if(criteria.some(key=>rating[key]!==null)&&!rating.reason)throw new Error('Explain the basis for the rating');
    rating.ratedAt=now();rating.ratedAfterReveal=!!record.revealedAt;
    const arm=record.arms[side];if(arm.rating.ratedAt)arm.ratingHistory.push(clone(arm.rating));
    arm.rating=rating;await this.save(record);return this.publicView(record);
  }
  async reveal(id) {
    const record=this.get(id);if(record.status==='running')throw new Error('Pause or finish the comparison before revealing platforms');
    if(!record.revealedAt){record.revealedAt=now();await this.save(record);}
    return this.publicView(record);
  }
  async export(id) {
    const record=this.get(id);
    if(!record.revealedAt)throw new Error('Reveal the platforms before exporting original responses');
    if(record.status==='running')throw new Error('Pause or finish the comparison before exporting');
    const originalSessions={};
    for(const side of ['A','B']){
      const sessionId=record.arms[side].sessionId;
      if(!sessionId){originalSessions[side]=null;continue;}
      if(!validId(sessionId))throw new Error('Invalid saved evaluation session');
      const session=JSON.parse(await readFile(path.join(this.sessionsDirectory(record.id),sessionId+'.json'),'utf8'));
      if(session.id!==sessionId||session.evaluationId!==record.id)throw new Error('Saved evaluation session identity does not match');
      originalSessions[side]=withoutInternalPaths(session);
    }
    return {...this.publicView(record),exportedAt:now(),originalSessions,
      exportNote:'Original answer text is preserved, including model-reported structured annotations. Executable and runtime path fields are omitted. Exported source checks do not establish claim truth.'};
  }
}

function withoutInternalPaths(value){
  if(!value||typeof value!=='object')return value;
  if(Array.isArray(value))return value.map(withoutInternalPaths);
  const hidden=new Set(['binary','cwd','runtimeDir','sessionDirectory','directory','outputFile','stderrPath','stdoutPath','logFile','configPath']);
  return Object.fromEntries(Object.entries(value).filter(([key])=>!hidden.has(key)).map(([key,item])=>
    [key,key==='text'?clone(item):withoutInternalPaths(item)]));
}

// Preserve reported numeric usage without treating incompatible provider units as
// a price or a comparable total. Unknown reports remain null.
function numericUsage(value,depth=0) {
  if(typeof value==='number')return Number.isFinite(value)?value:null;
  if(!value||typeof value!=='object'||Array.isArray(value)||depth>3)return null;
  const result={};for(const[key,item]of Object.entries(value).slice(0,60)){const clean=numericUsage(item,depth+1);if(clean!==null)result[key]=clean;}
  return Object.keys(result).length?result:null;
}
function metricsFor(session,arm) {
  const a=analysisFor(session),checked=a.sources.filter(s=>s.check),statuses={};
  for(const source of checked)statuses[source.check.status]=(statuses[source.check.status]||0)+1;
  return {elapsedMs:arm.measurementsIncomplete?null:arm.elapsedMs,recordedElapsedMs:arm.elapsedMs,measurementsIncomplete:!!arm.measurementsIncomplete,
    providerCalls:arm.providerCalls,retrievalCalls:arm.retrievalCalls,
    reportedUsage:arm.reportedUsage.some(Boolean)?clone(arm.reportedUsage):null,attempts:arm.attempts,
    monetaryCost:null,remainingSubscriptionQuota:null,
    sourceChecks:{scope:'All non-stale message stages in this arm, including independent responses and critiques; reused checks can occur on multiple citation occurrences. These are not just final-answer checks.',citationOccurrences:a.sources.length,sourceGroups:a.sourceGroups?.length??null,checkedOccurrences:checked.length,
      statusCounts:statuses,quoteMatched:checked.filter(s=>s.check.quoteMatch===true).length,
      quoteNotMatched:checked.filter(s=>s.check.quoteMatch===false).length,quoteNotCompared:checked.filter(s=>s.check.quoteMatch==null).length},
    note:'Counts describe execution and source retrieval, not answer quality or independent study counts. Provider calls include failed attempts; reported usage may be incomplete and use different units. After an interrupted service, elapsed time is unknown and other recorded counters may be incomplete.'};
}
export class EvaluationCoordinator {
  constructor({store,brief,getProviders,runner,runtimeDir,sourceChecker}) {
    Object.assign(this,{store,brief,getProviders,runner,runtimeDir,sourceChecker});this.active=null;this.task=null;
  }
  async start(id) {
    if(this.active)throw new Error('A comparison is already running');
    const record=this.store.get(id);
    if(record.status==='complete')throw new Error('This comparison is already complete');
    let finish;
    const lock={id,controller:new AbortController(),engine:null,sessionId:null,finished:new Promise(resolve=>{finish=resolve;})};this.active=lock;
    record.status='running';record.error=null;
    try{await this.store.save(record);}catch(e){this.active=null;finish();throw e;}
    this.task=this.execute(record,lock).catch(async e=>{
      record.status=lock.controller.signal.aborted?'paused':'failed';record.error=String(e.message||e);await this.store.save(record);
    }).finally(()=>{if(this.active===lock)this.active=null;finish();});
    return this.store.publicView(record);
  }
  async execute(record,lock) {
    const abort=()=>{if(lock.controller.signal.aborted)throw new Error('Comparison paused');};
    const providers=await this.getProviders();abort();
    const selected=record.participants.map(id=>providers.find(p=>p.id===id));
    if(selected.some(p=>!p?.ready))throw new Error('One or more selected platforms are not connected');
    if(!record.providerSnapshot){
      record.providerSnapshot=Object.fromEntries(selected.map(p=>[p.id,{id:p.id,name:p.name||p.id,model:p.model||'',binary:p.binary,
        version:p.version||null,reasoningEffort:p.reasoningEffort||null}]));await this.store.save(record);
    }else if(selected.some(p=>record.providerSnapshot[p.id]?.binary!==p.binary))throw new Error('A platform executable changed. Create a new comparison.');
    const fixedProviders=selected.map(p=>({...p,...record.providerSnapshot[p.id],ready:true}));
    const sessions=new SessionStore(this.store.sessionsDirectory(record.id));await sessions.init();abort();
    for(const side of record.runOrder){
      abort();const arm=record.arms[side],single=record.mapping[side]==='baseline';
      if(arm.status==='complete')continue;
      let session;
      if(arm.sessionId)session=sessions.get(arm.sessionId);
      else{
        const request=clone(record.request);if(single){request.participants=[record.chair];request.chair=record.chair;}
        session=await sessions.create({...request,evaluationId:record.id,evaluationFixture:record.fixture},this.brief);
        session.modelSnapshot=Object.fromEntries(request.participants.map(id=>{const p=record.providerSnapshot[id];return[id,{model:p.model,binary:p.binary,version:p.version,reasoningEffort:p.reasoningEffort}]}));
        await sessions.save(session);arm.sessionId=session.id;await this.store.save(record);
      }
      // A crash may have occurred after the session completed but before the
      // comparison's result was committed. Recover without another model call.
      if(session.status==='complete'){
        this.capture(record,side,session);await this.store.save(record);continue;
      }
      arm.status='running';arm.error=null;arm.attempts++;await this.store.save(record);
      const started=Date.now();
      const runner=async(...args)=>{abort();arm.providerCalls++;await this.store.save(record);const result=await this.runner(...args);arm.reportedUsage.push(numericUsage(result.usage));return result;};
      const sourceChecker=this.sourceChecker?async(...args)=>{abort();arm.retrievalCalls++;return this.sourceChecker(...args);}:undefined;
      const engine=new Engine({store:sessions,brief:this.brief,getProviders:async()=>fixedProviders,runner,
        runtimeDir:path.join(this.runtimeDir,'evaluations',record.id),sourceChecker});
      lock.engine=engine;lock.sessionId=session.id;
      const onAbort=()=>{engine.active?.controller.abort();};lock.controller.signal.addEventListener('abort',onAbort,{once:true});
      try{abort();await engine.start(session.id,{single});await engine.task;}
      catch(e){session.status=lock.controller.signal.aborted?'paused':'failed';session.error=String(e.message||e);await sessions.save(session);}
      finally{lock.controller.signal.removeEventListener('abort',onAbort);arm.elapsedMs+=Math.max(0,Date.now()-started);lock.engine=null;lock.sessionId=null;}
      this.capture(record,side,session);await this.store.save(record);
      abort();if(arm.status!=='complete')throw new Error(arm.error||'An evaluation answer did not finish');
    }
    record.status='complete';record.completedAt=now();record.error=null;await this.store.save(record);
  }
  capture(record,side,session){
    const arm=record.arms[side],single=record.mapping[side]==='baseline';
    arm.status=session.status;arm.error=session.error||null;
    const answer=session.messages.findLast(m=>!m.stale&&m.stage==='synthesis') ||
      (single?session.messages.findLast(m=>!m.stale&&m.stage==='independent'):null);
    arm.answer=answer?proseOnly(answer.text):'';arm.metrics=metricsFor(session,arm);
    arm.observedModels=session.messages.filter(m=>!m.stale).map(m=>({provider:m.provider,providerName:m.providerName||m.provider,
      stage:m.stage,model:m.model||null,modelProvenance:m.modelProvenance||'not reported',requestedModel:m.requestedModel||null,
      requestedReasoningEffort:m.requestedReasoningEffort||null,providerVersion:m.providerVersion||null,
      responseModels:clone(m.responseModels||[]),usageModels:clone(m.usageModels||[]),createdAt:m.createdAt||null}));
  }
  async cancel(id){
    const lock=this.active;if(!lock||lock.id!==id)throw new Error('This comparison is not running');
    lock.controller.abort();lock.engine?.active?.controller.abort();await lock.finished;return this.store.publicView(id);
  }
}
