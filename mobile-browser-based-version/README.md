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

Welcome to the Disco🔮 developer guide. To get up and running you can find the relevant information here as well as in the [SERVER](server/README.md) document.

If you run into any sort of trouble then hopefully you can find an answer in our [FAQ](information/FAQ.md); otherwise please create a new issue. If you want to contribute to Disco🔮, then please have a look at our [contributing](information/CONTRIBUTING.md) guide; and if you are curious about our architecture you can find information [here](information/ARCHITECTURE.md).

## Sections

- [How to run the app](#how-to-run-the-app)
  - [Development Environment](#development-environment)
  - [Node Installation and NPM installation](#node-installation-and-npm-installation)
  - [Compiling and hot-reload for development](#compiling-and-hot-reload-for-development)
  - [Testing the server locally](#testing-the-server-locally)
  - [Writing your own tests](#writing-your-own-tests)
  - [Compiling and minifying for production](#compiling-and-minifying-for-production)
  - [Lint files](#lint-files)
  - [Customize configuration](#customize-configuration)
- [How to create a new custom ML task](#how-to-create-a-new-custom-ml-task)

## How to run the app

All commands are ran from the folder ./mobile-browser-based-version.

### Development Environment

We recommend the [VS code](https://code.visualstudio.com/) IDE with the following extensions :

1. Vue.js Extension Pack
2. Git Extension Pack
3. JavaScript (ES6) code snippets

To benefit from all offered functionalities, open `VS code` using

```
code .
```

from the `mobile-based-version` directory.

> **Tip** : you can use the `⇧⌘P` shortcut to open the **command palette** of `VS code` and use the `ESLint: Fix all auto-fixable Problems` command to lint the currently opened file.

### Node Installation and NPM installation

The app is running under Node 15.12.0. It can be downloaded from [here](https://nodejs.org/en/download/releases/).

NPM is a package manager for the JavaScript runtime environment Node.js.  
To start the application (running locally) run the following command.  
Note: the application is currently developed using [NPM 7.6.3](https://www.npmjs.com/package/npm/v/7.6.3).

```
npm install
```

This command will install the necessary libraries required to run the application (defined in the `package.json` and `package-lock.json`). The latter command is only required when one is using the app for the first time.

> **⚠ WARNING: Apple Silicon.**  
> `TensorFlow.js` in version `3.13.0` currently supports for M1 mac laptops. However, make sure you have an `arm` node executable installed (not `x86`). It can be checked using:

```
node -p "process.arch"
```

### Compiling and hot-reload for development

To launch the application run the following command:

```
npm run serve
```

This will start the application locally with two visualization options:

1. One can access the running app locally, with a ` localhost link`
2. One can access the running app on any device that has access to the network of his machine. To do so, use the `network link`.

> Note : the node.js sever application in `server/` needs to launched first (see [corresponding README](server/README.md)) to be able to run the `vue-app`

> **⚠ WARNING: Connection issues**  
> If federated learning works, but not decentralised learning, then it might be that webRTC is not enabled, this is needed for peer2peer communication.

To **Manually test decentralized learning** between two peers, run the aforementioned command twice (on different terminal pages). This will create another link that can be used to represent a second user. Open the two links on two different page windows.

To choose between **decentralized** and **federated** learning go to the settings found in menu.

### Testing the server locally

To run unit testing use `npm run test`.
Make sure you are running a server at the same time.

- You can `( cd server && npm run dev ) &` to start one in the background.
- Or if you have docker, `./with_server` starts one for you and run the command given as arguments. So you can directly run `./with_server npm run test`.

We use [mocha](https://mochajs.org/) and [chai](https://www.chaijs.com/) for testing; respectively they are libraries: unit tests and assertions.

Note that tests for the server are found under `server/tests/`.

### Writing your own tests

Tests are saved in the `tests/` folder. All tests with `.ts` extension written in this folder will be tested. To see an example of how to write your own tests have a look at `tests/example.test.ts`. You can use this as a starting template for your own tests!

### Compiling and minifying for production

```
npm run build
```

### Lint files

```
npm run lint
```

### Customize configuration

See [Configuration Reference](https://cli.vuejs.org/config/).

## How to create a new custom ML task

This is not necessary if you want to use some of our already supported data modalities (tabular/csv, or image classification). For new tasks based on our existing data modalities and preprocessing steps, simply use the `Create Task` button on the landing page of the app.

For creating a customized task from scratch, please follow the following steps:

1. In the folder ./src/components create a new folder for a new task.
2. If one desires to create a task that relies on tabular data (i.e CSV files), in the created folder, you can copy the files from the titanic example. On the other hand, if one wishes to create a model that uses images as input, you can copy the files from the MNIST example into the previously created folder .
3. Rename the copied file using your task name. For instance, titanic_desc can be renamed [your_task_name]\_desc.
4. Change the information in the javascript file to suit the requirements of the created task. There are three main objects to change. The first one is called display_informations. It contains all the textual task-related information. The second one is called training_information and holds all the information about the model (i.e model's name, architecture ...). The third one is the data_preprocessing function. This function takes the user's uploaded files and returns the processed data as a tensor.
5. In each vue file, look for the script part of the code (after <script>) and replace the first import with the javascript associated with your task. For instance, replace import {...} from "titanic_script" with import {...} from "[your_task_name]\_script".
6. Add your task to the vue routing file in ./src/router/index.js. More instructions soon to come.
