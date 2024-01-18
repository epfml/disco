# Disco - How to contribute

## Contributing code:

The procedure for working on a feature is the following:
1. Create a new branch to work in
2. Write code along with comments and docstrings to implement a feature
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

### 2. Coding, comments and docstrings

> [!TIP]
> If you are using VSCode, you may not be able to open the editor from the repo root level without VSCode raising import errors. If that is the case, you should start VSCode from inside the module you are working.
> In practice, this is any folder level that contains a `package.json` such as `server`, `web-client`, etc.
> For example, if you are working on the CLI, you should start VSCode with the command `code cli` from the root level (or `cd cli` followed by `code .`)

Here are the main commands you may rely on in differents parts of DISCO:
* After modifying `discojs`, it is currently necessary to rebuild the library for the changes to be effective (no hot reloading):
```
cd discojs
npm run build # rebuilds disco-core, disco-node and disco-web
```
* Both `server` and `web-client` work with hot reloading, i.e., once the backends are running, any code modification is automatically taken into account:
```
cd server # (or cd web-client)
npm run dev # you can modify the code while this instance is running
```


#### Naming conventions

* TypeScript files should be written in snake_case, lowercase words separated by underscores, e.g. `event_connection.ts`
* Vue.js files should be written in PascalCase (capitalized words including the first), e.g. `DatasetInput.vue`
* Classes and types should also be written in PascalCase. For example class `AsyncInformant` and type `MetadataValue`
* Functions and variable anmes should be written in camelCase, starting with a lowercase letter: function `isWithinRoundCutoff` and variable `roundCutoff`


#### Docstrings

Write docstrings in the [JSDoc](https://jsdoc.app/) style. For reference: [list of JSDoc tags supported in TypeScript](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html).

### 3. Testing your code

We use the testing framework [mocha](https://mochajs.org/) and the [chai](https://www.chaijs.com/) assertion library.
To write tests for a code file `<filename>.ts`, create a `<filename>.spec.ts` file. This way, tests will be executed automatically for continuous integration.
Each part of DISCO has a respective test suite:
* `discojs` needs to have a `server` instance to be tested:
```
cd server
npm run start

# from another terminal if needed
cd discojs
sh test.sh
```
* Now for `server` make sure no `server` instance is already running. Port 8080 should be free and available.
```
cd server
npm run test
```
* Similarly for the `web-client`:
```
cd web-client
npm run test
```  


### 4. Draft PR

Once you have added a minimum number of content to your branch (e.g. you can see a bit where you are going), you can create a [draft PR](https://github.blog/2019-02-14-introducing-draft-pull-requests/). Create a pull request to merge your branch (e.g., `202-train-bug-nacho`) into the `develop` branch. `develop` should always be functional and up to date with new working features. It is the equivalent of the `main`or `master` branch in DISCO.
It is important to give a good description to your PR as this makes it easier for other people to go through it.

> [!TIP]
> [This PR](https://github.com/epfml/disco/pull/176) is a good example.

### 5. Before requesting a review

Once you have finished your work on your draft PR, make sure to do the following before turning it into review PR.

1. Run both the server and main test suites as described above.
2. Make sure you remove debugging comments / console outputs.
3. Merge (or rebase if you can do it properly) master into your feature branch:
```
git checkout develop
git pull
git checkout 202-train-bug-nacho
git merge develop # Solve potential merge conflicts
git push
```
4. Ask for your PR to be reviewed and merge it once it is approved. Delete your feature branch afterwards.

## FAQ

If you have a question, always go to the [FAQ](FAQ.md) first. If you do not find an answer, and eventually find a solution, then if you think this might be useful to others please add your question and answer to the FAQ.

## Appendix - Intro to TypeScript 

In order to facilitate development with JavaScript (js) we use [TypeScript](https://www.typescriptlang.org/) (ts); this adds an additional layer on top of JavaScript that allows for a deeper integration with your editor which enables you to catch errors faster.

If you know js then you basically already know ts, since js is a subset of ts, anything you can do on js, you can also do on ts. What's new is that ts has a stricter policy (these can be silenced, and so we can indeed run ts files as if they were js), here are some examples:

#### Function overloading

This would run perfectly on js

```js
function addNumbers(a, b) {
  return a + b;
}
var sum = addNumbers(15, 25, 30);
```

However in ts we get the following compile error: `Expected 2 arguments, but got 3. `.

#### Equality checks

```js
const isEqual = 20 == "20";
console.log(isEqual);
```

In js these two are equal since it tries to cast types and see if they are equal, while convenient in a small project, this can lead to hard to find bugs in larger ones. In ts this would yield the following compile error:

```
This condition will always return 'false' since the types 'number' and 'string' have no overlap.
```

#### Type annotations

TypeScript allows us to annotate the input and output of functions, this greatly simplifies using functions where types might be ambiguous, the previous function we saw could be annotate as follows in ts:

```ts
function addNumbers(a: number, b: number): number {
  return a + b;
}
var sum = addNumbers(15, 25);
```

Since we know the output type is of type number, we can safely call `sum.toPrecision(2)`, if we wanted to get the sum with 2 significant digits. If sum was not of type number (that dit not have a function called toPrecision or was of type any), then we would get a compile error: `TypeError: k.toPrecision is not a function` .

This brings us to our next comment, if we cast sum as type any, then we would get no compiler error:

```ts
var sum = "hello Disco" as any;
sum.toPrecision(2);
```

any is a special ts type that you can use when you don't want type checking errors, this is however not desirable since this would defeat the whole purpose of using ts in the first place.

Note that all these compile errors will also appear in your editor, this will allow you to easily find these bugs without having to first compile!

In vue files you simply need to add ts in the script tag to enable ts:

```vue
<script lang="ts"></script>
```

There are of course more details, but if you know js, now you should be ready for ts! If you want to learn more this [official (5min) guide](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html) is an excellent place to start.

#### Our policy

We follow the standard ts policy (which is by default flexible and not very strict) since the original code base was in js; as a consequence some files might not yet be annotated.

If you are on boarding, we strongly recommend that you annotate your functions and classes! However this is not strictly enforced, your code will run if you don't annotate it. Perhaps for a quick mock up of your code you may opt not to annotate, however when you are ready to pull request to develop we expect your functions and classes to be annotated.

In a nutshell the following will give compile errors:

- Equality checks on objects that are not of the same type.
- Overloading a function.
- If a variable is annotated or type inferred, using a non existing type function on it.
