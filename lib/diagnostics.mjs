// Diagnostics never send a prompt or change account, installation or model settings.
export const providerGuidance = Object.freeze({
  codex: {
    installUrl: 'https://learn.chatgpt.com/docs/cli',
    loginUrl: 'https://learn.chatgpt.com/docs/auth',
    installCommand: null,
    loginCommand: 'codex login',
    noteZh: '使用官方安裝頁；若已安裝 ChatGPT 桌面版，圓桌會先尋找隨附工具。登入時選擇 ChatGPT 帳號。',
    noteEn: 'Use the official installation page. The bundled tool is checked first when ChatGPT desktop is installed. Sign in with ChatGPT.'
  },
  claude: {
    installUrl: 'https://code.claude.com/docs/en/setup',
    loginUrl: 'https://code.claude.com/docs/en/authentication',
    installCommand: 'curl -fsSL https://claude.ai/install.sh | bash',
    loginCommand: 'claude auth login --claudeai',
    noteZh: '由你在終端機執行官方安裝或登入；選擇 Claude 訂閱帳號，不使用 Console API 計費。',
    noteEn: 'Run official installation or sign-in yourself in Terminal. Choose your Claude subscription, not Console API billing.'
  },
  antigravity: {
    installUrl: 'https://antigravity.google/docs/cli/install/',
    loginUrl: 'https://antigravity.google/docs/cli/install/#authentication-workflows',
    installCommand: 'curl -fsSL https://antigravity.google/cli/install.sh | bash',
    loginCommand: 'agy',
    loginOpensInteractive: true,
    noteZh: '登入命令會開啟官方互動工具，由你完成 Google 帳號登入，並關閉 Use G1 Credits；Gemini 預設不參與討論。',
    noteEn: 'The sign-in command opens the official interactive tool. Complete Google account sign-in yourself and turn off Use G1 Credits. Gemini remains off by default.'
  }
});

