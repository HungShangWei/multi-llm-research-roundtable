// Synthetic illustration: drives the prototype's real engine and Markdown export
// (lib/engine.mjs, lib/protocol.mjs, lib/research.mjs) with a deterministic MOCKED runner.
// No live model, CLI or network service is called when it runs. Usage (Node 22+, from the repository root):
//   node examples/mock-roundtable/run-mock-roundtable.mjs [--out <directory>] [--label <text>]
import {mkdtemp, rm, readFile, writeFile, mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SessionStore, Engine} from '../../lib/engine.mjs';
import {validateRequest, sessionMarkdown} from '../../lib/protocol.mjs';
import {planFor} from '../../lib/research.mjs';
import {clarificationPlan} from '../../lib/clarification.mjs';
import {replyFor, markerFor} from './mock-replies.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const outIndex = process.argv.indexOf('--out');
const outDir = outIndex > -1 ? path.resolve(process.argv[outIndex + 1]) : path.join(here, 'output');
const labelIndex = process.argv.indexOf('--label'); // optional note printed in both output banners
const label = labelIndex > -1 ? String(process.argv[labelIndex + 1] || '').trim() : '';
const input = JSON.parse(await readFile(path.join(here, 'input.json'), 'utf8'));

// Two mock participants. "ready" stands in for a verified sign-in; no executable exists.
const participants = [
  {id: 'mock-a', name: 'Mock participant A', model: '', binary: '(none: mocked runner)', version: 'mock', reasoningEffort: null, ready: true},
  {id: 'mock-b', name: 'Mock participant B', model: '', binary: '(none: mocked runner)', version: 'mock', reasoningEffort: null, ready: true}
];

const work = await mkdtemp(path.join(tmpdir(), 'roundtable-mock-example-'));
try {
  const intake = clarificationPlan(input); // local and deterministic; never calls a model
  const store = new SessionStore(path.join(work, 'sessions'));
  await store.init();
  const request = validateRequest(input, participants.map(p => p.id));
  const session = await store.create(request, null);

  const calls = [], produced = [], checks = [];
  // Deterministic stand-in for lib/providers.mjs#callProvider. The engine sets
  // currentStep/currentStage on the session immediately before each call.
  async function mockRunner(provider, prompt, {search}) {
    const s = store.get(session.id), key = s.currentStep;
    calls.push({n: calls.length + 1, key, stage: s.currentStage, participant: provider.id, search: !!search,
      promptChars: prompt.length, included: produced.filter(r => prompt.includes(r.marker)).map(r => r.key)});
    produced.push({key, marker: markerFor(key)});
    return {text: replyFor(key, prompt), model: null, modelProvenance: 'fixed synthetic fixture (no live model call in this run)',
      usage: null, usageModels: [], responseModels: [], searches: null,
      requestedModel: 'none (mocked)', requestedReasoningEffort: 'none (mocked)', providerVersion: 'mock'};
  }
  // Stand-in for lib/evidence.mjs#checkSource: records where a check happens; makes no request.
  async function mockSourceChecker(source) {
    checks.push({occurrence: source.id, url: source.url});
    return {status: 'unavailable', checkedAt: new Date().toISOString(), metadata: null, retrievedUrl: null,
      access: 'unavailable', quoteMatch: null,
      note: 'MOCKED source check for this example: no network request was made. In the prototype, lib/evidence.mjs would retrieve Crossref metadata/abstract or public page text here.'};
  }

  const engine = new Engine({store, brief: null, getProviders: async () => participants, runner: mockRunner,
    runtimeDir: path.join(work, 'runtime'), sourceChecker: mockSourceChecker});
  await engine.start(session.id, {});
  await engine.task;
  const s = store.get(session.id);
  if (s.status !== 'complete') throw new Error(`Mock session ended as ${s.status}: ${s.error}`);
  const plan = planFor(s);
  const reused = Object.keys(s.sourceCheckReuse || {}).length;

  // sessionMarkdown() was written for live runs: it labels non-imported replies as official CLI
  // responses and their annotations as model assessments. Those phrases are relabeled here,
  // and every substitution is counted in the banner. session-record.json is left unmodified.
  const relabel = [
    ['This report records actual responses only.', 'This report records the saved (mocked) replies only.'],
    ['Provenance: Official CLI response', 'Provenance: MOCKED — fixed synthetic fixture (no live model or CLI call during this example run)'],
    ['Model: official default; exact model ID not reported', 'Model: none (mocked reply)'],
    ['; model assessment]', '; mocked fixture assessment]'],
    ['All states are model assessments, not independently proven resolutions.', 'All states below come from mocked fixture replies; in live runs they are model assessments, not independently proven resolutions.'],
    ['Latest model-reported status:', 'Latest reported status (mocked):']
  ];
  let markdown = sessionMarkdown(s);
  const relabelCounts = relabel.map(([from, to]) => { const n = markdown.split(from).length - 1; markdown = markdown.split(from).join(to); return `> - "${from}" → "${to}" (${n}×)`; });
  const banner = `> **Synthetic illustration — mocked replies.**${label ? ` ${label}.` : ''} Produced by \`examples/mock-roundtable/run-mock-roundtable.mjs\`, which drives the prototype's real engine and Markdown export with a deterministic mocked runner. No live model or CLI calls were made during this example run. The replies are fixed synthetic fixtures, not observed live-model responses or research findings; sources are example.org placeholders. Timestamps are the actual times of this run (UTC). Source-check records come from a mocked checker that makes no requests.\n>\n> Phrases that \`sessionMarkdown()\` writes for live runs were relabeled by the script (\`session-record.json\` is unmodified):\n${relabelCounts.join('\n')}\n\n`;

  const rows = calls.map(c => `| ${c.n} | \`${c.key}\` | ${c.stage} | ${c.participant} | ${c.search ? 'on' : 'off'} | ${c.promptChars.toLocaleString('en-US')} | ${c.included.length ? c.included.map(k => `\`${k}\``).join(', ') : 'none'} |`);
  const stageInputs = `# Stage inputs — mocked example

