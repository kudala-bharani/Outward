# Source security and release review

Reviewed on October 6, 2026, starting from commit `94198d8a06e0e190422f4bd60228a38b3d78f9f4` and including the release-hardening changes described below.

## Result

No critical security issue or credential exposure was found in the reviewed application source and reachable Git history. The identified ONNX Runtime notice omission was repaired. This is a bounded source review, not a penetration test, a guarantee that no vulnerability exists, or a certification of the deployed host.

The source and static bundle passed the checks below. Actual browser worker startup, asset delivery, interactive behavior, and offline reload were not tested in this review. Those are separate acceptance checks in [verification.md](verification.md).

## Scope and method

- Manually inspected `src/App.tsx`, `src/storage.ts`, all `src/ai/` modules, the mission catalog, `src/main.tsx`, the service worker, Vite configuration, model smoke scripts, and build/precache script
- Traced mood input, reflection input, imported backups, model requests, worker messages, local storage, and application-cache behavior
- Compared the privacy, local-inference, demo-fallback, timeout, backup, and offline claims in the README and architecture notes with the implementation
- Read `package.json` and the lockfile, ran the npm registry advisory audit, and inspected the shipped runtime/font notice inventory
- Used Git plumbing to scan all **79 reachable historical blobs (723,523 bytes) across three commits**, and separately scanned the 56 tracked working files at the start of the review
- Repeated the pattern scan over the candidate public-source export, including new untracked release files, while excluding `.git/`, `.openai/`, `node_modules/`, `dist/`, and the private submission draft/checklist (`docs/dev-submission.md` and `docs/submission-checklist.md`)

The local text scanner checked private-key headers, AWS access-key identifiers, GitHub/Slack/OpenAI/Google key formats, JWT-shaped tokens, URLs containing credentials, and quoted secret-like assignments. It also checked historical filenames for environment files, private keys, and credential stores. There were **zero matches requiring remediation**. These are pattern checks with manual source review; no entropy-based scanner or complete proprietary-secret detector was used. Unreachable Git objects, runtime environment variables, browser profiles, model caches, unrelated files, and hosting-account configuration were outside this scan.

The original hosting configuration contains a project identifier, not an authentication credential. The public-source export excludes that deployment-specific file. Model-verification inputs are synthetic examples; no user journal export or personal reflection was included in the reviewed source.

## Privacy and input handling

The inspected application has no endpoint that uploads mood text, journal reflections, backups, or GPS data. The mood is sent to the dedicated local worker and embedded locally. Reflections never enter the matcher. App assets and fonts load from the app origin; the pinned public model, tokenizer, and configuration load from Hugging Face. Those network services still receive normal request metadata. Hosting behavior must be checked separately.

The model identifier and revision are constants. User input is not interpolated into a remote URL. The standard WASM/module assets are served from the app origin, and no remote inference service or silent demo fallback is configured. Matching is bounded by a 90-second default deadline, with cancellation terminating the worker.

React renders imported and entered text as text. No `dangerouslySetInnerHTML`, direct `innerHTML` assignment, or application-level dynamic evaluation was found. Backup parsing enforces the envelope, known fields, limits, valid values, duplicate rules, and capacity before changing state. It reconstructs known object shapes instead of spreading imported JSON into application objects.

Active-trip writes remove the original mood, matching query, model label, and similarity scores. Valid older trips are sanitized on read with a best-effort rewrite. Invalid old records and failed rewrites can leave the original local value behind. Local storage and exported JSON are unencrypted, and the current page can retain entered text in memory. These are documented limitations, not secure-erasure guarantees.

## Dependency and asset checks

`npm audit --json --ignore-scripts` against `https://registry.npmjs.org/` returned **0 known vulnerabilities**: 0 critical, high, moderate, low, or informational findings. Its metadata covered 247 dependencies, including development and optional packages. This is an advisory snapshot, not proof of dependency safety. No automatic dependency update or audit fix was applied.

