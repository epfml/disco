<div align="center">
  <h1><code>DISCO</code></h1>

  <p>
    <strong>Distributed collaborative learning</strong>
  </p>

  <p>
    <a href="https://github.com/epfml/disco/actions/workflows/lint-test-build.yml"><img src="https://github.com/epfml/disco/actions/workflows/lint-test-build.yml/badge.svg" alt="build status" /></a>
    <a href="https://github.com/epfml/disco/actions/workflows/deploy-server.yml"><img src="https://github.com/epfml/disco/actions/workflows/deploy-server.yml/badge.svg" alt="build status" /></a>
  </p>
  </br>

</div>

Welcome to the DISCO developer guide. 

If you want to get an in depth guide of how to run things (and why and how they work) you can have a look at our [on boarding](./docs/ONBOARDING.md) document

To quickly get up and running you can find some relevant information here as well as in the [server](./server/README.md) document.

If you run into any sort of trouble then hopefully you can find an answer in our [FAQ](./docs/FAQ.md); otherwise please create a new issue. If you want to contribute to DISCO, then please have a look at our [contributing guide](./docs/CONTRIBUTING.md); and if you are curious about our architecture you can find more information [here](./docs/ARCHITECTURE.md).

## Quick-start guide

The following command lines will install the required dependencies, build disco.js and start the DISCO server (on `localhost:8080`) and the DISCO web client (on `localhost:8081`). We recommend using (and assume you are) [nvm](https://github.com/nvm-sh/nvm) (the Node Version Manager).


```
git clone git@github.com:epfml/disco.git
cd disco
nvm use
cd discojs && npm ci && npm run build
cd ..
cd server && npm ci && npm run dev
cd ..
cd web-client && npm ci && npm run dev
```

For full details, see the respective README files, that is [discojs-core](./discojs/discojs-core/README.md), [discojs](./discojs/discojs/README.md), [discojs-node](./discojs/discojs-node/README.md), [server](./server/README.md), [web-client](./web-client/README.md) and [cli](./cli/README.md).

## Structure

The Disco GitHub repository is composed of four main directories:

- [discojs](./discojs/README.md) contains Disco.js, the main library used by the other projects within this repo. It is also available as standalone libraries on NPM, for both the browser and Node.js.
  - [discojs-web](./discojs/discojs-web/README.md) contains the browser implementation of the Disco.js library. It is available on NPM as `@epmfl/discojs`.
  - [discojs-node](./discojs/discojs-node/README.md) contains the Node.js implementatino of the Disco.js library. It is available on NPM as `@epfml/discojs-node`.
  - [discojs-core](./discojs/discojs-core/README.md) contains code common to `discojs-web` and `discojs-node`. Little source code changes between the two implementations, hence the need for a "core" directory.
- [server](./server/README.md) contains the Node.js server for Disco, enabling the decentralized (with peer-to-peer coordination) and federated learning of Disco.js nodes. It uses `discojs-node` under the hood.
- [web-client](./web-client/README.md) contains a web client to interact with Disco.js and the Disco server via a user-friendly UI. This basically emulates a Disco.js node in the network. It uses `discojs-web` as backend.
- [cli](./cli/README.md) contains the CLI tool for Disco.js. Just like `web-client`, it emulates a Disco.js node in the network. Furthermore, it can actually emulate multiple nodes and even manages its own Disco server instance. It uses `discojs-node` under the hood.

## Example

A full -- self-contained -- examples of the Disco.js API running two federated users can be found [here](./docs/node_example). This runs on Node.js outside of any browser, using the `@epfml/discojs-node` NPM package and the `server` module of this repo. A Disco server is run from the script itself and the data is already available in the repo.
