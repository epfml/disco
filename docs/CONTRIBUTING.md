# Contributor guide

This guide complements the [devloper guide](../DEV.md) and gives additional information on the project, how to modify DISCO and how to contribute to the codebase.

## Onboarding

Disco has grown a lot since its early days, and like any sizeable code base, getting started is both
difficult and intimidating: there are a _lot_ of files, it's not clear what's important at first, and even where to start
is a bit of a puzzle. This document aims at giving you an efficient process to get familiar with DISCO.

The two main technologies behind DISCO are TypeScript and distributed machine learning. In the following sections I will assume that you are familiar
with both to a certain extent. If not, the following references might be useful:

- [JavaScript](https://eloquentjavascript.net)
- [TypeScript](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Federated and Decentralized Learning](https://arxiv.org/pdf/1912.04977)

> [!IMPORTANT]
> Disco is a big project and some information is probably outdated. It is now _your_ responsibility to add missing information or to let us know on [slack](https://join.slack.com/t/disco-decentralized/shared_invite/zt-fpsb7c9h-1M9hnbaSonZ7lAgJRTyNsw)!

## First steps

DISCO is a complex project composed of the Disco.js library (`discojs`), a front-end (`web-client`),
a `server` and a `cli` (e.g., for benchmarking). Depending on what your goal is, you might only use a subset of them, e.g. you won't need an in-depth understanding of the web-client and Vue.js to add a new decentralized learning feature. Instead, you will probably rely on the CLI.

1. If you are going to work, contribute and improve the project, I first recommend you get a good understand of what DISCO does: play around with the [website](https://epfml.github.io/disco/#/), train a model from the pre-defined tasks, or even create your own custom task. Feedback is always appreciated, feel free to let us know on slack/in the github issues/in person if you noticed any issues or thought of an improvement.

2. Then, get a high-level understanding of the different parts of the projects in the [developer guide](../DEV.md), even if you're planning on working on a subset of the project. If you want to know more about a specific part of the project, refer to the table of contents at the end of the DEV guide.

3. Follow the installation instructions from the [developer guide](../DEV.md) to launch a DISCO instance running in your browser.

> [!TIP]
> The most common issues with running DISCO are usually due to using old Node.js versions and setting the appropriate environment on M1 Macs, see [our FAQ](./FAQ.md) for more troubleshooting. Note that DISCO has been not tested on Windows (only Linux and macOS).

As mentioned in the [developer guide](../DEV.md), there are many ways to use Disco.js: from a browser, a CLI, by importing `discojs-node` in your own Node.js scripts and applications or from your own UI implementation. Note that whatever your setting, using Disco.js always requires a `server` instance. Some cases like the CLI starts a server instance automatically, but others like the web-client doesn't and require either an existing instance or to have you launch a local server instnace. As described in the [`server` README file](../server/REDME.md), the server is in charge of connecting peers to the ML tasks. In order to connect and partake in a distributed training session you first need to find the session and how to join it so the sever exposes an API to that end.

## Contributing in practice

### Running TypeScript

As a contributor, you will certainly end up having to run TypeScript scripts. A practical way to do so is to use on ts-node:

```
npm i -g ts-node # globally to run scripts from anywhere
ts-node your_script.ts
```

### Contributing to `server`

You can start a `server` instance locally with:

```
npm -w server start
```

Running the server relies on `nodemon` which watches the module for changes and enables hot-reloading. Therefore, any (saved) code change is automatically taken into account and doesn't require a build. However, note that modifying `discojs` isn't effective automatically and requires a build. You may have to restart the server manually after rebuilding `discojs`. Section [Building `discojs`](#building-discojs) discusses this in more details.

You can test the server with:

```
npm -w server test
```

Make sure you are not running a server at the same time as the test suite will launch its own instance. We use [mocha](https://mochajs.org/), [chai](https://www.chaijs.com/) and [supertest](https://github.com/visionmedia/supertest) for testing; respectively they are libraries for unit tests, assertions, and http testing.

Server tests live in the `server/tests/` folder. All files ending with the `.spec.ts` extension written in this folder will be run as tests. Simply write a new `your_own_test.spec.ts` file to include it in the testing pipeline.

### Contributing to `web-client`

If you are planning to contribute to the `web-client`, have a look at [VUEJS.md](./VUEJS.md) to read more on how Vue.js is used in this project.

The `web-client` requires that an server instance is running. You can start a local one as described in the last section with:

```
npm -w server start # from the root folder
```

The web-client can now be started with:

```
npm -w web-client start # from the root folder
npm start # from the web-client folder
```

The Vue development mode supports hot-reloading via `nodemon` and the client will automatically restart whenever a change in `web-client` is detected. Starting the Vue client should print something similar to

```
App running at:
  - Local:   http://localhost:8081/
  - Network: http://192.168.43.231:8081/
```

You can acess the client at the Local address from the machine running the web-client and any device on the same network can access the app with the Network address.

As said previously, modifying `discojs` isn't effective automatically and requires a build. You may have to restart the `web-client` manually after rebuilding `discojs`. Section [Building `discojs`](#building-discojs) discusses this in more details.

You can test the `web-client` with:

```
npm -w web-client test
```

### Contributing to `discojs`

If you are brought to modify the `discojs` folder have a look at [DISCOJS.md](./DISCOJS.md) which explains some of the concepts internal to the library.

Because TypeScript needs to be transpiled to JavaScript, you need to rebuild the `discojs` folder for changes to be effective:

```sh
npm -w discojs run build
```

The previous command invokes the TypeScript compiler (`tsc`) which successively compiles `discojs-core`, `discojs-node` and `discojs-web`, creating equivalent JavaScript files in the modules' respective `dist/` directory.

To automate the building phase, you can use the `watch` command to rebuild a module whenever changes are detected. The `watch` command currently only works at the level of `discojs-core`, `discojs-node` or `discojs-web` (i.e., running watch over the whole `discojs` folder doesn't work and would only watch `discojs-core`)

```sh
npm -w ./discojs/discojs-core run watch build
npm -w ./discojs/discojs-node run watch build # another terminal
npm -w ./discojs/discojs-web run watch build # one more terminal
```

Building is not necessary for other modules like the `server` the `web-client` or `cli` as long as no change have been made to `discojs`. However you may need to restart the `server` or the `web-client` after rebuilding `discojs`.

To test `discojs`, first make sure a server instance is running:

```
npm -w server start
```

And then start the `discojs` test suite:

```
npm -w discojs test
```

Simiarly to the server, any file ending with `.spec.ts` will be ran in the test suite. As a convention, we duplicate the name of the TypeScript file we are testing. For example, `async_informant.spec.ts` tests features implemented in `async_informant.ts` and is located in the same folder.

### `discojs-core`, `discojs-node` and `discojs-web`

`discojs-core` contains the core, platform-agnostic code of Disco.js, used by both `discojs-web` and `discojs-node`. As such, contributions to `discojs-core` must only contain code independent of either Node or the browser. As the names subtly suggest, `discojs-node` and `discojs-web` implement features specific to Node.js and browsers respectively, mostly related to memory and data handling as browser don't allow access to the file system.

Note that, if you end up making calls to the Tensorflow.js API, you must import it from the root index. This is to ensure the right version of TF.js is loaded (depending on the compilation `dist/`), and only once. The only exception occurs in unittests, which should import TF.js from the (local) `@epfml/discojs-node`, since those run on Node.js.

Currently, the `discojs-node` project is available as the `@epfml/discojs-node` NPM package, which can be installed with
`npm i @epfml/discojs-node` while the `discojs-web` project is available as the `@epfml/discojs` (and **not** as `@epfml/discojs-web`) NPM package, which can be installed with `npm i @epfml/discojs`.

## Contributing conventions

The procedure for working on a feature is the following:

1. Create a new branch to work in
2. Write code along with comments and docstring to implement a feature
3. Write tests for the feature
4. Create a draft pull request (PR)
5. Run the test suites and clean your code
6. Request a review and jump back back to 2. if needed
7. Merge the PR

### 1. Creating a new branch

Once you start working on a feature, create a new branch from the `develop` branch, and use the following convention: `IssueNumber-Key-Word-YourName`.
So for example, if I am working on issue #202, which is related to fixing a train bug I would call this branch: `202-train-bug-nacho`

From your local repository:

```
# currently in branch `develop`
git checkout -b 202-train-bug-nacho
```

Once you've committed some changes, push the new branch to the remote (`origin` here):

```
git push -u origin 202-train-bug-nacho
```

`-u`, short for `--set-upstream`, makes the remote branch (`origin/202-train-bug-nacho`) track your local branch (`202-train-bug-nacho`)

### 2. Coding, comments and docstring

Here are the main commands you may rely on in different parts of DISCO, see more information in [ONBOARDING.md](./ONBOARDING.md):

- After modifying `discojs`, it is currently necessary to rebuild the library for the changes to be effective (no hot reloading):

```
npm -w discojs run build # rebuilds disco-core, disco-node and disco-web
```

I recommend using the watch command to re-build the library on every change:

```
npm -w discojs run watch build
```

- Both `server` and `web-client` work with hot reloading, i.e., once the backends are running, any code modification is automatically taken into account:

```
npm -w server run start # you can modify the code while this command is running
npm -w web-client run start # from another terminal
```

#### Naming conventions

- TypeScript files should be written in snake_case, lowercase words separated by underscores, e.g. `event_connection.ts`
- Vue.js files should be written in PascalCase (capitalized words including the first), e.g. `DatasetInput.vue`
- Classes and types should also be written in PascalCase. For example class `AsyncInformant` and type `MetadataValue`
- Functions and variable names should be written in camelCase, starting with a lowercase letter: function `isWithinRoundCutoff` and variable `roundCutoff`

#### Docstring

Write docstring in the [JSDoc](https://jsdoc.app/) style. For reference: [list of JSDoc tags supported in TypeScript](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html).

### 3. Testing your code

We use the testing framework [mocha](https://mochajs.org/) and the [chai](https://www.chaijs.com/) assertion library.
To write tests for a code file `<filename>.ts`, create a `<filename>.spec.ts` file. This way, tests will be executed automatically for continuous integration.
Each part of DISCO has a respective test suite:

- `discojs` needs to have a `server` instance to be tested:

```
npm -w server run start
npm -w discojs test # from another terminal
```

- **However**, to test the `server` make sure no `server` instance is already running. Port 8080 should be free and available.

```
npm -w server test
```

- No `server` instance is needed to test the `web-client`:

```
npm -w web-client test
```

### 4. Draft PR

Once you have added a minimum number of content to your branch, you can create a [draft PR](https://github.blog/2019-02-14-introducing-draft-pull-requests/). Create a pull request to merge your branch (e.g., `202-train-bug-nacho`) into the `develop` branch. `develop` should always be functional and up to date with new working features. It is the equivalent of the `main`or `master` branch in DISCO.
It is important to give a good description to your PR as this makes it easier for other people to go through it.

> [!TIP] > [This PR](https://github.com/epfml/disco/pull/176) is a good example.

### 5. Before requesting a review

Once you have finished your work on your draft PR, make sure to do the following before turning it into review PR.

1. Run both the server and main test suites as described in the [Testing Section](#3-testing-your-code).
2. Make sure you remove debugging comments / console outputs.
3. Merge (or rebase if you can do it properly) `develop` into your feature branch:

```
git checkout develop
git pull
git checkout 202-train-bug-nacho
git merge develop # Solve potential merge conflicts
git push
```

4. Ask for your PR to be reviewed and merge it once it is approved. Delete your feature branch afterwards.

## Next steps

Depending on what you will be working on you may be interested in different documentation. Have a look at the markdown guides in `docs`. Notably:

- Understanding [Disco.js inner workings](./DISCOJS.md) is key if you are planning to add a new machine learning feature or work in `discojs`
- The [Vue.js architecture guide](./VUEJS.md) explains how the browser client is implemented with Vue.js.
- Regarding cryptography and privacy, this [document](./PRIVACY.md) explains the measures DISCO takes to ensure privacy and confidentiality.
