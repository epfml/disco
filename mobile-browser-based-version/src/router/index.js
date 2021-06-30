import { createRouter, createWebHashHistory } from 'vue-router'
import {defineComponent} from 'vue'

// Some page components 
import Home from "../components/Home"
import TaskList from "../components/TaskList"
import Information from "../components/Information"
import Trophee from "../components/Trophee"

// Task's main frames
import MainTaskFrame from "../components/main_frames/MainTaskFrame"
import MainDescriptionFrame from "../components/main_frames/MainDescriptionFrame"
import MainTrainingFrame from "../components/main_frames/MainTrainingFrame"
import MainTestingFrame from "../components/main_frames/MainTestingFrame"

// WARNING: temporay code until serialization of Task object 
// Import the tasks objects Here
import { TitanicTask } from "../task_definition/titanic"
import { MnistTask } from "../task_definition/mnist"
import { LusCovidTask } from "../task_definition/lus_covid"

// define task here 
var titanicTask = new TitanicTask()
var mnistTask = new MnistTask()
var lusCovidTask = new LusCovidTask()

// notify new task if availabe by adding it to the list of tasks available 
export const ALL_TASKS = [titanicTask, mnistTask, lusCovidTask]


var routes = [
  {
    path: '/',
    name: 'home',
    component: Home
  },
  {
    path: '/tasks',
    name: 'tasks',
    component: TaskList
  },
  {
    path: "/information",
    name: 'information',
    component: Information
  },
  {
    path: "/trophee",
    name: 'trophee',
    component: Trophee
  },
]


const router = createRouter({
  history: createWebHashHistory(process.env.BASE_URL),
  routes: routes
})

for (let index = 0; index < ALL_TASKS.length; index++) {
  const task = ALL_TASKS[index];

  // definition of an extension of the Task related component 
  var MainDescriptionFrameSp = defineComponent({ extends: MainDescriptionFrame, name: task.trainingInformation.modelId.concat(".description"), key: task.trainingInformation.modelId.concat(".description")})
  var MainTrainingFrameSp = defineComponent({ extends: MainTrainingFrame, name: task.trainingInformation.modelId.concat(".training"), key: task.trainingInformation.modelId.concat(".training")})
  var MainTestingFrameSp = defineComponent({ extends: MainTestingFrame, name: task.trainingInformation.modelId.concat(".testing"), key: task.trainingInformation.modelId.concat(".testing")})

  // define the task specific route (note: modelId is the route identifier)
  let newTaskRoute = {
    path: '/'.concat(task.trainingInformation.modelId),
    name: task.trainingInformation.modelId,
    component: MainTaskFrame,
    props: { Id: task.trainingInformation.modelId, Task: task },
    children: [
      {
        path: 'description',
        name: task.trainingInformation.modelId.concat('.description'),
        component: MainDescriptionFrameSp,
        props: { Id: task.trainingInformation.modelId, Task: task },
      },
      {
        path: 'training',
        name: task.trainingInformation.modelId.concat('.training'),
        component: MainTrainingFrameSp,
        props: { Id: task.trainingInformation.modelId, Task: task },
      },
      {
        path: 'testing',
        name: task.trainingInformation.modelId.concat('.testing'),
        component: MainTestingFrameSp,
        props: { Id: task.trainingInformation.modelId, Task: task },
      }
    ]
  }

  // add the Task's route to the component 
  router.addRoute(newTaskRoute)
}


export default router
