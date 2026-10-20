import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverBinary,definitions,qualityDefaults,reasoningForModel,invocation,subscriptionEnv,inspectProviders,redact} from '../lib/providers.mjs';
import {classifyProviderError,compatibilityFromHelp,diagnoseProviderUsing,requiredFlags,subscriptionStatus} from '../lib/diagnostics.mjs';

function fixture(id, overrides={}) {
  const calls=[];
  const help=requiredFlags[id].join('\n')+'\n--config\n--effort low medium high xhigh max';
  const deps={
    definitions,qualityDefaults,reasoningForModel,
    discoverBinary:async()=>({binary:'/fake/'+id,version:'1.2.3',rejected:[]}),
    googlePolicy:async()=>null,
    runProcess:async(binary,args)=>{
      calls.push(args);
      if(args.includes('--help'))return {code:0,output:help,stderr:''};
      if(args[0]==='login')return {code:0,output:'',stderr:'Logged in using ChatGPT'};
      if(args[0]==='auth')return {code:0,output:JSON.stringify({loggedIn:true,authMethod:'claude.ai',email:'must-not-escape@example.org'}),stderr:''};
      if(args[0]==='models')return {code:0,output:'gemini-3.1-pro-high\tGemini Pro\ngemini-3-flash\tFlash\n',stderr:''};
      throw new Error('Unexpected command: '+args.join(' '));
    },...overrides
  };
  return {calls,deps};
}

test('binary discovery rejects broken or invalid version wrappers and uses the next candidate',async()=>{
  const seen=[];
  const result=await discoverBinary({id:'codex',command:'codex',paths:['/broken','/wrong','/valid']},{searchPath:'',accessFile:async()=>{},runner:async(binary,args)=>{
    seen.push([binary,args]);
    return binary==='/broken'?{code:1,output:'',stderr:'spawn native ENOENT'}:binary==='/wrong'?{code:0,output:'some unrelated executable'}:{code:0,output:'codex-cli 0.159.0-alpha.12.1'};
  }});
  assert.equal(result.binary,'/valid');
  assert.equal(result.version,'0.159.0-alpha.12.1');
  assert.equal(result.rejected.length,2);
  assert.ok(seen.every(([,args])=>JSON.stringify(args)==='["--version"]'));
});

test('Codex updated bundle paths precede legacy paths and defaults stay unchanged',()=>{
  assert.equal(definitions[0].paths[0],'/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex');
  assert.equal(qualityDefaults.codex,'gpt-6-astra');
  assert.equal(reasoningForModel('codex',qualityDefaults.codex),'ultra');
  assert.equal(qualityDefaults.claude,'opus');
  assert.equal(reasoningForModel('claude','opus'),'max');
  const c=invocation({id:'codex',model:qualityDefaults.codex,reasoningEffort:'ultra'},'secret research');
  assert.equal(c.stdin,'secret research');
  assert.ok(c.args.includes('model_reasoning_effort="ultra"'));
  const a=invocation({id:'claude',model:'opus',reasoningEffort:'max'},'secret research');
  assert.equal(a.stdin,'secret research');
  assert.ok(!a.args.includes('secret research'));
  assert.ok(a.args.includes('max'));
});

test('read-only Codex diagnostic never claims model/effort access was tested',async()=>{
  const {deps,calls}=fixture('codex');
  const report=await diagnoseProviderUsing('codex',{}, {},deps);
  assert.equal(report.installation.status,'available');
  assert.equal(report.auth.status,'subscription');
  assert.equal(report.requestedModel,'gpt-6-astra');
  assert.equal(report.requestedEffort,'ultra');
  assert.equal(report.compatibility.model.status,'unverified');
  assert.equal(report.compatibility.effort.status,'unverified');
  assert.equal(report.generationUsed,false);
  assert.equal(report.ready,true);
  assert.equal(report.guidance.loginCommand,'codex login');
  assert.equal(report.guidance.resolvedLoginCommand,"'/fake/codex' 'login'");
  assert.ok(calls.every(args=>args.includes('--help')||args.join(' ')==='login status'));
});