The lockfile contains package-integrity values. The model revision is pinned; the WASM smoke report records the model and runtime SHA-256 values. Production model loading does not independently verify those smoke-report hashes. This review did not audit the full native/WASM engine implementation or establish the integrity of every upstream build process.

### Repaired notice omission

The static bundle shipped ONNX Runtime Web's JavaScript and WASM but did not include its MIT license or upstream third-party notice file. The repair adds both files under `public/licenses/`, records their provenance in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md), and copies the original app license and notice index into the standalone `dist/` build.

Sources were the runtime's pinned upstream revision:

- [ONNX Runtime license](https://github.com/microsoft/onnxruntime/blob/8d85527a0/LICENSE)
- [ONNX Runtime third-party notices](https://github.com/microsoft/onnxruntime/blob/8d85527a0/ThirdPartyNotices.txt)
- [Corresponding source](https://github.com/microsoft/onnxruntime/tree/8d85527a0)

The complete upstream notice file covers multiple runtime configurations; it is retained without suggesting that every listed component is in this CPU-only browser build. React, scheduler, Lucide, Transformers.js, its tokenizer/Jinja components, the fonts, and existing dependency notices remain included. Node-only packages and build tools are installed from npm rather than redistributed in `dist/`. Model weights are not bundled.

After rebuilding, the two ONNX notice files in `dist/licenses/` matched their source copies byte-for-byte. Their SHA-256 values are:

- `onnxruntime-LICENSE.txt`: `2f07c72751aed99790b8a4869cf2311df85a860b22ded05fa22803587a48922c`
- `onnxruntime-ThirdPartyNotices.txt`: `143764b952fdb1a7c69ce653bfba74a7744d6a8a573bfb73e235fba356c83de3`

## Checks actually executed

- `npm run check`: passed strict TypeScript, all **179 tests**, and the production build after the notice changes
- `npm run test:model`: passed actual pinned native CPU inference; [evidence](model-verification.json)
- `npm run test:wasm`: passed actual browser-target WASM inference inside Node; [evidence](wasm-verification.json)
- `npm run test:model-filters`: passed **36 real-model plans**, covering every setting/pace pair, listening exclusions, blank/related/unrelated input, non-overlapping second sets, request-option exclusion, and sanitized active-trip persistence; [evidence](mission-filter-verification.json)
- `npm audit --json --ignore-scripts`: completed, with zero known advisory findings
- Rebuilt static license/notice files: existence and byte-for-byte copy checks passed

The native and WASM runs used Node `v24.19.0` and could reuse available cached model files. A fresh model download was not forced. The new committed `scripts/smoke-model-filters.mjs` makes the previously recorded 36-plan matrix reproducible through `npm run test:model-filters`. Evidence files are written only after their script's assertions pass; an older report is not evidence that a later failed run passed.

No browser-access workaround, authentication change, public publication, or deployment was performed as part of this review.

## Remaining limitations and release cautions

1. **Concurrent journal editing:** journal mutations use an in-memory snapshot in each tab without cross-tab locking. Two tabs editing the same browser journal can overwrite one another's updates. Use a single editing tab and export important notes before working across tabs. Cross-tab conflict handling is not established by the current tests.
2. **Browser and host verification:** source review does not establish browser worker execution, CSP/CORS behavior, host request logging, installation, or offline reload. Test the actual permitted deployment with synthetic data. Do not describe Node WASM results as browser evidence.
3. **Local data exposure:** a same-origin script, browser extension with access, or person using the same browser profile may read local notes. This app is not designed for secrets or clinical records.
4. **Runtime/update trust:** this review does not prove model-provider availability, upstream package provenance, or future dependency safety. Repeat the advisory scan and notice review when dependencies change.
5. **Final-export review:** publishing should use the explicit public-source export, without private drafts, deployment configuration, dependency folders, caches, recordings containing personal data, or journal backups. Repeat the source scan if new files or content are added after review.

For the wider release status and browser acceptance checklist, see [verification.md](verification.md).
