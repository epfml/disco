# WebGPU integration research

**Date:** 2 October 2026  
**Related issue:** [#575: look if we can benefit from WebGPU support](https://github.com/epfml/disco/issues/575)

## Conclusion

WebGPU can run DISCO's browser training code with the current TensorFlow.js (TFJS) version. On an AMD Radeon 860M integrated GPU, DISCO's GPT nano model completed training on both WebGL and WebGPU. For a batch matching the Wikitext task's configured dimensions, warmed WebGPU steps were about **2.6 times faster** in two local runs.

This supports an **opt-in browser prototype**, followed by model and browser compatibility testing. It does not support changing the default backend yet: the pinned WebGPU backend has a reproducible shader correctness bug, TFJS describes its training support as incomplete, and an ordinary Chrome launch on the tested Linux machine did not expose a WebGPU adapter.

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

## GPT training experiment

The dry run imported DISCO's [`GPT` implementation](../discojs/src/models/implementations/gpt/gpt.ts) into the web app's Vite environment. It installed the matching WebGPU package temporarily, selected each backend in a fresh browser page, constructed GPT nano with seed 42, and called `trainNextBatches` for five steps. The full-sized profile used batch size 8, context length 64, vocabulary size 50,257, Adam, and DISCO's normal GPT loss and gradient path. Token IDs were synthetic. Each step's elapsed time includes the asynchronous loss readback; the first step also includes shader compilation and other startup work. The two runs below used the same machine and browser, with a fresh page for each backend.

| Run | Backend | First step | Median of steps 2–5 | Loss, first → fifth |
| --- | ------- | ---------: | ------------------: | ------------------: |
| 1   | WebGL   |     2.24 s |              1.04 s |     10.839 → 10.513 |
| 1   | WebGPU  |     1.33 s |              0.39 s |     10.839 → 10.447 |
| 2   | WebGL   |     2.19 s |              1.01 s |     10.839 → 10.513 |
| 2   | WebGPU  |     1.34 s |              0.38 s |     10.839 → 10.447 |

The median across all eight warmed steps was approximately **1.02 s for WebGL and 0.38 s for WebGPU**, or **2.65 times faster** for WebGPU on this device and batch. Both backends returned finite losses that decreased across the five steps. TFJS's post-run GPU allocation counters were around 1.6 GB for each backend; these counters describe backend allocations, not a measured hardware peak. A smaller profile (batch 2, context length 8, vocabulary 128) trained successfully on both backends but showed little steady-step difference. The benefit appears workload-dependent.

These timings are a local probe, not a general benchmark. They exclude tokenization, dataset loading, aggregation, network communication, browser UI work, and a complete training round. Two runs do not establish performance across browsers or GPUs. The synthetic sequence also does not demonstrate model quality on Wikitext.

## Compatibility and correctness risks

1. **Training coverage is model-specific.** The [4.22.0 WebGPU kernel registry](https://github.com/tensorflow/tfjs/blob/tfjs-v4.22.0/tfjs-backend-webgpu/src/register_all_kernels.ts) includes the main convolution, pooling, matrix multiplication, and related gradient kernels, and the GPT dry run exercised one training path. TFJS's [WebGPU documentation](https://github.com/tensorflow/tfjs/blob/tfjs-v4.22.0/tfjs-backend-webgpu/README.md) still says training support is incomplete. A missing kernel on the selected backend raises an error; the [TFJS engine](https://github.com/tensorflow/tfjs/blob/tfjs-v4.22.0/tfjs-core/src/engine.ts) does not automatically retry that operation on WebGL.
2. **A shader can produce bad output without stopping training.** With the same TFJS 4.22.0 package in Chrome 154, a large `int32` transpose emitted WGSL type errors and returned zeros. A small transpose succeeded because the backend can execute small inputs on the CPU. This matches [tensorflow/tfjs#8638](https://github.com/tensorflow/tfjs/issues/8638), reported for Chrome 141 and later. The issue was closed without a confirmed package fix. The GPT batch above succeeded, but this separate failure blocks a claim that arbitrary DISCO models are safe on WebGPU.
3. **Availability varies by browser and GPU.** `navigator.gpu` alone is insufficient: an adapter may still be unavailable. Initialization must check the result of `tf.setBackend('webgpu')` and handle failure. A lost device or a runtime shader error also needs a visible failure path. Switching to WebGL after training has started should restart the affected model or round, rather than silently continue with potentially bad weights.
4. **Backend choice is global to the page.** TFJS has one active backend at a time. DISCO's `trainingInformation.tensorBackend` currently distinguishes the GPT and regular TFJS model families; it is not a device-backend setting. WebGPU selection should be a separate browser preference and should happen before loading or constructing the model.

## Proposed integration path

1. Add `@tensorflow/tfjs-backend-webgpu@4.22.0` to the web app only. Keep all TFJS packages on 4.22.0 and keep the Node runtime on `tfjs-node`.
2. Centralize and await browser TFJS initialization before app model operations. Keep the existing WebGL behavior as the default. For explicit WebGPU opt-in, import the backend, request an adapter, call `await tf.setBackend('webgpu')`, and verify that the selected backend is `webgpu`. On initialization failure, select WebGL explicitly, with CPU as the final supported fallback.
3. Report the selected backend and initialization failure in the training UI or diagnostics. Do not change backend during an active training round. Treat a runtime kernel or shader failure as a failed round; recover through a fresh model/backend setup instead of reusing suspect weights.
4. Test DISCO's built-in image tasks, GPT training and inference, model save/load, weight exchange, and at least one complete local and federated round. Compare finite losses and predictions with WebGL within an explicit numerical tolerance, including integer tensor paths. Cover Chrome, Firefox, and Safari where WebGPU is available, plus a browser with no adapter.
5. Benchmark cold and warmed steps, full round time, and GPU memory on several devices. Record browser version, OS, adapter, batch size, model, and whether a software adapter was used. Keep WebGPU opt-in until correctness and fallback behavior pass these checks.

**Decision:** The current stack supports a useful WebGPU prototype, and GPT training on the tested integrated GPU showed a substantial local speedup. Browser availability and the confirmed TFJS shader bug make an automatic rollout premature.
