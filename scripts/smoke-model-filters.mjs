/** Reproduce the real-model 36-plan upgrade matrix. Requires Node 22.18+. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { env } from '@huggingface/transformers';
import { matchWithModel, disposeModel } from '../src/ai/model.ts';
import { eligibleMissions, MODEL_ID, MODEL_REVISION } from '../src/ai/rank.ts';
import { saveActiveTrip, ACTIVE_KEY } from '../src/storage.ts';

env.cacheDir = process.env.OUTWARD_MODEL_CACHE || '/tmp/outward-model-cache';
await mkdir(env.cacheDir, { recursive: true });
const started = performance.now();
const cases = [];
const moods = [
  '',
  'I want to listen to birds and natural sounds.',
  'Database migrations and quarterly earnings.',
];

function verifyPlan(plan, input, excluded = []) {
  assert.equal(plan.mode, 'ai');
  assert.equal(plan.model, MODEL_ID);
  assert.equal(plan.missions.length, 3);
  assert.equal(new Set(plan.missions.map(({ id }) => id)).size, 3);
  assert.ok(plan.missions.every((mission) =>
    mission.settings.includes(input.setting) &&
    (input.pace !== 'stay' || mission.stationary) &&
    mission.category !== 'listen' && !excluded.includes(mission.id),
  ));
  assert.deepEqual(plan.input, input);
  assert.equal(Object.hasOwn(plan, 'excludeMissionIds'), false);
  assert.equal(Object.hasOwn(plan.input, 'excludeMissionIds'), false);
  // Verify actual persistence too, not only the in-memory plan shape.
  const startedAt = Date.now();
  let persisted;
  assert.equal(saveActiveTrip({
    id: 'synthetic-filter-verification', plan, startedAt,
    endsAt: startedAt + input.duration * 60_000,
  }, { setItem(key, value) { assert.equal(key, ACTIVE_KEY); persisted = JSON.parse(value); } }), true);
  assert.equal(persisted.plan.input.mood, '');
  assert.equal(persisted.plan.query, '');
  assert.equal(persisted.plan.model, null);
  assert.deepEqual(persisted.plan.similarities, {});
  assert.equal(Object.hasOwn(persisted.plan.input, 'excludeMissionIds'), false);
}

try {
  for (const setting of ['neighborhood', 'park', 'doorstep']) {
    for (const pace of ['wander', 'stay']) {
      for (const mood of moods) {
        const input = { setting, pace, mood, duration: 20, excludeListening: true };
        const first = await matchWithModel(input);
        verifyPlan(first, input);
        const firstIds = first.missions.map(({ id }) => id);
        const next = await matchWithModel(input, undefined, { excludeMissionIds: firstIds });
        verifyPlan(next, input, firstIds);
        cases.push({ setting, pace, mood, eligibleCount: eligibleMissions(input).length,
          first: firstIds, next: next.missions.map(({ id }) => id) });
        console.log(`Passed ${setting}/${pace}: ${JSON.stringify(mood)}`);
      }
    }
  }
  assert.equal(cases.length, 18);
  const report = {
    status: 'passed', verifiedAt: new Date().toISOString(),
    command: 'npm run test:model-filters', model: MODEL_ID, revision: MODEL_REVISION,
    runtime: `Node ${process.version}, local CPU / ONNX Runtime`,
    realModelPlansChecked: cases.length * 2,
    excludeListeningPassed: true, noRepeatPassed: true, settingAndPacePassed: true,
    emptyAndUnrelatedInputPassed: true, requestOptionsNotPersistedPassed: true,
    activeTripPrivacyPassed: true,
    elapsedSeconds: Number(((performance.now() - started) / 1000).toFixed(2)),
    scope: 'Pinned real-model inference for every setting/pace pair with listening excluded, blank/related/unrelated notes, and a second non-overlapping set; active-trip persistence is checked with in-memory storage. Cached model files may be reused. This is not browser verification.',
    cases,
  };
  await mkdir(resolve('docs'), { recursive: true });
  await writeFile(resolve('docs/mission-filter-verification.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error('Real-model constraint verification failed. No demo fallback was used.');
  console.error(error);
  process.exitCode = 1;
} finally {
  await disposeModel();
}
