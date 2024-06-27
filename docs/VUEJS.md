# `Vue.js` documentation

The main front-end framework used by the application is Vue.js, a widely used framework to build single-page UI (See [Reference](https://router.vuejs.org/guide/)).  
The application is built around Vue.js components. Essentially, components are defined around two parts:

1. An HTML template that states how the component should be rendered
2. A script that defines the behaviors of the components

A strong focus was put on software engineering best practices to ease the future development stages. A list of simple guidelines to write good `vue` code is made available in the [Code guidelines section](#code-guidelines).

## Component architecture of the project

Components can be organized in a parent/child relation. Meaning that one can have a parent component that holds many other child components.  
`routers` are used to define which components are displayed to the user depending on the user's inputs.

The application runs the following architecture:

- **The global component** of the app is called `App.vue`. This component implements a mini-side bar that is always displayed to the user. This mini-sidebar allows the user to directly access the list of available tasks, and change some parameters of the page (color and night mode).
- **Information Display Components** are components that are displayed on the right side of the mini-side bar. Depending on the user's path choice, a component is displayed. The following components can be displayed:
  - **The task list component** is called `TaskList.vue`. It's the default component used to fill this space. It shows which ML tasks are open for collaborative training.
  - **Task-related Components** are components used to display the interface associated with a particular task. The UI components for an ML task come in a parent-child relation: one global component (called `[taskName]_model.vue`) is used to implement a sidebar that allows the user to navigate through the different components associated with a task. On the right side of this global component, the following components are used to create a task (and note that all of them need to be created for each task):
    - **Description of the task** under the name `[taskName]\_description.vue`. It gives an overview of the task.
    - **Training of the task** under the name `[taskName]_training.vue`. Allows the users to train a model, either collaboratively using p2p communication, or alone by local training. As a side note, components are created only when they are called by the user. Meaning that until the user reaches the training page of the task, the `[taskName]_training.vue`is not created. When a user reaches for the first time the training components, the component is created, and only then the NN model is created and stored in the browser's indexedDB database. The training is done in a separated script. To start training, the function named `join_training`is called. This function applies the task specific pre-processing function to the data and then trains the model using the shared `train` function.

## Root pages description

All pages that are available for the `side-bar` (as well as the `NotFound.vue` ) are referred to as root pages, aka the pages that are at the root of the component hierarchy.

An extensive list can be found below:

    .
    ├── App.vue                  # basic app layout (sidebar, router and state variables)
    ├── Home.vue                 # home page that links TaskList.vue and NewTaskCreationForm.vue
    ├── Information.vue          # Displays basic information about the platform
    ├── NewTaskCreationForm.vue  # Form that adds a new task to the platform
    ├── NotFound.vue             # Error page that is displayed when a session error occurs
    └── TaskList.vue             # Displays all tasks available in the platform

## Reusable Components

In this section, we will define `vue` components that can be reused by the rest of the platform using :

1. style templates ([Simple directory](#simple-directory))
2. layout templates ([Container directory](container-directory))

Both approaches are described in the following sections.

### `Simple` directory

The directory defines pre-styled html components such as `Button` or `Footer` (see images below).

<img width="273" alt="Screenshot 2022-01-04 at 16 06 35" src="https://user-images.githubusercontent.com/43466781/148079430-d333b520-9409-4efa-a754-5069d8bb1847.png"> <img width="1582" alt="Screenshot 2022-01-04 at 16 06 54" src="https://user-images.githubusercontent.com/43466781/148079475-822c3d42-b783-48f8-8e98-4e51f6086dda.png">

> **Note**: the naming convention for files in this directory is `CustomXXX.vue` where `XXX` is the feature of the new component. They shall be imported using the `kebab-case` naming version:

```html
<custom-xxx />
```

See [Naming convention section](#naming-conventions) for more information.

### `Container` directory

The `container` directory holds all `vue` components that fulfil a container function. In other words, most components in this folder make extensive use of the [slot `vue` construct](https://v3.vuejs.org/guide/component-slots.html)

```html
<slot name="XXX"></slot>
```

This "slot" can hold `vue` code generated by a parent component. Therefore, it allows defining pre-styled containers.

The `containers` defined for this particular webapp are described below.

#### Base Layout

**Each root page** shall start its `template` by the `<base-layout>` tag. This `base layout` contains basic style for the main `divs` of the app and already contains the footer of the app.

#### Cards

`Cards` are containers that are displayed inside other main containers (e.g.`base layout`) with a darker background than the main background (with rounded-corners).

The following types are available :

| Component       | Description                                                            |
| :-------------- | :--------------------------------------------------------------------- |
| `Card.vue`      | simple `div` with darker background                                    |
| `TitleCard.vue` | a `Card` but with a stylized title added as `props`                    |
| `IconCard`      | a `Card` having a header section with a title and an icon on the right |
| `IconCardSmall` | Smaller version of `IconCard` (e.g. used in `TrainingInformant.vue`)   |

Example images:

<img width="768" alt="Screenshot 2022-01-04 at 16 45 12" src="https://user-images.githubusercontent.com/43466781/148085060-02c761cb-b622-4920-9e2a-94192600ff68.png">
<img width="746" alt="Screenshot 2022-01-04 at 16 45 49" src="https://user-images.githubusercontent.com/43466781/148085151-2a22235a-3a37-47fd-a225-1f033e23f843.png">
<img width="738" alt="Screenshot 2022-01-04 at 16 46 22" src="https://user-images.githubusercontent.com/43466781/148085246-b139e648-bba6-439e-bd8b-5d8865da302b.png">

## Icons

Icons can be found in `src/assets/svg` as `.vue` files. Potential sources of svg icons are https://www.svgrepo.com/ or https://icons.getbootstrap.com/ which allow downloading icons as SVG files directly. Be sure to respect the icon license. The svg path can then be copy-pasted in a Vue.js file following the same format as other icons:

```html
<svg fill="currentColor" :class="customClass" :viewBox="viewBox">
  <!-- The SVG path -->
  <path d="..." />
</svg>
```

You may need to play around with the size and viewbox to display it correctly.

## Code guidelines

For an inexperienced `Vue` developer, we recommend going through [the official onboarding documentation of Vue 3](https://v3.vuejs.org/guide/introduction.html).

### Naming conventions

Let's assume, we want to have a `vue` component with functionality `xxx yyy`.

In this project, we chose to follow:

1. The `snakeCase` standard for the files names: `XxxYyy.vue`
2. The `kebab-case` standard for the exported component name: `xxx-yyy`

This means that each `vue` file shall contain the following code

```javascript
export default {
  name: "xxx-yyy",
};
```

and that another `vue` component can use it inside its template using the following syntax:

```html
<xxx-yyy />
```

> **Note**: all `javascript` code inside the `<script></script>` tag shall respect the ES6 standard, in particular the imports statements.

### Modularization

You will find below some resources that should help increase modularity and reduce the amount of code duplication in the platform:

1. `slots`: [medium](https://medium.com/js-dojo/magic-of-vue-template-slots-806bcbb64578), [vue docs](https://v3.vuejs.org/guide/component-slots.html)
2. `v-for` and `data properties`: [vue docs](https://vuejs.org/v2/guide/list.html)

### Mobile devices

Depending on the user's screen width, the left hand sidebar associated to task's components can disappear and be opened using the button located on the top left corner of the user's screen.
For now a template that shows how to create tasks can be found.

### Main front-end packages

| Name                                                                         |     Keyword     | Description                                                      |
| ---------------------------------------------------------------------------- | :-------------: | :--------------------------------------------------------------- |
| [vee-validate](https://vee-validate.logaretm.com/v4/)                        |     `Form`      | Form Validation for Vue.js                                       |
| [vue-toast-notification](https://github.com/ankurk91/vue-toast-notification) | `Notifications` | Toast notification plugin for Vue.js                             |
| [tippy](https://atomiks.github.io/tippyjs/)                                  |     `Menu`      | Plugin to build menu / side bars                                 |
| [vue-router](https://router.vuejs.org/)                                      |    `Routing`    | Official router plugin for Vue.js                                |
| [yup](https://github.com/jquense/yup)                                        |     `Form`      | Schema builder for runtime value parsing and validation (forms). |
