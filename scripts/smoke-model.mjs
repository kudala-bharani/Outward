/** Real model inference smoke test. Node 22.18+ supports the imported TS files. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { env } from '@huggingface/transformers';
import { embedTexts, matchWithModel, disposeModel } from '../src/ai/model.ts';
import { cosineSimilarity, MODEL_ID, MODEL_REVISION } from '../src/ai/rank.ts';

env.cacheDir = process.env.OUTWARD_MODEL_CACHE || '/tmp/outward-model-cache';
if (process.env.OUTWARD_DEBUG_DOWNLOADS) {
  const fetch = env.fetch;
  env.fetch = (url, options) => { console.log('Fetching public model file:', String(url)); return fetch(url, options); };
}
await mkdir(env.cacheDir, { recursive: true });
const started = performance.now();
let lastMessage = '';
const progress = ({ message }) => {
  if (lastMessage !== message) { console.log(message); lastMessage = message; }
};

try {
  const vectors = await embedTexts([
    'I want a quiet moment listening to birds in a park.',
    'Listen to birdsong and soft nature sounds outdoors.',
    'I need to debug a database migration and deploy software.',
  ], progress);
  assert.equal(vectors.length, 3);
  assert.equal(vectors[0].length, 384);
  const relatedSimilarity = cosineSimilarity(vectors[0], vectors[1]);
  const unrelatedSimilarity = cosineSimilarity(vectors[0], vectors[2]);
  assert.ok(relatedSimilarity > unrelatedSimilarity + 0.15, 'Semantic relatedness must separate the related and unrelated sentences.');
  const common = { setting: 'park', duration: 20, pace: 'wander' };
  const examples = [];
  for (const mood of [
    'I am exhausted and want to sit quietly without having to do anything.',
    'I am restless and bored. I want to walk, move around and explore.',
    'I want to listen to birds and natural sounds.',
  ]) {
    const plan = await matchWithModel({ ...common, mood }, progress);
    assert.equal(plan.mode, 'ai');
    assert.equal(plan.model, MODEL_ID);
    assert.equal(plan.missions.length, 3);
    examples.push({ mood, selected: plan.missions.map(({ id, title }) => ({ id, title, cosine: plan.similarities[id] })) });
  }
  assert.notDeepEqual(examples[0].selected.map(({ id }) => id), examples[1].selected.map(({ id }) => id), 'Different intentions must change the recommendations.');
  const stationary = await matchWithModel({ ...common, mood: 'I want to run around and wander.', setting: 'doorstep', pace: 'stay' });
  assert.ok(stationary.missions.every((mission) => mission.stationary && mission.settings.includes('doorstep')));
  const report = {
    status: 'passed', verifiedAt: new Date().toISOString(), runtime: `Node ${process.version}, local CPU / ONNX Runtime`,
    transformers: '4.3.0', model: MODEL_ID, revision: MODEL_REVISION, dtype: 'q8', dimensions: 384,
    relatedSimilarity, unrelatedSimilarity, elapsedSeconds: Number(((performance.now() - started) / 1000).toFixed(2)),
    examples, stationaryFilterPassed: true,
    scope: 'Actual pinned model loading (available cache may be reused), local CPU inference, semantic ranking, and hard filters. Fresh download and browser UI/WASM verification are separate.',
    modelCard: `https://huggingface.co/${MODEL_ID}/tree/${MODEL_REVISION}`,
    license: 'Apache-2.0 (declared by upstream model and ONNX distribution)',
  };
  await mkdir(resolve('docs'), { recursive: true });
  await writeFile(resolve('docs/model-verification.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error('Actual model verification failed. No demo fallback was used.');
  console.error(error);
  process.exitCode = 1;
} finally {
  await disposeModel();
}
