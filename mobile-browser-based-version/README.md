# DeAI - Developer Guide

## Code Organisation

    .
    ├── assets       # contains the resources of the app
    │ ├── css        # css files
    │ ├── svg        # svg image / icons
    ├── components   # vue file folder
    │ ├── XXX.vue    # vue example file
    ├── helpers      # typescript helpers folder
    │ ├── XXX.ts     # js example file
    ├── platforms    # i18n related folder
    │ ├── ...
    ├── router       # vue-router related folder
    │ ├── index.ts
    ├── store        # vuex related folder
    │ ├── store.ts
    ├── main.ts      # root file of the app
    ├── .env.XXX     # environment specific variables
    └── ...          # rest of the files

## How to run the app

All commands are ran from the folder ./mobile-browser-based-version.

### Development Environment

We recommand the [VS code](https://code.visualstudio.com/) IDE with the following extensions :

1. Vue.js Extension Pack
2. Git Extension Pack
3. JavaScript (ES6) code snippets

To benenfit from all offered functionalities, open `VS code` using

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
> `TensorFlow.js` in version `3.13.0` currently suportes for M1 mac laptops. However, make sure you have an `arm` node executable installed (not `x86`). It can be checked using:

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

To **test decentralized learning** between two peers, run the aformentioned command twice (on different terminal pages). This will create another link that can be used to represent a second user. Open the two links on two different page windows.

To choose between **decentralized** and **federated** learning go to the settings found in menu.

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

## Explanation of the current architecture of the app

### Overview of the architecture

Tasks are organized around the following files:

- vue files are used to render the task-related user interface. Users should not modify the core code of these files.
- a javascript file contains all the task-related information and methods. For instance, in this file, one can find the specific data-processing function or the textual description of the task.

### Use of tpyescript

In order to facilitate development with javascript (js) we use [typescript](https://www.typescriptlang.org/) (ts); this adds an additional layer on top of javascript that allows for a deeper integration with your editor which enables you to catch errors faster. 

If you know js then you basically already know ts, since js is a subset of ts, anything you can do on js, you can also do on ts. What's new is that ts has a stricter policy (these can be silenced, and so we can indeed run ts files as if they were js), here are some examples:

#### Function overloading

This would run perfectly on js
```js
function addNumbers(a, b) {  
    return a + b;  
}  
var sum = addNumbers(15, 25, 30);  
``` 

However in ts we get the following error: ``Expected 2 arguments, but got 3.  ``

####  Equality checks

```js
const isEqual = 20 == '20'
console.log(isEqual)
``` 
In js these two are equal since it tries to cast types and see if they are equal, while convenient in a small project, this can lead to hard to find bugs in larger ones. In ts this would yield the following error:
```
This condition will always return 'false' since the types 'number' and 'string' have no overlap.
```

#### Type annotations

Typescript allows us to annotate the input and output of functions, this greatly simplifies using functions where  types might be ambiguous, the previous function we saw could be annotate as follows in ts:

 ```ts
function addNumbers(a: number, b: number): number {  
    return a + b;  
}  
var sum = addNumbers(15, 25);  
``` 

Since we know the output type is of type number, we can safely call ``sum.toPrecision(2)``, if we wanted to get the sum with 2 significant digits. If sum was not of type number (or any other type that had a function called toPrecision) , then our editor would tell us:  ``TypeError: k.toPrecision is not a function`` . 

This brings us to our next comment, if we cast sum as type any, then we would get no compiler error:
  ```ts

var sum = 'hello DeAI' as any;
sum.toPrecision(2)  
```
 
any is a special ts type that you can use when you don't want type checking errors, this is however not desirable since this would defeat the whole purpose of using ts in the first place. 

In vue files you simply need to add ts in the script tag to enable ts:
  ```vue
<script lang="ts">
</script>
```

There are of course more details, but if you know js, now you should be ready for ts! If you want to learn more this [official (5min) guide](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html) is an excellent place to start.

### Use of Vue.js

The main front-end framework used by the application is Vue.js, a widely used framework to build single-page UI (See [Reference](https://router.vuejs.org/guide/)).  
The application is built around Vue.js components. Essentially, components are defined around two parts:

1. An HTML template that states how the component should be rendered
2. A script that defines the behaviors of the components

### Component architecture of the project

Components can be organized in a parent/child relation. Meaning that one can have a parent component that holds many other child components.  
`routers` are used to define which components are displayed to the user depending on the user's inputs.

The application runs the following architecture:

- **The global component** of the app is called `App.vue`. This component implements a mini-side bar that is always displayed to the user. This mini-sidebar allows the user to directly access the available list of tasks available, and change some parameters of the page (color and night mode).
- **Information Display Components** are components that are displayed on the right side of the mini-side bar. Depending on the user's path choice, a component is displayed. The following components can be displayed:
  - **The task list component** is called `TaskList.vue`. It's the default component used to fill this space. It shows which ML tasks are open for collaborative training.
  - **Task-related Components** are components used to display the interface associated with a particular task. The UI components for an ML task come in a parent-child relation: one global component (called `[taskName]_model.vue`) is used to implement a sidebar that allows the user to navigate through the different components associated with a task. On the right side of this global component, the following components are used to create a task (and note that all of them need to be created for each task):
    - **Description of the task** under the name `[taskName]\_description.vue. It gives an overview of the task.
    - **Training of the task** under the name `[taskName]_training.vue`. Allows the users to train a model, either collaboratively using p2p communication, or alone by local training. As a side note, components are created only when they are called by the user. Meaning that until the user reaches the training page of the task, the `[taskName]_training.vue`is not created. When a user reaches for the first time the training components, the component is created, and only then the NN model is created and stored in the browser's indexdb database. The training is done in a seperated script. To start training, the function named `join_training`is called. This function preprocess the data using the task specific data pre-processing function and then train the model using the shared `train`function.

All these are served by the javascript file associated to the task.

### Training Loop

A shared function `training` is called by all components that are training a model. This function is located in the file ./helpers/training.js.  
The idea is that the training part for all tasks relies on the same ML backend, while the pre-processing of the training data is done in a custom version (at the component level) by each task.  
The training process works as follows:

1. When a user has stated that he wishes to join the training of a task, a TF.js model is initialized (for now with a standard initialization) and stored into the browser's local storage. (call to `create_model`, a function embedded into the task's training component)
2. Once the user connects their dataset, a pre-processing function is called. The pre-processing function is specifically tailored for each task and so is embedded in the task's training component under the name `data_preprocessing`. This can be either one-off preprocessing of the entire dataset, or a batch-wise pre-processing function which will then be repeatedly called during training, for each new minibatch of training data.
3. The `training` function function loads the model from the browser's local storage and updates the model by training it on the given dataset (and communicating with peers or a federated learning server). As mentioned earlier, the training function is shared by all training components.

## Communication between peers

Explanations on communication between peers will be added soon.

The decentralized training version relies on p2p communication via [peer2js](https://peerjs.com/). The federated trainind does not need `peer2js` but direclty communicates with the server.

## Some further integrations notes

### Using on mobile devices

Depending on the user's screen width, the left hand sidebar associated to task's components can disapear and be opened using the button located on the top left corner of the user's screen.
For now a template that shows how to create tasks can be found.

### Main packages used

| Name                                                  |     Keyword     | Description                                                               |
| ----------------------------------------------------- | :-------------: | :------------------------------------------------------------------------ |
| [vuex](https://vuex.vuejs.org/)                       |     `Store`     | It serves as a centralized store for all the components in an application |
| [vee-validate](https://vee-validate.logaretm.com/v4/) |     `Form`      | Form Validation for Vue.js                                                |
| [vue-toaster](https://github.com/MeForma/vue-toaster) | `Notifications` | Toast notification plugin for Vue.js                                      |
| [tippy](https://atomiks.github.io/tippyjs/)           |     `Menu`      | Pluging to build menu / side bars                                         |
| [vue-i18n](https://vue-i18n.intlify.dev/)             | `Internation.`  | Internationalization plugin for Vue.js                                    |
| [vue-router](https://router.vuejs.org/)               |    `Routing`    | Official router plugin for Vue.js                                         |
| [tfjs](https://www.tensorflow.org/js)                 |  `ML backend`   | Library for machine learning in JavaScript                                |
| [axios](https://axios-http.com/)                      | `HTTP requests` | Axios is a promise-based HTTP Client for node.js and the browser.         |
| [lodash](https://lodash.com/)                         |  `JS Helpers`   | Functional library for higher order function on list and js objects       |
| [yup](https://github.com/jquense/yup)                 |     `Form`      | Schema builder for runtime value parsing and validation (forms).          |
| [peerjs](https://peerjs.com/)                         | `Communication` | P2P communication libary for DeAI                                         |
