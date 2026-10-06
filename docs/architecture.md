# Architecture

## Scope

Outward is a React + TypeScript single-page application built with Vite. It has no application server or account system. Its core loop is:

**Describe a mood → choose constraints → match three missions → pocket the phone → record an optional observation.**

The design has two distinct matching paths: real on-device semantic matching and an explicit deterministic demo. The UI must communicate which produced a plan.

## Source map

- `src/App.tsx`: planner, result, pocket mode, reflection, journal, and explanatory dialogs
- `src/data/missions.ts`: 22 curated missions and their setting, movement, category, and matching metadata
- `src/ai/client.ts`: worker lifecycle, request IDs, cancellation, and explicit demo routing
- `src/ai/worker.ts` and `src/ai/protocol.ts`: typed browser-worker requests, progress, results, and errors
- `src/ai/model.ts`: lazy model loading, embeddings, and in-memory catalog-vector cache
- `src/ai/rank.ts`: validation, eligible catalog filtering, semantic selection, and deterministic demo matching
- `src/storage.ts`: sanitized active-trip persistence, journal recovery, strict backup validation/merge, capacity limits, and time helpers
- `src/types.ts`: mission, plan, input, and progress types
- `public/sw.js` and `src/main.tsx`: production-only service-worker registration and static caching

## Data flow

1. The user supplies a short mood description, a setting, a duration, a pace, and an optional request to skip listening activities.
2. The mission catalog provides reviewed activity text and structured constraints.
3. The AI path loads a feature-extraction pipeline for `Xenova/all-MiniLM-L6-v2` using `@huggingface/transformers` version `4.3.0`, `dtype: 'q8'`, and `device: 'wasm'`. The model revision is pinned to `751bff37182d3f1213fa05d7196b954e230abad9`.
4. Text embeddings provide relevance scores. Hard setting, pace, optional listening, and request-only mission exclusions restrict eligible missions; a semantic match is never permission to violate those constraints.
5. The matcher chooses three missions from the catalog. It does not generate new outdoor instructions.
6. The UI displays the plan and its matching mode. The user can ask for another set in the same mode; the current three IDs are excluded from that request. Changing an input marks the existing plan stale and disables starting it or requesting another set until a new match is made.
7. Pocket mode stores a sanitized active outing with absolute start and end timestamps. Remaining time is derived from the clock whenever the view updates. Titles stay visible and full instructions can be expanded.
8. An optional reflection is saved to a local journal. Export produces a local JSON file; restore validates and previews a merge before confirmation. Deletion also requires confirmation and keeps a session-only undo history.

Reflection text is not part of steps 3–5. There is no learning from the journal and no feedback loop into model training.

The mood input is limited to 500 characters. A blank input uses a general outdoor-pause query. Setting, stationary eligibility, and the optional exclusion of the `listen` category are hard filters. Duration controls the outing timer; it does not imply the model has estimated how long each mission takes.

The semantic selector starts with cosine relevance and then penalizes similarity to previously selected missions and repeated categories. This modest variety penalty avoids three near-duplicates; it does not provide a safety score. Displayed similarity values are raw cosine scores, not probabilities or confidence. The demo path uses lexical overlap and a category-variety penalty, without model inference. Both matchers honor the same hard filters. If fewer than three eligible missions remain, they return an error rather than relax a constraint or repeat excluded missions.

Another-set exclusions apply only to the immediately preceding three missions, not the whole session history. Older missions may reappear in later sets. Exclusions are request-only options, not saved plan input. AI mode still computes semantic ranking for the new set and can reuse the worker's cached model and catalog embeddings.

## Why embeddings and a curated catalog

