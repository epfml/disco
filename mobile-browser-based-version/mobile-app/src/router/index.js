import { createRouter, createWebHistory } from 'vue-router'
import TrainingUploadImages from "../components/TrainingUploadImages"
import UseImageModel from "../components/UseImageModel"

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
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
