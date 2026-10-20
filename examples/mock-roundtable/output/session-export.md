> **Synthetic illustration — mocked replies.** Showcase revision v2 — new mock record, not the v1 output. Produced by `examples/mock-roundtable/run-mock-roundtable.mjs`, which drives the prototype's real engine and Markdown export with a deterministic mocked runner. No live model or CLI calls were made during this example run. The replies are fixed synthetic fixtures, not observed live-model responses or research findings; sources are example.org placeholders. Timestamps are the actual times of this run (UTC). Source-check records come from a mocked checker that makes no requests.
>
> Phrases that `sessionMarkdown()` writes for live runs were relabeled by the script (`session-record.json` is unmodified):
> - "This report records actual responses only." → "This report records the saved (mocked) replies only." (1×)
> - "Provenance: Official CLI response" → "Provenance: MOCKED — fixed synthetic fixture (no live model or CLI call during this example run)" (6×)
> - "Model: official default; exact model ID not reported" → "Model: none (mocked reply)" (6×)
> - "; model assessment]" → "; mocked fixture assessment]" (6×)
> - "All states are model assessments, not independently proven resolutions." → "All states below come from mocked fixture replies; in live runs they are model assessments, not independently proven resolutions." (1×)
> - "Latest model-reported status:" → "Latest reported status (mocked):" (1×)

# Should a three-person research group move to one shared reference library this semester, or keep individual libraries until the next project starts?

Created: 2026-10-19T18:02:07.353Z
Status: complete
Sources packet: none

This report records the saved (mocked) replies only. Citations produced by models may not have been independently verified.

## Mock participant A — independent

Model: none (mocked reply)
Model provenance: fixed synthetic fixture (no live model call in this run)
Usage models (may include auxiliary calls): not retained
Requested model: none (mocked)
Requested reasoning effort: none (mocked)
Time: 2026-10-19T18:02:07.355Z
Provenance: MOCKED — fixed synthetic fixture (no live model or CLI call during this example run)

[MOCKED REPLY — fixed synthetic fixture; no live model was called during this example run]
MOCK-REPLY-ID: independent:mock-a

Evidence and retrieval status: no sources were opened (mocked example).
Independent assessment: under the stated constraints, one shared library would let the group clean up each reference record once instead of three times.
Alternatives / falsifiers: if the two manuscripts depend on fixed citation keys, moving now could cause rework.
Conditional decision advice: move now only if citation keys can be preserved.
Sources: one placeholder, not a real publication.

```roundtable-data
{
 "claims": [
  {
   "id": "C1",
   "statement": "One shared library lets a small group maintain each reference record once.",
   "sourceIds": [
    "S1"
   ],
   "evidenceType": "inference",
   "confidence": "Illustrative reasoning only.",
   "limitations": "Mocked example; no evidence was consulted."
  }
 ],
 "sources": [
  {
   "id": "S1",
   "title": "Placeholder source A (synthetic; not a real publication)",
   "url": "https://example.org/synthetic/source-a",
   "doi": "",
   "quote": "",
   "locator": "",
   "reportedAccess": "not_read"
  }
 ],
 "disputes": [],
 "summary": {
  "recommendation": "Move to a shared library now if citation keys can be preserved.",
  "options": [
   {
    "name": "Shared library now",
    "benefits": "Records maintained once",
    "tradeoffs": "Migration effort while two manuscripts are being drafted",
    "conditions": "Citation keys are preserved"
   }
  ],
  "nextSteps": [
   "List the citation keys each manuscript in progress uses"
  ],
  "uncertainties": [
   "Whether keys survive the move"
  ],
  "changes": []
 }
}
```

---

## Mock participant B — independent

Model: none (mocked reply)
Model provenance: fixed synthetic fixture (no live model call in this run)
Usage models (may include auxiliary calls): not retained
Requested model: none (mocked)
Requested reasoning effort: none (mocked)
Time: 2026-10-19T18:02:07.355Z
Provenance: MOCKED — fixed synthetic fixture (no live model or CLI call during this example run)

[MOCKED REPLY — fixed synthetic fixture; no live model was called during this example run]
MOCK-REPLY-ID: independent:mock-b

