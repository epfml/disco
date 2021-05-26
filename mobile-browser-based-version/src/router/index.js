import { createRouter, createWebHistory } from 'vue-router'

// Some page components 
import TaskList from "../components/TaskList"
import Information from "../components/Information"
import Trophee from "../components/Trophee"

// Task's main frames
import MainTaskFrame from "../components/main_frames/MainTaskFrame"
import MainDescriptionFrame from "../components/main_frames/MainDescriptionFrame"
import MainTrainingFrame from "../components/main_frames/MainTrainingFrame"
import MainModelManagerFrame from "../components/main_frames/MainMyModelManagerFrame"
import MainTestingFrame from "../components/main_frames/MainTestingFrame"

// Import the tasks objects Here
import {TitanicTask} from "../task_definition/titanic"
import {MnistTask} from "../task_definition/mnist"
import {LusCovidTask} from "../task_definition/lus_covid"

// WARNING: temporay code until serialization of Task object 

// define task here 
var titanicTask = new TitanicTask()
var mnistTask = new MnistTask()
var lusCovidTask = new LusCovidTask()

// notify new task if availabe by adding it to the list of tasks available 
export const ALL_TASKS = [titanicTask, mnistTask, lusCovidTask]

// allocate each task depending of creation 
function dynamicTaskAllocationFn (routes){
  switch(routes.params.Id) {
    case titanicTask.trainingInformation.modelId:
      return {Id: routes.params.Id, Task: titanicTask}
    case mnistTask.trainingInformation.modelId: 
      return {Id: routes.params.Id, Task: mnistTask}
    case lusCovidTask.trainingInformation.modelId: 
      return {Id: routes.params.Id, Task: lusCovidTask}
    
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
        path: 'testing',
        name: 'testing',
        component: MainTestingFrame, 
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
