import { createRouter, createWebHistory } from 'vue-router'
import TrainingUploadImages from "../components/TrainingUploadImages"
import UseImageModel from "../components/UseImageModel"
import UploadImages from "../components/UploadImages"

const routes = [
  {
    path: '/',
    name: 'TrainingUploadImages',
    component: TrainingUploadImages
  },
  {
    path: '/testImage',
    name: 'UseImageModel',
    component: UseImageModel
  },
  {
    path: '/trainImage',
    name: 'UploadImages',
    component: UploadImages
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