Evidence and retrieval status: no sources were opened (mocked example).
Independent assessment: two manuscripts are mid-draft; changing the library now risks altered citation keys and broken in-text citations at a busy time.
Alternatives / falsifiers: if a test import shows the keys are unchanged, this risk is small.
Conditional decision advice: keep individual libraries until the next project starts.
Sources: one placeholder, not a real publication.

```roundtable-data
{
 "claims": [
  {
   "id": "C1",
   "statement": "Changing libraries during active drafting can alter citation keys and create rework.",
   "sourceIds": [
    "S1"
   ],
   "evidenceType": "inference",
   "confidence": "Illustrative reasoning only.",
   "limitations": "Mocked example; no evidence was consulted."
  }
 ],
 "sources": [
  {
   "id": "S1",
   "title": "Placeholder source B (synthetic; not a real publication)",
   "url": "https://example.org/synthetic/source-b",
   "doi": "",
   "quote": "",
   "locator": "",
   "reportedAccess": "not_read"
  }
 ],
 "disputes": [],
 "summary": {
  "recommendation": "Wait until the next project starts.",
  "options": [
   {
    "name": "Keep individual libraries for now",
    "benefits": "No disruption to drafts in progress",
    "tradeoffs": "Duplicate maintenance continues",
    "conditions": "The manuscripts depend on their current keys"
   }
  ],
  "nextSteps": [
   "Revisit at the start of the next project"
  ],
  "uncertainties": [
   "How much the duplicate maintenance actually costs"
  ],
  "changes": []
 }
}
```

---

## Mock participant A — critique

Model: none (mocked reply)
Model provenance: fixed synthetic fixture (no live model call in this run)
Usage models (may include auxiliary calls): not retained
Requested model: none (mocked)
Requested reasoning effort: none (mocked)
Time: 2026-10-19T18:02:07.356Z
Provenance: MOCKED — fixed synthetic fixture (no live model or CLI call during this example run)

[MOCKED REPLY — fixed synthetic fixture; no live model was called during this example run]
MOCK-REPLY-ID: critique:mock-a

Cross-examination: Participant 2 raises a risk that my first answer treated only as a condition. The disagreement is testable: does a move change the keys used by the manuscripts in progress? I revise my advice from "move now" to "test first". Unresolved: the key-preservation question.

```roundtable-data
{
 "claims": [
  {
   "id": "C1",
   "statement": "The decision depends on a testable question: whether citation keys change on import.",
   "sourceIds": [],
   "evidenceType": "inference",
   "confidence": "Illustrative reasoning only.",
   "limitations": "Mocked example."
  }
 ],
 "sources": [],
 "disputes": [
  {
   "question": "Would moving to one shared library mid-semester change the citation keys used by the two manuscripts in progress?",
   "positions": "Participant 1: low risk if keys are exported and preserved. Participant 2: high risk for drafts in progress.",
   "whyItMatters": "Decides whether a move now creates rework for two manuscripts.",
   "whatToCheck": "Export one manuscript library, import it into a test shared library and compare citation keys.",
   "status": "open",
   "reason": "Neither side has tested this; both positions are assumptions.",
   "sourceIds": []
  }
 ],
 "summary": {
  "recommendation": "Test key preservation before deciding.",
  "options": [],
  "nextSteps": [
   "Run an export/import comparison on one manuscript"
  ],
  "uncertainties": [
   "Result of the key comparison"
  ],
  "changes": [
   "Changed from \"move now\" to \"test first\""
  ]
 }
}
```

---

## Mock participant B — critique

Model: none (mocked reply)
Model provenance: fixed synthetic fixture (no live model call in this run)
Usage models (may include auxiliary calls): not retained
Requested model: none (mocked)
Requested reasoning effort: none (mocked)
Time: 2026-10-19T18:02:07.357Z
Provenance: MOCKED — fixed synthetic fixture (no live model or CLI call during this example run)

[MOCKED REPLY — fixed synthetic fixture; no live model was called during this example run]
MOCK-REPLY-ID: critique:mock-b

Cross-examination: Participant 1's benefit is real but does not depend on timing; it can be realized at the next project. I keep my recommendation but agree that the risk can be tested.

