import { createRouter, createWebHashHistory } from 'vue-router'

<<<<<<< HEAD
// Some page components
=======
// Some page components 
import Home from "../components/Home"
>>>>>>> cb0b2030da39be6c13947e4ef3af3852a38b905e
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

<<<<<<< HEAD
var router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
=======
const router = createRouter({
  history: createWebHashHistory(process.env.BASE_URL),
>>>>>>> cb0b2030da39be6c13947e4ef3af3852a38b905e
  routes
})

console.log(router.getRoutes())

export default router
