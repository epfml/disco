# Disco.js Node Module

`discojs-node` contains the Node.js code of Disco.js, based off and extending `discojs-core`.

## Installation

The dev tools run on Node.js (v16) and require `npm`, a package manager for the Node.js runtime environment.
We recommend using [nvm](https://github.com/nvm-sh/nvm) for installing both Node.js and NPM.

To install the project's dependencies, run the following commands:

```
cd discojs-core
npm ci
cd discojs-node
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
cd discojs-core
npm run build
cd discojs-node
npm run build
```

This invokes the TypeScript compiler (`tsc`). To recompile from stratch, simply `rm -rf dist/` before running `npm run build` again.

## Development
As the developer of an external project, you should only be interacting with either the `@epfml/discojs` or the `@epfml/discojs-node` __REMOTE__ package, both hosted on the `@epfml` NPM registry. These are installed with `npm i @epfml/discojs` and `npm i @epfml/discojs-node`, respectively.
As the developer of an external project, you should only be interacting `@epfml/discojs-node`, never the  (local) `discojs-core`.