```roundtable-data
{
 "claims": [
  {
   "id": "C1",
   "statement": "The benefit of a shared library does not require switching mid-semester.",
   "sourceIds": [],
   "evidenceType": "inference",
   "confidence": "Illustrative reasoning only.",
   "limitations": "Mocked example."
  }
 ],
 "sources": [],
 "disputes": [
  {
   "question": "Would moving to one shared library mid-semester change the citation keys used by the two manuscripts in progress?",
   "positions": "Participant 1: low risk if keys are preserved. Participant 2: plausible risk; wait.",
   "whyItMatters": "Timing of the change.",
   "whatToCheck": "The same export/import comparison.",
   "status": "open",
   "reason": "The risk is plausible but untested.",
   "sourceIds": []
  }
 ],
 "summary": {
  "recommendation": "Wait, but run the key comparison now.",
  "options": [],
  "nextSteps": [
   "Run the key comparison"
  ],
  "uncertainties": [],
  "changes": []
 }
}
```

---

## Mock participant A — verification

Model: none (mocked reply)
Model provenance: fixed synthetic fixture (no live model call in this run)
Usage models (may include auxiliary calls): not retained
Requested model: none (mocked)
Requested reasoning effort: none (mocked)
Time: 2026-10-19T18:02:07.360Z
Provenance: MOCKED — fixed synthetic fixture (no live model or CLI call during this example run)

[MOCKED REPLY — fixed synthetic fixture; no live model was called during this example run]
MOCK-REPLY-ID: verification:0:mock-a

Targeted check (mocked): no check was actually performed in this example. The fixture marks the issue "partly resolved" only to show how a status change and its stated reason are stored in the issue history.

```roundtable-data
{
 "claims": [
  {
   "id": "C1",
   "statement": "The key-preservation question can be tested on one manuscript before any group-wide change.",
   "sourceIds": [
    "S1"
   ],
   "evidenceType": "inference",
   "confidence": "Illustrative reasoning only.",
   "limitations": "Mocked example; the test was specified, not run."
  }
 ],
 "sources": [
  {
   "id": "S1",
   "title": "Placeholder source C (synthetic; not a real publication)",
   "url": "https://example.org/synthetic/source-c",
   "doi": "",
   "quote": "",
   "locator": "",
   "reportedAccess": "not_read"
  }
 ],
 "disputes": [
  {
   "question": "Would moving to one shared library mid-semester change the citation keys used by the two manuscripts in progress?",
   "issueId": "issue-2418600bf68e082a",
   "positions": "Both positions retained; a test procedure is now specified but has not been run.",
   "whyItMatters": "Decides whether a move now creates rework.",
   "whatToCheck": "Run the export/import comparison on one manuscript.",
   "status": "partly_resolved",
   "reason": "Mocked status change for illustration: the check procedure is specified, but no result exists.",
   "sourceIds": [
    "S1"
   ]
  }
 ],
 "summary": {
  "recommendation": "Specify and run the key comparison before deciding.",
  "options": [],
  "nextSteps": [],
  "uncertainties": [
   "Comparison result"
  ],
  "changes": []
 }
}
```

---

## Mock participant A — synthesis

Model: none (mocked reply)
Model provenance: fixed synthetic fixture (no live model call in this run)
Usage models (may include auxiliary calls): not retained
Requested model: none (mocked)
Requested reasoning effort: none (mocked)
Time: 2026-10-19T18:02:07.365Z
Provenance: MOCKED — fixed synthetic fixture (no live model or CLI call during this example run)

[MOCKED REPLY — fixed synthetic fixture; no live model was called during this example run]
MOCK-REPLY-ID: synthesis:mock-a

Chair synthesis (mocked).
Agreement: both participants accept that maintaining records once is useful and that changed citation keys would cause rework.
Unresolved dissent: whether to move this semester. Participant 2 still prefers waiting; Participant 1 now prefers a test first.
Conditional recommendation: keep individual libraries for the two manuscripts in progress, run the key-preservation test on one manuscript, and adopt the shared library for the next project if the test passes.
What remains unchecked: no sources were opened; every source check in this example is mocked.

