import { createRouter, createWebHistory } from 'vue-router'
import details from "../components/details"
import UploadDataLink from "../components/UploadDataLink"

// To be renamed task list 
import TaskList from "../components/TaskList"

// Titanic import 
import TitanicGlobal from "../components/TitanicComponents/titanic_global"
import TitanicDesc from "../components/TitanicComponents/titanic_desc"
import TitanicTraining from "../components/TitanicComponents/titanic_training"
import TitanicTrainingConn from "../components/TitanicComponents/titanic_training_conn"

TitanicTraining

// MNIST import
import MNISTGlobal from "../components/MNISTComponents/MNIST_global"
import MNISTDesc from "../components/MNISTComponents/MNIST_desc"
import MNISTTraining from "../components/MNISTComponents/MNIST_training"
import MNISTTesting from "../components/MNISTComponents/MNIST_testing"

// Testing import 
import receiver from "../components/receiver"
import sender from "../components/sender"



const routes = [
  {
    path: '/',
    name: 'home',
    component: TaskList
  },
  {
    path: '/details',
    name: 'details',
    component: details
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
    }
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

  {
    path: '/uploadDataLinks',
    name: 'upload-data-link',
    component: UploadDataLink
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
