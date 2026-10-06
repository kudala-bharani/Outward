import type { CreatePlanOptions, Plan, PlanInput } from '../types.ts';
import type { MatchRequest, MatchResponse } from './protocol.ts';
import { createDemoPlan, validateInput, validateSelectionOptions } from './rank.ts';

export { MODEL_ID, MODEL_REVISION, MAX_MOOD_LENGTH } from './rank.ts';
export type { CreatePlanOptions, ModelProgress, Plan, PlanInput } from '../types.ts';

export const MODEL_REQUEST_TIMEOUT_MS = 90_000;

interface Pending {
  resolve: (plan: Plan) => void;
  reject: (error: Error) => void;
  onProgress?: CreatePlanOptions['onProgress'];
  cleanup: () => void;
}

let worker: Worker | undefined;
let nextId = 0;
const pending = new Map<number, Pending>();

function stopWorker(error: Error, expectedWorker = worker) {
  // A queued event from a terminated worker must never reset its replacement.
  if (!expectedWorker || worker !== expectedWorker) return;
  worker = undefined;
  const tasks = [...pending.values()];
  pending.clear();
  expectedWorker.onmessage = null;
  expectedWorker.onerror = null;
  expectedWorker.onmessageerror = null;
  expectedWorker.terminate();
  for (const task of tasks) { task.cleanup(); task.reject(error); }
}

function getWorker(): Worker {
  if (!worker) {
    const currentWorker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker = currentWorker;
    currentWorker.onmessage = (event: MessageEvent<MatchResponse>) => {
      if (worker !== currentWorker) return;
      const message = event.data;
      const task = pending.get(message.id);
      if (!task) return;
      if (message.type === 'progress') { task.onProgress?.(message.progress); return; }
      if (message.type === 'error') { stopWorker(new Error(message.message), currentWorker); return; }
      pending.delete(message.id);
      task.cleanup();
      task.resolve(message.plan);
    };
    currentWorker.onerror = () => stopWorker(new Error('The local AI worker stopped. Its session has been reset; retry or choose demo mode.'), currentWorker);
    currentWorker.onmessageerror = () => stopWorker(new Error('The local AI returned an unreadable result. Its session has been reset; please retry.'), currentWorker);
  }
  return worker;
}

/** AI is the default. Demo is an explicit choice and never a silent fallback. */
export async function createPlan(input: PlanInput, options: CreatePlanOptions = {}): Promise<Plan> {
  const valid = validateInput(input);
  const selection = validateSelectionOptions(options);
  if (options.signal?.aborted) throw new DOMException('Matching cancelled.', 'AbortError');
  if (options.mode === 'demo') return createDemoPlan(valid, selection);
  const timeoutMs = options.timeoutMs ?? MODEL_REQUEST_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 600_000) {
    throw new Error('The local AI timeout must be between 1 millisecond and 10 minutes.');
  }
  if (typeof Worker === 'undefined') throw new Error('This browser cannot run the local AI worker. Please use a modern browser or choose demo mode.');
  let currentWorker: Worker;
  try { currentWorker = getWorker(); }
  catch { throw new Error('The local AI worker could not start. Please retry, or choose the clearly labeled demo.'); }
  const id = ++nextId;
  return new Promise<Plan>((resolve, reject) => {
    const abort = () => stopWorker(new DOMException('Matching cancelled.', 'AbortError'), currentWorker);
    // A deadline covers the whole request, not just pauses between progress
    // events. A stuck download or WASM operation cannot keep it alive forever.
    const timeout = setTimeout(() => stopWorker(new Error(
      'The local AI took too long to load or match. Its session has been reset. Check your connection and retry; you can also choose the clearly labeled demo.',
    ), currentWorker), timeoutMs);
    const cleanup = () => {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', abort);
    };
    pending.set(id, { resolve, reject, onProgress: options.onProgress, cleanup });
    options.signal?.addEventListener('abort', abort, { once: true });
    // Covers an abort triggered while the worker was being constructed.
    if (options.signal?.aborted) { abort(); return; }
    const message: MatchRequest = { type: 'match', id, input: valid, options: selection };
    try { currentWorker.postMessage(message); }
    catch { stopWorker(new Error('The local AI request could not start. Its session has been reset; please retry.'), currentWorker); }
  });
}

/** Termination also interrupts an in-flight WASM operation and model download. */
export function cancelModelLoad() { stopWorker(new DOMException('Matching cancelled.', 'AbortError')); }
export function disposeMatcher() { cancelModelLoad(); }