```roundtable-data
{
 "claims": [
  {
   "id": "C1",
   "statement": "A key-preservation test on one manuscript lowers the risk of a group-wide change.",
   "sourceIds": [
    "S1"
   ],
   "evidenceType": "inference",
   "confidence": "Illustrative reasoning only.",
   "limitations": "Mocked example."
  }
 ],
 "sources": [
  {
   "id": "S1",
   "title": "Placeholder source A (synthetic; not a real publication)",
   "url": "https://example.org/synthetic/source-a",
   "doi": "",
   "quote": "",
   "locator": "",
   "reportedAccess": "not_read"
  },
  {
   "id": "S2",
   "title": "Placeholder source D (synthetic; not a real publication)",
   "url": "https://example.org/synthetic/source-d",
   "doi": "",
   "quote": "",
   "locator": "",
   "reportedAccess": "not_read"
  }
 ],
 "disputes": [
  {
   "question": "Would moving to one shared library mid-semester change the citation keys used by the two manuscripts in progress?",
   "issueId": "issue-2418600bf68e082a",
   "positions": "Participant 1: test first, then move. Participant 2: wait for the next project.",
   "whyItMatters": "Timing and rework risk.",
   "whatToCheck": "Result of the export/import comparison.",
   "status": "partly_resolved",
   "reason": "Test specified, not run; dissent on timing remains.",
   "sourceIds": [
    "S1"
   ]
  }
 ],
 "summary": {
  "recommendation": "Keep individual libraries for the manuscripts in progress; adopt a shared library for the next project if a key-preservation test passes.",
  "options": [
   {
    "name": "Shared library now",
    "benefits": "Records maintained once, sooner",
    "tradeoffs": "Rework risk for drafts in progress",
    "conditions": "Key test passes before the move"
   },
   {
    "name": "Shared library at the next project",
    "benefits": "No disruption to current drafts",
    "tradeoffs": "Duplicate maintenance continues this semester",
    "conditions": "Default if the test is not run"
   }
  ],
  "nextSteps": [
   "Run the export/import key comparison on one manuscript",
   "Decide at the start of the next project"
  ],
  "uncertainties": [
   "Result of the key comparison"
  ],
  "changes": []
 }
}
```

## Research design

Depth: standard
Version: 1
Previous session: none
Decision context: {"goal":"Choose a reference-management setup for a small research group","options":"Shared library now; keep individual libraries until the next project","constraints":"No budget for paid seats; two manuscripts are being drafted","timeframe":"This semester"}
Clarification record: null

## Claim-to-source mapping

- [inference; mocked fixture assessment] One shared library lets a small group maintain each reference record once.
  Sources: 5f7f703d-620a-47d8-ba05-083ce99e27cc:S1
  Limits: Mocked example; no evidence was consulted.
- [inference; mocked fixture assessment] Changing libraries during active drafting can alter citation keys and create rework.
  Sources: 1d8147b2-4220-41d3-93f0-3e7fa5f674e8:S1
  Limits: Mocked example; no evidence was consulted.
- [inference; mocked fixture assessment] The decision depends on a testable question: whether citation keys change on import.
  Sources: none linked
  Limits: Mocked example.
- [inference; mocked fixture assessment] The benefit of a shared library does not require switching mid-semester.
  Sources: none linked
  Limits: Mocked example.
- [inference; mocked fixture assessment] The key-preservation question can be tested on one manuscript before any group-wide change.
  Sources: 980909ab-134c-4aaa-b494-6e68223ff0f2:S1
  Limits: Mocked example; the test was specified, not run.
- [inference; mocked fixture assessment] A key-preservation test on one manuscript lowers the risk of a group-wide change.
  Sources: 16a01a43-ae30-4002-a4d7-82ff6a339a46:S1
  Limits: Mocked example.

## Source checks

Source retrieval and excerpt matching do not establish that a claim is true.

### Placeholder source A (synthetic; not a real publication)

Group: source-7dc9c639099da386
https://example.org/synthetic/source-a
Citation occurrences: 2
Grouped identifiers do not establish independent study samples.

