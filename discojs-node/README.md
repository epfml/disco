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

The server and benchmark modules, as well as all unit tests (except Cypress) use the `discojs-node` interface, i.e. they all run on Node.js. This Disco.js Node module is build on top of and extends `discojs-core`, which must always be built first before building `discojs-node`:

```
cd discojs-core
npm run build
cd discojs-node
npm run build
```

This invokes the TypeScript compiler (`tsc`). It will output the compilation files of `discojs-node` in `discojs-node/dist/`. To recompile from stratch, simply `rm -rf dist/` before running `npm run build` again.

## Development

### Using Disco.js

As the developer of an external project, you should only be interacting with the `@epfml/discojs-node` __REMOTE__ package, hosted on the `@epfml` NPM registry. It is installed with `npm i @epfml/discojs-node`.

### Compilation

When contributing directly to the source code of `discojs-node`, you will be using the __LOCAL__ `@epfml/discojs-core` package, which is based off the local files you have and are modifying in the `discojs-core` directory. As mentioned earlier, any change to `discojs-core` requires a rebuild of both `discojs-core` and `discojs-node`, for all changes to be reflected. However, changes brought to `discojs-node` alone, only require a rebuild of `discojs-node`.

### Contributing

Contributions to `discojs-node` must only include Node-specific code. Code common to both Node and the browser must be added to `discojs-core` instead.

Note that, if you end up making calls to the Tensorflow.js API, you must import it from the root index. This is to ensure the Node version of TF.js is loaded, and only once.