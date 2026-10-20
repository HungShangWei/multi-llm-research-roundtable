// FIXED SYNTHETIC FIXTURES for this example, prepared with AI assistance (Claude) for the showcase.
// No live model or CLI calls are made when the example runs; these are not observed live-model
// responses or research findings. Sources use the reserved example.org domain; they are placeholders, not real publications.

const fence = '```';
const block = data => `${fence}roundtable-data\n${JSON.stringify(data, null, 1)}\n${fence}`;
const header = key => `[MOCKED REPLY — fixed synthetic fixture; no live model was called during this example run]\nMOCK-REPLY-ID: ${key}`;
const placeholder = (id, letter) => ({
  id,
  title: `Placeholder source ${letter} (synthetic; not a real publication)`,
  url: `https://example.org/synthetic/source-${letter.toLowerCase()}`,
  doi: '', quote: '', locator: '', reportedAccess: 'not_read'
});
const QUESTION = 'Would moving to one shared library mid-semester change the citation keys used by the two manuscripts in progress?';
const issueIdFrom = prompt => (prompt.match(/"issueId":"(issue-[0-9a-f]{16})"/) || [])[1] || '';

const replies = {
  'independent:mock-a': () => `${header('independent:mock-a')}

Evidence and retrieval status: no sources were opened (mocked example).
Independent assessment: under the stated constraints, one shared library would let the group clean up each reference record once instead of three times.
Alternatives / falsifiers: if the two manuscripts depend on fixed citation keys, moving now could cause rework.
Conditional decision advice: move now only if citation keys can be preserved.
Sources: one placeholder, not a real publication.

${block({
    claims: [{id: 'C1', statement: 'One shared library lets a small group maintain each reference record once.', sourceIds: ['S1'], evidenceType: 'inference', confidence: 'Illustrative reasoning only.', limitations: 'Mocked example; no evidence was consulted.'}],
    sources: [placeholder('S1', 'A')],
    disputes: [],
    summary: {recommendation: 'Move to a shared library now if citation keys can be preserved.', options: [{name: 'Shared library now', benefits: 'Records maintained once', tradeoffs: 'Migration effort while two manuscripts are being drafted', conditions: 'Citation keys are preserved'}], nextSteps: ['List the citation keys each manuscript in progress uses'], uncertainties: ['Whether keys survive the move'], changes: []}
  })}`,

  'independent:mock-b': () => `${header('independent:mock-b')}

Evidence and retrieval status: no sources were opened (mocked example).
Independent assessment: two manuscripts are mid-draft; changing the library now risks altered citation keys and broken in-text citations at a busy time.
Alternatives / falsifiers: if a test import shows the keys are unchanged, this risk is small.
Conditional decision advice: keep individual libraries until the next project starts.
Sources: one placeholder, not a real publication.

${block({
    claims: [{id: 'C1', statement: 'Changing libraries during active drafting can alter citation keys and create rework.', sourceIds: ['S1'], evidenceType: 'inference', confidence: 'Illustrative reasoning only.', limitations: 'Mocked example; no evidence was consulted.'}],
    sources: [placeholder('S1', 'B')],
    disputes: [],
    summary: {recommendation: 'Wait until the next project starts.', options: [{name: 'Keep individual libraries for now', benefits: 'No disruption to drafts in progress', tradeoffs: 'Duplicate maintenance continues', conditions: 'The manuscripts depend on their current keys'}], nextSteps: ['Revisit at the start of the next project'], uncertainties: ['How much the duplicate maintenance actually costs'], changes: []}
  })}`,

  'critique:mock-a': () => `${header('critique:mock-a')}

Cross-examination: Participant 2 raises a risk that my first answer treated only as a condition. The disagreement is testable: does a move change the keys used by the manuscripts in progress? I revise my advice from "move now" to "test first". Unresolved: the key-preservation question.

${block({
    claims: [{id: 'C1', statement: 'The decision depends on a testable question: whether citation keys change on import.', sourceIds: [], evidenceType: 'inference', confidence: 'Illustrative reasoning only.', limitations: 'Mocked example.'}],
    sources: [],
    disputes: [{question: QUESTION, positions: 'Participant 1: low risk if keys are exported and preserved. Participant 2: high risk for drafts in progress.', whyItMatters: 'Decides whether a move now creates rework for two manuscripts.', whatToCheck: 'Export one manuscript library, import it into a test shared library and compare citation keys.', status: 'open', reason: 'Neither side has tested this; both positions are assumptions.', sourceIds: []}],
    summary: {recommendation: 'Test key preservation before deciding.', options: [], nextSteps: ['Run an export/import comparison on one manuscript'], uncertainties: ['Result of the key comparison'], changes: ['Changed from "move now" to "test first"']}
  })}`,

  'critique:mock-b': () => `${header('critique:mock-b')}

Cross-examination: Participant 1's benefit is real but does not depend on timing; it can be realized at the next project. I keep my recommendation but agree that the risk can be tested.

${block({
    claims: [{id: 'C1', statement: 'The benefit of a shared library does not require switching mid-semester.', sourceIds: [], evidenceType: 'inference', confidence: 'Illustrative reasoning only.', limitations: 'Mocked example.'}],
    sources: [],
    disputes: [{question: QUESTION, positions: 'Participant 1: low risk if keys are preserved. Participant 2: plausible risk; wait.', whyItMatters: 'Timing of the change.', whatToCheck: 'The same export/import comparison.', status: 'open', reason: 'The risk is plausible but untested.', sourceIds: []}],
    summary: {recommendation: 'Wait, but run the key comparison now.', options: [], nextSteps: ['Run the key comparison'], uncertainties: [], changes: []}
  })}`,

  'verification:0:mock-a': prompt => `${header('verification:0:mock-a')}

Targeted check (mocked): no check was actually performed in this example. The fixture marks the issue "partly resolved" only to show how a status change and its stated reason are stored in the issue history.

${block({
    claims: [{id: 'C1', statement: 'The key-preservation question can be tested on one manuscript before any group-wide change.', sourceIds: ['S1'], evidenceType: 'inference', confidence: 'Illustrative reasoning only.', limitations: 'Mocked example; the test was specified, not run.'}],
    sources: [placeholder('S1', 'C')],
    disputes: [{question: QUESTION, issueId: issueIdFrom(prompt), positions: 'Both positions retained; a test procedure is now specified but has not been run.', whyItMatters: 'Decides whether a move now creates rework.', whatToCheck: 'Run the export/import comparison on one manuscript.', status: 'partly_resolved', reason: 'Mocked status change for illustration: the check procedure is specified, but no result exists.', sourceIds: ['S1']}],
    summary: {recommendation: 'Specify and run the key comparison before deciding.', options: [], nextSteps: [], uncertainties: ['Comparison result'], changes: []}
  })}`,

  'synthesis:mock-a': prompt => `${header('synthesis:mock-a')}

Chair synthesis (mocked).
Agreement: both participants accept that maintaining records once is useful and that changed citation keys would cause rework.
Unresolved dissent: whether to move this semester. Participant 2 still prefers waiting; Participant 1 now prefers a test first.
Conditional recommendation: keep individual libraries for the two manuscripts in progress, run the key-preservation test on one manuscript, and adopt the shared library for the next project if the test passes.
What remains unchecked: no sources were opened; every source check in this example is mocked.

${block({
    claims: [{id: 'C1', statement: 'A key-preservation test on one manuscript lowers the risk of a group-wide change.', sourceIds: ['S1'], evidenceType: 'inference', confidence: 'Illustrative reasoning only.', limitations: 'Mocked example.'}],
    sources: [placeholder('S1', 'A'), placeholder('S2', 'D')],
    disputes: [{question: QUESTION, issueId: issueIdFrom(prompt), positions: 'Participant 1: test first, then move. Participant 2: wait for the next project.', whyItMatters: 'Timing and rework risk.', whatToCheck: 'Result of the export/import comparison.', status: 'partly_resolved', reason: 'Test specified, not run; dissent on timing remains.', sourceIds: ['S1']}],
    summary: {recommendation: 'Keep individual libraries for the manuscripts in progress; adopt a shared library for the next project if a key-preservation test passes.', options: [{name: 'Shared library now', benefits: 'Records maintained once, sooner', tradeoffs: 'Rework risk for drafts in progress', conditions: 'Key test passes before the move'}, {name: 'Shared library at the next project', benefits: 'No disruption to current drafts', tradeoffs: 'Duplicate maintenance continues this semester', conditions: 'Default if the test is not run'}], nextSteps: ['Run the export/import key comparison on one manuscript', 'Decide at the start of the next project'], uncertainties: ['Result of the key comparison'], changes: []}
  })}`
};

export function replyFor(stepKey, prompt) {
  const make = replies[stepKey];
  if (!make) throw new Error(`No mocked reply for step ${stepKey}`);
  return make(prompt);
}
export const markerFor = stepKey => `MOCK-REPLY-ID: ${stepKey}`;