- Citation: 5f7f703d-620a-47d8-ba05-083ce99e27cc:S1 (mock-a; independent)
  Model-reported access: not_read
  Reported excerpt: none
  Locator: not reported
  Actual check: {"status":"unavailable","checkedAt":"2026-10-19T18:02:07.364Z","metadata":null,"retrievedUrl":null,"access":"unavailable","quoteMatch":null,"note":"MOCKED source check for this example: no network request was made. In the prototype, lib/evidence.mjs would retrieve Crossref metadata/abstract or public page text here."}
  Reused identical source/quote check from: none

- Citation: 16a01a43-ae30-4002-a4d7-82ff6a339a46:S1 (mock-a; synthesis)
  Model-reported access: not_read
  Reported excerpt: none
  Locator: not reported
  Actual check: {"status":"unavailable","checkedAt":"2026-10-19T18:02:07.364Z","metadata":null,"retrievedUrl":null,"access":"unavailable","quoteMatch":null,"note":"MOCKED source check for this example: no network request was made. In the prototype, lib/evidence.mjs would retrieve Crossref metadata/abstract or public page text here."}
  Reused identical source/quote check from: 5f7f703d-620a-47d8-ba05-083ce99e27cc:S1

### Placeholder source B (synthetic; not a real publication)

Group: source-3c1dd2f948d5d515
https://example.org/synthetic/source-b
Citation occurrences: 1
Grouped identifiers do not establish independent study samples.

- Citation: 1d8147b2-4220-41d3-93f0-3e7fa5f674e8:S1 (mock-b; independent)
  Model-reported access: not_read
  Reported excerpt: none
  Locator: not reported
  Actual check: {"status":"unavailable","checkedAt":"2026-10-19T18:02:07.363Z","metadata":null,"retrievedUrl":null,"access":"unavailable","quoteMatch":null,"note":"MOCKED source check for this example: no network request was made. In the prototype, lib/evidence.mjs would retrieve Crossref metadata/abstract or public page text here."}
  Reused identical source/quote check from: none

### Placeholder source C (synthetic; not a real publication)

Group: source-9ee74060e5de9b76
https://example.org/synthetic/source-c
Citation occurrences: 1
Grouped identifiers do not establish independent study samples.

- Citation: 980909ab-134c-4aaa-b494-6e68223ff0f2:S1 (mock-a; verification)
  Model-reported access: not_read
  Reported excerpt: none
  Locator: not reported
  Actual check: {"status":"unavailable","checkedAt":"2026-10-19T18:02:07.362Z","metadata":null,"retrievedUrl":null,"access":"unavailable","quoteMatch":null,"note":"MOCKED source check for this example: no network request was made. In the prototype, lib/evidence.mjs would retrieve Crossref metadata/abstract or public page text here."}
  Reused identical source/quote check from: none

### Placeholder source D (synthetic; not a real publication)

Group: source-ae56cebb17b79a84
https://example.org/synthetic/source-d
Citation occurrences: 1
Grouped identifiers do not establish independent study samples.

- Citation: 16a01a43-ae30-4002-a4d7-82ff6a339a46:S2 (mock-a; synthesis)
  Model-reported access: not_read
  Reported excerpt: none
  Locator: not reported
  Actual check: {"status":"unavailable","checkedAt":"2026-10-19T18:02:07.367Z","metadata":null,"retrievedUrl":null,"access":"unavailable","quoteMatch":null,"note":"MOCKED source check for this example: no network request was made. In the prototype, lib/evidence.mjs would retrieve Crossref metadata/abstract or public page text here."}
  Reused identical source/quote check from: none

## Evidence supplied to synthesis

{"status":"changed_after_synthesis","checkedCount":3,"remainingCount":0,"uncheckedFinalCount":0,"unreviewedFinalCount":1,"newCheckCount":1}

### 16a01a43-ae30-4002-a4d7-82ff6a339a46

