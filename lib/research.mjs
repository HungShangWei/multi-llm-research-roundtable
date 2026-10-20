import {createHash} from 'node:crypto';
import {evidenceReviewFor} from './review.mjs';

// Model annotations describe claims; only the separate source checker records retrieval evidence.
const text = (value, max = 8000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const list = (value, max = 12) => Array.isArray(value) ? value.slice(0, max) : [];
const strings = value => list(value).map(x => text(x)).filter(Boolean);
const publicLink = value => {
  try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password ? u.href : ''; } catch { return ''; }
};
const stableId = (prefix, identity) => `${prefix}-${createHash('sha256').update(identity).digest('hex').slice(0, 16)}`;
function normalizedDoi(value) {
  const candidate = text(value, 500).replace(/^doi:\s*/i, '').replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').toLowerCase();
  // Deliberately do not trim suffix punctuation: it can be part of a real DOI.
  return /^10\.\d{4,9}\/[^\s<>"?#]+$/u.test(candidate) ? candidate : '';
}
function doiFromUrl(value) {
  try {
    const u = new URL(value);
    if (!['doi.org', 'dx.doi.org'].includes(u.hostname.toLowerCase())) return '';
    return normalizedDoi(decodeURIComponent(u.pathname.slice(1)));
  } catch { return ''; }
}
function canonicalUrl(value) {
  try {
    const u = new URL(value);
    u.hash = '';
    const tracking = /^(?:utm_.+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid)$/i;
    for (const key of [...u.searchParams.keys()]) if (tracking.test(key)) u.searchParams.delete(key);
    u.searchParams.sort();
    return u.href;
  } catch { return ''; }
}
function groupSources(sources) {
  const identities = sources.map(source => ({source, doi: normalizedDoi(source.doi) || doiFromUrl(source.url), url: canonicalUrl(source.url)}));
  const doiByUrl = new Map();
  for (const {doi, url} of identities) {
    if (!doi || !url) continue;
    if (!doiByUrl.has(url)) doiByUrl.set(url, new Set());
    doiByUrl.get(url).add(doi);
  }
  const groups = new Map(), sourceGroupByOccurrence = {};
  for (const {source, doi, url} of identities) {
    // A URL-only citation can join an unambiguous DOI citation at that exact URL.
    // Conflicting declared DOIs never merge merely because their URLs coincide.
    const urlDois = doiByUrl.get(url);
    const groupDoi = doi || (urlDois?.size === 1 ? [...urlDois][0] : '');
    const identity = groupDoi ? `doi:${groupDoi}` : url ? `url:${url}` : `occurrence:${source.id}`;
    if (!groups.has(identity)) groups.set(identity, {
      id: stableId('source', identity), title: source.title, url: groupDoi ? `https://doi.org/${groupDoi}` : url,
      doi: groupDoi, occurrences: [], citationCount: 0, providers: [],
      identityNote: 'Grouped by declared DOI or normalized URL, not by study independence or verified scientific identity.'
    });
    const group = groups.get(identity);
    group.occurrences.push(source);
    group.citationCount++;
    if (!group.title && source.title) group.title = source.title;
    if (source.provider && !group.providers.includes(source.provider)) group.providers.push(source.provider);
    sourceGroupByOccurrence[source.id] = group.id;
  }
  return {sourceGroups: [...groups.values()], sourceGroupByOccurrence};
}
function normalizedQuestion(value) {
  // Only typographic normalization: no synonym matching, stemming, or semantic merge.
  return text(value).normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').replace(/[?!.。！？]+$/u, '').trim();
}
function threadIssues(disputes, warnings) {
  const threads = [], byId = new Map(), byQuestion = new Map();
  for (const dispute of disputes) {
    const questionKey = normalizedQuestion(dispute.question);
    const referenced = dispute.issueId ? byId.get(dispute.issueId) : null;
    // Models may refer only to an issue established in an earlier message.
    const validReference = referenced && referenced.history.some(item => item.messageId !== dispute.messageId);
    if (dispute.issueId && !validReference) warnings.push('An unknown or same-message issue identifier was ignored; only exact question matching may link that observation.');
    let thread = validReference ? referenced : byQuestion.get(questionKey);
    if (!thread) {
      thread = {id: stableId('issue', dispute.id), question: dispute.question, status: null, history: [], latest: null, providers: [], statusFromModel: true, superseded: true};
      threads.push(thread); byId.set(thread.id, thread);
    }
    thread.history.push(dispute);
    if (!dispute.stale) {
      thread.latest = dispute;
      thread.status = dispute.status;
      thread.superseded = false;
    }
    if (dispute.provider && !thread.providers.includes(dispute.provider)) thread.providers.push(dispute.provider);
    // Explicit links can rephrase a question; only unambiguous first ownership is
    // recorded for later exact-question fallback, so existing threads stay separate.
    if (questionKey && !byQuestion.has(questionKey)) byQuestion.set(questionKey, thread);
  }
  for (const thread of threads) {
    thread.statusChanged = new Set(thread.history.map(d => d.status)).size > 1;
    const latestByProvider = new Map(thread.history.filter(d => !d.stale).map(d => [d.provider || d.messageId, d.status]));
    thread.hasConflictingAssessments = new Set(latestByProvider.values()).size > 1;
  }
  return threads;
}
export function proseOnly(value) { return String(value || '').replace(/```roundtable-data\s*[\s\S]*?```/g, '').trim(); }

export function parseResearch(value) {
  const match = String(value || '').match(/```roundtable-data\s*([\s\S]*?)```/);
  const warnings = [];
  let raw = null;
  if (match) {
    try { raw = JSON.parse(match[1]); if (!raw || typeof raw !== 'object' || Array.isArray(raw)) raw = null; }
    catch { warnings.push('Structured research data could not be parsed; the original response is preserved.'); }
  }
  const sources = [], ids = new Set();
  for (const [i, s] of list(raw?.sources).entries()) {
    if (!s || typeof s !== 'object') continue;
    const url = publicLink(s.url), doi = text(s.doi, 200).replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
    if (!url && !/^10\.\d{4,9}\//.test(doi)) continue;
    const id = text(s.id, 60) || `S${i + 1}`;
    if (ids.has(id)) { warnings.push('Duplicate source identifiers were ignored.'); continue; }
    ids.add(id);
    sources.push({id, title: text(s.title, 500), url: url || `https://doi.org/${doi}`, doi,
      quote: text(s.quote, 2500), locator: text(s.locator, 300),
      reportedAccess: ['full_text', 'abstract', 'metadata', 'not_read'].includes(s.reportedAccess) ? s.reportedAccess : 'not_read',
      publishedAt: text(s.publishedAt, 100), studyType: text(s.studyType, 200), population: text(s.population, 1000)});
  }
  // Legacy replies remain useful without inventing claim-to-source mappings.
  if (!sources.length) {
    const links = [...String(value || '').matchAll(/https?:\/\/[^\s<>"\]\)]+/g)].map(m => m[0].replace(/[.,;。；，]+$/, ''));
    for (const link of [...new Set(links)].slice(0, 12)) {
      const url = publicLink(link); if (!url) continue;
      const id = `S${sources.length + 1}`; ids.add(id);
      sources.push({id, url, title: '', doi: '', quote: '', locator: '', reportedAccess: 'not_read', publishedAt: '', studyType: '', population: ''});
    }
  }
  const claims = list(raw?.claims).filter(x => x && typeof x === 'object' && text(x.statement)).map((c, i) => {
    const sourceIds = strings(c.sourceIds).filter(id => ids.has(id));
    if (strings(c.sourceIds).length !== sourceIds.length) warnings.push('A claim referenced a missing source; that link was omitted.');
    return {id: `C${i + 1}`, statement: text(c.statement), sourceIds,
      evidenceType: ['research', 'inference', 'scenario'].includes(c.evidenceType) ? c.evidenceType : 'inference',
      confidence: text(c.confidence, 1000), limitations: text(c.limitations, 2000)};
  });
  const disputes = list(raw?.disputes, 6).filter(x => x && typeof x === 'object' && text(x.question)).map((d, i) => ({
    id: `D${i + 1}`, question: text(d.question), positions: text(d.positions), whyItMatters: text(d.whyItMatters),
    whatToCheck: text(d.whatToCheck), status: ['open', 'partly_resolved', 'resolved'].includes(d.status) ? d.status : 'open',
    issueId: text(d.issueId, 100), reason: text(d.reason, 4000), sourceIds: strings(d.sourceIds).filter(id => ids.has(id))
  }));
  const summary = {recommendation: text(raw?.summary?.recommendation),
    options: list(raw?.summary?.options, 8).filter(x => x && text(x.name)).map(o => ({name: text(o.name, 500), benefits: text(o.benefits), tradeoffs: text(o.tradeoffs), conditions: text(o.conditions)})),
    nextSteps: strings(raw?.summary?.nextSteps), uncertainties: strings(raw?.summary?.uncertainties), changes: strings(raw?.summary?.changes)};
  return {structured: !!raw, disputesStructured: Array.isArray(raw?.disputes), claims, sources, disputes, summary, warnings};
}

export function analysisFor(session) {
  const result = {summary: {recommendation: '', options: [], nextSteps: [], uncertainties: [], changes: []}, claims: [], sources: [], disputes: [], warnings: []};
  const historicalDisputes = [];
  for (const m of session.messages || []) {
    const data = parseResearch(m.text);
    const prefix = `${m.id}:`;
    const provenance = {messageId: m.id, stage: m.stage, provider: m.provider, providerName: m.providerName || m.provider || '', createdAt: m.createdAt || null, manual: !!m.manual};
    const observations = data.disputes.map(d => ({...d, ...provenance, id: prefix + d.id, sourceIds: d.sourceIds.map(id => prefix + id), stale: !!m.stale}));
    historicalDisputes.push(...observations);
    if (m.stale) continue;
    result.sources.push(...data.sources.map(s => ({...s, ...provenance, id: prefix + s.id, check: session.sourceChecks?.[prefix + s.id] || null, checkReusedFrom: session.sourceCheckReuse?.[prefix + s.id] || null})));
    result.claims.push(...data.claims.map(c => ({...c, ...provenance, id: prefix + c.id, sourceIds: c.sourceIds.map(id => prefix + id)})));
    result.disputes.push(...observations);
    result.warnings.push(...data.warnings);
    if (m.stage === 'synthesis' || (session.mode === 'single' && m.stage === 'independent')) result.summary = data.summary;
  }
  if ((session.messages || []).length && !result.claims.length) result.warnings.push('No structured claim-to-source mapping was returned. Original answers remain available.');
  Object.assign(result, groupSources(result.sources));
  result.issueThreads = threadIssues(historicalDisputes, result.warnings);
  result.evidenceReview = evidenceReviewFor(session, result);
  result.warnings = [...new Set(result.warnings)];
  return result;
}

export function sourceCheckCandidates(session, {limit = Infinity, finalOnly = false} = {}) {
  const analysis = analysisFor(session);
  const messages = (session.messages || []).filter(m => !m.stale);
  const lastFinal = messages.findLast(m => m.stage === 'synthesis') || (session.mode === 'single' ? messages.findLast(m => m.stage === 'independent') : null);
  const messageOrder = new Map(messages.map((m, index) => [m.id, index]));
  const claimLinked = new Set(analysis.claims.flatMap(claim => claim.sourceIds));
  const pool = analysis.sources.filter(source => !finalOnly || source.messageId === lastFinal?.id);
  pool.sort((a, b) => Number(claimLinked.has(b.id)) - Number(claimLinked.has(a.id))
    || Number(b.stage === 'verification') - Number(a.stage === 'verification')
    || (messageOrder.get(b.messageId) ?? -1) - (messageOrder.get(a.messageId) ?? -1));
  const selected = [], seen = new Set();
  const maximum = limit === Infinity ? Infinity : Math.max(0, Math.floor(Number(limit) || 0));
  for (const source of pool) {
    if (selected.length >= maximum) break;
    const groupId = analysis.sourceGroupByOccurrence[source.id];
    if (seen.has(groupId)) continue;
    seen.add(groupId); selected.push(source);
  }
  return selected;
}

export const depthPolicies = {overview: {verificationLimit: 0}, standard: {verificationLimit: 1}, deep: {verificationLimit: 2}};
export function baseSteps(s, mode = s.mode || (s.participants.length === 1 ? 'single' : 'roundtable')) {
  if (mode === 'synthesis') return [{key: `synthesis:${s.chair}`, stage: 'synthesis', provider: s.chair}];
  const steps = s.participants.map(provider => ({key: `independent:${provider}`, stage: 'independent', provider}));
  if (mode === 'single') return s.protocolVersion >= 3 ? [...steps.slice(0, 1), {key: `synthesis:${s.chair}`, stage: 'synthesis', provider: s.chair}] : steps.slice(0, 1);
  if (!(s.protocolVersion >= 2) || s.depth !== 'overview') steps.push(...s.participants.map(provider => ({key: `critique:${provider}`, stage: 'critique', provider})));
  steps.push(...(s.verificationPlan || []));
  steps.push({key: `synthesis:${s.chair}`, stage: 'synthesis', provider: s.chair});
  return steps;
}
export function buildVerificationPlan(s) {
  if (!(s.protocolVersion >= 2) || s.mode !== 'roundtable') return [];
  const limit = depthPolicies[s.depth]?.verificationLimit || 0;
  if (!limit) return [];
  const critiques = (s.messages || []).filter(m => m.stage === 'critique' && !m.stale);
  const disputed = critiques.flatMap(m => parseResearch(m.text).disputes.filter(d => d.status !== 'resolved'));
  const unique = s.protocolVersion >= 3
    ? analysisFor(s).issueThreads.filter(issue => !issue.superseded && (issue.status !== 'resolved' || issue.hasConflictingAssessments) && issue.history.some(d => d.stage === 'critique' && !d.stale)).slice(0, 6).map(issue => ({...issue.latest, issueId: issue.id, hasConflictingAssessments: issue.hasConflictingAssessments}))
    : [...new Map(disputed.map(d => [d.question.toLowerCase(), d])).values()].slice(0, 6);
  if (!unique.length && s.depth === 'deep' && critiques.some(m => !parseResearch(m.text).disputesStructured)) {
    unique.push({question: 'Evidence gap: critiques did not return structured disagreement data.', whatToCheck: 'Check the most consequential factual claim against primary sources; do not invent a disagreement.', positions: '', whyItMatters: 'The absence of structured data does not establish agreement.'});
  }
  if (!unique.length) return [];
  const count = Math.min(limit, unique.length);
  return Array.from({length: count}, (_, i) => ({key: `verification:${i}:${s.participants[i % s.participants.length]}`, stage: 'verification', provider: s.participants[i % s.participants.length], targets: unique.filter((_, n) => n % count === i)}));
}
export function basisFor(s, stage) {
  if (stage === 'independent') return 'question';
  return JSON.stringify((s.messages || []).filter(m => !m.stale && (stage === 'critique' ? m.stage === 'independent' : stage === 'verification' ? ['independent', 'critique'].includes(m.stage) : m.stage !== 'synthesis')).map(m => m.id));
}
export function stepComplete(s, step) {
  const basis = basisFor(s, step.stage);
  return (s.messages || []).some(m => !m.manual && !m.stale && (m.stepKey ? m.stepKey === step.key : m.stage === step.stage && m.provider === step.provider) && (step.stage === 'independent' || m.basis === basis));
}
export function planFor(s) {
  const steps = baseSteps(s);
  const mode = s.mode || (s.participants.length === 1 ? 'single' : 'roundtable');
  const limit = s.protocolVersion >= 2 && mode === 'roundtable' ? depthPolicies[s.depth]?.verificationLimit || 0 : 0;
  return {steps: steps.map(step => ({...step, complete: stepComplete(s, step)})), completed: steps.filter(step => stepComplete(s, step)).length,
    total: steps.length, maxCalls: steps.filter(x => x.stage !== 'verification').length + limit,
    depth: s.depth || 'legacy', pendingChecks: (s.verificationPlan || []).filter(step => !stepComplete(s, step)).length, verificationLimit: limit};
}
