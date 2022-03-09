# Disco - How to contribute

## TODO list

To get an overview of who is working on what we use the [project](https://github.com/epfml/disco/projects/7) feature of GitHub as described earlier, this gives us a table with the currents todo’s, what is currently being worked on, and what has been finished.

Each note in the the project can be linked to an issue by tagging it, e.g. add #202 in the note content. You cannot assign yourself a note, but you can assign yourself an issue, which is how we can keep track of who his working on what feature.

> **Tip** : When creating a new issue, on the right hand side, under the assignees menu, you can also add a project, if you add the `TODO` project, this will directly create a note in our project with the issue

The project link can be found [here](https://github.com/epfml/disco/projects/7)

## Contributing code: PR

Once you start working on a feature, create a new branch from the `develop` branch, and use the following convention:

`IssueNumber-Key-Word-YourName`

So for example, if I am working on issue 202, which is related to fixing a train bug I would call this branch:

`202-train-bug-nacho`

Once you have added a minimum number of content to your branch (e.g. you can see a bit where you are going), you can create a [draft PR](https://github.blog/2019-02-14-introducing-draft-pull-requests/).
It is important to give a good description to your PR as this makes it easier for other people to go through it. [This](https://github.com/epfml/disco/pull/176) is good example of a PR is the following:

> **Tip** : [Here](https://github.com/epfml/disco/pull/176) is a good example of a PR.

Once you have finished your work on your draft PR, make sure to do the following before turning it into review PR.

1. Run both the server and main test suites (descriptions about how to run tests can be found in the README files in GitHub).

2. Make sure you remove debugging comments / console outputs.

## FAQ

If you have a question, always go to the [FAQ](FAQ.md) first. If you do not find an answer, and eventually find a solution, then if you think this might be useful to others please add your question and answer to the FAQ.
