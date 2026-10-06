# Changelog

## 0.2.0 — 2026-10-06

This upgrade keeps Outward's three-mission, local-model flow and improves control over plans, saved data, and recovery. The project still began on October 5, 2026; this release does not change that history or publish a contest entry.

### Privacy and field notes

- **Before:** active trips persisted the original mood/query and matching details. **Now:** writes blank mood/query, clear the model name and scores, and retain the missions and timing needed to restore the outing. Valid legacy trips are sanitized on read and rewritten when storage permits
- **Before:** notes could be exported but not restored. **Now:** a confirmation-based local restore accepts Outward version 1 JSON backups, validates the entire file, and merges without silently overwriting existing notes
- Restore is bounded to 2 MiB and 100 incoming entries, with a 2,000-character reflection limit. Identical entries with the same ID are deduplicated; conflicting copies, malformed fields, and over-capacity merges are rejected
- **Before:** saving beyond 100 notes removed older entries. **Now:** saving stops with a capacity message. The reflection remains available while the user reviews the oldest note and decides whether to remove it
- Added confirmed deletion with an export-first option and a session-only Undo stack. Repeated deletions can be undone newest-first while the page stays open. Reloading or closing the page loses that history; restoring must still fit within the journal limit

### Planning and model behavior

- Added **Skip listening activities**, a hard exclusion of missions in the catalog's listening category, respected by both matchers
- Added **Try another set**, which excludes the three currently displayed missions and uses the same AI or demo mode. AI plans are ranked by the model again; there is no silent fallback or reshuffle posing as inference
- Changing mood, setting, duration, pace, or the listening preference marks a plan stale. Starting and another-set actions wait for a new match
- Bounded each AI request to 90 seconds by default, including download and inference. Cancellation, deadline expiry, and worker failures terminate/reset the worker and clear pending request cleanup
- Ignore late events from terminated workers and completed/cancelled requests, protecting fresh retries from stale results
- Separate weight-download percentage from tokenizer/runtime preparation, embedding, and ranking; 100% downloaded weights no longer imply the plan is ready

### Readability and recovery

- Increased principal reading text to 16px, most labels to 14px, and supporting metadata to 12px at the default root size; enlarged core touch targets and strengthened supporting-text colors
- Improved narrow-screen layout, navigation state/focus handling, and reduced-motion coverage
- Keep the three mission titles visible in pocket mode, with full instructions available to expand
- Service-worker updates wait for existing app tabs to close rather than forcibly activating mid-trip. The app-shell revision includes worker and public-asset changes
- Redirected access/login responses are not cached as runtime assets; cache-write failures do not discard a successful network asset response. Missing offline shell data returns a clear reconnect message

### Verification and limits

- Reran real pinned q8 MiniLM inference using native CPU and the browser-target ONNX Web WASM binary inside Node
- Added real-model constraint evidence across 36 plans: every setting/pace combination with listening excluded, blank/listening/unrelated inputs, and a second non-overlapping set
- Passed strict TypeScript, 179 Vitest tests (108 storage, 54 AI/lifecycle, 11 DOM, and 6 isolated service-worker tests), and the production build. Playwright discovered 12 desktop/mobile scenarios without an execution pass. See the [dated verification record](docs/verification.md) for scopes and blockers
- Updated the README, architecture, demo plan, and submission outline to match implemented behavior

These results do not establish browser integration, responsive screenshots, complete offline reload, screen-reader compatibility, or an outdoor field trial. The private preview remains owner-only. No public repository, video, or DEV submission is created by this release.

### Upgrade notes

- Existing version 1 journal exports remain supported; there is no automatic cloud synchronization
- Valid earlier active-trip records are scrubbed on read when storage allows. Failed rewrites or invalid legacy records can remain in browser storage; this is not a secure-erasure guarantee
- Close and reopen all Outward tabs to allow a waiting app update to activate. Do not clear site data merely to refresh the app: doing so can remove your notes and cached model
- Export a backup before deliberately removing notes. Both local storage and backup files remain unencrypted

## 0.1.0 — 2026-10-05

Initial implementation: 22 curated missions, local MiniLM semantic matching, explicit deterministic demo mode, setting/pace/duration choices, an absolute-time pocket timer, a local field-note journal with JSON export, documentation, and an owner-only preview deployment.
