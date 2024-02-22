# Contributing guide

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
* After modifying `discojs`, it is currently necessary to rebuild the library for the changes to be effective (no hot reloading):
```
npm -w discojs run build # rebuilds disco-core, disco-node and disco-web
```
I recommend using the watch command to re-build the library on every change:
```
npm -w discojs run watch build
```
* Both `server` and `web-client` work with hot reloading, i.e., once the backends are running, any code modification is automatically taken into account:
```
npm -w server run start # you can modify the code while this command is running
npm -w web-client run start # from another terminal
```

#### Naming conventions

* TypeScript files should be written in snake_case, lowercase words separated by underscores, e.g. `event_connection.ts`
* Vue.js files should be written in PascalCase (capitalized words including the first), e.g. `DatasetInput.vue`
* Classes and types should also be written in PascalCase. For example class `AsyncInformant` and type `MetadataValue`
* Functions and variable names should be written in camelCase, starting with a lowercase letter: function `isWithinRoundCutoff` and variable `roundCutoff`


#### Docstring

Write docstring in the [JSDoc](https://jsdoc.app/) style. For reference: [list of JSDoc tags supported in TypeScript](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html).

### 3. Testing your code

We use the testing framework [mocha](https://mochajs.org/) and the [chai](https://www.chaijs.com/) assertion library.
To write tests for a code file `<filename>.ts`, create a `<filename>.spec.ts` file. This way, tests will be executed automatically for continuous integration.
Each part of DISCO has a respective test suite:
* `discojs` needs to have a `server` instance to be tested:
```
npm -w server run start
npm -w discojs test # from another terminal
```
* **However**, to test the `server` make sure no `server` instance is already running. Port 8080 should be free and available.
```
npm -w server test
```
* No `server` instance is needed to test the `web-client`:
```
npm -w web-client test
```

### 4. Draft PR

Once you have added a minimum number of content to your branch, you can create a [draft PR](https://github.blog/2019-02-14-introducing-draft-pull-requests/). Create a pull request to merge your branch (e.g., `202-train-bug-nacho`) into the `develop` branch. `develop` should always be functional and up to date with new working features. It is the equivalent of the `main`or `master` branch in DISCO.
It is important to give a good description to your PR as this makes it easier for other people to go through it.

> [!TIP]
> [This PR](https://github.com/epfml/disco/pull/176) is a good example.

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
