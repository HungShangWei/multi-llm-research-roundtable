// Retrieval records are program-generated; model JSON is never a verification record.
export function sourceCheckIdentity(source) {
 return JSON.stringify([String(source.url||''),String(source.doi||'').trim().toLowerCase(),String(source.title||'').trim(),String(source.quote||'').trim().replace(/\s+/g,' ')]);
}
const recordKey = record => record.identity+'\n'+JSON.stringify(record.check);
export function snapshotChecks(sources) {
 return sources.filter(source=>source.check).map(source=>({sourceId:source.id,identity:sourceCheckIdentity(source),
  source:{title:source.title,url:source.url,doi:source.doi,quote:source.quote,locator:source.locator,provider:source.provider,stage:source.stage,manual:source.manual},
  check:structuredClone(source.check)}));
}
export function mergeReviews(...reviews) {
 const bySource=new Map();for(const record of reviews.flat())bySource.set(record.sourceId,record);return [...bySource.values()];
}
export function evidenceReviewFor(session,analysis) {
 const latest=(session.messages||[]).findLast(m=>m.stage==='synthesis'&&!m.stale&&!m.manual);
 const saved=latest?.evidenceReview;
 const current=snapshotChecks(analysis.sources||[]),finalSources=(analysis.sources||[]).filter(s=>s.messageId===latest?.id);
 const known=new Set((saved||[]).map(recordKey));
 const missing=current.filter(record=>!known.has(recordKey(record)));
 const finalMissing=snapshotChecks(finalSources).filter(record=>!known.has(recordKey(record)));
 return {status:!Array.isArray(saved)?'not_available':missing.length?'changed_after_synthesis':saved.length?'incorporated':'not_available',
  checkedCount:new Set((saved||[]).map(recordKey)).size,
  remainingCount:(analysis.sources||[]).filter(s=>!s.check).length,
  uncheckedFinalCount:finalSources.filter(s=>!s.check).length,
  unreviewedFinalCount:finalMissing.length,
  newCheckCount:new Set(missing.map(recordKey)).size};
}
