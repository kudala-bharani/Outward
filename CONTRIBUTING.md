# Contributing to Outward

Outward is a small browser app for choosing an outdoor pause. Contributions should make it easier to leave the screen, understand the plan, and decide whether a mission fits.

This copy is currently local. A public repository and its issue tracker have not been created. The workflow below is for local changes and, when a repository is published, reviewable contributions to it.

## Get started

1. Install a current Node.js release compatible with this project's Vite version.
2. Run `npm install`, then `npm run dev`.
3. Read the [architecture notes](docs/architecture.md) and the [privacy and limitations](README.md#privacy-and-storage).
4. Keep a change focused. Explain the behavior before and after, and include the checks you actually ran.

## Useful contributions

- Mission wording that works in a wider range of safe, familiar settings
- Better keyboard, screen-reader, zoom, and low-motion behavior
- More reliable interrupted model loads and clear errors
- Tests for local storage failure, corrupt saved state, and timer restoration
- Carefully evaluated language support
- Smaller downloads or faster local matching, with measured evidence

## Mission-writing checklist

- Keep directions short and concrete, with an easy stopping point
- Make it possible to skip a task without failure language or guilt
- Prefer observation to collecting, photographing, identifying, touching, or eating things
- Never suggest entering private property, approaching strangers or wildlife, crossing unsafe areas, or going somewhere unfamiliar or isolated
- Do not require a particular physical ability, possession, safe neighborhood, or access to a park without an honest constraint or alternative
- Offer stay-in-place options where the mission meaningfully allows them
- Do not claim a mission treats a condition, guarantees a feeling, or meets someone's fitness or accessibility needs
- Avoid instructions that require looking at the phone while moving

A curated catalog reduces some risks; it cannot establish that an outdoor setting is safe. Changes should preserve the user's ability to judge and adapt the plan.

## Keep AI and demo behavior distinct

The AI path uses the open model to rank curated missions. Demo mode uses deterministic matching and must remain explicitly labeled and user-selected.

- Never hide an AI failure behind a demo result
- Do not invent confidence, medical interpretation, or model-generated explanations
- Preserve setting and pace constraints regardless of semantic score
- Treat user text as data, not instructions to alter the app's behavior
- Keep journal reflections outside model inputs
- Do not add external inference, analytics, account creation, GPS, or new third-party data transmission without an explicit product and privacy review

## Check a change

```sh
npm run check
npm run test:e2e
npm run test:model
```

The final command downloads and runs the real model; it may require network access and additional time. If a check cannot run, record the exact blocker rather than reporting a pass. Keep model-cache files, browser profiles, test downloads, real reflections, credentials, and generated dependency folders out of commits.

For user-facing changes, also check:

- A narrow mobile viewport and a desktop viewport
- Keyboard-only controls and visible focus
- Zoom and reduced-motion preferences
- Empty and long input, repeated clicks, and changing a choice while matching
- Network failure and a retry, without silently entering demo mode
- A sleeping or backgrounded tab, a reload during pocket mode, and ending an outing early
- Storage unavailable or full; exporting only the user's intended local records

These are review criteria, not a claim that all checks already pass.

## Describe the evidence

When proposing a change, include:

1. What changed and why
2. Screenshots or a short recording for visual changes, using sample text rather than private records
3. Commands run and their actual results
4. Browser/device coverage and remaining limitations
5. Any dependency, asset, model, or license changes

Do not publish a demo or journal export containing someone else's personal text. Remove sensitive details from bug reports and reproduction files.

## Licensing

Original contributions are intended to be included under the project's [MIT License](LICENSE). Only contribute material you have the right to share. Keep third-party attribution and license notices intact; model and dependency licenses remain separate from the app's license.
