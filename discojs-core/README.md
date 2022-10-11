# Disco.js Core Module

`discojs-core` contains the core, platform-agnostic code of Disco.js, used by both `discojs` and `discojs-node`.

## Installation

The dev tools run on Node.js (v16) and require `npm`, a package manager for the Node.js runtime environment.
We recommend using [nvm](https://github.com/nvm-sh/nvm) for installing both Node.js and NPM.

To install the project's dependencies, run the following commands:

```
cd discojs-core
npm ci
```

> **⚠ WARNING: Apple Silicon.**
> `TensorFlow.js` version `3` do support M1 processors for macs. To do so, make sure you have an `arm` Node.js executable installed (not `x86_64`). It can be checked using:

```
node -p "process.arch"
```

which should return something similar to `arm64`.

## Build

The browser, server and benchmark modules use either the `discojs` or `discojs-node` interface, depending on the runtime environment (browser or Node, respectively). Both interfaces build on top of and extend `discojs-core`, which must always be built first when bringing changes to the codebase:

```
npm run build
```

This invokes the TypeScript compiler (`tsc`). It will output two compiled versions of  `discojs-core` in `discojs-core/dist/browser/` and `discojs-core/dist/node/`, for the browser and Node environments, respectively. The former is used by `discojs`, whereas the latter is used by `discojs-node`. used by To recompile from stratch, simply `rm -rf dist/` before running `npm run build` again.

## Development

### Using Disco.js

This module is not available as a remote package on NPM. It is destined to be used by the two actual packages we offer on NPM: `@epfml/discojs` and `@epfml/discojs-node`. Thus, you should only interact with it when directly contributing to Disco.js. See the [discojs](../discojs/README.md) and [discojs-node](../discojs-node/README.md) READMEs for more info.

### Contributing

Contributions to `discojs-core` must only contain platform-agnostic code, i.e. code able to run on either Node or the browser.

Note that, if you end up making calls to the Tensorflow.js API, you must import it from the root index. This is to ensure the right version of TF.js is loaded (depending on the compilation `dist/`), and only once. The only exception occurs in unit tests, which should import TF.js from the (local) `@epfml/discojs-node`, since those run on Node.js.