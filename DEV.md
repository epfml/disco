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

Welcome to the Disco🔮 developer guide. To get up and running you can find the relevant information here as well as in the [server](server/README.md) document.

If you run into any sort of trouble then hopefully you can find an answer in our [faq](information/FAQ.md); otherwise please create a new issue. If you want to contribute to Disco🔮, then please have a look at our [contributing](information/CONTRIBUTING.md) guide; and if you are curious about our architecture you can find information [here](information/ARCHITECTURE.md).

## Structure

Disco is composed of three parts:

1. [discojs](discojs/README.md) The core library for disco.js
2. [server](server/README.md) The helper server for peering or federated learning, as a node application
3. [browser](browser/README.md) The client implementation for use in browser. Note that discojs is also usable directly in node.js without a browser, such as for native integration or benchmarking

The three parts should be built in the above order, using the node package manager.

## Quick-start guide

- install node 16 and ensure it is activated on opening any new terminal (e.g. `nvm use 16`)
- clone this repository
- `npm ci` within all 3 disco subfolders
- `cd discojs; rm -rf dist; npm run build`
- `cd server; npm run dev`, check that the server is indeed running on localhost:8080
- `cd browser; npm run serve`, check that the browser client is running on localhost:8081

For full details, see the respective readme files linked for the three parts above, that is [discojs](discojs/README.md), [server](server/README.md), and [browser](browser/README.md).
