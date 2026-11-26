# Transition from TensorFlow.js to Burn

This document describes how DISCO moves its tensor and machine learning layer from [TensorFlow.js](https://js.tensorflow.org) to [Burn](https://burn.dev), a deep learning framework written in Rust and compiled to WebAssembly for the browser. It tracks [epfml/disco#1199](https://github.com/epfml/disco/issues/1199).

## Motivation

TF.js is close to unmaintained and limits DISCO in several ways: manual tensor memory management that keeps causing leaks, slow progress on WebGPU, few modern building blocks for language models, and a separate native binding for Node.js. Burn is actively developed. It covers every layer and operation DISCO uses today, runs on WebGPU and on CPU in the browser, and the same Rust code also runs natively on the server. Rust frees tensor memory automatically, which removes a whole class of bugs.

## Goals and non-goals

Goals:

- Train and run every predefined task on Burn, in the browser and in Node.js, with accuracy and speed at least on par with TF.js.
- Remove TF.js from every package at the end of the transition.
- Keep DISCO usable at every step: the transition ships in small increments, never as one large rewrite.

Non-goals:

- Rewriting the rest of `discojs` in Rust. Networking (WebSocket, WebRTC), datasets, task definitions, training orchestration and the webapp stay in TypeScript. Only the tensor layer moves.
- Changing the federated or decentralized protocols. The data exchanged between peers and the server stays the same.
- Replacing the ONNX inference path used for pretrained language models, which does not depend on TF.js.

## What depends on TF.js today

| Area                                 | Role of TF.js                                           |
| ------------------------------------ | ------------------------------------------------------- |
| Models (standard classifiers, GPT)   | Model definition, training loop, inference              |
| Weights container                    | Holds model weights as TF.js tensors                    |
| Aggregators and differential privacy | Arithmetic on weights (averaging, clipping, noise)      |
| Model serialization                  | Stores models in the TF.js format                       |
| Webapp task creation                 | Users upload a TF.js model file to define a custom task |
| Server and CLI                       | Load the native TF.js backend for Node.js               |

The protocol for exchanging weights is already independent of TF.js: weights travel as plain arrays of numbers with a shape.

## Transition principles

1. **Coexistence.** TF.js and Burn live side by side during the transition. A model is either a TF.js model or a Burn model, behind the same model interface, so the rest of DISCO doesn't need to know which one it is talking to.
2. **One backend per task.** A task trains on a single backend: every client of a task uses the same one. Tasks move to Burn one at a time. Mixing backends within a task is out of scope, because weight order, memory layout and initialization would all have to match exactly.
3. **TypeScript orchestrates, Rust computes.** The boundary between the two is the model and its weights. Data crosses that boundary as rarely as possible. The main application logic is defined in TypeScript, only relying on Burn for computations.
4. **Parity before switching.** A task switches to Burn only once it matches its TF.js version on accuracy and training time.

## Phases

### Phase 0: Decouple weights from TF.js

Make the weights container, the aggregators and the differential-privacy mechanisms independent of any tensor library. After this phase, aggregation works the same whatever backend produced the weights.

This phase needs no Rust and is useful even if the transition stops later.

Done when: no aggregator, privacy mechanism or weight serializer imports TF.js, and all existing tests still pass.

### Phase 1: Burn foundation

Set up the Rust side of the repository and connect it to `discojs`:

- a Rust package compiled to WebAssembly for the browser and usable from Node.js, built in CI alongside the TypeScript packages;
- a Burn model type that implements DISCO's model interface (train, evaluate, predict, read and write weights, dispose);
- training in the browser off the main thread so the UI stays responsive;
- a WebGPU backend with a CPU fallback for browsers or machines without WebGPU;
- a serialization format for Burn models, versioned so that Burn upgrades never silently break stored models;
- tasks can declare Burn as their backend.

Done when: a minimal model trains on Burn in the browser and in Node.js through the existing training flow.

### Phase 2: First tasks on Burn

Port the simplest predefined tasks, MNIST and Titanic, which only use dense and convolutional layers. Run them on both backends and compare accuracy, training time, memory and bundle size. Use this phase to settle conventions (model definitions, initializations, metrics) for the following phases.

Done when: both tasks run on Burn by default in the webapp, the CLI and the server end-to-end tests, with results on par with TF.js.

### Phase 3: Remaining image tasks

Port the other image classifiers (LUS-COVID, dog classifier, CIFAR-10). CIFAR-10 starts from a pretrained MobileNet, so its weights need a one-off conversion from the TF.js format. Image preprocessing has to follow Burn's channels-first layout.

Done when: every image and tabular task runs on Burn.

### Phase 4: GPT

Port the GPT model, its custom layers, its optimizer and gradient clipping, and text generation. It's the largest and most customized model, so it comes last, once the foundation has been tested on simpler models. Existing GPT checkpoints are converted or retrained.

Done when: GPT training, evaluation and generation match the TF.js version.

### Phase 5: Custom models in task creation

Today, users define a custom task by uploading a TF.js model file, which TF.js builds at runtime. Burn has no equivalent: its models are compiled ahead of time.

The upload is replaced by an **architecture catalogue**:

- DISCO ships a set of predefined architectures compiled into the Burn package, covering common needs (for example a multilayer perceptron for tabular data, small convolutional networks and a pretrained backbone for images, a small transformer for text).
- When creating a task, users pick an architecture and configure its hyperparameters (sizes, number of layers, number of classes, dropout, optimizer, learning rate) instead of uploading a model.
- Users can optionally provide initial weights in the safetensors format, for example exported from PyTorch, provided they match the chosen architecture. DISCO checks that they match before accepting them.
- Raw PyTorch files are not accepted: they don't describe the architecture, and opening them can run arbitrary code.
- Architectures not in the catalogue are added to the repository, the same way as custom tasks today.

Accepting arbitrary model files (for example ONNX, interpreted at runtime) is left for later, if the catalogue proves too limiting.

The task documentation is updated to describe the catalogue and the weight format.

Done when: users can create a custom task from the catalogue, with or without initial weights, without TF.js.

### Phase 6: Remove TF.js

Remove TF.js and its Node.js binding from every package, delete the TF.js model code and its serialization format, and update the documentation that refers to TF.js (memory management, task creation, tooling).

Done when: no package depends on TF.js.

## Cross-cutting concerns

- **Browser support.** Burn has no WebGL backend. Browsers without WebGPU fall back to the CPU, which is slower than TF.js on WebGL. Multithreaded CPU execution requires the site to be served with cross-origin isolation headers, which affects deployment.
- **Asynchronous execution.** The browser forbids blocking calls, so everything that reads results back from the GPU must be asynchronous. Some Burn operations still assume blocking reads and fail on WebGPU in the browser. Each phase checks the operations it uses.
- **Node.js.** The server and CLI can either run the same WebAssembly build or a native build that uses the machine's GPU. Both must produce models that the browser can read.
- **Numerical parity.** Default initializations, numerical constants and activation approximations differ slightly between frameworks. Porting a model includes setting them explicitly and comparing training curves against TF.js with fixed seeds.
- **Bundle size.** During the transition the webapp ships both libraries. Burn is loaded only when a Burn task starts.
- **Tooling and contributors.** Contributors need a Rust toolchain, CI builds take longer, and the contributing guide and developer setup must explain the new package.
- **Framework stability.** Burn is still before version 1.0 and makes breaking changes between releases. Upgrades are pinned, done deliberately, and tested against stored models.

## Risks

| Risk                                                          | Mitigation                                                                        |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Training in the browser is less mature in Burn than inference | Phase 1 validates it on a minimal model before any task depends on it             |
| Slower training on machines without WebGPU                    | Measure in Phase 2. Keep TF.js for affected tasks until performance is acceptable |
| Breaking changes in Burn                                      | Pin versions, version stored models, upgrade deliberately                         |
| The architecture catalogue doesn't cover a user's model       | Add architectures on request. Consider runtime ONNX support later                 |
| The team has limited Rust experience                          | Keep the Rust code limited to the tensor layer. Start with the simplest models    |

## Open decisions

1. **Architecture catalogue.** Which architectures it contains at launch and which hyperparameters users can configure.
2. **Node.js build.** Use the WebAssembly build everywhere, or add a native build for the server and CLI to benefit from server GPUs.
3. **CPU fallback.** Whether to enable cross-origin isolation in deployment for multithreaded CPU training, or accept single-threaded CPU training.
4. **Existing models.** Which stored TF.js models and checkpoints to convert, and which to retrain or drop.
