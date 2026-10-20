# Examples

> **Synthetic illustration — mocked replies, not a live session.** No live model or CLI calls were made during this example run. The replies are fixed synthetic fixtures, not observed live-model responses or research findings; the fixtures and this folder were prepared with AI assistance (Claude) for the public snapshot. The folder shows the prototype's input, stages and output format; it says nothing about answer quality.

## `mock-roundtable/`

| File | What it is |
|---|---|
| [`input.json`](mock-roundtable/input.json) | Synthetic request: question, decision context, two mock participants, depth `standard`. Not the author's research question. |
| [`mock-replies.mjs`](mock-roundtable/mock-replies.mjs) | Fixed synthetic fixture replies, one per step, each with a `roundtable-data` block. Sources are `example.org` placeholders. |
| [`run-mock-roundtable.mjs`](mock-roundtable/run-mock-roundtable.mjs) | Drives the real engine (`lib/engine.mjs`), prompt builders and Markdown export (`lib/protocol.mjs`) with a deterministic mocked runner and a mocked source checker. |
| [`output/stage-inputs.md`](mock-roundtable/output/stage-inputs.md) | Per-step table: stage, participant, prompt size, and which earlier replies each real prompt contained (measured, not asserted). |
| [`output/session-export.md`](mock-roundtable/output/session-export.md) | The session exported to Markdown, with a banner and a counted list of live-run phrases the script relabeled. |
| [`output/session-record.json`](mock-roundtable/output/session-record.json) | The saved session record, unmodified. |

### What happens (readable without installing anything)

1. **Intake, local:** the goal and constraints were supplied, so no clarification questions were asked.
2. **Independent round:** Mock A favors moving now if citation keys survive; Mock B favors waiting. Neither prompt contains the other reply.
3. **Critique round:** each participant sees both first-round replies; both record the same open issue — would a move change citation keys? Mock A revises its advice from "move now" to "test first".
4. **Follow-up check:** planned automatically (one step at `standard` depth) because the issue stayed open. The fixture marks it `partly_resolved` with a stated reason; no check was actually run.
5. **Synthesis by the chair (Mock A):** keeps the dissent on timing visible and gives a conditional recommendation. The issue history records conflicting assessments.
6. **Source checks:** four mocked checks and one reuse for an identical citation; no network requests.

### Re-run it

From the repository root, with Node.js 22+ (offline; no CLI or account needed):

```bash
node examples/mock-roundtable/run-mock-roundtable.mjs                  # rewrites output/
node examples/mock-roundtable/run-mock-roundtable.mjs --out /tmp/rt-mock
```

`--label <text>` adds a note to both output banners. IDs, timestamps and prompt sizes reflect each run. The committed `output/` is a new record generated for the 2026-10-20 revision (run at 2026-10-19 18:02 UTC) on a copy of this snapshot, in a Linux execution environment inside a network namespace that had only a loopback interface and no routes. It replaces the first snapshot's output: the fixture header text changed, so later prompts grew accordingly; call and source-check counts did not change.

### Labels

- **Synthetic input:** written for this snapshot.
- **Mocked replies and source checks:** fixed synthetic fixtures (prepared with AI assistance) and a stubbed source checker; no live model, CLI or network calls during the example run.
- **Real code path:** step planning, prompt building, parsing of claims, sources and issues, source-check scheduling and Markdown export are the prototype's unmodified code.
