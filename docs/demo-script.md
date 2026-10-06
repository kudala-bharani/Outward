# Outward demo script

A **two-to-three-minute recording plan**, not a completed recording or outdoor trial. Use a verified build in a disposable browser profile with fictional notes. The recording should show one real AI plan, pocket mode, and the journal. A public app link can satisfy the demo requirement without a video.

## Before pressing record

- Check the final build against [verification.md](verification.md). Run `npm run check`, `npm run test:model`, `npm run test:wasm`, and `npm run test:model-filters`; then actually run the AI flow in the recording browser
- Use one journal-editing tab. Concurrent edits in different tabs can overwrite each other
- The owner-only preview needs permitted access; publication and a signed-out public URL remain separate checks
- Hide account details, notifications, and private notes. Use a readable viewport
- If the model is already cached, say so. Otherwise show loading honestly; label any cut or speed-up
- Do not record a sample-mode result as AI. If real inference fails, resolve the error or clearly label fallback footage **SAMPLE · NO AI USED**; it cannot serve as evidence of browser AI

## 0:00–0:20 Introduce the loop

Show the opening planner.

Suggested narration: “Outward matches a short description of what you feel like doing to three small outdoor missions. Choose a setting and a little time, read the plan, then put your phone away.”

## 0:20–1:10 Run the actual model

1. In **What could you use right now?**, enter: “I want to listen to birds and natural sounds.” Say this is sample input
2. Choose **20 min**, **Park or green space**, and **A gentle wander**. Leave **Skip listening activities** unchecked for this example
3. Click **Find my field trip**. Keep the real loading and initialization stages visible, or disclose the cached model/time cut
4. Show the resulting **MATCHED ON YOUR DEVICE** label and read one returned instruction

Suggested narration: “MiniLM compares this text with 22 fixed missions in a browser worker. It ranks existing instructions; it does not generate directions. First use downloads the model and runtime.”

The Node-hosted WASM evidence returned **Wait for a wingbeat**, **Make a sound map**, and **Watch the invisible** for these settings. Show whatever the real browser returns; this reference is not permission to stage those results.

If time permits, click **Try another set**. Show the new missions and the unchanged AI label. The current three are excluded; earlier sets can return later.

## 1:10–1:45 Put the phone away

5. Click **Take this outside**. Show **POCKET MODE**, the timer, and three title reminders
6. Click **Remember my three invitations** to reveal the full instructions, then **Hide my three invitations**
7. Briefly lock/leave the screen only if recording on a device that supports it; otherwise stay in the app. Do not imply an outing happened

Suggested narration: “The timer uses start and end timestamps, so it catches up when the tab wakes. There is no background alarm. Choose a familiar, safe place and stop whenever you need to.”

If showing elapsed time, use the real interval and label any time jump.

## 1:45–2:25 Save a fictional note

8. Click **I'm back**
9. Select **About the same** and enter: “Demo note only: this is a sample record, not an outdoor observation.”
10. Click **Save my field note** and show the entry in **Field notes** with its **Locally AI-matched** label
11. Click **Export notes** if you want to show the manual backup. Keep the downloaded file private unless separately approved for sharing

Suggested narration: “This note stays in browser storage and is never sent to the model. Export and restore provide a manual backup. Storage and exported files are unencrypted.”

Avoid presenting the journal's sample trip count or recorded minutes as genuine outdoor usage.

## 2:25–2:45 Show the source

Show the verified public repository and the catalog or matching file. If the source is not public yet, show it locally and describe it accurately; do not invent a URL.

Suggested narration: “The app's original code is MIT-licensed. The open model and Transformers.js use Apache-2.0. You can inspect the catalog and ranking, run the tests, and adapt the project.”

End with the actual public app/repository links after their release and access are verified.

## Review before sharing

- Real AI footage is genuine; model caching, edits, and time jumps are disclosed
- The exact build, public links, and article agree
- No personal outing, health benefit, offline guarantee, or browser pass is inferred from staged sample data or Node tests
- Sample notes cannot be mistaken for real observations
- No private information is visible; any screenshots or video come from an actual capture
- Sharing the final recording requires the owner's approval of its destination and content
