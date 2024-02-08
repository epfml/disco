# Onboarding

Disco has grown a lot since its early days, and like any sizeable code base, getting started is both
difficult and intimidating: there are a *lot* of files, it's not clear what's important at first, and even where to start 
is a bit of a puzzle. This document aims at giving you an efficient process to get familiar with DISCO.

The two main technologies behind DISCO are TypeScript and distributed machine learning. In the following sections I will assume that you are familiar 
with both to a certain extent. If not, the following references might be useful:

- [JavaScript](https://eloquentjavascript.net)
- [TypeScript](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Federated and Decentralized Learning](https://arxiv.org/pdf/1912.04977)

> [!IMPORTANT]
> Disco is a big project and some information has probably been omitted or is outdated. It is now *your* responsibility to add missing information or let us know on [slack](https://join.slack.com/t/disco-decentralized/shared_invite/zt-fpsb7c9h-1M9hnbaSonZ7lAgJRTyNsw)!

## First steps

DISCO this is a complex project composed of the Disco.js library (`discojs`), a front-end (`web-client`),
a `server` and a `cli` (e.g., for benchmarking). Depending on what your goal is, you might only use a subset of them, e.g. you won't need an in-depth understanding of the web-client and Vue.js to add a new decentralized learning feature. Instead, you will probably rely on the CLI.

1. If you are going to work, contribute and improve the project, I first recommend you get a good understand of what DISCO does: play around with the [website](https://epfml.github.io/disco/#/), train a model from the pre-defined tasks, or even create your own custom task. Feedback is always appreciated, feel free to let us know on slack/in the github issues/in person if you noticed any issues or thought of an improvement.

2. Then, get a high-level understanding of the different parts of the projects in the [developer guide](../DEV.md), even if you're planning on working on a subset of the project. If you want to know more about a specific part of the project, refer to the table of contents at the end of the DEV guide.
   
3. Follow the installation instructions from the [developer guide](../DEV.md) to launch a DISCO instance working in your browser.

> [!TIP]
> The most common issues with running DISCO are usually due to using old Node.js versions and setting the appropriate environment on M1 Macs, see [our FAQ](./FAQ.md) for more troubleshooting. Note that DISCO has been not tested on Windows (only Linux and macOS).

As mentioned in the [developer guide](../DEV.md), there are many ways to use Disco.js: from a browser, a CLI, by importing `discojs-node` in your own Node.js scripts and applications, from your own UI implementation, etc. Note that whatever your setting, using Disco.js always requires running a `server` instance. As described in the [`server` README file](../server/REDME.md), the server is in charge of connecting peers to the ML tasks. In order to connect and partake in a distributed training session you first need to find the session and how to join it, the sever exposes an API to that end.

### Things to know

As a contributor, you will certainly end up having to run TypeScript scripts. A practical way to do so is to use on ts-node:
```
npm i -g ts-node # globally to run scripts from anywhere
ts-node your_script.ts
```

Because TypeScript needs to be transpiled to JavaScript, you need to rebuild the `discojs` folder every time you make any changes to it:
``` js
cd discojs
npm run build
```

When cloning the repo, the server and the web-client points to the [@epfml/disco-node](https://www.npmjs.com/package/@epfml/discojs-node) and the [@epfml/disco-web](https://www.npmjs.com/package/@epfml/discojs) packages respectively published on the `npm` remote repository. In a development environment, we want to use the local implementations in the `discojs/discojs-node` and `discojs/discojs-web` folders for changes to take effect immediately. To do so, we need to link the local folders as the actual dependencies:
```
cd server 
npm link ../discojs/discojs-node
cd ../web-client 
npm link ../discojs/discojs-web
```
You can verify than the links are effective by checking that running `npm ls` from the `server` folder lists `@epfml/discojs@x.x.x -> ./../discojs/discojs-node` in server and `@epfml/discojs@x.x.x -> ./../discojs/discojs-web` in the web-client.

> [!TIP]
> If you are using VSCode, know that you may not be able to open the editor from the repo root level without VSCode raising imports errors. If that is the case, you should start VSCode from inside the module you are working.
> In practice, that is any folder level that contains a `package.json` such as `server`, `web-client`, etc.
> For example, if you are working on the CLI, you should start VSCode with the command `code server` from the root level (or `cd server; code .`)

Next you will find instructions and documentation on how to run DISCO in different settings. 

### Using DISCO from the `web-client`

Instructions on how to use the `web-client` can be found in the [developer guide](../DEV.md#installation-guide). More information, for example on how to run the client in developer mode, can be found in the [`web-client` README](../web-client/README.md).

### Using DISCO from the `cli`

The CLI is currently not working. Until then, you can find more information in the [`cli` README](../cli/README.md).

### Using DISCO from a script - Standalone example

A standalone example of disco can be found [in this folder](./node_example), with code and documentation.

### Next steps

1. If you are planning to contribute to the project you should read the [contributing guide](./CONTRIBUTING.md)
2. Depending on what you will be working on you may be interested in different documentation. Have a look at the markdown guides in `docs`. Notably:
   * Understanding [Disco.js inner workings](./DISCOJS.md) is key if you are planning to add a new machine learning feature and work in `discojs`
   * The [Vue.js architecture guide](./VUEJS.md) explains how the browser client is implemented with Vue.js.
   * Are you going to work on cryptography or privacy? This [document](./PRIVACY.md) explains the measures DISCO takes to ensure privacy and confidentiality.
