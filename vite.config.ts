import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], resolve:{alias:{'onnxruntime-web/webgpu':'onnxruntime-web/wasm'}}, worker:{format:'es'}, server: {host:'0.0.0.0',port:4173}, test: {include:['tests/**/*.test.ts']}, build: {target:'es2022'} });
