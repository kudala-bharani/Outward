# Outward

**A small reason to step outside.**

Outward turns a short description of your mood into three gentle outdoor missions. Pick a setting, a little time, and whether you want to wander or stay in one place. Read the plan, put the phone away, and come back with one thing you noticed.

The matching uses an open sentence-embedding model in your browser. Missions come from a curated catalog; the model chooses relevant ones rather than inventing directions.

This is a new project started on **October 5, 2026**. The source is prepared for release. The verification record distinguishes model tests, browser checks, and publication status; no contest submission is implied by this source release.

## What changed in 0.2.0

- **Less saved input:** active outings keep the missions and timer, but no longer persist your mood text, matching query, model name, or similarity scores
- **More control over a plan:** skip listening activities, ask for three different missions in the same matching mode, and rematch after changing your choices
- **Recoverable field notes:** export and restore a validated JSON backup, confirm deletion, and undo deletions while the page remains open
- **No silent loss at capacity:** the 100-note limit now asks you to make room instead of automatically replacing older notes
- **Clearer feedback:** larger reading text and controls, a 90-second AI request deadline, cancellation with a clean retry, and separate download/initialization messages

See the [changelog](CHANGELOG.md) for the before-and-after details and the [verification record](docs/verification.md) for evidence and remaining limits.

## Source and local setup

