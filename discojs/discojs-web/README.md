# Disco.js Web Module

`discojs-web` contains the browser-only code of Disco.js, based off and extending `discojs-core`.

## Installation

The `discojs-web` project is available as the `@epfml/discojs` NPM package, which can be installed with
`npm i @epfml/discojs`.

### Development Environment

The dev tools run on Node.js and require `npm`, a package manager for the Node.js runtime environment.
We recommend using [nvm](https://github.com/nvm-sh/nvm) for installing both Node.js and NPM.

To install the project's dependencies, run:

```
cd ..
npm ci
```

Since the dependencies of `discojs-core`, `discojs-web` and `discojs-node` are the same, they are specified in a top-level `package.json` file, to ease installation and building.

> **⚠ WARNING: Apple Silicon.**
> `TensorFlow.js` version `3` do support M1 processors for macs. To do so, make sure you have an `arm` Node.js executable installed (not `x86_64`). It can be checked using:

```
node -p "process.arch"
```

which should return something similar to `arm64`.

## Build

The server and CLI modules, as well as all unit tests (except Cypress) use the `discojs-web` interface, i.e. they all run on Node.js. This Disco.js Node module is build on top of and extends `discojs-core`, whose code is [symlinked](https://en.wikipedia.org/wiki/Symbolic_link) into `discojs-web/src/core`. To build this project:

```
npm run build
```

This invokes the TypeScript compiler (`tsc`). It will output the compilation files of `discojs-web` in a `dist/` directory. To recompile from stratch, simply `rm -rf dist/` before running `npm run build` again.

## Development

### Contributing

Contributions to `discojs-web` must only include browser-specific code. Code common to both the browser and Node.js must be added to `discojs-core` instead.

As a rule of thumb, the `src/core/` directory must never be modified when modifying `discojs-web`, since it is [symlinked](https://en.wikipedia.org/wiki/Symbolic_link) to `discojs-core`.

If you wish to add a new file or submodule to the project, please do so in a similar way as `src/core/` is structured. That is, [adding a new task](../../docs/TASK.md) to `discojs-web` would mean adding a new file to `src/tasks/` and modifying `src/tasks/index.ts` (NOT `src/core/tasks/...`).

Note that, if you end up making calls to the Tensorflow.js API, you must import it from the root index. This is to ensure the Node version of TF.js is loaded, and only once.