The [underlying model](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) encodes short text into 384-dimensional sentence embeddings. The [ONNX model card](https://huggingface.co/Xenova/all-MiniLM-L6-v2) documents mean pooling and normalization for sentence matching.

Semantic ranking can connect a mood description to a relevant activity without requiring the user to know a fixed category name. Curating the output keeps wording, required movement, and expected setting inspectable. This trades open-ended variety for a small, reviewable set of instructions.

The model does not verify the user's environment, diagnose a mood, or establish what activity will help them. This is a relevance heuristic, not a validated recommendation system for health or safety. English-focused training and embedding similarity can produce unsuitable rankings.

## Execution and network boundary

[Transformers.js](https://huggingface.co/docs/transformers.js/index) supports browser inference through ONNX Runtime and WebAssembly. The intended inference boundary is the local browser; there is no hosted inference request carrying the user's text.

Inference runs in a dedicated worker. WASM is configured for one thread, without a proxy worker, so this configuration does not depend on cross-origin isolation for multithreading. Catalog vectors are computed once per loaded worker and reused in memory. Cancelling a match terminates the worker, interrupting pending work and clearing that in-memory state. Each AI request has a total deadline of 90 seconds by default, including both download and inference; the programmatic override is bounded to at most 10 minutes. Progress events do not extend the deadline. Timeout, worker errors, and unreadable worker messages also reset the worker, remove listeners/timers, and reject pending requests so retry starts cleanly. Events queued by an old worker are ignored after it has been replaced.

Network requests still occur:

- The browser loads the app's HTML, JavaScript, styles, fonts, and other static assets from the development server or future host
- First AI use fetches model, tokenizer, and configuration assets from Hugging Face
- The standard 14.26 MB CPU-only WebAssembly binary and module load from the app’s own origin; the browser bundle aliases ONNX Web to its WASM-only entrypoint

Those providers can receive ordinary request metadata. The app should never attach the mood or journal text to an asset URL, query string, analytics event, or remote request. A future hosted deployment must be inspected for its own request logging and policies.

The quantized ONNX weight file is about 23 MB in the [official model listing](https://huggingface.co/Xenova/all-MiniLM-L6-v2/tree/main/onnx). Runtime and supporting assets are additional. Total downloaded bytes should be measured before publishing any total-size claim.

## Demo behavior and errors

Demo mode exists so the interface can be explored without downloading the model. It must be an explicit user choice and remain labeled as a demo after a plan is produced.

AI failures preserve an understandable error and a retry path. No failure silently changes a plan to demo mode. Download progress, loaded state, and successful inference are different events: the ONNX-weight percentage is cleared when the weights finish, followed by a tokenizer/runtime preparation message and embedding/ranking stages. A 100% weight download is not reported as a finished plan.

Request IDs, worker identity checks, and UI request generations keep stale results from replacing the current plan. Planner inputs are disabled during matching. Cancelling invalidates the UI request before terminating the worker; a queued completion from the cancelled request cannot update the visible result.

## Persistence boundary

Local persistence covers active outings and saved journal entries. Both keys retain version 1 compatibility:

- `outward.active.v1` stores three validated missions, setting, pace, duration, matching-mode label, plan creation time, outing ID, and start/end timestamps. Before writing, `saveActiveTrip` reconstructs a known shape, blanks `input.mood` and `query`, sets `model` to `null`, and replaces `similarities` with an empty object. It does not mutate the live plan. `saveLocal` routes active-key writes through the same sanitizer
- `readActive` validates a complete trip, returns only its sanitized form, and tries to rewrite valid legacy records that retained input or extra fields. If storage refuses that rewrite, the sanitized trip is still usable in memory, but the original persisted copy remains. Invalid records are not restored and are not destructively rewritten
- `outward.journal.v1` stores up to 100 entries with ID, title, reflection, selected feeling, mission titles, elapsed minutes, date, and AI/demo label. The journal does not copy the original mood text

Finishing or cancelling an outing attempts to remove its active record. Storage failures are possible; these are unencrypted browser records, not secure deletion guarantees. The current page can still hold the original input and model results in memory. Model cache storage and the journal serve separate purposes; cached weights do not imply that reflections are embedded or used for training.

### Backup contract

The downloadable JSON envelope is `{ app: "Outward", version: 1, exportedAt, entries }`. `exportedAt` must be a canonical ISO date string. A backup is read locally, never uploaded by the app. Restore uses two separate steps: parse/validate the whole file, then validate and merge again at confirmation before persisting.

`parseJournalBackup` rejects malformed JSON, an unsupported envelope or version, unknown fields, invalid entries, overlong fields, invalid dates/numbers, more than 100 incoming records, or more than 2 MiB (2,097,152 bytes). Both raw character length and UTF-8 byte size are checked. Notes are limited to 2,000 characters. No valid subset of a failed import is saved.

`mergeJournalEntries` reconstructs validated entries without spreading arbitrary input, preserves current notes, deduplicates identical entries with the same ID, and sorts newest first. A different entry with the same ID is an error, including conflicting duplicates within one backup. A merge exceeding 100 distinct notes is rejected rather than truncated. Storage must succeed before the UI adopts the merged journal.

The existing local journal reader is deliberately more permissive than backup import: it recovers recognizable valid entries, deduplicates IDs, and caps the recovered view at 100 without rewriting the original record. This best-effort recovery is not a guarantee that every malformed local entry can be restored.

### Capacity and deletion

Saving a 101st new field note stops with a capacity message instead of silently removing the oldest note. The user can export and intentionally remove a note to make room, or finish without saving.

Deletion has a review dialog with an export-first option. A successful deletion saves the smaller journal and adds the deleted entry to an in-memory **Undo** stack. Repeated deletions can be restored one at a time, newest deletion first. The stack survives in-app view changes while the page stays mounted, but not a reload or page close. Restoring uses the same lossless merge/capacity rules and can fail if the journal has filled again; no other entry is silently removed to make room. Exported backups are the recovery route after session-only undo is lost.

At capacity, the reflection flow offers a review of the oldest note for deliberate deletion while retaining the current unsaved reflection. A capacity error is not a successful journal save.

### Storage consequences

Browser local storage is origin-specific, shared within the same browser profile, and unencrypted. Backup import/export enables manual transfers; there is no automatic cross-device synchronization.

- Different devices, profiles, ports, or hostnames may have separate records
- Clearing site data can remove outings, journals, and cached assets
- Private browsing or disabled storage may prevent persistence
- A storage quota error is not treated as a successful save
- Saved JSON is validated before it is trusted after a reload
- Exported JSON is a portable copy, not an encrypted backup
- No account or server can recover records that the browser removes

## Pocket-mode timing

Use an absolute time interval. A JavaScript interval can refresh a visible countdown, but it cannot be the source of truth for elapsed time because browsers suspend background tabs.

On return, calculate the remaining duration from the saved end timestamp and the current clock. The interface can show that the intended duration has elapsed even if no code ran while the screen was locked. It cannot promise an alarm, a push notification, or continued execution during sleep. Changing the system clock can change the result.

An outing can be ended early. Users should not be pressured to wait for a timer if conditions change.

## Offline boundary

Local inference and offline availability are separate properties. Production builds register `public/sw.js`; development mode does not. The build script injects a content-versioned precache list for root HTML, public assets, JavaScript, and fonts; its revision hash includes the worker source, emitted asset names, and public shell content. New workers do not call `skipWaiting`, so an update waits for existing app tabs to close instead of taking over a running trip. Activation removes only outdated Outward shell caches. WASM/module support assets stay opt-in and are cached as same-origin `/assets/` responses after use. It does not intercept arbitrary cross-origin model traffic. Model caching belongs to the model/runtime layer. Redirected responses are not cached as application assets, preventing a redirected login/access response from replacing a runtime asset. Cache-write failures do not turn a successful asset fetch into a failed response. If an offline navigation has no cached shell, it returns an explicit 503 reconnect message.

A browser may cache model files while still needing a connection for the page shell or a runtime asset. Interrupted precaching, browser eviction, or a failed initial AI download can still leave assets missing. Isolated tests cover the worker's safeguards, but no complete offline reload, real-browser service-worker integration, or installable-PWA guarantee is made in this version's documentation. Close and reopen all Outward tabs to activate a waiting update; clearing site data is not a routine update step because it can remove the journal.

To establish an offline claim, test a production build on a fresh profile, finish all downloads, close and reopen the app while offline, and complete the full flow. Repeat after normal browser cache eviction behavior where practical. A successful request in one already-open tab is insufficient evidence.

## Accessibility and outdoor safety

The 0.2.0 CSS increases principal body text to 16px, most control labels to 14px, and supporting metadata to 12px at the default root size. Core action controls have a minimum height of 44px, with primary actions at 50px. These values are implementation details, not a completed accessibility audit. The layout changes to a single planner column at narrower widths and preserves reduced-motion handling.

Maintain clear labels, usable focus order, visible focus, sufficient contrast, and alternatives to motion. Treat automated DOM checks as one source of evidence; actual screen-reader, zoom, touch, contrast, and keyboard review remain necessary.

Doorstep, stay-in-place, and skip-listening settings are options, not a guarantee of universal access. Skip-listening removes catalog activities classified as `listen`; it does not infer a hearing ability or verify every possible sensory need. The app has no live knowledge of local weather, air quality, traffic, terrain, wildlife, neighborhood safety, or personal ability. Users decide whether to proceed, adapt, or skip.

## Verification layers

- **Static and unit checks:** `npm run check` validates TypeScript, runs the configured unit suite, and builds the app
- **Browser flow:** `npm run test:e2e` exercises the configured browser scenarios; inspect the tests to distinguish demo coverage from real AI coverage
- **Actual model:** `npm run test:model` is a separate network-dependent native CPU smoke test; do not substitute a mocked inference result
- **Browser-target runtime:** `npm run test:wasm` runs the actual shipped ONNX Web WASM binary inside Node; it is not a browser-worker integration test
- **Manual browser review:** confirm model loading, local inference, cancellation/timeouts, retry, another-set mode/exclusions, stale-plan handling, listening constraints, pocket restoration, backup/Undo/storage failures, responsive layout, and keyboard/focus behavior
- **Offline review:** required separately before claiming offline reload support

Report which layer ran, on which final code, and what remains unverified. A Node smoke test alone does not establish browser compatibility. Test status is intentionally not invented in this document.

## Licenses

Outward's original application code is MIT-licensed. The model is identified as Apache-2.0 on its model card, and [Transformers.js uses Apache-2.0](https://github.com/huggingface/transformers.js/blob/main/LICENSE). Third-party assets and packages retain their own terms. Changing a model or bundling weights requires checking and retaining the relevant notices.
