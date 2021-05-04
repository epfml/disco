import { createRouter, createWebHistory } from 'vue-router'

// To be renamed task list 
import TaskList from "../components/TaskList"

// Titanic import 
import TitanicGlobal from "../components/TitanicComponents/titanic_global"
import TitanicDesc from "../components/TitanicComponents/titanic_desc"
import TitanicTraining from "../components/TitanicComponents/titanic_training"
import TitanicTrainingConn from "../components/TitanicComponents/titanic_training_conn"
import TitanicModelManager from "../components/TitanicComponents/titanic_modelManager"


// MNIST import
import MNISTGlobal from "../components/MNISTComponents/MNIST_global"
import MNISTDesc from "../components/MNISTComponents/MNIST_desc"
import MNISTTraining from "../components/MNISTComponents/MNIST_training"
import MNISTTesting from "../components/MNISTComponents/MNIST_testing"
import MNISTModelManager from "../components/MNISTComponents/MNIST_modelManager"

// Testing import 
import receiver from "../components/receiver"
import sender from "../components/sender"



const routes = [
  {
    path: '/',
    name: 'home',
    component: TaskList
  },
  // Titanic Routing
  {
    path: '/titanic-model',
    name: 'titanic-model',
    component: TitanicGlobal,
    children: [{
      path: 'description',
      component: TitanicDesc
    },
    {
      path: 'training',
      component: TitanicTrainingConn
    },
    {
      path: 'model-manager',
      component: TitanicModelManager
    },
    ]
  },

  // MNIST Routing
  {
    path: '/mnist-model',
    name: 'mnist-model',
    component: MNISTGlobal,
    children: [{
      path: 'description',
      component: MNISTDesc
    },
    {
      path: 'training',
      component: MNISTTraining
    },
    {
      path: 'testing',
      component: MNISTTesting
    },
    {
      path: 'model-manager',
      component: MNISTModelManager
    }, 
    ]
  },

  // Testing peer.js
  {
    path: '/receiver',
    name: 'receiver',
    component: receiver
  },
  {
    path: '/sender',
    name: 'sender',
    component: sender
  },


]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
