# TensorFlow.js Integration for `TrainingHook`

Companion document to [TRAINING_ARCHITECTURE.md](./TRAINING_ARCHITECTURE.md#33-backend-agnostic-model-boundary).

## Overview & Motivation

The [target architecture](./TRAINING_ARCHITECTURE.md) introduces a `TrainingHook` lifecycle so collaborative algorithms—such as FedProx loss regularization, gradient clipping, or SCAFFOLD—can participate in local training without adding algorithm-specific branches to `Trainer` or `Model`.

In Disco today, both model implementations (`TFJS` and `GPT`) are backed by TensorFlow.js, yet they run local training differently:

- **`TFJS`** delegates batches to `tf.LayersModel.fit()`, which hides the forward/backward pass and optimizer step behind Keras-style configuration.
- **`GPT`** already runs an explicit `optimizer.computeGradients` $\rightarrow$ `applyGradients` loop.

In Python TensorFlow/Keras, an `addLoss` API is available to attach regularizers dynamically and still train with `model.fit()`. However, TensorFlow.js does not provide equivalent model-level `addLoss` support during `model.fit()`. Any integration must therefore connect `TrainingHook.computeLoss` (and, if needed, gradient transforms) into TensorFlow.js autograd while preserving the user's model architecture, base loss, and optimizer state.

## Design Options

Below are three candidate mechanisms for wiring `TrainingHook` into `TFJS` and `GPT`, trading off `model.fit()` compatibility against uniformity and generality:

| Option       | Mechanism                                                                                                                                                           | `TFJS` keeps `model.fit()`? | Modifies TFJS runtime API? |         Supports gradient hooks (gradient clipping, SCAFFOLD)?          |
| :----------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------: | :------------------------: | :---------------------------------------------------------------------: |
| **Option 1** | `TFJS` wraps the compiled loss via public `model.compile({ loss })`; `GPTModel` calls `hooks.computeLoss` directly in its existing `computeGradients` loop.         |           **Yes**           |           **No**           | Loss hooks only (requires a separate path if a gradient hook is active) |
| **Option 2** | Both `TFJS` and `GPT` share one ~40-line `runTFJSStep` helper using `optimizer.computeGradients` $\rightarrow$ `transformGradients` $\rightarrow$ `applyGradients`. |           **No**            |           **No**           |                **Yes** (uniformly for `TFJS` and `GPT`)                 |
| **Option 3** | Temporarily wrap `optimizer.computeGradients` on the `tf.Optimizer` instance for the duration of a round.                                                           |           **Yes**           |          **Yes**           |                **Yes** (uniformly for `TFJS` and `GPT`)                 |

---

## Option 1: Public `model.compile({ loss })` in `TFJS` + Direct Call in `GPTModel`

- **How it works:**
  - When no hook implements `computeLoss` (standard FedAvg, local training, Byzantine, DP), `TFJS` calls `this.model.fit(xs, ys, { epochs: 1, verbose: 0 })` completely untouched.
  - When one or more hooks implement `computeLoss`, `TFJS` resolves the base loss function from `this.model.loss` (which may be a string identifier such as `"categoricalCrossentropy"` or a custom `LossOrMetricFn`) and wraps it via TFJS's public `model.compile(...)` API while passing the existing `this.model.optimizer` instance (in `@tensorflow/tfjs-layers`, passing a `tf.Optimizer` instance assigns `this.optimizer_ = args.optimizer` directly, preserving Adam moments and iteration count):
    ```ts
    const baseLossFn = resolveLossFn(this.model.loss);
    this.model.compile({
      optimizer: this.model.optimizer,
      loss: (yTrue: tf.Tensor, yPred: tf.Tensor) => {
        let totalLoss = baseLossFn(yTrue, yPred).mean().asScalar();
        for (const hook of lossHooks) {
          totalLoss = hook.computeLoss(totalLoss, getContext());
        }
        return totalLoss;
      },
      metrics: resolvedMetrics,
    });
    ```
  - `GPTModel` (`discojs/src/models/implementations/gpt/model.ts`) already executes its own explicit `optimizer.computeGradients(...)` loop, so it invokes `hook.computeLoss(totalLoss, ctx)` directly inside that closure with no `compile` re-wrapping.
- **Pros:**
  - Keeps `this.model.fit(xs, ys)` in the loop for `TFJS`, preserving TFJS's built-in handling of `{ training: true }`, `calculateLosses()`, compiled metrics, and tensor disposal.
  - Uses only public TFJS APIs (no runtime method patching).
- **Cons:**
  - Handles different cases differently (`TFJS` vs. `GPT`, and loss hooks vs. future gradient hooks), adding branching complexity.
  - Only covers **loss-level** hooks inside `model.fit()`; supporting batch **gradient** hooks (`transformGradients`, e.g., gradient clipping or SCAFFOLD) on `TFJS` would still require a separate fallback step or migrating to Option 2.
  - **`model.compile({ loss })` side effects in TFJS 4.22:** Recompiling with a closure `loss` requires explicitly resolving `metrics` and restoring the original `this.model.loss` before `evaluate()` or `serialize()`. Otherwise, `LayersModel.compile` resolves `"accuracy"` by checking `lossFunctions[i] === binaryCrossentropy` / `sparseCategoricalCrossentropy` by function identity (switching `"accuracy"` from `binaryAccuracy` to `categoricalAccuracy` on 2-unit `binaryCrossentropy` models such as `LUSClassifierModel`), `TFJS.serialize()` persists closure losses as `"loss": {}` in `trainingConfig` (breaking `deserialize()`), and `evaluate()` (`evaluateDataset`) includes training regularizers in validation loss.

---

## Option 2: Shared Explicit TFJS Training Step (`runTFJSStep`) for Both `TFJS` and `GPT`

- **How it works:**
  - Because both `TFJS` and `GPT` wrap a `tf.LayersModel`, extract a single ~40-line helper that runs the autograd step directly for both models:

    ```ts
    const { value: loss, grads } = optimizer.computeGradients(() => {
      const preds = tfModel.apply(xs, { training: true }) as tf.Tensor;
      let totalLoss = computeDataLoss(ys, preds).mean().asScalar();
      for (const reg of tfModel.calculateLosses()) {
        totalLoss = totalLoss.add(reg).asScalar();
      }
      for (const hook of lossHooks) {
        totalLoss = hook.computeLoss(totalLoss, ctx);
      }
      return totalLoss;
    }, trainableVars);

    let finalGrads = grads;
    try {
      for (const hook of gradHooks) {
        finalGrads = hook.transformGradients(finalGrads, ctx);
      }
      optimizer.applyGradients(finalGrads);
    } finally {
      if (finalGrads !== grads) tf.dispose(finalGrads);
      tf.dispose(grads);
    }
    ```

  - `TFJS` supplies its compiled loss + accuracy metric; `GPT` supplies next-token cross-entropy (+ optional Goldfish masking), its `AdamW` optimizer, and a global-norm clipping hook—allowing the `GPTModel.fitDataset` override and 1-batch-dataset indirection to be removed.

- **Pros:**
  - Uses only public TFJS APIs (no runtime method patching).
  - Handles training generically and uniformly across `TFJS` and `GPT` for both loss and batch gradient hooks (FedProx, gradient clipping, SCAFFOLD; note that true DP-SGD additionally requires per-sample microbatching rather than batch-averaged `transformGradients`).
  - Reduces duplicated training-loop code by unifying `TFJS` and `GPTModel.fitDataset` around one step primitive.
- **Cons:**
  - **Robustness trade-off for `TFJS`:** replacing `model.fit()` means Disco explicitly owns `{ training: true }` (Dropout/BatchNorm), `model.calculateLosses()` (layer L1/L2 regularizers), explicit `grads` / `finalGrads` tensor disposal, compiled loss lookup, and TFJS's 3-way `"accuracy"` metric dispatch (`binaryAccuracy` vs. `categoricalAccuracy` vs. `sparseCategoricalAccuracy`), which may be less battle-tested on exotic custom Keras models than `model.fit()`.

---

## Option 3: Scoped Runtime Wrapping of `optimizer.computeGradients`

- **How it works:**
  - Temporarily reassign `layersModel.optimizer.computeGradients = ...` for the duration of a round via a `Disposable` scope, intercepting both `TFJS.model.fit()` (via `optimizer.minimize` $\rightarrow$ `computeGradients`) and `GPTModel.fitDataset()`.
- **Pros:**
  - Keeps `model.fit()` untouched for `TFJS` while handling both `TFJS` and `GPT` (and both loss and batch gradient hooks) uniformly in one place.
- **Cons:**
  - **API- and internals-dependent:** mutates a method on a `@tensorflow/tfjs-core` `tf.Optimizer` instance at runtime and relies on TFJS's internal call chain (`Sequential` vs. functional `LayersModel` optimizer forwarding, `minimize` $\rightarrow$ `computeGradients`).
  - **Lifecycle fragility:** requires strict `try` / `finally` (or `using`) unwrapping so round aborts or mid-training errors never leave a stale hook wrapper attached to the optimizer instance.

---

## Critical TensorFlow.js Invariants (Relevant Across Options)

1. **Multi-Client Process Isolation (`varList`):**
   When calling `optimizer.computeGradients(f, varList)` directly (in `GPTModel` or Option 2), always pass `layersModel.trainableWeights.map(w => w.read() as tf.Variable)` rather than leaving `varList` undefined (which causes `tf.variableGrads` to sweep every registered `tf.Variable` in the global TFJS engine, including other clients' models in CLI simulations).
2. **Interaction with `AdamW` and Gradient Clipping in `GPTModel`:**
   In `discojs/src/models/implementations/gpt/optimizers.ts`, `AdamW` overrides `applyGradients` for decoupled weight decay, and `GPTModel` clips the global gradient norm between `computeGradients` and `applyGradients`. Adding `hooks.computeLoss` inside `computeGradients` guarantees that regularized gradients flow properly through global norm clipping and `AdamW`.
3. **Trainable-Only Regularization:**
   Hooks such as `FedProxHook` must compute penalties over `model.trainableWeights` (excluding non-trainable `BatchNormalization` moving statistics) so running-stat drift is never penalized.
