<div align="center">
  <h1>DISCO <code>developer guide</code></h1>
  <p>
    <a href="https://github.com/epfml/disco/actions/workflows/lint-test-build.yml"><img src="https://github.com/epfml/disco/actions/workflows/lint-test-build.yml/badge.svg" alt="build status" /></a>
    <a href="https://github.com/epfml/disco/actions/workflows/deploy-server.yml"><img src="https://github.com/epfml/disco/actions/workflows/deploy-server.yml/badge.svg" alt="build status" /></a>
  </p>
  </br>

</div>

Welcome to the DISCO developer guide. 
Here you will have a first overview of the project, how to install and run an instance of DISCO and links to further documentation.

## Structure

The DISCO project is composed of multiple parts. At the root level, there are four main folders: `discojs`, `server`, `web-client` and `cli`.

- `discojs` is the main library, containing federated and decentralized learning logic allowing one to train and use machine learning models. The library itself is composed of `disco-node` and `disco-web`, both of them extending the platform-agnostic logic in `disco-core`. In other words, `disco-core` contains most of the implementation but can't be used by itself, while `disco-web` and `disco-node` allow using `disco-core` via different technologies. To some extents, you can think of `disco-core` as an abstract class extended by `disco-web`and `disco-node`.
    - `disco-node` allows one to use the `discojs` library with Node.js. For example, the `server` and the `cli` rely on `disco-node`. A user can also directly import the `disco-node` package in their Node.js programs.
    - `disco-web` allows using `discojs` through a browser. The `web-client`, discussed below, relies on `disco-web` to implement a browser UI.
      
  The main difference between the two is how they handle storage: a browser doesn't have access to the file system (for security reasons) while a Node.js application does.
- `server` contains the server implementation necessary to use the `discojs` library. Indeed, while the federated and decentralized learning logic is implemented in `discojs`, we still need a server to orchestrate users in both paradigms. In decentralized learning, the server exposes an API for users to query the necessary information to train models in a decentralized fashion, such as the list of other peers. Thus, the server never receives training data or model parameters. In federated learning, the server receives model updates but never training data. It keeps track of participants and updates the model weights. A `server` instance is **always** necessary to use DISCO, whether one is using a browser UI, the CLI or directly programming with `disco-node`.
- `web-client` implements a browser User Interface. In other words, it implements a website allowing users to use DISCO without coding. Via the browser, a user can create and participate in federated and decentralized training sessions, evaluate models, etc.
- `cli` contains the Command Line Interface for `discojs`. For example, the CLI allows a user to create and join in training sessions from the command line, benchmark performance by emulating multiple clients, etc.

Here is a summary diagram:

```mermaid
flowchart LR
  subgraph discojs
    discojs-node-->|extends|discojs-core;
    discojs-web-->|extends|discojs-core;
  end
  subgraph User Interface
    web-client-->|uses|discojs-web;
    custom_browser["custom browser implementation"]-->|uses|discojs-web;
    server-->| uses |discojs-node;
    cli-->|uses|discojs-node;
    custom_node["custom Node.js scripts"]-->|uses|discojs-node;
  end
``` 

## Installation guide

The following instructions will install the required dependencies, build `discojs` and launch a DISCO server and a web client. If you run into any sort of trouble check our [FAQ](./docs/FAQ.md); otherwise please create a new issue or feel free to ask on [our slack](https://join.slack.com/t/disco-decentralized/shared_invite/zt-fpsb7c9h-1M9hnbaSonZ7lAgJRTyNsw). 

1. We recommend using [nvm](https://github.com/nvm-sh/nvm) (Node Version Manager) to handle multiple Node.js versions. Start by installing `nvm` by following [their installation instructions](https://github.com/nvm-sh/nvm).
After installation, you should be able to run
```
nvm -v
0.39.7 # my nvm version at the time
```
2. Install Node.js version 16
```
nvm install 16
```
You can now choose which Node.js version to use:
```
nvm use 16
```
Using Node.js v16 should automatically set your [npm](https://docs.npmjs.com/about-npm) (Node Package Manager, different from n**v**m) version to 8:
```
npm --version
8.xx.xx
```
`nvm` manages your different Node.js versions while `npm` handles your different Node.js project packages within one version.

3. Clone the repository
```
git clone git@github.com:epfml/disco.git
cd disco
```

4. Run the installation script
```
sh install.sh
```

<details>
  <summary><b>What does <code>install.sh</code> do?</b></summary>
  </br>
  The installation script installs the dependencies required by the different parts of the project, which are described in the Structure section.
  It first installs the `discojs` library dependencies, notably, tensorflow.js, and anything else required for federated and decentralized learning logic. 
  The script then builds the library, a step necessary to compile TypeScript into JavaScript.
  
  ```
  cd discojs
  npm ci # stands for `clean install`, to ensure than only expected dependencies are being installed.
  npm run build
  ```
  The script then installs dependencies for the web client, which implements a browser UI.
  By default, the project points to the [@epfml/disco-web](https://www.npmjs.com/package/@epfml/discojs) package published on the `npm` remote repository. In a development environment, we want to use the local web client in the `discojs/web-client` folder. To do so, we need to link the local folder as the actual dependency.
  
  ```
  cd ../web-client
  npm ci
  npm link ../discojs/discojs-web
  ```
  You can verify than the link is effective by checking that `npm ls` lists `@epfml/discojs@x.x.x -> ./../discojs/discojs-web`.

  Similarly, we install the server dependencies, and then the `discojs-node` dependency to the local folder rather than the remote npm package [@epfml/disco-node](https://www.npmjs.com/package/@epfml/discojs-node).
  ```
  cd ../server
  npm ci
  npm link ../discojs/discojs-node
  ```
  Finally, we install `ts-node` globally in order to compile and run TypeScript code in a single command from anywhere.
  ```
  npm install -g ts-node
  ```
  
</details>

5. Launch DISCO
   
As you may have seen, there are many ways to use DISCO. Here we will run a server and a web client. From there, a user can use DISCO from their browser.
* First launch a `server` instance, which is used for federated and decentralized learning tasks, e.g. to list peers participating in a decentralized task.
```
cd server
npm run dev
```
The server should be listening on `http://localhost:8080/`.
* Secondly, start a web client, which will allow you to use DISCO from your browser. You may have to do so **from another terminal** since the previous one is now used by the server.
```
cd web-client
npm run dev
```
The web-client should be running on `http://localhost:8081`, if not restart the web client (and the server if needed).

*Note: It is important to first start the server and then the web client to ensure that they are listening to ports 8080 and 8081 respectively.*

**You can now access DISCO at http://localhost:8081/**


## Further documentation

* For further technical information our [onboarding document](./docs/ONBOARDING.md) gives a deeper introduction to the codebase and the `discojs-core` implementation and the [Architecture guide](./docs/ARCHITECTURE.md) explains more on the use of TypeScript and Vue.js, our frontend framework.
* If you are planning to contribute to the codebase, have a look at the [contributing guide](./docs/CONTRIBUTING.md).
* A stand-alone example running two federated users can be found [here](./docs/node_example). The example runs with Node.js outside any browser, using the `@epfml/discojs-node` NPM package and the `server` module. A DISCO server is launched by the script itself and the data is already available in the repo.
* Finally, see the respective module README files for more precise information on the different parts of the project: [discojs-core](./discojs/discojs-core/README.md), [discojs](./discojs/discojs/README.md), [discojs-node](./discojs/discojs-node/README.md), [server](./server/README.md), [web-client](./web-client/README.md) and [cli](./cli/README.md).
  
