# Verification — October 6, 2026

This record separates implemented behavior, automated evidence, and remaining verification limits. The 0.2.0 upgrade is described in the [changelog](../CHANGELOG.md); the project began on October 5, 2026.

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

## Actual browser walkthrough

The public demo was tested in the supported cloud Chromium browser on October 6, 2026, after public access was enabled. It opened without a ChatGPT login gate. These manual checks are separate from the Node tests above and are **not a passing full Playwright run**.

- Real on-device AI loaded and returned **Wait for a wingbeat**, **Make a sound map**, and **Watch the invisible** for “I want to listen to birds and natural sounds.” with park/wander/20 minutes. The explanation displayed model identity and similarity scores
- **Try another set** returned three different missions. Changing choices disabled the stale plan. Doorstep/stay/skip-listening produced a stationary plan without listening missions
- Pocket mode started, survived reload, and caught up from 10:00 to 09:37. Full mission prompts remained available
- A fictional sample reflection saved successfully. Its JSON export contained one AI-labeled note and no original mood input. Restoring it skipped the existing note without overwriting or duplicating it
- Delete confirmation could be cancelled; confirmed deletion removed the sample; Undo restored it
- Cancelling AI restored the controls and displayed explicit cancellation. A fresh real-AI retry succeeded
- Enter opened an explanation dialog; Escape closed it and restored focus. Explicit sample mode displayed **SAMPLE · NO AI USED**
- Desktop and narrow browser layouts were inspected. At 500 CSS-pixel viewport width the document was 485 pixels wide; at 300% browser zoom the 393-pixel viewport had a 388-pixel document. Neither showed horizontal overflow. This is not a physical-phone test

The inspected console entries were browser-extension metadata warnings; no app-origin error was observed in that inspection. This is not exhaustive error monitoring.

Machine-readable scope: [browser-verification.json](browser-verification.json). Genuine captures: [AI plan](screenshots/outward-ai-field-trip.jpg), [pocket mode](screenshots/outward-pocket-mode.jpg), and [narrow layout](screenshots/outward-responsive-field-trip.jpg). The sample journal text is explicitly fictional; no outdoor trip was performed.

A singular/plural label found during this walkthrough was corrected: a one-minute journal now reads “1 minute.” The corrected source passed the same 179-test/typecheck/build command.

## Remaining limits

- The supplied 12-scenario Playwright suite was discovered/compiled, not executed end-to-end
- Production offline reload, cache eviction recovery, installability, and release activation during an open trip have not been manually established
- Browser cancellation/retry passed; forced network-failure and 90-second timeout recovery are covered by automated lifecycle tests but were not manually induced in Chromium
- No physical mobile device, actual outdoor field trial, full screen-reader review, or comprehensive accessibility/contrast audit was performed
- Concurrent journal edits in separate tabs can overwrite changes; use one editing tab and keep important backups
- No measured health, attention, fitness, or screen-time benefit is claimed

## Publication and provenance

- Public demo: https://outward-field-guide.bharani1808.chatgpt.site
- Public code: https://github.com/kudala-bharani/Outward
- The initial public source commit is `7caebb37ca815309bd01194f28d17df85dd0add6`. All 58 initial exported files matched remote Git blobs; the starter README commit was preserved
- The original project history starts with `3097a0b28e9b3ad174dff4fd74e174874b91476a` at October 5, 2026, 20:16:29 UTC. Development began earlier that evening after the challenge opened. Commit time alone is not proof of development start
- GitHub had no Actions workflows, runs, check runs, or status contexts at the initial publication check. Local passes are not a GitHub CI pass
- The source/privacy/license review is documented in [security-review.md](security-review.md); a source scan is not a penetration test or security certification
- DEV article and contest entry remain subject to the entrant's review and approval; publishing source and a demo is not contest submission
