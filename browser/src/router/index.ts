import { createRouter, createWebHashHistory } from 'vue-router'

// Some page components
import Home from '../components/pages/Home.vue'
import FindOutMore from '../components/pages/FindOutMore.vue'
import NewTaskCreationForm from '../components/pages/NewTaskCreationForm.vue'
import NotFound from '../components/pages/NotFound.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home
  },
  {
    path: '/create',
    name: 'new-task-form',
    component: NewTaskCreationForm
  },
  {
    path: '/findOutMore',
    name: 'find-out-more',
    component: FindOutMore
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
