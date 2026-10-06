/// <reference lib="webworker" />
import { env } from '@huggingface/transformers';
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import wasmModuleUrl from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url';
import { matchWithModel } from './model.ts';
import type { MatchRequest, MatchResponse } from './protocol.ts';

// Use the smaller CPU-only WASM build, served by this app rather than a third-party CDN.
if (env.backends.onnx.wasm) env.backends.onnx.wasm.wasmPaths = { wasm: wasmUrl, mjs: wasmModuleUrl };

const scope = self as unknown as DedicatedWorkerGlobalScope;
let queue = Promise.resolve();

scope.onmessage = (event: MessageEvent<MatchRequest>) => {
  if (event.data.type !== 'match') return;
  const { id, input, options } = event.data;
  const send = (message: MatchResponse) => scope.postMessage(message);
  queue = queue.then(async () => {
    try {
      const plan = await matchWithModel(input, (progress) => send({ type: 'progress', id, progress }), options);
      send({ type: 'result', id, plan });
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown model error';
      send({ type: 'error', id, message: `The local AI could not run. ${detail} Retry to start a fresh local AI session, or choose the clearly labeled demo.` });
    }
  });
};
