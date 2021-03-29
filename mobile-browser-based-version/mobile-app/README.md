# mobile-app

## Run the app
All commands are ran from the mobile-app folder. 
### NPM installation
NPM is a package manager for the JavaScript runtime environment Node.js.  
To start the application (running locally) run the following command. 
```
npm install
```
This command will install the necessary libraries required to run the application (defined in the `package.json`). The latter command is only required when you are using the app for the first time on your machine. 

### Compiles and hot-reloads for development
To launch the application run the following command: 
```
npm run serve
```
This will start the application locally with two visualization options: 
1. You can access the running app locally, with a ` localhost link` 
2. You can access the running app on any device that has access to the network of your machine. To do so, use the `network link`. 

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).

## Explenation on the current architecture of the app
### Use of Vue.js
The main framework used by the application is Vue.js. It's a widely used framework to build single-page UI using so-called `routers` (See [Reference](https://router.vuejs.org/guide/)).    
The application is built around Vue.js components. Essentially, components are defined around two parts: 
1. An HTML template that states how the component should be rendered 
2. A script that defines the behaviors of the components

### Components architecture of the project 
Components can be organized in a parent/child fashion. Meaning that we can have one parent component that holds many other child components.  
`routers` are used to define which components are displayed to the user depending on the user's inputs. 

The application runs the following architecture: 
- **The global component** of the app is called `App.vue`. This component implements a mini-side bar that is always displayed to the user. This mini-sidebar allows the user to directly access the proposed task list and change some parameters of the page (color and night mode).
- **Information Display Components** are components that are displayed on the right side of the mini-side bar. Depending on the user's path choice, a component is displayed. The following components can be displayed:
 - **The task list component** is called `TaskList.vue`. It's the default component used to fill this space. It shows which tasks are open for collaboration. 
 -  ** Task-related Components** are components used to display the interface associated with tasks. Because tasks can require many information pages such as task description, or task training information, a task UI requires many components. Again, these components come in a parent-child relation: one global component (called `[taskName]_model.vue`) is used to implement a sidebar that allows the user to navigate through the different components associated with a task. On the right side of this global component, the following components are used to create a task (and note that all of them need to be created for each task): 
    - **Description of the task** under the name `[taskName]_description.vue. It gives an overview of the task. 
    - **Training of the task** under the name `[taskName]_training.vue. Allows the users to train the model. As a side note, components are created only when they are called by the user. Meaning that until the user reaches the training page of the task, the `[taskName]_training.vue`is not created. When the user reaches for the first time the page, the component is created, and only then the NN model is created and stored in the browser's indexdb database. 
   
### Routers
Routers are used to navigate through the different components and are required to be configured each time a new task is added. 
Further details will be added on how to configure the router to hold more tasks soon. 

### How to create a new task 
Coming out soon. 

 ### Mobile Intergration 
 Depending on the user's screen size, the sidebar associated to task's components can disapear and be open using a button located on the left corner of the user's screen. 
 For now a template that shows how to create tasks can be found. 
 


