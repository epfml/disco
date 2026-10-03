# WebGPU integration research

Experiments: 2 October 2026. Evidence reviewed: 3 October 2026.
Related: [#575](https://github.com/epfml/disco/issues/575), [Shakespeare task #1244](https://github.com/epfml/disco/pull/1244).

## Takeaway

- **WebGPU can run DISCO training.** Add `@tensorflow/tfjs-backend-webgpu@4.22.0` to the web app and explicitly initialize it before model operations. This matches DISCO's existing TFJS pin; no TFJS upgrade is needed for a trial.
- **GPT is the strongest performance result:** 3.24× faster warmed synthetic training steps, and about 2.02× faster completion of a decentralized Tiny Shakespeare round with Firefox and Chrome.
- **The speedup was not universal.** All six model families had faster pooled warmed medians, but individual runs sometimes regressed, and the small Titanic federated round was slower on WebGPU.
- **Correctness remains unresolved.** We reproduced a shader failure and a GPT prediction-shape mismatch. Training completed, but we did not establish convergence, validation quality, or numerical equivalence.
- **Keep WebGPU opt-in, with WebGL as the default.** The tested Linux browsers needed configuration, and collaborative runs required temporary fixes for two existing DISCO transport problems.

All measurements used one AMD Radeon 860M integrated GPU. They establish feasibility on that laptop, not a performance ceiling or an expected speedup on a discrete GPU. These were browser WebGPU/WebGL measurements, not CUDA benchmarks.

## Integration requirements

DISCO pins `@tensorflow/tfjs` and `@tensorflow/tfjs-node` to 4.22.0 in [`pnpm-workspace.yaml`](../pnpm-workspace.yaml). The WebGPU package is absent from the manifest and lockfile. Its [4.22.0 package](https://github.com/tensorflow/tfjs/blob/tfjs-v4.22.0/tfjs-backend-webgpu/package.json) requires the matching TFJS core version, and its [setup instructions](https://github.com/tensorflow/tfjs/blob/tfjs-v4.22.0/tfjs-backend-webgpu/README.md) show backend registration and selection.

Load the package on opt-in, await `tf.setBackend('webgpu')`, and verify the selected backend before constructing models. An unconditional import can change the default: WebGPU registers with [priority 3](https://github.com/tensorflow/tfjs/blob/tfjs-v4.22.0/tfjs-backend-webgpu/src/base.ts), above [WebGL's priority 2](https://github.com/tensorflow/tfjs/blob/tfjs-v4.22.0/tfjs-backend-webgl/src/base.ts). Initialization failures should select WebGL explicitly. Runtime failures should stop the affected training round; continuing with suspect weights is unsafe.

The choice is global to the page. DISCO's `tensorBackend` field distinguishes GPT and regular TFJS model implementations, so device selection needs a separate browser preference. The Node server and Node participants continue using `tfjs-node`.

## Performance evidence

### Short model probes

Chrome for Testing 154, hardware AMD adapter verified, three runs per model/backend with a fresh page and model. Inputs were synthetic. Each run trained five steps, except CIFAR, which trained three. Timings include awaited loss readback; they exclude model construction, tokenization and communication. Warmed medians pool steps after the first across all three runs. [The CSV](WEBGPU_BENCHMARK_TIMINGS.csv) contains these synthetic step timings only.

| Model           | Input per step                             | Warmed WebGL / WebGPU | Speedup |
| --------------- | ------------------------------------------ | --------------------: | ------: |
| Titanic         | 30 rows × 11 features                      |          8.9 / 6.5 ms |   1.38× |
| MNIST           | 64 images, 28 × 28 × 3                     |        25.0 / 23.2 ms |   1.08× |
| LUS             | 5 images, 100 × 100 × 3                    |        22.9 / 15.4 ms |   1.49× |
| Dog             | 8 images, 64 × 64 × 3                      |        30.5 / 19.0 ms |   1.61× |
| CIFAR MobileNet | 1 image, 224 × 224 × 3                     |        64.4 / 53.1 ms |   1.21× |
| GPT nano        | 8 sequences × 64 tokens, vocabulary 50,257 |      889.0 / 274.1 ms |   3.24× |

GPT was faster in all three runs. This does not hold for every model: MNIST's first-run warmed median was slower on WebGPU, as was LUS's second run. Warmup also sometimes cost more on WebGPU. CIFAR used batch size 1 instead of the task's configured 10, so its result does not describe the full task workload.

### Decentralized Tiny Shakespeare experiment

Firefox 155.0.1 and Chrome for Testing 154 ran concurrently on the same laptop, using the same backend in each experiment. The first 8,000 lines of Tiny Shakespeare were split into two contiguous 4,000-line shards: 61 batches for Firefox and 66 for Chrome. Both used DISCO's GPT-2 tokenizer, batch size 8, context length 64, model seed 42, one epoch/round, and no validation. Run order was WebGPU, WebGL, WebGL, WebGPU, with fresh browser processes.

| Measure                                       |    WebGPU runs |       WebGL runs |        Median WebGPU / WebGL |
| --------------------------------------------- | -------------: | ---------------: | ---------------------------: |
| Firefox local epoch                           | 39.18, 61.27 s |  97.63, 102.94 s |             50.23 / 100.29 s |
| Chrome local epoch                            | 30.38, 55.05 s | 103.21, 107.68 s |             42.71 / 105.44 s |
| Slower client, page setup through aggregation | 42.76, 66.03 s | 107.43, 111.89 s | **54.39 / 109.66 s (2.02×)** |

Both clients completed a round in all four runs, with matching final weight sums within each run. Equal sums are a limited aggregation check, not proof of elementwise weight equality or correct learning. These timings include setup, training and peer exchange, but exclude browser process launch. Both participants shared one GPU; this was not a measurement across two physical devices.

**Task status:** this experiment predates #1244 and used an adapted Wikitext task with Shakespeare text. The new [`shakespeare` task](../discojs/src/default_tasks/shakespeare.ts) now supplies a dedicated definition and dataset download through `datasets/populate`. Rebasing this research onto that branch did not rerun the benchmark. Neither the new task nor the full 40,000-line corpus has been benchmarked here.

The successful runs required a browser WebSocket shim and a temporary 48 KiB peer chunk cap. The unmodified client failed before these workarounds; they are not part of this PR.

### Small federated comparison

Two browser clients also completed synthetic Titanic federated rounds through the Node server: 60 rows per client, batch size 30, three runs per backend pair. The recorded slower-client times were 318/328/319 ms for WebGL+WebGL, 362/360/353 ms for WebGPU+WebGPU, and 451/437/446 ms for mixed backends. Their medians are **319, 360 and 446 ms**, respectively. This small workload showed no round-level WebGPU speedup. The earlier report incorrectly listed the WebGL median as 328 ms.

## What was reproduced, and what was not validated

The following symptoms are present in the original experiment execution records; they were not merely inferred from upstream reports.

| Finding                          | Direct observation                                                                                                                                | Remaining uncertainty                                                                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Integer transpose shader failure | TFJS 4.22.0 on Chrome 154 emitted a WGSL `expected f32, got i32` error and returned zeros for a large `int32` transpose; a small input succeeded. | Matches [TFJS #8638](https://github.com/tensorflow/tfjs/issues/8638), but was a separate operator probe, not a demonstrated cause of the GPT training differences. |
| GPT prediction shape             | Greedy prediction after five steps returned `[64]` on WebGL and `[[64]]` on WebGPU for the prediction batch.                                      | Observed mismatch; root cause and impact on DISCO inference remain unisolated. Sampled token differences alone are not evidence of a bug.                          |
| Browser WebSocket constructor    | Browser threw `The subprotocol '[object Object]' is invalid` from `event_connection.ts`, including with WebGL.                                    | Existing DISCO transport issue, not specific to WebGPU; successful runs bypassed it with a shim.                                                                   |
| WebRTC message size              | The initial Firefox/Chrome decentralized attempt threw `Trying to send message larger than max-message-size` at weight exchange.                  | Successful runs capped peer chunks at 48 KiB; a general transport fix still needs testing.                                                                         |

The TFJS 4.22.0 README warns that training kernel coverage is incomplete. We exercised six model families, but did not reproduce a missing-gradient-kernel error in them. Device-loss recovery and runtime fallback were not tested.

**Training quality was not established.** The saved synthetic GPT losses decrease over five steps: 10.839 → 10.513 on WebGL and 10.839 → 10.447 on WebGPU. For Shakespeare, the retained outputs contain epoch-average losses, not per-batch curves: approximately 9.69 on WebGL versus 8.83 on WebGPU. Final aggregate weight sums also differed substantially across backends despite using seed 42. The cause is unresolved; a lower training loss does not establish correctness. There was no held-out validation, convergence study, or tolerance-based comparison of logits, gradients and weights.

Titanic, MNIST, LUS and Dog were serialized in the short probes. GPT/CIFAR serialization and complete save/load round trips were not validated. Reported GPU allocation counters were not measured peak memory.

## Browser configuration used

On this Linux laptop, an ordinary headful Chrome launch exposed no adapter; a default headless launch selected SwiftShader. The hardware Chrome runs used these GPU flags:

```text
--enable-unsafe-webgpu
--use-angle=vulkan
--enable-features=Vulkan
--disable-software-rasterizer
```

The headless Firefox harness set these preferences:

```text
dom.webgpu.enabled = true
gfx.webrender.all = true
```

The Firefox probe exposed an adapter with `dom.webgpu.enabled=true` and none with it false; it did not isolate whether `gfx.webrender.all` was necessary. Firefox redacted the adapter vendor/architecture, while Chrome identified AMD RDNA 3. These are the tested settings, not a universal browser setup prescription. Deployment should check adapter availability in a secure context; [browser/platform support varies](https://developer.chrome.com/docs/web-platform/webgpu/overview).

## Next step

Implement explicit opt-in with WebGL fallback at initialization. Before widening support, fix the transport failures and run the dedicated Shakespeare task without workarounds, recording training and validation curves and comparing backend outputs within defined tolerances. Repeat measurements on other GPUs and browsers before making broader performance claims.
