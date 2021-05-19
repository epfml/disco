import { createRouter, createWebHistory } from 'vue-router'

// Some page components 
import TaskList from "../components/TaskList"
import Information from "../components/Information"
import Trophee from "../components/Trophee"

// Task's main frames
import MainTaskFrame from "../components/Main Frames/MainTaskFrame"
import MainDescriptionFrame from "../components/Main Frames/MainDescriptionFrame"
import MainTrainingFrame from "../components/Main Frames/MainTrainingFrame"
import MainModelManagerFrame from "../components/Main Frames/MainModelManagerFrame"

// Import the tasks objects Here
import {TitanicTask} from "../Task Definition/titanic"
import {MnistTask} from "../Task Definition/mnist"
import {LusCovidTask} from "../Task Definition/lus_covid"

// WARNING: temporay code until serialization of Task object 

// define task here 
var titanic_task = new TitanicTask()
var mnist_task = new MnistTask()
var lus_covid_task = new LusCovidTask()

// notify new task if availabe by adding it to the list of tasks available 
export const ALL_TASKS = [titanic_task, mnist_task, lus_covid_task]

// allocate each task depending of creation 
function dynamicTaskAllocationFn (routes){
  switch(routes.params.Id) {
    case titanic_task.training_information.model_id:
      return {Id: routes.params.Id, Task: titanic_task}
    case mnist_task.training_information.model_id: 
      return {Id: routes.params.Id, Task: mnist_task}
    case lus_covid_task.training_information.model_id: 
      return {Id: routes.params.Id, Task: lus_covid_task}
    
  }
}

const routes = [
  {
    path: '/',
    name: 'home',
    component: TaskList
  },
  {
    path:"/information",
    name: 'information',
    component: Information
  },
  {
    path:"/trophee",
    name: 'trophee',
    component: Trophee
  },
  {
    path: '/:Id',
    name: 'mainTaskFrame',
    component: MainTaskFrame,
    props: dynamicTaskAllocationFn, 
    children: [
      {
        path: 'description', 
        name: 'description',
        component: MainDescriptionFrame,
        props: dynamicTaskAllocationFn,
      },
      {
        path: 'training',
        name: 'training',
        component: MainTrainingFrame, 
        props: dynamicTaskAllocationFn,
      },
      {
        path: 'model-manager', 
        name: 'model-manager', 
        component: MainModelManagerFrame, 
        props: dynamicTaskAllocationFn,
      }
    ]
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
