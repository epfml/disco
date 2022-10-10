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

This invokes the TypeScript compiler (`tsc`). To recompile from stratch, simply `rm -rf dist/` before running `npm run build` again.

## Development

This module is not available as a remote package on NPM. It is destined to be used by the two actual packages we offer: `@epfml/discojs` and `@epfml/discojs-node`.

When contributing directly to Disco.js, you should be using the __LOCAL__ `@epfml/{discojs, discojs-node}` package, based off the local files you have and are modifying.