[
  {
    "sourceId": "5f7f703d-620a-47d8-ba05-083ce99e27cc:S1",
    "identity": "[\"https://example.org/synthetic/source-a\",\"\",\"Placeholder source A (synthetic; not a real publication)\",\"\"]",
    "source": {
      "title": "Placeholder source A (synthetic; not a real publication)",
      "url": "https://example.org/synthetic/source-a",
      "doi": "",
      "quote": "",
      "locator": "",
      "provider": "mock-a",
      "stage": "independent",
      "manual": false
    },
    "check": {
      "status": "unavailable",
      "checkedAt": "2026-10-19T18:02:07.364Z",
      "metadata": null,
      "retrievedUrl": null,
      "access": "unavailable",
      "quoteMatch": null,
      "note": "MOCKED source check for this example: no network request was made. In the prototype, lib/evidence.mjs would retrieve Crossref metadata/abstract or public page text here."
    }
  },
  {
    "sourceId": "1d8147b2-4220-41d3-93f0-3e7fa5f674e8:S1",
    "identity": "[\"https://example.org/synthetic/source-b\",\"\",\"Placeholder source B (synthetic; not a real publication)\",\"\"]",
    "source": {
      "title": "Placeholder source B (synthetic; not a real publication)",
      "url": "https://example.org/synthetic/source-b",
      "doi": "",
      "quote": "",
      "locator": "",
      "provider": "mock-b",
      "stage": "independent",
      "manual": false
    },
    "check": {
      "status": "unavailable",
      "checkedAt": "2026-10-19T18:02:07.363Z",
      "metadata": null,
      "retrievedUrl": null,
      "access": "unavailable",
      "quoteMatch": null,
      "note": "MOCKED source check for this example: no network request was made. In the prototype, lib/evidence.mjs would retrieve Crossref metadata/abstract or public page text here."
    }
  },
  {
    "sourceId": "980909ab-134c-4aaa-b494-6e68223ff0f2:S1",
    "identity": "[\"https://example.org/synthetic/source-c\",\"\",\"Placeholder source C (synthetic; not a real publication)\",\"\"]",
    "source": {
      "title": "Placeholder source C (synthetic; not a real publication)",
      "url": "https://example.org/synthetic/source-c",
      "doi": "",
      "quote": "",
      "locator": "",
      "provider": "mock-a",
      "stage": "verification",
      "manual": false
    },
    "check": {
      "status": "unavailable",
      "checkedAt": "2026-10-19T18:02:07.362Z",
      "metadata": null,
      "retrievedUrl": null,
      "access": "unavailable",
      "quoteMatch": null,
      "note": "MOCKED source check for this example: no network request was made. In the prototype, lib/evidence.mjs would retrieve Crossref metadata/abstract or public page text here."
    }
  }
]

## Disagreement history

All states below come from mocked fixture replies; in live runs they are model assessments, not independently proven resolutions.

### Would moving to one shared library mid-semester change the citation keys used by the two manuscripts in progress?

Issue: issue-2418600bf68e082a
Latest reported status (mocked): partly_resolved
Conflicting assessments: yes
- 2026-10-19T18:02:07.356Z | Mock participant A | critique | open
  Positions: Participant 1: low risk if keys are exported and preserved. Participant 2: high risk for drafts in progress.
  Reason: Neither side has tested this; both positions are assumptions.
  What to check: Export one manuscript library, import it into a test shared library and compare citation keys.
  Sources: none linked
- 2026-10-19T18:02:07.357Z | Mock participant B | critique | open
  Positions: Participant 1: low risk if keys are preserved. Participant 2: plausible risk; wait.
  Reason: The risk is plausible but untested.
  What to check: The same export/import comparison.
  Sources: none linked
- 2026-10-19T18:02:07.360Z | Mock participant A | verification | partly_resolved
  Positions: Both positions retained; a test procedure is now specified but has not been run.
  Reason: Mocked status change for illustration: the check procedure is specified, but no result exists.
  What to check: Run the export/import comparison on one manuscript.
  Sources: 980909ab-134c-4aaa-b494-6e68223ff0f2:S1
- 2026-10-19T18:02:07.365Z | Mock participant A | synthesis | partly_resolved
  Positions: Participant 1: test first, then move. Participant 2: wait for the next project.
  Reason: Test specified, not run; dissent on timing remains.
  What to check: Result of the export/import comparison.
  Sources: 16a01a43-ae30-4002-a4d7-82ff6a339a46:S1

## Changes from previous version

No structured comparison was returned.
