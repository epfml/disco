import { createRouter, createWebHashHistory } from 'vue-router'

// Some page components
import Home from "../components/Home"
import TaskList from "../components/TaskList"
import Information from "../components/Information"
import Trophee from "../components/Trophee"


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
    path:"/information",
    name: 'information',
    component: Information
  },
  {
    path:"/trophee",
    name: 'trophee',
    component: Trophee
  }
]

console.log(routes)

const router = createRouter({
  history: createWebHashHistory(process.env.BASE_URL),
  routes
})

console.log(router.getRoutes())

export default router
