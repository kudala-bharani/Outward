# Third-party notices

The application is MIT-licensed. Dependencies and fonts keep their own licenses. The following notices accompany the prebuilt browser app.

- react 19.3.0: MIT ([notice](public/licenses/react-LICENSE.txt))
- react-dom 19.3.0: MIT ([notice](public/licenses/react-dom-LICENSE.txt))
- scheduler 0.28.0: MIT ([notice](public/licenses/scheduler-LICENSE.txt))
- lucide-react 0.577.0: ISC ([notice](public/licenses/lucide-react-LICENSE.txt))
- @huggingface/transformers 4.3.0: Apache-2.0 ([notice](public/licenses/huggingface__transformers-LICENSE.txt))
- @huggingface/jinja 0.5.10: MIT ([notice](public/licenses/huggingface__jinja-LICENSE.txt))
- onnxruntime-web 1.31.0-dev.20260914-8d85527a0 and its bundled onnxruntime-common: MIT ([license](public/licenses/onnxruntime-LICENSE.txt), [upstream third-party notices](public/licenses/onnxruntime-ThirdPartyNotices.txt))
- @huggingface/tokenizers 0.2.0: Apache-2.0 ([notice](public/licenses/huggingface__tokenizers-LICENSE.txt))
- @fontsource/dm-sans 5.3.0: OFL-1.1 ([notice](public/licenses/fontsource__dm-sans-LICENSE.txt))
- @fontsource/instrument-serif 5.3.0: OFL-1.1 ([notice](public/licenses/fontsource__instrument-serif-LICENSE.txt))
- protobufjs 7.6.6: BSD-3-Clause ([notice](public/licenses/protobufjs-LICENSE.txt))
- flatbuffers 25.9.23: Apache-2.0 ([notice](public/licenses/flatbuffers-LICENSE.txt))
- long 5.3.2: Apache-2.0 ([notice](public/licenses/long-LICENSE.txt))
- platform 1.3.6: MIT ([notice](public/licenses/platform-LICENSE.txt))

Model weights are not bundled. Xenova/all-MiniLM-L6-v2 and its upstream model declare Apache-2.0. Model sources and pinned revision are documented in README.md.

## ONNX Runtime provenance

The browser build ships ONNX Runtime Web's standard CPU/WASM runtime and its JavaScript loader, unmodified apart from bundling. The ONNX license and complete upstream third-party notice file were copied from the runtime's pinned upstream revision `8d85527a0`:

- [Upstream license](https://github.com/microsoft/onnxruntime/blob/8d85527a0/LICENSE)
- [Upstream third-party notices](https://github.com/microsoft/onnxruntime/blob/8d85527a0/ThirdPartyNotices.txt)
- [Upstream source at this revision](https://github.com/microsoft/onnxruntime/tree/8d85527a0)

The upstream notice file covers multiple ONNX Runtime configurations. Its inclusion does not mean that every listed component is used by this CPU-only browser build. Build-tool and Node-only dependencies remain governed by the licenses supplied with their npm packages; they are not redistributed in the static app bundle. Model weights remain on their provider and are not part of the source or static bundle.

The production build copies this notice index, the application's MIT license, and `public/licenses/` into `dist/`, so the notices accompany the standalone static release.