test('resolved sign-in command safely quotes the verified binary and uses fixed arguments',async()=>{
  const binary="/Applications/Researcher's $(untrusted) App/claude";
  const f=fixture('claude',{discoverBinary:async()=>({binary,version:'2.1.278',rejected:[]})});
  const r=await diagnoseProviderUsing('claude',{}, {},f.deps);
  assert.equal(r.guidance.loginCommand,'claude auth login --claudeai');
  assert.equal(r.guidance.resolvedLoginCommand,"'/Applications/Researcher'\\''s $(untrusted) App/claude' 'auth' 'login' '--claudeai'");
  assert.ok(f.calls.every(args=>args.includes('--help')||args.join(' ')==='auth status --json'));
});

test('Claude authentication never exposes account JSON and proof does not bypass sign-out',async()=>{
  const f=fixture('claude');
  const report=await diagnoseProviderUsing('claude',{}, {},f.deps);
  assert.equal(report.auth.status,'subscription');
  assert.ok(!JSON.stringify(report).includes('must-not-escape'));
  const signedOut=fixture('claude',{runProcess:async(_b,args)=>args.includes('--help')?{code:0,output:requiredFlags.claude.join(' ')+' --effort max',stderr:''}:{code:1,output:'{"loggedIn":false,"authMethod":"none"}',stderr:''}});
  const r=await diagnoseProviderUsing('claude',{}, {claude:{binary:'/fake/claude'}},signedOut.deps);
  assert.equal(r.auth.status,'signed_out');
  assert.equal(r.ready,false);
  assert.equal(r.issues.at(-1).code,'subscription_unverified');
});

test('explicit Gemini diagnostic lists metadata, keeps Gemini off, and never generates',async()=>{
  const {deps,calls}=fixture('antigravity');
  const proof={};
  const report=await diagnoseProviderUsing('antigravity',{}, proof,deps);
  assert.equal(report.defaultSelected,false);
  assert.equal(report.auth.status,'subscription');
  assert.equal(report.compatibility.model.status,'listed');
  assert.equal(report.ready,true);
  assert.ok(calls.some(args=>args.join(' ')==='models'));
  assert.ok(calls.every(args=>args.join(' ')==='--help'||args.join(' ')==='models'));
  assert.deepEqual(proof.antigravity,{binary:'/fake/antigravity',kind:'metadata'});
  assert.equal(report.guidance.resolvedLoginCommand,"'/fake/antigravity'");
  assert.equal(report.guidance.loginOpensInteractive,true);
});

test('ordinary inspection reuses Gemini metadata proof without a network/model request',async()=>{
  const calls=[];
  const deps={discoverBinary:async d=>({binary:'/fake/'+d.id,version:'1.2.3',rejected:[]}),googlePolicy:async()=>null,runProcess:async(binary,args)=>{
    calls.push([binary,args]);
    if(args[0]==='login')return {code:0,output:'Logged in using ChatGPT',stderr:''};
    if(args[0]==='auth')return {code:0,output:'{"loggedIn":true,"authMethod":"claude.ai"}',stderr:''};
    throw new Error('Unexpected background command');
  }};
  const plain=await inspectProviders({}, {},deps);
  assert.equal(plain.find(x=>x.id==='antigravity').ready,false);
  const checked=await inspectProviders({}, {antigravity:{binary:'/fake/antigravity',kind:'metadata'}},deps);
  const google=checked.find(x=>x.id==='antigravity');
  assert.equal(google.ready,true);
  assert.equal(google.auth,'subscription_metadata');
  assert.equal(google.defaultSelected,false);
  assert.ok(calls.every(([binary])=>!binary.endsWith('antigravity')));
});

