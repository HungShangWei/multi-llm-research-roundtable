import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {EvaluationStore,EvaluationCoordinator,evaluationSuite} from '../lib/evaluation.mjs';
import {SessionStore} from '../lib/engine.mjs';

// Every runner/source response in this file is simulated. Passing these tests is
// software verification, never an empirical comparison of model answer quality.
const providers=()=>[
  {id:'codex',name:'Codex fixture',model:'fixture-a',binary:'/fixture/a',version:'test-a',reasoningEffort:'ultra',ready:true},
  {id:'claude',name:'Claude fixture',model:'fixture-b',binary:'/fixture/b',version:'test-b',reasoningEffort:'max',ready:true}
];
const request=(extra={})=>({caseId:'daily-strength-frequency',participants:['codex','claude'],chair:'codex',depth:'overview',answerLanguage:'en',fixture:true,...extra});
const response=()=>({text:'Simulated fixture answer; not a real research finding.\n```roundtable-data\n'+JSON.stringify({
  claims:[{id:'C1',statement:'A simulated claim.',sourceIds:['S1'],evidenceType:'inference'}],
  sources:[{id:'S1',title:'Simulated source',url:'https://example.org/test-only',quote:'simulated quote',reportedAccess:'abstract'}],
  disputes:[],summary:{recommendation:'This is only a simulated software test.'}
})+'\n```',model:'fixture-response-model',usage:{input_tokens:12,output_tokens:8},searches:[]});
const source=async()=>({status:'partial',checkedAt:new Date().toISOString(),metadata:null,retrievedUrl:'https://example.org/test-only',access:'abstract',quoteMatch:true,note:'Simulated retrieval; no network request.'});
async function fixture(t,options={}){
  const dir=await mkdtemp(path.join(os.tmpdir(),'roundtable-eval-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const store=new EvaluationStore(dir);await store.init();
  const calls=[];
  const coordinator=new EvaluationCoordinator({store,brief:null,getProviders:options.getProviders||(async()=>providers()),
    runner:async(...args)=>{calls.push(args);return options.runner?options.runner(...args):response();},runtimeDir:path.join(dir,'runtime'),sourceChecker:source});
  return {dir,store,coordinator,calls};
}
async function finish(f,record){await f.coordinator.start(record.id);await f.coordinator.task;return f.store.get(record.id);}

test('fixed bilingual suite has six distinct versioned cases and rubric direction',()=>{
  const s=evaluationSuite();assert.equal(s.cases.length,6);assert.equal(new Set(s.cases.map(c=>c.id)).size,6);
  assert.match(s.asOf,/^\d{4}-\d{2}-\d{2}$/);assert.ok(s.version);assert.match(s.rubric.omissions.en,/Higher means fewer/);
  for(const c of s.cases)for(const lang of ['zh','en']){assert.ok(c.question[lang]);assert.ok(c.title[lang]);assert.ok(c.decision[lang].goal);}
  s.cases.pop();assert.equal(evaluationSuite().cases.length,6);
});
test('create, inspect, reveal and listing are model-free with persistent randomization',async t=>{
  const f=await fixture(t),record=await f.store.create(request());
  assert.equal(f.calls.length,0);assert.equal(record.fixture,true);assert.match(record.fixtureNote,/not real/);
  assert.deepEqual(new Set(Object.values(record.mapping)),new Set(['baseline','roundtable']));
  const reloaded=new EvaluationStore(f.dir);await reloaded.init();assert.deepEqual(reloaded.get(record.id).mapping,record.mapping);
  assert.equal(reloaded.list().length,1);assert.ok(reloaded.publicView(record.id).caseSnapshot.currentDate);
  await reloaded.reveal(record.id);assert.equal(f.calls.length,0);
});
test('input validation rejects invalid dates, duplicate/unknown cases and invalid depth',async t=>{
  const f=await fixture(t);
  for(const extra of [{caseId:'missing'},{participants:['codex','codex']},{chair:'missing'},{depth:'infinite'},
    {answerLanguage:'de'},{evidenceSince:'2026-02-30'},{evidenceSince:'2099-01-01'},{evidenceSince:42}])
    await assert.rejects(f.store.create(request(extra)));
  assert.equal(f.store.list().length,0);assert.equal(f.calls.length,0);
});
test('call estimates account for depth and do not promise quota or quality',async t=>{
  const f=await fixture(t);
  for(const [depth,expected] of [['overview',{min:5,max:5}],['standard',{min:7,max:8}],['deep',{min:7,max:9}]]){
    const r=await f.store.create(request({depth}));assert.deepEqual(r.callEstimate.total,expected);
    assert.match(r.callEstimate.scope,/retries/i);
  }
});
test('real arm workflow uses isolated sessions, matching questions and a single chair baseline',async t=>{
  const f=await fixture(t),normal=new SessionStore(path.join(f.dir,'sessions'));await normal.init();
  const record=await f.store.create(request({evidenceSince:'2020-01-01'}));await finish(f,record);
  assert.equal(record.status,'complete');assert.equal(f.calls.length,5);assert.equal(normal.list().length,0);
  const sessions=[];
  for(const side of ['A','B'])sessions.push([side,JSON.parse(await readFile(path.join(f.store.sessionsDirectory(record.id),record.arms[side].sessionId+'.json'),'utf8'))]);
  assert.equal(sessions[0][1].question,sessions[1][1].question);assert.deepEqual(sessions[0][1].decision,sessions[1][1].decision);
  assert.equal(sessions[0][1].evidence,sessions[1][1].evidence);assert.equal(sessions[0][1].evaluationFixture,true);
  const baseline=sessions.find(([side])=>record.mapping[side]==='baseline')[1];assert.deepEqual(baseline.participants,['codex']);assert.equal(baseline.messages.length,2);
  assert.equal(f.coordinator.active,null);await assert.rejects(f.coordinator.start(record.id),/already complete/);
});
test('masked public response excludes identities, internal IDs, raw blocks and cost side channels',async t=>{
  const f=await fixture(t),record=await f.store.create(request());await finish(f,record);
  const view=f.store.publicView(record),json=JSON.stringify(view);
  assert.equal(view.mapping,undefined);assert.equal(view.participants,undefined);assert.equal(view.modelSnapshot,undefined);
  assert.equal(view.arms.A.metrics,null);assert.equal(view.arms.B.metrics,null);assert.equal(view.arms.A.method,undefined);
  assert.equal(view.arms.A.observedModels,undefined);
  assert.equal(view.arms.A.sessionId,undefined);assert.ok(!json.includes('fixture-a'));assert.ok(!json.includes('/fixture/a'));
  assert.ok(!view.arms.A.answer.includes('roundtable-data'));assert.ok(!view.arms.B.answer.includes('roundtable-data'));
  assert.match(view.maskingNote,/not a strict double-blind/);
});
test('reveal returns measured execution and separate checks without declaring a winner',async t=>{
  const f=await fixture(t),record=await f.store.create(request());await finish(f,record);
  const view=await f.store.reveal(record.id),single=Object.values(view.arms).find(a=>a.method==='baseline'),round=Object.values(view.arms).find(a=>a.method==='roundtable');
  assert.equal(single.metrics.providerCalls,2);assert.equal(round.metrics.providerCalls,3);
  assert.ok(single.metrics.elapsedMs>=0);assert.equal(single.metrics.reportedUsage[0].input_tokens,12);
  assert.ok(single.metrics.sourceChecks.quoteMatched>=1);assert.equal(single.metrics.monetaryCost,null);
  assert.equal(single.metrics.remainingSubscriptionQuota,null);assert.equal(view.winner,undefined);assert.equal(view.qualityScore,undefined);
  assert.equal(view.modelSnapshot.codex.binary,undefined);assert.equal(view.modelSnapshot.codex.reasoningEffort,'ultra');
  assert.ok(single.observedModels.every(m=>m.model==='fixture-response-model'));
  assert.match(single.metrics.sourceChecks.scope,/All non-stale message stages/);
});
test('unknown usage stays null and never becomes zero monetary cost',async t=>{
  const f=await fixture(t,{runner:async()=>({...response(),usage:undefined})}),record=await f.store.create(request());await finish(f,record);
  const view=await f.store.reveal(record.id);for(const arm of Object.values(view.arms)){assert.equal(arm.metrics.reportedUsage,null);assert.equal(arm.metrics.monetaryCost,null);}
});
test('human ratings require complete answers, valid scales and reasons; reveal history is explicit',async t=>{
  const f=await fixture(t),record=await f.store.create(request());
  await assert.rejects(f.store.rate(record.id,{side:'A',usefulness:4,reason:'Not done'}),/finish/);
  await finish(f,record);await assert.rejects(f.store.rate(record.id,{side:'A',usefulness:6,reason:'bad'}));
  await assert.rejects(f.store.rate(record.id,{side:'A',usefulness:4}),/Explain/);
  let view=await f.store.rate(record.id,{side:'A',citationSupport:null,omissions:3,usefulness:4,reason:'Simulated rating of fixture coverage.'});
  assert.equal(view.arms.A.rating.ratedAfterReveal,false);assert.equal(view.arms.A.rating.citationSupport,null);
  await f.store.reveal(record.id);view=await f.store.rate(record.id,{side:'A',usefulness:3,reason:'Changed after viewing the method.'});
  assert.equal(view.arms.A.rating.ratedAfterReveal,true);assert.equal(view.arms.A.ratingHistory[0].ratedAfterReveal,false);
  assert.equal(f.calls.length,5);assert.equal(view.arms.B.rating.usefulness,null);
});
test('failed call preserves completed steps and retries only unfinished work',async t=>{
  let count=0;const f=await fixture(t,{runner:async()=>{count++;if(count===2)throw new Error('Simulated fixture provider outage');return response();}});
  const record=await f.store.create(request());await finish(f,record);assert.equal(record.status,'failed');
  const masked=f.store.publicView(record);assert.ok(!JSON.stringify(masked).includes('fixture provider outage'));
  await finish(f,record);assert.equal(record.status,'complete');assert.equal(count,6);
  assert.equal(Object.values(record.arms).reduce((n,a)=>n+a.providerCalls,0),6);
});
test('platform model snapshot remains identical across retries while a binary change is rejected',async t=>{
  let count=0,catalog=providers();const f=await fixture(t,{getProviders:async()=>catalog,runner:async()=>{count++;if(count===2)throw new Error('Simulated outage');return response();}});
  const record=await f.store.create(request());await finish(f,record);
  catalog=providers().map(p=>({...p,model:'newer-unrequested-fixture-model'}));await finish(f,record);
  assert.equal(record.status,'complete');assert.ok(f.calls.every(([p])=>p.model!==catalog[0].model));
  const another=await f.store.create(request());another.providerSnapshot=Object.fromEntries(providers().map(p=>[p.id,{...p,binary:'/changed/fixture'}]));
  await finish(f,another);assert.equal(another.status,'failed');assert.match(another.error,/executable changed/);
});
test('cancel blocks concurrent comparisons and resume completes without losing results',async t=>{
  let started;const inFlight=new Promise(resolve=>{started=resolve;});let block=true;
  const f=await fixture(t,{runner:async(_p,_prompt,{signal})=>{if(block){started();return new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(new Error('Simulated canceled call')),{once:true});});}return response();}});
  const record=await f.store.create(request()),other=await f.store.create(request({caseId:'academic-small-sample'}));
  await f.coordinator.start(record.id);await inFlight;
  await assert.rejects(f.coordinator.start(other.id),/already running/);await assert.rejects(f.store.reveal(record.id),/Pause/);
  const paused=await f.coordinator.cancel(record.id);assert.equal(paused.status,'paused');assert.equal(f.coordinator.active,null);
  block=false;await finish(f,record);assert.equal(record.status,'complete');assert.equal(f.calls.length,6);
});
test('restart and late capture recover completed sessions without rerunning models',async t=>{
  const f=await fixture(t),record=await f.store.create(request());await finish(f,record);
  record.status='running';record.arms.A.status='running';await f.store.save(record);
  const reloaded=new EvaluationStore(f.dir);await reloaded.init();assert.equal(reloaded.get(record.id).status,'paused');
  assert.equal(reloaded.get(record.id).arms.A.status,'paused');
  const recovered=new EvaluationCoordinator({store:reloaded,getProviders:async()=>providers(),runner:async()=>{throw new Error('No new call should be needed');},runtimeDir:path.join(f.dir,'runtime'),sourceChecker:source});
  await recovered.start(record.id);await recovered.task;assert.equal(reloaded.get(record.id).status,'complete');assert.equal(f.calls.length,5);
  const revealed=await reloaded.reveal(record.id);assert.equal(revealed.arms.A.metrics.measurementsIncomplete,true);assert.equal(revealed.arms.A.metrics.elapsedMs,null);
});
test('export requires reveal, preserves original structured responses and omits internal executable paths',async t=>{
  const f=await fixture(t),record=await f.store.create(request());
  await assert.rejects(f.store.export(record.id),/Reveal/);await finish(f,record);await assert.rejects(f.store.export(record.id),/Reveal/);
  await f.store.reveal(record.id);const exported=await f.store.export(record.id);
  assert.equal(exported.id,record.id);assert.ok(exported.exportedAt);assert.deepEqual(exported.mapping,record.mapping);
  for(const side of ['A','B']){
    const saved=JSON.parse(await readFile(path.join(f.store.sessionsDirectory(record.id),record.arms[side].sessionId+'.json'),'utf8'));
    assert.deepEqual(exported.originalSessions[side].messages,saved.messages);
    assert.match(exported.originalSessions[side].messages[0].text,/```roundtable-data/);
    assert.equal(exported.originalSessions[side].modelSnapshot.codex.binary,undefined);
    assert.equal(exported.originalSessions[side].messages[0].model,'fixture-response-model');
  }
  assert.ok(!JSON.stringify(exported).includes('/fixture/a'));assert.equal(f.calls.length,5);
});
test('export distinguishes an unstarted arm from a missing saved response',async t=>{
  const f=await fixture(t),record=await f.store.create(request());await f.store.reveal(record.id);
  const queued=await f.store.export(record.id);assert.deepEqual(queued.originalSessions,{A:null,B:null});
  await finish(f,record);
  await rm(path.join(f.store.sessionsDirectory(record.id),record.arms.A.sessionId+'.json'));
  await assert.rejects(f.store.export(record.id));
});
