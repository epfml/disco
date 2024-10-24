# Contributor guide

This guide complements the [developer guide](../DEV.md) and gives additional information on the project, how to modify DISCO and how to contribute to the codebase.

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
> Disco is a big project and some information is probably outdated. Let us know by [opening an issue](https://github.com/epfml/disco/issues/new/choose).

## First steps

DISCO is a complex project composed of the Disco.js library (`discojs`, `discojs-node` and `discojs-web`), a front-end (`webapp`),
a `server` and a `cli` (e.g., for benchmarking). Depending on what your goal is, you might only use a subset of them, e.g. you won't need an in-depth understanding of the webapp and Vue.js to add a new decentralized learning feature. Instead, you will probably rely on the CLI.

1. If you are going to work, contribute and improve the project, I first recommend you get a good understand of what DISCO does: play around with the [website](https://discolab.ai/#/), train a model from the pre-defined tasks, or even create your own custom task. Feedback is always appreciated, feel free to let us know via the github issues/in person if you noticed any issues or thought of an improvement.

2. Then, get a high-level understanding of the different parts of the projects in the [developer guide](../DEV.md), even if you're planning on working on a subset of the project. If you want to know more about a specific part of the project, refer to the table of contents at the end of the DEV guide.

3. Follow the installation instructions from the [developer guide](../DEV.md) to launch a DISCO instance running in your browser.

> [!TIP]
> The most common issues with running DISCO are usually due to using old Node.js versions and setting the appropriate environment on M1 Macs, see [our FAQ](./FAQ.md) for more troubleshooting. Note that DISCO has been not tested on Windows (only Linux and macOS).

There are many ways to use Disco.js: from a browser, a CLI, by importing `discojs-node` in your own Node.js scripts and applications or from your own UI implementation. Note that whatever your setting, using Disco.js always requires a `server` instance. Some cases like the CLI starts a server instance automatically, but others like the webapp doesn't and require either an existing instance or to have you launch a local server instance. As described in the [`server` README file](../server/REDME.md), the server is in charge of connecting peers to the ML tasks. In order to connect and partake in a distributed training session you first need to find the session and how to join it so the sever exposes an API to that end.

## Contributing in practice

### Running TypeScript

As a contributor, you will certainly end up having to run TypeScript scripts. A practical way to do so is to use `ts-node`:

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

### Contributing to `webapp`

If you are planning to contribute to the `webapp`, have a look at [VUEJS.md](./VUEJS.md) to read more on how Vue.js is used in this project.

The `webapp` requires that an server instance is running. You can start a local one as described in the last section with:

```
npm -w server start # from the root folder
```

The webapp can now be started with:

```
npm -w webapp start # from the root folder
npm start # from the webapp folder
```

The Vue development mode supports hot-reloading via `vite` and the client will automatically restart whenever a change in `webapp` is detected. Starting the Web Client should print something similar to

```
  VITE v5.2.7  ready in 1312 ms

  ➜  Local:   http://localhost:8081/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

You can access the client at the Local address from the machine running the webapp and any device on the same network can access the app with the Network address.

As said previously, modifying `discojs` isn't effective automatically and requires a build.

You can test the `webapp` with:

```
npm -w webapp test
```

The webapp tests rely on `cypress` and the test suite is located in the `webapp/cypress` folder.

Note that you can also run test interactively in the browser of your choice. To do so, run
```
cd webapp
VITE_SERVER_URL=http://server npx start-server-and-test start http://localhost:8081 'cypress open --e2e'
```
which should open the Cypress UI and let you choose the browser you wand to use and which tests to run. More information on [the Cypress docs](https://docs.cypress.io/app/get-started/open-the-app).

#### Cypress and Github Actions

It is possible to record the cypress tests ran in the Github Actions CI and visualize them in the [Cypress Cloud](cloud.cypress.io). It is currently used only when needed (because the free plan has a limited number of recordings). The [cypress documentation](https://docs.cypress.io/app/continuous-integration/github-actions) describes how to set up the recordings.

1. A Disco project has been created in the Cypress Cloud and you need to be added to the project to be able to visualize the recordings.

2. In `webapp/cypress.config.ts` you need to add the project ID, which is currently:
```js
  projectId: "aps8et"
```

3. Finally, we can set the Cypress parameters in the Github Actions workflow `.github/workflows/lint-test-build.yml`, for example:
```yaml
test-webapp:
    needs: [build-lib, build-lib-web, download-datasets]
    runs-on: ubuntu-latest
    # Runs tests in parallel with matrix strategy https://docs.cypress.io/guides/guides/parallelization
    # https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs
    # Also see warning here https://github.com/cypress-io/github-action#parallel
    strategy:
      fail-fast: false # https://github.com/cypress-io/github-action/issues/48
      matrix:
        containers: [1, 2] # Uses 2 parallel instances
    steps:
      - uses: actions/checkout@v4
        with:
          lfs: true
          submodules: true
      - uses: actions/cache@v4
        with:
          path: datasets
          key: datasets-${{ hashFiles('datasets/**') }}
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm --workspace={discojs,discojs-web} run build
      - run: npm --workspace=webapp run test:unit
      - uses: cypress-io/github-action@v6
        with:
          working-directory: webapp
          install: false
          start: npm start
          wait-on: 'http://localhost:8081' # Waits for above
          # Records to Cypress Cloud
          # https://docs.cypress.io/guides/cloud/projects#Set-up-a-project-to-record
          record: true
          parallel: true # Runs test in parallel using settings above
        env:
          VITE_SERVER_URL: http://server
          CYPRESS_RECORD_KEY: ${{ secrets.CYPRESS_RECORD_KEY }}
```

Note that `CYPRESS_RECORD_KEY` is a repository secret which has already been added.

### Contributing to `discojs`

If you are brought to modify the `discojs` folder have a look at [DISCOJS.md](./DISCOJS.md) which explains some of the concepts internal to the library.

Because TypeScript needs to be transpiled to JavaScript, you need to rebuild the `discojs` folder for changes to be effective:

```sh
npm -w discojs run build
```

The previous command invokes the TypeScript compiler (`tsc`) which successively compiles `discojs`, `discojs-node` and `discojs-web`, creating equivalent JavaScript files in the modules' respective `dist/` directory.

To automate the building phase, you can use the `watch` command to rebuild a module whenever changes are detected. The `watch` command currently only works at the level of `discojs`, `discojs-node` or `discojs-web` (i.e., running watch over the whole `discojs` folder doesn't work and would only watch `discojs`)

```sh
npm -w ./discojs run watch build
npm -w ./discojs-node run watch build # another terminal
npm -w ./discojs-web run watch build # one more terminal
```

Building is not necessary for other modules like the `server` the `webapp` or `cli` as long as no change have been made to `discojs`. However you may need to restart the `server` or the `webapp` after rebuilding `discojs`.

To test `discojs`, first make sure a server instance is running:

```
npm -w server start
```

And then start the `discojs` test suite:

```
npm -w discojs test
```

Similarly to the server, any file ending with `.spec.ts` will be ran in the test suite. As a convention, we duplicate the name of the TypeScript file we are testing. For example, `async_informant.spec.ts` tests features implemented in `async_informant.ts` and is located in the same folder.

### `discojs`, `discojs-node` and `discojs-web`

`discojs` contains the core, platform-agnostic code of Disco.js, used by both `discojs-web` and `discojs-node`. As such, contributions to `discojs` must only contain code independent of either Node or the browser. As the names subtly suggest, `discojs-node` and `discojs-web` implement features specific to Node.js and browsers respectively, mostly related to memory and data handling as browser don't allow access to the file system.

Currently, the `discojs-node` project is available as the `@epfml/discojs-node` NPM package, which can be installed with
`npm i @epfml/discojs-node` and the `discojs-web` as the `@epfml/discojs-web`.


### Debugging

> [!TIP]
> If your code changes don't seem to be effective, close everything, rebuild everything and restart. For example, changes in `discojs/src/default_tasks` requires rebuilding `discojs` and restarting the `server` to be effective.

In Disco, we rely on the widely used [`debug` library](https://github.com/debug-js/debug). To use it, we first import debug and instantiate the debug object:
```js
import createDebug from "debug";
const debug = createDebug("discojs:models:gpt:model"); // use nested namespaces
const logs = { loss: 0.01, accuracy: 0.56}
debug("Here are the GPT logs: %o", logs)
```

#### In the terminal
To visualize the logs in the command line, we need to set the `DEBUG` environment variable to choose the namespaces from which you want to see the debug statements. For example:
```bash
DEBUG='discojs:models:gpt*' npm -w cli run benchmark_gpt
```
will print the debug statement from above. Similarly if we set `DEBUG='*'`.

The server debug statements are visualized the same way, for example:
```bash
DEBUG='server*,discojs*' npm -w server start
```
shows the debug statements from anywhere in the server and in discojs.

#### Webapp

To visualize debug statements in the browser, you need to open the console (Inspect element > Console) and set the `localStorage.debug` to the namespace of your choice, for example `localStorage.debug='webapp*,discojs*'` to visualize both the debug statements from anywhere in the webapp and in discojs. Note that you may need to refresh the page for changes to localStorage to be effective.

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

#### Naming conventions

- TypeScript files should be written in snake_case, lowercase words separated by underscores, e.g. `event_connection.ts`
- Vue.js files should be written in PascalCase (capitalized words including the first), e.g. `DatasetInput.vue`
- Classes, interfaces and types should also be written in PascalCase. For example class `MeanAggregator` and interface `EventConnection`
- Functions and variable names should be written in camelCase, starting with a lowercase letter: function `isWithinRoundCutoff` and variable `roundCutoff`

#### Docstring

Write docstring in the [JSDoc](https://jsdoc.app/) style. For reference: [list of JSDoc tags supported in TypeScript](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html).

### 3. Testing your code

Test the newly implemented features locally by following instructions in the [Contributing in practice](#contributing-in-practice) section.

### 4. Draft PR

Once you have added a minimum number of content to your branch, you can create a [draft PR](https://github.blog/2019-02-14-introducing-draft-pull-requests/). Create a pull request to merge your branch (e.g., `202-train-bug-nacho`) into the `develop` branch. `develop` should always be functional and up to date with new working features. It is the equivalent of the `main`or `master` branch in DISCO.
It is important to give a good description to your PR as this makes it easier for other people to go through it.

> [!TIP] > [This PR](https://github.com/epfml/disco/pull/176) is a good example.

### 5. Before requesting a review

Once you have finished your work on your draft PR, make sure to do the following before turning it into review PR.

1. Run the adequate test suites (server, webapp, discojs).
2. Make sure you remove debugging comments / console outputs.
3. Merge (or rebase if you can do it properly) `develop` into your feature branch:

```
git checkout develop
git pull
git checkout 202-train-bug-nacho
git merge develop
# Solve potential merge conflicts
git push
```

4. Ask for your PR to be reviewed and merge it once it is approved. Delete your feature branch afterwards.

## Next steps

Depending on what you will be working on you may be interested in different documentation. Have a look at the markdown guides in `docs` and the table of content in [DEV.md](../DEV.md). Notably:

- Understanding [Disco.js inner workings](./DISCOJS.md) is key if you are planning to add a new machine learning feature or work in `discojs`
- The [Vue.js architecture guide](./VUEJS.md) explains how the browser client is implemented with Vue.js.
- Regarding cryptography and privacy, this [document](./PRIVACY.md) explains the measures DISCO takes to ensure privacy and confidentiality.
