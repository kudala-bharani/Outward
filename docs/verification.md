# Verification — October 6, 2026

This record separates implemented behavior, automated evidence, and work that still needs a real browser. The 0.2.0 upgrade is described in the [changelog](../CHANGELOG.md); the project began on October 5, 2026.

## Automated checks

`npm run check` passed on the final upgrade source: strict TypeScript compilation, **179 Vitest tests** (108 storage, 54 ranking/AI lifecycle, 11 React DOM, and 6 isolated service-worker tests), and the production Vite build.

`playwright test --list` compiled and discovered **12 scenarios** across the desktop and mobile projects, including another-set/stale-plan and backup/delete/Undo coverage. Listing tests is not executing them; no browser end-to-end pass is claimed.

The suite covers these layers:

- **Storage:** privacy-safe active-trip writes, valid legacy migration, invalid/corrupt/quota-denied storage, whole-file backup validation, byte/entry/field limits, duplicate/conflict handling, lossless merging, and absolute time calculations
- **Ranking and worker contracts:** catalog constraints, skip-listening, non-overlapping another sets in AI/demo modes, invalid vectors/inputs, no silent demo fallback, 90-second total timeout, cancellation, worker errors, clean retries, and ignored late events
- **React DOM:** planner and journal interaction, changed-input stale plans, mode-preserving another sets, trip restoration, reflection saving, backup confirmation/deduplication/rejection, deletion/Undo, capacity recovery, and modal interactions
- **Isolated service-worker runtime:** waiting activation, scoped cache cleanup, external-download exclusion, missing-shell offline response, redirect-cache protection, and quota-failed asset cache writes

These are Node/Vitest and simulated DOM or worker checks. The production build includes the dedicated model-worker bundle, local WASM/module assets, and generated content-versioned app-shell precache. A build and simulated worker test do not show that a real browser successfully fetched or executed those assets.

## Real model evidence

All runs below use `Xenova/all-MiniLM-L6-v2`, pinned revision `751bff37182d3f1213fa05d7196b954e230abad9`, with q8 weights. They ran on October 6, 2026.

- **Native CPU:** `npm run test:model` passed actual download/local ONNX Runtime inference, 384-dimensional embeddings, related/unrelated semantic distinction, intent-sensitive mission ranking, and stationary filtering. See [native evidence](model-verification.json)
- **Browser-target WASM inside Node:** `npm run test:wasm` passed with the actual standard `ort-wasm-simd-threaded.wasm` binary shipped by the build: 14,264,838 bytes, one thread, proxy disabled. It tested mean pooling, L2 normalization, 384 dimensions, related/unrelated distinction, three intent examples, and stationary constraints. See [WASM evidence](wasm-verification.json)
- **Upgrade constraints with the real model:** 36 plans passed across all six setting/pace combinations, with listening excluded and blank, listening-related, and unrelated input. Each case produced a second set that excluded all three preceding missions, retained setting/pace constraints, and kept request-only exclusions out of plan input. See [mission-filter evidence](mission-filter-verification.json)

The WASM weights were 22,972,370 bytes; runtime, tokenizer, configuration, and application assets are additional. This is not a total-download figure. The evidence JSON distinguishes each runtime and exact scope. Native CPU and WASM outputs can differ slightly; neither result is a browser integration pass.

## Blocked or not established

- Real browser rendering, responsive screenshots, the complete browser worker/asset-loading path, interactive browser accessibility testing, and offline reload remain unverified
- The local browser route previously failed because the isolated browser could not create its required socket; the supported cloud browser blocks localhost. No successful replacement local-browser run is claimed
- The owner-only deployed Site was rechecked on October 6 in the supported cloud browser and still displayed **“Log in to access”**. No ChatGPT sign-in or access-policy change was performed. This confirms the visible access barrier, not application rendering
- Playwright coverage is supplied for desktop and mobile, but there is no passing end-to-end browser result or new screenshot evidence
- No real-world outdoor field test has been performed for the user
- No full screen-reader, touch-device, zoom, or contrast audit has been established

## Browser acceptance checks still required

Use a browser with permitted access to the app and a disposable profile/sample journal. Before a public demo:

1. Run the documented Playwright suite; inspect console errors and the actual AI worker/asset requests
2. Test fresh model download, cached matching, cancel/retry, and timeout recovery. Confirm weight-download completion is distinct from full readiness
3. Try another set in real AI and demo modes, verify all three current missions are excluded, and check every changed input disables a stale plan. Confirm skip-listening works across settings and movement choices
4. Start a trip, reload and resume, inspect sanitized active storage, expand instructions, and save a sample reflection
5. Restore an export, repeat it without duplicates, reject malformed/conflicting/over-capacity files without changes, and test deletion plus repeated Undo. Verify capacity recovery retains the unsaved reflection
6. Review keyboard focus, dialogs, announcements, zoom, narrow layouts, and actual touch targets
7. Test a production offline reload separately after complete asset/model caching. A warm tab or successful Node WASM run is insufficient
8. Test release updating with an open trip. The new worker intentionally waits for existing app tabs to close; close and reopen all Outward tabs to activate it. Do not clear site data as a routine update step

Record genuine outdoor experience separately. Do not invent an outing or infer one from test output.

## Private deployment

Owner-only preview: https://outward-field-guide.bharani1808.chatgpt.site

The initial deployment was confirmed on October 5, 2026, and its access policy contained only the owner. This upgrade uses the same private review URL and preserves the owner-only audience. Deployment confirmation is separate from the test results above and is reported with the delivered release. This remains a private review link, not a public contest demo. No public repository or DEV post has been published.
