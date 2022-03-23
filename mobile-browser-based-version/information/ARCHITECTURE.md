# Disco - Architecture

## High level architecture

At a high level disco has the following architecture:

![architecture](information/architecture.png)

- The UI is a browser built with Vue3
- Manager (interactions between UI and core)
- The core of disco is composed of the following modules:
  - Data
  - Train
  - Client
- Server

## Code Organisation

    .
    ├── assets       # contains the resources of the app
    │ ├── css        # css files
    │ ├── svg        # svg image / icons
    ├── components   # vue file folder
    │ ├── XXX.vue    # vue example file
    ├── core         # core code of the client (training, communication, ...)
    │ ├── XXX.ts     # ts example file
    ├── router       # vue-router related folder
    │ ├── index.ts
    ├── store        # vuex related folder
    │ ├── store.ts
    ├── main.ts      # root file of the app
    ├── .env.XXX     # environment specific variables
    └── ...          # rest of the files

### Use of TypeScript (a dialect of JavaScript)

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
var sum = "hello DeAI" as any;
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
    - **Training of the task** under the name `[taskName]_training.vue`. Allows the users to train a model, either collaboratively using p2p communication, or alone by local training. As a side note, components are created only when they are called by the user. Meaning that until the user reaches the training page of the task, the `[taskName]_training.vue`is not created. When a user reaches for the first time the training components, the component is created, and only then the NN model is created and stored in the browser's indexdb database. The training is done in a separated script. To start training, the function named `join_training`is called. This function preprocess the data using the task specific data pre-processing function and then train the model using the shared `train`function.

All these are served by the TypeScript file associated to the task.

### Training Loop

A shared function `training` is called by all components that are training a model. This function is located in the file ./helpers/training.js.  
The idea is that the training part for all tasks relies on the same ML backend, while the pre-processing of the training data is done in a custom version (at the component level) by each task.  
The training process works as follows:

1. When a user has stated that he wishes to join the training of a task, a TF.js model is initialized (for now with a standard initialization) and stored into the browser's local storage. (call to `create_model`, a function embedded into the task's training component)
2. Once the user connects their dataset, a pre-processing function is called. The pre-processing function is specifically tailored for each task and so is embedded in the task's training component under the name `data_preprocessing`. This can be either one-off preprocessing of the entire dataset, or a batch-wise pre-processing function which will then be repeatedly called during training, for each new mini batch of training data.
3. The `training` function function loads the model from the browser's local storage and updates the model by training it on the given dataset (and communicating with peers or a federated learning server). As mentioned earlier, the training function is shared by all training components.

## Communication between peers

Explanations on communication between peers will be added soon.

The decentralized training version relies on p2p communication via [peer2js](https://peerjs.com/). The federated training does not need `peer2js` but directly communicates with the server.

## Some further integrations notes

### Using on mobile devices

Depending on the user's screen width, the left hand sidebar associated to task's components can disappear and be opened using the button located on the top left corner of the user's screen.
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
| [peerjs](https://peerjs.com/)                         | `Communication` | P2P communication library for DeAI                                        |
