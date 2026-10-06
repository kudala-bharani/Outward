/**
 * Exercise the exact standard (non-asyncify) browser WASM runtime in Node.
 * This verifies actual inference, not browser integration or asset serving.
 * Run: node scripts/smoke-wasm.mjs (Node 22.18+).
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as ort from 'onnxruntime-web/wasm';
import { BertTokenizer } from '@huggingface/transformers';
import { missions } from '../src/data/missions.ts';
import { cosineSimilarity, createSemanticPlan, missionText, MODEL_ID, MODEL_REVISION } from '../src/ai/rank.ts';

const started = performance.now();
const cache = process.env.OUTWARD_MODEL_CACHE || '/tmp/outward-model-cache';
const pinnedDirectory = join(cache, MODEL_ID, MODEL_REVISION);
const wasmPath = fileURLToPath(import.meta.resolve('onnxruntime-web/ort-wasm-simd-threaded.wasm'));
const factoryPath = fileURLToPath(import.meta.resolve('onnxruntime-web/ort-wasm-simd-threaded.mjs'));

async function pinnedFile(filename) {
  const path = join(pinnedDirectory, filename);
  try { return await readFile(path); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const url = `https://huggingface.co/${MODEL_ID}/resolve/${MODEL_REVISION}/${filename}`;
  console.log(`Downloading pinned public file: ${filename}`);
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`Model download failed: ${response.status} ${filename}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
  return bytes;
}

let session;
try {
  const [tokenizerBytes, tokenizerConfigBytes, modelBytes, wasmBytes, wasmInfo] = await Promise.all([
    pinnedFile('tokenizer.json'), pinnedFile('tokenizer_config.json'), pinnedFile('onnx/model_quantized.onnx'),
    readFile(wasmPath), stat(wasmPath),
  ]);
  assert.ok(wasmInfo.size < 25 * 1024 * 1024, 'The standard WASM binary must fit a 25 MiB static-asset limit.');
  const tokenizer = new BertTokenizer(JSON.parse(tokenizerBytes), JSON.parse(tokenizerConfigBytes));
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = { mjs: pathToFileURL(factoryPath).href, wasm: pathToFileURL(wasmPath).href };
  // Node receives bytes directly instead of fetching a browser-served asset.
  // The bytes are the same standard binary bundled by the application.
  ort.env.wasm.wasmBinary = wasmBytes;
  session = await ort.InferenceSession.create(modelBytes, { executionProviders: ['wasm'] });

  async function embed(texts) {
    const encoded = tokenizer(texts, { padding: true, truncation: true });
    const feeds = Object.fromEntries(session.inputNames.map((name) => {
      const value = encoded[name];
      return [name, new ort.Tensor(value.type, value.data, value.dims)];
    }));
    const result = await session.run(feeds);
    const hidden = result.last_hidden_state ?? result[session.outputNames[0]];
    const [batch, tokens, dimensions] = hidden.dims;
    assert.equal(batch, texts.length);
    assert.equal(dimensions, 384);
    const mask = encoded.attention_mask.data;
    const vectors = [];
    for (let b = 0; b < batch; b += 1) {
      const pooled = new Array(dimensions).fill(0);
      let tokenCount = 0;
      for (let t = 0; t < tokens; t += 1) {
        if (!Number(mask[b * tokens + t])) continue;
        tokenCount += 1;
        const offset = (b * tokens + t) * dimensions;
        for (let d = 0; d < dimensions; d += 1) pooled[d] += hidden.data[offset + d];
      }
      assert.ok(tokenCount > 0);
      for (let d = 0; d < dimensions; d += 1) pooled[d] /= tokenCount;
      const norm = Math.sqrt(pooled.reduce((sum, value) => sum + value * value, 0));
      vectors.push(pooled.map((value) => value / norm));
    }
    for (const value of Object.values(result)) value.dispose();
    for (const value of Object.values(feeds)) value.dispose();
    return vectors;
  }

  const vectors = await embed([
    'I want a quiet moment listening to birds in a park.',
    'Listen to birdsong and soft nature sounds outdoors.',
    'I need to debug a database migration and deploy software.',
  ]);
  const relatedSimilarity = cosineSimilarity(vectors[0], vectors[1]);
  const unrelatedSimilarity = cosineSimilarity(vectors[0], vectors[2]);
  assert.ok(relatedSimilarity > unrelatedSimilarity + 0.15);
  const catalogVectors = await embed(missions.map(missionText));
  const catalog = Object.fromEntries(missions.map((mission, i) => [mission.id, catalogVectors[i]]));
  const moods = [
    'I am exhausted and want to sit quietly without having to do anything.',
    'I am restless and bored. I want to walk, move around and explore.',
    'I want to listen to birds and natural sounds.',
  ];
  // Match production's one-query-at-a-time execution. Dynamic quantization can
  // produce slightly different scores when several queries share one batch.
  const queryVectors = [];
  for (const mood of moods) queryVectors.push((await embed([mood]))[0]);
  const examples = moods.map((mood, i) => {
    const plan = createSemanticPlan({ mood, setting: 'park', pace: 'wander', duration: 20 }, queryVectors[i], catalog);
    return { mood, selected: plan.missions.map(({ id, title }) => ({ id, title, cosine: plan.similarities[id] })) };
  });
  assert.equal(examples[0].selected[0].id, 'soft-focus');
  assert.equal(examples[1].selected[0].id, 'familiar-detour');
  assert.equal(examples[2].selected[0].id, 'bird-pause');
  const stationary = createSemanticPlan({ mood: moods[1], setting: 'doorstep', pace: 'stay', duration: 10 }, queryVectors[1], catalog);
  assert.ok(stationary.missions.every((mission) => mission.stationary && mission.settings.includes('doorstep')));

  const report = {
    status: 'passed', verifiedAt: new Date().toISOString(), runtime: `Node ${process.version} hosting actual ONNX Runtime Web WASM`,
    runtimeVersion: ort.env.versions.web, backend: 'wasm', binary: 'ort-wasm-simd-threaded.wasm',
    binaryBytes: wasmInfo.size, binarySHA256: createHash('sha256').update(wasmBytes).digest('hex'),
    threads: 1, proxy: false, model: MODEL_ID, revision: MODEL_REVISION, dtype: 'q8',
    modelBytes: modelBytes.length, modelSHA256: createHash('sha256').update(modelBytes).digest('hex'),
    dimensions: 384, meanPooling: true, normalized: true, relatedSimilarity, unrelatedSimilarity,
    examples, stationaryFilterPassed: true,
    elapsedSeconds: Number(((performance.now() - started) / 1000).toFixed(2)),
    scope: 'Actual standard browser-target ONNX Web WASM binary ran the pinned q8 model in Node with the pinned BertTokenizer, mean pooling, L2 normalization and production selection algorithm.',
    unverified: 'This is not a browser test. Browser worker startup, bundler aliases, hosted asset paths, cache behavior, CSP, CORS, and interactive UI still need browser verification.',
  };
  await mkdir(resolve('docs'), { recursive: true });
  await writeFile(resolve('docs/wasm-verification.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error('Standard WASM inference verification failed. No native CPU or demo fallback was used.');
  console.error(error);
  process.exitCode = 1;
} finally {
  await session?.release();
}