> **Synthetic illustration.**${label ? ` ${label}.` : ''} Generated by \`run-mock-roundtable.mjs\` on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC. The prompts are built by the prototype's real prompt builders (\`lib/protocol.mjs\`); the replies are fixed synthetic fixtures (\`mock-replies.mjs\`). No live model or CLI calls were made during this example run.

**Question (synthetic):** ${input.question}

**Step 0 — local clarification (no model call):** ${intake.questions.length} question(s) asked, because the goal and constraints were already supplied.

The last column is measured, not asserted: each fixture reply carries a unique \`MOCK-REPLY-ID\` line, and the script searches every actual prompt for the IDs of replies saved earlier.

| # | Step | Stage | Participant | Web search flag | Prompt size (characters) | Earlier replies included in this prompt |
|---|---|---|---|---|---|---|
${rows.join('\n')}

- Mocked model calls: ${calls.length}. Planned steps completed: ${plan.completed}/${plan.total}; maximum primary calls for this depth: ${plan.maxCalls} (verification limit ${plan.verificationLimit}).
- Mocked source checks: ${checks.length} new, ${reused} reused for an identical URL/title/quote (no repeat request).
- The verification step was planned automatically because both critiques left the same issue open.
- First-round prompts contain no other replies. Critique prompts contain the first-round replies but not other critiques. The chair's synthesis prompt contains every earlier non-synthesis reply plus the local source-check records.
- Separating what each stage can see is information flow, not statistical independence: real participants may share training data and web sources.
`;
  await mkdir(outDir, {recursive: true});
  await writeFile(path.join(outDir, 'session-export.md'), banner + markdown);
  await writeFile(path.join(outDir, 'stage-inputs.md'), stageInputs);
  await writeFile(path.join(outDir, 'session-record.json'), JSON.stringify(s, null, 2) + '\n');
  console.log(`Mock session ${s.status}: ${calls.length} mocked calls, ${checks.length} mocked source checks (${reused} reused). Output: ${outDir}`);
} finally {
  await rm(work, {recursive: true, force: true});
}
