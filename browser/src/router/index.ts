import { createRouter, createWebHashHistory } from 'vue-router'

// Some page components
import Home from '../components/Home.vue'
import MainTaskFrame from '../components/main_frames/MainTaskFrame.vue'
import TaskList from '../components/TaskList.vue'
import Information from '../components/Information.vue'
import NewTaskCreationForm from '../components/NewTaskCreationForm.vue'
import NotFound from '../components/NotFound.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home
  },
  {
    path: '/tasks',
    name: 'tasks',
    component: MainTaskFrame,
    children: [
      {
        path: '/tasks/list',
        name: 'list',
        component: TaskList
      }
    ]
  },
  {
    path: '/task-creation-form',
    name: 'tasks-form',
    component: NewTaskCreationForm
  },
  {
    path: '/information',
    name: 'information',
    component: Information
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFound
  }
]

const router = createRouter({
  history: createWebHashHistory(process.env.BASE_URL),
  routes: routes
})

export default router
