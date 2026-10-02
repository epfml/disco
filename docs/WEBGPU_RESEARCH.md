# WebGPU integration research

**Date:** 2 October 2026  
**Related issue:** [#575: look if we can benefit from WebGPU support](https://github.com/epfml/disco/issues/575)

## Conclusion

WebGPU can run DISCO's browser training code with the current TensorFlow.js (TFJS) version. On an AMD Radeon 860M integrated GPU, all six built-in model families completed short browser training and inference runs on both WebGL and WebGPU. In three benchmark runs, warmed WebGPU steps ranged from **1.08 to 3.24 times faster**, depending on the model. The largest gain was GPT nano at the Wikitext task's configured batch and context dimensions.

This supports an **opt-in browser prototype**, followed by numerical and cross-browser compatibility testing. It does not support changing the default backend yet: the pinned WebGPU backend has a reproducible shader correctness bug, GPT greedy inference returned a differently shaped value on WebGPU, TFJS describes training support as incomplete, and an ordinary Chrome launch on the tested Linux machine did not expose a WebGPU adapter. A complete two-client federated round also required a temporary workaround for an existing browser WebSocket constructor error unrelated to WebGPU.

## Current DISCO and TFJS versions

| Component       | Current state                                                                                                                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TFJS            | `@tensorflow/tfjs@4.22.0` and `@tensorflow/tfjs-node@4.22.0` are pinned in [`pnpm-workspace.yaml`](../pnpm-workspace.yaml).                                                                                            |
| WebGPU backend  | `@tensorflow/tfjs-backend-webgpu` is absent from the manifest and lockfile.                                                                                                                                            |
| Web app startup | [`webapp/src/main.ts`](../webapp/src/main.ts) calls `tf.ready()` without selecting or awaiting a backend before mounting Vue.                                                                                          |
| GPT workload    | [`wikitext.ts`](../discojs/src/default_tasks/wikitext.ts) configures batch size 8 and context length 64; [`gpt/config.ts`](../discojs/src/models/implementations/gpt/config.ts) defaults to a 50,257-token vocabulary. |

The server and Node participants use the separate native `tfjs-node` backend. Browser WebGPU does not replace it. The Wikitext task's descriptive text mentions older batch and context dimensions, so its configuration is the source of truth for the experiment below.

The [WebGPU package at 4.22.0](https://github.com/tensorflow/tfjs/blob/tfjs-v4.22.0/tfjs-backend-webgpu/package.json) has an exact `@tensorflow/tfjs-core@4.22.0` peer dependency. It matches DISCO's pin; a TFJS upgrade is not required for a trial. Its [setup instructions](https://github.com/tensorflow/tfjs/blob/tfjs-v4.22.0/tfjs-backend-webgpu/README.md) register the backend through an import and select it with `await tf.setBackend('webgpu')`.

Import behavior matters: the [WebGPU registration](https://github.com/tensorflow/tfjs/blob/tfjs-v4.22.0/tfjs-backend-webgpu/src/base.ts) has priority 3, above [WebGL's priority 2](https://github.com/tensorflow/tfjs/blob/tfjs-v4.22.0/tfjs-backend-webgl/src/base.ts). Adding an unconditional startup import could cause TFJS to select WebGPU automatically on supported browsers. An opt-in implementation should load the package only when the user selects it, or explicitly establish WebGL first.

## Browser and device support

The tested laptop has an AMD Radeon 860M integrated GPU using the `amdgpu` driver. Chrome for Testing 154 selected an **AMD RDNA 3** WebGPU adapter when launched with WebGPU and Vulkan enabled. WebGL's renderer also identified the Radeon 860M through Vulkan. An integrated GPU is therefore sufficient for this workload; a discrete GPU is not a prerequisite.

In the same environment, a default headful Chrome launch returned **no WebGPU adapter**. A default headless launch selected Google's SwiftShader software adapter. The hardware measurements below used `--enable-unsafe-webgpu`, `--use-angle=vulkan`, `--enable-features=Vulkan`, and `--disable-software-rasterizer`, and verified the AMD adapter before training. These flags are a test setup, not a deployment requirement that DISCO can assume users will meet. [Chrome's WebGPU overview](https://developer.chrome.com/docs/web-platform/webgpu/overview) documents platform-specific availability; [MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API) documents the secure-context requirement. A real deployment must check `navigator.gpu`, request an adapter, and retain a supported alternative.

## Built-in model benchmark

The benchmark imported DISCO's own model implementations into the web app's Vite environment and temporarily installed `@tensorflow/tfjs-backend-webgpu@4.22.0`. It ran Chrome for Testing 154 on the Radeon 860M with the hardware adapter verified before each run. Each model and backend combination used a fresh page and model. There were three independent runs per combination; each trained for five steps, except CIFAR MobileNet, which trained for three. `performance.now()` measured each awaited training step, including loss readback. Model construction and page loading were outside the timed steps. The first step includes warmup and shader compilation; the "warmed" figure pools steps 2–5 (2–3 for CIFAR) across the three runs. All inputs were synthetic but matched the models' expected shapes.

| Model | Input per step | First step WebGL / WebGPU | Warmed step WebGL / WebGPU | WebGPU speedup |
| --- | --- | ---: | ---: | ---: |
| Titanic classifier | 30 rows × 11 features | 287.8 / 174.6 ms | 8.9 / 6.5 ms | 1.38× |
| MNIST classifier | 64 images, 28 × 28 × 3 | 276.2 / 298.1 ms | 25.0 / 23.2 ms | 1.08× |
| LUS classifier | 5 images, 100 × 100 × 3 | 183.2 / 208.1 ms | 22.9 / 15.4 ms | 1.49× |
| Dog classifier | 8 images, 64 × 64 × 3 | 236.1 / 295.3 ms | 30.5 / 19.0 ms | 1.61× |
| CIFAR MobileNet | 1 image, 224 × 224 × 3 | 755.5 / 345.7 ms | 64.4 / 53.1 ms | 1.21× |
| GPT nano | 8 sequences × 64 tokens, vocabulary 50,257 | 1,486.6 / 696.6 ms | 889.0 / 274.1 ms | 3.24× |

The first-step figures are medians of three first steps; warmed figures are medians of 12 steps per backend, or six for CIFAR. Each speedup is the WebGL warmed median divided by the WebGPU warmed median. CIFAR used one image rather than its configured batch of ten to bound GPU use in this local probe; that result must not be extrapolated to the full task. GPT used seed 42 and Adam. Its five losses decreased from **10.839 to 10.513 on WebGL** and from **10.839 to 10.447 on WebGPU** in each run. All other models returned finite losses and a prediction in all three runs on both backends. Titanic, MNIST, LUS, and Dog serialized successfully in all runs; GPT and CIFAR serialization were not exercised. The other model initializations were not seeded alike, so their losses and predictions are not suitable for numerical comparison across backends.

The earlier two-run GPT-only probe measured warmed medians of about 1.02 s on WebGL and 0.38 s on WebGPU (2.65×). The broader three-run suite above used the same machine and batch shape but a different harness and yielded 3.24×. This variation reinforces that the precise speedup is workload and measurement dependent. TFJS reported about 1.62 GB of GPU allocations for GPT on WebGL and 1.64 GB on WebGPU; these are cumulative backend allocation counters, **not measured peak GPU memory**. Neither the step benchmark nor these counters include dataset download, tokenization, user interface work, or network communication. [Per-run step timings](WEBGPU_BENCHMARK_TIMINGS.csv) are included for audit.

## Federated round probe

Two browser clients completed a full one-epoch Titanic federated round against DISCO's Node server, once each with WebGL/WebGL, WebGPU/WebGPU, and WebGL/WebGPU. The server and clients used the actual DISCO training and aggregation code, a two-participant mean aggregation, 60 synthetic Titanic rows per client, batch size 30, and a local loopback connection. In three repeated runs per backend pair, both clients reported two participants, finite losses, and **identical final aggregate weight sums within each run**. The following are medians of the slower participant's end-to-end round time, from starting `trainByRound` to its completion:

| Client backends | Median round time | Three observed times |
| --- | ---: | ---: |
| WebGL + WebGL | 328 ms | 318, 328, 319 ms |
| WebGPU + WebGPU | 360 ms | 362, 360, 353 ms |
| WebGL + WebGPU | 446 ms | 451, 437, 446 ms |

These round times include local training, WebSocket communication, and aggregation. They are dominated by orchestration for this small tabular model; they do not show a round-level WebGPU speedup. They are local loopback measurements, not estimates for an internet deployment.

**The unmodified browser client could not start this round.** [`event_connection.ts`](../discojs/src/client/event_connection.ts) passes an options object as the browser `WebSocket` constructor's second argument; browsers interpret that argument as a subprotocol and throw `SyntaxError: subprotocol '[object Object]' is invalid`. The probe used a temporary, browser-only constructor shim that ignores this object. No shim or WebSocket fix is part of this research PR. The round proves the training and aggregation path can use WebGPU after that connection issue is bypassed; production browser federated training still needs the constructor fixed and retested without the shim.

## Compatibility and correctness risks

1. **Training coverage is model-specific.** The [4.22.0 WebGPU kernel registry](https://github.com/tensorflow/tfjs/blob/tfjs-v4.22.0/tfjs-backend-webgpu/src/register_all_kernels.ts) includes the main convolution, pooling, matrix multiplication, and related gradient kernels, and the six model probes exercised their training paths. TFJS's [WebGPU documentation](https://github.com/tensorflow/tfjs/blob/tfjs-v4.22.0/tfjs-backend-webgpu/README.md) still says training support is incomplete. A missing kernel on the selected backend raises an error; the [TFJS engine](https://github.com/tensorflow/tfjs/blob/tfjs-v4.22.0/tfjs-core/src/engine.ts) does not automatically retry that operation on WebGL.
2. **A shader can produce bad output without stopping training.** With the same TFJS 4.22.0 package in Chrome 154, a large `int32` transpose emitted WGSL type errors and returned zeros. A small transpose succeeded because the backend can execute small inputs on the CPU. This matches [tensorflow/tfjs#8638](https://github.com/tensorflow/tfjs/issues/8638), reported for Chrome 141 and later. The issue was closed without a confirmed package fix. The GPT batch above succeeded, but this separate failure blocks a claim that arbitrary DISCO models are safe on WebGPU.
3. **GPT inference needs numerical and shape checks.** With sampling disabled after the same five training steps, both backends chose token 64, but WebGL returned `64` and WebGPU returned `[64]` as the per-example prediction. Default sampled predictions also differed. The greedy result's different shape needs investigation before claiming GPT inference compatibility; sampled tokens can differ even without a bug.
4. **Availability varies by browser and GPU.** `navigator.gpu` alone is insufficient: an adapter may still be unavailable. Initialization must check the result of `tf.setBackend('webgpu')` and handle failure. A lost device or a runtime shader error also needs a visible failure path. Switching to WebGL after training has started should restart the affected model or round, rather than silently continue with potentially bad weights.
5. **Backend choice is global to the page.** TFJS has one active backend at a time. DISCO's `trainingInformation.tensorBackend` currently distinguishes the GPT and regular TFJS model families; it is not a device-backend setting. WebGPU selection should be a separate browser preference and should happen before loading or constructing the model.

## Proposed integration path

1. Add `@tensorflow/tfjs-backend-webgpu@4.22.0` to the web app only. Keep all TFJS packages on 4.22.0 and keep the Node runtime on `tfjs-node`.
2. Centralize and await browser TFJS initialization before app model operations. Keep the existing WebGL behavior as the default. For explicit WebGPU opt-in, import the backend, request an adapter, call `await tf.setBackend('webgpu')`, and verify that the selected backend is `webgpu`. On initialization failure, select WebGL explicitly, with CPU as the final supported fallback.
3. Report the selected backend and initialization failure in the training UI or diagnostics. Do not change backend during an active training round. Treat a runtime kernel or shader failure as a failed round; recover through a fresh model/backend setup instead of reusing suspect weights.
4. Extend the synthetic model and federated probes to real datasets and unmodified browser clients. Fix the WebSocket constructor, then repeat a full round without the shim. Exercise model save/load for GPT and CIFAR, a complete local round, and weight exchange on several browsers. Compare numerical outputs with WebGL within an explicit tolerance, including integer tensor paths and GPT prediction shape. Cover Chrome, Firefox, and Safari where WebGPU is available, plus a browser with no adapter.
5. Repeat cold and warmed step and full-round benchmarks on several devices and real datasets; measure peak GPU memory with an appropriate profiler. Record browser version, OS, adapter, batch size, model, and whether a software adapter was used. Keep WebGPU opt-in until correctness and fallback behavior pass these checks.

**Decision:** The current stack supports a useful WebGPU prototype, and GPT training on the tested integrated GPU showed a substantial local speedup. Browser availability, correctness findings, and the existing browser WebSocket failure make an automatic rollout premature.
