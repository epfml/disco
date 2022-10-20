# Disco.js Core Module

`discojs-core` contains the core, platform-agnostic code of Disco.js, used by both `discojs-web` and `discojs-node`.

## Installation

The dev tools run on Node.js and require `npm`, a package manager for the Node.js runtime environment.
We recommend using [nvm](https://github.com/nvm-sh/nvm) for installing both Node.js and NPM.

To install the project's dependencies, run the following commands:

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

## Development

### Using Disco.js

This project is destined to be used by the two actual packages we offer on NPM: `@epfml/discojs` and `@epfml/discojs-node`, corresponding to the `discojs-web` and `discojs-node` projects, respectively. Thus, you should only interact with this project when directly contributing to Disco.js. See the [discojs-web](../discojs/README.md) and [discojs-node](../discojs-node/README.md) READMEs for more info.

### Contributing

Contributions to `discojs-core` must only contain platform-agnostic code, i.e. code able to run on either Node or the browser.

Note that, if you end up making calls to the Tensorflow.js API, you must import it from the root index. This is to ensure the right version of TF.js is loaded (depending on the compilation `dist/`), and only once. The only exception occurs in unit tests, which should import TF.js from the (local) `@epfml/discojs-node`, since those run on Node.js.