test('Google API or extra-credit setting blocks even metadata network access',async()=>{
  const f=fixture('antigravity',{googlePolicy:async()=>'Turn off Use G1 Credits in the official Google CLI settings before connecting.'});
  const proof={antigravity:{binary:'/fake/antigravity',kind:'metadata'}};
  const report=await diagnoseProviderUsing('antigravity',{}, proof,f.deps);
  assert.equal(report.auth.status,'blocked');
  assert.equal(report.ready,false);
  assert.equal(report.issues.at(-1).code,'api_billing_blocked');
  assert.ok(!f.calls.some(args=>args[0]==='models'));
  assert.equal(proof.antigravity,undefined);
});

test('diagnostics distinguish missing CLI, incompatible flags and model not listed',async()=>{
  const missing=fixture('claude',{discoverBinary:async()=>({binary:null,version:null,rejected:[]})});
  const mr=await diagnoseProviderUsing('claude',{}, {},missing.deps);
  assert.equal(mr.installation.status,'missing');
  assert.equal(mr.issues[0].code,'tool_missing');
  assert.equal(missing.calls.length,0);
  const compatibility=compatibilityFromHelp('claude','--print --model','opus','max');
  assert.equal(compatibility.status,'incompatible');
  assert.ok(compatibility.requiredFlags.missing.includes('--effort'));
  const gemini=fixture('antigravity');
  const r=await diagnoseProviderUsing('antigravity',{models:{antigravity:'gemini-nonexistent'}},{},gemini.deps);
  assert.equal(r.compatibility.model.status,'unavailable');
  assert.equal(r.ready,false);
  assert.equal(r.issues.at(-1).code,'model_unavailable');
});

test('subscription status distinguishes API login and rejects unsuccessful success-looking output',()=>{
  assert.equal(subscriptionStatus('codex',{code:0,output:'Logged in using an API key',stderr:''}),'api');
  assert.equal(subscriptionStatus('codex',{code:1,output:'Logged in using ChatGPT',stderr:''}),'unknown');
  assert.equal(subscriptionStatus('claude',{code:0,output:'{"loggedIn":true,"authMethod":"console"}'}),'api');
});

test('failure classifier separates quota, request frequency, timeout, cancellation and version failure',()=>{
  const cases=[['usage limit reached','usage_limit'],['HTTP 429 Too many requests','temporary_rate_limit'],['ECONNRESET','network_error'],['The model did not finish within the time limit. Existing responses are saved.','local_timeout'],['Discussion paused','cancelled'],['unknown option --output-format','cli_incompatible'],['model does not exist','model_unavailable'],['reasoning effort is not supported','effort_unsupported'],['official CLI not found','tool_missing'],['spawn native ENOENT','tool_broken'],['Subscription sign-in must be verified before each request.','subscription_unverified'],['The official tool returned no readable answer.','response_format_changed']];
  for(const [message,expected] of cases){const r=classifyProviderError(new Error(message));assert.equal(r.code,expected,message);assert.equal(r.retryAt,null);assert.ok(r.messageZh&&r.messageEn&&r.actionZh&&r.actionEn)}
});

test('unknown failures retain redacted detail; ordinary response objects are not classified by their content',()=>{
  const r=classifyProviderError(new Error('mystery failure access_token=secret123 sk-somethingprivate123 account@example.org'));
  assert.equal(r.code,'unknown');
  assert.ok(r.detail.includes('mystery failure'));
  assert.ok(!r.detail.includes('secret123'));
  assert.ok(!r.detail.includes('somethingprivate'));
  assert.ok(!r.detail.includes('account@example.org'));
  assert.ok(!redact('api_key=hidden-key password=hidden-password').includes('hidden'));
  assert.ok(!redact('password="a secret with spaces"').includes('secret'));
  assert.equal(classifyProviderError({text:'usage limit reached 429',result:'invalid model'}).code,'unknown');
});

test('subscription environment does not forward account/API or model override credentials',()=>{
  const old=process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY='must-not-leave-test';
  try{assert.equal(subscriptionEnv().ANTHROPIC_API_KEY,undefined)}finally{if(old===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=old}
});