const loginArguments = Object.freeze({codex:['login'],claude:['auth','login','--claudeai'],antigravity:[]});
const shellQuote = value => "'"+String(value).replace(/'/g,"'\\''")+"'";

export function sanitizedDetail(value, maxLength=1600) {
  return String(value ?? '')
    .replace(/\b(?:sk-[\w-]{8,}|ya29\.[\w.-]+|AIza[\w-]{20,}|eyJ[\w-]+\.[\w-]+\.[\w-]+)\b/g, '[redacted]')
    .replace(/\b(Bearer|Basic)\s+[^\s"'<>]+/gi, '$1 [redacted]')
    .replace(/((?:access_token|refresh_token|api[_-]?key|password|client_secret)["']?\s*[:=]\s*)(["'])(.*?)\2/gi, '$1$2[redacted]$2')
    .replace(/((?:access_token|refresh_token|api[_-]?key|password|client_secret)\s*["']?\s*[:=]\s*["']?)[^\s,"';&]+/gi, '$1[redacted]')
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[account]')
    .slice(0, maxLength);
}

const issues = {
  tool_missing: ['找不到官方連線工具。', 'The official connection tool was not found.', '開啟官方安裝說明，完成後重新檢查。', 'Open the official installation guide, then check again.', false],
  tool_broken: ['已找到工具，但它無法正常啟動。', 'The tool was found but could not start correctly.', '依官方說明修復或重新安裝工具，再重新檢查。', 'Repair or reinstall the tool using official instructions, then check again.', false],
  cli_incompatible: ['這個工具版本不支援圓桌需要的功能。', 'This tool version does not support features required by the roundtable.', '查看官方版本說明並更新工具，再重新檢查；模型設定不會自動改變。', 'Check the official release notes and update the tool, then check again. Model settings stay unchanged.', false],
  subscription_unverified: ['尚未確認訂閱帳號登入。', 'Subscription sign-in has not been confirmed.', '在官方工具登入訂閱帳號後重新檢查。', 'Sign in with your subscription in the official tool, then check again.', false],
  api_billing_blocked: ['目前設定可能使用 API 或額外額度，圓桌已停止連線。', 'The current configuration may use API billing or extra credits, so the roundtable stopped.', '在官方工具改用訂閱登入並關閉額外額度，再重新檢查。', 'Use subscription sign-in and disable extra credits in the official tool, then check again.', false],
  model_unavailable: ['目前帳號無法使用所選模型。', 'The selected model is not available to the current account.', '查看官方模型清單或調整模型設定，再手動繼續；圓桌不會自動換模型。', 'Check the official model list or change model settings, then resume manually. No model is switched automatically.', false],
  effort_unsupported: ['所選模型或工具不支援這個推理強度。', 'The selected model or tool does not support this reasoning effort.', '確認官方支援的模型與推理強度，再調整設定。', 'Check the supported model and reasoning effort, then adjust settings.', false],
  usage_limit: ['平台回報使用額度已達上限。', 'The platform reported that its usage limit was reached.', '在官方平台確認恢復時間，額度恢復後手動繼續。已完成回答會保留。', 'Check the reset time in the official platform, then resume manually. Completed responses are preserved.', true],
  temporary_rate_limit: ['平台暫時限制請求頻率。', 'The platform temporarily limited the request rate.', '稍後再手動繼續；圓桌不會自動重試或啟用付費額度。', 'Resume manually later. The roundtable will not automatically retry or enable paid credits.', true],
  network_error: ['與平台的連線中斷或無法建立。', 'The connection to the platform was interrupted or could not be established.', '確認網路或平台服務狀態，再手動繼續。', 'Check your connection or the platform status, then resume manually.', true],
  local_timeout: ['這一步超過本機等待時間。', 'This step exceeded the local time limit.', '已完成回答會保留。確認平台狀態後再繼續；逾時不代表額度耗盡。', 'Completed responses are preserved. Check the platform before resuming. A timeout does not mean quota exhaustion.', true],
  response_format_changed: ['工具傳回的格式目前無法讀取。', 'The tool returned a response format the app could not read.', '先重新檢查工具版本；不要反覆重試，以免重複消耗額度。', 'Check the tool version first. Avoid repeated retries that could consume more usage.', false],
  packet_too_large: ['本次研究資料超過連線工具的大小限制。', 'The research material exceeds this connector’s size limit.', '縮減附件或改用手動匯入回答後再繼續。', 'Reduce attachments or import a response manually before continuing.', false],
  cancelled: ['討論已暫停。', 'The discussion was paused.', '已完成回答會保留，可由尚未完成的步驟繼續。', 'Completed responses are preserved. Resume from the unfinished step.', true],
  unknown: ['這一步未能完成。', 'This step could not be completed.', '已完成回答會保留。查看詳細原因或重新檢查平台後，再決定是否繼續。', 'Completed responses are preserved. Review the details or check the platform before deciding whether to resume.', false]
};

// Call only for caught failures, never for ordinary model output or source text.
export function classifyProviderError(error) {
  const raw = typeof error === 'string' ? error : typeof error?.message === 'string' ? error.message : '';
  const errorCode = typeof error?.code === 'string' ? error.code : '';
  const text = `${errorCode} ${raw}`;
  let code = Object.hasOwn(issues, errorCode) ? errorCode : 'unknown';
  if (code === 'unknown') {
    if (error?.name === 'AbortError' || /discussion paused|\b(cancelled|canceled|aborted)\b/i.test(text)) code = 'cancelled';
    else if (/API billing|only uses subscription|custom\/API provider|Use G1 Credits|Sign in with a subscription, not API/i.test(text)) code = 'api_billing_blocked';
    else if (/reasoning.{0,35}(unsupported|not supported|invalid)|(?:unsupported|invalid).{0,25}(?:effort|reasoning)|effort.{0,25}(?:unsupported|not supported|invalid)/i.test(text)) code = 'effort_unsupported';
    else if (/(?:unknown|invalid|unsupported|unavailable|not found).{0,25}model|model.{0,50}(?:not found|does not exist|not available|not supported|not have access)|model_not_found/i.test(text)) code = 'model_unavailable';
    else if (/usage limit|quota.{0,25}(?:exceeded|exhausted|reached)|insufficient_quota|credit balance.{0,20}(?:low|empty|insufficient)|hit your.*limit|out of (?:usage|credits)/i.test(text)) code = 'usage_limit';
    else if (/rate.?limit|too many requests|\b429\b|RESOURCE_EXHAUSTED/i.test(text)) code = 'temporary_rate_limit';
    else if (/subscription sign.in|not (?:logged|signed) in|authentication.{0,20}(?:required|failed)|unauthorized|\b401\b|login required|token.{0,20}(?:expired|invalid)/i.test(text)) code = 'subscription_unverified';
    else if (/official CLI not found|command not found/i.test(text)) code = 'tool_missing';
    else if (/ENOENT|ENOEXEC|EACCES|bad CPU type|cannot find module|dyld:|exec format error|tool could not start/i.test(text)) code = 'tool_broken';
    else if (/unknown (?:option|argument|flag)|unrecognized (?:option|argument|flag)|unexpected argument|flag provided but not defined|does not support required/i.test(text)) code = 'cli_incompatible';
    else if (/smaller research packet|packet.{0,20}too large|E2BIG|Response exceeded the local size limit/i.test(text)) code = 'packet_too_large';
    else if (/did not finish within the time limit|local time limit/i.test(text)) code = 'local_timeout';
    else if (/ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ENETUNREACH|fetch failed|network error|connection (?:closed|reset|failed|lost)|TLS|socket hang up|\b(?:502|503|504)\b/i.test(text)) code = 'network_error';
    else if (/no readable answer|invalid JSON|response format|unexpected token.{0,20}JSON/i.test(text)) code = 'response_format_changed';
  }
  const [messageZh, messageEn, actionZh, actionEn, retriable] = issues[code];
  return {code, messageZh, messageEn, actionZh, actionEn, retriable, retryAt:null, detail:sanitizedDetail(raw || errorCode)};
}

export const requiredFlags = Object.freeze({
  codex: ['--ask-for-approval','--search','--ignore-user-config','--ephemeral','--skip-git-repo-check','--sandbox','--json','--model'],
  claude: ['--print','--output-format','--verbose','--tools','--allowedTools','--permission-mode','--no-session-persistence','--disable-slash-commands','--setting-sources','--strict-mcp-config','--mcp-config','--no-chrome','--settings','--model'],
  antigravity: ['--mode','--sandbox','--disable-slash-commands','--print','--output-format','--model']
});

export function compatibilityFromHelp(id, help, model, effort) {
  const flags = new Set(help.match(/--[a-zA-Z][a-zA-Z-]*/g) || []);
  const missing = requiredFlags[id].filter(flag => !flags.has(flag));
  if (id === 'claude' && effort && !flags.has('--effort')) missing.push('--effort');
  const effortCliSupported = !effort ? null : id === 'codex' ? /--config\b/.test(help) : flags.has('--effort') && new RegExp(`\\b${effort}\\b`).test(help);
  return {
    status: missing.length || effortCliSupported === false ? 'incompatible' : 'unverified',
    requiredFlags: {status:missing.length ? 'missing' : 'supported', missing},
    model: {status:'unverified', requested:model || null},
    effort: {status:effort ? effortCliSupported === false ? 'unsupported' : 'unverified' : 'not_requested', requested:effort || null, cliSupported:effortCliSupported}
  };
}

export function subscriptionStatus(id, result) {
  if (id === 'codex') {
    const text = `${result.output || ''}\n${result.stderr || ''}`;
    if (/API key/i.test(text)) return 'api';
    if (result.code === 0 && /Logged in using ChatGPT/i.test(text)) return 'subscription';
    return /not (?:logged|signed) in/i.test(text) ? 'signed_out' : 'unknown';
  }
  try {
    const j = JSON.parse(result.output);
    if (/api|console/i.test(j.authMethod || '')) return 'api';
    if (result.code === 0 && j.loggedIn === true && ['claude.ai','oauth'].includes(j.authMethod)) return 'subscription';
    return j.loggedIn === false || j.authMethod === 'none' ? 'signed_out' : 'unknown';
  } catch { return 'unknown'; }
}

// Dependency injection keeps tests independent of installed tools, accounts and network.
export async function diagnoseProviderUsing(id, settings, proof, deps) {
  const def = deps.definitions.find(d => d.id === id);
  if (!def) throw new Error('Unknown platform');
  if (id==='antigravity') delete proof[id];
  const model = settings.models?.[id] ?? deps.qualityDefaults[id];
  const effort = deps.reasoningForModel(id, model);
  const report = {
    id, name:def.name, checkedAt:new Date().toISOString(), readOnly:true, generationUsed:false,
    defaultSelected:id !== 'antigravity', requestedModel:model, requestedEffort:effort,
    installation:{status:'missing', version:null, rejectedCandidates:0}, auth:{status:'not_checked'},
    compatibility:{status:'unverified', requiredFlags:{status:'not_checked',missing:[]}, model:{status:'unverified',requested:model || null}, effort:{status:effort?'unverified':'not_requested',requested:effort || null}},
    guidance:{...providerGuidance[id]}, issues:[], ready:false
  };
  const found = await deps.discoverBinary(def);
  report.installation = {status:found.binary?'available':found.rejected.length?'broken':'missing',version:found.version || null,rejectedCandidates:found.rejected.length};
  if (!found.binary) {
    report.issues.push(classifyProviderError({code:found.rejected.length?'tool_broken':'tool_missing',message:found.rejected[0]?.detail || ''}));
    return report;
  }
  const binary = found.binary;
  // Display/copy only. Never execute login from a diagnostic request.
  report.guidance.resolvedLoginCommand=[binary,...loginArguments[id]].map(shellQuote).join(' ');
  try {
    const outputs = await Promise.all((id==='codex'?[['--help'],['exec','--help']]:[['--help']]).map(args=>deps.runProcess(binary,args,{timeout:7000,maxBytes:250000})));
    if (outputs.some(r=>r.code!==0)) throw Object.assign(new Error('Could not inspect required CLI features.'),{code:'cli_incompatible'});
    report.compatibility = compatibilityFromHelp(id,outputs.map(r=>r.output+'\n'+r.stderr).join('\n'),model,effort);
    if (report.compatibility.requiredFlags.status === 'missing') report.issues.push(classifyProviderError({code:'cli_incompatible',message:'Missing flags: '+report.compatibility.requiredFlags.missing.join(', ')}));
    if (report.compatibility.effort.status === 'unsupported') report.issues.push(classifyProviderError({code:'effort_unsupported'}));
  } catch (e) {report.issues.push(classifyProviderError(e));}
  if (id !== 'antigravity') {
    try {
      const r = await deps.runProcess(binary,id==='codex'?['login','status']:['auth','status','--json'],{timeout:8000,maxBytes:50000});
      report.auth.status = subscriptionStatus(id,r);
      if (report.auth.status !== 'subscription') report.issues.push(classifyProviderError({code:report.auth.status==='api'?'api_billing_blocked':'subscription_unverified'}));
    } catch (e) { report.auth.status='unknown';report.issues.push(classifyProviderError(e)); }
  } else {
    const blocked = await deps.googlePolicy();
    if (blocked) {
      report.auth.status='blocked';
      report.issues.push(classifyProviderError({code:/custom\/API|Use G1 Credits/i.test(blocked)?'api_billing_blocked':'subscription_unverified',message:blocked}));
    } else {
      try {
        // Only an explicit diagnostic reads remote model metadata. Never call --print here.
        const r = await deps.runProcess(binary,['models'],{timeout:15000,maxBytes:150000});
        const ids = r.output.split('\n').map(line=>line.trim().split(/\s+/)[0]).filter(x=>/^gemini-[a-zA-Z0-9._/-]+$/.test(x));
        if (r.code === 0 && ids.length) {
          report.auth.status='subscription';
          report.compatibility.model={status:model?ids.includes(model)?'listed':'unavailable':'unverified',requested:model || null,availableModels:[...new Set(ids)].slice(0,200)};
          if (report.compatibility.model.status === 'unavailable') report.issues.push(classifyProviderError({code:'model_unavailable'}));
        } else {
          report.auth.status='unknown';
          report.issues.push(classifyProviderError(r.code!==0?new Error(r.stderr || 'Subscription sign-in could not be verified.'): {code:'response_format_changed',message:'The model list did not contain readable Gemini model IDs.'}));
        }
      } catch (e) {report.auth.status='unknown';report.issues.push(classifyProviderError(e));}
    }
  }
  // 'ready' means a request may be attempted, never that model access or credits were tested.
  report.ready = report.installation.status==='available' && report.auth.status==='subscription' && report.compatibility.requiredFlags.status==='supported' && report.compatibility.effort.status!=='unsupported' && report.compatibility.model.status!=='unavailable';
  // Remember metadata confirmation only in this server's in-memory evidence map.
  // This does not sign in, persist credentials or claim a generated response was tested.
  if (id==='antigravity' && report.ready) proof[id]={binary,kind:'metadata'};
  return report;
}
