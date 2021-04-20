import { createRouter, createWebHistory } from 'vue-router'
import details from "../components/details"
import UploadDataLink from "../components/UploadDataLink"

// To be renamed task list 
import TaskList from "../components/TaskList"

// Titanic import 
import TitanicGlobal from "../components/TitanicComponents/titanic_global"
import TitanicDesc from "../components/TitanicComponents/titanic_desc"
import TitanicTraining from "../components/TitanicComponents/titanic_training"

// MNIST import
import MNISTGlobal from "../components/MNISTComponents/MNIST_global"
import MNISTDesc from "../components/MNISTComponents/MNIST_desc"
import MNISTTraining from "../components/MNISTComponents/MNIST_training"
import MNISTTesting from "../components/MNISTComponents/MNIST_testing"

// LUS-COVID import
import LUSCOVIDGlobal from "../components/LUSCOVIDComponents/LUSCOVID_global"
import LUSCOVIDDesc from "../components/LUSCOVIDComponents/LUSCOVID_desc"
import LUSCOVIDTraining from "../components/LUSCOVIDComponents/LUSCOVID_training"



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
      component: TitanicTraining
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

  // LUS-COVID Routing
  {
    path: '/lus-covid-model',
    name: 'lus-covid-model',
    component: LUSCOVIDGlobal,
    children: [{
      path: 'description',
      component: LUSCOVIDDesc
    },
    {
      path: 'training',
      component: LUSCOVIDTraining
    },
    ]
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
