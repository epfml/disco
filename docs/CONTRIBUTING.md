# Disco - How to contribute

## TODO list

To get an overview of who is working on what we use the [project](https://github.com/epfml/disco/projects/7) feature of GitHub as described earlier, this gives us a table with the current TODOs, what is currently being worked on, and what has been finished.

Each note in the the project can be linked to an issue by tagging it, e.g. add #202 in the note content. You cannot assign yourself a note, but you can assign yourself an issue, which is how we can keep track of who is working on what feature.

> **Tip** : When creating a new issue, on the right hand side, under the assignees menu, you can also add a project, if you add the `TODO` project, this will directly create a note in our project with the issue

The project link can be found [here](https://github.com/epfml/disco/projects/7)

## Contributing code:

The procedure for working on a feature is the following:
1. Create a new branch to work in.
2. Write code, comments / docstrings, and tests to implement the feature.
3. Create a draft PR.
4. Run the test suites and clean your code.
5. Request a review and iterate based on the comments.
6. Your PR is merged into the `develop` branch.

### Create a new branch to work in

Once you start working on a feature, create a new branch from the `develop` branch, and use the following convention:

`IssueNumber-Key-Word-YourName`

So for example, if I am working on issue 202, which is related to fixing a train bug I would call this branch:

`202-train-bug-nacho`

### Coding, comments and docstrings

* *File names:* lowercase, words separated by underscore (_).
* *Class and variable names:* CamelCase. Classes / types start with an uppercase letter, variables start with a lowercase letter.
* *Docstrings:* Write docstrings in the [JSDoc](https://jsdoc.app/) style. For reference: [list of JSDoc tags supported in TypeScript](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html).

### Write tests for your code

We use the testing framework [mocha](https://mochajs.org/) and the [chai](https://www.chaijs.com/) assertion library.

To write tests for a code file `<filename>.ts`, create a `<filename>.spec.ts` file. This way, tests will be executed automatically for continuous integration.

### Draft PR

Once you have added a minimum number of content to your branch (e.g. you can see a bit where you are going), you can create a [draft PR](https://github.blog/2019-02-14-introducing-draft-pull-requests/).
It is important to give a good description to your PR as this makes it easier for other people to go through it.

> **Tip** : [Here](https://github.com/epfml/disco/pull/176) is a good example of a PR.

### Before requesting a review

Once you have finished your work on your draft PR, make sure to do the following before turning it into review PR.

1. Run both the server and main test suites (descriptions about how to run tests can be found in the README files in GitHub).

2. Make sure you remove debugging comments / console outputs.

## FAQ

If you have a question, always go to the [FAQ](FAQ.md) first. If you do not find an answer, and eventually find a solution, then if you think this might be useful to others please add your question and answer to the FAQ.