Source repository: [kudala-bharani/Outward](https://github.com/kudala-bharani/Outward)

The project repository was created on October 6, 2026. Development began on October 5; original project history is preserved separately from the initial public repository commit.

## Try it locally

Use a current Node.js release compatible with the installed Vite version and npm.

```sh
git clone https://github.com/kudala-bharani/Outward.git
cd Outward
npm ci --ignore-scripts
npm run dev
```

The app binds to localhost by default. `--ignore-scripts` avoids optional native GPU-runtime downloads; browser inference uses the included WASM runtime.

Open the local URL printed by Vite. No account, API key, location permission, or inference server is needed.

1. Describe what you feel like doing. Keep it brief and avoid sensitive details.
2. Choose **neighborhood**, **park**, or **doorstep**; **10**, **20**, or **30 minutes**; and **wander** or **stay**. Optionally select **Skip listening activities**.
3. Use **Find my field trip** for local AI, or deliberately choose **Explore a sample instead** for the clearly labeled demo.
4. Review your three missions. **Try another set** excludes the three currently shown and keeps the same AI or demo mode. If you change any choices, find a new plan before starting.
5. Choose **Take this outside** to start pocket mode. The three mission titles remain visible, with the full instructions available on request.
6. Return when you want and save an optional reflection in **Field notes**. Use **Export notes** to keep a JSON backup and **Restore backup** to bring it back.

Only take on a mission that suits your surroundings and ability. Skip or adapt anything uncomfortable. A doorstep or a familiar place can be enough.

## What the AI actually does

- Runtime: [`@huggingface/transformers`](https://github.com/huggingface/transformers.js), pinned to `4.3.0` in this project
- Model: [`Xenova/all-MiniLM-L6-v2`](https://huggingface.co/Xenova/all-MiniLM-L6-v2), an ONNX version of the [Sentence Transformers model](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
- Task: compare the meaning of a short mood description with a curated mission catalog, then select three suitable missions
- Execution: model inference runs on the device through the browser; this is semantic matching, not a conversational or generative AI service
- Journal: reflections are never passed to the model, used for training, or uploaded by the app

The first AI use needs an internet connection to fetch public model assets from Hugging Face and the runtime assets. The [quantized model file](https://huggingface.co/Xenova/all-MiniLM-L6-v2/tree/main/onnx) is about **23 MB**; the tokenizer, configuration, and WebAssembly runtime add to that. This is not a 23 MB total-download promise. Loading speed and inference speed depend on the device and network.

**Demo mode is not AI.** It is a deterministic fallback for trying the interaction without the model download. It is selected by the user and labeled in the interface. A download or model error never silently turns an AI result into a demo result. **Try another set** runs the existing plan's matcher again with its current three missions excluded; it does not switch an AI plan to the demo.

A model request has a 90-second deadline covering download and inference. Cancelling or reaching that limit terminates the worker and allows a fresh retry. Completing the model-weight download is only one loading step; initialization and matching still have to finish. A slow first download may need a retry, and caching remains subject to the browser.

### Model limits

The model is English-focused. It can misread slang, mixed languages, vague text, or an unusual situation. Similarity is not an assessment of mood, health, safety, or what someone needs. A relevant-sounding mission can still be a poor fit. The app does not provide medical, mental-health, fitness, accessibility, weather, or navigation advice, and no health benefits have been clinically established for this app.

## Privacy and storage

Outward has no application backend, login, tracking analytics, GPS collection, or route history. Mood matching runs locally. Choosing AI does make network requests to asset providers, which can see ordinary request metadata such as an IP address; local inference does not mean the first visit is network-free.

The journal and active outing state use this browser's local storage. A saved active outing keeps the reviewed missions, setting, pace, duration, matching-mode label, and timestamps. Its original mood text and matching query are blanked, its model name is cleared, and similarity scores are removed before saving. The current page can still hold your input in memory. Valid outings saved by the earlier version are sanitized when read, with a best-effort rewrite of the old record; if that rewrite is blocked, the original stored copy can remain until site data is cleared.

A saved journal entry includes the reflection, selected feeling, mission titles, elapsed minutes, date, and AI/demo label. It does not copy the mood input. Storage is **not encrypted**. Anyone with access to the same browser profile may be able to read it. Browser cleanup, private browsing, storage limits, or a different device can remove or separate your records. There is no cloud backup or automatic cross-device synchronization.

### Back up, restore, and remove field notes

- **Export notes** downloads an unencrypted `outward-field-notes.json` file. Keep and share it carefully
- **Restore backup** reads that file locally and asks for confirmation before saving. It accepts the existing Outward version 1 export format, up to 2 MiB (2,097,152 bytes) and 100 entries, with reflections limited to 2,000 characters
- The entire backup is validated first. Identical copies with the same ID are skipped; different notes with the same ID are rejected. Existing notes are never silently overwritten, and an import that would exceed 100 notes is rejected
- The delete button asks for confirmation and offers an export first. **Undo** restores deleted notes one at a time, newest deletion first, while the page remains open. Reloading or closing the page loses that recovery history; restoration can also be blocked if the journal is back at capacity
- At 100 saved notes, saving a new one stops with an explanation. Export and deliberately remove a note to make room, or finish without saving. Older entries are no longer automatically removed

Use one journal-editing tab at a time: simultaneous edits in separate tabs can overwrite changes. Export important notes before switching between editing tabs.

Import and export offer manual portability between browsers. They do not encrypt a file, synchronize devices, or recover data for which no usable backup exists.

### Pocket mode and connectivity

Pocket mode records an absolute start and end time rather than relying only on a countdown ticking in an open tab. After a tab sleeps, the display catches up from those timestamps when you return. You can lock the screen. The app does not promise background execution, push notifications, an audible alarm, or a wake-up at the end of an outing. Device-clock changes can affect the displayed time.

An already-open plan does not need a new inference request to read it. Production builds register a versioned service worker that precaches the app shell, scripts, and fonts. WASM is cached after AI use; model files use the library’s browser cache. New app releases wait for existing tabs to close instead of forcing an update during a trip; close and reopen all Outward tabs to activate a waiting update. Avoid clearing site data just to update, because that can remove your notes. A model cached by the browser may also be reusable, but caches can be evicted. **Offline reload and installation are not guaranteed.** Having model weights cached does not prove that the app shell or runtime can load without a connection; development mode does not register the service worker.

## Development and verification

```sh
npm run check       # TypeScript, unit tests, and production build
npm run test:e2e    # Browser interaction tests
npm run test:model  # Real-model native CPU smoke; network/model assets required
npm run test:wasm   # Real browser-target WASM inference inside Node
npm run test:model-filters # Reproduce the 36-plan constraint matrix
```

If Playwright reports a missing browser executable, install its Chromium browser with `npx playwright install chromium` and rerun the browser tests.

Run each command against the final working tree before a demo or release. A passing deterministic test is not proof that the real model runs, and a Node model smoke test is not proof of browser inference. Real-model download, browser inference, and the complete offline experience must be verified separately. Actual native CPU inference and browser-target WASM inference inside Node both passed again on October 6, 2026. The WASM check uses the exact 14,264,838-byte standard runtime shipped by the browser build. The real-model upgrade check also passed 36 plans covering listening exclusions and non-overlapping second sets across all settings and paces. See [native evidence](docs/model-verification.json), [WASM evidence](docs/wasm-verification.json), [constraint evidence](docs/mission-filter-verification.json), and [verification status](docs/verification.md). Browser rendering and the browser worker remain unverified because the local build environment blocks browser access and the private hosted preview requires a ChatGPT sign-in that was not performed by the builder.

## Design choices

- Three short missions keep the result easy to read before putting the phone away
- Curated instructions keep the model from generating unsafe or unreviewed outdoor tasks
- Setting, pace, time, and the optional listening exclusion are explicit choices rather than assumptions inferred from location or ability
- Stay-in-place, doorstep, and skip-listening options offer alternatives, without claiming every environment or mission is accessible
- Reading text is generally 16px, control labels 14px, and supporting metadata 12px; core action controls are at least 44px high
- The journal captures a small observation, not a score, streak, or diagnosis

Accessibility is part of the review process: keyboard use, focus visibility, zoom, small screens, reduced motion, and assistive-technology behavior should be checked. Automated tests alone do not establish accessibility compliance, and broad screen-reader and device coverage has not been certified.

## Documentation

- [Changelog and upgrade notes](CHANGELOG.md)
- [Architecture and data boundaries](docs/architecture.md)
- [Source security and license review](docs/security-review.md)
- [Contributing](CONTRIBUTING.md)
- [Honest demo recording plan](docs/demo-script.md)

## Prebuilt bundle

The downloadable package also contains `dist/`. To try it without installing npm dependencies, use Python 3:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Then open `http://127.0.0.1:4173` in a current browser. Do not open `dist/index.html` directly from the filesystem; workers need HTTP. The first AI use still downloads the model.

## License and acknowledgments

Original application code and documentation are available under the [MIT License](LICENSE), copyright 2026 Outward contributors. Third-party code, fonts, and model assets retain their own licenses; the app's MIT license does not relicense them.

The [model card](https://huggingface.co/Xenova/all-MiniLM-L6-v2) identifies the model as Apache-2.0. [Transformers.js](https://github.com/huggingface/transformers.js/blob/main/LICENSE) is Apache-2.0. See [third-party notices](THIRD_PARTY_NOTICES.md) and the accompanying license files. Model weights are downloaded from their provider rather than committed to this project.
