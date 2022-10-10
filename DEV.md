<div align="center">
  <h1><code>Disco</code></h1>

  <p>
    <strong>Distributed collaborative learning</strong>
  </p>

  <p>
    <a href="https://github.com/epfml/disco/actions/workflows/lint-test-build.yml"><img src="https://github.com/epfml/disco/actions/workflows/lint-test-build.yml/badge.svg" alt="build status" /></a>
    <a href="https://github.com/epfml/disco/actions/workflows/deploy-server.yml"><img src="https://github.com/epfml/disco/actions/workflows/deploy-server.yml/badge.svg" alt="build status" /></a>
  </p>
  </br>

</div>

Welcome to the Disco🔮 developer guide. 

If you want to get an in depth guide of how to run things (and why and how they work) you can have a look at our [on boarding](./information/ONBOARDING.md) document

To quickly get up and running you can find some relevant information here as well as in the [server](server/README.md) document.

If you run into any sort of trouble then hopefully you can find an answer in our [faq](information/FAQ.md); otherwise please create a new issue. If you want to contribute to Disco🔮, then please have a look at our [contributing](information/CONTRIBUTING.md) guide; and if you are curious about our architecture you can find information [here](information/ARCHITECTURE.md).

## Structure

Disco is composed of six parts, among which three compose the Disco.js library:

1. [discojs-core](discojs-core/README.md) The core library for Disco.js, used by both `discojs-node` and `discojs` 
2. [discojs](discojs/README.md) The Disco.js library for the browser environment, based off and extending `discojs-core` 
3. [discojs-node](discojs-node/README.md) The Disco.js library for Node.js, based off and extending `discojs-core`
4. [server](server/README.md) The Node.js server for p2p coordination or federated learning, using  `discojs-node `
5. [browser](browser/README.md) The client UI for use in browser, using `discojs`
6. [benchmark](benchmark/README.md) The CLI tool for Disco.js, using `discojs-node`

The three parts should be built in the above order, using the node package manager.

## Quick-start guide

We recommend using [nvm](https://github.com/nvm-sh/nvm) (the Node Version Manager)

1. `git clone git@github.com:epfml/disco.git`
2. `cd disco`
3. `nvm use && nvm current`, check that the Node.js version is indeed v16.x.x
4. `cd discojs-core && npm ci && npm run build`, check that the `dist` directory indeed contains `browser` and `node` compilation files
5. `cd discojs-node && npm ci && npm run build`
6. `cd discojs && npm ci && npm run build`
7. `cd server && npm ci && npm run dev`, check that the server is indeed running on localhost:8080
8. `cd browser && npm ci && npm run dev`, check that the server is indeed running on localhost:8081
9. `cd benchmark && npm ci`

For full details, see the respective readme files linked above, that is [discojs-core](discojs-core/README.md), [discojs](discojs/README.md), [discojs-node](discojs-node/README.md), [server](server/README.md), [browser](browser/README.md) and [benchmark](benchmark/README.md).

## Example

 A full -- self contained -- example of the discojs API running two federated users can be found [here](server/example). This runs on Node.js outside of any browser. A small helper server is run from the script itself and the data is already available in the repo.
