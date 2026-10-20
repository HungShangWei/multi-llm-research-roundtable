# Multi-LLM Research Roundtable

**Work in progress — personal research-tool prototype.** Snapshot prepared 2026-10-19 and revised 2026-10-20 (Taiwan time) from source version 0.6.0 (`package.json`); source files last modified 2026-10-02.

## What problem it addresses

Asking several AI assistants the same research or decision question usually yields separate answers that are hard to compare: it is unclear where they disagree, which citations were actually opened, and what changed after cross-checking. This prototype runs the official model command-line tools through a fixed, staged protocol on a local machine and keeps each answer, cited source and disagreement in a local record instead of merging them into one reply.

## Current capabilities in this snapshot

Implemented in the source below; calls to the external model tools were **not** exercised for this snapshot (see [Validation and limitations](#validation-and-limitations)).

1. **Staged protocol.** Participants answer first without seeing each other; a critique round (skipped at overview depth) sees the saved first-round answers; 0/1/2 follow-up checks (overview/standard/deep) target unresolved disagreements; a chair writes the synthesis from the saved record. This separates information flow; it does not make the models statistically independent. (`lib/research.mjs`, `lib/protocol.mjs`, `lib/engine.mjs`)
2. **Official CLI adapters with guardrails.** Codex CLI, Claude Code and Antigravity CLI run as child processes with subscription sign-in checks, API-key variables removed, timeouts, output limits and process-group termination on pause. Imported answers stay labeled as unverified. (`lib/providers.mjs`, `lib/diagnostics.mjs`)
3. **Resumable local records.** Sessions are atomically written JSON files. After a restart, running sessions become paused; a step counts as done only if its saved answer was built from the current inputs, so resuming repeats only unfinished or invalidated steps. (`lib/engine.mjs`)
4. **Claims, sources and disagreements.** Each answer's structured block becomes claim-to-source links, source groups and issue threads with history. A bounded HTTPS checker fetches Crossref metadata/abstracts or public page text and records exact-quote matches — a mechanical observation, not proof that a claim is true. Sessions export to Markdown. (`lib/research.mjs`, `lib/evidence.mjs`)
5. **Interface and comparison harness.** A bilingual (Traditional Chinese/English) web UI on `127.0.0.1` with a per-launch token, a Swift/WebKit macOS wrapper, and a masked A/B harness (single model vs. roundtable on six fixed questions) for human rating. The harness has no results yet. (`dist/`, `desktop/`, `lib/evaluation.mjs`)

## Example

[`examples/`](examples/README.md) holds a **synthetic illustration with mocked replies**: a made-up question run through the real engine with a deterministic mocked runner. No live model or CLI calls were made during this example run; the replies are fixed synthetic fixtures, not observed live-model responses or research findings. [`stage-inputs.md`](examples/mock-roundtable/output/stage-inputs.md) shows which earlier answers each stage's prompt contained; [`session-export.md`](examples/mock-roundtable/output/session-export.md) is the exported record, including a disagreement whose status changes.

## My contribution

- **Problem and requirements:** defined the use case — research and decision questions where each model's answer, citations and disagreements stay inspectable.
- **Participation and cross-review design:** chose which platforms take part and which model and reasoning settings to request, and helped shape the cross-review flow.
- **Interface and iteration trade-offs:** asked for a desktop app, a bilingual interface with a separate answer language, and per-session record management (delete/restore, export); gave hands-on feedback on usage and iteration priorities.
- **AI-assisted development:** the implementation was built iteratively with AI coding assistants under my guidance; I do not claim line-by-line authorship of individual modules.

The external model tools supply reasoning, web search and answer text; the prototype's own work is orchestration, record-keeping, source checks and the interface.

## Getting started

Requires Node.js 22+; there are no npm dependencies.

```bash
npm test                                               # = node --test tests/*.test.mjs; 35 passed on 2026-10-19, not re-run for the revision
node examples/mock-roundtable/run-mock-roundtable.mjs  # offline; regenerated the committed example output for the revision
npm start                                              # source-derived; not run while preparing the snapshot
```

- `npm start` serves the UI at `http://127.0.0.1:4318` and saves sessions under `./sessions` (override with `ROUNDTABLE_PORT`, `ROUNDTABLE_DATA_DIR`, `ROUNDTABLE_RUNTIME_DIR`).
- Generating answers needs at least two official CLIs installed and signed in with **your own** subscription; the app stops if it detects API-key or API-billing sign-in.
- A run sends your question, context, attachments and earlier answers to those vendors and uses your plan's usage (standard depth with two participants: 5–6 model calls, plus any retries). Source checks contact Crossref and the cited websites.
- Some tool-discovery paths and the desktop wrapper are macOS-specific; the wrapper cannot be built from this snapshot alone.

## Validation and limitations

| Check | Result |
|---|---|
| Existing test suite (35 tests; mocked runners, temporary folders) | The same suite was run three times on 2026-10-19 while preparing the first snapshot: 35 passed, 0 failed each time (Linux, Node 22.23.2, inside network namespaces created with `unshare -rn`). Not re-run for the 2026-10-20 revision |
| Mock example | Regenerated once for the revision (2026-10-19 18:02 UTC) in a network namespace whose recorded interfaces and routes were loopback only: 6 mocked calls, 4 mocked source checks plus 1 reuse |
| Earlier 0.6.0 build log (undated) | 35 passed; 0 real model calls in that upgrade |
| Earlier live run | One private session from an earlier version (2026-09-20) is marked complete, with answers from three CLIs; program version and responding model IDs were not recorded |
| macOS app, live CLI calls, answer quality | Not run / not evaluated |

No evaluation shows that the roundtable beats a single model, reduces hallucinations or saves time. Passing tests verify software behavior, not answer quality.

## Next steps

Candidate directions taken from documented limitations — planned, not implemented, no timeline:

- Run the A/B harness with real CLIs and human ratings.
- Read PDF full text in the source checker (currently unsupported).
- Make the desktop build reproducible without an existing installed app bundle.
- Bring back the larger historical test suite (156 tests in 0.5.0) that was not available locally when 0.6.0 was built.

Architecture, trade-offs and data flows: [`docs/ENGINEERING_NOTES.md`](docs/ENGINEERING_NOTES.md).

## License and credits

No license has been chosen yet, so this is not an open-source release; default copyright applies until a license file is added. Codex, Claude and Gemini/Antigravity are third-party products used through their official CLIs; no affiliation or endorsement is implied, and no vendor tools, credentials or binaries are included. [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) covers the HTML named-character-reference table embedded in `lib/evidence.mjs` (exported from Python's `html.entities`, which derives from the WHATWG HTML Standard; upstream license texts are in [`licenses/`](licenses/)) and other third-party material. Those notices apply to that material, not to the project as a whole.
