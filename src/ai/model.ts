import { AutoModel, AutoTokenizer, env, FeatureExtractionPipeline, type ProgressCallback as DownloadProgressCallback } from '@huggingface/transformers';
import { missions } from '../data/missions.ts';
import type { MissionSelectionOptions, ModelProgress, PlanInput } from '../types.ts';
import { buildQuery, createSemanticPlan, missionText, MODEL_ID, MODEL_REVISION, validateInput, validateSelectionOptions } from './rank.ts';

type ProgressCallback = (progress: ModelProgress) => void;
let extractor: FeatureExtractionPipeline | undefined;
let modelPromise: Promise<FeatureExtractionPipeline> | undefined;
let catalogEmbeddings: Record<string, number[]> | undefined;

// All inference is local. Only public model/runtime files are fetched remotely.
env.allowLocalModels = false;
// This dedicated worker loads one fixed model. Pin metadata probes too: v4's
// tokenizer registry does not forward the revision to its existence check.
env.remotePathTemplate = `{model}/resolve/${MODEL_REVISION}/`;
if (env.backends.onnx.wasm) {
  // No cross-origin-isolation requirement, and no nested proxy worker.
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.proxy = false;
}

async function getExtractor(onProgress: ProgressCallback): Promise<FeatureExtractionPipeline> {
  if (extractor) return extractor;
  if (!modelPromise) {
    onProgress({ stage: 'loading', message: 'Loading the local AI model. First use downloads about 23 MB of model weights.' });
    modelPromise = (async () => {
      const progress_callback: DownloadProgressCallback = (event) => {
          if (event.status === 'progress' && event.file.endsWith('.onnx')) {
            const percent = Number.isFinite(event.progress) ? Math.max(0, Math.min(100, Math.round(event.progress))) : undefined;
            onProgress({ stage: 'loading', message: 'Downloading the local model. Your note stays on this device.', progress: percent });
          }
          if (event.status === 'done' && event.file.endsWith('.onnx')) {
            onProgress({ stage: 'loading', message: 'Model weights loaded. Preparing the tokenizer and local runtime.' });
          }
      };
      // Construct the same standard pipeline directly. Transformers.js v4's
      // pipeline() first probes unpinned `main` metadata; direct loading keeps
      // model loading focused on the files this fixed encoder actually needs.
      const options = { revision: MODEL_REVISION, progress_callback };
      const [tokenizer, model] = await Promise.all([
        AutoTokenizer.from_pretrained(MODEL_ID, options),
        AutoModel.from_pretrained(MODEL_ID, {
          ...options, dtype: 'q8', device: typeof self === 'undefined' ? 'cpu' : 'wasm',
        }),
      ]);
      extractor = new FeatureExtractionPipeline({ task: 'feature-extraction', tokenizer, model });
      return extractor;
    })().catch((error: unknown) => { modelPromise = undefined; throw error; });
  }
  return modelPromise;
}

/** Real mean-pooled, L2-normalized 384-dimensional MiniLM vectors. */
export async function embedTexts(texts: string[], onProgress: ProgressCallback = () => {}): Promise<number[][]> {
  const model = await getExtractor(onProgress);
  const output = await model(texts, { pooling: 'mean', normalize: true });
  const vectors = output.tolist() as number[][];
  if (vectors.length !== texts.length || vectors.some((vector) => vector.length !== 384 || vector.some((value) => !Number.isFinite(value)))) {
    throw new Error('The local model returned unexpected output. Please retry.');
  }
  return vectors;
}

export async function matchWithModel(input: PlanInput, onProgress: ProgressCallback = () => {}, options: MissionSelectionOptions = {}) {
  const valid = validateInput(input);
  const selection = validateSelectionOptions(options);
  await getExtractor(onProgress);
  if (!catalogEmbeddings) {
    onProgress({ stage: 'embedding', message: `Reading the ${missions.length} reviewed outdoor missions.` });
    const vectors = await embedTexts(missions.map(missionText), onProgress);
    catalogEmbeddings = Object.fromEntries(missions.map((mission, index) => [mission.id, vectors[index]]));
  }
  onProgress({ stage: 'embedding', message: 'Matching the meaning of your note, on this device.' });
  const [query] = await embedTexts([buildQuery(valid)], onProgress);
  onProgress({ stage: 'ranking', message: 'Choosing three fitting missions with a little variety.' });
  const plan = createSemanticPlan(valid, query, catalogEmbeddings, selection);
  onProgress({ stage: 'ready', message: 'Your small adventure is ready.', progress: 100 });
  return plan;
}

export async function disposeModel() {
  if (extractor) await extractor.dispose();
  extractor = undefined;
  modelPromise = undefined;
  catalogEmbeddings = undefined;
}
